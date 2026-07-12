import React, { useEffect, useState } from 'react';
import './OfflineBanner.css';

function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="offline-banner" role="alert" aria-live="assertive">
      <div className="offline-banner__panel">
        <span className="offline-banner__dot" aria-hidden="true" />
        <p className="offline-banner__message">There is no Internet Connection...!</p>
      </div>
    </div>
  );
}

export default OfflineBanner;
