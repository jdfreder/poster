// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var animator = require('../animator.js');
var utils = require('../utils.js');
var renderer = require('./renderer.js');

/**
 * Render the text rows of a DocumentModel.
 * @param {Canvas} canvas instance
 * @param {DocumentModel} model instance
 */
var CursorsRenderer = function(canvas, cursors, style, get_row_height, get_row_top, measure_partial_row) {
    renderer.RendererBase.call(this, canvas);
    this.style = style;
    this._cursors = cursors;
    this._get_row_height = get_row_height;
    this._get_row_top = get_row_top;
    this._measure_partial_row = measure_partial_row;
    this._blink_animator = new animator.Animator(1000);
    this._fps = 100;

    // Start the cursor rendering clock.
    this._render_clock();
};
utils.inherit(CursorsRenderer, renderer.RendererBase);

/**
 * Render to the canvas
 * Note: This method is called often, so it's important that it's
 * optimized for speed.
 * @return {null}
 */
CursorsRenderer.prototype.render = function() {
    // Only render if the canvas has focus.
    if (this._canvas.focused) {
        var that = this;
        this._cursors.cursors.forEach(function(cursor) {

            // If a cursor doesn't have a position, render it at the
            // beginning of the document.
            var row_index = cursor._start_row || 0;
            var char_index = cursor._start_char || 0;

            // Draw the cursor.
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

            // Draw the selection box.
            for (var i = cursor._start_row; i <= cursor._end_row; i++) {

                var left = 0;
                if (i == cursor._start_row && cursor._start_char > 0) {
                    left = that._measure_partial_row(i, cursor._start_char);
                }

                that._canvas.draw_rectangle(
                    left, 
                    that._get_row_top(i), 
                    i !== cursor._end_row ? that._measure_partial_row(i) - left : that._measure_partial_row(i, cursor._end_char) - left, 
                    that._get_row_height(i), 
                    {
                        fill_color: 'skyblue',
                        alpha: 0.5,
                    }
                );

            }
        });
    }
};

/**
 * Clock for rendering the cursor.
 * @return {null}
 */
CursorsRenderer.prototype._render_clock = function() {
    // If the canvas is focused, redraw.
    if (this._canvas.focused) {
        this._was_focused = true;
        this._canvas.redraw();

    // The canvas isn't focused.  If this is the first time
    // it hasn't been focused, render again without the 
    // cursors.
    } else if (this._was_focused) {
        this._was_focused = false;
        this._canvas.redraw();
    }

    // 100 FPS
    setTimeout(utils.proxy(this._render_clock, this), 1000 / this._fps); 
};

// Exports
exports.CursorsRenderer = CursorsRenderer;
