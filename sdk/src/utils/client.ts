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
            uploadRelay: {
                host: 'https://upload-relay.testnet.walrus.space',
                sendTip: {
                    max: 1_000,
                },
            },
            storageNodeClientOptions: {
                timeout: 60_000,
            },
        }),
    )
}

