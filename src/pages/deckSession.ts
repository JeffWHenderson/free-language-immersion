import { CardState, isDue, isNew } from "./fsrs";
import { getCardState, isCardHidden, SRSDeckState } from "./useStorage";
import { shuffled } from "../utils";
import type { LiteralData } from "./components/LiteralGloss";
import type { GrammarFormat, ClozeData, TableData, ContrastData, ProduceData } from "./components/GrammarFace";

export interface Card {
    id: string;
    hidden?: boolean;
    grammar?: boolean;
    format?: GrammarFormat;
    cloze?: ClozeData;
    table?: TableData;
    contrast?: ContrastData;
    produce?: ProduceData;
    english: string;
    word: string;
    romanized?: string;
    code?: string;
    codeLang?: string;
    grammarNote?: string;
    englishPhrase?: string;
    phrase?: string;
    phraseRomanized?: string;
    literal?: LiteralData;
}

export interface CombinedCard extends Card {
    deckId: string;
    deckName: string;
    /**
     * Key into the deckStates map. Equals deckId for a single-language deck; for
     * the cross-language global deck it is `${language}:${deckId}` so the same
     * deckId in two languages never collides.
     */
    deckKey: string;
    /**
     * Topic/section this card belongs to for new-card pacing: the parent section
     * id for split packs, else the deckId. Cards sharing a sectionKey drain as one
     * pool. Defaults to deckId when unset.
     */
    sectionKey?: string;
    /** Source language (set by the global deck; undefined => the page's language). */
    language?: string;
}

export type CombinedSessionCard = CombinedCard & { cardState: CardState };

export interface CategorizedCards {
    due: CombinedSessionCard[];    // review cards past their due date
    learn: CombinedSessionCard[];  // learning cards, least mastered first
    newCards: CombinedSessionCard[];
    later: CombinedSessionCard[];  // review cards not yet due ("mastered")
}

// Split every selected card into priority buckets, ordered across ALL decks
// (not sequentially per deck). Due cards sort by how overdue they are; learning
// cards sort by stability ascending so the least-mastered surface first.
export function categorize(
    cards: CombinedCard[],
    deckStates: Map<string, SRSDeckState>
): CategorizedCards {
    const due: CombinedSessionCard[] = [];
    const learn: CombinedSessionCard[] = [];
    const newCards: CombinedSessionCard[] = [];
    const later: CombinedSessionCard[] = [];

    for (const card of cards) {
        const deckState = deckStates.get(card.deckKey) ?? {};
        if (isCardHidden(card, deckState)) continue;
        const state = getCardState(deckState, card.id);
        const sessionCard: CombinedSessionCard = { ...card, cardState: state };
        if (isNew(state)) newCards.push(sessionCard);
        else if (state.state === "learning") learn.push(sessionCard);
        else if (isDue(state)) due.push(sessionCard);
        else later.push(sessionCard);
    }

    due.sort((a, b) => a.cardState.dueDate.localeCompare(b.cardState.dueDate));
    learn.sort((a, b) => a.cardState.stability - b.cardState.stability);
    return { due, learn, newCards, later };
}

// How many brand-new cards a single session introduces. Due/learning cards are
// never capped — only the flow of *new* material is paced.
export const NEW_PER_BATCH = 10;

const EVERYDAY_PHRASES_KEY = "everyday_phrases";

function sectionOf(card: CombinedCard): string {
    return card.sectionKey ?? card.deckId;
}

function cardKey(card: CombinedCard): string {
    return `${card.deckKey}:${card.id}`;
}

// Pick the next batch of up to `limit` new cards. everyday_phrases drains
// completely first (its whole batch comes from that one subject until it has no
// new cards left). After that, cards are drawn round-robin — one at a time from
// each remaining subject in selection order — so a single batch interleaves
// several topics. Cards already queued in the live session are skipped via
// `exclude` so repeated pulls advance.
export function selectNewBatch(
    categorized: CategorizedCards,
    exclude: Set<string> = new Set(),
    limit: number = NEW_PER_BATCH
): CombinedSessionCard[] {
    const { newCards } = categorized;

    // Group available new cards by subject, preserving first-seen order.
    const order: string[] = [];
    const bySection = new Map<string, CombinedSessionCard[]>();
    for (const c of newCards) {
        if (exclude.has(cardKey(c))) continue;
        const s = sectionOf(c);
        const arr = bySection.get(s);
        if (arr) arr.push(c);
        else { bySection.set(s, [c]); order.push(s); }
    }
    if (bySection.size === 0) return [];

    // Everyday phrases is introduced completely before any other subject.
    if (bySection.has(EVERYDAY_PHRASES_KEY)) {
        return bySection.get(EVERYDAY_PHRASES_KEY)!.slice(0, limit);
    }

    // Round-robin across the remaining subjects until the batch is full.
    const queues = order.map((s) => bySection.get(s)!);
    const batch: CombinedSessionCard[] = [];
    let i = 0;
    while (batch.length < limit && queues.some((q) => q.length > 0)) {
        const q = queues[i % queues.length];
        if (q.length > 0) batch.push(q.shift()!);
        i++;
    }
    return batch;
}

// SRS session: cards actually due to study today, in priority order —
// due → learning (least mastered) → up to NEW_PER_BATCH new cards from one
// section. Mastered-but-not-due cards wait.
export function buildSession(
    cards: CombinedCard[],
    deckStates: Map<string, SRSDeckState>,
    shuffle: boolean
): CombinedSessionCard[] {
    const categorized = categorize(cards, deckStates);
    const { due, learn } = categorized;
    const newBatch = selectNewBatch(categorized);
    return [due, learn, newBatch].flatMap(g => shuffle ? shuffled(g) : g);
}

// Fast mode plays every visible card, but ordered by the same priority so the
// most important cards come first: due → learning (least mastered) → new →
// already-mastered. New and mastered cards get pushed to the bottom.
export function orderFastCards(
    cards: CombinedCard[],
    deckStates: Map<string, SRSDeckState>
): CombinedCard[] {
    const { due, learn, newCards, later } = categorize(cards, deckStates);
    return [...due, ...learn, ...newCards, ...later];
}
