import React, { useEffect, useState } from 'react';
import { Loader2, Sparkles, History, Bell } from 'lucide-react';
import AdviceView from './AdviceView';
import { StatusChip, RiskBadge } from './ui';
import { getMyAdvice, getMyAdviceById, markAdviceRead, errorMessage } from './adviceApi';

/**
 * Student view: shows ONLY the logged-in student's own advice.
 * (The server takes the user from the login token – no user id is sent.)
 */
const MyAdvice = ({ contract }) => {
    const [data, setData] = useState(null);
    const [current, setCurrent] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    const open = async (doc) => {
        setCurrent(doc);
        if (!doc.read_at) {
            markAdviceRead(doc.id).catch(() => {});
            setData((prev) =>
                prev && {
                    ...prev,
                    unread: Math.max(0, prev.unread - (prev.history.find((h) => h.id === doc.id && !h.read) ? 1 : 0)),
                    history: prev.history.map((h) => (h.id === doc.id ? { ...h, read: true } : h)),
                }
            );
        }
    };

    useEffect(() => {
        getMyAdvice()
            .then((d) => {
                setData(d);
                if (d.latest.length) open(d.latest[0]);
            })
            .catch((err) => setError(errorMessage(err)))
            .finally(() => setLoading(false));
    }, []);

    const openHistory = async (id) => {
        try {
            open(await getMyAdviceById(id));
        } catch (err) {
            setError(errorMessage(err));
        }
    };

    if (loading) {
        return <div className="adv-alert info"><Loader2 size={16} className="spin" /> Loading your advice…</div>;
    }
    if (error) return <div className="adv-alert error">{error}</div>;

    if (!data.latest.length) {
        return (
            <div className="adv-empty">
                <Sparkles size={36} />
                <h3>No advice yet</h3>
                <p>Your personalised advice will appear here after your learning progress is assessed.</p>
            </div>
        );
    }

    return (
        <div className="adv-page-inner">
            <div className="adv-header">
                <div>
                    <h2>My learning advices</h2>
                    <p className="adv-muted">
                        Personalised for you, {data.user.name}, based on your recent attendance, marks, study time and
                        engagement. Only you can see this page.
                    </p>
                </div>
                {data.unread > 0 && (
                    <span className="adv-badge prio-high"><Bell size={12} /> {data.unread} new</span>
                )}
            </div>

            {data.latest.length > 1 && (
                <div className="adv-tabs">
                    {data.latest.map((d) => (
                        <button
                            key={d.id}
                            className={`adv-tab ${current?.course_code === d.course_code && current?.id === d.id ? 'active' : ''}`}
                            onClick={() => open(d)}
                        >
                            {d.course_code} · {d.course?.name}
                        </button>
                    ))}
                </div>
            )}

            <div className="adv-results">
                <aside className="adv-results-list">
                    <h4><History size={16} /> Advice history</h4>
                    {data.history.map((h) => (
                        <button
                            key={h.id}
                            className={`adv-result-item ${current?.id === h.id ? 'active' : ''}`}
                            onClick={() => openHistory(h.id)}
                        >
                            <div className="adv-result-top">
                                <strong>{h.course_code}</strong>
                                {!h.read && current?.id !== h.id && <span className="adv-dot" title="New" />}
                            </div>
                            <div className="adv-result-sub">
                                <span>{new Date(h.created_at).toLocaleDateString()}</span>
                                <StatusChip status={h.overall_status} />
                            </div>
                            <div className="adv-result-sub"><RiskBadge level={h.risk_level} /></div>
                        </button>
                    ))}
                </aside>
                <section className="adv-results-detail">
                    {current && <AdviceView result={current} contract={contract} audience="student" />}
                </section>
            </div>
        </div>
    );
};

export default MyAdvice;
