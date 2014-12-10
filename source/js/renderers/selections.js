// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var animator = require('../animator.js');
var utils = require('../utils.js');
var renderer = require('./renderer.js');

/**
 * Render document selection boxes
 *
 * TODO: Only render visible.
 */
var SelectionsRenderer = function(cursors, style, row_renderer, has_focus) {
    renderer.RendererBase.call(this);
    this.style = style;
    this._has_focus = has_focus;

    // When the cursors change, redraw the selection box(es).
    this._cursors = cursors;
    var that = this;
    this._cursors.on('change', function() {
        that.render();
        // Tell parent layer this one has changed.
        that.trigger('changed');
    });

    this._get_visible_rows = utils.proxy(row_renderer.get_visible_rows, row_renderer);
    this._get_row_height = utils.proxy(row_renderer.get_row_height, row_renderer);
    this._get_row_top = utils.proxy(row_renderer.get_row_top, row_renderer);
    this._measure_partial_row = utils.proxy(row_renderer.measure_partial_row_width, row_renderer);
};
utils.inherit(SelectionsRenderer, renderer.RendererBase);

/**
 * Render to the canvas
 * Note: This method is called often, so it's important that it's
 * optimized for speed.
 * @return {null}
 */
SelectionsRenderer.prototype.render = function() {
    this._canvas.clear();

    // Only render if the canvas has focus.
    if (this._has_focus()) {
        var that = this;
        this._cursors.cursors.forEach(function(cursor) {
            // Get the visible rows.
            var visible_rows = that._get_visible_rows();

            // Draw the selection box.
            if (cursor.start_row !== null && cursor.start_char !== null &&
                cursor.end_row !== null && cursor.end_char !== null) {
                

                for (var i = Math.max(cursor.start_row, visible_rows.top_row); 
                    i <= Math.min(cursor.end_row, visible_rows.bottom_row); 
                    i++) {

                    var left = 0;
                    if (i == cursor.start_row && cursor.start_char > 0) {
                        left = that._measure_partial_row(i, cursor.start_char);
                    }

                    that._canvas.draw_rectangle(
                        left, 
                        that._get_row_top(i), 
                        i !== cursor.end_row ? that._measure_partial_row(i) - left : that._measure_partial_row(i, cursor.end_char) - left, 
                        that._get_row_height(i), 
                        {
                            fill_color: 'skyblue',
                            alpha: 0.5,
                        }
                    );
                }
            }
        });
    }
};

// Exports
exports.SelectionsRenderer = SelectionsRenderer;
