// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

import utils = require('../../utils/utils');
import renderer = require('./renderer');
import canvas = require('../canvas');

/**
 * Renders to a canvas
 * @param {Canvas} default_canvas
 */
export class ColorRenderer extends renderer.RendererBase {
    private _rendered: boolean;
    private _color: string;

    public constructor() {
        // Create with the option 'parent_independent' to disable
        // parent coordinate translations from being applied by 
        // a batch renderer.
        super(undefined, {parent_independent: true});
        this._rendered = false;   
    }

    public get width(): number {
        return this._canvas.width;
    }
    public set width(value: number) {
        this._canvas.width = value;
        this._render();

        // Tell parent layer this one has changed.
        this.trigger('changed');
    }

    public get height(): number {
        return this._canvas.height;
    }
    public set height(value: number) {
        this._canvas.height = value;
        this._render();

        // Tell parent layer this one has changed.
        this.trigger('changed');
    }

    public get color(): string {
        return this._color;
    }
    public set color(value: string) {
        this._color = value;
        this._render();

        // Tell parent layer this one has changed.
        this.trigger('changed');
    }

    /**
     * Render to the canvas
     * @param [scroll] - How much the canvas was scrolled.
     */
    public render(scroll?: canvas.IPoint): void {
        if (!this._rendered) {
            this._render();
            this._rendered = true;
        }
    }

    /**
     * Render a frame.
     */
    private _render(): void {
        this._canvas.clear();
        this._canvas.draw_rectangle(0, 0, this._canvas.width, this._canvas.height, {fill_color: this._color});
    }
}
