;(function(){ 'use strict';

  // Implemented from reference library: https://harthur.github.io/clusterfck/

  var distances = {
    euclidean: function (v1, v2) {
      var total = 0;
      total += Math.pow(v2.position('x') - v1.position('x'), 2);
      total += Math.pow(v2.position('y') - v1.position('y'), 2);
      return Math.sqrt(total);
    },
    manhattan: function (v1, v2) {
      var total = 0;
      total += Math.abs(v2.position('x') - v1.position('x'));
      total += Math.abs(v2.position('y') - v1.position('y'));
      return total;
    },
    max: function (v1, v2) {
      var max = 0;
      max = Math.max(max, Math.abs(v2.position('x') - v1.position('x')), Math.abs(v2.position('y') - v1.position('y')));
      return max;
    }
  };

  var randomCentroids = function(nodes, k) {
    var centroids = nodes.sort(function(a, b) {
      return (Math.round(Math.random()) - 0.5);
    });
    return centroids.slice(0, k);
  };

  var classify = function(point, centroids, distance) {
    var min = Infinity,
        index = 0;

    distance = distance || "euclidean";
    if (typeof distance == "string") {
      distance = distances[distance];
    }

    for (var i = 0; i < centroids.length; i++) {
      var dist = distance(point, centroids[i]);
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

    cytoscape( 'collection', 'kMeans', function( k, distance, maxIterations ){
      var eles = this;
      var cy = this.cy();
      var nodes = this.nodes();                         // => nodes[0].position() => { x: 0, y: 0 }
      var node = null;

      // Validate parameters passed in
      k = k || Math.max(2, Math.ceil(Math.sqrt(nodes.length / 2)));
      distance = distance || "euclidean";
      if (typeof distance === "string") {
        distance = distances[distance];
      }

      // Begin k-means algorithm

      // Step 1: Initialize centroid positions
      var centroids = randomCentroids(nodes, k);
      var assignment = {};//new Array(nodes.length);
      var clusters = new Array(k);

      var iterations = 0;
      var movement = true;
      while ( movement && iterations < maxIterations ) {

        // Step 2: Assign nodes to the nearest centroid.
        for ( var n = 0; n < nodes.length; n++ ) {
          node = nodes[n];
          // determine which cluster this node belongs to
          assignment[ node.id() ] = classify(node, centroids, distance); // node id => centroid #
        }

        // Step 3: For each of the k clusters, recalculate its centroid position.
        movement = false;
        for ( var c = 0; c < k; c++ ) { // for each cluster
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
