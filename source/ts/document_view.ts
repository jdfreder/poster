// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

import utils = require('./utils/utils');

// Renderers
import batch = require('./draw/renderers/batch');
import highlighted_row = require('./draw/renderers/highlighted_row');
import cursors = require('./draw/renderers/cursors');
import selections = require('./draw/renderers/selections');
import color = require('./draw/renderers/color');
import scrolling_canvas = require('./draw/scrolling_canvas');
import highlighter = require('./syntax/prism');
import document_model = require('./document_model');
import style = require('./styles/style');
import cursors_model = require('./control/cursors');

/**
 * Visual representation of a DocumentModel instance
 */
export class DocumentView extends batch.BatchRenderer {
    public row_renderer: highlighted_row.HighlightedRowRenderer;
    public highlighter: highlighter.PrismHighlighter;

    private _language: string;

    /**
     * @param scrolling_canvas
     * @param model
     * @param cursors_model
     * @param style - describes rendering style
     * @param has_focus - function that checks if the text area has focus
     * @param move_focal_point - function that moves the focal point
     */
    public constructor(scrolling_canvas: scrolling_canvas.ScrollingCanvas, 
        model: document_model.DocumentModel, 
        cursors_model: cursors_model.Cursors, 
        style: style.Style, 
        has_focus: () => boolean, 
        move_focal_point: (x: number, y: number) => void) {

        // Create child renderers.
        var row_renderer: highlighted_row.HighlightedRowRenderer = new highlighted_row.HighlightedRowRenderer(model, scrolling_canvas, style);
        row_renderer.margin_left = 2;
        row_renderer.margin_top = 2;
        this.row_renderer = row_renderer;
        
        // Make sure changes made to the cursor(s) are within the visible region.
        cursors_model.on('change', cursor => {
            var row_index: number = cursor.primary_row;
            var char_index: number = cursor.primary_char;

            var top: number = row_renderer.get_row_top(row_index);
            var height: number = row_renderer.get_row_height(row_index);
            var left: number = row_renderer.measure_partial_row_width(row_index, char_index) + row_renderer.margin_left;
            var bottom: number = top + height;

            var canvas_height: number = scrolling_canvas.height - 20;
            if (bottom > scrolling_canvas.scroll_top + canvas_height) {
                scrolling_canvas.scroll_top = bottom - canvas_height;
            } else if (top < scrolling_canvas.scroll_top) {
                scrolling_canvas.scroll_top = top;
            }

            var canvas_width: number = scrolling_canvas.width - 20;
            if (left > scrolling_canvas.scroll_left + canvas_width) {
                scrolling_canvas.scroll_left = left - canvas_width;
            } else if (left - row_renderer.margin_left < scrolling_canvas.scroll_left) {
                scrolling_canvas.scroll_left = Math.max(0, left - row_renderer.margin_left);
            }

            move_focal_point(left - scrolling_canvas.scroll_left, top - scrolling_canvas.scroll_top - scrolling_canvas.height);
        });

        var cursors_renderer: cursors.CursorsRenderer = new cursors.CursorsRenderer(
            cursors_model, 
            style, 
            row_renderer,
            has_focus);
        var selections_renderer: selections.SelectionsRenderer = new selections.SelectionsRenderer(
            cursors_model, 
            style, 
            row_renderer,
            has_focus,
            cursors_renderer);

        // Create the background renderer
        var color_renderer: color.ColorRenderer = new color.ColorRenderer();
        color_renderer.color = style.background || 'white';
        style.on('changed:style', function() { color_renderer.color = style.background; });

        // Create the document highlighter, which needs to know about the currently
        // rendered rows in order to know where to highlight.
        this.highlighter = new highlighter.PrismHighlighter(model, row_renderer);

        // Pass get_row_char into cursors.
        cursors_model.get_row_char = utils.proxy(row_renderer.get_row_char, row_renderer);

        // Call base constructor.
        super([
            color_renderer,
            selections_renderer,
            row_renderer,
            cursors_renderer,
        ], scrolling_canvas);

        // Hookup render events.
        this._canvas.on('redraw', utils.proxy(this.render, this));
        model.on('changed', utils.proxy(scrolling_canvas.redraw, scrolling_canvas));
    }

    public get language(): string {
        return this._language;
    }

    public set language(value: string) {
        this.highlighter.load(value);
        this._language = value;
    }
}
