# Pushok — дельты к глобальному контракту

Универсальный инженерный контракт живёт глобально:
`~/.claude/CLAUDE.md` (Claude Code) и `~/.codex/AGENTS.md` (Codex) — один и тот же
текст, генерируемый из репозитория `agent-rules`.

Операционное руководство проекта — `CLAUDE.md` в корне.

Здесь только то, что **отличается** от глобального контракта. Не копировать сюда
глобальные правила: разойдутся молча.

## Branching

Дополнительный префикс к глобальному списку:

- `content/<short-name>` — уровни, спрайты, диалоги, баланс

## Commits

Дополнительные типы сообщений:

```text
balance: reduce level 2 spike density
art: add idle animation frames
```

Перед коммитом дополнительно убедиться, что **крупные бинарники не застейджены**
(см. «Assets» в `CLAUDE.md`: > 5 МБ в git не класть).

## Testing

Минимум для любого изменения:

```bash
npm test           # vitest
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run dev        # и проверить руками в браузере
```

## Documentation

Дополнительно к глобальному списку обновлять документацию при изменении:

- игровых механик и управления;
- балансных чисел;
- asset pipeline.

## Obsidian

Vault лежит **внутри репозитория** — `docs/`. Глобальное правило про
documentation pass действует, но источник знания — этот `docs/`, а не
`~/Documents/Obsidian Vault`. Подробности — раздел «Obsidian» в `CLAUDE.md`.

## Definition of Done

Дополнительно к глобальному:

- `npm run typecheck` и `npm run build` прошли;
- заметка в `docs/` обновлена.
