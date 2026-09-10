/**
 * Languages that ship the standard split deck files under `/languages/<id>/`
 * (main_course.json / extension_decks.json / grammar_decks.json). Used by the
 * cross-language global deck picker. Excludes `es-zh` (a cross-language pack with
 * a different data shape) — it is not composed from the standard deck files.
 */
export interface LanguageMeta {
    /** Course id / folder name under public/languages. */
    id: string;
    /** Human-readable label. */
    label: string;
}

export const STANDARD_LANGUAGES: LanguageMeta[] = [
    { id: "spanish", label: "Spanish" },
    { id: "chinese", label: "Chinese" },
    { id: "japanese", label: "Japanese" },
    { id: "french", label: "French" },
    { id: "korean", label: "Korean" },
    { id: "german", label: "German" },
    { id: "arabic", label: "Arabic" },
    { id: "interview", label: "Interview" },
];

export function languageLabel(id: string): string {
    return STANDARD_LANGUAGES.find(l => l.id === id)?.label
        ?? id.charAt(0).toUpperCase() + id.slice(1);
}
