/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2022-2023 - https://www.igorski.nl
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
let dropbox: any;
let drive: any;
let s3: any;

// Dropbox

export const supportsDropbox = (): boolean => {
    // @ts-expect-error import.meta unsupported for current module option (no issue, Vite will replace)
    return !!import.meta.env.VITE_DROPBOX_API_KEY;
};

export const getDropboxService = async (): Promise<any> => {
    if ( !dropbox ) {
        dropbox = await import( /* webpackChunkName: "dropbox-service" */ "@/services/dropbox-service" );
    }
    return dropbox;
};

// Google Drive

export const supportsGoogleDrive = (): boolean => {
    // @ts-expect-error import.meta unsupported for current module option (no issue, Vite will replace)
    return !!import.meta.env.VITE_DRIVE_API_KEY;
};

export const getGoogleDriveService = async (): Promise<any> => {
    if ( !drive ) {
        drive = await import( /* webpackChunkName: "google-drive-service" */ "@/services/google-drive-service" );
    }
    return drive;
};

// AWS S3

export const supportsS3 = (): boolean => {
    // @ts-expect-error import.meta unsupported for current module option (no issue, Vite will replace)
    return !!import.meta.env.VITE_S3_ACCESS_KEY;
};

export const getS3Service = async (): Promise<any> => {
    if ( !s3 ) {
        s3 = await import( /* webpackChunkName: "aws-s3-service" */ "@/services/aws-s3-service" );
    }
    return s3;
};
