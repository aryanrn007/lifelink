import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthUid } from '../lib/firebase';
import {
  saveResponderProfile,
  setOnDuty,
  updateResponderLocation,
  subscribeToOpenEmergencies,
  acceptEmergency
} from '../lib/responders';
import { subscribeToEmergency } from '../lib/emergencies';
import { isEligible } from '../lib/dispatch';
import { haversineMeters, formatDistance } from '../lib/geo';
import {
  unlockAudio,
  startAlarm,
  stopAlarm,
  requestWakeLock,
  releaseWakeLock,
  setupWakeLockReacquire
} from '../lib/alert';
import AlertOverlay from '../components/AlertOverlay';
import DutyToggle from '../components/DutyToggle';
import LiveMap from '../components/LiveMap';

// LocalStorage keys
const RESPONDER_PROFILE_KEY = 'lifelink_responder_profile';
const ON_DUTY_KEY = 'lifelink_on_duty';

// Responder states
const STATE_PROFILE = 'PROFILE';
const STATE_OFF_DUTY = 'OFF_DUTY';
const STATE_ON_DUTY = 'ON_DUTY';
const STATE_ALERT = 'ALERT';
const STATE_ACCEPTED = 'STATE_ACCEPTED';
const STATE_RESUME = 'STATE_RESUME';

// Skill options for responder profile
const SKILL_OPTIONS = [
  { value: 'cpr', label: 'CPR certified' },
  { value: 'nursing', label: 'Nursing/Medical student' },
  { value: 'nss', label: 'NSS/NCC volunteer' },
  { value: 'security', label: 'Security/Staff' },
  { value: 'firstaid', label: 'First-aid trained' }
];

/**
 * Responder page with five states: PROFILE, OFF DUTY, ON DUTY, ALERT, ACCEPTED.
 * 
 * PROFILE: First-time setup - collects name, college ID, and skill level.
 *   Responders are verified by college ID to ensure accountability.
 * 
 * OFF DUTY: Resting state with a "Go On Duty" button.
 *   On tap: unlocks audio, requests GPS, sets onDuty true, requests wake lock.
 * 
 * ON DUTY: Active listening state with location tracking and emergency subscription.
 *   Filters emergencies by eligibility (distance <= radius), ignores own emergencies
 *   unless ?debug=1 is in URL, and tracks dismissed emergencies.
 * 
 * ALERT: Full-screen overlay when an eligible emergency appears.
 *   Shows emergency details with alarm and vibration. User can accept or dismiss.
 * 
 * ACCEPTED: After accepting an emergency, shows navigation, map, and action buttons.
 *   Subscribes to emergency status updates and returns to standby when resolved.
 */
