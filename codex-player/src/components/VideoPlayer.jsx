import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import usePlayerStore from '../store/playerStore';
import { saveProgress, getProgress } from '../db/database';
import Controls from './Controls';

// Вспомогательная функция для форматирования времени
function formatTime(seconds) {
  if (isNaN(seconds)) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function VideoPlayer() {
  const videoRef = useRef(null);
  const [isValidUrl, setIsValidUrl] = useState(true);

  // Стейты из Zustand
  const currentVideo = usePlayerStore((s) => s.currentVideo);
  const currentCourse = usePlayerStore((s) => s.currentCourse);
  const fileUrls = usePlayerStore((s) => s.fileUrls);
  const setIsPlaying = usePlayerStore((s) => s.setIsPlaying);
  const updateProgressEntry = usePlayerStore((s) => s.updateProgressEntry);
  const setCourseProgress = usePlayerStore((s) => s.setCourseProgress);
  const getNextVideo = usePlayerStore((s) => s.getNextVideo);
  const setCurrentVideo = usePlayerStore((s) => s.setCurrentVideo);
  const addToast = usePlayerStore((s) => s.addToast);

  // Рефы для троттлинга сохранений
  const lastSavedTimeRef = useRef(0);
  const isVideoLoadedRef = useRef(false);
  const playerContainerRef = useRef(null);

  // Стейты для UI Controls
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const hideControlsTimeoutRef = useRef(null);

  // Стейты для Оверлея завершения
  const [showEndOverlay, setShowEndOverlay] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const countdownIntervalRef = useRef(null);
  const nextVideo = getNextVideo();

  // Получаем максимальный просмотренный процент из стора (для зелёной полосы)
  const watchedPercent = usePlayerStore(
    (s) => s.progressMap[currentVideo?.id]?.watchedPercent || 0
  );

  // Получаем URL для текущего видео
  const videoUrl = currentVideo ? fileUrls[currentVideo.id] : null;

  useEffect(() => {
    if (!currentVideo || !videoUrl) {
      setIsValidUrl(false);
      return;
    }

    setIsValidUrl(true);
    isVideoLoadedRef.current = false;
    lastSavedTimeRef.current = 0;
    setShowEndOverlay(false);

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    // Сброс состояния плеера при смене URL
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [currentVideo?.id, videoUrl]);

  // ─── События HTML5 Video ──────────────────────────────────────────────────

  /**
   * Срабатывает когда метаданные (длительность) загружены.
   * Восстанавливаем сохранённый прогресс, если он есть.
   */
  const handleLoadedMetadata = async () => {
    if (!currentVideo || !videoRef.current) return;

    isVideoLoadedRef.current = true;

    try {
      const savedProgress = await getProgress(currentVideo.id);

      // Если есть прогресс (> 10 сек) и видео не завершено полностью — восстанавливаем время
      if (
        savedProgress &&
        savedProgress.watchedSeconds > 10 &&
        !savedProgress.isCompleted
      ) {
        // Оставляем запас 2 секунды, чтобы юзер вспомнил контекст
        const timeToRestore = Math.max(0, savedProgress.watchedSeconds - 2);
        videoRef.current.currentTime = timeToRestore;
        addToast(`▶ Продолжаем с ${formatTime(timeToRestore)}`, 'info');
      }
    } catch (err) {
      console.error('[VideoPlayer] Ошибка получения прогресса:', err);
    }
  };

  /**
   * Срабатывает при каждом обновлении времени воспроизведения.
   * Сохраняем прогресс каждые 60 секунд.
   */
  const handleTimeUpdate = async () => {
    if (!currentVideo || !currentCourse || !videoRef.current || !isVideoLoadedRef.current) return;

    const currentTime = videoRef.current.currentTime;
    const duration = videoRef.current.duration;

    // Защита от NaN при непрогруженном видео
    if (isNaN(duration) || duration === 0) return;

    // Сохраняем в БД не чаще чем раз в 60 секунд
    const timeDelta = Math.abs(currentTime - lastSavedTimeRef.current);
    if (timeDelta >= 60) {
      lastSavedTimeRef.current = currentTime;

      const watchedPercent = Math.min(100, Math.round((currentTime / duration) * 100));

      const entry = {
        videoId: currentVideo.id,
        courseId: currentCourse.id,
        watchedSeconds: currentTime,
        watchedPercent,
        isCompleted: false // completion ставится только в handleEnded
      };

      // 1. Асинхронно пишем в IndexedDB (Dexie)
      saveProgress(entry).catch(console.error);

      // 2. Синхронно обновляем стейт Zustand, чтобы сайдбар перерисовался
      updateProgressEntry(currentVideo.id, entry);
    }
  };

  /**
   * Срабатывает когда видео досмотрено до конца
   */
  const handleEnded = async () => {
    if (!currentVideo || !currentCourse || !videoRef.current) return;

    const duration = videoRef.current.duration;

    const entry = {
      videoId: currentVideo.id,
      courseId: currentCourse.id,
      watchedSeconds: duration,
      watchedPercent: 100,
      isCompleted: true
    };

    // 1. Сохраняем 100% прогресс в БД
    await saveProgress(entry);
    updateProgressEntry(currentVideo.id, entry);
    setIsPlaying(false);

    // 2. Показываем оверлей окончания
    setShowEndOverlay(true);
    setShowControls(true); // Форсируем показ курсора

    // 3. Запускаем обратный отсчёт если есть следующее видео
    if (nextVideo) {
      setCountdown(3);
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current);
            // Чтобы избежать stale state, берем nextVideoId из замыкания
            setCurrentVideo(nextVideo);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const handleCancelCountdown = (e) => {
    e.stopPropagation();
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    setShowEndOverlay(false);
  };

  const handleSkipCountdown = (e) => {
    e.stopPropagation();
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    if (nextVideo) {
      setCurrentVideo(nextVideo);
    }
  };

  const handlePlayEvent = () => setIsPlaying(true);
  const handlePauseEvent = () => setIsPlaying(false);

  // ─── Хендлеры для Controls и Hotkeys ──────────────────────────────────────
  const togglePlayPause = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) videoRef.current.play();
    else videoRef.current.pause();
  }, []);

  const handleNext = useCallback(() => {
    const next = getNextVideo();
    if (next) setCurrentVideo(next);
  }, [getNextVideo, setCurrentVideo]);

  const handlePrev = useCallback(() => {
    const prev = usePlayerStore.getState().getPrevVideo();
    if (prev) setCurrentVideo(prev);
  }, [setCurrentVideo]);

  // ─── Автоскрытие контролов ────────────────────────────────────────────────
  const handleMouseMove = () => {
    setShowControls(true);
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
    // Скрываем через 3 секунды бездействия
    hideControlsTimeoutRef.current = setTimeout(() => {
      // Не скрываем, если видео на паузе
      if (videoRef.current && !videoRef.current.paused) {
        setShowControls(false);
      }
    }, 3000);
  };

  const handleMouseLeave = () => {
    if (videoRef.current && !videoRef.current.paused) {
      setShowControls(false);
    }
  };

  // ─── Глобальные горячие клавиши ───────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Игнорируем фокус на инпутах (если они появятся в будущем)
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
      if (!videoRef.current) return;

      const video = videoRef.current;

      switch (e.code) {
        case 'Space':
        case 'MediaPlayPause':
          e.preventDefault(); // чтобы страница не скроллилась
          togglePlayPause();
          break;
        case 'ArrowRight':
          e.preventDefault();
          video.currentTime = Math.min(video.duration, video.currentTime + 10);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          video.volume = Math.min(1, video.volume + 0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          video.volume = Math.max(0, video.volume - 0.1);
          break;
        case 'KeyF':
          e.preventDefault();
          if (!document.fullscreenElement) {
            playerContainerRef.current?.requestFullscreen().catch(console.error);
          } else {
            document.exitFullscreen();
          }
          break;
        case 'KeyM':
          e.preventDefault();
          video.muted = !video.muted;
          break;
        case 'KeyN':
          e.preventDefault();
          handleNext();
          break;
        case 'KeyP':
          e.preventDefault();
          handlePrev();
          break;
        default:
          // Цифры 1-9 для перемотки 10%-90%
          if (e.code.startsWith('Digit') && e.code !== 'Digit0') {
            const digit = parseInt(e.key, 10);
            if (!isNaN(digit) && video.duration) {
              video.currentTime = (digit / 10) * video.duration;
            }
          }
          break;
      }

      // При нажатии кнопок показываем контролы
      handleMouseMove();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlayPause, handleNext, handlePrev]);

  // Изменение громкости скроллом НАД плеером
  const handleWheel = (e) => {
    if (!videoRef.current) return;
    e.preventDefault();
    const video = videoRef.current;
    if (e.deltaY < 0) {
      // Крутим вверх — громче
      video.volume = Math.min(1, video.volume + 0.05);
    } else {
      // Крутим вниз — тише
      video.volume = Math.max(0, video.volume - 0.05);
    }
    handleMouseMove();
  };

  // ─── Рендер ───────────────────────────────────────────────────────────────

  if (!currentVideo) {
    return (
      <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] bg-black">
        Выберите видео из списка
      </div>
    );
  }

  if (!isValidUrl || !videoUrl) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-black bg-opacity-90 gap-4">
        <div className="text-red-500 font-syne text-xl uppercase tracking-widest">Ошибка доступа к файлу</div>
        <div className="text-[var(--text-secondary)] text-sm max-w-sm text-center">
          Браузер потерял доступ к локальному файлу. Пожалуйста, вернитесь на стартовый экран и выберите папку с курсом заново.
        </div>
      </div>
    );
  }

  return (
    <div
      ref={playerContainerRef}
      className={`w-full h-full bg-black relative flex flex-col group ${!showControls && usePlayerStore.getState().isPlaying ? 'cursor-none' : ''}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
      onClick={togglePlayPause} // Клик по всей области видео ставит паузу
    >
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-contain outline-none pointer-events-none" // pointer-events-none чтобы клики шли на обертку
        onLoadedMetadata={(e) => {
          setDuration(e.target.duration);
          handleLoadedMetadata();
        }}
        onTimeUpdate={(e) => {
          setCurrentTime(e.target.currentTime);
          handleTimeUpdate();
        }}
        onEnded={handleEnded}
        onPlay={handlePlayEvent}
        onPause={handlePauseEvent}
        autoPlay // Авто-воспроизведение при смене серии
      />

      {/* Контролы поверх видео с анимацией исчезновения (скрыты когда активно финальное оверлей-меню) */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${!showEndOverlay && showControls ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="absolute bottom-0 w-full pointer-events-auto">
          <Controls
            videoRef={videoRef}
            containerRef={playerContainerRef}
            isPlaying={usePlayerStore.getState().isPlaying}
            currentTime={currentTime}
            duration={duration}
            watchedPercent={watchedPercent}
            onPlayPause={togglePlayPause}
            onNext={handleNext}
            onPrev={handlePrev}
          />
        </div>
      </div>

      {/* Оверлей завершения урока */}
      <AnimatePresence>
        {showEndOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm z-40 flex flex-col items-center justify-center pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="flex flex-col items-center text-center max-w-lg"
            >
              <div className="w-16 h-16 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center mb-6 border border-green-500/30">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h2 className="text-3xl font-bold text-white mb-2 font-syne">Урок завершён!</h2>
              <p className="text-[var(--text-secondary)] mb-10 text-lg">
                {currentVideo.title}
              </p>

              {nextVideo ? (
                <>
                  <div className="text-[var(--accent)] font-mono text-xl mb-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-[var(--accent)] flex items-center justify-center animate-pulse">
                      {countdown}
                    </div>
                    <span>Следующий урок...</span>
                  </div>
                  <p className="text-white text-lg font-medium mb-8">
                    {nextVideo.title}
                  </p>

                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleCancelCountdown}
                      className="px-6 py-3 rounded-lg border border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-elevated)] transition-colors font-medium tracking-wide"
                    >
                      ОТМЕНА
                    </button>
                    <button
                      onClick={handleSkipCountdown}
                      className="px-8 py-3 rounded-lg bg-[var(--accent)] text-black font-bold tracking-wider hover:brightness-110 hover:scale-105 transition-all shadow-[var(--shadow-glow)]"
                    >
                      СМОТРЕТЬ СЕЙЧАС
                    </button>
                  </div>
                </>
              ) : (
                <div className="mt-8 px-6 py-4 rounded-xl border border-[var(--accent-border)] bg-[var(--accent-bg)] text-[var(--accent)]">
                  🎉 Вы завершили последний урок в этом курсе!
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
