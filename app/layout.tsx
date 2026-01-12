import type { Metadata, Viewport } from "next";
import "./globals.css";
import { headers } from "next/headers";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  let locale = headersList.get("x-next-intl-locale");
  
  if (!locale) {
    const referer = headersList.get("referer") || "";
    const match = referer.match(/^\/(id|zh-TW)(\/|$)/);
    locale = match ? match[1] : "id";
  }

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  
  // Try to get locale from x-next-intl-locale header set by middleware
  let locale = headersList.get("x-next-intl-locale");
  
  // If not available, try to extract from referer or pathname
  if (!locale) {
    const referer = headersList.get("referer") || "";
    const match = referer.match(/^\/(id|zh-TW)(\/|$)/);
    locale = match ? match[1] : "id";
  }

  return (
    <html lang={locale}>
      <body>
        {children}
      </body>
    </html>
  );
}
