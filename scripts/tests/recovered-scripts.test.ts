import { afterEach, expect, test } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const temporaryRoots: string[] = [];
afterEach(() => {
    for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixtureRoot() {
    const root = mkdtempSync(join(tmpdir(), 'portal-recovered-'));
    temporaryRoots.push(root);
    return root;
}

test('unit text generation preserves unrelated output and accepts numeric question ids', () => {
    const root = fixtureRoot();
    const questions = join(root, 'data/questions/anadolu-aof');
    mkdirSync(questions, { recursive: true });
    mkdirSync(join(root, 'agent_texts'));
    writeFileSync(join(root, 'agent_texts/other-course.txt'), 'Keep this text');
    writeFileSync(join(questions, 'anadolu-kultur-tarihi.json'), JSON.stringify([
        { id: 2, unitNumber: 1, text: 'Second', options: { A: 'Answer' }, correctAnswer: 'A' },
        { id: 1, unitNumber: 1, text: 'First', options: { A: 'Answer' }, correctAnswer: 'A' },
    ]));
    execFileSync(process.execPath, [resolve('scripts/generate_agent_text.ts')], { cwd: root, stdio: 'pipe' });
    expect(readFileSync(join(root, 'agent_texts/other-course.txt'), 'utf8')).toBe('Keep this text');
    const output = readFileSync(join(root, 'agent_texts/GİT102U_ANADOLU_KÜLTÜR_TARİHİ_Unite_1.txt'), 'utf8');
    expect(output).toContain('Soru 1 - First');
    expect(output).toContain('Soru 2 - Second');
    expect(output.indexOf('Soru 1 - First')).toBeLessThan(output.indexOf('Soru 2 - Second'));
    expect(output).not.toMatch(/[ \t]+$/m);
    expect(output.endsWith('\n\n')).toBe(false);
});

test('Anadolu sync keeps explanations that repeat the correct option', () => {
    const root = fixtureRoot();
    const portal = join(root, 'portal');
    const raw = join(root, 'acik-ogretim-mcp/data/raw/anadolu-aof/test-course');
    mkdirSync(portal);
    mkdirSync(raw, { recursive: true });
    const answer = 'Bilgisayar destekli tasarım 1960 yılında gelişmiştir.';
    writeFileSync(join(raw, 'alistirma-sorulari.json'), JSON.stringify([
        { QuestionId: 1, UniteNo: 1, Text: 'Question', A: answer, CorrectAnswer: 'A', AnswerExplanation: answer },
    ]));
    writeFileSync(join(raw, 'cikmis-sorular.json'), JSON.stringify([
        { id: 2, material_id: 'test', question: 'Exam question', options: [answer], correctIndex: 0, explanation: answer },
    ]));
    execFileSync(process.execPath, [resolve('scripts/sync-anadolu-raw.ts'), '--course=test-course'], { cwd: portal, stdio: 'pipe' });
    const questions = JSON.parse(readFileSync(join(portal, 'data/questions/anadolu-aof/test-course.json'), 'utf8'));
    expect(questions).toHaveLength(2);
    expect(questions.map((question: { explanation: string }) => question.explanation)).toEqual([answer, answer]);
});
