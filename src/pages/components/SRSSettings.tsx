import { useEffect, useRef, useState } from "react";
import "./SRSSettings.css";
import { useLanguageApp } from "../../LanguageAppContext";

const SRSSettings = ({ language }: { language?: string }) => {
    const { readFront, setReadFront, readBack, setReadBack, fastMode, setFastMode, volume, setVolume, showLiteral, setShowLiteral, shuffleCards, setShuffleCards, displayMode, setDisplayMode } = useLanguageApp();
    const frontLabel = language ? "English" : "source";
    const backLabel = language ? language.charAt(0).toUpperCase() + language.slice(1) : "target";
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    return (
        <div className="srs-settings-wrap" ref={ref}>
            <button
                className={`srs-settings-btn ${open ? "active" : ""}`}
                onClick={() => setOpen((v) => !v)}
                title="Settings"
                aria-label="Settings"
            >
                ⚙
            </button>
            {open && (
                <div className="srs-settings-dropdown">
                    <div className="srs-settings-row">
                        <div className="srs-settings-label-group">
                            <span className="srs-settings-label">Play {frontLabel}</span>
                            <span className="srs-settings-sub">Speak the {frontLabel} side</span>
                        </div>
                        <label className="srs-toggle">
                            <input
                                type="checkbox"
                                checked={readFront}
                                onChange={(e) => setReadFront((e.currentTarget as HTMLInputElement).checked)}
                            />
                            <span className="srs-toggle-track" />
                        </label>
                    </div>

                    <div className="srs-settings-row">
                        <div className="srs-settings-label-group">
                            <span className="srs-settings-label">Play {backLabel}</span>
                            <span className="srs-settings-sub">Speak the {backLabel} side</span>
                        </div>
                        <label className="srs-toggle">
                            <input
                                type="checkbox"
                                checked={readBack}
                                onChange={(e) => setReadBack((e.currentTarget as HTMLInputElement).checked)}
                            />
                            <span className="srs-toggle-track" />
                        </label>
                    </div>

                    <div className="srs-settings-row">
                        <div className="srs-settings-label-group">
                            <span className="srs-settings-label">Fast Mode</span>
                            <span className="srs-settings-sub">See both sides at once, no ratings</span>
                        </div>
                        <label className="srs-toggle">
                            <input
                                type="checkbox"
                                checked={fastMode}
                                onChange={(e) => setFastMode((e.currentTarget as HTMLInputElement).checked)}
                            />
                            <span className="srs-toggle-track" />
                        </label>
                    </div>

                    <div className="srs-settings-row">
                        <div className="srs-settings-label-group">
                            <span className="srs-settings-label">Display</span>
                            <span className="srs-settings-sub">Word, phrase, or both</span>
                        </div>
                        <div className="srs-seg-ctrl">
                            {(['word', 'both', 'phrase'] as const).map(mode => (
                                <button
                                    key={mode}
                                    className={`srs-seg-btn${displayMode === mode ? ' active' : ''}`}
                                    onClick={() => setDisplayMode(mode)}
                                >
                                    {mode === 'word' ? 'Word' : mode === 'both' ? 'Both' : 'Phrase'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="srs-settings-row">
                        <div className="srs-settings-label-group">
                            <span className="srs-settings-label">Literal translations</span>
                            <span className="srs-settings-sub">Show word-for-word translation</span>
                        </div>
                        <label className="srs-toggle">
                            <input
                                type="checkbox"
                                checked={showLiteral}
                                onChange={(e) => setShowLiteral((e.currentTarget as HTMLInputElement).checked)}
                            />
                            <span className="srs-toggle-track" />
                        </label>
                    </div>

                    <div className="srs-settings-row">
                        <div className="srs-settings-label-group">
                            <span className="srs-settings-label">Shuffle cards</span>
                            <span className="srs-settings-sub">Randomize session order</span>
                        </div>
                        <label className="srs-toggle">
                            <input
                                type="checkbox"
                                checked={shuffleCards}
                                onChange={(e) => setShuffleCards((e.currentTarget as HTMLInputElement).checked)}
                            />
                            <span className="srs-toggle-track" />
                        </label>
                    </div>

                    <div className="srs-settings-row srs-settings-volume">
                        <span className="srs-settings-label">Volume</span>
                        <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={volume}
                            onChange={(e) => setVolume(parseFloat((e.currentTarget as HTMLInputElement).value))}
                            className="srs-volume-slider"
                        />
                        <span className="srs-volume-val">{Math.round(volume * 100)}%</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SRSSettings;
