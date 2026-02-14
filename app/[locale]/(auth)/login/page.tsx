"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, LogIn } from "lucide-react";

export default function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { locale } = use(params);
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log('🔧 Attempting login via API for:', email.substring(0, 10) + '...');
      
      // Use local API route to avoid CORS issues
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('📊 API login response status:', response.status);

      const result = await response.json();

      if (!response.ok) {
        console.error('❌ API login error:', result);
        
        // Handle specific error cases from API
        if (result.error) {
          setError(result.error);
        } else if (result.details?.includes('Invalid login credentials')) {
          setError("Email atau password salah.");
        } else {
          setError("Terjadi kesalahan. Silakan coba lagi.");
        }
        return;
      }

      console.log('✅ API login successful, redirecting to dashboard...');
      
      // Redirect to dashboard on successful login with locale
      router.push(`/${locale}/dashboard`);
      router.refresh();
    } catch (err: any) {
      console.error('❌ Unexpected login error:', err);
      
      if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
        setError("Koneksi jaringan bermasalah. Periksa koneksi internet Anda atau coba lagi nanti.");
      } else if (err.message?.includes('Network request failed')) {
        setError("Koneksi jaringan gagal. Periksa koneksi internet Anda.");
      } else if (err.message?.includes('timeout')) {
        setError("Waktu tunggu habis. Server tidak merespons. Silakan coba lagi.");
      } else {
        setError("Terjadi kesalahan yang tidak terduga. Silakan coba lagi.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <div className="h-24 w-24">
            <img
              src="/logo6.png"
              alt="Logo Yayasan ANTANGPATAHU MAHAGA LEWU"
              className="h-full w-full object-contain"
            />
          </div>
        </div>
        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              {tCommon("appName")}
            </CardTitle>
            <CardDescription className="text-center">
              {t("welcome")}
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">{t("email")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nama@yayasan.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t("password")}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  tCommon("loading", { defaultMessage: "Memproses..." })
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    {tCommon("login")}
                  </>
                )}
              </Button>
            </CardContent>
          </form>

          <CardFooter className="flex flex-col space-y-2">
            <p className="text-xs text-center text-muted-foreground">
              {t("internalAppNotice", {
                defaultMessage:
                  "Aplikasi ini hanya untuk penggunaan internal yayasan. Hubungi administrator untuk mendapatkan akses.",
              })}
            </p>
          </CardFooter>
        </Card>

        <div className="mt-8 text-center">
          <div className="text-sm text-gray-600">
            <p className="font-semibold">{t("foundationName")}</p>
            <p className="mt-1">{t("systemDescription")}</p>
            <p className="mt-1">{t("divisionName")}</p>
            <p className="mt-1">BOBY HARINTO MIHING</p>
            <p className="mt-1">{t("copyright")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
