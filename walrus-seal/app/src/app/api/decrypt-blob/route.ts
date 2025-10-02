import { NextRequest, NextResponse } from "next/server";
import { SuiClient } from "@mysten/sui/client";
import { verifyPersonalMessageSignature } from "@mysten/sui/verify";
import { 
    SEAL_CONFIG,
    createSuiClient,
    createSessionKey,
    getPersonalMessageAsString,
} from "@/utils/sealUtils";

let suiClientInstance: SuiClient | null = null;

function getSuiClient(): SuiClient {
    if (!suiClientInstance) {
        suiClientInstance = createSuiClient();
    }
    return suiClientInstance;
}

export async function POST(req: NextRequest) {
    try {
        const { blobId, suiAddress, signature, personalMessageBase64 } = await req.json();

        // Validate required fields
        if (typeof blobId !== "string" || !blobId) {
            return NextResponse.json(
                { ok: false, error: "Missing blobId" },
                { status: 400 }
            );
        }

        if (typeof suiAddress !== "string" || !suiAddress) {
            return NextResponse.json(
                { ok: false, error: "Missing suiAddress" },
                { status: 400 }
            );
        }

        if (typeof signature !== "string" || !signature) {
            return NextResponse.json(
                { ok: false, error: "Missing signature" },
                { status: 400 }
            );
        }

        if (typeof personalMessageBase64 !== "string" || !personalMessageBase64) {
            return NextResponse.json(
                { ok: false, error: "Missing personalMessageBase64" },
                { status: 400 }
            );
        }

        console.log('Looking up PrivateData objects for Sui address:', suiAddress);

        // Verify Sui signature
        try {
            // Decode the personal message from base64 (Seal's personal message is binary)
            const messageBytes = Buffer.from(personalMessageBase64, 'base64');

            console.log('Verifying Sui signature for personal message');
            console.log('Message bytes length:', messageBytes.length);
            console.log('Signature (base64):', signature);

            const publicKey = await verifyPersonalMessageSignature(
                messageBytes,
                signature
            );

            console.log('✅ Signature verification succeeded');
            console.log('Public key from signature:', publicKey.toSuiAddress());
            
            // Verify the signature matches the claimed address
            if (publicKey.toSuiAddress() !== suiAddress) {
                throw new Error("Signature does not match the provided Sui address");
            }

        } catch (sigError: any) {
            console.error('❌ Signature validation error:', sigError);
            return NextResponse.json(
                { ok: false, error: `Signature validation failed: ${sigError.message}` },
                { status: 400 }
            );
        }

        // Get all PrivateData objects owned by this address
        const client = getSuiClient();
        const ownedObjects = await client.getOwnedObjects({
            owner: suiAddress,
            filter: {
                StructType: `${SEAL_CONFIG.packageId}::seal_data::PrivateData`
            },
            options: {
                showContent: true,
            }
        });

        console.log(`Found ${ownedObjects.data.length} PrivateData objects`);

        // Find the object with matching blob_id (now stored as String)
        console.log('Looking for blob ID:', blobId);

        const privateDataObject = ownedObjects.data.find((obj: any) => {
            if (obj.data?.content?.fields?.blob_id) {
                const objBlobId = obj.data.content.fields.blob_id;
                console.log('Checking blob_id:', objBlobId, 'against:', blobId);
                return objBlobId === blobId;
            }
            return false;
        });

        if (!privateDataObject?.data?.content) {
            console.error(`No PrivateData object found for blob ID: ${blobId}`);
            console.error('Available blob IDs:', ownedObjects.data.map((obj: any) => 
                obj.data?.content?.fields?.blob_id
            ));
            return NextResponse.json(
                { ok: false, error: `No PrivateData object found for blob ID ${blobId}` },
                { status: 404 }
            );
        }

        // Extract the nonce from the object
        const fields = (privateDataObject.data.content as any).fields;
        const nonce = Buffer.from(fields.nonce).toString('hex');

        console.log('Found nonce:', nonce);

        // Fetch the encrypted blob from Walrus
        const walrusAggregator = process.env.WALRUS_AGGREGATOR || "https://aggregator.walrus-testnet.walrus.space";
        
        console.log('Fetching blob from Walrus:', blobId);
        
        let encryptedBytes: Uint8Array;
        try {
            const walrusRes = await fetch(`${walrusAggregator}/v1/blobs/${blobId}`);

            if (!walrusRes.ok) {
                const errorText = await walrusRes.text();
                console.error('Walrus error:', errorText);
                throw new Error(`Walrus API error: ${walrusRes.status} ${walrusRes.statusText}`);
            }

            const arrayBuffer = await walrusRes.arrayBuffer();
            encryptedBytes = new Uint8Array(arrayBuffer);
            console.log('Fetched encrypted blob, size:', encryptedBytes.length);
        } catch (walrusError: any) {
            console.error("Walrus API error:", walrusError);
            return NextResponse.json(
                { ok: false, error: `Failed to fetch blob: ${walrusError.message}` },
                { status: 500 }
            );
        }

        // Return the encrypted object and nonce as base64
        const encryptedObjectBase64 = Buffer.from(encryptedBytes).toString('base64');

        return NextResponse.json({
            ok: true,
            encryptedObject: encryptedObjectBase64,
            nonce,
            blobId,
        });
    } catch (err: any) {
        console.error("❌ Error in decrypt-blob:", err);
        console.error("Message:", err?.message);
        console.error("Stack:", err?.stack);
        return NextResponse.json(
            { ok: false, error: err?.message || "Unknown error" },
            { status: 500 }
        );
    }
}
