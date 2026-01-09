import type { Metadata } from "next";
import { NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';
import { locales } from '@/i18n/locales';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  
  if (locale === 'zh-TW') {
    return {
      title: "社會林業資訊系統",
      description: "基金會內部應用程式，用於管理社會林業和合作夥伴關係數據",
    };
  }
  
  // Default to Indonesian
  return {
    title: "Sistem Informasi Perhutanan Sosial",
    description: "Aplikasi internal yayasan untuk mengelola data Perhutanan Sosial & PKS",
  };
}

export default async function LocaleLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) {
    notFound();
  }

  // Load messages for the locale directly
  // This matches the pattern used in i18n.ts
  let messages;
  if (locale === 'id') {
    messages = (await import('@/i18n/messages/id.json')).default;
  } else {
    messages = (await import('@/i18n/messages/zh-TW.json')).default;
  }

  return (
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
