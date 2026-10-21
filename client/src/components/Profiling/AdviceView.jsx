import React from 'react';
import {
    Lightbulb, TrendingUp, TrendingDown, Minus, ThumbsUp, AlertTriangle, CalendarDays,
    BookOpen, Heart, Info, RefreshCw, Target, Clock,
} from 'lucide-react';
import { RiskBadge, StatusChip, PriorityChip, ProviderBadge, CATEGORY_LABEL, formatValue } from './ui';

const BAR_FIELDS = ['attendance', 'assignment_score', 'quiz_score', 'engagement_score', 'learning_progress', 'study_hours'];

const TrendIcon = ({ trend }) => {
    if (trend === 'increasing') return <TrendingUp size={16} className="trend-up" />;
    if (trend === 'decreasing') return <TrendingDown size={16} className="trend-down" />;
    return <Minus size={16} />;
};

const IndicatorBars = ({ input, course, contract, isStaff }) => {
    const targets = { ...(contract?.targets || {}), learning_progress: course?.expected_progress };
    return (
        <div className="adv-bars">
            {BAR_FIELDS.filter((f) => input[f] !== undefined && input[f] !== null).map((f) => {
                const max = f === 'study_hours' ? 20 : 100;
                const value = input[f];
                const target = targets[f];
                const pct = Math.min(100, (value / max) * 100);
                const below = target !== undefined && value < target;
                return (
                    <div key={f} className="adv-bar-row">
                        <span className="adv-bar-label">{contract?.fields?.[f]?.label || f}</span>
                        <div className="adv-bar-track">
                            <div className={`adv-bar-fill ${below ? 'below' : 'ok'}`} style={{ width: `${pct}%` }} />
                            {target !== undefined && (
                                <div
                                    className="adv-bar-target"
                                    style={{ left: `${Math.min(100, (target / max) * 100)}%` }}
                                    title={`Target ${target}`}
                                />
                            )}
                        </div>
                        <span className="adv-bar-value">{formatValue(f, value, contract)}</span>
                    </div>
                );
            })}
            <div className="adv-bar-row counts">
                <span className="adv-bar-label">Assignments</span>
                <span className="adv-count">
                    {input.completed_assignments ?? '—'} / {course?.assignments_released ?? '—'} completed ·{' '}
                    {input.late_assignments ?? '—'} late
                </span>
            </div>
            {isStaff && input.previous_gpa !== undefined && input.previous_gpa !== null && (
                <div className="adv-bar-row counts not-used">
                    <span className="adv-bar-label">Previous GPA</span>
                    <span className="adv-count">{input.previous_gpa} · received from C1, not used for advice</span>
                </div>
            )}
            <p className="adv-legend">
                <span className="adv-legend-target" /> {isStaff ? 'target used by the rules' : 'target'}
            </p>
        </div>
    );
};

/**
 * audience = 'student' (own advice, plain wording) or 'staff' (adds technical details).
 */
