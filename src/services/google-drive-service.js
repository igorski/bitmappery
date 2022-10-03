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

/**
 * Full write access is nice, but is considered to be a sensitive to restricted
 * scope for production, which requires an audit when restricted.
 * For localhost testing or in sandbox mode, this works fine.
 * The scoped write access provides the same functions, as long as the files
 * were created by BitMappery (other contents remain hidden)
 */
const FULL_WRITE_ACCESS   = "https://www.googleapis.com/auth/drive";
const SCOPED_WRITE_ACCESS = "https://www.googleapis.com/auth/drive.file";

const DRIVE_API      = "https://apis.google.com/js/api.js";
const IDENTITY_API   = "https://accounts.google.com/gsi/client";
const ACCESS_SCOPES  = SCOPED_WRITE_ACCESS;
const DISCOVERY_DOCS = [ "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest" ];

const MIME_FOLDER = "application/vnd.google-apps.folder";

// see https://developers.google.com/drive/api/v2/reference/files/update
const UPLOAD_API      = "/upload/drive/v3/files"; // note we use v3 endpoint
const BOUNDARY        = "-------314159265358979323846";
const DELIMITER       = `\r\n--${BOUNDARY}\r\n`;
const DELIMITER_CLOSE = `\r\n--${BOUNDARY}--`;

export const ROOT_FOLDER   = "root";
export const DEFAULT_SPACE = "drive";

let accessToken = null;
let gapi = null;
let client = null;
let currentFolder = ROOT_FOLDER;

export const init = async ( apiKey, clientId ) => {
    if ( gapi !== null ) {
        return true;
    }
    return new Promise( async ( resolve ) => {
        try {
            await loadScript( IDENTITY_API );
            if ( !window.google ) {
                throw new Error( "could not load Google Identity Services API" );
            }
            // 1. init Google Identity Services
            client = window.google.accounts.oauth2.initTokenClient({
                client_id :  clientId,
                scope     : ACCESS_SCOPES,
                callback  : ({ access_token }) => registerAccessToken( access_token ),
            });
            // 2. init Google Drive API
            await loadScript( DRIVE_API );
            if ( !window.gapi ) {
                throw new Error( "could not load Google Drive API" );
            }
            gapi = window.gapi;

            gapi.load( "client", async () => {
                await gapi.client.init({
                    apiKey,
                    discoveryDocs : DISCOVERY_DOCS,
                });
                resolve( true );
            });
        } catch {
            resolve( false );
        }
    });
};

export const isAuthenticated = () => !!accessToken;

/**
 * Authentication step 1: for interacting with Drive : request access token
 * by opening an authentication page
 */
export const requestLogin = () => {
    client.requestAccessToken();
};

/**
 * Authentication step 2: user has received access token
 */
export const registerAccessToken = token => {
    accessToken = token;
};

export const getAccessToken = () => accessToken;

export const requestLogout = () => {
    if ( accessToken === null ) {
        return;
    }
    window.google.accounts.oauth2.revoke( accessToken );
    accessToken = null;
};

export const validateScopes = grantedScopes => ACCESS_SCOPES.split( "," ).every( scope => grantedScopes.includes( scope ));

export const disconnect = () => requestLogout;

/**
 * @param {string} path to search for. This is "root" to search from the
 * Google Drive root folder, or is a string identifier
 */
export const listFolder = async ( path = ROOT_FOLDER ) => {
    let entries = [];
    let result;
    let nextPageToken = null;

    do {
        // https://developers.google.com/drive/api/v3/search-files
        ({ result } = await gapi.client.drive.files.list({
            q         : `"${path}" in parents and trashed = false`,
            pageSize  : 500,
            fields    : "nextPageToken, files(id, name, mimeType, thumbnailLink, iconLink, webContentLink)",
            spaces    : DEFAULT_SPACE,
            pageToken : nextPageToken,
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
        const { result } = await gapi.client.drive.files.create({
            resource: {
                name       : folder,
                parents    : [ parent ],
                "mimeType" : MIME_FOLDER
            },
            fields: "id"
        });
        return result.id;
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

/**
 * Traverses the folder specified by given fileId back up the
 * tree until the root is reached.
 */
export const getFolderHierarchy = async fileId => {
    const rootFolderDef = { id: ROOT_FOLDER, name: "My Drive" };

    if ( fileId === ROOT_FOLDER && ACCESS_SCOPES === SCOPED_WRITE_ACCESS ) {
        return [ rootFolderDef ];
    }
    const folders = [];
    let result;

    ({ result } = await gapi.client.drive.files.get({
        fileId,
        fields : "id, name, mimeType, parents"
    }));

    if ( !result?.mimeType === MIME_FOLDER ) {
        return folders;
    }
    folders.push( result );

    do {
        const id = result.parents?.[ 0 ];
        if ( !id ) {
            break;
        }
        try {
            ({ result } = await gapi.client.drive.files.get({
                fileId : id,
                fields : "id, name, mimeType, parents"
            }));
        } catch {
            // likely access restriction (e.g. reached root folder under drive.file scope)
            result.parents = [];
            if ( ACCESS_SCOPES === SCOPED_WRITE_ACCESS ) {
                folders.push( rootFolderDef );
            }
            break;
        }
        if ( !result?.id ) {
            break;
        }
        folders.push( result );

    } while ( result && result.name !== ROOT_FOLDER );

    return folders.reverse();
};

export const uploadBlob = async ( fileOrBlob, folder, fileName ) => {
    const reader = new FileReader();

    // first verify if file exists, so we can make an update request instead

    const { result } = await gapi.client.drive.files.list({
        q         : `name = "${fileName}" and "${folder}" in parents and trashed = false`,
        fields    : "files(id, name, mimeType)",
        spaces    : DEFAULT_SPACE,
        pageToken : null,
    });
    const existingId = result.files[ 0 ]?.id || null;

    return new Promise(( resolve, reject ) => {
        reader.onload = () => {
            const contentType = fileOrBlob.type || "application/octet-stream";
            const metadata = {
                name     : fileName,
                mimeType : fileOrBlob.type.split( ";" )[ 0 ],
            };

            if ( !existingId ) {
                metadata.parents = [ folder ];
            }

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
                path    : existingId ? `${UPLOAD_API}/${existingId}` : UPLOAD_API,
                method  : existingId ? "PATCH" : "POST",
                params  : { uploadType: "multipart" },
                headers : {
                    "Content-Type" : `multipart/mixed; boundary="${BOUNDARY}"`
                },
                body : multipartRequestBody
            });

            request.execute( async file => {
                if ( !file?.id ) {
                    return reject();
                }
                resolve( true );
            });
        };
        reader.readAsBinaryString( fileOrBlob );
    });
};
