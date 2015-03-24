// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

import utils = require('../utils/utils');
import pluginbase = require('./plugin');
import gutter = require('./gutter/gutter');
import linenumbers = require('./linenumbers/linenumbers');

/**
 * Plugin manager class
 */
export class PluginManager extends utils.PosterClass {
    private _poster;
    private _internal_plugins;
    private _plugins;

    constructor(poster) {
        super();
        this._poster = poster;
        this._plugins = [];

        // Populate built-in plugin list.
        this._internal_plugins = {};
        this._internal_plugins.gutter = gutter.Gutter;
        this._internal_plugins.linenumbers = linenumbers.LineNumbers;
    }

    get plugins() {
        return [].concat(this._plugins);
    }

    /**
     * Loads a plugin
     * @param  {string or PluginBase} plugin
     * @returns {boolean} success
     */
    load(plugin) {
        if (!(plugin instanceof pluginbase.PluginBase)) {
            var plugin_class = this._internal_plugins[plugin];
            if (plugin_class !== undefined) {
                plugin = new plugin_class();
            }
        }

        if (plugin instanceof pluginbase.PluginBase) {
            this._plugins.push(plugin);
            plugin._load(this, this._poster);
            return true;
        }
        return false;
    }

    /**
     * Unloads a plugin
     * @param  {PluginBase} plugin
     * @returns {boolean} success
     */
    unload(plugin) {
        var index = this._plugins.indexOf(plugin);
        if (index != -1) {
            this._plugins.splice(index, 1);
            plugin._unload();
            return true;
        }
        return false;
    }

    /**
     * Finds the instance of a plugin.
     * @param  {string or type} plugin_class - name of internal plugin or plugin class
     * @return {array} of plugin instances
     */
    find(plugin_class) {
        if (this._internal_plugins[plugin_class] !== undefined) {
            plugin_class = this._internal_plugins[plugin_class];
        }

        var found = [];
        for (var i = 0; i < this._plugins.length; i++) {
            if (this._plugins[i] instanceof plugin_class) {
                found.push(this._plugins[i]);
            }
        }
        return found;
    }
}
