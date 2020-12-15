/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020 - https://www.igorski.nl
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
        // this is a bit daft but does the trick, can we use a different method though?
        await listFolder();
        return true;
    } catch ( error ) {
        return false;
    }
}

export const listFolder = ( path = "" ) => {
    return dbx.filesListFolder({ path });
}

export const downloadFileAsBlob = async path => {
    try {
        const { result } = await dbx.filesDownload({ path });
        return URL.createObjectURL( result.fileBlob );
    } catch {
        return null;
    }
};
