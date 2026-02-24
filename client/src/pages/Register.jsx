import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, User, UserPlus, Loader, CheckCircle, XCircle } from 'lucide-react';
import './Auth.css';

const Register = () => {
    const [formData, setFormData] = useState({
        username: '', email: '', password: '', confirmPassword: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [localError, setLocalError] = useState('');
    const { register, error, clearError } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        clearError();
        setLocalError('');
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const passwordChecks = useMemo(() => {
        const p = formData.password;
        return [
            { label: 'At least 8 characters', valid: p.length >= 8 },
            { label: 'Uppercase letter (A-Z)', valid: /[A-Z]/.test(p) },
            { label: 'Lowercase letter (a-z)', valid: /[a-z]/.test(p) },
            { label: 'Number (0-9)', valid: /[0-9]/.test(p) },
            { label: 'Special character (!@#$...)', valid: /[!@#$%^&*(),.?":{}|<>]/.test(p) },
        ];
    }, [formData.password]);

    const allPasswordValid = passwordChecks.every(c => c.valid);

    const emailValid = useMemo(() => {
        if (!formData.email) return null;
        return /^[a-zA-Z0-9._%+-]+@(gmail\.com|yahoo\.com|outlook\.com|hotmail\.com|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/.test(formData.email);
    }, [formData.email]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!emailValid) {
            setLocalError('Please enter a valid email address (e.g. you@gmail.com)');
            return;
        }
        if (!allPasswordValid) {
            setLocalError('Password does not meet all requirements');
            return;
        }
        if (formData.password !== formData.confirmPassword) {
            setLocalError('Passwords do not match');
            return;
        }
        setIsLoading(true);
        try {
            await register({
                username: formData.username,
                email: formData.email,
                password: formData.password
            });
            navigate('/dashboard');
        } catch (err) {
            /* handled by context */
        } finally {
            setIsLoading(false);
        }
    };

    const displayError = localError || error;

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
                                <rect width="32" height="32" rx="8" fill="url(#grad2)" />
                                <path d="M8 24V12L16 8L24 12V24L16 20L8 24Z" fill="white" fillOpacity="0.9" />
                                <defs>
                                    <linearGradient id="grad2" x1="0" y1="0" x2="32" y2="32">
                                        <stop stopColor="#6c5ce7" />
                                        <stop offset="1" stopColor="#a855f7" />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>
                        <span className="logo-text">CollabBoard</span>
                    </div>
                    <h1 className="auth-title">Create account</h1>
                    <p className="auth-subtitle">Start collaborating in real-time</p>
                </div>

                {displayError && (
                    <div className="auth-error animate-slide-down">
                        <span>{displayError}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label className="form-label">Username</label>
                        <div className="input-wrapper">
                            <User size={18} className="input-icon" />
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                placeholder="Choose a username"
                                className="input-field input-with-icon"
                                required
                                minLength={3}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <div className="input-wrapper">
                            <Mail size={18} className="input-icon" />
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="you@gmail.com"
                                className={`input-field input-with-icon ${formData.email ? (emailValid ? 'input-valid' : 'input-invalid') : ''}`}
                                required
                            />
                            {formData.email && (
                                <span className={`input-status ${emailValid ? 'valid' : 'invalid'}`}>
                                    {emailValid ? <CheckCircle size={16} /> : <XCircle size={16} />}
                                </span>
                            )}
                        </div>
                        {formData.email && !emailValid && (
                            <span className="field-hint error">Enter a valid email (e.g. name@gmail.com)</span>
                        )}
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
                                placeholder="Create a strong password"
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
                        {formData.password && (
                            <div className="password-checks">
                                {passwordChecks.map((check, i) => (
                                    <div key={i} className={`pw-check ${check.valid ? 'valid' : ''}`}>
                                        {check.valid ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                        <span>{check.label}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label">Confirm Password</label>
                        <div className="input-wrapper">
                            <Lock size={18} className="input-icon" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder="Re-enter password"
                                className={`input-field input-with-icon ${formData.confirmPassword ? (formData.password === formData.confirmPassword ? 'input-valid' : 'input-invalid') : ''}`}
                                required
                            />
                            {formData.confirmPassword && (
                                <span className={`input-status ${formData.password === formData.confirmPassword ? 'valid' : 'invalid'}`}>
                                    {formData.password === formData.confirmPassword ? <CheckCircle size={16} /> : <XCircle size={16} />}
                                </span>
                            )}
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary auth-submit" disabled={isLoading}>
                        {isLoading ? <Loader size={18} className="spin" /> : <UserPlus size={18} />}
                        {isLoading ? 'Creating...' : 'Create Account'}
                    </button>
                </form>

                <p className="auth-footer">
                    Already have an account? <Link to="/login">Sign in</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;
