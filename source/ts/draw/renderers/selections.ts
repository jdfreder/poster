// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

import animator = require('../animator');
import canvas = require('../canvas');
import row = require('./row');
import cursors_renderer = require('./cursors');
import cursors_control = require('../../control/cursors');
import utils = require('../../utils/utils');
import renderer = require('./renderer');
import config_mod = require('../../utils/config');
import style_mod = require('../../styles/style');
var config = config_mod.config;

/**
 * Render document selection boxes
 *
 * TODO: Only render visible.
 */
export class SelectionsRenderer extends renderer.RendererBase {
    public style: style_mod.Style;

    private _dirty: canvas.IPointPair;
    private _has_focus: () => boolean;
    private _cursors: cursors_control.Cursors;
    private _row_renderer: row.RowRenderer;

    public constructor(cursors: cursors_control.Cursors, 
        style: style_mod.Style, 
        row_renderer: row.RowRenderer, 
        has_focus: () => boolean, 
        cursors_renderer: cursors_renderer.CursorsRenderer) {

        super();
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
     */
    public render(scroll?: canvas.IPoint): void {
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
        var newline_width: number = config.newline_width;
        if (newline_width === undefined || newline_width === null) {
            newline_width = 2;
        }

        // Only render if the canvas has focus.
        this._cursors.cursors.forEach(cursor => {
            // Get the visible rows.
            var visible_rows: row.IRowRange = this._row_renderer.get_visible_rows();

            // Draw the selection box.
            if (cursor.start_row !== null && cursor.start_char !== null &&
                cursor.end_row !== null && cursor.end_char !== null) {
                

                for (var i: number = Math.max(cursor.start_row, visible_rows.top_row); 
                    i <= Math.min(cursor.end_row, visible_rows.bottom_row); 
                    i++) {

                    var left: number = this._row_renderer.margin_left;
                    if (i == cursor.start_row && cursor.start_char > 0) {
                        left += this._row_renderer.measure_partial_row_width(i, cursor.start_char);
                    }

                    var selection_color: string;
                    if (this._has_focus()) {
                        selection_color = <string>this.style.get('selection', 'skyblue');
                    } else {
                        selection_color = <string>this.style.get('selection_unfocused', 'gray');
                    }

                    var width: number;
                    if (i !== cursor.end_row) {
                        width = this._row_renderer.measure_partial_row_width(i) - left + this._row_renderer.margin_left + newline_width;
                    } else {
                        width = this._row_renderer.measure_partial_row_width(i, cursor.end_char);

                        // If this isn't the first selected row, make sure atleast the newline
                        // is visibily selected at the beginning of the row by making sure that
                        // the selection box is atleast the size of a newline character (as
                        // defined by the user config).
                        if (i !== cursor.start_row) {
                            width = Math.max(newline_width, width);
                        }

                        width = width - left + this._row_renderer.margin_left;
                    }
                    
                    var block: canvas.IRectangle = {
                        x: left, 
                        y: this._row_renderer.get_row_top(i), 
                        width: width, 
                        height: this._row_renderer.get_row_height(i)
                    };

                    this._canvas.draw_rectangle(
                        block.x, block.y, block.width, block.height,
                        {
                            fill_color: selection_color,
                        }
                    );

                    if (this._dirty===null) {
                        this._dirty = {
                            x1: block.x,
                            y1: block.y,
                            x2: block.x + block.width,
                            y2: block.y + block.height
                        }
                    } else {
                        this._dirty.x1 = Math.min(block.x, this._dirty.x1);
                        this._dirty.y1 = Math.min(block.y, this._dirty.y1);
                        this._dirty.x2 = Math.max(block.x + block.width, this._dirty.x2);
                        this._dirty.y2 = Math.max(block.y + block.height, this._dirty.y2);
                    }
                }
            }
        });
    }
}
