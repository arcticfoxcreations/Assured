import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { AppShell } from "@/components/shell/AppShell";
import { publicEnv } from "@/lib/env";

// Intentionally NOT using next/font/google here. That loader needs the
// build machine to reach fonts.googleapis.com at BUILD time — it works on
// Vercel (which has outbound internet), but fails the build outright on any
// locked-down CI runner, sandbox, or offline dev machine. Using the OS's
// native font stack (declared in globals.css) avoids that single point of
// failure with no visible difference for almost all visitors.

export const metadata: Metadata = {
  title: {
    default: "ASSURED — Your safety assurance",
    template: "%s — ASSURED",
  },
  description:
    "ASSURED is a connected safety ecosystem: emergency help, verified helplines, incident reporting, travel safety and community resources.",
  metadataBase: new URL(publicEnv.siteUrl),
  applicationName: publicEnv.appName,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f7f3" },
    { media: "(prefers-color-scheme: dark)", color: "#171d1b" },
  ],
};

// Runs before React hydrates so the correct theme class is present on
// first paint — avoids a light-mode flash for users who prefer dark.
const NO_FLASH_THEME_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('assured-theme');
    var theme = stored === 'light' || stored === 'dark' ? stored :
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
