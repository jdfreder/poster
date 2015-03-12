// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var keymap = require('./events/map.js');
var register = keymap.Map.register;

var utils = require('./utils.js');
var config = require('./config.js');
config = config.config;

/**
 * Input cursor.
 */
export class Cursor extends utils.PosterClass {
    constructor(model, push_history) {
        super.constructor();
        this._model = model;
        this._push_history = push_history;

        this.primary_row = 0;
        this.primary_char = 0;
        this.secondary_row = 0;
        this.secondary_char = 0;

        this._register_api();
    }

    get start_row() {
        return Math.min(this.primary_row, this.secondary_row);
    }

    get end_row() {
        return Math.max(this.primary_row, this.secondary_row);
    }

    get start_char() {
        if (this.primary_row < this.secondary_row || (this.primary_row == this.secondary_row && this.primary_char <= this.secondary_char)) {
            return this.primary_char;
        } else {
            return this.secondary_char;
        }
    }

    get end_char() {
        if (this.primary_row < this.secondary_row || (this.primary_row == this.secondary_row && this.primary_char <= this.secondary_char)) {
            return this.secondary_char;
        } else {
            return this.primary_char;
        }
    }

    /**
     * Unregister the actions and event listeners of this cursor.
     */
    unregister() {
        keymap.unregister_by_tag(this);
    }

    /**
     * Gets the state of the cursor.
     * @return {object} state
     */
    get_state() {
        return {
            primary_row: this.primary_row,
            primary_char: this.primary_char,
            secondary_row: this.secondary_row,
            secondary_char: this.secondary_char,
            _memory_char: this._memory_char
        };
    }

    /**
     * Sets the state of the cursor.
     * @param {object} state
     * @param {boolean} [historical] - Defaults to true.  Whether this should be recorded in history.
     */
    set_state(state, historical) {
        if (state) {
            var old_state = {};
            for (var key in state) {
                if (state.hasOwnProperty(key)) {
                    old_state[key] = this[key];
                    this[key] = state[key];
                }
            }

            if (historical === undefined || historical === true) {
                this._push_history('set_state', [state], 'set_state', [old_state]);
            }
            this.trigger('change');
        }
    }

    /**
     * Moves the primary cursor a given offset.
     * @param  {integer} x
     * @param  {integer} y
     * @param  {boolean} (optional) hop=false - hop to the other side of the
     *                   selected region if the primary is on the opposite of the
     *                   direction of motion.
     * @return {null}
     */
    move_primary(x, y, hop) {
        if (hop) {
            if (this.primary_row != this.secondary_row || this.primary_char != this.secondary_char) {
                var start_row = this.start_row;
                var start_char = this.start_char;
                var end_row = this.end_row;
                var end_char = this.end_char;
                if (x<0 || y<0) {
                    this.primary_row = start_row;
                    this.primary_char = start_char;
                    this.secondary_row = end_row;
                    this.secondary_char = end_char;
                } else {
                    this.primary_row = end_row;
                    this.primary_char = end_char;
                    this.secondary_row = start_row;
                    this.secondary_char = start_char;
                }
            }
        }

        if (x < 0) {
            if (this.primary_char + x < 0) {
                if (this.primary_row === 0) {
                    this.primary_char = 0;
                } else {
                    this.primary_row -= 1;
                    this.primary_char = this._model._rows[this.primary_row].length;
                }
            } else {
                this.primary_char += x;
            }
        } else if (x > 0) {
            if (this.primary_char + x > this._model._rows[this.primary_row].length) {
                if (this.primary_row === this._model._rows.length - 1) {
                    this.primary_char = this._model._rows[this.primary_row].length;
                } else {
                    this.primary_row += 1;
                    this.primary_char = 0;
                }
            } else {
                this.primary_char += x;
            }
        }

        // Remember the character position, vertical navigation across empty lines
        // shouldn't cause the horizontal position to be lost.
        if (x !== 0) {
            this._memory_char = this.primary_char;
        }

        if (y !== 0) {
            this.primary_row += y;
            this.primary_row = Math.min(Math.max(this.primary_row, 0), this._model._rows.length-1);
            if (this._memory_char !== undefined) {
                this.primary_char = this._memory_char;
            }
            if (this.primary_char > this._model._rows[this.primary_row].length) {
                this.primary_char = this._model._rows[this.primary_row].length;
            }
        }

        this.trigger('change'); 
    }

