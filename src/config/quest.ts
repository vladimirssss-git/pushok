/**
 * Данные первого уровня — квеста в лесу у моста.
 * Единственный источник текста квеста и диалогов (правило единственного источника чисел
 * распространяется и на игровой текст: раскидан по сцене — разойдётся при правке).
 */
export interface QuestStep {
  id: string;
  title: string;
}

export const QUEST_STEPS: QuestStep[] = [
  { id: 'key', title: 'Найди ключ от моста' },
  { id: 'talk', title: 'Поговори с псом' },
  { id: 'chest', title: 'Открой сундук' },
  { id: 'lighthouse', title: 'Найди путь к маяку' },
];

export const QUEST_DIALOGUE = {
  dogName: 'ПАЛКАН',
  dogGreeting: 'Хочешь попасть к маяку? Мост сломан.\nНайди старинный ключ. Подсказка на доске.',
  dogRepeat: 'Ключ был у хозяина.\nОн потерял его, когда ходил купаться.',
  boardTitle: 'Старинный ключ',
  boardHint: 'ищи там, где\nпоют рыбы',
  signLabel: 'МАЯК →',
} as const;

export const QUEST_HUD = {
  hearts: 3,
  fish: 0,
  starsCurrent: 1,
  starsTotal: 5,
} as const;

/** Дистанция в пикселях, на которой Пушок «слышит» пса и всплывает диалог. */
export const QUEST_TALK_RANGE = 46;
