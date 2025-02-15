import { it, describe, expect } from "vitest";
import { mockZCanvas } from "../mocks";
import type { ListObjectsV2CommandOutput } from "@aws-sdk/client-s3";
import { JPEG } from "@/definitions/image-types";
import { PROJECT_FILE_EXTENSION } from "@/definitions/file-types";
import { type FileNode } from "@/definitions/storage-types";
import { formatEntries } from "@/services/aws-s3-service";

mockZCanvas();

describe( "AWS S3 service", () => {
    const Owner = {
        ID: "foo",
        DisplayName: "bar"
    };
    const StorageClass = "STANDARD";

    describe( "when formatting the entries for keys using a leading path slash (e.g. AWS S3)", () => {
        const Contents = [{
            Key: "Koala.bpy",
            LastModified: new Date( "2023-07-02T07:33:53.285Z" ),
            ETag: "a343a825346f55ea0aaa46400f61726c-1",
            Size: 1832856,
            StorageClass,
            Owner,
        }, {
            Key: "/foo/Panda.bpy",
            LastModified: new Date("2023-07-02T07:34:43.775Z" ),
            ETag: "b5ab72a6040546a0063eba4bf1d1252f-",
            Size: 438932,
            StorageClass,
            Owner,
        }, {
            Key: "/foo/Gerbil.jpg",
            LastModified: new Date( "2023-07-02T07:34:43.775Z" ),
            ETag: "b5ab72a6040546a0063eba4bf1d1252f-",
            Size: 438932,
            StorageClass,
            Owner,
        }] as ListObjectsV2CommandOutput[ "Contents" ];

        it( "should be able to recognise subdirectories, list these and ignore the files within", () => {
            const path = "";
            const entries: FileNode[] = [];

            formatEntries( path, Contents, entries );

            expect( entries ).toEqual([{
                children: [],
                key: "Koala.bpy",
                mime: PROJECT_FILE_EXTENSION,
                name: "Koala.bpy",
                path,
                preview: "",
                type: PROJECT_FILE_EXTENSION,
            }, {
                children: [],
                key: "foo",
                mime: "",
                name: "foo",
                path: "",
                preview: "",
                type: "folder"
            }]);
        });

        it( "should only list the files inside subdirectories, when a path is provided, providing the correct MIME types", () => {
            const path = "/foo/";
            const entries: FileNode[] = [];

            formatEntries( path, Contents, entries );

            expect( entries ).toEqual([{
                children: [],
                key: "/foo/Panda.bpy",
                mime: PROJECT_FILE_EXTENSION,
                name: "Panda.bpy",
                path,
                preview: "",
                type: PROJECT_FILE_EXTENSION,
            }, {
                children: [],
                key: "/foo/Gerbil.jpg",
                mime: JPEG.mime,
                name: "Gerbil.jpg",
                path,
                preview: "",
                type: "file"
            }]);
        });
    });

    describe( "when formatting the entries for keys without a leading path slash (e.g. MinIO)", () => {
        const Contents = [{
            Key: "Koala.bpy",
            LastModified: new Date( "2023-07-02T07:33:53.285Z" ),
            ETag: "a343a825346f55ea0aaa46400f61726c-1",
            Size: 1832856,
            StorageClass,
            Owner,
        }, {
            Key: "foo/Gerbil.jpg",
            LastModified: new Date( "2023-07-02T07:34:43.775Z" ),
            ETag: "b5ab72a6040546a0063eba4bf1d1252f-",
            Size: 438932,
            StorageClass,
            Owner,
        }] as ListObjectsV2CommandOutput[ "Contents" ];

        it( "should be able to recognise subdirectories, list these and ignore the files within", () => {
            const path = "";
            const entries: FileNode[] = [];

            formatEntries( path, Contents, entries );

            expect( entries ).toEqual([{
                children: [],
                key: "Koala.bpy",
                mime: PROJECT_FILE_EXTENSION,
                name: "Koala.bpy",
                path,
                preview: "",
                type: PROJECT_FILE_EXTENSION,
            }, {
                children: [],
                key: "foo",
                mime: "",
                name: "foo",
                path,
                preview: "",
                type: "folder",
            }]);
        });

        it( "should only list the files inside subdirectories, when a path is provided, providing the correct MIME types", () => {
            const path = "foo/";
            const entries: FileNode[] = [];

            formatEntries( path, Contents, entries );

            expect( entries ).toEqual([{
                children: [],
                key: "foo/Gerbil.jpg",
                mime: JPEG.mime,
                name: "Gerbil.jpg",
                path,
                preview: "",
                type: "file",
            }]);
        });
    });
});
