// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('../utils.js');
var highlighter = require('./highlighter.js');

/**
 * Listens to a model and higlights the text accordingly.
 * @param {DocumentModel} model
 */
var TestHighlighter = function(model, row_renderer) {
    highlighter.HighlighterBase.call(this, model, row_renderer);
};
utils.inherit(TestHighlighter, highlighter.HighlighterBase);

/**
 * Highlight the document
 * @return {null}
 */
TestHighlighter.prototype.highlight = function() {
    // TEST Highlighting
    this._model.clear_tags();
    for (var row_index=0; row_index<this._model._rows.length; row_index++) {
        // Highlight all ES.
        var row = this._model._rows[row_index];
        var index = row.indexOf('es');
        while (index != -1) {
            this._model.set_tag(row_index, index, row_index, index+1, 'syntax', 'keyword');
            index = row.indexOf('es', index+1);
        }
    }
};

/**
 * Handles when the text changes.
 * @return {null}
 */
TestHighlighter.prototype._handle_text_change = function() {
    this._model.clear_tags();
};

// Exports
exports.TestHighlighter = TestHighlighter;
