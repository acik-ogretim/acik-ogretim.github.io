import { z } from 'astro:content';
import {
    courseSchema,
    DegreeEnum,
    departmentSchema,
    DifficultyEnum,
    ExamTypeEnum,
    OptionKeyEnum,
    questionSchema,
    SourceEnum,
    universitySchema
} from './schemas';

/**
 * Derived Types from Strict Zod Schemas
 * These types are now as rigid as the schemas themselves.
 */
export type University = z.infer<typeof universitySchema>;
export type Department = z.infer<typeof departmentSchema>;
export type Course = z.infer<typeof courseSchema>;
export type Question = z.infer<typeof questionSchema>;

/**
 * Strict Enum Types
 */
export type Degree = z.infer<typeof DegreeEnum>;
export type Source = z.infer<typeof SourceEnum>;
export type ExamType = z.infer<typeof ExamTypeEnum>;
export type Difficulty = z.infer<typeof DifficultyEnum>;
export type OptionKey = z.infer<typeof OptionKeyEnum>;

/**
 * Quiz Player Specific Interfaces
 * Standardized to match the strict Question type
 */
export interface PlayerQuestion {
    id: string;
    text: string;
    correctKey: OptionKey;
    correctAnswerText: string;
    explanation: string;
    unitNumber: number;
    source: Source;
    el: HTMLElement | null;
    options: { key: OptionKey; text: string }[];
}

export interface QuizSettings {
    shuffleQuestions: boolean;
    filterUnite: string;
    filterIncorrect: boolean;
    filterUnanswered: boolean;
    showAnswers: boolean;
    showExplanations: boolean;
    hideIncorrectOptions: boolean;
    playbackRate: number;
    readerMode: boolean;
    voiceURI: string;
    autoAdvance: boolean;
}

export interface PlayerUI {
    bar: HTMLElement | null;
    playBtn: HTMLElement | null;
    prevBtn: HTMLElement | null;
    nextBtn: HTMLElement | null;
    speedBtn: HTMLElement | null;
    statusText: HTMLElement | null;
    iconPlay: HTMLElement | null;
    iconPause: HTMLElement | null;
    progressBar: HTMLElement | null;
    btnToggleAnswers: HTMLElement | null;
    btnToggleExplanations: HTMLElement | null;
    btnToggleOptions: HTMLElement | null;
    btnToggleInteractive: HTMLElement | null;
    statsContainer: HTMLElement | null;
    correctCount: HTMLElement | null;
    wrongCount: HTMLElement | null;
    btnOpenSettings: HTMLElement | null;
    settingsDrawer: HTMLElement | null;
    successRate: HTMLElement | null;
    repeatBtn: HTMLElement | null;
    readQuestionBtn: HTMLElement | null;
    readExplanationBtn: HTMLElement | null;
    questionCount: HTMLElement | null;
    btnToggleReader: HTMLElement | null;
    btnStopSpeech: HTMLElement | null;
    btnTestVoiceSettings: HTMLElement | null;
}

/**
 * Material & CMS Types - Also strictly defined
 */
export interface Material {
    id: string;
    title: string;
    url: string;
    type: 'pdf' | 'html' | 'external';
}

export interface GroupedMaterials {
    [category: string]: {
        isTabbed: boolean;
        subGroups: {
            [subGroupKey: string]: Material[];
        };
        items: Material[];
    };
}
