import { useEffect, useState } from "react";

export interface GrammarLessonMeta {
    id: string;
    name: string;
}

export interface DeckCard {
    id: string;
    hidden?: boolean;
    /** Pattern/grammar card embedded in a vocab pack (styled differently, not a new word). */
    grammar?: boolean;
    english: string;
    word: string;
    romanized?: string;
    /** Code snippet shown as the answer (monospace, whitespace preserved). */
    code?: string;
    /** Optional language label shown above the code snippet (e.g. "Java"). */
    codeLang?: string;
    grammarNote?: string;
    phrase?: string;
    phraseRomanized?: string;
    englishPhrase?: string;
    literal?: [string, string][];
    levels?: unknown[];
}

export interface Pack {
    id: string;
    name: string;
    language?: string;
    /** Set on split vocab packs: the section id shared by all its parts (the Part 1 id). */
    parent?: string;
    /** Display name of the parent topic, shown on the grouped home pill. */
    parentName?: string;
    /** 1-based part number within the parent topic (Part 1 keeps the section id). */
    part?: number;
    /** "grammar" packs are canonical grammar concepts surfaced as their own pills. */
    kind?: "grammar";
    /** Which home group the pack belongs to; assigned from the file it loads from. */
    category?: "main" | "extension" | "grammar";
    /** Grammar concept id whose HTML explanation is available as optional reading. */
    reading?: string;
    stories?: string[];
    pictureLessons?: string[];
    grammarLessons?: GrammarLessonMeta[];
    cards: DeckCard[];
}

const cache: Record<string, Pack[]> = {};
const inflight: Record<string, Promise<Pack[]>> = {};

// The three per-language deck files, in home-display order. Each pack is tagged with
// the category of the file it came from — that tag is the single source of truth for grouping.
const SOURCES: [Pack["category"], string][] = [
    ["main", "main_course.json"],
    ["extension", "extension_decks.json"],
    ["grammar", "grammar_decks.json"],
];

function loadDecks(language: string): Promise<Pack[]> {
    return Promise.all(
        SOURCES.map(([category, file]) =>
            fetch(`/languages/${language}/${file}`)
                .then((r) => r.json())
                .then((data: { packs: Pack[] }) =>
                    data.packs.map((p) => ({ ...p, category }))
                )
        )
    ).then((groups) => groups.flat());
}

export function useDecks(language: string | undefined): { packs: Pack[]; loading: boolean } {
    const [packs, setPacks] = useState<Pack[]>(() =>
        language ? (cache[language] ?? []) : []
    );
    const [loading, setLoading] = useState<boolean>(() =>
        !language || !cache[language]
    );

    useEffect(() => {
        if (!language) return;
        if (cache[language]) {
            setPacks(cache[language]);
            setLoading(false);
            return;
        }
        const req = inflight[language] ?? loadDecks(language)
            .then((packs) => {
                cache[language] = packs;
                delete inflight[language];
                return packs;
            });
        inflight[language] = req;
        req.then((result) => {
            setPacks(result);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [language]);

    return { packs, loading };
}

/**
 * Fetch packs for several languages at once (cross-language global deck). Reuses
 * the same per-language cache as {@link useDecks} and the same split-file loader.
 * Returns a map keyed by language.
 */
export function useAllDecks(languages: string[]): { packsByLang: Record<string, Pack[]>; loading: boolean } {
    const key = languages.join(",");
    const [packsByLang, setPacksByLang] = useState<Record<string, Pack[]>>(() => {
        const seed: Record<string, Pack[]> = {};
        for (const l of languages) if (cache[l]) seed[l] = cache[l];
        return seed;
    });
    const [loading, setLoading] = useState<boolean>(() => languages.some((l) => !cache[l]));

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        Promise.all(
            languages.map((language) => {
                if (cache[language]) return Promise.resolve([language, cache[language]] as const);
                const req = inflight[language] ?? loadDecks(language)
                    .then((packs) => {
                        cache[language] = packs;
                        delete inflight[language];
                        return packs;
                    });
                inflight[language] = req;
                return req
                    .then((packs) => [language, packs] as const)
                    .catch(() => [language, [] as Pack[]] as const);
            })
        ).then((entries) => {
            if (cancelled) return;
            setPacksByLang(Object.fromEntries(entries));
            setLoading(false);
        });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    return { packsByLang, loading };
}
