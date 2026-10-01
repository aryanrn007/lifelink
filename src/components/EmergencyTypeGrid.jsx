import React from 'react';

// Emergency types with icons/emojis for quick visual identification
// The emoji icons help users quickly identify the type of emergency, which is crucial
// in high-stress situations where reading text might be difficult.
const EMERGENCY_TYPES = [
  { id: 'cardiac', label: 'Cardiac arrest', icon: '💓' },
  { id: 'choking', label: 'Choking', icon: '🫁' },
  { id: 'bleeding', label: 'Heavy bleeding', icon: '🩸' },
  { id: 'accident', label: 'Accident', icon: '🚗' },
  { id: 'burn', label: 'Burn', icon: '🔥' },
  { id: 'other', label: 'Other', icon: '🆘' }
];

/**
 * EmergencyTypeGrid - A 2x3 grid of emergency type selection buttons.
 * Users must select an emergency type before they can trigger the SOS button.
 * This ensures dispatchers and responders have context about the situation.
 *
 * @param {Object} props
 * @param {string} props.selectedType - Currently selected emergency type ID
 * @param {Function} props.onSelect - Callback when a type is selected
 */
export default function EmergencyTypeGrid({ selectedType, onSelect }) {
  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      {EMERGENCY_TYPES.map((type) => (
        <button
          key={type.id}
          onClick={() => onSelect(type.id)}
          className={`
            p-4 rounded-xl border-2 transition-all min-h-[100px] flex flex-col items-center justify-center gap-2
            ${selectedType === type.id
              ? 'border-emergency bg-emergency/10 text-emergency'
              : 'border-gray-700 bg-bg-card text-gray-300 hover:border-gray-600'
            }
          `}
        >
          <span className="text-3xl">{type.icon}</span>
          <span className="text-sm font-medium text-center">{type.label}</span>
        </button>
      ))}
    </div>
  );
}
