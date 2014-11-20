// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('../utils.js');
var row = require('./row.js');

/**
 * Render the text rows of a DocumentModel.
 * @param {DocumentModel} model instance
 */
var RichTextRowRenderer = function(model, scrolling_canvas, style) {
    row.RowRenderer.call(this, model, scrolling_canvas);
    this._row_heights = [];
    this._row_tops = [];
    
    // Set some basic rendering properties.
    this._base_options.text_baseline = 'alphabetic';

    this.style = style;
};
utils.inherit(RichTextRowRenderer, row.RowRenderer);

/**
 * Render to the canvas
 * Note: This method is called often, so it's important that it's
 * optimized for speed.
 * @return {null}
 */
RichTextRowRenderer.prototype.render = function() {

    // Find the row closest to the scroll top.  If that row is below
    // the scroll top, use the row above it.
    var closest = utils.find_closest(this._row_tops, this._canvas.scroll_top);
    if (this._row_tops[closest] > this._canvas.scroll_top) {
        closest = ((closest === 0) ? 0 : closest - 1);
    }

    // Render till there are no rows left, or the top of the row is
    // below the bottom of the visible area.
    for (var i = closest; 
        i < this._model._rows.length && 
        this._row_tops[i] < this._canvas.scroll_top + this._canvas.height; 
        i++) {        

        this._render_row(i);
    }
};

/**
 * Gets the row and character indicies closest to given control space coordinates.
 * @param  {float} cursor_x - x value, 0 is the left of the canvas.
 * @param  {float} cursor_y - y value, 0 is the top of the canvas.
 * @return {dictionary} dictionary of the form {row_index, char_index}
 */
RichTextRowRenderer.prototype.get_row_char = function(cursor_x, cursor_y) {
    
    // Find the row closest to the scroll top.  If that row is below
    // the scroll top, use the row above it.
    var closest = utils.find_closest(this._row_tops, cursor_y + this._canvas.scroll_top);
    if (this._row_tops[closest] > this._canvas.scroll_top) {
        closest = ((closest === 0) ? 0 : closest - 1);
    }

    // Find the character index.
    var widths = [0];
    try {
        for (var length=1; length<=this._model._rows[closest].length; length++) {
            widths.push(this.measure_partial_row_width(closest, length));
        }
    } catch (e) {
        // Nom nom nom...
    }
    return {row_index: closest, char_index: utils.find_closest(widths, cursor_x + this._canvas.scroll_left)};
};

/**
 * Get the top of a row
 * @param  {integer} index 
 * @return {float} top
 */
RichTextRowRenderer.prototype.get_row_top = function(index) {
    return this._row_tops[index];
};

/**
 * Get the height of a row
 * @param  {integer} index 
 * @return {float} height
 */
RichTextRowRenderer.prototype.get_row_height = function(index) {
    return this._row_heights[index];
};

/**
 * Measures the partial width of a text row.
 * @param  {integer} index
 * @param  {integer} length - number of characters
 * @return {float} width
 */
RichTextRowRenderer.prototype.measure_partial_row_width = function(index, length) {
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
 * Render a single row
 * @param  {integer} index
 * @return {null}
 */
RichTextRowRenderer.prototype._render_row = function(index) {
    var groups = this._get_groups(index);
    var left = 0;
    for (var i=0; i<groups.length; i++) {
        this._canvas.draw_text(left, this._row_tops[index] + this._row_heights[index], groups[i].text, groups[i].options);
        left += this._canvas.measure_text(groups[i].text, groups[i].options);
    }
};

/**
 * Measures the height of a text row as if it were rendered.
 * @param  {integer} index
 * @return {float} height
 */
RichTextRowRenderer.prototype._measure_row_height = function(index) {
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
RichTextRowRenderer.prototype._get_groups = function(index) {
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
RichTextRowRenderer.prototype._get_options = function(syntax) {
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
RichTextRowRenderer.prototype._compare_syntax = function(a, b) {
    return a === b;
};

/**
 * Handles when the model's value changes
 * Complexity: O(N) for N rows of text.
 * @return {null}
 */
RichTextRowRenderer.prototype._handle_value_changed = function() {

    // Calculate the document height and width while constructing
    // a running list of start heights for rows.
    utils.clear_array(this._row_heights);
    utils.clear_array(this._row_tops);
    var document_width = 0;
    var document_height = 0;
    for (var i=0; i<this._model._rows.length; i++) {
        document_width = Math.max(this._measure_row_width(i), document_width);

        this._row_tops.push(document_height);
        var height = this._measure_row_height(i);
        document_height += height;
        this._row_heights.push(height);
    }
    this._canvas.scroll_width = document_width;
    this._canvas.scroll_height = document_height;
};

/**
 * Handles when one of the model's rows change
 * @return {null}
 */
RichTextRowRenderer.prototype._handle_row_changed = function(index) {
    this._canvas.scroll_width = Math.max(this._measure_row_width(index), this._canvas.scroll_width);

    // If the row height has changed, update all of the rows below 
    // that row.  Otherwise, do nothing.
    var height = this._measure_row_height(index);
    if (this._row_heights[index] !== height) {
        var document_height = this._row_tops[index];

        // Shallow copy the row information up to this point.  Allow
        // the GC to collect the original array when it's ready.
        this._row_tops = this._row_tops.slice(0, index);
        this._row_heights = this._row_heights.slice(0, index);

        for (var i=index; i<this._model._rows.length; i++) {
            this._row_tops.push(document_height);
            height = this._measure_row_height(i);
            document_height += height;
            this._row_heights.push(height);
        }
        this._canvas.scroll_height = document_height;
    }
};


// Exports
exports.RichTextRowRenderer = RichTextRowRenderer;
