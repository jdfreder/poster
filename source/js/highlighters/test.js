// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('../utils.js');
var highlighter = require('./highlighter.js');

/**
 * Listens to a model and higlights the text accordingly.
 * @param {DocumentModel} model
 */
var TestHighlighter = function(model, row_renderer) {
    highlighter.HighlighterBase.call(this, model, row_renderer);
    this._row_padding = 5;
};
utils.inherit(TestHighlighter, highlighter.HighlighterBase);

/**
 * Highlight the document
 * @return {null}
 */
TestHighlighter.prototype.highlight = function(start_row, end_row) {
    // TEST Highlighting
    start_row = Math.max(0, start_row - this._row_padding);
    end_row = Math.min(this._model._rows.length - 1, end_row + this._row_padding);

    // Clear the old highlighting.
    this._model.clear_tags(start_row, end_row);
    
    // New higlighting.
    for (var row_index=start_row; row_index<=end_row; row_index++) {
        // Highlight all ES.
        var row = this._model._rows[row_index];
        var index = row.indexOf('es');
        while (index != -1) {
            this._model.set_tag(row_index, index, row_index, index+1, 'syntax', 'keyword');
            index = row.indexOf('es', index+1);
        }

        index = row.indexOf('is');
        while (index != -1) {
            this._model.set_tag(row_index, index, row_index, index+1, 'syntax', 'string');
            index = row.indexOf('is', index+1);
        }
    }
};

// Exports
exports.TestHighlighter = TestHighlighter;
