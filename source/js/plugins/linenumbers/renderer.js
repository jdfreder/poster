// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var renderer = require('../../renderers/renderer.js');
var utils = require('../../utils.js');

/**
 * Renderers the line numbers.
 */
var LineNumbersRenderer = function(plugin) {
    renderer.RendererBase.call(this, undefined, {parent_independent: true});
    this._plugin  = plugin;
    this._top = 0;

    // Find gutter plugin, listen to its change event.
    var manager = this._plugin.poster.plugins;
    this._gutter = manager.find('gutter')[0];
    this._gutter.on('changed', this._render, this);
};
utils.inherit(LineNumbersRenderer, renderer.RendererBase);

/**
 * Handles rendering
 * Only re-render when scrolled vertically.
 */
LineNumbersRenderer.prototype.render = function(scroll) {
    // Scrolled right xor hovering
    var top = this._gutter.poster.canvas.scroll_top;
    if (this._top !== top) {
        this._top = top;
        this._render();
    }
};

/**
 * Renders the line numbers
 */
LineNumbersRenderer.prototype._render = function() {
    this._canvas.clear();
    // TODO
};

/**
 * Unregister the event listeners
 * @param  {Poster} poster
 * @param  {Gutter} gutter
 */
LineNumbersRenderer.prototype.unregister = function() {
    this._gutter.off('changed', this._render);
};

exports.LineNumbersRenderer = LineNumbersRenderer;
