// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

import canvas = require('../canvas');
import scrolling_canvas = require('../scrolling_canvas');
import utils = require('../../utils/utils');
import generics = require('../../utils/generics');
import renderer = require('./renderer');
import document_model = require('../../document_model');

export interface IRowRange { 
    top_row: number; 
    bottom_row: number; 
    row_count: number; 
}

export interface ICharacterCoords {
    row_index: number;
    char_index: number;
}

export interface IGetRowChar {
    (cursor_x: number, cursor_y: number): ICharacterCoords;
}

export interface IRowRenderer {
    get_row_char: IGetRowChar;
}

/**
 * Render the text rows of a DocumentModel.
 * @param {DocumentModel} model instance
 */
export class RowRenderer extends renderer.RendererBase implements IRowRenderer {
    protected _model: document_model.DocumentModel;
    protected _text_canvas: canvas.Canvas;
    protected _base_options: any;

    private _tmp_canvas: canvas.Canvas;
    private _scrolling_canvas: scrolling_canvas.ScrollingCanvas;
    private _row_width_counts: generics.INumericDictionary<number>;
    private _line_spacing: number;
    private _margin_left: number;
    private _margin_top: number;
    private _visible_row_count: number;
    private _last_rendered_offset: number;
    private _last_rendered_row: number;
    private _last_rendered_row_count: number;

    public constructor(model: document_model.DocumentModel, scrolling_canvas: scrolling_canvas.ScrollingCanvas) {
        this._model = model;
        this._visible_row_count = 0;

        // Setup canvases
        this._text_canvas = new canvas.Canvas();
        this._tmp_canvas = new canvas.Canvas();
        this._scrolling_canvas = scrolling_canvas;
        this._row_width_counts = {}; // Dictionary of widths -> row count 

        // Base
        super();

        // Set some basic rendering properties.
        this._base_options = {
            font_family: 'monospace',
            font_size: 14,
        };
        this._line_spacing = 2;

        // Set initial canvas sizes.  These lines may look redundant, but beware
        // because they actually cause an appropriate width and height to be set for
        // the text canvas because of the properties declared above.
        this.width = this._canvas.width;
        this.height = this._canvas.height;

        this._margin_left = 0;
        this._margin_top = 0;

        this._model.on('text_changed', utils.proxy(this._handle_value_changed, this));
        this._model.on('rows_added', utils.proxy(this._handle_rows_added, this));
        this._model.on('rows_removed', utils.proxy(this._handle_rows_removed, this));
        this._model.on('row_changed', utils.proxy(this._handle_row_changed, this)); // TODO: Implement my event.
    }

    
    public get width(): number {
        return this._canvas.width;
    }
    public set width(value: number) {
        this._canvas.width = value;
        this._text_canvas.width = value;
        this._tmp_canvas.width = value;
    }
    
    public get height(): number {
        return this._canvas.height;
    }
    public set height(value: number) {
        this._canvas.height = value;

        // The text canvas should be the right height to fit all of the lines
        // that will be rendered in the base canvas.  This includes the lines
        // that are partially rendered at the top and bottom of the base canvas.
        var row_height: number = this.get_row_height();
        this._visible_row_count = Math.ceil(value/row_height) + 1;
        this._text_canvas.height = this._visible_row_count * row_height;
        this._tmp_canvas.height = this._text_canvas.height;
    }
    
    
    public get margin_left(): number {
        return this._margin_left;
    }
    public set margin_left(value: number) {
        
        // Update internal value.
        var delta: number = value - this._margin_left;
        this._margin_left = value;

        // Intelligently change the document's width, without causing
        // a complete O(N) width recalculation.
        var new_counts: generics.INumericDictionary<number> = {};
        for (var width in this._row_width_counts) {
            if (this._row_width_counts.hasOwnProperty(width)) {
                new_counts[width+delta] = this._row_width_counts[width];
            }
        }
        this._row_width_counts = new_counts
        this._scrolling_canvas.scroll_width += delta;

        // Re-render with new margin.
        this.render();
        // Tell parent layer this one has changed.
        this.trigger('changed');
    }
    
    public get margin_top(): number {
        return this._margin_top;
    }
    public set margin_top(value: number) {
        // Update the scrollbars.
        this._scrolling_canvas.scroll_height += value - this._margin_top;

        // Update internal value.
        this._margin_top = value;

        // Re-render with new margin.
        this.render();
        // Tell parent layer this one has changed.
        this.trigger('changed');
    }

