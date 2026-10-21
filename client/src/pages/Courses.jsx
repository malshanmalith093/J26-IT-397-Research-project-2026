/**
 * Courses – list of course content.
 * Students: browse and open courses. Admin / Moderator: also add courses and restore the samples.
 */
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Plus, Loader2, RotateCcw, Layers, CalendarDays } from 'lucide-react';
import useMe from '../components/Profiling/useMe';
import { listCourses, restoreSampleCourses, courseError } from '../components/Courses/coursesApi';
import '../components/Courses/courses.css';

const Courses = () => {
    const { me } = useMe();
    const navigate = useNavigate();
    const [courses, setCourses] = useState(null);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const load = () =>
        listCourses()
            .then(setCourses)
            .catch((err) => setError(courseError(err)));

    useEffect(() => {
        load();
    }, []);

    const restore = async () => {
        try {
            const res = await restoreSampleCourses();
            setNotice(res.restored.length ? `Restored: ${res.restored.join(', ')}` : 'All sample courses are already there.');
            load();
        } catch (err) {
            setError(courseError(err));
        }
    };

    const isStaff = me?.is_staff;

    return (
        <div className="page-content crs-page">
            <div className="crs-header">
                <div>
                    <h2>Course content</h2>
                    <p className="crs-muted">
                        {isStaff
                            ? 'Add and update the courses students learn from. The advice engine uses these lessons in each student’s improvement guide.'
                            : 'Open a course to read the weekly lessons, examples and practice questions.'}
                    </p>
                </div>
                {isStaff && (
                    <div className="crs-actions">
                        <button className="crs-btn ghost" onClick={restore}>
                            <RotateCcw size={15} /> Restore sample courses
                        </button>
                        <button className="crs-btn primary" onClick={() => navigate('/courses/new')}>
                            <Plus size={16} /> Add course
                        </button>
                    </div>
                )}
            </div>

            {notice && <div className="crs-alert success">{notice}</div>}
            {error && <div className="crs-alert error">{error}</div>}
            {!courses && !error && (
                <div className="crs-alert info"><Loader2 size={16} className="crs-spin" /> Loading courses…</div>
            )}

            {courses && courses.length === 0 && (
                <div className="crs-empty">
                    <BookOpen size={36} />
                    <h3>No courses yet</h3>
                    <p>{isStaff ? 'Click “Add course” or restore the sample courses.' : 'Your lecturers have not added any courses yet.'}</p>
                </div>
            )}

            {courses && courses.length > 0 && (
                <div className="crs-grid">
                    {courses.map((c) => {
                        const pct = c.total_weeks ? Math.round((c.current_week / c.total_weeks) * 100) : 0;
                        return (
                            <Link key={c.code} to={`/courses/${c.code}`} className="crs-card" data-testid="course-card">
                                <div className="crs-card-top">
                                    <span className="crs-code">{c.code}</span>
                                    {c.level && <span className="crs-tag">{c.level}</span>}
                                </div>
                                <h3>{c.name}</h3>
                                <p className="crs-desc">{c.description}</p>
                                <div className="crs-meta">
                                    <span><Layers size={14} /> {c.lesson_count} lessons</span>
                                    <span><CalendarDays size={14} /> Week {c.current_week} of {c.total_weeks}</span>
                                </div>
                                <div className="crs-progress" title={`Week ${c.current_week} of ${c.total_weeks}`}>
                                    <div style={{ width: `${pct}%` }} />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Courses;
