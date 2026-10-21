/**
 * Component 2 – Personalised Advice (PP1)
 *
 * Students: see only their own advice (status, personalised recommendations with
 *           the main reason for each, improvement guide).
 * Admin / Moderator: send advice to students, using dummy Component 1 risk data
 *           until the real Component 1 model is connected.
 */
import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import MyAdvice from '../components/Profiling/MyAdvice';
import SendAdvicePanel from '../components/Profiling/SendAdvicePanel';
import { whoAmI, getContract, errorMessage } from '../components/Profiling/adviceApi';
import '../components/Profiling/profiling.css';

const Profiling = () => {
    const [me, setMe] = useState(null);
    const [contract, setContract] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        Promise.all([whoAmI(), getContract()])
            .then(([user, c]) => {
                setMe(user);
                setContract(c);
            })
            .catch((err) => setError(errorMessage(err)));
    }, []);

    if (error) {
        return (
            <div className="page-content adv-page">
                <div className="adv-alert error">
                    <strong>Could not load your advice.</strong> {error}
                </div>
            </div>
        );
    }

    if (!me) {
        return (
            <div className="page-content adv-page">
                <div className="adv-alert info"><Loader2 size={16} className="spin" /> Loading…</div>
            </div>
        );
    }

    return (
        <div className="page-content adv-page">
            {me.is_staff ? <SendAdvicePanel contract={contract} /> : <MyAdvice contract={contract} />}
        </div>
    );
};

export default Profiling;
