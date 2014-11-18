var cursor = require('./cursor.js');
var utils = require('./utils.js');

/**
 * Manages one or more cursors
 */
var Cursors = function(model, input_dispatcher) {
    utils.PosterClass.call(this);
    this._model = model;
    this._input_dispatcher = input_dispatcher;
    this.get_row_char = undefined;
    this.cursors = [];
    this._mouse_down = false;

    // Create initial cursor.
    this.create();

    // Listen to events.
    this._input_dispatcher.on('mousedown', utils.proxy(this._handle_mousedown, this));
    this._input_dispatcher.on('mouseup', utils.proxy(this._handle_mouseup, this));
    this._input_dispatcher.on('mousemove', utils.proxy(this._handle_mousemove, this));
};
utils.inherit(Cursors, utils.PosterClass);

/**
 * Creates a cursor and manages it.
 * @return {Cursor} cursor
 */
Cursors.prototype.create = function() {
    var new_cursor = new cursor.Cursor(this._model, this._input_dispatcher);
    this.cursors.push(new_cursor);

    var that = this;
    new_cursor.on('change', function() {
        that.trigger('change', new_cursor);
    });

    return new_cursor;
};
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

/**
 * Handles when the control is mousedowned.
 * @param  {float} x
 * @param  {float} y
 * @return {null}
 */
Cursors.prototype._handle_mousedown = function(x, y) {
    this._mouse_down = true;
    if (this.get_row_char) {
        var location = this.get_row_char(x, y);
        this.cursors[0].set_start(location.row_index, location.char_index);
    }
};

/**
 * Handles when the control is mouseuped.
 * @param  {float} x
 * @param  {float} y
 * @return {null}
 */
Cursors.prototype._handle_mouseup = function(x, y) {
    this._mouse_down = false;
};

/**
 * Handles when the control is mousemoved.
 * @param  {float} x
 * @param  {float} y
 * @return {null}
 */
Cursors.prototype._handle_mousemove = function(x, y) {
    if (this._mouse_down && this.get_row_char) {
        var location = this.get_row_char(x, y);
        this.cursors[0].set_end(location.row_index, location.char_index);
    }
};

// Exports
exports.Cursors = Cursors;
