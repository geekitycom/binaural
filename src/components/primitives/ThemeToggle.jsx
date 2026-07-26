import { useTheme } from '../../theme/useTheme.js';

/**
 * Light/dark switch for the transport bar. Built as a simple two-state toggle
 * but sourced from the theme list, so it can grow into a multi-theme picker.
 */
export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';
  const label = isDark ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <button
      type="button"
      className="tbtn theme-toggle"
      onClick={toggle}
      title={label}
      aria-label={label}
      aria-pressed={isDark}
    >
      {isDark ? (
        // moon
        <svg viewBox="0 0 24 24">
          <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
        </svg>
      ) : (
        // sun
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
        </svg>
      )}
    </button>
  );
}
