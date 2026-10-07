import React from 'react';
import { motion } from 'framer-motion';

const SkeletonGroup = () => {
    return (
        <motion.div
            className="group-card-skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <div className="skeleton-image shunt" />
            <div className="skeleton-content">
                <div className="skeleton-title shunt" />
                <div className="skeleton-text shunt" />
                <div className="skeleton-text short shunt" />
            </div>
            <div className="skeleton-footer">
                <div className="skeleton-icon shunt" />
                <div className="skeleton-icon shunt" />
                <div className="skeleton-btn shunt" />
            </div>

            <style jsx>{`
                .group-card-skeleton {
                    background: white;
                    border-radius: 20px;
                    overflow: hidden;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.03);
                    display: flex;
                    flex-direction: column;
                    height: 380px;
                }

                .skeleton-image {
                    height: 180px;
                    width: 100%;
                    background: #f0f0f0;
                }

                .skeleton-content {
                    padding: 20px;
                    flex: 1;
                }

                .skeleton-title {
                    height: 24px;
                    width: 70%;
                    background: #f0f0f0;
                    margin-bottom: 12px;
                    border-radius: 4px;
                }

                .skeleton-text {
                    height: 16px;
                    width: 90%;
                    background: #f0f0f0;
                    margin-bottom: 8px;
                    border-radius: 4px;
                }

                .skeleton-text.short {
                    width: 50%;
                }

                .skeleton-footer {
                    padding: 16px 20px;
                    border-top: 1px solid #f0f0f0;
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }

                .skeleton-icon {
                    height: 20px;
                    width: 40px;
                    background: #f0f0f0;
                    border-radius: 10px;
                }

                .skeleton-btn {
                    margin-left: auto;
                    height: 30px;
                    width: 30px;
                    background: #f0f0f0;
                    border-radius: 50%;
                }

                .shunt {
                    position: relative;
                    overflow: hidden;
                }

                .shunt::after {
                    content: "";
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(
                        90deg,
                        rgba(255, 255, 255, 0) 0,
                        rgba(255, 255, 255, 0.4) 50%,
                        rgba(255, 255, 255, 0) 100%
                    );
                    animation: shimmer 1.5s infinite;
                }

                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
            `}</style>
        </motion.div>
    );
};

export default SkeletonGroup;
