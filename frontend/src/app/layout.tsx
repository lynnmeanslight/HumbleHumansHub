import type { Metadata } from "next";
import "./globals.css";
import { Web3Provider } from "@/providers/Web3Provider";
import { OnboardingModal } from "@/components/OnboardingModal";

export const metadata: Metadata = {
  title: "HumbleHumansHub — Pay $0.001 Per Read | Micro-Commerce on Arc",
  description:
    "A pay-per-read content platform where readers pay $0.001 USDC per article. No subscription, no account. Idle balance earns yield via USYC. Real-time micro-commerce powered by Arc.",
  keywords: [
    "micro-payments",
    "pay-per-read",
    "Web3",
    "Arc",
    "USDC",
    "USYC",
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
