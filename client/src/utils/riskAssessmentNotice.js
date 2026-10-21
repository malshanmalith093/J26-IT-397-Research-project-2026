const STORAGE_KEY = 'pendingRiskAssessmentModules';
export const RISK_ASSESSMENT_NOTICE_EVENT = 'risk-assessment-notice-updated';

export const getPendingRiskModules = () => {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        return Array.isArray(saved) ? saved : [];
    } catch {
        return [];
    }
};

const savePendingRiskModules = (modules) => {
    if (modules.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(modules));
    else localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(RISK_ASSESSMENT_NOTICE_EVENT));
};

export const updateRiskAssessmentNotice = (assessment) => {
    const current = getPendingRiskModules();
    const moduleId = String(assessment.module_id || '').trim().toLowerCase();
    const withoutCurrentModule = current.filter(
        (item) => String(item.module_id || '').trim().toLowerCase() !== moduleId,
    );
    const isAtRisk = ['medium', 'high'].includes(String(assessment.risk_level || '').toLowerCase());

    if (isAtRisk && moduleId) {
        withoutCurrentModule.push({ module_id: assessment.module_id, risk_level: assessment.risk_level });
    }
    savePendingRiskModules(withoutCurrentModule);
};

export const clearRiskAssessmentNotice = () => savePendingRiskModules([]);
