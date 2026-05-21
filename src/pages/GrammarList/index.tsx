import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import InfoTip from "../../components/InfoTip";
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
    const [, navigate] = useLocation();
    const [deck, setDeck] = useState<DeckMeta | null>(null);

    useEffect(() => {
        if (!language || !deckId) return;
        fetch(`/languages/${language}/${deckId}/index.json`)
            .then(r => r.json())
            .then(data => setDeck(data))
            .catch(console.error);
    }, [language, deckId]);

    const lessons = deck?.grammarLessons ?? [];

    return (
        <div className="srs-container">
            <button className="srs-page-back" onClick={() => navigate(`/${language}`)}>← Back</button>

            <div className="srs-home-header">
                <div className="srs-header-row">
                    <h2>Grammar</h2>
                    <InfoTip>
                        <p><strong>Lesson</strong> opens a reading explanation of the concept with examples.</p>
                        <p><strong>Practice</strong> tests you with flashcards based on that lesson to reinforce what you learned.</p>
                    </InfoTip>
                </div>
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
                                onClick={() => navigate(`/${language}/${deckId}/grammar/${g.id}`)}
                            >
                                Lesson
                            </button>
                            <button
                                className="srs-btn-stories"
                                onClick={() => navigate(`/${language}/${deckId}/grammar/${g.id}/review`)}
                            >
                                Practice
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GrammarList;