export default function Responder() {
  const navigate = useNavigate();
  const uid = useAuthUid();
  
  // State management
  const [appState, setAppState] = useState(STATE_PROFILE);
  const [profile, setProfile] = useState(null);
  const [userUid, setUserUid] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [currentEmergency, setCurrentEmergency] = useState(null);
  const [acceptedEmergency, setAcceptedEmergency] = useState(null);
  const [dismissedEmergencies, setDismissedEmergencies] = useState(new Set());
  const [arrived, setArrived] = useState(false);
  const [emergencyClosedMessage, setEmergencyClosedMessage] = useState(null);
  
  // Refs for cleanup
  const watchIdRef = useRef(null);
  const lastLocationUpdateRef = useRef(0);
  const emergenciesUnsubscribeRef = useRef(null);
  const emergencyUnsubscribeRef = useRef(null);
  const wakeLockCleanupRef = useRef(null);
  
  // Check for debug mode
  const isDebugMode = new URLSearchParams(window.location.search).get('debug') === '1';

  // Load profile from localStorage on mount
  useEffect(() => {
    const savedProfile = localStorage.getItem(RESPONDER_PROFILE_KEY);
    if (savedProfile) {
      const parsed = JSON.parse(savedProfile);
      setProfile(parsed);
      setAppState(STATE_OFF_DUTY);
    }
  }, []);

  // Get user UID
  useEffect(() => {
    uid.then((resolvedUid) => {
      setUserUid(resolvedUid);
    });
  }, [uid]);

  // Check if was on duty before refresh
  useEffect(() => {
    const wasOnDuty = localStorage.getItem(ON_DUTY_KEY);
    if (wasOnDuty === 'true' && profile) {
      setAppState(STATE_RESUME);
    }
  }, [profile]);

  // Wake lock reacquire setup
  useEffect(() => {
    if (appState === STATE_ON_DUTY || appState === STATE_ACCEPTED) {
      wakeLockCleanupRef.current = setupWakeLockReacquire(true);
    }
    return () => {
      if (wakeLockCleanupRef.current) {
        wakeLockCleanupRef.current();
      }
    };
  }, [appState]);

  // Subscribe to open emergencies when on duty
  useEffect(() => {
    if (appState === STATE_ON_DUTY && location) {
      emergenciesUnsubscribeRef.current = subscribeToOpenEmergencies((error, emergencies) => {
        if (error) {
          console.error('Emergency subscription error:', error);
          return;
        }

        // Filter eligible emergencies
        const eligible = emergencies.filter((emergency) => {
          // Ignore if dismissed this session
          if (dismissedEmergencies.has(emergency.id)) {
            return false;
          }

          // Ignore own emergencies unless debug mode
          if (!isDebugMode && emergency.callerUid === userUid) {
            return false;
          }

          // Check distance eligibility
          return isEligible(location, emergency);
        });

        // Show alert for first eligible emergency
        if (eligible.length > 0 && !currentEmergency) {
          setCurrentEmergency(eligible[0]);
          setAppState(STATE_ALERT);
          startAlarm();
        }
      });
    }

    return () => {
      if (emergenciesUnsubscribeRef.current) {
        emergenciesUnsubscribeRef.current();
      }
    };
  }, [appState, location, dismissedEmergencies, currentEmergency, uid, isDebugMode]);

  // Subscribe to accepted emergency status
  useEffect(() => {
    if (appState === STATE_ACCEPTED && acceptedEmergency?.id) {
      emergencyUnsubscribeRef.current = subscribeToEmergency(
        acceptedEmergency.id,
        (error, snapshot, data) => {
          if (error) {
            console.error('Emergency status subscription error:', error);
            return;
          }
          if (data && (data.status === 'resolved' || data.status === 'cancelled')) {
            setEmergencyClosedMessage(
              data.status === 'resolved' ? 'Emergency resolved. Thank you!' : 'Emergency cancelled.'
            );
            setTimeout(() => {
              setEmergencyClosedMessage(null);
              setAcceptedEmergency(null);
              setAppState(STATE_ON_DUTY);
            }, 4000);
          }
        }
      );
    }

    return () => {
      if (emergencyUnsubscribeRef.current) {
        emergencyUnsubscribeRef.current();
      }
    };
  }, [appState, acceptedEmergency]);

  // Start location tracking when on duty
  useEffect(() => {
    if (appState === STATE_ON_DUTY || appState === STATE_ACCEPTED) {
      startLocationTracking();
    } else {
      stopLocationTracking();
    }

    return () => {
      stopLocationTracking();
    };
  }, [appState]);

  // Start watching position
  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported');
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setLocation(newLocation);

        // Throttle Firestore updates to once every 10 seconds
        if (now - lastLocationUpdateRef.current >= 10000 && userUid) {
          lastLocationUpdateRef.current = now;
          updateResponderLocation(userUid, newLocation);
        }
      },
      (error) => {
        console.error('Location tracking error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      }
    );
  };

  // Stop watching position
  const stopLocationTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  // Save profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('name');
    const collegeId = formData.get('collegeId');
    const skill = formData.get('skill');

    if (name && collegeId && skill) {
      const newProfile = { name, collegeId, skill };
      setProfile(newProfile);
      localStorage.setItem(RESPONDER_PROFILE_KEY, JSON.stringify(newProfile));
      await saveResponderProfile(userUid, newProfile);
      setAppState(STATE_OFF_DUTY);
    }
  };

  // Go on duty
  const handleGoOnDuty = async () => {
    setLocationError(null);

    // Unlock audio (must be from user gesture)
    unlockAudio();

    // Get current position
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setLocation(newLocation);

        try {
          await setOnDuty(userUid, true, newLocation);
          await requestWakeLock();
          localStorage.setItem(ON_DUTY_KEY, 'true');
          setAppState(STATE_ON_DUTY);
        } catch (error) {
          console.error('Failed to go on duty:', error);
          setLocationError('Failed to go on duty. Please try again.');
        }
      },
      (error) => {
        let message = 'Failed to get your location';
        if (error.code === 1) {
          message = 'Location permission denied. Go to site settings → Location → Allow, then retry.';
        } else if (error.code === 2) {
          message = 'Location unavailable. Please check your GPS signal.';
        } else if (error.code === 3) {
          message = 'Location request timed out. Please try again.';
        }
        setLocationError(message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Go off duty
  const handleGoOffDuty = async () => {
    try {
      await setOnDuty(userUid, false, location);
      await releaseWakeLock();
      localStorage.removeItem(ON_DUTY_KEY);
      setAppState(STATE_OFF_DUTY);
      setCurrentEmergency(null);
      setAcceptedEmergency(null);
      setDismissedEmergencies(new Set());
    } catch (error) {
      console.error('Failed to go off duty:', error);
      alert('Failed to go off duty. Please try again.');
    }
  };

  // Resume after refresh
  const handleResume = async () => {
    unlockAudio();
    await handleGoOnDuty();
  };

  // Accept emergency
  const handleAcceptEmergency = async () => {
    stopAlarm();

    if (!currentEmergency || !location) {
      return;
    }

    const distance = haversineMeters(location, currentEmergency.location);
    const result = await acceptEmergency(currentEmergency.id, {
      uid: userUid,
      name: profile.name,
      location,
      distanceM: distance
    });

    if (result.ok) {
      setAcceptedEmergency(currentEmergency);
      setCurrentEmergency(null);
      setAppState(STATE_ACCEPTED);
    } else {
      alert(result.reason);
      setCurrentEmergency(null);
      setAppState(STATE_ON_DUTY);
    }
  };

  // Dismiss emergency
  const handleDismissEmergency = () => {
    stopAlarm();
    if (currentEmergency) {
      setDismissedEmergencies(new Set([...dismissedEmergencies, currentEmergency.id]));
    }
    setCurrentEmergency(null);
    setAppState(STATE_ON_DUTY);
  };

  // Render PROFILE state
  if (appState === STATE_PROFILE) {
    return (
      <div className="min-h-screen bg-bg-dark flex flex-col">
        <header className="p-6 border-b border-gray-800">
          <Link to="/" className="text-gray-400 hover:text-white text-sm">
            ← Back
          </Link>
          <h1 className="text-2xl font-bold text-white mt-2">Responder Mode</h1>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="bg-bg-card rounded-2xl p-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-4">Set up your profile</h2>
              <p className="text-gray-400 text-sm mb-6">
                We need some information to verify you as a responder. Your college ID
                helps verify your identity and ensures accountability.
              </p>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Your name
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="Enter your name"
                    className="w-full px-4 py-3 bg-bg-dark border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emergency"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    College ID
                  </label>
                  <input
                    type="text"
                    name="collegeId"
                    required
                    placeholder="Enter your college ID"
                    className="w-full px-4 py-3 bg-bg-dark border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emergency"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Skill level
                  </label>
                  <select
                    name="skill"
                    required
                    className="w-full px-4 py-3 bg-bg-dark border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emergency"
                  >
                    {SKILL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-emergency text-white font-semibold rounded-lg hover:bg-emergency-dark transition-colors min-h-[56px]"
                >
                  Save and continue
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Render RESUME state (after refresh while on duty)
  if (appState === STATE_RESUME) {
    return (
      <div className="min-h-screen bg-bg-dark flex flex-col">
        <header className="p-6 border-b border-gray-800">
          <Link to="/" className="text-gray-400 hover:text-white text-sm">
            ← Back
          </Link>
          <h1 className="text-2xl font-bold text-white mt-2">Responder Mode</h1>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md text-center">
            <div className="bg-bg-card rounded-2xl p-8 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-4">Resume on duty</h2>
              <p className="text-gray-400 text-sm mb-6">
                You were on duty before. Tap below to resume (required to unlock audio).
              </p>
              <button
                onClick={handleResume}
                className="w-full py-4 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors min-h-[56px]"
              >
                Tap to resume
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Render OFF DUTY state
  if (appState === STATE_OFF_DUTY) {
    return (
      <div className="min-h-screen bg-bg-dark flex flex-col">
        <header className="p-6 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-gray-400 hover:text-white text-sm">
              ← Back
            </Link>
            <button
              onClick={() => {
                localStorage.removeItem(RESPONDER_PROFILE_KEY);
                setProfile(null);
                setAppState(STATE_PROFILE);
              }}
              className="text-emergency text-sm hover:underline"
            >
              Edit profile
            </button>
          </div>
          <h1 className="text-2xl font-bold text-white mt-2">Hello, {profile?.name}</h1>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md text-center">
            <p className="text-gray-400 mb-8">You are currently off duty</p>
            <DutyToggle isOnDuty={false} onToggle={handleGoOnDuty} />

            {locationError && (
              <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm">{locationError}</p>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // Render ON DUTY state
  if (appState === STATE_ON_DUTY) {
    return (
      <div className="min-h-screen bg-bg-dark flex flex-col">
        <header className="p-6 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-gray-400 hover:text-white text-sm">
              ← Back
            </Link>
            <span className="text-gray-400 text-sm">{profile?.name}</span>
          </div>
        </header>

        <main className="flex-1 p-6 space-y-4">
          {/* Status card */}
          <div className="bg-bg-card rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <div>
                <h3 className="font-semibold text-white">On duty</h3>
                <p className="text-sm text-gray-400">Listening for emergencies nearby</p>
              </div>
            </div>
          </div>

          {/* Location info */}
          {location && (
            <div className="bg-bg-card rounded-xl p-4 border border-gray-700">
              <p className="text-sm text-gray-400">Your location:</p>
              <p className="text-white font-mono text-sm">
                {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
              </p>
            </div>
          )}

          {/* Go off duty button */}
          <DutyToggle isOnDuty={true} onToggle={handleGoOffDuty} />
        </main>

        {/* Alert overlay */}
        {currentEmergency && (
          <AlertOverlay
            emergency={currentEmergency}
            responderLocation={location}
            onAccept={handleAcceptEmergency}
            onDismiss={handleDismissEmergency}
          />
        )}
      </div>
    );
  }

  // Render ACCEPTED state
  if (appState === STATE_ACCEPTED && acceptedEmergency) {
    const distance = location && acceptedEmergency.location
      ? formatDistance(haversineMeters(location, acceptedEmergency.location))
      : 'Unknown';

    return (
      <div className="min-h-screen bg-bg-dark flex flex-col">
        <header className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-gray-400 hover:text-white text-sm">
              ← Back
            </Link>
            <span className="text-gray-400 text-sm">{profile?.name}</span>
          </div>
        </header>

        <main className="flex-1 p-4 space-y-4 overflow-y-auto">
          {/* Emergency info */}
          <div className="bg-bg-card rounded-xl p-4 border border-gray-700">
            <h2 className="text-xl font-bold text-white capitalize mb-2">
              {acceptedEmergency.type}
            </h2>
            <p className="text-gray-400">Caller: {acceptedEmergency.callerName}</p>
            <p className="text-emergency font-bold text-lg">{distance} away</p>
          </div>

          {/* Map */}
          <LiveMap
            callerLocation={acceptedEmergency.location}
            responders={[{ uid: userUid, name: profile.name, location }]}
          />

          {/* Action buttons */}
          <div className="space-y-3">
            {!arrived ? (
              <button
                onClick={() => setArrived(true)}
                className="w-full py-4 bg-emergency text-white font-semibold rounded-xl hover:bg-emergency-dark transition-colors min-h-[56px]"
              >
                I've arrived
              </button>
            ) : (
              <div className="w-full py-4 bg-green-600/20 border border-green-600 rounded-xl text-center">
                <p className="text-green-400 font-semibold">You've arrived ✓</p>
              </div>
            )}

            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${acceptedEmergency.location.lat},${acceptedEmergency.location.lng}&travelmode=walking`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-4 bg-blue-600 text-white font-semibold rounded-xl text-center hover:bg-blue-700 transition-colors min-h-[56px]"
            >
              Navigate
            </a>

            <a
              href="tel:112"
              className="block w-full py-4 bg-green-600 text-white font-semibold rounded-xl text-center hover:bg-green-700 transition-colors min-h-[56px]"
            >
              Call 112
            </a>

            <Link
              to="/cpr"
              className="block w-full py-4 bg-purple-600 text-white font-semibold rounded-xl text-center hover:bg-purple-700 transition-colors min-h-[56px]"
            >
              Open CPR guide
            </Link>

            <button
              onClick={handleGoOffDuty}
              className="w-full py-3 bg-gray-700 text-gray-300 font-semibold rounded-xl hover:bg-gray-600 transition-colors"
            >
              Back to standby
            </button>
          </div>

          {/* Emergency closed message */}
          {emergencyClosedMessage && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
              <div className="bg-bg-card rounded-2xl p-6 border border-gray-700 text-center">
                <p className="text-white text-lg">{emergencyClosedMessage}</p>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  // Loading state
  return (
    <div className="min-h-screen bg-bg-dark flex items-center justify-center">
      <p className="text-gray-400">Loading...</p>
    </div>
  );
}
