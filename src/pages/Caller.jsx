import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthUid } from '../lib/firebase';
import {
  createEmergency,
  subscribeToEmergency,
  updateCallerLocation,
  cancelEmergency,
  resolveEmergency
} from '../lib/emergencies';
import { subscribeToResponderDoc } from '../lib/responders';
import EmergencyTypeGrid from '../components/EmergencyTypeGrid';
import HoldButton from '../components/HoldButton';
import StatusBanner from '../components/StatusBanner';
import ResponderList from '../components/ResponderList';
import LiveMap from '../components/LiveMap';
import DebugSimulator from '../components/DebugSimulator';

// LocalStorage keys for persisting user state across sessions
const PROFILE_KEY = 'lifelink_profile';
const ACTIVE_EMERGENCY_KEY = 'lifelink_active_id';

// Emergency states
const STATE_PROFILE = 'PROFILE';
const STATE_READY = 'READY';
const STATE_ACTIVE = 'ACTIVE';

/**
 * Caller page with three states: PROFILE, READY, and ACTIVE.
 * 
 * PROFILE: First-time setup - collects name and college ID (stored in localStorage).
 *   Tying every SOS to a college ID deters prank alerts by making users accountable.
 * 
 * READY: Emergency type selection and SOS trigger.
 *   Users select an emergency type, then hold the SOS button for 1.5s to trigger.
 *   The hold requirement prevents accidental triggers and reduces pranks.
 * 
 * ACTIVE: Emergency in progress - shows status, responders, map, and action buttons.
 *   Subscribes to real-time updates, tracks location every 10s, and persists the
 *   emergency ID so page refreshes return to the ACTIVE state.
 */
