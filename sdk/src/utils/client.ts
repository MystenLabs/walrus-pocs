// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import {getFullnodeUrl, SuiClient} from '@mysten/sui/client'
import {WalrusClient} from "@mysten/walrus"

export function getClient() {
    return new SuiClient({
        url: getFullnodeUrl('testnet'),
        network: 'testnet',
    }).$extend(
        WalrusClient.experimental_asClientExtension({
            storageNodeClientOptions: {
                timeout: 60_000,
            },
        }),
    )
}

export function getWalrusClient() {
    return new WalrusClient({
        network: 'testnet',
        suiClient: getClient(),
        storageNodeClientOptions: {
            timeout: 60_000,
        },
    });
}
