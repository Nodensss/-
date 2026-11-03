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

### Режимы и материалы

В обеих формах есть расход вручную и по двум замерам. Во втором режиме текущий
уровень — это «сейчас»; задайте прежний уровень, интервал и перекачанные мм
источника. Максимум расходной задаётся отдельно; по умолчанию он неизвестен,
поэтому проверка перелива выключена (УТОЧНИТЬ).

На вкладке «Мнемосхема (макет)» нажмите «+60 мин модели» для накопления окна,
затем попробуйте события модели. Нажатие на расчётный блок открывает параметры.
Время и шум модели не являются данными реальной установки.

- [Алгоритм и соответствие ST / TypeScript](asutp/ALGORITHM.md).
- [Требования к экрану](asutp/HMI.md), [ST-блок](asutp/FB_PEROX_PAIR.st).
- [Пояснительная записка](umsh/POYASNITELNAYA_ZAPISKA.md).
- [Версия для печати в PDF](umsh/POYASNITELNAYA_ZAPISKA.html): A4, 100 %, без колонтитулов.
- [Итоговый отчёт по этапам и приёмке](docs/REPORT_CODEX.md).

ST необходимо скомпилировать и проверить в целевой среде до внедрения;
TypeScript-тесты не исполняют ST.
