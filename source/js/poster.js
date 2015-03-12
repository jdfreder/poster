// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
import * as scrolling_canvas from './scrolling_canvas.js';
import * as canvas from './canvas.js';
import * as document_controller from './document_controller.js';
import * as document_model from './document_model.js';
import * as document_view from './document_view.js';
import * as pluginmanager from './plugins/manager.js';
import * as plugin from './plugins/plugin.js';
import * as renderer from './renderers/renderer.js';
import * as style from './style.js';
import * as utils from './utils.js';
import * as config from './config.js';
config = config.config;

/**
 * Canvas based text editor
 */
class Poster extends utils.PosterClass {
    constructor() {
        super.constructor();

        // Create canvas
        this.canvas = new scrolling_canvas.ScrollingCanvas();
        this.el = this.canvas.el; // Convenience
        this._style = new style.Style();

        // Create model, controller, and view.
        this.model = new document_model.DocumentModel();
        this.controller = new document_controller.DocumentController(this.canvas.el, this.model);
        this.view = new document_view.DocumentView(
            this.canvas, 
            this.model, 
            this.controller.cursors, 
            this._style,
            () => { 
                return this.controller.clipboard.hidden_input === document.activeElement 
                    || this.canvas.focused; 
            }
        );

        // Load plugins.
        this.plugins = new pluginmanager.PluginManager(this);
        this.plugins.load('gutter');
        this.plugins.load('linenumbers');
    }

    get style() {
        return this._style;
    }

    get config() {
        return config;
    }

    get value() {
        return this.model.text;
    }
    set value(value) {
        this.model.text = value;
    }

    get width() {
        return this.view.width;
    }
    set width(value) {
        this.view.width = value;
        this.trigger('resized');
    }

    get height() {
        return this.view.height;
    }
    set height(value) {
        this.view.height = value;
        this.trigger('resized');
    }

    get language() {
        return this.view.language;
    }
    set language(value) {
        this.view.language = value;
    }
}

// Exports
window.poster = {
    Poster: Poster,
    Canvas: plugin.PluginBase,
    PluginBase: plugin.PluginBase,
    RendererBase: renderer.RendererBase,
    utils: utils
};
