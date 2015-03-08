// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var animator = require('../animator.js');
var utils = require('../utils.js');
var renderer = require('./renderer.js');
var config = require('../config.js');
config = config.config;

/**
 * Render document selection boxes
 *
 * TODO: Only render visible.
 */
export class SelectionsRenderer extends renderer.RendererBase {
    constructor(cursors, style, row_renderer, has_focus, cursors_renderer) {
        super.constructor();
        this._dirty = null;
        this.style = style;
        this._has_focus = has_focus;

        // When the cursors change, redraw the selection box(es).
        this._cursors = cursors;
        var rerender = () => {
            this.render();
            // Tell parent layer this one has changed.
            this.trigger('changed');
        };
        this._cursors.on('change', rerender);

        // When the style is changed, redraw the selection box(es).
        this.style.on('change', rerender);
        config.on('change', rerender);

        this._row_renderer = row_renderer;
        // TODO: Remove the following block.
        this._get_visible_rows = utils.proxy(row_renderer.get_visible_rows, row_renderer);
        this._get_row_height = utils.proxy(row_renderer.get_row_height, row_renderer);
        this._get_row_top = utils.proxy(row_renderer.get_row_top, row_renderer);
        this._measure_partial_row = utils.proxy(row_renderer.measure_partial_row_width, row_renderer);

        // When the cursor is hidden/shown, redraw the selection.
        cursors_renderer.on('toggle', () => {
            this.render();
            // Tell parent layer this one has changed.
            this.trigger('changed');
        });
    }

    /**
     * Render to the canvas
     * Note: This method is called often, so it's important that it's
     * optimized for speed.
     * @return {null}
     */
    render(scroll) {
        // If old contents exist, remove them.
        if (this._dirty === null || scroll !== undefined) {
            this._canvas.clear();
            this._dirty = null;
        } else {
            this._canvas.clear({
                x: this._dirty.x1-1,
                y: this._dirty.y1-1,
                width: this._dirty.x2 - this._dirty.x1+2,
                height: this._dirty.y2 - this._dirty.y1+2,
            });
            this._dirty = null;
        }

        // Get newline width.
        var newline_width = config.newline_width;
        if (newline_width === undefined || newline_width === null) {
            newline_width = 2;
        }

        // Only render if the canvas has focus.
        this._cursors.cursors.forEach(cursor => {
            // Get the visible rows.
            var visible_rows = this._get_visible_rows();

            // Draw the selection box.
            if (cursor.start_row !== null && cursor.start_char !== null &&
                cursor.end_row !== null && cursor.end_char !== null) {
                

                for (var i = Math.max(cursor.start_row, visible_rows.top_row); 
                    i <= Math.min(cursor.end_row, visible_rows.bottom_row); 
                    i++) {

                    var left = this._row_renderer.margin_left;
                    if (i == cursor.start_row && cursor.start_char > 0) {
                        left += this._measure_partial_row(i, cursor.start_char);
                    }

                    var selection_color;
                    if (this._has_focus()) {
                        selection_color = this.style.selection || 'skyblue';
                    } else {
                        selection_color = this.style.selection_unfocused || 'gray';
                    }

                    var width;
                    if (i !== cursor.end_row) {
                        width = this._measure_partial_row(i) - left + this._row_renderer.margin_left + newline_width;
                    } else {
                        width = this._measure_partial_row(i, cursor.end_char);

                        // If this isn't the first selected row, make sure atleast the newline
                        // is visibily selected at the beginning of the row by making sure that
                        // the selection box is atleast the size of a newline character (as
                        // defined by the user config).
                        if (i !== cursor.start_row) {
                            width = Math.max(newline_width, width);
                        }

                        width = width - left + this._row_renderer.margin_left;
                    }
                    
                    var block = {
                        left: left, 
                        top: this._get_row_top(i), 
                        width: width, 
                        height: this._get_row_height(i)
                    };

                    this._canvas.draw_rectangle(
                        block.left, block.top, block.width, block.height,
                        {
                            fill_color: selection_color,
                        }
                    );

                    if (this._dirty===null) {
                        this._dirty = {};
                        this._dirty.x1 = block.left;
                        this._dirty.y1 = block.top;
                        this._dirty.x2 = block.left + block.width;
                        this._dirty.y2 = block.top + block.height;
                    } else {
                        this._dirty.x1 = Math.min(block.left, this._dirty.x1);
                        this._dirty.y1 = Math.min(block.top, this._dirty.y1);
                        this._dirty.x2 = Math.max(block.left + block.width, this._dirty.x2);
                        this._dirty.y2 = Math.max(block.top + block.height, this._dirty.y2);
                    }
                }
            }
        });
    }
}
