import { createContext, useContext, useState } from "react";

export type DisplayMode = 'word' | 'phrase' | 'both';

interface LanguageAppContextValue {
    readFront: boolean;
    setReadFront: (enabled: boolean) => void;
    readBack: boolean;
    setReadBack: (enabled: boolean) => void;
    fastMode: boolean;
    setFastMode: (enabled: boolean) => void;
    volume: number;
    setVolume: (volume: number) => void;
    showLiteral: boolean;
    setShowLiteral: (enabled: boolean) => void;
    showRomanized: boolean;
    setShowRomanized: (enabled: boolean) => void;
    displayMode: DisplayMode;
    setDisplayMode: (mode: DisplayMode) => void;
    autoplay: boolean;
    setAutoplay: (enabled: boolean) => void;
}

const LanguageAppContext = createContext<LanguageAppContextValue>({
    readFront: false,
    setReadFront: () => {},
    readBack: true,
    setReadBack: () => {},
    fastMode: false,
    setFastMode: () => {},
    volume: 1,
    setVolume: () => {},
    showLiteral: false,
    setShowLiteral: () => {},
    showRomanized: true,
    setShowRomanized: () => {},
    displayMode: 'both',
    setDisplayMode: () => {},
    autoplay: false,
    setAutoplay: () => {},
});

export const LanguageAppProvider = ({ children }: { children: React.ReactNode }) => {
    const [readFront, setReadFrontState] = useState(() => localStorage.getItem("srs_readFront") === "true");
    const setReadFront = (v: boolean) => { localStorage.setItem("srs_readFront", String(v)); setReadFrontState(v); };
    const [readBack, setReadBackState] = useState(() => localStorage.getItem("srs_readBack") !== "false");
    const setReadBack = (v: boolean) => { localStorage.setItem("srs_readBack", String(v)); setReadBackState(v); };
    const [fastMode, setFastMode] = useState(false);
    const [volume, setVolume] = useState(1);
    const [showLiteral, setShowLiteralState] = useState(() => {
        return localStorage.getItem("srs_showLiteral") === "true";
    });

    const setShowLiteral = (enabled: boolean) => {
        localStorage.setItem("srs_showLiteral", String(enabled));
        setShowLiteralState(enabled);
    };

    const [showRomanized, setShowRomanizedState] = useState(() => {
        return localStorage.getItem("srs_showRomanized") !== "false";
    });

    const setShowRomanized = (enabled: boolean) => {
        localStorage.setItem("srs_showRomanized", String(enabled));
        setShowRomanizedState(enabled);
    };

    const [displayMode, setDisplayModeState] = useState<DisplayMode>(() => {
        const v = localStorage.getItem("srs_displayMode");
        return (v === 'word' || v === 'phrase' || v === 'both') ? v : 'both';
    });

    const setDisplayMode = (mode: DisplayMode) => {
        localStorage.setItem("srs_displayMode", mode);
        setDisplayModeState(mode);
    };

    const [autoplay, setAutoplayState] = useState(() => {
        return localStorage.getItem("srs_autoplay") === "true";
    });

    const setAutoplay = (enabled: boolean) => {
        localStorage.setItem("srs_autoplay", String(enabled));
        setAutoplayState(enabled);
    };

    return (
        <LanguageAppContext.Provider value={{ readFront, setReadFront, readBack, setReadBack, fastMode, setFastMode, volume, setVolume, showLiteral, setShowLiteral, showRomanized, setShowRomanized, displayMode, setDisplayMode, autoplay, setAutoplay }}>
            {children}
        </LanguageAppContext.Provider>
    );
};

export const useLanguageApp = () => useContext(LanguageAppContext);
