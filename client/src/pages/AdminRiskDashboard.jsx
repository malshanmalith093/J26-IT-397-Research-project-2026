import React, { useMemo, useState } from 'react';
import {
    Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
    Tooltip, XAxis, YAxis,
} from 'recharts';
import { BookOpen, RefreshCw, Search, Users, X } from 'lucide-react';

const RISK_COLORS = { High: '#e46d5c', Medium: '#dfa83b', Low: '#3a9b78' };
const LEVELS = ['High', 'Medium', 'Low'];
const METRICS = [
    { key: 'attendance', label: 'Attendance', suffix: '%' },
    { key: 'assignment_score', label: 'Assignment score', suffix: '%' },
    { key: 'quiz_score', label: 'Quiz score', suffix: '%' },
    { key: 'engagement_score', label: 'Engagement score', suffix: '%' },
    { key: 'learning_progress', label: 'Learning progress', suffix: '%' },
    { key: 'study_hours', label: 'Study hours', suffix: ' hrs' },
    { key: 'late_assignments', label: 'Late assignments', suffix: '' },
    { key: 'completed_assignments', label: 'Completed assignments', suffix: '' },
];

const AdminRiskDashboard = ({ assessments, loading, error, onRefresh }) => {
    const [query, setQuery] = useState('');
    const [riskFilter, setRiskFilter] = useState('All');
    const [selected, setSelected] = useState(null);

    const riskCounts = useMemo(() => LEVELS.reduce((counts, level) => {
        counts[level] = assessments.filter((item) => item.risk_level === level).length;
        return counts;
    }, {}), [assessments]);

    const filtered = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        return assessments
            .filter((item) => riskFilter === 'All' || item.risk_level === riskFilter)
            .filter((item) => !normalized || [
                item.student_name, item.student_id, item.module_id, item.module_name,
            ].some((value) => String(value || '').toLowerCase().includes(normalized)))
            .sort((a, b) => LEVELS.indexOf(a.risk_level) - LEVELS.indexOf(b.risk_level)
                || String(a.student_name).localeCompare(String(b.student_name)));
    }, [assessments, query, riskFilter]);

    const distribution = LEVELS.map((level) => ({ name: `${level} risk`, level, value: riskCounts[level] }));

    return (
        <div className="admin-risk-page">
            <header className="admin-risk-heading">
                <div>
                    <span className="admin-risk-eyebrow">ADMIN · STUDENT SUPPORT</span>
                    <h1>Academic risk dashboard</h1>
                    <p>Review and explore risk predictions across all manually assessed students.</p>
                </div>
                <button className="admin-refresh" onClick={onRefresh} disabled={loading}>
                    <RefreshCw size={16} className={loading ? 'admin-spin' : ''} /> Refresh
                </button>
            </header>

            {error && <div className="admin-risk-error"><strong>Assessment unavailable</strong><span>{error}</span></div>}

            <section className="admin-risk-summary" aria-label="Risk totals">
                {LEVELS.map((level) => (
                    <article className={`admin-summary-card ${level.toLowerCase()}`} key={level}>
                        <span className="admin-summary-icon"><BookOpen size={18} /></span>
                        <div><span>{level} risk students/modules</span><strong>{riskCounts[level]}</strong></div>
                    </article>
                ))}
                <article className="admin-summary-card total">
                    <span className="admin-summary-icon"><Users size={18} /></span>
                    <div><span>Total assessed modules</span><strong>{assessments.length}</strong></div>
                </article>
            </section>

            <section className="admin-risk-chart-card">
                <div className="admin-card-heading">
                    <div><h2>Risk level distribution</h2><p>Number of assessed modules by predicted risk level</p></div>
                </div>
                <div className="distribution-chart">
                    {assessments.length ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={distribution} dataKey="value" nameKey="name" innerRadius={62} outerRadius={96} paddingAngle={4}>
                                    {distribution.map((entry) => <Cell key={entry.level} fill={RISK_COLORS[entry.level]} />)}
                                </Pie>
                                <Tooltip formatter={(value, _name, item) => [value, item.payload.name]} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : <div className="admin-chart-empty">No assessments to chart yet.</div>}
                    <div className="distribution-legend">
                        {LEVELS.map((level) => (
                            <span key={level}><i style={{ background: RISK_COLORS[level] }} />{level}<strong>{riskCounts[level]}</strong></span>
                        ))}
                    </div>
                </div>
            </section>

            <section className="admin-risk-table-card">
                <div className="admin-table-heading">
                    <div><h2>All student assessments</h2><p>Click a row to inspect student indicators and risk probabilities.</p></div>
                    <span className="admin-result-count">{filtered.length} of {assessments.length}</span>
                </div>
                <div className="admin-filters">
                    <label className="admin-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search student or module" /></label>
                    <label className="admin-risk-filter"><span>Risk level</span><select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)}>
                        <option value="All">All levels</option>
                        {LEVELS.map((level) => <option key={level} value={level}>{level} risk</option>)}
                    </select></label>
                </div>
                <div className="admin-table-scroll">
                    <table className="admin-risk-table">
                        <thead><tr><th>Student</th><th>Module</th><th>Risk level</th></tr></thead>
                        <tbody>
                            {filtered.map((item, index) => (
                                <tr key={`${item.user_id}-${item.student_id}-${item.module_id}-${index}`} onClick={() => setSelected(item)} tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelected(item); }}>
                                    <td><strong>{item.student_name}</strong><small>{item.student_id}</small></td>
                                    <td><strong>{item.module_name}</strong><small>{item.module_id}</small></td>
                                    <td><span className={`admin-risk-pill ${String(item.risk_level).toLowerCase()}`}><i />{item.risk_level}</span></td>
                                </tr>
                            ))}
                            {!loading && filtered.length === 0 && <tr><td className="admin-no-results" colSpan="3">{assessments.length ? 'No assessments match your search and filter.' : 'No student assessments have been submitted yet.'}</td></tr>}
                        </tbody>
                    </table>
                </div>
            </section>

            {selected && <StudentRiskModal assessment={selected} onClose={() => setSelected(null)} />}

            <style>{`
                .admin-risk-page{max-width:1450px;margin:0 auto;padding:10px 0 36px;color:#24353b}.admin-risk-heading{display:flex;justify-content:space-between;align-items:center;gap:18px;margin-bottom:24px}.admin-risk-eyebrow{font-size:10px;font-weight:800;letter-spacing:1.4px;color:#21856e}.admin-risk-heading h1{margin:7px 0 5px;font-size:28px;letter-spacing:-.5px}.admin-risk-heading p,.admin-card-heading p,.admin-table-heading p{margin:0;color:#788990;font-size:13px}.admin-refresh{display:flex;align-items:center;gap:8px;padding:10px 14px;border:1px solid #dfe8e6;border-radius:10px;background:white;color:#315b54;font-weight:650;cursor:pointer}.admin-refresh:disabled{opacity:.6}.admin-spin{animation:admin-spin 1s linear infinite}@keyframes admin-spin{to{transform:rotate(360deg)}}.admin-risk-error{display:grid;gap:5px;margin-bottom:18px;padding:14px;border:1px solid #f2d6d1;border-radius:11px;background:#fff5f3;color:#9d4439;font-size:13px}.admin-risk-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:16px}.admin-summary-card{display:flex;align-items:center;gap:13px;min-height:88px;padding:17px;border:1px solid #e9eeee;border-radius:15px;background:#fff;box-shadow:0 5px 18px rgba(33,50,56,.035)}.admin-summary-icon{display:grid;place-items:center;width:40px;height:40px;border-radius:12px;background:#f1f5f4;color:#53756b}.admin-summary-card.high .admin-summary-icon{background:#fff0ed;color:#d65d4e}.admin-summary-card.medium .admin-summary-icon{background:#fff6e3;color:#b27b16}.admin-summary-card.low .admin-summary-icon{background:#eaf7f0;color:#328967}.admin-summary-card>div{display:grid;gap:5px}.admin-summary-card>div span{color:#788990;font-size:11px}.admin-summary-card strong{font-size:23px;line-height:1;color:#24353b}.admin-risk-chart-card,.admin-risk-table-card{margin-bottom:16px;padding:20px 22px;border:1px solid #e9eeee;border-radius:16px;background:#fff;box-shadow:0 5px 20px rgba(33,50,56,.035)}.admin-card-heading h2,.admin-table-heading h2{margin:0 0 4px;font-size:16px;color:#293b40}.distribution-chart{display:flex;align-items:center;justify-content:center;gap:55px;height:215px}.distribution-chart>div:first-child{width:min(330px,55%);height:100%}.distribution-legend{display:grid;gap:12px;min-width:155px}.distribution-legend span{display:flex;align-items:center;gap:9px;color:#65767c;font-size:12px}.distribution-legend i,.admin-risk-pill i{width:8px;height:8px;flex:none;border-radius:50%}.distribution-legend strong{margin-left:auto;color:#25383e}.admin-chart-empty{display:grid;place-items:center;color:#869398;font-size:13px}.admin-table-heading{display:flex;justify-content:space-between;align-items:center;gap:14px;margin-bottom:16px}.admin-result-count{padding:6px 10px;border-radius:999px;background:#f1f6f4;color:#57766d;font-size:11px;font-weight:700}.admin-filters{display:flex;gap:12px;margin-bottom:13px}.admin-search{display:flex;align-items:center;gap:9px;flex:1;padding:0 12px;border:1px solid #e2e9e8;border-radius:10px;color:#87969a;background:#fbfcfc}.admin-search input{width:100%;height:40px;border:0;outline:0;background:transparent;color:#263a40;font:inherit;font-size:13px}.admin-risk-filter{display:flex;align-items:center;gap:8px;padding:0 11px;border:1px solid #e2e9e8;border-radius:10px;color:#788990;font-size:12px}.admin-risk-filter select{height:40px;border:0;outline:0;background:transparent;color:#263a40;font:inherit;font-size:12px}.admin-table-scroll{overflow:auto}.admin-risk-table{width:100%;border-collapse:collapse;text-align:left}.admin-risk-table th{padding:11px 13px;background:#f7f9f9;color:#71838a;font-size:10px;font-weight:750;letter-spacing:.6px;text-transform:uppercase}.admin-risk-table td{padding:13px;border-bottom:1px solid #edf0f1;color:#52656c;font-size:12px}.admin-risk-table tbody tr{cursor:pointer;transition:background .15s}.admin-risk-table tbody tr:hover{background:#f8fbfa}.admin-risk-table td strong,.admin-risk-table td small{display:block}.admin-risk-table td strong{color:#273b41;font-size:12px;font-weight:650}.admin-risk-table td small{margin-top:4px;color:#869499;font-size:10px}.admin-risk-pill{display:inline-flex;align-items:center;gap:7px;padding:6px 9px;border-radius:999px;font-size:10px;font-weight:750}.admin-risk-pill.high{background:#fff0ed;color:#bb4b3d}.admin-risk-pill.medium{background:#fff6e3;color:#9b6c0e}.admin-risk-pill.low{background:#eaf7f0;color:#32815f}.admin-risk-pill.high i{background:#d85c4d}.admin-risk-pill.medium i{background:#d39a29}.admin-risk-pill.low i{background:#328967}.admin-no-results{text-align:center;padding:32px!important;color:#879499!important;cursor:default!important}.admin-modal-overlay{position:fixed;inset:0;z-index:1100;display:grid;place-items:center;padding:20px;background:rgba(20,34,39,.5);backdrop-filter:blur(4px)}.admin-student-modal{width:min(920px,100%);max-height:90vh;overflow:auto;padding:24px;border:1px solid #eef1f1;border-radius:19px;background:#fff;box-shadow:0 25px 80px rgba(18,32,36,.27)}.admin-modal-header{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;padding-bottom:16px;border-bottom:1px solid #edf0f1}.admin-modal-header h2{margin:6px 0 4px;font-size:22px}.admin-modal-header p{margin:0;color:#788990;font-size:12px}.admin-modal-kicker{color:#788990;font-size:11px;font-weight:700}.admin-modal-close{display:grid;place-items:center;width:35px;height:35px;border:0;border-radius:10px;background:#f1f5f4;color:#65767b;cursor:pointer}.admin-modal-charts{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding-top:17px}.admin-modal-chart{min-width:0;padding:15px;border:1px solid #edf0f1;border-radius:13px;background:#fff}.admin-modal-chart h3{margin:0 0 3px;font-size:13px}.admin-modal-chart p{margin:0;color:#859398;font-size:11px}.admin-chart-area{height:270px;margin-top:8px}.admin-level-chart{height:250px;margin-top:10px}.admin-risk-factor-note{padding-top:10px;color:#788990;font-size:11px}.admin-modal-risk{display:inline-flex;align-items:center;margin-top:10px;padding:6px 9px;border-radius:999px;font-size:10px;font-weight:750}.admin-modal-risk.high{background:#fff0ed;color:#bb4b3d}.admin-modal-risk.medium{background:#fff6e3;color:#9b6c0e}.admin-modal-risk.low{background:#eaf7f0;color:#32815f}@media(max-width:850px){.admin-risk-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.admin-modal-charts{grid-template-columns:1fr}}@media(max-width:620px){.admin-risk-heading{align-items:flex-start}.admin-risk-heading h1{font-size:24px}.admin-risk-summary{gap:8px}.admin-summary-card{padding:12px;gap:9px}.admin-summary-icon{width:34px;height:34px}.admin-summary-card>div span{font-size:10px}.admin-risk-chart-card,.admin-risk-table-card{padding:16px}.distribution-chart{gap:8px;height:190px}.distribution-legend{min-width:115px}.admin-table-heading{align-items:flex-start}.admin-filters{flex-direction:column}.admin-risk-filter{justify-content:space-between}.admin-modal-overlay{padding:10px}.admin-student-modal{padding:17px}.admin-chart-area{height:310px}}
            `}</style>
        </div>
    );
};

