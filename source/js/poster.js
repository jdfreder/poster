// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var scrolling_canvas = require('./scrolling_canvas.js');
var canvas = require('./canvas.js');
var document_controller = require('./document_controller.js');
var document_model = require('./document_model.js');
var document_view = require('./document_view.js');
var pluginmanager = require('./plugins/manager.js');
var plugin = require('./plugins/plugin.js');
var renderer = require('./renderers/renderer.js');
var style = require('./style.js');
var utils = require('./utils.js');
var config = require('./config.js');
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
