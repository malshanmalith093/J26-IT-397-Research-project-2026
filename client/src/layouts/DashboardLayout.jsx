import React from 'react';
import Sidebar from '../components/Layout/Sidebar';
import Topbar from '../components/Layout/Topbar';
import { Outlet } from 'react-router-dom';

const DashboardLayout = ({ title }) => {
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const closeSidebar = () => setIsSidebarOpen(false);

    return (
        <div className="layout-wrapper">
            <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
            <div className="main-content">
                <Topbar pageTitle={title} onMenuClick={toggleSidebar} />
                <main className="page-container">
                    <Outlet />
                </main>
            </div>

            <style jsx>{`
                .layout-wrapper {
                    display: flex;
                    min-height: 100vh;
                    background-color: #F4F7FE; /* Softer, modern background */
                    padding: 16px;
                    gap: 16px;
                }

                .main-content {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    min-width: 0;
                    background-color: white;
                    border-radius: 28px;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.04);
                    overflow: hidden;
                    position: relative;
                }

                .page-container {
                    flex: 1;
                    padding: 24px 32px;
                    overflow-y: auto;
                    background-color: white;
                }

                @media (max-width: 1024px) {
                    .layout-wrapper {
                        padding: 0;
                        gap: 0;
                    }
                    .main-content {
                        border-radius: 0;
                    }
                    .page-container {
                        padding: 20px;
                    }
                }

                @media (max-width: 768px) {
                    .page-container {
                        padding: 15px;
                    }
                }
            `}</style>
        </div>
    );
};

export default DashboardLayout;
