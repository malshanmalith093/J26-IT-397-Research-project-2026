import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, UserCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Auth = () => {
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const toggleAuth = () => {
        setIsLogin(!isLogin);
        setMessage({ type: '', text: '' });
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
        //const url = `http://localhost:8080${endpoint}`;
        //const url = `${import.meta.env.VITE_AUTH_BACKEND}${endpoint}`;
        const nodeUrl = `${import.meta.env.VITE_NODE_BACKEND}${endpoint}`;
    const pythonUrl = `${import.meta.env.VITE_PYTHON_BACKEND}${endpoint}`;

      console.log("Endpoint:", endpoint);
console.log("Node URL:", nodeUrl);
console.log("Python URL:", pythonUrl);

        // try {
        //     const res = await axios.post(url, formData);
        //     localStorage.setItem('token', res.data.token);
        //     setMessage({ type: 'success', text: isLogin ? 'Login successful!' : 'Registration successful!' });

        //     // Redirect to Dashboard
        //     setTimeout(() => {
        //         navigate('/dashboard');
        //     }, 1000); // Small delay to show success message
        // } catch (err) {
        //     setMessage({
        //         type: 'error',
        //         text: err.response?.data?.message || 'Something went wrong. Please try again.'
        //     });
        // } finally {
        //     setLoading(false);
        // }
         try {
        let res;

        try {
            // Try Node.js first
            console.log("Trying Node.js:", nodeUrl);

            res = await axios.post(
                nodeUrl,
                formData,
                { timeout: 3000 }
            );

            console.log("Connected to Node.js");

        } catch (nodeError) {

            // Only fall back to Python if Node is unavailable
            if (!nodeError.response) {
                console.log("Node.js unavailable. Trying Python...");

                res = await axios.post(
                    pythonUrl,
                    formData,
                    { timeout: 3000 }
                );

                console.log("Connected to Python Flask");

            } else {
                // Node responded with an error such as 401
                // Don't hide that error by switching backend.
                throw nodeError;
            }
        }

        localStorage.setItem('token', res.data.token);

        setMessage({
            type: 'success',
            text: isLogin
                ? 'Login successful!'
                : 'Registration successful!'
        });

        setTimeout(() => {
            navigate('/dashboard');
        }, 1000);

    } catch (err) {

        console.error("Authentication error:", err);

        setMessage({
            type: 'error',
            text:
                err.response?.data?.message ||
                'Unable to connect to the authentication server.'
        });

    } finally {
        setLoading(false);
    }
    };

    return (
        <div className="auth-wrapper">
            <div className="auth-container">
                {/* Left Panel: Illustration & Branding */}
                <div className="auth-left auth-illustration-panel">
                    <div className="branding_centered">
                        {/* We could put the logo here, but it's on the right as requested */}
                    </div>

                    <div className="illustration-container">
                        <motion.img
                            key={isLogin ? 'login-img' : 'signup-img'}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6 }}
                            src="/login img1.png"
                            alt="Students Studying"
                            className="main-illustration"
                        />
                    </div>

                    <div className="left-content">
                        <motion.h2
                            key={isLogin ? 'login-h2' : 'signup-h2'}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="sidebar-title"
                        >
                            {isLogin ? 'AI-Powered Personalized E-Learning System ' : 'Join Our Community'}
                        </motion.h2>
                        <p className="sidebar-text">
                            {isLogin
                                ? 'for Student Progress Tracking and Engagement Enhancement.'
                                : 'Share notes, manage deadlines, and build thriving communities.'}
                        </p>

                        <div className="pager">
                            <span className="dot active"></span>
                            <span className="dot"></span>
                            <span className="dot"></span>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Form */}
                <div className="auth-right auth-form-panel">
                    <div className="auth-topbar">
                        <img src="/logo1.png" alt="EduPulse Logo" className="topbar-logo" />
                        <button className="topbar-action" onClick={toggleAuth}>
                            <UserCircle size={20} />
                            <span>{isLogin ? 'Create Account' : 'Sign In'}</span>
                        </button>
                    </div>

                    <div className="form-inner-wrapper">
                        <div className="form-inner">
                            <div className="form-header">
                                <h1 className="welcome-text">
                                    {isLogin ? 'Welcome to EduPulse' : 'Create an Account'}
                                </h1>
                            </div>

                            {message.text && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`auth-message ${message.type}`}
                                >
                                    {message.text}
                                </motion.div>
                            )}

                            <form className="auth-form" onSubmit={handleSubmit}>
                                <AnimatePresence mode="wait">
                                    {!isLogin && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="input-group"
                                        >
                                            <label>Full Name</label>
                                            <input
                                                type="text"
                                                name="name"
                                                placeholder="Your Name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                required={!isLogin}
                                            />
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className="input-group">
                                    <label>Email Address</label>
                                    <input
                                        type="email"
                                        name="email"
                                        placeholder="someone@gmail.com"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div className="input-group">
                                    <label>Password</label>
                                    <input
                                        type="password"
                                        name="password"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                {isLogin && (
                                    <div className="form-options">
                                        <a href="#" className="forgot-link">Forgot password?</a>
                                    </div>
                                )}

                                <button type="submit" className="btn-primary auth-submit-btn" disabled={loading}>
                                    {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
                                    <ArrowRight size={18} />
                                </button>
                            </form>

                            <div className="form-footer">
                                <p>
                                    {isLogin ? 'Are you new?' : 'Already have an account?'}
                                    <button onClick={toggleAuth} className="toggle-btn">
                                        {isLogin ? 'Create an Account' : 'Sign In'}
                                    </button>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
        .auth-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #f0f2f5;
          padding: 20px;
        }

        .auth-container {
          width: 100%;
          max-width: 1100px;
          height: 700px;
          background: var(--bg-sidebar); /* Side background applied to container */
          border-radius: 32px;
          display: flex;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08); /* slightly stronger shadow for card pop */
        }

        .auth-form-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          position: relative;
          background: white;
          border-radius: 32px; /* Border radius on all 4 corners! */
          box-shadow: -4px 0 24px rgba(0, 0, 0, 0.04);
        }

        .auth-illustration-panel {
          flex: 1;
          background-color: var(--bg-sidebar);
          display: flex;
          flex-direction: column;
          padding: 40px;
          position: relative;
        }

        .auth-submit-btn {
          background-color: #4a98f2; /* Orange color */
          color: white;
        }

        .auth-submit-btn:hover {
          background-color: #4a98f2; /* Darker orange on hover */
        }

        .auth-topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 40px;
          width: 100%;
        }

        .topbar-logo {
          height: 72px;
          width: auto;
          object-fit: contain;
        }

        .topbar-action {
          display: flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: none;
          font-family: var(--font-body);
          font-size: 1.05rem;
          color: var(--primary);
          font-weight: 500;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        
        .topbar-action:hover {
          opacity: 0.8;
        }

        .illustration-container {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .main-illustration {
          max-width: 80%;
          height: auto;
        }

        .left-content {
          text-align: center;
          padding-bottom: 20px;
        }

        .sidebar-title {
          font-size: 1.5rem;
          margin-bottom: 12px;
          color: var(--primary);
        }

        .sidebar-text {
          font-size: 0.95rem;
          color: var(--text-muted);
          line-height: 1.6;
          max-width: 300px;
          margin: 0 auto 24px;
        }

        .pager {
          display: flex;
          gap: 8px;
          justify-content: center;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #D1D5DB;
        }

        .dot.active {
          background: var(--accent);
          width: 24px;
          border-radius: 10px;
        }

        .form-inner-wrapper {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
        }

        .form-inner {
          width: 100%;
          max-width: 360px;
        }

        .welcome-text {
          font-size: 2rem;
          margin-bottom: 40px;
          color: var(--primary);
          text-align: center;
        }

        .form-options {
          text-align: right;
          margin-bottom: 24px;
        }

        .forgot-link {
          font-size: 0.85rem;
          color: var(--text-muted);
          text-decoration: none;
        }

        .forgot-link:hover {
          color: var(--primary);
        }

        .form-footer {
          margin-top: 32px;
          text-align: center;
          font-size: 0.95rem;
          color: var(--text-muted);
        }

        .toggle-btn {
          background: none;
          border: none;
          color: var(--accent);
          font-weight: 600;
          margin-left: 8px;
          cursor: pointer;
          font-family: inherit;
          font-size: 0.95rem;
        }

        .toggle-btn:hover {
          text-decoration: underline;
        }

        .auth-message {
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 0.9rem;
          text-align: center;
        }

        .auth-message.success {
          background-color: #DEF7EC;
          color: #03543F;
          border: 1px solid #BCF0DA;
        }

        .auth-message.error {
          background-color: #FDE8E8;
          color: #9B1C1C;
          border: 1px solid #FBD5D5;
        }

        @media (max-width: 900px) {
          .auth-left {
            display: none;
          }
          .auth-container {
            max-width: 500px;
          }
        }
      `}</style>
        </div>
    );
};

export default Auth;
