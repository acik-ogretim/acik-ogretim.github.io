import { z } from 'astro:content';
import { courseSchema, departmentSchema, questionSchema, universitySchema } from './schemas';

export type University = z.infer<typeof universitySchema>;
export type Department = z.infer<typeof departmentSchema>;
export type Course = z.infer<typeof courseSchema>;
export type Question = z.infer<typeof questionSchema>;

export interface PlayerQuestion {
    id: string;
    text: string;
    correctKey: string;
    correctAnswerText: string;
    explanation: string;
    unitNumber: number;
    source?: string;
    el: HTMLElement | null;
    options: { key: string; text: string }[];
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
    repeatBtn: HTMLElement | null; // This will now map to Read Question
    readQuestionBtn: HTMLElement | null;
    readExplanationBtn: HTMLElement | null;
    questionCount: HTMLElement | null;
    btnToggleReader: HTMLElement | null;
    btnStopSpeech: HTMLElement | null;
    btnTestVoiceSettings: HTMLElement | null;
}
