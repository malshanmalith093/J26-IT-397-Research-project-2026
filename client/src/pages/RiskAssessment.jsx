import React, { lazy, Suspense, useEffect, useState } from 'react';
import axios from 'axios';
import { ArrowUpRight, BookOpen, RefreshCw, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const AdminRiskDashboard = lazy(() => import('./AdminRiskDashboard'));

const API_URL = import.meta.env.VITE_PYTHON_BACKEND || 'http://localhost:3000';

const metricRows = [
    { key: 'quiz_score', label: 'Quiz Score', suffix: '%' },
    { key: 'assignment_score', label: 'Assignment Score', suffix: '%' },
    { key: 'study_hours', label: 'Study Hours', suffix: ' hrs' },
    { key: 'engagement_score', label: 'Engagement Score', suffix: '%' },
    { key: 'late_assignments', label: 'Late Assignments' },
    { key: 'completed_assignments', label: 'Completed Assignments' },
    { key: 'learning_progress', label: 'Learning Progress', suffix: '%' },
];
const metricByKey = Object.fromEntries(metricRows.map((metric) => [metric.key, metric]));

const formatMetric = (value, suffix = '') => {
    if (value === null || value === undefined || value === '') return '—';
    const number = Number(value);
    const formatted = Number.isFinite(number)
        ? number.toLocaleString(undefined, { maximumFractionDigits: 2 })
        : value;
    return `${formatted}${suffix}`;
};

const RiskAssessment = () => {
    const [assessments, setAssessments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedAssessment, setSelectedAssessment] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);

    const loadAssessments = async () => {
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('Sign in to view your risk assessment.');
            const { data } = await axios.get(`${API_URL}/api/risk-assessment`, {
                headers: { 'x-auth-token': token },
            });
            const userId = String(data.user_id || '');
            if (!userId) {
                throw new Error('The Python service is outdated. Restart it to enable account-specific risk results.');
            }
            setIsAdmin(Boolean(data.is_admin));
            setAssessments(data.is_admin
                ? (data.assessments || [])
                : (data.assessments || []).filter((item) => String(item.user_id) === userId));
        } catch (err) {
            const apiError = err.response?.data?.error || err.response?.data?.message || '';
            if (apiError.toLowerCase().includes('manual_risk_inputs.csv') || apiError.toLowerCase().includes('manual input csv')) {
                setError('The Python service is still running the old CSV-based version. Stop it with Ctrl+C, then restart the updated service from the python folder using .\\.venv\\Scripts\\python.exe app.py.');
            } else {
                setError(apiError || err.message || 'Could not load assessments. Check that the Python service is running on port 3000.');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadAssessments(); }, []);

    useEffect(() => {
        if (!selectedAssessment) return undefined;
        const closeOnEscape = (event) => {
            if (event.key === 'Escape') setSelectedAssessment(null);
        };
        document.addEventListener('keydown', closeOnEscape);
        return () => document.removeEventListener('keydown', closeOnEscape);
    }, [selectedAssessment]);

    if (isAdmin) {
        return (
            <Suspense fallback={<div className="page-message">Loading admin risk dashboard...</div>}>
                <AdminRiskDashboard assessments={assessments} loading={loading} error={error} onRefresh={loadAssessments} />
            </Suspense>
        );
    }

    return (
        <div className="risk-page">
            <div className="risk-heading">
                <div>
                    <span className="eyebrow">STUDENT SUPPORT</span>
                    <p>Review at-risk modules for your enrolled subjects.</p>
                </div>
                <button className="refresh-button" onClick={loadAssessments} disabled={loading}>
                    <RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh
                </button>
            </div>

            {error ? (
                <div className="notice error-notice">
                    <strong>Assessment unavailable</strong>
                    <span>{error}</span>
                    <small>Check that the training dataset is available in python/data and the Python service is running.</small>
                </div>
            ) : loading ? (
                <div className="page-message">Loading risk assessments...</div>
            ) : assessments.length === 0 ? (
                <div className="page-message">No at-risk modules to show yet. <Link to="/RiskInput" style={{ color: '#238568', fontWeight: 700, textDecoration: 'none' }}>Enter a student’s module results</Link> to run an assessment.</div>
            ) : (
                <section className="modules-section">
                    <div className="section-heading">
                        <div>
                            <h2>Modules to review</h2>
                            <p>Select a module to view its risk indicators.</p>
                        </div>
                        <span className="module-count">{assessments.length} module{assessments.length === 1 ? '' : 's'}</span>
                    </div>
                    <div className="module-grid">
                        {assessments.map((item, index) => (
                            <button
                                className={`module-card ${String(item.risk_level).toLowerCase()}`}
                                key={`${item.student_id}-${item.module_id}-${index}`}
                                onClick={() => setSelectedAssessment(item)}
                                aria-label={`View ${item.module_id} ${item.module_name}, ${item.risk_level} risk details`}
                            >
                                <span className="card-topline">
                                    <span className="module-icon"><BookOpen size={18} /></span>
                                    <span className="module-code">{item.module_id}</span>
                                    <ArrowUpRight className="card-open-icon" size={18} />
                                </span>
                                <strong className="module-name">{item.module_name}</strong>
                                <span className="card-bottomline">
                                    <span className={`risk-badge ${String(item.risk_level).toLowerCase()}`}>
                                        <i />{item.risk_level} Risk
                                    </span>
                                </span>
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {selectedAssessment && (
                <div className="modal-overlay" onMouseDown={(event) => {
                    if (event.target === event.currentTarget) setSelectedAssessment(null);
                }}>
                    <section className="risk-modal" role="dialog" aria-modal="true" aria-labelledby="risk-modal-title">
                        <div className="modal-heading">
                            <div>
                                <span className="modal-module-line"><span className="modal-book-icon"><BookOpen size={16} /></span><span>{selectedAssessment.module_id}</span><span className="module-divider">/</span><span>{selectedAssessment.module_name}</span></span>
                                <h2 id="risk-modal-title">Student Risk</h2>
                                <p className="modal-student">{selectedAssessment.student_name} <span>·</span> {selectedAssessment.student_id}</p>
                            </div>
                            <div className="modal-actions">
                                <span className={`risk-badge ${String(selectedAssessment.risk_level).toLowerCase()}`}><i />{selectedAssessment.risk_level} Risk</span>
                                <button className="close-button" onClick={() => setSelectedAssessment(null)} aria-label="Close risk details">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        {selectedAssessment.risk_factors?.length ? (
                            <>
                                <div className="factor-section-heading">
                                    <div><h3>Areas to focus on</h3><p>Indicators below the healthy range</p></div>
                                    <span>{selectedAssessment.risk_factors.filter((factor) => metricByKey[factor.key]).length} areas</span>
                                </div>
                                <div className="metric-grid">
                                    {selectedAssessment.risk_factors.map((factor) => {
                                    const metric = metricByKey[factor.key];
                                    if (!metric) return null;
                                    return (
                                        <div className="metric-card" key={factor.key}>
                                            <span>{factor.label || metric.label}</span>
                                            <strong>{formatMetric(factor.value, metric.suffix)}</strong>
                                        </div>
                                    );
                                    })}
                                </div>
                            </>
                        ) : (
                            <p className="no-risk-factors">The model identified risk from a combination of indicators; no individual weak area stood out against the training data.</p>
                        )}
                    </section>
                </div>
            )}

            <style>{`
                .risk-page{max-width:1400px;margin:0 auto;padding:10px 0 34px;color:#202b36}.risk-heading{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:30px}.eyebrow{display:inline-block;font-size:10px;letter-spacing:1.5px;font-weight:800;color:#25866e}.risk-heading h1{font-size:30px;letter-spacing:-.6px;margin:8px 0 5px;color:#1e3038}.risk-heading>div{display:flex;flex-direction:column;align-items:flex-start;gap:2px}.risk-heading p{margin:0;color:#71808a;font-size:16px;line-height:1.25}.refresh-button{display:flex;align-items:center;gap:8px;border:1px solid #dce5e3;background:#fff;border-radius:11px;padding:10px 15px;color:#2d5550;font-weight:650;cursor:pointer;box-shadow:0 3px 10px rgba(33,50,56,.035);transition:background .15s,border-color .15s}.refresh-button:hover:not(:disabled){background:#f7fbf9;border-color:#b8d5c9}.refresh-button:disabled{opacity:.65}.modules-section{background:linear-gradient(180deg,#fff 0%,#fcfdfd 100%);border:1px solid #e9eeee;border-radius:20px;padding:25px;box-shadow:0 8px 30px rgba(33,50,56,.045)}.section-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:21px}.section-heading h2{font-size:18px;letter-spacing:-.2px;margin:0 0 5px;color:#293b40}.section-heading p{font-size:13px;color:#829096;margin:0}.module-count{flex:none;padding:7px 11px;border-radius:999px;background:#f1f6f4;color:#52746a;font-size:12px;font-weight:700}.module-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:16px}.module-card{--risk-accent:#d7972b;appearance:none;position:relative;overflow:hidden;text-align:left;display:flex;flex-direction:column;align-items:stretch;gap:17px;min-height:176px;padding:19px 20px 17px;background:#fff;border:1px solid #e8eeee;border-radius:16px;box-shadow:0 4px 14px rgba(33,50,56,.035);cursor:pointer;transition:transform .18s,border-color .18s,box-shadow .18s,background .18s}.module-card:before{content:'';position:absolute;inset:0 auto 0 0;width:4px;background:var(--risk-accent);opacity:.85}.module-card:after{content:'';position:absolute;width:130px;height:130px;right:-62px;top:-72px;border-radius:50%;background:var(--risk-glow);pointer-events:none}.module-card:hover{transform:translateY(-3px);border-color:color-mix(in srgb,var(--risk-accent) 35%,#e8eeee);box-shadow:0 12px 28px rgba(33,50,56,.09)}.module-card:focus-visible,.close-button:focus-visible{outline:3px solid #8ccbb0;outline-offset:3px}.module-card.high{--risk-accent:#dc6555;--risk-glow:rgba(220,101,85,.08)}.module-card.medium{--risk-accent:#d69a2d;--risk-glow:rgba(214,154,45,.09)}.card-topline{position:relative;z-index:1;display:flex;align-items:center;gap:10px}.module-icon{display:grid;place-items:center;width:35px;height:35px;border-radius:11px;background:color-mix(in srgb,var(--risk-accent) 12%,white);color:var(--risk-accent)}.module-code{font-size:11px;letter-spacing:1px;font-weight:800;color:#71828a}.card-open-icon{margin-left:auto;color:#a1adaf;transition:transform .18s,color .18s}.module-card:hover .card-open-icon{transform:translate(2px,-2px);color:var(--risk-accent)}.module-name{position:relative;z-index:1;font-size:17px;line-height:1.35;letter-spacing:-.2px;color:#293a40}.card-bottomline{margin-top:auto;padding-top:13px;border-top:1px solid #f0f2f2}.risk-badge{display:inline-flex;align-items:center;gap:7px;border-radius:20px;padding:7px 10px;font-size:11px;font-weight:750}.risk-badge i{width:6px;height:6px;border-radius:50%;background:currentColor;box-shadow:0 0 0 3px color-mix(in srgb,currentColor 13%,transparent)}.risk-badge.high{color:#bc493b;background:#fff0ed}.risk-badge.medium{color:#9b6c0e;background:#fff6e3}.page-message{padding:54px 22px;text-align:center;color:#71808a;font-size:14px;background:#fff;border:1px solid #e9eeee;border-radius:17px;box-shadow:0 6px 22px rgba(33,50,56,.035)}.notice{margin:20px 0;padding:18px;border-radius:12px;display:grid;gap:7px;font-size:13px}.notice.error-notice{background:#fff5f3;color:#9d4439;border:1px solid #f7dfdb}.notice small{color:#7c6662}.data-note{padding:16px 2px 0;color:#8b989d;font-size:11px}.modal-overlay{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:22px;background:rgba(20,34,39,.48);backdrop-filter:blur(4px)}.risk-modal{width:min(660px,100%);max-height:min(88vh,760px);overflow:auto;background:#fff;border:1px solid rgba(255,255,255,.65);border-radius:22px;padding:29px;box-shadow:0 26px 90px rgba(18,32,36,.28)}.modal-heading{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;padding-bottom:20px;border-bottom:1px solid #edf0f1}.modal-module-line{display:flex;align-items:center;gap:8px;color:#667b82;font-size:12px;font-weight:700}.modal-book-icon{display:grid;place-items:center;width:30px;height:30px;border-radius:9px;background:#eff7f3;color:#328767}.module-divider{color:#c0c9cb}.modal-heading h2{font-size:25px;letter-spacing:-.55px;margin:11px 0 5px;color:#213238}.modal-student{margin:0;color:#71808a;font-size:13px}.modal-student span{padding:0 3px;color:#adb7ba}.modal-actions{display:flex;align-items:center;gap:13px}.modal-actions .risk-badge{padding:8px 11px;font-size:12px}.close-button{display:grid;place-items:center;width:38px;height:38px;border:0;border-radius:11px;background:#f3f6f6;color:#627178;cursor:pointer;transition:background .15s,transform .15s}.close-button:hover{background:#eaf0ef;transform:rotate(4deg)}.factor-section-heading{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:20px 1px 13px}.factor-section-heading h3{font-size:14px;margin:0 0 4px;color:#34464b}.factor-section-heading p{font-size:12px;color:#89969a;margin:0}.factor-section-heading>span{flex:none;padding:6px 9px;border-radius:999px;background:#f4f7f6;color:#71817d;font-size:11px;font-weight:700}.metric-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}.metric-card{position:relative;overflow:hidden;display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:62px;padding:14px 16px 14px 19px;border:1px solid #e7eeee;border-radius:13px;background:linear-gradient(135deg,#fbfdfc 0%,#f7faf9 100%);transition:border-color .16s,transform .16s,box-shadow .16s}.metric-card:before{content:'';position:absolute;inset:0 auto 0 0;width:3px;background:#d79a31}.metric-card:hover{transform:translateY(-1px);border-color:#d5e4dd;box-shadow:0 5px 14px rgba(33,50,56,.05)}.metric-card span{font-size:12px;color:#708087;font-weight:550}.metric-card strong{font-size:15px;color:#24383e;white-space:nowrap;font-weight:750}.no-risk-factors{margin:19px 0 0;padding:15px;border:1px solid #edf0f1;border-radius:11px;background:#fafbfb;color:#71808a;font-size:13px;line-height:1.5}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
                @media(max-width:620px){.risk-page{padding-top:4px}.risk-heading{align-items:flex-start}.risk-heading h1{font-size:25px}.modules-section{padding:17px;border-radius:16px}.module-grid{grid-template-columns:1fr;gap:12px}.module-card{min-height:158px}.risk-modal{padding:20px;border-radius:17px}.modal-actions{gap:7px;flex-direction:column-reverse;align-items:flex-end}.modal-module-line{flex-wrap:wrap}.metric-grid{grid-template-columns:1fr}.metric-card{padding:12px}}
                @media(max-width:620px){.risk-page{padding-top:4px}.risk-heading{align-items:flex-start}.risk-heading h1{font-size:25px}.modules-section{padding:17px;border-radius:16px}.module-grid{grid-template-columns:1fr;gap:12px}.module-card{min-height:158px}.risk-modal{padding:20px;border-radius:17px}.metric-grid{grid-template-columns:1fr}.metric-card{padding:12px}}
            `}</style>
        </div>
    );
};

export default RiskAssessment;
