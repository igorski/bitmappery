# PhotoMound

## So you are rebuilding Photoshop in the browser ?

No, I'm building a tool that does the bare minimum what I require and what I don't
find in other open source tools. That doesn't mean of course that contributions
related to Photoshop-esque features aren't welcomed.

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

* Unit tests for documentLoad() and documentSave() and factories
* DrawableLayer should only draw when brush too lis active
* Layer view in options-panel: allow naming, repositioning, toggle visibility, set as mask
* Drawable layer bitmap content (canvas) must be added to layer.bitmap (and thus be recalled when switching documents)
* Canvas util : store transparency of images
* Restored base64 images should be treated as binary once more (see layer-factory)
* Add brush options > size, transparency
* scale logic should move from zoomable-canvas into zCanvas (as handleInteraction needs to transform offsets by zoom ratio, see DrawableLayer!)
* adjust scaling (on widescreen images scale in the width, rather than go for full height and zoomed out mode)
* Default canvas background should be transparency blocks (requires zCanvas bg pattern update or just a lowest render layer that isn't part of the document)
* Zoom in should be center based
* Image position must be made persistent (now isn't on document switch)
* Implement selections
* Unload Blobs when images are no longer used in document (see sprite-factory disposeSprite, keep instance count of usages)
* Export output to image file (by rendering document content on separate canvas instead of taking snapshot at incorrect scale)
* Load/save documents from/to Dropbox
* Use hand cursor when draggable
* Use paint brush cursor when painting
* Add tools for layer rotation and scaling
* Implement clone brush
* Implement document crop
* Implement change history