    /**
     * Render to the canvas
     * Note: This method is called often, so it's important that it's
     * optimized for speed.
     * @param [scroll] - How much the canvas was scrolled. 
     */
    public render(scroll?: canvas.IPoint): void {

        // If only the y axis was scrolled, blit the good contents and just render
        // what's missing.
        var partial_redraw: boolean = (scroll && scroll.x === 0 && Math.abs(scroll.y) < this._canvas.height);

        // Update the text rendering
        var visible_rows: IRowRange = this.get_visible_rows();
        this._render_text_canvas(-this._scrolling_canvas.scroll_left+this._margin_left, visible_rows.top_row, !partial_redraw);

        // Copy the text image to this canvas
        this._canvas.clear();
        this._canvas.draw_image(
            this._text_canvas, 
            this._scrolling_canvas.scroll_left, 
            this.get_row_top(visible_rows.top_row));
    }

    /**
     * Gets the row and character indicies closest to given control space coordinates.
     * @param cursor_x - x value, 0 is the left of the canvas.
     * @param cursor_y - y value, 0 is the top of the canvas.
     */
    public get_row_char(cursor_x: number, cursor_y: number): ICharacterCoords {
        var row_index: number = Math.floor((cursor_y - this._margin_top) / this.get_row_height());

        // Find the character index.
        var widths: number[] = [0];
        try {
            for (var length: number=1; length<=this._model._rows[row_index].length; length++) {
                widths.push(this.measure_partial_row_width(row_index, length));
            }
        } catch (e) {
            // Nom nom nom...
        }
        var coords: document_model.IRange = this._model.validate_coords(row_index, utils.find_closest(widths, cursor_x - this._margin_left));
        return {
            row_index: coords.start_row,
            char_index: coords.start_char,
        };
    }

    /**
     * Measures the partial width of a text row.
     * @param  index
     * @param  [length] - number of characters
     * @return width
     */
    public measure_partial_row_width(index: number, length?: number): number {
        if (0 > index || index >= this._model._rows.length) {
            return 0; 
        }

        var text: string = this._model._rows[index];
        text = (length === undefined) ? text : text.substring(0, length);

        return this._canvas.measure_text(text, this._base_options);
    }

    /**
     * Measures the height of a text row as if it were rendered.
     */
    public get_row_height(index?: number): number {
        return this._base_options.font_size + this._line_spacing;
    }

    /**
     * Gets the top of the row when rendered
     */
    public get_row_top(index: number): number {
        return index * this.get_row_height() + this._margin_top;
    }

    /**
     * Gets the visible rows.
     */
    public get_visible_rows(): IRowRange {

        // Find the row closest to the scroll top.  If that row is below
        // the scroll top, use the partially displayed row above it.
        var top_row: number = Math.max(0, Math.floor((this._scrolling_canvas.scroll_top - this._margin_top)  / this.get_row_height()));

        // Find the row closest to the scroll bottom.  If that row is above
        // the scroll bottom, use the partially displayed row below it.
        var row_count: number = Math.ceil(this._canvas.height / this.get_row_height());
        var bottom_row: number = top_row + row_count;

        // Row count + 1 to include first row.
        return {top_row: top_row, bottom_row: bottom_row, row_count: row_count+1};
    }

    /**
     * Render a single row
     */
    protected _render_row(index: number, x: number ,y: number): void {
        this._text_canvas.draw_text(x, y, this._model._rows[index], this._base_options);
    }

    /**
     * Render text to the text canvas.
     *
     * Later, the main rendering function can use this rendered text to draw the
     * base canvas.
     * @param x_offset - horizontal offset of the text
     * @param top_row
     * @param force_redraw - redraw the contents even if they are
     *                       the same as the cached contents.
     */
    private _render_text_canvas(x_offset: number, top_row: number, force_redraw?: boolean) {

        // Try to reuse some of the already rendered text if possible.
        var rendered: boolean = false;
        var row_height: number = this.get_row_height();
        var i: number;
        if (!force_redraw && this._last_rendered_offset === x_offset) {
            var last_top: number = this._last_rendered_row;
            var scroll: number = top_row - last_top; // Positive = user scrolling downward.
            if (scroll < this._last_rendered_row_count) {

                // Get a snapshot of the text before the scroll.
                this._tmp_canvas.clear();
                this._tmp_canvas.draw_image(this._text_canvas, 0, 0);

                // Render the new text.
                var saved_rows: number = this._last_rendered_row_count - Math.abs(scroll);
                var new_rows: number = this._visible_row_count - saved_rows;
                if (scroll > 0) {
                    // Render the bottom.
                    this._text_canvas.clear();
                    for (i = top_row+saved_rows; i < top_row+this._visible_row_count; i++) {     
                        this._render_row(i, x_offset, (i - top_row) * row_height);
                    }
                } else if (scroll < 0) {
                    // Render the top.
                    this._text_canvas.clear();
                    for (i = top_row; i < top_row+new_rows; i++) {   
                        this._render_row(i, x_offset, (i - top_row) * row_height);
                    }
                } else {
                    // Nothing has changed.
                    return;
                }
                
                // Use the old content to fill in the rest.
                this._text_canvas.draw_image(this._tmp_canvas, 0, -scroll * this.get_row_height());
                this.trigger('rows_changed', top_row, top_row + this._visible_row_count - 1);
                rendered = true;
            }
        }

        // Full rendering.
        if (!rendered) {
            this._text_canvas.clear();

            // Render till there are no rows left, or the top of the row is
            // below the bottom of the visible area.
            for (i = top_row; i < top_row + this._visible_row_count; i++) {        
                this._render_row(i, x_offset, (i - top_row) * row_height);
            }   
            this.trigger('rows_changed', top_row, top_row + this._visible_row_count - 1);
        }

        // Remember for delta rendering.
        this._last_rendered_row = top_row;
        this._last_rendered_row_count = this._visible_row_count;
        this._last_rendered_offset = x_offset;
    }

