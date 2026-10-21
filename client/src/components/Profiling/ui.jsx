import React, { useEffect } from 'react';

/** Centered popup. Closes on the backdrop click or Escape. */
export const Modal = ({ onClose, wide = false, children }) => {
    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden'; // no background scrolling behind the popup
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [onClose]);

    return (
        <div className="adv-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
            <div className={`adv-modal ${wide ? 'wide' : ''}`} onClick={(e) => e.stopPropagation()}>
                {children}
            </div>
        </div>
    );
};

export const RiskBadge = ({ level }) => (
    <span className={`adv-badge risk-${(level || 'unknown').toLowerCase()}`}>{level || '—'} risk</span>
);

const STATUS_LABEL = {
    on_track: 'On track',
    needs_attention: 'Needs attention',
    at_risk: 'At risk',
};

export const StatusChip = ({ status }) => (
    <span className={`adv-badge status-${status}`}>{STATUS_LABEL[status] || status}</span>
);

export const PriorityChip = ({ priority }) => (
    <span className={`adv-badge prio-${priority}`}>{priority} priority</span>
);

export const CATEGORY_LABEL = {
    study_habits: 'Study habits',
    attendance: 'Attendance',
    assignments: 'Assignments',
    quizzes: 'Quizzes',
    engagement: 'Engagement',
    time_management: 'Time management',
    course_content: 'Course content',
    support: 'Get support',
    wellbeing: 'Wellbeing',
};

export const PROVIDER_LABEL = {
    openai: 'OpenAI',
    azure_foundry: 'Azure AI Foundry',
    azure_openai: 'Azure OpenAI',
    custom: 'Custom endpoint',
    rule_based_fallback: 'Offline rule-based',
};

export const ProviderBadge = ({ meta }) => {
    if (!meta) return null;
    const ai = meta.provider !== 'rule_based_fallback';
    return (
        <span className={`adv-badge ${ai ? 'provider-ai' : 'provider-rules'}`} title={meta.fallback_reason || ''}>
            {ai ? `${PROVIDER_LABEL[meta.provider] || meta.provider} · ${meta.model}` : 'Offline rule-based'}
            {meta.cached ? ' · cached' : ''}
        </span>
    );
};

export const formatValue = (field, value, contract) => {
    if (value === null || value === undefined) return '—';
    const unit = contract?.fields?.[field]?.unit || '';
    if (unit === '%') return `${value}%`;
    if (unit === 'h/week') return `${value} h/week`;
    if (unit === '/100') return `${value}/100`;
    return String(value);
};
