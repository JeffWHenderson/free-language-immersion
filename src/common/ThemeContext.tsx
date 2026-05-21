// src/context/ThemeContext.tsx
import { createContext, useState, useEffect, useContext, ReactNode } from 'react';

export type ThemeName = 'light' | 'dark';

export interface ThemeContextType {
    theme: ThemeName;
    toggleTheme: () => void;
}

const getInitialTheme = (): ThemeName => {
    if (localStorage.getItem('color-theme') === 'dark') {
        return 'dark'
    } else {
        return 'light'
    }
};

export const ThemeContext = createContext<ThemeContextType>({} as ThemeContextType);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const [theme, setTheme] = useState<ThemeName>(getInitialTheme);

    const rawSetTheme = (newTheme: ThemeName) => {
        document.documentElement.dataset['theme'] = newTheme
        localStorage.setItem('color-theme', newTheme); // persist between sessions
    };

    useEffect(() => {
        rawSetTheme(theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((theme) => (theme === 'light' ? 'dark' : 'light'));
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);