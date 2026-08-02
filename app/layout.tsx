import "./global.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "RpD Manager",
  description: "RpD issue browser",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}