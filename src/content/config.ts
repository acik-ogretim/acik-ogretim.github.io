import { defineCollection, z } from 'astro:content';

// Üniversite koleksiyonu
const universitiesCollection = defineCollection({
    type: 'data',
    schema: z.object({
        id: z.string(),
        name: z.string(),
        shortName: z.string(),
        faculty: z.string(),
        website: z.string().url(),
        logo: z.string().optional(),
        color: z.string(),
        order: z.number().default(0),
    }),
});

// Bölüm koleksiyonu
const departmentsCollection = defineCollection({
    type: 'data',
    schema: z.object({
        id: z.string(),
        universityId: z.string(),
        name: z.string(),
        shortName: z.string(),
        code: z.string(),
        degree: z.enum(['onlisans', 'lisans', 'yukseklisans']),
        duration: z.number().min(2).max(10),
        active: z.boolean().default(true),
        order: z.number().default(0),
    }),
});

// Ders koleksiyonu
const coursesCollection = defineCollection({
    type: 'data',
    schema: z.object({
        id: z.string(),
        departmentId: z.string(),
        universityId: z.string(),
        name: z.string(),
        code: z.string().optional(),
        semester: z.number().min(1).max(8),
        credits: z.number().optional(),
        unitCount: z.number().min(1),
        questionCount: z.number().default(0),
        lastUpdated: z.string().datetime().optional(),
    }),
});

// Soru koleksiyonu (MDX ile zenginleştirilmiş)
const questionsCollection = defineCollection({
    type: 'content',
    schema: z.object({
        id: z.string(),
        courseId: z.string(),
        unitNumber: z.number(),
        text: z.string(),
        options: z.array(z.object({
            key: z.enum(['A', 'B', 'C', 'D', 'E']),
            text: z.string(),
        })),
        correctAnswer: z.enum(['A', 'B', 'C', 'D', 'E']),
        explanation: z.string().optional(),
        source: z.enum(['soru-bankasi', 'cikmis-soru', 'deneme', 'sorularla-ogrenelim']),
        year: z.number().optional(),
        examType: z.enum(['vize', 'final', 'butunleme', 'tek-ders']).optional(),
        difficulty: z.enum(['kolay', 'orta', 'zor']).optional(),
        topics: z.array(z.string()).optional(),
        aiExplanation: z.string().optional(),
    }),
});

export const collections = {
    universities: universitiesCollection,
    departments: departmentsCollection,
    courses: coursesCollection,
    questions: questionsCollection,
};
