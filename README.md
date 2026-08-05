# Пушок

2D пиксель-арт платформер про котёнка Пушка. Браузерная игра на TypeScript + Phaser 3 + Vite.

Прод: `https://<user>.github.io/pushok/`

## Требования

Node.js 20+.

## Запуск

```bash
npm install
npm run dev        # http://localhost:5173
```

## Проверки

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Управление

- `←` `→` или `A` `D` — идти
- `Пробел`, `↑` или `W` — прыжок

## Структура

```
src/config/     все числа игры (физика, баланс, ключи ассетов)
src/scenes/     Boot → Preload → Menu → Game → GameOver
src/entities/   Pushok и прочие объекты
src/systems/    чистая логика: движение, прогрессия, сейв
test/           vitest на чистую логику
public/assets/  спрайты, звук, тайлмапы
docs/           база знаний (Obsidian vault)
```

## База знаний

`docs/` — это Obsidian vault. Открыть: Obsidian → Open folder as vault → выбрать `docs`.
Точка входа — `docs/Пушок — MOC.md`. Заметки версионируются вместе с кодом, поэтому
дизайн-решение и реализующий его код попадают в один коммит.

## Правила для AI-агентов

- `AGENTS.md` — универсальный инженерный контракт (git, ветки, тесты, безопасность).
- `CLAUDE.md` — операционное руководство по проекту: архитектурные правила,
  smoke-матрица, что нельзя менять без разрешения.

## Деплой

GitHub Pages. CI (`ci.yml`) гоняет проверки на каждый push.
Деплой — только ручной запуск `deploy-pages.yml` (`workflow_dispatch`).
