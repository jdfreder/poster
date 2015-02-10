// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var renderer = require('../../renderers/renderer.js');
var utils = require('../../utils.js');
var canvas = require('../../canvas.js');

/**
 * Renderers the line numbers.
 */
var LineNumbersRenderer = function(plugin) {
    renderer.RendererBase.call(this, undefined, {parent_independent: true});
    this._plugin  = plugin;
    this._top = null;
    this._top_row = null;

    // Find gutter plugin, listen to its change event.
    var manager = this._plugin.poster.plugins;
    this._gutter = manager.find('gutter')[0];
    this._gutter.on('changed', this._gutter_resize, this);

    // Get row renderer.
    this._row_renderer = this._plugin.poster.view.row_renderer;

    // Double buffer.
    this._text_canvas = new canvas.Canvas();
    this._tmp_canvas = new canvas.Canvas();
    this._text_canvas.width = this._gutter.gutter_width;
    this._tmp_canvas.width = this._gutter.gutter_width;

    // Adjust every buffer's size when the height changes.
    var that = this;
    this.property('height', function() {
        return that._canvas.height;
    }, function(value) {
        that._canvas.height = value;

        // The text canvas should be the right height to fit all of the lines
        // that will be rendered in the base canvas.  This includes the lines
        // that are partially rendered at the top and bottom of the base canvas.
        var row_height = that._row_renderer.get_row_height();
        that._row_height = row_height;
        that._visible_row_count = Math.ceil(value/row_height) + 1;
        that._text_canvas.height = that._visible_row_count * row_height;
        that._tmp_canvas.height = that._text_canvas.height;
        that.rerender();
    });
    this.height = this.height;
};
utils.inherit(LineNumbersRenderer, renderer.RendererBase);

/**
 * Handles rendering
 * Only re-render when scrolled vertically.
 */
LineNumbersRenderer.prototype.render = function(scroll) {
    var top = this._gutter.poster.canvas.scroll_top;
    if (this._top === null || this._top !== top) {
        this._top = top;
        this._render();
    }
};

/**
 * Renders the line numbers
 */
LineNumbersRenderer.prototype._render = function() {
    // Update the text buffer if needed.
    var top_row = this._row_renderer.get_row_char(0, this._top).row_index;
    if (this._top_row !== top_row) {
        var last_top_row = this._top_row;
        this._top_row = top_row;

        // Recycle rows if possible.
        var row_scroll = this._top_row - last_top_row;
        var row_delta = Math.abs(row_scroll);
        if (this._top_row !== null && row_delta < this._visible_row_count) {

            // Get a snapshot of the text before the scroll.
            this._tmp_canvas.clear();
            this._tmp_canvas.draw_image(this._text_canvas, 0, 0);

            // Render the new rows.
            this._text_canvas.clear();
            if (this._top_row < last_top_row) {
                // Scrolled up the document (the scrollbar moved up, page down)
                this._render_rows(this._top_row, row_delta);
            } else {
                // Scrolled down the document (the scrollbar moved down, page up)
                this._render_rows(this._top_row + this._visible_row_count - row_delta, row_delta);
            }
            
            // Use the old content to fill in the rest.
            this._text_canvas.draw_image(this._tmp_canvas, 0, -row_scroll * this._row_height);
        } else {
            // Draw everything.
            this._text_canvas.clear();
            this._render_rows(this._top_row, this._visible_row_count);
        }
    }
    
    // Render the buffer at the correct offset.
    this._canvas.clear();
    this._canvas.draw_image(
        this._text_canvas,
        0, 
        this._row_renderer.get_row_top(this._top_row) - this._row_renderer.top);
};

LineNumbersRenderer.prototype.rerender = function() {
    // Draw everything.
    this._text_canvas.erase_options_cache();
    this._text_canvas.clear();
    this._render_rows(this._top_row, this._visible_row_count);

    // Render the buffer at the correct offset.
    this._canvas.clear();
    this._canvas.draw_image(
        this._text_canvas,
        0, 
        this._row_renderer.get_row_top(this._top_row) - this._row_renderer.top);
};

/**
 * Renders a set of line numbers.
 * @param  {integer} start_row
 * @param  {integer} num_rows
 */
LineNumbersRenderer.prototype._render_rows = function(start_row, num_rows) {
    for (var i = start_row; i < start_row + num_rows; i++) {
        var y = (i - this._top_row) * this._row_height;
        if (this._plugin.poster.config.highlight_draw) {
            this._text_canvas.draw_rectangle(0, y, this._text_canvas.width, this._row_height, {
                fill_color: utils.random_color(),
            });
        }

        this._text_canvas.draw_text(10, y, String(i+1), {
            font_family: 'monospace',
            font_size: 14,
            color: this._plugin.poster.style.gutter_text || 'black',
        });
    }

};

/**
 * Handles when the gutter is resized
 */
LineNumbersRenderer.prototype._gutter_resize = function() {
    this._text_canvas.width = this._gutter.gutter_width;
    this._tmp_canvas.width = this._gutter.gutter_width; 
    this._top_row = null;
    this.rerender();
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
