cytoscape-k-means
================================================================================


## Description

![Screenshot of clusters returned from K-Means algorithm](./demo-img.png?raw=true "Screenshot of clusters returned from K-Means algorithm")

A basic k-means algorithm for Cytoscape.js.

*Zoe Xi, for Google Summer of Code.*


## Dependencies

 * Cytoscape.js >=2.6.12


## Usage instructions

Download the library:
 * via npm: `npm install cytoscape-k-means`,
 * via bower: `bower install cytoscape-k-means`, or
 * via direct download in the repository (probably from a tag).

`require()` the library as appropriate for your project:

CommonJS:
```js
var cytoscape = require('cytoscape');
var kMeans = require('cytoscape-k-means');

kMeans( cytoscape ); // register extension
```

AMD:
```js
require(['cytoscape', 'cytoscape-k-means'], function( cytoscape, kMeans ){
  kMeans( cytoscape ); // register extension
});
```

Plain HTML/JS has the extension registered for you automatically, because no `require()` is needed.


## API

```js
cy.elements().kMeans({
  k: '3',                               // number of clusters to return
  distance: 'euclidean',                // distance classifier
  maxIterations: 12,                    // maximum number of interations of the k-means algorithm in a single run
  attributes: [                         // attributes/features used to group nodes
      function(node) {
          return node.data('attrA');
      },
      function(node) {
          return node.data('attrB');
      },
      function(node) {
          return node.data('attrC');
      },
      // And so on...
  ]
});
```


## Publishing instructions

This project is set up to automatically be published to npm and bower.  To publish:

1. Set the version number environment variable: `export VERSION=1.2.3`
1. Publish: `gulp publish`
1. If publishing to bower for the first time, you'll need to run `bower register cytoscape-k-means https://github.com/cytoscape/cytoscape.js-k-means.git`
