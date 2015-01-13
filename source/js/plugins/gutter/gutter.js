// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var renderer = require('../../renderers/renderer.js');
var plugin = require('../plugin.js');
var utils = require('../../utils.js');

/**
 * Renderers the gutter.
 */
var GutterRenderer = function(gutter) {
    renderer.RendererBase.call(this, undefined, {parent_independent: true});
    this._gutter  = gutter;
    this._gutter.on('changed', this._render, this);
    this._gutter.poster.on('resized', this._render, this);
    this._hovering = false;
};
utils.inherit(GutterRenderer, renderer.RendererBase);

/**
 * Handles rendering
 * Only re-render when scrolled horizontally.
 */
GutterRenderer.prototype.render = function(scroll) {
    // Scrolled right xor hovering
    var left = this._gutter.poster.canvas.scroll_left;
    if ((left > 0) ^ this._hovering) {
        this._hovering = left > 0;
        this._render();
    }
};

/**
 * Renders the gutter
 */
GutterRenderer.prototype._render = function() {
    this._canvas.clear();
    var width = this._gutter.gutter_width;
    this._canvas.draw_rectangle(
        0, 0, width, this.height, 
        {
            fill_color: this._gutter.poster.style.gutter,
        }
    );

    // If the gutter is hovering over content, draw a drop shadow.
    if (this._hovering) {
        this._canvas.draw_line(
            width, 0, width, this.height, 
            {
                color: this._gutter.poster.style.gutter_text,
                line_width: 1,
            }
        );

    }
};

/**
 * Unregister the event listeners
 * @param  {Poster} poster
 * @param  {Gutter} gutter
 */
GutterRenderer.prototype.unregister = function() {
    this._gutter.off('changed', this._render);
    this._gutter.poster.off('resized', this._render);
};

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
    }, function(value) {
        if (that.loaded) {
            this.poster.view.row_renderer.margin_left += value - this._gutter_width;
        }
        that._gutter_width = value;
        that.trigger('changed');
    });
};
utils.inherit(Gutter, plugin.PluginBase);

/**
 * Handles when the plugin is loaded.
 */
Gutter.prototype._handle_load = function() {
    this.poster.view.row_renderer.margin_left += this._gutter_width;
    this._renderer = new GutterRenderer(this);
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