    /**
     * Measures a strings width.
     * @param text - text to measure the width of
     * @param [index] - row index, can be used to apply size sensitive 
     *        formatting to the text.
     */
    private _measure_text_width(text: string, index?: number): number {
        return this._canvas.measure_text(text, this._base_options);
    }

    /**
     * Handles when the model's value changes
     * Complexity: O(N) for N rows of text.
     */
    private _handle_value_changed(): void {

        // Calculate the document width.
        this._row_width_counts = {};
        var document_width: number = 0;
        for (var i: number=0; i<this._model._rows.length; i++) {
            var width: number = this._measure_row_width(i) + this._margin_left;
            document_width = Math.max(width, document_width);
            if (this._row_width_counts[width] === undefined) {
                this._row_width_counts[width] = 1;
            } else {
                this._row_width_counts[width]++;
            }
        }
        this._scrolling_canvas.scroll_width = document_width;
        this._scrolling_canvas.scroll_height = this._model._rows.length * this.get_row_height() + this._margin_top;
    }

    /**
     * Handles when one of the model's rows change
     */
    private _handle_row_changed(text: string, index: number): void {
        var new_width: number = this._measure_row_width(index) + this._margin_left;
        var old_width: number = this._measure_text_width(text, index) + this._margin_left;
        if (this._row_width_counts[old_width] == 1) {
            delete this._row_width_counts[old_width];
        } else {
            this._row_width_counts[old_width]--;        
        }

        if (this._row_width_counts[new_width] !== undefined) {
            this._row_width_counts[new_width]++;
        } else {
            this._row_width_counts[new_width] = 1;
        }

        this._scrolling_canvas.scroll_width = this._find_largest_width();
    }

    /**
     * Handles when one or more rows are added to the model
     *
     * Assumes constant row height.
     */
    private _handle_rows_added(start: number, end: number): void {
        this._scrolling_canvas.scroll_height += (end - start + 1) * this.get_row_height();
        
        for (var i: number = start; i <= end; i++) { 
            var new_width: number = this._measure_row_width(i) + this._margin_left;
            if (this._row_width_counts[new_width] !== undefined) {
                this._row_width_counts[new_width]++;
            } else {
                this._row_width_counts[new_width] = 1;
            }
        }

        this._scrolling_canvas.scroll_width = this._find_largest_width();
    }

    /**
     * Handles when one or more rows are removed from the model
     *
     * Assumes constant row height.
     * @param  rows - indicies
     * @param  [index]
     */
    private _handle_rows_removed(rows: string[], index: number) : void{
        // Decrease the scrolling height based on the number of rows removed.
        this._scrolling_canvas.scroll_height -= rows.length * this.get_row_height();

        for (var i: number = 0; i < rows.length; i++) {
            var old_width: number = this._measure_text_width(rows[i], i + index) + this._margin_left;
            if (this._row_width_counts[old_width] == 1) {
                delete this._row_width_counts[old_width];
            } else {
                this._row_width_counts[old_width]--;        
            }
        }

        this._scrolling_canvas.scroll_width = this._find_largest_width();
    }

    /**
     * Measures the width of a text row as if it were rendered.
     */
    private _measure_row_width(index: number): number {
        return this.measure_partial_row_width(index, this._model._rows[index].length);
    }

    /**
     * Find the largest width in the width row count dictionary.
     */
    private _find_largest_width(): number {
        var values: string[] = Object.keys(this._row_width_counts);
        values.sort((a, b) => parseFloat(b) - parseFloat(a));
        return parseFloat(values[0]);
    }
}
