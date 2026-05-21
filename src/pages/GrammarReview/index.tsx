import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import type { LiteralData } from "../components/LiteralGloss";
import { useLanguageApp } from "../../LanguageAppContext";
import { useSpeech } from "../../hooks/useSpeech";
import { shuffled } from "../../utils";
import FlipCard from "../components/FlipCard";
import "../srs.css";

interface Card {
    id: string;
    front: string;
    back: string;
    romanized?: string;
    grammarNote?: string;
    literal?: LiteralData;
}

interface DeckData {
    id: string;
    name: string;
    cards: Card[];
}

const GrammarReview = () => {
    const { language, deckId, grammarId } = useParams<{
        language: string;
        deckId: string;
        grammarId: string;
    }>();
    const [, navigate] = useLocation();

    const [deck, setDeck] = useState<DeckData | null>(null);
    const [cards, setCards] = useState<Card[]>([]);
    const [index, setIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [noteOpen, setNoteOpen] = useState(true);
    const [done, setDone] = useState(false);

    const { shuffleCards } = useLanguageApp();
    const { speak } = useSpeech(language);

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

    useEffect(() => {
        if (currentCard) speak(currentCard.front, false);
    }, [index, cards.length]);

    const flip = () => {
        setIsFlipped(true);
        setNoteOpen(true);
        if (currentCard) {
            window.speechSynthesis.cancel();
            speak(currentCard.back, true);
        }
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

            {currentCard && (
                <FlipCard
                    english={currentCard.front}
                    word={currentCard.back}
                    romanized={currentCard.romanized}
                    grammarNote={currentCard.grammarNote}
                    literal={currentCard.literal}
                    isFlipped={isFlipped}
                    onFlip={flip}
                    noteOpen={noteOpen}
                    onNoteToggle={() => setNoteOpen(o => !o)}
                />
            )}

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
