/**
 * Tests for the student "My learning advice" view (Behavioral Profile page).
 * TC-FE-06 .. TC-FE-09 in the PP1 test-case document.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import MyAdvice from './MyAdvice';
import * as api from './adviceApi';

vi.mock('./adviceApi');
// AdviceView renders the full advice body; it is exercised separately.
vi.mock('./AdviceView', () => ({
    default: ({ result }) => <div data-testid="advice-view">{result.course_code}</div>,
}));

const doc = (over = {}) => ({
    id: 'a1',
    course_code: 'CS103',
    course: { name: 'Database Systems' },
    input: { academic_risk_level: 'high' },
    advice: { status_summary: { overall_status: 'at_risk', headline: 'Focus on quizzes.' } },
    read_at: null,
    created_at: '2026-10-20T10:00:00Z',
    ...over,
});

const historyRow = (over = {}) => ({
    id: 'a1',
    course_code: 'CS103',
    risk_level: 'high',
    overall_status: 'at_risk',
    headline: 'Focus on quizzes.',
    created_at: '2026-10-20T10:00:00Z',
    read: false,
    ...over,
});

describe('MyAdvice (student view)', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        api.markAdviceRead.mockResolvedValue({ ok: true });
    });

    it('TC-FE-06: shows the empty state when no advice has been sent yet', async () => {
        api.getMyAdvice.mockResolvedValue({ user: { name: 'Amanda' }, latest: [], history: [], unread: 0 });
        render(<MyAdvice contract={null} />);
        expect(await screen.findByText(/no advice yet/i)).toBeInTheDocument();
    });

    it('TC-FE-07: shows a friendly error when the Python service is down', async () => {
        api.getMyAdvice.mockRejectedValue(new Error('boom'));
        api.errorMessage.mockReturnValue('Cannot reach the Python service. Is Flask running on port 3000?');
        render(<MyAdvice contract={null} />);
        expect(await screen.findByText(/cannot reach the python service/i)).toBeInTheDocument();
    });

    it('TC-FE-08: renders the latest advice, marks it read and shows the remaining unread count', async () => {
        // Two unread items: the newest one (a1) is opened automatically and
        // marked as read, so the badge should show "1 new" (the older one).
        api.getMyAdvice.mockResolvedValue({
            user: { name: 'Amanda' },
            latest: [doc()],
            history: [historyRow(), historyRow({ id: 'a0', created_at: '2026-10-13T10:00:00Z' })],
            unread: 2,
        });
        render(<MyAdvice contract={null} />);
        expect(await screen.findByText(/my learning advice/i)).toBeInTheDocument();
        expect(screen.getByTestId('advice-view')).toHaveTextContent('CS103');
        // opening the newest advice marks it as read on the server…
        await waitFor(() => expect(api.markAdviceRead).toHaveBeenCalledWith('a1'));
        // …and the unread badge now counts only the older item
        expect(screen.getByText(/1 new/i)).toBeInTheDocument();
    });

    it('TC-FE-09: switching course tabs opens that course’s advice', async () => {
        const cs102 = doc({ id: 'a2', course_code: 'CS102', course: { name: 'Data Structures' } });
        api.getMyAdvice.mockResolvedValue({
            user: { name: 'Amanda' },
            latest: [doc(), cs102],
            history: [historyRow(), historyRow({ id: 'a2', course_code: 'CS102' })],
            unread: 0,
        });
        render(<MyAdvice contract={null} />);
        await screen.findByText(/my learning advice/i);
        await userEvent.click(screen.getByRole('button', { name: /CS102 · Data Structures/i }));
        await waitFor(() => expect(screen.getByTestId('advice-view')).toHaveTextContent('CS102'));
    });
});
