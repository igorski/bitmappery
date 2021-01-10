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
has its own factory (see _@/src/factories/_). The Document is managed by the Vuex _document-module.js_.

## Document rendering and interactions

The Document is rendered one layer at a time onto a Canvas element, using [zCanvas](https://github.com/igorski/zCanvas). Both the rendering and interaction handling is performed by _@/src/components/ui/zcanvas/layer_sprite.js_.
Note that the purpose of the renderer is solely to delegate interactions events to the Layer entity. The
renderer should represent the properties of the Layer, the Layer should never reverse-engineer from the onscreen
content (especially as different window size and scaling factor will greatly complicate these matters when
performed two-way).

Rendering transformations, text and effects is an asynchronous operation handled by _@/src/services/render-service.js_. The purpose of this service is to perform and cache repeated operations and eventually maintain
the source bitmap represented by the _layer-sprite.js_.

## Dropbox integration

Requires you to [register a client id or access token](https://www.dropbox.com/developers/apps).

## Project setup
```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```

### Run your unit tests
```
npm run test
```

### Lints and fixes files
```
npm run lint
```

# TODO / Roadmap

* Repeated presses on a clone stamp with source coords do not behave logically
* Implement action queue when drawing, only execute drawing on zCanvas.sprite.update()-hook
* Maintain cache for source images at the display destination size (invalidate on window resize / zoom), this prevents processing large images that are never displayed at their full scale
* Dragging of masks on rotated/mirror content is kinda broken
* Animate selection lines between white and black colors
* Layer source and mask must not be stored as Vue observables
* Restored base64 images should be treated as binary once more (see layer-factory)
* Zoom set original size isn't that accurate (check also on mobile views), needs calculateMaxScaling ?
* Unload Blobs when images are no longer used in document (see sprite-factory disposeSprite, keep instance count of usages)
* Implement layer sorting and opacity
* Implement layer scaling
* Implement merged layer selection
* Implement change history
* Scale logic should move from zoomable-canvas into zCanvas (as handleInteraction needs to transform offsets by zoom ratio, see LayerSprite!)
