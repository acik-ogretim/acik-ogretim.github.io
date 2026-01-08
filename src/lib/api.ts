import fs from 'node:fs/promises';
import path from 'node:path';
import type { Course, Department, Question, University } from './types';

const DATA_DIR = path.resolve(process.cwd(), 'data');

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
