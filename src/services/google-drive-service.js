/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2022 - https://www.igorski.nl
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
import loadScript from "tiny-script-loader/loadScriptPromised";
import { base64toBlob } from "@/utils/file-util";
import { blobToResource } from "@/utils/resource-manager";

const GOOGLE_API     = "https://apis.google.com/js/api.js";
const ACCESS_SCOPES  = "https://www.googleapis.com/auth/drive"; // drive.file
const DISCOVERY_DOCS = [ "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest" ];

const MIME_FOLDER = "application/vnd.google-apps.folder";

// see https://developers.google.com/drive/api/v2/reference/files/update
const BOUNDARY        = "-------314159265358979323846";
const DELIMITER       = `\r\n--${BOUNDARY}\r\n`;
const DELIMITER_CLOSE = `\r\n--${BOUNDARY}--`;

export const ROOT_FOLDER = "root";

let isSignedIn = false;
let accessToken = null;
let gapi = null;
let currentFolder = ROOT_FOLDER;

export const init = async ( apiKey, clientId, redirectURI ) => {
    if ( gapi !== null ) {
        return true;
    }
    return new Promise( async ( resolve ) => {
        try {
            await loadScript( GOOGLE_API );
            if ( !window.gapi ) {
                throw new Error( "could not load Google API" );
            }
            gapi = window.gapi;
            gapi.load( "client:auth2", async () => {
                const data = await gapi.client.init({
                    apiKey,
                    clientId,
                    redirect_uri  : redirectURI,
                    ux_mode       : "popup", // alternative is "redirect"
                    scope         : ACCESS_SCOPES,
                    discoveryDocs : DISCOVERY_DOCS
                });
                gapi.auth2.getAuthInstance().isSignedIn.listen( handleSignInStatus );
                handleSignInStatus( gapi.auth2.getAuthInstance().isSignedIn.get() );

                resolve( true );
            });
        } catch {
            resolve( false );
        }
    });
};

export const isAuthenticated = () => isSignedIn;

/**
 * Authentication step 1: for interacting with Drive : request access token
 * by opening an authentication page
 */
export const requestLogin = () => {
    gapi.auth2.getAuthInstance().signIn();
};

/**
 * Authentication step 2: user has received access token
 */
export const registerAccessToken = token => {
    accessToken = token;
};

export const getAccessToken = () => accessToken;

export const requestLogout = () => {
    gapi.auth2.getAuthInstance().signOut();
};

/**
 * @param {string} path to search for. This is "root" to search from the
 * Google Drive root folder, or is a string identifier
 */
export const listFolder = async ( path = ROOT_FOLDER ) => {
    let entries = [];
    let result;
    let nextPageToken = null;

    do {
        ({ result } = await gapi.client.drive.files.list({
            q: `"${path}" in parents and trashed = false`,
            pageSize: 500,
            fields: "nextPageToken, files(id, name, mimeType, thumbnailLink, iconLink, webContentLink)",
            spaces: "drive",
            pageToken: nextPageToken,
        }));
        ({ nextPageToken } = result );

        if ( result.files.length === 0 ) {
            break;
        }
        result.files.forEach( file => {
            entries.push({
                id      : file.id,
                name    : file.name,
                type    : file.mimeType === MIME_FOLDER ? "folder" : "file",
                // using file.thumbnailLink leads to 403...
                preview : `https://lh3.google.com/u/0/d/${file.id}=w128-h128`, // file.thumbnailLink
                url     : file.webContentLink,
                mime    : file.mimeType,
                path
            });
        });
        break;
    } while ( nextPageToken );

    setCurrentFolder( path );
    return entries;
};

export const createFolder = async ( parent = ROOT_FOLDER, folder = "folder" ) => {
    try {
        const data = await gapi.client.drive.files.create({
            resource: {
                name       : folder,
                parents    : [ parent ],
                "mimeType" : MIME_FOLDER
            },
            fields: "id"
        });
        return true;
    } catch {
        return false;
    }
};

export const getCurrentFolder = () => currentFolder;

export const setCurrentFolder = folder => currentFolder = folder;

export const deleteEntry = async fileId => {
    try {
        // note we don't use the delete endpoint as it omits the trash
        // and permanently deletes the file, instantly.
        const { result } = await gapi.client.drive.files.update({ fileId, trashed: true });
        return !!result;
    } catch {
        return false;
    }
};

export const downloadFileAsBlob = async ( file, returnAsURL = false ) => {
    try {
        const result = await gapi.client.drive.files.get({ fileId: file.id, alt: "media" });
        const blob   = await base64toBlob( `data:${file.mime};base64,${btoa( result.body )}` );

        if ( returnAsURL ) {
            return blobToResource( blob );
        }
        return blob;
    } catch {
        return null;
    }
};

export const uploadBlob = ( fileOrBlob, folder, fileName ) => {
    const reader = new FileReader();

    // TODO verify if file exists, if so, call update endpoint ?

    return new Promise(( resolve, reject ) => {
        reader.onload = () => {
            const contentType = fileOrBlob.type || "application/octet-stream";
            const metadata = {
                name     : fileName,
                mimeType : fileOrBlob.type.split( ";" )[ 0 ],
                parents  : [ folder ],
            };

            const base64Data = btoa( reader.result );
            const multipartRequestBody =
                DELIMITER +
                "Content-Type: application/json\r\n\r\n" +
                JSON.stringify( metadata ) +
                DELIMITER +
                "Content-Type: " + contentType + "\r\n" +
                "Content-Transfer-Encoding: base64\r\n" +
                "\r\n" +
                base64Data +
                DELIMITER_CLOSE;

            const request = gapi.client.request({
                path    : "/upload/drive/v3/files",
                method  : "POST",
                params  : { uploadType: "multipart" },
                headers : {
                    "Content-Type" : `multipart/mixed; boundary="${BOUNDARY}"`
                },
                body : multipartRequestBody
            });

            request.execute( file => {
                if ( file?.id ) {
                    resolve( true );
                } else {
                    reject();
                }
            });
        };
        reader.readAsBinaryString( fileOrBlob );
    });
};

/* internal methods */

function handleSignInStatus( signedIn = false ) {
    isSignedIn = signedIn;

    if ( signedIn ) {
        registerAccessToken( gapi.client.getToken()?.access_token || accessToken );
    }
}
