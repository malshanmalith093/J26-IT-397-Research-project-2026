/**
 * Add / edit a course (Admin / Moderator only – the server also checks this).
 * Routes: /courses/new and /courses/:code/edit
 */
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Loader2, ChevronDown, ChevronRight, Lock } from 'lucide-react';
import useMe from '../components/Profiling/useMe';
import { getCourse, createCourse, updateCourse, courseError } from '../components/Courses/coursesApi';
import '../components/Courses/courses.css';

const lines = (arr) => (arr || []).join('\n');
const toLines = (text) => (text || '').split('\n').map((s) => s.trim()).filter(Boolean);

const emptyLesson = (week) => ({
    week, title: '', summary: '', content: '', objectives: '', key_points: '',
    exampleLanguage: 'text', exampleCode: '', practice: '', resources: '', open: true,
});

const toForm = (c) => ({
    code: c.code || '', name: c.name || '', description: c.description || '', level: c.level || '',
    credits: c.credits ?? '', lecturer: c.lecturer || '', total_weeks: c.total_weeks ?? 6,
    current_week: c.current_week ?? 1, expected_progress: c.expected_progress ?? 0,
    assignments_released: c.assignments_released ?? 0, upcoming: lines(c.upcoming),
    lessons: (c.lessons || []).map((l) => ({
        week: l.week, title: l.title || '', summary: l.summary || '', content: l.content || '',
        objectives: lines(l.objectives), key_points: lines(l.key_points),
        exampleLanguage: l.example?.language || 'text', exampleCode: l.example?.code || '',
        practice: lines(l.practice),
        resources: (l.resources || []).map((r) => `${r.title} | ${r.url}`).join('\n'),
        open: false,
    })),
});

const toPayload = (f) => ({
    code: f.code.trim().toUpperCase(), name: f.name, description: f.description, level: f.level,
    credits: f.credits, lecturer: f.lecturer, total_weeks: f.total_weeks, current_week: f.current_week,
    expected_progress: f.expected_progress, assignments_released: f.assignments_released,
    upcoming: toLines(f.upcoming),
    lessons: f.lessons.map((l) => ({
        week: l.week, title: l.title, summary: l.summary, content: l.content,
        objectives: toLines(l.objectives), key_points: toLines(l.key_points),
        example: { language: l.exampleLanguage, code: l.exampleCode },
        practice: toLines(l.practice),
        resources: toLines(l.resources).map((r) => {
            const [title, url] = r.includes('|') ? r.split('|').map((s) => s.trim()) : [r, r];
            return { title, url };
        }),
    })),
});

