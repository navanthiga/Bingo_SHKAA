import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SHKAA · Tote & Toast Bingo",
  description: "Create freely, connect kindly. Complete the SHKAA event bingo.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
