import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import InfoTip from "../../components/InfoTip";
import "../srs.css";

interface GrammarLessonMeta {
    id: string;
    name: string;
}

interface DeckMeta {
    id: string;
    name: string;
    grammarLessons?: GrammarLessonMeta[];
}

const AVAILABLE_DECKS = [
    "everyday_phrases",
    "food_and_drink",
    "common_places",
    "jobs_and_hobbies",
    "moods_and_emotion",
    "human_body",
    "jeffs_deck",
    "software_development",
    "sports",
    "night_life",
    "dungeons_and_dragons",
    "core_2000",
];

const AllGrammarList = () => {
    const { language } = useParams<{ language: string }>();
    const [, navigate] = useLocation();
    const [decks, setDecks] = useState<DeckMeta[]>([]);

    useEffect(() => {
        if (!language) return;
        Promise.all(
            AVAILABLE_DECKS.map(deckId =>
                fetch(`/languages/${language}/${deckId}/index.json`)
                    .then(r => r.json() as Promise<DeckMeta>)
                    .catch(() => null)
            )
        ).then(results => {
            setDecks(
                (results.filter(Boolean) as DeckMeta[])
                    .filter(d => d.grammarLessons && d.grammarLessons.length > 0)
            );
        });
    }, [language]);

    return (
        <div className="srs-container">
            <button className="srs-page-back" onClick={() => navigate(`/${language}/`)}>← Back</button>

            <div className="srs-home-header">
                <div className="srs-header-row">
                    <h2>Grammar</h2>
                    <InfoTip>
                        <p><strong>Lesson</strong> opens a reading explanation of the concept with examples.</p>
                        <p><strong>Practice</strong> tests you with flashcards based on that lesson to reinforce what you learned.</p>
                    </InfoTip>
                </div>
            </div>

            <div className="srs-deck-list">
                {decks.length === 0 && <p>Loading...</p>}
                {decks.map(deck => (
                    <div key={deck.id}>
                        <p className="srs-lang-label" style={{ marginBottom: '6px' }}>{deck.name}</p>
                        {deck.grammarLessons!.map(g => (
                            <div key={g.id} className="srs-deck-card" style={{ marginBottom: '8px' }}>
                                <div className="srs-deck-top">
                                    <div className="srs-deck-top-left">
                                        <div className="srs-deck-title">{g.name}</div>
                                    </div>
                                </div>
                                <div className="srs-deck-bottom">
                                    <button
                                        className="srs-btn-primary"
                                        onClick={() => navigate(`/${language}/${deck.id}/grammar/${g.id}`)}
                                    >
                                        Lesson
                                    </button>
                                    <button
                                        className="srs-btn-stories"
                                        onClick={() => navigate(`/${language}/${deck.id}/grammar/${g.id}/review`)}
                                    >
                                        Practice
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AllGrammarList;
