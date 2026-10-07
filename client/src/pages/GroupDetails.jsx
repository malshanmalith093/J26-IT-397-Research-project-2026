/**
 * Group Details Page
 * This is the primary feature area of the application.
 * It handles the feed, announcements, resources, and member management.
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Lock, Unlock, Users, ChevronLeft, CheckCircle, CalendarDays, Clock, FileText, Trash2, BookOpen, MapPin, AlignLeft, Link as LinkIcon, Calendar, Zap, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const DeadlineCountdown = ({ dueDate }) => {
    const calculateTimeLeft = () => {
        if (!dueDate) return { expired: true, text: 'No date' };
        const difference = new Date(dueDate) - new Date();
        let timeLeft = {};

        if (difference > 0) {
            timeLeft = {
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
                seconds: Math.floor((difference / 1000) % 60)
            };
            return { expired: false, ...timeLeft };
        }
        return { expired: true, text: 'Expired' };
    };

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        if (timeLeft.expired) return;

        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(timer);
    }, [dueDate]);

    if (timeLeft.expired) {
        return <span className="timer-badge expired">{timeLeft.text || 'Expired'}</span>;
    }

    return (
        <span className="timer-badge active">
            {timeLeft.days > 0 && `${timeLeft.days}d `}
            {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s left
        </span>
    );
};

const GroupDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [group, setGroup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [activeTab, setActiveTab] = useState('feed');
    const [newResource, setNewResource] = useState({ type: 'File', title: '', content: '', dueDate: '' });
    const [showResourceForm, setShowResourceForm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        const fetchGroupDetails = async () => {
            const token = localStorage.getItem('token');
            try {
                // Fetch current user details
                const userRes = await axios.get('http://localhost:5000/api/auth/me', {
                    headers: { 'x-auth-token': token }
                });
                setCurrentUser(userRes.data);

                // Fetch group details
                const res = await axios.get(`http://localhost:5000/api/groups/${id}`, {
                    headers: { 'x-auth-token': token }
                });
                setGroup(res.data);
            } catch (err) {
                console.error(err);
                if (err.response?.status === 403 || err.response?.status === 404) {
                    setError('You do not have permission to view this group or it does not exist.');
                } else {
                    setError('Failed to fetch group details.');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchGroupDetails();
    }, [id]);

    const handleJoinGroup = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`http://localhost:5000/api/groups/${id}/join`, {}, {
                headers: { 'x-auth-token': token }
            });
            alert(res.data.message);
            // Refresh to update UI if joined instantly or if pending
            window.location.reload();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || 'Failed to join group');
        }
    };

    const handleApproveMember = async (userId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:5000/api/groups/${id}/approve/${userId}`, {}, {
                headers: { 'x-auth-token': token }
            });
            setGroup(prev => ({
                ...prev,
                members: prev.members.map(m => m.user._id === userId ? { ...m, status: 'Approved' } : m)
            }));
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to approve member');
        }
    };

    const handleRemoveMember = async (userId) => {
        if (!window.confirm("Are you sure you want to remove this member?")) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:5000/api/groups/${id}/members/${userId}`, {
                headers: { 'x-auth-token': token }
            });
            setGroup(prev => ({
                ...prev,
                members: prev.members.filter(m => m.user._id !== userId)
            }));
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to remove member');
        }
    };

    const handleAssignRole = async (userId, role) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:5000/api/groups/${id}/role/${userId}`, { role }, {
                headers: { 'x-auth-token': token }
            });
            setGroup(prev => ({
                ...prev,
                members: prev.members.map(m => m.user._id === userId ? { ...m, role } : m)
            }));
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update role');
        }
    };

    const handleResourceFile = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Store original filename as title if not set
            const newTitle = newResource.title || file.name;
            const reader = new FileReader();
            reader.onloadend = () => {
                setNewResource({ ...newResource, title: newTitle, content: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAddResource = async (e, overrideResource = null) => {
        if (e) e.preventDefault();
        const resourceToSave = overrideResource || newResource;
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`http://localhost:5000/api/groups/${id}/resources`, resourceToSave, {
                headers: { 'x-auth-token': token }
            });
            setGroup(prev => ({
                ...prev,
                resources: res.data.resources
            }));
            setNewResource({ type: 'Link', title: '', content: '', dueDate: '', subject: '', time: '', location: '', agenda: '', tags: '', joinLink: '', expiryDate: '' });
            setShowResourceForm(false);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to add resource');
        }
    };

    const handleDeleteResource = async (resourceId) => {
        if (!window.confirm("Delete this resource?")) return;
        try {
            const token = localStorage.getItem('token');
            const res = await axios.delete(`http://localhost:5000/api/groups/${id}/resources/${resourceId}`, {
                headers: { 'x-auth-token': token }
            });
            setGroup(prev => ({
                ...prev,
                resources: res.data.resources
            }));
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete resource');
        }
    };

    const handleDeleteGroup = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:5000/api/groups/${id}`, {
                headers: { 'x-auth-token': token }
            });
            alert("Group successfully deleted");
            navigate('/groups');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete group');
            setShowDeleteConfirm(false);
        }
    };

    if (loading) return <div className="loader">Loading group...</div>;
    if (error) return <div className="error-screen"><p>{error}</p><button className="btn back" onClick={() => navigate('/groups')}>Back to Groups</button></div>;
    if (!group || !currentUser) return null;

    // Check membership
    let membershipStatus = 'None'; // 'None', 'Pending', 'Approved'
    let userGroupRole = 'None';
    const memberRecord = (group.members || []).find(m =>
        (m.user?._id === currentUser._id || m.user === currentUser._id)
    );

    if (memberRecord) {
        membershipStatus = memberRecord.status || 'None';
        userGroupRole = memberRecord.role || 'None';
    }

    // Admins are technically approved for view
    const isAdmin = currentUser?.role?.toLowerCase() === 'admin' || currentUser?.globalRole?.toLowerCase() === 'admin';
    const isApprovedMember = membershipStatus === 'Approved' || isAdmin;
    const canManageGroup = (membershipStatus === 'Approved' && userGroupRole === 'Moderator') || isAdmin;

    return (
        <div className="group-details-container">
            <button className="back-link" onClick={() => navigate('/groups')}>
                <ChevronLeft size={20} /> Back to Groups
            </button>

            {/* Header / Cover Area */}
            <div className="group-cover-area">
                <img
                    src={group.coverImage || "https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"}
                    alt={group.name}
                    className="cover-image"
                />

                {/* Floating Badges in Corner */}
                <div className="corner-badges">
                    <span className="badge-pill privacy-pill">
                        {group.isPublic ? <><Unlock size={14} /> Public</> : <><Lock size={14} /> Private</>}
                    </span>
                    {group.createdAt && (
                        <span className="badge-pill date-pill">
                            <CalendarDays size={14} />
                            {new Date(group.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Colombo' })}
                        </span>
                    )}
                </div>

                <div className="cover-overlay">
                    <div className="cover-content">
                        <h1 className="group-title">{group.name}</h1>
                        <p className="group-desc">{group.description}</p>
                        {isAdmin && (
                            <div className="admin-actions">
                                {!showDeleteConfirm ? (
                                    <button className="btn btn-danger-soft" onClick={() => setShowDeleteConfirm(true)}>
                                        <Trash2 size={16} /> Delete Group
                                    </button>
                                ) : (
                                    <div className="delete-confirm-wrapper">
                                        <span className="confirm-text">Are you sure?</span>
                                        <button className="btn btn-danger btn-sm" onClick={handleDeleteGroup}>Delete</button>
                                        <button className="btn btn-secondary btn-sm" onClick={() => setShowDeleteConfirm(false)}>No</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Unjoined Preview State */}
            {!isApprovedMember && (
                <div className="preview-container">
                    <div className="preview-card">
                        <h2>About this Group</h2>
                        <div className="rules-section">
                            <h3>Group Rules</h3>
                            <p>{group.rules || "No specific rules provided. Be respectful."}</p>
                        </div>

                        <div className="join-action">
                            {membershipStatus === 'Pending' ? (
                                <button className="btn btn-pending" disabled>
                                    <CheckCircle size={18} /> Request Pending...
                                </button>
                            ) : (
                                <button className="btn btn-primary" onClick={handleJoinGroup}>
                                    {group.isPublic ? 'Join Group' : 'Request to Join'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Joined State (Inner Tabbed Interface) */}
            {isApprovedMember && (
                <div className="inner-layout">
                    <div className="tabs">
                        <button className={`tab ${activeTab === 'feed' ? 'active' : ''}`} onClick={() => setActiveTab('feed')}>Feed</button>
                        <button className={`tab ${activeTab === 'announcements' ? 'active' : ''}`} onClick={() => { setActiveTab('announcements'); setShowResourceForm(false); setNewResource({ type: 'Link', title: '', content: '', dueDate: '', subject: '', time: '', location: '', agenda: '', tags: '', joinLink: '', expiryDate: '' }); }}>Announcements</button>
                        <button className={`tab ${activeTab === 'deadlines' ? 'active' : ''}`} onClick={() => { setActiveTab('deadlines'); setShowResourceForm(false); setNewResource({ type: 'Deadline', title: '', content: '', dueDate: '' }); }}>Deadlines</button>
                        <button className={`tab ${activeTab === 'resources' ? 'active' : ''}`} onClick={() => { setActiveTab('resources'); setShowResourceForm(false); setNewResource({ type: 'File', title: '', content: '', dueDate: '' }); }}>Files</button>
                        <button className={`tab ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>Members</button>
                    </div>

                    <div className="tab-contents">
                        {activeTab === 'feed' && (
                            <div className="feed-dashboard-v3">
                                {/* Compact Stat Row */}
                                <div className="stats-row-v3">
                                    <div className="stat-pill-v3 members">
                                        <Users size={18} />
                                        <div className="pill-content">
                                            <span className="pill-value">{group.members?.length || 0}</span>
                                            <span className="pill-label">Members</span>
                                        </div>
                                    </div>
                                    <div className="stat-pill-v3 updates">
                                        <BookOpen size={18} />
                                        <div className="pill-content">
                                            <span className="pill-value">{(group.resources || []).filter(r => r.type === 'Link').length}</span>
                                            <span className="pill-label">Updates</span>
                                        </div>
                                    </div>
                                    <div className="stat-pill-v3 tasks">
                                        <Clock size={18} />
                                        <div className="pill-content">
                                            <span className="pill-value">{(group.resources || []).filter(r => r.type === 'Deadline' && new Date(r.dueDate) > new Date()).length}</span>
                                            <span className="pill-label">Active Tasks</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="dashboard-grid-v3">
                                    {/* Latest Announcement Spotlight */}
                                    <div className="dashboard-panel announce-panel">
                                        <div className="panel-header">
                                            <div className="panel-title-v3">
                                                <Zap size={16} /> Latest Announcement
                                            </div>
                                            <span className="mini-badge-v3">New</span>
                                        </div>
                                        {(() => {
                                            const latest = [...(group.resources || [])]
                                                .filter(r => r.type === 'Link')
                                                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

                                            if (!latest) return <div className="panel-empty-v3">Stay tuned for updates!</div>;

                                            let data = null;
                                            if (latest.content.startsWith('{')) {
                                                try { data = JSON.parse(latest.content); } catch (e) { }
                                            }

                                            return (
                                                <div className="panel-card-inner-v3 announce">
                                                    <div className="card-meta-row">
                                                        <span className="meta-author">Admin • SLIIT Connect</span>
                                                        <span className="meta-time">{new Date(latest.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                    <h3 className="card-title-v3">{latest.title}</h3>
                                                    <div className="card-desc-v3" dangerouslySetInnerHTML={{ __html: data?.description || latest.content }} />
                                                    <div className="card-actions-v3">
                                                        {data?.joinLink && (
                                                            <button className="btn-v3-primary" onClick={() => window.open(data.joinLink.startsWith('http') ? data.joinLink : `https://${data.joinLink}`, '_blank')}>
                                                                Join <ArrowUpRight size={14} />
                                                            </button>
                                                        )}
                                                        <button className="btn-v3-outline" onClick={() => setActiveTab('announcements')}>Feed</button>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    {/* Upcoming Deadline Spotlight */}
                                    <div className="dashboard-panel task-panel">
                                        <div className="panel-header">
                                            <div className="panel-title-v3">
                                                <CalendarDays size={16} /> Urgent Priority
                                            </div>
                                            <span className="mini-badge-v3 urgent">Urgent</span>
                                        </div>
                                        {(() => {
                                            const next = [...(group.resources || [])]
                                                .filter(r => r.type === 'Deadline' && new Date(r.dueDate) > new Date())
                                                .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];

                                            if (!next) return <div className="panel-empty-v3">All tasks up to date.</div>;

                                            return (
                                                <div className="panel-card-inner-v3 task">
                                                    <div className="task-header-v3">
                                                        <h3 className="card-title-v3">{next.title}</h3>
                                                        <span className="task-type-v3">{next.content}</span>
                                                    </div>
                                                    <div className="countdown-wrap-v3">
                                                        <DeadlineCountdown dueDate={next.dueDate} />
                                                    </div>
                                                    <div className="task-footer-v3">
                                                        <div className="due-info">
                                                            <Clock size={12} /> {new Date(next.dueDate).toLocaleDateString()}
                                                        </div>
                                                        <button className="btn-v3-outline" onClick={() => setActiveTab('deadlines')}>View</button>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeTab === 'announcements' && (
                            <div className="resources-view">
                                <div className="resources-header">
                                    <h3>Pinned Announcements</h3>
                                    {canManageGroup && (
                                        <button className="btn-small primary" onClick={() => setShowResourceForm(!showResourceForm)}>
                                            {showResourceForm ? "Cancel" : "+ New Announcement"}
                                        </button>
                                    )}
                                </div>
                                {showResourceForm && (
                                    <form className="modern-form announcement-form-expanded" onSubmit={(e) => {
                                        e.preventDefault();
                                        const extendedContent = JSON.stringify({
                                            description: newResource.content,
                                            subject: newResource.subject || '',
                                            time: newResource.time || '',
                                            location: newResource.location || '',
                                            agenda: newResource.agenda || '',
                                            tags: (newResource.tags || '').split(',').map(t => t.trim()).filter(t => t),
                                            joinLink: newResource.joinLink || '',
                                            expiryDate: newResource.expiryDate || null
                                        });
                                        handleAddResource(e, { ...newResource, content: extendedContent });
                                    }}>
                                        <div className="form-grid-two-col">
                                            <div className="form-input-wrapper">
                                                <FileText size={16} className="input-icon" />
                                                <input type="text" placeholder="Announcement Title" value={newResource.title} onChange={e => setNewResource({ ...newResource, title: e.target.value })} required className="modern-input" />
                                            </div>
                                            <div className="form-input-wrapper">
                                                <FileText size={16} className="input-icon" />
                                                <input type="text" placeholder="Tags (comma separated: Urgent, Kuppi)" value={newResource.tags || ''} onChange={e => setNewResource({ ...newResource, tags: e.target.value })} className="modern-input" />
                                            </div>
                                        </div>

                                        <div className="quill-wrapper" style={{ marginTop: '15px' }}>
                                            <label className="form-label-mini">Detailed Description</label>
                                            <ReactQuill
                                                theme="snow"
                                                value={newResource.content}
                                                onChange={(content) => setNewResource({ ...newResource, content })}
                                                placeholder="Write the main description here..."
                                                style={{ height: '140px', marginBottom: '45px' }}
                                            />
                                        </div>

                                        <div className="logistics-form-section">
                                            <h4 className="section-label-mini">Logistics Details (Optional)</h4>
                                            <div className="form-grid-three-col">
                                                <div className="form-input-wrapper">
                                                    <BookOpen size={16} className="input-icon" />
                                                    <input type="text" placeholder="Subject (e.g. Node.js)" value={newResource.subject || ''} onChange={e => setNewResource({ ...newResource, subject: e.target.value })} className="modern-input-small" />
                                                </div>
                                                <div className="form-input-wrapper">
                                                    <Clock size={16} className="input-icon" />
                                                    <input type="text" placeholder="Time (e.g. 8:00 PM)" value={newResource.time || ''} onChange={e => setNewResource({ ...newResource, time: e.target.value })} className="modern-input-small" />
                                                </div>
                                                <div className="form-input-wrapper">
                                                    <MapPin size={16} className="input-icon" />
                                                    <input type="text" placeholder="Location/Link" value={newResource.location || ''} onChange={e => setNewResource({ ...newResource, location: e.target.value })} className="modern-input-small" />
                                                </div>
                                            </div>
                                            <div className="form-grid-two-col mt-4">
                                                <div className="form-input-wrapper">
                                                    <AlignLeft size={16} className="input-icon" />
                                                    <input type="text" placeholder="Brief Agenda (e.g. Intro, Demo, Q&A)" value={newResource.agenda || ''} onChange={e => setNewResource({ ...newResource, agenda: e.target.value })} className="modern-input-small" />
                                                </div>
                                                <div className="form-input-wrapper">
                                                    <LinkIcon size={16} className="input-icon" />
                                                    <input type="text" placeholder="Join Link (Full URL)" value={newResource.joinLink || ''} onChange={e => setNewResource({ ...newResource, joinLink: e.target.value })} className="modern-input-small" />
                                                </div>
                                            </div>
                                            <div className="form-input-wrapper mt-3">
                                                <Calendar size={16} className="input-icon" />
                                                <input type="date" title="Expiration Date" value={newResource.expiryDate || ''} onChange={e => setNewResource({ ...newResource, expiryDate: e.target.value })} className="modern-input-small" />
                                            </div>
                                        </div>

                                        <button type="submit" className="btn-modern-success w-full py-3 text-lg">🚀 Post Pinned Announcement</button>
                                    </form>
                                )}
                                <div className="announcements-list">
                                    {(group.resources || [])
                                        .filter(r => r.type === 'Link')
                                        .filter(r => {
                                            if (!r.content.startsWith('{')) return true;
                                            try {
                                                const data = JSON.parse(r.content);
                                                if (data.expiryDate && new Date(data.expiryDate) < new Date()) return false;
                                                return true;
                                            } catch (e) { return true; }
                                        })
                                        .map(r => {
                                            let data = null;
                                            if (r.content.startsWith('{')) {
                                                try { data = JSON.parse(r.content); } catch (e) { }
                                            }

                                            if (data) {
                                                return (
                                                    <div key={r._id} className="premium-announcement-card">
                                                        <div className="card-header-v2">
                                                            <div className="author-info-v2">
                                                                <div className="author-avatar-v2"><Users size={16} /></div>
                                                                <div className="meta-v2">
                                                                    <span className="author-name-v2">Admin • SLIIT Connect</span>
                                                                    <span className="date-v2">{new Date(r.createdAt || Date.now()).toLocaleString('en-US', { timeZone: 'Asia/Colombo', dateStyle: 'medium', timeStyle: 'short' })}</span>
                                                                </div>
                                                            </div>
                                                            <div className="header-divider-v2" />
                                                            <div className="card-top-description">
                                                                <span className="label-v2">DESCRIPTION:</span>
                                                                <div className="desc-v2 quill-content" dangerouslySetInnerHTML={{ __html: data.description }} />
                                                            </div>
                                                            {canManageGroup && (
                                                                <button className="announcement-delete-btn-v2" onClick={() => handleDeleteResource(r._id)}>
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            )}
                                                        </div>

                                                        <div className="card-body-v2">
                                                            <div className="title-row-v2">
                                                                <h4 className="title-v2">{r.title}</h4>
                                                                <div className="tags-v2">
                                                                    {(data.tags || []).map((tag, idx) => (
                                                                        <span key={idx} className={`tag-v2 ${tag.toLowerCase() === 'urgent' ? 'urgent' : ''}`}>{tag}</span>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            <div className="logistics-grid-v2">
                                                                <div className="logistics-item-v2">
                                                                    <BookOpen size={16} className="icon-v2" />
                                                                    <div className="item-content-v2">
                                                                        <span className="item-label-v2">Subject:</span>
                                                                        <p className="item-value-v2">{data.subject || 'N/A'}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="logistics-item-v2">
                                                                    <MapPin size={16} className="icon-v2" />
                                                                    <div className="item-content-v2">
                                                                        <span className="item-label-v2">Location:</span>
                                                                        <p className="item-value-v2">{data.location || 'N/A'}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="logistics-item-v2">
                                                                    <Clock size={16} className="icon-v2" />
                                                                    <div className="item-content-v2">
                                                                        <span className="item-label-v2">Time:</span>
                                                                        <p className="item-value-v2">{data.time || 'N/A'}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="logistics-item-v2">
                                                                    <AlignLeft size={16} className="icon-v2" />
                                                                    <div className="item-content-v2">
                                                                        <span className="item-label-v2">Agenda:</span>
                                                                        <p className="item-value-v2">{data.agenda || 'N/A'}</p>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="card-actions-v2">
                                                                {data.joinLink && (
                                                                    <button className="btn-join-v2" onClick={() => {
                                                                        const url = data.joinLink.startsWith('http') ? data.joinLink : `https://${data.joinLink}`;
                                                                        window.open(url, '_blank');
                                                                    }}>Join Google Meet/Zoom</button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div key={r._id} className="announcement-card">
                                                    <div className="announcement-header">
                                                        <div className="announcement-avatar">
                                                            <Users size={20} />
                                                        </div>
                                                        <div className="announcement-meta">
                                                            <span className="announcement-author">Admin • SLIIT Connect</span>
                                                            <span className="announcement-time">{new Date(r.createdAt || Date.now()).toLocaleString('en-US', { timeZone: 'Asia/Colombo', dateStyle: 'medium', timeStyle: 'short' })}</span>
                                                        </div>
                                                        {canManageGroup && (
                                                            <button className="announcement-delete" onClick={() => handleDeleteResource(r._id)} title="Delete Announcement">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="announcement-body">
                                                        <h4 className="announcement-title">{r.title}</h4>
                                                        <div className="announcement-content quill-content" dangerouslySetInnerHTML={{ __html: r.content }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    {(group.resources || []).filter(r => r.type === 'Link').length === 0 && (
                                        <div className="placeholder-card small">
                                            <p>No announcements yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'deadlines' && (
                            <div className="resources-view">
                                <div className="resources-header">
                                    <h3>Deadlines Tracker</h3>
                                    {canManageGroup && (
                                        <button className="btn-modern-secondary" onClick={() => setShowResourceForm(!showResourceForm)}>
                                            {showResourceForm ? "Cancel" : "+ Add Deadline"}
                                        </button>
                                    )}
                                </div>
                                {showResourceForm && (
                                    <form className="modern-form" onSubmit={handleAddResource}>
                                        <div className="form-input-wrapper">
                                            <FileText size={16} className="input-icon" />
                                            <input type="text" placeholder="Assignment Title" value={newResource.title} onChange={e => setNewResource({ ...newResource, title: e.target.value })} required className="modern-input" />
                                        </div>
                                        <div className="form-input-wrapper">
                                            <FileText size={16} className="input-icon" />
                                            <input type="text" placeholder="Subject / Module Description" value={newResource.content} onChange={e => setNewResource({ ...newResource, content: e.target.value })} required className="modern-input" />
                                        </div>
                                        <div className="form-input-wrapper">
                                            <CalendarDays size={16} className="input-icon" />
                                            <input type="datetime-local" value={newResource.dueDate} onChange={e => setNewResource({ ...newResource, dueDate: e.target.value })} required className="modern-input" />
                                        </div>
                                        <button type="submit" className="btn-modern-success mt-2">Create Deadline</button>
                                    </form>
                                )}
                                <div className="deadlines-list-modern">
                                    {(group.resources || []).filter(r => r.type === 'Deadline').map(r => {
                                        const isPast = r.dueDate ? new Date(r.dueDate) < new Date() : false;
                                        return (
                                            <div key={r._id} className={`deadline-tracker-card ${isPast ? 'past-due' : ''}`}>
                                                <div className="deadline-status-row">
                                                    <span className={`status-pill ${isPast ? 'past' : 'active'}`}>
                                                        {isPast ? 'Past Due' : 'Active'}
                                                    </span>
                                                    {canManageGroup && (
                                                        <button className="deadline-delete-btn" onClick={() => handleDeleteResource(r._id)}>
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="deadline-content-main">
                                                    <h4 className="deadline-title">{r.title}</h4>
                                                    <p className="deadline-desc">{r.content}</p>
                                                    <div className="deadline-info-row">
                                                        <div className="info-item">
                                                            <CalendarDays size={14} />
                                                            <span>{r.dueDate ? new Date(r.dueDate).toLocaleDateString() : 'No date'}</span>
                                                        </div>
                                                        <div className="info-item">
                                                            <Clock size={14} />
                                                            <span>{r.dueDate ? new Date(r.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="deadline-timer-section">
                                                    <DeadlineCountdown dueDate={r.dueDate} />
                                                </div>
                                            </div>
                                        )
                                    })}
                                    {(group.resources || []).filter(r => r.type === 'Deadline').length === 0 && (
                                        <div className="placeholder-card small">
                                            <p>No upcoming deadlines.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'resources' && (
                            <div className="resources-view">
                                <div className="resources-header">
                                    <h3>Files Repository</h3>
                                    <button className="btn-small primary" onClick={() => setShowResourceForm(!showResourceForm)}>
                                        {showResourceForm ? "Cancel" : "+ Upload File"}
                                    </button>
                                </div>
                                {showResourceForm && (
                                    <form className="resource-form" onSubmit={handleAddResource}>
                                        <input type="file" accept=".pdf,.pptx,.ppt,.doc,.docx,image/*" onChange={handleResourceFile} required className="form-input" />
                                        <input type="text" placeholder="File Display Name" value={newResource.title} onChange={e => setNewResource({ ...newResource, title: e.target.value })} required className="form-input" />
                                        <button type="submit" className="btn-small success mt-2">Upload File</button>
                                    </form>
                                )}
                                <div className="file-tile-grid">
                                    {(group.resources || []).filter(r => r.type === 'File').map(r => {
                                        const isImage = r.content.match(/\.(jpeg|jpg|gif|png)$/) != null;
                                        const isPDF = r.content.match(/\.pdf$/) != null;
                                        return (
                                            <div key={r._id} className="file-tile">
                                                <div className="file-tile-icon-wrapper">
                                                    {isImage ? <FileText size={32} color="#3498db" /> :
                                                        isPDF ? <FileText size={32} color="#e74c3c" /> :
                                                            <FileText size={32} color="#27ae60" />}
                                                </div>
                                                <div className="file-tile-info">
                                                    <h5 className="file-tile-name">{r.title}</h5>
                                                    <span className="file-tile-date">{new Date(r.createdAt || Date.now()).toLocaleDateString()}</span>
                                                </div>
                                                <div className="file-tile-actions">
                                                    <a href={r.content} download={r.title} className="file-action-btn download" title="Download">
                                                        <FileText size={16} />
                                                    </a>
                                                    {canManageGroup && (
                                                        <button className="file-action-btn delete" onClick={() => handleDeleteResource(r._id)} title="Delete">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {(group.resources || []).filter(r => r.type === 'File').length === 0 && (
                                        <div className="placeholder-card small">
                                            <p>No files uploaded yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        {activeTab === 'members' && (
                            <div className="members-view">
                                <div className="members-profile-grid">
                                    {(group.members || []).map((member) => (
                                        <div key={member.user?._id || Math.random()} className="member-profile-card">
                                            <div className="member-card-header">
                                                <div className="member-card-avatar">
                                                    <Users size={24} />
                                                </div>
                                                <div className={`member-role-badge ${member.role?.toLowerCase()}`}>
                                                    {member.role === 'Admin' || member.user?.role?.toLowerCase() === 'admin' ? 'Admin' : member.role}
                                                </div>
                                            </div>
                                            <div className="member-card-info">
                                                <h4 className="member-card-name">
                                                    {member.user?.name || 'Unknown User'}
                                                    {member.user?._id === currentUser._id && <span className="you-label">(You)</span>}
                                                </h4>
                                                <span className="member-card-status">
                                                    {member.status === 'Pending' ? 'Waiting Approval' : 'Active Member'}
                                                </span>
                                            </div>

                                            <div className="member-card-actions">
                                                {canManageGroup && member.status === 'Pending' && member.user?._id && (
                                                    <button className="btn-card-success" onClick={() => handleApproveMember(member.user._id)}>
                                                        Approve
                                                    </button>
                                                )}

                                                {isAdmin && member.status === 'Approved' && member.user?._id && member.user._id !== currentUser._id && (
                                                    <div className="role-change-wrapper">
                                                        <select
                                                            value={member.role}
                                                            onChange={(e) => handleAssignRole(member.user._id, e.target.value)}
                                                            className="card-role-select"
                                                        >
                                                            <option value="Member">Member</option>
                                                            <option value="Moderator">Moderator</option>
                                                        </select>
                                                    </div>
                                                )}

                                                {(canManageGroup || member.user?._id === currentUser._id) && member.user?._id && member.user._id !== (group.createdBy?._id || group.createdBy) && (
                                                    <button className="btn-card-danger" onClick={() => handleRemoveMember(member.user._id)}>
                                                        {member.user._id === currentUser._id ? "Leave Group" : "Remove"}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style jsx>{`
                .group-details-container {
                    padding: 20px 40px 40px;
                    font-family: 'Inter', sans-serif;
                    max-width: 1200px;
                    margin: 0 auto;
                }

                .back-link {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    background: none;
                    border: none;
                    color: #666;
                    font-weight: 500;
                    font-size: 0.95rem;
                    cursor: pointer;
                    margin-bottom: 20px;
                    transition: color 0.2s;
                    font-family: inherit;
                }

                .back-link:hover {
                    color: #1a1a1a;
                }

                .group-cover-area {
                    height: 320px;
                    border-radius: 24px;
                    overflow: hidden;
                    position: relative;
                    margin-bottom: 30px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                }

                .corner-badges {
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    z-index: 10;
                    align-items: flex-end;
                }

                .badge-pill {
                    padding: 8px 16px;
                    border-radius: 30px;
                    font-size: 0.85rem;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    backdrop-filter: blur(10px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }

                .privacy-pill {
                    background: rgba(255, 255, 255, 0.9);
                    color: #1a1a1a;
                }

                .date-pill {
                    background: rgba(0, 0, 0, 0.5);
                    color: white;
                    border: 1px solid rgba(255,255,255,0.1);
                }

                .cover-image {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .cover-overlay {
                    position: absolute;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 60%, transparent 100%);
                    display: flex;
                    align-items: flex-end;
                    padding: 40px;
                }

                .cover-content {
                    color: white;
                    max-width: 800px;
                    z-index: 5;
                }

                .group-title {
                    margin: 0 0 10px 0;
                    font-size: 2.2rem;
                    font-weight: 800;
                }

                .group-desc {
                    margin: 0;
                    font-size: 1.05rem;
                    opacity: 0.9;
                    line-height: 1.5;
                }

                /* Preview State */
                .preview-container {
                    display: flex;
                    justify-content: center;
                    margin-top: 40px;
                }

                .preview-card {
                    background: white;
                    border-radius: 20px;
                    padding: 40px;
                    width: 100%;
                    max-width: 700px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.03);
                    text-align: center;
                }

                .preview-card h2 {
                    margin-top: 0;
                    color: #1a1a1a;
                }

                .rules-section {
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 12px;
                    margin: 24px 0;
                    text-align: left;
                    border: 1px solid #eee;
                }

                .rules-section h3 {
                    margin-top: 0;
                    color: #4a4a4a;
                    font-size: 1rem;
                }

                .rules-section p {
                    margin: 0;
                    color: #666;
                    line-height: 1.6;
                    white-space: pre-wrap;
                }

                .btn {
                    padding: 14px 28px;
                    border-radius: 12px;
                    font-weight: 600;
                    font-size: 1rem;
                    cursor: pointer;
                    border: none;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    transition: transform 0.2s, background 0.2s;
                }

                .btn:active {
                    transform: scale(0.98);
                }

                .btn-primary {
                    background: var(--primary, #1A4F76);
                    color: white;
                    box-shadow: 0 4px 12px rgba(26, 79, 118, 0.2);
                }

                .btn-primary:hover {
                    background: #153c5a;
                }

                .btn-pending {
                    background: #F2994A;
                    color: white;
                    cursor: not-allowed;
                }

                .btn-danger {
                    background: #EB5757;
                    color: white;
                    box-shadow: 0 4px 12px rgba(235, 87, 87, 0.2);
                }

                .btn-danger:hover {
                    background: #c94040;
                }

                .admin-actions {
                    margin-top: 20px;
                }

                /* Tabbed Interface */
                .tabs {
                    display: flex;
                    gap: 15px;
                    border-bottom: 2px solid #f0f0f0;
                    margin-bottom: 30px;
                }

                .tab {
                    padding: 12px 24px;
                    background: none;
                    border: none;
                    font-family: var(--font-heading);
                    font-size: 1.05rem;
                    font-weight: 600;
                    color: #a0aec0;
                    cursor: pointer;
                    position: relative;
                    transition: all 0.3s ease;
                }

                .tab:hover {
                    color: var(--primary);
                }

                .tab.active {
                    color: var(--primary);
                }

                .tab.active::after {
                    content: '';
                    position: absolute;
                    bottom: -2px;
                    left: 0;
                    right: 0;
                    height: 3px;
                    background: var(--accent);
                    border-radius: 4px 4px 0 0;
                }

                .placeholder-card {
                    background: white;
                    padding: 40px;
                    border-radius: 20px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.02);
                    text-align: center;
                    color: #666;
                }

                .error-screen {
                    text-align: center;
                    padding: 40px;
                }

                .members-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .member-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: white;
                    padding: 16px 20px;
                    border-radius: 12px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.02);
                }

                .member-info {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }

                .member-info h4 {
                    margin: 0 0 4px 0;
                    color: #1a1a1a;
                    font-size: 1.05rem;
                }

                .member-role {
                    font-size: 0.85rem;
                    color: #666;
                    background: #f0f0f0;
                    padding: 4px 8px;
                    border-radius: 6px;
                }

                .status-badge {
                    font-size: 0.8rem;
                    padding: 4px 8px;
                    border-radius: 6px;
                    margin-left: 8px;
                    font-weight: 600;
                }
                .status-badge.pending {
                    background: #fff3cd;
                    color: #856404;
                }

                .member-actions {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .btn-small {
                    padding: 6px 14px;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 0.85rem;
                    cursor: pointer;
                    border: none;
                }

                .btn-small.success {
                    background: #d4edda;
                    color: #155724;
                }

                .btn-small.danger {
                    background: #f8d7da;
                    color: #721c24;
                }

                .role-select {
                    padding: 6px 12px;
                    border-radius: 8px;
                    border: 1px solid #ddd;
                    font-family: inherit;
                    font-size: 0.85rem;
                    background: #fdfdfd;
                }

                .resources-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }

                .resources-header h3 {
                    margin: 0;
                    color: #1a1a1a;
                }

                .resource-form {
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 12px;
                    margin-bottom: 24px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    border: 1px solid #eee;
                }

                .form-input {
                    padding: 10px 14px;
                    border-radius: 8px;
                    border: 1px solid #ddd;
                    font-size: 0.95rem;
                    font-family: inherit;
                }

                .mt-2 {
                    margin-top: 8px;
                }

                .resources-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 24px;
                }

                .resource-col h4 {
                    margin-top: 0;
                    margin-bottom: 16px;
                    color: #4a4a4a;
                    font-size: 1rem;
                    padding-bottom: 8px;
                    border-bottom: 2px solid #eee;
                }

                .resource-card {
                    background: white;
                    padding: 16px;
                    border-radius: 12px;
                    border: 1px solid #eaeaea;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 12px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.02);
                    margin-bottom: 12px;
                }

                .file-card {
                    align-items: center;
                }

                .file-info {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .file-icon {
                    color: var(--primary, #1A4F76);
                }

                .file-link {
                    color: #1a1a1a;
                    text-decoration: none;
                    font-weight: 500;
                    word-break: break-all;
                }

                .file-link:hover {
                    color: var(--primary, #1A4F76);
                    text-decoration: underline;
                }

                .link-content {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    width: 100%;
                }

                .link-title {
                    color: #1a1a1a;
                    font-size: 1.05rem;
                }

                .link-desc {
                    margin: 0;
                    font-size: 0.95rem;
                    color: #555;
                    line-height: 1.4;
                    white-space: pre-wrap;
                }

                .nav-link {
                    color: var(--primary, #1A4F76);
                    font-size: 0.9rem;
                    text-decoration: none;
                    font-weight: 600;
                    display: inline-block;
                    margin-top: 4px;
                }

                .nav-link:hover {
                    text-decoration: underline;
                }

                .deadline-card {
                    border-left: 4px solid #27ae60;
                }

                .deadline-card.past {
                    border-left-color: #eb5757;
                    opacity: 0.7;
                }

                .deadline-body {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    width: 100%;
                }

                .deadline-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .deadline-header strong {
                    font-size: 1.05rem;
                    color: #1a1a1a;
                }

                .dueDate-text {
                    margin: 0;
                    color: #555;
                    font-size: 0.95rem;
                    white-space: pre-wrap;
                }

                .dueDate-date {
                    margin: 0;
                    color: #888;
                    font-size: 0.85rem;
                    font-weight: 500;
                }

                .timer-badge {
                    padding: 6px 14px;
                    border-radius: 16px;
                    font-size: 0.85rem;
                    font-weight: 700;
                    white-space: nowrap;
                    font-variant-numeric: tabular-nums;
                    letter-spacing: 0.5px;
                }

                .timer-badge.active {
                    background: #e8f5e9;
                    color: #2e7d32;
                }

                .timer-badge.expired {
                    background: #ffebee;
                    color: #c62828;
                }
                
                /* REDESIGNED SECTIONS */

                /* 1. Announcements (Social Post Style) */
                .announcements-list {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }

                .announcement-card {
                    background: white;
                    border-radius: 16px;
                    border: 1px solid #edf2f7;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.03);
                    overflow: hidden;
                    transition: transform 0.2s;
                }

                .announcement-card:hover {
                    box-shadow: 0 6px 16px rgba(0,0,0,0.05);
                }

                .announcement-header {
                    padding: 16px 20px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    border-bottom: 1px solid #f7fafc;
                    background: #fdfdfd;
                    position: relative;
                }

                .announcement-avatar {
                    width: 40px;
                    height: 40px;
                    background: #f0f7f4;
                    color: var(--accent);
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: inset 0 0 0 1px rgba(39, 174, 96, 0.1);
                }

                .announcement-meta {
                    display: flex;
                    flex-direction: column;
                }

                .announcement-author {
                    font-family: var(--font-heading);
                    font-weight: 700;
                    font-size: 0.95rem;
                    color: var(--primary);
                }

                .announcement-time {
                    font-family: var(--font-body);
                    font-size: 0.8rem;
                    color: #a0aec0;
                }

                .announcement-delete {
                    position: absolute;
                    top: 16px;
                    right: 16px;
                    background: none;
                    border: none;
                    color: #cbd5e0;
                    cursor: pointer;
                    transition: color 0.2s;
                }

                .announcement-delete:hover {
                    color: #e53e3e;
                }

                .announcement-body {
                    padding: 20px;
                }

                .announcement-title {
                    font-family: var(--font-heading);
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: #1a202c;
                    margin-bottom: 12px;
                    letter-spacing: -0.02em;
                }

                .announcement-content.quill-content {
                    font-family: var(--font-body);
                    color: #4a5568;
                    font-size: 1rem;
                    line-height: 1.6;
                }

                /* 2. Deadlines (Task Style) */
                .deadlines-list-modern {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 20px;
                }

                .deadline-tracker-card {
                    background: white;
                    border-radius: 20px;
                    padding: 24px;
                    border: 1px solid #edf2f7;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    position: relative;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .deadline-tracker-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 12px 24px rgba(0,0,0,0.06);
                    border-color: var(--accent);
                }

                .deadline-status-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .status-pill {
                    padding: 4px 12px;
                    border-radius: 8px;
                    font-size: 0.75rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .status-pill.active {
                    background: #e6fffa;
                    color: #2c7a7b;
                }

                .status-pill.past {
                    background: #fff5f5;
                    color: #c53030;
                }

                .deadline-delete-btn {
                    background: none;
                    border: none;
                    color: #cbd5e0;
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 6px;
                }

                .deadline-delete-btn:hover {
                    background: #fff5f5;
                    color: #c53030;
                }

                .deadline-title {
                    font-family: var(--font-heading);
                    font-size: 1.15rem;
                    font-weight: 700;
                    color: var(--primary);
                    margin-bottom: 4px;
                }

                .deadline-desc {
                    font-family: var(--font-body);
                    font-size: 0.9rem;
                    color: #718096;
                    margin-bottom: 12px;
                }

                .deadline-info-row {
                    display: flex;
                    gap: 16px;
                    margin-bottom: 8px;
                }

                .info-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-family: var(--font-body);
                    font-size: 0.85rem;
                    color: #718096;
                    font-weight: 500;
                }

                .deadline-timer-section {
                    margin-top: auto;
                    padding-top: 16px;
                    border-top: 1px dashed #edf2f7;
                }

                /* 3. Files (Tile Grid) */
                .file-tile-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 20px;
                }

                .file-tile {
                    background: white;
                    border-radius: 16px;
                    padding: 24px;
                    border: 1px solid #edf2f7;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    gap: 16px;
                    transition: all 0.2s ease;
                    position: relative;
                }

                .file-tile:hover {
                    background: #f7fafc;
                    border-color: #cbd5e0;
                }

                .file-tile-icon-wrapper {
                    width: 64px;
                    height: 64px;
                    background: #f7fafc;
                    border-radius: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .file-tile-name {
                    font-family: var(--font-heading);
                    font-size: 0.95rem;
                    font-weight: 700;
                    color: var(--primary);
                    margin: 0;
                    display: -webkit-box;
                    -webkit-line-clamp: 1;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                .file-tile-date {
                    font-family: var(--font-body);
                    font-size: 0.8rem;
                    color: #a0aec0;
                }

                .file-tile-actions {
                    display: flex;
                    gap: 12px;
                    opacity: 0;
                    transition: opacity 0.2s;
                }

                .file-tile:hover .file-tile-actions {
                    opacity: 1;
                }

                .file-action-btn {
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: none;
                    cursor: pointer;
                    transition: background 0.2s;
                }

                .file-action-btn.download {
                    background: #f0f7f4;
                    color: var(--accent);
                }

                .file-action-btn.download:hover {
                    background: #ddead1;
                }

                .file-action-btn.delete {
                    background: #fff5f5;
                    color: #e53e3e;
                }

                .file-action-btn.delete:hover {
                    background: #fed7d7;
                }

                /* 4. Members (Profile Cards) */
                .members-profile-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
                    gap: 24px;
                }

                .member-profile-card {
                    background: white;
                    border-radius: 20px;
                    padding: 24px;
                    border: 1px solid #edf2f7;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 16px;
                    text-align: center;
                }

                .member-card-header {
                    width: 100%;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                }

                .member-card-avatar {
                    width: 56px;
                    height: 56px;
                    background: #f0f4f8;
                    color: #4a5568;
                    border-radius: 18px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .member-role-badge {
                    padding: 4px 10px;
                    border-radius: 8px;
                    font-size: 0.75rem;
                    font-weight: 800;
                    background: #f7fafc;
                    color: #4a5568;
                    text-transform: uppercase;
                }

                .member-role-badge.admin {
                    background: #fffaf0;
                    color: #dd6b20;
                }

                .member-role-badge.moderator {
                    background: #f0f7f4;
                    color: var(--accent);
                }

                .member-card-name {
                    font-family: var(--font-heading);
                    font-size: 1.1rem;
                    font-weight: 700;
                    color: var(--primary);
                    margin-bottom: 4px;
                }

                .you-label {
                    font-family: var(--font-heading);
                    margin-left: 6px;
                    font-size: 0.85rem;
                    color: var(--accent);
                    font-weight: 600;
                }

                .member-card-status {
                    font-family: var(--font-body);
                    font-size: 0.85rem;
                    color: #a0aec0;
                }

                .member-card-actions {
                    width: 100%;
                    margin-top: 8px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .btn-card-success, .btn-card-danger {
                    width: 100%;
                    padding: 12px;
                    border-radius: 12px;
                    font-family: var(--font-heading);
                    font-weight: 700;
                    font-size: 0.9rem;
                    border: none;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }

                .btn-card-success {
                    background: #f0f7f4;
                    color: var(--accent);
                }

                .btn-card-success:hover {
                    background: #ddead1;
                    transform: translateY(-1px);
                }

                .btn-card-danger {
                    background: #fff5f5;
                    color: #c53030;
                }

                .btn-card-danger:hover {
                    background: #fed7d7;
                    transform: translateY(-1px);
                }
                
                /* Micro-animations */
                .announcement-card, .deadline-tracker-card, .file-tile, .member-profile-card {
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                
                .announcement-card:hover, .member-profile-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 12px 24px rgba(0,0,0,0.06);
                }

                .role-change-wrapper {
                    width: 100%;
                }

                .card-role-select {
                    width: 100%;
                    padding: 10px;
                    border-radius: 12px;
                    border: 1px solid #edf2f7;
                    font-size: 0.9rem;
                    background: white;
                    font-family: inherit;
                    cursor: pointer;
                }

                .placeholder-card.small {
                    padding: 30px;
                    font-size: 0.95rem;
                }

                /* Mobile Adjustments for Redesigned Sections */
                @media (max-width: 768px) {
                    .deadlines-list-modern, .file-tile-grid, .members-profile-grid {
                        grid-template-columns: 1fr;
                        gap: 16px;
                    }
                    .file-tile {
                        flex-direction: row;
                        text-align: left;
                        padding: 16px;
                    }
                    .file-tile-icon-wrapper {
                        width: 48px;
                        height: 48px;
                        flex-shrink: 0;
                    }
                    .file-tile-actions {
                        opacity: 1;
                        margin-left: auto;
                    }
                    .member-profile-card {
                        flex-direction: row;
                        align-items: center;
                        text-align: left;
                        padding: 16px;
                        gap: 16px;
                    }
                    .member-card-header {
                        width: auto;
                        flex-direction: column;
                        gap: 8px;
                    }
                    .member-card-actions {
                        margin-top: 0;
                        margin-left: auto;
                        width: auto;
                    }
                    .btn-card-success, .btn-card-danger {
                        padding: 6px 12px;
                        width: auto;
                    }
                }

                .announcements-list {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 20px;
                    margin-top: 24px;
                }

                .premium-announcement-card {
                    background: white;
                    border-radius: 12px;
                    border: 1px solid #eef2f6;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.02);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    text-align: left;
                    transition: transform 0.2s, box-shadow 0.2s;
                    position: relative;
                }

                .premium-announcement-card:hover {
                    box-shadow: 0 15px 40px rgba(0,0,0,0.04);
                }

                .card-header-v2 {
                    padding: 16px 20px;
                    background: #fcfdfe;
                    border-bottom: 1px solid #f1f5f9;
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    position: relative;
                }

                .author-info-v2 {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    flex-shrink: 0;
                }

                .author-avatar-v2 {
                    width: 32px;
                    height: 32px;
                    background: #f0fdf4;
                    color: #16a34a;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .meta-v2 {
                    display: flex;
                    flex-direction: column;
                }

                .author-name-v2 {
                    font-size: 0.85rem;
                    font-weight: 700;
                    color: #1e293b;
                }

                .date-v2 {
                    font-size: 0.75rem;
                    color: #94a3b8;
                }

                .header-divider-v2 {
                    width: 1px;
                    height: 24px;
                    background: #e2e8f0;
                }

                .card-top-description {
                    flex: 1;
                    overflow: hidden;
                }

                .label-v2 {
                    display: block;
                    font-size: 0.65rem;
                    font-weight: 800;
                    color: #64748b;
                    letter-spacing: 0.05em;
                }

                .desc-v2 {
                    font-size: 0.85rem;
                    color: #475569;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .announcement-delete-btn-v2 {
                    position: absolute;
                    top: 12px;
                    right: 12px;
                    padding: 6px;
                    border: 1px solid #e2e8f0;
                    border-radius: 6px;
                    background: white;
                    color: #94a3b8;
                    cursor: pointer;
                    transition: all 0.2s;
                    z-index: 10;
                }

                .announcement-delete-btn-v2:hover {
                    color: #ef4444;
                    background: #fef2f2;
                }

                .card-body-v2 {
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .title-row-v2 {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 12px;
                }

                .title-v2 {
                    font-size: 1.15rem;
                    font-weight: 800;
                    color: #991b1b;
                    line-height: 1.2;
                    margin: 0;
                }

                .tags-v2 {
                    display: flex;
                    gap: 6px;
                }

                .tag-v2 {
                    padding: 3px 8px;
                    border-radius: 6px;
                    background: #f1f5f9;
                    color: #475569;
                    font-size: 0.65rem;
                    font-weight: 700;
                    text-transform: uppercase;
                }

                .tag-v2.urgent {
                    background: #fee2e2;
                    color: #b91c1c;
                }

                .logistics-grid-v2 {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                }

                .logistics-item-v2 {
                    display: flex;
                    gap: 10px;
                    align-items: flex-start;
                }

                .icon-v2 {
                    color: #94a3b8;
                    margin-top: 2px;
                }

                .item-label-v2 {
                    display: block;
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: #1e293b;
                }

                .item-value-v2 {
                    font-size: 0.8rem;
                    color: #475569;
                    margin: 0;
                }

                .card-actions-v2 {
                    margin-top: 4px;
                }

                .btn-join-v2 {
                    background: #2563eb;
                    color: white;
                    font-weight: 700;
                    padding: 10px 20px;
                    border-radius: 8px;
                    border: none;
                    font-size: 0.85rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
                }

                .btn-join-v2:hover {
                    background: #1d4ed8;
                    transform: translateY(-1px);
                    box-shadow: 0 6px 15px rgba(37, 99, 235, 0.2);
                }

                /* Delete Confirm Styles */
                .delete-confirm-wrapper {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    background: #fff1f2;
                    padding: 8px 16px;
                    border-radius: 12px;
                    border: 1px solid #ffe4e6;
                    animation: slideIn 0.3s ease-out;
                }

                .confirm-text {
                    font-family: var(--font-heading);
                    font-size: 0.9rem;
                    font-weight: 700;
                    color: #991b1b;
                }

                .btn-danger-soft {
                    background: #fee2e2;
                    color: #b91c1c;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 8px;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.2s;
                }

                .btn-danger-soft:hover {
                    background: #fecaca;
                    transform: translateY(-1px);
                }

                .btn-sm {
                    padding: 4px 12px;
                    font-size: 0.8rem;
                }

                /* Professional Form UI */
                .announcement-form-expanded {
                    border: 1px solid #e2e8f0;
                    padding: 24px;
                    border-radius: 16px;
                    background: #ffffff;
                    text-align: left;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.02);
                    margin-bottom: 30px;
                }

                .form-input-wrapper {
                    position: relative;
                }

                .modern-input, .modern-input-small {
                    width: 100%;
                    padding: 12px 14px 12px 42px;
                    border-radius: 10px;
                    border: 1px solid #e2e8f0;
                    font-size: 0.95rem;
                    font-family: var(--font-body);
                    transition: all 0.2s;
                    background: #fcfcfd;
                }

                .modern-input:focus, .modern-input-small:focus {
                    outline: none;
                    border-color: #2563eb;
                    background: #ffffff;
                    box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.05);
                }

                .input-icon {
                    position: absolute;
                    left: 14px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #94a3b8;
                }

                .logistics-form-section {
                    background: #f8fafc;
                    padding: 18px;
                    border-radius: 12px;
                    border: 1px solid #f1f5f9;
                    margin: 12px 0 20px 0;
                }

                .section-label-mini {
                    font-family: var(--font-heading);
                    font-size: 0.85rem;
                    font-weight: 800;
                    color: #475569;
                    margin: 0 0 15px 0;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .quill-wrapper {
                    margin-bottom: 12px;
                }

                .form-label-mini {
                    font-family: var(--font-heading);
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: #64748b;
                    text-transform: uppercase;
                    margin-bottom: 8px;
                    display: block;
                }

                /* Premium Feed Redesign Styles */
                .feed-view-premium {
                    display: flex;
                    flex-direction: column;
                    gap: 30px;
                    padding: 10px 5px;
                    animation: fadeInUp 0.5s ease-out;
                }

                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                /* No-Scroll Dashboard v3 Styles */
                .feed-dashboard-v3 {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    padding: 8px 0;
                    animation: fadeInUp 0.4s ease-out;
                    max-height: calc(100vh - 250px);
                }

                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .stats-row-v3 {
                    display: flex;
                    gap: 12px;
                    width: 100%;
                }

                .stat-pill-v3 {
                    flex: 1;
                    background: rgba(255, 255, 255, 0.7);
                    backdrop-filter: blur(10px);
                    padding: 12px 16px;
                    border-radius: 14px;
                    border: 1px solid rgba(241, 245, 249, 0.8);
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.02);
                    transition: all 0.2s;
                }

                .stat-pill-v3:hover {
                    transform: translateY(-2px);
                    background: white;
                    box-shadow: 0 8px 20px rgba(0,0,0,0.04);
                }

                .stat-pill-v3.members { color: #2563eb; }
                .stat-pill-v3.updates { color: #16a34a; }
                .stat-pill-v3.tasks { color: #e11d48; }

                .pill-content {
                    display: flex;
                    flex-direction: column;
                }

                .pill-value {
                    font-size: 1.1rem;
                    font-weight: 800;
                    color: #1e293b;
                    line-height: 1.1;
                }

                .pill-label {
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: #64748b;
                }

                .dashboard-grid-v3 {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                }

                .dashboard-panel {
                    background: white;
                    border-radius: 16px;
                    border: 1px solid #f1f5f9;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.02);
                }

                .panel-header {
                    padding: 12px 16px;
                    border-bottom: 1px solid #f8fafc;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: #fcfdfe;
                }

                .panel-title-v3 {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.85rem;
                    font-weight: 800;
                    color: #1e293b;
                    text-transform: uppercase;
                    letter-spacing: 0.02em;
                }

                .mini-badge-v3 {
                    background: #f0fdf4;
                    color: #16a34a;
                    padding: 2px 8px;
                    border-radius: 6px;
                    font-size: 0.65rem;
                    font-weight: 800;
                }

                .mini-badge-v3.urgent {
                    background: #fff1f2;
                    color: #e11d48;
                }

                .panel-card-inner-v3 {
                    padding: 16px;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }

                .card-meta-row {
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.7rem;
                    font-weight: 600;
                    color: #94a3b8;
                    margin-bottom: 8px;
                }

                .card-title-v3 {
                    font-size: 1.05rem;
                    font-weight: 800;
                    color: #1e293b;
                    margin: 0 0 6px 0;
                    line-height: 1.2;
                }

                .card-desc-v3 {
                    font-size: 0.85rem;
                    color: #475569;
                    line-height: 1.4;
                    margin-bottom: 12px;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                .card-actions-v3 {
                    margin-top: auto;
                    display: flex;
                    gap: 8px;
                }

                .btn-v3-primary {
                    background: #2563eb;
                    color: white;
                    border: none;
                    padding: 6px 12px;
                    border-radius: 8px;
                    font-size: 0.8rem;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    cursor: pointer;
                    transition: background 0.2s;
                }

                .btn-v3-primary:hover { background: #1d4ed8; }

                .btn-v3-outline {
                    background: transparent;
                    color: #64748b;
                    border: 1px solid #e2e8f0;
                    padding: 6px 12px;
                    border-radius: 8px;
                    font-size: 0.8rem;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .btn-v3-outline:hover {
                    background: #f8fafc;
                    border-color: #cbd5e1;
                    color: #1e293b;
                }

                .task-header-v3 {
                    margin-bottom: 10px;
                }

                .task-type-v3 {
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: #64748b;
                }

                .countdown-wrap-v3 {
                    background: #fdf2f2;
                    padding: 10px;
                    border-radius: 10px;
                    margin-bottom: 12px;
                }

                .task-footer-v3 {
                    margin-top: auto;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .due-info {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: #e11d48;
                }

                .panel-empty-v3 {
                    padding: 30px;
                    text-align: center;
                    color: #94a3b8;
                    font-size: 0.85rem;
                    font-weight: 600;
                    font-style: italic;
                }

                @media (max-width: 1024px) {
                    .dashboard-grid-v3 {
                        grid-template-columns: 1fr;
                    }
                }

                @media (max-width: 768px) {
                    .group-details-container {
                        padding: 15px 15px 30px;
                    }
                    .back-link {
                        margin-bottom: 12px;
                        font-size: 0.85rem;
                    }
                    .group-cover-area {
                        height: 240px;
                        margin-bottom: 20px;
                        border-radius: 16px;
                    }
                    .cover-overlay {
                        padding: 20px;
                    }
                    .group-title {
                        font-size: 1.5rem;
                        margin-bottom: 6px;
                    }
                    .group-desc {
                        font-size: 0.85rem;
                        -webkit-line-clamp: 2;
                        display: -webkit-box;
                        -webkit-box-orient: vertical;
                        overflow: hidden;
                    }
                    .corner-badges {
                        top: 12px;
                        right: 12px;
                        gap: 6px;
                    }
                    .badge-pill {
                        padding: 4px 10px;
                        font-size: 0.7rem;
                    }
                    .tabs {
                        overflow-x: auto;
                        padding-bottom: 4px;
                        margin-bottom: 20px;
                        gap: 8px;
                        scrollbar-width: none;
                        -ms-overflow-style: none;
                    }
                    .tabs::-webkit-scrollbar {
                        display: none;
                    }
                    .tab {
                        padding: 8px 16px;
                        font-size: 0.9rem;
                        white-space: nowrap;
                    }
                    .stats-row-v3 {
                        flex-direction: column;
                        gap: 10px;
                    }
                    .stat-pill-v3 {
                        padding: 10px 14px;
                    }
                    .announcements-list {
                        grid-template-columns: 1fr;
                    }
                    .card-header-v2 {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 12px;
                    }
                    .header-divider-v2 {
                        display: none;
                    }
                    .desc-v2 {
                        white-space: normal;
                    }
                    .admin-actions {
                        margin-top: 12px;
                    }
                    .btn-danger-soft {
                        padding: 6px 12px;
                        font-size: 0.75rem;
                    }
                }
                
                @media (max-width: 480px) {
                    .group-cover-area {
                        height: 200px;
                    }
                    .group-title {
                        font-size: 1.25rem;
                    }
                    .dashboard-grid-v3 {
                        gap: 12px;
                    }
                }
            `}</style>
        </div>
    );
};

export default GroupDetails;
