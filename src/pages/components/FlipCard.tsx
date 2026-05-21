import type { ReactNode } from "react";
import "./FlipCard.css";

interface FlipCardProps {
    english: string;
    word: string;
    romanized?: string;
    phrase?: string;
    phraseRomanized?: string;
    englishPhrase?: string;
    literal?: string;
    grammarNote?: string;
    isFlipped: boolean;
    onFlip: () => void;
    noteOpen: boolean;
    onNoteToggle: () => void;
    reversed?: boolean;
    backExtra?: ReactNode;
}

const FlipCard = ({
    english, word, romanized, phrase, phraseRomanized, englishPhrase, literal, grammarNote,
    isFlipped, onFlip, noteOpen, onNoteToggle, reversed, backExtra,
}: FlipCardProps) => {
    return (
        <div className="srs-card-wrap">
            <div
                className={`srs-card ${isFlipped ? "flipped" : ""}`}
                onClick={!isFlipped ? onFlip : undefined}
            >
                <div className="srs-card-front">
                    {reversed ? (
                        <>
                            <div className="srs-card-text">{word}</div>
                            {romanized && <div className="srs-romanized">{romanized}</div>}
                            {phrase && <div className="eszh-phrase">{phrase}</div>}
                            {phraseRomanized && <div className="eszh-phrase-pin">{phraseRomanized}</div>}
                        </>
                    ) : (
                        <>
                            <div className="srs-card-text">{english}</div>
                            {englishPhrase && <div className="eszh-phrase">{englishPhrase}</div>}
                        </>
                    )}
                    {!isFlipped && <div className="srs-tap-hint">tap to reveal</div>}
                </div>
                <div className="srs-card-back">
                    <div className="srs-card-back-word-group">
                        {romanized && <div className="srs-romanized">{romanized}</div>}
                        <div className="srs-card-text">{word}</div>
                        <div className="srs-card-back-english">{english}</div>
                    </div>
                    {(phrase || phraseRomanized || englishPhrase) && (
                        <div className="srs-card-back-phrase-group">
                            {phraseRomanized && <div className="srs-romanized">{phraseRomanized}</div>}
                            {phrase && <div className="srs-card-text">{phrase}</div>}
                            {englishPhrase && <div className="srs-card-back-english">{englishPhrase}</div>}
                        </div>
                    )}
                    {backExtra}
                </div>
            </div>
            {isFlipped && literal && (
                <div className="srs-literal-note">
                    Lit. {literal}
                </div>
            )}
            {isFlipped && grammarNote && (
                <div className="srs-grammar-note-wrap" onClick={e => e.stopPropagation()}>
                    <button className="srs-grammar-note-toggle" onClick={onNoteToggle}>
                        Grammar note {noteOpen ? "▴" : "▾"}
                    </button>
                    {noteOpen && <div className="srs-grammar-note-body">{grammarNote}</div>}
                </div>
            )}
        </div>
    );
};

export default FlipCard;
