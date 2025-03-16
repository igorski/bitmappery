import { vi } from "vitest";
import { type Store } from "vuex";
import { STORAGE_TYPES } from "@/definitions/storage-types";
import type ZoomableCanvas from "@/rendering/actors/zoomable-canvas";
import { type BitMapperyState } from "@/store";
import { createCanvasState } from "@/store/modules/canvas-module";
import { createDocumentState } from "@/store/modules/document-module";
import { createHistoryState } from "@/store/modules/history-module";
import { createImageState } from "@/store/modules/image-module";
import { createPreferencesState } from "@/store/modules/preferences-module";
import { createToolState } from "@/store/modules/tool-module";

// zCanvas mocks
// @todo should not be necessary when updating to zCanvas 6+

export function sprite() {
    this._bounds      = { left: 0, top: 0, width: 10, height: 10 };
    this._interactive = false;
    this.getBounds = vi.fn().mockReturnValue( this._bounds );
    this.setBounds = vi.fn(( x, y, w, h ) => {
        this._bounds.left   = x;
        this._bounds.top    = y;
        this._bounds.width  = w;
        this._bounds.height = h;
    });
    this.setDraggable = vi.fn();
    this.getInteractive = vi.fn(() => this._interactive );
    this.setInteractive = vi.fn( value => this._interactive = value );
    this.getX = vi.fn();
    this.setX = vi.fn();
    this.getY = vi.fn();
    this.setY = vi.fn();
    this.invalidate = vi.fn();
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
        getViewport: vi.fn(() => ({ left: 0, top: 0, width: 300, height: 300 })),
        setLock: vi.fn(),
        store: createState() as unknown as Store<BitMapperyState>,
    } as unknown as ZoomableCanvas;
}

export function createMockImageElement(): HTMLImageElement {
    return {
        src: "foo",
        width: 300,
        height: 200,
    } as unknown as HTMLImageElement;
}

function createMockCanvasRenderingContext2D() {
    return {
        clearRect: vi.fn(),
        fill: vi.fn(),
        fillRect: vi.fn(),
        drawImage: vi.fn(),
        canvas: {
            width: 300,
            height: 200,
        },
    } as unknown as CanvasRenderingContext2D;
}

export function createMockCanvasElement(): HTMLCanvasElement {
    const ctx = createMockCanvasRenderingContext2D();
    const cvs = {
        width: 300,
        height: 200,
        getContext: () => ctx,
    } as unknown as HTMLCanvasElement;

    // @ts-expect-error cannot assign to read only property
    ctx.canvas = cvs;

    return cvs;
}

export function mockCanvasConstructor(): void {
    vi.spyOn( document, "createElement" ).mockImplementation( type => {
        if ( type === "canvas" ) {
            return createMockCanvasElement() as HTMLElement;
        }
    });
}

/**
 * Execute calls debounced by requestAnimationFrame() to use timeouts, which allows
 * us to throttle these with vi.useFakeTimers();
 * 
 * Run each RAF callback by invoking vi.runAllTimers();
 * Don't forget to use vi.useRealTimers() and vi.restoreAllMocks() to clean up.
 */
export function mockRequestAnimationFrame( now = window.performance.now(), fps = 60 ) {
    vi.spyOn( window, "cancelAnimationFrame" ).mockImplementation( rafId => {
        clearTimeout( rafId );
    });

    vi.spyOn( window, "requestAnimationFrame" ).mockImplementation( cb => {
        const interval = 1000 / fps;
        const id = setTimeout(() => {
            now += interval;
            cb( now );
        }, interval );
        return id as unknown as number;
    });
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
