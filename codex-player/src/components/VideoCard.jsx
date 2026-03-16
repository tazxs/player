import { CheckCircle, PlayCircle, Circle } from 'lucide-react';
import usePlayerStore from '../store/playerStore';

export default function VideoCard({ video, index }) {
  // Достаём нужные данные из стора
  const currentVideo = usePlayerStore((s) => s.currentVideo);
  const setCurrentVideo = usePlayerStore((s) => s.setCurrentVideo);
  const progressMap = usePlayerStore((s) => s.progressMap);

  const isActive = currentVideo?.id === video.id;
  const progress = progressMap[video.id];

  // Определяем статус
  const isCompleted = progress?.isCompleted;
  const started = progress?.watchedSeconds > 0;
  const watchedPercent = progress?.watchedPercent || 0;

  // Определяем иконку
  let Icon = Circle;
  let iconClass = 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors';

  if (isActive) {
    Icon = PlayCircle;
    iconClass = 'text-[var(--accent)]';
  } else if (isCompleted) {
    Icon = CheckCircle;
    iconClass = 'text-green-500';
  } else if (started) {
    // Синяя точка — начал смотреть (используем Circle со сплошной заливкой через css fill)
    Icon = Circle;
    iconClass = 'text-blue-500 fill-blue-500/20';
  }

  return (
    <button
      onClick={() => setCurrentVideo(video)}
      className={`
        group relative w-full flex items-center gap-3 px-4 py-3 text-left
        transition-all duration-200 border-b border-[var(--border)]
        ${isActive ? 'bg-[var(--bg-elevated)] border-l-4 border-l-[var(--accent)]' : 'hover:bg-[var(--bg-elevated)] border-l-4 border-l-transparent'}
      `}
    >
      {/* Иконка статуса */}
      <Icon size={18} className={`flex-shrink-0 ${iconClass}`} />

      {/* Текст (Название урока) */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="text-xs text-[var(--text-muted)] font-mono">
          Урок {index + 1}
        </span>
        <span
          className={`text-sm font-medium truncate ${
            isActive ? 'text-[var(--accent)]' : 'text-[var(--text-primary)] group-hover:text-white'
          }`}
          title={video.title} // полный текст при наведении
        >
          {video.title}
        </span>
      </div>

      {/* Полоса прогресса внизу карточки (абсолютно) */}
      {started && !isCompleted && !isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-transparent">
          <div
            className="h-full bg-blue-500/50"
            style={{ width: `${watchedPercent}%` }}
          />
        </div>
      )}

      {/* Если активно — показываем жёлтую полосу прогресса */}
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-transparent">
          <div
            className="h-full bg-[var(--accent)]"
            style={{ width: `${watchedPercent}%` }}
          />
        </div>
      )}
    </button>
  );
}
