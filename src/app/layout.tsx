import type { Metadata } from "next";
import { Cormorant_Garamond, EB_Garamond, Noto_Serif_KR, Inter } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  display: "swap",
});

const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  display: "swap",
});

const notoSerifKR = Noto_Serif_KR({
  variable: "--font-noto-serif-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "OPERA HUMANITAS — 음악처럼 존재하는 삶과 예술의 사유",
  description:
    "박경준 바리톤이 들려주는 4회차 강연-콘서트 시리즈. 2026.06.20 → 07.11. 호서대 ART SPACE HOSEO.",
  openGraph: {
    title: "OPERA HUMANITAS — 4 Nights · 2026",
    description: "Per cantum, per scaenam — vitae et artis cogitatio.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${cormorant.variable} ${ebGaramond.variable} ${notoSerifKR.variable} ${inter.variable}`}
      data-palette="navy"
      data-density="editorial"
      data-latin="on"
    >
      <body>{children}</body>
    </html>
  );
}
