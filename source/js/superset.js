// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('./utils.js');

/**
 * Superset
 */
var Superset = function() {
    utils.PosterClass.call(this);
    this._array = [];
    
    var that = this;
    this.property('array', function() {
        that._clean();
        return that._array;
    });
};
utils.inherit(Superset, utils.PosterClass);

/**
 * Clears the set
 */
Superset.prototype.clear = function() {
    utils.clear_array(this._array);
};

/**
 * Set the state of a region.
 * @param {integer} start - index, inclusive
 * @param {integer} stop - index, inclusive
 * @param {object} state
 */
Superset.prototype.set = function(start, stop, state) {
    this._set(start, stop, state, 0);
};

/**
 * Set the state of a region.
 * @param {integer} start - index, inclusive
 * @param {integer} stop - index, inclusive
 * @param {object} state
 * @param {integer} integer - current recursion index
 */
Superset.prototype._set = function(start, stop, state, index) {
    // Make sure start and stop are in correct order.
    if (start > stop) {
        return;
    }
    var ns = start;
    var ne = stop;

    // Handle intersections.
    for (; index < this._array.length; index++) {
        var s = this._array[index][0];
        var e = this._array[index][1];
        var old_state = this._array[index][2];
        if (ns <= e && ne >= s) {
            this._array.splice(index, 1);
            // keep
            this._insert(index, s, ns - 1, old_state);
            // replace
            this._insert(index, Math.max(s, ns), Math.min(e, ne), state);
            // keep
            this._insert(index, ne + 1, e, old_state);
            // new
            this._set(ns, s - 1, state, index);
            this._set(e + 1, ne, state, index);
            return;
        }
    }

    // Doesn't intersect with anything.
    this._array.push([ns, ne, state]);
};

/**
 * Inserts an entry.
 * @param  {integer} index
 * @param  {integer} start
 * @param  {integer} end  
 * @param  {object} state
 */
Superset.prototype._insert = function(index, start, end, state) {
    if (start > end) return;
    this._array.splice(index, 0, [start, end, state]);
};

/**
 * Joins consequtive states.
 */
Superset.prototype._clean = function() {

    // Sort.
    this._array.sort(function (a, b) {
        return a[0] - b[0];
    });

    // Join consequtive.
    for (var i = 0; i < this._array.length - 1; i++) {
        if (this._array[i][1] === this._array[i+1][0]-1 && this._array[i][2] === this._array[i+1][2]) {
            this._array[i][1] = this._array[i+1][1];
            this._array.splice(i+1, 1);
            i--;
        }
    }
};

exports.Superset = Superset;
