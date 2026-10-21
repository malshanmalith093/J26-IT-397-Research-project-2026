/**
 * Tests for the advice API helper (pure functions, no network).
 * TC-FE-10 .. TC-FE-12 in the PP1 test-case document.
 */
import { describe, it, expect } from 'vitest';
import { csvTemplate, errorMessage } from './adviceApi';

const contract = {
    c1_core_fields: [
        'student_id', 'previous_gpa', 'attendance', 'assignment_score', 'quiz_score',
        'study_hours', 'engagement_score', 'late_assignments', 'completed_assignments',
        'learning_progress', 'academic_risk_level',
    ],
};

describe('csvTemplate', () => {
    it('TC-FE-10: builds a header with every Component 1 field except student_id, plus email/trend/course', () => {
        const csv = csvTemplate(contract, [], []);
        const header = csv.split('\n')[0].split(',');
        expect(header[0]).toBe('email');
        expect(header).not.toContain('student_id');
        expect(header).toEqual(
            expect.arrayContaining(['previous_gpa', 'attendance', 'academic_risk_level', 'risk_trend', 'course_code'])
        );
    });

    it('TC-FE-11: pre-fills one row per registered student from the dummy templates', () => {
        const students = [{ email: 'amanda@sliit.lk' }, { email: 'kasun@sliit.lk' }];
        const templates = [
            { course_code: 'CS103', record: { previous_gpa: 2.1, attendance: 55, academic_risk_level: 'high' } },
        ];
        const rows = csvTemplate(contract, students, templates).split('\n');
        expect(rows).toHaveLength(3); // header + 2 students
        expect(rows[1].startsWith('amanda@sliit.lk,2.1,55')).toBe(true);
        expect(rows[1]).toContain('CS103');
        expect(rows[2].startsWith('kasun@sliit.lk,')).toBe(true);
    });
});

describe('errorMessage', () => {
    it('TC-FE-12: prefers the server message, explains network errors, falls back to the generic one', () => {
        expect(errorMessage({ response: { data: { message: 'Only staff can send advice' } } }))
            .toBe('Only staff can send advice');
        expect(errorMessage({ code: 'ERR_NETWORK' })).toMatch(/python service/i);
        expect(errorMessage({ message: 'boom' })).toBe('boom');
        expect(errorMessage(undefined)).toBe('Something went wrong');
    });
});
