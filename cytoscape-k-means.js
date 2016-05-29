;(function(){ 'use strict';

  // Implemented from the reference library: https://harthur.github.io/clusterfck/

  var defaults = {
    k: 2,
    distance: 'euclidean',
    maxIterations: 10,
    attributes: [
      function(node) {
        return node.position('x')
      },
      function(node) {
        return node.position('y')
      }
    ]
  };

  var setOptions = function( opts, options ) {
    for (var i in options) { opts[i] = defaults[i]; }
    for (var i in options) { opts[i] = options[i]; }
  };

  var distances = {
    euclidean: function (node, centroid, attributes) {
      var total = 0;
      for (var dim = 0; dim < attributes.length; dim++) {
        total += Math.pow(attributes[dim](node) - centroid[dim], 2);
      }
      return Math.sqrt(total);
    },
    manhattan: function (node, centroid, attributes) {
      var total = 0;
      for (var dim = 0; dim < attributes.length; dim++) {
        total += Math.abs(attributes[dim](node) - centroid[dim]);
      }
      return total;
    },
    max: function (node, centroid, attributes) {
      var max = 0;
      for (var dim = 0; dim < attributes.length; dim++) {
        max = Math.max(max, Math.abs(attributes[dim](node) - centroid[dim]));
      }
      return max;
    }
  };

  var randomCentroids = function( nodes, k, attributes ) {
    var dim = attributes.length,
        min = new Array(dim),
        max = new Array(dim),
        centroids = new Array(k);

    // Find min, max values across each attribute dimension
    for (var i = 0; i < dim; i++) {
      min[i] = nodes.min( attributes[i] ).value;
      max[i] = nodes.max( attributes[i] ).value;
    }

    // Build k centroids, each represented as an n-dim feature vector
    for (var c = 0; c < k; c++) {
      var centroid = [];
      for (i = 0; i < dim; i++) {
        centroid[i] = Math.random() * (max[i] - min[i]) + min[i]; // random initial value
      }
      centroids[c] = centroid;
    }

    //return centroids;

    // TODO: remove in final version
    return [ [1.0,1.0], [5.0,7.0] ];
  };

  var classify = function(node, centroids, distance, attributes) {
    var min = Infinity,
        index = 0;

    distance = distances[distance];

    for (var i = 0; i < centroids.length; i++) {
      var dist = distance(node, centroids[i], attributes);
      if (dist < min) {
        min = dist;
        index = i;
      }
    }

    return index;
  };

  var hasConverged = function(v1, v2) {
    v1 = Math.round(v1 * 10000) / 10000;
    v2 = Math.round(v2 * 10000) / 10000;
    return v1 === v2;
  };

  // registers the extension on a cytoscape lib ref
  var register = function( cytoscape ){

    if( !cytoscape ){ return; } // can't register if cytoscape unspecified
    
    cytoscape( 'collection', 'kMeans', function( options ){
      var eles = this;
      var cy = this.cy();
      var nodes = this.nodes();                         // => nodes[0].position() => { x: 0, y: 0 }
      var node = null;
      var opts = {};

      // Set parameters of algorithm: # of clusters, distance metric, etc.
      setOptions( opts, options );

      // Begin k-means algorithm

      // Step 1: Initialize centroid positions
      var centroids = randomCentroids(nodes, opts.k, opts.attributes);
      var assignment = {};
      var clusters = new Array(opts.k);

      var iterations = 0;
      var movement = true;
      while ( movement && iterations < opts.maxIterations ) {
        movement = false;

        // Step 2: Assign nodes to the nearest centroid.
        for ( var n = 0; n < nodes.length; n++ ) {
          node = nodes[n];
          // determine which cluster this node belongs to
          assignment[ node.id() ] = classify(node, centroids, opts.distance, opts.attributes); // node id => centroid #
        }

        // Step 3: For each of the k clusters, recalculate its centroid.
        movement = false;
        for ( var c = 0; c < opts.k; c++ ) { // for each cluster
          var cluster = cy.collection();

          // find all nodes that belong to this cluster
          for ( n = 0; n < nodes.length; n++ ) {
            node = nodes[n];
            if (assignment[ node.id() ] === c) {
              console.log("Node " + node.id() + " belongs in cluster " + c);
              cluster = cluster.union( node );
            }
          }

          if (cluster.empty()) { // if cluster is empty, break out early & move to next cluster
            continue;
          }

          // Recalculate centroid position by taking avg attribute of nodes within cluster
          // and set flag if algorithm has converged/when centroids no longer change.
          var dim = opts.attributes.length,
              sum = new Array(dim),
              centroid = centroids[c], // [ dim_1, dim_2, dim_3, ... , dim_n ]
              newCentroid = new Array(dim);

          // for each dim
          for (var d = 0; d < dim; d++) {
            sum[d] = 0.0;
            // get avg of attrib from each node
            for ( var i = 0; i < cluster.length; i++ ) {
              node = cluster[i];
              sum[d] += opts.attributes[d](node);
            }
          }

          for (d = 0; d < dim; d++) {
            newCentroid[d] = sum[d] / cluster.length;
          }

          // Check to see if algorithm has converged across all dim, i.e. when centroid positions no longer change
          for (d = 0; d < dim; d++) {
            if (!hasConverged(newCentroid[d], centroid[d])) // has not converged across this dimension
                movement = true;
          }

          centroids[c] = newCentroid;
          clusters[c] = cluster;
        }

        iterations++;
      }

      return clusters;
    } );

  };

  if( typeof module !== 'undefined' && module.exports ){ // expose as a commonjs module
    module.exports = register;
  }

  if( typeof define !== 'undefined' && define.amd ){ // expose as an amd/requirejs module
    define('cytoscape-k-means', function(){
      return register;
    });
  }

  if( typeof cytoscape !== 'undefined' ){ // expose to global cytoscape (i.e. window.cytoscape)
    register( cytoscape );
  }

})();
