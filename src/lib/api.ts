import fs from 'node:fs/promises';
import path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), 'data');

export interface University {
    id: string;
    name: string;
    shortName: string;
    faculty: string;
    website: string;
    logo?: string;
    color: string;
}

export interface Department {
    id: string;
    universityId: string;
    name: string;
    shortName: string;
    code: string;
    duration: number;
    degree?: 'lisans' | 'onlisans' | 'lisans-tamamlama' | 'uzem-lisans-tamamlama' | 'tezsiz-yuksek-lisans';
    icon?: string;
    active?: boolean;
}

export interface Course {
    id: string;
    name: string;
    code?: string;
    semester: number;
    universityId: string;
    departmentId: string;
    automationId?: string;
}

export interface Question {
    id: string;
    text: string;
    unitNumber: number;
    options: { key: string; text: string }[];
    correctAnswer: string;
    explanation?: string;
}

export async function getUniversities(): Promise<University[]> {
    const content = await fs.readFile(path.join(DATA_DIR, 'universities.json'), 'utf-8');
    return JSON.parse(content);
}

export async function getDepartments(uniId: string): Promise<Department[]> {
    const unis = await getUniversities();
    const uni = unis.find(u => u.id === uniId);
    return (uni as any)?.departments || [];
}

export async function getCourses(uniId: string, deptId: string): Promise<Course[]> {
    try {
        const filePath = path.join(DATA_DIR, 'courses', uniId, `${deptId}.json`);
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content);
    } catch {
        return [];
    }
}

export async function getQuestions(uniId: string, courseId: string): Promise<Question[]> {
    try {
        const filePath = path.join(DATA_DIR, 'questions', uniId, `${courseId}.json`);
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content);
    } catch {
        return [];
    }
}
