import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../srs.css";

interface GrammarLessonMeta {
    id: string;
    name: string;
}

interface DeckMeta {
    name: string;
    grammarLessons?: GrammarLessonMeta[];
}

const GrammarList = () => {
    const { language, deckId } = useParams<{ language: string; deckId: string }>();
    const navigate = useNavigate();
    const [deck, setDeck] = useState<DeckMeta | null>(null);

    useEffect(() => {
        if (!language || !deckId) return;
        fetch(`/languages/${language}/${deckId}.json`)
            .then(r => r.json())
            .then(data => setDeck(data))
            .catch(console.error);
    }, [language, deckId]);

    const lessons = deck?.grammarLessons ?? [];

    return (
        <div className="srs-container">
            <button className="srs-page-back" onClick={() => navigate(-1)}>← Back</button>

            <div className="srs-home-header">
                <h2>Grammar</h2>
                {deck && <p className="srs-lang-label">{deck.name}</p>}
            </div>

            <div className="srs-deck-list">
                {!deck && <p>Loading...</p>}
                {deck && lessons.length === 0 && (
                    <p className="srs-empty">No grammar lessons for this deck yet.</p>
                )}
                {lessons.map(g => (
                    <div key={g.id} className="srs-deck-card">
                        <div className="srs-deck-top">
                            <div className="srs-deck-top-left">
                                <div className="srs-deck-title">{g.name}</div>
                            </div>
                        </div>
                        <div className="srs-deck-bottom">
                            <button
                                className="srs-btn-primary"
                                onClick={() => navigate(`/${language}/${deckId}/grammar/${g.id}/review`)}
                            >
                                Study
                            </button>
                            <button
                                className="srs-btn-stories"
                                onClick={() => navigate(`/${language}/${deckId}/grammar/${g.id}`)}
                            >
                                Lesson
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GrammarList;
