import { defineCollection } from 'astro:content';
import {
    courseSchema,
    departmentSchema,
    questionSchema,
    universitySchema
} from '../lib/schemas';

// Üniversite koleksiyonu
const universitiesCollection = defineCollection({
    type: 'data',
    schema: universitySchema,
});

// Bölüm koleksiyonu
const departmentsCollection = defineCollection({
    type: 'data',
    schema: departmentSchema,
});

// Ders koleksiyonu
const coursesCollection = defineCollection({
    type: 'data',
    schema: courseSchema,
});

// Soru koleksiyonu (MDX ile zenginleştirilmiş)
const questionsCollection = defineCollection({
    type: 'content',
    schema: questionSchema,
});

export const collections = {
    universities: universitiesCollection,
    departments: departmentsCollection,
    courses: coursesCollection,
    questions: questionsCollection,
};
