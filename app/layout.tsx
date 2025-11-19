// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notra AI",
  description: "Your Intelligent Learning & Writing Companion.",
  icons: {
    icon: "/logo-notra.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className="
          min-h-screen
          bg-gradient-to-b from-sky-50 via-blue-50 to-indigo-100
          text-slate-900
          antialiased
        "
      >
        {children}
      </body>
    </html>
  );
}