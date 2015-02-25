// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var plugin = require('../plugin.js');
var utils = require('../../utils.js');
var renderer = require('./renderer.js');

/**
 * Gutter plugin.
 */
var Gutter = function() {
    plugin.PluginBase.call(this);
    this.on('load', this._handle_load, this);
    this.on('unload', this._handle_unload, this);

    // Create a gutter_width property that is adjustable.
    this._gutter_width = 50;
    var that = this;
    this.property('gutter_width', function() {
        return that._gutter_width;
    }, utils.proxy(this._set_width, this));
    this.property('renderer', function() {
        return that._renderer;
    });
};
utils.inherit(Gutter, plugin.PluginBase);

/**
 * Sets the gutter's width.
 * @param {integer} value - width in pixels
 */
Gutter.prototype._set_width = function(value) {
    if (this._gutter_width !== value) {
        if (this.loaded) {
            this.poster.view.row_renderer.margin_left += value - this._gutter_width;
        }
        this._gutter_width = value;
        this.trigger('changed');
    }
};

/**
 * Handles when the plugin is loaded.
 */
Gutter.prototype._handle_load = function() {
    this.poster.view.row_renderer.margin_left += this._gutter_width;
    this._renderer = new renderer.GutterRenderer(this);
    this.register_renderer(this._renderer);
};

/**
 * Handles when the plugin is unloaded.
 */
Gutter.prototype._handle_unload = function() {
    // Remove all listeners to this plugin's changed event.
    this._renderer.unregister();
    this.poster.view.row_renderer.margin_left -= this._gutter_width;
};

exports.Gutter = Gutter;
