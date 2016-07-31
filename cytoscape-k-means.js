;(function(){ 'use strict';

  // References for k-means: https://harthur.github.io/clusterfck/
  // References for k-medoids: http://www.math.le.ac.uk/people/ag153/homepage/KmeansKmedoids/Kmeans_Kmedoids.html
  // References for fuzzy c-means: Ross, Fuzzy Logic w/Engineering Applications (2010), pages 352-353 
  //                               http://yaikhom.com/2013/03/16/implementing-the-fuzzy-c-means-algorithm.html

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
    ],
    testMode: false,
    testCentroids: null
  };

  var setOptions = function( opts, options ) {
    for (var i in defaults) { opts[i] = defaults[i]; }
    for (var i in options)  { opts[i] = options[i];  }
  };

  var printMatrix = function( M ) { // used for debugging purposes only

    for ( var i = 0; i < M.length; i++ ) {
      var row = '';
      for ( var j = 0; j < M[0].length; j++ ) {
        row += Number(M[i][j]).toFixed(3) + ' ';
      }
      console.log(row);
    }
    console.log('');
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
    if ( typeof v1 === 'object' || typeof v2 === 'object' ) { // type matrices
      for ( var i = 0; i < v1.length; i++ ) {
        for (var j = 0; j < v1[i].length; j++ ) {
          var v1_elem = Math.round(v1[i][j] * Math.pow(10, roundFactor)) / Math.pow(10, roundFactor); // truncate to 'roundFactor' decimal places
          var v2_elem = Math.round(v2[i][j] * Math.pow(10, roundFactor)) / Math.pow(10, roundFactor);

          if (v1_elem !== v2_elem) {
            return false;
          }
        }
      }
      return true;
    }
    else {
      v1 = Math.round(v1 * Math.pow(10, roundFactor)) / Math.pow(10, roundFactor); // truncate to 'roundFactor' decimal places
      v2 = Math.round(v2 * Math.pow(10, roundFactor)) / Math.pow(10, roundFactor);
      return v1 === v2;
    }
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
    var centroids;

    // Step 1: Initialize centroid positions
    if ( opts.testMode ) {
      if( typeof opts.testCentroids === 'number') {
        // TODO: implement a seeded random number generator.
        var seed  = opts.testCentroids;
        centroids = randomCentroids( nodes, opts.k, opts.attributes, seed );
      }
      else if ( typeof opts.testCentroids === 'object') {
        centroids = opts.testCentroids;
      }
      else {
        centroids = randomCentroids( nodes, opts.k, opts.attributes );
      }
    }
    else {
      centroids = randomCentroids( nodes, opts.k, opts.attributes );
    }

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
    var clusters = new Array(opts.k);
    var medoids;
    var assignment = {};
    var curCost;
    var minCosts = new Array(opts.k);    // minimum cost configuration for each cluster

    // Step 1: Initialize k medoids
    if ( opts.testMode ) {
      if( typeof opts.testCentroids === 'number') {
        // TODO: implement random generator so user can just input seed number
      }
      else if ( typeof opts.testCentroids === 'object') {
        medoids = opts.testCentroids;
      }
      else {
        medoids = randomMedoids(nodes, opts.k);
      }
    }
    else {
      medoids = randomMedoids(nodes, opts.k);
    }

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

  var initFCM = function( U, _U, centroids, weight, nodes, opts ) {

    _U = new Array(nodes.length);
    for ( var i = 0; i < nodes.length; i++ ) { // N x C matrix
      _U[i] = new Array(opts.k);
    }

    U = new Array(nodes.length);
    for ( var i = 0; i < nodes.length; i++ ) { // N x C matrix
      U[i] = new Array(opts.k);
    }

    for (var i = 0; i < nodes.length; i++) {
      var total = 0;
      for (var j = 0; j < opts.k; j++) {
        U[i][j] = Math.random();
        total += U[i][j];
      }
      for (var j = 0; j < opts.k; j++) {
        U[i][j] = U[i][j] / total;
      }
    }

    centroids = new Array(opts.k);
    for ( var i = 0; i < opts.k; i++ ) {
      centroids[i] = new Array(opts.attributes.length);
    }

    weight = new Array(nodes.length);
    for ( var i = 0; i < nodes.length; i++ ) { // N x C matrix
      weight[i] = new Array(opts.k);
    }
  };

  var updateCentroids = function( centroids, nodes, U, weight, opts ) {
    var numerator, denominator;

    for ( var n = 0; n < nodes.length; n++ ) {
      for ( var c = 0; c < centroids.length; c++ ) {
        weight[n][c] = Math.pow( U[n][c], opts.m );
      }
    }

    for ( var c = 0; c < centroids.length; c++ ) {
      for ( var dim = 0; dim < opts.attributes.length; dim++ ) {
        numerator   = 0;
        denominator = 0;
        for ( var n = 0; n < nodes.length; n++ ) {
          numerator   += weight[n][c] * opts.attributes[dim](nodes[n]);
          denominator += weight[n][c];
        }
        centroids[c][dim] = numerator / denominator;
      }
    }
  };

  var updateMembership = function( U, _U, centroids, nodes, opts ) {
    // Save previous step
    for (var i = 0; i < U.length; i++) {
      _U[i] = U[i].slice();
    }

    var sum, numerator, denominator;
    var pow = 2 / (opts.m - 1);

    for ( var c = 0; c < centroids.length; c++ ) {
      for ( var n = 0; n < nodes.length; n++ ) {

        sum = 0;
        for ( var k = 0; k < centroids.length; k++ ) { // against all other centroids
          numerator   = distances[opts.distance]( nodes[n], centroids[c], opts.attributes, 'cmeans' );
          denominator = distances[opts.distance]( nodes[n], centroids[k], opts.attributes, 'cmeans' );
          sum += Math.pow( numerator / denominator, pow );
        }
        U[n][c] = 1 / sum;
      }
    }
  };

  var assign = function( nodes, U, opts, cy ) {
    var clusters = new Array(opts.k);
    for ( var c = 0; c < clusters.length; c++ ) {
      clusters[c] = [];
    }

    var max;
    var index;
    for ( var n = 0; n < U.length; n++ ) { // for each node (U is N x C matrix)
      max   = -Infinity;
      index = -1;
      // Determine which cluster the node is most likely to belong in
      for ( var c = 0; c < U[0].length; c++ ) {
        if ( U[n][c] > max ) {
          max = U[n][c];
          index = c;
        }
      }
      clusters[index].push( nodes[n] );
    }

    // Turn every array into a collection of nodes
    for ( var c = 0; c < clusters.length; c++ ) {
      clusters[c] = cy.collection( clusters[c] );
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

    // Begin fuzzy c-means algorithm
    var clusters;
    var centroids;
    var U;
    var _U;
    var weight;

    // Step 1: Initialize variables.
    //initFCM( U, _U, centroids, weight, nodes, opts );
    _U = new Array(nodes.length);
    for ( var i = 0; i < nodes.length; i++ ) { // N x C matrix
      _U[i] = new Array(opts.k);
    }

    U = new Array(nodes.length);
    for ( var i = 0; i < nodes.length; i++ ) { // N x C matrix
      U[i] = new Array(opts.k);
    }

    for (var i = 0; i < nodes.length; i++) {
      var total = 0;
      for (var j = 0; j < opts.k; j++) {
        U[i][j] = Math.random();
        total += U[i][j];
      }
      for (var j = 0; j < opts.k; j++) {
        U[i][j] = U[i][j] / total;
      }
    }

    centroids = new Array(opts.k);
    for ( var i = 0; i < opts.k; i++ ) {
      centroids[i] = new Array(opts.attributes.length);
    }

    weight = new Array(nodes.length);
    for ( var i = 0; i < nodes.length; i++ ) { // N x C matrix
      weight[i] = new Array(opts.k);
    }
    // end init FCM

    var isStillMoving = true;
    var iterations = 0;

    while ( isStillMoving && iterations < opts.maxIterations ) {
      isStillMoving = false;

      // Step 2: Calculate the centroids for each step.
      updateCentroids( centroids, nodes, U, weight, opts );

      // Step 3: Update the partition matrix U.
      updateMembership( U, _U, centroids, nodes, opts );

      // Step 4: Check for convergence.
      if ( !hasConverged( U, _U, 4 ) ) {
        isStillMoving = true;
      }

      iterations++;
    }
    
    // Assign nodes to clusters with highest probability.
    clusters = assign( nodes, U, opts, cy );

    return {
      clusters: clusters,
      degreeOfMembership: U
    };
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
