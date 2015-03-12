// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

import * as utils from '../utils.js';
import * as renderer from './renderer.js';

/**
 * Renders to a canvas
 * @param {Canvas} default_canvas
 */
export class ColorRenderer extends renderer.RendererBase {
    constructor() {
        // Create with the option 'parent_independent' to disable
        // parent coordinate translations from being applied by 
        // a batch renderer.
        super.constructor(undefined, {parent_independent: true});
        this._rendered = false;   
    }

    get width() {
        return this._canvas.width;
    }
    set width(value) {
        this._canvas.width = value;
        this._render();

        // Tell parent layer this one has changed.
        this.trigger('changed');
    }

    get height() {
        return this._canvas.height;
    }
    set height(value) {
        this._canvas.height = value;
        this._render();

        // Tell parent layer this one has changed.
        this.trigger('changed');
    }

    get color() {
        return this._color;
    }
    set color(value) {
        this._color = value;
        this._render();

        // Tell parent layer this one has changed.
        this.trigger('changed');
    }

    /**
     * Render to the canvas
     * @param {dictionary} (optional) scroll - How much the canvas was scrolled.  This
     *                     is a dictionary of the form {x: float, y: float}
     * @return {null}
     */
    render(scroll) {
        if (!this._rendered) {
            this._render();
            this._rendered = true;
        }
    }

    /**
     * Render a frame.
     * @return {null}
     */
    _render() {
        this._canvas.clear();
        this._canvas.draw_rectangle(0, 0, this._canvas.width, this._canvas.height, {fill_color: this._color});
    }
}
