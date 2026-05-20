import type { ReactNode } from "react";
import { useLanguageApp } from "../../LanguageAppContext";

export interface CardLevel {
    front: string;
    back: string;
    romanized?: string;
    grammarNote?: string;
    literal?: string;
}

interface FlipCardProps {
    level: CardLevel;
    isFlipped: boolean;
    onFlip: () => void;
    noteOpen: boolean;
    onNoteToggle: () => void;
    backExtra?: ReactNode;
    reversed?: boolean;
}

const FlipCard = ({ level, isFlipped, onFlip, noteOpen, onNoteToggle, backExtra, reversed }: FlipCardProps) => {
    const { showLiteral } = useLanguageApp();

    const frontText = reversed ? level.back : level.front;
    const backText = reversed ? level.front : level.back;
    const frontRomanized = reversed ? level.romanized : undefined;
    const backRomanized = reversed ? undefined : level.romanized;

    return (
        <div className="srs-card-wrap">
            <div
                className={`srs-card ${isFlipped ? "flipped" : ""}`}
                onClick={!isFlipped ? onFlip : undefined}
            >
                <div className="srs-card-front">
                    <div className="srs-card-text">{frontText}</div>
                    {frontRomanized && <div className="srs-romanized">{frontRomanized}</div>}
                    {!reversed && showLiteral && level.literal && (
                        <div className="srs-literal">{level.literal}</div>
                    )}
                    {!isFlipped && <div className="srs-tap-hint">tap to reveal</div>}
                </div>
                <div className="srs-card-back">
                    <div className="srs-card-text front-dim">{frontText}</div>
                    {frontRomanized && <div className="srs-romanized" style={{ opacity: 0.4 }}>{frontRomanized}</div>}
                    {!reversed && showLiteral && level.literal && (
                        <div className="srs-literal front-dim">{level.literal}</div>
                    )}
                    <hr className="srs-divider" />
                    <div className="srs-card-text">{backText}</div>
                    {backRomanized && <div className="srs-romanized">{backRomanized}</div>}
                    {reversed && showLiteral && level.literal && (
                        <div className="srs-literal">{level.literal}</div>
                    )}
                    {backExtra}
                </div>
            </div>
            {isFlipped && level.grammarNote && (
                <div className="srs-grammar-note-wrap" onClick={e => e.stopPropagation()}>
                    <button
                        className="srs-grammar-note-toggle"
                        onClick={onNoteToggle}
                    >
                        Grammar note {noteOpen ? "▴" : "▾"}
                    </button>
                    {noteOpen && (
                        <div className="srs-grammar-note-body">{level.grammarNote}</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FlipCard;
