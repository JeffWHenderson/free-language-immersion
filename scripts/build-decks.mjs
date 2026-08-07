/**
 * Merges all per-pack index.json files into a single decks.json per language.
 * Run after adding or updating any pack:
 *   node scripts/build-decks.mjs [language]
 *   node scripts/build-decks.mjs          ← builds all languages
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

const PUBLIC = "public/languages";

// Ordered pack list per language. Packs not listed here but present on disk are appended.
// Default order for languages that share the same core topic packs
const CORE_TOPICS = [
    "everyday_phrases",
    "food_and_drink",
    "common_places",
    "jobs_and_hobbies",
    "moods_and_emotion",
    "human_body",
];

const PACK_ORDER = {
    spanish: [
        ...CORE_TOPICS,
        "night_life",
        "sports",
        "software_development",
        "dungeons_and_dragons",
        "core_2000",
        "jeffs_deck",
        "cross_section",
    ],
    chinese: [...CORE_TOPICS, "core_2000", "jeffs_deck", "cross_section"],
    arabic:  [...CORE_TOPICS, "cross_section"],
    french:  [...CORE_TOPICS, "cross_section"],
    japanese: [...CORE_TOPICS, "cross_section"],
    korean:  [...CORE_TOPICS, "cross_section"],
};

// Languages to skip (non-standard structure)
const SKIP_LANGUAGES = new Set(["es-zh"]);

function buildLanguage(language) {
    const langDir = join(PUBLIC, language);
    if (!existsSync(langDir)) {
        console.error(`Language directory not found: ${langDir}`);
        return;
    }

    const ordered = PACK_ORDER[language] ?? [];
    const onDisk = readdirSync(langDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);

    // Ordered first, then any on-disk packs not in the list
    const packIds = [
        ...ordered.filter((id) => onDisk.includes(id)),
        ...onDisk.filter((id) => !ordered.includes(id)),
    ];

    const packs = [];
    for (const packId of packIds) {
        const indexPath = join(langDir, packId, "index.json");
        if (!existsSync(indexPath)) continue;
        try {
            const pack = JSON.parse(readFileSync(indexPath, "utf8"));
            packs.push(pack);
        } catch (e) {
            console.warn(`  Skipping ${packId}: ${e.message}`);
        }
    }

    const out = { language, packs };
    const outPath = join(langDir, "decks.json");
    writeFileSync(outPath, JSON.stringify(out, null, 2));
    const totalCards = packs.reduce((n, p) => n + (p.cards?.length ?? 0), 0);
    const kb = Math.round(readFileSync(outPath).length / 1024);
    console.log(`${language}: ${packs.length} packs, ${totalCards} cards → ${outPath} (${kb} KB)`);
}

const args = process.argv.slice(2);
const languages = args.length
    ? args
    : readdirSync(PUBLIC, { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => d.name);

for (const lang of languages) {
    if (SKIP_LANGUAGES.has(lang)) {
        console.log(`${lang}: skipped`);
        continue;
    }
    buildLanguage(lang);
}
