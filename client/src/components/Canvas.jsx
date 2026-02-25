import { useRef, useEffect, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import './Canvas.css';

const SHAPE_TOOLS = ['line', 'arrow', 'rect', 'circle', 'triangle', 'diamond'];



const getLineDash = (style, size) => {
    switch (style) {
        case 'dashed': return [size * 3, size * 2];
        case 'dotted': return [size, size * 1.5];
        default: return [];
    }
};

const Canvas = forwardRef(({ tool, color, brushSize, lineStyle, fillEnabled, socket, roomId, boardTheme = 'whiteboard' }, ref) => {
    const canvasRef = useRef(null);
    const previewRef = useRef(null);
    const ctxRef = useRef(null);
    const previewCtxRef = useRef(null);
    const containerRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const lastPoint = useRef(null);
    const shapeStart = useRef(null);
    const shapeEnd = useRef(null);
    const [textInput, setTextInput] = useState(null);
    const textareaRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const preview = previewRef.current;
        const container = containerRef.current;
        if (!canvas || !preview || !container) return;

        const resize = () => {
            const rect = container.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;

            const imageData = ctxRef.current?.getImageData(0, 0, canvas.width, canvas.height);

            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            canvas.style.width = `${rect.width}px`;
            canvas.style.height = `${rect.height}px`;

            preview.width = rect.width * dpr;
            preview.height = rect.height * dpr;
            preview.style.width = `${rect.width}px`;
            preview.style.height = `${rect.height}px`;

            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.scale(dpr, dpr);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.imageSmoothingEnabled = true;
            ctxRef.current = ctx;

            const pctx = preview.getContext('2d');
            pctx.scale(dpr, dpr);
            pctx.lineCap = 'round';
            pctx.lineJoin = 'round';
            previewCtxRef.current = pctx;

            if (imageData) {
                ctx.putImageData(imageData, 0, 0);
            }
        };

        resize();
        window.addEventListener('resize', resize);
        saveState();

        return () => window.removeEventListener('resize', resize);
    }, []);

    useEffect(() => {
        const preview = previewRef.current;
        if (!preview) return;
        const opts = { passive: false };
        preview.addEventListener('touchstart', startDrawing, opts);
        preview.addEventListener('touchmove', draw, opts);
        preview.addEventListener('touchend', stopDrawing);
        return () => {
            preview.removeEventListener('touchstart', startDrawing, opts);
            preview.removeEventListener('touchmove', draw, opts);
            preview.removeEventListener('touchend', stopDrawing);
        };
    });

    useEffect(() => {
        if (!socket) return;

        socket.on('draw', (data) => {
            drawLineOnCtx(ctxRef.current, data.x0, data.y0, data.x1, data.y1, data.color, data.size, data.style || 'solid');
        });

        socket.on('erase', (data) => {
            eraseLine(data.x0, data.y0, data.x1, data.y1, data.size);
        });

        socket.on('shape', (data) => {
            drawShapeOnCtx(ctxRef.current, data);
            saveState();
        });

        socket.on('clear-board', () => {
            clearCanvas();
        });

        socket.on('text', (data) => {
            drawTextOnCtx(ctxRef.current, data);
            saveState();
        });

        socket.on('undo', () => {
            performUndo();
        });

        socket.on('redo', () => {
            performRedo();
        });

        return () => {
            socket.off('draw');
            socket.off('erase');
            socket.off('shape');
            socket.off('clear-board');
            socket.off('text');
            socket.off('undo');
            socket.off('redo');
        };
    }, [socket, history, historyIndex]);

    const autoSaveTimer = useRef(null);

    useEffect(() => {
        if (!socket || !roomId || historyIndex < 0) return;
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = setTimeout(() => {
            const canvasData = history.slice(0, historyIndex + 1);
            if (canvasData.length > 0) {
                socket.emit('canvas-update', { roomId, canvasData });
            }
        }, 2000);
        return () => {
            if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        };
    }, [historyIndex, socket, roomId]);

    const saveState = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const dataUrl = canvas.toDataURL();
        setHistory(prev => {
            const newHistory = prev.slice(0, historyIndex + 1);
            newHistory.push(dataUrl);
            if (newHistory.length > 50) newHistory.shift();
            return newHistory;
        });
        setHistoryIndex(prev => prev + 1);
    }, [historyIndex]);

    const performUndo = useCallback(() => {
        setHistoryIndex(prev => {
            const newIndex = Math.max(0, prev - 1);
            restoreState(newIndex);
            return newIndex;
        });
    }, [history]);

    const performRedo = useCallback(() => {
        setHistoryIndex(prev => {
            const newIndex = Math.min(history.length - 1, prev + 1);
            restoreState(newIndex);
            return newIndex;
        });
    }, [history]);

    const restoreState = (index) => {
        if (index < 0 || index >= history.length) return;
        const img = new Image();
        img.onload = () => {
            const canvas = canvasRef.current;
            const ctx = ctxRef.current;
            if (!canvas || !ctx) return;
            const dpr = window.devicePixelRatio || 1;
            ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
            ctx.drawImage(img, 0, 0, canvas.width / dpr, canvas.height / dpr);
        };
        img.src = history[index];
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = ctxRef.current;
        if (!canvas || !ctx) return;
        const dpr = window.devicePixelRatio || 1;
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        saveState();
    };

    const loadCanvasData = (canvasData) => {
        if (!canvasData || canvasData.length === 0) return;
        const lastSnapshot = canvasData[canvasData.length - 1];
        const img = new Image();
        img.onload = () => {
            const canvas = canvasRef.current;
            const ctx = ctxRef.current;
            if (!canvas || !ctx) return;
            const dpr = window.devicePixelRatio || 1;
            ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
            ctx.drawImage(img, 0, 0, canvas.width / dpr, canvas.height / dpr);
            setHistory(canvasData);
            setHistoryIndex(canvasData.length - 1);
        };
        img.src = lastSnapshot;
    };

    const drawLineOnCtx = (ctx, x0, y0, x1, y1, strokeColor, strokeSize, style = 'solid') => {
        if (!ctx) return;
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeSize;
        ctx.setLineDash(getLineDash(style, strokeSize));
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
        ctx.setLineDash([]);
    };

    const eraseLine = (x0, y0, x1, y1, size) => {
        const ctx = ctxRef.current;
        if (!ctx) return;
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = size;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
    };

    const drawShapeOnCtx = (ctx, data) => {
        if (!ctx) return;
        const { type, x0, y0, x1, y1, color: c, size, style, fill } = data;
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = c;
        ctx.lineWidth = size;
        ctx.setLineDash(getLineDash(style, size));

        if (fill) {
            ctx.fillStyle = c;
        }

        switch (type) {
            case 'line':
                ctx.beginPath();
                ctx.moveTo(x0, y0);
                ctx.lineTo(x1, y1);
                ctx.stroke();
                break;

            case 'arrow': {
                ctx.beginPath();
                ctx.moveTo(x0, y0);
                ctx.lineTo(x1, y1);
                ctx.stroke();
                const angle = Math.atan2(y1 - y0, x1 - x0);
                const headLen = Math.max(size * 4, 12);
                ctx.setLineDash([]);
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x1 - headLen * Math.cos(angle - Math.PI / 6), y1 - headLen * Math.sin(angle - Math.PI / 6));
                ctx.moveTo(x1, y1);
                ctx.lineTo(x1 - headLen * Math.cos(angle + Math.PI / 6), y1 - headLen * Math.sin(angle + Math.PI / 6));
                ctx.stroke();
                break;
            }

            case 'rect':
                ctx.beginPath();
                ctx.rect(x0, y0, x1 - x0, y1 - y0);
                if (fill) ctx.fill();
                ctx.stroke();
                break;

            case 'circle': {
                const cx = (x0 + x1) / 2;
                const cy = (y0 + y1) / 2;
                const rx = Math.abs(x1 - x0) / 2;
                const ry = Math.abs(y1 - y0) / 2;
                if (rx === 0 || ry === 0) break;
                ctx.beginPath();
                ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
                if (fill) ctx.fill();
                ctx.stroke();
                break;
            }

            case 'triangle': {
                const midX = (x0 + x1) / 2;
                ctx.beginPath();
                ctx.moveTo(midX, y0);
                ctx.lineTo(x1, y1);
                ctx.lineTo(x0, y1);
                ctx.closePath();
                if (fill) ctx.fill();
                ctx.stroke();
                break;
            }

            case 'diamond': {
                const dmx = (x0 + x1) / 2;
                const dmy = (y0 + y1) / 2;
                ctx.beginPath();
                ctx.moveTo(dmx, y0);
                ctx.lineTo(x1, dmy);
                ctx.lineTo(dmx, y1);
                ctx.lineTo(x0, dmy);
                ctx.closePath();
                if (fill) ctx.fill();
                ctx.stroke();
                break;
            }

            default:
                break;
        }

        ctx.setLineDash([]);
    };

    const drawTextOnCtx = (ctx, data) => {
        if (!ctx) return;
        const { text, x, y, color: c, fontSize } = data;
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = c;
        ctx.font = `${fontSize}px 'Segoe UI', sans-serif`;
        ctx.textBaseline = 'top';
        const lines = text.split('\n');
        const lineHeight = fontSize * 1.3;
        lines.forEach((line, i) => {
            ctx.fillText(line, x, y + i * lineHeight);
        });
        ctx.restore();
    };

    const commitText = (text, x, y) => {
        if (!text || !text.trim()) {
            setTextInput(null);
            return;
        }
        const fontSize = Math.max(brushSize * 4, 16);
        const data = { text, x, y, color, fontSize };
        drawTextOnCtx(ctxRef.current, data);
        socket?.emit('text', { roomId, ...data });
        saveState();
        setTextInput(null);
    };

    const clearPreview = () => {
        const preview = previewRef.current;
        const pctx = previewCtxRef.current;
        if (!preview || !pctx) return;
        const dpr = window.devicePixelRatio || 1;
        pctx.clearRect(0, 0, preview.width / dpr, preview.height / dpr);
    };

    const getCoords = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const isShapeTool = SHAPE_TOOLS.includes(tool);

    const startDrawing = (e) => {
        e.preventDefault();
        const coords = getCoords(e);

        if (tool === 'text') {
            setTextInput({ x: coords.x, y: coords.y });
            return;
        }

        lastPoint.current = coords;
        setIsDrawing(true);

        if (isShapeTool) {
            shapeStart.current = coords;
            shapeEnd.current = coords;
        }
    };

    const draw = (e) => {
        if (!isDrawing || !lastPoint.current) return;
        e.preventDefault();
        const coords = getCoords(e);

        if (isShapeTool) {
            shapeEnd.current = coords;
            clearPreview();
            const shapeData = {
                type: tool,
                x0: shapeStart.current.x,
                y0: shapeStart.current.y,
                x1: coords.x,
                y1: coords.y,
                color,
                size: brushSize,
                style: lineStyle,
                fill: fillEnabled
            };
            drawShapeOnCtx(previewCtxRef.current, shapeData);
        } else {
            const { x: x0, y: y0 } = lastPoint.current;
            const { x: x1, y: y1 } = coords;

            if (tool === 'eraser') {
                eraseLine(x0, y0, x1, y1, brushSize * 3);
                socket?.emit('erase', { roomId, x0, y0, x1, y1, size: brushSize * 3 });
            } else {
                drawLineOnCtx(ctxRef.current, x0, y0, x1, y1, color, brushSize, lineStyle);
                socket?.emit('draw', { roomId, x0, y0, x1, y1, color, size: brushSize, style: lineStyle });
            }

            lastPoint.current = coords;
        }
    };

    const stopDrawing = (e) => {
        if (!isDrawing) return;

        if (isShapeTool && shapeStart.current) {
            let endCoords = shapeEnd.current || shapeStart.current;

            if (e && !e.touches) {
                try {
                    const canvas = canvasRef.current;
                    const rect = canvas.getBoundingClientRect();
                    endCoords = { x: e.clientX - rect.left, y: e.clientY - rect.top };
                } catch (_) { }
            }

            clearPreview();
            const shapeData = {
                type: tool,
                x0: shapeStart.current.x,
                y0: shapeStart.current.y,
                x1: endCoords.x,
                y1: endCoords.y,
                color,
                size: brushSize,
                style: lineStyle,
                fill: fillEnabled
            };

            const dx = Math.abs(shapeData.x1 - shapeData.x0);
            const dy = Math.abs(shapeData.y1 - shapeData.y0);
            if (dx > 2 || dy > 2) {
                drawShapeOnCtx(ctxRef.current, shapeData);
                socket?.emit('shape', { roomId, ...shapeData });
            }

            shapeStart.current = null;
            shapeEnd.current = null;
        }

        setIsDrawing(false);
        lastPoint.current = null;
        saveState();
    };

    const getCursorClass = () => {
        if (tool === 'text') return 'text-cursor';
        if (tool === 'eraser') return 'eraser-cursor';
        if (isShapeTool) return 'crosshair-cursor';
        if (boardTheme === 'nostalgic' || boardTheme === 'blackboard') return 'chalk-cursor';
        return 'pencil-cursor';
    };

    useImperativeHandle(ref, () => ({
        undo: performUndo,
        redo: performRedo,
        clear: clearCanvas,
        loadCanvasData,
        toDataURL: () => canvasRef.current?.toDataURL(),
        getCanvasData: () => history.slice(0, historyIndex + 1)
    }));

    return (
        <div ref={containerRef} className="canvas-container">
            <canvas
                ref={canvasRef}
                className="drawing-canvas"
            />
            <canvas
                ref={previewRef}
                className={`preview-canvas ${getCursorClass()}`}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
            />
            {textInput && (
                <textarea
                    ref={textareaRef}
                    className="canvas-text-input"
                    style={{
                        left: textInput.x,
                        top: textInput.y,
                        color: color,
                        fontSize: `${Math.max(brushSize * 4, 16)}px`,
                        lineHeight: '1.3',
                    }}
                    autoFocus
                    onBlur={(e) => commitText(e.target.value, textInput.x, textInput.y)}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                            e.target.blur();
                        }
                    }}
                />
            )}
        </div>
    );
});

Canvas.displayName = 'Canvas';
export default Canvas;
