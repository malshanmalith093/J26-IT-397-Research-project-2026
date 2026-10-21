import React, { useEffect, useMemo, useState } from 'react';
import {
    Users, Upload, Send, Eye, PenLine, Loader2, WifiOff, Cpu, RefreshCw, CheckSquare, Square, X, PlugZap, Inbox,
} from 'lucide-react';
import ManualEntry, { randomRecord } from './ManualEntry';
import BulkImport from './BulkImport';
import PendingImports from './PendingImports';
import AdviceView from './AdviceView';
import { RiskBadge, StatusChip, Modal } from './ui';
import {
    getHealth, getCourses, getDummyTemplates, getStudents, getStudentAdvice, sendAdvice, testLLM, errorMessage,
    importRecords, getPending, sendPending, deletePending,
} from './adviceApi';

const RANDOM_OPTIONS = ['random:High', 'random:Medium', 'random:Low'];

/**
 * Staff (Admin / Moderator) view.
 * Component 1 is not available yet, so staff choose dummy Component 1 outputs
 * for each registered student and send the generated advice to that student.
 */
const SendAdvicePanel = ({ contract }) => {
    const [health, setHealth] = useState(null);
    const [courses, setCourses] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [students, setStudents] = useState([]);
    const [pending, setPending] = useState([]);
    const [config, setConfig] = useState({}); // userId -> {source, course, manual}
    const [selected, setSelected] = useState([]);
    const [tab, setTab] = useState('students');
    const [busy, setBusy] = useState(false);
    const [busyText, setBusyText] = useState('');
    const [notice, setNotice] = useState(null);
    const [error, setError] = useState('');
    const [offline, setOffline] = useState(false);
    const [editing, setEditing] = useState(null); // student being edited manually
    const [viewing, setViewing] = useState(null); // {user, advice: [...], index}
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);

    const runTest = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            setTestResult(await testLLM());
        } catch (err) {
            setTestResult({ ok: false, error: errorMessage(err) });
        } finally {
            setTesting(false);
        }
    };

    const loadStudents = () =>
        getStudents()
            .then(setStudents)
            .catch((err) => setError(errorMessage(err)));

    const loadPending = () =>
        getPending()
            .then(setPending)
            .catch((err) => setError(errorMessage(err)));

    useEffect(() => {
        Promise.all([getHealth(), getCourses(), getDummyTemplates(), getStudents(), getPending()])
            .then(([h, c, t, s, p]) => {
                setHealth(h);
                setCourses(c);
                setTemplates(t);
                setStudents(s);
                setPending(p);
                if (!h.configured) setOffline(true);
            })
            .catch((err) => setError(errorMessage(err)));
    }, []);

    // default: give each student a different dummy scenario so the demo shows variety
    const cfgFor = (s, i) =>
        config[s.id] || {
            source: templates.length ? templates[i % templates.length].record.student_id : 'random:Medium',
            course: templates.length ? templates[i % templates.length].course_code : 'IT3020',
        };
    const setCfg = (id, patch, i) =>
        setConfig((c) => ({ ...c, [id]: { ...cfgFor(students.find((s) => s.id === id), i), ...patch } }));

    const buildItem = (s, i) => {
        const cfg = cfgFor(s, i);
        let record;
        if (cfg.source === 'manual' && cfg.manual) record = cfg.manual;
        else if (cfg.source.startsWith('random:')) record = randomRecord(cfg.source.split(':')[1]);
        else record = { ...(templates.find((t) => t.record.student_id === cfg.source)?.record || {}) };
        return { user_id: s.id, record, course_code: cfg.course };
    };

    const doSend = async (items) => {
        if (!items.length) return;
        setBusy(true);
        setBusyText('Generating and sending advice…');
        setError('');
        setNotice(null);
        try {
            const res = await sendAdvice(items, offline);
            const failed = res.results.filter((r) => !r.ok);
            const fallback = res.results.find((r) => r.ok && r.fallback_reason);
            setNotice({
                text: `Advice sent to ${res.sent} of ${res.count} student(s).`,
                failed,
                fallback: fallback && !offline ? fallback.fallback_reason : null,
            });
            await loadStudents();
            if (viewing) openView(viewing.user.id);
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    const doImport = async (items) => {
        if (!items.length) return;
        setBusy(true);
        setBusyText('Importing records — no advice is being generated or sent…');
        setError('');
        setNotice(null);
        try {
            const res = await importRecords(items);
            const failed = res.results.filter((r) => !r.ok);
            setNotice({
                text: `${res.imported} of ${res.count} record(s) imported — nothing was sent to the students yet. Send the advice any time from the Pending tab.`,
                failed,
                fallback: null,
            });
            await loadPending();
            setTab('pending');
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    const doSendPending = async (ids) => {
        if (!ids.length) return;
        setBusy(true);
        setBusyText('Generating and sending advice…');
        setError('');
        setNotice(null);
        try {
            const res = await sendPending(ids, offline);
            const failed = res.results.filter((r) => !r.ok);
            const fallback = res.results.find((r) => r.ok && r.fallback_reason);
            setNotice({
                text: `Advice sent to ${res.sent} of ${res.count} student(s).`,
                failed,
                fallback: fallback && !offline ? fallback.fallback_reason : null,
            });
            await Promise.all([loadPending(), loadStudents()]);
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    const doDeletePending = async (id) => {
        setError('');
        try {
            await deletePending(id);
            await loadPending();
        } catch (err) {
            setError(errorMessage(err));
        }
    };

    const openView = async (userId) => {
        try {
            const res = await getStudentAdvice(userId);
            setViewing({ ...res, index: 0 });
        } catch (err) {
            setError(errorMessage(err));
        }
    };

    const indexed = useMemo(() => students.map((s, i) => ({ s, i })), [students]);
    const allSelected = students.length > 0 && selected.length === students.length;

    return (
        <div className="adv-page-inner">
            <div className="adv-header">
                <div>
                    <h2>Send personalised advice</h2>
                    <p className="adv-muted">
                        Choose Component 1 risk data for each student and send them their advice. Each student sees only
                        their own advice on this page.
                    </p>
                </div>
                <div className="adv-header-right">
                    {health && (
                        <span
                            className={`adv-badge ${health.configured ? 'provider-ai' : 'provider-rules'}`}
                            title={health.configured ? health.endpoint || '' : health.reason || ''}
                        >
                            <Cpu size={12} />{' '}
                            {health.configured ? `${health.label} · ${health.model}` : 'AI provider not configured'}
                        </span>
                    )}
                    {health?.configured && (
                        <button className="adv-btn small ghost" onClick={runTest} disabled={testing || busy}>
                            {testing ? <Loader2 size={14} className="spin" /> : <PlugZap size={14} />} Test connection
                        </button>
                    )}
                    <label className="adv-switch" title="Use the offline rule-based engine instead of the AI provider">
                        <input type="checkbox" checked={offline} onChange={(e) => setOffline(e.target.checked)} />
                        <WifiOff size={14} /> Offline mode
                    </label>
                </div>
            </div>

            {health && !health.configured && (
                <div className="adv-alert info">
                    No AI provider is set up ({health.reason}). Advice will be generated by the offline rule-based
                    engine. Add OpenAI, Azure AI Foundry or a custom endpoint in <code>python/.env</code> and restart Flask.
                </div>
            )}
            {testResult && (
                <div className={`adv-alert ${testResult.ok ? 'success' : 'error'}`}>
                    {testResult.ok ? (
                        <>
                            <strong>Connected to {testResult.label}</strong>
                            <span className="adv-msgs">
                                model {testResult.model} · {testResult.endpoint} · JSON mode {testResult.json_mode} ·{' '}
                                {(testResult.latency_ms / 1000).toFixed(1)} s
                            </span>
                        </>
                    ) : (
                        <>
                            <strong>Connection failed{testResult.label ? ` (${testResult.label})` : ''}:</strong>{' '}
                            {testResult.error}
                        </>
                    )}
                </div>
            )}

            <div className="adv-notice">
                <b>PP1 note:</b> Component 1 (risk model) is developed separately, so the risk data here is dummy data.
                Later, the real model's output replaces it (contract {contract?.contract_version}).
            </div>

            <div className="adv-card">
                <div className="adv-tabs">
                    <button className={`adv-tab ${tab === 'students' ? 'active' : ''}`} onClick={() => setTab('students')}>
                        <Users size={16} /> Students <span className="count">{students.length}</span>
                    </button>
                    <button className={`adv-tab ${tab === 'bulk' ? 'active' : ''}`} onClick={() => setTab('bulk')}>
                        <Upload size={16} /> Bulk import (CSV / JSON)
                    </button>
                    <button className={`adv-tab ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>
                        <Inbox size={16} /> Pending {pending.length > 0 && <span className="count">{pending.length}</span>}
                    </button>
                </div>

                <div className="adv-tab-body">
                    {tab === 'students' && (
                        <>
                            <div className="adv-toolbar">
                                <p className="adv-hint">
                                    Pick the dummy risk data for each student (a scenario, a random record, or your own
                                    values), then send.
                                </p>
                                <div className="adv-toolbar-actions">
                                    <button className="adv-btn ghost" onClick={loadStudents} disabled={busy}>
                                        <RefreshCw size={14} /> Refresh
                                    </button>
                                    <button
                                        className="adv-btn ghost"
                                        onClick={() => setSelected(allSelected ? [] : students.map((s) => s.id))}
                                        disabled={busy}
                                    >
                                        {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                                        {allSelected ? 'Clear' : 'Select all'}
                                    </button>
                                    <button
                                        className="adv-btn primary"
                                        disabled={busy || !selected.length}
                                        onClick={() =>
                                            doSend(indexed.filter(({ s }) => selected.includes(s.id)).map(({ s, i }) => buildItem(s, i)))
                                        }
                                    >
                                        <Send size={16} /> Send to selected ({selected.length})
                                    </button>
                                </div>
                            </div>

                            {students.length === 0 ? (
                                <p className="adv-muted">No registered students yet. Students appear here after they sign up.</p>
                            ) : (
                                <div className="adv-table-wrap">
                                    <table className="adv-table adv-students-table">
                                        <thead>
                                            <tr>
                                                <th />
                                                <th>Student</th>
                                                <th>Dummy Component 1 data</th>
                                                <th>Course</th>
                                                <th>Last advice sent</th>
                                                <th />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {indexed.map(({ s, i }) => {
                                                const cfg = cfgFor(s, i);
                                                const last = s.last_advice;
                                                return (
                                                    <tr key={s.id} className={selected.includes(s.id) ? 'row-selected' : ''}>
                                                        <td>
                                                            <button
                                                                className="adv-check"
                                                                onClick={() =>
                                                                    setSelected((x) => (x.includes(s.id) ? x.filter((y) => y !== s.id) : [...x, s.id]))
                                                                }
                                                            >
                                                                {selected.includes(s.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                                                            </button>
                                                        </td>
                                                        <td>
                                                            <strong>{s.name}</strong>
                                                            <div className="adv-msgs">{s.email} · {s.student_id}</div>
                                                        </td>
                                                        <td>
                                                            <select
                                                                className="adv-select"
                                                                value={cfg.source}
                                                                onChange={(e) => {
                                                                    const v = e.target.value;
                                                                    const t = templates.find((x) => x.record.student_id === v);
                                                                    setCfg(s.id, { source: v, ...(t ? { course: t.course_code } : {}) }, i);
                                                                    if (v === 'manual') setEditing({ s, i });
                                                                }}
                                                            >
                                                                <optgroup label="Scenarios">
                                                                    {templates.map((t) => (
                                                                        <option key={t.record.student_id} value={t.record.student_id}>
                                                                            {t.scenario}
                                                                        </option>
                                                                    ))}
                                                                </optgroup>
                                                                <optgroup label="Random">
                                                                    {RANDOM_OPTIONS.map((r) => (
                                                                        <option key={r} value={r}>Random – {r.split(':')[1]} risk</option>
                                                                    ))}
                                                                </optgroup>
                                                                <option value="manual">
                                                                    {cfg.manual ? 'My own values (edited)' : 'Enter my own values…'}
                                                                </option>
                                                            </select>
                                                        </td>
                                                        <td>
                                                            <select
                                                                className="adv-select"
                                                                value={cfg.course}
                                                                onChange={(e) => setCfg(s.id, { course: e.target.value }, i)}
                                                            >
                                                                {courses.map((c) => (
                                                                    <option key={c.code} value={c.code}>{c.code}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td>
                                                            {last ? (
                                                                <div className="adv-last">
                                                                    <RiskBadge level={last.risk_level} />
                                                                    <StatusChip status={last.overall_status} />
                                                                    <span className="adv-msgs">
                                                                        {last.course_code} · {new Date(last.sent_at).toLocaleString()} ·{' '}
                                                                        {last.read ? 'read' : 'unread'}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <span className="adv-msgs">Nothing sent yet</span>
                                                            )}
                                                        </td>
                                                        <td className="adv-row-actions">
                                                            <button className="adv-btn small ghost" title="Edit values" onClick={() => setEditing({ s, i })} disabled={busy}>
                                                                <PenLine size={14} />
                                                            </button>
                                                            <button className="adv-btn small ghost" title="View sent advice" onClick={() => openView(s.id)} disabled={!last}>
                                                                <Eye size={14} />
                                                            </button>
                                                            <button className="adv-btn small" onClick={() => doSend([buildItem(s, i)])} disabled={busy}>
                                                                <Send size={14} /> Send
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {editing && contract && (
                                <Modal onClose={() => setEditing(null)}>
                                <div className="adv-card adv-inline-editor">
                                    <div className="adv-editor-head">
                                        <h4><PenLine size={16} /> Component 1 values for {editing.s.name}</h4>
                                        <button className="adv-btn small ghost" onClick={() => setEditing(null)}><X size={14} /></button>
                                    </div>
                                    <ManualEntry
                                        key={editing.s.id}
                                        contract={contract}
                                        courses={courses}
                                        presets={templates}
                                        busy={busy}
                                        initial={{ record: buildItem(editing.s, editing.i).record, course_code: cfgFor(editing.s, editing.i).course }}
                                        actionLabel={`Save & send to ${editing.s.name}`}
                                        onGenerate={(record, courseCode) => {
                                            setCfg(editing.s.id, { source: 'manual', manual: record, course: courseCode }, editing.i);
                                            doSend([{ user_id: editing.s.id, record, course_code: courseCode }]);
                                            setEditing(null);
                                        }}
                                    />
                                </div>
                                </Modal>
                            )}
                        </>
                    )}

                    {tab === 'bulk' && contract && (
                        <BulkImport
                            contract={contract}
                            students={students}
                            templates={templates}
                            onSend={doSend}
                            onImport={doImport}
                            busy={busy}
                        />
                    )}

                    {tab === 'pending' && (
                        <PendingImports
                            pending={pending}
                            busy={busy}
                            onSend={(id) => doSendPending([id])}
                            onSendAll={() => doSendPending(pending.map((p) => p.id))}
                            onDelete={doDeletePending}
                            onRefresh={loadPending}
                        />
                    )}
                </div>
            </div>

            {busy && (
                <div className="adv-alert info">
                    <Loader2 size={16} className="spin" /> {busyText || 'Working…'}
                </div>
            )}
            {error && <div className="adv-alert error">{error}</div>}
            {notice && (
                <div className={`adv-alert ${notice.failed.length ? 'error' : 'success'}`}>
                    <strong>{notice.text}</strong>
                    {notice.failed.map((f, k) => (
                        <div key={k} className="adv-msgs">{f.name || f.target}: {f.errors.join(' ')}</div>
                    ))}
                    {notice.fallback && (
                        <div className="adv-msgs">The AI provider was not used ({notice.fallback}) – offline advice was sent instead.</div>
                    )}
                </div>
            )}

            {viewing && (
                <Modal wide onClose={() => setViewing(null)}>
                <div className="adv-card adv-staff-view">
                    <div className="adv-editor-head">
                        <h4>
                            <Eye size={16} /> What {viewing.user.name} sees ({viewing.advice.length} advice sent)
                        </h4>
                        <div className="adv-toolbar-actions">
                            {viewing.advice.length > 1 && (
                                <select
                                    className="adv-select"
                                    value={viewing.index}
                                    onChange={(e) => setViewing({ ...viewing, index: Number(e.target.value) })}
                                >
                                    {viewing.advice.map((a, k) => (
                                        <option key={a.id} value={k}>
                                            {new Date(a.created_at).toLocaleString()} · {a.course_code} · {a.input.academic_risk_level}
                                        </option>
                                    ))}
                                </select>
                            )}
                            <button className="adv-btn small ghost" onClick={() => setViewing(null)}><X size={14} /></button>
                        </div>
                    </div>
                    {viewing.advice[viewing.index] && (
                        <AdviceView
                            result={viewing.advice[viewing.index]}
                            contract={contract}
                            audience="staff"
                            busy={busy}
                            onRegenerate={() => {
                                const a = viewing.advice[viewing.index];
                                doSend([{ user_id: viewing.user.id, record: a.input, course_code: a.course_code }]);
                            }}
                        />
                    )}
                </div>
                </Modal>
            )}
        </div>
    );
};

export default SendAdvicePanel;
