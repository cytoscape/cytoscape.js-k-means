cytoscape-affinity-propagation
================================================================================

![Screenshot of clusters returned from affinity-propagation algorithm](./demo-img.png?raw=true "Screenshot of clusters returned from affinity-propagation algorithm")

A basic affinity-propagation algorithm for Cytoscape.js.

*Zoe Xi, for Google Summer of Code.*

[![Join the chat at https://gitter.im/cytoscape/cytoscape.js-affinity-propagation](https://badges.gitter.im/cytoscape/cytoscape.js-affinity-propagation.svg)](https://gitter.im/cytoscape/cytoscape.js-affinity-propagation?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)


## Dependencies

 * Cytoscape.js >=2.6.12


## Usage instructions

Download the library:
 * via npm: `npm install cytoscape-affinity-propagation`,
 * via bower: `bower install cytoscape-affinity-propagation`, or
 * via direct download in the repository (probably from a tag).

`require()` the library as appropriate for your project:

CommonJS:
```js
var cytoscape = require('cytoscape');
var affinity-propagation = require('cytoscape-affinity-propagation');

affinity-propagation( cytoscape ); // register extension
```

AMD:
```js
require(['cytoscape', 'cytoscape-affinity-propagation'], function( cytoscape, affinity-propagation ){
  affinity-propagation( cytoscape ); // register extension
});
```

Plain HTML/JS has the extension registered for you automatically, because no `require()` is needed.


## API

```js
cy.elements().affinity-propagation({
  k: '3',                               // number of clusters to return
  distance: 'euclidean',                // distance classifier
  maxIterations: 12,                    // maximum number of interations of the affinity-propagation algorithm in a single run
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
1. If publishing to bower for the first time, you'll need to run `bower register cytoscape-affinity-propagation https://github.com/cytoscape/cytoscape.js-affinity-propagation.git`
