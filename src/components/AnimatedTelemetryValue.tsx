import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export interface AnimatedTelemetryValueProps {
  value: number;
  precision?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  duration?: number; // duration in ms, default 700
  showDelta?: boolean; // whether to show a temporary +x / -x delta chip
  pulseColor?: 'blue' | 'emerald' | 'amber' | 'red';
  formatFn?: (val: number) => string;
}

export const AnimatedTelemetryValue: React.FC<AnimatedTelemetryValueProps> = ({
  value,
  precision = 0,
  prefix = '',
  suffix = '',
  className = '',
  duration = 750,
  showDelta = false,
  pulseColor = 'blue',
  formatFn,
}) => {
  const [displayValue, setDisplayValue] = useState<number>(value);
  const [delta, setDelta] = useState<number | null>(null);
  const [isPulsing, setIsPulsing] = useState<boolean>(false);

  const prevValueRef = useRef<number>(value);
  const animationFrameRef = useRef<number | null>(null);
  const deltaTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const startValue = prevValueRef.current;
    const endValue = value;
    const change = endValue - startValue;

    // If change is negligible, keep current display
    if (Math.abs(change) < 0.0001) {
      setDisplayValue(endValue);
      return;
    }

    // Trigger delta indicator and pulse
    if (showDelta) {
      setDelta(change);
      if (deltaTimeoutRef.current) clearTimeout(deltaTimeoutRef.current);
      deltaTimeoutRef.current = setTimeout(() => {
        setDelta(null);
      }, 1600);
    }

    setIsPulsing(true);
    const pulseTimer = setTimeout(() => setIsPulsing(false), duration);

    // Cancel ongoing animation
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const startTime = performance.now();

    const animateNumber = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth ease-out quintic curve: 1 - (1 - t)^4
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      const currentVal = startValue + change * easeProgress;

      setDisplayValue(currentVal);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animateNumber);
      } else {
        setDisplayValue(endValue);
        prevValueRef.current = endValue;
        animationFrameRef.current = null;
      }
    };

    animationFrameRef.current = requestAnimationFrame(animateNumber);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      clearTimeout(pulseTimer);
      if (deltaTimeoutRef.current) clearTimeout(deltaTimeoutRef.current);
    };
  }, [value, duration, showDelta]);

  // Format number
  const formattedString = formatFn
    ? formatFn(displayValue)
    : precision > 0
    ? displayValue.toFixed(precision)
    : Math.round(displayValue).toString();

  const getGlowStyle = () => {
    if (!isPulsing) return '';
    switch (pulseColor) {
      case 'emerald':
        return 'text-emerald-500 dark:text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.35)]';
      case 'amber':
        return 'text-amber-500 dark:text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.35)]';
      case 'red':
        return 'text-red-500 dark:text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.35)]';
      case 'blue':
      default:
        return 'text-blue-500 dark:text-[#a4c9ff] drop-shadow-[0_0_8px_rgba(56,189,248,0.35)]';
    }
  };

  return (
    <span className="relative inline-flex items-baseline gap-1 select-none">
      <motion.span
        animate={{
          scale: isPulsing ? [1, 1.04, 1] : 1,
        }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className={`transition-colors duration-500 ${className} ${getGlowStyle()}`}
      >
        {prefix}
        {formattedString}
        {suffix}
      </motion.span>

      {/* Floating Delta Tag */}
      <AnimatePresence>
        {showDelta && delta !== null && Math.abs(delta) >= (precision > 0 ? 0.05 : 0.5) && (
          <motion.span
            initial={{ opacity: 0, y: 4, scale: 0.8 }}
            animate={{ opacity: 1, y: -4, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            className={`absolute -top-3.5 right-0 text-[9px] font-mono font-black px-1 py-0.2 rounded pointer-events-none whitespace-nowrap shadow-sm ${
              delta > 0
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                : 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 border border-red-300 dark:border-red-700'
            }`}
          >
            {delta > 0 ? `+${delta.toFixed(precision)}` : delta.toFixed(precision)}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
};

export const AnimatedProgressBar: React.FC<{
  value: number; // 0 to 100
  colorClass?: string;
  heightClass?: string;
}> = ({ value, colorClass = 'bg-black dark:bg-[#a4c9ff]', heightClass = 'h-2' }) => {
  const boundedVal = Math.min(Math.max(value, 0), 100);

  return (
    <div className={`w-full rounded-full bg-neutral-200 dark:bg-[#253648] overflow-hidden ${heightClass}`}>
      <motion.div
        className={`h-full ${colorClass}`}
        initial={{ width: `${boundedVal}%` }}
        animate={{ width: `${boundedVal}%` }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
};