const StudentRiskModal = ({ assessment, onClose }) => {
    const indicators = METRICS
        .filter((metric) => assessment[metric.key] !== null && assessment[metric.key] !== undefined)
        .map((metric) => ({
            name: metric.label,
            value: Number(assessment[metric.key]),
            suffix: metric.suffix,
        }));
    const probabilities = LEVELS.map((level) => ({
        name: level,
        probability: Number(assessment.risk_probabilities?.[level] || 0) * 100,
    }));

    return (
        <div className="admin-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
            <section className="admin-student-modal" role="dialog" aria-modal="true" aria-labelledby="admin-student-title">
                <header className="admin-modal-header">
                    <div>
                        <span className="admin-modal-kicker">{assessment.module_id} · {assessment.module_name}</span>
                        <h2 id="admin-student-title">{assessment.student_name}</h2>
                        <p>Student ID: {assessment.student_id}</p>
                        <span className={`admin-modal-risk ${String(assessment.risk_level).toLowerCase()}`}>{assessment.risk_level} Risk · {Math.round(Number(assessment.confidence || 0) * 100)}% confidence</span>
                    </div>
                    <button className="admin-modal-close" onClick={onClose} aria-label="Close student charts"><X size={19} /></button>
                </header>
                <div className="admin-modal-charts">
                    <article className="admin-modal-chart">
                        <h3>Student risk indicators</h3>
                        <p>Submitted performance values for this module</p>
                        <div className="admin-chart-area">
                            {indicators.length ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={indicators} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" tick={{ fontSize: 10 }} />
                                        <YAxis type="category" dataKey="name" width={112} tick={{ fontSize: 10 }} />
                                        <Tooltip formatter={(value, _name, item) => [`${value}${item.payload.suffix}`, item.payload.name]} />
                                        <Bar dataKey="value" fill="#328f73" radius={[0, 5, 5, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : <div className="admin-chart-empty">No indicator values available.</div>}
                        </div>
                    </article>
                    <article className="admin-modal-chart">
                        <h3>Risk level probabilities</h3>
                        <p>Model probability for each predicted risk class</p>
                        <div className="admin-level-chart">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={probabilities} margin={{ top: 12, right: 14, bottom: 5, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                    <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 10 }} />
                                    <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Probability']} />
                                    <Bar dataKey="probability" radius={[5, 5, 0, 0]}>
                                        {probabilities.map((entry) => <Cell key={entry.name} fill={RISK_COLORS[entry.name]} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </article>
                </div>
                <p className="admin-risk-factor-note">Risk factors identified: {assessment.risk_factors?.length ? assessment.risk_factors.map((factor) => factor.label).join(', ') : 'No single weak indicator was identified.'}</p>
            </section>
        </div>
    );
};

export default AdminRiskDashboard;
