import { useState } from 'react';
import {
    Pencil, Eraser, Undo2, Redo2, Trash2,
    Minus, MoveRight, Square, Circle, Triangle, Diamond,
    PaintBucket, ChevronDown, Palette, Type
} from 'lucide-react';
import './Toolbar.css';

const COLORS = [
    '#000000', '#ff4b6e', '#ff8c42', '#ffb84d',
    '#00d2a0', '#4da6ff', '#6c5ce7', '#a855f7',
    '#ff6b9d', '#c0c0c0'
];

const LINE_STYLES = [
    { id: 'solid', label: 'Solid' },
    { id: 'dashed', label: 'Dashed' },
    { id: 'dotted', label: 'Dotted' }
];

const SHAPE_TOOLS = [
    { id: 'line', icon: Minus, label: 'Line' },
    { id: 'arrow', icon: MoveRight, label: 'Arrow' },
    { id: 'rect', icon: Square, label: 'Rectangle' },
    { id: 'circle', icon: Circle, label: 'Circle' },
    { id: 'triangle', icon: Triangle, label: 'Triangle' },
    { id: 'diamond', icon: Diamond, label: 'Diamond' }
];

const BOARD_THEMES = [
    { id: 'whiteboard', label: 'Whiteboard', color: '#ffffff', border: '#ccc', defaultDraw: '#000000', chalk: false },
    { id: 'blackboard', label: 'Blackboard', color: '#2c2c2c', border: '#b8944a', defaultDraw: '#e0e0e0', chalk: true },
    { id: 'nostalgic', label: 'Nostalgic', color: '#1f5a2d', border: '#b8944a', defaultDraw: '#f5f5dc', chalk: true }
];

