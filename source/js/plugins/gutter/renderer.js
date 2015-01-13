// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var renderer = require('../../renderers/renderer.js');
var utils = require('../../utils.js');

/**
 * Renderers the gutter.
 */
var GutterRenderer = function(gutter) {
    renderer.RendererBase.call(this, undefined, {parent_independent: true});
    this._gutter  = gutter;
    this._gutter.on('changed', this._render, this);
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
};

exports.GutterRenderer = GutterRenderer;
