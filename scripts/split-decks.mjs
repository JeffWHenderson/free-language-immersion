/**
 * One-time migration: splits each language's decks.json into three hand-maintained files:
 *   main_course.json      — core topic packs (the six starter topics + their split parts)
 *   extension_decks.json  — everything else (sports, core_2000, cross_section, ...)
 *   grammar_decks.json    — grammar flashcard decks (kind:"grammar") + grammar_essentials
 *
 * From here on these three files are the source of truth and are hand-maintained;
 * decks.json and scripts/build-decks.mjs are retired.
 *
 *   node scripts/split-decks.mjs
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

const PUBLIC = "public/languages";

const MAIN_TOPIC_KEYS = new Set([
    "everyday_phrases",
    "food_and_drink",
    "common_places",
    "jobs_and_hobbies",
    "moods_and_emotion",
    "human_body",
]);

function categoryOf(pack) {
    if (pack.kind === "grammar" || pack.id === "grammar_essentials") return "grammar";
    if (MAIN_TOPIC_KEYS.has(pack.parent ?? pack.id)) return "main";
    return "extension";
}

const languages = readdirSync(PUBLIC).filter((name) =>
    existsSync(join(PUBLIC, name, "decks.json"))
);

for (const language of languages) {
    const dir = join(PUBLIC, language);
    const data = JSON.parse(readFileSync(join(dir, "decks.json"), "utf8"));
    const buckets = { main: [], extension: [], grammar: [] };
    for (const pack of data.packs) buckets[categoryOf(pack)].push(pack);

    const files = {
        "main_course.json": buckets.main,
        "extension_decks.json": buckets.extension,
        "grammar_decks.json": buckets.grammar,
    };
    for (const [file, packs] of Object.entries(files)) {
        writeFileSync(
            join(dir, file),
            JSON.stringify({ language, packs }, null, 2) + "\n"
        );
    }
    console.log(
        `${language}: ${data.packs.length} packs → main ${buckets.main.length}, ` +
        `extension ${buckets.extension.length}, grammar ${buckets.grammar.length}`
    );
}
