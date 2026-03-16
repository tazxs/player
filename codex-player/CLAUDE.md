# Project Context: Codex Player

## О проекте
Десктопное веб-приложение — локальный видеоплеер для учеников Codex School.
Приложение работает строго локально в браузере, видео лежат на ноутбуке ученика.
Стиль: Cinema Dark (кинотеатр для кодера).

## Стек и Окружение
- React 18 + Vite
- State: Zustand
- DB: IndexedDB (Dexie.js)
- UI/Styling: TailwindCSS, Framer Motion, Lucide React
- Routing: React Router DOM

## Архитектура
- `/src/db/` — логика работы с IndexedDB (схема, запросы).
- `/src/store/` — глобальное состояние (Zustand).
- `/src/components/` — изолированные UI компоненты.
- `/src/pages/` — экраны (Player, Setup).

## Правила кодирования
- Никакого бэкенда и API запросов во внешнюю сеть. Всё локально.
- Файлы компонентов: PascalCase.jsx
- Утилиты и сторы: camelCase.js
- Tailwind классы использовать для стилизации, основные переменные цвета хранить в globals.css.
- Комментарии к коду писать на РУССКОМ языке.

## Запрещено
- НЕ трогай `node_modules` и `dist`.
- НЕ устанавливай новые пакеты без явного подтверждения.
- НЕ убирай функционал из требований для "упрощения".

## Команды
- Dev: `npm run dev`
- Build: `npm run build`

## Документация для контекста
- docs/PRD.md — бизнес-требования
- docs/ARCHITECTURE.md — структура и потоки данных
- docs/STACK.md — обоснование технологий
