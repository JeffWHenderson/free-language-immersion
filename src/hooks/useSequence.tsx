import { useMemo } from "react";
import { useDecks } from "./useDecks";

export interface SeqItem {
    deckId: string;
    deckName: string;
    id: string;
}

/**
 * Flat, display-ordered list of stories or picture lessons across all packs,
 * and the neighbours of the current (deckId, id). Ordering mirrors the list
 * pages: packs in load order, with cross_section pushed to the end.
 */
export function useSequence(
    language: string | undefined,
    kind: "stories" | "pictureLessons",
    currentDeckId: string | undefined,
    currentId: string | undefined,
): { prev: SeqItem | null; next: SeqItem | null } {
    const { packs } = useDecks(language);
    return useMemo(() => {
        const ordered = [...packs]
            .filter((p) => (p[kind]?.length ?? 0) > 0)
            .sort((a, b) => (a.id === "cross_section" ? 1 : b.id === "cross_section" ? -1 : 0));

        const seq: SeqItem[] = ordered.flatMap((p) =>
            (p[kind] ?? []).map((id) => ({ deckId: p.id, deckName: p.name, id }))
        );

        const idx = seq.findIndex((s) => s.deckId === currentDeckId && s.id === currentId);
        if (idx === -1) return { prev: null, next: null };
        return {
            prev: idx > 0 ? seq[idx - 1] : null,
            next: idx < seq.length - 1 ? seq[idx + 1] : null,
        };
    }, [packs, kind, currentDeckId, currentId]);
}
