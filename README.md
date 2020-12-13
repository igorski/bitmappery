# PhotoMound

## So you are rebuilding Photoshop in the browser ?

No, I'm building a tool that does the bare minimum what I require and what I don't
find in other open source tools. That doesn't mean of course that contributions
related to Photoshop-esque features aren't welcomed.

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

* Add zoom control to control zoom factor. Tool options should go to options-panel (duh)
* Drawable layers must be added to document (and thus be recalled when switching documents)
* Add brush options > size, transparency
* Image position must be made persistent (now isn't on document switch)
* Toolbox and options panel should be collapsible (keyboard shortcuts)
* Load Blobs when about to use image in document, not upfront (unless source is base64)
* Unload Blobs when images are no longer used in document (see canvas-util disposeSprite)
* Change layer order
* Export output to image file
* Import / export documents from/to disk
* Use magnification (document size is relative to available screen size)
* Add zoom
* Restore project by selecting folder from file system
* Use hand cursor when draggable
* Use paint brush cursor when painting
* Controls for rotation and scaling
* Paint brush
* Clone brush
* Implement masking layers
* Implement selections
* Implement document crop / resize
* Implement change history
* Dropbox integration?
