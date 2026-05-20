import { useEffect, useRef, useState } from "react";
import "./SRSSettings.css";
import { useLanguageApp } from "../../LanguageAppContext";

const SRSSettings = () => {
    const { readFront, setReadFront, readBack, setReadBack, fastMode, setFastMode, volume, setVolume, showLiteral, setShowLiteral, shuffleCards, setShuffleCards } = useLanguageApp();
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
                            <span className="srs-settings-label">Read front</span>
                            <span className="srs-settings-sub">Speak the English prompt</span>
                        </div>
                        <label className="srs-toggle">
                            <input
                                type="checkbox"
                                checked={readFront}
                                onChange={(e) => setReadFront(e.target.checked)}
                            />
                            <span className="srs-toggle-track" />
                        </label>
                    </div>

                    <div className="srs-settings-row">
                        <div className="srs-settings-label-group">
                            <span className="srs-settings-label">Read back</span>
                            <span className="srs-settings-sub">Speak the target language answer</span>
                        </div>
                        <label className="srs-toggle">
                            <input
                                type="checkbox"
                                checked={readBack}
                                onChange={(e) => setReadBack(e.target.checked)}
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
                                onChange={(e) => setFastMode(e.target.checked)}
                            />
                            <span className="srs-toggle-track" />
                        </label>
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
                                onChange={(e) => setShowLiteral(e.target.checked)}
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
                                onChange={(e) => setShuffleCards(e.target.checked)}
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
                            onChange={(e) => setVolume(parseFloat(e.target.value))}
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
