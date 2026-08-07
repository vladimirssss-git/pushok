import { defineConfig, type Plugin } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import { writeFileSync } from 'node:fs';
import { parseLevelsPayload, renderCustomLevelsFile } from './src/systems/levelsFile';

const LEVELS_FILE = fileURLToPath(new URL('./src/config/customLevels.ts', import.meta.url));
const MAX_PAYLOAD_BYTES = 256 * 1024;

/**
 * Кнопка «Сохранить» в редакторе (`?editor`) пишет уровень прямо в
 * `src/config/customLevels.ts` — то есть в исходник репозитория, откуда
 * уровень станет дефолтным для всех игроков после деплоя. Без этого
 * плагина «сохранить» означало бы «скачать файл и положить его руками».
 *
 * Только dev (`apply: 'serve'`): в прод-сборке эндпоинта нет, и редактор
 * там откатывается на скачивание файла.
 *
 * Эндпоинт пишет в исходники, поэтому две границы обязательны:
 * 1. Запрос принимается только от самого дев-сервера (`Origin`/`Host`
 *    localhost) — иначе любая открытая в браузере страница могла бы
 *    переписать файл в репозитории (та же дыра, что в advisory про CORS
 *    dev-сервера Vite).
 * 2. Содержимое файла генерируется здесь из разобранных данных
 *    (`parseLevelsPayload` → `renderCustomLevelsFile`), а не берётся из
 *    тела запроса: записывается только то, что прошло проверку формы.
 */
function levelSaverPlugin(): Plugin {
  return {
    name: 'pushok-level-saver',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__save-levels', (req, res) => {
        const done = (code: number, message: string): void => {
          res.statusCode = code;
          res.setHeader('content-type', 'text/plain; charset=utf-8');
          res.end(message);
        };

        if (req.method !== 'POST') return done(405, 'Только POST');
        if (!isLocalRequest(req.headers.origin, req.headers.host)) {
          return done(403, 'Сохранять уровни можно только с локального дев-сервера');
        }

        let body = '';
        let tooBig = false;
        req.on('data', (chunk: Buffer) => {
          body += chunk;
          if (body.length > MAX_PAYLOAD_BYTES && !tooBig) {
            tooBig = true;
            done(413, 'Слишком большой уровень');
            req.destroy();
          }
        });
        req.on('end', () => {
          if (tooBig) return;
          try {
            const levels = parseLevelsPayload(body);
            writeFileSync(LEVELS_FILE, renderCustomLevelsFile(levels), 'utf8');
            done(200, `Сохранены уровни: ${Object.keys(levels).join(', ')}`);
          } catch (err) {
            done(400, err instanceof Error ? err.message : 'Не разобрал уровень');
          }
        });
      });
    },
  };
}

/** Локальный ли источник запроса: `Origin` если он есть, иначе `Host`. */
function isLocalRequest(origin: string | undefined, host: string | undefined): boolean {
  const hostname = (value: string | undefined): string => {
    if (!value) return '';
    try {
      return new URL(value.includes('://') ? value : `http://${value}`).hostname;
    } catch {
      return '';
    }
  };
  const isLocal = (name: string): boolean => name === 'localhost' || name === '127.0.0.1' || name === '[::1]';
  return origin ? isLocal(hostname(origin)) : isLocal(hostname(host));
}

// base подставляется в CI для GitHub Pages (/<repo>/)
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [levelSaverPlugin()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    chunkSizeWarningLimit: 1500,
  },
});
