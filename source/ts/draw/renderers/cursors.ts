// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

import animator = require('../animator');
import utils = require('../../utils/utils');
import renderer = require('./renderer');
import canvas = require('../canvas');
import control_cursors = require('../../control/cursors');
import style_mod = require('../../styles/style');
import row = require('./row');

/**
 * Render document cursors
 *
 * TODO: Only render visible.
 */
export class CursorsRenderer extends renderer.RendererBase {
    public style: style_mod.Style;

    private _has_focus: ()=>boolean;
    private _cursors: control_cursors.Cursors;
    private _last_drawn_cursors: canvas.IRectangle[];
    private _row_renderer: row.RowRenderer;
    private _blink_animator: animator.Animator;
    private _fps: number;
    private _last_rendered: number;
    private _was_focused: boolean;

    public constructor(cursors: control_cursors.Cursors, style: style_mod.Style, row_renderer: row.RowRenderer, has_focus: ()=>boolean) {
        super();
        this.style = style;
        this._has_focus = has_focus;
        this._cursors = cursors;
        this._last_drawn_cursors = [];
        this._row_renderer = row_renderer;
        
        this._blink_animator = new animator.Animator(1000);
        this._fps = 2;

        // Start the cursor rendering clock.
        this._render_clock();
        this._last_rendered = null;

        // Watch for cursor change events.
        var rerender = () => {
            this._blink_animator.reset();
            this.render();
            // Tell parent layer this one has changed.
            this.trigger('changed');
        };
        this._cursors.on('change', rerender);
    }

    /**
     * Render to the canvas
     * Note: This method is called often, so it's important that it's
     * optimized for speed.
     */
    public render(scroll?: canvas.IPoint): void {

        // Remove the previously drawn cursors, if any.
        if (scroll !== undefined) {
            this._canvas.clear();
            utils.clear_array(this._last_drawn_cursors);
        } else {
            if (this._last_drawn_cursors.length > 0) {
                this._last_drawn_cursors.forEach(cursor_box => {

                    // Remove 1px space around the cursor box too for anti-aliasing.
                    this._canvas.clear({
                        x: cursor_box.x - 1,
                        y: cursor_box.y - 1,
                        width: cursor_box.width + 2,
                        height: cursor_box.height + 2,
                    });
                });
                utils.clear_array(this._last_drawn_cursors);
            }    
        }
        
        // Only render if the canvas has focus.
        if (this._has_focus() && this._blink_animator.time() < 0.5) {
            this._cursors.cursors.forEach(cursor => {
                // Get the visible rows.
                var visible_rows: row.IRowRange = this._row_renderer.get_visible_rows();

                // If a cursor doesn't have a position, render it at the
                // beginning of the document.
                var row_index: number = cursor.primary_row || 0;
                var char_index: number = cursor.primary_char || 0;

                // Draw the cursor.
                var height: number = this._row_renderer.get_row_height(row_index);
                var multiplier: number = <number>this.style.get('cursor_height', 1.0);
                var offset: number = (height - (multiplier*height)) / 2;
                height *= multiplier;
                if (visible_rows.top_row <= row_index && row_index <= visible_rows.bottom_row) {
                    var cursor_box: canvas.IRectangle = {
                        x: char_index === 0 ? this._row_renderer.margin_left : this._row_renderer.measure_partial_row_width(row_index, char_index) + this._row_renderer.margin_left,
                        y: this._row_renderer.get_row_top(row_index) + offset,
                        width: <number>this.style.get('cursor_width', 1.0),
                        height: height,
                    };
                    this._last_drawn_cursors.push(cursor_box);

                    this._canvas.draw_rectangle(
                        cursor_box.x, 
                        cursor_box.y, 
                        cursor_box.width, 
                        cursor_box.height, 
                        {
                            fill_color: <string>this.style.get('cursor', 'back'),
                        }
                    );
                }   
            });
        }
        this._last_rendered = Date.now();
    }

    /**
     * Clock for rendering the cursor.
     */
    private _render_clock(): void {
        // If the canvas is focused, redraw.
        if (this._has_focus()) {
            var first_render: boolean = !this._was_focused;
            this._was_focused = true;
            this.render();
            // Tell parent layer this one has changed.
            this.trigger('changed');
            if (first_render) this.trigger('toggle');

        // The canvas isn't focused.  If this is the first time
        // it hasn't been focused, render again without the 
        // cursors.
        } else if (this._was_focused) {
            this._was_focused = false;
            this.render();
            // Tell parent layer this one has changed.
            this.trigger('changed');
            this.trigger('toggle');
        }

        // Timer.
        setTimeout(utils.proxy(this._render_clock, this), 1000 / this._fps);
    }
}
