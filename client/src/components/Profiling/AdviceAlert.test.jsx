/**
 * Tests for the Dashboard advice alert card (Component 2).
 * TC-FE-01 .. TC-FE-05 in the PP1 test-case document.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import AdviceAlert from './AdviceAlert';
import * as api from './adviceApi';

vi.mock('./adviceApi');

const adviceDoc = (over = {}) => ({
    id: 'a1',
    course_code: 'CS103',
    course: { name: 'Database Systems' },
    input: { academic_risk_level: 'high' },
    advice: { status_summary: { overall_status: 'at_risk', headline: 'Your quiz scores need attention.' } },
    read_at: null,
    created_at: '2026-10-20T10:00:00Z',
    ...over,
});

const renderAlert = () =>
    render(
        <MemoryRouter initialEntries={['/dashboard']}>
            <Routes>
                <Route path="/dashboard" element={<AdviceAlert />} />
                <Route path="/Profiling" element={<div data-testid="profiling-page">Behavioral Profile</div>} />
            </Routes>
        </MemoryRouter>
    );

describe('AdviceAlert (Dashboard card)', () => {
    beforeEach(() => vi.resetAllMocks());

    it('TC-FE-01: renders nothing while the student has no advice', async () => {
        api.getMyAdvice.mockResolvedValue({ user: { name: 'Amanda' }, latest: [], history: [], unread: 0 });
        renderAlert();
        await waitFor(() => expect(api.getMyAdvice).toHaveBeenCalled());
        expect(screen.queryByTestId('advice-alert')).not.toBeInTheDocument();
    });

    it('TC-FE-02: renders nothing (and does not crash) when the advice service is unreachable', async () => {
        api.getMyAdvice.mockRejectedValue(new Error('network down'));
        renderAlert();
        await waitFor(() => expect(api.getMyAdvice).toHaveBeenCalled());
        expect(screen.queryByTestId('advice-alert')).not.toBeInTheDocument();
    });

    it('TC-FE-03: shows the unread count and per-course risk when new advice arrives', async () => {
        api.getMyAdvice.mockResolvedValue({
            user: { name: 'Amanda' },
            latest: [
                adviceDoc(),
                adviceDoc({
                    id: 'a2',
                    course_code: 'CS102',
                    input: { academic_risk_level: 'medium' },
                    advice: { status_summary: { overall_status: 'needs_attention', headline: 'Hand assignments in on time.' } },
                }),
            ],
            history: [],
            unread: 2,
        });
        renderAlert();
        expect(await screen.findByTestId('advice-alert')).toBeInTheDocument();
        expect(screen.getByTestId('advice-unread')).toHaveTextContent('2');
        expect(screen.getByText(/2 new advice updates/i)).toBeInTheDocument();
        expect(screen.getByText('CS103')).toBeInTheDocument();
        expect(screen.getByText('High risk')).toBeInTheDocument();
        expect(screen.getByText('Medium risk')).toBeInTheDocument();
        expect(screen.getByText('Your quiz scores need attention.')).toBeInTheDocument();
    });

    it('TC-FE-04: shows a read snapshot (no counter) when everything has been read', async () => {
        api.getMyAdvice.mockResolvedValue({
            user: { name: 'Amanda' },
            latest: [adviceDoc({ read_at: '2026-10-20T11:00:00Z' })],
            history: [],
            unread: 0,
        });
        renderAlert();
        expect(await screen.findByTestId('advice-alert')).toBeInTheDocument();
        expect(screen.queryByTestId('advice-unread')).not.toBeInTheDocument();
        expect(screen.getByText(/snapshot of your latest personalised advice/i)).toBeInTheDocument();
    });

    it('TC-FE-05: "View my advice" navigates to the Behavioral Profile page', async () => {
        api.getMyAdvice.mockResolvedValue({
            user: { name: 'Amanda' },
            latest: [adviceDoc()],
            history: [],
            unread: 1,
        });
        renderAlert();
        await screen.findByTestId('advice-alert');
        await userEvent.click(screen.getByTestId('advice-alert-open'));
        expect(await screen.findByTestId('profiling-page')).toBeInTheDocument();
    });
});
