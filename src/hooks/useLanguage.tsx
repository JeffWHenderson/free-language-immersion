import { useEffect, useState } from "react";

export function getVoiceForLanguage(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | undefined {
    switch (lang) {
        case "english":
            return voices.find(v => v.name.toLowerCase() === "samantha")
                ?? voices.find(v => v.lang.startsWith("en-"));
        case "spanish":
            return voices.find(v => v.name.toLowerCase() === "paulina")
                ?? voices.find(v => v.lang.startsWith("es-"));
        case "french":
            return voices.find(v => v.name.toLowerCase() === "thomas")
                ?? voices.find(v => v.lang.startsWith("fr-"));
        case "chinese":
            return voices.find(v => ["ting-ting", "tingting"].includes(v.name.toLowerCase()))
                ?? voices.find(v => v.lang.startsWith("zh-"));
        case "japanese":
            return voices.find(v => v.name.toLowerCase() === "kyoko")
                ?? voices.find(v => v.lang.startsWith("ja-"));
        case "arabic":
            return voices.find(v => v.lang.toLowerCase() === "ar-sa")
                ?? voices.find(v => v.lang.toLowerCase().startsWith("ar"));
        case "korean":
            return voices.find(v => v.name.toLowerCase().startsWith("google"))
                ?? voices.find(v => v.name.toLowerCase() === "yuna");
        case "german":
            return voices.find(v => v.name.toLowerCase() === "anna")
                ?? voices.find(v => v.lang.startsWith("de-"));
        default:
            return voices.find(v => v.lang.startsWith("en-"));
    }
}

/** Live list of available speech-synthesis voices, kept in sync with `voiceschanged`. */
export function useVoices(): SpeechSynthesisVoice[] {
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => speechSynthesis.getVoices());

    useEffect(() => {
        const load = () => setVoices(window.speechSynthesis.getVoices());
        window.speechSynthesis.addEventListener("voiceschanged", load);
        return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
    }, []);

    return voices;
}

const useLanguage = ({
    targetLanguage,
    baseLanguage = "english",
}: {
    targetLanguage: string;
    baseLanguage?: string;
}): { targetVoice: SpeechSynthesisVoice | undefined; baseVoice: SpeechSynthesisVoice | undefined } => {
    const voices = useVoices();

    return {
        targetVoice: getVoiceForLanguage(voices, targetLanguage),
        baseVoice: getVoiceForLanguage(voices, baseLanguage),
    };
};

export default useLanguage;
