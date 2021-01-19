/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2021 - https://www.igorski.nl
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

const UPLOAD_FILE_SIZE_LIMIT = 150 * 1024 * 1024;

let accessToken;
let dbx;

/**
 * Authentication step 1: for interacting with Dropbox : request access token
 * by opening an authentication page
 */
export const requestLogin = ( clientId, loginUrl ) => {
    dbx = new Dropbox({ clientId });
    return dbx.auth.getAuthenticationUrl( loginUrl );
}

/**
 * Authentication step 2: user has received access token, register it in the
 * service and in Session storage so we can instantly authenticate on reload
 */
export const registerAccessToken = token => {
    accessToken = token;
    sessionStorage?.setItem( "dropboxToken", token );
    dbx = new Dropbox({ accessToken });
};

export const isAuthenticated = async () => {
    dbx = new Dropbox({ accessToken: accessToken ?? sessionStorage?.getItem( "dropboxToken" ) });
    try {
        const { result } = await dbx.checkUser({ query: "echo" });
        return result?.result === "echo";
    } catch ( error ) {
        return false;
    }
};

export const listFolder = async ( path = "" ) => {
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
    return entries;
};

export const getThumbnail = async ( path, large = false ) => {
    try {
        const { result } = await dbx.filesGetThumbnail({
            path,
            format: "jpeg",
            size: large ? "w128h128" : "w64h64"
        });
        return URL.createObjectURL( result.fileBlob );
    } catch {
        return null;
    }
};

export const downloadFileAsBlob = async ( path, returnAsURL = false ) => {
    try {
        const { result } = await dbx.filesDownload({ path });
        if ( returnAsURL ) {
            return URL.createObjectURL( result.fileBlob );
        }
        return result.fileBlob;
    } catch {
        return null;
    }
};

export const uploadBlob = async ( fileOrBlob, fileName ) => {
    const path = `/bitmappery/${fileName.split( " " ).join ( "_" )}`;
    if ( fileOrBlob.size < UPLOAD_FILE_SIZE_LIMIT ) {
        // File is smaller than 150 Mb - use filesUpload API
        try {
            const { result } = await dbx.filesUpload({ path, contents: fileOrBlob, mode: "overwrite" });
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
                    }).then( response => response.session_id )
                });
            } else if ( idx < items.length - 1 ) {
                // Append part to the upload session
                return acc.then( sessionId => {
                    const cursor = { session_id: sessionId, offset: idx * maxBlob };
                    return dbx.filesUploadSessionAppendV2({
                        cursor: cursor, close: false, contents: blob
                    }).then(() => sessionId );
                });
            } else {
                // Last chunk of data, close session
                return acc.then( sessionId => {
                    const cursor = { session_id: sessionId, offset: fileOrBlob.size - blob.size };
                    const commit = { path: '/' + fileOrBlob.name, mode: 'add', autorename: true, mute: false };
                    return dbx.filesUploadSessionFinish({ cursor: cursor, commit: commit, contents: blob });
                });
            }
        }, Promise.resolve());
    }
};
