# BitMappery

## So you are rebuilding Photoshop in the browser ?

No, I'm building a tool that does the bare minimum what I require and what I don't
find in other open source tools. That doesn't mean of course that contributions
related to Photoshop-esque features aren't welcomed.

### All hand-written ?

Yep, though it helps having worked in the photo software industry for five years, having
tackled the problems before. Also, BitMappery is reusing [zCanvas](https://github.com/igorski/zCanvas)
under the hood for rendering and bitmap blitting. BitMappery is written on top of [Vue](https://github.com/vuejs/vue) using [Vuex](https://github.com/vuejs/vuex) and [VueI18n](https://github.com/kazupon/vue-i18n).

## The [Issue Tracker](https://github.com/igorski/bitmappery/issues) is your point of contact

Bug reports, feature requests, questions and discussions are welcome on the GitHub Issue Tracker, please do not send e-mails through the development website. However, please search before posting to avoid duplicates, and limit to one issue per post.

Please vote on feature requests by using the Thumbs Up/Down reaction on the first post.

## Model

BitMappery works with entities known as _Documents_. A Document contains several _Layers_, each of
which define their content, transformation, _Effects_, etc. Each of the nested entity properties
has its own factory (see _/src/factories/_). The Document is managed by the Vuex _document-module.js_.

The types for each of these are defined in `/src/definitions/document.ts`.

## Document rendering and interactions

The Document is rendered one layer at a time onto a Canvas element, using [zCanvas](https://github.com/igorski/zCanvas). Both the rendering and interaction handling is performed by dedicated "Sprite" classes.

All layer rendering and layer interactions are handled by _/src/rendering/canvas-elements/layer_sprite.js_.
Note that the purpose of the renderer is solely to delegate interactions events to the Layer entity. The
renderer should represent the properties of the Layer, the Layer should never reverse-engineer from the onscreen
content (especially as different window size and scaling factor will greatly complicate these matters when
performed two-way).

All interactions that work across layers (viewport panning, layer selection by clicking on non-transparent
pixels and drawing of selections) is handled by a single top level sprite that covers the entire zCanvas area.
This sprite is _/src/rendering/canvas-elements/interaction-pane.js_.

Interactions that start/end from _outside the canvas_ (for instance the opening/closing of a selection or the
drawing of a brush stroke outside of the canvas area) are handled by _document-canvas.vue_ where the global DOM coordinates are translated to coordinates relative to the canvas document before being forwarded to the zCanvas
event handler. See "Rendering concepts" below for more details on screen-to-document coordinates.

Rendering of transformations, text and effects is an asynchronous operation handled by _/src/services/render-service.js_. The purpose of this service is to perform and cache repeated operations and eventually maintain
the source bitmap represented by the LayerSprite. The LayerSprite invokes the rendering service whenever
Layer content changes and manages its own cache.

All types related to the editor are either defined in `src/definitions/editor.ts` or the more specifically
named files.

### Rendering concepts

BitMappery follows the concepts of the display list as listed in the zCanvas wiki, where BitMappery's
document layers are visualized as separate Sprites which can be manipulated as separate interactive on-screen
elements. BitMappery additionally adds additional logic related to the viewing of large scale content in smaller fragments.

The zCanvas' DOM element (an _HTMLCanvasElement_ instance) is basically as large as the available area inside the
DOM window allows. The BitMappery document displayed inside may however be larger or smaller than the canvas itself
(depending on the _zoom level_ which is - not yet - standardized in the zCanvas package and custom written for BitMappery using the `ZoomableCanvas` and `ZoomableSprite` classes).

What determines the visible area of the zoomed document is the _viewport_. As such, interactions with the zCanvas
element must be _translated_ from global DOM coordinates to a point relative to the BitMappery document, taking
into account the current scaling factor and viewport offset. This is handled automatically by all event handlers
delegated through zCanvas and the sprites, but needs care when performing rendering operations (such as drawing)
and translating these to (non-zoomed and non-panned) source bitmaps.

## State history

Mutations can be registered in state history (Vuex _history-module.js_) in order to provide undo and redo
of operations. In order to prevent storing a lot of changes of the same property (for instance when dragging a slider), the storage of a new state is deferred through a queue. This is why history states are enqueued by _propertyName_:

When enqueuing a new state while there is an existing one enqueued for the same property name, the first state is updated so its redo will match that of the newest state, the undo remaining unchanged. The second state will not
be added to the queue.

It is good to understand that the undo/redo for an action should be considered separate
from the Vue component that is triggering the transaction, the reason being that the component can be
unmounted at the moment the history state is changed (and the component is no longer active).

That's why undo/redo handlers should either work on variables in a local scope, or on the Vuex store
when mutating store properties. When relying on store state and getters, be sure to cache their
values in the local scope to avoid conflicts (for instance in below example we cache _activeLayerIndex_
as it is used by the undo/redo methods to update a specific Layer. _activeLayerIndex_ can change during
the application lifetime before the undo/redo handler fires which would otherwise lead to the _wrong Layer_
being updated.

```typescript
update( propertyName: string, newValue: any ): void {
    // cache the existing values of the property value we are about to mutate...
    const existingValue = this.getterForExistingValue;
    // ...and the layer index that is used to identify the layer containing the property
    const index = this.activeLayerIndex;
    const store: Store<BitMapperyState> = this.$store;
    // define the method that will mutate the existing value to given newValue
    const commit = (): void => store.commit( "updateLayer", { index, opts: { newValue } });
    // and perform the mutation directly
    commit();
    // now define and enqueue undo/redo handlers to reverse and redo the commit mutation
    enqueueState( propertyName, {
        undo(): void {
            store.commit( "updateLayerEffects", { index, opts: { existingValue } });
        },
        redo(): void {
            commit();
        },
    });
}
```

Whenever an action (that requires an undo state) can be triggered in multiple locations (for instance
inside a component and as a keyboard shortcut in `@/src/services/keyboard-service`), you can
create a custom handler inside `@/src/factories/action-factory` to avoid code duplication.

## Third party storage integration

Requires you to register a client id or access token in the developer portal of the third party
storage provider. Currently, there is support for [Dropbox](https://www.dropbox.com/developers/apps), [Google Drive](https://console.cloud.google.com/) and S3 Buckets.

You can enable each of these integrations by providing the required key values for your configuration
by creating a local `env.local`-file which will contain your custom files. You can create this
file by duplicating the contents of the `.env`-file provided in the repository.

## Project setup

The project setup is two-fold. You can get all the dependencies through NPM as usual:

```
npm install
```

after which you can run:

* ```npm run dev``` to start a local development server with hot module reload
* ```npm run build``` to compile a production package
* ```npm run test```  to run the unit tests
* ```npm run lint``` to run the linter on the source files

The above will suffice when working solely on the JavaScript side of things.

## Docker based self hosted version

#### Step 1 : Clone the BitMappery project into a local folder :

```bash
git clone https://github.com/igorski/bitmappery.git
```

#### Step 2 : Build the image using the provided Dockerfile :

```bash
docker build -t bitmappery .
```

#### Step 3 : Once the image is built, run the container and bind the ports :

```bash
docker run -d -p 5173:5173 --name bitmappery-container bitmappery
```

Once the container is started, you can access BitMappery at `http://localhost:5173`

## WebAssembly

BitMappery can also use WebAssembly to increase performance of image manipulation. The source
code is C based and compiled to WASM using [Emscripten](https://github.com/emscripten-core/emscripten). Because this setup is a little more cumbersome, the repository contains precompiled binaries
in the _./src/wasm/bin/_-folder meaning you can omit this setup if you don't intend to make changes
to these sources.

If you do wish to make contributions on this end, to compile the source (_/src/wasm/_) C-code to WASM, you
will first need to prepare your environment (note the last _source_ call does not permanently update your paths):

```bash
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh
```

now you can compile all source files to WASM using:

```
npm run wasm
```

### Benchmarks

On a particular (low powered) configuration, running all filters on a particular source takes:

* 7000+ ms in JavaScript
* 558 ms in WebAssembly
* 484 ms in JavaScript inside a Web Worker
* 603 ms in WebAssembly inside a Web Worker

Note that the WebAssembly Web Worker takes a performance hit from converting the ImageData buffer
to float32 prior to allocating the buffer in the WASM instance's memory. This can benefit from
further tweaking to see if it gets closer to the JavaScript Web Worker performance.

WebAssembly filtering is a user controllable feature in the preferences pane.
