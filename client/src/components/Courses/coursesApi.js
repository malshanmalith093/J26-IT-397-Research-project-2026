/**
 * API helper for course content (Flask, python/Profiling/courses.py).
 * Everyone who is logged in can read courses; only Admin / Moderator can change them.
 */
import axios from 'axios';

const BASE = `${import.meta.env.VITE_PYTHON_BACKEND || 'http://localhost:3000'}/api/courses`;

const api = axios.create({ baseURL: BASE, timeout: 30000 });

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers['x-auth-token'] = token;
    return config;
});

const data = (p) => p.then((r) => r.data);

export const listCourses = () => data(api.get(''));
export const getCourse = (code) => data(api.get(`/${encodeURIComponent(code)}`));
export const createCourse = (course) => data(api.post('', course));
export const updateCourse = (code, course) => data(api.put(`/${encodeURIComponent(code)}`, course));
export const deleteCourse = (code) => data(api.delete(`/${encodeURIComponent(code)}`));
export const restoreSampleCourses = () => data(api.post('/restore-samples'));

export const courseError = (err) => {
    const d = err?.response?.data;
    if (d?.errors?.length) return `${d.message}: ${d.errors.join('; ')}`;
    if (d?.message) return d.message;
    if (err?.code === 'ERR_NETWORK') return 'Cannot reach the Python service. Is Flask running on port 3000?';
    return err?.message || 'Something went wrong';
};
