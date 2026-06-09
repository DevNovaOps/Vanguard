import { useState, useEffect, useRef } from 'react';

export function useAnimatedCounter(end, duration = 1000, start = 0) {
  const [value, setValue] = useState(start);
  const endRef = useRef(end);

  useEffect(() => {
    endRef.current = end;
    const numEnd = typeof end === 'string' ? parseFloat(end) : end;
    if (isNaN(numEnd)) { setValue(end); return; }

    const numStart = typeof start === 'number' ? start : 0;
    const startTime = performance.now();

    function animate(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = numStart + (numEnd - numStart) * eased;
      setValue(Math.round(current));
      if (progress < 1) requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  }, [end, duration, start]);

  return value;
}
