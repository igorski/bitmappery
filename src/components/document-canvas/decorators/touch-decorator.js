import { mapGetters, mapMutations } from "vuex";
import ToolTypes, { MIN_ZOOM, MAX_ZOOM } from "@/definitions/tool-types";
import { getCanvasInstance } from "@/factories/sprite-factory";
import { degreesToRadians } from "@/math/unit-math";
import { cancelableCallback } from "@/utils/debounce-util";

let Hammer;

export default {
    computed: {
        ...mapGetters([
            "activeLayerIndex",
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
            if ( !Hammer ) {
                Hammer = await import( "hammerjs" );
            }
            const zCanvas = getCanvasInstance();

            const pan   = new Hammer.Pan({ pointers: 2, direction: Hammer.DIRECTION_ALL });
            const tap   = new Hammer.Tap({ taps: 2 });
            const pinch = new Hammer.Pinch({ pointers: 2 });

            this.hammerTime = new Hammer.Manager( element );
            this.hammerTime.add([ pan, tap, pinch ]);

            pinch.recognizeWith( pan );

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

            // pan gesture

            this.hammerTime.on( "pan", this.handlePanGesture.bind( this ));
            this.hammerTime.on( "panstart", event => {
                this.panOrigin = { ...zCanvas.getViewport() };
                handleGestureStart();
            });
            this.hammerTime.on( "panend", event => {
                this.panOrigin = null;
                handleGestureEnd();
            });

            // pinch gesture (zoom)

            this.hammerTime.on( "pinch",      this.handleZoomGesture.bind( this ));
            this.hammerTime.on( "pinchstart", handleGestureStart );
            this.hammerTime.on( "pinchend",   handleGestureEnd );

            this.hammerTime.on( "tap", () => {
                this.setToolOptionValue({ tool: ToolTypes.ZOOM, option: "level", value: 1 });
            });

            // rotation gesture

            this.hammerTime.on( "rotate", this.handleRotateGesture.bind( this ));
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
                    increment = event.scale;
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
        handleRotateGesture( event ) {
            this.updateLayerEffects({
                index: this.activeLayerIndex,
                effects: { rotation: degreesToRadians( event.angle ) }
            });
        },
    }
};