    /**
     * Walk the primary cursor in a direction until a not-text character is found.
     * @param  {integer} direction
     * @return {null}
     */
    word_primary(direction) {
        // Make sure direction is 1 or -1.
        direction = direction < 0 ? -1 : 1;

        // If moving left and at end of row, move up a row if possible.
        if (this.primary_char === 0 && direction == -1) {
            if (this.primary_row !== 0) {
                this.primary_row--;
                this.primary_char = this._model._rows[this.primary_row].length;
                this._memory_char = this.primary_char;
                this.trigger('change'); 
            }
            return;
        }

        // If moving right and at end of row, move down a row if possible.
        if (this.primary_char >= this._model._rows[this.primary_row].length && direction == 1) {
            if (this.primary_row < this._model._rows.length-1) {
                this.primary_row++;
                this.primary_char = 0;
                this._memory_char = this.primary_char;
                this.trigger('change'); 
            }
            return;
        }

        var i = this.primary_char;
        var hit_text = false;
        var row_text = this._model._rows[this.primary_row];
        if (direction == -1) {
            while (0 < i && !(hit_text && utils.not_text(row_text[i-1]))) {
                hit_text = hit_text || !utils.not_text(row_text[i-1]);
                i += direction;
            }
        } else {
            while (i < row_text.length && !(hit_text && utils.not_text(row_text[i]))) {
                hit_text = hit_text || !utils.not_text(row_text[i]);
                i += direction;
            }
        }

        this.primary_char = i;
        this._memory_char = this.primary_char;
        this.trigger('change'); 
    }

    /**
     * Select all of the text.
     * @return {null}
     */
    select_all() {
        this.primary_row = this._model._rows.length-1;
        this.primary_char = this._model._rows[this.primary_row].length;
        this.secondary_row = 0;
        this.secondary_char = 0;
        this.trigger('change'); 
    }

    /**
     * Move the primary cursor to the line end.
     * @return {null}
     */
    primary_goto_end() {
        // Get the start of the actual content, skipping the whitespace.
        var row_text = this._model._rows[this.primary_row];
        var trimmed = row_text.trim();
        var start = row_text.indexOf(trimmed);
        var target = row_text.length;
        if (0 < start && start < row_text.length && this.primary_char !== start + trimmed.length) {
            target = start + trimmed.length;
        }

        // Move the cursor.
        this.primary_char = target;
        this._memory_char = this.primary_char;
        this.trigger('change'); 
    }

    /**
     * Move the primary cursor to the line start.
     * @return {null}
     */
    primary_goto_start() {
        // Get the start of the actual content, skipping the whitespace.
        var row_text = this._model._rows[this.primary_row];
        var start = row_text.indexOf(row_text.trim());
        var target = 0;
        if (0 < start && start < row_text.length && this.primary_char !== start) {
            target = start;
        }

        // Move the cursor.
        this.primary_char = target;
        this._memory_char = this.primary_char;
        this.trigger('change'); 
    }

    /**
     * Selects a word at the given location.
     * @param {integer} row_index
     * @param {integer} char_index
     */
    select_word(row_index, char_index) {
        this.set_both(row_index, char_index);
        this.word_primary(-1);
        this._reset_secondary();
        this.word_primary(1);
    }

    /**
     * Set the primary cursor position
     * @param {integer} row_index
     * @param {integer} char_index
     */
    set_primary(row_index, char_index) {
        this.primary_row = row_index;
        this.primary_char = char_index;

        // Remember the character position, vertical navigation across empty lines
        // shouldn't cause the horizontal position to be lost.
        this._memory_char = this.primary_char;

        this.trigger('change'); 
    }

    /**
     * Set the secondary cursor position
     * @param {integer} row_index
     * @param {integer} char_index
     */
    set_secondary(row_index, char_index) {
        this.secondary_row = row_index;
        this.secondary_char = char_index;
        this.trigger('change'); 
    }

    /**
     * Sets both the primary and secondary cursor positions
     * @param {integer} row_index
     * @param {integer} char_index
     */
    set_both(row_index, char_index) {
        this.primary_row = row_index;
        this.primary_char = char_index;
        this.secondary_row = row_index;
        this.secondary_char = char_index;

        // Remember the character position, vertical navigation across empty lines
        // shouldn't cause the horizontal position to be lost.
        this._memory_char = this.primary_char;

        this.trigger('change'); 
    }

    /**
     * Handles when a key is pressed.
     * @param  {Event} e - original key press event.
     * @return {null}
     */
    keypress(e) {
        var char_code = e.which || e.keyCode;
        var char_typed = String.fromCharCode(char_code);
        this.remove_selected();
        this._historical(function() {
            this._model_add_text(this.primary_row, this.primary_char, char_typed);
        });
        this.move_primary(1, 0);
        this._reset_secondary();
        return true;
    }

