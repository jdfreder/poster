// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
import scrolling_canvas = require('./draw/scrolling_canvas');
import canvas = require('./draw/canvas');
import document_controller = require('./document_controller');
import document_model = require('./document_model');
import document_view = require('./document_view');
import pluginmanager = require('./plugins/manager');
import plugin = require('./plugins/plugin');
import renderer = require('./draw/renderers/renderer');
import style = require('./styles/style');
import utils = require('./utils/utils');
import config_mod = require('./utils/config');
import prism = require('prismjs');
var config = config_mod.config;

/**
 * Canvas based text editor
 */
class Poster extends utils.PosterClass {
    public canvas;
    public el;
    public model;
    public controller;
    public view;
    public plugins;
    
    private _style;

    constructor() {
        super();

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
            },
            (x, y) => this.controller.clipboard.set_position(x, y)
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
declare var window: any;
window.poster = {
    Poster: Poster,
    Canvas: plugin.PluginBase,
    PluginBase: plugin.PluginBase,
    RendererBase: renderer.RendererBase,
    utils: utils
};

// Expose prism so the user can load custom language files.
window.Prism = prism;
