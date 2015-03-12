// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('../utils.js');
var row = require('./row.js');
var config = require('../config.js');
config = config.config;

/**
 * Render the text rows of a DocumentModel.
 * @param {DocumentModel} model instance
 */
export class HighlightedRowRenderer extends row.RowRenderer {
    constructor(model, scrolling_canvas, style) {
        super.constructor(model, scrolling_canvas);
        this.style = style;

        model.on('tags_changed', rows => {
            var row_visible = false;
            if (rows) {
                var visible_rows = this.get_visible_rows();
                for (var i = 0; i < rows.length; i++) {
                    if (visible_rows.top_row <= rows[i] && rows[i] <= visible_rows.bottom_row) {
                        row_visible = true;
                        break;
                    }
                }    
            }

            // If at least one of the rows whos tags changed is visible,
            // re-render.
            if (row_visible) {
                this.render();
                this.trigger('changed');
            }
        });
    }

    /**
     * Render a single row
     * @param  {integer} index
     * @param  {float} x
     * @param  {float} y
     * @return {null}
     */
    _render_row(index, x ,y) {
        if (index < 0 || this._model._rows.length <= index) return;
        
        var groups = this._get_groups(index);
        var left = x;
        for (let i=0; i<groups.length; i++) {
            var width = this._text_canvas.measure_text(groups[i].text, groups[i].options);
            
            if (config.highlight_draw) {
                this._text_canvas.draw_rectangle(left, y, width, this.get_row_height(i), {
                    fill_color: utils.random_color(),
                });
            }

            this._text_canvas.draw_text(left, y, groups[i].text, groups[i].options);
            left += width;
        }
    }

    /**
     * Get render groups for a row.
     * @param  {integer} index of the row
     * @return {array} array of renderings, each rendering is an array of
     *                 the form {options, text}.
     */
    _get_groups(index) {
        if (index < 0 || this._model._rows.length <= index) return;

        var row_text = this._model._rows[index];
        var groups = [];
        var last_syntax = null;
        var char_index = 0;
        var start = 0;
        for (char_index; char_index<row_text.length; char_index++) {
            var syntax = this._model.get_tag_value('syntax', index, char_index);
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
    }

    /**
     * Creates a style options dictionary from a syntax tag.
     * @param  {string} syntax
     * @return {null}
     */
    _get_options(syntax) {
        var render_options = utils.shallow_copy(this._base_options);
        
        // Highlight if a sytax item and style are provided.
        if (this.style) {

            // If this is a nested syntax item, use the most specific part
            // which is defined in the active style.
            if (syntax && syntax.indexOf(' ') != -1) {
                var parts = syntax.split(' ');
                for (let i = parts.length - 1; i >= 0; i--) {
                    if (this.style[parts[i]]) {
                        syntax = parts[i];
                        break;
                    }
                }
            }

            // Style if the syntax item is defined in the style.
            if (syntax && this.style[syntax]) {
                render_options.color = this.style[syntax];
            } else {
                render_options.color = this.style.text || 'black';
            }
        }
        
        return render_options;
    }

    /**
     * Compare two syntaxs.
     * @param  {string} a - syntax
     * @param  {string} b - syntax
     * @return {bool} true if a and b are equal
     */
    _compare_syntax(a, b) {
        return a === b;
    }
}