    /**
     * Indent
     * @param  {Event} e - original key press event.
     * @return {null}
     */
    indent(e) {
        var indent = this._make_indents()[0];
        this._historical(function() {
            if (this.primary_row == this.secondary_row && this.primary_char == this.secondary_char) {
                this._model_add_text(this.primary_row, this.primary_char, indent);
            } else {
                for (var row = this.start_row; row <= this.end_row; row++) {
                    this._model_add_text(row, 0, indent);
                }
            }
        });
        this.primary_char += indent.length;
        this._memory_char = this.primary_char;
        this.secondary_char += indent.length;
        this.trigger('change');
        return true;
    }

    /**
     * Unindent
     * @param  {Event} e - original key press event.
     * @return {null}
     */
    unindent(e) {
        var indents = this._make_indents();
        var removed_start = 0;
        var removed_end = 0;

        // If no text is selected, remove the indent preceding the
        // cursor if it exists.
        this._historical(function() {
            if (this.primary_row == this.secondary_row && this.primary_char == this.secondary_char) {
                for (var i = 0; i < indents.length; i++) {
                    var indent = indents[i];
                    if (this.primary_char >= indent.length) {
                        var before = this._model.get_text(this.primary_row, this.primary_char-indent.length, this.primary_row, this.primary_char);
                        if (before == indent) {
                            this._model_remove_text(this.primary_row, this.primary_char-indent.length, this.primary_row, this.primary_char);
                            removed_start = indent.length;
                            removed_end = indent.length;
                            break;
                        }
                    }
                }

            // Text is selected.  Remove the an indent from the begining
            // of each row if it exists.
            } else {
                for (var row = this.start_row; row <= this.end_row; row++) {
                    for (var i = 0; i < indents.length; i++) {
                        var indent = indents[i];
                        if (this._model._rows[row].length >= indent.length) {
                            if (this._model._rows[row].substring(0, indent.length) == indent) {
                                this._model_remove_text(row, 0, row, indent.length);
                                if (row == this.start_row) removed_start = indent.length;
                                if (row == this.end_row) removed_end = indent.length;
                                break;
                            }
                        };
                    }
                }
            }
        });
        
        // Move the selected characters backwards if indents were removed.
        var start_is_primary = (this.primary_row == this.start_row && this.primary_char == this.start_char);
        if (start_is_primary) {
            this.primary_char -= removed_start;
            this.secondary_char -= removed_end;
        } else {
            this.primary_char -= removed_end;
            this.secondary_char -= removed_start;
        }
        this._memory_char = this.primary_char;
        if (removed_end || removed_start) this.trigger('change');
        return true;
    }

    /**
     * Insert a newline
     * @return {null}
     */
    newline(e) {
        this.remove_selected();

        // Get the blank space at the begining of the line.
        var line_text = this._model.get_text(this.primary_row, 0, this.primary_row, this.primary_char);
        var spaceless = line_text.trim();
        var left = line_text.length;
        if (spaceless.length > 0) {
            left = line_text.indexOf(spaceless);
        }
        var indent = line_text.substring(0, left);
        
        this._historical(function() {
            this._model_add_text(this.primary_row, this.primary_char, '\n' + indent);
        });
        this.primary_row += 1;
        this.primary_char = indent.length;
        this._memory_char = this.primary_char;
        this._reset_secondary();
        return true;
    }

    /**
     * Insert text
     * @param  {string} text
     * @return {null}
     */
    insert_text(text) {
        this.remove_selected();
        this._historical(function() {
            this._model_add_text(this.primary_row, this.primary_char, text);
        });
        
        // Move cursor to the end.
        if (text.indexOf('\n')==-1) {
            this.primary_char = this.start_char + text.length;
        } else {
            var lines = text.split('\n');
            this.primary_row += lines.length - 1;
            this.primary_char = lines[lines.length-1].length;
        }
        this._reset_secondary();

        this.trigger('change'); 
        return true;
    }

    /**
     * Paste text
     * @param  {string} text
     * @return {null}
     */
    paste(text) {
        if (this._copied_row === text) {
            this._historical(function() {
                this._model_add_row(this.primary_row, text);
            });
            this.primary_row++;
            this.secondary_row++;
            this.trigger('change'); 
        } else {
            this.insert_text(text);
        }
    }

