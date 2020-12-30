# BitMappery

## So you are rebuilding Photoshop in the browser ?

No, I'm building a tool that does the bare minimum what I require and what I don't
find in other open source tools. That doesn't mean of course that contributions
related to Photoshop-esque features aren't welcomed.

### All self-written ?

Yep, though it helps having worked in the photo software industry for five years, having
tackled the problems before. Also, Bitmappery is reusing [zCanvas](https://github.com/igorski/zCanvas)
for rendering and bitmap blitting.

BitMappery does however make use of the following excellent libraries to speed up its development:

 * [Vue](https://github.com/vuejs/vue) with [Vuex](https://github.com/vuejs/vuex) and [VueI18n](https://github.com/kazupon/vue-i18n)
 * [Pickr](https://github.com/Simonwep/pickr) by Simonwep
 * [Vue slider component](https://github.com/NightCatSama/vue-slider-component) by NightCatSama
 * [Vue search select](https://github.com/moreta/vue-search-select#readme) by Moreta
 * [Vue tooltip](https://github.com/Akryum/v-tooltip) by Akryum

### Icons

* UI Essentials by [www.wishforge.games](https://freeicons.io/profile/2257)
* Black arrow icons set by [Reda](https://freeicons.io/profile/6156)

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

* Issue with drawing masks on rotated content
* When resizing document, positioned layers do not scale their position correctly
* Implement rectangular selection / select all
* Render service should use the tool-options-text debounce on first font load to ensure font is present on document load
* Render service should measure total text bounding box upfront and scale resulting bitmap (can be done after render)
* Try very wide Dropbox image on MB Air with space + pan in bottom right area. Won't work.
* Restoring positions of documents with positioned rotated objects is not accurate
* Moving of flipped / rotated content leads to occasional non-renders (isInsideViewport doesn't take rotated rectangles into account)
* Copying selections on rotated content doesn't work
* Copying selection should preserve original scale
* Fill selection with color (make color not unique to brush, but generic tool prop)
* Animate selection lines between white and black colors
* Layer bitmaps and masks must not be stored as Vue observables
* Layer view in options-panel: allow naming, repositioning, toggling visibility and opacity
* Canvas util : store transparency of images into saved document
* Restored base64 images should be treated as binary once more (see layer-factory)
* Zoom set original size isn't that accurate (check also on mobile views), needs calculateMaxScaling ?
* Unload Blobs when images are no longer used in document (see sprite-factory disposeSprite, keep instance count of usages)
* Load/save documents directly from/to Dropbox
* Implement layer scaling
* Implement merged layer selection
* Implement document crop
* Implement clone brush
* Implement change history
* Implement UI pattern to activate scrollpane on touch screens
* Scale logic should move from zoomable-canvas into zCanvas (as handleInteraction needs to transform offsets by zoom ratio, see LayerSprite!)
