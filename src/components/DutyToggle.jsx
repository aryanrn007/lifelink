import React from 'react';

/**
 * DutyToggle - A button to toggle responder on/off duty status.
 * Shows green when ready to go on duty, red when currently on duty.
 * Used in the OFF DUTY and ON DUTY states of the responder page.
 *
 * @param {Object} props
 * @param {boolean} props.isOnDuty - Current on-duty status
 * @param {Function} props.onToggle - Callback when button is pressed
 * @param {boolean} props.disabled - Whether the button is disabled
 */
export default function DutyToggle({ isOnDuty, onToggle, disabled = false }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`
        w-full py-6 px-8 rounded-2xl font-bold text-xl transition-all min-h-[56px]
        ${disabled
          ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
          : isOnDuty
            ? 'bg-emergency text-white hover:bg-emergency-dark'
            : 'bg-green-600 text-white hover:bg-green-700'
        }
      `}
    >
      {isOnDuty ? 'Go Off Duty' : 'Go On Duty'}
    </button>
  );
}
