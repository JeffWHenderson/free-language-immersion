import { CardState, DEFAULT_CARD_STATE, isDue, isNew } from "./fsrs";

export interface SRSDeckState {
    [cardId: string]: CardState;
}

function storageKey(language: string, deckId: string): string {
    return `srs_state_${language}_${deckId}`;
}

// Migrates a stored card entry from SM-2 format to FSRS format if needed.
function migrateCard(raw: Record<string, unknown>): CardState {
    if ("easeFactor" in raw) {
        const interval = (raw.interval as number) ?? 0;
        const repetitions = (raw.repetitions as number) ?? 0;
        return {
            stability: Math.max(interval, 0.1),
            difficulty: 5,
            dueDate: (raw.dueDate as string) ?? DEFAULT_CARD_STATE.dueDate,
            lastReview: (raw.dueDate as string) ?? DEFAULT_CARD_STATE.lastReview,
            lapses: (raw.lapses as number) ?? 0,
            reps: repetitions,
            level: (raw.level as number) ?? 0,
            state: repetitions === 0 ? "new" : interval <= 1 ? "learning" : "review",
            hidden: (raw.hidden as boolean) ?? false,
        };
    }
    return raw as unknown as CardState;
}

export function loadDeckState(language: string, deckId: string): SRSDeckState {
    const raw = localStorage.getItem(storageKey(language, deckId));
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw) as Record<string, Record<string, unknown>>;
        const migrated: SRSDeckState = {};
        for (const [id, card] of Object.entries(parsed)) {
            migrated[id] = migrateCard(card);
        }
        return migrated;
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
