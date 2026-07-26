import { createContext, useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'binaural.theme';

/** Ordered list of available themes. Extend this (and themes.css) to add more. */
export const THEMES = ['dark', 'light'];

export const ThemeContext = createContext(null);

function isValidTheme(t) {
  return THEMES.includes(t);
}

function readStoredTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isValidTheme(stored) ? stored : null;
  } catch {
    return null;
  }
}

function systemTheme() {
  if (typeof window !== 'undefined' && window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  return 'dark';
}

function initialTheme() {
  return readStoredTheme() ?? systemTheme();
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(initialTheme);
  // Whether the user has made an explicit choice (persisted). Until then we
  // follow the OS preference live.
  const [explicit, setExplicit] = useState(() => readStoredTheme() != null);

  // Reflect the current theme onto <html> so every rule + SVG picks it up.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Track the system preference until the user overrides it explicitly.
  useEffect(() => {
    if (explicit || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = (e) => setThemeState(e.matches ? 'light' : 'dark');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [explicit]);

  const setTheme = useCallback((next) => {
    if (!isValidTheme(next)) return;
    setThemeState(next);
    setExplicit(true);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore persistence failures (private mode, etc.) */
    }
  }, []);

  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      setExplicit(true);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, themes: THEMES, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
