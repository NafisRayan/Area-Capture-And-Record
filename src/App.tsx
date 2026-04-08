/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, 
  Video, 
  Square, 
  StopCircle, 
  Download,
  Copy,
  Trash2,
  MousePointer2,
  Pencil, 
  Type, 
  ArrowUpRight, 
  Eraser, 
  Undo2,
  Settings,
  X,
  Maximize,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---

interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

type Mode = 'idle' | 'selecting' | 'ready' | 'recording' | 'editing';
type Tool = 'pen' | 'rect' | 'arrow' | 'text' | 'eraser';

interface Annotation {
  id: string;
  type: Tool;
  points: { x: number; y: number }[];
  color: string;
  size: number;
  text?: string;
}

// --- Toast Component ---

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, x: "-50%" }}
      animate={{ opacity: 1, y: 0, x: "-50%" }}
      exit={{ opacity: 0, y: 20, x: "-50%" }}
      className="fixed bottom-24 left-1/2 bg-zinc-800 border border-white/10 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 z-[100]"
    >
      <Check className="w-5 h-5 text-green-500" />
      <span className="text-sm font-medium">{message}</span>
    </motion.div>
  );
}

// --- Main Component ---

export default function App() {
  // State
  const [mode, setMode] = useState<Mode>('idle');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [area, setArea] = useState<Area | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  
  // Selection State
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [currentMousePos, setCurrentMousePos] = useState<{ x: number; y: number } | null>(null);

  // Annotation State
  const [activeTool, setActiveTool] = useState<Tool>('pen');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);
  const [color, setColor] = useState('#ef4444');
  const [brushSize, setBrushSize] = useState(4);
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 });
  const [toast, setToast] = useState<string | null>(null);
  const [buttonFeedback, setButtonFeedback] = useState<{ copy: string; save: string }>({ copy: 'Copy', save: 'Save' });

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const annotationsRef = useRef<Annotation[]>([]);
  const currentAnnotationRef = useRef<Annotation | null>(null);

  // Sync state to refs for use in the recording loop
  useEffect(() => {
    annotationsRef.current = annotations;
  }, [annotations]);

  useEffect(() => {
    currentAnnotationRef.current = currentAnnotation;
  }, [currentAnnotation]);

  // --- Sync Stream with Video Element ---
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(err => console.error("Error playing video:", err));
    }
  }, [stream, mode]);

  // --- Handle Video Resizing ---
  useEffect(() => {
    if (!videoRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === videoRef.current) {
          setVideoSize({
            width: videoRef.current.clientWidth,
            height: videoRef.current.clientHeight
          });
        }
      }
    });

    resizeObserver.observe(videoRef.current);
    return () => resizeObserver.disconnect();
  }, [mode, stream]);

  // --- Screen Capture Logic ---

  const startCapture = async () => {
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: { 
          cursor: 'always',
          width: { ideal: 3840 },
          height: { ideal: 2160 },
          frameRate: { ideal: 60 }
        } as any,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });
      setStream(mediaStream);
      setMode('selecting');
      
      mediaStream.getVideoTracks()[0].onended = () => {
        stopAll();
      };
    } catch (err: any) {
      console.error("Error starting screen capture with audio:", err);
      
      // Fallback: try without audio if audio capture is disallowed or fails
      try {
        const mediaStream = await navigator.mediaDevices.getDisplayMedia({
          video: { 
            cursor: 'always',
            width: { ideal: 3840 },
            height: { ideal: 2160 },
            frameRate: { ideal: 60 }
          } as any
        });
        setStream(mediaStream);
        setMode('selecting');
        
        mediaStream.getVideoTracks()[0].onended = () => {
          stopAll();
        };
        return;
      } catch (fallbackErr: any) {
        console.error("Error starting screen capture without audio:", fallbackErr);
        if (fallbackErr.name === 'NotAllowedError' || fallbackErr.message?.includes('permissions policy')) {
          setError("Screen capture is blocked by the browser's permission policy. Try opening the app in a new tab using the button in the top right of the editor.");
        } else {
          setError("Failed to start screen capture. Please ensure you have granted the necessary permissions.");
        }
      }
    }
  };

  const stopAll = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
    setArea(null);
    setMode('idle');
    setIsRecording(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  // --- Selection Logic ---

  const handleMouseDown = (e: React.MouseEvent) => {
    if (mode !== 'selecting') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setSelectionStart({ x, y });
    setCurrentMousePos({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (mode !== 'selecting' || !selectionStart) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setCurrentMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseUp = () => {
    if (mode !== 'selecting' || !selectionStart || !currentMousePos) return;
    
    const x = Math.min(selectionStart.x, currentMousePos.x);
    const y = Math.min(selectionStart.y, currentMousePos.y);
    const width = Math.abs(selectionStart.x - currentMousePos.x);
    const height = Math.abs(selectionStart.y - currentMousePos.y);

    if (width > 10 && height > 10) {
      setArea({ x, y, width, height });
      setMode('ready');
    }
    
    setSelectionStart(null);
    setCurrentMousePos(null);
  };

  // --- Recording Logic (Approach A: Canvas Cropping) ---

  const startRecording = () => {
    if (!stream || !area || !videoRef.current) return;

    const video = videoRef.current;
    const scaleX = video.videoWidth / video.clientWidth;
    const scaleY = video.videoHeight / video.clientHeight;

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = area.width * scaleX;
    cropCanvas.height = area.height * scaleY;
    const ctx = cropCanvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const canvasStream = cropCanvas.captureStream(60);
    
    // Add audio if available
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length > 0) {
      canvasStream.addTrack(audioTracks[0]);
    }

    const recorder = new MediaRecorder(canvasStream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 10000000 // 10 Mbps
    });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recording-${Date.now()}.webm`;
      a.click();
      setRecordedChunks([]);
    };

    recorderRef.current = recorder;
    recorder.start();
    setIsRecording(true);
    setMode('recording');

    const annCanvas = document.createElement('canvas');
    annCanvas.width = cropCanvas.width;
    annCanvas.height = cropCanvas.height;
    const annCtx = annCanvas.getContext('2d');

    // Draw loop
    const draw = () => {
      if (videoRef.current && ctx && annCtx) {
        // Draw the cropped video frame at source resolution
        ctx.drawImage(
          video,
          area.x * scaleX, area.y * scaleY, area.width * scaleX, area.height * scaleY,
          0, 0, cropCanvas.width, cropCanvas.height
        );

        // Draw live annotations on top of the recording
        const allAnnotations = [...annotationsRef.current, ...(currentAnnotationRef.current ? [currentAnnotationRef.current] : [])];
        if (allAnnotations.length > 0) {
          annCtx.clearRect(0, 0, annCanvas.width, annCanvas.height);
          allAnnotations.forEach(ann => {
            annCtx.strokeStyle = ann.color;
            annCtx.fillStyle = ann.color;
            annCtx.lineWidth = ann.size * scaleX;
            annCtx.lineCap = 'round';
            annCtx.lineJoin = 'round';
            annCtx.beginPath();

            const adjust = (p: { x: number; y: number }) => ({
              x: (p.x - area.x) * scaleX,
              y: (p.y - area.y) * scaleY
            });

            if (ann.type === 'pen' || ann.type === 'eraser') {
              if (ann.type === 'eraser') {
                annCtx.globalCompositeOperation = 'destination-out';
                annCtx.lineWidth = ann.size * 2 * scaleX;
              } else {
                annCtx.globalCompositeOperation = 'source-over';
              }
              ann.points.forEach((p, i) => {
                const adj = adjust(p);
                if (i === 0) annCtx.moveTo(adj.x, adj.y);
                else annCtx.lineTo(adj.x, adj.y);
              });
              annCtx.stroke();
              annCtx.globalCompositeOperation = 'source-over';
            } else if (ann.type === 'rect' && ann.points.length > 1) {
              const start = adjust(ann.points[0]);
              const end = adjust(ann.points[ann.points.length - 1]);
              annCtx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
            } else if (ann.type === 'arrow' && ann.points.length > 1) {
              const start = adjust(ann.points[0]);
              const end = adjust(ann.points[ann.points.length - 1]);
              const headlen = 15 * scaleX;
              const angle = Math.atan2(end.y - start.y, end.x - start.x);
              annCtx.moveTo(start.x, start.y);
              annCtx.lineTo(end.x, end.y);
              annCtx.lineTo(end.x - headlen * Math.cos(angle - Math.PI / 6), end.y - headlen * Math.sin(angle - Math.PI / 6));
              annCtx.moveTo(end.x, end.y);
              annCtx.lineTo(end.x - headlen * Math.cos(angle + Math.PI / 6), end.y - headlen * Math.sin(angle + Math.PI / 6));
              annCtx.stroke();
            } else if (ann.type === 'text' && ann.text) {
              const start = adjust(ann.points[0]);
              annCtx.font = `${ann.size * 5 * scaleX}px sans-serif`;
              annCtx.fillText(ann.text, start.x, start.y);
            }
          });
          ctx.drawImage(annCanvas, 0, 0);
        }
      }
      animationFrameRef.current = requestAnimationFrame(draw);
    };
    draw();
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setIsRecording(false);
    setMode('ready');
    setAnnotations([]);
  };

  // --- Screenshot Logic ---

  const takeScreenshot = () => {
    if (!videoRef.current || !area) return;

    const video = videoRef.current;
    const scaleX = video.videoWidth / video.clientWidth;
    const scaleY = video.videoHeight / video.clientHeight;

    const canvas = document.createElement('canvas');
    canvas.width = area.width * scaleX;
    canvas.height = area.height * scaleY;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(
      video,
      area.x * scaleX, area.y * scaleY, area.width * scaleX, area.height * scaleY,
      0, 0, canvas.width, canvas.height
    );

    const dataUrl = canvas.toDataURL('image/png', 1.0);
    setCapturedImage(dataUrl);
    setMode('editing');
  };

  // --- Annotation Logic ---

  const startAnnotation = (e: React.MouseEvent) => {
    if (mode !== 'editing' && mode !== 'recording') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // If recording, only allow drawing inside the selected area
    if (mode === 'recording' && area) {
      if (x < area.x || x > area.x + area.width || y < area.y || y > area.y + area.height) {
        return;
      }
    }

    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      type: activeTool,
      points: [{ x, y }],
      color,
      size: brushSize,
    };

    if (activeTool === 'text') {
      const text = prompt("Enter text:");
      if (text) {
        newAnnotation.text = text;
        setAnnotations([...annotations, newAnnotation]);
      }
      return;
    }

    setCurrentAnnotation(newAnnotation);
  };

  const updateAnnotation = (e: React.MouseEvent) => {
    if (!currentAnnotation) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentAnnotation(prev => {
      if (!prev) return null;
      return {
        ...prev,
        points: [...prev.points, { x, y }]
      };
    });
  };

  const endAnnotation = () => {
    if (currentAnnotation) {
      setAnnotations([...annotations, currentAnnotation]);
      setCurrentAnnotation(null);
    }
  };

  const downloadAnnotated = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `screenshot-${Date.now()}.png`;
    a.click();
    setAnnotations([]);
    setToast('Screenshot saved successfully!');
    setButtonFeedback(prev => ({ ...prev, save: 'Saved' }));
    setTimeout(() => setButtonFeedback(prev => ({ ...prev, save: 'Save' })), 2000);
  };

  const copyToClipboard = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (blob) {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          setAnnotations([]);
          setToast('Copied to clipboard!');
          setButtonFeedback(prev => ({ ...prev, copy: 'Copied' }));
          setTimeout(() => setButtonFeedback(prev => ({ ...prev, copy: 'Copy' })), 2000);
        }
      }, 'image/png');
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      setError('Failed to copy to clipboard. Your browser may not support this feature.');
    }
  };

  // --- Render Helpers ---

  const renderCurrentSelection = () => {
    if (!selectionStart || !currentMousePos) return null;
    const x = Math.min(selectionStart.x, currentMousePos.x);
    const y = Math.min(selectionStart.y, currentMousePos.y);
    const width = Math.abs(selectionStart.x - currentMousePos.x);
    const height = Math.abs(selectionStart.y - currentMousePos.y);

    return (
      <div 
        className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none"
        style={{ left: x, top: y, width, height }}
      />
    );
  };

  // Canvas Drawing Effect for Annotations
  useEffect(() => {
    const drawOnCanvas = (canvas: HTMLCanvasElement, baseImage?: string) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (baseImage) {
        const img = new Image();
        img.src = baseImage;
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          drawAnnotations(ctx, false, canvas.width, canvas.height);
        };
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawAnnotations(ctx, true, canvas.width, canvas.height);
      }
    };

    const drawAnnotations = (ctx: CanvasRenderingContext2D, isLive: boolean, width: number, height: number) => {
      const allAnnotations = [...annotations, ...(currentAnnotation ? [currentAnnotation] : [])];
      if (allAnnotations.length === 0) return;

      // Create an offscreen canvas to draw annotations
      const offCanvas = document.createElement('canvas');
      offCanvas.width = width;
      offCanvas.height = height;
      const offCtx = offCanvas.getContext('2d');
      if (!offCtx) return;

      allAnnotations.forEach(ann => {
        offCtx.strokeStyle = ann.color;
        offCtx.fillStyle = ann.color;
        offCtx.lineWidth = ann.size;
        offCtx.lineCap = 'round';
        offCtx.lineJoin = 'round';
        offCtx.beginPath();

        if (ann.type === 'pen' || ann.type === 'eraser') {
          if (ann.type === 'eraser') {
            offCtx.globalCompositeOperation = 'destination-out';
            offCtx.lineWidth = ann.size * 2;
          } else {
            offCtx.globalCompositeOperation = 'source-over';
          }
          ann.points.forEach((p, i) => {
            if (i === 0) offCtx.moveTo(p.x, p.y);
            else offCtx.lineTo(p.x, p.y);
          });
          offCtx.stroke();
          offCtx.globalCompositeOperation = 'source-over';
        } else if (ann.type === 'rect' && ann.points.length > 1) {
          const start = ann.points[0];
          const end = ann.points[ann.points.length - 1];
          offCtx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
        } else if (ann.type === 'arrow' && ann.points.length > 1) {
          const start = ann.points[0];
          const end = ann.points[ann.points.length - 1];
          const headlen = 15;
          const angle = Math.atan2(end.y - start.y, end.x - start.x);
          offCtx.moveTo(start.x, start.y);
          offCtx.lineTo(end.x, end.y);
          offCtx.lineTo(end.x - headlen * Math.cos(angle - Math.PI / 6), end.y - headlen * Math.sin(angle - Math.PI / 6));
          offCtx.moveTo(end.x, end.y);
          offCtx.lineTo(end.x - headlen * Math.cos(angle + Math.PI / 6), end.y - headlen * Math.sin(angle + Math.PI / 6));
          offCtx.stroke();
        } else if (ann.type === 'text' && ann.text) {
          const start = ann.points[0];
          offCtx.font = `${ann.size * 5}px sans-serif`;
          offCtx.fillText(ann.text, start.x, start.y);
        }
      });

      ctx.drawImage(offCanvas, 0, 0);
    };

    if (mode === 'editing' && canvasRef.current && capturedImage) {
      drawOnCanvas(canvasRef.current, capturedImage);
    } else if (mode === 'recording' && liveCanvasRef.current) {
      const canvas = liveCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawAnnotations(ctx, true, canvas.width, canvas.height);
      }
    }
  }, [mode, capturedImage, annotations, currentAnnotation]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-blue-500/30">
      {/* --- Header --- */}
      <header className="fixed top-0 left-0 right-0 h-16 border-b border-white/10 bg-black/50 backdrop-blur-xl z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Maximize className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight">Area Capture</h1>
        </div>

        <div className="flex items-center gap-2">
          {mode === 'idle' ? (
            <button 
              onClick={startCapture}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-medium transition-all active:scale-95 shadow-lg shadow-blue-600/20"
            >
              <Video className="w-4 h-4" />
              Start Capture
            </button>
          ) : (
            <button 
              onClick={stopAll}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full font-medium transition-all active:scale-95"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          )}
        </div>
      </header>

      {/* --- Main Content --- */}
      <main className="pt-24 pb-32 px-6 max-w-7xl mx-auto">
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-2xl flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3 text-red-200">
              <X className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
            <button 
              onClick={() => setError(null)}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
        <div className="relative rounded-2xl overflow-hidden bg-zinc-900 shadow-2xl border border-white/5 aspect-video flex items-center justify-center group">
          {mode === 'idle' && (
            <div className="text-center space-y-4 max-w-md px-6">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6">
                <Camera className="w-8 h-8 text-white/40" />
              </div>
              <h2 className="text-2xl font-bold">No Source Selected</h2>
              <p className="text-zinc-400">Click the button above to select a screen or window to start capturing and recording specific areas.</p>
            </div>
          )}

          {/* Video Stream & Selection Overlay */}
          {(mode === 'selecting' || mode === 'ready' || mode === 'recording') && stream && (
            <div 
              className="relative w-full h-full"
              onMouseDown={mode === 'recording' ? startAnnotation : undefined}
              onMouseMove={mode === 'recording' ? updateAnnotation : undefined}
              onMouseUp={mode === 'recording' ? endAnnotation : undefined}
            >
              <video 
                ref={videoRef}
                autoPlay
                muted
                playsInline
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    setVideoSize({
                      width: videoRef.current.clientWidth,
                      height: videoRef.current.clientHeight
                    });
                  }
                }}
                className="w-full h-full object-contain"
              />

              {/* Live Annotation Canvas */}
              {mode === 'recording' && (
                <canvas 
                  ref={liveCanvasRef}
                  width={videoSize.width}
                  height={videoSize.height}
                  className="absolute inset-0 pointer-events-none"
                />
              )}
              
              {/* Dimmed Overlay for Selection */}
              {mode === 'selecting' && (
                <div 
                  className="absolute inset-0 bg-black/40 cursor-crosshair"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                >
                  {renderCurrentSelection()}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-sm font-medium">
                    Click and drag to select an area
                  </div>
                </div>
              )}

              {/* Highlighted Area */}
              {area && (
                <div 
                  className={`absolute border-2 ${mode === 'recording' ? 'border-red-500 animate-pulse' : 'border-blue-500'} pointer-events-none`}
                  style={{ left: area.x, top: area.y, width: area.width, height: area.height }}
                >
                  {mode === 'recording' && (
                    <div className="absolute -top-8 left-0 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                      Recording
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Annotation Editor */}
          {mode === 'editing' && capturedImage && (
            <div className="relative w-full h-full flex items-center justify-center bg-zinc-950">
              <div className="relative shadow-2xl border border-white/10">
                <canvas 
                  ref={canvasRef}
                  width={area?.width}
                  height={area?.height}
                  onMouseDown={startAnnotation}
                  onMouseMove={updateAnnotation}
                  onMouseUp={endAnnotation}
                  className="cursor-crosshair block"
                />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* --- Bottom Controls --- */}
      <AnimatePresence>
        {mode !== 'idle' && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="bg-zinc-900/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-2 flex items-center gap-2 shadow-2xl">
              {mode === 'selecting' && (
                <div className="px-4 text-sm text-zinc-400 font-medium">
                  Select an area to continue
                </div>
              )}

              {mode === 'ready' && (
                <>
                  <button 
                    onClick={takeScreenshot}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white text-black hover:bg-zinc-200 rounded-2xl font-semibold transition-all active:scale-95"
                  >
                    <Camera className="w-4 h-4" />
                    Screenshot
                  </button>
                  <button 
                    onClick={startRecording}
                    className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-semibold transition-all active:scale-95"
                  >
                    <Video className="w-4 h-4" />
                    Record Area
                  </button>
                  <div className="w-px h-8 bg-white/10 mx-1" />
                  <button 
                    onClick={() => { setArea(null); setMode('selecting'); }}
                    className="p-2.5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-2xl transition-all"
                    title="Reselect Area"
                  >
                    <Square className="w-5 h-5" />
                  </button>
                </>
              )}

              {(mode === 'recording' || mode === 'editing') && (
                <div className="flex items-center gap-2">
                  {/* Tool Selection */}
                  <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl">
                    <ToolButton 
                      active={activeTool === 'pen'} 
                      onClick={() => setActiveTool('pen')} 
                      icon={<Pencil className="w-4 h-4" />} 
                      title="Pen"
                    />
                    <ToolButton 
                      active={activeTool === 'rect'} 
                      onClick={() => setActiveTool('rect')} 
                      icon={<Square className="w-4 h-4" />} 
                      title="Rectangle"
                    />
                    <ToolButton 
                      active={activeTool === 'arrow'} 
                      onClick={() => setActiveTool('arrow')} 
                      icon={<ArrowUpRight className="w-4 h-4" />} 
                      title="Arrow"
                    />
                    <ToolButton 
                      active={activeTool === 'text'} 
                      onClick={() => setActiveTool('text')} 
                      icon={<Type className="w-4 h-4" />} 
                      title="Text"
                    />
                    <ToolButton 
                      active={activeTool === 'eraser'} 
                      onClick={() => setActiveTool('eraser')} 
                      icon={<Eraser className="w-4 h-4" />} 
                      title="Eraser"
                    />
                  </div>

                  <div className="w-px h-8 bg-white/10 mx-1" />

                  {/* Color Picker */}
                  <div className="flex items-center gap-2 px-2">
                    {['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#ffffff'].map(c => (
                      <button 
                        key={c}
                        onClick={() => setColor(c)}
                        className={`w-6 h-6 rounded-full border-2 transition-transform active:scale-90 ${color === c ? 'border-white scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>

                  <div className="w-px h-8 bg-white/10 mx-1" />

                  <button 
                    onClick={() => setAnnotations([])}
                    className="p-2.5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-2xl transition-all"
                    title="Clear All"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setAnnotations(prev => prev.slice(0, -1))}
                    className="p-2.5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-2xl transition-all"
                    title="Undo"
                  >
                    <Undo2 className="w-5 h-5" />
                  </button>

                  <div className="w-px h-8 bg-white/10 mx-1" />

                  {mode === 'recording' ? (
                    <button
                      onClick={stopRecording}
                      className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-semibold transition-all"
                    >
                      <StopCircle className="w-5 h-5" />
                      Stop
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={copyToClipboard}
                        className="flex items-center gap-2 px-4 py-2.5 bg-zinc-700 hover:bg-zinc-600 text-white rounded-2xl font-semibold transition-all"
                      >
                        <Copy className="w-4 h-4" />
                        {buttonFeedback.copy}
                      </button>
                      <button
                        onClick={downloadAnnotated}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-semibold transition-all"
                      >
                        <Download className="w-4 h-4" />
                        {buttonFeedback.save}
                      </button>
                      <button
                        onClick={() => setMode('ready')}
                        className="p-2.5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-2xl transition-all"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Background Decorations --- */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
      </div>

      <AnimatePresence>
        {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  );
}

function ToolButton({ active, onClick, icon, title }: { active: boolean; onClick: () => void; icon: React.ReactNode; title?: string }) {
  return (
    <button 
      onClick={onClick}
      title={title}
      className={`p-2 rounded-xl transition-all ${active ? 'bg-white text-black' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}
    >
      {icon}
    </button>
  );
}
