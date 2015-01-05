// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var keymap = require('./events/map.js');
var register = keymap.Map.register;

var cursor = require('./cursor.js');
var utils = require('./utils.js');
/**
 * Manages one or more cursors
 */
var Cursors = function(model, clipboard, history) {
    utils.PosterClass.call(this);
    this._model = model;
    this.get_row_char = undefined;
    this.cursors = [];
    this._selecting_text = false;
    this._clipboard = clipboard;
    this._active_cursor = null;
    this._history = history;

    // Create initial cursor.
    this.create(undefined, false);

    // Register actions.
    register('cursors._cursor_proxy', utils.proxy(this._cursor_proxy, this));
    register('cursors.create', utils.proxy(this.create, this));
    register('cursors.single', utils.proxy(this.single, this));
    register('cursors.pop', utils.proxy(this.pop, this));
    register('cursors.start_selection', utils.proxy(this.start_selection, this));
    register('cursors.set_selection', utils.proxy(this.set_selection, this));
    register('cursors.start_set_selection', utils.proxy(this.start_set_selection, this));
    register('cursors.end_selection', utils.proxy(this.end_selection, this));
    register('cursors.select_word', utils.proxy(this.select_word, this));

    // Bind clipboard events.
    this._clipboard.on('cut', utils.proxy(this._handle_cut, this));
    this._clipboard.on('copy', utils.proxy(this._handle_copy, this));
    this._clipboard.on('paste', utils.proxy(this._handle_paste, this));
};
utils.inherit(Cursors, utils.PosterClass);

/**
 * Handles history proxy events for individual cursors.
 * @param  {integer} cursor_index
 * @param  {string} function_name
 * @param  {array} function_params
 */
Cursors.prototype._cursor_proxy = function(cursor_index, function_name, function_params) {
    if (cursor_index < this.cursors.length) {
        var cursor = this.cursors[cursor_index];
        cursor[function_name].apply(cursor, function_params);
    }
};

/**
 * Creates a cursor and manages it.
 * @param {object} [state] state to apply to the new cursor.
 * @param {boolean} [reversable] - defaults to true, is action reversable.
 * @return {Cursor} cursor
 */
Cursors.prototype.create = function(state, reversable) {
    // Record this action in history.
    if (reversable === undefined || reversable === true) {
        this._history.push_action('cursors.create', arguments, 'cursors.pop', []);
    }

    // Create a proxying history method for the cursor itself.
    var index = this.cursors.length;
    var that = this;
    var history_proxy = function(forward_name, forward_params, backward_name, backward_params, autogroup_delay) {
        that._history.push_action(
            'cursors._cursor_proxy', [index, forward_name, forward_params],
            'cursors._cursor_proxy', [index, backward_name, backward_params],
            autogroup_delay);
    };

    // Create the cursor.
    var new_cursor = new cursor.Cursor(this._model, history_proxy);
    this.cursors.push(new_cursor);

    // Set the initial properties of the cursor.
    new_cursor.set_state(state, false);

    // Listen for cursor change events.
    var that = this;
    new_cursor.on('change', function() {
        that.trigger('change', new_cursor);
        that._update_selection();
    });
    that.trigger('change', new_cursor);

    return new_cursor;
};

/**
 * Remove every cursor except for the first one.
 */
Cursors.prototype.single = function() {
    while (this.cursors.length > 1) {
        this.pop();
    }
};

/**
 * Remove the last cursor.
 * @returns {Cursor} last cursor or null
 */
Cursors.prototype.pop = function() {
    if (this.cursors.length > 1) {

        // Remove the last cursor and unregister it.
        var cursor = this.cursors.pop();
        cursor.unregister();
        cursor.off('change');

        // Record this action in history.
        this._history.push_action('cursors.pop', [], 'cursors.create', [cursor.get_state()]);

        // Alert listeners of changes.
        this.trigger('change');
        return cursor;
    }
    return null;
};

/**
 * Handles when the selected text is copied to the clipboard.
 * @param  {string} text - by val text that was cut
 * @return {null}
 */
Cursors.prototype._handle_copy = function(text) {
    this.cursors.forEach(function(cursor) {
        cursor.copy();
    });
};

/**
 * Handles when the selected text is cut to the clipboard.
 * @param  {string} text - by val text that was cut
 * @return {null}
 */
Cursors.prototype._handle_cut = function(text) {
    this.cursors.forEach(function(cursor) {
        cursor.cut();
    });
};

/**
 * Handles when text is pasted into the document.
 * @param  {string} text
 * @return {null}
 */
Cursors.prototype._handle_paste = function(text) {

    // If the modulus of the number of cursors and the number of pasted lines
    // of text is zero, split the cut lines among the cursors.
    var lines = text.split('\n');
    if (this.cursors.length > 1 && lines.length > 1 && lines.length % this.cursors.length === 0) {
        var lines_per_cursor = lines.length / this.cursors.length;
        this.cursors.forEach(function(cursor, index) {
            cursor.insert_text(lines.slice(
                index * lines_per_cursor, 
                index * lines_per_cursor + lines_per_cursor).join('\n'));
        });
    } else {
        this.cursors.forEach(function(cursor) {
            cursor.paste(text);
        });
    }
};

/**
 * Update the clippable text based on new selection.
 * @return {null}
 */
Cursors.prototype._update_selection = function() {
    
    // Copy all of the selected text.
    var selections = [];
    this.cursors.forEach(function(cursor) {
        selections.push(cursor.get());
    });

    // Make the copied text clippable.
    this._clipboard.set_clippable(selections.join('\n'));
};

/**
 * Starts selecting text from mouse coordinates.
 * @param  {MouseEvent} e - mouse event containing the coordinates.
 * @return {null}
 */
Cursors.prototype.start_selection = function(e) {
    var x = e.offsetX;
    var y = e.offsetY;

    this._selecting_text = true;
    if (this.get_row_char) {
        var location = this.get_row_char(x, y);
        this.cursors[0].set_both(location.row_index, location.char_index);
    }
};

/**
 * Finalizes the selection of text.
 * @return {null}
 */
Cursors.prototype.end_selection = function() {
    this._selecting_text = false;
};

/**
 * Sets the endpoint of text selection from mouse coordinates.
 * @param  {MouseEvent} e - mouse event containing the coordinates.
 * @return {null}
 */
Cursors.prototype.set_selection = function(e) {
    var x = e.offsetX;
    var y = e.offsetY;
    if (this._selecting_text && this.get_row_char) {
        var location = this.get_row_char(x, y);
        this.cursors[this.cursors.length-1].set_primary(location.row_index, location.char_index);
    }
};

/**
 * Sets the endpoint of text selection from mouse coordinates.
 * Different than set_selection because it doesn't need a call
 * to start_selection to work.
 * @param  {MouseEvent} e - mouse event containing the coordinates.
 * @return {null}
 */
Cursors.prototype.start_set_selection = function(e) {
    this._selecting_text = true;
    this.set_selection(e);
};

/**
 * Selects a word at the given mouse coordinates.
 * @param  {MouseEvent} e - mouse event containing the coordinates.
 * @return {null}
 */
Cursors.prototype.select_word = function(e) {
    var x = e.offsetX;
    var y = e.offsetY;
    if (this.get_row_char) {
        var location = this.get_row_char(x, y);
        this.cursors[this.cursors.length-1].select_word(location.row_index, location.char_index);
    }
};

// Exports
exports.Cursors = Cursors;
