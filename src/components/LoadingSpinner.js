import React from 'react';
import './LoadingSpinner.css';

function LoaderAnimation({ showDots = true }) {
  return (
    <>
      <div className="mamuya-loader__spinner" aria-hidden="true">
        <div className="mamuya-loader__ring" />
        <div className="mamuya-loader__ring mamuya-loader__ring--inner" />
      </div>
      {showDots && (
        <div className="mamuya-loader__dots" aria-hidden="true">
          <span className="mamuya-loader__dot" />
          <span className="mamuya-loader__dot" />
          <span className="mamuya-loader__dot" />
        </div>
      )}
    </>
  );
}

/** Full-page loader while a route or session initializes */
export function PageLoader({ message = 'Loading...', submessage }) {
  return (
    <div className="mamuya-loader mamuya-loader--page" role="status" aria-live="polite" aria-busy="true">
      <LoaderAnimation />
      <p className="mamuya-loader__message">{message}</p>
      {submessage ? <p className="mamuya-loader__submessage">{submessage}</p> : null}
    </div>
  );
}

/** Inline loader for tables, cards, and sections */
export function InlineLoader({ message = 'Loading...', size = 'md', showDots = false }) {
  return (
    <div
      className={`mamuya-loader mamuya-loader--inline mamuya-loader--${size}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <LoaderAnimation showDots={showDots} />
      {message ? <span className="mamuya-loader__message">{message}</span> : null}
    </div>
  );
}

/** Overlay while fetching data inside an existing page */
export function OverlayLoader({ message = 'Fetching data...', show = true }) {
  if (!show) return null;

  return (
    <div className="mamuya-loader mamuya-loader--overlay" role="status" aria-live="polite" aria-busy="true">
      <div className="mamuya-loader__panel">
        <LoaderAnimation />
        <p className="mamuya-loader__message">{message}</p>
      </div>
    </div>
  );
}

/** Small spinner for buttons (login, submit, etc.) */
export function ButtonLoader({ message, size = 'sm' }) {
  return (
    <span className={`mamuya-loader mamuya-loader--inline mamuya-loader--${size}`} style={{ display: 'inline-flex' }}>
      <LoaderAnimation showDots={false} />
      {message ? <span className="mamuya-loader__message">{message}</span> : null}
    </span>
  );
}

export default PageLoader;
