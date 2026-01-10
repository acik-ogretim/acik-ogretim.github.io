import { describe, expect, it } from 'vitest';
import { getCourses, getDepartments, getQuestions, getUniversities } from './api';

describe('Data Gateway (Diamond Standard Enforcement)', () => {

    describe('getUniversities', () => {
        it('should ensure all universities have mandatory diamond properties', async () => {
            const unis = await getUniversities();
            expect(unis.length).toBeGreaterThan(0);

            unis.forEach(uni => {
                expect(uni.id).toMatch(/^[a-z0-9-]+$/);
                expect(uni.color).toMatch(/^#[0-9A-F]{6}$/i);
                expect(Array.isArray(uni.departments)).toBe(true);
            });
        });
    });

    describe('getDepartments', () => {
        it('should return valid departments with default values applied', async () => {
            const departments = await getDepartments('test-uni');
            expect(departments.length).toBeGreaterThan(0);

            const activeDept = departments.find(d => d.id === 'test-dept-active');
            expect(activeDept).toBeDefined();
            // Default check (even if legacy data is missing these, Diamond Standard guarantees them)
            expect(typeof activeDept?.active).toBe('boolean');
            expect(typeof activeDept?.degree).toBe('string');
        });
    });

    describe('getQuestions', () => {
        it('should normalize all legacy question formats into a strict array of objects', async () => {
            const questions = await getQuestions('test-uni', 'course-active-1');

            questions.forEach(q => {
                // The 'options' field MUST be an array of {key, text} after the API call
                expect(Array.isArray(q.options)).toBe(true);
                expect(q.options.length).toBeGreaterThanOrEqual(0);
                expect(q.options.length).toBeLessThanOrEqual(5);
                if (q.options.length > 0) {
                    expect(q.options[0]).toHaveProperty('key');
                    expect(['A', 'B', 'C', 'D', 'E']).toContain(q.options[0].key);
                }

                // Content safety
                expect(typeof q.text).toBe('string');
                // correctAnswer must be A-E or empty string (for unknown/cancelled answers)
                expect(q.correctAnswer).toMatch(/^[A-E]?$/);
            });
        });

        it('should handle missing data gracefully without crashing', async () => {
            const questions = await getQuestions('non-existent-uni', 'ghost-course');
            expect(questions).toEqual([]);
        });

        it('should handle questions with empty answers gracefully', async () => {
            const questions = await getQuestions('test-uni', 'course-empty-answer');
            expect(questions.length).toBeGreaterThan(0);
            questions.forEach(q => {
                expect(q.correctAnswer).toBe('');
            });
        });
    });

    describe('getCourses', () => {
        it('should populate default metadata for courses', async () => {
            const courses = await getCourses('test-uni', 'test-dept-active');
            expect(courses.length).toBeGreaterThan(0);

            courses.forEach(course => {
                expect(course.unitCount).toBeGreaterThan(0);
                expect(typeof course.semester).toBe('number');
                expect(course.lastUpdated).toBeDefined();
            });
        });
    });
});
