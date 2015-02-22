// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('../utils.js');
var renderer = require('./renderer.js');
var config = require('../config.js');
config = config.config;

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
            var rendered_region = renderer._canvas.rendered_region;
            that._copy_renderers(rendered_region);
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
        var rendered_region = renderer._canvas.rendered_region;
        that._copy_renderers(rendered_region);
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

            // Tell each renderer to render and keep track of the region
            // that has freshly rendered contents.
            var rendered_region = null;
            this._renderers.forEach(function(renderer) {
                 // Tell the renderer to render itself.
                renderer.render(scroll);

                var new_region = renderer._canvas.rendered_region;
                if (rendered_region===null) {
                    rendered_region = new_region;
                } else if (new_region !== null) {
                    
                    // Calculate the sum of the two dirty regions.
                    var x1 = rendered_region.x;
                    var x2 = rendered_region.x + rendered_region.width;
                    var y1 = rendered_region.y;
                    var y2 = rendered_region.y + rendered_region.height;
                    
                    x1 = Math.min(x1, new_region.x);
                    x2 = Math.max(x2, new_region.x + new_region.width);
                    y1 = Math.min(y1, new_region.y);
                    y2 = Math.max(y2, new_region.y + new_region.height);
                    
                    rendered_region.x = x1;
                    rendered_region.y = y1;
                    rendered_region.width = x2 - x1;
                    rendered_region.height = y2 - y1;
                }
            });

            // Copy the results to self.
            this._copy_renderers(rendered_region);
        } finally {
            this._render_lock = false;
        }
    }
};

/**
 * Copies all the renderer layers to the canvas.
 * @return {null}
 */
BatchRenderer.prototype._copy_renderers = function(region) {
    var that = this;
    this._canvas.clear(region);
    this._renderers.forEach(function(renderer) {
        that._copy_renderer(renderer, region);
    });

    // Debug, higlight blit region.
    if (region && config.highlight_blit) {
        this._canvas.draw_rectangle(region.x, region.y, region.width, region.height, {color: utils.random_color()});
    }
};

/**
 * Copy a renderer to the canvas.
 * @param  {RendererBase} renderer
 * @param  {object} (optional) region 
 */
BatchRenderer.prototype._copy_renderer = function(renderer, region) {
    if (region) {

        // Copy a region.
        this._canvas.draw_image(
            renderer._canvas, 
            region.x, region.y, region.width, region.height,
            region);

    } else {

        // Copy the entire image.
        this._canvas.draw_image(
            renderer._canvas, 
            this.left, 
            this.top, 
            this._canvas.width, 
            this._canvas.height);   
    }
};

// Exports
exports.BatchRenderer = BatchRenderer;
