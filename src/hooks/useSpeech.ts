import { useCallback } from "react";
import { useLanguageApp } from "../LanguageAppContext";
import useLanguage from "./useLanguage";

export function useSpeech(language: string | undefined) {
    const { readFront, readBack, volume } = useLanguageApp();
    const { targetVoice, baseVoice } = useLanguage({ targetLanguage: language ?? "english" });

    const buildUtt = useCallback((text: string, isTarget: boolean): SpeechSynthesisUtterance => {
        const utt = new SpeechSynthesisUtterance(text.replace(/\(.*?\)/g, ""));
        utt.voice = (isTarget ? targetVoice : baseVoice) ?? null;
        utt.rate = 0.9;
        utt.volume = volume;
        return utt;
    }, [targetVoice, baseVoice, volume]);

    const speak = useCallback((text: string, isTarget: boolean) => {
        if (isTarget ? !readBack : !readFront) return;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(buildUtt(text, isTarget));
    }, [readFront, readBack, buildUtt]);

    return { buildUtt, speak };
}
