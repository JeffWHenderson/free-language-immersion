// SM-2 spaced repetition algorithm (Anki-style)
// Ratings: 1=Again, 2=Hard, 3=Good, 4=Easy

export type Rating = 1 | 2 | 3 | 4;

// Number of successful reviews before a card promotes to the next level
export const LEVEL_UP_REPS = 3;

export interface CardState {
    interval: number;       // days until next review (0 = new/learning)
    repetitions: number;    // number of successful review rounds at current level
    easeFactor: number;     // multiplier, starts at 2.5
    dueDate: string;        // ISO date string (YYYY-MM-DD)
    lapses: number;         // times failed after graduating
    level: number;          // current card level (0 = word, 1 = phrase, ...)
    hidden?: boolean;       // excluded from study and fast mode until manually unhidden
}

export const DEFAULT_CARD_STATE: CardState = {
    interval: 0,
    repetitions: 0,
    easeFactor: 2.5,
    dueDate: todayISO(),
    lapses: 0,
    level: 0,
    hidden: false,
};

export function todayISO(): string {
    return new Date().toISOString().split("T")[0];
}

function addDays(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + Math.round(days));
    return d.toISOString().split("T")[0];
}

export function isDue(state: CardState): boolean {
    return state.dueDate <= todayISO();
}

export function isNew(state: CardState): boolean {
    return state.repetitions === 0 && state.interval === 0;
}

const MAX_EASE = 4.0;

// Clamps easeFactor within allowed bounds after a delta adjustment
function adjustEase(ef: number, delta: number): number {
    const minEase = Math.max(ef + delta, 1.3)
    return Math.min(minEase, MAX_EASE);
}

/** Returns the new card state. Does NOT handle level promotion — caller checks shouldLevelUp(). */
export function applyRating(state: CardState, rating: Rating): CardState {
    let { interval, repetitions, easeFactor, lapses, level } = state;

    if (rating === 1) {
        // Again: card failed — reset to relearning, penalize ease
        // TODO; am I doing anything with lapses?
        lapses += 1;
        interval = 1;
        repetitions = 0;
        easeFactor = adjustEase(easeFactor, -0.2);
    }

    // TODO: Clean this up.. I think its readable but a lof of conditionals I could adjust
    if (rating !== 1) { 
        if (repetitions === 0) {  // First successful review: assign a short bootstrap interval, not yet SM-2 scaling
            interval = rating === 4 ? 2 : 1; // I just want the first success to push to 2 days.. 4 is agressive for what I'm doing
            repetitions = 1;
            if (rating === 2) easeFactor = adjustEase(easeFactor, -0.1);
            if (rating === 4) easeFactor = adjustEase(easeFactor, +0.1);
        } else {
            // Graduated card: scale interval by ease, with Hard using a fixed 1.2x and Easy adding a 1.3x bonus
            const multiplier = rating === 2 ? 1.2 : rating === 4 ? easeFactor * 1.3 : easeFactor;
            interval = Math.max(Math.round(interval * multiplier), 1);
            repetitions += 1;
            if (rating === 2) easeFactor = adjustEase(easeFactor, -0.15);
            if (rating === 4) easeFactor = adjustEase(easeFactor, +0.15);
        }
    }

    return {
        interval,
        repetitions,
        easeFactor,
        dueDate: rating === 1 ? todayISO() : addDays(interval),
        lapses,
        level,
    };
}

/** Returns a fresh state for the next level, preserving easeFactor as a reward. */
export function levelUpState(state: CardState): CardState {
    return {
        interval: 0,
        repetitions: 0,
        easeFactor: state.easeFactor,
        dueDate: todayISO(),
        lapses: 0,
        level: state.level + 1,
    };
}
