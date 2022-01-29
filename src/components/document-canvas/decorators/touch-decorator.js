import { mapGetters, mapMutations } from "vuex";
import ToolTypes, { MIN_ZOOM, MAX_ZOOM } from "@/definitions/tool-types";
import { getCanvasInstance } from "@/factories/sprite-factory";
import { degreesToRadians } from "@/math/unit-math";
import { cancelableCallback } from "@/utils/debounce-util";

let Contact;

export default {
    computed: {
        ...mapGetters([
            "activeLayerIndex",
            "zoomOptions",
        ]),
    },
    methods: {
        ...mapMutations([
            "updateLayerEffects",
        ]),
        detectTouch() {
            this.usesTouch = false;
            const handler = () => {
                document.body.removeEventListener( "touchstart", handler );
                this.usesTouch = true;
            };
            document.body.addEventListener( "touchstart", handler );
        },
        async addTouchListeners( element ) {
            if ( !this.usesTouch || !element ) {
                return;
            }
            if ( !Contact ) {
                Contact = await import( "contactjs" );
            }
            const zCanvas = getCanvasInstance();

            // when a gesture is started, we should block interactions on the
            // ZoomableCanvas until the gesture ends (for instance to prevent
            // performing paint operations while pinch zooming)

            const interactionRestore = cancelableCallback(() => {
                zCanvas.setInteractive( true );
            });
            const handleGestureStart = () => {
                interactionRestore.cancel();
                zCanvas.setInteractive( false );
            };
            const handleGestureEnd = () => {
                interactionRestore.reset();
            };

            // attach touch listeners

            const listener = new Contact.PointerListener( element, {
                supportedGestures: [ Contact.Pinch, Contact.TwoFingerPan, Contact.Tap ]
            });
console.warn(listener);
            // 1. zoom on pinch

            element.addEventListener( "pinch", event => {
                if ( !this.pinchActive ) {
                    this.pinchActive = true;
                    this.zoomLevel = this.zoomOptions.level;
                //    handleGestureStart();
                }
                const value = Math.max( MIN_ZOOM, Math.min( MAX_ZOOM, this.zoomLevel * event.detail.global.scale ));
                this.setToolOptionValue({ tool: ToolTypes.ZOOM, option: "level", value });
            });
            element.addEventListener( "pinchend", () => {
                this.pinchActive = false;
            //    handleGestureEnd();
            });
            element.style[ "touch-action" ] = "none"; // disable default behaviour

            // 2. pan on twofingerpan

            element.addEventListener( "twofingerpan", () => {
                if ( !this.panOrigin ) {
                //    handleGestureStart();
                    this.panOrigin = { ...zCanvas.getViewport() };
                }
                const { deltaX, deltaY } = event.detail.global;
                getCanvasInstance().panViewport( this.panOrigin.left - deltaX, this.panOrigin.top - deltaY );
            });
            element.addEventListener( "twofingerpanend", () => {
                //handleGestureEnd();
                this.panOrigin = null;
            });

            // 3. restore zoom level on double tap

            let lastTap = 0;
            element.addEventListener( "tap", () => {
                const now = window.performance.now();
                if ( now - lastTap < 300 ) {
                    this.setToolOptionValue({ tool: ToolTypes.ZOOM, option: "level", value: 1 });
                }
                lastTap = now;
            });
        },
        removeTouchListeners() {
            this.hammerTime?.destroy();
            this.hammerTime = null;
        },
        handlePanGesture({ deltaX, deltaY }) {
            getCanvasInstance().panViewport( this.panOrigin.left - deltaX, this.panOrigin.top - deltaY );
        },
        handleZoomGesture( event ) {
            if ( this.panOrigin ) {
                return;
            }
            let increment = 0;
            switch ( event.additionalEvent ) {
                default:
                    return;
                case "pinchout": // moving fingers apart > zoom in
                    increment = event.scale / 2;
                    break;
                case "pinchin": // moving fingers together > zoom out
                    increment = -( event.scale * 2 );
                    break;
            }
            if ( increment === 0 ) {
                return;
            }
            const value = Math.max( MIN_ZOOM, Math.min( MAX_ZOOM, this.zoomOptions.level + increment ));
            this.setToolOptionValue({ tool: ToolTypes.ZOOM, option: "level", value });
        },
        /*
        handleRotateGesture( event ) {
            this.updateLayerEffects({
                index: this.activeLayerIndex,
                effects: { rotation: degreesToRadians( event.angle ) }
            });
        },*/
    }
};
