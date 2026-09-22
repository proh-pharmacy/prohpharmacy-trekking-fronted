import React, { createContext, useCallback, useContext, useEffect, useState, useMemo } from 'react';
import { flushSync } from 'react-dom';

export type ThemeMode = 'dark' | 'light';

export interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  toggleTheme: (event?: React.MouseEvent<HTMLElement>) => void;
  setTheme: (theme: ThemeMode) => void;
}

const THEME_STORAGE_KEY = 'proh_theme';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

type ViewTransitionDocument = Document & {
  startViewTransition?: (updateCallback: () => void) => {
    ready: Promise<void>;
  };
};

type ViewTransitionAnimationOptions = KeyframeAnimationOptions & {
  pseudoElement: string;
};

type ThemeTransitionOrigin = {
  x: number;
  y: number;
  radius: number;
};

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
  } catch {
    // fallback
  }
  return 'dark';
}

function applyThemeToDom(theme: ThemeMode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  if (theme === 'light') {
    root.classList.add('light');
    root.classList.remove('dark');
  } else {
    root.classList.add('dark');
    root.classList.remove('light');
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(getInitialTheme);

  useEffect(() => {
    applyThemeToDom(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // storage disabled
    }
  }, [theme]);

  const setTheme = useCallback((newTheme: ThemeMode, origin?: ThemeTransitionOrigin) => {
    if (newTheme === theme) return;

    const transitionDocument = document as ViewTransitionDocument;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const commitTheme = () => {
      applyThemeToDom(newTheme);
      flushSync(() => setThemeState(newTheme));
    };

    if (!transitionDocument.startViewTransition || reduceMotion) {
      applyThemeToDom(newTheme);
      setThemeState(newTheme);
      return;
    }

    const x = Math.min(Math.max(origin?.x ?? window.innerWidth / 2, 0), window.innerWidth);
    const y = Math.min(Math.max(origin?.y ?? window.innerHeight / 2, 0), window.innerHeight);
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );
    const startRadius = origin?.radius ?? 0;
    const root = document.documentElement;

    // Prime the browser-generated transition layer before its first snapshot.
    // The CSS animation covers the initial transition while the direct Web
    // Animation below keeps subsequent transitions locked to the same origin.
    root.style.setProperty('--theme-transition-x', `${x}px`);
    root.style.setProperty('--theme-transition-y', `${y}px`);
    root.style.setProperty('--theme-transition-start-radius', `${startRadius}px`);
    root.style.setProperty('--theme-transition-radius', `${radius}px`);

    const transition = transitionDocument.startViewTransition(commitTheme);
    void transition.ready.then(() => {
      root.animate(
        {
          clipPath: [
            `circle(${startRadius}px at ${x}px ${y}px)`,
            `circle(${radius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 650,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'both',
          pseudoElement: '::view-transition-new(root)',
        } as ViewTransitionAnimationOptions
      );
    }).catch(() => {
      // The theme has already changed; only the decorative transition failed.
    });
  }, [theme]);

  const toggleTheme = useCallback((event?: React.MouseEvent<HTMLElement>) => {
    let origin: ThemeTransitionOrigin | undefined;

    if (event) {
      const bounds = event.currentTarget.getBoundingClientRect();
      origin = {
        x: bounds.left + bounds.width / 2,
        y: bounds.top + bounds.height / 2,
        radius: Math.hypot(bounds.width, bounds.height) / 2,
      };
    }

    setTheme(theme === 'dark' ? 'light' : 'dark', origin);
  }, [setTheme, theme]);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === 'dark',
      toggleTheme,
      setTheme,
    }),
    [theme, toggleTheme, setTheme]
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
