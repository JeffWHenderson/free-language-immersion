export type CourseLevel = {
    section: string;
    lessons: LessonV1[]
}

export type LessonV1 = {
    name: string;
    type: string;
    sentences: Expression[];
}

export type Expression = {
    target_language: string;
    base_language: string;
    romanized?: string;
    grammar?: Grammar;
}

export type Grammar = { // TODO: this is lazy
    highlight: string;
    note: string;
}

export enum AvailableLanguages { // I HATE ENUMS but whatever, I guess they work
    arabic = "arabic",
    chinese = "chinese",
    french = "french",
    japanese = "japanese",
    korean = "korean",
    spanish = "spanish"
}
