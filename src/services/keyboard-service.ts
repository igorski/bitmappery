/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2023 - https://www.igorski.nl
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
import type { Store, Commit, Dispatch } from "vuex";
import type { Shape } from "@/definitions/document";
import { LayerTypes } from "@/definitions/layer-types";
import { ALL_PANELS } from "@/definitions/panel-types";
import ToolTypes, { MAX_BRUSH_SIZE, MIN_ZOOM, MAX_ZOOM, canDraw } from "@/definitions/tool-types";
import {
    CREATE_DOCUMENT, ADD_LAYER, SAVE_DOCUMENT, DROPBOX_FILE_SELECTOR,
} from "@/definitions/modal-windows";
import { toggleLayerVisibility } from "@/factories/action-factory";
import { getCanvasInstance, getSpriteForLayer } from "@/factories/sprite-factory";
import { translatePoints } from "@/math/point-math";
import type { BitMapperyState } from "@/store";
import { supportsFullscreen, toggleFullscreen } from "@/utils/environment-util";
import { addTextLayer } from "@/utils/layer-util";

type ListenerRef = ( type: "up" | "down", keyCode: number, event: KeyboardEvent ) => void;

let store: Store<BitMapperyState>;
let state: BitMapperyState;
let getters: any;
let commit: Commit;
let dispatch: Dispatch;
let listener: ListenerRef;
let suspended = false, blockDefaults = true, optionDown = false, shiftDown = false;
let lastKeyDown = 0;
let lastKeyCode = -1;

const DEFAULT_BLOCKED    = [ 8, 32, 37, 38, 39, 40 ];
const MOVABLE_TOOL_TYPES = [ ToolTypes.DRAG, ToolTypes.SELECTION, ToolTypes.LASSO, ToolTypes.WAND ];
const BRUSH_TOOL_TYPES   = [ ToolTypes.BRUSH, ToolTypes.ERASER, ToolTypes.CLONE ];

const defaultBlock = ( e: KeyboardEvent ): void => e.preventDefault();

/**
 * KeyboardService is a dedicated controller that listens to keyboard
 * input events, allowing combinations of keypresses to toggle application
 * editing modes across components and states.
 */
const KeyboardService =
{
    init( storeReference: Store<BitMapperyState> ): void {
        store = storeReference;
        ({ state, getters, commit, dispatch } = storeReference );

        // these handlers remain active for the entire application lifetime

        window.addEventListener( "keydown", handleKeyDown );
        window.addEventListener( "keyup",   handleKeyUp );
        window.addEventListener( "focus",   handleFocus );
    },
    /**
     * whether the Apple option or a control key is
     * currently held down for the given event
     */
    hasOption( aEvent: KeyboardEvent ): boolean {
        return ( optionDown === true ) || aEvent.metaKey || aEvent.ctrlKey;
    },
    /**
     * whether the shift key is currently held down
     */
    hasShift(): boolean {
        return ( shiftDown === true );
    },
    /**
     * attach a listener to receive updates whenever a key
     * has been released. listenerRef is a function (usually inside a Vue component)
     * which receives three arguments:
     *
     * @param {ListenerRef} listenerRef
     */
    setListener( listenerRef: ListenerRef ): void {
        listener = listenerRef;
    },
    /**
     * the KeyboardService can be suspended so it
     * will not fire its callback to the listeners
     */
     getSuspended(): boolean {
         return suspended;
     },
     setSuspended( value: boolean ): void {
         suspended = value;
     },
    /**
     * whether to block default behaviour on certain keys
     */
    setBlockDefaults( value: boolean ): void {
        blockDefaults = value;
    },
    reset(): void {
        KeyboardService.setListener( null );
        KeyboardService.setSuspended( false );
        KeyboardService.setBlockDefaults( true );
    },
};
export default KeyboardService;

/* internal methods */

