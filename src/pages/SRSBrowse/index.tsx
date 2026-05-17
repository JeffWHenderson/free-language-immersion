import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { CardState, isDue, isNew } from "../fsrs";
import { loadDeckState, getCardState, resetDeck, saveDeckState, updateCardState, isCardHidden, SRSDeckState } from "../useSRSStorage";
import "../srs.css";

interface CardLevel {
    front: string;
    back: string;
    romanized?: string;
}

interface Card {
    id: string;
    hidden?: boolean;
    levels: CardLevel[];
}

interface DeckData {
    id: string;
    name: string;
    cards: Card[];
}

type FilterType = "all" | "new" | "learning" | "due" | "hidden";

function familiarity(state: CardState): 1 | 2 | 3 | 4 | 5 {
    if (isNew(state)) return 1;
    if (state.stability <= 1) return 2;
    if (state.stability <= 7) return 3;
    if (state.stability <= 30) return 4;
    return 5;
}

const FAM_LABEL: Record<number, string> = {
    1: "New",
    2: "Learning",
    3: "Young",
    4: "Established",
    5: "Mature",
};

const FILTERS: { key: FilterType; label: string }[] = [
    { key: "all", label: "All" },
    { key: "new", label: "New" },
    { key: "learning", label: "Learning" },
    { key: "due", label: "Due" },
    { key: "hidden", label: "Hidden" },
];

const LEVEL_NAMES = ["Vocabulary", "Phrase"];

const SRSBrowse = () => {
    const { language, deckId } = useParams<{ language: string; deckId: string }>();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const filter = (searchParams.get("filter") ?? "new") as FilterType;

    const [deck, setDeck] = useState<DeckData | null>(null);
    const [deckState, setDeckState] = useState<SRSDeckState>({});

    const handleReset = () => {
        if (!language || !deckId) return;
        if (confirm("Reset all progress for this deck? This cannot be undone.")) {
            resetDeck(language, deckId);
            setDeckState({});
        }
    };

    const toggleHidden = (card: Card) => {
        if (!language || !deckId) return;
        const currentlyHidden = isCardHidden(card, deckState);
        const state = getCardState(deckState, card.id);
        const updated = updateCardState(deckState, card.id, { ...state, hidden: !currentlyHidden });
        saveDeckState(language, deckId, updated);
        setDeckState(updated);
    };

    useEffect(() => {
        if (!language || !deckId) return;
        fetch(`/languages/${language}/${deckId}/index.json`)
            .then((r) => r.json())
            .then((data: DeckData) => {
                setDeck(data);
                setDeckState(loadDeckState(language, deckId));
            });
    }, [language, deckId]);

    if (!deck) return <div className="srs-container"><p>Loading...</p></div>;

    const visibleCards = deck.cards.filter(c => !isCardHidden(c, deckState));

    const filteredCards = deck.cards.filter((card) => {
        const hidden = isCardHidden(card, deckState);
        if (filter === "hidden") return hidden;
        if (hidden) return false;
        const state = getCardState(deckState, card.id);
        switch (filter) {
            case "new": return isNew(state);
            case "learning": return state.state === "learning" && isDue(state);
            case "due": return isDue(state);
            default: return true;
        }
    });

    const countFor = (f: FilterType) => {
        return deck.cards.filter((card) => {
            const hidden = isCardHidden(card, deckState);
            if (f === "hidden") return hidden;
            if (hidden) return false;
            const state = getCardState(deckState, card.id);
            if (f === "all") return true;
            if (f === "new") return isNew(state);
            if (f === "learning") return state.state === "learning" && isDue(state);
            if (f === "due") return isDue(state);
            return true;
        }).length;
    };

    return (
        <div className="srs-container">
            <div className="srs-browse-header">
                <button className="srs-page-back" onClick={() => navigate(`/${language}`)}>
                    ← {deck.name}
                </button>
                <button className="srs-btn-reset" onClick={handleReset}>Reset deck</button>
            </div>

            <div className="srs-browse-filters">
                {FILTERS.map(({ key, label }) => (
                    <button
                        key={key}
                        className={`srs-browse-filter-btn ${filter === key ? "active" : ""}`}
                        onClick={() => setSearchParams({ filter: key })}
                    >
                        {label}
                        <span className="srs-browse-filter-count">{countFor(key)}</span>
                    </button>
                ))}
            </div>

            {filter === "all" && (
                <p className="srs-browse-hint">{visibleCards.length} of {deck.cards.length} cards active</p>
            )}

            <div className="srs-browse-list">
                {filteredCards.length === 0 && (
                    <p className="srs-empty">No cards in this category.</p>
                )}
                {filteredCards.map((card) => {
                    const state = getCardState(deckState, card.id);
                    const isHidden = isCardHidden(card, deckState);
                    const fam = familiarity(state);
                    const levelIdx = Math.min(state.level, card.levels.length - 1);
                    const level = card.levels[levelIdx];
                    const levelName = LEVEL_NAMES[levelIdx] ?? `Level ${levelIdx + 1}`;
                    return (
                        <div key={card.id} className={`srs-browse-row ${isHidden ? "srs-browse-row-hidden" : ""}`}>
                            <div className="srs-browse-text">
                                <div className="srs-browse-front">{level.front}</div>
                                <div className="srs-browse-back">{level.back}</div>
                                {level.romanized && (
                                    <div className="srs-browse-romanized">{level.romanized}</div>
                                )}
                            </div>
                            <div className="srs-browse-meta">
                                {!isHidden && (
                                    <>
                                        <span className="srs-level-badge" style={{ fontSize: "0.62rem" }}>{levelName}</span>
                                        <span className={`srs-fam srs-fam-${fam}`} title={FAM_LABEL[fam]}>
                                            {fam}
                                        </span>
                                        {!isNew(state) && (
                                            <span className="srs-browse-interval">{Math.round(state.stability)}d</span>
                                        )}
                                    </>
                                )}
                                <button
                                    className="srs-browse-hide-btn"
                                    onClick={() => toggleHidden(card)}
                                    title={isHidden ? "Add to deck" : "Hide from deck"}
                                >
                                    {isHidden ? "Add" : "Hide"}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SRSBrowse;
