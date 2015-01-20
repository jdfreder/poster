// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('../utils.js');
var renderer = require('./renderer.js');

/**
 * Groups multiple renderers
 * @param {array} renderers - array of renderers
 * @param {Canvas} canvas
 */
var BatchRenderer = function(renderers, canvas) {
    renderer.RendererBase.call(this, canvas);
    this._render_lock = false;
    this._renderers = renderers;

    // Listen to the layers, if one layer changes, recompose
    // the full image by copying them all again.
    var that = this;
    this._renderers.forEach(function(renderer) {
        renderer.on('changed', function() {
            that._copy_renderers();
        });
    });
    
    // Create properties.
    this.property('width', function() {
        return that._canvas.width;
    }, function(value) {
        that._canvas.width = value;
        that._renderers.forEach(function(renderer) {
            renderer.width = value;
        });
    });
    this.property('height', function() {
        return that._canvas.height;
    }, function(value) {
        that._canvas.height = value;
        that._renderers.forEach(function(renderer) {
            renderer.height = value;
        });
    });
};
utils.inherit(BatchRenderer, renderer.RendererBase);

/**
 * Adds a renderer
 */
BatchRenderer.prototype.add_renderer = function(renderer) {
    var that = this;
    this._renderers.push(renderer);
    renderer.on('changed', function() {
        that._copy_renderers();
    });
};

/**
 * Removes a renderer
 */
BatchRenderer.prototype.remove_renderer = function(renderer) {
    var index = this._renderers.indexOf(renderer);
    if (index !== -1) {
        this._renderers.splice(index, 1);
        renderer.off('changed');
    }
};

/**
 * Render to the canvas
 * @param {dictionary} (optional) scroll - How much the canvas was scrolled.  This
 *                     is a dictionary of the form {x: float, y: float}
 * @return {null}
 */
BatchRenderer.prototype.render = function(scroll) {
    if (!this._render_lock) {
        try {
            this._render_lock = true;

            var that = this;
            this._renderers.forEach(function(renderer) {

                // Apply the rendering coordinate transforms of the parent.
                if (!renderer.options.parent_independent) {
                    renderer._canvas._tx = utils.proxy(that._canvas._tx, that._canvas);
                    renderer._canvas._ty = utils.proxy(that._canvas._ty, that._canvas);
                }
            });

            this._renderers.forEach(function(renderer) {
                 // Tell the renderer to render itself.
                renderer.render(scroll);
            });

            // Copy the results to self.
            this._copy_renderers();
        } finally {
            this._render_lock = false;
        }
    }
};

/**
 * Copies all the renderer layers to the canvas.
 * @return {null}
 */
BatchRenderer.prototype._copy_renderers = function() {
    var that = this;
    this._canvas.clear();
    this._renderers.forEach(function(renderer) {
        that._copy_renderer(renderer);
    });
};

/**
 * Copy a renderer to the canvas.
 * @param  {RendererBase} renderer
 * @return {null}
 */
BatchRenderer.prototype._copy_renderer = function(renderer) {
    this._canvas.draw_image(
        renderer._canvas, 
        this.left, 
        this.top, 
        this._canvas.width, 
        this._canvas.height);
};

// Exports
exports.BatchRenderer = BatchRenderer;
