import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, LogIn, Loader, User } from 'lucide-react';
import './Auth.css';

const Login = () => {
    const [loginMode, setLoginMode] = useState('email');
    const [formData, setFormData] = useState({ identifier: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { login, error, clearError } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        clearError();
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const switchMode = (mode) => {
        setLoginMode(mode);
        setFormData({ identifier: '', password: '' });
        clearError();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await login({ identifier: formData.identifier, password: formData.password });
            navigate('/dashboard');
        } catch (err) {
            /* error handled by context */
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-bg-orbs">
                <div className="orb orb-1" />
                <div className="orb orb-2" />
                <div className="orb orb-3" />
            </div>

            <div className="auth-container animate-scale-in">
                <div className="auth-header">
                    <div className="auth-logo">
                        <div className="logo-icon">
                            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                                <rect width="32" height="32" rx="8" fill="url(#grad)" />
                                <path d="M8 24V12L16 8L24 12V24L16 20L8 24Z" fill="white" fillOpacity="0.9" />
                                <defs>
                                    <linearGradient id="grad" x1="0" y1="0" x2="32" y2="32">
                                        <stop stopColor="#6c5ce7" />
                                        <stop offset="1" stopColor="#a855f7" />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>
                        <span className="logo-text">CollabBoard</span>
                    </div>
                    <h1 className="auth-title">Welcome back</h1>
                    <p className="auth-subtitle">Sign in to continue collaborating</p>
                </div>

                {/* Login Mode Tabs */}
                <div className="login-mode-tabs">
                    <button
                        className={`mode-tab ${loginMode === 'email' ? 'active' : ''}`}
                        onClick={() => switchMode('email')}
                        type="button"
                    >
                        <Mail size={14} /> Email
                    </button>
                    <button
                        className={`mode-tab ${loginMode === 'username' ? 'active' : ''}`}
                        onClick={() => switchMode('username')}
                        type="button"
                    >
                        <User size={14} /> Username
                    </button>
                </div>

                {error && (
                    <div className="auth-error animate-slide-down">
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label className="form-label">
                            {loginMode === 'email' ? 'Email Address' : 'Username'}
                        </label>
                        <div className="input-wrapper">
                            {loginMode === 'email'
                                ? <Mail size={18} className="input-icon" />
                                : <User size={18} className="input-icon" />
                            }
                            <input
                                type={loginMode === 'email' ? 'email' : 'text'}
                                name="identifier"
                                value={formData.identifier}
                                onChange={handleChange}
                                placeholder={loginMode === 'email' ? 'you@gmail.com' : 'Enter your username'}
                                className="input-field input-with-icon"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <div className="input-wrapper">
                            <Lock size={18} className="input-icon" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Enter your password"
                                className="input-field input-with-icon"
                                required
                            />
                            <button
                                type="button"
                                className="input-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary auth-submit" disabled={isLoading}>
                        {isLoading ? <Loader size={18} className="spin" /> : <LogIn size={18} />}
                        {isLoading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <p className="auth-footer">
                    Don&apos;t have an account? <Link to="/register">Create one</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;
