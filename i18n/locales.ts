export const locales = ['id', 'zh-TW'] as const;
export type Locale = (typeof locales)[number];