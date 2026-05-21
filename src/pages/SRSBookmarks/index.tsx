import { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import type { LiteralData } from "../components/LiteralGloss";
import {
    loadDeckState, isCardHidden, toggleBookmark, saveDeckState, SRSDeckState,
    loadStoryBookmarks, saveStoryBookmarks, type StorySentenceBookmark,
} from "../useSRSStorage";
import { useSpeech } from "../../hooks/useSpeech";
import { useLanguageApp } from "../../LanguageAppContext";
import FlipCard from "../components/FlipCard";
import SRSSettings from "../components/SRSSettings";
import "../srs.css";
import "./SRSBookmarks.css";

interface Card {
    id: string;
    hidden?: boolean;
    english: string;
    word: string;
    romanized?: string;
    grammarNote?: string;
    englishPhrase?: string;
    phrase?: string;
    phraseRomanized?: string;
    literal?: LiteralData;
}

interface DeckMeta {
    id: string;
    name: string;
    language: string;
    cards: Card[];
}

interface BookmarkedCard {
    card: Card;
    deckId: string;
    deckName: string;
}

const AVAILABLE_DECKS = [
    "everyday_phrases",
    "food_and_drink",
    "common_places",
    "jobs_and_hobbies",
    "moods_and_emotion",
    "human_body",
];

const SRSBookmarks = () => {
    const { language } = useParams<{ language: string }>();
    const [, navigate] = useLocation();
    const { readBack, displayMode } = useLanguageApp();
    const { buildUtt } = useSpeech(language);
    const ttsGenRef = useRef(0);

    const [tab, setTab] = useState<"cards" | "sentences">("cards");
    const [cards, setCards] = useState<BookmarkedCard[]>([]);
    const [deckStates, setDeckStates] = useState<Record<string, SRSDeckState>>({});
    const [idx, setIdx] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [noteOpen, setNoteOpen] = useState(true);
    const [loading, setLoading] = useState(true);
    const [sentenceBookmarks, setSentenceBookmarks] = useState<StorySentenceBookmark[]>([]);

    useEffect(() => {
        if (!language) return;
        setSentenceBookmarks(loadStoryBookmarks(language));
        Promise.all(
            AVAILABLE_DECKS.map(deckId =>
                fetch(`/languages/${language}/${deckId}/index.json`)
                    .then(r => r.json() as Promise<DeckMeta>)
                    .catch(() => null)
            )
        ).then(results => {
            const decks = results.filter(Boolean) as DeckMeta[];
            const states: Record<string, SRSDeckState> = {};
            const bookmarked: BookmarkedCard[] = [];
            for (const deck of decks) {
                const state = loadDeckState(language, deck.id);
                states[deck.id] = state;
                for (const card of deck.cards) {
                    if (!isCardHidden(card, state) && state[card.id]?.bookmarked) {
                        bookmarked.push({ card, deckId: deck.id, deckName: deck.name });
                    }
                }
            }
            setDeckStates(states);
            setCards(bookmarked);
            setLoading(false);
        });
    }, [language]);

    useEffect(() => {
        if (!loading && cards.length === 0 && sentenceBookmarks.length > 0) {
            setTab("sentences");
        }
    }, [loading, cards.length, sentenceBookmarks.length]);

    const handleRemoveSentenceBookmark = (bIdx: number) => {
        if (!language) return;
        const updated = sentenceBookmarks.filter((_, i) => i !== bIdx);
        saveStoryBookmarks(language, updated);
        setSentenceBookmarks(updated);
    };

    const cancelTts = () => {
        ttsGenRef.current++;
        window.speechSynthesis.cancel();
    };

    const handleFlip = () => {
        setIsFlipped(true);
        setNoteOpen(true);
        const current = cards[idx];
        if (!current || !readBack) return;
        const gen = ++ttsGenRef.current;
        window.speechSynthesis.cancel();
        setTimeout(() => {
            if (ttsGenRef.current !== gen) return;
            if (displayMode === 'phrase') {
                if (current.card.phrase) window.speechSynthesis.speak(buildUtt(current.card.phrase, true));
                return;
            }
            const wordUtt = buildUtt(current.card.word, true);
            if (displayMode !== 'word' && current.card.phrase) {
                wordUtt.onend = () => {
                    if (ttsGenRef.current !== gen) return;
                    setTimeout(() => {
                        if (ttsGenRef.current !== gen) return;
                        window.speechSynthesis.speak(buildUtt(current.card.phrase!, true));
                    }, 450);
                };
            }
            window.speechSynthesis.speak(wordUtt);
        }, 200);
    };

    const handleNext = () => {
        cancelTts();
        setIdx(i => i + 1);
        setIsFlipped(false);
        setNoteOpen(true);
    };

    const handleUnbookmark = () => {
        const current = cards[idx];
        if (!current || !language) return;
        cancelTts();
        const newDeckState = toggleBookmark(deckStates[current.deckId], current.card.id);
        saveDeckState(language, current.deckId, newDeckState);
        setDeckStates(prev => ({ ...prev, [current.deckId]: newDeckState }));
        const newCards = cards.filter((_, i) => i !== idx);
        setCards(newCards);
        setIdx(Math.max(0, Math.min(idx, newCards.length - 1)));
        setIsFlipped(false);
        setNoteOpen(true);
    };

    if (loading) return <div className="srs-container"><p>Loading...</p></div>;

    if (cards.length === 0 && sentenceBookmarks.length === 0) {
        return (
            <div className="srs-container">
                <div className="srs-header">
                    <button className="srs-back-link" onClick={() => navigate(`/${language}/`)}>← Decks</button>
                    <span className="srs-deck-name">Bookmarks</span>
                    <span />
                </div>
                <p className="srs-empty">No bookmarks yet. Tap 🏷 on any card or story sentence to save it here.</p>
            </div>
        );
    }

    if (tab === "cards" && idx >= cards.length && cards.length > 0) {
        return (
            <div className="srs-container">
                <div className="srs-done">
                    <h2>All done!</h2>
                    <p>You went through all {cards.length} bookmarked card{cards.length !== 1 ? 's' : ''}.</p>
                    <div className="srs-done-actions">
                        <button className="srs-btn-primary" onClick={() => { setIdx(0); setIsFlipped(false); }}>
                            Review again
                        </button>
                        <button className="srs-btn-secondary" onClick={() => navigate(`/${language}/`)}>
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
                <button className="srs-back-link" onClick={() => navigate(`/${language}/`)}>← Decks</button>
                <span className="srs-deck-name">🔖 Bookmarks</span>
                <SRSSettings language={language} />
            </div>

            <div className="srs-bookmarks-tabs">
                <button
                    className={`srs-bookmarks-tab ${tab === "cards" ? "active" : ""}`}
                    onClick={() => { cancelTts(); setTab("cards"); setIdx(0); setIsFlipped(false); }}
                >
                    Cards {cards.length > 0 && `(${cards.length})`}
                </button>
                <button
                    className={`srs-bookmarks-tab ${tab === "sentences" ? "active" : ""}`}
                    onClick={() => { cancelTts(); setTab("sentences"); }}
                >
                    Sentences {sentenceBookmarks.length > 0 && `(${sentenceBookmarks.length})`}
                </button>
            </div>

            {tab === "sentences" ? (
                sentenceBookmarks.length === 0 ? (
                    <p className="srs-empty">No sentence bookmarks yet. Tap 🏷 on any story sentence to save it here.</p>
                ) : (
                    <div className="srs-sentence-bookmark-list">
                        {sentenceBookmarks.map((b, bIdx) => (
                            <div key={bIdx} className="srs-sentence-bookmark-item">
                                <div className="srs-sentence-bookmark-text">
                                    <div className="srs-sentence-bookmark-target">{b.target_language}</div>
                                    {b.romanized && (
                                        <div className="srs-sentence-bookmark-romanized">{b.romanized}</div>
                                    )}
                                    <div className="srs-sentence-bookmark-base">{b.base_language}</div>
                                    <div className="srs-sentence-bookmark-story">{b.storyName}</div>
                                </div>
                                <button
                                    className="srs-sentence-bookmark-remove"
                                    onClick={() => handleRemoveSentenceBookmark(bIdx)}
                                    title="Remove bookmark"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                )
            ) : cards.length === 0 ? (
                <p className="srs-empty">No card bookmarks yet. Tap 🏷 on any card during review to save it here.</p>
            ) : (() => {
                const current = cards[idx];
                return (
                    <>
                        <div className="srs-progress-bar-wrap">
                            <div className="srs-progress-bar-fill" style={{ width: `${(idx / cards.length) * 100}%` }} />
                        </div>

                        <div className="srs-bookmarks-meta">
                            <span className="srs-bookmarks-deck-label">{current.deckName}</span>
                            <span className="srs-bookmarks-counter">{idx + 1} / {cards.length}</span>
                        </div>

                        <FlipCard
                            english={current.card.english}
                            word={current.card.word}
                            romanized={current.card.romanized}
                            phrase={current.card.phrase}
                            phraseRomanized={current.card.phraseRomanized}
                            englishPhrase={current.card.englishPhrase}
                            literal={current.card.literal}
                            grammarNote={current.card.grammarNote}
                            isFlipped={isFlipped}
                            onFlip={handleFlip}
                            noteOpen={noteOpen}
                            onNoteToggle={() => setNoteOpen(o => !o)}
                        />

                        {isFlipped ? (
                            <div className="srs-flip-hint">
                                <div className="srs-bookmarks-actions">
                                    <button className="srs-btn-unbookmark" onClick={handleUnbookmark}>
                                        Remove 🔖
                                    </button>
                                    <button className="srs-btn-primary" onClick={handleNext}>
                                        {idx + 1 < cards.length ? 'Next →' : 'Finish'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="srs-flip-hint">
                                <button className="srs-show-answer" onClick={handleFlip}>Show Answer</button>
                            </div>
                        )}
                    </>
                );
            })()}
        </div>
    );
};

export default SRSBookmarks;
