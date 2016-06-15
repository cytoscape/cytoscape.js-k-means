;(function(){ 'use strict';

  // Implemented from the reference library: https://github.com/juhis/affinity-propagation
  // Helpful resource: http://www.psi.toronto.edu/affinitypropagation/faq.html

  var defaults = {
    preference: 'median', // suitability of a data point to serve as an exemplar
    damping: 0.8,         // damping factor
    maxIterations: 1000,  // max number of iterations to run
    convIterations: 100   // min number of iterations to run in order for clustering to stop
  };

  var setOptions = function( opts, options ) {

    if (options.damping < 0.5 || options.damping >= 1) {
      throw { name: 'ArgumentError', message: ': damping must be >= 0.5 and < 1' };
    }
    for (var i in defaults) { opts[i] = defaults[i]; }
    for (var i in options)  { opts[i] = options[i];  }
  };

  var printMatrix = function( M ) { // used for debugging purposes only
    var n = Math.sqrt(M.length);
    for(var i = 0; i < n; i++ ) {
      var row = '';
      for ( var j = 0; j < n; j++ ) {
        row += M[i*n+j] + ' ';
      }
      console.log(row);
    }
  };

  var sortBy = function( M ) {
    // Sort in ascending order without mutating original matrix, based on lodash sortBy function
    M = M.slice(); 
    M.sort(function(a, b) {
      return a - b;
    });
    return M;
  };

  var getPreference = function( S, preference, n ) { // Larger preferences = greater number of clusters, and vice versa
    var p = null;
    
    if ( preference === 'median' ) { // Set preference to median of similarities
      var arr = sortBy( S );
      var offset = n; // offset is needed to avoid -Infinity values since after sortBy, they will populate the first n indices
      if ( arr.length % 2 === 0 ) {
        p = (arr[arr.length / 2 + offset] + arr[arr.length / 2 - 1 + offset]) / 2;
      }
      else {
        p = arr[Math.floor(arr.length / 2) + 1 + offset];
      }
    }
    else if ( preference === 'min' ) { // Set preference to minimum of similarities (yields smaller number of clusters)
      var arr = sortBy( S );
      p = arr[offset]; // smallest non -Infinity value
    }
    else if ( isFinite(preference) ) { // Custom preference number, as set by user
      p = preference;
    }
    else {
      throw { name: 'ArgumentError', message: ': preference must be \'median\', \'min\', or a finite number' };
    }

    return p;
  };

  var findExemplars = function( n, R, A ) {
    var indices = [];

    for ( var i = 0; i < n; i++ ) {
      if ( R[i * n + i] + A[i * n + i] > 0 ) {
        indices.push(i);
      }
    }
    return indices;
  };

  var assignClusters = function( n, S, exemplars, nodes, id2position ) {
    var clusters = [];
    var i, ei;
    
    for ( i = 0; i < n; i++ ) {
      var index = -1;
      var max = -Infinity;
      
      for ( ei = 0; ei < exemplars.length; ei++ ) {
        var e = exemplars[ei];
        if ( S[i * n + e] > max ) {
          index = e;
          max = S[i * n + e];
        }
      }
      clusters.push(index);
    }

    for (ei = 0; ei < exemplars.length; ei++) {
      clusters[ exemplars[ei] ] = exemplars[ei];
    }

    return clusters;
  };

  var assign = function( n, S, exemplars, nodes, id2position ) {

    var clusters = assignClusters(n, S, exemplars);

    for (var ei = 0; ei < exemplars.length; ei++) {

      var ii = [];
      for (var c = 0; c < clusters.length; c++) {
        if (clusters[c] === exemplars[ei]) {
          ii.push(c);
        }
      }

      var maxI = -1;
      var maxSum = -Infinity;
      for (var i = 0; i < ii.length; i++) {
        var sum = 0;
        for (var j = 0; j < ii.length; j++) {
          sum += S[ii[j] * n + ii[i]];
        }
        if (sum > maxSum) {
          maxI = i;
          maxSum = sum;
        }
      }

      exemplars[ei] = ii[maxI];
    }

    clusters = assignClusters(n, S, exemplars);

    return clusters;
  };

  var affinityPropagation = function( options ){
    var cy    = this.cy();
    var nodes = this.nodes();
    var edges = this.edges();
    var opts  = {};
    var i, j;

    // Set parameters of algorithm:
    setOptions( opts, options );
    
    // Map each node to its position in node array
    var id2position = {};
    for( i = 0; i < nodes.length; i++ ){
      id2position[ nodes[i].id() ] = i;
    }

    // Begin affinity propagation algorithm
    
    var n;  // number of data points
    var n2; // size of matrices
    var S;  // similarity matrix (1D array)
    var p;  // preference/suitability of a data point to serve as an exemplar
    var R;  // responsibility matrix (1D array)
    var A;  // availability matrix (1D array)

    n  = nodes.length;
    n2 = n * n;

    // Initialize and build S similarity matrix
    S  = new Array(n2);
    for ( i = 0; i < n2; i++ ) {
      S[i] = -Infinity;
    }

    for ( var e = 0; e < edges.length; e++ ) {
      var edge = edges[e];
      i = id2position[ edge.source().id() ];
      j = id2position[ edge.target().id() ];
      S[i * n + j] = edge.data('weight');         // similarity values S(i,j) are retrieved from edge weights
    }

    // Place preferences on the diagonal of S
    p = getPreference( S, opts.preference, n );
    for ( i = 0; i < n; i++ ) {
      S[i * n + i] = p;
    }
    
    // Initialize R responsibility matrix
    R = new Array(n2);
    for ( i = 0; i < n2; i++ ) {
      R[i] = 0.0;
    }
    
    // Initialize A availability matrix
    A = new Array(n2);
    for ( i = 0; i < n2; i++ ) {
      A[i] = 0.0;
    }

    var old = new Array(n);
    var Rp  = new Array(n);
    var se  = new Array(n);

    for ( i = 0; i < n; i ++ ) {
      old[i] = 0.0;
      Rp[i]  = 0.0;
      se[i]  = 0;
    }

    var e = new Array(n * opts.convIterations);
    for ( i = 0; i < e.length; i++ ) {
      e[i] = 0;
    }

    var iter, converged = false;
    for ( iter = 0; iter < opts.maxIterations; iter++ ) { // main algorithmic loop

      // Update R responsibility matrix
      for (var i = 0; i < n; i++) {

        var max = -Infinity,
            max2 = -Infinity,
            maxI = -1,
            AS = 0.0;

        for (var j = 0; j < n; j++) {

          old[j] = R[i * n + j];

          AS = A[i * n + j] + S[i * n + j];
          if (AS >= max) {
            max2 = max;
            max = AS;
            maxI = j
          } else if (AS > max2) {
            max2 = AS
          }
        }

        for (var j = 0; j < n; j++) {
          R[i * n + j] = (1 - opts.damping) * (S[i * n + j] - max) + opts.damping * old[j]
        }

        R[i * n + maxI] = (1 - opts.damping) * (S[i * n + maxI] - max2) + opts.damping * old[maxI]
      }

      // Update A availability matrix
      for (var i = 0; i < n; i++) {

        var sum = 0;

        for (var j = 0; j < n; j++) {
          old[j] = A[j * n + i];
          Rp[j] = Math.max(0, R[j * n + i]);
          sum += Rp[j]
        }

        sum -= Rp[i];
        Rp[i] = R[i * n + i];
        sum += Rp[i];

        for (var j = 0; j < n; j++) {
          A[j * n + i] = (1 - opts.damping) * Math.min(0, sum - Rp[j]) + opts.damping * old[j]
        }
        A[i * n + i] = (1 - opts.damping) * (sum - Rp[i]) + opts.damping * old[i]
      }

      // Check for convergence
      var K = 0;
      for (var i = 0; i < n; i++) {
        var E = A[i * n + i] + R[i * n + i] > 0 ? 1 : 0;
        e[(iter % opts.convIterations) * n + i] = E;
        K += E
      }

      if (K > 0 && (iter >= opts.convIterations - 1 || iter == opts.maxIterations - 1)) {

        var sum = 0;
        for (var i = 0; i < n; i++) {
          se[i] = 0;
          for (var j = 0; j < opts.convIterations; j++) {
            se[i] += e[j * n + i]
          }
          if (se[i] === 0 || se[i] === opts.convIterations) {
            sum++
          }
        }

        if (sum === n) {
          converged = true;
          break
        }
      }
    }

    // Identify exemplars (cluster centers)
    var exemplarsIndices = findExemplars( n, R, A );

    // Assign nodes to clusters
    var clusterIndices = assign( n, S, exemplarsIndices, nodes, id2position );

    var clusters = {};
    for (var c = 0; c < exemplarsIndices.length; c++) {
      clusters[ exemplarsIndices[c] ] = [];
    }

    for (i = 0; i < nodes.length; i++) {
      var pos = id2position[ nodes[i].id() ]; // 0-24
      var clusterIndex = clusterIndices[pos]; //        cluster from node 2, 6, 19
      clusters[ clusterIndex ].push( nodes[i] );
    }
    var retClusters = new Array(exemplarsIndices.length);
    for (c = 0; c < exemplarsIndices.length; c++) {
      retClusters[c] = cy.collection( clusters[ exemplarsIndices[c] ] );
    }

    return retClusters;
  };

  // registers the extension on a cytoscape lib ref
  var register = function( cytoscape ){

    if( !cytoscape ){ return; } // can't register if cytoscape unspecified

    // main entry point
    cytoscape( 'collection', 'affinityPropagation', affinityPropagation );

  };

  if( typeof module !== 'undefined' && module.exports ){ // expose as a commonjs module
    module.exports = register;
  }

  if( typeof define !== 'undefined' && define.amd ){ // expose as an amd/requirejs module
    define('cytoscape-affinity-propagation', function(){
      return register;
    });
  }

  if( typeof cytoscape !== 'undefined' ){ // expose to global cytoscape (i.e. window.cytoscape)
    register( cytoscape );
  }

})();
