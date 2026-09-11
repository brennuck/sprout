import type { Metadata, Viewport } from "next";
import { Outfit, Fraunces } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { ToastProvider } from "@/components/ui/Toast";
import { THEME_COOKIE, parseTheme } from "@/lib/theme";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Sprout — Give every dollar a job",
    template: "%s · Sprout",
  },
  description:
    "Envelope budgets, sinking funds, goals, paycheck plans, and reports that help you stick to what matters.",
  manifest: "/manifest.webmanifest",
  applicationName: "Sprout",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Sprout",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#536345" },
    { media: "(prefers-color-scheme: dark)", color: "#121611" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <html lang="en" data-theme={theme === "system" ? undefined : theme} suppressHydrationWarning>
      <body className={`${outfit.variable} ${fraunces.variable} font-sans antialiased`}>
        <ToastProvider>{children}</ToastProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
