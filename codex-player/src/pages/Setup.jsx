import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, Loader2 } from 'lucide-react';
import { createCourse, addVideo } from '../db/database';
import usePlayerStore from '../store/playerStore';

// ─── Утилита: очистка имени файла в читаемый заголовок ───────────────────────
// "01_Введение_в_React.mp4" → "Введение в React"
function parseTitle(filename) {
  return filename
    .replace(/\.mp4$/i, '')             // убираем расширение
    .replace(/^\d+[_\-.\s]+/, '')       // убираем ведущие цифры (01_, 02-, 3. и т.д.)
    .replace(/[_\-]+/g, ' ')            // заменяем _ и - на пробел
    .trim();
}

// ─── Компонент стартового экрана ─────────────────────────────────────────────
export default function Setup() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Экшены стора
  const setCurrentCourse = usePlayerStore((s) => s.setCurrentCourse);
  const setVideoList = usePlayerStore((s) => s.setVideoList);
  const setCurrentVideo = usePlayerStore((s) => s.setCurrentVideo);
  const setFileUrls = usePlayerStore((s) => s.setFileUrls);

  // ─── Обработчик выбора папки ─────────────────────────────────────────────
  async function handleFilesSelected(e) {
    const allFiles = Array.from(e.target.files);

    // 1. Фильтруем только .mp4, сортируем по имени
    const mp4Files = allFiles
      .filter((f) => f.name.toLowerCase().endsWith('.mp4'))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    if (mp4Files.length === 0) {
      setError('В выбранной папке нет .mp4 файлов. Выбери другую папку.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      // 2. Название курса = имя папки из webkitRelativePath ("МояПапка/01_урок.mp4" → "МояПапка")
      const courseName = mp4Files[0].webkitRelativePath.split('/')[0];

      // 3. Создаём курс в IndexedDB
      const courseId = await createCourse(courseName, courseName);
      const courseObj = { id: courseId, name: courseName };

      // 4. Добавляем видео в БД и строим карту objectURL
      const savedVideos = [];
      const urls = {};

      for (let i = 0; i < mp4Files.length; i++) {
        const file = mp4Files[i];
        const title = parseTitle(file.name);

        const videoId = await addVideo({
          courseId,
          filename: file.name,
          title,
          order: i,
          duration: 0, // длительность подтянется из <video> при воспроизведении
        });

        // Генерируем объектный URL — файл не загружается в RAM целиком
        urls[videoId] = URL.createObjectURL(file);

        savedVideos.push({ id: videoId, courseId, filename: file.name, title, order: i, duration: 0 });
      }

      // 5. Обновляем Zustand стор
      setCurrentCourse(courseObj);
      setVideoList(savedVideos);
      setCurrentVideo(savedVideos[0]);
      setFileUrls(urls);

      // 6. Переходим на страницу плеера
      navigate(`/player/${courseId}`);
    } catch (err) {
      console.error('[Setup] Ошибка при загрузке курса:', err);
      setError('Произошла ошибка при загрузке файлов. Попробуй ещё раз.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center px-6 select-none">

      {/* Фоновое свечение */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[var(--accent)] opacity-[0.04] blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 text-center max-w-lg w-full">

        {/* Логотип */}
        <h1
          className="text-6xl font-black tracking-widest text-[var(--accent)] leading-none"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          CODEX<br />PLAYER
        </h1>

        {/* Подзаголовок */}
        <p className="text-[var(--text-secondary)] text-lg font-medium">
          Твоя личная платформа для видеоуроков
        </p>

        {/* Разделитель */}
        <div className="w-16 h-px bg-[var(--accent)] opacity-40 my-2" />

        {/* Кнопка открытия папки */}
        <button
          onClick={() => inputRef.current?.click()}
          disabled={isLoading}
          className="
            group flex items-center gap-3 px-8 py-4 rounded-xl
            bg-[var(--accent)] text-black font-bold text-base tracking-widest uppercase
            transition-all duration-200
            hover:brightness-110 hover:scale-105 active:scale-95
            disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100
          "
        >
          {isLoading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <FolderOpen size={20} className="transition-transform duration-200 group-hover:-translate-y-0.5" />
          )}
          {isLoading ? 'Загружаем...' : 'Открыть папку с видео'}
        </button>

        {/* Подсказка */}
        <p className="text-sm text-[var(--text-muted)] leading-relaxed">
          Выбери папку — все .mp4 файлы загрузятся автоматически
        </p>

        {/* Сообщение об ошибке */}
        {error && (
          <p className="text-sm text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-4 py-3 w-full">
            {error}
          </p>
        )}
      </div>

      {/* Скрытый input для выбора директории */}
      <input
        ref={inputRef}
        type="file"
        // @ts-ignore — webkitdirectory не входит в стандартные типы, но работает в браузере
        webkitdirectory="true"
        multiple
        accept="video/mp4"
        className="hidden"
        onChange={handleFilesSelected}
      />
    </div>
  );
}
