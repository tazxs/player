import { create } from 'zustand';

// ─── Стор плеера ──────────────────────────────────────────────────────────────
const usePlayerStore = create((set, get) => ({
  // ─── Состояние ──────────────────────────────────────────────────────────────

  // Текущий активный курс (объект из БД)
  currentCourse: null,

  // Текущее активное видео (объект из БД, содержит .file — File object)
  currentVideo: null,

  // Список видео текущего курса (массив объектов из БД)
  videoList: [],

  // Карта прогресса: { [videoId]: { watchedSeconds, watchedPercent, isCompleted } }
  progressMap: {},

  // Агрегированный прогресс курса (% завершённых уроков)
  courseProgress: null,

  // Карта объектных URL: { [videoId]: objectURL } — создаются через URL.createObjectURL(file)
  fileUrls: {},

  // Тосты (уведомления)
  toasts: [],

  // Статус воспроизведения
  isPlaying: false,

  // Громкость (0–1)
  volume: 1,

  // Скорость воспроизведения (0.5, 1, 1.25, 1.5, 2)
  playbackRate: 1,

  // ─── Сеттеры ────────────────────────────────────────────────────────────────

  /** Установить текущий курс */
  setCurrentCourse: (course) => set({ currentCourse: course }),

  /** Установить текущее видео */
  setCurrentVideo: (video) => set({ currentVideo: video }),

  /** Установить список видео курса */
  setVideoList: (list) => set({ videoList: list }),

  /** Обновить карту прогресса (полная замена или слияние) */
  setProgressMap: (map) => set({ progressMap: map }),

  /** Обновить прогресс одного видео в карте */
  updateProgressEntry: (videoId, entry) =>
    set((state) => ({
      progressMap: {
        ...state.progressMap,
        [videoId]: { ...state.progressMap[videoId], ...entry },
      },
    })),

  /** Установить агрегированный прогресс курса */
  setCourseProgress: (progress) => set({ courseProgress: progress }),

  /** Добавить уведомление (toast) */
  addToast: (message, type = 'info') => {
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }]
    }));
    // Автоматически удаляем через 3 секунды
    setTimeout(() => {
      get().removeToast(id);
    }, 3000);
  },

  /** Удалить уведомление по ID */
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    })),

  /** Установить карту объектных URL (videoId -> objectURL) */
  setFileUrls: (urls) => set({ fileUrls: urls }),

  /** Установить статус воспроизведения */
  setIsPlaying: (isPlaying) => set({ isPlaying }),

  /** Установить громкость */
  setVolume: (volume) => set({ volume }),

  /** Установить скорость воспроизведения */
  setPlaybackRate: (rate) => set({ playbackRate: rate }),

  // ─── Навигация ───────────────────────────────────────────────────────────────

  /**
   * Получить следующее видео из списка.
   * Возвращает объект видео или null, если текущее — последнее.
   * @returns {object|null}
   */
  getNextVideo: () => {
    const { currentVideo, videoList } = get();
    if (!currentVideo || videoList.length === 0) return null;

    const index = videoList.findIndex((v) => v.id === currentVideo.id);
    if (index === -1 || index >= videoList.length - 1) return null;

    return videoList[index + 1];
  },

  /**
   * Получить предыдущее видео из списка.
   * Возвращает объект видео или null, если текущее — первое.
   * @returns {object|null}
   */
  getPrevVideo: () => {
    const { currentVideo, videoList } = get();
    if (!currentVideo || videoList.length === 0) return null;

    const index = videoList.findIndex((v) => v.id === currentVideo.id);
    if (index <= 0) return null;

    return videoList[index - 1];
  },
}));

export default usePlayerStore;
