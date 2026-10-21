/**
 * Dashboard Page
 * Displays a welcome message and quick overview for the student.
 * Includes the Component 2 advice alert (personalised warning alerts +
 * dashboard information, per the C2 proposal) when the student has advice.
 */
import React from 'react';
import AdviceAlert from '../components/Profiling/AdviceAlert';

const Dashboard = () => {
    return (
        <div className="dashboard-content">
            <div className="welcome-card">
                <h2>Welcome back to EduPulse!</h2>
                <p>Select a module from the sidebar to get started.</p>
            </div>

            <AdviceAlert />

            <style jsx>{`
                .welcome-card {
                    background: white;
                    padding: 40px;
                    border-radius: 20px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.03);
                    text-align: center;
                    margin-top: 20px;
                    transition: all 0.3s ease;
                }

                @media (max-width: 768px) {
                    .welcome-card {
                        padding: 30px 20px;
                    }
                    h2 {
                        font-size: 1.25rem;
                    }
                    p {
                        font-size: 0.9rem;
                    }
                }

                h2 {
                    color: var(--primary);
                    margin-bottom: 10px;
                }
                
                p {
                    color: var(--text-muted);
                }
            `}</style>
        </div>
    );
};

export default Dashboard;
