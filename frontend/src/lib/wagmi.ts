import { createConfig, http } from "wagmi";
import { metaMask } from "wagmi/connectors";
import { arcTestnet } from "./arc";

const appUrl =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL || "https://humblehumanshub.xyz";

export const wagmiConfig = createConfig({
  chains: [arcTestnet],
  connectors: [
    metaMask({
      dappMetadata: {
        name: "HumbleHumansHub",
        url: appUrl,
        iconUrl: `${appUrl}/favicon.ico`,
      },
    }),
  ],
  transports: {
    [arcTestnet.id]: http(arcTestnet.rpcUrls.default.http[0]),
  },
  ssr: true,
});
