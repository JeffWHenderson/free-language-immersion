import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { loadDeckState, getDeckSummary } from "../useSRSStorage";
import "../srs.css";

interface GrammarLessonMeta {
    id: string;
    name: string;
}

interface DeckMeta {
    id: string;
    name: string;
    language: string;
    stories?: string[];
    pictureLessons?: string[];
    grammarLessons?: GrammarLessonMeta[];
    cards: { id: string; hidden?: boolean; levels: unknown[] }[];
}

const AVAILABLE_DECKS = [
    "everyday_phrases",
    "food_and_drink",
    "common_places",
    "jobs_and_hobbies",
    "moods_and_emotion",
    "human_body",
];

const SRSHome = () => {
    const { language } = useParams<{ language: string }>();
    const navigate = useNavigate();
    const [deckMetas, setDeckMetas] = useState<DeckMeta[]>([]);

    useEffect(() => {
        if (!language) return;
        Promise.all(
            AVAILABLE_DECKS.map((deckId) =>
                fetch(`/languages/${language}/${deckId}.json`)
                    .then((r) => r.json() as Promise<DeckMeta>)
                    .catch(() => null)
            )
        ).then((results) => {
            setDeckMetas(results.filter(Boolean) as DeckMeta[]);
        });
    }, [language]);

    return (
        <div className="srs-container">
            <div className="srs-home-header">
                <h2>Spaced Repetition Decks</h2>
                <p className="srs-lang-label">{language}</p>
            </div>

            <div className="srs-deck-list">
                {deckMetas.length === 0 && <p>Loading decks...</p>}
                {deckMetas.map((deck) => {
                    const state = loadDeckState(language!, deck.id);
                    const summary = getDeckSummary(deck.cards, state);
                    const totalDue = summary.newCount + summary.dueCount + summary.learnCount;

                    return (
                        <div key={deck.id} className="srs-deck-card">
                            <div className="srs-deck-top">
                                <div className="srs-deck-top-left">
                                    <div className="srs-deck-title">{deck.name}</div>
                                    <div className="srs-deck-counts">
                                        <span className="srs-count new">{summary.newCount} new</span>
                                        <span className="srs-count learn">{summary.learnCount} learning</span>
                                        <span className="srs-count review">{summary.dueCount} due</span>
                                    </div>
                                </div>
                                <button
                                    className="srs-btn-reset"
                                    onClick={() => navigate(`/${language}/${deck.id}/browse?filter=all`)}
                                >
                                    Browse Deck
                                </button>
                            </div>
                            <div className="srs-deck-bottom">
                                <button
                                    className="srs-btn-primary"
                                    disabled={totalDue === 0}
                                    onClick={() => navigate(`/${language}/${deck.id}`)}
                                >
                                    {totalDue > 0 ? `Study (${totalDue})` : "Nothing due"}
                                </button>
                                {deck.pictureLessons && deck.pictureLessons.length > 0 && (
                                    <button
                                        className="srs-btn-stories"
                                        onClick={() => navigate(`/${language}/pictures?deck=${deck.id}`)}
                                    >
                                        Pictures
                                    </button>
                                )}
                                {deck.stories && deck.stories.length > 0 && (
                                    <button
                                        className="srs-btn-stories"
                                        onClick={() => navigate(`/${language}/stories?deck=${deck.id}`)}
                                    >
                                        Stories
                                    </button>
                                )}
                                {deck.grammarLessons && deck.grammarLessons.length > 0 && (
                                    <button
                                        className="srs-btn-grammar"
                                        onClick={() => navigate(`/${language}/${deck.id}/grammar`)}
                                    >
                                        Grammar
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="srs-how-it-works">
                <h3>How it works</h3>
                <ul>
                    <li><strong>Again</strong> — you forgot. Card comes back in this session.</li>
                    <li><strong>Hard</strong> — correct but difficult. Short interval.</li>
                    <li><strong>Good</strong> — correct with normal effort. Standard interval.</li>
                    <li><strong>Easy</strong> — recalled instantly. Longer interval.</li>
                </ul>
                <p>Cards you know well are shown less often. Cards you struggle with come back sooner. Progress is saved in your browser.</p>
            </div>
        </div>
    );
};

export default SRSHome;
