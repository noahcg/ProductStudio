import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AppHeader } from "@/components/layout/app-header";
import { getAttentionInbox } from "@/lib/data";

export const metadata: Metadata = {
  title: "Product Studio",
  description: "Your personal founder operating system — what should I work on next?",
};

// Set atmosphere + time-of-day classes before paint (to avoid any flash):
//  - `atmosphere-off` when the user disabled the background.
//  - `tod-{sunrise|afternoon|sunset|night}` from the viewer's local hour, which
//    swaps the background image (same time-of-day idea as the greeting). Default
//    (JS off) stays night via CSS.
const atmosphereScript = `(function(){try{var d=document.documentElement;if(localStorage.getItem('ps-atmosphere')==='off'){d.classList.add('atmosphere-off');}var h=new Date().getHours();var t=(h>=5&&h<11)?'sunrise':(h>=11&&h<17)?'afternoon':(h>=17&&h<20)?'sunset':'night';d.classList.add('tod-'+t);}catch(e){}})();`;

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const inbox = await getAttentionInbox();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen">
        <script dangerouslySetInnerHTML={{ __html: atmosphereScript }} />
        {/* Fixed background layers, behind all content. */}
        <div className="bg-base" aria-hidden="true" />
        <div className="atmosphere" aria-hidden="true" />
        <ThemeProvider>
          <AppHeader inbox={inbox} />
          <main className="mx-auto w-full max-w-[1400px] px-6 pb-16 pt-6">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
