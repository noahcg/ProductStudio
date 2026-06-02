import type { Metadata } from "next";
import { Inter, Dancing_Script } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AppHeader } from "@/components/layout/app-header";
import { getProfile } from "@/lib/data";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const script = Dancing_Script({
  variable: "--font-script",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Product Studio",
  description: "Your personal founder operating system — what should I work on next?",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profile = await getProfile();

  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${script.variable}`}>
      <body className="min-h-screen studio-backdrop">
        <ThemeProvider>
          <AppHeader
            brand={profile.fullName}
            notifications={profile.unreadNotifications}
          />
          <main className="mx-auto w-full max-w-[1400px] px-6 pb-16 pt-6">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
