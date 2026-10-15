import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "YT Bilingual Subtitles | Estudo de Idiomas com YouTube",
  description:
    "Plataforma de estudos para aprendizado interativo de inglês com vídeos do YouTube, legendas bilíngues sincronizadas, dicionário instantâneo e repetição de pronúncia.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark h-full antialiased">
      <body className={`${inter.className} min-h-full flex flex-col bg-zinc-950 text-zinc-100 selection:bg-indigo-500 selection:text-white`}>
        {children}
      </body>
    </html>
  );
}
