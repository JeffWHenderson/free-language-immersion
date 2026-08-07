import { useEffect, useState } from "react";

export interface GrammarLessonMeta {
    id: string;
    name: string;
}

export interface DeckCard {
    id: string;
    hidden?: boolean;
    english: string;
    word: string;
    romanized?: string;
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
    stories?: string[];
    pictureLessons?: string[];
    grammarLessons?: GrammarLessonMeta[];
    cards: DeckCard[];
}

const cache: Record<string, Pack[]> = {};
const inflight: Record<string, Promise<Pack[]>> = {};

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
        const req = inflight[language] ?? fetch(`/languages/${language}/decks.json`)
            .then((r) => r.json())
            .then((data: { packs: Pack[] }) => {
                cache[language] = data.packs;
                delete inflight[language];
                return data.packs;
            });
        inflight[language] = req;
        req.then((result) => {
            setPacks(result);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [language]);

    return { packs, loading };
}
