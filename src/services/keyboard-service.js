/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2021 - https://www.igorski.nl
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
import { LAYER_TEXT } from "@/definitions/layer-types";
import ToolTypes, { MAX_BRUSH_SIZE, MIN_ZOOM, MAX_ZOOM, canDraw } from "@/definitions/tool-types";
import {
    ADD_LAYER, EXPORT_DOCUMENT, DROPBOX_FILE_SELECTOR, SAVE_DROPBOX_DOCUMENT
} from "@/definitions/modal-windows";
import { getCanvasInstance, getSpriteForLayer } from "@/factories/sprite-factory";
import { translatePoints } from "@/utils/image-math";

let state, getters, commit, dispatch, listener,
    suspended = false, blockDefaults = true, optionDown = false, shiftDown = false;

const DEFAULT_BLOCKED    = [ 8, 32, 37, 38, 39, 40 ];
const MOVABLE_TOOL_TYPES = [ ToolTypes.DRAG, ToolTypes.SELECTION, ToolTypes.LASSO ];
const noop = () => {};

/**
 * KeyboardService is a dedicated controller that listens to keyboard
 * input events, allowing combinations of keypresses to toggle application
 * editing modes across components and states.
 */
const KeyboardService =
{
    init( storeReference ) {
        ({ state, getters, commit, dispatch } = storeReference );

        // these handlers remain active for the entire application lifetime

        window.addEventListener( "keydown", handleKeyDown );
        window.addEventListener( "keyup",   handleKeyUp );
        window.addEventListener( "focus",   handleFocus );
    },
    /**
     * whether the Apple option or a control key is
     * currently held down for the given event
     *
     * @param {Event} aEvent
     * @returns {boolean}
     */
    hasOption( aEvent ) {
        return ( optionDown === true ) || aEvent.metaKey || aEvent.ctrlKey;
    },
    /**
     * whether the shift key is currently held down
     *
     * @returns {boolean}
     */
    hasShift() {
        return ( shiftDown === true );
    },
    /**
     * attach a listener to receive updates whenever a key
     * has been released. listenerRef is a function
     * which receives three arguments:
     *
     * {string} type, either "up" or "down"
     * {number} keyCode, the keys keyCode
     * {Event} event, the keyboard event
     *
     * the listener is usually a Vue component
     *
     * @param {Object|Function} listenerRef
     */
    setListener( listenerRef ) {
        listener = listenerRef;
    },
    /**
     * the KeyboardService can be suspended so it
     * will not fire its callback to the listeners
     *
     * @param {boolean} value
     */
    setSuspended( value ) {
        suspended = value;
    },
    /**
     * whether to block default behaviour on certain keys
     *
     * @param {boolean} value
     */
    setBlockDefaults( value ) {
        blockDefaults = value;
    },
    reset() {
        KeyboardService.setListener( null );
        KeyboardService.setSuspended( false );
        KeyboardService.setBlockDefaults( true );
    },
};
export default KeyboardService;

/* internal methods */

