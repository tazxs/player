import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileVideo } from 'lucide-react';
import usePlayerStore from '../store/playerStore';
import db, { getVideosByCourse, getCourseProgress } from '../db/database';
import Sidebar from '../components/Sidebar';
import VideoPlayer from '../components/VideoPlayer';
import ToastContainer from '../components/ToastContainer';

export default function Player() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  // Zustand state
  const currentCourse = usePlayerStore((s) => s.currentCourse);
  const setCurrentCourse = usePlayerStore((s) => s.setCurrentCourse);
  const setVideoList = usePlayerStore((s) => s.setVideoList);
  const setCurrentVideo = usePlayerStore((s) => s.setCurrentVideo);
  const currentVideo = usePlayerStore((s) => s.currentVideo);
  const setCourseProgress = usePlayerStore((s) => s.setCourseProgress);
  const setProgressMap = usePlayerStore((s) => s.setProgressMap);

  useEffect(() => {
    async function loadCourseData() {
      if (!courseId) {
        navigate('/');
        return;
      }

      try {
        const id = parseInt(courseId, 10);

        // 1. Проверяем существование курса
        const course = await db.courses.get(id);
        if (!course) {
          console.error('[Player] Курс не найден');
          navigate('/');
          return;
        }

        // 2. Получаем видео
        const videos = await getVideosByCourse(id);

        // 3. Получаем прогресс
        const progressEntries = await getCourseProgress(id);
        const map = {};
        progressEntries.forEach((p) => {
          map[p.videoId] = p;
        });

        // 4. Считаем общий % прохождения курса
        const completedCount = progressEntries.filter(p => p.isCompleted).length;
        const totalProgress = videos.length > 0 ? Math.round((completedCount / videos.length) * 100) : 0;

        // 5. Записываем в Zustand
        setCurrentCourse(course);
        setVideoList(videos);
        setProgressMap(map);
        setCourseProgress(totalProgress);

        // 6. Устанавливаем первое видео (если нет активного или оно из другого курса)
        if (!currentVideo || currentVideo.courseId !== id) {
          if (videos.length > 0) {
            // TODO: В будущем можно искать последнее просмотренное, пока просто первое
            setCurrentVideo(videos[0]);
          }
        }
      } catch (err) {
        console.error('[Player] Ошибка загрузки данных:', err);
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    }

    loadCourseData();
  }, [courseId, navigate, setCurrentCourse, setVideoList, setProgressMap, setCourseProgress, setCurrentVideo, currentVideo]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="w-8 h-8 rounded-full border-4 border-[var(--accent)] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col font-sans select-none">

      {/* ─── HEADER ───────────────────────────────────────────────────────────── */}
      <header className="h-[60px] flex-shrink-0 border-b border-[var(--border)] bg-[var(--bg-secondary)] flex items-center justify-between px-6">

        {/* Логотип + Название курса */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[var(--accent)] font-black tracking-wider font-syne text-xl">
            <FileVideo size={24} />
            <span>CODEX</span>
          </div>

          <div className="h-6 w-px bg-[var(--border-strong)]" />

          <h1 className="text-[var(--text-primary)] font-medium truncate max-w-[400px]" title={currentCourse?.name}>
            {currentCourse?.name || 'Загрузка курса...'}
          </h1>
        </div>

        {/* Прогресс курса (справа) */}
        <div className="flex items-center gap-3">
          <div className="text-sm text-[var(--text-secondary)]">Твой прогресс</div>
          <div className="flex items-center gap-2">
            <div className="w-32 h-2 rounded-full bg-[var(--bg-primary)] overflow-hidden border border-[var(--border)]">
              <div
                className="h-full bg-[var(--accent)] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${usePlayerStore(s => s.courseProgress) || 0}%` }}
              />
            </div>
            <span className="text-sm font-bold text-[var(--accent)] min-w-[40px]">
              {usePlayerStore(s => s.courseProgress) || 0}%
            </span>
          </div>
        </div>
      </header>

      {/* ─── РАБОЧАЯ ОБЛАСТЬ ─────────────────────────────────────────────────── */}
      <main className="flex-1 flex overflow-hidden">

        {/* САЙДБАР (Левая колонка) */}
        <Sidebar />

        {/* ПЛЕЕР (Правая колонка) */}
        <section className="flex-1 relative bg-black flex flex-col">
          <VideoPlayer />
        </section>

      </main>

      {/* Тосты */}
      <ToastContainer />
    </div>
  );
}
