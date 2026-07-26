import { useEffect } from 'react';

/**
 * Toast — a transient status message pinned to the bottom of the viewport.
 * Controlled: renders when `message` is set and auto-dismisses via `onDismiss`.
 */
export default function Toast({ message, onDismiss, duration = 2600 }) {
  useEffect(() => {
    if (!message) return undefined;
    const t = setTimeout(() => onDismiss?.(), duration);
    return () => clearTimeout(t);
  }, [message, onDismiss, duration]);

  if (!message) return null;
  return <div className="toast mono" role="status">{message}</div>;
}
