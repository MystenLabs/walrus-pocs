"use client";

import { useState, useCallback, useMemo } from "react";
import { SessionKey } from "@mysten/seal";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { 
    SEAL_CONFIG,
    getPersonalMessageAsString,
} from "@/utils/sealUtils";

export interface SealSessionState {
    suiAddress: string;
    sessionKey: SessionKey;
    personalMessageBytes: Uint8Array;
    signatureBase64: string;
    isReady: boolean;
}

export function useSealSession() {
    const [session, setSession] = useState<SealSessionState | null>(null);
    const suiClient = useMemo(() => new SuiClient({ 
        url: getFullnodeUrl(SEAL_CONFIG.network) 
    }), []);

    /**
     * Initialize a Seal session - creates SessionKey with signature callback
     */
    const initializeSession = useCallback(async (
        suiAddress: string,
        signMessageCallback: (message: Uint8Array) => Promise<{ signature: string }>
    ): Promise<SealSessionState> => {
        console.log('📍 Creating SessionKey with signing callback...');
        
        let personalMessageBytes: Uint8Array;
        let signatureBase64: string;
        
        // Create SessionKey with signing callback (matches reference implementation)
        const sessionKey = await SessionKey.create({
            address: suiAddress,
            packageId: SEAL_CONFIG.packageId,
            ttlMin: 30,
            suiClient,
        });
        
        // Get the personal message to sign
        personalMessageBytes = sessionKey.getPersonalMessage();
        console.log('📝 Personal message from Seal:', new TextDecoder().decode(personalMessageBytes));
        console.log('📝 Message bytes length:', personalMessageBytes.length);
        
        // Sign with the provided callback
        const { signature } = await signMessageCallback(personalMessageBytes);
        signatureBase64 = signature;
        
        console.log('📍 Setting signature...');
        console.log('📍 Signature (base64):', signatureBase64);
        
        // Set the signature
        await sessionKey.setPersonalMessageSignature(signatureBase64);
        
        console.log('✅ SessionKey created and signature set');
        
        const sessionState: SealSessionState = {
            suiAddress,
            sessionKey,
            personalMessageBytes,
            signatureBase64,
            isReady: true,
        };
        
        setSession(sessionState);
        return sessionState;
    }, [suiClient]);

    /**
     * Get personal message to sign
     */
    const getPersonalMessage = useCallback(async (
        suiAddress: string
    ): Promise<Uint8Array> => {
        const tempSessionKey = await SessionKey.create({
            address: suiAddress,
            packageId: SEAL_CONFIG.packageId,
            ttlMin: 30,
            suiClient,
        });
        return tempSessionKey.getPersonalMessage();
    }, [suiClient]);

    /**
     * Clear the current session
     */
    const clearSession = useCallback(() => {
        setSession(null);
    }, []);

    /**
     * Check if session is valid
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
