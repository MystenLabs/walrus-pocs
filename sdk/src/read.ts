// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import {getClient} from "./utils/client";

async function read(blobId: string) {
    const blobBytes = await getClient().walrus.readBlob({blobId})
    return new Blob([new Uint8Array(blobBytes)]).text()
}

const args = process.argv.slice(2)
read(args[0]).then(console.log).catch(console.error)