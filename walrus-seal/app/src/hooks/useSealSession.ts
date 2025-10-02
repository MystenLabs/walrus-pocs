"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { SessionKey } from "@mysten/seal";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { useCurrentAccount, useSignPersonalMessage } from "@mysten/dapp-kit";
import { SEAL_CONFIG, createAndSignSessionKey } from "@/utils/sealUtils";

const SESSION_TTL_MINUTES = 30;

export interface SealSessionState {
    suiAddress: string;
    sessionKey: SessionKey;
    personalMessageBytes: Uint8Array;
    signatureBase64: string;
    isReady: boolean;
}

export function useSealSession() {
    const [session, setSession] = useState<SealSessionState | null>(null);
    const currentAccount = useCurrentAccount();
    const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();
    
    const suiClient = useMemo(
        () => new SuiClient({ url: getFullnodeUrl(SEAL_CONFIG.network) }), 
        []
    );

    /**
     * Auto-clear session when wallet disconnects or switches to a different address
     */
    useEffect(() => {
        const currentAddress = currentAccount?.address;
        
        // If wallet disconnected, clear session
        if (!currentAddress && session) {
            setSession(null);
            return;
        }
        
        // If wallet switched to different address, clear session
        if (session && currentAddress && session.suiAddress !== currentAddress) {
            setSession(null);
        }
    }, [currentAccount?.address, session]);

    /**
     * Initialize a Seal session with user signature
     * 
     * Creates a SessionKey, prompts user to sign with their Sui wallet, then activates the session.
     * Requires a connected Sui wallet.
     * 
     * @returns Initialized session state
     * @throws Error if no wallet is connected
     */
    const initializeSession = useCallback(async (): Promise<SealSessionState> => {
        if (!currentAccount?.address) {
            throw new Error("No Sui wallet connected. Please connect your wallet first.");
        }

        const suiAddress = currentAccount.address;

        // Capture the signature for backend verification
        let capturedSignature = "";

        // Create and sign session key using reusable utility
        const sessionKey = await createAndSignSessionKey({
            suiAddress,
            packageId: SEAL_CONFIG.packageId,
            ttlMinutes: SESSION_TTL_MINUTES,
            suiClient,
            signMessage: async (message: Uint8Array) => {
                const { signature } = await signPersonalMessage({ message });
                capturedSignature = signature; // Store for session state
                return signature;
            },
        });
        
        const personalMessageBytes = sessionKey.getPersonalMessage();
        
        // Create and store session state
        const sessionState: SealSessionState = {
            suiAddress,
            sessionKey,
            personalMessageBytes,
            signatureBase64: capturedSignature, // Needed for backend API verification
            isReady: true,
        };
        
        setSession(sessionState);
        return sessionState;
    }, [currentAccount, suiClient, signPersonalMessage]);

    /**
     * Get a personal message for signing without creating a full session
     * 
     * Useful for previewing what the user will sign before initializing the session.
     * Requires a connected Sui wallet.
     * 
     * @returns Personal message bytes that would be signed
     * @throws Error if no wallet is connected
     */
    const getPersonalMessage = useCallback(async (): Promise<Uint8Array> => {
        if (!currentAccount?.address) {
            throw new Error("No Sui wallet connected. Please connect your wallet first.");
        }

        const tempSessionKey = await SessionKey.create({
            address: currentAccount.address,
            packageId: SEAL_CONFIG.packageId,
            ttlMin: SESSION_TTL_MINUTES,
            suiClient,
        });
        return tempSessionKey.getPersonalMessage();
    }, [currentAccount, suiClient]);

    /**
     * Clear the current session state
     */
    const clearSession = useCallback(() => {
        setSession(null);
    }, []);

    /**
     * Check if current session is valid and ready
     */
    const isSessionValid = useCallback((): boolean => {
        return session !== null && session.isReady;
    }, [session]);

    return {
        session,
        suiClient,
        initializeSession,
        getPersonalMessage,
        clearSession,
        isSessionValid,
    };
}
