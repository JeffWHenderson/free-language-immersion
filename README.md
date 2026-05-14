# World Wide Jeff — Frontend

React + TypeScript + Vite. All the course data is static JSON in `public/languages/` — no backend, no API.

## Running locally

```bash
yarn        # install dependencies
yarn dev    # http://localhost:5173
```

---

## Project structure

```
apps/frontend/
├── public/
│   └── languages/
│       ├── arabic/
│       ├── chinese/
│       ├── japanese/
│       └── spanish/
│           ├── <topic>.json                       # SRS deck file (e.g. everyday_phrases.json)
│           ├── <topic>/
│           │   └── stories/
│           │       └── <story>.json               # story files for the SRS story reader
│           ├── modules/
│           │   └── <levelId>/
│           │       ├── __wordList__.json          # printable word list
│           │       ├── flashcards/
│           │       │   └── <deck>.json            # flashcard sentences for the course reader
│           │       └── stories/
│           │           └── <story>.json           # story files for the course story reader
│           └── pictureLessons/
│               └── <lesson>.json
└── src/
    ├── common/LanguageTypes.ts                # language enum
    ├── hooks/useLanguage.tsx                  # TTS voice selection (older components)
    ├── LanguageHome.tsx                       # home page with language buttons
    └── pages/
        └── srsFlashcards/
            ├── SRSReview.tsx                  # SRS flashcard component (getVoice here too)
            └── SRSStoryReader.tsx             # SRS story reader (getVoice here too)
```
---

## Adding a new language

### 1. Register the language in code (4 places)

**`src/common/LanguageTypes.ts`** — add to the enum:
```ts
export enum AvailableLanguages {
    arabic = "arabic",
    chinese = "chinese",
    // add your language here
}
```

**`src/LanguageHome.tsx`** — add a button:
```tsx
<button className="lang-course-btn" onClick={() => navigate('french')}>
    French Course →
</button>
```

**`src/hooks/useLanguage.tsx`** — add voice selection (used by older components):
```ts
if (selectedLanguage == "french") {
    selectedVoice = voices.find(v => v.lang.startsWith("fr-"));
}
```

**`src/pages/srsFlashcards/SRSReview.tsx`** and **`SRSStoryReader.tsx`** — add a matching block to `getVoice()` in each file:
```ts
if (lang === "french") {
    return voices.find(v => v.lang.startsWith("fr-")) ?? undefined;
}
```

To find the right voice lang code, open your browser console and run:
```js
speechSynthesis.getVoices().map(v => `${v.name} — ${v.lang}`)
```

### 2. Create the data files

Create `public/languages/<language>/` and add the files below. Use an existing language folder (e.g. `arabic`) as a reference.

**Minimum required files:**

```
public/languages/<language>/
├── course.json
├── everyday_phrases.json
└── modules/
    └── everydayPhrases/
        ├── __wordList__.json
        ├── flashcards/
        │   └── everyday_phrases.json
        └── stories/
            └── meet_jeff.json
```

Add more topic folders by following the same pattern. See the existing languages for naming conventions (`foodAndDrink`, `commonPlaces`, `humanBody`, `jobsAndHobbies`, `moodsAndEmotion`).

---

## Data formats

### SRS deck file (`<topic>.json` at the root)

Used by the spaced repetition review system. Each card has 1–2 levels: level 0 is a single word/phrase, level 1 is a full example sentence using it.

```json
{
    "id": "everyday_phrases",
    "name": "Everyday Phrases",
    "language": "french",
    "stories": ["meet_jeff", "meet_seth"],
    "pictureLessons": [],
    "cards": [
        {
            "id": "fr_ep_001",
            "levels": [
                {
                    "front": "hello",
                    "back": "bonjour",
                    "romanized": "bohn-ZHOOR"
                },
                {
                    "front": "Hello, how are you?",
                    "back": "Bonjour, comment allez-vous ?",
                    "grammarNote": "Comment allez-vous is formal. With friends say 'ça va ?'"
                }
            ]
        }
    ]
}
```

- `id` — unique string, used to build file paths (keep it snake_case matching the filename)
- `stories` — list of story filenames available in the SRS story reader for this deck
- `romanized` — optional, shown in red below the target language (useful for non-Latin scripts)
- `grammarNote` — optional, shown on the card when expanded

---

### Flashcard sentences file (`modules/<levelId>/flashcards/<name>.json`)

Used by the course-view flashcard reader (`FlashCardsV2`). Simpler than the SRS format — just a flat list of sentences.

```json
{
    "sentences": [
        {
            "base_language": "Hello, how are you?",
            "target_language": "Bonjour, comment allez-vous ?",
            "romanized": "bohn-ZHOOR, koh-mahn tah-lay VOO"
        },
        {
            "base_language": "My name is Jeff.",
            "target_language": "Je m'appelle Jeff.",
            "grammarNote": "m'appelle is a reflexive verb — literally 'I call myself'."
        }
    ]
}
```

---

### Word list file (`modules/<levelId>/__wordList__.json`)

A flat array used for the printable word list view. No nesting.

```json
[
    { "base_language": "hello", "target_language": "bonjour", "romanized": "bohn-ZHOOR" },
    { "base_language": "thank you", "target_language": "merci" }
]
```

`romanized` is optional.

---

### Story file (`modules/<levelId>/stories/<name>.json` and `<topic>/stories/<name>.json`)

Stories live in **two places** (same content, different paths) so they work in both the course view and the SRS story reader:
- Course view: `modules/<levelId>/stories/<name>.json`
- SRS reader: `<topic>/stories/<name>.json`

```json
{
    "id": "meet_jeff",
    "name": "Meet Jeff",
    "difficulty": "easy",
    "sentences": [
        {
            "base_language": "What's up? I'm Jeff.",
            "target_language": "Quoi de neuf ? Je m'appelle Jeff.",
            "romanized": "kwah duh NUF? zhuh mah-PELL Jeff."
        },
        {
            "base_language": "I like learning languages but it is very hard.",
            "target_language": "J'aime apprendre les langues mais c'est très difficile.",
            "grammarNote": "J'aime + infinitive = I like doing something. More natural than 'j'aime de faire'."
        }
    ]
}
```

Optional fields per sentence: `romanized`, `grammarNote`, `literal` (word-for-word translation).

---

## Fixing a translation

The filename is visible in the browser URL. For example:

```
/french/srs/everyday_phrases
         └── public/languages/french/everyday_phrases.json

/french/story/everydayPhrases/meet_jeff
                  │                └── modules/everydayPhrases/stories/meet_jeff.json
                  └── level_id from course.json
```

Find the file, edit the `target_language` (and `romanized` if present), save. No build step needed for data changes.

---

## Adding a new topic to an existing language

1. Add a new entry to `course.json` under `course_levels`
2. Create `public/languages/<language>/modules/<levelId>/`
3. Add `__wordList__.json`, `flashcards/<name>.json`, and any story files
4. Add the matching SRS deck file at `public/languages/<language>/<topic>.json`
5. Add story files at `public/languages/<language>/<topic>/stories/<name>.json` (same content as the modules stories)

Use an existing topic folder as a template.
