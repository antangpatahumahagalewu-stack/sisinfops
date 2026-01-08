import {notFound} from 'next/navigation';
import {getRequestConfig} from 'next-intl/server';
import {locales, type Locale} from '@/i18n/locales';

export default getRequestConfig(async ({locale}) => {
  // Validate that the incoming `locale` parameter is valid
  // Default to 'id' if locale is not provided or invalid
  const validLocale = (locale && locales.includes(locale as Locale)) 
    ? (locale as Locale) 
    : 'id';

  // Load messages for the locale
  let messages;
  if (validLocale === 'id') {
    messages = (await import('./i18n/messages/id.json')).default;
  } else {
    messages = (await import('./i18n/messages/zh-TW.json')).default;
  }

  return {
    locale: validLocale,
    messages
  };
});