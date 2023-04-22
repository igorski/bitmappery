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
import { createWriteStream } from "fs";
import { PROJECT_FILE_EXTENSION, getMimeByFileName } from "@/definitions/file-types";
import type { FileNode } from "@/definitions/storage-types";
import { readBufferFromFile } from "@/utils/file-util";
import { blobToResource } from "@/utils/resource-manager";
import { formatFileName } from "@/utils/string-util";

const UPLOAD_CHUNK_SIZE = 5 * 1024 * 1024; // min accepted size is 5 Mb

let s3client: S3Client;
let bucket: string;
let currentFolder = "";
let initialized = false;

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
        s3client = new S3Client({
        //    endpoint: import.meta.env.VITE_S3_ENDPOINT,
            // @ts-expect-error 'import.meta' property not allowed (not an issue, Vite takes care of it)
            region: import.meta.env.VITE_S3_REGION,
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

export const listFolder = async ( path = "", MaxKeys = 500, filterByType = true ): Promise<FileNode[]> => {
    path = path.length > 0 ? sanitizePath( path, true ) : "";
    const isSubFolder = path.length > 0 ;
    const level = isSubFolder ? path.match( /\//gi ).length : 1;

    const entries: FileNode[] = [];

    try {
        const command = new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: path,
            Delimiter: path,
            MaxKeys,
        });
        let isTruncated = true;
        let type: string;

        while ( isTruncated ) {
            const { Contents, IsTruncated, NextContinuationToken } = await s3client.send( command );

            if ( !Contents ) {
                break;
            }

            for ( const entry of Contents ) {
                let key  = entry.Key;
                let name = key;
                let mime = "";

                const isInDirectory = name.charAt( 0 ) === "/";
                let isFile = name.charAt( name.length - 1 ) !== "/";

                if ( filterByType && isInDirectory ) {
                    // we only traverse directories at the current level in depth
                    name = name.split( "/" )[ level ];

                    if ( !isFile ) {
                        // if we already have listed the directory, ignore
                        // scenario: subfolder of previously harvested directory
                        if ( name.length === 0 || entries.find( entry => entry.name === name )) {
                            continue;
                        }
                    } else {
                        if ( key.replace( path, "" ) === name ) {
                            // entry is a file in a not yet harvested subdirectory,
                            isFile = false;
                        } else if ( !entries.find( entry => entry.name === name )) {
                            isFile = false;
                        } else {
                            // file's directory is known, ignore the file
                            continue;
                        }
                    }

                    if ( !isFile ) {
                        type = "folder";
                        key  = `${path}${name}`;
                    }
                }

                if ( isFile ) {
                    mime = getMimeByFileName( name );
                    type = mime === PROJECT_FILE_EXTENSION ? PROJECT_FILE_EXTENSION : "file";
                }
                entries.push({
                    type,
                    name,
                    mime,
                    path,
                    key,
                    children: [],
                    preview: "", // not supported for S3
                });
            }
            isTruncated = IsTruncated;
            command.input.ContinuationToken = NextContinuationToken;
        }
    } catch ( err: any ) {
        console.error( err );
    }
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

// @ts-expect-error unused variables
export const getThumbnail = async ( path: string, large = false ): Promise<string | null> => {
    // thumbnails are not for free on S3, these need generation...
    return null;
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

        let Objects = [{ Key: fileKeyOrPath }];

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
            console.info( "Part", i + 1, "uploaded" );

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
