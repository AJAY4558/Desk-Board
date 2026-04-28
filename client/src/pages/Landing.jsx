import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, ArrowRight, CheckCircle2, Zap, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Landing.css';

export default function Landing() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => { if (user) navigate('/dashboard', { replace: true }); }, [user, navigate]);
    useEffect(() => {
        const fn = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', fn);
        return () => window.removeEventListener('scroll', fn);
    }, []);

    const scroll = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

    return (
        <div>
            {/* ── Navbar ── */}
            <nav className={`lp-nav${scrolled ? ' scrolled' : ''}`}>
                <a className="lp-nav-logo" href="/">
                    <div className="lp-nav-logo-icon"><Layers size={16} color="white" /></div>
                    DeskBoard
                </a>
                <ul className="lp-nav-links">
                    <li><a href="#features" onClick={e => { e.preventDefault(); scroll('features'); }}>Features</a></li>
                    <li><a href="#how" onClick={e => { e.preventDefault(); scroll('how'); }}>How it works</a></li>
                </ul>
                <div className="lp-nav-actions">
                    <button className="btn-outline" onClick={() => navigate('/login')}>Log in</button>
                    <button className="btn btn-primary" style={{ padding: '10px 22px', fontSize: '0.9rem', borderRadius: 10 }} onClick={() => navigate('/register')}>
                        Get started <ArrowRight size={14} />
                    </button>
                </div>
            </nav>

            {/* ── Hero ── */}
            <section className="lp-hero">
                <div className="lp-orb lp-orb-1" />
                <div className="lp-orb lp-orb-2" />
                <div className="lp-orb lp-orb-3" />
                <div className="lp-grid" />

                <div className="lp-badge">
                    <span className="lp-badge-dot" />
                    Real-time collaborative workspace
                </div>

                <h1 className="lp-h1">
                    Your team's ideas,<br />
                    <em>built together</em>
                </h1>

                <p className="lp-sub">
                    An infinite whiteboard with live video — so your team can sketch, plan,
                    and present without ever switching apps.
                </p>

                <div className="lp-ctas">
                    <button className="btn btn-primary" id="hero-cta" onClick={() => navigate('/register')}>
                        Start for free <ArrowRight size={15} />
                    </button>
                    <button className="btn-outline" onClick={() => scroll('features')}>
                        See how it works <ChevronRight size={15} />
                    </button>
                </div>

                {/* Stats pill */}
                <div className="lp-stats">
                    {[
                        { val: '∞', lbl: 'Canvas size' },
                        { val: '<50ms', lbl: 'Sync latency' },
                        { val: '100%', lbl: 'Free to start' },
                    ].map(s => (
                        <div key={s.lbl} className="lp-stat">
                            <div className="lp-stat-val">{s.val}</div>
                            <div className="lp-stat-lbl">{s.lbl}</div>
                        </div>
                    ))}
                </div>

                {/* App preview — real screenshot */}
                <div className="lp-preview-wrap">
                    <div className="lp-screenshot-frame">
                        <img
                            src="/app-preview.png"
                            alt="DeskBoard — live collaborative whiteboard with a chalk-style rose drawn on a blackboard canvas"
                            className="lp-screenshot-img"
                        />
                        {/* Live indicator badge */}
                        <div className="lp-screenshot-badge">
                            <span className="lp-badge-dot" style={{ width: 7, height: 7 }} />
                            3 collaborators live
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Trusted by ── */}
            <div className="lp-trust">
                <div className="lp-trust-label">Powered by modern open-source tech</div>
                <div className="lp-trust-logos">
                    {['React','Node.js','Socket.IO','MongoDB','WebRTC','Vite'].map(t => (
                        <div key={t} className="lp-trust-logo">{t}</div>
                    ))}
                </div>
            </div>

            {/* ── Features (Bento) ── */}
            <section id="features" className="lp-features">
                <div className="lp-section-kicker"><CheckCircle2 size={13} /> Features</div>
                <h2 className="lp-section-h2">Everything your team needs,<br />nothing they don't</h2>
                <p className="lp-section-p">Built for speed and simplicity — no downloads, no setup, just open your browser and collaborate.</p>

                <div className="lp-bento">
                    {/* Card 1 — wide */}
                    <div className="lp-bento-card wide">
                        <span className="lp-bc-icon">✏️</span>
                        <div className="lp-bc-title">Infinite Real-Time Whiteboard</div>
                        <div className="lp-bc-desc">Draw, annotate, and brainstorm on an infinite canvas. Every stroke syncs across all users in under 50ms via WebSocket — no lag, no conflict.</div>
                        <div className="lp-bc-tags">
                            <span className="lp-tag lp-tag-purple">WebSocket sync</span>
                            <span className="lp-tag lp-tag-purple">Live cursors</span>
                            <span className="lp-tag lp-tag-purple">Persistent canvas</span>
                        </div>
                    </div>

                    {/* Card 2 */}
                    <div className="lp-bento-card">
                        <span className="lp-bc-icon">🎥</span>
                        <div className="lp-bc-title">Built-in Video Calls</div>
                        <div className="lp-bc-desc">See your team while you work. Peer-to-peer video via WebRTC — no third-party service required.</div>
                        <div className="lp-bc-tags">
                            <span className="lp-tag lp-tag-green">WebRTC P2P</span>
                            <span className="lp-tag lp-tag-green">No plugins</span>
                        </div>
                    </div>

                    {/* Card 3 */}
                    <div className="lp-bento-card">
                        <span className="lp-bc-icon">⚡</span>
                        <div className="lp-bc-title">Join in Seconds</div>
                        <div className="lp-bc-desc">Share a 6-digit Room ID. Anyone on your team can jump in instantly — no account required to join.</div>
                        <div className="lp-bc-tags">
                            <span className="lp-tag lp-tag-blue">Room IDs</span>
                            <span className="lp-tag lp-tag-blue">Instant access</span>
                        </div>
                    </div>

                    {/* Card 4 */}
                    <div className="lp-bento-card">
                        <span className="lp-bc-icon">🎨</span>
                        <div className="lp-bc-title">Rich Drawing Tools</div>
                        <div className="lp-bc-desc">Pen, shapes, text, highlighter, eraser, color picker — a complete toolkit for turning rough sketches into polished diagrams.</div>
                    </div>

                    {/* Card 5 — wide */}
                    <div className="lp-bento-card wide">
                        <span className="lp-bc-icon">💾</span>
                        <div className="lp-bc-title">Persistent Rooms &amp; History</div>
                        <div className="lp-bc-desc">Your boards save automatically to MongoDB. Return anytime, manage your room history from the dashboard, and selectively remove sessions you no longer need.</div>
                        <div className="lp-bc-tags">
                            <span className="lp-tag lp-tag-purple">Auto-save</span>
                            <span className="lp-tag lp-tag-purple">Room history</span>
                            <span className="lp-tag lp-tag-green">Bulk delete</span>
                        </div>
                    </div>

                    {/* Card 6 */}
                    <div className="lp-bento-card">
                        <span className="lp-bc-icon">🔒</span>
                        <div className="lp-bc-title">Secure &amp; Private</div>
                        <div className="lp-bc-desc">JWT auth, CORS-protected API, and per-room access control. Your data stays yours.</div>
                        <div className="lp-bc-tags">
                            <span className="lp-tag lp-tag-blue">JWT auth</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── How it works ── */}
            <section id="how" className="lp-steps">
                <div className="lp-steps-inner">
                    <div className="lp-section-kicker"><Zap size={13} /> Simple by design</div>
                    <h2 className="lp-section-h2">Up and running in 3 steps</h2>
                    <p className="lp-section-p">No downloads. No plugins. Just your browser.</p>
                    <div className="lp-steps-grid">
                        {[
                            { n:'1', h:'Create an account', p:'Sign up for free — just a username, email, and password. No credit card.' },
                            { n:'2', h:'Create or join a room', p:'Start a blank board with one click, or enter a 6-digit Room ID to jump into a running session.' },
                            { n:'3', h:'Collaborate live', p:'Draw together, hop on video, see each other\'s cursors move in real time. That\'s it.' },
                        ].map((s, i, arr) => (
                            <div key={s.n} className="lp-step">
                                {i < arr.length - 1 && <div className="lp-step-connector" />}
                                <div className="lp-step-num">{s.n}</div>
                                <div className="lp-step-h">{s.h}</div>
                                <p className="lp-step-p">{s.p}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA ── */}
            <section className="lp-cta">
                <div className="lp-cta-box">
                    <div className="lp-cta-glow" />
                    <h2 className="lp-cta-h2">
                        Ready to build<br />
                        <em style={{ fontStyle:'normal', background:'linear-gradient(135deg,#a78bfa,#00d2a0)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
                            something great together?
                        </em>
                    </h2>
                    <p className="lp-cta-p">Free to use. No setup. Just open a room and start.</p>
                    <div className="lp-cta-actions">
                        <button className="btn btn-primary" id="cta-signup" onClick={() => navigate('/register')}>
                            Create free account <ArrowRight size={16} />
                        </button>
                        <button className="btn-outline" id="cta-signin" onClick={() => navigate('/login')}>
                            Sign in instead
                        </button>
                    </div>
                </div>
            </section>

            {/* ── Footer ── */}
            <footer className="lp-footer">
                <div className="lp-footer-brand">
                    <div className="lp-nav-logo-icon" style={{ width:26, height:26 }}><Layers size={13} color="white" /></div>
                    DeskBoard
                </div>
                <span className="lp-footer-copy">Real-time whiteboard &amp; video — built with React, Node.js &amp; WebRTC</span>
            </footer>
        </div>
    );
}
