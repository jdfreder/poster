// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

import canvas = require('../canvas');
import utils = require('../utils');

/**
 * Renders to a canvas
 * @param {Canvas} default_canvas
 */
export class RendererBase extends utils.PosterClass {
    public options;

    protected _canvas;

    constructor(default_canvas?, options?) {
        super();
        this.options = options || {};
        this._canvas = default_canvas ? default_canvas : new canvas.Canvas();
    }

    get width() {
        return this._canvas.width;
    }
    set width(value) {
        this._canvas.width = value;
    }
    
    get height() {
        return this._canvas.height;
    }
    set height(value) {
        this._canvas.height = value;
    }
    
    get top() {
        return -this._canvas._ty(0);
    }

    get left() {
        return -this._canvas._tx(0);
    }

    /**
     * Render to the canvas
     * @param {dictionary} (optional) scroll - How much the canvas was scrolled.  This
     *                     is a dictionary of the form {x: float, y: float}
     * @return {null}
     */
    render(scroll?) {
        throw new Error('Not implemented');
    }
}
