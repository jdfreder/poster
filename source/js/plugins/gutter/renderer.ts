// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
import renderer = require('../../renderers/renderer');
import utils = require('../../utils');

/**
 * Renderers the gutter.
 */
export class GutterRenderer extends renderer.RendererBase {
    private _gutter;
    private _hovering;

    constructor(gutter) {
        super(undefined, {parent_independent: true});
        this._gutter  = gutter;
        this._gutter.on('changed', () => {
            this._render();
            this.trigger('changed');
        });
        this._hovering = false;
    }

    /**
     * Handles rendering
     * Only re-render when scrolled horizontally.
     */
    render(scroll) {
        // Scrolled right xor hovering
        var left = this._gutter.poster.canvas.scroll_left;
        if ((left > 0) !== this._hovering) {
            this._hovering = left > 0;
            this._render();
        }
    }

    /**
     * Renders the gutter
     */
    _render() {
        this._canvas.clear();
        var width = this._gutter.gutter_width;
        this._canvas.draw_rectangle(
            0, 0, width, this.height, 
            {
                fill_color: this._gutter.poster.style.gutter,
            }
        );

        // If the gutter is hovering over content, draw a drop shadow.
        if (this._hovering) {
            var shadow_width = 15;
            var gradient = this._canvas.gradient(
                width, 0, width+shadow_width, 0, this._gutter.poster.style.gutter_shadow ||
                [
                    [0, 'black'], 
                    [1, 'transparent']
                ]);
            this._canvas.draw_rectangle(
                width, 0, shadow_width, this.height, 
                {
                    fill_color: gradient,
                    alpha: 0.35,
                }
            );

        }
    }

    /**
     * Unregister the event listeners
     * @param  {Poster} poster
     * @param  {Gutter} gutter
     */
    unregister() {
        this._gutter.off('changed', this._render);
    }
}
