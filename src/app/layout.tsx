import type { Metadata } from "next";
import localFont from "next/font/local";

import { Providers } from "@/app/providers";

import "./globals.css";

const sans = localFont({
  src: "./fonts/dm-sans.ttf",
  variable: "--font-cookly-sans",
  weight: "100 1000",
  display: "swap",
});

const display = localFont({
  src: [
    { path: "./fonts/lora.ttf", weight: "400 700", style: "normal" },
    { path: "./fonts/lora-italic.ttf", weight: "400 700", style: "italic" },
  ],
  variable: "--font-cookly-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Cookly — Cook better, together", template: "%s | Cookly" },
  description:
    "A little inspiration for your everyday cooking. Discover recipes, find your next favorite dish, and make more of what's in your kitchen.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${sans.variable} ${display.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
