import type { Metadata } from "next";
import { Inter, Dancing_Script } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AppHeader } from "@/components/layout/app-header";
import { getProfile, getAttentionInbox } from "@/lib/data";

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

// Set the atmosphere class before paint (default enabled → no class; only adds
// `atmosphere-off` when the user disabled it) to avoid any flash.
const atmosphereScript = `(function(){try{if(localStorage.getItem('ps-atmosphere')==='off'){document.documentElement.classList.add('atmosphere-off');}}catch(e){}})();`;

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [profile, inbox] = await Promise.all([getProfile(), getAttentionInbox()]);

  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${script.variable}`}>
      <body className="min-h-screen">
        <script dangerouslySetInnerHTML={{ __html: atmosphereScript }} />
        {/* Fixed background layers, behind all content. */}
        <div className="bg-base" aria-hidden="true" />
        <div className="atmosphere" aria-hidden="true" />
        <ThemeProvider>
          <AppHeader brand={profile.fullName} inbox={inbox} />
          <main className="mx-auto w-full max-w-[1400px] px-6 pb-16 pt-6">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
