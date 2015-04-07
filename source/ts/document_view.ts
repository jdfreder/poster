// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

import utils = require('./utils/utils');

// Renderers
import batch = require('./draw/renderers/batch');
import highlighted_row = require('./draw/renderers/highlighted_row');
import cursors = require('./draw/renderers/cursors');
import selections = require('./draw/renderers/selections');
import color = require('./draw/renderers/color');
import highlighter = require('./syntax/prism');

/**
 * Visual representation of a DocumentModel instance
 * @param {Canvas} canvas instance
 * @param {DocumentModel} model instance
 * @param {Cursors} cursors_model instance
 * @param {Style} style - describes rendering style
 * @param {function} has_focus - function that checks if the text area has focus
 * @param {function} move_focal_point - function that moves the focal point
 */
export class DocumentView extends batch.BatchRenderer {
    public row_renderer;
    public highlighter;

    private _model;
    private _language;

    constructor(canvas, model, cursors_model, style, has_focus, move_focal_point) {
        this._model = model;

        // Create child renderers.
        var row_renderer = new highlighted_row.HighlightedRowRenderer(model, canvas, style);
        row_renderer.margin_left = 2;
        row_renderer.margin_top = 2;
        this.row_renderer = row_renderer;
        
        // Make sure changes made to the cursor(s) are within the visible region.
        cursors_model.on('change', cursor => {
            var row_index = cursor.primary_row;
            var char_index = cursor.primary_char;

            var top = row_renderer.get_row_top(row_index);
            var height = row_renderer.get_row_height(row_index);
            var left = row_renderer.measure_partial_row_width(row_index, char_index) + row_renderer.margin_left;
            var bottom = top + height;

            var canvas_height = canvas.height - 20;
            if (bottom > canvas.scroll_top + canvas_height) {
                canvas.scroll_top = bottom - canvas_height;
            } else if (top < canvas.scroll_top) {
                canvas.scroll_top = top;
            }

            var canvas_width = canvas.width - 20;
            if (left > canvas.scroll_left + canvas_width) {
                canvas.scroll_left = left - canvas_width;
            } else if (left - row_renderer.margin_left < canvas.scroll_left) {
                canvas.scroll_left = Math.max(0, left - row_renderer.margin_left);
            }

            move_focal_point(left - canvas.scroll_left, top - canvas.scroll_top - canvas.height);
        });

        var cursors_renderer = new cursors.CursorsRenderer(
            cursors_model, 
            style, 
            row_renderer,
            has_focus);
        var selections_renderer = new selections.SelectionsRenderer(
            cursors_model, 
            style, 
            row_renderer,
            has_focus,
            cursors_renderer);

        // Create the background renderer
        var color_renderer = new color.ColorRenderer();
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
        ], canvas);

        // Hookup render events.
        this._canvas.on('redraw', utils.proxy(this.render, this));
        this._model.on('changed', utils.proxy(canvas.redraw, canvas));
    }

    get language() {
        return this._language;
    }

    set language(value) {
        this.highlighter.load(value);
        this._language = value;
    }
}