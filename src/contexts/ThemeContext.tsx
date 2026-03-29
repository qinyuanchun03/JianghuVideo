import React, { createContext, useContext, useState, useEffect } from 'react';

export type Theme = 'dark' | 'day' | 'night' | 'girl' | 'sunset' | 'ocean' | 'forest';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({ theme: 'dark', setTheme: () => {} });

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>((localStorage.getItem('app_theme') as Theme) || 'dark');

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('app_theme', newTheme);
  };

  useEffect(() => {
    document.documentElement.classList.remove('theme-day', 'theme-night', 'theme-girl', 'theme-sunset', 'theme-ocean', 'theme-forest');
    if (theme !== 'dark') {
      document.documentElement.classList.add(`theme-${theme}`);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
