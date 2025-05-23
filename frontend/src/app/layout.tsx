// app/layout.tsx or app/layout.tsx (this replaces _app.tsx in App Router)

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThirdwebProvider } from "thirdweb/react";
import { ThemeProvider } from "next-themes";
import { Theme } from "@radix-ui/themes";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Alpha NFT Marketplace",
  description:
    "A Marketplace for minting and trading NFTs on the Ethereum blockchain.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Theme>
          <ThirdwebProvider>
            <div className="relative">
              <Navbar />
              <div className="md:mt-24">{children}</div>
              <Footer />
            </div>
          </ThirdwebProvider>
        </Theme>
      </body>
    </html>
  );
}
