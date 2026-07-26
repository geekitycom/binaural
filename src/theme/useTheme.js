import { useContext } from 'react';
import { ThemeContext } from './ThemeContext.jsx';

/** Access the active theme and controls. Must be used within <ThemeProvider>. */
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
