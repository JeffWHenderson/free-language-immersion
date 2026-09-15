#!/usr/bin/env node
// Extract words / phrases from a language course's decks.
//
// Usage:
//   node scripts/extract-words.mjs <language> [pack] [options]
//
// Examples:
//   node scripts/extract-words.mjs spanish
//       → every card in every deck (main + extension + grammar)
//   node scripts/extract-words.mjs spanish everyday_phrases
//       → just the everyday_phrases pack
//   node scripts/extract-words.mjs spanish --file main_course
//       → every pack in main_course.json only
//   node scripts/extract-words.mjs spanish food_and_drink --field phrase
//       → the example phrases instead of the single words
//   node scripts/extract-words.mjs spanish --format csv > words.csv
//
// Options:
//   --file <name>     Limit to one deck file: main_course | extension_decks | grammar_decks
//   --field <name>    Which field to print: word (default) | phrase | english | englishPhrase | all
//   --format <name>   Output format: list (default) | csv | json
//   --list-packs      Just list the pack ids available and exit

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LANG_DIR = resolve(__dirname, "..", "public", "languages");
const DECK_FILES = ["main_course", "extension_decks", "grammar_decks"];

// ── parse args ──────────────────────────────────────────────
const args = process.argv.slice(2);
const positional = [];
const opts = { field: "word", format: "list", file: null, listPacks: false };

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--file") opts.file = args[++i];
  else if (a === "--field") opts.field = args[++i];
  else if (a === "--format") opts.format = args[++i];
  else if (a === "--list-packs") opts.listPacks = true;
  else if (a.startsWith("--")) fail(`Unknown option: ${a}`);
  else positional.push(a);
}

const language = positional[0];
const packFilter = positional[1] || null;

if (!language) {
  fail(
    "Usage: node scripts/extract-words.mjs <language> [pack] " +
      "[--file main_course|extension_decks|grammar_decks] " +
      "[--field word|phrase|english|englishPhrase|all] " +
      "[--format list|csv|json] [--list-packs]",
  );
}

// ── load decks ──────────────────────────────────────────────
const files = opts.file ? [opts.file] : DECK_FILES;
const packs = [];

for (const f of files) {
  const path = resolve(LANG_DIR, language, `${f}.json`);
  if (!existsSync(path)) {
    if (opts.file) fail(`No such deck file: ${path}`);
    continue; // some languages don't have every file
  }
  const data = JSON.parse(readFileSync(path, "utf8"));
  for (const p of data.packs || []) packs.push({ ...p, _file: f });
}

if (packs.length === 0) fail(`No decks found for language "${language}".`);

if (opts.listPacks) {
  for (const p of packs) {
    console.log(`${p.id}\t(${p._file}, ${p.cards?.length || 0} cards)`);
  }
  process.exit(0);
}

// ── collect cards ───────────────────────────────────────────
const selected = packFilter ? packs.filter((p) => p.id === packFilter) : packs;
if (packFilter && selected.length === 0) {
  fail(
    `No pack "${packFilter}" in ${language}. ` +
      `Run with --list-packs to see options.`,
  );
}

const rows = [];
for (const p of selected) {
  for (const c of p.cards || []) {
    rows.push({
      pack: p.id,
      id: c.id,
      english: c.english ?? "",
      word: c.word ?? "",
      englishPhrase: c.englishPhrase ?? "",
      phrase: c.phrase ?? "",
    });
  }
}

// ── output ──────────────────────────────────────────────────
if (opts.format === "json") {
  console.log(JSON.stringify(rows, null, 2));
} else if (opts.format === "csv") {
  const cols = ["pack", "id", "english", "word", "englishPhrase", "phrase"];
  console.log(cols.join(","));
  for (const r of rows) console.log(cols.map((c) => csv(r[c])).join(","));
} else {
  // list
  for (const r of rows) {
    if (opts.field === "all") {
      console.log(`${r.word} — ${r.english}`);
    } else {
      const v = r[opts.field];
      if (v === undefined) fail(`Unknown field: ${opts.field}`);
      if (v !== "") console.log(v);
    }
  }
}

// ── helpers ─────────────────────────────────────────────────
function csv(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function fail(msg) {
  console.error(msg);
  process.exit(1);
}
