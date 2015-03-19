// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
import plugin = require('../plugin');
import utils = require('../../utils');
import renderer = require('./renderer');

/**
 * Gutter plugin.
 */
export class Gutter extends plugin.PluginBase {
    private _gutter_width;
    private _renderer;
    
    constructor() {
        super();
        this.on('load', this._handle_load, this);
        this.on('unload', this._handle_unload, this);

        this._gutter_width = 50;
    }

    // Create a gutter_width property that is adjustable.
    get gutter_width() {
        return this._gutter_width;
    }
    set gutter_width(value) {
        this._set_width(value);
    }

    get renderer() {
        return this._renderer;
    }

    /**
     * Sets the gutter's width.
     * @param {integer} value - width in pixels
     */
    _set_width(value) {
        if (this._gutter_width !== value) {
            if (this.loaded) {
                this.poster.view.row_renderer.margin_left += value - this._gutter_width;
            }
            this._gutter_width = value;
            this.trigger('changed');
        }
    }

    /**
     * Handles when the plugin is loaded.
     */
    _handle_load() {
        this.poster.view.row_renderer.margin_left += this._gutter_width;
        this._renderer = new renderer.GutterRenderer(this);
        this.register_renderer(this._renderer);
    }

    /**
     * Handles when the plugin is unloaded.
     */
    _handle_unload() {
        // Remove all listeners to this plugin's changed event.
        this._renderer.unregister();
        this.poster.view.row_renderer.margin_left -= this._gutter_width;
    }
}
