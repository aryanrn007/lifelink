// Shared AudioContext for the alarm system
let audioContext = null;
let oscillator1 = null;
let oscillator2 = null;
let gainNode = null;
let isAlarmPlaying = false;
let alarmInterval = null;

// Screen Wake Lock sentinel
let wakeLock = null;

/**
 * Unlock the AudioContext by creating or resuming it.
 * 
 * IMPORTANT: Browsers require AudioContext to be created or resumed from a user
 * gesture (tap/click) due to autoplay policies. This function must be called from
 * a button tap handler before attempting to play any audio. If called programmatically
 * without user interaction, it will fail or be blocked by the browser.
 *
 * @returns {void}
 */
export const unlockAudio = () => {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Resume if suspended (common after page load)
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
  } catch (error) {
    console.error('Failed to unlock audio:', error);
  }
};

/**
 * Start the alarm siren using Web Audio API oscillators.
 * Creates a two-tone siren (alternating between two frequencies) without any audio files.
 * Also starts vibration pattern [400,200,400,200,400] on supported devices.
 *
 * @returns {void}
 */
export const startAlarm = () => {
  if (isAlarmPlaying || !audioContext) {
    return;
  }

  try {
    isAlarmPlaying = true;

    // Create gain node for volume control
    gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
    gainNode.gain.value = 0.3; // Volume at 30%

    // Start vibration pattern (guard for browsers without vibrate support)
    if (navigator.vibrate) {
      navigator.vibrate([400, 200, 400, 200, 400]);
      // Repeat vibration pattern
      alarmInterval = setInterval(() => {
        if (navigator.vibrate) {
          navigator.vibrate([400, 200, 400, 200, 400]);
        }
      }, 2000);
    }

    // Create alternating two-tone siren
    let toggle = false;
    const playTone = () => {
      if (!isAlarmPlaying) return;

      // Stop previous oscillators
      if (oscillator1) {
        oscillator1.stop();
        oscillator1.disconnect();
      }
      if (oscillator2) {
        oscillator2.stop();
        oscillator2.disconnect();
      }

      // Create new oscillator
      const osc = audioContext.createOscillator();
      osc.connect(gainNode);
      
      // Alternate between two frequencies for siren effect
      osc.frequency.value = toggle ? 880 : 660; // A5 and E5
      osc.type = 'sawtooth'; // Sawtooth wave for harsh siren sound
      
      osc.start();
      
      if (toggle) {
        oscillator1 = osc;
      } else {
        oscillator2 = osc;
      }

      toggle = !toggle;
    };

    // Start the alternating pattern
    playTone();
    alarmInterval = setInterval(playTone, 500); // Switch tone every 500ms

  } catch (error) {
    console.error('Failed to start alarm:', error);
    isAlarmPlaying = false;
  }
};

/**
 * Stop the alarm siren and vibration.
 * Stops both audio oscillators and clears the vibration interval.
 * Should be called when the user accepts/dismisses an alert or when the
 * emergency is no longer open.
 *
 * @returns {void}
 */
export const stopAlarm = () => {
  isAlarmPlaying = false;

  // Stop oscillators
  if (oscillator1) {
    try {
      oscillator1.stop();
      oscillator1.disconnect();
    } catch (e) {
      // Ignore errors from already stopped oscillators
    }
    oscillator1 = null;
  }

  if (oscillator2) {
    try {
      oscillator2.stop();
      oscillator2.disconnect();
    } catch (e) {
      // Ignore errors from already stopped oscillators
    }
    oscillator2 = null;
  }

  // Stop gain node
  if (gainNode) {
    gainNode.disconnect();
    gainNode = null;
  }

  // Clear intervals
  if (alarmInterval) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }

  // Stop vibration
  if (navigator.vibrate) {
    navigator.vibrate(0);
  }
};

/**
 * Request a screen wake lock to keep the screen on while on duty.
 * This prevents the screen from turning off while the responder is waiting for
 * emergencies, ensuring they don't miss alerts. Falls back gracefully if the API
 * is not supported or if the request fails.
 *
 * @returns {Promise<void>}
 */
export const requestWakeLock = async () => {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      console.log('Wake lock acquired');
      
      // Listen for release (user manually turned off screen)
      wakeLock.addEventListener('release', () => {
        console.log('Wake lock released');
        wakeLock = null;
      });
    } else {
      console.warn('Screen Wake Lock API not supported');
    }
  } catch (error) {
    console.error('Failed to acquire wake lock:', error);
  }
};

/**
 * Release the screen wake lock.
 * Should be called when the responder goes off duty or when the page unmounts.
 *
 * @returns {Promise<void>}
 */
export const releaseWakeLock = async () => {
  if (wakeLock) {
    try {
      await wakeLock.release();
      wakeLock = null;
      console.log('Wake lock released');
    } catch (error) {
      console.error('Failed to release wake lock:', error);
    }
  }
};

/**
 * Re-acquire wake lock when the page becomes visible again.
 * Browsers may release the wake lock when the tab is hidden, so we need to
 * re-acquire it when the user returns to the tab while still on duty.
 *
 * @param {boolean} isOnDuty - Whether the responder is currently on duty
 * @returns {void}
 */
export const setupWakeLockReacquire = (isOnDuty) => {
  const handleVisibilityChange = async () => {
    if (document.visibilityState === 'visible' && isOnDuty && !wakeLock) {
      await requestWakeLock();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Return cleanup function
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
};
