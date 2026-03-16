import { LayoutPanelLeft } from 'lucide-react';
import usePlayerStore from '../store/playerStore';
import VideoCard from './VideoCard';

export default function Sidebar() {
  const videoList = usePlayerStore((s) => s.videoList);

  return (
    <aside className="w-[300px] h-full flex-shrink-0 border-r border-[var(--border)] bg-[var(--bg-secondary)] flex flex-col">
      {/* Заголовок сайдбара */}
      <div className="p-4 flex items-center justify-between border-b border-[var(--border)] text-[var(--text-secondary)]">
        <div className="flex items-center gap-2">
          <LayoutPanelLeft size={18} />
          <span className="text-sm font-semibold tracking-wide uppercase">Уроки</span>
        </div>
        <span className="text-xs font-mono text-[var(--text-muted)]">
          {videoList.length}
        </span>
      </div>

      {/* Список видео (скроллится) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {videoList.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8 text-center text-sm text-[var(--text-muted)]">
            В этом курсе нет видео
          </div>
        ) : (
          <div className="flex flex-col">
            {videoList.map((video, idx) => (
              <VideoCard
                key={video.id}
                video={video}
                index={idx}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
