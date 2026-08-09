import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * True when the OS "reduce motion" switch is on, kept live if it is toggled
 * while the app is open.
 *
 * Screens that animate must branch on this rather than ignore it: looping
 * background motion is exactly what the setting exists to stop. Note that
 * entrance animations still have to be *settled* (values set to their resting
 * state) rather than simply skipped, or the content never becomes visible.
 */
export const useReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (!cancelled) setReduced(value);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      cancelled = true;
      sub?.remove?.();
    };
  }, []);

  return reduced;
};
