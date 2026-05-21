# Free Immersion

React + TypeScript + Vite PWA. All course data is static JSON in `public/languages/` — no backend, no API. Progress is stored in `localStorage`.

## Running locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build (JSON minified, PWA service worker generated)
npm run preview  # preview production build locally
```

---

## Project structure

```
public/
├── picture_lessons/
│   └── <name>.jpg                              # shared background images for picture lessons
└── languages/
    └── <language>/
        ├── <deck>/
        │   ├── index.json                      # SRS deck definition
        │   ├── stories/
        │   │   └── <story>.json                # story files
        │   ├── grammar/
        │   │   └── <grammarId>.json            # grammar review card deck
        │   └── picture_lessons/
        │       └── <lessonId>.json             # picture lesson metadata
        └── grammar/
            └── <grammarId>.html                # grammar explanation page (HTML)

src/
├── pages/
│   ├── SRSHome/        # deck list with study counts
│   ├── SRSReview/      # spaced repetition flashcard session
│   ├── SRSBrowse/      # browse/hide individual cards
│   ├── SRSStoryList/   # story browser
│   ├── SRSStoryReader/ # sentence-by-sentence story reader
│   ├── SRSPictureList/ # picture lesson browser
│   ├── SRSPictureLesson/ # interactive picture lesson
│   ├── GrammarList/    # grammar topic list for a deck
│   ├── GrammarLesson/  # grammar explanation (HTML)
│   └── GrammarReview/  # grammar-themed SRS review session
└── hooks/
    └── useLanguage.tsx # TTS voice selection per language
```

Available decks (same IDs across all languages):
- `everyday_phrases`, `food_and_drink`, `common_places`, `jobs_and_hobbies`, `moods_and_emotion`, `human_body`

---

## Data formats

### Deck file (`<deck>/index.json`)

```json
{
    "id": "everyday_phrases",
    "name": "Everyday Phrases",
    "language": "spanish",
    "stories": ["meet_jeff", "meet_seth"],
    "pictureLessons": ["everyday_phrases_01"],
    "grammarLessons": [
        { "id": "past_tense", "name": "Past Tense" }
    ],
    "cards": [
        {
            "id": "hello",
            "levels": [
                { "front": "hello", "back": "hola" },
                { "front": "Hello, how are you?", "back": "Hola, ¿cómo estás?", "grammarNote": "¿cómo estás? is informal; ¿cómo está usted? is formal." }
            ]
        }
    ]
}
```

- `stories` — list of story IDs available for this deck (filenames without `.json`)
- `pictureLessons` — list of picture lesson IDs for this deck
- `grammarLessons` — list of `{ id, name }` grammar topics for this deck
- Each card has 1–2 levels: level 0 is word/phrase, level 1 is a full example sentence
- `romanized` — optional on any level, shown below the target language (useful for non-Latin scripts)
- `grammarNote` — optional on any level, shown as an expandable note after flipping the card
- `literal` — optional on any level, word-for-word translation shown on the front of the card

### Story file (`<deck>/stories/<story>.json`)

```json
{
    "id": "meet_jeff",
    "name": "Meet Jeff",
    "sentences": [
        { "base_language": "Hi, I'm Jeff.", "target_language": "Hola, soy Jeff." },
        { "base_language": "I like learning languages.", "target_language": "Me gusta aprender idiomas.", "romanized": "...", "grammarNote": "..." }
    ]
}
```

### Grammar card deck (`<deck>/grammar/<grammarId>.json`)

Same format as a regular deck file. Typically 15–20 cards themed around the grammar topic and the deck's vocabulary. Progress is stored separately from the main deck so it doesn't affect the main SRS schedule.

### Picture lesson metadata (`<deck>/picture_lessons/<lessonId>.json`)

```json
{
    "name": "Common Places",
    "image": "/picture_lessons/common_places.jpg",
    "dots": [
        {
            "top": "42%",
            "left": "30%",
            "sentences": [
                { "base_language": "the school", "target_language": "la escuela" }
            ]
        }
    ]
}
```

- `image` — path to the background image in `public/picture_lessons/`
- `dots` — hotspots positioned with `top`/`left` percentages; each has one or more sentences

### Grammar explanation page (`grammar/<grammarId>.html`)

A standalone HTML fragment (no `<html>`/`<body>` tags) rendered via `dangerouslySetInnerHTML`. Supports tables, inline styles, and any HTML the browser can render. Lives at the language level so one explanation can be shared across decks.

---

## Adding a new language

### 1. Register the language in code

**`src/hooks/useLanguage.tsx`** — add voice selection:
```ts
if (targetLanguage === "french") {
    voice = voices.find(v => v.lang.startsWith("fr-"));
}
```

To find the right BCP 47 lang code, open the browser console and run:
```js
speechSynthesis.getVoices().map(v => `${v.name} — ${v.lang}`)
```

**`src/LanguageHome.tsx`** — add a button for the new language.

### 2. Create the data files

Copy an existing language folder and replace the content:

```
public/languages/<language>/
└── everyday_phrases/
    ├── index.json
    └── stories/
        └── meet_jeff.json
```

Add more decks following the same pattern. All six deck IDs (`everyday_phrases`, `food_and_drink`, `common_places`, `jobs_and_hobbies`, `moods_and_emotion`, `human_body`) are loaded automatically — just create the folder and `index.json`.

---

## Adding a grammar lesson to a deck

1. Add an entry to `grammarLessons` in `<deck>/index.json`:
   ```json
   "grammarLessons": [{ "id": "past_tense", "name": "Past Tense" }]
   ```
2. Create the card deck at `<deck>/grammar/past_tense.json` (same format as a regular deck)
3. Optionally create a grammar explanation page at `grammar/past_tense.html` (language-level, shared across decks)

---

## Fixing a translation

Find the file from the browser URL:

```
/spanish/food_and_drink        →  public/languages/spanish/food_and_drink/index.json
/spanish/food_and_drink/story/at_the_market  →  public/languages/spanish/food_and_drink/stories/at_the_market.json
```

Edit the `target_language` (and `romanized` if present). No build step needed for data changes in development.

---

## Build notes

- JSON files in `public/` are kept human-readable in source and automatically minified during `npm run build` by a custom Vite plugin before the PWA service worker is generated. Workbox precache hashes are computed on the minified files.
- The PWA caches all assets on first visit. Subsequent visits load from cache; the service worker checks for updates in the background (stale-while-revalidate).
