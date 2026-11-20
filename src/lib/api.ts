import { haftalardanUniteler } from './unite-basligi';
import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { courseSchema, questionSchema, universitySchema } from './schemas';
import type { Course, Department, Question, University } from './types';

const DATA_DIR = path.resolve(process.cwd(), 'data');

/**
 * Validates and transforms a list of items using the provided schema.
 * Using z.ZodTypeAny to avoid complex generic issues with Zod's internal input/output types.
 */
function validateList<T>(data: any, schema: z.ZodTypeAny): T[] {
    if (!Array.isArray(data)) return [];
    return data.map(item => {
        const result = schema.safeParse(item);
        if (result.success) return result.data as T;
        return null;
    }).filter((item): item is T => item !== null);
}

export async function getUniversities(): Promise<University[]> {
    try {
        const content = await fs.readFile(path.join(DATA_DIR, 'universities.json'), 'utf-8');
        const data = JSON.parse(content);
        const list = validateList<University>(data, universitySchema);
        // Fixture universities (test-*) exist for unit tests only; keep them out of the published site.
        return import.meta.env?.PROD ? list.filter(u => !u.id.startsWith('test-')) : list;
    } catch (e) {
        console.error('Error loading universities:', e);
        return [];
    }
}

export async function getDepartments(uniId: string): Promise<Department[]> {
    const unis = await getUniversities();
    const uni = unis.find(u => u.id === uniId);
    return uni?.departments || [];
}

export async function getCourses(uniId: string, deptId: string): Promise<Course[]> {
    try {
        const filePath = path.join(DATA_DIR, 'courses', uniId, `${deptId}.json`);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        return validateList<Course>(data, courseSchema);
    } catch {
        return [];
    }
}

export async function getQuestions(uniId: string, courseId: string): Promise<Question[]> {
    try {
        const filePath = path.join(DATA_DIR, 'questions', uniId, `${courseId}.json`);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        return validateList<Question>(data, questionSchema);
    } catch {
        return [];
    }
}

/** Courses whose question file has at least one question. Empty courses are listed in the coverage
 *  report (acik-ogretim-mcp docs/soru-kapsami.md) and left out of department lists. */
export async function sorusuOlanDersler(uniId: string, courses: Course[]): Promise<Course[]> {
    const sonuc: Course[] = [];
    for (const c of courses) {
        const filePath = path.join(DATA_DIR, 'questions', uniId, `${c.id}.json`);
        try {
            const st = await fs.stat(filePath);
            // "[]" with whitespace is a few bytes; a single question is far larger
            if (st.size > 16) sonuc.push(c);
        } catch {
            // no file: no questions
        }
    }
    return sonuc;
}


/** Official course content collected from the university (syllabus link, units/topics, years taught).
 *  Written by acik-ogretim-mcp `scripts/fetcher/ders_icerik_yaz.py`; absent for courses without a source. */
export interface DersIcerik {
    kod: string;
    url?: string;
    amac?: string;
    icerik?: string;
    kaynaklar?: string;
    konular?: { no: number; baslik: string }[];
    ciktilar?: string[];
    konu_kaynagi?: string | null;
    yillar?: (string | number)[];
    son_yil?: string | number;
    guncel?: boolean;
}

/** Numbered topic tree of the course book (data/konular/<uni>/<course>.json), written by acik-ogretim-mcp konu_esle. */
export interface KitapKonu { no: string; baslik: string; duzey: number; sayfa: number; alt: KitapKonu[] }
export interface KitapUnite { unite: number; baslik: string; bolumler: string[]; pdf?: string; konular: KitapKonu[] }
export async function getKitapKonulari(uniId: string, courseId: string): Promise<KitapUnite[]> {
    try {
        const raw = JSON.parse(await fs.readFile(path.join(DATA_DIR, 'konular', uniId, `${courseId}.json`), 'utf-8'));
        return Array.isArray(raw.uniteler) ? raw.uniteler : [];
    } catch {
        return [];
    }
}

const kitapUniteOnbellek = new Map<string, Record<string, string[]>>();

/** Book unit titles in order (data/kitap-uniteleri/<uni>.json, keyed by course code), e.g. from Anadolu eKampüs. */
export async function getKitapUniteAdlari(uniId: string, courseCode: string | undefined): Promise<string[]> {
    if (!courseCode) return [];
    if (!kitapUniteOnbellek.has(uniId)) {
        try {
            const d = JSON.parse(await fs.readFile(path.join(DATA_DIR, 'kitap-uniteleri', `${uniId}.json`), 'utf-8'));
            kitapUniteOnbellek.set(uniId, d.dersler ?? {});
        } catch {
            kitapUniteOnbellek.set(uniId, {});
        }
    }
    return kitapUniteOnbellek.get(uniId)?.[courseCode] ?? [];
}

export async function getDersIcerik(uniId: string, courseId: string): Promise<DersIcerik | null> {
    try {
        const filePath = path.join(DATA_DIR, 'ders-icerik', uniId, `${courseId}.json`);
        const icerik = JSON.parse(await fs.readFile(filePath, 'utf-8')) as DersIcerik;
        // Weekly plans include exam/review weeks: drop them so topic numbers match book units
        if (icerik.konular) icerik.konular = haftalardanUniteler(icerik.konular);
        return icerik;
    } catch {
        return null;
    }
}

