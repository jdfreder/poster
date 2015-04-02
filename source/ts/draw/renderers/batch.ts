// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

import utils = require('../../utils/utils');
import renderer = require('./renderer');
import config_mod = require('../../utils/config');
import canvas = require('../canvas');
var config = config_mod.config;

/**
 * Groups multiple renderers
 * @param {array} renderers - array of renderers
 * @param {Canvas} canvas
 */
export class BatchRenderer extends renderer.RendererBase {
    private _render_lock: boolean;
    private _renderers: renderer.RendererBase[];

    public constructor(renderers, canvas) {
        super(canvas);
        this._render_lock = false;
        this._renderers = renderers;

        // Listen to the layers, if one layer changes, recompose
        // the full image by copying them all again.
        this._renderers.forEach(renderer => {
            renderer.on('changed', () => {
                var rendered_region = renderer.canvas.rendered_region;
                this._copy_renderers(rendered_region);
            });
        });
    }

    public get width(): number {
        return this._canvas.width;
    }
    public set width(value: number) {
        this._canvas.width = value;
        this._renderers.forEach(function(renderer) {
            renderer.width = value;
        });
    }

    public get height(): number {
        return this._canvas.height;
    }
    public set height(value: number) {
        this._canvas.height = value;
        this._renderers.forEach(function(renderer) {
            renderer.height = value;
        });
    }

    /**
     * Adds a renderer
     */
    public add_renderer(renderer: renderer.RendererBase): void {
        this._renderers.push(renderer);
        renderer.on('changed', () => {
            var rendered_region = renderer.canvas.rendered_region;
            this._copy_renderers(rendered_region);
        });
    }

    /**
     * Removes a renderer
     */
    public remove_renderer(renderer: renderer.RendererBase): void {
        var index = this._renderers.indexOf(renderer);
        if (index !== -1) {
            this._renderers.splice(index, 1);
            renderer.off('changed');
        }
    }

    /**
     * Render to the canvas
     * @param [scroll] - How much the canvas was scrolled.
     */
    public render(scroll?: canvas.IPoint): void {
        if (!this._render_lock) {
            try {
                this._render_lock = true;

                this._renderers.forEach(renderer => {

                    // Apply the rendering coordinate transforms of the parent.
                    if (!renderer.options.parent_independent) {
                        renderer.canvas.tx = utils.proxy(this._canvas.tx, this._canvas);
                        renderer.canvas.ty = utils.proxy(this._canvas.ty, this._canvas);
                    }
                });

                // Tell each renderer to render and keep track of the region
                // that has freshly rendered contents.
                var rendered_region: canvas.IRectangle = null;
                this._renderers.forEach(renderer => {
                     // Tell the renderer to render itself.
                    renderer.render(scroll);

                    var new_region: canvas.IRectangle = renderer.canvas.rendered_region;
                    if (rendered_region===null) {
                        rendered_region = new_region;
                    } else if (new_region !== null) {
                        
                        // Calculate the sum of the two dirty regions.
                        var x1: number = rendered_region.x;
                        var x2: number = rendered_region.x + rendered_region.width;
                        var y1: number = rendered_region.y;
                        var y2: number = rendered_region.y + rendered_region.height;
                        
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
     */
    private _copy_renderers(region: canvas.IRectangle): void {
        this._canvas.clear(region);
        this._renderers.forEach(renderer => this._copy_renderer(renderer, region));

        // Debug, higlight blit region.
        if (region && config.highlight_blit) {
            this._canvas.draw_rectangle(region.x, region.y, region.width, region.height, {color: utils.random_color()});
        }
    }

    /**
     * Copy a renderer to the canvas.
     */
    private _copy_renderer(renderer: renderer.RendererBase, region?: canvas.IRectangle) {
        if (region) {

            // Copy a region.
            this._canvas.draw_image(
                renderer.canvas, 
                region.x, region.y, region.width, region.height,
                region);

        } else {

            // Copy the entire image.
            this._canvas.draw_image(
                renderer.canvas, 
                this.left, 
                this.top, 
                this._canvas.width, 
                this._canvas.height);   
        }
    }
}