export default function Caller() {
  const navigate = useNavigate();
  const uid = useAuthUid();
  
  // State management
  const [appState, setAppState] = useState(STATE_PROFILE);
  const [profile, setProfile] = useState(null);
  const [selectedType, setSelectedType] = useState('');
  const [emergencyId, setEmergencyId] = useState(null);
  const [emergencyData, setEmergencyData] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [isRetryingLocation, setIsRetryingLocation] = useState(false);
  const [responderLocations, setResponderLocations] = useState({});
  
  // Refs for cleanup
  const unsubscribeRef = useRef(null);
  const watchIdRef = useRef(null);
  const lastLocationUpdateRef = useRef(0);
  const responderUnsubscribesRef = useRef([]);
  
  // Check for debug mode in URL
  const isDebugMode = new URLSearchParams(window.location.search).get('debug') === '1';

  // Load profile from localStorage on mount
  useEffect(() => {
    const savedProfile = localStorage.getItem(PROFILE_KEY);
    if (savedProfile) {
      const parsed = JSON.parse(savedProfile);
      setProfile(parsed);
      setAppState(STATE_READY);
    }
  }, []);

  // Check for active emergency on mount
  useEffect(() => {
    const activeId = localStorage.getItem(ACTIVE_EMERGENCY_KEY);
    if (activeId && profile) {
      setEmergencyId(activeId);
      setAppState(STATE_ACTIVE);
    }
  }, [profile]);

  // Subscribe to emergency updates when in ACTIVE state
  useEffect(() => {
    if (appState === STATE_ACTIVE && emergencyId) {
      unsubscribeRef.current = subscribeToEmergency(emergencyId, (error, snapshot, data) => {
        if (error) {
          console.error('Emergency subscription error:', error);
          return;
        }
        if (data) {
          setEmergencyData(data);
          
          // If emergency is resolved or cancelled, clear the active ID
          if (data.status === 'resolved' || data.status === 'cancelled') {
            localStorage.removeItem(ACTIVE_EMERGENCY_KEY);
            stopLocationTracking();
          }
        }
      });
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [appState, emergencyId]);

  // Start location tracking when emergency is active
  useEffect(() => {
    if (appState === STATE_ACTIVE && emergencyData?.status === 'open') {
      startLocationTracking();
    } else {
      stopLocationTracking();
    }

    return () => {
      stopLocationTracking();
    };
  }, [appState, emergencyData?.status]);

  // Subscribe to responder docs for live location updates
  useEffect(() => {
    if (appState === STATE_ACTIVE && emergencyData?.responders) {
      // Clear previous subscriptions
      responderUnsubscribesRef.current.forEach(unsub => unsub());
      responderUnsubscribesRef.current = [];

      // Subscribe to each responder's document
      emergencyData.responders.forEach((responder) => {
        const unsub = subscribeToResponderDoc(responder.uid, (error, snapshot, data) => {
          if (error) {
            console.error('Responder subscription error:', error);
            return;
          }
          if (data && data.location) {
            setResponderLocations(prev => ({
              ...prev,
              [responder.uid]: data.location
            }));
          }
        });
        responderUnsubscribesRef.current.push(unsub);
      });
    }

    return () => {
      // Clean up all responder subscriptions
      responderUnsubscribesRef.current.forEach(unsub => unsub());
      responderUnsubscribesRef.current = [];
    };
  }, [appState, emergencyData?.responders]);

  // Start watching position and update Firestore every 10s
  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported');
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();
        // Throttle updates to once every 10 seconds
        if (now - lastLocationUpdateRef.current >= 10000 && emergencyId) {
          lastLocationUpdateRef.current = now;
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          updateCallerLocation(emergencyId, location);
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
  const handleSaveProfile = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('name');
    const collegeId = formData.get('collegeId');
    
    if (name && collegeId) {
      const newProfile = { name, collegeId };
      setProfile(newProfile);
      localStorage.setItem(PROFILE_KEY, JSON.stringify(newProfile));
      setAppState(STATE_READY);
    }
  };

  // Get current position and create emergency
  const handleSOSTrigger = async () => {
    setLocationError(null);
    setIsRetryingLocation(false);

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        try {
          const id = await createEmergency({
            uid: await uid,
            name: profile.name,
            collegeId: profile.collegeId,
            type: selectedType,
            location
          });
          setEmergencyId(id);
          localStorage.setItem(ACTIVE_EMERGENCY_KEY, id);
          setAppState(STATE_ACTIVE);
        } catch (error) {
          console.error('Failed to create emergency:', error);
          setLocationError('Failed to create emergency. Please try again.');
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

  // Cancel emergency
  const handleCancel = async () => {
    if (window.confirm('Are you sure you want to cancel this emergency?')) {
      try {
        await cancelEmergency(emergencyId);
        localStorage.removeItem(ACTIVE_EMERGENCY_KEY);
        setEmergencyId(null);
        setEmergencyData(null);
        setAppState(STATE_READY);
      } catch (error) {
        console.error('Failed to cancel emergency:', error);
        alert('Failed to cancel emergency. Please try again.');
      }
    }
  };

  // Resolve emergency
  const handleResolve = async () => {
    if (window.confirm('Are you safe? This will mark the emergency as resolved.')) {
      try {
        await resolveEmergency(emergencyId);
        localStorage.removeItem(ACTIVE_EMERGENCY_KEY);
        setEmergencyId(null);
        setEmergencyData(null);
        setAppState(STATE_READY);
      } catch (error) {
        console.error('Failed to resolve emergency:', error);
        alert('Failed to resolve emergency. Please try again.');
      }
    }
  };

  // Render PROFILE state
  if (appState === STATE_PROFILE) {
    return (
      <div className="min-h-screen bg-bg-dark flex flex-col">
        <header className="p-6 border-b border-gray-800">
          <Link to="/" className="text-gray-400 hover:text-white text-sm">
            ← Back
          </Link>
          <h1 className="text-2xl font-bold text-white mt-2">Caller Mode</h1>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="bg-bg-card rounded-2xl p-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-4">Set up your profile</h2>
              <p className="text-gray-400 text-sm mb-6">
                We need some information to help responders assist you. Your college ID
                helps verify your identity and deters prank alerts.
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

  // Render READY state
  if (appState === STATE_READY) {
    return (
      <div className="min-h-screen bg-bg-dark flex flex-col">
        <header className="p-6 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-gray-400 hover:text-white text-sm">
              ← Back
            </Link>
            <button
              onClick={() => {
                localStorage.removeItem(PROFILE_KEY);
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

        <main className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-md">
            <p className="text-gray-400 text-center mb-6">Select emergency type</p>
            
            <EmergencyTypeGrid
              selectedType={selectedType}
              onSelect={setSelectedType}
            />
            
            <div className="flex justify-center mt-8">
              <HoldButton
                disabled={!selectedType}
                onTrigger={handleSOSTrigger}
              />
            </div>

            {locationError && (
              <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm mb-3">{locationError}</p>
                <button
                  onClick={() => {
                    setIsRetryingLocation(true);
                    handleSOSTrigger();
                  }}
                  className="w-full py-2 px-4 bg-red-500 text-white font-semibold rounded-lg text-sm hover:bg-red-600 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // Render ACTIVE state
  if (appState === STATE_ACTIVE && emergencyData) {
    const isActive = emergencyData.status === 'open' || emergencyData.status === 'accepted';
    
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
          {/* Status banner */}
          <StatusBanner
            status={emergencyData.status}
            responderCount={emergencyData.responders?.length || 0}
          />

          {/* Map */}
          <LiveMap
            callerLocation={emergencyData.location}
            responders={emergencyData.responders?.map(r => ({
              ...r,
              location: responderLocations[r.uid] || r.location
            })) || []}
          />

          {/* Responder list */}
          {emergencyData.responders && emergencyData.responders.length > 0 && (
            <ResponderList
              responders={emergencyData.responders.map(r => ({
                ...r,
                location: responderLocations[r.uid] || r.location
              }))}
              callerLocation={emergencyData.location}
            />
          )}

          {/* Debug simulator */}
          {isDebugMode && isActive && (
            <DebugSimulator
              emergencyId={emergencyId}
              callerLocation={emergencyData.location}
            />
          )}

          {/* Action buttons */}
          {isActive && (
            <div className="space-y-3">
              <a
                href="tel:112"
                className="block w-full py-4 bg-green-600 text-white font-semibold rounded-xl text-center hover:bg-green-700 transition-colors min-h-[56px]"
              >
                Call 112
              </a>
              
              <Link
                to="/cpr"
                className="block w-full py-4 bg-blue-600 text-white font-semibold rounded-xl text-center hover:bg-blue-700 transition-colors min-h-[56px]"
              >
                Open CPR guide
              </Link>
              
              <button
                onClick={handleResolve}
                className="w-full py-4 bg-emergency text-white font-semibold rounded-xl hover:bg-emergency-dark transition-colors min-h-[56px]"
              >
                I'm safe / Resolved
              </button>
              
              <button
                onClick={handleCancel}
                className="w-full py-3 bg-gray-700 text-gray-300 font-semibold rounded-xl hover:bg-gray-600 transition-colors"
              >
                Cancel SOS
              </button>
            </div>
          )}

          {/* Resolved/cancelled message */}
          {!isActive && (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">
                {emergencyData.status === 'resolved' 
                  ? 'Emergency has been resolved. Stay safe!'
                  : 'Emergency has been cancelled.'}
              </p>
              <button
                onClick={() => {
                  setAppState(STATE_READY);
                  setEmergencyId(null);
                  setEmergencyData(null);
                }}
                className="py-3 px-6 bg-emergency text-white font-semibold rounded-lg hover:bg-emergency-dark transition-colors"
              >
                Return to home
              </button>
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
