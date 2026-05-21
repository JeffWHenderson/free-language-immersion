import { CardState, DEFAULT_CARD_STATE, isDue, isNew } from "./fsrs";

export interface SRSDeckState {
    [cardId: string]: CardState;
}

function storageKey(language: string, deckId: string): string {
    return `srs_state_${language}_${deckId}`;
}

export function loadDeckState(language: string, deckId: string): SRSDeckState {
    const raw = localStorage.getItem(storageKey(language, deckId));
    if (!raw) return {};
    try {
        return JSON.parse(raw) as SRSDeckState;
    } catch {
        return {};
    }
}

export function saveDeckState(language: string, deckId: string, state: SRSDeckState): void {
    localStorage.setItem(storageKey(language, deckId), JSON.stringify(state));
}

export function getCardState(deckState: SRSDeckState, cardId: string): CardState {
    return deckState[cardId] ?? { ...DEFAULT_CARD_STATE };
}

export function updateCardState(
    deckState: SRSDeckState,
    cardId: string,
    newState: CardState
): SRSDeckState {
    return { ...deckState, [cardId]: newState };
}

export interface DeckSummary {
    newCount: number;
    dueCount: number;
    learnCount: number;
}

export function isCardHidden(card: { id: string; hidden?: boolean }, deckState: SRSDeckState): boolean {
    const stored = deckState[card.id];
    if (stored !== undefined) return !!stored.hidden;
    return !!card.hidden;
}

export function getDeckSummary(
    cards: { id: string; hidden?: boolean }[],
    deckState: SRSDeckState
): DeckSummary {
    let newCount = 0;
    let dueCount = 0;
    let learnCount = 0;

    for (const card of cards) {
        if (isCardHidden(card, deckState)) continue;
        const state = getCardState(deckState, card.id);
        if (isNew(state)) {
            newCount++;
        } else if (state.state === "learning" && isDue(state)) {
            learnCount++;
        } else if (isDue(state)) {
            dueCount++;
        }
    }

    return { newCount, dueCount, learnCount };
}

export function resetDeck(language: string, deckId: string): void {
    localStorage.removeItem(storageKey(language, deckId));
}

export function getDeckProgress(
    cards: { id: string; hidden?: boolean }[],
    deckState: SRSDeckState
): { learned: number; total: number } {
    let learned = 0;
    let total = 0;
    for (const card of cards) {
        if (isCardHidden(card, deckState)) continue;
        total++;
        if (getCardState(deckState, card.id).state === 'review') learned++;
    }
    return { learned, total };
}

export function getBookmarkedCount(
    cards: { id: string; hidden?: boolean }[],
    deckState: SRSDeckState
): number {
    return cards.filter(c => !isCardHidden(c, deckState) && !!deckState[c.id]?.bookmarked).length;
}

export function toggleBookmark(
    deckState: SRSDeckState,
    cardId: string
): SRSDeckState {
    const card = getCardState(deckState, cardId);
    return updateCardState(deckState, cardId, { ...card, bookmarked: !card.bookmarked });
}

// ── Story sentence bookmarks ──────────────────────────────────────────────────

export interface StorySentenceBookmark {
    deckId: string;
    storyId: string;
    storyName: string;
    sentenceIndex: number;
    target_language: string;
    base_language: string;
    romanized?: string;
}

function storyBookmarksKey(language: string): string {
    return `story_bookmarks_${language}`;
}

export function loadStoryBookmarks(language: string): StorySentenceBookmark[] {
    const raw = localStorage.getItem(storyBookmarksKey(language));
    if (!raw) return [];
    try { return JSON.parse(raw) as StorySentenceBookmark[]; } catch { return []; }
}

export function saveStoryBookmarks(language: string, bookmarks: StorySentenceBookmark[]): void {
    localStorage.setItem(storyBookmarksKey(language), JSON.stringify(bookmarks));
}

export function toggleSentenceBookmark(
    language: string,
    bookmark: StorySentenceBookmark,
    current: StorySentenceBookmark[]
): StorySentenceBookmark[] {
    const idx = current.findIndex(
        b => b.deckId === bookmark.deckId &&
             b.storyId === bookmark.storyId &&
             b.sentenceIndex === bookmark.sentenceIndex
    );
    const updated = idx >= 0 ? current.filter((_, i) => i !== idx) : [...current, bookmark];
    saveStoryBookmarks(language, updated);
    return updated;
}

export function isSentenceBookmarked(
    bookmarks: StorySentenceBookmark[],
    deckId: string,
    storyId: string,
    sentenceIndex: number
): boolean {
    return bookmarks.some(
        b => b.deckId === deckId && b.storyId === storyId && b.sentenceIndex === sentenceIndex
    );
}
