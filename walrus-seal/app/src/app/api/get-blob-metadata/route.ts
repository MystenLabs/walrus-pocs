import { NextRequest, NextResponse } from "next/server";
import { SuiClient } from "@mysten/sui/client";
import { 
    SEAL_CONFIG,
    createSuiClient,
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
        const { blobId, suiAddress } = await req.json();

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
        
        console.log(`✅ Found PrivateData with nonce: ${nonce}`);

        return NextResponse.json({
            ok: true,
            nonce,
            blobId,
        });
    } catch (err: any) {
        console.error("❌ Error in get-blob-metadata:", err);
        return NextResponse.json(
            { ok: false, error: err?.message || "Unknown error" },
            { status: 500 }
        );
    }
}
