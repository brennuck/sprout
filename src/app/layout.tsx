import type { Metadata, Viewport } from "next";
import { Outfit, Fraunces } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

export const metadata: Metadata = {
  title: "Sprout — Give every dollar a job",
  description:
    "Envelope budgets, paycheck plans, and goal-impact reports that help you stick to what matters.",
  manifest: "/manifest.webmanifest",
  applicationName: "Sprout",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Sprout",
  },
  icons: {
    icon: "/sprout-icon.svg",
    apple: "/sprout-icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#536345",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${fraunces.variable} font-sans antialiased`}>
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}

