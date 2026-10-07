import React from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';

const EmptyState = ({ title, description, icon: Icon = Search, onClearSearch }) => {
    return (
        <motion.div
            className="empty-state-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="empty-state-icon-wrapper">
                <Icon size={48} className="empty-state-icon" />
            </div>
            <h3 className="empty-state-title">{title}</h3>
            <p className="empty-state-description">{description}</p>
            {onClearSearch && (
                <button className="clear-search-btn" onClick={onClearSearch}>
                    Clear Search
                </button>
            )}

            <style jsx>{`
                .empty-state-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 60px 20px;
                    text-align: center;
                    grid-column: 1 / -1; /* Fill the entire grid width */
                    background: rgba(255, 255, 255, 0.5);
                    border-radius: 20px;
                    border: 1px dashed #e2e8f0;
                    margin-top: 20px;
                }

                .empty-state-icon-wrapper {
                    width: 100px;
                    height: 100px;
                    background: #f8fafc;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 24px;
                    color: #94a3b8;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.02);
                }

                .empty-state-title {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: #1a1a1a;
                    margin-bottom: 12px;
                }

                .empty-state-description {
                    font-size: 1rem;
                    color: #64748b;
                    max-width: 400px;
                    line-height: 1.6;
                    margin-bottom: 30px;
                }

                .clear-search-btn {
                    background: #1a1a1a;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .clear-search-btn:hover {
                    background: #333;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
            `}</style>
        </motion.div>
    );
};

export default EmptyState;
