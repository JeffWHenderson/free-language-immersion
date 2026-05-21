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
    shuffleCards: boolean;
    setShuffleCards: (enabled: boolean) => void;
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
    shuffleCards: false,
    setShuffleCards: () => {},
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

    const [shuffleCards, setShuffleCardsState] = useState(() => {
        return localStorage.getItem("srs_shuffleCards") === "true";
    });

    const setShuffleCards = (enabled: boolean) => {
        localStorage.setItem("srs_shuffleCards", String(enabled));
        setShuffleCardsState(enabled);
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
        <LanguageAppContext.Provider value={{ readFront, setReadFront, readBack, setReadBack, fastMode, setFastMode, volume, setVolume, showLiteral, setShowLiteral, shuffleCards, setShuffleCards, displayMode, setDisplayMode, autoplay, setAutoplay }}>
            {children}
        </LanguageAppContext.Provider>
    );
};

export const useLanguageApp = () => useContext(LanguageAppContext);
