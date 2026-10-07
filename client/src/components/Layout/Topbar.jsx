import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { Bell, MessageSquare, ChevronDown, User, Menu, LogOut, Settings, UserCircle, LayoutDashboard, Users, Flag, Calendar, FileText, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Topbar = ({ pageTitle, onMenuClick }) => {
    const [user, setUser] = useState({ name: 'Loading...', role: '' });
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    const getPageIcon = (title) => {
        const t = title?.toLowerCase() || '';
        if (t.includes('dashboard')) return <LayoutDashboard size={18} />;
        if (t.includes('group')) return <Users size={18} />;
        if (t.includes('club')) return <Flag size={18} />;
        if (t.includes('session')) return <Calendar size={18} />;
        if (t.includes('note')) return <FileText size={18} />;
        if (t.includes('chat')) return <MessageSquare size={18} />;
        if (t.includes('help')) return <HelpCircle size={18} />;
        if (t.includes('profile')) return <UserCircle size={18} />;
        return null;
    };

    useEffect(() => {
        const fetchUser = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    let res;

            // try {
            //     // Try Node.js first
            //     res = await axios.get(
            //         `${import.meta.env.VITE_AUTH_BACKEND}/api/auth/me`,
            //         {
            //             headers: { 'x-auth-token': token },
            //             timeout: 3000
            //         }
            //     );

            //     console.log('User loaded from Node.js');

            // } catch (nodeError) {

            //     // If Node is unavailable, try Python
            //     if (!nodeError.response) {

            //         console.log('Node.js unavailable. Trying Python...');

            //         res = await axios.get(
            //             `${import.meta.env.VITE_PYTHON_BACKEND}/api/auth/me`,
            //             {
            //                 headers: { 'x-auth-token': token },
            //                 timeout: 3000
            //             }
            //         );

            //         console.log('User loaded from Python');

            //     } else {
            //         throw nodeError;
            //     }
            // }

            try {
    // Try Node.js first
    res = await axios.get(
        `${import.meta.env.VITE_AUTH_BACKEND}/api/auth/me`,
        {
            headers: { 'x-auth-token': token },
            timeout: 3000
        }
    );

    console.log('User loaded from Node.js');

} catch (nodeError) {

    // If Node fails for ANY reason, try Python
    console.log(
        'Node.js failed:',
        nodeError.response?.status || nodeError.message
    );

    console.log('Trying Python...');

    res = await axios.get(
        `${import.meta.env.VITE_PYTHON_BACKEND}/api/auth/me`,
        {
            headers: { 'x-auth-token': token },
            timeout: 3000
        }
    );

    console.log('User loaded from Python');
}
                    {/*// const res = await axios.get('http://localhost:8080/api/auth/me', {
                    //     headers: { 'x-auth-token': token }
                    // });*/}

                    setUser({
                        name: res.data.name || 'Student User',
                        role: res.data.role || 'Student'
                    });
                } catch (e) {
                    console.error('Error fetching real-time user data', e);
                }
            }
        };

        fetchUser();

        // Close dropdown when clicking outside
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    return (
        <header className="topbar">
            <div className="topbar-left">
                <button className="menu-toggle-btn" onClick={onMenuClick}>
                    <Menu size={24} />
                </button>
                <div className="page-title-pill">
                    <span className="page-icon">{getPageIcon(pageTitle)}</span>
                    <h1>{pageTitle}</h1>
                </div>
            </div>

            <div className="topbar-right">
                <div className="icon-pill ms-chats" title="Chats" onClick={() => navigate('/chats')}>
                    <MessageSquare size={20} className="icon" strokeWidth={2.5} />
                </div>

                <div className="profile-container" ref={dropdownRef}>
                    <div
                        className={`profile-pill ${showDropdown ? 'active' : ''}`}
                        onClick={() => setShowDropdown(!showDropdown)}
                    >
                        <div className="avatar">
                            <User size={20} className="default-user-icon" />
                        </div>
                        <span className="user-name">{user.name}</span>
                        <ChevronDown size={16} className={`dropdown-icon ${showDropdown ? 'rotate' : ''}`} strokeWidth={2.5} />
                    </div>

                    {showDropdown && (
                        <div className="dropdown-menu">
                            <div className="dropdown-header">
                                <span className="d-name">{user.name}</span>
                                <span className="d-role">{user.role}</span>
                            </div>
                            <div className="dropdown-divider"></div>
                            <button className="dropdown-item" onClick={() => { navigate('/profile'); setShowDropdown(false); }}>
                                <UserCircle size={18} />
                                <span>My Profile</span>
                            </button>
                            <div className="dropdown-divider"></div>
                            <button className="dropdown-item logout" onClick={handleLogout}>
                                <LogOut size={18} />
                                <span>Log Out</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
                .topbar {
                    height: 100px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 40px;
                    background-color: transparent;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    transition: all 0.3s ease;
                }

                .topbar-left {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }

                .menu-toggle-btn {
                    display: none;
                    background: white;
                    border: none;
                    width: 44px;
                    height: 44px;
                    border-radius: 14px;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.02);
                    color: #4a4a4a;
                }

                @media (max-width: 1024px) {
                    .topbar {
                        padding: 0 20px;
                        height: 80px;
                    }
                    .menu-toggle-btn {
                        display: flex;
                    }
                    .page-title-pill {
                        padding: 8px 16px !important;
                    }
                    .page-title-pill h1 {
                        font-size: 1.1rem !important;
                    }
                }

                @media (max-width: 768px) {
                    .user-name, .ms-chats {
                        display: none;
                    }
                    .profile-pill {
                        padding: 4px !important;
                        gap: 0 !important;
                    }
                    .dropdown-icon {
                        display: none;
                    }
                }

                .page-title-pill {
                    background: white;
                    padding: 12px 24px;
                    border-radius: 16px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.02);
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .page-icon {
                    display: flex;
                    align-items: center;
                    color: #1a1a1a;
                }

                .page-title-pill h1 {
                    font-size: 1.25rem;
                    color: #1a1a1a;
                    margin: 0;
                    font-weight: 700;
                }

                .topbar-right {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }

                .icon-pill {
                    position: relative;
                    background: white;
                    width: 44px;
                    height: 44px;
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.02);
                    transition: all 0.2s ease;
                }

                .icon-pill:hover {
                    transform: translateY(-2px);
                    background: #f8f9fa;
                }

                .icon {
                    color: #4a4a4a;
                    display: block;
                }

                .badge {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    width: 6px;
                    height: 6px;
                    background-color: #FF3B30;
                    border-radius: 50%;
                    border: 2px solid white;
                }

                .profile-container {
                    position: relative;
                }

                .profile-pill {
                    display: flex;
                    align-items: center;
                    background: white;
                    padding: 6px 16px 6px 6px;
                    border-radius: 24px;
                    gap: 12px;
                    cursor: pointer;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.02);
                    transition: all 0.2s ease;
                    user-select: none;
                }

                .profile-pill:hover, .profile-pill.active {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                }

                .avatar {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    background-color: #f0f0f0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .default-user-icon {
                    color: #888;
                }

                .user-name {
                    font-weight: 600;
                    font-size: 0.95rem;
                    color: #1a1a1a;
                }

                .dropdown-icon {
                    color: #1a1a1a;
                    margin-left: 4px;
                    transition: transform 0.2s ease;
                }

                .dropdown-icon.rotate {
                    transform: rotate(180deg);
                }

                .dropdown-menu {
                    position: absolute;
                    top: calc(100% + 12px);
                    right: 0;
                    width: 220px;
                    background: white;
                    border-radius: 20px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.1);
                    padding: 12px;
                    z-index: 1100;
                    animation: slideDown 0.2s ease-out;
                }

                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .dropdown-header {
                    padding: 8px 12px 12px;
                    display: flex;
                    flex-direction: column;
                }

                .d-name {
                    font-weight: 700;
                    color: #1a1a1a;
                    font-size: 0.95rem;
                }

                .d-role {
                    font-size: 0.8rem;
                    color: #888;
                    margin-top: 2px;
                }

                .dropdown-divider {
                    height: 1px;
                    background: #f0f0f0;
                    margin: 8px 0;
                }

                .dropdown-item {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 10px 12px;
                    border: none;
                    background: none;
                    border-radius: 12px;
                    color: #444;
                    font-size: 0.9rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .dropdown-item:hover {
                    background: #F4F7FE;
                    color: var(--primary);
                }

                .dropdown-item.logout {
                    color: #FF3B30;
                }

                .dropdown-item.logout:hover {
                    background: #FFF5F5;
                }
            `}</style>
        </header>
    );
};

export default Topbar;
