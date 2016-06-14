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

  var printMatrix = function( M ) { // used for debugging only
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

  var getPreference = function( S, preference ) { // Larger preferences = greater number of clusters, and vice versa
    var p = null;
    
    if ( preference === 'median' ) { // Set preference to median of similarities
      var arr = sortBy( S );

      if ( arr.length % 2 === 0 ) {
        p = (arr[arr.length / 2] + arr[arr.length / 2 - 1]) / 2;
      }
      else {
        p = arr[Math.floor(arr.length / 2)];
      }
    }
    else if ( preference === 'min' ) { // Set preference to minimum of similarities (yields smaller number of clusters)
      var arr = sortBy( S );
      p = arr[0];
    }
    else if ( isFinite(preference) ) { // Custom preference number, as set by user
      p = preference;
    }
    else {
      throw { name: 'ArgumentError', message: ': preference must be \'median\', \'min\', or a finite number' };
    }

    return p;
  };

  var affinityPropagation = function( options ){
    var cy    = this.cy();
    var nodes = this.nodes();
    var edges = this.edges();
    var opts  = {};

    // Set parameters of algorithm:
    setOptions( opts, options );
    
    // Map each node to its position in node array
    var id2position = {};
    for( var i = 0; i < nodes.length; i++ ){
      id2position[ nodes[i].id() ] = i;
    }

    // Begin affinity propagation algorithm
    var clusters = [];
    
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
    for ( var i = 0; i < n2; i++ ) {
      S[i] = -Infinity;
    }

    for ( var e = 0; e < edges.length; e++ ) {
      var edge = edges[e];
      var i = id2position[ edge.source().id() ];
      var j = id2position[ edge.target().id() ];
      S[i * n + j] = edge.data('weight');         // similarity values are placed on edge weights
    }

    // Place preferences on the diagonal of S
    p = getPreference( S, opts.preference );
    for ( var i = 0; i < n; i++ ) {
      S[i * n + i] = p;
    }
    
    // Initialize R responsibility matrix
    R = new Array(n2);
    for ( var i = 0; i < n2; i++ ) {
      R[i] = 0.0;
    }
    
    // Initialize A availability matrix
    A = new Array(n2);
    for ( var i = 0; i < n2; i++ ) {
      A[i] = 0.0;
    }

    //printMatrix(S);
    //debugger;

    return clusters;
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
