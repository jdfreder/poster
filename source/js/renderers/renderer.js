// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('../utils.js');

/**
 * Renders to a canvas
 * @param {[type]} canvas
 */
var RendererBase = function(canvas) {
    utils.PosterClass.call(this);
    this._canvas = canvas;
};
utils.inherit(RendererBase, utils.PosterClass);

/**
 * Render to the canvas
 * @return {null}
 */
RendererBase.prototype.render = function() {
    throw new Error('Not implemented');
};

// Exports
exports.RendererBase = RendererBase;
