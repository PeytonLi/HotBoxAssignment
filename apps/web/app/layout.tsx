import type { ReactNode } from "react";
import { StoreProvider } from "@/components/store-provider";
import "./globals.css";

export const metadata = {
  title: "Apex Fuel — Lead Triage",
  description: "Enrich, qualify, and triage inbound Instagram leads.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
