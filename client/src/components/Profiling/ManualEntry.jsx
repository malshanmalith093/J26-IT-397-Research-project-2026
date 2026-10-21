import React, { useState } from 'react';
import { Shuffle, Sparkles, RotateCcw } from 'lucide-react';

// student_id is not typed in: the server uses the receiving user's pseudonymous id
const FORM_FIELDS = [
    'academic_risk_level',
    'previous_gpa',
    'attendance',
    'assignment_score',
    'quiz_score',
    'study_hours',
    'engagement_score',
    'late_assignments',
    'completed_assignments',
    'learning_progress',
    'risk_score',
    'risk_trend',
    'confidence',
];

const RANGES = {
    High: { previous_gpa: [1.8, 2.7], attendance: [50, 78], assignment_score: [30, 60], quiz_score: [28, 60], study_hours: [2, 9], engagement_score: [20, 55], late_assignments: [2, 5], completed_assignments: [2, 6], learning_progress: [25, 55], risk_score: [0.68, 0.95] },
    Medium: { previous_gpa: [2.5, 3.3], attendance: [68, 88], assignment_score: [50, 72], quiz_score: [48, 72], study_hours: [5, 12], engagement_score: [35, 70], late_assignments: [0, 3], completed_assignments: [4, 7], learning_progress: [45, 68], risk_score: [0.4, 0.67] },
    Low: { previous_gpa: [3.2, 4.0], attendance: [85, 99], assignment_score: [70, 95], quiz_score: [68, 95], study_hours: [10, 20], engagement_score: [60, 95], late_assignments: [0, 1], completed_assignments: [6, 8], learning_progress: [65, 90], risk_score: [0.03, 0.39] },
};

const rand = (min, max, decimals = 0) => {
    const v = min + Math.random() * (max - min);
    return Number(v.toFixed(decimals));
};

export const randomRecord = (level) => {
    const risk = level || ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)];
    const r = RANGES[risk];
    return {
        student_id: `STU-R${Math.floor(1000 + Math.random() * 9000)}`,
        academic_risk_level: risk,
        previous_gpa: rand(...r.previous_gpa, 2),
        attendance: rand(...r.attendance),
        assignment_score: rand(...r.assignment_score),
        quiz_score: rand(...r.quiz_score),
        study_hours: rand(...r.study_hours),
        engagement_score: rand(...r.engagement_score),
        late_assignments: rand(...r.late_assignments),
        completed_assignments: rand(...r.completed_assignments),
        learning_progress: rand(...r.learning_progress),
        risk_score: rand(...r.risk_score, 2),
        risk_trend: ['increasing', 'stable', 'decreasing'][Math.floor(Math.random() * 3)],
        confidence: rand(0.6, 0.9, 2),
    };
};

const EMPTY = Object.fromEntries(FORM_FIELDS.map((f) => [f, '']));

/**
 * Manual entry of one Component 1 output record (or a random one).
 */
const ManualEntry = ({ contract, courses, presets, onGenerate, busy, actionLabel = 'Generate advice', initial }) => {
    const start = initial || presets[0];
    const [form, setForm] = useState({ ...EMPTY, ...(start?.record || {}) });
    const [courseCode, setCourseCode] = useState(start?.course_code || courses[0]?.code || 'IT3020');

    const fields = contract?.fields || {};
    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    const loadPreset = (id) => {
        const p = presets.find((x) => x.record.student_id === id);
        if (p) {
            setForm({ ...EMPTY, ...p.record });
            setCourseCode(p.course_code);
        }
    };

    const toRecord = () => {
        const rec = {};
        FORM_FIELDS.forEach((k) => {
            if (form[k] !== '' && form[k] !== null && form[k] !== undefined) rec[k] = form[k];
        });
        return rec;
    };

    return (
        <div>
            <div className="adv-toolbar">
                <p className="adv-hint">
                    Type values for one student (as Component 1 would send them). Fields marked
                    <span className="adv-not-used-dot" /> are received but not used by Component 2.
                </p>
                <div className="adv-toolbar-actions">
                    <select className="adv-select" onChange={(e) => loadPreset(e.target.value)} defaultValue="">
                        <option value="" disabled>Load a dummy student…</option>
                        {presets.map((p) => (
                            <option key={p.record.student_id} value={p.record.student_id}>
                                {p.scenario} ({p.course_code})
                            </option>
                        ))}
                    </select>
                    {['Low', 'Medium', 'High'].map((lvl) => (
                        <button key={lvl} className="adv-btn ghost" onClick={() => setForm(randomRecord(lvl))} disabled={busy}>
                            <Shuffle size={14} /> Random {lvl}
                        </button>
                    ))}
                    <button className="adv-btn ghost" onClick={() => setForm(EMPTY)} disabled={busy}>
                        <RotateCcw size={14} /> Clear
                    </button>
                </div>
            </div>

            <div className="adv-form-grid">
                {FORM_FIELDS.map((key) => {
                    const spec = fields[key] || { label: key };
                    const notUsed = spec.used === false;
                    return (
                        <label key={key} className={`adv-field ${notUsed ? 'not-used' : ''}`}>
                            <span className="adv-field-label">
                                {spec.label}
                                {spec.required && <em> *</em>}
                                {spec.unit ? <small> ({spec.unit})</small> : null}
                                {notUsed && <span className="adv-not-used-dot" title="Not used by Component 2" />}
                            </span>
                            {spec.type === 'enum' ? (
                                <select value={form[key] ?? ''} onChange={(e) => set(key, e.target.value)}>
                                    <option value="">{spec.required ? 'Select…' : '(none)'}</option>
                                    {spec.values.map((v) => (
                                        <option key={v} value={v}>{v}</option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type={spec.type === 'string' ? 'text' : 'number'}
                                    step={spec.type === 'integer' ? 1 : 'any'}
                                    min={spec.min}
                                    max={spec.max}
                                    value={form[key] ?? ''}
                                    placeholder={spec.min !== undefined ? `${spec.min}–${spec.max}` : ''}
                                    onChange={(e) => set(key, e.target.value)}
                                />
                            )}
                        </label>
                    );
                })}
                <label className="adv-field">
                    <span className="adv-field-label">Current course (C2 context)</span>
                    <select value={courseCode} onChange={(e) => setCourseCode(e.target.value)}>
                        {courses.map((c) => (
                            <option key={c.code} value={c.code}>{c.code} – {c.name}</option>
                        ))}
                    </select>
                </label>
            </div>

            <div className="adv-form-actions">
                <button className="adv-btn primary" onClick={() => onGenerate(toRecord(), courseCode)} disabled={busy}>
                    <Sparkles size={16} /> {actionLabel}
                </button>
            </div>
        </div>
    );
};

export default ManualEntry;