const Toolbar = ({
    tool, setTool, color, setColor, brushSize, setBrushSize,
    lineStyle, setLineStyle, fillEnabled, setFillEnabled,
    onUndo, onRedo, onClear, isHost,
    boardTheme, setBoardTheme
}) => {
    const [shapesExpanded, setShapesExpanded] = useState(false);
    const [styleExpanded, setStyleExpanded] = useState(false);
    const [themeExpanded, setThemeExpanded] = useState(false);

    const isShapeActive = ['line', 'arrow', 'rect', 'circle', 'triangle', 'diamond'].includes(tool);

    return (
        <div className="toolbar glass-card">
            {/* Drawing Tools */}
            <div className="tool-group">
                <button
                    className={`btn-icon ${tool === 'pencil' ? 'active' : ''}`}
                    onClick={() => setTool('pencil')}
                    title="Pencil"
                >
                    <Pencil size={18} />
                </button>
                <button
                    className={`btn-icon ${tool === 'eraser' ? 'active' : ''}`}
                    onClick={() => setTool('eraser')}
                    title="Eraser"
                >
                    <Eraser size={18} />
                </button>
                <button
                    className={`btn-icon ${tool === 'text' ? 'active' : ''}`}
                    onClick={() => setTool('text')}
                    title="Text"
                >
                    <Type size={18} />
                </button>
            </div>

            {/* Shapes — expandable */}
            <div className="tool-group">
                <button
                    className={`section-toggle ${isShapeActive ? 'active' : ''}`}
                    onClick={() => setShapesExpanded(!shapesExpanded)}
                >
                    <span className="tool-label">Shapes</span>
                    <ChevronDown size={10} className={`toggle-arrow ${shapesExpanded ? 'open' : ''}`} />
                </button>
                {shapesExpanded && (
                    <div className="expand-section">
                        {SHAPE_TOOLS.map(s => (
                            <button
                                key={s.id}
                                className={`btn-icon btn-sm ${tool === s.id ? 'active' : ''}`}
                                onClick={() => setTool(s.id)}
                                title={s.label}
                            >
                                <s.icon size={14} />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Style — expandable */}
            <div className="tool-group">
                <button
                    className={`section-toggle ${styleExpanded ? 'section-open' : ''}`}
                    onClick={() => setStyleExpanded(!styleExpanded)}
                >
                    <span className="tool-label">Style</span>
                    <ChevronDown size={10} className={`toggle-arrow ${styleExpanded ? 'open' : ''}`} />
                </button>
                {styleExpanded && (
                    <div className="expand-section">
                        {LINE_STYLES.map(ls => (
                            <button
                                key={ls.id}
                                className={`btn-linestyle ${lineStyle === ls.id ? 'active' : ''}`}
                                onClick={() => setLineStyle(ls.id)}
                                title={ls.label}
                            >
                                <svg width="32" height="8" viewBox="0 0 32 8">
                                    <line
                                        x1="2" y1="4" x2="30" y2="4"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeDasharray={
                                            ls.id === 'dashed' ? '6,4' :
                                                ls.id === 'dotted' ? '2,3' : 'none'
                                        }
                                    />
                                </svg>
                            </button>
                        ))}
                        <button
                            className={`btn-icon btn-sm ${fillEnabled ? 'active' : ''}`}
                            onClick={() => setFillEnabled(!fillEnabled)}
                            title={fillEnabled ? 'Fill On' : 'Fill Off'}
                        >
                            <PaintBucket size={14} />
                        </button>
                    </div>
                )}
            </div>

            {/* Colors */}
            <div className="tool-group">
                <span className="tool-label">Color</span>
                <div className="color-grid">
                    {COLORS.map(c => (
                        <button
                            key={c}
                            className={`color-swatch ${color === c ? 'active' : ''}`}
                            style={{ background: c }}
                            onClick={() => setColor(c)}
                            title={c}
                        />
                    ))}
                </div>
                <div className="custom-color-row">
                    <input
                        type="color"
                        value={color}
                        onChange={e => setColor(e.target.value)}
                        className="color-input"
                        title="Custom Color"
                    />
                </div>
            </div>

            {/* Brush Size */}
            <div className="tool-group">
                <span className="tool-label">Size: {brushSize}px</span>
                <input
                    type="range"
                    min="1"
                    max="20"
                    value={brushSize}
                    onChange={e => setBrushSize(Number(e.target.value))}
                    className="size-slider"
                />
                <div className="size-preview" style={{ width: brushSize, height: brushSize }} />
            </div>

            {/* Theme — expandable */}
            <div className="tool-group">
                <button
                    className={`section-toggle ${themeExpanded ? 'section-open' : ''}`}
                    onClick={() => setThemeExpanded(!themeExpanded)}
                >
                    <Palette size={12} />
                    <span className="tool-label">Theme</span>
                    <ChevronDown size={10} className={`toggle-arrow ${themeExpanded ? 'open' : ''}`} />
                </button>
                {themeExpanded && (
                    <div className="expand-section theme-grid">
                        {BOARD_THEMES.map(t => (
                            <button
                                key={t.id}
                                className={`theme-swatch ${boardTheme === t.id ? 'active' : ''}`}
                                onClick={() => {
                                    setBoardTheme(t.id);
                                    setColor(t.defaultDraw);
                                    if (t.chalk) {
                                        setLineStyle('dotted');
                                        setBrushSize(5);
                                    } else {
                                        setLineStyle('solid');
                                        setBrushSize(3);
                                    }
                                }}
                                title={t.label}
                            >
                                <span
                                    className="theme-dot"
                                    style={{ background: t.color, borderColor: t.border }}
                                />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* History */}
            <div className="tool-group">
                <button className="btn-icon" onClick={onUndo} title="Undo">
                    <Undo2 size={18} />
                </button>
                <button className="btn-icon" onClick={onRedo} title="Redo">
                    <Redo2 size={18} />
                </button>
            </div>

            {/* Clear */}
            {isHost && (
                <div className="tool-group">
                    <button className="btn-icon btn-clear" onClick={onClear} title="Clear Board (Host Only)">
                        <Trash2 size={18} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default Toolbar;
