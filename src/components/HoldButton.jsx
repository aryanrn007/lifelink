import React, { useState, useEffect, useRef } from 'react';

/**
 * HoldButton - A button that must be held for 1.5 seconds to trigger.
 * This prevents accidental SOS triggers and reduces prank alerts by requiring
 * intentional, sustained interaction. The filling ring animation provides visual
 * feedback so users know how long they need to hold.
 *
 * @param {Object} props
 * @param {boolean} props.disabled - Whether the button is disabled
 * @param {Function} props.onTrigger - Callback when the hold completes
 */
export default function HoldButton({ disabled, onTrigger }) {
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const holdDuration = 1500; // 1.5 seconds
  const animationRef = useRef(null);
  const startTimeRef = useRef(null);

  // Animation loop for the filling ring
  useEffect(() => {
    if (isHolding) {
      startTimeRef.current = performance.now();
      
      const animate = (currentTime) => {
        const elapsed = currentTime - startTimeRef.current;
        const newProgress = Math.min((elapsed / holdDuration) * 100, 100);
        setProgress(newProgress);

        if (elapsed < holdDuration) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          // Hold complete
          setIsHolding(false);
          setProgress(0);
          onTrigger();
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      setProgress(0);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isHolding, onTrigger]);

  const handleStart = (e) => {
    e.preventDefault();
    if (!disabled) {
      setIsHolding(true);
    }
  };

  const handleEnd = (e) => {
    e.preventDefault();
    setIsHolding(false);
  };

  return (
    <div className="relative flex items-center justify-center">
      {/* Filling ring SVG */}
      <svg
        className="absolute w-48 h-48 transform -rotate-90"
        viewBox="0 0 100 100"
      >
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="#1A1A1F"
          strokeWidth="8"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={disabled ? '#374151' : '#E11D48'}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 45}`}
          strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
          style={{ transition: 'stroke-dashoffset 0.1s linear' }}
        />
      </svg>

      {/* Main button */}
      <button
        onMouseDown={handleStart}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchEnd={handleEnd}
        disabled={disabled}
        className={`
          relative w-40 h-40 rounded-full font-bold text-2xl
          transition-all duration-200
          ${disabled
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : isHolding
              ? 'bg-emergency-dark text-white scale-95'
              : 'bg-emergency text-white hover:bg-emergency-dark active:scale-95'
          }
        `}
      >
        SOS
      </button>
    </div>
  );
}
