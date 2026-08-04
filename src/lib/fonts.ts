import { Anton, Archivo, JetBrains_Mono } from "next/font/google";

// Impact display — used for hero mega-type and big statements only.
export const fontDisplay = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

// Athletic workhorse — headings + UI + body.
export const fontSans = Archivo({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Technical labels, eyebrows, data, code-like tags.
export const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const fontVars = `${fontDisplay.variable} ${fontSans.variable} ${fontMono.variable}`;
