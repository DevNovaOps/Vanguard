import { useState, useEffect, useRef } from 'react';

export function useAnimatedCounter(end, duration = 1000) {
  const [value, setValue] = useState(() => {
    const num = typeof end === 'string' ? parseFloat(end) : end;
    return isNaN(num) ? 0 : num;
  });
  const prevValueRef = useRef(value);
  const requestRef = useRef();

  useEffect(() => {
    const numEnd = typeof end === 'string' ? parseFloat(end) : end;
    if (isNaN(numEnd)) {
      setValue(end);
      return;
    }

    const startVal = prevValueRef.current;
    const startTime = performance.now();

    function animate(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      const current = startVal + (numEnd - startVal) * eased;
      const rounded = Math.round(current);
      setValue(rounded);
      prevValueRef.current = rounded;

      if (progress < 1) {
        requestRef.current = requestAnimationFrame(animate);
      }
    }

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [end, duration]);

  return value;
}

