cytoscape-k-means
================================================================================


## Description

The k-means algorithm for Cytoscape.js


## Dependencies

 * Cytoscape.js >=x.y.z
 * <List your dependencies here please>


## Usage instructions

Download the library:
 * via npm: `npm install cytoscape-k-means`,
 * via bower: `bower install cytoscape-k-means`, or
 * via direct download in the repository (probably from a tag).

`require()` the library as appropriate for your project:

CommonJS:
```js
var cytoscape = require('cytoscape');
var k-means = require('cytoscape-k-means');

k-means( cytoscape ); // register extension
```

AMD:
```js
require(['cytoscape', 'cytoscape-k-means'], function( cytoscape, k-means ){
  k-means( cytoscape ); // register extension
});
```

Plain HTML/JS has the extension registered for you automatically, because no `require()` is needed.


## API

Please briefly describe your API here:

```js
cy.k-means({
  foo: 'bar', // some option that does this
  baz: 'bat' // some options that does that
  // ... and so on
});
```

Or maybe if you have a collection extension:

```js
cy.elements().test({
  foo: 'bar', // some option that does this
  baz: 'bat' // some options that does that
  // ... and so on
});
```


## Publishing instructions

This project is set up to automatically be published to npm and bower.  To publish:

1. Set the version number environment variable: `export VERSION=1.2.3`
1. Publish: `gulp publish`
1. If publishing to bower for the first time, you'll need to run `bower register cytoscape-k-means https://github.com/cytoscape/cytoscape.js-k-means.git`
