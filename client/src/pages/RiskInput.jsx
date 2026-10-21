import React, { useState } from 'react';
import axios from 'axios';
import { AlertCircle, ArrowRight, BookOpenCheck, Save } from 'lucide-react';
import { updateRiskAssessmentNotice } from '../utils/riskAssessmentNotice';

const API_URL = import.meta.env.VITE_PYTHON_BACKEND || 'http://localhost:3000';

const initialForm = {
    student_id: '',
    student_name: '',
    module_id: '',
    module_name: '',
    attendance: '',
    assignment_score: '',
    quiz_score: '',
    study_hours: '',
    engagement_score: '',
    late_assignments: '',
    completed_assignments: '',
    learning_progress: '',
};

const fields = [
    { key: 'attendance', label: 'Attendance', min: 0, max: 100, step: 0.1, suffix: '%', hint: '0 to 100%' },
    { key: 'assignment_score', label: 'Assignment Score', min: 0, max: 100, step: 0.1, suffix: '%', hint: '0 to 100%' },
    { key: 'quiz_score', label: 'Quiz Score', min: 0, max: 100, step: 0.1, suffix: '%', hint: '0 to 100%' },
    { key: 'study_hours', label: 'Study Hours', min: 0, step: 0.1, suffix: 'hrs', hint: 'Hours studied' },
    { key: 'engagement_score', label: 'Engagement Score', min: 0, max: 100, step: 0.1, suffix: '%', hint: '0 to 100%' },
    { key: 'late_assignments', label: 'Late Assignments', min: 0, step: 1, hint: 'Whole number' },
    { key: 'completed_assignments', label: 'Completed Assignments', min: 0, step: 1, hint: 'Whole number' },
    { key: 'learning_progress', label: 'Learning Progress', min: 0, max: 100, step: 0.1, suffix: '%', hint: '0 to 100%' },
];

