// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

import utils = require('../utils/utils');
import generics = require('../utils/generics');
import renderer = require('../draw/renderers/base');
import iposter = require('../i_poster');
import plugin_manager = require('./manager');

/**
 * Plugin base class
 */
export class PluginBase extends utils.PosterClass {
    public loaded: boolean;

    private _renderers: renderer.RendererBase[];
    private _poster: iposter.IPoster;
    private _manager: plugin_manager.PluginManager;

    public constructor() {
        super();
        this.loaded = false;
        this._renderers = [];
        this._poster = null;
    }

    public get poster() { return this._poster; }

    /**
     * Unloads this plugin
     */
    public unload(): void {
        this._manager.unload(this);
    }

    /**
     * Registers a renderer
     */
    public register_renderer(renderer: renderer.RendererBase): void {
        this._renderers.push(renderer);
        this.poster.view.add_renderer(renderer);
    }

    /**
     * Unregisters a renderer and removes it from the internal list.
     */
    public unregister_renderer(renderer: renderer.RendererBase): void {
        var index: number = this._renderers.indexOf(renderer);
        if (index !== -1) {
            this._renderers.splice(index, 1);
        }

        this._unregister_renderer(renderer);
    }

    /**
     * Loads the plugin
     */
    public handle_load(manager: plugin_manager.PluginManager, poster: i_poster.IPoster): void {
        this._poster = poster;
        this._manager = manager;
        this.loaded = true;

        this.trigger('load');
    }

    /**
     * Trigger unload event
     */
    public handle_unload(): void {
        // Unregister all renderers.
        for (var i: number = 0; i < this._renderers.length; i++) {
            this._unregister_renderer(this._renderers[i]);
        }
        this.loaded = false;
        this.trigger('unload');
    }

    /**
     * Unregisters a renderer
     */
    private _unregister_renderer(renderer: renderer.RendererBase): void {
        this.poster.view.remove_renderer(renderer);
    }
}
