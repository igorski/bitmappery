import { mapGetters, mapMutations } from "vuex";
import ToolTypes, { MIN_ZOOM, MAX_ZOOM } from "@/definitions/tool-types";
import { getCanvasInstance } from "@/factories/sprite-factory";
import { degreesToRadians, scale } from "@/math/unit-math";
import { cancelableCallback } from "@/utils/debounce-util";
import { fitInWindow } from "@/utils/zoom-util";

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
            }, 150 );

            const handleGestureStart = () => {
                interactionRestore.cancel();
                zCanvas.setInteractive( false );
            };
            const handleGestureEnd = () => {
                interactionRestore.reset();
            };

            // attach touch listeners

            const twoFingerPan = new Contact.TwoFingerPan( element);
            const pinch        = new Contact.Pinch( element );

            twoFingerPan.block( pinch );
            //pinch.block( twoFingerPan );

            this.listener = new Contact.PointerListener( element, {
                supportedGestures: [ twoFingerPan, pinch, Contact.Tap ]
            });

            // 1. zoom on pinch

            element.addEventListener( "pinch", event => {
                if ( !this.pinchActive ) {
                    this.pinchActive = true;
                    this.zoomLevelOnPinch = this.zoomOptions.level;
                    handleGestureStart();
                }
                if (!window.d) {
                    const d = document.createElement("div");
                    document.body.appendChild(d);
                    d.style.position = "absolute";
                    d.style.color = "red";
                    d.style.backgroundColor = "rgba(0,0,0,.75)";
                    d.style.top = "60px";
                    d.style.left = "0px";
                    d.style.width="100%";
                    d.style.height="150px";
                    window.d = d;
                }
/*
                const value = Math.max(
                    MIN_ZOOM,
                    Math.min( MAX_ZOOM, this.zoomLevelOnPinch * event.detail.global.scale )
                );
                */
                const value = event.detail.global.scale > 1 ? scale( event.detail.global.scale, 10, MAX_ZOOM ) : scale( event.detail.global.scale, -10, MIN_ZOOM );
                window.d.innerHTML = "scale:"+event.detail.global.scale + ", value:" + value;

                this.setToolOptionValue({ tool: ToolTypes.ZOOM, option: "level", value });
            });
            element.addEventListener( "pinchend", () => {
                this.pinchActive = false;
                handleGestureEnd();
            });
            element.style[ "touch-action" ] = "none"; // disable default behaviour

            // 2. pan on twofingerpan

            element.addEventListener( "twofingerpan", () => {
                if ( !this.panOrigin ) {
                    handleGestureStart();
                    this.panOrigin = { ...zCanvas.getViewport() };
                }
                const { deltaX, deltaY } = event.detail.global;
                getCanvasInstance().panViewport( this.panOrigin.left - deltaX, this.panOrigin.top - deltaY );
            });
            element.addEventListener( "twofingerpanend", () => {
                handleGestureEnd();
                this.panOrigin = null;
            });

            // 3. restore zoom level on double tap

            let lastTap = 0;
            element.addEventListener( "tap", () => {
                const now = window.performance.now();
                handleGestureStart();
                if ( now - lastTap < 300 ) {
                    this.setToolOptionValue({
                        tool   : ToolTypes.ZOOM,
                        option : "level",
                        value  : fitInWindow( this.activeDocument, this.canvasDimensions )
                    });
                    handleGestureEnd();
                }
                lastTap = now;
            });
        },
        removeTouchListeners() {
            this.listener?.destroy();
            this.listener = null;
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
