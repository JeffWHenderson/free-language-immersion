# Skill: Add a New Section to an Existing Course

Add a new vocabulary section (theme deck) to an existing language course. You need to know the target language and the section topic (e.g. "add a nature & weather section to Spanish"). If either is missing, ask before proceeding.

---

## What to build

A section consists of:
- `public/languages/{lang_id}/{section_id}/index.json` — section metadata, all flashcards, story list, grammar lesson list
- `public/languages/{lang_id}/{section_id}/stories/{story_id}.json` — 3–5 story files
- `public/languages/{lang_id}/grammar/{lesson_id}.html` — 4–6 grammar lesson HTML files

If the section should appear on the main Home page deck list, also ask whether to update `AVAILABLE_DECKS` in `src/pages/Home/index.tsx` (and the `DECK_IDS` prefetch list in `src/LanguageHome.tsx`).

---

## Match existing course conventions

Before generating anything, read an existing section from the target language to match its style:
1. Read one existing `index.json` (e.g. `public/languages/{lang_id}/human_body/index.json`) to see card format and density.
2. Read one existing story file to see sentence structure and `grammarNote` format.
3. For non-Latin-script languages, confirm `romanized` and `literal` format from those files.

---

## index.json schema

```json
{
  "id": "section_id",
  "name": "Display Name",
  "language": "lang_id",
  "stories": ["story_id_1", "story_id_2"],
  "pictureLessons": [],
  "grammarLessons": [
    { "id": "lesson_slug", "name": "Lesson Title" }
  ],
  "cards": []
}
```

Aim for 30–60 cards. Leave `pictureLessons` as `[]` unless a matching image already exists in `public/picture_lessons/`.

---

## Card schema

Determine the script type first:
- **Latin script**: Spanish, French, Italian, Portuguese, German, etc.
- **Non-Latin script**: Chinese, Japanese, Korean, Arabic, Russian, Hindi, etc.

**Latin-script card:**
```json
{
  "id": "snake_case_id",
  "english": "English word",
  "word": "target word",
  "phrase": "Example sentence in target language.",
  "englishPhrase": "Example sentence in English.",
  "grammarNote": "**term1** explanation of first grammar point.\n**term2** explanation of second grammar point."
}
```

**Non-Latin-script card:**
```json
{
  "id": "snake_case_id",
  "english": "English word",
  "word": "target word in native script",
  "romanized": "romanization",
  "phrase": "Example sentence in native script.",
  "phraseRomanized": "Romanization of example sentence.",
  "englishPhrase": "Example sentence in English.",
  "literal": [["chunk", "gloss"], ["chunk", "gloss"]],
  "grammarNote": "**term1** explanation.\n**term2** explanation."
}
```

Rules:
- `grammarNote`: exactly two bold `**term**` points separated by `\n`
- `literal`: chunk-gloss pairs covering the full example phrase
- Non-Latin scripts: never use ASCII double-quotes inside JSON string values — use the language's native quotation marks (「」 for Japanese, etc.)
- Card IDs: `snake_case`, unique within the section

---

## Story file schema

**Latin-script:**
```json
{
  "id": "story_id",
  "name": "Story Display Title",
  "difficulty": "medium",
  "sentences": [
    {
      "base_language": "English sentence.",
      "target_language": "Target language sentence.",
      "grammarNote": "**term1** explanation.\n**term2** explanation."
    }
  ]
}
```

**Non-Latin-script:**
```json
{
  "id": "story_id",
  "name": "Story Display Title",
  "difficulty": "medium",
  "sentences": [
    {
      "base_language": "English sentence.",
      "target_language": "Native script sentence.",
      "romanized": "Romanization.",
      "literal": [["chunk", "gloss"]],
      "grammarNote": "**term1** explanation.\n**term2** explanation."
    }
  ]
}
```

- 12–20 sentences per story
- Story IDs: `snake_case`, descriptive (e.g. `at_the_market`, `a_rainy_day`)
- Stories should use vocabulary from the section's card list

---

## Grammar HTML files

Store at `public/languages/{lang_id}/grammar/{lesson_id}.html`. Write plain HTML: a heading, brief explanation, and 4–8 worked examples. No external CSS needed.

---

## App wiring (only if surfacing in the main UI)

If the section should appear in the main Home page deck list:

### `src/pages/Home/index.tsx`

Add `section_id` to the `AVAILABLE_DECKS` array in the desired order:
```ts
const AVAILABLE_DECKS = [
  "everyday_phrases",
  // ...existing entries...
  "new_section_id",
];
```

### `src/LanguageHome.tsx`

`DECK_IDS` at the top of that file mirrors `AVAILABLE_DECKS` — add `"new_section_id"` there too.

---

## Workflow

1. **Read existing content** — check one `index.json` and one story from the target language to confirm card format and conventions.
2. **Plan the section** — decide vocabulary (30–60 words), 3–5 story titles, and 4–6 grammar topics relevant to the theme.
3. **Write `index.json`** — include all cards, story IDs, and grammar lesson IDs. Validate with Python.
4. **Write story files** — one file per story. Validate each with Python.
5. **Write grammar HTML files** — one per grammar lesson.
6. **Update app wiring** if the user wants the section in the main UI.
7. **Final validation** — parse every JSON file written before reporting done.

---

## JSON validation

After writing each JSON file:
```bash
python3 -c "import json; json.load(open('PATH/TO/FILE.json')); print('OK')"
```

Fix any errors before proceeding.
