import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, UserCircle, HelpCircle, LogOut, Flag, Calendar, FileText, MessageSquare, X } from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    return (
        <>
            {/* Overlay for mobile */}
            {isOpen && <div className="sidebar-overlay" onClick={onClose} />}

            <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <NavLink to="/dashboard" style={{ textDecoration: 'none' }} onClick={onClose}>
                        <img src="/logo1.png" alt="Logo" className="sidebar-logo" style={{ cursor: 'pointer' }} />
                    </NavLink>
                    <button className="mobile-close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <nav className="sidebar-nav">
                    <div className="nav-section">
                        <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'} onClick={onClose}>
                            <LayoutDashboard size={20} />
                            <span>Dashboard</span>
                        </NavLink>
                        <NavLink to="/Example" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'} onClick={onClose}>
                            <Users size={20} />
                            <span>My Experiments</span>
                        </NavLink>
                    
                        <NavLink to="/OptimalPath" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'} onClick={onClose}>
                            <Flag size={20} />
                            <span>Personalized plan</span>
                        </NavLink>
                        <NavLink to="/RiskAssessment" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'} onClick={onClose}>
                            <Calendar size={20} />
                            <span>Risk Assessment</span>
                        </NavLink>
                        <NavLink to="/Profiling" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'} onClick={onClose}>
                            <FileText size={20} />
                            <span>Behavioral Profile</span>
                        </NavLink>
                        <NavLink to="/Resources" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'} onClick={onClose}>
                            <MessageSquare size={20} />
                            <span>Resource Recommendation</span>
                        </NavLink>
                        <NavLink to="/help" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'} onClick={onClose}>
                            <HelpCircle size={20} />
                            <span>Help</span>
                        </NavLink>
                        <NavLink to="/profile" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'} onClick={onClose}>
                            <UserCircle size={20} />
                            <span>Profile</span>
                        </NavLink>
                    </div>
                </nav>

                <div className="sidebar-footer">
                    <button className="logout-btn" onClick={handleLogout}>
                        <LogOut size={20} />
                        <span>Log out</span>
                    </button>
                </div>

                <style jsx>{`
                    .sidebar {
                        width: 260px;
                        background-color: white;
                        height: calc(100vh - 32px);
                        display: flex;
                        flex-direction: column;
                        border-radius: 28px;
                        position: sticky;
                        top: 16px;
                        z-index: 1000;
                        transition: transform 0.3s ease;
                        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.03);
                    }

                    .sidebar-overlay {
                        display: none;
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(0, 0, 0, 0.4);
                        backdrop-filter: blur(4px);
                        z-index: 999;
                    }

                    .mobile-close-btn {
                        display: none;
                        background: none;
                        border: none;
                        color: var(--text-muted);
                        cursor: pointer;
                        padding: 8px;
                    }

                    @media (max-width: 1024px) {
                        .sidebar {
                            position: fixed;
                            left: 0;
                            transform: translateX(-100%);
                            background-color: white;
                            height: 100vh;
                            top: 0;
                            border-radius: 0;
                        }

                        .sidebar.open {
                            transform: translateX(0);
                        }

                        .sidebar-overlay {
                            display: block;
                        }

                        .mobile-close-btn {
                            display: block;
                        }

                        .sidebar-header {
                            justify-content: space-between;
                        }
                    }

                    .sidebar-header {
                        height: 100px;
                        display: flex;
                        align-items: center;
                        padding: 0 20px;
                    }

                    .sidebar-logo {
                        height: 70px; /* Reduced for better fit */
                        width: auto;
                        object-fit: contain;
                        margin-left: 10px;
                        user-select: none; /* Prevent selection/caret */
                        -webkit-user-drag: none;
                    }

                    .sidebar-nav {
                        flex: 1;
                        padding: 0 15px;
                    }

                    .nav-item {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        padding: 12px 20px;
                        margin-bottom: 8px;
                        border-radius: 12px;
                        color: var(--text-muted);
                        text-decoration: none;
                        font-weight: 500;
                        font-size: 0.95rem;
                        transition: all 0.2s;
                    }

                    .nav-item:hover {
                        background-color: #f8f9fa;
                        color: var(--primary);
                    }

                    .nav-item.active {
                        background-color: var(--border-color);
                        color: var(--primary);
                        font-weight: 600;
                        box-shadow: inset 2px 2px 5px rgba(0,0,0,0.05);
                    }

                    .sidebar-footer {
                        padding: 20px;
                    }

                    .logout-btn {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        width: 100%;
                        padding: 12px 20px;
                        background: none;
                        border: none;
                        color: #EB5757;
                        font-weight: 500;
                        font-size: 0.95rem;
                        cursor: pointer;
                        border-radius: 12px;
                        transition: all 0.2s;
                        font-family: var(--font-body);
                    }

                    .logout-btn:hover {
                        background-color: #FCE8E8;
                    }
                `}</style>
            </aside>
        </>
    );
};

export default Sidebar;
