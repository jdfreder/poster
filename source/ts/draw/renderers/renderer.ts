// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

import canvas = require('../canvas');
import utils = require('../../utils/utils');

/**
 * Renders to a canvas
 * @param {Canvas} default_canvas
 */
export class RendererBase extends utils.PosterClass {
    public options: any;

    protected _canvas: canvas.Canvas;

    public constructor(default_canvas?: canvas.Canvas, options?: any) {
        super();
        this._canvas = default_canvas ? default_canvas : new canvas.Canvas();
        this.options = options || {};
    }

    public get canvas(): canvas.Canvas {
        return this._canvas;
    }

    public get width(): number {
        return this._canvas.width;
    }
    public set width(value: number) {
        this._canvas.width = value;
    }
    
    public get height(): number {
        return this._canvas.height;
    }
    public set height(value: number) {
        this._canvas.height = value;
    }
    
    public get top(): number {
        return -this._canvas.ty(0);
    }

    public get left(): number {
        return -this._canvas.tx(0);
    }

    /**
     * Render to the canvas
     * @param [scroll] - How much the canvas was scrolled
     */
    public render(scroll?: canvas.IPoint): void {
        throw new Error('Not implemented');
    }
}
