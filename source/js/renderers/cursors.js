// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var animator = require('../animator.js');
var utils = require('../utils.js');
var renderer = require('./renderer.js');

/**
 * Render document cursors
 *
 * TODO: Only render visible.
 */
var CursorsRenderer = function(cursors, style, row_renderer, has_focus) {
    renderer.RendererBase.call(this);
    this.style = style;
    this._has_focus = has_focus;
    this._cursors = cursors;
    this._get_visible_rows = utils.proxy(row_renderer.get_visible_rows, row_renderer);
    this._get_row_height = utils.proxy(row_renderer.get_row_height, row_renderer);
    this._get_row_top = utils.proxy(row_renderer.get_row_top, row_renderer);
    this._measure_partial_row = utils.proxy(row_renderer.measure_partial_row_width, row_renderer);
    this._blink_animator = new animator.Animator(1000);
    this._fps = 30;

    // Start the cursor rendering clock.
    this._render_clock();
    this._last_rendered = null;
};
utils.inherit(CursorsRenderer, renderer.RendererBase);

/**
 * Render to the canvas
 * Note: This method is called often, so it's important that it's
 * optimized for speed.
 * @return {null}
 */
CursorsRenderer.prototype.render = function() {
    // Frame limit the rendering.
    if (Date.now() - this._last_rendered < 1000/this._fps) {
        return;
    }
    this._canvas.clear();

    // Only render if the canvas has focus.
    if (this._has_focus()) {
        var that = this;
        this._cursors.cursors.forEach(function(cursor) {
            // Get the visible rows.
            var visible_rows = that._get_visible_rows();

            // If a cursor doesn't have a position, render it at the
            // beginning of the document.
            var row_index = cursor.primary_row || 0;
            var char_index = cursor.primary_char || 0;
            
            // Draw the cursor.
            if (visible_rows.top_row <= row_index && row_index <= visible_rows.bottom_row) {
                that._canvas.draw_rectangle(
                    char_index === 0 ? 0 : that._measure_partial_row(row_index, char_index), 
                    that._get_row_top(row_index), 
                    1, 
                    that._get_row_height(row_index), 
                    {
                        fill_color: 'red',
                        alpha: Math.max(0, Math.sin(Math.PI * that._blink_animator.time())),
                    }
                );
            }
        });
    }
    this._last_rendered = Date.now();
};

/**
 * Clock for rendering the cursor.
 * @return {null}
 */
CursorsRenderer.prototype._render_clock = function() {
    // If the canvas is focused, redraw.
    if (this._has_focus()) {
        this._was_focused = true;
        this.render();
        // Tell parent layer this one has changed.
        this.trigger('changed');

    // The canvas isn't focused.  If this is the first time
    // it hasn't been focused, render again without the 
    // cursors.
    } else if (this._was_focused) {
        this._was_focused = false;
        this.render();
        // Tell parent layer this one has changed.
        this.trigger('changed');
    }

    // Timer.
    setTimeout(utils.proxy(this._render_clock, this), 1000 / this._fps);
};

// Exports
exports.CursorsRenderer = CursorsRenderer;
