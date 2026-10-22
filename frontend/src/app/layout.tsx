import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "YT Bilingual Subtitles | Estudo de Idiomas com YouTube",
  description:
    "Plataforma de estudos para aprendizado interativo de inglês com vídeos do YouTube, legendas bilíngues sincronizadas, dicionário instantâneo e repetição de pronúncia.",
  referrer: "strict-origin-when-cross-origin",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`dark h-full antialiased overflow-x-hidden ${inter.variable} ${outfit.variable}`}
    >
      <body
        className={`${inter.className} min-h-full flex flex-col bg-[#070A0F] text-zinc-100 selection:bg-indigo-500 selection:text-white overflow-x-hidden w-full max-w-full relative`}
      >
        {children}
      </body>
    </html>
  );
}
