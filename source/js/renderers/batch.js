// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('../utils.js');
var renderer = require('./renderer.js');

/**
 * Groups multiple renderers
 * @param {Canvas} canvas instance
 * @param {array} (optional) renderers - array of renderers
 */
var BatchRenderer = function(canvas, renderers) {
    renderer.RendererBase.call(this, canvas);
    this.renderers = renderers || [];
};
utils.inherit(BatchRenderer, renderer.RendererBase);

/**
 * Render to the canvas
 * @return {null}
 */
BatchRenderer.prototype.render = function() {
    this.renderers.forEach(function(renderer) {
        renderer.render();
    });
};

// Exports
exports.BatchRenderer = BatchRenderer;
