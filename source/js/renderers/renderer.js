// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var canvas = require('../canvas.js');
var utils = require('../utils.js');

/**
 * Renders to a canvas
 * @param {Canvas} default_canvas
 */
var RendererBase = function(default_canvas) {
    utils.PosterClass.call(this);
    this._canvas = default_canvas ? default_canvas : new canvas.Canvas();
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
