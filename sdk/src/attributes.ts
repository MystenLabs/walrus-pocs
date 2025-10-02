// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import {getClient} from "./utils/client";

async function attributes(blobId: string) {
    return await getClient().walrus.getBlobMetadata({blobId})
}

const args = process.argv.slice(2)
attributes(args[0]).then(console.log).catch(console.error)