/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2023 - https://www.igorski.nl
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import {
    S3Client, ListObjectsV2Command, GetObjectCommand,
    PutObjectCommand, DeleteObjectsCommand,
    CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import type { ListObjectsV2CommandOutput } from "@aws-sdk/client-s3";
import { createWriteStream } from "fs";
import { PROJECT_FILE_EXTENSION, PREVIEW_THUMBNAIL, getMimeByFileName } from "@/definitions/file-types";
import { JPEG } from "@/definitions/image-types";
import type { FileNode } from "@/definitions/storage-types";
import { scaleToRatio } from "@/math/image-math";
import { readBufferFromFile, base64toBlob } from "@/utils/file-util";
import { blobToCanvas, resizeToBase64 } from "@/utils/canvas-util";
import { blobToResource } from "@/utils/resource-manager";
import { formatFileName } from "@/utils/string-util";

const UPLOAD_CHUNK_SIZE = 5 * 1024 * 1024; // min accepted chunk size is 5 Mb

let s3client: S3Client;
let bucket: string;
let currentFolder = "";
let initialized = false;

// @ts-expect-error 'import.meta' property not allowed (not an issue, Vite takes care of it)
const generateThumbnails = import.meta.env.VITE_S3_GENERATE_THUMBNAILS === "true";

/**
 * Lazily initialize the S3 client
 */
export const initS3 = async (): Promise<boolean> => {
    if ( initialized ) {
        return true;
    }
    // @ts-expect-error 'import.meta' property not allowed (not an issue, Vite takes care of it)
    bucket = import.meta.env.VITE_S3_BUCKET_NAME;

    try {
        // @ts-expect-error 'import.meta' property not allowed (not an issue, Vite takes care of it)
        const endpoint = import.meta.env.VITE_S3_BUCKET_URL;
        const isCustom = endpoint.length > 0; // only when using non-AWS based S3 providers (e.g. MinIO)

        s3client = new S3Client({
            endpoint: isCustom ? endpoint.split( `/${bucket}` ).join ( `` ) : undefined,
            // @ts-expect-error 'import.meta' property not allowed (not an issue, Vite takes care of it)
            region: import.meta.env.VITE_S3_REGION,
            forcePathStyle: isCustom ? true : undefined,
            credentials: {
                // @ts-expect-error 'import.meta' property not allowed (not an issue, Vite takes care of it)
                accessKeyId    : import.meta.env.VITE_S3_ACCESS_KEY,
                // @ts-expect-error 'import.meta' property not allowed (not an issue, Vite takes care of it)
                secretAccessKey: import.meta.env.VITE_S3_SECRET_KEY
            },
        });
        initialized = true;

        return true;
    } catch {
        return false;
    }
};

export const formatEntries = ( path: string, Contents: ListObjectsV2CommandOutput[ "Contents" ], entries: FileNode[], filterByType = true ): void => {
    const isSubFolder = path.length > 0 ;
    const level       = isSubFolder ? path.match( /\//gi ).length : 1;

    for ( const entry of Contents ) {
        let key  = entry.Key;
        let name = key;
        let mime = getMimeByFileName( key );
        let type: string;

        if ( isSubFolder && !key.includes( "/" )) {
            continue; // do not list keys without path separators when looking into subfolders
        }

        const sanitizedKey = sanitizePath( key, true );

        if ( sanitizedKey === path ) {
            continue; // do not list self
        }

        let isFile = mime !== undefined;
        let isInDirectory = false;

        // this is a little hackish, AWS S3 and MinIO handle paths differently...
        // keep the keys intact (as these are for Object lookup), but unify
        // the path format used when structuring the file/directory tree
        // (AWS uses leading slashes, MinIO doesn't)

        const pathSeparatorAmount = key.split( "/" ).length - 1;

        if ( !key.startsWith( "/" ) && !isSubFolder ) {
            isInDirectory = key.includes( "/" ) && pathSeparatorAmount >= level;
        } else {
            isInDirectory = pathSeparatorAmount > level;
        }

        if ( filterByType && isInDirectory ) {
            // we only traverse directories at the current level in depth
            name = sanitizedKey.split( "/" )[ level ];

            if ( !isFile ) {
                // if we already have listed the directory, ignore
                // scenario: subfolder of previously harvested directory
                if ( name.length === 0 || entries.find( entry => entry.name === name )) {
                    continue;
                }
            } else {
                // we are looking at a file that is not in the current directory
                // verify whether its path is already listed in the entries list
                // and if not, push it (means directory is discovered), otherwise ignore
                if ( key.replace( path, "" ) === name ) {
                    isFile = false;
                } else if ( !entries.find( entry => entry.name === name )) {
                    isFile = false;
                } else {
                    continue; // file's directory is known, ignore the file
                }
            }
        }

        if ( isFile ) {
            if ( mime === PREVIEW_THUMBNAIL ) {
                continue; // filter generated preview thumbnails out of the list result
            }
            type = mime === PROJECT_FILE_EXTENSION ? PROJECT_FILE_EXTENSION : "file";
            name = name.split( "/" ).at( -1 );
        } else {
            type = "folder";
            key  = `${path}${name}`;
            mime = "";
        }

        entries.push({
            type,
            name,
            mime,
            path,
            key,
            children: [],
            preview: "", // not supported for S3, use getThumbnail() instead
        });
    }
};

export const listFolder = async ( path = "", MaxKeys = 500, filterByType = true ): Promise<FileNode[]> => {
    path = path.length > 0 ? sanitizePath( path, true ) : "";

    const entries: FileNode[] = [];
    const command = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: path,
        Delimiter: path,
        MaxKeys,
    });
    let isTruncated = true;
    let retryHandler: ( err: any ) => Promise<void>;

    const execute = async (): Promise<void> => {
        try {
            while ( isTruncated ) {
                const { Contents, IsTruncated, NextContinuationToken } = await s3client.send( command );

                if ( !Contents ) {
                    break;
                }

                formatEntries( path, Contents, entries, filterByType );

                isTruncated = IsTruncated;
                command.input.ContinuationToken = NextContinuationToken;
            }
        } catch ( err: any ) {
            await retryHandler( err );
        }
    }
    retryHandler = retryableExecution( execute );
    await execute();

    setCurrentFolder( path );

    return entries;
};

