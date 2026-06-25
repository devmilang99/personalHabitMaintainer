import { useState, useEffect } from 'react';

export default function Clock() {
  const [timeStr, setTimeStr] = useState('-- : -- : --');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  return <div className="clock">{timeStr}</div>;
}
