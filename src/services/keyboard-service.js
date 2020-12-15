/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2020 - https://www.igorski.nl
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
import ModalWindows from '@/definitions/modal-windows';

let store, state, listener,
    suspended = false, blockDefaults = true, optionDown = false, shiftDown = false;

const DEFAULT_BLOCKED = [ 8, 32, 37, 38, 39, 40 ],
      noop            = () => {};

/**
 * KeyboardService is a dedicated controller that listens to keyboard
 * input events, allowing combinations of keypresses to toggle application
 * editing modes across components and states.
 */
const KeyboardService =
{
    init( storeReference ) {
        store = storeReference;
        state = store.state;

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

    switch ( keyCode )
    {
        case 27: // escape

            // close dialog (if existing), else close overlay (if existing)
            if ( state.dialog ) {
                store.commit( "closeDialog" );
            } else if ( state.modal ) {
                store.commit( "closeModal" );
            }
            break;

        case 32: // spacebar
            break;

        // capture the apple key here as it is not recognized as a modifier

        case 224:   // Firefox
        case 17:    // Opera
        case 91:    // WebKit left key
        case 93:    // Webkit right key
            optionDown = true;
            break;

        case 38: // up
            break;

        case 40: // down
            break;

        case 39: // right
            break;

        case 37: // left
            break;

        case 46: // delete
            break;

        case 65: // A
            // select all
            if ( hasOption ) {
                // ...
            }
            break;

        case 67: // C
             // copy current selection
             if ( hasOption ) {
                // ...
             }
             break;

        case 68: // D
            // deselect all
            if ( hasOption ) {
                // ...
            }
            break;

        case 78: // N
            // new document
            if ( hasOption ) {
                preventDefault( event ); // new browser window
                store.commit( "addNewDocument" );
            }
            break;

        case 79: // O
            if ( hasOption ) {
                store.commit( "setOptionsPanelOpened", !store.state.optionsPanelOpened );
                preventDefault( event );
            }
            break;

        case 83: // S
            if ( hasOption ) {
                // ...
                preventDefault( event ); // page save
            }
            break;

        case 84: // T
            if ( hasOption ) {
                store.commit( "setToolboxOpened", !store.state.toolboxOpened );
                preventDefault( event );
            }
            break;

        case 86: // V
            // paste current selection
            if ( hasOption ) {
                // ...
                preventDefault( event ); // override browser paste
            }
            break;

        case 87: // W
            // close document
            if ( hasOption ) {
                store.dispatch( "requestDocumentClose" );
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
            }
            break;

        case 219: // [
            // ...
            break;

        case 221: // ]
            // ...
            break;
    }
}

function handleKeyUp( event ) {
    shiftDown = false;

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
