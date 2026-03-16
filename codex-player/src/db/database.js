import Dexie from 'dexie';

// ─── Инициализация базы данных ────────────────────────────────────────────────
const db = new Dexie('CodexPlayerDB');

db.version(1).stores({
  // Курсы: индексируем по id (автоинкремент), name, path, createdAt
  courses: '++id, name, path, createdAt',

  // Видео: индексируем по id, courseId (FK), filename, title, order, duration
  videos: '++id, courseId, filename, title, order, duration',

  // Прогресс: индексируем по id, videoId (FK), courseId (FK) и т.д.
  progress: '++id, videoId, courseId, watchedPercent, isCompleted, lastWatchedAt, watchedSeconds',
});

export default db;

// ─── Курсы ────────────────────────────────────────────────────────────────────

/**
 * Создать новый курс.
 * @param {string} name  — отображаемое название курса
 * @param {string} path  — путь к директории (только для справки, файлы хранятся как File-объекты)
 * @returns {Promise<number>} id созданного курса
 */
export async function createCourse(name, path) {
  return db.courses.add({
    name,
    path,
    createdAt: new Date().toISOString(),
  });
}

/**
 * Получить все курсы (отсортированные по дате создания, новые — первые).
 * @returns {Promise<Array>}
 */
export async function getAllCourses() {
  return db.courses.orderBy('createdAt').reverse().toArray();
}

/**
 * Удалить курс и все связанные с ним видео и прогресс.
 * @param {number} courseId
 */
export async function deleteCourse(courseId) {
  await db.transaction('rw', db.courses, db.videos, db.progress, async () => {
    // Удаляем прогресс для всех видео этого курса
    await db.progress.where('courseId').equals(courseId).delete();
    // Удаляем все видео курса
    await db.videos.where('courseId').equals(courseId).delete();
    // Удаляем сам курс
    await db.courses.delete(courseId);
  });
}

// ─── Видео ────────────────────────────────────────────────────────────────────

/**
 * Добавить видео в курс.
 * @param {object} videoData — { courseId, filename, title, order, duration }
 * @returns {Promise<number>} id добавленного видео
 */
export async function addVideo({ courseId, filename, title, order, duration = 0 }) {
  return db.videos.add({
    courseId,
    filename,
    title: title || filename,
    order,
    duration,
  });
}

/**
 * Получить все видео курса, отсортированные по порядковому номеру.
 * @param {number} courseId
 * @returns {Promise<Array>}
 */
export async function getVideosByCourse(courseId) {
  return db.videos
    .where('courseId')
    .equals(courseId)
    .sortBy('order');
}

/**
 * Обновить отображаемое название видео.
 * @param {number} videoId
 * @param {string} newTitle
 */
export async function updateVideoTitle(videoId, newTitle) {
  await db.videos.update(videoId, { title: newTitle });
}

// ─── Прогресс ─────────────────────────────────────────────────────────────────

/**
 * Получить запись прогресса для конкретного видео.
 * Возвращает undefined, если прогресс ещё не сохранялся.
 * @param {number} videoId
 * @returns {Promise<object|undefined>}
 */
export async function getProgress(videoId) {
  return db.progress.where('videoId').equals(videoId).first();
}

/**
 * Сохранить (создать или обновить) прогресс просмотра видео.
 * @param {object} data — { videoId, courseId, watchedSeconds, watchedPercent, isCompleted }
 */
export async function saveProgress({ videoId, courseId, watchedSeconds, watchedPercent, isCompleted = false }) {
  const existing = await db.progress.where('videoId').equals(videoId).first();

  const record = {
    videoId,
    courseId,
    watchedSeconds,
    watchedPercent,
    isCompleted,
    lastWatchedAt: new Date().toISOString(),
  };

  if (existing) {
    // Обновляем существующую запись
    await db.progress.update(existing.id, record);
  } else {
    // Создаём новую запись
    await db.progress.add(record);
  }
}

/**
 * Получить прогресс по всем видео конкретного курса.
 * Возвращает массив записей прогресса.
 * @param {number} courseId
 * @returns {Promise<Array>}
 */
export async function getCourseProgress(courseId) {
  return db.progress.where('courseId').equals(courseId).toArray();
}

/**
 * Сбросить прогресс одного видео (удаляет запись из БД).
 * @param {number} videoId
 */
export async function resetProgress(videoId) {
  await db.progress.where('videoId').equals(videoId).delete();
}

/**
 * Сбросить прогресс всего курса (удаляет все записи прогресса для courseId).
 * @param {number} courseId
 */
export async function resetCourseProgress(courseId) {
  await db.progress.where('courseId').equals(courseId).delete();
}
