# BitMappery

## So you are rebuilding Photoshop in the browser ?

No, I'm building a tool that does the bare minimum what I require and what I don't
find in other open source tools. That doesn't mean of course that contributions
related to Photoshop-esque features aren't welcomed.

## The [Issue Tracker](https://github.com/igorski/bitmappery/issues) is your point of contact

Bug reports, feature requests, questions and discussions are welcome on the GitHub Issue Tracker, please do not send e-mails through the development website. However, please search before posting to avoid duplicates, and limit to one issue per post.

Please vote on feature requests by using the Thumbs Up/Down reaction on the first post.

### All hand-written ?

Yep, though it helps having worked in the photo software industry for five years, having
tackled the problems before. Also, BitMappery is reusing [zCanvas](https://github.com/igorski/zCanvas)
under the hood for rendering and bitmap blitting. BitMappery is written on top of [Vue](https://github.com/vuejs/vue) using [Vuex](https://github.com/vuejs/vuex) and [VueI18n](https://github.com/kazupon/vue-i18n).

## Model

BitMappery works with entities known as _Documents_. A Document contains several _Layers_, each of
which define their content, transformation, _Effects_, etc. Each of the nested entity properties
has its own factory (see _/src/factories/_). The Document is managed by the Vuex _document-module.js_.

## Document rendering and interactions

The Document is rendered one layer at a time onto a Canvas element, using [zCanvas](https://github.com/igorski/zCanvas). Both the rendering and interaction handling is performed by dedicated "Sprite" classes.

All layer rendering and interactions are handled by _/src/components/ui/zcanvas/layer_sprite.js_.
Note that the purpose of the renderer is solely to delegate interactions events to the Layer entity. The
renderer should represent the properties of the Layer, the Layer should never reverse-engineer from the onscreen
content (especially as different window size and scaling factor will greatly complicate these matters when
performed two-way).

Rendering transformations, text and effects is an asynchronous operation handled by _/src/services/render-service.js_. The purpose of this service is to perform and cache repeated operations and eventually maintain
the source bitmap represented by the LayerSprite. The LayerSprite invokes the rendering service.

All interactions that work across layers (viewport panning, layer selection by clicking on non-transparent
pixels and selection drawing) is done by a single top level sprite that covers the entire zCanvas area.
This is handled by _/src/components/ui/zcanvas/interaction-pane.js_.

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

```
update( propertyName, newValue ) {
    // cache the existing values of the property value we are about to mutate...
    const existingValue = this.getterForExistingValue;
    // ...and the layer index that is used to identify the layer containing the property
    const index = this.activeLayerIndex;
    const store = this.$store;
    // define the method that will mutate the existing value to given newValue
    const commit = () => store.commit( "updateLayer", { index, opts: { newValue } });
    // and perform the mutation directly
    commit();
    // now define and enqueue undo/redo handlers to reverse and redo the commit mutation
    enqueueState( propertyName, {
        undo() {
            store.commit( "updateLayerEffects", { index, opts: { existingValue } });
        },
        redo() {
            commit();
        },
    });
}
```

## Dropbox integration

Requires you to [register a client id or access token](https://www.dropbox.com/developers/apps).

## Project setup

The project setup is two-fold. You can get all the dependencies through NPM as usual:

```
npm install
```

after which you can run:

* ```npm run serve``` to start a local development server with hot module reload
* ```npm run build``` to compile a production package
* ```npm run test```  to run the unit tests
* ```npm run lint``` to run the linter on the source files

The above will suffice when working solely on the JavaScript side of things.

### WebAssembly

BitMappery can also use WebAssembly to increase performance of image manipulation. The source
code is C based and compiled to WASM using [Emscripten](https://github.com/emscripten-core/emscripten). Because this setup is a little more cumbersome, the repository contains precompiled binaries
in the _./public/bin/_-folder meaning you can omit this setup if you don't intend to make changes
to these sources.

If you do wish to make contributions on this end, to compile the source (_/src/wasm/_) C-code to WASM, you
will first need to prepare your environment (note the last _source_ call does not permanently update your paths):

```
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

#### Benchmarks

On a particular (low powered) configuration, running all filters on a particular source takes:

* 7000+ ms in JavaScript
* 558 ms in WebAssembly
* 484 ms in JavaScript inside a Web Worker
* 603 ms in WebAssembly inside a Web Worker

The WebAssembly Web Worker takes a performance hit from converting the ImageData buffer
to float32 prior to allocating the buffer in the WASM instance's memory. This can benefit from
further benchmarking and tweaking.

# TODO / Roadmap

* Layer source and mask must not be stored as Vue observables
* Repeated presses on a clone stamp with source coords do not behave logically
* Implement action queue when drawing, only execute drawing on zCanvas.sprite.update()-hook
* Maintain cache for source images at the display destination size (invalidate on window resize / zoom), this prevents processing large images that are never displayed at their full scale
* Dragging of masks on rotated/mirror content is kinda broken
* Restored base64 images should be treated as binary once more (see layer-factory)
* Zoom set original size isn't that accurate (check also on mobile views), needs calculateMaxScaling ?
* Unload Blobs when images are no longer used in document (see sprite-factory disposeSprite, keep instance count of usages)
* Implement layer sorting and opacity
* Implement layer scaling
* Implement merged layer selection
* Scale logic should move from zoomable-canvas into zCanvas (as handleInteraction needs to transform offsets by zoom ratio, see LayerSprite!)
