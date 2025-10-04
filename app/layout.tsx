import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "R/FTE Bottleneck Mapper",
  description: "Visualize and raise Revenue per Employee — by finding your system constraint.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className + " bg-background text-foreground"}>
        {children}
      </body>
    </html>
  );
}
