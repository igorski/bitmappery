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
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { createWriteStream } from "fs";
import { PROJECT_FILE_EXTENSION, getMimeByFileName } from "@/definitions/file-types";
import type { FileNode } from "@/definitions/storage-types";
import { blobToResource } from "@/utils/resource-manager";

const UPLOAD_FILE_SIZE_LIMIT = 150 * 1024 * 1024;
const DOWNLOAD_CHUNK_SIZE    = 1024 * 1024;

let s3client: S3Client;
let bucket: string;
let currentFolder = "";

/**
 * Authentication step 1: request access token
 */
export const initS3 = async (
    accessKeyId: string, secretAccessKey: string, bucketName: string,
    // @ts-expect-error endpoint currently unused (TODO)
    region?: string, endpoint?: string ): Promise<boolean> => {

    bucket = bucketName;

    try {
        s3client = new S3Client({
        //    endpoint,
            region,
            credentials: {
                accessKeyId,
                secretAccessKey
            },
        });
        return true;
    } catch {
        return false;
    }
};

export const listFolder = async ( path = "", MaxKeys = 500 ): Promise<FileNode[]> => {
    console.info( "TODO allow support for " + path );

    const command = new ListObjectsV2Command({
        Bucket: bucket,
        MaxKeys,
    });

    const output = [];

    try {
        let isTruncated = true;
        while ( isTruncated ) {
            const { Contents, IsTruncated, NextContinuationToken } = await s3client.send( command );
            for ( const entry of Contents ) {
                const mime = getMimeByFileName( entry.Key );
                output.push({
                    name: entry.Key,
                    type: mime === PROJECT_FILE_EXTENSION ? PROJECT_FILE_EXTENSION : "file",
                    mime,
                    path,
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
    return output;
};

export const createFolder = async ( path = "/", folder = "folder" ): Promise<boolean> => {
    console.info( "TODO implement creation of folder " + folder + " at path " + path );
    return false;
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

export const downloadFileAsBlob = async ( path: string, returnAsURL = false ): Promise<Blob | string | null> => {
    try {
        const { Body } = await s3client.send( new GetObjectCommand({
            Key: path,
            Bucket: bucket,
        }))

        const res = new Response( Body as BodyInit );
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

export const deleteEntry = async ( path: string ): Promise<boolean> => {
    console.info( "todo delete " + path );
    return false;
};

export const uploadBlob = async ( fileOrBlob: File | Blob, folder: string, fileName: string ): Promise<boolean> => {
    // use multipart!
    // https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_s3_code_examples.html
    console.info( "todo upload " + fileOrBlob + " to " + folder + " with name " + fileName );
    return false;
};

/* internal methods */

function sanitizePath( path = "" ): string {
    path = path.charAt( path.length - 1 ) === "/" ? path.substr( 0, path.length - 1 ) : path;
    return ( path.charAt( 0 ) !== "/" && path.length > 1 ) ? `/${path}` : path;
}