const RiskInput = () => {
    const [form, setForm] = useState(initialForm);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const updateField = (event) => {
        setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    };

    const submit = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError('');
        setSuccessMessage('');
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('Sign in before submitting a risk assessment.');
            const payload = { ...form };
            fields.forEach(({ key }) => { payload[key] = Number(payload[key]); });
            const { data } = await axios.post(`${API_URL}/api/risk-assessment`, payload, {
                headers: { 'x-auth-token': token },
            });
            if (data.assessment) updateRiskAssessmentNotice(data.assessment);
            const isAtRisk = ['medium', 'high'].includes(String(data.assessment?.risk_level || '').toLowerCase());
            setSuccessMessage(isAtRisk
                ? 'At-risk result recorded. See the Risk Assessment tab for its indicator.'
                : 'Assessment completed.');
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Could not submit the risk assessment.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="risk-input-page">
            <header className="input-heading">
                <span className="input-eyebrow">MANUAL ASSESSMENT</span>
                <h1>Enter student results</h1>
            </header>

            {error && <div className="input-error"><AlertCircle size={18} /><span>{error}</span></div>}
            {successMessage && <div className="input-success" role="status">{successMessage}</div>}

            <form className="risk-input-form" onSubmit={submit}>
                <section className="form-section">
                    <div className="form-section-heading">
                        <span className="form-section-icon"><BookOpenCheck size={18} /></span>
                        <div><h2>Student and module</h2><p>Identify the student and the subject being assessed.</p></div>
                    </div>
                    <div className="form-grid identity-grid">
                        <label className="form-field"><span>Student ID</span><input name="student_id" value={form.student_id} onChange={updateField} placeholder="e.g. STU001" maxLength={120} required /></label>
                        <label className="form-field"><span>Student name</span><input name="student_name" value={form.student_name} onChange={updateField} placeholder="Enter student name" maxLength={120} required /></label>
                        <label className="form-field"><span>Module code</span><input name="module_id" value={form.module_id} onChange={updateField} placeholder="e.g. CS101" maxLength={120} required /></label>
                        <label className="form-field"><span>Module name</span><input name="module_name" value={form.module_name} onChange={updateField} placeholder="Enter module name" maxLength={120} required /></label>
                    </div>
                </section>

                <section className="form-section">
                    <div className="form-section-heading">
                        <span className="form-section-icon metrics-icon"><Save size={18} /></span>
                        <div><h2>Learning results</h2><p>Enter the student’s values for this module.</p></div>
                    </div>
                    <div className="form-grid metrics-form-grid">
                        {fields.map((field) => (
                            <label className="form-field" key={field.key}>
                                <span>{field.label}</span>
                                <span className="input-wrap">
                                    <input
                                        type="number"
                                        name={field.key}
                                        value={form[field.key]}
                                        onChange={updateField}
                                        min={field.min}
                                        max={field.max}
                                        step={field.step}
                                        placeholder="Enter value"
                                        required
                                    />
                                    {field.suffix && <span className="input-suffix">{field.suffix}</span>}
                                </span>
                                <small>{field.hint}</small>
                            </label>
                        ))}
                    </div>
                </section>

                <footer className="form-footer" style={{ width: '100%', justifyContent: 'flex-end' }}>
                    <button className="submit-risk-button" style={{ marginLeft: 'auto' }} type="submit" disabled={saving}>
                        {saving ? 'Assessing...' : 'Assess module'} <ArrowRight size={17} />
                    </button>
                </footer>
            </form>

            <style>{`
                .risk-input-page{max-width:1120px;margin:0 auto;padding:10px 0 36px;color:#23353a}.input-heading{margin-bottom:25px}.input-eyebrow{font-size:10px;letter-spacing:1.5px;font-weight:800;color:#25866e}.input-heading h1{margin:8px 0 5px;font-size:29px;letter-spacing:-.5px;color:#1e3038}.input-heading p{margin:0;color:#71808a;font-size:14px}.risk-input-form{display:grid;gap:17px}.form-section{padding:23px 25px;background:linear-gradient(180deg,#fff,#fcfdfd);border:1px solid #e8eeee;border-radius:17px;box-shadow:0 6px 20px rgba(33,50,56,.035)}.form-section-heading{display:flex;align-items:center;gap:12px;margin-bottom:20px}.form-section-icon{display:grid;place-items:center;width:38px;height:38px;border-radius:12px;background:#edf7f2;color:#2d8b69}.metrics-icon{background:#eff4ff;color:#5c79b8}.form-section-heading h2{margin:0 0 4px;font-size:16px;color:#293b40}.form-section-heading p{margin:0;font-size:12px;color:#849197}.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.form-field{display:grid;gap:7px;min-width:0}.form-field>span:first-child{font-size:12px;font-weight:650;color:#506168}.form-field input{width:100%;height:44px;box-sizing:border-box;padding:0 13px;border:1px solid #dfe8e7;border-radius:10px;background:#fff;color:#273a40;font:inherit;font-size:13px;outline:none;transition:border-color .15s,box-shadow .15s}.form-field input:focus{border-color:#66ae8d;box-shadow:0 0 0 3px rgba(73,157,119,.12)}.form-field input::placeholder{color:#a3afb2}.form-field small{font-size:10px;color:#9aa5a8;margin-top:-3px}.input-wrap{position:relative;display:block}.input-wrap input{padding-right:52px}.input-suffix{position:absolute;right:13px;top:50%;transform:translateY(-50%);font-size:11px;color:#839195;pointer-events:none}.form-footer{display:flex;justify-content:space-between;align-items:center;gap:18px;padding:5px 2px}.form-footer p{margin:0;color:#829096;font-size:12px}.submit-risk-button{display:inline-flex;align-items:center;justify-content:center;gap:9px;min-width:160px;padding:12px 17px;border:0;border-radius:11px;background:#238568;color:#fff;font-size:13px;font-weight:700;box-shadow:0 5px 14px rgba(35,133,104,.2);cursor:pointer;transition:background .15s,transform .15s}.submit-risk-button:hover:not(:disabled){background:#176f56;transform:translateY(-1px)}.submit-risk-button:disabled{opacity:.65;cursor:wait}.submit-risk-button:disabled{opacity:.65;cursor:wait}.input-error{display:flex;align-items:center;gap:9px;margin-bottom:17px;padding:13px 15px;border:1px solid #f2d6d1;border-radius:11px;background:#fff5f3;color:#a34336;font-size:13px}.input-success{margin-bottom:17px;padding:13px 15px;border:1px solid #d8eee2;border-radius:11px;background:#f2fbf5;color:#26724f;font-size:13px}@media(max-width:650px){.input-heading h1{font-size:25px}.form-section{padding:18px 16px}.form-grid{grid-template-columns:1fr;gap:13px}.form-footer{align-items:stretch;flex-direction:column}.submit-risk-button{width:100%}}
            `}</style>
        </div>
    );
};

export default RiskInput;
