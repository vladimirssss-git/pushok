---
description: Прогнать проверки, закоммитить и запушить
---

1. `git status --short --branch` и `git diff` — показать, что меняется.
2. `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
3. Если что-то падает — остановиться и починить, не коммитить.
4. Обновить заметки в `docs/` (дизайн/техника) и добавить запись в `docs/05 Devlog/`.
5. Коммит осмысленным сообщением (`feat:`/`fix:`/`balance:`/`art:`/`docs:`).
6. Push ветки. В `main` напрямую не пушить.
7. Выдать "After coding report" из `CLAUDE.md` с хешем коммита.