function handleKeyDown( event ) {
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
        return;
    }
    const hasOption = KeyboardService.hasOption( event );

    //if ( !hasOption && !shiftDown )
    //    handleInputForMode( keyCode );

    let currentValue;

    switch ( keyCode )
    {
        case 9: // tab
            commit( "setToolboxOpened",      !state.toolboxOpened );
            commit( "setOptionsPanelOpened", !state.optionsPanelOpened );
            event.preventDefault();
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
            commit( "setDragMode", true );
            break;

        // capture the apple key here as it is not recognized as a modifier

        case 224:   // Firefox
        case 17:    // Opera
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

        case 65: // A
            // select all
            if ( hasOption && getters.activeLayer ) {
                getSpriteForLayer( getters.activeLayer )?.selectAll();
            }
            break;

        case 66: // B
            if ( canDraw( getters.activeDocument, getters.activeLayer )) {
                setActiveTool( ToolTypes.BRUSH );
            }
            break;

        case 67: // C
             // copy current selection
             if ( hasOption && getters.activeLayer?.selection?.length > 0 ) {
                 dispatch( "requestSelectionCopy" );
                 preventDefault( event );
             }
             break;

        case 68: // D
            // deselect all
            if ( hasOption ) {
                dispatch( "clearSelection" );
                preventDefault( event ); // bookmark
            }
            break;

        case 69: // E
            if ( hasOption ) {
                openModal( EXPORT_DOCUMENT );
            } else if ( canDraw( getters.activeDocument, getters.activeLayer )) {
                setActiveTool( ToolTypes.ERASER );
            }
            break;

        case 70: // F
            if ( getters.activeLayer ) {
                setActiveTool( ToolTypes.MIRROR );
            }
            break;

        case 73: // I
            if ( hasOption ) {
                dispatch( "loadDocument" );
            } else if ( getters.activeLayer ) {
                setActiveTool( ToolTypes.EYEDROPPER );
            }
            break;

        case 76: // L
            if ( hasOption && shiftDown ) {
                openModal( ADD_LAYER );
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
                dispatch( "requestNewDocument" );
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
                if ( getters.activeDocument && state.dropboxConnected ) {
                    openModal( SAVE_DROPBOX_DOCUMENT );
                }
                preventDefault( event ); // page save
            }
            break;

        case 84: // T
            if ( getters.activeDocument ) {
                if ( getters.activeLayer?.type !== LAYER_TEXT ) {
                    commit( "addLayer", { type: LAYER_TEXT });
                }
                setActiveTool( ToolTypes.TEXT );
                preventDefault( event );
            }
            break;

        case 86: // V
            // paste current selection
            if ( hasOption && !!state.selectionContent ) {
                dispatch( "pasteSelection" );
                preventDefault( event ); // override browser paste
            } else if ( getters.activeDocument ) {
                setActiveTool( ToolTypes.DRAG );
            }
            break;

        case 87: // W
            // close document
            if ( hasOption ) {
                dispatch( "requestDocumentClose" );
                preventDefault( event );
            }
            break;

        case 88: // X
            // cut current selection
            if ( hasOption ) {
                // ...
                preventDefault( event ); // override browser cut
            }
            break;

        case 90: // Z
            // undo
            if ( hasOption ) {
                // ...
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
            currentValue = getters.activeTool === ToolTypes.ERASER ? getters.eraserOptions : getters.brushOptions;
            commit( "setToolOptionValue",
                { tool: getters.activeTool, option: "size", value: Math.max( 1, currentValue.size - 5 )
            });
            getCanvasInstance()?.invalidate();
            break;

        case 221: // ]
            currentValue = getters.activeTool === ToolTypes.ERASER ? getters.eraserOptions : getters.brushOptions;
            commit( "setToolOptionValue", {
                tool: getters.activeTool, option: "size", value: Math.min( MAX_BRUSH_SIZE, currentValue.size + 5 )
            });
            getCanvasInstance()?.invalidate();
            break;
    }
}

function handleKeyUp( event ) {
    shiftDown = false;

    if ( event.keyCode === 32 ) { // spacebar
        commit( "setDragMode", false );
    }

    if ( optionDown ) {
        switch ( event.keyCode ) {
            // Apple key
            case 224:   // Firefox
            case 17:    // Opera
            case 91:    // WebKit left key
            case 93:    // Webkit right key
                optionDown = false;
                break;
        }
    }

    if ( !suspended ) {
        if ( typeof listener === "function" ) {
            listener( "up", aEvent.keyCode, aEvent );
        }
    }
}

function handleFocus() {
    // when switching browser tabs it is possible these values were left active
    shiftDown = optionDown = false;
}

function preventDefault( event ) {
    event.stopPropagation();
    event.preventDefault();
}

function setActiveTool( tool ) {
    commit( "setActiveTool", { tool, activeLayer: getters.activeLayer });
}

function openModal( modal ) {
    commit( "openModal", modal );
}

/**
 * @param {number} axis to move (0 == horizontal, 1 == vertical)
 * @param {number} dir to move (0 == up/left, 1 == down/right)
 */
function moveObject( axis = 0, dir = 0, activeTool ) {
    const sprite = getSpriteForLayer( getters.activeLayer );
    if ( !sprite ) {
        return;
    }
    const speed = shiftDown ? 10 : 1;
    switch ( activeTool ) {
        case ToolTypes.DRAG:
            let x = sprite.getX();
            let y = sprite.getY();
            if ( axis === 0 ) {
                x = dir === 0 ? x - speed : x + speed;
            } else {
                y = dir === 0 ? y - speed : y + speed;
            }
            sprite.syncedPositioning( x, y );
            break;
        case ToolTypes.SELECTION:
        case ToolTypes.LASSO:
            sprite.setSelection(
                translatePoints(
                    getters.activeLayer.selection,
                    axis === 0 ? dir === 0 ? -speed : speed : 0,
                    axis === 1 ? dir === 0 ? -speed : speed : 0
                )
            );
            break;
    }
}
