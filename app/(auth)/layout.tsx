import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login - Sistem Informasi Perhutanan Sosial",
  description: "Aplikasi internal yayasan untuk mengelola data Perhutanan Sosial & PKS",
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      {children}
    </div>
  );
}
