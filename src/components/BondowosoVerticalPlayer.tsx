import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Sparkles,
  Flame,
  Coffee,
  Mountain,
  Music,
  Sliders,
} from 'lucide-react';
import { Karya } from '../types/index.ts';

interface BondowosoVerticalPlayerProps {
  karya: Karya;
  showHudOverlay: boolean;
  onToggleHud: () => void;
  blindReviewMode: boolean;
}

export const BondowosoVerticalPlayer: React.FC<BondowosoVerticalPlayerProps> = ({
  karya,
  showHudOverlay,
  onToggleHud,
  blindReviewMode,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(karya.metadata.duration_seconds || 45);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isNativeVideo, setIsNativeVideo] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animFrameId = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Update duration when karya changes
  useEffect(() => {
    setDuration(karya.metadata.duration_seconds || 45);
    setCurrentTime(0);
    setIsPlaying(false);

    // If karya video_url is a local blob (from ZIP ingest), try native video first
    if (karya.video_url.startsWith('blob:') || karya.video_url.startsWith('data:')) {
      setIsNativeVideo(true);
    } else {
      // Use cinematic interactive canvas rendering to prevent ERR_BLOCKED_BY_ORB
      setIsNativeVideo(false);
    }
  }, [karya]);

  // Web Audio ambient synthesizer
  const playAmbientSound = (time: number) => {
    if (isMuted) return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        audioCtxRef.current = new AudioCtx();
        const gain = audioCtxRef.current.createGain();
        gain.gain.value = 0.08;
        gain.connect(audioCtxRef.current.destination);
        gainNodeRef.current = gain;
      }

      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Traditional gamelan pelog frequencies: 260, 280, 315, 390, 420 Hz
      const notes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];
      const noteIdx = Math.floor((time * 1.5) % notes.length);

      // Play note occasionally
      if (Math.floor(time * 2) !== Math.floor((time - 0.03) * 2)) {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(notes[noteIdx], ctx.currentTime);

        noteGain.gain.setValueAtTime(0.06, ctx.currentTime);
        noteGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

        osc.connect(noteGain);
        noteGain.connect(gainNodeRef.current!);
        osc.start();
        osc.stop(ctx.currentTime + 1.2);
      }
    } catch {
      // AudioContext not allowed or unsupported
    }
  };

  // Canvas drawing loop
  useEffect(() => {
    if (isNativeVideo) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let localCurrentTime = currentTime;

    const render = (now: number) => {
      const delta = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      if (isPlaying) {
        localCurrentTime += delta * playbackSpeed;
        if (localCurrentTime >= duration) {
          localCurrentTime = 0; // loop
        }
        setCurrentTime(localCurrentTime);
        playAmbientSound(localCurrentTime);
      }

      // Canvas dimensions (aspect ratio 9:16: 360 x 640)
      const w = canvas.width;
      const h = canvas.height;
      const progress = localCurrentTime / duration;

      ctx.clearRect(0, 0, w, h);

      // Background gradient based on theme
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      if (karya.id === 'BND01') {
        // Kawah Ijen: Deep turquoise night/dawn to electric sulfur
        grad.addColorStop(0, '#021019');
        grad.addColorStop(0.4, '#042a38');
        grad.addColorStop(0.7, '#074852');
        grad.addColorStop(1, '#02181b');
      } else if (karya.id === 'BND02') {
        // Tari Topeng Kona: Mystical red and gold
        grad.addColorStop(0, '#1c0303');
        grad.addColorStop(0.5, '#400a0a');
        grad.addColorStop(0.8, '#5c1010');
        grad.addColorStop(1, '#150303');
      } else if (karya.id === 'BND03') {
        // Kopi Arabika: Coffee brown & mountain green
        grad.addColorStop(0, '#120b06');
        grad.addColorStop(0.5, '#2b180d');
        grad.addColorStop(0.8, '#3d2415');
        grad.addColorStop(1, '#150d06');
      } else if (karya.id === 'BND04') {
        // Megalitikum: Ancient twilight stone & stars
        grad.addColorStop(0, '#060914');
        grad.addColorStop(0.5, '#12192e');
        grad.addColorStop(1, '#090d1a');
      } else {
        // Default Bondowoso Geopark theme
        grad.addColorStop(0, '#090d16');
        grad.addColorStop(0.5, '#131e33');
        grad.addColorStop(1, '#070b12');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Starry sky / particles in upper sky
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      for (let i = 0; i < 40; i++) {
        const sx = ((i * 37 + localCurrentTime * 5) % w);
        const sy = (i * 23) % (h * 0.4);
        const size = (i % 3) + 1;
        ctx.beginPath();
        ctx.arc(sx, sy, size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Distant mountain silhouette (Gunung Ijen & Raung)
      ctx.fillStyle = 'rgba(10, 18, 30, 0.8)';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.55);
      ctx.lineTo(w * 0.25, h * 0.38);
      ctx.lineTo(w * 0.55, h * 0.46);
      ctx.lineTo(w * 0.85, h * 0.35);
      ctx.lineTo(w, h * 0.52);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();

      // Theme-specific foreground visual animation
      if (karya.id === 'BND01') {
        // Blue Fire animation & sulfur lake
        // Turquoise lake
        const lakeGrad = ctx.createLinearGradient(0, h * 0.65, 0, h);
        lakeGrad.addColorStop(0, '#0ec5ba');
        lakeGrad.addColorStop(0.5, '#077a79');
        lakeGrad.addColorStop(1, '#033739');
        ctx.fillStyle = lakeGrad;
        ctx.beginPath();
        ctx.ellipse(w * 0.5, h * 0.75, w * 0.6, h * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();

        // Glowing Blue Fire flames
        for (let f = 0; f < 8; f++) {
          const fx = w * 0.3 + f * 20 + Math.sin(localCurrentTime * 3 + f) * 6;
          const fy = h * 0.72 - (f % 3) * 12 + Math.cos(localCurrentTime * 4 + f) * 8;
          const flameRad = 15 + Math.sin(localCurrentTime * 6 + f) * 6;

          const flameGrad = ctx.createRadialGradient(fx, fy, 2, fx, fy, flameRad);
          flameGrad.addColorStop(0, '#ffffff');
          flameGrad.addColorStop(0.3, '#38bdf8');
          flameGrad.addColorStop(0.7, '#2563eb');
          flameGrad.addColorStop(1, 'transparent');

          ctx.fillStyle = flameGrad;
          ctx.beginPath();
          ctx.arc(fx, fy, flameRad, 0, Math.PI * 2);
          ctx.fill();
        }

        // Drifting sulfur smoke
        ctx.fillStyle = 'rgba(180, 255, 230, 0.08)';
        for (let s = 0; s < 6; s++) {
          const smX = (w * 0.3 + s * 30 + Math.sin(localCurrentTime + s) * 20);
          const smY = h * 0.68 - ((localCurrentTime * 35 + s * 40) % (h * 0.4));
          ctx.beginPath();
          ctx.arc(smX, smY, 30 + s * 5, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (karya.id === 'BND02') {
        // Topeng Kona mask silhouette and gold aura
        const cx = w * 0.5;
        const cy = h * 0.52 + Math.sin(localCurrentTime * 2) * 8;

        // Glowing red aura
        const aura = ctx.createRadialGradient(cx, cy, 20, cx, cy, 110);
        aura.addColorStop(0, 'rgba(239, 68, 68, 0.5)');
        aura.addColorStop(0.6, 'rgba(185, 28, 28, 0.2)');
        aura.addColorStop(1, 'transparent');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(cx, cy, 110, 0, Math.PI * 2);
        ctx.fill();

        // Mask Face outline
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 55, 75, 0, 0, Math.PI * 2);
        ctx.fill();

        // Intricate wood-carved eyes
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.ellipse(cx - 20, cy - 10, 12, 8, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + 20, cy - 10, 12, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pupils
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(cx - 20, cy - 10, 4, 0, Math.PI * 2);
        ctx.arc(cx + 20, cy - 10, 4, 0, Math.PI * 2);
        ctx.fill();

        // Traditional golden teeth / mouth
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(cx - 22, cy + 28, 44, 10);
      } else if (karya.id === 'BND03') {
        // Coffee Beans and Steaming Cup
        const cx = w * 0.5;
        const cy = h * 0.65;

        // Coffee cup saucer
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 40, 70, 15, 0, 0, Math.PI * 2);
        ctx.fill();

        // Coffee cup
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 10, 48, 35, 0, 0, Math.PI * 2);
        ctx.fill();

        // Coffee surface (dark espresso with crema)
        const coffeeGrad = ctx.createRadialGradient(cx, cy - 5, 5, cx, cy - 5, 40);
        coffeeGrad.addColorStop(0, '#d97706');
        coffeeGrad.addColorStop(0.7, '#451a03');
        coffeeGrad.addColorStop(1, '#1c0a00');
        ctx.fillStyle = coffeeGrad;
        ctx.beginPath();
        ctx.ellipse(cx, cy - 5, 42, 22, 0, 0, Math.PI * 2);
        ctx.fill();

        // Rising aromatic steam
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        for (let st = 0; st < 4; st++) {
          const stX = cx - 20 + st * 15 + Math.sin(localCurrentTime * 3 + st) * 10;
          const stY = cy - 40 - ((localCurrentTime * 30 + st * 25) % 90);
          ctx.beginPath();
          ctx.arc(stX, stY, 12 + st * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Megalitikum / Pariwisata / Umum: Ancient standing stone dolmen
        const cx = w * 0.5;
        const cy = h * 0.62;

        ctx.fillStyle = '#475569';
        // Left stone pillar
        ctx.fillRect(cx - 50, cy - 60, 26, 120);
        // Right stone pillar
        ctx.fillRect(cx + 24, cy - 60, 26, 120);
        // Top massive dolmen capstone
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.roundRect(cx - 65, cy - 85, 130, 32, 10);
        ctx.fill();

        // Glowing ancient rune pulse
        ctx.fillStyle = `rgba(129, 140, 248, ${0.4 + Math.sin(localCurrentTime * 2) * 0.3})`;
        ctx.beginPath();
        ctx.arc(cx, cy - 20, 16, 0, Math.PI * 2);
        ctx.fill();
      }

      // Title & watermark overlay inside video
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(0, 0, w, 40);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(blindReviewMode ? `KARYA #${karya.id}` : karya.judul_karya.slice(0, 28), 12, 24);

      // AI watermark badge bottom right
      ctx.fillStyle = 'rgba(99, 102, 241, 0.85)';
      ctx.beginPath();
      ctx.roundRect(w - 95, h - 32, 85, 22, 6);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('AI GENERATED', w - 87, h - 18);

      // Playback progress line at bottom of canvas
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(0, h - 4, w, 4);
      ctx.fillStyle = '#6366f1';
      ctx.fillRect(0, h - 4, w * progress, 4);

      animFrameId.current = requestAnimationFrame(render);
    };

    lastTimeRef.current = performance.now();
    animFrameId.current = requestAnimationFrame(render);

    return () => {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
    };
  }, [isPlaying, currentTime, duration, playbackSpeed, isMuted, karya, blindReviewMode, isNativeVideo]);

  // Toggle Play / Pause
  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const changeSpeed = (spd: number) => {
    setPlaybackSpeed(spd);
  };

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Header bar */}
      <div className="p-3 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
            Pemutar Media 9:16 Vertical (Juknis Ambang Batas)
          </span>
          <h3 className="text-xs font-bold text-slate-200 truncate max-w-[200px] sm:max-w-xs">
            {blindReviewMode ? `Karya #${karya.id} [Blind Review]` : karya.judul_karya}
          </h3>
        </div>
        <button
          onClick={onToggleHud}
          type="button"
          className={`text-[11px] px-2 py-1 rounded border transition-colors ${
            showHudOverlay
              ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}
        >
          HUD Specs
        </button>
      </div>

      {/* Video Viewport Container (Strict 9:16 aspect ratio) */}
      <div className="relative bg-black flex items-center justify-center aspect-[9/16] max-h-[560px] mx-auto overflow-hidden">
        {/* Render Canvas Video */}
        <canvas
          ref={canvasRef}
          width={360}
          height={640}
          onClick={togglePlay}
          className="w-full h-full object-contain cursor-pointer"
        />

        {/* Technical HUD Overlay (Section 5.2 & 6) */}
        {showHudOverlay && (
          <div className="absolute top-2 left-2 right-2 pointer-events-none flex flex-col space-y-1 text-[10px] font-mono">
            <div className="self-start bg-black/80 backdrop-blur-md px-2 py-0.5 rounded border border-white/10 text-emerald-400">
              <span>9:16 VERTICAL • {karya.metadata.width}x{karya.metadata.height} @ {karya.metadata.fps}FPS</span>
            </div>
            <div className="self-start bg-black/80 backdrop-blur-md px-2 py-0.5 rounded border border-white/10 text-slate-300">
              <span>CODEC: {karya.metadata.codec} • AUDIO: {karya.metadata.audio_sample_rate_khz}kHz</span>
            </div>
            {karya.status_teknis === 'RED_FLAG' && !karya.is_overridden && (
              <div className="self-start bg-rose-950/90 border border-rose-500/70 px-2 py-0.5 rounded text-rose-300 font-bold">
                ⚠ RED FLAG: DURASI {karya.metadata.duration_seconds}s (DISKUALIFIKASI)
              </div>
            )}
            {karya.is_overridden && (
              <div className="self-start bg-emerald-950/90 border border-emerald-500/70 px-2 py-0.5 rounded text-emerald-300 font-bold">
                ✓ MANUAL OVERRIDE (DIIZINKAN ADMIN)
              </div>
            )}
          </div>
        )}

        {/* Play Icon Overlay if paused */}
        {!isPlaying && (
          <button
            onClick={togglePlay}
            aria-label="Putar video"
            className="absolute inset-0 flex items-center justify-center bg-black/25 hover:bg-black/35 transition-colors group cursor-pointer"
          >
            <div className="w-16 h-16 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
              <Play className="w-7 h-7 ml-1 fill-white" />
            </div>
          </button>
        )}
      </div>

      {/* Control Bar */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 space-y-2">
        {/* Progress Slider */}
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-mono text-slate-400 min-w-[34px]">
            {formatSec(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={duration}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            aria-label="Posisi pemutaran video"
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
          <span className="text-[11px] font-mono text-slate-400 min-w-[34px]">
            {formatSec(duration)}
          </span>
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between text-slate-300 text-xs">
          <div className="flex items-center space-x-1.5">
            <button
              onClick={togglePlay}
              type="button"
              className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-white"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setCurrentTime(0)}
              type="button"
              className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
              title="Mulai dari awal"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={toggleMute}
              type="button"
              className={`p-1.5 rounded-lg transition-colors ${
                !isMuted ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-400 hover:text-white'
              }`}
              title={isMuted ? 'Nyalakan Audio' : 'Bisukan Audio'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>

          {/* Speed Selector */}
          <div className="flex items-center space-x-1 text-[11px]">
            <span className="text-slate-500">Speed:</span>
            {[0.5, 1, 1.5, 2].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => changeSpeed(spd)}
                className={`px-1.5 py-0.5 rounded font-semibold ${
                  playbackSpeed === spd
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
