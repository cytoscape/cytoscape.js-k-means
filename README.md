cytoscape-k-means and cytoscape-k-medoids
================================================================================

![Screenshot of clusters returned from K-Means algorithm](./demo-img.png?raw=true "Screenshot of clusters returned from K-Means algorithm")

k-means and k-medoids algorithms for Cytoscape.js.

*Zoe Xi, for Google Summer of Code.*

[![Join the chat at https://gitter.im/cytoscape/cytoscape.js-k-means](https://badges.gitter.im/cytoscape/cytoscape.js-k-means.svg)](https://gitter.im/cytoscape/cytoscape.js-k-means?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)


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
The k-means and k-medoids algorithms return an array of clusters generated from the nodes of the calling graph instance. Each cluster contains references to the nodes that belong to that cluster.

```js
var options = {
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
};

var clusters = cy.elements().kMeans( options );

// Do something cool with the nodes found in the first cluster.
clusters[0].myFunc();

var clusters = cy.elements().kMedoids({

    // Note: The same options apply for the k-medoids algorithm.

    // One of the major differences between the k-means and k-medoids algorithms
    // is the manner in which the cluster centers are initialized. In k-means,
    // the cluster centers (centroids) are vectors with elements initialized to
    // random values within each dimension's range. In k-medoids, the cluster
    // centers (medoids) are random nodes from the data set.

    // The other is that the k-means algorithm determines new cluster centers
    // by taking the average of all the nodes within that cluster, whereas
    // k-medoids selects the node with the lowest configuration cost as the new
    // cluster center.

});
```

#### Distance metric
The metric used to measure the distance between two nodes. By default it is set to ```'euclidean'``` distance. It can be one of the pre-defined functions: ```'euclidean', 'manhattan', 'max'```,
or you may pass in your own function (see the [distances object](cytoscape-k-means.js) for examples) that returns a float representing the distance between a node and cluster center.

## Publishing instructions

This project is set up to automatically be published to npm and bower.  To publish:

1. Set the version number environment variable: `export VERSION=1.2.3`
1. Publish: `gulp publish`
1. If publishing to bower for the first time, you'll need to run `bower register cytoscape-k-means https://github.com/cytoscape/cytoscape.js-k-means.git`
