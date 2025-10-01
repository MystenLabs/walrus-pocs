// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import {getClient} from "./utils/client";
import fs from "fs";

async function download(blobId: string, outputPath: string) {
    const blobBytes = await getClient().walrus.readBlob({blobId})
    fs.writeFileSync(outputPath, blobBytes)
    console.log(`${blobId} was downloaded at ${outputPath}`);
}

const args = process.argv.slice(2)
download(args[0], args[1]).then(console.log).catch(console.error)