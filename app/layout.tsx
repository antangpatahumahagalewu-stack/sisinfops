import type { Metadata } from "next";
import "./globals.css";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "Sistem Informasi Perhutanan Sosial",
  description: "Aplikasi internal yayasan untuk mengelola data Perhutanan Sosial & PKS",
};

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
