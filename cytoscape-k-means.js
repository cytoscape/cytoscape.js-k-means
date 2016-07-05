;(function(){ 'use strict';

  // Implemented from the reference library: https://harthur.github.io/clusterfck/

  var defaults = {
    k: 2,
    m: 2,
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
    euclidean: function ( node, centroid, attributes, mode ) {
      var total = 0;
      for ( var dim = 0; dim < attributes.length; dim++ ) {
        total += (mode === 'kMedoids') ? Math.pow( attributes[dim](node) - attributes[dim](centroid), 2 ) :
               /* mode === 'kMeans' */   Math.pow( attributes[dim](node) - centroid[dim], 2 );
      }
      return Math.sqrt(total);
    },
    manhattan: function ( node, centroid, attributes, mode ) {
      var total = 0;
      for ( var dim = 0; dim < attributes.length; dim++ ) {
        total += (mode === 'kMedoids') ? Math.pow( attributes[dim](node) - attributes[dim](centroid), 2 ) :
               /* mode === 'kMeans' */   Math.pow( attributes[dim](node) - centroid[dim], 2 );
      }
      return total;
    },
    max: function ( node, centroid, attributes, mode ) {
      var max = 0;
      for ( var dim = 0; dim < attributes.length; dim++ ) {
        max = (mode === 'kMedoids') ? Math.pow( attributes[dim](node) - attributes[dim](centroid), 2 ) :
            /* mode === 'kMeans' */   Math.pow( attributes[dim](node) - centroid[dim], 2 );
      }
      return max;
    }
  };

  var randomCentroids = function( nodes, k, attributes ) {
    var ndim = attributes.length;
    var min  = new Array(ndim);
    var max  = new Array(ndim);
    var centroids = new Array(k);
    var centroid  = null;

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

  var classify = function( node, centroids, distance, attributes, type ) {
    var min   = Infinity;
    var index = 0;

    distance = (typeof distance === 'string') ? distances[distance] : distance;

    for ( var i = 0; i < centroids.length; i++ ) {
      var dist = distance( node, centroids[i], attributes, type );
      if (dist < min) {
        min = dist;
        index = i;
      }
    }

    return index;
  };

  var buildCluster = function( centroid, nodes, assignment ) {
    var cluster = [];
    var node = null;

    for ( var n = 0; n < nodes.length; n++ ) {
      node = nodes[n];
      if ( assignment[ node.id() ] === centroid ) {
        //console.log("Node " + node.id() + " is associated with medoid #: " + m);
        cluster.push( node );
      }
    }
    return cluster;
  };

  var hasConverged = function( v1, v2, roundFactor ) {
    v1 = Math.round( v1 * Math.pow(10, roundFactor) ) / Math.pow(10, roundFactor); // truncate to 'roundFactor' decimal places
    v2 = Math.round( v2 * Math.pow(10, roundFactor) ) / Math.pow(10, roundFactor);
    return v1 === v2;
  };

  var seenBefore = function ( node, medoids, n ) {
    for ( var i = 0; i < n; i++ ) {
      if ( node === medoids[i] )
        return true;
    }
    return false;
  };

  var randomMedoids = function( nodes, k ) {
    var medoids = new Array(k);

    // For small data sets, the probability of medoid conflict is greater,
    // so we need to check to see if we've already seen or chose this node before.
    if (nodes.length < 50) {

      // Randomly select k medoids from the n nodes
      for (var i = 0; i < k; i++) {
        var node = nodes[ Math.floor( Math.random() * nodes.length ) ];

        // If we've already chosen this node to be a medoid, don't choose it again (for small data sets).
        // Instead choose a different random node.
        while ( seenBefore( node, medoids, i ) ) {
          node = nodes[ Math.floor( Math.random() * nodes.length ) ];
        }
        medoids[i] = node;
      }
    }
    else { // Relatively large data set, so pretty safe to not check and just select random nodes
      for (var i = 0; i < k; i++) {
        medoids[i] = nodes[ Math.floor( Math.random() * nodes.length ) ];
      }
    }
    return medoids;
  };

  var findCost = function( potentialNewMedoid, cluster, attributes ) {
    var cost = 0;
    for ( var n = 0; n < cluster.length; n++ ) {
      cost += distances['manhattan']( cluster[n], potentialNewMedoid, attributes, 'kMedoids' );
    }
    return cost;
  };

  var kMeans = function( options ){
    var cy    = this.cy();
    var nodes = this.nodes();
    var node  = null;
    var opts  = {};

    // Set parameters of algorithm: # of clusters, distance metric, etc.
    setOptions( opts, options );

    // Begin k-means algorithm
    var clusters   = new Array(opts.k);
    var assignment = {};

    // Step 1: Initialize centroid positions
    var centroids = randomCentroids( nodes, opts.k, opts.attributes );
    var isStillMoving = true;
    var iterations = 0;

    while ( isStillMoving && iterations < opts.maxIterations ) {

      // Step 2: Assign nodes to the nearest centroid
      for ( var n = 0; n < nodes.length; n++ ) {
        node = nodes[n];
        // Determine which cluster this node belongs to: node id => cluster #
        assignment[ node.id() ] = classify( node, centroids, opts.distance, opts.attributes, 'kMeans' );
      }

      // Step 3: For each of the k clusters, update its centroid
      isStillMoving = false;
      for ( var c = 0; c < opts.k; c++ ) {

        // Get all nodes that belong to this cluster
        var cluster = buildCluster( c, nodes, assignment );

        if ( cluster.length === 0 ) { // If cluster is empty, break out early & move to next cluster
          continue;
        }

        // Update centroids by calculating avg of all nodes within the cluster.
        var ndim        = opts.attributes.length;
        var centroid    = centroids[c];           // [ dim_1, dim_2, dim_3, ... , dim_n ]
        var newCentroid = new Array(ndim);
        var sum         = new Array(ndim);

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
        clusters[c]  = cy.collection( cluster );
      }

      iterations++;
    }

    return clusters;
  };

  var kMedoids = function( options ) {
    var cy    = this.cy();
    var nodes = this.nodes();
    var node  = null;
    var opts  = {};

    // Set parameters of algorithm: # of clusters, distance metric, etc.
    setOptions( opts, options );

    // Begin k-medoids algorithm
    var clusters   = new Array(opts.k);
    var assignment = {};
    var curCost;
    var minCosts = new Array(opts.k);    // minimum cost configuration for each cluster

    // Step 1: Initialize k medoids
    var medoids = randomMedoids( nodes, opts.k );

    var isStillMoving = true;
    var iterations = 0;

    while ( isStillMoving && iterations < opts.maxIterations ) {

      // Step 2: Assign nodes to the nearest medoid
      for ( var n = 0; n < nodes.length; n++ ) {
        node = nodes[n];
        // Determine which cluster this node belongs to: node id => cluster #
        assignment[ node.id() ] = classify( node, medoids, opts.distance, opts.attributes, 'kMedoids' );
      }

      isStillMoving = false;
      // Step 3: For each medoid m, and for each node assciated with mediod m,
      // select the node with the lowest configuration cost as new medoid.
      for ( var m = 0; m < medoids.length; m++ ) {

        // Get all nodes that belong to this medoid
        var cluster = buildCluster( m, nodes, assignment );

        if ( cluster.length === 0 ) { // If cluster is empty, break out early & move to next cluster
          continue;
        }

        minCosts[m] = findCost( medoids[m], cluster, opts.attributes ); // original cost

        // Select different medoid if its configuration has the lowest cost
        for ( n = 0; n < cluster.length; n++ ) {
          curCost = findCost( cluster[n], cluster, opts.attributes );
          if ( curCost < minCosts[m] ) {
            minCosts[m] = curCost;
            medoids[m]  = cluster[n];
            isStillMoving = true;
          }
        }

        clusters[m] = cy.collection( cluster );
      }

      iterations++;
    }

    return clusters;
  };

  var fuzzyCMeans = function( options ) {
    var cy    = this.cy();
    var nodes = this.nodes();
    var node  = null;
    var opts  = {};

    // Set parameters of algorithm: # of clusters, fuzziness coefficient, etc.
    setOptions( opts, options );

    // Begin k-means algorithm
    var clusters = new Array(opts.k);



    return clusters;
  };

  // registers the extension on a cytoscape lib ref
  var register = function( cytoscape ){

    if( !cytoscape ){ return; } // can't register if cytoscape unspecified

    // main entry point for k-means algorithm
    cytoscape( 'collection', 'kMeans', kMeans );

    // main entry point for k-medoids algorithm
    cytoscape( 'collection', 'kMedoids', kMedoids );

    // main entry point for fuzzy c-means algorithm
    cytoscape( 'collection', 'fuzzyCMeans', fuzzyCMeans );

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
