import type { ReactNode } from "react";
import { useLanguageApp } from "../../LanguageAppContext";

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
    const { showLiteral } = useLanguageApp();

    return (
        <div className="srs-card-wrap">
            <div
                className={`srs-card ${isFlipped ? "flipped" : ""}`}
                onClick={!isFlipped ? onFlip : undefined}
            >
                {reversed ? (
                    <>
                        <div className="srs-card-front">
                            <div className="srs-card-text">{word}</div>
                            {romanized && <div className="srs-romanized">{romanized}</div>}
                            {phrase && <div className="eszh-phrase">{phrase}</div>}
                            {phraseRomanized && <div className="eszh-phrase-pin">{phraseRomanized}</div>}
                            {!isFlipped && <div className="srs-tap-hint">tap to reveal</div>}
                        </div>
                        <div className="srs-card-back">
                            <div className="srs-card-text front-dim">{word}</div>
                            {phrase && <div className="eszh-phrase front-dim">{phrase}</div>}
                            <hr className="srs-divider" />
                            <div className="srs-card-text">{english}</div>
                            {showLiteral && literal && <div className="srs-literal">{literal}</div>}
                            {englishPhrase && <div className="eszh-phrase">{englishPhrase}</div>}
                            {backExtra}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="srs-card-front">
                            <div className="srs-card-text">{english}</div>
                            {englishPhrase && <div className="eszh-phrase">{englishPhrase}</div>}
                            {!isFlipped && <div className="srs-tap-hint">tap to reveal</div>}
                        </div>
                        <div className="srs-card-back">
                            <div className="srs-card-text front-dim">{english}</div>
                            {englishPhrase && <div className="eszh-phrase front-dim">{englishPhrase}</div>}
                            <hr className="srs-divider" />
                            <div className="srs-card-text">{word}</div>
                            {romanized && <div className="srs-romanized">{romanized}</div>}
                            {phrase && <div className="eszh-phrase">{phrase}</div>}
                            {phraseRomanized && <div className="eszh-phrase-pin">{phraseRomanized}</div>}
                            {backExtra}
                        </div>
                    </>
                )}
            </div>
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
