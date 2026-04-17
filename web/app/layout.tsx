import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Collab — Video Calls",
  description:
    "Crystal-clear, end-to-end WebRTC video calling, powered by Firebase signaling.",
  keywords: ["video call", "WebRTC", "Firebase", "collab"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body>{children}</body>
    </html>
  );
}
