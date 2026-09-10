/**
 * One-time migration: flattens per-section stories/ and picture_lessons/ into
 * language-level folders, then removes the now-empty topic-section folders.
 *
 *   public/languages/<lang>/<section>/stories/<id>.json         → public/languages/<lang>/stories/<id>.json
 *   public/languages/<lang>/<section>/picture_lessons/<id>.json → public/languages/<lang>/picture_lessons/<id>.json
 *
 * Story/picture filenames are unique per language (verified), so the flat move is
 * collision-free. Shared picture .jpg images live at the top level (public/picture_lessons/)
 * and are untouched. The language-level `grammar/` folder (HTML readings) is preserved.
 *
 *   node scripts/flatten-media.mjs
 */

import { readdirSync, existsSync, mkdirSync, renameSync, rmSync, statSync } from "fs";
import { join } from "path";

const PUBLIC = "public/languages";
// Language-level folders that are NOT topic sections and must survive the cleanup.
const KEEP = new Set(["stories", "picture_lessons", "grammar"]);
const MEDIA = ["stories", "picture_lessons"];
// es-zh uses a non-standard structure (ESZHReview reads <section>/index.json directly).
const SKIP_LANGUAGES = new Set(["es-zh"]);

const languages = readdirSync(PUBLIC).filter(
    (name) => !SKIP_LANGUAGES.has(name) && statSync(join(PUBLIC, name)).isDirectory()
);

for (const language of languages) {
    const langDir = join(PUBLIC, language);
    const sections = readdirSync(langDir).filter(
        (name) => !KEEP.has(name) && statSync(join(langDir, name)).isDirectory()
    );

    let moved = 0;
    for (const section of sections) {
        for (const media of MEDIA) {
            const src = join(langDir, section, media);
            if (!existsSync(src)) continue;
            const dest = join(langDir, media);
            mkdirSync(dest, { recursive: true });
            for (const file of readdirSync(src)) {
                renameSync(join(src, file), join(dest, file));
                moved++;
            }
        }
        // Remove the whole section folder (leftover index.json + any old grammar/ source).
        rmSync(join(langDir, section), { recursive: true, force: true });
    }
    console.log(`${language}: flattened ${moved} media file(s), removed ${sections.length} section folder(s)`);
}