function handleKeyDown( event: KeyboardEvent ): void {
    if ( suspended ) {
        return;
    }
    const keyCode = event.keyCode; // the current step position and channel within the pattern
    shiftDown     = !!event.shiftKey;

    // prevent defaults when using the arrows, space (prevents page jumps) and backspace (navigate back in history)

    if ( blockDefaults && DEFAULT_BLOCKED.includes( keyCode )) {
        preventDefault( event );
    }
    if ( typeof listener === "function" ) {
        listener( "down", keyCode, event );

        if ( keyCode !== 90 ) {
            return; // unless "Z" is pressed (for undo/redo actions, skip remaining handling functions)
        }
    }
    const hasOption = KeyboardService.hasOption( event );
    const now       = Date.now();

    //if ( !hasOption && !shiftDown )
    //    handleInputForMode( keyCode );

    switch ( keyCode )
    {
        case 8: // backspace
            if ( getters.activeDocument?.selection?.length && getters.activeLayer ) {
                dispatch( "deleteInSelection" );
            }
            break;

        case 9: // tab
            commit( "setToolboxOpened", !state.toolboxOpened );
            if ( state.openedPanels.length > 0 ) {
                commit( "closeOpenedPanels" );
            } else {
                ALL_PANELS.forEach( panel => commit( "setOpenedPanel", panel ));
            }
            event.preventDefault();
            break;

        case 17: // Ctrl
            optionDown = true;
            commit( "setLayerSelectMode", true );
            // prevent context menu from opening in this mode
            document.addEventListener( "contextmenu", defaultBlock );
            break;

        case 27: // escape

            // close dialog (if existing), else close overlay (if existing)
            if ( state.dialog ) {
                commit( "closeDialog" );
            } else if ( state.modal ) {
                commit( "closeModal" );
            }
            break;

        case 32: // spacebar
            commit( "setPanMode", true );
            break;

        // capture the apple key here as it is not recognized as a modifier

        case 224:   // Firefox
        case 91:    // WebKit left key
        case 93:    // Webkit right key
            optionDown = true;
            break;

        case 38: // up
            if ( MOVABLE_TOOL_TYPES.includes( getters.activeTool )) {
                moveObject( 1, 0, getters.activeTool );
            }
            break;

        case 40: // down
            if ( MOVABLE_TOOL_TYPES.includes( getters.activeTool )) {
                moveObject( 1, 1, getters.activeTool )
            }
            break;

        case 39: // right
            if ( MOVABLE_TOOL_TYPES.includes( getters.activeTool )) {
                moveObject( 0, 1, getters.activeTool );
            }
            break;

        case 37: // left
            if ( MOVABLE_TOOL_TYPES.includes( getters.activeTool )) {
                moveObject( 0, 0, getters.activeTool );
            }
            break;

        case 46: // delete
            break;

        case 48:
        case 49:
        case 50:
        case 51:
        case 52:
        case 53:
        case 54:
        case 55:
        case 56:
        case 57:
            // numeric 1 to 0, used for percentile range control for...
            const num = String.fromCharCode( keyCode );
            // ...brush opacity
            if ( BRUSH_TOOL_TYPES.includes( getters.activeTool )) {
                // if this number was typed shortly after the previous one, combine their values for decimal precision
                const value = ( now - lastKeyDown < 500 ) ? String.fromCharCode( lastKeyCode ) + num : num + "0";
                commit( "setToolOptionValue",
                    { tool: getters.activeTool, option: "opacity", value: parseFloat( value ) / 100 }
                );
            }
            break;

        case 65: // A
            // select all
            if ( hasOption && getters.activeLayer ) {
                getCanvasInstance()?.interactionPane.selectAll( getters.activeLayer );
            }
            break;

        case 66: // B
            if ( canDraw( getters.activeDocument, getters.activeLayer )) {
                setActiveTool( ToolTypes.BRUSH );
            }
            break;

        case 67: // C
            // copy current selection
            if ( hasOption ) {
                if ( getters.activeDocument?.selection?.length > 0 ) {
                    dispatch( "requestSelectionCopy", shiftDown );
                    preventDefault( event );
                }
            } else {
                // @ts-expect-error Property 'pickrInstance' does not exist on type 'Window & typeof globalThis'
                window.pickrInstance?.show();
            }
            break;

        case 68: // D
            // deselect all
            if ( hasOption ) {
                dispatch( "clearSelection" );
                preventDefault( event ); // bookmark
            } else if ( getters.activeLayer ) {
                setActiveTool( ToolTypes.SCALE );
            }
            break;

        case 69: // E
            if ( hasOption ) {
                openModal( SAVE_DOCUMENT );
            } else if ( canDraw( getters.activeDocument, getters.activeLayer )) {
                setActiveTool( ToolTypes.ERASER );
            }
            break;

        case 70: // F
            if ( shiftDown ) {
                if ( supportsFullscreen() ) {
                    toggleFullscreen();
                }
            }
            else if ( getters.activeLayer ) {
                if ( optionDown ) {
                    const filters = getters.activeLayer.filters;
                    commit( "updateLayer", {
                        index: getters.activeLayerIndex,
                        opts: { filters: { ...filters, enabled: !filters.enabled} }
                    });
                } else {
                    setActiveTool( ToolTypes.MIRROR );
                }
            }
            break;

        case 71: // G
            if ( canDraw( getters.activeDocument, getters.activeLayer )) {
                setActiveTool( ToolTypes.FILL );
            }
            break;

        case 73: // I
            if ( hasOption ) {
                if ( shiftDown ) { // invert selection
                    if ( getters.activeDocument.selection ) {
                        dispatch( "invertSelection" );
                        preventDefault( event ); // import Mail
                    }
                } else { // load document
                    dispatch( "loadDocument" );
                }
            } else if ( getters.activeLayer ) {
                setActiveTool( ToolTypes.EYEDROPPER );
            }
            break;

        case 76: // L
            if ( hasOption ) {
                if ( shiftDown && getters.activeDocument ) {
                    openModal( ADD_LAYER );
                } else {
                    toggleLayerVisibility( store, getters.activeLayerIndex );
                }
            } else {
                commit( "setActiveTool", { tool: ToolTypes.LASSO })
                setActiveTool( ToolTypes.LASSO );
            }
            break;

        case 77: // M
            if ( getters.activeDocument ) {
                setActiveTool( ToolTypes.SELECTION );
            }
            break;

        case 78: // N
            // new document
            if ( hasOption ) {
                preventDefault( event ); // new browser window
                openModal( CREATE_DOCUMENT );
            }
            break;

        case 79: // O
            if ( hasOption ) {
                if ( state.dropboxConnected ) {
                    openModal( DROPBOX_FILE_SELECTOR );
                }
                preventDefault( event );
            }
            break;

        case 80: // P
            if ( getters.activeDocument ) {
                setActiveTool( ToolTypes.MOVE );
            }
            break;

        case 82: // R
            setActiveTool( ToolTypes.ROTATE );
            break;

        case 83: // S
            if ( hasOption ) {
                if ( getters.activeDocument ) {
                    openModal( SAVE_DOCUMENT );
                }
                preventDefault( event ); // page save
            } else if ( canDraw( getters.activeDocument, getters.activeLayer )) {
                setActiveTool( ToolTypes.CLONE );
            }
            break;

        case 84: // T
            if ( getters.activeDocument ) {
                if ( getters.activeLayer?.type !== LayerTypes.LAYER_TEXT ) {
                    addTextLayer( store );
                }
                setActiveTool( ToolTypes.TEXT );
                preventDefault( event );
            }
            break;

        case 86: // V
            // paste current selection
            if ( hasOption ) {
                if ( state.selectionContent ) {
                    dispatch( "pasteSelection" );
                    preventDefault( event ); // override browser paste
                }
            } else if ( getters.activeDocument ) {
                setActiveTool( ToolTypes.DRAG );
            }
            break;

        case 87: // W
            // close document
            if ( hasOption ) {
                dispatch( "requestDocumentClose" );
                preventDefault( event );
            } else {
                setActiveTool( ToolTypes.WAND );
            }
            break;

        case 88: // X
            // cut current selection
            if ( hasOption ) {
                if ( getters.activeDocument?.selection?.length ) {
                    dispatch( "requestSelectionCut" );
                    preventDefault( event ); // override browser cut
                }
            }
            break;

        case 90: // Z
            // undo
            if ( hasOption ) {
                dispatch( shiftDown ? "redo" : "undo" );
                preventDefault( event ); // override browser undo
            } else if ( getters.activeDocument ) {
                // zoom
                setActiveTool( ToolTypes.ZOOM );
            }
            break;

        case 107:
        case 187: // +
            commit( "setToolOptionValue",
                { tool: ToolTypes.ZOOM, option: "level", value: Math.min( MAX_ZOOM, getters.zoomOptions.level + ( MAX_ZOOM / 10 ))
            });
            break;

        case 109:
        case 189: // -
            commit( "setToolOptionValue",
                { tool: ToolTypes.ZOOM, option: "level", value: Math.max( MIN_ZOOM, getters.zoomOptions.level - ( MAX_ZOOM / 10 ))
            });
            break;

        case 219: // [
            if ( BRUSH_TOOL_TYPES.includes( getters.activeTool )) {
                commit( "setToolOptionValue", {
                    tool: getters.activeTool, option: "size", value: Math.max( 1, getters.activeToolOptions.size - 5 )
                });
                getCanvasInstance()?.invalidate();
            }
            break;

        case 221: // ]
            if ( BRUSH_TOOL_TYPES.includes( getters.activeTool )) {
                commit( "setToolOptionValue", {
                    tool: getters.activeTool, option: "size", value: Math.min( MAX_BRUSH_SIZE, getters.activeToolOptions.size + 5 )
                });
                getCanvasInstance()?.invalidate();
            }
            break;
    }
    lastKeyCode = keyCode;
    lastKeyDown = now;
}

