// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('../utils.js');

/**
 * Plugin base class
 */
var PluginBase = function() {
    utils.PosterClass.call(this);
    this._renderers = [];
    this.loaded = false;

    // Properties
    this._poster = null;
    var that = this;
    this.property('poster', function() {
        return that._poster;
    });
};
utils.inherit(PluginBase, utils.PosterClass);

/**
 * Loads the plugin
 */
PluginBase.prototype._load = function(manager, poster) {
    this._poster = poster;
    this._manager = manager;
    this.loaded = true;

    this.trigger('load');
};

/**
 * Unloads this plugin
 */
PluginBase.prototype.unload = function() {
    this._manager.unload(this);
};

/**
 * Trigger unload event
 */
PluginBase.prototype._unload = function() {
    // Unregister all renderers.
    for (var i = 0; i < this._renderers.length; i++) {
        this._unregister_renderer(this._renderers[i]);
    }
    this.loaded = false;
    this.trigger('unload');
};

/**
 * Registers a renderer
 * @param  {RendererBase} renderer
 */
PluginBase.prototype.register_renderer = function(renderer) {
    this._renderers.push(renderer);
    this.poster.view.add_renderer(renderer);
};

/**
 * Unregisters a renderer and removes it from the internal list.
 * @param  {RendererBase} renderer
 */
PluginBase.prototype.unregister_renderer = function(renderer) {
    var index = this._renderers.indexOf(renderer);
    if (index !== -1) {
        this._renderers.splice(index, 1);
    }

    this._unregister_renderer(renderer);
};

/**
 * Unregisters a renderer
 * @param  {RendererBase} renderer
 */
PluginBase.prototype._unregister_renderer = function(renderer) {
    this.poster.view.remove_renderer(renderer);
};

exports.PluginBase = PluginBase;
