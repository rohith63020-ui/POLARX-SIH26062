/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  isDarkMode: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const THEME_STORAGE_KEY = 'polarx-theme';

// Synchronous DOM updater to guarantee documentElement & body reflect theme immediately
function syncDOMTheme(targetTheme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const body = document.body;

  root.setAttribute('data-theme', targetTheme);
  root.style.colorScheme = targetTheme;

  if (targetTheme === 'dark') {
    root.classList.add('dark');
    if (body) body.classList.add('dark');
  } else {
    root.classList.remove('dark');
    if (body) body.classList.remove('dark');
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, targetTheme);
  } catch (e) {
    console.warn('Could not persist theme to localStorage:', e);
  }
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Initialize from localStorage (fallback to 'light')
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') {
        syncDOMTheme(saved);
        return saved;
      }
    } catch (e) {
      console.warn('Could not read theme from localStorage:', e);
    }
    syncDOMTheme('light');
    return 'light';
  });

  // 2. Synchronize whenever state changes
  useEffect(() => {
    syncDOMTheme(theme);
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    syncDOMTheme(newTheme);
    setThemeState(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const nextTheme: Theme = prev === 'light' ? 'dark' : 'light';
      syncDOMTheme(nextTheme);
      return nextTheme;
    });
  }, []);

  const value = useMemo(
    () => ({
      theme,
      isDarkMode: theme === 'dark',
      setTheme,
      toggleTheme,
    }),
    [theme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

