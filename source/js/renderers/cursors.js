// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var animator = require('../animator.js');
var utils = require('../utils.js');
var renderer = require('./renderer.js');

/**
 * Render document cursors
 *
 * TODO: Only render visible.
 */
export class CursorsRenderer extends renderer.RendererBase {
    constructor(cursors, style, row_renderer, has_focus) {
        super.constructor();
        this.style = style;
        this._has_focus = has_focus;
        this._cursors = cursors;
        this._last_drawn_cursors = [];

        this._row_renderer = row_renderer;
        // TODO: Remove the following block.
        this._get_visible_rows = utils.proxy(row_renderer.get_visible_rows, row_renderer);
        this._get_row_height = utils.proxy(row_renderer.get_row_height, row_renderer);
        this._get_row_top = utils.proxy(row_renderer.get_row_top, row_renderer);
        this._measure_partial_row = utils.proxy(row_renderer.measure_partial_row_width, row_renderer);
        
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
     * @return {null}
     */
    render(scroll) {

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
                var visible_rows = this._get_visible_rows();

                // If a cursor doesn't have a position, render it at the
                // beginning of the document.
                var row_index = cursor.primary_row || 0;
                var char_index = cursor.primary_char || 0;

                // Draw the cursor.
                var height = this._get_row_height(row_index);
                var multiplier = this.style.cursor_height || 1.0;
                var offset = (height - (multiplier*height)) / 2;
                height *= multiplier;
                if (visible_rows.top_row <= row_index && row_index <= visible_rows.bottom_row) {
                    var cursor_box = {
                        x: char_index === 0 ? this._row_renderer.margin_left : this._measure_partial_row(row_index, char_index) + this._row_renderer.margin_left,
                        y: this._get_row_top(row_index) + offset,
                        width: this.style.cursor_width===undefined ? 1.0 : this.style.cursor_width,
                        height: height,
                    };
                    this._last_drawn_cursors.push(cursor_box);

                    this._canvas.draw_rectangle(
                        cursor_box.x, 
                        cursor_box.y, 
                        cursor_box.width, 
                        cursor_box.height, 
                        {
                            fill_color: this.style.cursor || 'back',
                        }
                    );
                }   
            });
        }
        this._last_rendered = Date.now();
    }

    /**
     * Clock for rendering the cursor.
     * @return {null}
     */
    _render_clock() {
        // If the canvas is focused, redraw.
        if (this._has_focus()) {
            var first_render = !this._was_focused;
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
