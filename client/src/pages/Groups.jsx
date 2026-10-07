/**
 * Groups Discovery Page
 * Allows users to browse available study groups and create new ones.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Plus, Users, Calendar, Lock, Unlock, ChevronRight, ChevronLeft, CalendarDays, Bell, MoreHorizontal, Search } from 'lucide-react';

import SkeletonGroup from '../components/Groups/SkeletonGroup';
import EmptyState from '../components/Groups/EmptyState';

const Groups = () => {
    const navigate = useNavigate();
    const [userRole, setUserRole] = useState('student');
    const [activeTab, setActiveTab] = useState('my_groups');
    const [currentUserId, setCurrentUserId] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newGroupData, setNewGroupData] = useState({
        name: '',
        description: '',
        rules: '',
        coverImage: '',
        isPublic: true
    });
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = async () => {
        setLoading(true);
        setError('');
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/auth');
            return;
        }

        try {
            // Start both requests in parallel
            const [userRes, groupsRes] = await Promise.all([
                axios.get('http://localhost:5000/api/auth/me', {
                    headers: { 'x-auth-token': token }
                }),
                axios.get('http://localhost:5000/api/groups', {
                    headers: { 'x-auth-token': token }
                })
            ]);

            // Handle User Data
            if (userRes.data) {
                if (userRes.data.role) {
                    setUserRole(userRes.data.role.toLowerCase());
                }
                if (userRes.data._id) {
                    setCurrentUserId(userRes.data._id);
                }
            }

            // Handle Groups Data
            let filteredGroups = groupsRes.data;

            if (activeTab === 'my_groups') {
                filteredGroups = groupsRes.data.filter(g => g.isApprovedMember);
            } else if (activeTab === 'public') {
                filteredGroups = groupsRes.data.filter(g => !g.isApprovedMember);
            }

            setGroups(filteredGroups);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to load groups. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [activeTab, navigate]);

    const canCreateGroup = userRole === 'admin' || userRole === 'moderator';

    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const handleCreateGroup = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            console.log('Sending token:', token);
            console.log('Sending payload:', newGroupData);
            await axios.post('http://localhost:5000/api/groups', newGroupData, {
                headers: { 'x-auth-token': token }
            });
            setShowCreateModal(false);
            setNewGroupData({ name: '', description: '', rules: '', coverImage: '', isPublic: true });
            setImagePreview(null);
            fetchData(); // Refresh the list
        } catch (err) {
            console.error('Error creating group:', err);
            if (err.response) {
                console.error('Response data:', err.response.data);
                console.error('Response status:', err.response.status);
            }
            alert(`Failed to create group: ${err.response?.data?.details || err.response?.data?.message || err.message}`);
        }
    };

    const [imagePreview, setImagePreview] = useState(null);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setNewGroupData({ ...newGroupData, coverImage: reader.result });
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="groups-container">
            {/* Header Section */}
            <div className="groups-header-section">
                <div className="filters-row">
                    <div className="status-tabs">
                        <button className={`status-pill ${activeTab === 'my_groups' ? 'active teaching' : ''}`} onClick={() => setActiveTab('my_groups')}>
                            <Users size={18} />
                            My Groups
                        </button>
                        <button className={`status-pill ${activeTab === 'public' ? 'active enrolled' : ''}`} onClick={() => setActiveTab('public')}>
                            <Search size={18} />
                            Discover Groups
                        </button>
                    </div>

                    <div className="search-box-premium">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search groups..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="header-actions">
                        {canCreateGroup && (
                            <button className="create-btn" onClick={() => setShowCreateModal(true)}>
                                <Plus size={18} />
                                Create Group
                            </button>
                        )}
                        <div className="pagination-arrows">
                            <button className="arrow-btn"><ChevronLeft size={20} /></button>
                            <button className="arrow-btn"><ChevronRight size={20} /></button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid Section */}
            <div className="groups-grid">
                {loading ? (
                    Array(6).fill(0).map((_, i) => <SkeletonGroup key={i} />)
                ) : error ? (
                    <p className="error-text">{error}</p>
                ) : groups.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
                    <EmptyState
                        title="No groups found"
                        description={`We couldn't find any groups matching "${searchTerm}". Try checking your spelling or using different keywords.`}
                        onClearSearch={() => setSearchTerm('')}
                    />
                ) : (
                    groups
                        .filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map((group) => (
                            <motion.div
                                key={group._id}
                                className="group-card"
                                onClick={() => navigate(`/groups/${group._id}`)}
                                style={{ cursor: 'pointer' }}
                                whileHover={{ y: -5 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="card-image-wrapper">
                                    {/* Use provided coverImage or default image */}
                                    <img src={group.coverImage || "https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80"} alt={group.name} className="card-image" />
                                    <div className="card-type-badge" title={group.isPublic ? "Public Group" : "Private Group"}>
                                        {group.isPublic ? <Unlock size={16} /> : <Lock size={16} />}
                                    </div>
                                </div>

                                <div className="card-content">
                                    <h3 className="card-title">{group.name}</h3>
                                    {group.description && <p className="card-description">{group.description}</p>}
                                </div>

                                <div className="card-footer">
                                    <div className="footer-icons">
                                        <span className="icon-group" title="Created">
                                            <CalendarDays size={16} />
                                        </span>
                                        <span className="icon-group" title="Members">
                                            <Users size={16} />
                                            <span className="icon-text">{group.memberCount || 0}</span>
                                        </span>
                                        <span className="icon-group" title="Resources">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                                            <span className="icon-text">{group.resourceCount || 0}</span>
                                        </span>
                                    </div>
                                    <button className="card-action-btn" onClick={() => navigate(`/groups/${group._id}`)}>
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            </motion.div>
                        ))
                )}
            </div>

            {/* Create Group Modal */}
            {showCreateModal && (
                <div className="modal-overlay">
                    <motion.div
                        className="modal-content"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <h3>Create New Group</h3>
                        <form onSubmit={handleCreateGroup}>
                            <div className="form-group">
                                <label>Group Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newGroupData.name}
                                    onChange={(e) => setNewGroupData({ ...newGroupData, name: e.target.value })}
                                    placeholder="e.g. First line manager training"
                                />
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    rows="2"
                                    required
                                    value={newGroupData.description}
                                    onChange={(e) => setNewGroupData({ ...newGroupData, description: e.target.value })}
                                    placeholder="Brief description of the group's purpose..."
                                />
                            </div>
                            <div className="form-group">
                                <label>Group Rules</label>
                                <textarea
                                    rows="2"
                                    required
                                    value={newGroupData.rules}
                                    onChange={(e) => setNewGroupData({ ...newGroupData, rules: e.target.value })}
                                    placeholder="Enter group rules (e.g., Be respectful, No spam)..."
                                />
                            </div>
                            <div className="form-group">
                                <label>Cover Image (Optional)</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                />
                                {imagePreview && (
                                    <div style={{ marginTop: '10px', borderRadius: '10px', overflow: 'hidden', height: '120px' }}>
                                        <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                )}
                            </div>
                            <div className="form-group privacy-toggle">
                                <label>Privacy Setting</label>
                                <div className="toggle-options">
                                    <button
                                        type="button"
                                        className={`toggle-btn ${newGroupData.isPublic ? 'active' : ''}`}
                                        onClick={() => setNewGroupData({ ...newGroupData, isPublic: true })}
                                    >
                                        <Unlock size={16} /> Public Group
                                    </button>
                                    <button
                                        type="button"
                                        className={`toggle-btn ${!newGroupData.isPublic ? 'active' : ''}`}
                                        onClick={() => setNewGroupData({ ...newGroupData, isPublic: false })}
                                    >
                                        <Lock size={16} /> Private Group
                                    </button>
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={() => setShowCreateModal(false)}>Cancel</button>
                                <button type="submit" className="submit-btn">Create Group</button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

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

export default Groups;
