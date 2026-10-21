/**
 * API helper for the Component 2 advice engine (Flask, python/Profiling).
 * The login token (same one the rest of the app uses) is sent on every call,
 * so the server knows which user is asking and returns only their data.
 */
import axios from 'axios';

const BASE = `${import.meta.env.VITE_PYTHON_BACKEND || 'http://localhost:3000'}/api/advice`;

const api = axios.create({ baseURL: BASE, timeout: 180000 });

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers['x-auth-token'] = token;
    return config;
});

const data = (p) => p.then((r) => r.data);

// shared
export const getHealth = () => data(api.get('/health'));
export const whoAmI = () => data(api.get('/whoami'));
export const getContract = () => data(api.get('/contract'));
export const getCourses = () => data(api.get('/courses'));

// student – own advice only
export const getMyAdvice = () => data(api.get('/my'));
export const getMyAdviceById = (id) => data(api.get(`/my/${id}`));
export const markAdviceRead = (id) => data(api.post(`/my/${id}/read`));

// staff (Admin / Moderator)
export const getDummyTemplates = () => data(api.get('/dummy-students'));
export const getStudents = () => data(api.get('/admin/students'));
export const getStudentAdvice = (userId) => data(api.get(`/admin/students/${userId}`));
export const sendAdvice = (items, forceFallback = false) =>
    data(api.post('/admin/send', { items, force_fallback: forceFallback }));
export const importRecords = (items) => data(api.post('/admin/import', { items }));
export const getPending = () => data(api.get('/admin/pending'));
export const sendPending = (ids, forceFallback = false) =>
    data(api.post('/admin/pending/send', { ids, force_fallback: forceFallback }));
export const deletePending = (id) => data(api.delete(`/admin/pending/${id}`));
export const parseRecords = (text) => data(api.post('/parse', { text }));
export const testLLM = () => data(api.post('/admin/llm-test'));

export const errorMessage = (err) =>
    err?.response?.data?.message ||
    (err?.code === 'ERR_NETWORK'
        ? 'Cannot reach the Python service. Is Flask running on port 3000?'
        : err?.message || 'Something went wrong');

/** CSV template: one row per registered student, pre-filled with dummy Component 1 values. */
export const csvTemplate = (contract, students = [], templates = []) => {
    const fields = (contract?.c1_core_fields || []).filter((f) => f !== 'student_id');
    const cols = ['email', ...fields, 'risk_trend', 'course_code'];
    const rows = students.map((s, i) => {
        const t = templates[i % Math.max(templates.length, 1)] || { record: {}, course_code: 'IT3020' };
        return cols
            .map((c) => (c === 'email' ? s.email : c === 'course_code' ? t.course_code : t.record[c] ?? ''))
            .join(',');
    });
    return [cols.join(','), ...rows].join('\n');
};
