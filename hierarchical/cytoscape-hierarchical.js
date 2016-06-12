;(function(){ 'use strict';

  // Implemented from the reference library: https://harthur.github.io/clusterfck/

  var defaults = {
    distance: 'euclidean',
    linkage: 'single',
    threshold: '10',
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
    euclidean: function ( node, node2, attributes ) {
      var total = 0;
      for ( var dim = 0; dim < attributes.length; dim++ ) {
        total += Math.pow( attributes[dim](node) - attributes[dim](node2), 2 );
      }
      return Math.sqrt(total);
    },
    manhattan: function ( node, node2, attributes ) {
      var total = 0;
      for ( var dim = 0; dim < attributes.length; dim++ ) {
        total += Math.abs( attributes[dim](node) - attributes[dim](node2) );
      }
      return total;
    },
    max: function ( node, node2, attributes ) {
      var max = 0;
      for ( var dim = 0; dim < attributes.length; dim++ ) {
        max = Math.max( max, Math.abs( attributes[dim](node) - attributes[dim](node2) ) );
      }
      return max;
    }
  };

  var mergeClosest = function( clusters, index, dists, mins, opts ) {

  };

  var hierarchical = function( options ){
    var cy    = this.cy();
    var nodes = this.nodes();
    var node  = null;
    var opts  = {};

    // Set parameters of algorithm: # of clusters, distance metric, etc.
    setOptions( opts, options );

    // Begin hierarchical algorithm
    var clusters = new Array(opts.k);
    var dists    = [];
    var mins     = [];
    var index    = [];

    // In agglomerative (bottom-up) version, each node starts as its own cluster.
    for (var n = 0; n < nodes.length; n++) {
      var cluster = {
        value: nodes[n],
        key:   n,
        index: n,
        size:  1
      };
      clusters[n] = cluster;
      index[n]    = cluster;
      dists[n]    = [];
      mins[n]     = 0;
    }

    // Initiate distance matrix
    for (var i = 0; i < clusters.length; i++) {
      for (var j = 0; j <= i; j++) {
        var dist = (i == j) ? Infinity : distances[opts.distance]( clusters[i].value, clusters[j].value, opts.attributes );
        dists[i][j] = dist;
        dists[j][i] = dist;

        if (dist < dists[i][mins[i]]) {
          mins[i] = j;
        }
      }
    }

    var merged = mergeClosest( clusters, index, dists, mins, opts );
    while ( merged ) {
      merged = mergeClosest( clusters, index, dists, mins, opts );
    }
    
    clusters.forEach( function( cluster ) {
      // Clean up meta data used for clustering
      delete cluster.key;
      delete cluster.index;
    });

    return clusters;
  };

  // registers the extension on a cytoscape lib ref
  var register = function( cytoscape ){

    if( !cytoscape ){ return; } // can't register if cytoscape unspecified

    // main entry point
    cytoscape( 'collection', 'hierarchical', hierarchical );

  };

  if( typeof module !== 'undefined' && module.exports ){ // expose as a commonjs module
    module.exports = register;
  }

  if( typeof define !== 'undefined' && define.amd ){ // expose as an amd/requirejs module
    define('cytoscape-hierarchical', function(){
      return register;
    });
  }

  if( typeof cytoscape !== 'undefined' ){ // expose to global cytoscape (i.e. window.cytoscape)
    register( cytoscape );
  }

})();
