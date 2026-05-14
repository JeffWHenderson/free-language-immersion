// FSRS-4.5 spaced repetition algorithm
// Ratings: 1=Again, 2=Hard, 3=Good, 4=Easy

export type Rating = 1 | 2 | 3 | 4;

export const LEVEL_UP_REPS = 3;

export type CardSRSState = "new" | "learning" | "review";

export interface CardState {
    stability: number;   // S: days of ~90% retention
    difficulty: number;  // D: 1–10, higher = harder
    dueDate: string;     // ISO date (YYYY-MM-DD)
    lastReview: string;  // ISO date of last rating
    lapses: number;
    reps: number;        // successful reviews at current level (for level-up gate)
    level: number;       // card level (0=word, 1=phrase, ...)
    state: CardSRSState;
    hidden?: boolean;
}

export const DEFAULT_CARD_STATE: CardState = {
    stability: 0,
    difficulty: 0,
    dueDate: todayISO(),
    lastReview: todayISO(),
    lapses: 0,
    reps: 0,
    level: 0,
    state: "new",
    hidden: false,
};

// ── Core helpers ──────────────────────────────────────────────────────────────

export function todayISO(): string {
    return new Date().toISOString().split("T")[0];
}

function addDays(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + Math.round(days));
    return d.toISOString().split("T")[0];
}

function daysSince(isoDate: string): number {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const past = new Date(isoDate + "T00:00:00");
    return Math.max(0, (now.getTime() - past.getTime()) / 86_400_000);
}

function clamp(x: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, x));
}

export function isDue(state: CardState): boolean {
    return state.dueDate <= todayISO();
}

export function isNew(state: CardState): boolean {
    return state.state === "new";
}

// ── FSRS-4.5 parameters ───────────────────────────────────────────────────────

const DECAY = -0.5;
const FACTOR = 19 / 81;
const TARGET_RETENTION = 0.9;

//  w[0–3]  : initial stability by rating (Again/Hard/Good/Easy)
//  w[4–5]  : initial difficulty base and scale
//  w[6–7]  : difficulty update weight and mean-reversion weight
//  w[8–10] : recall stability factors
//  w[11–14]: forget stability factors
//  w[15]   : hard penalty multiplier
//  w[16]   : easy bonus multiplier
const W = [
    0.4072, 1.1829, 3.1262, 15.4722,
    7.2102, 0.5316,
    1.0651, 0.0589,
    1.5330, 0.1544, 1.0070,
    1.9373, 0.1100, 0.2900, 2.2700,
    0.2500, 2.9898,
];

// ── FSRS math ─────────────────────────────────────────────────────────────────

function initialStability(rating: Rating): number {
    return Math.max(W[rating - 1], 0.1);
}

function initialDifficulty(rating: Rating): number {
    return clamp(W[4] - Math.exp(W[5] * (rating - 1)) + 1, 1, 10);
}

function retrievability(t: number, s: number): number {
    return Math.pow(1 + FACTOR * (t / s), DECAY);
}

function nextInterval(s: number): number {
    const days = (s / FACTOR) * (Math.pow(TARGET_RETENTION, 1 / DECAY) - 1);
    return Math.max(1, Math.round(days));
}

function recallStability(d: number, s: number, r: number, rating: Rating): number {
    const hardPenalty = rating === 2 ? W[15] : 1;
    const easyBonus = rating === 4 ? W[16] : 1;
    return s * (Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) * (Math.exp((1 - r) * W[10]) - 1) * hardPenalty * easyBonus + 1);
}

function forgetStability(d: number, s: number, r: number): number {
    return W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp((1 - r) * W[14]);
}

function updateDifficulty(d: number, rating: Rating): number {
    const d0_4 = initialDifficulty(4);
    return clamp(W[7] * d0_4 + (1 - W[7]) * (d - W[6] * (rating - 3)), 1, 10);
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Returns the new card state after a rating. Does NOT handle level promotion. */
export function applyRating(state: CardState, rating: Rating): CardState {
    const today = todayISO();
    const { lapses } = state;

    if (state.state === "new" || state.state === "learning") {
        const s = initialStability(rating);
        const d = state.state === "new"
            ? initialDifficulty(rating)
            : updateDifficulty(state.difficulty, rating);

        if (rating === 1) {
            return { ...state, stability: s, difficulty: d, lapses: lapses + 1,
                     reps: 0, dueDate: today, lastReview: today, state: "learning" };
        }
        const interval = nextInterval(s);
        return { ...state, stability: s, difficulty: d, reps: state.reps + 1,
                 dueDate: addDays(interval), lastReview: today, state: "review" };
    }

    // Review state — use retrievability-aware formulas
    const t = Math.max(daysSince(state.lastReview), 0.001);
    const R = retrievability(t, state.stability);
    const d = updateDifficulty(state.difficulty, rating);

    if (rating === 1) {
        const s = forgetStability(state.difficulty, state.stability, R);
        return { ...state, stability: s, difficulty: d, lapses: lapses + 1,
                 reps: 0, dueDate: today, lastReview: today, state: "learning" };
    }

    const s = recallStability(state.difficulty, state.stability, R, rating);
    const interval = nextInterval(s);
    return { ...state, stability: s, difficulty: d, reps: state.reps + 1,
             dueDate: addDays(interval), lastReview: today, state: "review" };
}

/** Fresh state for the next level, preserving difficulty as a head-start. */
export function levelUpState(state: CardState): CardState {
    return {
        stability: 0,
        difficulty: state.difficulty,
        dueDate: todayISO(),
        lastReview: todayISO(),
        lapses: 0,
        reps: 0,
        level: state.level + 1,
        state: "new",
    };
}

/** Preview the resulting interval for each rating without mutating state. */
export function previewIntervals(state: CardState): Record<Rating, string> {
    const fmt = (days: number) => days <= 0 ? "today" : days === 1 ? "1d" : `${days}d`;
    const intervalFor = (r: Rating): number => {
        const next = applyRating(state, r);
        if (next.state === "learning") return 0;
        const today = new Date(todayISO() + "T00:00:00");
        const due = new Date(next.dueDate + "T00:00:00");
        return Math.round((due.getTime() - today.getTime()) / 86_400_000);
    };
    return { 1: fmt(intervalFor(1)), 2: fmt(intervalFor(2)), 3: fmt(intervalFor(3)), 4: fmt(intervalFor(4)) };
}
