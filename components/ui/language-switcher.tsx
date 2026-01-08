"use client"

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { Globe } from 'lucide-react';
import { locales } from '@/i18n/locales';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const languageNames: Record<string, string> = {
    'id': 'Indonesia',
    'zh-TW': '中文 (繁體)'
  };

  const switchLanguage = (newLocale: string) => {
    // Remove current locale from pathname and prepend new locale
    const segments = pathname.split('/').filter(Boolean);
    const currentLocale = segments[0];
    
    let newPathname;
    if (locales.includes(currentLocale as any)) {
      // Replace the locale segment
      segments[0] = newLocale;
      newPathname = '/' + segments.join('/');
    } else {
      // No locale in path, prepend new locale
      newPathname = '/' + newLocale + pathname;
    }
    
    router.push(newPathname);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
          <Globe className="h-4 w-4" />
          <span className="sr-only">Switch language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => switchLanguage(loc)}
            className={locale === loc ? 'bg-accent' : ''}
          >
            {languageNames[loc]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}