// Copyright (c), Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// Owner private data pattern:
/// - Anyone can encrypt any data and store it encrypted as a Sui object.
/// - The owner of the Sui object can always decrypt the data.
///
/// Use cases that can be built on top of this: personal key storage, private NFTs.
///
/// This pattern does NOT implement versioning, please see other patterns for
/// examples of versioning.
///
module seal_data::seal_data;

use std::string::String;

use sui::display;
use sui::package;

const ENoAccess: u64 = 77;

const NAME: vector<u8> = b"Walrus Private Data";
const DESCRIPTION: vector<u8> = b"Walrus Private Data.\nCreator: {creator}\nBlob: {blob_id}";
const LINK: vector<u8> = b"https://testnet.suivision.xyz/object/{id}";
const IMAGE_URL: vector<u8> =
    b"https://aggregator.walrus-testnet.walrus.space/v1/blobs/SyBqAia965qyTnro5Ij7kUfK65ZRuOtVdxHBCR8KaTE";
const THUMBNAIL_URL: vector<u8> = 
    b"https://aggregator.walrus-testnet.walrus.space/v1/blobs/RhA6SYk6CAowRRin-MePvYF6scnL9eXsUfcrvBYleFU";
const PROJECT_URL: vector<u8> = b"https://github.com/MystenLabs/walrus-pocs";
const CREATOR: vector<u8> = b"{creator}";

public struct PrivateData has key, store {
    id: UID,
    creator: address,
    nonce: vector<u8>,
    blob_id: String,
}

public struct SEAL_DATA() has drop;

/// Initialize Publisher and Display<PrivateData> object.
fun init(otw: SEAL_DATA, ctx: &mut TxContext) {
    let publ = package::claim(otw, ctx);
    let mut disp = display::new_with_fields<PrivateData>(
        &publ,
        vector[
            b"name".to_string(),
            b"description".to_string(),
            b"link".to_string(),
            b"image_url".to_string(),
            b"thumbnail_url".to_string(),
            b"project_url".to_string(),
            b"creator".to_string()
        ],
        vector[
            NAME.to_string(),
            DESCRIPTION.to_string(),
            LINK.to_string(),
            IMAGE_URL.to_string(),
            THUMBNAIL_URL.to_string(),
            PROJECT_URL.to_string(),
            CREATOR.to_string()
        ],
        ctx,
    );
    disp.update_version();
    transfer::public_transfer(publ, ctx.sender());
    transfer::public_transfer(disp, ctx.sender());
}

/// The encryption key id is [pkg id][creator address][random nonce]
/// - The creator address is used to ensure that only the creator can create an object for that key id
///   (otherwise, others can try to frontrun and create an object for the same key id).
/// - The random nonce is used to ensure that the key id is unique even if the object is transferred to
///   another user.
/// - A single user can create unlimited number of key ids, simply by using different nonces.
fun compute_key_id(creator: address, nonce: vector<u8>): vector<u8> {
    let mut blob = creator.to_bytes();
    blob.append(nonce);
    blob
}

/// Store an encrypted data that was encrypted using the above key id for creator.
/// Note: If creator is different to ctx.sender(), sender will not be able to request a key.
/// Instead, they can hold on to the encryption key when encrypting.
public fun store(creator: address, nonce: vector<u8>, blob_id: String, ctx: &mut TxContext): PrivateData {
    PrivateData {
        id: object::new(ctx),
        creator,
        nonce,
        blob_id,
    }
}

//////////////////////////////////////////////
/// Access control
/// key format: [pkg id][creator][nonce]
fun check_policy(id: vector<u8>, e: &PrivateData): bool {
    // Only owner can call this function (enforced by MoveVM)

    // Check the key id is correct.
    let key_id = compute_key_id(e.creator, e.nonce);
    key_id == id
}

entry fun seal_approve(id: vector<u8>, e: &PrivateData) {
    assert!(check_policy(id, e), ENoAccess);
}

#[test_only]
public fun destroy(e: PrivateData) {
    let PrivateData { id, .. } = e;
    object::delete(id);
}

