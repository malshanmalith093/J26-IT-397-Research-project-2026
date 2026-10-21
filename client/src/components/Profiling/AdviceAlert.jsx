/**
 * Dashboard alert card for the Component 2 advice engine.
 *
 * The C2 proposal requires "personalised warning alerts + clear dashboard
 * information" (abstract, FR-09). This card is that dashboard surface:
 * a small snapshot of the student's latest advice per course with an
 * unread counter, linking to the full advice panel on the Behavioral
 * Profile page (/Profiling).
 *
 * It fails silently: if the Python service is down or the user has no
 * advice yet (e.g. staff accounts), the Dashboard simply shows nothing.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ArrowRight } from 'lucide-react';
import { getMyAdvice } from './adviceApi';

const RISK_LABELS = { low: 'Low risk', medium: 'Medium risk', high: 'High risk' };

const AdviceAlert = () => {
    const [data, setData] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        let alive = true;
        getMyAdvice()
            .then((d) => alive && setData(d))
            .catch(() => {}); // silent – the dashboard must keep working without C2
        return () => {
            alive = false;
        };
    }, []);

    if (!data || !data.latest?.length) return null;

    const unread = data.unread || 0;

    return (
        <div className="advice-alert-card" data-testid="advice-alert">
            <div className="aa-head">
                <span className={`aa-bell ${unread ? 'aa-bell-new' : ''}`}>
                    <Bell size={18} />
                    {unread > 0 && <span className="aa-count" data-testid="advice-unread">{unread}</span>}
                </span>
                <div className="aa-title">
                    <h3>Learning advices</h3>
                    <p>
                        {unread > 0
                            ? `You have ${unread} new advice ${unread === 1 ? 'update' : 'updates'} waiting for you.`
                            : 'Snapshot of your latest personalised advice.'}
                    </p>
                </div>
                <span className="aa-chip">Snapshot</span>
            </div>

            <div className="aa-courses">
                {data.latest.map((d) => {
                    const risk = (d.input?.academic_risk_level || d.risk_level || '').toLowerCase();
                    return (
                        <button
                            key={d.id}
                            className="aa-course"
                            data-testid="advice-alert-course"
                            onClick={() => navigate('/Profiling')}
                            title="Open my advices"
                        >
                            <div className="aa-course-top">
                                <strong>{d.course_code}</strong>
                                {risk && <span className={`aa-risk aa-risk-${risk}`}>{RISK_LABELS[risk] || risk}</span>}
                            </div>
                            <span className="aa-headline">
                                {d.advice?.status_summary?.headline || d.course?.name || ''}
                            </span>
                        </button>
                    );
                })}
            </div>

            <button className="aa-open" onClick={() => navigate('/Profiling')} data-testid="advice-alert-open">
                View my advices <ArrowRight size={14} />
            </button>

            <style jsx>{`
                .advice-alert-card {
                    background: white;
                    border-radius: 20px;
                    padding: 22px 24px;
                    margin-top: 20px;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.03);
                    text-align: left;
                }
                .aa-head {
                    display: flex;
                    align-items: flex-start;
                    gap: 14px;
                }
                .aa-bell {
                    position: relative;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 38px;
                    height: 38px;
                    border-radius: 12px;
                    background: #eef2ff;
                    color: var(--primary, #4f46e5);
                    flex-shrink: 0;
                }
                .aa-bell-new {
                    background: #fff1f2;
                    color: #e11d48;
                }
                .aa-count {
                    position: absolute;
                    top: -6px;
                    right: -6px;
                    background: #e11d48;
                    color: white;
                    font-size: 0.65rem;
                    font-weight: 700;
                    min-width: 17px;
                    height: 17px;
                    border-radius: 9px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0 4px;
                }
                .aa-title { flex: 1; }
                .aa-title h3 {
                    margin: 0 0 2px;
                    font-size: 1rem;
                    color: var(--text, #1f2937);
                }
                .aa-title p {
                    margin: 0;
                    font-size: 0.85rem;
                    color: var(--text-muted, #6b7280);
                }
                .aa-chip {
                    font-size: 0.65rem;
                    font-weight: 700;
                    letter-spacing: 0.06em;
                    text-transform: uppercase;
                    color: #0e7490;
                    background: #ecfeff;
                    border: 1px solid #a5f3fc;
                    border-radius: 999px;
                    padding: 3px 9px;
                    flex-shrink: 0;
                }
                .aa-courses {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                    margin-top: 16px;
                }
                .aa-course {
                    flex: 1 1 200px;
                    max-width: 290px;
                    text-align: left;
                    background: #f9fafb;
                    border: 1px solid #eef0f3;
                    border-radius: 14px;
                    padding: 12px 14px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    font: inherit;
                }
                .aa-course:hover {
                    border-color: var(--primary, #4f46e5);
                    transform: translateY(-1px);
                }
                .aa-course-top {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                    margin-bottom: 4px;
                }
                .aa-course-top strong { font-size: 0.85rem; }
                .aa-risk {
                    font-size: 0.68rem;
                    font-weight: 700;
                    border-radius: 999px;
                    padding: 2px 8px;
                }
                .aa-risk-low { background: #ecfdf5; color: #047857; }
                .aa-risk-medium { background: #fffbeb; color: #b45309; }
                .aa-risk-high { background: #fff1f2; color: #be123c; }
                .aa-headline {
                    display: block;
                    font-size: 0.78rem;
                    color: var(--text-muted, #6b7280);
                    overflow: hidden;
                    text-overflow: ellipsis;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                }
                .aa-open {
                    margin-top: 14px;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    background: var(--primary, #4f46e5);
                    color: white;
                    border: none;
                    border-radius: 10px;
                    padding: 9px 16px;
                    font-size: 0.85rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: opacity 0.2s ease;
                }
                .aa-open:hover { opacity: 0.9; }
                @media (max-width: 768px) {
                    .advice-alert-card { padding: 18px; }
                    .aa-course { max-width: none; }
                }
            `}</style>
        </div>
    );
};

export default AdviceAlert;
