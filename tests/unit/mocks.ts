import { vi } from "vitest";
import { STORAGE_TYPES } from "@/definitions/storage-types";
import type ZoomableCanvas from "@/rendering/canvas-elements/zoomable-canvas";
import { type BitMapperyState } from "@/store";
import { createCanvasState } from "@/store/modules/canvas-module";
import { createDocumentState } from "@/store/modules/document-module";
import { createHistoryState } from "@/store/modules/history-module";
import { createImageState } from "@/store/modules/image-module";
import { createPreferencesState } from "@/store/modules/preferences-module";
import { createToolState } from "@/store/modules/tool-module";

// zCanvas mocks

export function sprite() {
    this.setDraggable = vi.fn();
    this.setInteractive = vi.fn();
    this.dispose = vi.fn();
}

export function mockZCanvas() {
    vi.mock( "zcanvas", () => ({
        loader: vi.fn(),
        canvas: vi.fn(),
        sprite,
    }));
}

export function createMockZoomableCanvas(): ZoomableCanvas {
    return {
        width: 300,
        height: 200,
        fps: 60,
        addChild: vi.fn(),
        removeChild: vi.fn(),
    } as unknown as ZoomableCanvas;
}

export function createMockImageElement(): HTMLImageElement {
    return {
        src: "foo",
        width: 300,
        height: 200,
    } as unknown as HTMLImageElement;
}

export function createMockCanvasElement(): HTMLCanvasElement {
    return {
        width: 300,
        height: 200,
    } as unknown as HTMLCanvasElement;
}

export function createMockFile( name: string, type = "" ): File {
    const out = new Blob([], { type }) as File;
    // @ts-expect-error name is readonly
    out.name = name;

    return out;
}

export function createState( props?: Partial<BitMapperyState> ): BitMapperyState {
    return {
        menuOpened: false,
        toolboxOpened: false,
        openedPanels: [],
        selectionContent: null,
        blindActive: false,
        panMode: false,
        selectMode: false,
        layerSelectMode: false,
        dialog: null,
        modal: null,
        loadingStates: [],
        notifications: [],
        storageType: STORAGE_TYPES.LOCAL,
        dropboxConnected: false,
        driveConnected: false,
        windowSize: {
            width: 990,
            height: 600,
        },
        canvas: createCanvasState(),
        document: createDocumentState(),
        history: createHistoryState(),
        image: createImageState(),
        preferences: createPreferencesState(),
        tool: createToolState(),
        ...props,
    };
}
