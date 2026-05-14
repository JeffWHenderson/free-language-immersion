import { Outlet, Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useTheme } from "./common/ThemeContext"
import { LanguageAppProvider } from "./LanguageAppContext";
import "./main-styles.css"

const ScrollToTop = () => {
    const { pathname } = useLocation();
    useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
    return null;
};

const LanguageAppLayout = () => {
    const { theme, toggleTheme } = useTheme();
    return (
        <LanguageAppProvider>
            <ScrollToTop />
            <div style={{ width: '100%', minHeight: '100vh' }}>
                <div style={{
                    display: "flex",
                    backgroundColor: "black",
                    height: '56px',
                    width: '100%',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 24px',
                    boxSizing: 'border-box',
                    position: 'sticky',
                    top: 0,
                    zIndex: 100,
                }}>
                    <Link to="/" style={{ fontSize: "1.2em", color: 'white', fontWeight: 700, letterSpacing: '-0.01em', textDecoration: 'none' }}>
                        Free Language Immersion
                    </Link>
                    <button onClick={toggleTheme}>
                        {theme === 'light' ? 'Dark' : 'Light'} Mode
                    </button>
                </div>
                <Outlet />
            </div>
        </LanguageAppProvider>
    );
};

export default LanguageAppLayout;
