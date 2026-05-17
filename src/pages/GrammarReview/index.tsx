import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLanguageApp } from "../../LanguageAppContext";
import useLanguage from "../../hooks/useLanguage";
import "../srs.css";

interface CardLevel {
    front: string;
    back: string;
    romanized?: string;
    grammarNote?: string;
    literal?: string;
}

interface Card {
    id: string;
    levels: CardLevel[];
}

interface DeckData {
    id: string;
    name: string;
    cards: Card[];
}

function shuffled<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

const GrammarReview = () => {
    const { language, deckId, grammarId } = useParams<{
        language: string;
        deckId: string;
        grammarId: string;
    }>();
    const navigate = useNavigate();

    const [deck, setDeck] = useState<DeckData | null>(null);
    const [cards, setCards] = useState<Card[]>([]);
    const [index, setIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [noteOpen, setNoteOpen] = useState(true);
    const [done, setDone] = useState(false);

    const { readFront, readBack, volume, showLiteral, shuffleCards } = useLanguageApp();
    const { targetVoice, baseVoice } = useLanguage({ targetLanguage: language ?? "english" });

    const buildUtt = useCallback((text: string, isTarget: boolean): SpeechSynthesisUtterance => {
        const utt = new SpeechSynthesisUtterance(text.replace(/\(.*?\)/g, ""));
        utt.voice = (isTarget ? targetVoice : baseVoice) ?? null;
        utt.rate = 0.9;
        utt.volume = volume;
        return utt;
    }, [targetVoice, baseVoice, volume]);

    const speak = useCallback((text: string, isTarget: boolean) => {
        if (isTarget ? !readBack : !readFront) return;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(buildUtt(text, isTarget));
    }, [readFront, readBack, buildUtt]);

    useEffect(() => {
        if (!language || !deckId || !grammarId) return;
        fetch(`/languages/${language}/${deckId}/grammar/${grammarId}.json`)
            .then(r => r.json())
            .then((data: DeckData) => {
                setDeck(data);
                setCards(shuffleCards ? shuffled(data.cards) : data.cards);
            })
            .catch(e => console.error(e));
    }, [language, deckId, grammarId]);

    const currentCard = cards[index];
    const level = currentCard?.levels[0];

    useEffect(() => {
        if (level) speak(level.front, false);
    }, [index, cards.length]);

    const flip = () => {
        setIsFlipped(true);
        setNoteOpen(true);
        if (level) speak(level.back, true);
    };

    const next = () => {
        if (index + 1 >= cards.length) {
            setDone(true);
        } else {
            setIndex(i => i + 1);
            setIsFlipped(false);
            setNoteOpen(true);
        }
    };

    if (!deck) return <div className="srs-container"><p>Loading...</p></div>;

    if (done) {
        return (
            <div className="srs-container">
                <div className="srs-done">
                    <h2>Session complete!</h2>
                    <p>Reviewed {cards.length} card{cards.length !== 1 ? "s" : ""}.</p>
                    <div className="srs-done-actions">
                        <button
                            className="srs-btn-secondary"
                            onClick={() => navigate(`/${language}/${deckId}/grammar`)}
                        >
                            Back to Grammar
                        </button>
                        <button className="srs-btn-primary" onClick={() => navigate(`/${language}`)}>
                            Back to Decks
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="srs-container">
            <div className="srs-header">
                <button
                    className="srs-back-link"
                    onClick={() => navigate(`/${language}/${deckId}/grammar`)}
                >
                    ← Grammar
                </button>
                <span className="srs-deck-name">{deck.name}</span>
            </div>

            <div className="srs-progress-bar-wrap">
                <div
                    className="srs-progress-bar-fill"
                    style={{ width: `${cards.length > 0 ? (index / cards.length) * 100 : 0}%` }}
                />
            </div>
            <div className="srs-count-row">
                <span>{index + 1} / {cards.length}</span>
            </div>

            <div className="srs-card-wrap">
                <div className={`srs-card ${isFlipped ? "flipped" : ""}`} onClick={!isFlipped ? flip : undefined}>
                    <div className="srs-card-front">
                        <div className="srs-card-text">{level?.front}</div>
                        {showLiteral && level?.literal && (
                            <div className="srs-literal">{level.literal}</div>
                        )}
                        {!isFlipped && <div className="srs-tap-hint">tap to reveal</div>}
                    </div>
                    <div className="srs-card-back">
                        <div className="srs-card-text front-dim">{level?.front}</div>
                        {showLiteral && level?.literal && (
                            <div className="srs-literal front-dim">{level.literal}</div>
                        )}
                        <hr className="srs-divider" />
                        <div className="srs-card-text">{level?.back}</div>
                        {level?.romanized && (
                            <div className="srs-romanized">{level.romanized}</div>
                        )}
                    </div>
                </div>
                {isFlipped && level?.grammarNote && (
                    <div className="srs-grammar-note-wrap" onClick={e => e.stopPropagation()}>
                        <button
                            className="srs-grammar-note-toggle"
                            onClick={() => setNoteOpen(o => !o)}
                        >
                            Grammar note {noteOpen ? "▴" : "▾"}
                        </button>
                        {noteOpen && (
                            <div className="srs-grammar-note-body">{level.grammarNote}</div>
                        )}
                    </div>
                )}
            </div>

            {isFlipped ? (
                <div className="srs-flip-hint">
                    <button className="srs-show-answer" onClick={next}>
                        {index + 1 >= cards.length ? "Finish" : "Next →"}
                    </button>
                </div>
            ) : (
                <div className="srs-flip-hint">
                    <button className="srs-show-answer" onClick={flip}>Show Answer</button>
                </div>
            )}
        </div>
    );
};

export default GrammarReview;
