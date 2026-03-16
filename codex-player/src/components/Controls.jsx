import { useState, useRef, useEffect, MouseEvent } from 'react';
import {
  Play, Pause, SkipBack, SkipForward,
  Volume2, Volume1, VolumeX, Maximize,
  Settings
} from 'lucide-react';

// ─── Вспомогательная функция для форматирования времени ────────────────────────
function formatTime(seconds) {
  if (isNaN(seconds)) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function Controls({
  // Реф на <video>
  videoRef,
  // Реф на контейнер плеера (для фуллскрина)
  containerRef,
  // Состояния
  isPlaying,
  currentTime,
  duration,
  watchedPercent,
  // Хендлеры
  onPlayPause,
  onNext,
  onPrev,
}) {
  // ─── Локальные стейты для UI ────────────────────────────────────────────────
  const [isHoveringProgress, setIsHoveringProgress] = useState(false);
  const [hoverPosition, setHoverPosition] = useState(0); // 0..1
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);

  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  const [playbackRate, setPlaybackRate] = useState(() => {
    return parseFloat(localStorage.getItem('codex_playbackRate')) || 1;
  });
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const progressRef = useRef(null);

  // ─── Синхронизация громкости и скорости с <video> ─────────────────────────
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted, videoRef]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
      localStorage.setItem('codex_playbackRate', playbackRate.toString());
    }
  }, [playbackRate, videoRef]);

  // ─── Прогресс-бар: логика взаимодействия ─────────────────────────────────

  // Рассчитываем процент текущего времени (для заполнения жёлтой полосы)
  const currentPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProgressMouseMove = (e) => {
    if (!progressRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPosition(pos);

    if (isDraggingProgress) {
      videoRef.current.currentTime = pos * duration;
    }
  };

  const handleProgressMouseDown = (e) => {
    if (!progressRef.current || !duration) return;
    setIsDraggingProgress(true);
    const rect = progressRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    videoRef.current.currentTime = pos * duration;
  };

  useEffect(() => {
    const handleMouseUp = () => setIsDraggingProgress(false);
    if (isDraggingProgress) {
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('mousemove', handleProgressMouseMove);
    }
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleProgressMouseMove);
    };
  }, [isDraggingProgress, duration]); // eslint-disable-line

  // ─── Громкость ─────────────────────────────────────────────────────────────
  const toggleMute = () => setIsMuted((prev) => !prev);
  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (val > 0 && isMuted) setIsMuted(false);
  };

  let VolumeIcon = Volume2;
  if (isMuted || volume === 0) VolumeIcon = VolumeX;
  else if (volume < 0.5) VolumeIcon = Volume1;

  // ─── Фуллскрин ─────────────────────────────────────────────────────────────
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.warn(`Fullscreen API error: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // ─── Рендер Контролов ──────────────────────────────────────────────────────
  return (
    <div
      className="absolute bottom-0 left-0 right-0 px-6 pt-16 pb-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col gap-4"
      onClick={e => e.stopPropagation()} // чтобы клик не ставил паузу через родителя
    >

      {/* ─── ПОЛОСА ПРОГРЕССА ──────────────────────────────────────────────── */}
      <div
        ref={progressRef}
        className="w-full h-1.5 bg-[var(--border-strong)] rounded-full cursor-pointer relative group/progress transition-all hover:h-2.5"
        onMouseEnter={() => setIsHoveringProgress(true)}
        onMouseLeave={() => setIsHoveringProgress(false)}
        onMouseMove={handleProgressMouseMove}
        onMouseDown={handleProgressMouseDown}
      >
        {/* Буферизация / Макс. прогресс (тонкая зелёная линия) */}
        <div
          className="absolute top-0 bottom-0 left-0 bg-green-500/40 rounded-full z-0 transition-all duration-300"
          style={{ width: `${watchedPercent}%` }}
        />

        {/* Текущий прогресс (Жёлтая линия) */}
        <div
          className="absolute top-0 bottom-0 left-0 bg-[var(--accent)] rounded-full z-10"
          style={{ width: `${currentPercent}%` }}
        />

        {/* Индикатор hover (Белая линия) */}
        {isHoveringProgress && !isDraggingProgress && (
          <div
            className="absolute top-0 bottom-0 left-0 bg-white/30 rounded-full z-0 pointer-events-none"
            style={{ width: `${hoverPosition * 100}%` }}
          />
        )}

        {/* Ползунок (Кружок) */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-[var(--accent)] rounded-full z-20 shadow-lg scale-0 group-hover/progress:scale-100 transition-transform pointer-events-none"
          style={{ left: `calc(${currentPercent}% - 8px)` }}
        />

        {/* Tooltip времени с hover */}
        {isHoveringProgress && duration > 0 && (
          <div
            className="absolute -top-10 -translate-x-1/2 bg-[var(--bg-elevated)] text-[var(--text-primary)] text-xs py-1 px-2 rounded font-mono shadow-md border border-[var(--border)] pointer-events-none"
            style={{ left: `${hoverPosition * 100}%` }}
          >
            {formatTime(hoverPosition * duration)}
          </div>
        )}
      </div>

      {/* ─── НИЖНЯЯ ПАНЕЛЬ ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">

        {/* ЛЕВАЯ ЧАСТЬ: Кнопки навигации и время */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <button
              onClick={onPrev}
              className="text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors"
            >
              <SkipBack size={20} fill="currentColor" />
            </button>
            <button
              onClick={onPlayPause}
              className="text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors"
            >
              {isPlaying ? (
                <Pause size={28} fill="currentColor" />
              ) : (
                <Play size={28} fill="currentColor" className="ml-0.5" />
              )}
            </button>
            <button
              onClick={onNext}
              className="text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors"
            >
              <SkipForward size={20} fill="currentColor" />
            </button>
          </div>

          <div className="text-[var(--text-secondary)] font-mono text-sm tracking-wide select-none">
            <span className="text-[var(--text-primary)]">{formatTime(currentTime)}</span>
            <span className="mx-1 opacity-50">/</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* ПРАВАЯ ЧАСТЬ: Громкость, Скорость, Фуллскрин */}
        <div className="flex items-center gap-5">

          {/* Громкость */}
          <div
            className="group flex items-center gap-2 relative"
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => setShowVolumeSlider(false)}
          >
            <button
              onClick={toggleMute}
              className="text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors"
            >
              <VolumeIcon size={20} />
            </button>

            {/* Всплывающий ползунок громкости */}
            <div className={`
              overflow-hidden transition-all duration-300 ease-out flex items-center
              ${showVolumeSlider ? 'w-20 opacity-100' : 'w-0 opacity-0'}
            `}>
              <input
                type="range"
                min="0" max="1" step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-full h-1 bg-[var(--border-strong)] rounded-full appearance-none outline-none accent-[var(--accent)] cursor-pointer"
              />
            </div>
          </div>

          {/* Скорость */}
          <div className="relative">
            <button
              className="text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors flex items-center gap-1 font-mono text-sm"
              onClick={() => setShowSpeedMenu(!showSpeedMenu)}
            >
              <Settings size={20} />
              <span>{playbackRate}x</span>
            </button>

            {/* Меню скорости */}
            {showSpeedMenu && (
              <div className="absolute bottom-full right-0 mb-4 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg shadow-xl overflow-hidden min-w-[100px] z-50">
                {[0.5, 1, 1.25, 1.5, 2].map((rate) => (
                  <button
                    key={rate}
                    className={`
                      block w-full text-left px-4 py-2 text-sm font-mono transition-colors
                      ${rate === playbackRate ? 'bg-[var(--accent-glow)] text-[var(--accent)]' : 'text-[var(--text-primary)] hover:bg-[var(--border)]'}
                    `}
                    onClick={() => {
                      setPlaybackRate(rate);
                      setShowSpeedMenu(false);
                    }}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Полный экран */}
          <button
            onClick={toggleFullscreen}
            className="text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors"
          >
            <Maximize size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
