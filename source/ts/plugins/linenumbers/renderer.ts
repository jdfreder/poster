// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
import renderer = require('../../draw/renderers/renderer');
import row = require('../../draw/renderers/row');
import canvas = require('../../draw/canvas');
import utils = require('../../utils/utils');
import plugin_mod = require('./linenumbers');
import gutter_mod = require('../gutter/gutter');
import plugin_manager = require('../manager');

/**
 * Renderers the line numbers.
 */
export class LineNumbersRenderer extends renderer.RendererBase {
    private _plugin: plugin_mod.LineNumbers;
    private _top: number;
    private _top_row: number;
    private _character_width: number;
    private _last_row_count: number;
    private _gutter: gutter_mod.Gutter;
    private _row_renderer: row.RowRenderer;
    private _text_canvas: canvas.Canvas;
    private _tmp_canvas: canvas.Canvas;
    private _row_height: number;
    private _visible_row_count: number;

    public constructor(plugin: plugin_mod.LineNumbers) {
        super(undefined, {parent_independent: true});
        this._plugin  = plugin;
        this._top = null;
        this._top_row = null;
        this._character_width = null;
        this._last_row_count = null;

        // Find gutter plugin, listen to its change event.
        var manager: plugin_manager.PluginManager = this._plugin.poster.plugins;
        this._gutter = manager.find('gutter')[0];
        this._gutter.renderer.on('changed', this._gutter_resize, this);

        // Get row renderer.
        this._row_renderer = this._plugin.poster.view.row_renderer;

        // Double buffer.
        this._text_canvas = new canvas.Canvas();
        this._tmp_canvas = new canvas.Canvas();
        this._text_canvas.width = this._gutter.gutter_width;
        this._tmp_canvas.width = this._gutter.gutter_width;

        this.height = this.height;

        // Adjust the gutter size when the number of lines in the document changes.
        this._plugin.poster.model.on('text_changed', utils.proxy(this._handle_text_change, this));
        this._plugin.poster.model.on('rows_added', utils.proxy(this._handle_text_change, this));
        this._plugin.poster.model.on('rows_removed', utils.proxy(this._handle_text_change, this));
        this._handle_text_change();
    }
    
    public get height(): number {
        return this._canvas.height;
    }
    public set height(value: number) {
        // Adjust every buffer's size when the height changes.
        this._canvas.height = value;

        // The text canvas should be the right height to fit all of the lines
        // that will be rendered in the base canvas.  This includes the lines
        // that are partially rendered at the top and bottom of the base canvas.
        var row_height: number = this._row_renderer.get_row_height();
        this._row_height = row_height;
        this._visible_row_count = Math.ceil(value/row_height) + 1;
        this._text_canvas.height = this._visible_row_count * row_height;
        this._tmp_canvas.height = this._text_canvas.height;
        this.rerender();
        this.trigger('changed');
    }

    /**
     * Handles rendering
     * Only re-render when scrolled vertically.
     */
    public render(scroll: canvas.IPoint): void {
        var top: number = this._gutter.poster.canvas.scroll_top;
        if (this._top === null || this._top !== top) {
            this._top = top;
            this._render();
        }
    }

    public rerender(): void {
        // Draw everything.
        this._character_width = null;
        this._text_canvas.erase_options_cache();
        this._text_canvas.clear();
        this._render_rows(this._top_row, this._visible_row_count);

        // Render the buffer at the correct offset.
        this._canvas.clear();
        this._canvas.draw_image(
            this._text_canvas,
            0, 
            this._row_renderer.get_row_top(this._top_row) - this._row_renderer.top);
    }

    /**
     * Unregister the event listeners
     */
    public unregister(): void {
        this._gutter.off('changed', this._render);
    }

    /**
     * Renders the line numbers
     */
    private _render(): void {
        // Measure the width of numerical characters if not done yet.
        if (this._character_width===null) {
            this._character_width = this._text_canvas.measure_text('0123456789', {
                font_family: 'monospace',
                font_size: 14,
            }) / 10.0;
            this._handle_text_change();
        }

        // Update the text buffer if needed.
        var top_row: number = this._row_renderer.get_row_char(0, this._top).row_index;
        var lines: number = this._plugin.poster.model._rows.length;
        if (this._top_row !== top_row) {
            this._last_row_count = lines;
            var last_top_row: number = this._top_row;
            this._top_row = top_row;
            
            // Recycle rows if possible.
            var row_scroll: number = this._top_row - last_top_row;
            var row_delta: number = Math.abs(row_scroll);
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
    }

    /**
     * Renders a set of line numbers.
     */
    private _render_rows(start_row: number, num_rows: number): void {
        var lines: number = this._plugin.poster.model._rows.length;
        for (var i: number = start_row; i < start_row + num_rows; i++) {
            if (i < lines) {
                var y: number = (i - this._top_row) * this._row_height;
                if (this._plugin.poster.config.highlight_draw) {
                    this._text_canvas.draw_rectangle(0, y, this._text_canvas.width, this._row_height, {
                        fill_color: utils.random_color(),
                    });
                }

                this._text_canvas.draw_text(10, y, String(i+1), {
                    font_family: 'monospace',
                    font_size: 14,
                    color: this._plugin.poster.style.get('gutter_text', 'black'),
                });
            }
        }

    }

    /**
     * Handles when the number of lines in the editor changes.
     */
    private _handle_text_change(): void {
        var lines = this._plugin.poster.model._rows.length;
        var digit_width = Math.max(2, Math.ceil(Math.log(lines+1)/Math.log(10)) + 1);
        var char_width = this._character_width || 10.0;
        this._gutter.gutter_width = digit_width * char_width + 8.0;

        if (lines !== this._last_row_count) {
            this.rerender();
            this.trigger('changed');
        }
    }

    /**
     * Handles when the gutter is resized
     */
    private _gutter_resize(): void {
        this._text_canvas.width = this._gutter.gutter_width;
        this._tmp_canvas.width = this._gutter.gutter_width; 
        this.rerender();
        this.trigger('changed');
    }
}
