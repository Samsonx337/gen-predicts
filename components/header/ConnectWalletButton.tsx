"use client";

import { ConnectButton } from "thirdweb/react";
import { createWallet } from "thirdweb/wallets";
import { defineChain } from "thirdweb/chains";
import { createThirdwebClient } from "thirdweb";
import { useTheme } from "@/context/ThemeContext";

// Create Thirdweb client
const thirdwebClientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
const client = thirdwebClientId
  ? createThirdwebClient({
      clientId: thirdwebClientId,
    })
  : null;

// Genlayer Network
// RPC URL from environment variable (for frontend wallet connections)
const genlayerChain = defineChain({
  id: 50312, // Genlayer chain ID
  name: "Genlayer",
  nativeCurrency: {
    name: "GEN",
    symbol: "GEN",
    decimals: 18,
  },
  rpc: process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || "https://rpc.genlayer.io",
});

export default function ConnectWalletButton() {
  const { theme } = useTheme();

  if (!client) {
    return (
      <button
        className="px-4 py-2 rounded-lg font-medium text-sm bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
        type="button"
        disabled
      >
        Wallet unavailable
      </button>
    );
  }

  return (
    <div className="thirdweb-connect-button-wrapper">
      <ConnectButton
        client={client}
        chain={genlayerChain}
        wallets={[createWallet("io.metamask"), createWallet("com.coinbase.wallet")]}
        theme={theme === "dark" ? "dark" : "light"}
        connectButton={{
          label: "Connect Wallet",
          className: "px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 bg-blue-600 text-white hover:bg-blue-600 dark:bg-blue-500 dark:text-white dark:hover:bg-blue-600 shadow-theme-sm hover:shadow-theme-md",
        }}
        connectModal={{
          size: "wide",
        }}
      />
    </div>
  );
}

