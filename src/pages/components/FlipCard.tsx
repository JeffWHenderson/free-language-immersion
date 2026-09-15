import type { ReactNode } from "react";
import "./FlipCard.css";
import GrammarNote from "./GrammarNote";
import LiteralGloss, { type LiteralData } from "./LiteralGloss";
import { GrammarFront, GrammarBack, type GrammarFormatData } from "./GrammarFace";
import { useLanguageApp } from "../../LanguageAppContext";

interface FlipCardProps {
    english: string;
    word: string;
    romanized?: string;
    code?: string;
    codeLang?: string;
    phrase?: string;
    phraseRomanized?: string;
    englishPhrase?: string;
    /** Romanized-style hint shown under the prompt word (front, non-reversed). */
    promptRomanized?: string;
    literal?: LiteralData;
    grammarNote?: string;
    grammar?: boolean;
    grammarFormat?: GrammarFormatData;
    isFlipped: boolean;
    onFlip: () => void;
    noteOpen: boolean;
    onNoteToggle: () => void;
    reversed?: boolean;
    backExtra?: ReactNode;
    cardCorner?: ReactNode;
    onPlay?: () => void;
    onHide?: () => void;
    /** Label for the expandable note toggle (defaults to "Grammar note"). */
    noteLabel?: string;
}

const FlipCard = ({
    english, word, romanized, code, codeLang, phrase, phraseRomanized, englishPhrase, promptRomanized, literal, grammarNote, grammar, grammarFormat,
    isFlipped, onFlip, noteOpen, onNoteToggle, reversed, backExtra, cardCorner, onPlay, onHide, noteLabel = "Grammar note",
}: FlipCardProps) => {
    const { displayMode, showLiteral, showRomanized } = useLanguageApp();
    const hasFormat = !!grammarFormat?.format;
    const literalText = !literal ? undefined
        : typeof literal === 'string' ? literal
        : literal.map(([, en]) => en).join(' ');
    return (
        <div className="srs-card-wrap">
            <div
                className={`srs-card ${isFlipped ? "flipped" : ""} ${grammar ? "grammar" : ""} ${hasFormat ? "has-format" : ""}`}
                onClick={!isFlipped ? onFlip : undefined}
            >
                <div className="srs-card-front">
                    {cardCorner}
                    {grammar && <div className="srs-card-grammar-tag">Grammar</div>}
                    {onHide && (
                        <div className="srs-card-actions">
                            <button className="srs-card-action-btn hide-btn" onClick={e => { e.stopPropagation(); onHide(); }} title="Hide card">✕</button>
                        </div>
                    )}
                    {hasFormat ? (
                        <GrammarFront data={grammarFormat!} english={english} />
                    ) : reversed ? (
                        <>
                            {displayMode !== 'phrase' && <div className="srs-card-text">{word}</div>}
                            {displayMode !== 'phrase' && showRomanized && romanized && <div className="srs-romanized">{romanized}</div>}
                            {displayMode !== 'word' && phrase && <div className="eszh-phrase">{phrase}</div>}
                            {displayMode !== 'word' && showRomanized && phraseRomanized && <div className="eszh-phrase-pin">{phraseRomanized}</div>}
                        </>
                    ) : (
                        <>
                            {displayMode !== 'phrase' && <div className="srs-card-text">{english}</div>}
                            {displayMode !== 'phrase' && showRomanized && promptRomanized && <div className="srs-romanized">{promptRomanized}</div>}
                            {displayMode !== 'word' && (
                                showLiteral && literalText
                                    ? <div className="eszh-phrase">{literalText}</div>
                                    : englishPhrase && <div className="eszh-phrase">{englishPhrase}</div>
                            )}
                        </>
                    )}
                    {!isFlipped && <div className="srs-tap-hint">tap to reveal</div>}
                </div>
                <div className="srs-card-back">
                    {cardCorner}
                    {grammar && <div className="srs-card-grammar-tag">Grammar</div>}
                    {(onPlay || onHide) && (
                        <div className="srs-card-actions">
                            {onPlay && <button className="srs-card-action-btn" onClick={e => { e.stopPropagation(); onPlay(); }} title="Play audio">▶</button>}
                            {onHide && <button className="srs-card-action-btn hide-btn" onClick={e => { e.stopPropagation(); onHide(); }} title="Hide card">✕</button>}
                        </div>
                    )}
                    {hasFormat ? (
                        <>
                            <GrammarBack data={grammarFormat!} />
                            {(phrase || englishPhrase) && (
                                <div className="srs-card-back-phrase-group g-example">
                                    {showRomanized && phraseRomanized && <div className="srs-romanized">{phraseRomanized}</div>}
                                    {phrase && <div className="srs-card-text">{phrase}</div>}
                                    {englishPhrase && <div className="srs-card-back-english">{englishPhrase}</div>}
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {displayMode !== 'phrase' && (
                                <div className="srs-card-back-word-group">
                                    {code ? (
                                        <>
                                            {codeLang && <div className="srs-card-code-lang">{codeLang}</div>}
                                            <pre className="srs-card-code"><code>{code}</code></pre>
                                        </>
                                    ) : (
                                        <>
                                            {showRomanized && romanized && <div className="srs-romanized">{romanized}</div>}
                                            <div className="srs-card-text">{word}</div>
                                        </>
                                    )}
                                    <div className="srs-card-back-english">{english}</div>
                                </div>
                            )}
                            {displayMode !== 'word' && (phrase || phraseRomanized || englishPhrase) && (
                                <div className="srs-card-back-phrase-group">
                                    {showRomanized && phraseRomanized && <div className="srs-romanized">{phraseRomanized}</div>}
                                    {phrase && <div className="srs-card-text">{phrase}</div>}
                                    {englishPhrase && <div className="srs-card-back-english">{englishPhrase}</div>}
                                </div>
                            )}
                        </>
                    )}
                    {backExtra}
                </div>
            </div>
            {isFlipped && (literal || grammarNote) && (
                <div className="srs-grammar-note-wrap" onClick={e => e.stopPropagation()}>
                    <button className="srs-grammar-note-toggle" onClick={onNoteToggle}>
                        {noteLabel} {noteOpen ? "▴" : "▾"}
                    </button>
                    {noteOpen && (
                        <div className="srs-grammar-note-body">
                            {literal && <LiteralGloss literal={literal} context="note" />}
                            {literal && grammarNote && <hr className="srs-note-divider" />}
                            {grammarNote && <GrammarNote note={grammarNote} inline />}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FlipCard;
