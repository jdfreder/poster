// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('./utils.js');

/**
 * Superset
 */
var Superset = function() {
    utils.PosterClass.call(this);
    this.array = [];
};
utils.inherit(Superset, utils.PosterClass);

/**
 * Set the state of a region.
 * @param {integer} start - index, inclusive
 * @param {integer} stop - index, inclusive
 * @param {object} state
 */
Superset.prototype.set = function(start, stop, state) {
    this._set(start, stop, state, 0);
    this._clean();
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
    for (; index < this.array.length; index++) {
        var s = this.array[index][0];
        var e = this.array[index][1];
        var old_state = this.array[index][2];
        if (ns <= e && ne >= s) {
            this.array[index++] = [Math.max(s, ns), Math.min(e, ne), state];
            this.array.splice(index++, 0, [s, ns - 1, old_state]);
            this.array.splice(index++, 0, [ne + 1, e, old_state]);
            this._set(ns, s - 1, state, index);
            this._set(e + 1, ne, state, index);
            return;
        }
    }

    // Doesn't intersect with anything.
    this.array.push([ns, ne, state]);
};

/**
 * Joins consequtive states.
 */
Superset.prototype._clean = function() {

    // Remove invalid entries.
    this.array = this.array.filter(function(a) {
        return (a[0] <= a[1]);
    });

    // Sort.
    this.array.sort(function (a, b) {
        return a[0] - b[0];
    });

    // Join consequtive.
    for (var i = 0; i < this.array.length - 1; i++) {
        if (this.array[i][1] === this.array[i+1][0]-1 && this.array[i][2] === this.array[i+1][2]) {
            this.array[i][1] = this.array[i+1][1];
            this.array.splice(i+1, 1);
            i--;
        }
    }
};

exports.Superset = Superset;
