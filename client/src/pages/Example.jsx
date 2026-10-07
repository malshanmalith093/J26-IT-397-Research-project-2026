import React, { useState } from 'react';
import EmptyState from '../components/Groups/EmptyState';
import { MessageSquare, Users, Search } from 'lucide-react';
import Graph from '../components/Example/Graph';
import New from '../components/Example/New';

const Example = () => {

    const [activeTab, setActiveTab] = useState('student_graph');

    return (
        
        <div className="page-content">

            <div className="status-tabs">
                        <button className={`status-pill ${activeTab === 'student_graph' ? 'active teaching' : ''}`} onClick={() => setActiveTab('student_graph')}>
                            <Users size={18} />
                            Student Graph
                        </button>
                        <button className={`status-pill ${activeTab === 'data' ? 'active enrolled' : ''}`} onClick={() => setActiveTab('data')}>
                            <Search size={18} />
                            Data records
                        </button>
                    </div>
            {/* <EmptyState
                title="Testing the environment..."
                description="Connect with your peers in real-time. This feature is under active development."
                icon={MessageSquare}
            /> */}
              <div style={{ marginTop: '25px' }}>

                {activeTab === 'student_graph' && (
                    <Graph />
                )}

                {activeTab === 'data' && (
                    <New />
                )}

            </div>




             <style jsx>{`
                .groups-container {
                    padding: 30px 40px;
                    font-family: 'Inter', sans-serif;
                }

                @media (max-width: 1024px) {
                    .groups-container {
                        padding: 20px;
                    }
                }

                @media (max-width: 768px) {
                    .groups-container {
                        padding: 15px;
                    }
                    .filters-row {
                        flex-direction: column;
                        align-items: flex-start !important;
                        gap: 15px;
                    }
                    .search-box-premium {
                        width: 100%;
                        max-width: none;
                        order: 2;
                    }
                    .status-tabs {
                        width: 100%;
                        overflow-x: auto;
                        padding: 4px;
                        order: 1;
                    }
                    .header-actions {
                        width: 100%;
                        justify-content: space-between;
                        order: 3;
                    }
                    .groups-grid {
                        grid-template-columns: 1fr !important;
                    }
                }

                .groups-header-section {
                    margin-bottom: 30px;
                }

                .filters-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 20px;
                }

                .search-box-premium {
                    background: rgba(255, 255, 255, 0.7);
                    backdrop-filter: blur(10px);
                    border: 1px solid #e2e8f0;
                    border-radius: 30px;
                    display: flex;
                    align-items: center;
                    padding: 8px 16px;
                    gap: 10px;
                    flex: 1;
                    max-width: 400px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.02);
                    transition: all 0.3s ease;
                }

                .search-box-premium:focus-within {
                    background: white;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.05);
                    border-color: #20E3B2;
                }

                .search-icon {
                    color: #94a3b8;
                }

                .search-box-premium input {
                    border: none !important;
                    background: transparent !important;
                    width: 100% !important;
                    outline: none !important;
                    font-size: 0.95rem !important;
                    font-weight: 500 !important;
                    color: #1e293b !important;
                    padding: 0 !important;
                    box-shadow: none !important;
                }

                .status-tabs {
                    display: flex;
                    gap: 12px;
                    background: white;
                    padding: 8px;
                    border-radius: 30px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.02);
                }

                .status-pill {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 16px;
                    border: none;
                    background: transparent;
                    border-radius: 20px;
                    font-weight: 600;
                    font-size: 0.9rem;
                    color: #4a4a4a;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .status-pill .count {
                    background: #f0f0f0;
                    color: #666;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 0.8rem;
                    font-weight: 700;
                }

                .status-pill:hover {
                    background: #f8f9fa;
                }

                .status-pill.active.teaching {
                    background: #20E3B2; /* Vibrant mint green from reference */
                    color: white;
                }
                .status-pill.active.teaching .count {
                    background: rgba(255,255,255,0.9);
                    color: #20E3B2;
                }

                .status-pill.active.enrolled {
                    background: #1a1a1a;
                    color: white;
                }
                .status-pill.active.enrolled .count {
                    background: rgba(255,255,255,0.2);
                    color: white;
                }

                .status-pill.active.compliance {
                    background: #F2994A; /* Orange */
                    color: white;
                }
                .status-pill.active.compliance .count {
                    background: rgba(255,255,255,0.2);
                    color: white;
                }


                .header-actions {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                }

                .create-btn {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background-color: var(--primary);
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 12px;
                    font-weight: 600;
                    font-size: 0.95rem;
                    cursor: pointer;
                    transition: background-color 0.2s;
                    box-shadow: 0 4px 12px rgba(26, 79, 118, 0.2);
                }

                .create-btn:hover {
                    background-color: #153c5a;
                }

                .pagination-arrows {
                    display: flex;
                    gap: 8px;
                }

                .arrow-btn {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    border: none;
                    background: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    color: #1a1a1a;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                    transition: transform 0.2s;
                }

                .arrow-btn:hover {
                    transform: scale(1.05);
                }

                .groups-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 24px;
                }

                .group-card {
                    background: white;
                    border-radius: 20px;
                    overflow: hidden;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.03);
                    display: flex;
                    flex-direction: column;
                    height: 380px; /* Fixed height for uniformity */
                }

                .card-image-wrapper {
                    position: relative;
                    height: 180px;
                    width: 100%;
                }

                .card-image {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .card-type-badge {
                    position: absolute;
                    top: 12px;
                    right: 12px;
                    background: rgba(255, 255, 255, 0.9);
                    backdrop-filter: blur(4px);
                    padding: 8px;
                    border-radius: 50%;
                    color: #1a1a1a;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                }

                .card-content {
                    padding: 20px;
                    flex: 1;
                }

                .card-title {
                    font-size: 1.15rem;
                    font-weight: 700;
                    color: #1a1a1a;
                    margin: 0 0 10px 0;
                    line-height: 1.4;
                }

                .card-footer {
                    padding: 16px 20px;
                    border-top: 1px solid #f0f0f0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .footer-icons {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    color: #888;
                }

                .icon-group {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .icon-text {
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: #4a4a4a;
                }

                .card-action-btn {
                    background: none;
                    border: none;
                    color: #1a1a1a;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 4px;
                    border-radius: 50%;
                    transition: background 0.2s;
                }

                .card-action-btn:hover {
                    background: #f0f0f0;
                }

                /* Modal Styles */
                .modal-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.4);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }

                .modal-content {
                    background: white;
                    padding: 30px;
                    border-radius: 20px;
                    width: 100%;
                    max-width: 500px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                }

                .modal-content h3 {
                    margin-top: 0;
                    margin-bottom: 20px;
                    color: #1a1a1a;
                    font-size: 1.4rem;
                }

                .form-group {
                    margin-bottom: 20px;
                }

                .form-group label {
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 600;
                    color: #4a4a4a;
                    font-size: 0.9rem;
                }

                .form-group input, .form-group textarea {
                    width: 100%;
                    padding: 12px 16px;
                    border: 1px solid #e0e0e0;
                    border-radius: 12px;
                    font-family: inherit;
                    font-size: 0.95rem;
                    transition: border-color 0.2s;
                }

                .form-group input:focus, .form-group textarea:focus {
                    outline: none;
                    border-color: var(--primary);
                }

                .toggle-options {
                    display: flex;
                    gap: 10px;
                }

                .toggle-btn {
                    flex: 1;
                    padding: 10px;
                    border: 1px solid #e0e0e0;
                    background: white;
                    border-radius: 10px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: #666;
                    transition: all 0.2s;
                }

                .toggle-btn.active {
                    background: var(--primary);
                    color: white;
                    border-color: var(--primary);
                }

                .modal-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                    margin-top: 30px;
                }

                .cancel-btn, .submit-btn {
                    padding: 10px 20px;
                    border-radius: 10px;
                    font-weight: 600;
                    font-size: 0.95rem;
                    cursor: pointer;
                    border: none;
                }

                .cancel-btn {
                    background: #f0f0f0;
                    color: #4a4a4a;
                }

                .submit-btn {
                    background: var(--primary);
                    color: white;
                }
            `}</style>
        </div>

        
    );
};

export default Example;
