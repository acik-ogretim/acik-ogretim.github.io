import { describe, expect, it } from 'vitest';
import {
    courseSchema,
    departmentSchema,
    questionSchema,
    universitySchema
} from './schemas';

describe('Diamond Standard Schemas', () => {

    describe('Question Schema', () => {
        it('should transform legacy options object to standard array', () => {
            const legacyData = {
                id: 'q1',
                courseId: 'test-course',
                unitNumber: 1,
                text: 'Test question text more than 10 chars',
                options: { A: 'Option 1', B: 'Option 2', C: 'Option 3', D: 'Option 4', E: 'Option 5' },
                correctAnswer: 'A',
                explanation: 'Test explanation',
                source: 'soru-bankasi',
                year: 2024,
                examType: 'vize',
                difficulty: 'orta',
                topics: []
            };
            const result = questionSchema.parse(legacyData);
            expect(Array.isArray(result.options)).toBe(true);
            expect(result.options[0]).toEqual({ key: 'A', text: 'Option 1' });
        });

        it('should allow empty text for cancelled questions', () => {
            const data = {
                id: 'q3',
                courseId: 'test-course',
                unitNumber: 1,
                text: '', // Empty
                options: [
                    { key: 'A', text: 'T1' }, { key: 'B', text: 'T2' },
                    { key: 'C', text: 'T3' }, { key: 'D', text: 'T4' }, { key: 'E', text: 'T5' }
                ],
                correctAnswer: 'C',
                explanation: 'Cancelled',
                source: 'soru-bankasi',
                year: 2024,
                examType: 'tek-ders',
                difficulty: 'kolay',
                topics: []
            };
            const result = questionSchema.parse(data);
            expect(result.text).toBe('');
        });

        it('should default correctAnswer to empty string if missing or invalid', () => {
            const data = {
                id: 'q-no-ans',
                text: 'Test',
                options: ['A', 'B', 'C', 'D', 'E'],
                correctAnswer: 'X' // Invalid
            };
            const result = questionSchema.parse(data);
            expect(result.correctAnswer).toBe('');
        });

        it('should allow questions with fewer than 5 options', () => {
            const data = {
                id: 'q4',
                options: [{ key: 'A', text: 'Only one' }],
                text: 'Valid text',
                correctAnswer: 'A'
            };
            const result = questionSchema.parse(data);
            expect(result.options.length).toBe(1);
        });

        it('should trim options when more than 5 are provided', () => {
            const data = {
                id: 'q5',
                options: ['1', '2', '3', '4', '5', '6'],
                text: 'Valid text',
                correctAnswer: 'A'
            };
            const result = questionSchema.parse(data);
            expect(result.options.length).toBe(5);
        });
    });

    describe('Department Schema', () => {
        it('should apply defaults for optional metadata', () => {
            const data = {
                id: 'test-dept',
                name: 'Test Dept'
            };
            const result = departmentSchema.parse(data);
            expect(result.degree).toBe('lisans');
            expect(result.duration).toBe(4);
            expect(result.active).toBe(true);
        });
    });

    describe('Course Schema', () => {
        it('should apply defaults to a minimal course', () => {
            const data = {
                id: 'minimal-course',
                name: 'Minimal'
            };
            const result = courseSchema.parse(data);
            expect(result.semester).toBe(1);
            expect(result.unitCount).toBe(14);
            expect(result.lastUpdated).toBeDefined();
        });
    });

    describe('University Schema', () => {
        it('should validate a valid university with defaults', () => {
            const validUni = {
                id: 'test-uni',
                name: 'Test Uni',
                shortName: 'TUni',
                faculty: 'Test Fac',
                website: 'https://test.edu.tr'
            };
            const result = universitySchema.parse(validUni);
            expect(result.id).toBe('test-uni');
            expect(result.color).toBe('#4f46e5'); // default
        });
    });
});
