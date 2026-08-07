import { useEffect, useState } from "react";
import { useParams, useLocation, useSearch } from "wouter";
import { CardState, isDue, isNew } from "../fsrs";
import { loadDeckState, getCardState, resetDeck, saveDeckState, updateCardState, isCardHidden, toggleBookmark, SRSDeckState } from "../useStorage";
import { useDecks } from "../../hooks/useDecks";
import InfoTip from "../../components/InfoTip";
import "../srs.css";
import "./Browse.css";

interface Card {
    id: string;
    hidden?: boolean;
    english: string;
    word: string;
    romanized?: string;
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


const Browse = () => {
    const { language, deckId } = useParams<{ language: string; deckId: string }>();
    const [pathname, navigate] = useLocation();
    const filter = (new URLSearchParams(useSearch()).get("filter") ?? "new") as FilterType;
    const { packs, loading } = useDecks(language);

    const [deckState, setDeckState] = useState<SRSDeckState>({});

    const pack = packs.find((p) => p.id === deckId);

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

    const handleBookmark = (cardId: string) => {
        if (!language || !deckId) return;
        const updated = toggleBookmark(deckState, cardId);
        saveDeckState(language, deckId, updated);
        setDeckState(updated);
    };

    useEffect(() => {
        if (!language || !deckId) return;
        setDeckState(loadDeckState(language, deckId));
    }, [language, deckId]);

    if (loading || !pack) return <div className="srs-container"><p>Loading...</p></div>;

    const visibleCards = pack.cards.filter(c => !isCardHidden(c, deckState));

    const filteredCards = pack.cards.filter((card) => {
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
        return pack.cards.filter((card) => {
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
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <button className="srs-page-back" onClick={() => navigate(`/${language}`)}>
                        ← {pack.name}
                    </button>
                    <InfoTip>
                        <p><strong>Hide</strong> removes a card from your review sessions. Tap <strong>Add</strong> to restore it.</p>
                        <p>The number badge (1–5) shows familiarity: 1 = new, 5 = mature (long review interval).</p>
                        <p>🔖 bookmarks a card so you can find it from the course home.</p>
                    </InfoTip>
                </div>
                <button className="srs-btn-reset" onClick={handleReset}>Reset deck</button>
            </div>

            <div className="srs-browse-filters">
                {FILTERS.map(({ key, label }) => (
                    <button
                        key={key}
                        className={`srs-browse-filter-btn ${filter === key ? "active" : ""}`}
                        onClick={() => navigate(`${pathname}?filter=${key}`, { replace: true })}
                    >
                        {label}
                        <span className="srs-browse-filter-count">{countFor(key)}</span>
                    </button>
                ))}
            </div>

            {filter === "all" && (
                <p className="srs-browse-hint">{visibleCards.length} of {pack.cards.length} cards active</p>
            )}

            <div className="srs-browse-list">
                {filteredCards.length === 0 && (
                    <p className="srs-empty">No cards in this category.</p>
                )}
                {filteredCards.map((card) => {
                    const state = getCardState(deckState, card.id);
                    const isHidden = isCardHidden(card, deckState);
                    const fam = familiarity(state);
                    return (
                        <div key={card.id} className={`srs-browse-row ${isHidden ? "srs-browse-row-hidden" : ""}`}>
                            <div className="srs-browse-text">
                                <div className="srs-browse-front">{card.english}</div>
                                <div className="srs-browse-back">{card.word}</div>
                                {card.romanized && (
                                    <div className="srs-browse-romanized">{card.romanized}</div>
                                )}
                            </div>
                            <div className="srs-browse-meta">
                                {!isHidden && (
                                    <>
                                        <span className={`srs-fam srs-fam-${fam}`} title={FAM_LABEL[fam]}>
                                            {fam}
                                        </span>
                                        {!isNew(state) && (
                                            <span className="srs-browse-interval">{Math.round(state.stability)}d</span>
                                        )}
                                    </>
                                )}
                                <div className="srs-browse-actions">
                                    {!isHidden && (
                                        <button
                                            className={`srs-bookmark-btn ${state.bookmarked ? "bookmarked" : ""}`}
                                            onClick={() => handleBookmark(card.id)}
                                            title={state.bookmarked ? "Remove bookmark" : "Bookmark"}
                                        >
                                            🔖
                                        </button>
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
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Browse;