function handleKeyUp( event: KeyboardEvent ): void {
    shiftDown = false;

    switch ( event.keyCode ) {
        default:
            break;
        case 17: // Ctrl
            commit( "setLayerSelectMode", false );
            document.removeEventListener( "contextmenu", defaultBlock );
            break;
        case 32: // spacebar
            if ( getters.activeTool !== ToolTypes.TEXT && getters.activeTool !== ToolTypes.MOVE ) {
                commit( "setPanMode", false );
            }
            break;
    }

    if ( optionDown ) {
        switch ( event.keyCode ) {
            // Apple key
            case 224:   // Firefox
            case 17:    // Opera (also Ctrl key)
            case 91:    // WebKit left key
            case 93:    // Webkit right key
                optionDown = false;
                break;
        }
    }

    if ( !suspended ) {
        if ( typeof listener === "function" ) {
            listener( "up", event.keyCode, event );
        }
    }
}

function handleFocus(): void {
    // when switching browser tabs it is possible these values were left active
    shiftDown = optionDown = false;
}

function preventDefault( event: KeyboardEvent ): void {
    event.stopPropagation();
    event.preventDefault();
}

function setActiveTool( tool: ToolTypes ): void {
    commit( "setActiveTool", { tool, document: getters.activeDocument });
}

function openModal( modal: number ): void {
    commit( "openModal", modal );
}

/**
 * @param {number} axis to move (0 == horizontal, 1 == vertical)
 * @param {number} dir to move (0 == up/left, 1 == down/right)
 */
function moveObject( axis = 0, dir = 0, activeTool: ToolTypes ): void {
    const speed = shiftDown ? 10 : 1;
    switch ( activeTool ) {
        case ToolTypes.DRAG:
            const sprite = getSpriteForLayer( getters.activeLayer );
            if ( !sprite ) {
                return;
            }
            let x = sprite.getX();
            let y = sprite.getY();
            if ( axis === 0 ) {
                x = dir === 0 ? x - speed : x + speed;
            } else {
                y = dir === 0 ? y - speed : y + speed;
            }
            sprite.setBounds( x, y );
            break;
        case ToolTypes.SELECTION:
        case ToolTypes.LASSO:
        case ToolTypes.WAND:
            getCanvasInstance()?.interactionPane.setSelection(
                getters.activeDocument.selection.map(( selection: Shape ) => translatePoints(
                    selection,
                    axis === 0 ? dir === 0 ? -speed : speed : 0,
                    axis === 1 ? dir === 0 ? -speed : speed : 0
                ), true
            ));
            break;
    }
}
