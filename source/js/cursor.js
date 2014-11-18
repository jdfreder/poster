// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('./utils.js');

/**
 * Input cursor.
 */
var Cursor = function(model, input_dispatcher) {
    utils.PosterClass.call(this);
    this._model = model;
    this._input_dispatcher = input_dispatcher;
    this._click_row = null;
    this._click_char = null;
    this._anchor_row = null;
    this._anchor_char = null;
    this._start_row = null;
    this._start_char = null;
    this._end_row = null;
    this._end_char = null;

    // Bind events
    var that = this;
    this._input_dispatcher.on('keypress', utils.proxy(this._handle_keypress, this));
    this._input_dispatcher.on('delete', utils.proxy(this._handle_delete, this));
    this._input_dispatcher.on('backspace', utils.proxy(this._handle_backspace, this));
    this._input_dispatcher.on('left', function() { that._move_cursor(-1, 0); });
    this._input_dispatcher.on('right', function() { that._move_cursor(1, 0); });
    this._input_dispatcher.on('up', function() { that._move_cursor(0, -1); });
    this._input_dispatcher.on('down', function() { that._move_cursor(0, 1); });
    this._input_dispatcher.on('select_left', function() { that._move_cursor(-1, 0, true); });
    this._input_dispatcher.on('select_right', function() { that._move_cursor(1, 0, true); });
    this._input_dispatcher.on('select_up', function() { that._move_cursor(0, -1, true); });
    this._input_dispatcher.on('select_down', function() { that._move_cursor(0, 1, true); });
};
utils.inherit(Cursor, utils.PosterClass);

/**
 * Set the cursor's start position.
 * @param {integer} row_index  
 * @param {integer} char_index
 */
Cursor.prototype.set_start = function(row_index, char_index) {
    this._start_row = row_index;
    this._start_char = char_index;
    this._end_row = row_index;
    this._end_char = char_index;
    this._click_row = row_index;
    this._click_char = char_index;
    this._anchor_row = row_index;
    this._anchor_char = char_index;
    this.trigger('change');
};

/**
 * Set the cursor's end position.
 * @param {integer} row_index  
 * @param {integer} char_index
 */
Cursor.prototype.set_end = function(row_index, char_index) {
    if (row_index < this._click_row || (row_index == this._click_row && char_index < this._click_char)) {
        this._start_row = row_index;
        this._start_char = char_index;
        this._end_row = this._click_row;
        this._end_char = this._click_char;
    } else {
        this._start_row = this._click_row;
        this._start_char = this._click_char;
        this._end_row = row_index;
        this._end_char = char_index;
    }
    this.trigger('change');
};

/**
 * Handles when a key is pressed.
 * @param  {string} key - key that was pressed.
 * @return {null}
 */
Cursor.prototype._handle_keypress = function(key) {
    this._remove_blob();
    this._model.add_text(this._start_row, this._start_char, key);
    if (key == '\n') { 
        this.set_start(this._start_row + 1, 0);
    } else {
        this.set_start(this._start_row, this._start_char + 1);
    }
};

/**
 * Handles when delete is pressed.
 * @return {null}
 */
Cursor.prototype._handle_delete = function() {
    if (!this._remove_blob()) {
        var moved = this._calculate_move_cursor(this._start_row, this._start_char, 0, 1);
        if (moved.moved) {
            this._model.remove_text(this._start_row, this._start_char, moved.row_index, moved.char_index);
            this.set_start(this._start_row, this._start_char);
        }
    }
};

/**
 * Handles when backspace is pressed.
 * @return {null}
 */
Cursor.prototype._handle_backspace = function() {
    if (!this._remove_blob()) {
        var moved = this._calculate_move_cursor(this._start_row, this._start_char, 0, -1);
        if (moved.moved) {
            this._model.remove_text(moved.row_index, moved.char_index, this._start_row, this._start_char);
            this.set_start(moved.row_index, moved.char_index);    
        }
    }
};

/**
 * Moves the cursor in a direction
 * @param  {integer} delta_x
 * @param  {integer} delta_y
 * @return {boolean} true if moved
 */
Cursor.prototype._move_cursor = function(delta_x, delta_y, selecting) {
    var moved;
    moved = this._calculate_move_cursor(this._anchor_row, this._anchor_char, delta_y, delta_x);
    if (moved.moved) {
        if (selecting) {
            if (moved.row_index < this._click_row || (moved.row_index == this._click_row && moved.char_index < this._click_char)) {
                this._start_row = moved.row_index;
                this._start_char = moved.char_index;
                this._end_row = this._click_row;
                this._end_char = this._click_char;
            } else {
                this._start_row = this._click_row;
                this._start_char = this._click_char;
                this._end_row = moved.row_index;
                this._end_char = moved.char_index;
            }
            this._anchor_row = moved.row_index;
            this._anchor_char = moved.char_index;
        } else {
            this.set_start(moved.row_index, moved.char_index);
        }
        return true;
    }
    return false;
};

/**
 * Calculates a new position from start and delta cursor coordinated.
 * @param  {integer} start_row
 * @param  {integer} start_char
 * @param  {integer} delta_row
 * @param  {integer} delta_char
 * @return {dictionary} dictionary of the form {row_index, char_index, moved},
 *                      where moved is a boolean true if the cursor can be 
 *                      moved.
 */
Cursor.prototype._calculate_move_cursor = function(start_row, start_char, delta_row, delta_char) {
    var dest_char = start_char + delta_char;
    var dest_row = start_row + delta_row;
    if (dest_row < 0) {
        dest_row = start_row;
        dest_char = 0;
    }
    if (dest_row >= this._model._rows.length) {
        dest_row = this._model._rows.length - 1;
        dest_char = this._model._rows[dest_row].length;
    }
    if (dest_char == -1) {
        dest_row--;
        if (dest_row == -1) {
            dest_row++;
            dest_char = 0;
        } else {
            dest_char = this._model._rows[dest_row].length;
        }
    }
    if (dest_char > this._model._rows[dest_row].length) {
        dest_row++;
        if (dest_row == -1) {
            dest_row--;
            dest_char = this._model._rows[dest_row].length;
        } else {
            dest_char = 0;
        }
    }
    var moved = (dest_char!==start_char||dest_row!==start_row);
    return {row_index: dest_row, char_index: dest_char, moved: moved};
};

/**
 * If a blob of text is selected, remove it.
 * @return {boolean} true if text was removed.
 */
Cursor.prototype._remove_blob = function() {
    if (this._start_row !== this._end_row || this._start_char !== this._end_char) {
        this._model.remove_text(this._start_row, this._start_char, this._end_row, this._end_char);
        this._end_row = this._start_row;
        this._end_char = this._start_char;
        return true;
    }
    return false;
};

exports.Cursor = Cursor;