import { createConfig, http } from "wagmi";
import { metaMask } from "wagmi/connectors";
import { arcTestnet } from "./arc";

export const wagmiConfig = createConfig({
  chains: [arcTestnet],
  connectors: [
    metaMask({
      dappMetadata: {
        name: "HumbleHumansHub",
        url: typeof window !== "undefined" ? window.location.origin : "https://humblehumanshub.xyz",
        iconUrl: "/favicon.ico",
      },
    }),
  ],
  transports: {
    [arcTestnet.id]: http(arcTestnet.rpcUrls.default.http[0]),
  },
  ssr: true,
});
