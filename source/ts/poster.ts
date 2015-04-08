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
import iposter = require('i_poster');
var config: config_mod.Config = config_mod.config;

/**
 * Canvas based text editor
 */
class Poster extends utils.PosterClass implements iposter.IPoster {
    public canvas: scrolling_canvas.ScrollingCanvas;
    public el: HTMLDivElement;
    public model: document_model.DocumentModel;
    public controller: document_controller.DocumentController;
    public view: document_view.DocumentView;
    public plugins: pluginmanager.PluginManager;
    
    private _style: style.Style;

    public constructor() {
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

    public get style(): style.Style {
        return this._style;
    }

    public get config(): config_mod.Config {
        return config;
    }

    public get value(): string {
        return this.model.text;
    }
    public set value(value: string) {
        this.model.text = value;
    }

    public get width(): number {
        return this.view.width;
    }
    public set width(value: number) {
        this.view.width = value;
        this.trigger('resized');
    }

    public get height(): number {
        return this.view.height;
    }
    public set height(value: number) {
        this.view.height = value;
        this.trigger('resized');
    }

    public get language(): string {
        return this.view.language;
    }
    public set language(value: string) {
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