export const createFolder = async ( path = "/", folder = "folder" ): Promise<boolean> => {
    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: `${sanitizePath( path )}${sanitizePath( folder, true )}`
    });
    const result = await s3client.send( command );

    return !!result.ETag;
};

export const getCurrentFolder = (): string => currentFolder;

export const setCurrentFolder = ( folder: string ): void => {
    currentFolder = folder;
};

const getThumbnailSize = ( large = false ): number => large ? 128 : 64;

const getPreviewFileName = ( path: string, large = false ): string => {
    return `${path}_${getThumbnailSize( large )}.${PREVIEW_THUMBNAIL}`;
};

export const getThumbnail = async ( path: string, large = false ): Promise<string | null> => {
    const size = getThumbnailSize( large );
    const previewFileName = getPreviewFileName( path, large );

    let blob: Blob | string;

    // first check if thumbnail file already existed
    blob = await downloadFileAsBlob( previewFileName, true );

    if ( blob !== null ) {
        return blob as string;
    }

    if ( !generateThumbnails ) {
        // thumbnails are not for free on S3, these need generation...
        return null;
    }

    // download the full file and generate a thumbnail on the fly
    blob = await downloadFileAsBlob( path, false );

    if ( blob === null ) {
        return null;
    }
    const cvs = await blobToCanvas( blob as Blob );

    const scaled = scaleToRatio( cvs.width, cvs.height, size, size );
    const img = await resizeToBase64( cvs, scaled.width, scaled.height, JPEG.mime, 1 );

    // save thumbnail file to prevent download next time round
    // note we don't wait for the upload to complete and directly return the thumbnail
    blob = await base64toBlob( img );
    uploadBlob( blob, "", previewFileName );

    return img;
};

export const downloadFileAsBlob = async ( fileKey: string, returnAsURL = false ): Promise<Blob | string | null> => {
    try {
        const { Body } = await s3client.send( new GetObjectCommand({
            Key: fileKey,
            Bucket: bucket,
        }))

        const res  = new Response( Body as BodyInit );
        const blob = await res.blob();

        if ( returnAsURL ) {
            return blobToResource( blob );
        }
        return blob;

    } catch ( err: any ) {
        console.error( err );
    }
    return null;
};

