/**
 * Course detail – weekly lessons of one course.
 * ?week=N opens a specific lesson (used by the "Course topics to focus on" links in the advice).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft, BookOpen, Target, Lightbulb, Code2, PencilLine, ExternalLink, Edit3, Trash2, Loader2, CalendarDays,
} from 'lucide-react';
import useMe from '../components/Profiling/useMe';
import { getCourse, deleteCourse, courseError } from '../components/Courses/coursesApi';
import '../components/Courses/courses.css';

const CourseDetail = () => {
    const { code } = useParams();
    const [params, setParams] = useSearchParams();
    const navigate = useNavigate();
    const { me } = useMe();
    const [course, setCourse] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        getCourse(code)
            .then(setCourse)
            .catch((err) => setError(courseError(err)));
    }, [code]);

    const lessons = useMemo(() => [...(course?.lessons || [])].sort((a, b) => a.week - b.week), [course]);
    const selectedWeek = Number(params.get('week')) || course?.current_week || lessons[0]?.week;
    const lesson = lessons.find((l) => l.week === selectedWeek) || lessons[0];

    const remove = async () => {
        if (!window.confirm(`Delete ${course.code} ${course.name}? Students will no longer see it.`)) return;
        try {
            await deleteCourse(course.code);
            navigate('/courses');
        } catch (err) {
            setError(courseError(err));
        }
    };

    if (error) {
        return (
            <div className="page-content crs-page">
                <Link to="/courses" className="crs-back"><ArrowLeft size={16} /> All courses</Link>
                <div className="crs-alert error">{error}</div>
            </div>
        );
    }
    if (!course) {
        return (
            <div className="page-content crs-page">
                <div className="crs-alert info"><Loader2 size={16} className="crs-spin" /> Loading course…</div>
            </div>
        );
    }

    return (
        <div className="page-content crs-page">
            <Link to="/courses" className="crs-back"><ArrowLeft size={16} /> All courses</Link>

            <div className="crs-course-head">
                <div>
                    <div className="crs-card-top">
                        <span className="crs-code">{course.code}</span>
                        {course.level && <span className="crs-tag">{course.level}</span>}
                        {course.credits ? <span className="crs-tag">{course.credits} credits</span> : null}
                    </div>
                    <h2>{course.name}</h2>
                    <p className="crs-muted">{course.description}</p>
                    <div className="crs-meta">
                        <span><CalendarDays size={14} /> Current week {course.current_week} of {course.total_weeks}</span>
                        {course.lecturer && <span>Lecturer: {course.lecturer}</span>}
                    </div>
                    {course.upcoming?.length > 0 && (
                        <div className="crs-upcoming">
                            <b>Coming up:</b> {course.upcoming.join(' · ')}
                        </div>
                    )}
                </div>
                {me?.is_staff && (
                    <div className="crs-actions">
                        <button className="crs-btn ghost" onClick={() => navigate(`/courses/${course.code}/edit`)}>
                            <Edit3 size={15} /> Edit course
                        </button>
                        <button className="crs-btn danger" onClick={remove}>
                            <Trash2 size={15} /> Delete
                        </button>
                    </div>
                )}
            </div>

            {lessons.length === 0 ? (
                <div className="crs-empty"><BookOpen size={32} /><p>No lessons in this course yet.</p></div>
            ) : (
                <div className="crs-layout">
                    <aside className="crs-weeks">
                        {lessons.map((l) => (
                            <button
                                key={l.week}
                                className={`crs-week ${lesson?.week === l.week ? 'active' : ''} ${l.week === course.current_week ? 'current' : ''}`}
                                onClick={() => setParams({ week: String(l.week) })}
                            >
                                <span className="crs-week-num">Week {l.week}{l.week === course.current_week ? ' · now' : ''}</span>
                                <span className="crs-week-title">{l.title}</span>
                            </button>
                        ))}
                    </aside>

                    {lesson && (
                        <article className="crs-lesson" data-testid="lesson">
                            <span className="crs-week-num">Week {lesson.week}</span>
                            <h3>{lesson.title}</h3>
                            {lesson.summary && <p className="crs-summary">{lesson.summary}</p>}

                            {lesson.objectives?.length > 0 && (
                                <section>
                                    <h4><Target size={16} /> Learning objectives</h4>
                                    <ul>{lesson.objectives.map((o, i) => <li key={i}>{o}</li>)}</ul>
                                </section>
                            )}

                            {lesson.content && (
                                <section className="crs-content">
                                    <h4><BookOpen size={16} /> Lesson</h4>
                                    {lesson.content.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
                                </section>
                            )}

                            {lesson.key_points?.length > 0 && (
                                <section className="crs-keypoints">
                                    <h4><Lightbulb size={16} /> Key points</h4>
                                    <ul>{lesson.key_points.map((k, i) => <li key={i}>{k}</li>)}</ul>
                                </section>
                            )}

                            {lesson.example?.code && (
                                <section>
                                    <h4><Code2 size={16} /> Example ({lesson.example.language})</h4>
                                    <pre className="crs-code-block"><code>{lesson.example.code}</code></pre>
                                </section>
                            )}

                            {lesson.practice?.length > 0 && (
                                <section>
                                    <h4><PencilLine size={16} /> Practice</h4>
                                    <ol>{lesson.practice.map((q, i) => <li key={i}>{q}</li>)}</ol>
                                </section>
                            )}

                            {lesson.resources?.length > 0 && (
                                <section>
                                    <h4><ExternalLink size={16} /> Further reading</h4>
                                    <ul className="crs-resources">
                                        {lesson.resources.map((r, i) => (
                                            <li key={i}>
                                                <a href={r.url} target="_blank" rel="noreferrer">{r.title || r.url}</a>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            )}
                        </article>
                    )}
                </div>
            )}
        </div>
    );
};

export default CourseDetail;