const CourseEditor = () => {
    const { code } = useParams();
    const isNew = !code;
    const navigate = useNavigate();
    const { me } = useMe();
    const [form, setForm] = useState(isNew ? toForm({ lessons: [] }) : null);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isNew) {
            getCourse(code)
                .then((c) => setForm(toForm(c)))
                .catch((err) => setError(courseError(err)));
        }
    }, [code, isNew]);

    if (me && !me.is_staff) {
        return (
            <div className="page-content crs-page">
                <div className="crs-alert error"><Lock size={16} /> Only Admin or Moderator users can add or edit courses.</div>
                <Link to="/courses" className="crs-back"><ArrowLeft size={16} /> Back to courses</Link>
            </div>
        );
    }

    if (!form) {
        return (
            <div className="page-content crs-page">
                {error ? <div className="crs-alert error">{error}</div> :
                    <div className="crs-alert info"><Loader2 size={16} className="crs-spin" /> Loading…</div>}
            </div>
        );
    }

    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    const setLesson = (i, k, v) =>
        setForm((f) => ({ ...f, lessons: f.lessons.map((l, j) => (j === i ? { ...l, [k]: v } : l)) }));
    const addLesson = () =>
        setForm((f) => ({
            ...f,
            lessons: [...f.lessons, emptyLesson(Math.max(0, ...f.lessons.map((l) => Number(l.week) || 0)) + 1)],
        }));
    const removeLesson = (i) => setForm((f) => ({ ...f, lessons: f.lessons.filter((_, j) => j !== i) }));

    const save = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            const payload = toPayload(form);
            const saved = isNew ? await createCourse(payload) : await updateCourse(code, payload);
            navigate(`/courses/${saved.code}`);
        } catch (err) {
            setError(courseError(err));
        } finally {
            setSaving(false);
        }
    };

    const field = (k, label, props = {}) => (
        <label className="crs-field">
            <span>{label}</span>
            <input value={form[k]} onChange={(e) => set(k, e.target.value)} {...props} />
        </label>
    );

    return (
        <div className="page-content crs-page">
            <Link to={isNew ? '/courses' : `/courses/${code}`} className="crs-back"><ArrowLeft size={16} /> Back</Link>
            <h2>{isNew ? 'Add a course' : `Edit ${form.code}`}</h2>

            <form onSubmit={save} className="crs-form">
                <div className="crs-card-flat">
                    <h4>Course details</h4>
                    <div className="crs-form-grid">
                        {field('code', 'Course code *', { placeholder: 'IT1010', disabled: !isNew, required: true })}
                        {field('name', 'Course name *', { required: true })}
                        {field('level', 'Level', { placeholder: 'Year 1' })}
                        {field('credits', 'Credits', { type: 'number', min: 0, max: 30 })}
                        {field('lecturer', 'Lecturer')}
                        {field('total_weeks', 'Total weeks', { type: 'number', min: 1, max: 52 })}
                        {field('current_week', 'Current week', { type: 'number', min: 1, max: 52 })}
                        {field('expected_progress', 'Expected progress now (%)', { type: 'number', min: 0, max: 100 })}
                        {field('assignments_released', 'Assignments released so far', { type: 'number', min: 0, max: 50 })}
                    </div>
                    <label className="crs-field">
                        <span>Description</span>
                        <textarea rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} />
                    </label>
                    <label className="crs-field">
                        <span>Upcoming assessments (one per line)</span>
                        <textarea rows={2} value={form.upcoming} onChange={(e) => set('upcoming', e.target.value)} />
                    </label>
                    <p className="crs-muted small">
                        Current week, expected progress and assignments released are used by the advice engine to judge
                        whether a student is behind.
                    </p>
                </div>

                <div className="crs-card-flat">
                    <div className="crs-row-between">
                        <h4>Lessons ({form.lessons.length})</h4>
                        <button type="button" className="crs-btn ghost" onClick={addLesson}><Plus size={15} /> Add lesson</button>
                    </div>
                    {form.lessons.map((l, i) => (
                        <div key={i} className="crs-lesson-edit">
                            <div className="crs-row-between">
                                <button type="button" className="crs-link" onClick={() => setLesson(i, 'open', !l.open)}>
                                    {l.open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    Week {l.week || '?'} – {l.title || 'New lesson'}
                                </button>
                                <button type="button" className="crs-btn small danger" onClick={() => removeLesson(i)}>
                                    <Trash2 size={14} /> Remove
                                </button>
                            </div>
                            {l.open && (
                                <div className="crs-form-grid lesson">
                                    <label className="crs-field small">
                                        <span>Week</span>
                                        <input type="number" min={1} max={52} value={l.week} onChange={(e) => setLesson(i, 'week', e.target.value)} />
                                    </label>
                                    <label className="crs-field wide">
                                        <span>Title *</span>
                                        <input value={l.title} onChange={(e) => setLesson(i, 'title', e.target.value)} required />
                                    </label>
                                    <label className="crs-field full">
                                        <span>Summary (one sentence)</span>
                                        <input value={l.summary} onChange={(e) => setLesson(i, 'summary', e.target.value)} />
                                    </label>
                                    <label className="crs-field full">
                                        <span>Lesson content (blank line = new paragraph)</span>
                                        <textarea rows={6} value={l.content} onChange={(e) => setLesson(i, 'content', e.target.value)} />
                                    </label>
                                    <label className="crs-field">
                                        <span>Learning objectives (one per line)</span>
                                        <textarea rows={3} value={l.objectives} onChange={(e) => setLesson(i, 'objectives', e.target.value)} />
                                    </label>
                                    <label className="crs-field">
                                        <span>Key points (one per line)</span>
                                        <textarea rows={3} value={l.key_points} onChange={(e) => setLesson(i, 'key_points', e.target.value)} />
                                    </label>
                                    <label className="crs-field small">
                                        <span>Example language</span>
                                        <input value={l.exampleLanguage} onChange={(e) => setLesson(i, 'exampleLanguage', e.target.value)} />
                                    </label>
                                    <label className="crs-field full">
                                        <span>Example code</span>
                                        <textarea rows={4} className="mono" value={l.exampleCode} onChange={(e) => setLesson(i, 'exampleCode', e.target.value)} />
                                    </label>
                                    <label className="crs-field">
                                        <span>Practice questions (one per line)</span>
                                        <textarea rows={3} value={l.practice} onChange={(e) => setLesson(i, 'practice', e.target.value)} />
                                    </label>
                                    <label className="crs-field">
                                        <span>Resources (one per line: Title | https://link)</span>
                                        <textarea rows={3} value={l.resources} onChange={(e) => setLesson(i, 'resources', e.target.value)} />
                                    </label>
                                </div>
                            )}
                        </div>
                    ))}
                    {form.lessons.length === 0 && <p className="crs-muted">No lessons yet – click “Add lesson”.</p>}
                </div>

                {error && <div className="crs-alert error">{error}</div>}
                <div className="crs-actions end">
                    <button type="button" className="crs-btn ghost" onClick={() => navigate(-1)}>Cancel</button>
                    <button type="submit" className="crs-btn primary" disabled={saving}>
                        {saving ? <Loader2 size={15} className="crs-spin" /> : <Save size={15} />} Save course
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CourseEditor;