export const deleteEntry = async ( fileKeyOrPath: string ): Promise<boolean> => {
    try {
        // folders don't exist in S3, retrieve all objects that have a matching
        // path as prefix and delete them recursively (a folder truly doesn't exist
        // if there's no object with its prefix left)

        let Objects = [{ Key: fileKeyOrPath }, { Key: `${fileKeyOrPath}/` }];

        // also delete the generated preview thumbnails, if existing

        Objects = Objects.concat([
            { Key: getPreviewFileName( fileKeyOrPath, false ) },
            { Key: getPreviewFileName( fileKeyOrPath, true ) }
        ]);

        const matchingObjects = await listFolder( fileKeyOrPath, 500, false );

        if ( matchingObjects.length > 0 ) {
            Objects = matchingObjects.map( node => ({ Key: node.key }));
        }

        const command = new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: { Objects },
        });
        const success = await s3client.send( command );
        return !!success;

    } catch ( err: any ) {
        console.error( err );
    }
    return false;
};

export const uploadBlob = async ( fileOrBlob: File | Blob, folder: string, fileName: string ): Promise<boolean> => {
    const Key = `${sanitizePath( folder, true )}${formatFileName( fileName )}`;
    let uploadId;

    console.info( `uploading Blob of size ${fileOrBlob.size} to S3 storage` );

    try {
        const multipartUpload = await s3client.send(
            new CreateMultipartUploadCommand({
                Bucket: bucket,
                Key,
            })
        );
        uploadId = multipartUpload.UploadId;

        const uploadResults = [];
        const totalChunks   = Math.ceil( fileOrBlob.size / UPLOAD_CHUNK_SIZE );

        for ( let i = 0; i < totalChunks; i++ ) {
            const start = i * UPLOAD_CHUNK_SIZE;
            const end   = start + UPLOAD_CHUNK_SIZE;

            const buffer = await readBufferFromFile( fileOrBlob.slice( start, end ));
            const chunkResult = await s3client.send(
                new UploadPartCommand({
                    Bucket: bucket,
                    Key,
                    UploadId: uploadId,
                    Body: buffer as Uint8Array,
                    PartNumber: i + 1,
                })
            );
            console.info( `Part ${i + 1} of ${totalChunks} uploaded` );

            uploadResults.push( chunkResult );
        }
        const result = await s3client.send( new CompleteMultipartUploadCommand({
            Bucket: bucket,
            Key,
            UploadId: uploadId,
            MultipartUpload: {
                Parts: uploadResults.map(({ ETag }, i ) => ({
                    ETag,
                    PartNumber: i + 1,
                })),
            },
        }));
        return !!result;

    } catch ( err: any ) {
        console.error( err );

        if ( uploadId ) {
            await s3client.send( new AbortMultipartUploadCommand({
                Bucket: bucket,
                Key,
                UploadId: uploadId,
            }));
        }
    }
    return false;
};

/* internal methods */

function sanitizePath( path = "", assertTrailingSlash = false ): string {
    if ( path.length === 0 ) {
        return "";
    }
    path = ( path.charAt( 0 ) !== "/" && path.length > 1 ) ? `/${path}` : path;

    const lastChar = path.charAt( path.length - 1 );

    if ( assertTrailingSlash && lastChar !== "/" ) {
        path += "/";
    } else if ( !assertTrailingSlash && lastChar === "/" ) {
        path = path.substr( 0, path.length - 1 );
    }
    return path;
}

function retryableExecution( executeFn: () => Promise<void>, amountOfRetries = 2 ): ( err: any ) => Promise<void> {
    let retryAmount = 0;
    const handler = async ( err: any ): Promise<void> => {
        /**
         * It has been noted that containers hosted on the same Docker environment can
         * suffer from time drift which can fail the S3 request. By repeating the request
         * after a short timeout, this should sync the S3 clock to the request time of the host.
         */
        if ( err?.Code === "RequestTimeTooSkewed" || err?.message?.includes( "The difference between the request time and the current time is too large" )) {
            if ( ++retryAmount < amountOfRetries ) {
                return new Promise( resolve => {
                    window.setTimeout( async () => {
                        await executeFn();
                        resolve();
                    }, 1000 );
                });
            }
        } else {
            console.error( err );
        }
    };
    return handler;
}