    /**
     * Remove the selected text
     * @return {boolean} true if text was removed.
     */
    remove_selected() {
        if (this.primary_row !== this.secondary_row || this.primary_char !== this.secondary_char) {
            var row_index = this.start_row;
            var char_index = this.start_char;
            this._historical(function() {
                this._model_remove_text(this.start_row, this.start_char, this.end_row, this.end_char);
            });
            this.primary_row = row_index;
            this.primary_char = char_index;
            this._reset_secondary();
            this.trigger('change'); 
            return true;
        }
        return false;
    }

    /**
     * Gets the selected text.
     * @return {string} selected text
     */
    get() {
        if (this.primary_row == this.secondary_row && this.primary_char == this.secondary_char) {
            return this._model._rows[this.primary_row];
        } else {
            return this._model.get_text(this.start_row, this.start_char, this.end_row, this.end_char);
        }
    }

    /**
     * Cuts the selected text.
     * @return {string} selected text
     */
    cut() {
        var text = this.get();
        if (this.primary_row == this.secondary_row && this.primary_char == this.secondary_char) {
            this._copied_row = this._model._rows[this.primary_row];    
            this._historical(function() {
                this._model_remove_row(this.primary_row);
            });
        } else {
            this._copied_row = null;
            this.remove_selected();
        }
        return text;
    }

    /**
     * Copies the selected text.
     * @return {string} selected text
     */
    copy() {
        var text = this.get();
        if (this.primary_row == this.secondary_row && this.primary_char == this.secondary_char) {
            this._copied_row = this._model._rows[this.primary_row];
        } else {
            this._copied_row = null;
        }
        return text;
    }

    /**
     * Delete forward, typically called by `delete` keypress.
     * @return {null}
     */
    delete_forward() {
        if (!this.remove_selected()) {
            this.move_primary(1, 0);
            this.remove_selected();
        }
        return true;
    }

    /**
     * Delete backward, typically called by `backspace` keypress.
     * @return {null}
     */
    delete_backward() {
        if (!this.remove_selected()) {
            this.move_primary(-1, 0);
            this.remove_selected();
        }
        return true;
    }

    /**
     * Delete one word backwards.
     * @return {boolean} success
     */
    delete_word_left() {
        if (!this.remove_selected()) {
            if (this.primary_char === 0) {
                this.word_primary(-1); 
                this.remove_selected();
            } else {
                // Walk backwards until char index is 0 or
                // a different type of character is hit.
                var row = this._model._rows[this.primary_row];
                var i = this.primary_char - 1;
                var start_not_text = utils.not_text(row[i]);
                while (i >= 0 && utils.not_text(row[i]) == start_not_text) {
                    i--;
                }
                this.secondary_char = i+1;
                this.remove_selected();
            }
        }
        return true;
    }

    /**
     * Delete one word forwards.
     * @return {boolean} success
     */
    delete_word_right() {
        if (!this.remove_selected()) {
            var row = this._model._rows[this.primary_row];
            if (this.primary_char === row.length) {
                this.word_primary(1); 
                this.remove_selected();
            } else {
                // Walk forwards until char index is at end or
                // a different type of character is hit.
                var i = this.primary_char;
                var start_not_text = utils.not_text(row[i]);
                while (i < row.length && utils.not_text(row[i]) == start_not_text) {
                    i++;
                }
                this.secondary_char = i;
                this.remove_selected();
            }
        }
        this._end_historical_move();
        return true;
    }

    /**
     * Reset the secondary cursor to the value of the primary.
     * @return {[type]} [description]
     */
    _reset_secondary() {
        this.secondary_row = this.primary_row;
        this.secondary_char = this.primary_char;

        this.trigger('change'); 
    }

    /**
     * Adds text to the model while keeping track of the history.
     * @param  {integer} row_index
     * @param  {integer} char_index
     * @param  {string} text
     */
    _model_add_text(row_index, char_index, text) {
        var lines = text.split('\n');
        this._push_history(
            '_model_add_text', 
            [row_index, char_index, text], 
            '_model_remove_text', 
            [row_index, char_index, row_index + lines.length - 1, lines.length > 1 ? lines[lines.length-1].length : char_index + text.length], 
            config.history_group_delay || 100);
        this._model.add_text(row_index, char_index, text);
    }

    /**
     * Removes text from the model while keeping track of the history.
     * @param  {integer} start_row
     * @param  {integer} start_char
     * @param  {integer} end_row
     * @param  {integer} end_char
     */
    _model_remove_text(start_row, start_char, end_row, end_char) {
        var text = this._model.get_text(start_row, start_char, end_row, end_char);
        this._push_history(
            '_model_remove_text', 
            [start_row, start_char, end_row, end_char], 
            '_model_add_text', 
            [start_row, start_char, text], 
            config.history_group_delay || 100);
        this._model.remove_text(start_row, start_char, end_row, end_char);
    }

