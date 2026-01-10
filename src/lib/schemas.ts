import { z } from 'astro:content';

/**
 * Shared Enums
 */
export const DegreeEnum = z.enum([
    'onlisans',
    'lisans',
    'yukseklisans',
    'lisans-tamamlama',
    'uzem-lisans-tamamlama',
    'tezsiz-yuksek-lisans'
]);

export const SourceEnum = z.enum([
    'soru-bankasi',
    'cikmis-soru',
    'deneme',
    'sorularla-ogrenelim'
]);

export const ExamTypeEnum = z.enum([
    'vize',
    'final',
    'butunleme',
    'tek-ders',
    'genel'
]);

export const DifficultyEnum = z.enum([
    'kolay',
    'orta',
    'zor'
]);

export const OptionKeyEnum = z.enum(['A', 'B', 'C', 'D', 'E', '']);

/**
 * Department Schema
 */
export const departmentSchema = z.object({
    id: z.string().min(1),
    universityId: z.string().optional(), // Often inferred from parent
    name: z.string().min(1),
    shortName: z.string().default(''),
    code: z.string().default(''),
    degree: DegreeEnum.default('lisans'),
    duration: z.number().default(4),
    active: z.boolean().default(true),
    order: z.number().default(0),
    icon: z.string().default(''),
});

/**
 * University Schema
 */
export const universitySchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    shortName: z.string().min(1),
    faculty: z.string().min(1),
    website: z.string().url(),
    logo: z.string().default(''),
    color: z.string().regex(/^#[0-9A-F]{6}$/i).default('#4f46e5'),
    order: z.number().default(0),
    departments: z.array(z.lazy(() => departmentSchema)).default([]),
});

/**
 * Course Schema
 */
export const courseSchema = z.object({
    id: z.string().min(1),
    departmentId: z.string().optional(),
    universityId: z.string().optional(),
    name: z.string().min(1),
    code: z.string().default(''),
    semester: z.number().default(1),
    credits: z.number().default(0),
    unitCount: z.number().default(14),
    questionCount: z.number().default(0),
    automationId: z.string().default(''),
    lastUpdated: z.string().optional(),
});

/**
 * Question Schema - High compatibility with smart transformation
 */
export const questionSchema = z.object({
    id: z.any().transform(v => String(v)),
    courseId: z.string().optional(),
    unitNumber: z.any().transform(v => Number(v) || 0),
    text: z.string(), // Can be empty for cancelled questions
    options: z.union([
        z.array(z.object({ key: z.string(), text: z.string() })),
        z.record(z.string()),
        z.array(z.string())
    ]).transform((val) => {
        const optionKeys = ['A', 'B', 'C', 'D', 'E'];
        if (Array.isArray(val)) {
            if (val.length > 0 && typeof val[0] === 'object' && 'key' in val[0]) {
                return (val as { key: string, text: string }[]).slice(0, 5);
            }
            return (val as string[])
                .slice(0, 5)
                .map((text, i) => ({ key: optionKeys[i] ?? String.fromCharCode(65 + i), text }));
        }
        return Object.entries(val)
            .slice(0, 5)
            .map(([key, text]) => ({ key, text }));
    }),
    correctAnswer: z.any().transform(v => String(v || '').toUpperCase()).pipe(OptionKeyEnum).catch('' as any),
    explanation: z.string().default(''),
    aiExplanation: z.string().optional(),
    source: SourceEnum.default('soru-bankasi'),
    year: z.union([z.number(), z.string()]).optional().default(''),
    examType: ExamTypeEnum.default('genel'),
    difficulty: DifficultyEnum.default('orta'),
    topics: z.array(z.string()).default([]),
});
