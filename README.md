<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/temp/1

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Расчёт: структура и команды

`core/config.ts` — параметры связок; `core/forecast.ts` — чистый прогноз;
`core/format.ts` — ввод и форматы. Формы и симуляция используют ядро.

- `npm ci` — установка по lock-файлу.
- `npm test` — контрольные примеры (Vitest).
- `npx tsc --noEmit` — проверка типов.
- `npm run build` — сборка; `npm run dev` — локальный запуск.

Для калькулятора ключ Gemini не требуется. Раздел AI Studio выше сохранён как исходная инструкция.
Расчёт информационный: не управляет оборудованием, не заменяет регламент,
сигнализацию, блокировки и ПАЗ. Соединений с реальными системами нет.
