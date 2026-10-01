import React from 'react';

/**
 * StatusBanner - Displays the current status of the emergency with visual feedback.
 * The pulsing animation during "open" status provides a sense of urgency and indicates
 * the system is actively searching for responders. When responders accept, the
 * message changes to reassure the caller that help is coming.
 *
 * @param {Object} props
 * @param {string} props.status - Emergency status ('open', 'accepted', 'resolved', 'cancelled')
 * @param {number} props.responderCount - Number of responders who have accepted
 */
export default function StatusBanner({ status, responderCount }) {
  const getMessage = () => {
    if (status === 'open') {
      return 'Searching for nearby volunteers...';
    }
    if (status === 'accepted' && responderCount > 0) {
      return `Help is coming (${responderCount} responder${responderCount > 1 ? 's' : ''} on the way)`;
    }
    if (status === 'resolved') {
      return 'Emergency resolved';
    }
    if (status === 'cancelled') {
      return 'Emergency cancelled';
    }
    return 'Status unknown';
  };

  const isOpen = status === 'open';

  return (
    <div
      className={`
        px-4 py-3 rounded-xl text-center font-medium
        ${isOpen ? 'bg-emergency/20 text-emergency' : 'bg-green-500/20 text-green-400'}
      `}
    >
      <div className="flex items-center justify-center gap-2">
        {isOpen && (
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emergency opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emergency"></span>
          </span>
        )}
        <span>{getMessage()}</span>
      </div>
    </div>
  );
}
