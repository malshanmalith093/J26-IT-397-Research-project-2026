/**
 * Tests for the bulk import tab: send now vs import only (send later).
 * TC-FE-13 .. TC-FE-14 in the PP1 test-case document.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import BulkImport from './BulkImport';
import * as api from './adviceApi';

vi.mock('./adviceApi');

const parsed = {
    count: 1,
    valid: 1,
    rows: [{
        row: 1, ok: true, user_id: 'u1', email: 'john@example.com', name: 'John Maarie',
        course_code: 'IT2040', record: { academic_risk_level: 'High' }, errors: [], warnings: [],
    }],
};

const setup = () => {
    const onSend = vi.fn().mockResolvedValue();
    const onImport = vi.fn().mockResolvedValue();
    render(
        <BulkImport contract={{ c1_core_fields: [] }} students={[]} templates={[]}
            onSend={onSend} onImport={onImport} busy={false} />
    );
    return { onSend, onImport };
};

describe('BulkImport (send now vs import only)', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        api.parseRecords.mockResolvedValue(parsed);
    });

    it('TC-FE-13: "Import only (send later)" passes the valid rows to onImport, not onSend', async () => {
        const { onSend, onImport } = setup();
        await userEvent.type(screen.getByRole('textbox'), 'email,academic_risk_level\njohn@example.com,High');
        await userEvent.click(screen.getByRole('button', { name: /validate/i }));
        await userEvent.click(await screen.findByTestId('import-only'));
        expect(onImport).toHaveBeenCalledWith([
            { user_id: 'u1', record: { academic_risk_level: 'High' }, course_code: 'IT2040' },
        ]);
        expect(onSend).not.toHaveBeenCalled();
    });

    it('TC-FE-14: "Send advice" still sends immediately via onSend', async () => {
        const { onSend, onImport } = setup();
        await userEvent.type(screen.getByRole('textbox'), 'email,academic_risk_level\njohn@example.com,High');
        await userEvent.click(screen.getByRole('button', { name: /validate/i }));
        await userEvent.click(await screen.findByTestId('send-now'));
        expect(onSend).toHaveBeenCalledTimes(1);
        expect(onImport).not.toHaveBeenCalled();
    });
});
