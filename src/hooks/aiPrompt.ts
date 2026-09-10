export interface VocabItem {
    word: string;
    english: string;
    romanized?: string;
}

export type PracticeMode = 'conversation' | 'roleplay' | 'grammar';

export interface AiPromptOptions {
    /** Display name of the target language (e.g. "Spanish"). */
    language: string;
    mode: PracticeMode;
    vocab: VocabItem[];
    /** Ask the tutor to stay within the known vocabulary. */
    stayInVocab: boolean;
    /** Ask the tutor to correct mistakes and explain them. */
    correctMistakes: boolean;
    /** Ask the tutor to keep things simple and slow. */
    speakSlowly: boolean;
    /** Include a romanized pronunciation line under each sentence. */
    includeRomanized: boolean;
}

const MODE_INTRO: Record<PracticeMode, (lang: string) => string> = {
    conversation: (lang) =>
        `Have a natural, back-and-forth conversation with me in ${lang}. Start by greeting me and asking one simple question, then keep your turns short (1–2 sentences) so I can reply. Let me drive the topic, and ask follow-up questions to keep the conversation going.`,
    roleplay: (lang) =>
        `Let's role-play a real-life scenario in ${lang} (for example: ordering at a café, meeting someone new, shopping, or asking for directions). Pick a scenario that fits the vocabulary I know, tell me the setting in one English sentence, then stay in character. Keep your turns short so I can respond.`,
    grammar: (lang) =>
        `Quiz me on ${lang} grammar and vocabulary. Ask me one question at a time — translate a short sentence, fill in a blank, or change the form of a word. Wait for my answer before moving on. After each answer, tell me whether I'm right and give the correct version.`,
};

/** Build a copy-paste tutoring prompt from a known-vocabulary list and options. */
export function buildAiPrompt(opts: AiPromptOptions): string {
    const { language, mode, vocab, stayInVocab, correctMistakes, speakSlowly, includeRomanized } = opts;

    const lines: string[] = [];

    lines.push(
        `You are my friendly and patient ${language} tutor and conversation partner. I am a learner, and below is the list of ${language} words and phrases I currently know.`
    );
    lines.push('');
    lines.push(MODE_INTRO[mode](language));
    lines.push('');

    const rules: string[] = [];
    if (stayInVocab) {
        rules.push(
            `Stick to the vocabulary in my list as much as you can. If you must use a word that isn't on it, add its English meaning in parentheses right after it.`
        );
    }
    if (speakSlowly) {
        rules.push(
            `Keep it simple: use short sentences and basic grammar, and avoid idioms and rare words.`
        );
    }
    if (correctMistakes) {
        rules.push(
            `When I make a mistake, gently correct it — show the corrected ${language} and briefly explain the fix in English.`
        );
    }
    if (includeRomanized) {
        rules.push(
            `After each ${language} sentence you write, add a romanized pronunciation and an English translation on their own lines.`
        );
    }
    rules.push(`Keep me engaged and encourage me. Never switch to all-English — keep the practice in ${language}.`);

    lines.push('Please follow these rules:');
    for (const r of rules) lines.push(`- ${r}`);
    lines.push('');

    lines.push(`Here is everything I know so far (${vocab.length} items):`);
    lines.push('');
    for (const v of vocab) {
        const roman = v.romanized ? ` (${v.romanized})` : '';
        lines.push(`- ${v.word}${roman} — ${v.english}`);
    }
    lines.push('');
    lines.push('When you are ready, please begin.');

    return lines.join('\n');
}
