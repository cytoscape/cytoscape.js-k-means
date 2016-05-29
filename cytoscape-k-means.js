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

    return centroids;
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

        // Step 2: Assign nodes to the nearest centroid.
        for ( var n = 0; n < nodes.length; n++ ) {
          node = nodes[n];
          // determine which cluster this node belongs to
          assignment[ node.id() ] = classify(node, centroids, opts.distance, opts.attributes); // node id => centroid #
        }

        // Step 3: For each of the k clusters, recalculate its centroid position.
        movement = false;
        for ( var c = 0; c < opts.k; c++ ) { // for each cluster
          var cluster = [];

          for ( n = 0; n < nodes.length; n++ ) {
            node = nodes[n];
            // if node belongs to this cluster #
            if (assignment[ node.id() ] == c) {
              cluster.push( node );
            }
          }

          if (!cluster.length) { // if cluster is empty, break out early & move to next cluster
            continue;
          }

          var centroid = centroids[c];
          var newCentroid = centroid.clone();

          // Recalculate centroid position by taking avg position of nodes within cluster
          // and set flag if algorithm has converged/when centroids no longer change.
          var sum_x = 0;
          for ( var i = 0; i < cluster.length; i++ ) {
            sum_x += cluster[i].position('x');
          }
          newCentroid.position('x', sum_x / cluster.length);

          var sum_y = 0;
          for ( var j = 0; j < cluster.length; j++ ) {
            sum_y += cluster[j].position('y');
          }
          newCentroid.position('y', sum_y / cluster.length);

          // Check to see if algorithm has converged, i.e. when centroid positions no longer change
          if (newCentroid.position('x') != centroid.position('x') || newCentroid.position('y') != centroid.position('y')) {
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
