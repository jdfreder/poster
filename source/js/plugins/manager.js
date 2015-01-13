// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('../utils.js');
var pluginbase = require('./plugin.js');
var gutter = require('./gutter/gutter.js');
var linenumbers = require('./linenumbers/linenumbers.js');

/**
 * Plugin manager class
 */
var PluginManager = function(poster) {
    utils.PosterClass.call(this);
    this._poster = poster;

    // Populate built-in plugin list.
    this._internal_plugins = {};
    this._internal_plugins.gutter = gutter.Gutter;
    this._internal_plugins.linenumbers = linenumbers.LineNumbers;

    // Properties
    this._plugins = [];
    var that = this;
    this.property('plugins', function() {
        return [].concat(that._plugins);
    });
};
utils.inherit(PluginManager, utils.PosterClass);

/**
 * Loads a plugin
 * @param  {string or PluginBase} plugin
 * @returns {boolean} success
 */
PluginManager.prototype.load = function(plugin) {
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
};

/**
 * Unloads a plugin
 * @param  {PluginBase} plugin
 * @returns {boolean} success
 */
PluginManager.prototype.unload = function(plugin) {
    var index = this._plugins.indexOf(plugin);
    if (index != -1) {
        this._plugins.splice(index, 1);
        plugin._unload();
        return true;
    }
    return false;
};

/**
 * Finds the instance of a plugin.
 * @param  {string or type} plugin_class - name of internal plugin or plugin class
 * @return {array} of plugin instances
 */
PluginManager.prototype.find = function(plugin_class) {
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
};

exports.PluginManager = PluginManager;
