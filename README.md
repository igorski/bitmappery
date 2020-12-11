# nicephore

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

* Import file to new document or new layer
* Implement confirmations for destructive actions (e.g. document close)
* Load Blobs when about to use image in document
* Unload Blobs when images are no longer used in document
* Change layer order
* Undo history
* Free resources on document close
* Generate UIDs for each document entry making it easier to detect changes
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
