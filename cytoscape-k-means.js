;(function(){ 'use strict';

  // Implemented from the reference library: https://harthur.github.io/clusterfck/

  var defaults = {
    k: 2,
    distance: 'euclidean',
    maxIterations: 10,
    attributes: [
      function(node) {
        return node.position('x');
      },
      function(node) {
        return node.position('y');
      }
    ]
  };

  var setOptions = function( opts, options ) {
    for (var i in defaults) { opts[i] = defaults[i]; }
    for (var i in options)  { opts[i] = options[i];  }
  };

  var distances = {
    euclidean: function ( node, centroid, attributes ) {
      var total = 0;
      for ( var dim = 0; dim < attributes.length; dim++ ) {
        total += Math.pow( attributes[dim](node) - centroid[dim], 2 );
      }
      return Math.sqrt(total);
    },
    manhattan: function ( node, centroid, attributes ) {
      var total = 0;
      for ( var dim = 0; dim < attributes.length; dim++ ) {
        total += Math.abs( attributes[dim](node) - centroid[dim] );
      }
      return total;
    },
    max: function ( node, centroid, attributes ) {
      var max = 0;
      for ( var dim = 0; dim < attributes.length; dim++ ) {
        max = Math.max( max, Math.abs( attributes[dim](node) - centroid[dim] ) );
      }
      return max;
    }
  };

  var randomCentroids = function( nodes, k, attributes ) {
    var ndim = attributes.length,
        min  = new Array(ndim),
        max  = new Array(ndim),
        centroids = new Array(k),
        centroid  = null;

    // Find min, max values for each attribute dimension
    for ( var i = 0; i < ndim; i++ ) {
      min[i] = nodes.min( attributes[i] ).value;
      max[i] = nodes.max( attributes[i] ).value;
    }

    // Build k centroids, each represented as an n-dim feature vector
    for ( var c = 0; c < k; c++ ) {
      centroid = [];
      for ( i = 0; i < ndim; i++ ) {
        centroid[i] = Math.random() * (max[i] - min[i]) + min[i]; // random initial value
      }
      centroids[c] = centroid;
    }

    return centroids;
  };

  var classify = function( node, centroids, distance, attributes ) {
    var min   = Infinity,
        index = 0;

    distance = distances[distance];

    for ( var i = 0; i < centroids.length; i++ ) {
      var dist = distance(node, centroids[i], attributes);
      if (dist < min) {
        min = dist;
        index = i;
      }
    }

    return index;
  };

  var hasConverged = function( v1, v2, roundFactor ) {
    v1 = Math.round( v1 * Math.pow(10, roundFactor) ) / Math.pow(10, roundFactor); // truncate to 'roundFactor' decimal places
    v2 = Math.round( v2 * Math.pow(10, roundFactor) ) / Math.pow(10, roundFactor);
    return v1 === v2;
  };

  // registers the extension on a cytoscape lib ref
  var register = function( cytoscape ){

    if( !cytoscape ){ return; } // can't register if cytoscape unspecified
    
    cytoscape( 'collection', 'kMeans', function( options ){
      var cy    = this.cy(),
          nodes = this.nodes(),
          node  = null,
          opts  = {};

      // Set parameters of algorithm: # of clusters, distance metric, etc.
      setOptions( opts, options );

      // Begin k-means algorithm
      var clusters   = new Array(opts.k),
          assignment = {};

      // Step 1: Initialize centroid positions
      var centroids  = randomCentroids( nodes, opts.k, opts.attributes ),
          isStillMoving   = true,
          iterations = 0;

      while ( isStillMoving && iterations < opts.maxIterations ) {

        // Step 2: Assign nodes to the nearest centroid
        for ( var n = 0; n < nodes.length; n++ ) {
          node = nodes[n];
          // Determine which cluster this node belongs to: node id => cluster #
          assignment[ node.id() ] = classify( node, centroids, opts.distance, opts.attributes );
        }

        // Step 3: For each of the k clusters, update its centroid
        isStillMoving = false;
        for ( var c = 0; c < opts.k; c++ ) {
          var cluster = cy.collection();

          // Get all nodes that belong to this cluster
          for ( n = 0; n < nodes.length; n++ ) {
            node = nodes[n];
            if ( assignment[ node.id() ] === c ) {
              //console.log("Node " + node.id() + " belongs in cluster " + c);
              cluster = cluster.union( node );
            }
          }

          if ( cluster.empty() ) { // If cluster is empty, break out early & move to next cluster
            continue;
          }

          // Update centroids by calculating avg of all nodes within the cluster.
          var ndim        = opts.attributes.length,
              centroid    = centroids[c],           // [ dim_1, dim_2, dim_3, ... , dim_n ]
              newCentroid = new Array(ndim),
              sum         = new Array(ndim);

          for ( var d = 0; d < ndim; d++ ) {
            sum[d] = 0.0;
            for ( var i = 0; i < cluster.length; i++ ) {
              node = cluster[i];
              sum[d] += opts.attributes[d](node);
            }
            newCentroid[d] = sum[d] / cluster.length;

            // Check to see if algorithm has converged, i.e. when centroids no longer change
            if ( !hasConverged(newCentroid[d], centroid[d], 4) ) { // approximates to 4 decimal places
              isStillMoving = true;
            }
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
