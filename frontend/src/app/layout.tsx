import type { Metadata } from "next";
import "./globals.css";
import { Web3Provider } from "@/providers/Web3Provider";
import { OnboardingModal } from "@/components/OnboardingModal";

export const metadata: Metadata = {
  title: "HumbleHumansHub — Pay $0.001 Per Read",
  description:
    "A pay-per-read content platform where readers pay $0.001 per article. No subscription, no account. Add funds once and only pay for what you open.",
  keywords: [
    "micro-payments",
    "pay-per-read",
    "content platform",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Web3Provider>
          <OnboardingModal />
          {children}
        </Web3Provider>
      </body>
    </html>
  );
}
