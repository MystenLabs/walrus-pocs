"use client";

import { SuiClientProvider, WalletProvider, ConnectButton } from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@mysten/dapp-kit/dist/index.css";

// Create a query client for React Query
const queryClient = new QueryClient();

// Define the networks we want to connect to
const networks = {
  testnet: { url: getFullnodeUrl("testnet") },
  mainnet: { url: getFullnodeUrl("mainnet") },
};

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networks} defaultNetwork="testnet">
        <WalletProvider autoConnect>
          <div className="min-h-screen">
            <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Seal Encryption
                </h1>
                <ConnectButton />
              </div>
            </header>
            <div>{children}</div>
          </div>
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

