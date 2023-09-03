/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2023 - https://www.igorski.nl
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
import { Dropbox } from "dropbox";
import type { files } from "dropbox"; // note: Dropbox types are known not to reflect the actual API correctly!
import { blobToResource } from "@/utils/resource-manager";
import { formatFileName } from "@/utils/string-util";

const UPLOAD_FILE_SIZE_LIMIT = 150 * 1024 * 1024;

let accessToken: string;
let dbx: Dropbox;
let currentFolder = "";

/**
 * Authentication step 1: for interacting with Dropbox : request access token
 * by opening an authentication page
 */
export const requestLogin = async (): Promise<string> => {
    // @ts-expect-error 'import.meta' property not allowed (not an issue, Vite takes care of it)
    dbx = new Dropbox({ clientId: import.meta.env.VITE_DROPBOX_API_KEY });
    // @ts-expect-error 'auth' is not recognized on Dropbox class, but it's definitely an instance of DropboxAuth!
    return dbx.auth.getAuthenticationUrl( import.meta.env.VITE_DROPBOX_REDIRECT_URL || `${window.location.href}login.html` );
};

/**
 * Authentication step 2: user has received access token, register it in the
 * service and in Session storage so we can instantly authenticate on reload
 */
export const registerAccessToken = ( token: string ): void => {
    accessToken = token;
    sessionStorage?.setItem( "dropboxToken", token );
    dbx = new Dropbox({ accessToken });
};

export const isAuthenticated = async (): Promise<boolean> => {
    dbx = new Dropbox({ accessToken: accessToken ?? sessionStorage?.getItem( "dropboxToken" ) });
    try {
        const { result } = await dbx.checkUser({ query: "echo" });
        return result?.result === "echo";
    } catch ( error ) {
        return false;
    }
};

export const listFolder = async ( path = "" ): Promise<files.ListFolderResult> => {
    let entries = [];
    let result;
    ({ result } = await dbx.filesListFolder({
        path,
        include_media_info: true,
        include_deleted: false
    }));
    entries = [ ...result.entries ];

    while ( result?.has_more ) {
        ({ result } = await dbx.filesListFolderContinue({ cursor: result.cursor }));
        entries.push( ...result.entries );
    }
    setCurrentFolder( path );

    return entries as unknown as files.ListFolderResult;
};

export const createFolder = async ( path = "/", folder = "folder" ): Promise<boolean> => {
    try {
        await dbx.filesCreateFolderV2({
            path: `${sanitizePath( path )}/${folder}`
        });
        return true;
    } catch {
        return false;
    }
};

export const getCurrentFolder = (): string => currentFolder;

export const setCurrentFolder = ( folder: string ): void => {
    currentFolder = folder;
};

export const getThumbnail = async ( path: string, large = false ): Promise<string | null> => {
    try {
        const { result } = await dbx.filesGetThumbnail({
            path,
            format: ( "jpeg" as unknown as files.ThumbnailFormat ),
            size: ( large ? "w128h128" : "w64h64" ) as unknown as files.ThumbnailSize
        });
        // @ts-expect-error Property 'fileBlob' does not exist on type 'FileMetadata'. (but is added by Dropbox JS SDK)
        return blobToResource( result.fileBlob );
    } catch {
        return null;
    }
};

export const downloadFileAsBlob = async ( path: string, returnAsURL = false ): Promise<Blob | string | null> => {
    try {
        const { result } = await dbx.filesDownload({ path });
        // @ts-expect-error Property 'fileBlob' does not exist on type 'FileMetadata'. (but is added by Dropbox JS SDK)
        const { fileBlob }: { fileBlob: Blob } = result;
        if ( returnAsURL ) {
            return blobToResource( fileBlob );
        }
        return fileBlob;
    } catch {
        return null;
    }
};

export const deleteEntry = async ( path: string ): Promise<boolean> => {
    try {
        const { result } = await dbx.filesDelete({ path });
        return !!result;
    } catch {
        return false;
    }
};

export const uploadBlob = async ( fileOrBlob: File | Blob, folder: string, fileName: string ): Promise<boolean> => {
    const path = `${sanitizePath( folder )}/${formatFileName( fileName )}`;
    if ( fileOrBlob.size < UPLOAD_FILE_SIZE_LIMIT ) {
        // File is smaller than 150 Mb - use filesUpload API
        try {
            const { result } = await dbx.filesUpload({ path, contents: fileOrBlob, mode: "overwrite" as unknown as files.WriteMode });
            return !!result.name;
        } catch ( error ) {
            console.error( error );
            return false;
        }
    } else {
        // File is bigger than 150 Mb - use filesUploadSession* API
        const maxBlob   = 8 * 1000 * 1000; // 8Mb - Dropbox JavaScript API suggested max file / chunk size
        const workItems = [];
        let offset = 0;
        while ( offset < fileOrBlob.size ) {
            const chunkSize = Math.min( maxBlob, fileOrBlob.size - offset );
            workItems.push( fileOrBlob.slice( offset, offset + chunkSize ));
            offset += chunkSize;
        }

        return workItems.reduce(( acc, blob, idx, items ) => {
            if ( idx == 0 ) {
                // Starting multipart upload of file
                return acc.then(() => {
                    return dbx.filesUploadSessionStart({
                        close: false, contents: blob
                    }).then( response => {
                        // @ts-expect-error  Property 'session_id' does not exist on type 'DropboxResponse<UploadSessionStartResult>'.
                        return response.session_id;
                    })
                });
            } else if ( idx < items.length - 1 ) {
                // Append part to the upload session
                return acc.then( sessionId => {
                    const cursor = { session_id: sessionId, offset: idx * maxBlob } as unknown as files.UploadSessionCursor;
                    return dbx.filesUploadSessionAppendV2({
                        cursor: cursor, close: false, contents: blob
                    }).then(() => sessionId );
                });
            } else {
                // Last chunk of data, close session
                return acc.then( sessionId => {
                    const cursor = { session_id: sessionId, offset: fileOrBlob.size - blob.size };
                    const commit = { path: '/' + fileName, mode: "add", autorename: true, mute: false };
                    // @ts-expect-error not assignable to type 'UploadSessionCursor'.
                    return dbx.filesUploadSessionFinish({ cursor: cursor, commit: commit, contents: blob });
                });
            }
        }, Promise.resolve());
    }
};

/* internal methods */

function sanitizePath( path = "" ): string {
    path = path.charAt( path.length - 1 ) === "/" ? path.substr( 0, path.length - 1 ) : path;
    return ( path.charAt( 0 ) !== "/" && path.length > 1 ) ? `/${path}` : path;
}
