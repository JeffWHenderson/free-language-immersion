import { PART_MERGE_MAP } from "../generated/partMergeMap";
import { loadDeckState, saveDeckState, resetDeck, SRSDeckState } from "./useStorage";

const MIGRATION_FLAG = "part_merge_migrated_v1";

/**
 * One-time migration for the "merge Part 1/2/3 into a single deck" change.
 *
 * SRS progress is stored per deck id (`srs_state_{lang}_{deckId}`). After merging,
 * cards that used to live in e.g. `everyday_phrases_2` now belong to the merged
 * `everyday_phrases` deck, so their saved progress has to be folded into the
 * merged deck's state (card ids are unique within a subject, so no conflicts).
 * We also rewrite saved pack selections so previously-selected parts stay selected.
 *
 * Runs once, guarded by a localStorage flag. Safe to call on every startup.
 */
export function migratePartMerge(): void {
    if (localStorage.getItem(MIGRATION_FLAG)) return;

    for (const [lang, idMap] of Object.entries(PART_MERGE_MAP)) {
        // Fold old part deck states into the merged deck.
        for (const [oldId, newId] of Object.entries(idMap)) {
            if (oldId === newId) continue;
            const oldState = loadDeckState(lang, oldId);
            if (Object.keys(oldState).length === 0) continue;
            const merged: SRSDeckState = { ...oldState, ...loadDeckState(lang, newId) };
            saveDeckState(lang, newId, merged);
            resetDeck(lang, oldId);
        }

        // Rewrite this language's per-language study selection (list of pack ids).
        remapSelection(`pack_selection_${lang}`, (ids: string[]) =>
            dedupe(ids.map((id) => idMap[id] ?? id))
        );
    }

    // Rewrite the cross-language global-deck selection ({language, packId}[]).
    remapSelection("global_deck_selection", (sel: { language: string; packId: string }[]) => {
        const seen = new Set<string>();
        const out: { language: string; packId: string }[] = [];
        for (const s of sel) {
            const packId = PART_MERGE_MAP[s.language]?.[s.packId] ?? s.packId;
            const key = `${s.language}:${packId}`;
            if (!seen.has(key)) { seen.add(key); out.push({ ...s, packId }); }
        }
        return out;
    });

    localStorage.setItem(MIGRATION_FLAG, "1");
}

function dedupe<T>(arr: T[]): T[] {
    return [...new Set(arr)];
}

function remapSelection<T>(key: string, fn: (value: T) => T): void {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    try {
        localStorage.setItem(key, JSON.stringify(fn(JSON.parse(raw) as T)));
    } catch {
        /* leave malformed values alone */
    }
}
