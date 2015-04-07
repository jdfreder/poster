// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

import utils = require('../utils/utils');
import pluginbase = require('./plugin');
import gutter = require('./gutter/gutter');
import linenumbers = require('./linenumbers/linenumbers');
import iposter = require('../i_poster');
import generics = require('../utils/generics');

/**
 * Plugin manager class
 */
export class PluginManager extends utils.PosterClass {
    private _poster: iposter.IPoster;
    private _internal_plugins: generics.IDictionary<generics.IClass<any>>;
    private _plugins: pluginbase.PluginBase[];

    constructor(poster: iposter.IPoster) {
        super();
        this._poster = poster;
        this._plugins = [];

        // Populate built-in plugin list.
        this._internal_plugins = {};
        this._internal_plugins['gutter'] = gutter.Gutter;
        this._internal_plugins['linenumbers'] = linenumbers.LineNumbers;
        this.load(gutter.Gutter); // TODO: Remove me.
    }

    /**
     * Get a readonly copy of the loaded plugins.
     */
    get plugins(): pluginbase.PluginBase[] {
        return [].concat(this._plugins);
    }

    /**
     * Loads a plugin
     * @returns success
     */
    load(plugin: string): boolean;
    load(plugin: pluginbase.PluginBase): boolean;
    load(plugin: any): boolean {
        if (!(plugin instanceof pluginbase.PluginBase)) {
            var plugin_class: any = this._internal_plugins[<string>plugin];
            if (plugin_class !== undefined) {
                plugin = new plugin_class();
            }
        }

        if (plugin instanceof pluginbase.PluginBase) {
            this._plugins.push(<pluginbase.PluginBase>plugin);
            (<pluginbase.PluginBase>plugin).handle_load(this, this._poster);
            return true;
        }
        return false;
    }

    /**
     * Unloads a plugin
     * @returns success
     */
    unload(plugin: pluginbase.PluginBase): boolean {
        var index: number = this._plugins.indexOf(plugin);
        if (index != -1) {
            this._plugins.splice(index, 1);
            plugin.handle_unload();
            return true;
        }
        return false;
    }

    /**
     * Finds the instance of a plugin.
     * @param  {string or type} plugin_class - name of internal plugin or plugin class
     * @return {array} of plugin instances
     */
    find(plugin_class: string);
    find(plugin_class: generics.IClass<any>);
    find(plugin_class: any): pluginbase.PluginBase[] {
        if (this._internal_plugins[plugin_class] !== undefined) {
            plugin_class = this._internal_plugins[plugin_class];
        }

        var found: pluginbase.PluginBase[] = [];
        for (var i: number = 0; i < this._plugins.length; i++) {
            if (this._plugins[i] instanceof plugin_class) {
                found.push(this._plugins[i]);
            }
        }
        return found;
    }
}
