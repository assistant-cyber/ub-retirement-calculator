import type { Metadata } from "next";
import { Playfair_Display, Open_Sans } from "next/font/google";
import Image from "next/image";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-opensans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Retirement Calculator | United Benefits",
  description:
    "See if you're on track for retirement with the United Benefits Retirement Readiness Calculator — a free 5-step educational tool.",
  icons: { icon: "/favicon.png" },
  openGraph: {
    title: "Retirement Calculator | United Benefits",
    description:
      "See if you're on track for retirement with the United Benefits Retirement Readiness Calculator.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${openSans.variable}`}>
      <body className="flex min-h-screen flex-col">
        <header className="bg-white shadow-sm">
          <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-4 sm:px-6">
            <Image
              src="/images/ub-logo.webp"
              alt="United Benefits"
              width={160}
              height={48}
              priority
              className="h-10 w-auto"
            />
            <span className="hidden font-heading text-lg font-semibold text-navy sm:inline border-l border-gray-200 pl-4">
              Retirement Readiness Calculator
            </span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">{children}</main>

        <footer className="bg-navy text-white">
          <div className="mx-auto max-w-4xl px-4 py-6 text-sm sm:px-6">
            <p className="font-semibold">© 2026 United Benefits</p>
            <p className="mt-1 text-white/80">
              This calculator is for educational purposes only and does not constitute financial,
              tax, or investment advice. Estimates assume constant returns and inflation. Please
              consult a United Benefits advisor about your specific situation.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
