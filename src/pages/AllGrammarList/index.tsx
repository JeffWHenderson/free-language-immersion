import { useParams, useLocation } from "wouter";
import { useDecks } from "../../hooks/useDecks";
import InfoTip from "../../components/InfoTip";
import "../srs.css";

const AllGrammarList = () => {
    const { language } = useParams<{ language: string }>();
    const [, navigate] = useLocation();
    const { packs, loading } = useDecks(language);

    const decksWithGrammar = packs.filter(
        (p) => p.grammarLessons && p.grammarLessons.length > 0
    );

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
                {loading && <p>Loading...</p>}
                {decksWithGrammar.map((deck) => (
                    <div key={deck.id}>
                        <p className="srs-lang-label" style={{ marginBottom: '6px' }}>{deck.name}</p>
                        {deck.grammarLessons!.map((g) => (
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
