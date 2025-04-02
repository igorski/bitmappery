import { vi } from "vitest";
import { type Store } from "vuex";
import type { Shape, Selection } from "@/definitions/document";
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
    this._dragStartOffset = { x: 0, y: 0 };
    this._dragStartEventCoordinates = { x: 0, y: 0 };
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
sprite.prototype.handleMove = vi.fn();
sprite.prototype.handlePress = vi.fn(( x, y ) => function() {
    this._dragStartOffset = { x: this._bounds.left, y: this._bounds.top };
    this._dragStartEventCoordinates = { x, y };
})
sprite.prototype.handleRelease = vi.fn();

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
        getActiveDocument: vi.fn(),
        getStore: vi.fn(),
        getViewport: vi.fn(() => ({ left: 0, top: 0, width: 300, height: 300 })),
        refreshFn: vi.fn(),
        rescaleFn: vi.fn(),
        setDimensions: vi.fn(),
        setLock: vi.fn(),
        store: createStore(),
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
        arc: vi.fn(),
        beginPath: vi.fn(),
        clearRect: vi.fn(),
        clip: vi.fn(),
        closePath: vi.fn(),
        drawImage: vi.fn(),
        fill: vi.fn(),
        fillRect: vi.fn(),
        rect: vi.fn(),
        rotate: vi.fn(),
        save: vi.fn(),
        stroke: vi.fn(),
        translate: vi.fn(),
        restore: vi.fn(),
        canvas: {
            width: 300,
            height: 200,
        },
    } as unknown as CanvasRenderingContext2D;
}

export function createMockCanvasElement( width = 300, height = 200 ): HTMLCanvasElement {
    const ctx = createMockCanvasRenderingContext2D();
    const cvs = {
        width,
        height,
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

export function createStore(): Store<BitMapperyState> {
    return {
        state: createState(),
        getters: {},
        mutations: {},
        actions: {},
        commit: vi.fn(),
        dispatch: vi.fn(),
    }  as unknown as Store<BitMapperyState>;
}

export function createMockShape(): Shape {
    return [ { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 0 }];
}

export function createMockSelection(): Selection {
    return [ createMockShape() ];
}
