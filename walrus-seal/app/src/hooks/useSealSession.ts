"use client";

import { useState, useCallback, useMemo } from "react";
import { SessionKey } from "@mysten/seal";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { useCurrentAccount, useSignPersonalMessage } from "@mysten/dapp-kit";
import { SEAL_CONFIG } from "@/utils/sealUtils";

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

        // Create a new SessionKey for this address
        const sessionKey = await SessionKey.create({
            address: suiAddress,
            packageId: SEAL_CONFIG.packageId,
            ttlMin: SESSION_TTL_MINUTES,
            suiClient,
        });
        
        // Get the personal message that needs to be signed
        const personalMessageBytes = sessionKey.getPersonalMessage();
        
        // Prompt user to sign with their Sui wallet
        const { signature: signatureBase64 } = await signPersonalMessage({
            message: personalMessageBytes,
        });
        
        // Activate the session by setting the signature
        await sessionKey.setPersonalMessageSignature(signatureBase64);
        
        // Create and store session state
        const sessionState: SealSessionState = {
            suiAddress,
            sessionKey,
            personalMessageBytes,
            signatureBase64,
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
