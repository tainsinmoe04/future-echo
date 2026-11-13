import { Noto_Sans_Myanmar, Noto_Serif_Myanmar, Padauk } from "next/font/google";

// Myanmar faces are applied only where Myanmar copy renders (bilingual home and
// the gated journal routes), so sign-in pages never register or fetch them.
export const myanmar = Noto_Sans_Myanmar({ variable: "--font-myanmar", subsets: ["myanmar"], weight: ["400", "600"], display: "swap", preload: false });
export const myanmarSoft = Padauk({ variable: "--font-myanmar-soft", subsets: ["myanmar"], weight: "400", display: "swap", preload: false });
export const myanmarBook = Noto_Serif_Myanmar({ variable: "--font-myanmar-book", subsets: ["myanmar"], weight: "400", display: "swap", preload: false });
export const myanmarVariables = `${myanmar.variable} ${myanmarSoft.variable} ${myanmarBook.variable}`;
