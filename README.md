# PhotoMound

## So you are rebuilding Photoshop in the browser ?

No, I'm building a tool that does the bare minimum what I require and what I don't
find in other open source tools. That doesn't mean of course that contributions
related to Photoshop-esque features aren't welcomed.

### All self-written ?

Yep, though it helps having worked five years in the photo software industry and having
tackled problems before.

PhotoMound does however make use of the following excellent libraries to speed up its development:

 * [Vue](https://github.com/vuejs/vue) with [Vuex](https://github.com/vuejs/vuex) and [VueI18n](https://github.com/kazupon/vue-i18n)
 * [Pickr](https://github.com/Simonwep/pickr) by Simonwep
 * [Vue slider component](https://github.com/NightCatSama/vue-slider-component) by NightCatSama
 * [Vue search select](https://github.com/moreta/vue-search-select#readme) by Moreta

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

* Something weird with best fit only fitting when window resize fires (also see weird non-cleared canvas areas)
* Layer bitmaps and masks must not be stored as Vue observables
* Layer and mask coordinates are not saved when saving / switching document?
* Only draw visible content (hope to improve zoomed in performance)
* Canvas clearRect() is not doing full width and height ? (might be related to drawable layer click color problem)
* Layer view in options-panel: allow naming, repositioning, toggle visibility, opacity
* Canvas util : store transparency of images
* Restored base64 images should be treated as binary once more (see layer-factory)
* scale logic should move from zoomable-canvas into zCanvas (as handleInteraction needs to transform offsets by zoom ratio, see LayerSprite!)
* Zoom set original size isn't that accurate (check also on mobile views), needs calculateMaxScaling ?
* Implement selections
* Unload Blobs when images are no longer used in document (see sprite-factory disposeSprite, keep instance count of usages)
* Load/save documents from/to Dropbox
* Text editing using Google fonts!
* Add tools for layer rotation and scaling
* Implement layer scale
* Implement clone brush
* Implement document crop
* Implement change history
