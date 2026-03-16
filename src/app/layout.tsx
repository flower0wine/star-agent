import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Star Agent",
  description: "Find your perfect repository from your GitHub stars",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
