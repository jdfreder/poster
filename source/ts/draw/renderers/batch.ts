// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

import utils = require('../../utils/utils');
import renderer = require('./renderer');
import config_mod = require('../../utils/config');
var config = config_mod.config;

/**
 * Groups multiple renderers
 * @param {array} renderers - array of renderers
 * @param {Canvas} canvas
 */
export class BatchRenderer extends renderer.RendererBase {
    private _render_lock;
    private _renderers;

    constructor(renderers, canvas) {
        super(canvas);
        this._render_lock = false;
        this._renderers = renderers;

        // Listen to the layers, if one layer changes, recompose
        // the full image by copying them all again.
        this._renderers.forEach(renderer => {
            renderer.on('changed', () => {
                var rendered_region = renderer._canvas.rendered_region;
                this._copy_renderers(rendered_region);
            });
        });
    }

    get width() {
        return this._canvas.width;
    }
    set width(value) {
        this._canvas.width = value;
        this._renderers.forEach(function(renderer) {
            renderer.width = value;
        });
    }

    get height() {
        return this._canvas.height;
    }
    set height(value) {
        this._canvas.height = value;
        this._renderers.forEach(function(renderer) {
            renderer.height = value;
        });
    }

    /**
     * Adds a renderer
     */
    add_renderer(renderer) {
        this._renderers.push(renderer);
        renderer.on('changed', () => {
            var rendered_region = renderer._canvas.rendered_region;
            this._copy_renderers(rendered_region);
        });
    }

    /**
     * Removes a renderer
     */
    remove_renderer(renderer) {
        var index = this._renderers.indexOf(renderer);
        if (index !== -1) {
            this._renderers.splice(index, 1);
            renderer.off('changed');
        }
    }

    /**
     * Render to the canvas
     * @param {dictionary} (optional) scroll - How much the canvas was scrolled.  This
     *                     is a dictionary of the form {x: float, y: float}
     * @return {null}
     */
    render(scroll) {
        if (!this._render_lock) {
            try {
                this._render_lock = true;

                this._renderers.forEach(renderer => {

                    // Apply the rendering coordinate transforms of the parent.
                    if (!renderer.options.parent_independent) {
                        renderer._canvas._tx = utils.proxy(this._canvas._tx, this._canvas);
                        renderer._canvas._ty = utils.proxy(this._canvas._ty, this._canvas);
                    }
                });

                // Tell each renderer to render and keep track of the region
                // that has freshly rendered contents.
                var rendered_region = null;
                this._renderers.forEach(renderer => {
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
    }

    /**
     * Copies all the renderer layers to the canvas.
     * @return {null}
     */
    _copy_renderers(region) {
        this._canvas.clear(region);
        this._renderers.forEach(renderer => this._copy_renderer(renderer, region));

        // Debug, higlight blit region.
        if (region && config.highlight_blit) {
            this._canvas.draw_rectangle(region.x, region.y, region.width, region.height, {color: utils.random_color()});
        }
    }

    /**
     * Copy a renderer to the canvas.
     * @param  {RendererBase} renderer
     * @param  {object} (optional) region 
     */
    _copy_renderer(renderer, region) {
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
    }
}
