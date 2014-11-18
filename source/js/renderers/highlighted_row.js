// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('../utils.js');
var row = require('./row.js');

/**
 * Render the text rows of a DocumentModel.
 * @param {Canvas} canvas instance
 * @param {DocumentModel} model instance
 */
var HighlightedRowRenderer = function(canvas, model, style) {
    row.RowRenderer.call(this, canvas, model);
    
    // Set some basic rendering properties.
    this._base_options.text_baseline = 'alphabetic';

    this.style = style;
};
utils.inherit(HighlightedRowRenderer, row.RowRenderer);

/**
 * Render a single row
 * @param  {integer} index
 * @return {null}
 */
HighlightedRowRenderer.prototype._render_row = function(index) {
    var groups = this._get_groups(index);
    var left = 0;
    for (var i=0; i<groups.length; i++) {
        this._canvas.draw_text(left, this._row_tops[index] + this._row_heights[index], groups[i].text, groups[i].options);
        left += this._canvas.measure_text(groups[i].text, groups[i].options);
    }
};

/**
 * Measures the partial width of a text row.
 * @param  {integer} index
 * @param  {integer} length - number of characters
 * @return {float} width
 */
HighlightedRowRenderer.prototype.measure_partial_row_width = function(index, length) {
    var groups = this._get_groups(index);
    var width = 0;
    var characters = 0;
    length = length || this._model._rows[index].length;
    for (var i=0; i<groups.length; i++) {
        var group = groups[i];
        if (characters + group.text.length > length) {
            width += this._canvas.measure_text(group.text.substring(0, length - characters), group.options);
            break;
        } else {
            width += this._canvas.measure_text(group.text, group.options);
            characters += group.text.length;
        }
    }
    return width;
};

/**
 * Measures the height of a text row as if it were rendered.
 * @param  {integer} index
 * @return {float} height
 */
HighlightedRowRenderer.prototype._measure_row_height = function(index) {
    var groups = this._get_groups(index);
    var height = 0;
    for (var i=0; i<groups.length; i++) {
        height = Math.max(height, groups[i].options.font_size + this._line_spacing);
    }
    return height;
};


/**
 * Get render groups for a row.
 * @param  {integer} index of the row
 * @return {array} array of renderings, each rendering is an array of
 *                 the form {options, text}.
 */
HighlightedRowRenderer.prototype._get_groups = function(index) {
    var row_text = this._model._rows[index];
    var groups = [];
    var last_syntax = null;
    var char_index = 0;
    var start = 0;
    for (char_index; char_index<row_text.length; char_index++) {
        var syntax = this._model.get_tags(index, char_index).syntax;
        if (!this._compare_syntax(last_syntax,syntax)) {
            if (char_index !== 0) {
                groups.push({options: this._get_options(last_syntax), text: row_text.substring(start, char_index)});
            }
            last_syntax = syntax;
            start = char_index;
        }
    }
    groups.push({options: this._get_options(last_syntax), text: row_text.substring(start)});

    return groups;
};

/**
 * Creates a style options dictionary from a syntax tag.
 * @param  {string} syntax
 * @return {null}
 */
HighlightedRowRenderer.prototype._get_options = function(syntax) {
    var render_options = utils.shallow_copy(this._base_options);

    if (syntax && this.style && this.style[syntax]) {
        render_options.color = this.style[syntax];
        render_options.font_size = 14;
    }
    
    return render_options;
};

/**
 * Compare two syntaxs.
 * @param  {string} a - syntax
 * @param  {string} b - syntax
 * @return {bool} true if a and b are equal
 */
HighlightedRowRenderer.prototype._compare_syntax = function(a, b) {
    return a === b;
};

// Exports
exports.HighlightedRowRenderer = HighlightedRowRenderer;