    /**
     * Adds a row of text while keeping track of the history.
     * @param  {integer} row_index
     * @param  {string} text
     */
    _model_add_row(row_index, text) {
        this._push_history(
            '_model_add_row', 
            [row_index, text], 
            '_model_remove_row', 
            [row_index], 
            config.history_group_delay || 100);
        this._model.add_row(row_index, text);
    }

    /**
     * Removes a row of text while keeping track of the history.
     * @param  {integer} row_index
     */
    _model_remove_row(row_index) {
        this._push_history(
            '_model_remove_row', 
            [row_index], 
            '_model_add_row', 
            [row_index, this._model._rows[row_index]], 
            config.history_group_delay || 100);
        this._model.remove_row(row_index);
    }

    /**
     * Record the before and after positions of the cursor for history.
     * @param  {function} f - executes with `this` context
     */
    _historical(f) {
        this._start_historical_move();
        var ret = f.apply(this);
        this._end_historical_move();
        return ret;
    }

    /**
     * Record the starting state of the cursor for the history buffer.
     */
    _start_historical_move() {
        if (!this._historical_start) {
            this._historical_start = this.get_state();
        }
    }

    /**
     * Record the ending state of the cursor for the history buffer, then
     * push a reversable action describing the change of the cursor.
     */
    _end_historical_move() {
        this._push_history(
            'set_state', 
            [this.get_state()], 
            'set_state', 
            [this._historical_start], 
            config.history_group_delay || 100);
        this._historical_start = null;
    }

    /**
     * Makes a list of indentation strings used to indent one level,
     * ordered by usage preference.
     * @return {string}
     */
    _make_indents() {
        var indents = [];
        if (config.use_spaces) {
            var indent = '';
            for (var i = 0; i < config.tab_width; i++) {
                indent += ' ';
                indents.push(indent);
            }
            indents.reverse();
        }
        indents.push('\t');
        return indents;
    }

    /**
     * Registers an action API with the map
     * @return {null}
     */
    _register_api() {
        register('cursor.set_state', utils.proxy(this.set_state, this), this);
        register('cursor.remove_selected', utils.proxy(this.remove_selected, this), this);
        register('cursor.keypress', utils.proxy(this.keypress, this), this);
        register('cursor.indent', utils.proxy(this.indent, this), this);
        register('cursor.unindent', utils.proxy(this.unindent, this), this);
        register('cursor.newline', utils.proxy(this.newline, this), this);
        register('cursor.insert_text', utils.proxy(this.insert_text, this), this);
        register('cursor.delete_backward', utils.proxy(this.delete_backward, this), this);
        register('cursor.delete_forward', utils.proxy(this.delete_forward, this), this);
        register('cursor.delete_word_left', utils.proxy(this.delete_word_left, this), this);
        register('cursor.delete_word_right', utils.proxy(this.delete_word_right, this), this);
        register('cursor.select_all', utils.proxy(this.select_all, this), this);
        register('cursor.left', () => { this.move_primary(-1, 0, true); this._reset_secondary(); return true; });
        register('cursor.right', () => { this.move_primary(1, 0, true); this._reset_secondary(); return true; });
        register('cursor.up', () => { this.move_primary(0, -1, true); this._reset_secondary(); return true; });
        register('cursor.down', () => { this.move_primary(0, 1, true); this._reset_secondary(); return true; });
        register('cursor.select_left', () => { this.move_primary(-1, 0); return true; });
        register('cursor.select_right', () => { this.move_primary(1, 0); return true; });
        register('cursor.select_up', () => { this.move_primary(0, -1); return true; });
        register('cursor.select_down', () => { this.move_primary(0, 1); return true; });
        register('cursor.word_left', () => { this.word_primary(-1); this._reset_secondary(); return true; });
        register('cursor.word_right', () => { this.word_primary(1); this._reset_secondary(); return true; });
        register('cursor.select_word_left', () => { this.word_primary(-1); return true; });
        register('cursor.select_word_right', () => { this.word_primary(1); return true; });
        register('cursor.line_start', () => { this.primary_goto_start(); this._reset_secondary(); return true; });
        register('cursor.line_end', () => { this.primary_goto_end(); this._reset_secondary(); return true; });
        register('cursor.select_line_start', () => { this.primary_goto_start(); return true; });
        register('cursor.select_line_end', () => { this.primary_goto_end(); return true; });
    }
}
