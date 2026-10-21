import React, { useRef, useState } from 'react';
import { Upload, FileDown, CheckCircle2, XCircle, Send, Inbox } from 'lucide-react';
import { parseRecords, csvTemplate, errorMessage } from './adviceApi';
import { RiskBadge } from './ui';

/**
 * Staff: paste or upload dummy Component 1 records for several students at once.
 * Each row is routed to a registered user by its "email" (or "user_id") column.
 * Rows can be SENT immediately (advice is generated and delivered) or only
 * IMPORTED (saved as pending, so the advice can be sent later from the Pending tab).
 */
const BulkImport = ({ contract, students, templates, onSend, onImport, busy }) => {
    const [text, setText] = useState('');
    const [parsed, setParsed] = useState(null);
    const [error, setError] = useState('');
    const fileRef = useRef(null);

    const validate = async (value = text) => {
        setError('');
        setParsed(null);
        try {
            setParsed(await parseRecords(value));
        } catch (err) {
            setError(errorMessage(err));
        }
    };

    const onFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            setText(String(reader.result));
            validate(String(reader.result));
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const downloadTemplate = () => {
        const blob = new Blob([csvTemplate(contract, students, templates)], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'component1_dummy_records.csv';
        a.click();
        URL.revokeObjectURL(a.href);
    };

    const validRows = parsed ? parsed.rows.filter((r) => r.ok) : [];

    const toItems = () =>
        validRows.map((r) => ({ user_id: r.user_id, record: r.record, course_code: r.course_code || undefined }));

    const send = async () => {
        await onSend(toItems());
        setParsed(null);
    };

    const importOnly = async () => {
        await onImport(toItems());
        setParsed(null);
    };

    return (
        <div>
            <div className="adv-toolbar">
                <p className="adv-hint">
                    One row per student. The <b>email</b> column decides who receives the advice (it must be a registered
                    user). Download the template – it is already filled with dummy values for every registered student.
                </p>
                <div className="adv-toolbar-actions">
                    <button className="adv-btn ghost" onClick={downloadTemplate}>
                        <FileDown size={14} /> CSV template
                    </button>
                    <button className="adv-btn ghost" onClick={() => fileRef.current?.click()}>
                        <Upload size={14} /> Upload file
                    </button>
                    <input ref={fileRef} type="file" accept=".csv,.json,.txt" hidden onChange={onFile} />
                </div>
            </div>

            <textarea
                className="adv-textarea"
                rows={8}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={'email,previous_gpa,attendance,assignment_score,quiz_score,study_hours,engagement_score,late_assignments,completed_assignments,learning_progress,academic_risk_level,course_code\nstudent1@my.sliit.lk,2.4,62,47,41,5,38,3,4,40,High,IT3020'}
            />

            <div className="adv-form-actions">
                <button className="adv-btn ghost" onClick={() => validate()} disabled={!text.trim() || busy}>
                    Validate
                </button>
                {validRows.length > 0 && (
                    <>
                        <button
                            className="adv-btn ghost"
                            onClick={importOnly}
                            disabled={busy}
                            data-testid="import-only"
                            title="Save the records without generating advice - send it later from the Pending tab"
                        >
                            <Inbox size={16} /> Import only (send later)
                        </button>
                        <button className="adv-btn primary" onClick={send} disabled={busy} data-testid="send-now">
                            <Send size={16} /> Send advice to {validRows.length} student(s)
                        </button>
                    </>
                )}
            </div>

            {error && <div className="adv-alert error">{error}</div>}

            {parsed && (
                <div className="adv-table-wrap">
                    <p className="adv-hint">{parsed.valid} of {parsed.count} rows are valid.</p>
                    <table className="adv-table">
                        <thead>
                            <tr>
                                <th>Row</th>
                                <th />
                                <th>Student</th>
                                <th>Risk</th>
                                <th>Course</th>
                                <th>Messages</th>
                            </tr>
                        </thead>
                        <tbody>
                            {parsed.rows.map((r) => (
                                <tr key={r.row}>
                                    <td>{r.row}</td>
                                    <td>
                                        {r.ok ? <CheckCircle2 size={16} className="ok-icon" /> : <XCircle size={16} className="err-icon" />}
                                    </td>
                                    <td>
                                        {r.name || '—'}
                                        <div className="adv-msgs">{r.email}</div>
                                    </td>
                                    <td>{r.record ? <RiskBadge level={r.record.academic_risk_level} /> : '—'}</td>
                                    <td>{r.course_code || 'default'}</td>
                                    <td className="adv-msgs">{[...r.errors, ...r.warnings].join(' ') || 'OK'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default BulkImport;
