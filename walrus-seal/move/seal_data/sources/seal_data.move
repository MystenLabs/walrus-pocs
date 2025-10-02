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

const ENoAccess: u64 = 77;

public struct PrivateData has key, store {
    id: UID,
    creator: address,
    nonce: vector<u8>,
    blob_id: String,
}

/// The encryption key id is [pkg id][creator address][random nonce]
/// - The creator address is used to ensure that only the creator can create an object for that key id
///   (otherwise, others can try to frontrun and create an object for the same key id).
/// - The random nonce is used to ensure that the key id is unique even if the object is transferred to
///   another user.
/// - A single user can create unlimited number of key ids, simply by using different nonces.
fun compute_key_id(sender: address, nonce: vector<u8>): vector<u8> {
    let mut blob = sender.to_bytes();
    blob.append(nonce);
    blob
}

/// Store an encrypted data that was encrypted using the above key id.
public fun store(nonce: vector<u8>, blob_id: String, ctx: &mut TxContext): PrivateData {
    PrivateData {
        id: object::new(ctx),
        creator: ctx.sender(),
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