const AdviceView = ({ result, contract, onRegenerate, busy, audience = 'staff' }) => {
    if (!result) return null;
    const isStaff = audience === 'staff';

    if (result.ok === false) {
        return (
            <div className="adv-card">
                <h3>{result.student_id || 'Invalid record'}</h3>
                <div className="adv-alert error">
                    <strong>This record could not be processed:</strong>
                    <ul>{result.errors.map((e) => <li key={e}>{e}</li>)}</ul>
                </div>
            </div>
        );
    }

    const { input, advice, meta, course, warnings } = result;
    const s = advice.status_summary;
    const fieldLabel = (f) => contract?.fields?.[f]?.label || f;

    return (
        <div className="adv-view">
            {/* ---------- Status ---------- */}
            <div className={`adv-card adv-status st-${s.overall_status}`}>
                <div className="adv-status-top">
                    <div>
                        <div className="adv-status-id">
                            <strong>{result.student_id}</strong>
                            <span className="adv-course-tag">{course.code} · {course.name}</span>
                            <span className="adv-muted">Week {course.current_week}/{course.total_weeks}</span>
                        </div>
                        <h2 className="adv-headline">{s.headline}</h2>
                    </div>
                    <div className="adv-status-badges">
                        <StatusChip status={s.overall_status} />
                        <RiskBadge level={input.academic_risk_level} />
                    </div>
                </div>
                <p className="adv-explanation">{s.explanation}</p>
                <div className="adv-model-row">
                    <span>{isStaff ? 'Component 1 output:' : 'Your current assessment:'}</span>
                    {input.risk_score != null && <span>risk score <b>{input.risk_score}</b></span>}
                    {input.confidence != null && <span>confidence <b>{Math.round(input.confidence * 100)}%</b></span>}
                    {input.risk_trend && (
                        <span className="adv-trend">
                            trend <TrendIcon trend={input.risk_trend} /> <b>{input.risk_trend}</b>
                        </span>
                    )}
                </div>
            </div>

            <div className="adv-two-col">
                <div className="adv-card">
                    <h4><Target size={16} /> Current indicators</h4>
                    <IndicatorBars input={input} course={course} contract={contract} isStaff={isStaff} />
                </div>
                <div className="adv-card">
                    <h4><ThumbsUp size={16} /> Strengths</h4>
                    {advice.strengths.length ? (
                        <ul className="adv-list good">
                            {advice.strengths.map((x, i) => <li key={i}><b>{x.area}:</b> {x.evidence}</li>)}
                        </ul>
                    ) : <p className="adv-muted">No clear strengths yet – that can change quickly.</p>}
                    <h4 className="mt"><AlertTriangle size={16} /> Areas to improve</h4>
                    {advice.concerns.length ? (
                        <ul className="adv-list warn">
                            {advice.concerns.map((x, i) => (
                                <li key={i} className={`sev-${x.severity}`}><b>{x.area}:</b> {x.evidence}</li>
                            ))}
                        </ul>
                    ) : <p className="adv-muted">No concerns detected.</p>}
                </div>
            </div>

            {/* ---------- Recommendations ---------- */}
            <div className="adv-section-head">
                <h3><Lightbulb size={18} /> Personalised recommendations</h3>
                <span className="adv-muted">Each recommendation shows the main reason behind it.</span>
            </div>
            <div className="adv-recs">
                {advice.recommendations.map((r, i) => (
                    <div key={i} className={`adv-rec prio-border-${r.priority}`}>
                        <div className="adv-rec-head">
                            <span className="adv-rec-num">{i + 1}</span>
                            <div className="adv-rec-title">
                                <h4>{r.title}</h4>
                                <div className="adv-rec-tags">
                                    <PriorityChip priority={r.priority} />
                                    <span className="adv-badge cat">{CATEGORY_LABEL[r.category] || r.category}</span>
                                    <span className="adv-badge time"><Clock size={12} /> {r.timeframe}</span>
                                </div>
                            </div>
                        </div>
                        <p className="adv-rec-action">{r.action}</p>
                        <div className="adv-reason">
                            <span className="adv-reason-label"><Info size={14} /> Why this is recommended</span>
                            <p>{r.main_reason}</p>
                            {r.evidence_fields?.length > 0 && (
                                <div className="adv-evidence">
                                    {r.evidence_fields.map((f) => (
                                        <span key={f} className="adv-evidence-chip">
                                            {fieldLabel(f)}: {formatValue(f, input[f], contract)}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                        <p className="adv-impact"><b>Expected impact:</b> {r.expected_impact}</p>
                    </div>
                ))}
            </div>

            {/* ---------- Improvement guide ---------- */}
            <div className="adv-section-head">
                <h3><CalendarDays size={18} /> Improvement guide – next 3 weeks</h3>
            </div>
            <div className="adv-weeks">
                {advice.improvement_guide.weekly_plan.map((w) => (
                    <div key={w.week} className="adv-card adv-week">
                        <span className="adv-week-num">Week {w.week}</span>
                        <h4>{w.focus}</h4>
                        <ul>{w.tasks.map((t, i) => <li key={i}>{t}</li>)}</ul>
                    </div>
                ))}
            </div>

            {advice.improvement_guide.course_focus_topics.length > 0 && (
                <div className="adv-card">
                    <h4><BookOpen size={16} /> Course topics to focus on – {course.code} {course.name}</h4>
                    <div className="adv-topics">
                        {advice.improvement_guide.course_focus_topics.map((t, i) => (
                            <div key={i} className="adv-topic">
                                <strong>{t.topic}</strong>
                                <p><b>Why:</b> {t.why}</p>
                                <p><b>How:</b> {t.how}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="adv-two-col">
                <div className="adv-card">
                    <h4><Heart size={16} /> Other helpful advice</h4>
                    <ul className="adv-list">{advice.other_advice.map((x, i) => <li key={i}>{x}</li>)}</ul>
                </div>
                <div className="adv-card adv-motivation">
                    <p>“{advice.motivation_message}”</p>
                </div>
            </div>

            {/* ---------- Transparency footer ---------- */}
            {!isStaff && (
                <div className="adv-meta">
                    <div className="adv-meta-row">
                        <span>
                            Sent {new Date(result.created_at || meta.generated_at).toLocaleString()}
                            {meta.provider !== 'rule_based_fallback' ? ' · AI-generated advice' : ''}
                        </span>
                    </div>
                    <div className="adv-meta-row">
                        <span><b>Based on your:</b> {meta.fields_used.filter((f) => f !== 'student_id').map(fieldLabel).join(', ')}</span>
                    </div>
                    <div className="adv-meta-row">
                        The risk level is a prediction from your recent activity, not a final result – it changes as you improve.
                    </div>
                </div>
            )}
            {isStaff && (
            <div className="adv-meta">
                <div className="adv-meta-row">
                    <ProviderBadge meta={meta} />
                    {meta.latency_ms != null && !meta.cached && <span>{(meta.latency_ms / 1000).toFixed(1)} s</span>}
                    {meta.tokens != null && <span>{meta.tokens} tokens</span>}
                    <span>input: {meta.input_shape === 'appendix4' ? 'Appendix 4 payload' : 'flat C1 record'}</span>
                    <span>{meta.prompt_version}</span>
                    <span>{new Date(result.created_at || meta.generated_at).toLocaleString()}</span>
                    {result.sent_by?.name && <span>sent by {result.sent_by.name}</span>}
                    {result.read_at ? <span>read by student {new Date(result.read_at).toLocaleString()}</span> : result.id ? <span>not read yet</span> : null}
                    {onRegenerate && (
                        <button className="adv-btn small ghost" onClick={onRegenerate} disabled={busy}>
                            <RefreshCw size={14} /> Re-send
                        </button>
                    )}
                </div>
                <div className="adv-meta-row">
                    <span>
                        <b>Fields used:</b> {meta.fields_used.map(fieldLabel).join(', ')}
                    </span>
                    {meta.fields_not_used.length > 0 && (
                        <span><b>Not used:</b> {meta.fields_not_used.map(fieldLabel).join(', ')}</span>
                    )}
                </div>
                {meta.fallback_reason && (
                    <div className="adv-meta-row warn">Fallback reason: {meta.fallback_reason}</div>
                )}
                {warnings?.length > 0 && <div className="adv-meta-row warn">{warnings.join(' ')}</div>}
            </div>
            )}
        </div>
    );
};

export default AdviceView;
