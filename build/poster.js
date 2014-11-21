!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.poster=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var scrolling_canvas = require('./scrolling_canvas.js');
var document_controller = require('./document_controller.js');
var document_model = require('./document_model.js');
var document_view = require('./document_view.js');
var utils = require('./utils.js');

/**
 * Canvas based text editor
 */
var Poster = function() {
    utils.PosterClass.call(this);

    // Create canvas
    this.canvas = new scrolling_canvas.ScrollingCanvas();
    this.el = this.canvas.el; // Convenience

    // Create model, controller, and view.
    this.model = new document_model.DocumentModel();
    this.controller = new document_controller.DocumentController(this.canvas.el, this.model);
    this.view = new document_view.DocumentView(this.canvas, this.model, this.controller.cursors, {keyword: 'red'});

    // Create properties
    var that = this;
    this.property('value', function() {
        return that.model.text;
    }, function(value) {
        that.model.text = value;
    });
    this.property('width', function() {
        return that.view.width;
    }, function(value) {
        that.view.width = value;
    });
    this.property('height', function() {
        return that.view.height;
    }, function(value) {
        that.view.height = value;
    });
};
utils.inherit(Poster, utils.PosterClass);

// Exports
exports.Poster = Poster;

},{"./document_controller.js":6,"./document_model.js":7,"./document_view.js":8,"./scrolling_canvas.js":19,"./utils.js":20}],2:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('./utils.js');

/**
 * Animation helper.
 */
var Animator = function(duration) {
    utils.PosterClass.call(this);
    this.duration = duration;
    this._start = new Date().getTime();
};
utils.inherit(Animator, utils.PosterClass);

/**
 * Get the time in the animation
 * @return {float} between 0 and 1
 */
Animator.prototype.time = function() {
    var elapsed = new Date().getTime() - this._start;
    return (elapsed % this.duration) / this.duration;
};

exports.Animator = Animator;
},{"./utils.js":20}],3:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var utils = require('./utils.js');

/**
 * HTML canvas with drawing convinience functions.
 */
var Canvas = function() {
    utils.PosterClass.call(this);
    this._layout();
    this._init_properties();

    // Set default size.
    this.width = 400;
    this.height = 300;
};
utils.inherit(Canvas, utils.PosterClass);

/**
 * Layout the elements for the canvas.
 * Creates `this.el`
 * 
 * @return {null}
 */
Canvas.prototype._layout = function() {
    this._canvas = document.createElement('canvas');
    this._canvas.setAttribute('class', 'poster hidden-canvas');
    this.context = this._canvas.getContext('2d');
        
    // Stretch the image for retina support.
    this.scale(2,2);
};

/**
 * Make the properties of the class.
 * @return {null}
 */
Canvas.prototype._init_properties = function() {
    var that = this;

    /**
     * Height of the canvas
     * @return {float}
     */
    this.property('height', function() { 
        return that._canvas.height / 2; 
    }, function(value) {
        that._canvas.setAttribute('height', value * 2);
    });

    /**
     * Width of the canvas
     * @return {float}
     */
    this.property('width', function() { 
        return that._canvas.width / 2; 
    }, function(value) {
        that._canvas.setAttribute('width', value * 2);
    });
};

/**
 * Draws a rectangle
 * @param  {float} x
 * @param  {float} y
 * @param  {float} width
 * @param  {float} height
 * @param  {dictionary} options, see _apply_options() for details
 * @return {null}
 */
Canvas.prototype.draw_rectangle = function(x, y, width, height, options) {
    x = this._tx(x);
    y = this._ty(y);
    this.context.beginPath();
    this.context.rect(x, y, width, height);
    this._do_draw(options);
};

/**
 * Draws a circle
 * @param  {float} x
 * @param  {float} y
 * @param  {float} r
 * @param  {dictionary} options, see _apply_options() for details
 * @return {null}
 */
Canvas.prototype.draw_circle = function(x, y, r, options) {
    x = this._tx(x);
    y = this._ty(y);
    this.context.beginPath();
    this.context.arc(x, y, r, 0, 2 * Math.PI);
    this._do_draw(options);
};

/**
 * Draws an image
 * @param  {img element} img
 * @param  {float} x
 * @param  {float} y
 * @param  {float} (optional) width
 * @param  {float} (optional) height
 * @return {null}
 */
Canvas.prototype.draw_image = function(img, x, y, width, height) {
    x = this._tx(x);
    y = this._ty(y);
    this.context.drawImage(img, x, y, width, height);
};

/**
 * Draws a line
 * @param  {float} x1
 * @param  {float} y1
 * @param  {float} x2
 * @param  {float} y2
 * @param  {dictionary} options, see _apply_options() for details
 * @return {null}
 */
Canvas.prototype.draw_line = function(x1, y1, x2, y2, options) {
    x1 = this._tx(x1);
    y1 = this._ty(y1);
    x2 = this._tx(x2);
    y2 = this._ty(y2);
    this.context.beginPath();
    this.context.moveTo(x1, y1);
    this.context.lineTo(x2, y2);
    this._do_draw(options);
};

/**
 * Draws a poly line
 * @param  {array} points - array of points.  Each point is
 *                          an array itself, of the form [x, y] 
 *                          where x and y are floating point
 *                          values.
 * @param  {dictionary} options, see _apply_options() for details
 * @return {null}
 */
Canvas.prototype.draw_polyline = function(points, options) {
    if (points.length < 2) {
        throw new Error('Poly line must have atleast two points.');
    } else {
        this.context.beginPath();
        var point = points[0];
        this.context.moveTo(this._tx(point[0]), this._ty(point[1]));
        for (var i = 1; i < points.length; i++) {
            point = points[i];
            this.context.lineTo(this._tx(point[0]), this._ty(point[1]));
        }
        this._do_draw(options);    
    }
};

/**
 * Draws a text string
 * @param  {float} x
 * @param  {float} y
 * @param  {string} text string or callback that resolves to a string.
 * @param  {dictionary} options, see _apply_options() for details
 * @return {null}
 */
Canvas.prototype.draw_text = function(x, y, text, options) {
    x = this._tx(x);
    y = this._ty(y);
    options = this._apply_options(options);
    // 'fill' the text by default when neither a stroke or fill 
    // is defined.  Otherwise only fill if a fill is defined.
    if (options.fill || !options.stroke) {
        this.context.fillText(text, x, y);
    }
    // Only stroke if a stroke is defined.
    if (options.stroke) {
        this.context.strokeText(text, x, y);       
    }
};

/**
 * Measures the width of a text string.
 * @param  {string} text
 * @param  {dictionary} options, see _apply_options() for details
 * @return {float} width
 */
Canvas.prototype.measure_text = function(text, options) {
    options = this._apply_options(options);
    return this.context.measureText(text).width;
};

/**
 * Clear's the canvas.
 * @return {null}
 */
Canvas.prototype.clear = function() {
    this.context.clearRect(0, 0, this.width, this.height);
};

/**
 * Scale the current drawing.
 * @param  {float} x
 * @param  {float} y
 * @return {null}  
 */
Canvas.prototype.scale = function(x, y) {
    this.context.scale(x, y);
};

/**
 * Finishes the drawing operation using the set of provided options.
 * @param  {dictionary} (optional) dictionary that 
 *  resolves to a dictionary.
 * @return {null}
 */
Canvas.prototype._do_draw = function(options) {
    options = this._apply_options(options);

    // Only fill if a fill is defined.
    if (options.fill) {
        this.context.fill();
    }
    // Stroke by default, if no stroke or fill is defined.  Otherwise
    // only stroke if a stroke is defined.
    if (options.stroke || !options.fill) {
        this.context.stroke();
    }
};

/**
 * Applies a dictionary of drawing options to the pen.
 * @param  {dictionary} options
 *      alpha {float} Opacity (0-1)
 *      composite_operation {string} How new images are 
 *          drawn onto an existing image.  Possible values
 *          are `source-over`, `source-atop`, `source-in`, 
 *          `source-out`, `destination-over`, 
 *          `destination-atop`, `destination-in`, 
 *          `destination-out`, `lighter`, `copy`, or `xor`.
 *      line_cap {string} End cap style for lines.
 *          Possible values are 'butt', 'round', or 'square'.
 *      line_join {string} How to render where two lines
 *          meet.  Possible values are 'bevel', 'round', or
 *          'miter'.
 *      line_width {float} How thick lines are.
 *      line_miter_limit {float} Max length of miters.
 *      line_color {string} Color of the line.
 *      fill_color {string} Color to fill the shape.
 *      color {string} Color to stroke and fill the shape.
 *          Lower priority to line_color and fill_color.
 *      font_style {string}
 *      font_variant {string}
 *      font_weight {string}
 *      font_size {string}
 *      font_family {string}
 *      font {string} Overriddes all other font properties.
 *      text_align {string} Horizontal alignment of text.  
 *          Possible values are `start`, `end`, `center`,
 *          `left`, or `right`.
 *      text_baseline {string} Vertical alignment of text.
 *          Possible values are `alphabetic`, `top`, 
 *          `hanging`, `middle`, `ideographic`, or 
 *          `bottom`.
 * @return {dictionary} options, resolved.
 */
Canvas.prototype._apply_options = function(options) {
    options = options || {};
    options = utils.resolve_callable(options);

    // Special options.
    this.context.globalAlpha = options.alpha || 1.0;
    this.context.globalCompositeOperation = options.composite_operation || 'source-over';
    
    // Line style.
    this.context.lineCap = options.line_cap || 'butt';
    this.context.lineJoin = options.line_join || 'bevel';
    this.context.lineWidth = options.line_width || 1.0;
    this.context.miterLimit = options.line_miter_limit || 10;
    this.context.strokeStyle = options.line_color || options.color || 'black'; // TODO: Support gradient
    options.stroke = (options.line_color !== undefined || options.line_width !== undefined);

    // Fill style.
    this.context.fillStyle = options.fill_color || options.color || 'black'; // TODO: Support gradient
    options.fill = options.fill_color !== undefined;

    // Font style.
    var font_style = options.font_style || '';
    var font_variant = options.font_variant || '';
    var font_weight = options.font_weight || '';
    var font_size = options.font_size || '12pt';
    var font_family = options.font_family || 'Arial';
    var font = font_style + ' ' + font_variant + ' ' + font_weight + ' ' + font_size + ' ' + font_family;
    this.context.font = options.font || font;

    // Text style.
    this.context.textAlign = options.text_align || 'left';
    this.context.textBaseline = options.text_baseline || 'top';

    // TODO: Support shadows.

    return options;
};

/**
 * Transform an x value before rendering.
 * @param  {float} x
 * @return {float}
 */
Canvas.prototype._tx = function(x) { return x; };

/**
 * Transform a y value before rendering.
 * @param  {float} y
 * @return {float}
 */
Canvas.prototype._ty = function(y) { return y; };

// Exports
exports.Canvas = Canvas;

},{"./utils.js":20}],4:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var keymap = require('./events/map.js');
var register = keymap.Map.register;

var utils = require('./utils.js');

/**
 * Input cursor.
 */
var Cursor = function(model) {
    utils.PosterClass.call(this);
    this._model = model;
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
    register('cursor.keypress', utils.proxy(this.keypress, this), this);
    register('cursor.newline', utils.proxy(this.newline, this), this);
    register('cursor.delete_forward', utils.proxy(this.delete_forward, this), this);
    register('cursor.delete_backward', utils.proxy(this.delete_backward, this), this);
    register('cursor.left', function() { that.move_cursor(-1, 0); return true; }, this);
    register('cursor.right', function() { that.move_cursor(1, 0); return true; }, this);
    register('cursor.up', function() { that.move_cursor(0, -1); return true; }, this);
    register('cursor.down', function() { that.move_cursor(0, 1); return true; }, this);
    register('cursor.select_left', function() { that.move_cursor(-1, 0, true); return true; }, this);
    register('cursor.select_right', function() { that.move_cursor(1, 0, true); return true; }, this);
    register('cursor.select_up', function() { that.move_cursor(0, -1, true); return true; }, this);
    register('cursor.select_down', function() { that.move_cursor(0, 1, true); return true; }, this);
};
utils.inherit(Cursor, utils.PosterClass);

/**
 * Remove the registered actions for this cursor.
 * @return {null}
 */
Cursor.prototype.destroy = function() {
    keymap.Map.unregister_by_tag(this);
};

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
Cursor.prototype.keypress = function(e) {
    var char_code = e.which || e.keyCode;
    var char_typed = String.fromCharCode(char_code);
    this._remove_blob();
    this._model.add_text(this._start_row, this._start_char, char_typed);
    this.set_start(this._start_row, this._start_char + 1);
    return true;
};

/**
 * Create a newline where the cursor is.
 * @return {null}
 */
Cursor.prototype.newline = function() {
    this._remove_blob();
    this._model.add_text(this._start_row, this._start_char, '\n');
    this.set_start(this._start_row + 1, 0);
    return true;
};

/**
 * Handles when delete is pressed.
 * @return {null}
 */
Cursor.prototype.delete_forward = function() {
    if (!this._remove_blob()) {
        var moved = this._calculate_move_cursor(this._start_row, this._start_char, 0, 1);
        if (moved.moved) {
            this._model.remove_text(this._start_row, this._start_char, moved.row_index, moved.char_index);
            this.set_start(this._start_row, this._start_char);
        }
    }
    return true;
};

/**
 * Handles when backspace is pressed.
 * @return {null}
 */
Cursor.prototype.delete_backward = function() {
    if (!this._remove_blob()) {
        var moved = this._calculate_move_cursor(this._start_row, this._start_char, 0, -1);
        if (moved.moved) {
            this._model.remove_text(moved.row_index, moved.char_index, this._start_row, this._start_char);
            this.set_start(moved.row_index, moved.char_index);    
        }
    }
    return true;
};

/**
 * Moves the cursor in a direction
 * @param  {integer} delta_x
 * @param  {integer} delta_y
 * @return {boolean} true if moved
 */
Cursor.prototype.move_cursor = function(delta_x, delta_y, selecting) {
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
},{"./events/map.js":10,"./utils.js":20}],5:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var keymap = require('./events/map.js');
var register = keymap.Map.register;

var cursor = require('./cursor.js');
var utils = require('./utils.js');
/**
 * Manages one or more cursors
 */
var Cursors = function(model) {
    utils.PosterClass.call(this);
    this._model = model;
    this.get_row_char = undefined;
    this.cursors = [];
    this._selecting_text = false;

    // Create initial cursor.
    this.create();

    // Register actions.
    register('cursors.start_selection', utils.proxy(this.start_selection, this));
    register('cursors.set_selection', utils.proxy(this.set_selection, this));
    register('cursors.end_selection', utils.proxy(this.end_selection, this));
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
        this.cursors[0].set_start(location.row_index, location.char_index);
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
        this.cursors[0].set_end(location.row_index, location.char_index);
    }
};

// Exports
exports.Cursors = Cursors;

},{"./cursor.js":4,"./events/map.js":10,"./utils.js":20}],6:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('./utils.js');
var normalizer = require('./events/normalizer.js');
var keymap = require('./events/map.js');
var default_keymap = require('./events/default.js');
var cursors = require('./cursors.js');
var test_highlighter = require('./highlighters/test.js');

/**
 * Controller for a DocumentModel.
 */
var DocumentController = function(el, model) {
    utils.PosterClass.call(this);
    this.normalizer = new normalizer.Normalizer();
    this.normalizer.listen_to(el);
    this.map = new keymap.Map(this.normalizer);
    this.map.map(default_keymap.map);

    this.cursors = new cursors.Cursors(model);
    this._highlighter = new test_highlighter.TestHighlighter(model);
};
utils.inherit(DocumentController, utils.PosterClass);

// Exports
exports.DocumentController = DocumentController;

},{"./cursors.js":5,"./events/default.js":9,"./events/map.js":10,"./events/normalizer.js":11,"./highlighters/test.js":13,"./utils.js":20}],7:[function(require,module,exports){
var utils = require('./utils.js');

/**
 * Model containing all of the document's data (text).
 */
var DocumentModel = function() {
    utils.PosterClass.call(this);
    this._rows = [];
    this._row_tags = [];
    this._tag_lock = 0;
    this._init_properties();
};
utils.inherit(DocumentModel, utils.PosterClass);

/**
 // Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

* Acquire a lock on tag events
 *
 * Prevents tag events from firing.
 * @return {integer} lock count
 */
DocumentModel.prototype.acquire_tag_event_lock = function() {
    return this._tag_lock++;
};

/**
 * Release a lock on tag events
 * @return {integer} lock count
 */
DocumentModel.prototype.release_tag_event_lock = function() {
    this._tag_lock--;
    if (this._tag_lock < 0) this._tag_lock = 0;
    return this._tag_lock;
};

/**
 * Triggers the tag change events.
 * @return {null}
 */
DocumentModel.prototype.trigger_tag_events = function() {
    if (this._tag_lock === 0) {
        this.trigger('tags_changed');
        this.trigger('changed');    
    }
};

/**
 * Sets a 'tag' on the text specified.
 * @param {integer} start_row - row the tag starts on
 * @param {integer} start_char - index, in the row, of the first tagged character
 * @param {integer} end_row - row the tag ends on
 * @param {integer} end_char - index, in the row, of the last tagged character
 * @param {string} tag_name
 * @param {any} tag_value - overrides any previous tags
 */
DocumentModel.prototype.set_tag = function(start_row, start_char, end_row, end_char, tag_name, tag_value) {
    for (var row = start_row; row <= end_row; row++) {
        var start = start_char;
        var end = end_char;
        if (row > start_row) { start = -1; }
        if (row < end_row) { end = -1; }

        // Remove or modify conflicting tags.
        var add_tags = [];
        this._row_tags[row].filter(function(tag) {
            if (tag.name == tag_name) {
                // Check if tag is within
                if (start == -1 && end == -1) {
                    return false;
                }
                if (tag.start >= start && (tag.end < end || end == -1)) {
                    return false;
                }
                
                // Check if tag is outside
                // To the right?
                if (tag.start > end && end != -1) {
                    return true;
                }
                // To the left?
                if (tag.end < start && tag.end != -1) {
                    return true;
                }

                // Check if tag encapsulates
                var left_intersecting = tag.start < start;
                var right_intersecting = end != -1 && (tag.end == -1 || tag.end > end);

                // Check if tag is left intersecting
                if (left_intersecting) {
                    add_tags.push({name: tag_name, value: tag.value, start: tag.start, end: start-1});
                }

                // Check if tag is right intersecting
                if (right_intersecting) {
                    add_tags.push({name: tag_name, value: tag.value, start: end+1, end: tag.end});
                }
                return false;
            }
        });
        
        // Add tags and corrected tags.
        this._row_tags[row] = this._row_tags[row].concat(add_tags);
        this._row_tags[row].push({name: tag_name, value: tag_value, start: start, end: end});
    }
    this.trigger_tag_events();
};

/**
 * Removed all of the tags on the document.
 * @return {null}
 */
DocumentModel.prototype.clear_tags = function() {
    for (var i = 0; i < this._row_tags.length; i++) {
        this._row_tags[i] = [];
    }
    this.trigger('tags_changed');
    this.trigger('changed');
};

/**
 * Get the tags applied to a character.
 * @param  {integer} row_index
 * @param  {integer} char_index
 * @return {dictionary}
 */
DocumentModel.prototype.get_tags = function(row_index, char_index) {
    var tags = {};
    this._row_tags[row_index].forEach(function(tag) {
        // Tag start of -1 means the tag continues to the previous line.
        var after_start = (char_index >= tag.start || tag.start == -1);
        // Tag end of -1 means the tag continues to the next line.
        var before_end = (char_index <= tag.end || tag.end == -1);
        if (after_start && before_end) {
            tags[tag.name] = tag.value;
        }
    });
    return tags;
};

/**
 * Adds text efficiently somewhere in the document.
 * @param {integer} row_index  
 * @param {integer} char_index 
 * @param {string} text
 */
DocumentModel.prototype.add_text = function(row_index, char_index, text) {
    // If the text has a new line in it, just re-set
    // the rows list.
    if (text.indexOf('\n') != -1) {
        var new_rows = [];
        if (row_index > 0) {
            new_rows = this._rows.slice(0, row_index);
        }

        var old_row = this._rows[row_index];
        var old_row_start = old_row.substring(0, char_index);
        var old_row_end = old_row.substring(char_index);
        var split_text = text.split('\n');
        new_rows.push(old_row_start + split_text[0]);

        if (split_text.length > 2) {
            new_rows = new_rows.concat(split_text.slice(1,split_text.length-1));
        }

        new_rows.push(split_text[split_text.length-1] + old_row_end);

        if (row_index+1 < this._rows.length) {
            new_rows = new_rows.concat(this._rows.slice(row_index+1));
        }

        this._rows = new_rows;
        this._resized_rows();

    // Text doesn't have any new lines, just modify the
    // line and then trigger the row changed event.
    } else {
        var old_text = this._rows[row_index];
        this._rows[row_index] = old_text.substring(0, char_index) + text + old_text.substring(char_index);
        this.trigger('row_changed', row_index);
        this.trigger('changed');
    }
};

/**
 * Removes a block of text from the document
 * @param  {integer} start_row
 * @param  {integer} start_char
 * @param  {integer} end_row
 * @param  {integer} end_char
 * @return {null}
 */
DocumentModel.prototype.remove_text = function(start_row, start_char, end_row, end_char) {
    if (start_row == end_row) {
        this._rows[start_row] = this._rows[start_row].substring(0, start_char) + this._rows[start_row].substring(end_char);
    } else {
        this._rows[start_row] = this._rows[start_row].substring(0, start_char) + this._rows[end_row].substring(end_char);
    }

    if (end_row - start_row > 0) {
        this._rows.splice(start_row + 1, end_row - start_row);
        this._resized_rows();
    } else if (end_row == start_row) {
        this.trigger('row_changed', start_row);
        this.trigger('changed');
    } else {
        this.trigger('row_changed', start_row);
        this.trigger('row_changed', end_row);
        this.trigger('changed');
    }
};

/**
 * Add a row to the document
 * @param {integer} row_index
 * @param {string} text - new row's text
 */
DocumentModel.prototype.add_row = function(row_index, text) {
    var new_rows = [];
    if (row_index > 0) {
        new_rows = this._rows.slice(0, row_index);
    }
    new_rows.push(text);
    if (row_index < this._rows.length) {
        new_rows = new_rows.concat(this._rows.slice(row_index));
    }

    this._rows = new_rows;
    this._resized_rows();
};

/**
 * Gets the text of the document.
 * @return {string}
 */
DocumentModel.prototype._get_text = function() {
    return this._rows.join('\n');
};

/**
 * Sets the text of the document.
 * Complexity O(N) for N rows
 * @param {string} value
 */
DocumentModel.prototype._set_text = function(value) {
    this._rows = value.split('\n');
    this._resized_rows();
};

/**
 * Updates _row's partner arrays.
 * @return {null} 
 */
DocumentModel.prototype._resized_rows = function() {

    // Make sure there are as many tag rows as there are text rows.
    while (this._row_tags.length < this._rows.length) {
        this._row_tags.push([]);
    }
    if (this._row_tags.length > this._rows.length) {
        this._row_tags.splice(this._rows.length, this._row_tags.length - this._rows.length);
    }

    // Trigger events
    this.trigger('text_changed');
    this.trigger('changed');
};

/**
 * Create the document's properties.
 * @return {null}
 */
DocumentModel.prototype._init_properties = function() {    
    var that = this;
    this.property('rows', function() { 
        // Return a shallow copy of the array so it cannot be modified.
        return [].concat(that._rows); 
    });
    this.property('text', 
        utils.proxy(this._get_text, this), 
        utils.proxy(this._set_text, this));
};

exports.DocumentModel = DocumentModel;
},{"./utils.js":20}],8:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('./utils.js');

// Renderers
var batch = require('./renderers/batch.js');
var highlighted_row = require('./renderers/highlighted_row.js');
var cursors = require('./renderers/cursors.js');

/**
 * Visual representation of a DocumentModel instance
 * @param {Canvas} canvas instance
 * @param {DocumentModel} model instance
 * @param {Cursors} cursors_model instance
 * @param {dictionary} style - describes rendering style
 */
var DocumentView = function(canvas, model, cursors_model, style) {
    this._model = model;

    // Create child renderers.
    var row_renderer = new highlighted_row.HighlightedRowRenderer(model, canvas, style);
    var cursors_renderer = new cursors.CursorsRenderer(
        cursors_model, 
        style, 
        utils.proxy(row_renderer.get_row_height, row_renderer), 
        utils.proxy(row_renderer.get_row_top, row_renderer), 
        utils.proxy(row_renderer.measure_partial_row_width, row_renderer),
        function() { return canvas.focused; });

    // Pass get_row_char into cursors.
    cursors_model.get_row_char = utils.proxy(row_renderer.get_row_char, row_renderer);

    // Call base constructor.
    batch.BatchRenderer.call(this, [
        row_renderer,
        cursors_renderer,
    ], canvas);

    // Hookup render events.
    this._canvas.on('redraw', utils.proxy(this.render, this));
    this._model.on('changed', utils.proxy(canvas.redraw, canvas));

    // Create properties
    this.property('style', function(){
        return row_renderer.style;
    }, function(value) {
        row_renderer.style = value;
        cursors_renderer.style = value;
    });
};
utils.inherit(DocumentView, batch.BatchRenderer);

exports.DocumentView = DocumentView;
},{"./renderers/batch.js":14,"./renderers/cursors.js":15,"./renderers/highlighted_row.js":16,"./utils.js":20}],9:[function(require,module,exports){
exports.map = {
    'keypress' : 'cursor.keypress',
    'enter' : 'cursor.newline',
    'delete' : 'cursor.delete_forward',
    'backspace' : 'cursor.delete_backward',
    'left' : 'cursor.left',
    'right' : 'cursor.right',
    'up' : 'cursor.up',
    'down' : 'cursor.down',
    'shift-left' : 'cursor.select_left',
    'shift-right' : 'cursor.select_right',
    'shift-up' : 'cursor.select_up',
    'shift-down' : 'cursor.select_down',
    'mouse0-down' : 'cursors.start_selection',
    'mouse-move' : 'cursors.set_selection',
    'mouse0-up' : 'cursors.end_selection',
};
},{}],10:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var utils = require('../utils.js');

/**
 * Event normalizer
 *
 * Listens to DOM events and emits 'cleaned' versions of those events.
 */
var Map = function(normalizer) {
    utils.PosterClass.call(this);
    this._map = {};

    // Create normalizer property
    this._normalizer = null;
    this._proxy_handle_event = utils.proxy(this._handle_event, this);
    var that = this;
    this.property('normalizer', function() {
        return that._normalizer;
    }, function(value) {
        // Remove event handler.
        if (that._normalizer) that._normalizer.off_all(that._proxy_handle_event);
        // Set, and add event handler.
        that._normalizer = value;
        if (value) value.on_all(that._proxy_handle_event);
    });

    // If defined, set the normalizer.
    if (normalizer) this.normalizer = normalizer;
};
utils.inherit(Map, utils.PosterClass);

/**
 * Map of API methods by name.
 * @type {dictionary}
 */
Map.registry = {};
Map._registry_tags = {};

/**
 * Registers an action.
 * @param  {string} name - name of the action
 * @param  {function} f
 * @param  {Object} (optional) tag - allows you to specify a tag
 *                  which can be used with the `unregister_by_tag`
 *                  method to quickly unregister actions with
 *                  the tag specified.
 * @return {null}
 */
Map.register = function(name, f, tag) {
    if (utils.is_array(Map.registry[name])) {
        Map.registry[name].push(f);
    } else {
        if (Map.registry[name]===undefined) {
            Map.registry[name] = f;
        } else {
            Map.registry[name] = [Map.registry[name], f];
        }
    }

    if (tag) {
        if (Map._registry_tags[tag] === undefined) {
            Map._registry_tags[tag] = [];
        }
        Map._registry_tags[tag].push({name: name, f: f});
    }
};

/**
 * Unregister an action.
 * @param  {string} name - name of the action
 * @param  {function} f
 * @return {boolean} true if action was found and unregistered
 */
Map.unregister = function(name, f) {
    if (utils.is_array(Map.registry[name])) {
        var index = Map.registry[name].indexOf(f);
        if (index != -1) {
            Map.registry[name].splice(index, 1);
            return true;
        }
    } else if (Map.registry[name] == f) {
        delete Map.registry[name];
        return true;
    }
    return false;
};

/**
 * Unregisters all of the actions registered with a given tag.
 * @param  {Object} tag - specified in Map.register.
 * @return {boolean} true if the tag was found and deleted.
 */
Map.unregister_by_tag = function(tag) {
    if (Map._registry_tags[tag]) {
        Map._registry_tags[tag].forEach(function(registration) {
            Map.unregister(registration.name, registration.f);
        });
        delete Map._registry_tags[tag];
        return true;
    }
};

/**
 * Append event actions to the map.
 *
 * This method has two signatures.  If a single argument
 * is passed to it, that argument is treated like a
 * dictionary.  If more than one argument is passed to it,
 * each argument is treated as alternating key, value
 * pairs of a dictionary.
 *
 * The map allows you to register actions for keys.
 * Example:
 *     map.append_map({
 *         'ctrl-a': 'cursors.select_all',
 *     })
 *
 * Multiple actions can be registered for a single event.
 * The actions are executed sequentially, until one action
 * returns `true` in which case the execution haults.  This
 * allows actions to run conditionally.
 * Example:
 *     // Implementing a dual mode editor, you may have two
 *     // functions to register for one key. i.e.:
 *     var do_a = function(e) {
 *         if (mode=='edit') {
 *             console.log('A');
 *             return true;
 *         }
 *     }
 *     var do_b = function(e) {
 *         if (mode=='command') {
 *             console.log('B');
 *             return true;
 *         }
 *     }
 *
 *     // To register both for one key
 *     Map.register('action_a', do_a);
 *     Map.register('action_b', do_b);
 *     map.append_map({
 *         'alt-v': ['action_a', 'action_b'],
 *     });
 * 
 * @return {null}
 */
Map.prototype.append_map = function() {
    var that = this;
    var parsed = this._parse_map_arguments(arguments);
    Object.keys(parsed).forEach(function(key) {
        if (that._map[key] === undefined) {
            that._map[key] = parsed[key];
        } else {
            that._map[key] = that._map[key].concat(parsed[key]);
        }
    });
};

/**
 * Alias for `append_map`.
 * @type {function}
 */
Map.prototype.map = Map.prototype.append_map;

/**
 * Prepend event actions to the map.
 *
 * See the doc for `append_map` for a detailed description of
 * possible input values.
 * @return {null}
 */
Map.prototype.prepend_map = function() {
    var that = this;
    var parsed = this._parse_map_arguments(arguments);
    Object.keys(parsed).forEach(function(key) {
        if (that._map[key] === undefined) {
            that._map[key] = parsed[key];
        } else {
            that._map[key] = parsed[key].concat(that._map[key]);
        }
    });
};

/**
 * Unmap event actions in the map.
 *
 * See the doc for `append_map` for a detailed description of
 * possible input values.
 * @return {null}
 */
Map.prototype.unmap = function() {
    var that = this;
    var parsed = this._parse_map_arguments(arguments);
    Object.keys(parsed).forEach(function(key) {
        if (that._map[key] !== undefined) {
            parsed[key].forEach(function(value) {
                var index = that._map[key].indexOf(value);
                if (index != -1) {
                    that._map[key].splice(index, 1);
                }
            });
        }
    });
};

/**
 * Get a modifiable array of the actions for a particular event.
 * @param  {string} event
 * @return {array} by ref copy of the actions registered to an event.
 */
Map.prototype.get_mapping = function(event) {
    return this._map[this._normalize_event_name(event)];
};

/**
 * Parse the arguments to a map function.
 * @param  {arguments array} args
 * @return {dictionary} parsed results
 */
Map.prototype._parse_map_arguments = function(args) {
    var parsed = {};
    var that = this;

    // One arument, treat it as a dictionary of event names and
    // actions.
    if (args.length == 1) {
        Object.keys(args[0]).forEach(function(key) {
            var value = args[0][key];
            var normalized_key = that._normalize_event_name(key);

            // If the value is not an array, wrap it in one.
            if (!utils.is_array(value)) {
                value = [value];
            }

            // If the key is already defined, concat the values to
            // it.  Otherwise, set it.
            if (parsed[normalized_key] === undefined) {
                parsed[normalized_key] = value;
            } else {
                parsed[normalized_key] = parsed[normalized_key].concat(value);
            }
        });

    // More than one argument.  Treat as the format:
    // event_name1, action1, event_name2, action2, ..., event_nameN, actionN
    } else {
        for (var i=0; i<Math.floor(args.length/2); i++) {
            var key = that._normalize_event_name(args[2*i]);
            var value = args[2*i + 1];
            if (parsed[key]===undefined) {
                parsed[key] = [value];
            } else {
                parsed[key].push(value);
            }
        }
    }
    return parsed;
};

/**
 * Handles a normalized event.
 * @param  {string} name - name of the event
 * @param  {Event} e - browser Event object
 * @return {null}
 */
Map.prototype._handle_event = function(name, e) {
    var that = this;
    var normalized_event = this._normalize_event_name(name);
    var actions = this._map[normalized_event];

    if (actions) {
        actions.forEach(function(action) {
            var action_callbacks = Map.registry[action];
            if (action_callbacks) {
                if (utils.is_array(action_callbacks)) {
                    action_callbacks.forEach(function(action_callback) {
                        if (action_callback.call(undefined, e)===true) {
                            that._cancel_bubble(e);
                            return true;
                        }
                    });
                } else {
                    if (action_callbacks.call(undefined, e)===true) {
                        that._cancel_bubble(e);
                        return true;
                    }
                }
            }
        });
    }
    return false;
};

/**
 * Alphabetically sorts keys in event name, so
 * @param  {string} name - event name
 * @return {string} normalized event name
 */
Map.prototype._normalize_event_name = function(name) {
    return name.toLowerCase().trim().split('-').sort().join('-');
};

/**
 * Cancels event bubbling.
 * @param  {event} e
 * @return {null}
 */
Map.prototype._cancel_bubble = function(e) {
    if (e.stopPropagation) e.stopPropagation();
    if (e.cancelBubble !== null) e.cancelBubble = true;
    if (e.preventDefault) e.preventDefault();
};

// Exports
exports.Map = Map;

},{"../utils.js":20}],11:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var utils = require('../utils.js');

/**
 * Event normalizer
 *
 * Listens to DOM events and emits 'cleaned' versions of those events.
 */
var Normalizer = function() {
    utils.PosterClass.call(this);
};
utils.inherit(Normalizer, utils.PosterClass);

/**
 * Listen to the events of an element.
 * @param  {HTMLElement} el
 * @return {null}
 */
Normalizer.prototype.listen_to = function(el) {
    el.onkeypress = this._proxy('press', this._handle_keypress_event, el);
    el.onkeydown =  this._proxy('down', this._handle_keyboard_event, el);
    el.onkeyup =  this._proxy('up', this._handle_keyboard_event, el);
    el.ondblclick =  this._proxy('dblclick', this._handle_mouse_event, el);
    el.onclick =  this._proxy('click', this._handle_mouse_event, el);
    el.onmousedown =  this._proxy('down', this._handle_mouse_event, el);
    el.onmouseup =  this._proxy('up', this._handle_mouse_event, el);
    el.onmousemove =  this._proxy('move', this._handle_mousemove_event, el);
};

/**
 * Stops listening to an element.
 * @param  {HTMLElement} el
 * @return {null}
 */
Normalizer.prototype.stop_listening_to = function(el) {
    el.onkeypress = null;
    el.onkeydown = null;
    el.ondblclick = null;
    el.onclick = null;
    el.onmousedown = null;
    el.onmouseup = null;
    el.onmousemove = null;
};

/**
 * Handles when a mouse event occurs
 * @param  {HTMLElement} el
 * @param  {Event} e
 * @return {null}
 */
Normalizer.prototype._handle_mouse_event = function(el, event_name, e) {
    e = e || window.event;
    this.trigger(this._modifier_string(e) + 'mouse' + e.button + '-' + event_name, e);
};

/**
 * Handles when a mouse event occurs
 * @param  {HTMLElement} el
 * @param  {Event} e
 * @return {null}
 */
Normalizer.prototype._handle_mousemove_event = function(el, event_name, e) {
    e = e || window.event;
    this.trigger(this._modifier_string(e) + 'mouse' + '-' + event_name, e);
};

/**
 * Handles when a keyboard event occurs
 * @param  {HTMLElement} el
 * @param  {Event} e
 * @return {null}
 */
Normalizer.prototype._handle_keyboard_event = function(el, event_name, e) {
    e = e || window.event;
    var keyname = this._lookup_keycode(e.keyCode);
    if (keyname !== undefined) {
        this.trigger(this._modifier_string(e) + keyname + '-' + event_name, e);

        if (event_name=='down') {            
            this.trigger(this._modifier_string(e) + keyname, e);
        }
    }
    this.trigger(this._modifier_string(e) + String(e.keyCode) + '-' + event_name, e);
    this.trigger('key' + event_name, e);
};

/**
 * Handles when a keypress event occurs
 * @param  {HTMLElement} el
 * @param  {Event} e
 * @return {null}
 */
Normalizer.prototype._handle_keypress_event = function(el, event_name, e) {
    this.trigger('keypress', e);
};

/**
 * Creates an element event proxy.
 * @param  {function} f
 * @param  {string} event_name
 * @param  {HTMLElement} el
 * @return {null}
 */
Normalizer.prototype._proxy = function(event_name, f, el) {
    var that = this;
    return function() {
        var args = [el, event_name].concat(Array.prototype.slice.call(arguments, 0));
        return f.apply(that, args);
    };
};

/**
 * Create a modifiers string from an event.
 * @param  {Event} e
 * @return {string} dash separated modifier string
 */
Normalizer.prototype._modifier_string = function(e) {
    var modifiers = [];
    if (e.ctrlKey) modifiers.push('ctrl');
    if (e.altKey) modifiers.push('alt');
    if (e.metaKey) modifiers.push('meta');
    if (e.shiftKey) modifiers.push('shift');
    var string = modifiers.sort().join('-');
    if (string.length > 0) string = string + '-';
    return string;
};

/**
 * Lookup the human friendly name for a keycode.
 * @param  {integer} keycode
 * @return {string} key name
 */
Normalizer.prototype._lookup_keycode = function(keycode) {
    if (112 <= keycode && keycode <= 123) { // F1-F12
        return 'f' + (keycode-111);
    } else if (48 <= keycode && keycode <= 57) { // 0-9
        return String(keycode-48);
    } else if (65 <= keycode && keycode <= 90) { // A-Z
        return 'abcdefghijklmnopqrstuvwxyz'.substring(String(keycode-65), String(keycode-64));
    } else {
        var codes = {
            8: 'backspace',
            9: 'tab',
            13: 'enter',
            16: 'shift',
            17: 'ctrl',
            18: 'alt',
            19: 'pause',
            20: 'capslock',
            27: 'esc',
            32: 'space',
            33: 'pageup',
            34: 'pagedown',
            35: 'end',
            36: 'home',
            37: 'left',
            38: 'up',
            39: 'right',
            40: 'down',
            44: 'printscreen',
            45: 'insert',
            46: 'delete',
            91: 'windows',
            93: 'menu',
            144: 'numlock',
            145: 'scrolllock',
            188: 'comma',
            190: 'period',
            191: 'fowardslash',
            192: 'tilde',
            219: 'leftbracket',
            220: 'backslash',
            221: 'rightbracket',
            222: 'quote',
        };
        return codes[keycode];
    } 
    // TODO: this function is missing some browser specific
    // keycode mappings.
};

// Exports
exports.Normalizer = Normalizer;

},{"../utils.js":20}],12:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('../utils.js');

/**
 * Listens to a model and higlights the text accordingly.
 * @param {DocumentModel} model
 */
var HighlighterBase = function(model) {
    utils.PosterClass.call(this);
    this._model = model;
    this._queued = null;
    this.delay = 100; //ms

    // Bind events.
    this._model.on('text_changed', utils.proxy(this._queue_highlighter, this));
    this._model.on('row_changed', utils.proxy(this._queue_highlighter, this));
};
utils.inherit(HighlighterBase, utils.PosterClass);

/**
 * Highlight the document
 * @return {null}
 */
HighlighterBase.prototype.highlight = function() {
    throw new Error('Not implemented');
};

/**
 * Queues a highlight operation.
 *
 * If a highlight operation is already queued, don't queue
 * another one.  This ensures that the highlighting is
 * frame rate locked.  Highlighting is an expensive operation.
 * @return {null}
 */
HighlighterBase.prototype._queue_highlighter = function() {
    if (this._queued === null) {
        var that = this;
        this._queued = setTimeout(function() {
            that._model.acquire_tag_event_lock();
            try {
                that.highlight();
            } finally {
                that._model.release_tag_event_lock();
                that._model.trigger_tag_events();
                that._queued = null;
            }
        }, this.delay);
    }
};

// Exports
exports.HighlighterBase = HighlighterBase;

},{"../utils.js":20}],13:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('../utils.js');
var highlighter = require('./highlighter.js');

/**
 * Listens to a model and higlights the text accordingly.
 * @param {DocumentModel} model
 */
var TestHighlighter = function(model) {
    highlighter.HighlighterBase.call(this, model);
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

// Exports
exports.TestHighlighter = TestHighlighter;

},{"../utils.js":20,"./highlighter.js":12}],14:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('../utils.js');
var renderer = require('./renderer.js');

/**
 * Groups multiple renderers
 * @param {array} renderers - array of renderers
 * @param {Canvas} canvas
 */
var BatchRenderer = function(renderers, canvas) {
    renderer.RendererBase.call(this, canvas);
    this._renderers = renderers;

    // Listen to the layers, if one layer changes, recompose
    // the full image by copying them all again.
    var that = this;
    this._renderers.forEach(function(renderer) {
        renderer.on('changed', function() {
            that._copy_renderers();
        });
    });
    
    // Create properties.
    this.property('width', function() {
        return that._canvas.width;
    }, function(value) {
        that._canvas.width = value;
        that._renderers.forEach(function(renderer) {
            renderer.width = value;
        });
    });
    this.property('height', function() {
        return that._canvas.height;
    }, function(value) {
        that._canvas.height = value;
        that._renderers.forEach(function(renderer) {
            renderer.height = value;
        });
    });
};
utils.inherit(BatchRenderer, renderer.RendererBase);

/**
 * Render to the canvas
 * @return {null}
 */
BatchRenderer.prototype.render = function() {
    var that = this;
    this._renderers.forEach(function(renderer) {

        // Apply the rendering coordinate transforms of the parent.
        renderer._canvas._tx = utils.proxy(that._canvas._tx, that._canvas);
        renderer._canvas._ty = utils.proxy(that._canvas._ty, that._canvas);

        // Tell the renderer to render itself.
        renderer.render();
    });

    // Copy the results to self.
    this._copy_renderers();
};

/**
 * Copies all the renderer layers to the canvas.
 * @return {null}
 */
BatchRenderer.prototype._copy_renderers = function() {
    var that = this;
    this._canvas.clear();
    this._renderers.forEach(function(renderer) {
        that._copy_renderer(renderer);
    });
};

/**
 * Copy a renderer to the canvas.
 * @param  {RendererBase} renderer
 * @return {null}
 */
BatchRenderer.prototype._copy_renderer = function(renderer) {
    this._canvas.draw_image(
        renderer._canvas._canvas, 
        -this._canvas._tx(0), 
        -this._canvas._ty(0), 
        this._canvas.width, 
        this._canvas.height);
};

// Exports
exports.BatchRenderer = BatchRenderer;

},{"../utils.js":20,"./renderer.js":17}],15:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var animator = require('../animator.js');
var utils = require('../utils.js');
var renderer = require('./renderer.js');

/**
 * Render document cursors
 */
var CursorsRenderer = function(cursors, style, get_row_height, get_row_top, measure_partial_row, has_focus) {
    renderer.RendererBase.call(this);
    this.style = style;
    this._has_focus = has_focus;
    this._cursors = cursors;
    this._get_row_height = get_row_height;
    this._get_row_top = get_row_top;
    this._measure_partial_row = measure_partial_row;
    this._blink_animator = new animator.Animator(1000);
    this._fps = 100;

    // Start the cursor rendering clock.
    this._render_clock();
};
utils.inherit(CursorsRenderer, renderer.RendererBase);

/**
 * Render to the canvas
 * Note: This method is called often, so it's important that it's
 * optimized for speed.
 * @return {null}
 */
CursorsRenderer.prototype.render = function() {
    this._canvas.clear();

    // Only render if the canvas has focus.
    if (this._has_focus()) {
        var that = this;
        this._cursors.cursors.forEach(function(cursor) {

            // If a cursor doesn't have a position, render it at the
            // beginning of the document.
            var row_index = cursor._start_row || 0;
            var char_index = cursor._start_char || 0;
            
            // Draw the cursor.
            that._canvas.draw_rectangle(
                char_index === 0 ? 0 : that._measure_partial_row(row_index, char_index), 
                that._get_row_top(row_index), 
                1, 
                that._get_row_height(row_index), 
                {
                    fill_color: 'red',
                    alpha: Math.max(0, Math.sin(Math.PI * that._blink_animator.time())),
                }
            );

            // Draw the selection box.
            if (cursor._end_row !== null && cursor._end_char !== null &&
                cursor._end_row != row_index && cursor._end_char != char_index) {
                
                for (var i = row_index; i <= cursor._end_row; i++) {

                    var left = 0;
                    if (i == row_index && char_index > 0) {
                        left = that._measure_partial_row(i, char_index);
                    }

                    that._canvas.draw_rectangle(
                        left, 
                        that._get_row_top(i), 
                        i !== cursor._end_row ? that._measure_partial_row(i) - left : that._measure_partial_row(i, cursor._end_char) - left, 
                        that._get_row_height(i), 
                        {
                            fill_color: 'skyblue',
                            alpha: 0.5,
                        }
                    );

                }
            }
        });
    }
};

/**
 * Clock for rendering the cursor.
 * @return {null}
 */
CursorsRenderer.prototype._render_clock = function() {
    // If the canvas is focused, redraw.
    if (this._has_focus()) {
        this._was_focused = true;
        this.render();
        // Tell parent layer this one has changed.
        this.trigger('changed');

    // The canvas isn't focused.  If this is the first time
    // it hasn't been focused, render again without the 
    // cursors.
    } else if (this._was_focused) {
        this._was_focused = false;
        this.render();
        // Tell parent layer this one has changed.
        this.trigger('changed');
    }

    // 100 FPS
    setTimeout(utils.proxy(this._render_clock, this), 1000 / this._fps); 
};

// Exports
exports.CursorsRenderer = CursorsRenderer;

},{"../animator.js":2,"../utils.js":20,"./renderer.js":17}],16:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('../utils.js');
var row = require('./row.js');

/**
 * Render the text rows of a DocumentModel.
 * @param {DocumentModel} model instance
 */
var HighlightedRowRenderer = function(model, scrolling_canvas, style) {
    row.RowRenderer.call(this, model, scrolling_canvas);
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
        this._canvas.draw_text(left, this.get_row_top(index), groups[i].text, groups[i].options);
        left += this._canvas.measure_text(groups[i].text, groups[i].options);
    }
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

},{"../utils.js":20,"./row.js":18}],17:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var canvas = require('../canvas.js');
var utils = require('../utils.js');

/**
 * Renders to a canvas
 * @param {Canvas} default_canvas
 */
var RendererBase = function(default_canvas) {
    utils.PosterClass.call(this);
    this._canvas = default_canvas ? default_canvas : new canvas.Canvas();
    
    // Create properties.
    var that = this;
    this.property('width', function() {
        return that._canvas.width;
    }, function(value) {
        that._canvas.width = value;
    });
    this.property('height', function() {
        return that._canvas.height;
    }, function(value) {
        that._canvas.height = value;
    });
        
    // Stretch the image for retina support.
    this._canvas.scale(2,2);
};
utils.inherit(RendererBase, utils.PosterClass);

/**
 * Render to the canvas
 * @return {null}
 */
RendererBase.prototype.render = function() {
    throw new Error('Not implemented');
};

// Exports
exports.RendererBase = RendererBase;

},{"../canvas.js":3,"../utils.js":20}],18:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('../utils.js');
var renderer = require('./renderer.js');

/**
 * Render the text rows of a DocumentModel.
 * @param {DocumentModel} model instance
 */
var RowRenderer = function(model, scrolling_canvas) {
    this._scrolling_canvas = scrolling_canvas;
    renderer.RendererBase.call(this);
    this._model = model;

    // Set some basic rendering properties.
    this._base_options = {
        font_family: 'monospace',
        font_size: 12,
    };
    this._line_spacing = 2;

    this._model.on('tags_changed', utils.proxy(this._handle_value_changed, this));
    this._model.on('text_changed', utils.proxy(this._handle_value_changed, this));
    this._model.on('row_changed', utils.proxy(this._handle_row_changed, this)); // TODO: Implement my event.
};
utils.inherit(RowRenderer, renderer.RendererBase);

/**
 * Render to the canvas
 * Note: This method is called often, so it's important that it's
 * optimized for speed.
 * @return {null}
 */
RowRenderer.prototype.render = function() {
    this._canvas.clear();

    // Find the row closest to the scroll top.  If that row is below
    // the scroll top, use the row above it.
    var row_index = Math.floor(this._scrolling_canvas.scroll_top  / this.get_row_height());

    // Render till there are no rows left, or the top of the row is
    // below the bottom of the visible area.
    for (var i = row_index; 
        i < Math.min(row_index + Math.ceil(this._scrolling_canvas.height / this.get_row_height()), this._model._rows.length); 
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
RowRenderer.prototype.get_row_char = function(cursor_x, cursor_y) {
    var row_index = Math.floor((cursor_y + this._scrolling_canvas.scroll_top) / this.get_row_height());

    // Find the character index.
    var widths = [0];
    try {
        for (var length=1; length<=this._model._rows[row_index].length; length++) {
            widths.push(this.measure_partial_row_width(row_index, length));
        }
    } catch (e) {
        // Nom nom nom...
    }
    return {row_index: row_index, char_index: utils.find_closest(widths, cursor_x + this._scrolling_canvas.scroll_left)};
};

/**
 * Measures the partial width of a text row.
 * @param  {integer} index
 * @param  {integer} (optional) length - number of characters
 * @return {float} width
 */
RowRenderer.prototype.measure_partial_row_width = function(index, length) {
    if (index >= this._model._rows.length) { throw new Error('Row index ' + index + ' does not exist'); }
    var text = this._model._rows[index];
    text = length === undefined ? text : text.substring(0, length);
    return this._canvas.measure_text(text, this._base_options);
};

/**
 * Measures the height of a text row as if it were rendered.
 * @param  {integer} index
 * @return {float} height
 */
RowRenderer.prototype.get_row_height = function(index) {
    return this._base_options.font_size + this._line_spacing;
};

/**
 * Gets the top of the row when rendered
 * @param  {integer} index
 * @return {null}
 */
RowRenderer.prototype.get_row_top = function(index) {
    return index * this.get_row_height(index);
};

/**
 * Handles when the model's value changes
 * Complexity: O(N) for N rows of text.
 * @return {null}
 */
RowRenderer.prototype._handle_value_changed = function() {

    // Calculate the document width.
    var document_width = 0;
    for (var i=0; i<this._model._rows.length; i++) {
        document_width = Math.max(this._measure_row_width(i), document_width);
    }
    this._scrolling_canvas.scroll_width = document_width;
    this._scrolling_canvas.scroll_height = this._model._rows.length * this.get_row_height();
};

/**
 * Handles when one of the model's rows change
 * @return {null}
 */
RowRenderer.prototype._handle_row_changed = function(index) {
    this._scrolling_canvas.scroll_width = Math.max(this._measure_row_width(index), this._scrolling_canvas.scroll_width);
};

/**
 * Render a single row
 * @param  {integer} index
 * @return {null}
 */
RowRenderer.prototype._render_row = function(index) {
    this._canvas.draw_text(0, this._row_tops[index], this._model._rows[index], this._base_options);
};

/**
 * Measures the width of a text row as if it were rendered.
 * @param  {integer} index
 * @return {float} width
 */
RowRenderer.prototype._measure_row_width = function(index) {
    return this.measure_partial_row_width(index, this._model._rows[index].length);
};

// Exports
exports.RowRenderer = RowRenderer;

},{"../utils.js":20,"./renderer.js":17}],19:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var canvas = require('./canvas.js');
var utils = require('./utils.js');

/**
 * HTML canvas with drawing convinience functions.
 */
var ScrollingCanvas = function() {
    canvas.Canvas.call(this);
    this._bind_events();

    // Set default size.
    this.width = 400;
    this.height = 300;
};
utils.inherit(ScrollingCanvas, canvas.Canvas);

/**
 * Causes the canvas contents to be redrawn.
 * @return {null}
 */
ScrollingCanvas.prototype.redraw = function() {
    this.clear();
    this.trigger('redraw');
};

/**
 * Layout the elements for the canvas.
 * Creates `this.el`
 * 
 * @return {null}
 */
ScrollingCanvas.prototype._layout = function() {
    canvas.Canvas.prototype._layout.call(this);
    // Change the canvas class so it's not hidden.
    this._canvas.setAttribute('class', 'canvas');

    this.el = document.createElement('div');
    this.el.setAttribute('class', 'poster scroll-window');
    this.el.setAttribute('tabindex', 0);
    this._scroll_bars = document.createElement('div');
    this._scroll_bars.setAttribute('class', 'scroll-bars');
    this._dummy = document.createElement('div');
    this._dummy.setAttribute('class', 'scroll-dummy');

    this.el.appendChild(this._canvas);
    this.el.appendChild(this._scroll_bars);
    this._scroll_bars.appendChild(this._dummy);
};

/**
 * Make the properties of the class.
 * @return {null}
 */
ScrollingCanvas.prototype._init_properties = function() {
    var that = this;

    /**
     * Width of the scrollable canvas area
     */
    this.property('scroll_width', function() {
        // Get
        return that._scroll_width || 0;
    }, function(value) {
        // Set
        that._scroll_width = value;
        that._move_dummy(that._scroll_width, that._scroll_height || 0);
    });

    /**
     * Height of the scrollable canvas area.
     */
    this.property('scroll_height', function() {
        // Get
        return that._scroll_height || 0;
    }, function(value) {
        // Set
        that._scroll_height = value;
        that._move_dummy(that._scroll_width || 0, that._scroll_height);
    });

    /**
     * Top most pixel in the scrolled window.
     */
    this.property('scroll_top', function() {
        // Get
        return that._scroll_bars.scrollTop;
    }, function(value) {
        // Set
        that._scroll_bars.scrollTop = value;
    });

    /**
     * Left most pixel in the scrolled window.
     */
    this.property('scroll_left', function() {
        // Get
        return that._scroll_bars.scrollLeft;
    }, function(value) {
        // Set
        that._scroll_bars.scrollLeft = value;
    });

    /**
     * Height of the canvas
     * @return {float}
     */
    this.property('height', function() { 
        return that._canvas.height / 2; 
    }, function(value) {
        that._canvas.setAttribute('height', value * 2);
        that.el.setAttribute('style', 'width: ' + that.width + '; height: ' + value + ';');

        that.trigger('resize', {height: value});
        that._try_redraw();
    });

    /**
     * Width of the canvas
     * @return {float}
     */
    this.property('width', function() { 
        return that._canvas.width / 2; 
    }, function(value) {
        that._canvas.setAttribute('width', value * 2);
        that.el.setAttribute('style', 'width: ' + value + '; height: ' + that.height + ';');

        that.trigger('resize', {width: value});
        that._try_redraw();
    });

    /**
     * Is the canvas or related elements focused?
     * @return {boolean}
     */
    this.property('focused', function() {
        return document.activeElement === that.el ||
            document.activeElement === that._scroll_bars ||
            document.activeElement === that._dummy ||
            document.activeElement === that._canvas;
    });
};

/**
 * Bind to the events of the canvas.
 * @return {null}
 */
ScrollingCanvas.prototype._bind_events = function() {
    var that = this;

    // Trigger scroll and redraw events on scroll.
    this._scroll_bars.onscroll = function(e) {
        that.trigger('scroll', e);
        that._try_redraw();
    };
};

/**
 * Queries to see if redraw is okay, and then redraws if it is.
 * @return {boolean} true if redraw happened.
 */
ScrollingCanvas.prototype._try_redraw = function() {
    if (this._query_redraw()) {
        this.redraw();
        return true;
    }
    return false;
};

/**
 * Trigger the 'query_redraw' event.
 * @return {boolean} true if control should redraw itself.
 */
ScrollingCanvas.prototype._query_redraw = function() {
    return this.trigger('query_redraw').every(function(x) { return x; }); 
};

/**
 * Moves the dummy element that causes the scrollbar to appear.
 * @param  {float} x
 * @param  {float} y
 * @return {null}
 */
ScrollingCanvas.prototype._move_dummy = function(x, y) {
    this._dummy.setAttribute('style', 'left: ' + String(x) + '; top: ' + String(y) + ';');
};

/**
 * Transform an x value based on scroll position.
 * @param  {float} x
 * @return {float}
 */
ScrollingCanvas.prototype._tx = function(x) { return x - this.scroll_left; };

/**
 * Transform a y value based on scroll position.
 * @param  {float} y
 * @return {float}
 */
ScrollingCanvas.prototype._ty = function(y) { return y - this.scroll_top; };

// Exports
exports.ScrollingCanvas = ScrollingCanvas;

},{"./canvas.js":3,"./utils.js":20}],20:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

/**
Base class with helpful utilities
*/
var PosterClass = function() {
    this._events = {};
    this._on_all = [];
};

/**
 * Define a property for the class
 * @param  {string} name
 * @param  {function} getter
 * @param  {function} setter
 * @return {null}
 */
PosterClass.prototype.property = function(name, getter, setter) {
    Object.defineProperty(this, name, {
        get: getter,
        set: setter,
        configurable: true
    });
};

/**
 * Register an event listener
 * @param  {string} event
 * @param  {function} handler
 * @param  {object} context
 * @return {null}
 */
PosterClass.prototype.on = function(event, handler, context) {
    event = event.trim().toLowerCase();

    // Make sure a list for the event exists.
    if (!this._events[event]) { this._events[event] = []; }

    // Push the handler and the context to the event's callback list.
    this._events[event].push([handler, context]);
};

/**
 * Unregister one or all event listeners for a specific event
 * @param  {string} event
 * @param  {callback} (optional) handler
 * @return {null}
 */
PosterClass.prototype.off = function(event, handler) {
    event = event.trim().toLowerCase();
    
    // If a handler is specified, remove all the callbacks
    // with that handler.  Otherwise, just remove all of
    // the registered callbacks.
    if (handler) {
        this._events[event] = this._events[event].filter(function(callback) {
            return callback[0] !== handler;
        });
    } else {
        this._events[event] = [];
    }
};

/**
 * Register a global event handler. 
 * 
 * A global event handler fires for any event that's
 * triggered.
 * @param  {string} handler - function that accepts one
 *                            argument, the name of the
 *                            event,
 * @return {null}
 */
PosterClass.prototype.on_all = function(handler) {
    var index = this._on_all.indexOf(handler);
    if (index === -1) {
        this._on_all.push(handler);
    }
};

/**
 * Unregister a global event handler.
 * @param  {[type]} handler
 * @return {boolean} true if a handler was removed
 */
PosterClass.prototype.off_all = function(handler) {
    var index = this._on_all.indexOf(handler);
    if (index != -1) {
        this._on_all.splice(index, 1);
        return true;
    }
    return false;
};

/**
 * Triggers the callbacks of an event to fire.
 * @param  {string} event
 * @return {array} array of return values
 */
PosterClass.prototype.trigger = function(event) {
    event = event.trim().toLowerCase();

    // Convert arguments to an array and call callbacks.
    var args = Array.prototype.slice.call(arguments);
    args.splice(0,1);

    // Trigger global handlers first.
    this._on_all.forEach(function(handler) {
        handler.apply(this, [event].concat(args));
    });

    // Trigger individual handlers second.
    var events = this._events[event];
    if (events) {
        var returns = [];
        events.forEach(function(callback) {
            returns.push(callback[0].apply(callback[1], args));
        });
        return returns;
    }
    return [];
};

/**
 * Cause one class to inherit from another
 * @param  {type} child
 * @param  {type} parent
 * @return {null}
 */
var inherit = function(child, parent) {
    child.prototype = Object.create(parent.prototype, {});
};

/**
 * Checks if a value is callable
 * @param  {any} value
 * @return {boolean}
 */
var callable = function(value) {
    return typeof value == 'function';
};

/**
 * Calls the value if it's callable and returns it's return.
 * Otherwise returns the value as-is.
 * @param  {any} value
 * @return {any}
 */
var resolve_callable = function(value) {
    if (callable(value)) {
        return value.call(this);
    } else {
        return value;
    }
};

/**
 * Creates a proxy to a function so it is called in the correct context.
 * @return {function} proxied function.
 */
var proxy = function(f, context) {
    if (f===undefined) { throw new Error('f cannot be undefined'); }
    return function() { return f.apply(context, arguments); };
};

/**
 * Clears an array in place.
 *
 * Despite an O(N) complexity, this seems to be the fastest way to clear
 * a list in place in Javascript. 
 * Benchmark: http://jsperf.com/empty-javascript-array
 * Complexity: O(N)
 * @param  {array} array
 * @return {null}
 */
var clear_array = function(array) {
    while (array.length > 0) {
        array.pop();
    }
};

/**
 * Checks if a value is an array
 * @param  {any} x
 * @return {boolean} true if value is an array
 */
var is_array = function(x) {
    return x instanceof Array;
};

/**
 * Find the closest value in a list
 * 
 * Interpolation search algorithm.  
 * Complexity: O(lg(lg(N)))
 * @param  {array} sorted - sorted array of numbers
 * @param  {float} x - number to try to find
 * @return {integer} index of the value that's closest to x
 */
var find_closest = function(sorted, x) {
    var min = sorted[0];
    var max = sorted[sorted.length-1];
    if (x < min) return 0;
    if (x > max) return sorted.length-1;
    if (sorted.length == 2) {
        if (max - x > x - min) {
            return 0;
        } else {
            return 1;
        }
    }
    var rate = (max - min) / sorted.length;
    if (rate === 0) return 0;
    var guess = Math.floor(x / rate);
    if (sorted[guess] == x) {
        return guess;
    } else if (guess > 0 && sorted[guess-1] < x && x < sorted[guess]) {
        return find_closest(sorted.slice(guess-1, guess+1), x) + guess-1;
    } else if (guess < sorted.length-1 && sorted[guess] < x && x < sorted[guess+1]) {
        return find_closest(sorted.slice(guess, guess+2), x) + guess;
    } else if (sorted[guess] > x) {
        return find_closest(sorted.slice(0, guess), x);
    } else if (sorted[guess] < x) {
        return find_closest(sorted.slice(guess+1), x) + guess+1;
    }
};

/**
 * Make a shallow copy of a dictionary.
 * @param  {dictionary} x
 * @return {dictionary}
 */
var shallow_copy = function(x) {
    var y = {};
    for (var key in x) {
        if (x.hasOwnProperty(key)) {
            y[key] = x[key];
        }
    }
    return y;
};

// Export names.
exports.PosterClass = PosterClass;
exports.inherit = inherit;
exports.callable = callable;
exports.resolve_callable = resolve_callable;
exports.proxy = proxy;
exports.clear_array = clear_array;
exports.is_array = is_array;
exports.find_closest = find_closest;
exports.shallow_copy = shallow_copy;

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzb3VyY2UvanMvcG9zdGVyLmpzIiwic291cmNlL2pzL2FuaW1hdG9yLmpzIiwic291cmNlL2pzL2NhbnZhcy5qcyIsInNvdXJjZS9qcy9jdXJzb3IuanMiLCJzb3VyY2UvanMvY3Vyc29ycy5qcyIsInNvdXJjZS9qcy9kb2N1bWVudF9jb250cm9sbGVyLmpzIiwic291cmNlL2pzL2RvY3VtZW50X21vZGVsLmpzIiwic291cmNlL2pzL2RvY3VtZW50X3ZpZXcuanMiLCJzb3VyY2UvanMvZXZlbnRzL2RlZmF1bHQuanMiLCJzb3VyY2UvanMvZXZlbnRzL21hcC5qcyIsInNvdXJjZS9qcy9ldmVudHMvbm9ybWFsaXplci5qcyIsInNvdXJjZS9qcy9oaWdobGlnaHRlcnMvaGlnaGxpZ2h0ZXIuanMiLCJzb3VyY2UvanMvaGlnaGxpZ2h0ZXJzL3Rlc3QuanMiLCJzb3VyY2UvanMvcmVuZGVyZXJzL2JhdGNoLmpzIiwic291cmNlL2pzL3JlbmRlcmVycy9jdXJzb3JzLmpzIiwic291cmNlL2pzL3JlbmRlcmVycy9oaWdobGlnaHRlZF9yb3cuanMiLCJzb3VyY2UvanMvcmVuZGVyZXJzL3JlbmRlcmVyLmpzIiwic291cmNlL2pzL3JlbmRlcmVycy9yb3cuanMiLCJzb3VyY2UvanMvc2Nyb2xsaW5nX2NhbnZhcy5qcyIsInNvdXJjZS9qcy91dGlscy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25PQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25GQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgc2Nyb2xsaW5nX2NhbnZhcyA9IHJlcXVpcmUoJy4vc2Nyb2xsaW5nX2NhbnZhcy5qcycpO1xudmFyIGRvY3VtZW50X2NvbnRyb2xsZXIgPSByZXF1aXJlKCcuL2RvY3VtZW50X2NvbnRyb2xsZXIuanMnKTtcbnZhciBkb2N1bWVudF9tb2RlbCA9IHJlcXVpcmUoJy4vZG9jdW1lbnRfbW9kZWwuanMnKTtcbnZhciBkb2N1bWVudF92aWV3ID0gcmVxdWlyZSgnLi9kb2N1bWVudF92aWV3LmpzJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG5cbi8qKlxuICogQ2FudmFzIGJhc2VkIHRleHQgZWRpdG9yXG4gKi9cbnZhciBQb3N0ZXIgPSBmdW5jdGlvbigpIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuXG4gICAgLy8gQ3JlYXRlIGNhbnZhc1xuICAgIHRoaXMuY2FudmFzID0gbmV3IHNjcm9sbGluZ19jYW52YXMuU2Nyb2xsaW5nQ2FudmFzKCk7XG4gICAgdGhpcy5lbCA9IHRoaXMuY2FudmFzLmVsOyAvLyBDb252ZW5pZW5jZVxuXG4gICAgLy8gQ3JlYXRlIG1vZGVsLCBjb250cm9sbGVyLCBhbmQgdmlldy5cbiAgICB0aGlzLm1vZGVsID0gbmV3IGRvY3VtZW50X21vZGVsLkRvY3VtZW50TW9kZWwoKTtcbiAgICB0aGlzLmNvbnRyb2xsZXIgPSBuZXcgZG9jdW1lbnRfY29udHJvbGxlci5Eb2N1bWVudENvbnRyb2xsZXIodGhpcy5jYW52YXMuZWwsIHRoaXMubW9kZWwpO1xuICAgIHRoaXMudmlldyA9IG5ldyBkb2N1bWVudF92aWV3LkRvY3VtZW50Vmlldyh0aGlzLmNhbnZhcywgdGhpcy5tb2RlbCwgdGhpcy5jb250cm9sbGVyLmN1cnNvcnMsIHtrZXl3b3JkOiAncmVkJ30pO1xuXG4gICAgLy8gQ3JlYXRlIHByb3BlcnRpZXNcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdGhpcy5wcm9wZXJ0eSgndmFsdWUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoYXQubW9kZWwudGV4dDtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0Lm1vZGVsLnRleHQgPSB2YWx1ZTtcbiAgICB9KTtcbiAgICB0aGlzLnByb3BlcnR5KCd3aWR0aCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC52aWV3LndpZHRoO1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQudmlldy53aWR0aCA9IHZhbHVlO1xuICAgIH0pO1xuICAgIHRoaXMucHJvcGVydHkoJ2hlaWdodCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC52aWV3LmhlaWdodDtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0LnZpZXcuaGVpZ2h0ID0gdmFsdWU7XG4gICAgfSk7XG59O1xudXRpbHMuaW5oZXJpdChQb3N0ZXIsIHV0aWxzLlBvc3RlckNsYXNzKTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5Qb3N0ZXIgPSBQb3N0ZXI7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG5cbi8qKlxuICogQW5pbWF0aW9uIGhlbHBlci5cbiAqL1xudmFyIEFuaW1hdG9yID0gZnVuY3Rpb24oZHVyYXRpb24pIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMuZHVyYXRpb24gPSBkdXJhdGlvbjtcbiAgICB0aGlzLl9zdGFydCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xufTtcbnV0aWxzLmluaGVyaXQoQW5pbWF0b3IsIHV0aWxzLlBvc3RlckNsYXNzKTtcblxuLyoqXG4gKiBHZXQgdGhlIHRpbWUgaW4gdGhlIGFuaW1hdGlvblxuICogQHJldHVybiB7ZmxvYXR9IGJldHdlZW4gMCBhbmQgMVxuICovXG5BbmltYXRvci5wcm90b3R5cGUudGltZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBlbGFwc2VkID0gbmV3IERhdGUoKS5nZXRUaW1lKCkgLSB0aGlzLl9zdGFydDtcbiAgICByZXR1cm4gKGVsYXBzZWQgJSB0aGlzLmR1cmF0aW9uKSAvIHRoaXMuZHVyYXRpb247XG59O1xuXG5leHBvcnRzLkFuaW1hdG9yID0gQW5pbWF0b3I7IiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKTtcblxuLyoqXG4gKiBIVE1MIGNhbnZhcyB3aXRoIGRyYXdpbmcgY29udmluaWVuY2UgZnVuY3Rpb25zLlxuICovXG52YXIgQ2FudmFzID0gZnVuY3Rpb24oKSB7XG4gICAgdXRpbHMuUG9zdGVyQ2xhc3MuY2FsbCh0aGlzKTtcbiAgICB0aGlzLl9sYXlvdXQoKTtcbiAgICB0aGlzLl9pbml0X3Byb3BlcnRpZXMoKTtcblxuICAgIC8vIFNldCBkZWZhdWx0IHNpemUuXG4gICAgdGhpcy53aWR0aCA9IDQwMDtcbiAgICB0aGlzLmhlaWdodCA9IDMwMDtcbn07XG51dGlscy5pbmhlcml0KENhbnZhcywgdXRpbHMuUG9zdGVyQ2xhc3MpO1xuXG4vKipcbiAqIExheW91dCB0aGUgZWxlbWVudHMgZm9yIHRoZSBjYW52YXMuXG4gKiBDcmVhdGVzIGB0aGlzLmVsYFxuICogXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DYW52YXMucHJvdG90eXBlLl9sYXlvdXQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9jYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICB0aGlzLl9jYW52YXMuc2V0QXR0cmlidXRlKCdjbGFzcycsICdwb3N0ZXIgaGlkZGVuLWNhbnZhcycpO1xuICAgIHRoaXMuY29udGV4dCA9IHRoaXMuX2NhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgICAgICBcbiAgICAvLyBTdHJldGNoIHRoZSBpbWFnZSBmb3IgcmV0aW5hIHN1cHBvcnQuXG4gICAgdGhpcy5zY2FsZSgyLDIpO1xufTtcblxuLyoqXG4gKiBNYWtlIHRoZSBwcm9wZXJ0aWVzIG9mIHRoZSBjbGFzcy5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuX2luaXRfcHJvcGVydGllcyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcblxuICAgIC8qKlxuICAgICAqIEhlaWdodCBvZiB0aGUgY2FudmFzXG4gICAgICogQHJldHVybiB7ZmxvYXR9XG4gICAgICovXG4gICAgdGhpcy5wcm9wZXJ0eSgnaGVpZ2h0JywgZnVuY3Rpb24oKSB7IFxuICAgICAgICByZXR1cm4gdGhhdC5fY2FudmFzLmhlaWdodCAvIDI7IFxuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQuX2NhbnZhcy5zZXRBdHRyaWJ1dGUoJ2hlaWdodCcsIHZhbHVlICogMik7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBXaWR0aCBvZiB0aGUgY2FudmFzXG4gICAgICogQHJldHVybiB7ZmxvYXR9XG4gICAgICovXG4gICAgdGhpcy5wcm9wZXJ0eSgnd2lkdGgnLCBmdW5jdGlvbigpIHsgXG4gICAgICAgIHJldHVybiB0aGF0Ll9jYW52YXMud2lkdGggLyAyOyBcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0Ll9jYW52YXMuc2V0QXR0cmlidXRlKCd3aWR0aCcsIHZhbHVlICogMik7XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIERyYXdzIGEgcmVjdGFuZ2xlXG4gKiBAcGFyYW0gIHtmbG9hdH0geFxuICogQHBhcmFtICB7ZmxvYXR9IHlcbiAqIEBwYXJhbSAge2Zsb2F0fSB3aWR0aFxuICogQHBhcmFtICB7ZmxvYXR9IGhlaWdodFxuICogQHBhcmFtICB7ZGljdGlvbmFyeX0gb3B0aW9ucywgc2VlIF9hcHBseV9vcHRpb25zKCkgZm9yIGRldGFpbHNcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuZHJhd19yZWN0YW5nbGUgPSBmdW5jdGlvbih4LCB5LCB3aWR0aCwgaGVpZ2h0LCBvcHRpb25zKSB7XG4gICAgeCA9IHRoaXMuX3R4KHgpO1xuICAgIHkgPSB0aGlzLl90eSh5KTtcbiAgICB0aGlzLmNvbnRleHQuYmVnaW5QYXRoKCk7XG4gICAgdGhpcy5jb250ZXh0LnJlY3QoeCwgeSwgd2lkdGgsIGhlaWdodCk7XG4gICAgdGhpcy5fZG9fZHJhdyhvcHRpb25zKTtcbn07XG5cbi8qKlxuICogRHJhd3MgYSBjaXJjbGVcbiAqIEBwYXJhbSAge2Zsb2F0fSB4XG4gKiBAcGFyYW0gIHtmbG9hdH0geVxuICogQHBhcmFtICB7ZmxvYXR9IHJcbiAqIEBwYXJhbSAge2RpY3Rpb25hcnl9IG9wdGlvbnMsIHNlZSBfYXBwbHlfb3B0aW9ucygpIGZvciBkZXRhaWxzXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DYW52YXMucHJvdG90eXBlLmRyYXdfY2lyY2xlID0gZnVuY3Rpb24oeCwgeSwgciwgb3B0aW9ucykge1xuICAgIHggPSB0aGlzLl90eCh4KTtcbiAgICB5ID0gdGhpcy5fdHkoeSk7XG4gICAgdGhpcy5jb250ZXh0LmJlZ2luUGF0aCgpO1xuICAgIHRoaXMuY29udGV4dC5hcmMoeCwgeSwgciwgMCwgMiAqIE1hdGguUEkpO1xuICAgIHRoaXMuX2RvX2RyYXcob3B0aW9ucyk7XG59O1xuXG4vKipcbiAqIERyYXdzIGFuIGltYWdlXG4gKiBAcGFyYW0gIHtpbWcgZWxlbWVudH0gaW1nXG4gKiBAcGFyYW0gIHtmbG9hdH0geFxuICogQHBhcmFtICB7ZmxvYXR9IHlcbiAqIEBwYXJhbSAge2Zsb2F0fSAob3B0aW9uYWwpIHdpZHRoXG4gKiBAcGFyYW0gIHtmbG9hdH0gKG9wdGlvbmFsKSBoZWlnaHRcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuZHJhd19pbWFnZSA9IGZ1bmN0aW9uKGltZywgeCwgeSwgd2lkdGgsIGhlaWdodCkge1xuICAgIHggPSB0aGlzLl90eCh4KTtcbiAgICB5ID0gdGhpcy5fdHkoeSk7XG4gICAgdGhpcy5jb250ZXh0LmRyYXdJbWFnZShpbWcsIHgsIHksIHdpZHRoLCBoZWlnaHQpO1xufTtcblxuLyoqXG4gKiBEcmF3cyBhIGxpbmVcbiAqIEBwYXJhbSAge2Zsb2F0fSB4MVxuICogQHBhcmFtICB7ZmxvYXR9IHkxXG4gKiBAcGFyYW0gIHtmbG9hdH0geDJcbiAqIEBwYXJhbSAge2Zsb2F0fSB5MlxuICogQHBhcmFtICB7ZGljdGlvbmFyeX0gb3B0aW9ucywgc2VlIF9hcHBseV9vcHRpb25zKCkgZm9yIGRldGFpbHNcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuZHJhd19saW5lID0gZnVuY3Rpb24oeDEsIHkxLCB4MiwgeTIsIG9wdGlvbnMpIHtcbiAgICB4MSA9IHRoaXMuX3R4KHgxKTtcbiAgICB5MSA9IHRoaXMuX3R5KHkxKTtcbiAgICB4MiA9IHRoaXMuX3R4KHgyKTtcbiAgICB5MiA9IHRoaXMuX3R5KHkyKTtcbiAgICB0aGlzLmNvbnRleHQuYmVnaW5QYXRoKCk7XG4gICAgdGhpcy5jb250ZXh0Lm1vdmVUbyh4MSwgeTEpO1xuICAgIHRoaXMuY29udGV4dC5saW5lVG8oeDIsIHkyKTtcbiAgICB0aGlzLl9kb19kcmF3KG9wdGlvbnMpO1xufTtcblxuLyoqXG4gKiBEcmF3cyBhIHBvbHkgbGluZVxuICogQHBhcmFtICB7YXJyYXl9IHBvaW50cyAtIGFycmF5IG9mIHBvaW50cy4gIEVhY2ggcG9pbnQgaXNcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICBhbiBhcnJheSBpdHNlbGYsIG9mIHRoZSBmb3JtIFt4LCB5XSBcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICB3aGVyZSB4IGFuZCB5IGFyZSBmbG9hdGluZyBwb2ludFxuICogICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlcy5cbiAqIEBwYXJhbSAge2RpY3Rpb25hcnl9IG9wdGlvbnMsIHNlZSBfYXBwbHlfb3B0aW9ucygpIGZvciBkZXRhaWxzXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DYW52YXMucHJvdG90eXBlLmRyYXdfcG9seWxpbmUgPSBmdW5jdGlvbihwb2ludHMsIG9wdGlvbnMpIHtcbiAgICBpZiAocG9pbnRzLmxlbmd0aCA8IDIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdQb2x5IGxpbmUgbXVzdCBoYXZlIGF0bGVhc3QgdHdvIHBvaW50cy4nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmNvbnRleHQuYmVnaW5QYXRoKCk7XG4gICAgICAgIHZhciBwb2ludCA9IHBvaW50c1swXTtcbiAgICAgICAgdGhpcy5jb250ZXh0Lm1vdmVUbyh0aGlzLl90eChwb2ludFswXSksIHRoaXMuX3R5KHBvaW50WzFdKSk7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgcG9pbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBwb2ludCA9IHBvaW50c1tpXTtcbiAgICAgICAgICAgIHRoaXMuY29udGV4dC5saW5lVG8odGhpcy5fdHgocG9pbnRbMF0pLCB0aGlzLl90eShwb2ludFsxXSkpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2RvX2RyYXcob3B0aW9ucyk7ICAgIFxuICAgIH1cbn07XG5cbi8qKlxuICogRHJhd3MgYSB0ZXh0IHN0cmluZ1xuICogQHBhcmFtICB7ZmxvYXR9IHhcbiAqIEBwYXJhbSAge2Zsb2F0fSB5XG4gKiBAcGFyYW0gIHtzdHJpbmd9IHRleHQgc3RyaW5nIG9yIGNhbGxiYWNrIHRoYXQgcmVzb2x2ZXMgdG8gYSBzdHJpbmcuXG4gKiBAcGFyYW0gIHtkaWN0aW9uYXJ5fSBvcHRpb25zLCBzZWUgX2FwcGx5X29wdGlvbnMoKSBmb3IgZGV0YWlsc1xuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5kcmF3X3RleHQgPSBmdW5jdGlvbih4LCB5LCB0ZXh0LCBvcHRpb25zKSB7XG4gICAgeCA9IHRoaXMuX3R4KHgpO1xuICAgIHkgPSB0aGlzLl90eSh5KTtcbiAgICBvcHRpb25zID0gdGhpcy5fYXBwbHlfb3B0aW9ucyhvcHRpb25zKTtcbiAgICAvLyAnZmlsbCcgdGhlIHRleHQgYnkgZGVmYXVsdCB3aGVuIG5laXRoZXIgYSBzdHJva2Ugb3IgZmlsbCBcbiAgICAvLyBpcyBkZWZpbmVkLiAgT3RoZXJ3aXNlIG9ubHkgZmlsbCBpZiBhIGZpbGwgaXMgZGVmaW5lZC5cbiAgICBpZiAob3B0aW9ucy5maWxsIHx8ICFvcHRpb25zLnN0cm9rZSkge1xuICAgICAgICB0aGlzLmNvbnRleHQuZmlsbFRleHQodGV4dCwgeCwgeSk7XG4gICAgfVxuICAgIC8vIE9ubHkgc3Ryb2tlIGlmIGEgc3Ryb2tlIGlzIGRlZmluZWQuXG4gICAgaWYgKG9wdGlvbnMuc3Ryb2tlKSB7XG4gICAgICAgIHRoaXMuY29udGV4dC5zdHJva2VUZXh0KHRleHQsIHgsIHkpOyAgICAgICBcbiAgICB9XG59O1xuXG4vKipcbiAqIE1lYXN1cmVzIHRoZSB3aWR0aCBvZiBhIHRleHQgc3RyaW5nLlxuICogQHBhcmFtICB7c3RyaW5nfSB0ZXh0XG4gKiBAcGFyYW0gIHtkaWN0aW9uYXJ5fSBvcHRpb25zLCBzZWUgX2FwcGx5X29wdGlvbnMoKSBmb3IgZGV0YWlsc1xuICogQHJldHVybiB7ZmxvYXR9IHdpZHRoXG4gKi9cbkNhbnZhcy5wcm90b3R5cGUubWVhc3VyZV90ZXh0ID0gZnVuY3Rpb24odGV4dCwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSB0aGlzLl9hcHBseV9vcHRpb25zKG9wdGlvbnMpO1xuICAgIHJldHVybiB0aGlzLmNvbnRleHQubWVhc3VyZVRleHQodGV4dCkud2lkdGg7XG59O1xuXG4vKipcbiAqIENsZWFyJ3MgdGhlIGNhbnZhcy5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmNvbnRleHQuY2xlYXJSZWN0KDAsIDAsIHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KTtcbn07XG5cbi8qKlxuICogU2NhbGUgdGhlIGN1cnJlbnQgZHJhd2luZy5cbiAqIEBwYXJhbSAge2Zsb2F0fSB4XG4gKiBAcGFyYW0gIHtmbG9hdH0geVxuICogQHJldHVybiB7bnVsbH0gIFxuICovXG5DYW52YXMucHJvdG90eXBlLnNjYWxlID0gZnVuY3Rpb24oeCwgeSkge1xuICAgIHRoaXMuY29udGV4dC5zY2FsZSh4LCB5KTtcbn07XG5cbi8qKlxuICogRmluaXNoZXMgdGhlIGRyYXdpbmcgb3BlcmF0aW9uIHVzaW5nIHRoZSBzZXQgb2YgcHJvdmlkZWQgb3B0aW9ucy5cbiAqIEBwYXJhbSAge2RpY3Rpb25hcnl9IChvcHRpb25hbCkgZGljdGlvbmFyeSB0aGF0IFxuICogIHJlc29sdmVzIHRvIGEgZGljdGlvbmFyeS5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuX2RvX2RyYXcgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IHRoaXMuX2FwcGx5X29wdGlvbnMob3B0aW9ucyk7XG5cbiAgICAvLyBPbmx5IGZpbGwgaWYgYSBmaWxsIGlzIGRlZmluZWQuXG4gICAgaWYgKG9wdGlvbnMuZmlsbCkge1xuICAgICAgICB0aGlzLmNvbnRleHQuZmlsbCgpO1xuICAgIH1cbiAgICAvLyBTdHJva2UgYnkgZGVmYXVsdCwgaWYgbm8gc3Ryb2tlIG9yIGZpbGwgaXMgZGVmaW5lZC4gIE90aGVyd2lzZVxuICAgIC8vIG9ubHkgc3Ryb2tlIGlmIGEgc3Ryb2tlIGlzIGRlZmluZWQuXG4gICAgaWYgKG9wdGlvbnMuc3Ryb2tlIHx8ICFvcHRpb25zLmZpbGwpIHtcbiAgICAgICAgdGhpcy5jb250ZXh0LnN0cm9rZSgpO1xuICAgIH1cbn07XG5cbi8qKlxuICogQXBwbGllcyBhIGRpY3Rpb25hcnkgb2YgZHJhd2luZyBvcHRpb25zIHRvIHRoZSBwZW4uXG4gKiBAcGFyYW0gIHtkaWN0aW9uYXJ5fSBvcHRpb25zXG4gKiAgICAgIGFscGhhIHtmbG9hdH0gT3BhY2l0eSAoMC0xKVxuICogICAgICBjb21wb3NpdGVfb3BlcmF0aW9uIHtzdHJpbmd9IEhvdyBuZXcgaW1hZ2VzIGFyZSBcbiAqICAgICAgICAgIGRyYXduIG9udG8gYW4gZXhpc3RpbmcgaW1hZ2UuICBQb3NzaWJsZSB2YWx1ZXNcbiAqICAgICAgICAgIGFyZSBgc291cmNlLW92ZXJgLCBgc291cmNlLWF0b3BgLCBgc291cmNlLWluYCwgXG4gKiAgICAgICAgICBgc291cmNlLW91dGAsIGBkZXN0aW5hdGlvbi1vdmVyYCwgXG4gKiAgICAgICAgICBgZGVzdGluYXRpb24tYXRvcGAsIGBkZXN0aW5hdGlvbi1pbmAsIFxuICogICAgICAgICAgYGRlc3RpbmF0aW9uLW91dGAsIGBsaWdodGVyYCwgYGNvcHlgLCBvciBgeG9yYC5cbiAqICAgICAgbGluZV9jYXAge3N0cmluZ30gRW5kIGNhcCBzdHlsZSBmb3IgbGluZXMuXG4gKiAgICAgICAgICBQb3NzaWJsZSB2YWx1ZXMgYXJlICdidXR0JywgJ3JvdW5kJywgb3IgJ3NxdWFyZScuXG4gKiAgICAgIGxpbmVfam9pbiB7c3RyaW5nfSBIb3cgdG8gcmVuZGVyIHdoZXJlIHR3byBsaW5lc1xuICogICAgICAgICAgbWVldC4gIFBvc3NpYmxlIHZhbHVlcyBhcmUgJ2JldmVsJywgJ3JvdW5kJywgb3JcbiAqICAgICAgICAgICdtaXRlcicuXG4gKiAgICAgIGxpbmVfd2lkdGgge2Zsb2F0fSBIb3cgdGhpY2sgbGluZXMgYXJlLlxuICogICAgICBsaW5lX21pdGVyX2xpbWl0IHtmbG9hdH0gTWF4IGxlbmd0aCBvZiBtaXRlcnMuXG4gKiAgICAgIGxpbmVfY29sb3Ige3N0cmluZ30gQ29sb3Igb2YgdGhlIGxpbmUuXG4gKiAgICAgIGZpbGxfY29sb3Ige3N0cmluZ30gQ29sb3IgdG8gZmlsbCB0aGUgc2hhcGUuXG4gKiAgICAgIGNvbG9yIHtzdHJpbmd9IENvbG9yIHRvIHN0cm9rZSBhbmQgZmlsbCB0aGUgc2hhcGUuXG4gKiAgICAgICAgICBMb3dlciBwcmlvcml0eSB0byBsaW5lX2NvbG9yIGFuZCBmaWxsX2NvbG9yLlxuICogICAgICBmb250X3N0eWxlIHtzdHJpbmd9XG4gKiAgICAgIGZvbnRfdmFyaWFudCB7c3RyaW5nfVxuICogICAgICBmb250X3dlaWdodCB7c3RyaW5nfVxuICogICAgICBmb250X3NpemUge3N0cmluZ31cbiAqICAgICAgZm9udF9mYW1pbHkge3N0cmluZ31cbiAqICAgICAgZm9udCB7c3RyaW5nfSBPdmVycmlkZGVzIGFsbCBvdGhlciBmb250IHByb3BlcnRpZXMuXG4gKiAgICAgIHRleHRfYWxpZ24ge3N0cmluZ30gSG9yaXpvbnRhbCBhbGlnbm1lbnQgb2YgdGV4dC4gIFxuICogICAgICAgICAgUG9zc2libGUgdmFsdWVzIGFyZSBgc3RhcnRgLCBgZW5kYCwgYGNlbnRlcmAsXG4gKiAgICAgICAgICBgbGVmdGAsIG9yIGByaWdodGAuXG4gKiAgICAgIHRleHRfYmFzZWxpbmUge3N0cmluZ30gVmVydGljYWwgYWxpZ25tZW50IG9mIHRleHQuXG4gKiAgICAgICAgICBQb3NzaWJsZSB2YWx1ZXMgYXJlIGBhbHBoYWJldGljYCwgYHRvcGAsIFxuICogICAgICAgICAgYGhhbmdpbmdgLCBgbWlkZGxlYCwgYGlkZW9ncmFwaGljYCwgb3IgXG4gKiAgICAgICAgICBgYm90dG9tYC5cbiAqIEByZXR1cm4ge2RpY3Rpb25hcnl9IG9wdGlvbnMsIHJlc29sdmVkLlxuICovXG5DYW52YXMucHJvdG90eXBlLl9hcHBseV9vcHRpb25zID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIG9wdGlvbnMgPSB1dGlscy5yZXNvbHZlX2NhbGxhYmxlKG9wdGlvbnMpO1xuXG4gICAgLy8gU3BlY2lhbCBvcHRpb25zLlxuICAgIHRoaXMuY29udGV4dC5nbG9iYWxBbHBoYSA9IG9wdGlvbnMuYWxwaGEgfHwgMS4wO1xuICAgIHRoaXMuY29udGV4dC5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb24gPSBvcHRpb25zLmNvbXBvc2l0ZV9vcGVyYXRpb24gfHwgJ3NvdXJjZS1vdmVyJztcbiAgICBcbiAgICAvLyBMaW5lIHN0eWxlLlxuICAgIHRoaXMuY29udGV4dC5saW5lQ2FwID0gb3B0aW9ucy5saW5lX2NhcCB8fCAnYnV0dCc7XG4gICAgdGhpcy5jb250ZXh0LmxpbmVKb2luID0gb3B0aW9ucy5saW5lX2pvaW4gfHwgJ2JldmVsJztcbiAgICB0aGlzLmNvbnRleHQubGluZVdpZHRoID0gb3B0aW9ucy5saW5lX3dpZHRoIHx8IDEuMDtcbiAgICB0aGlzLmNvbnRleHQubWl0ZXJMaW1pdCA9IG9wdGlvbnMubGluZV9taXRlcl9saW1pdCB8fCAxMDtcbiAgICB0aGlzLmNvbnRleHQuc3Ryb2tlU3R5bGUgPSBvcHRpb25zLmxpbmVfY29sb3IgfHwgb3B0aW9ucy5jb2xvciB8fCAnYmxhY2snOyAvLyBUT0RPOiBTdXBwb3J0IGdyYWRpZW50XG4gICAgb3B0aW9ucy5zdHJva2UgPSAob3B0aW9ucy5saW5lX2NvbG9yICE9PSB1bmRlZmluZWQgfHwgb3B0aW9ucy5saW5lX3dpZHRoICE9PSB1bmRlZmluZWQpO1xuXG4gICAgLy8gRmlsbCBzdHlsZS5cbiAgICB0aGlzLmNvbnRleHQuZmlsbFN0eWxlID0gb3B0aW9ucy5maWxsX2NvbG9yIHx8IG9wdGlvbnMuY29sb3IgfHwgJ2JsYWNrJzsgLy8gVE9ETzogU3VwcG9ydCBncmFkaWVudFxuICAgIG9wdGlvbnMuZmlsbCA9IG9wdGlvbnMuZmlsbF9jb2xvciAhPT0gdW5kZWZpbmVkO1xuXG4gICAgLy8gRm9udCBzdHlsZS5cbiAgICB2YXIgZm9udF9zdHlsZSA9IG9wdGlvbnMuZm9udF9zdHlsZSB8fCAnJztcbiAgICB2YXIgZm9udF92YXJpYW50ID0gb3B0aW9ucy5mb250X3ZhcmlhbnQgfHwgJyc7XG4gICAgdmFyIGZvbnRfd2VpZ2h0ID0gb3B0aW9ucy5mb250X3dlaWdodCB8fCAnJztcbiAgICB2YXIgZm9udF9zaXplID0gb3B0aW9ucy5mb250X3NpemUgfHwgJzEycHQnO1xuICAgIHZhciBmb250X2ZhbWlseSA9IG9wdGlvbnMuZm9udF9mYW1pbHkgfHwgJ0FyaWFsJztcbiAgICB2YXIgZm9udCA9IGZvbnRfc3R5bGUgKyAnICcgKyBmb250X3ZhcmlhbnQgKyAnICcgKyBmb250X3dlaWdodCArICcgJyArIGZvbnRfc2l6ZSArICcgJyArIGZvbnRfZmFtaWx5O1xuICAgIHRoaXMuY29udGV4dC5mb250ID0gb3B0aW9ucy5mb250IHx8IGZvbnQ7XG5cbiAgICAvLyBUZXh0IHN0eWxlLlxuICAgIHRoaXMuY29udGV4dC50ZXh0QWxpZ24gPSBvcHRpb25zLnRleHRfYWxpZ24gfHwgJ2xlZnQnO1xuICAgIHRoaXMuY29udGV4dC50ZXh0QmFzZWxpbmUgPSBvcHRpb25zLnRleHRfYmFzZWxpbmUgfHwgJ3RvcCc7XG5cbiAgICAvLyBUT0RPOiBTdXBwb3J0IHNoYWRvd3MuXG5cbiAgICByZXR1cm4gb3B0aW9ucztcbn07XG5cbi8qKlxuICogVHJhbnNmb3JtIGFuIHggdmFsdWUgYmVmb3JlIHJlbmRlcmluZy5cbiAqIEBwYXJhbSAge2Zsb2F0fSB4XG4gKiBAcmV0dXJuIHtmbG9hdH1cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5fdHggPSBmdW5jdGlvbih4KSB7IHJldHVybiB4OyB9O1xuXG4vKipcbiAqIFRyYW5zZm9ybSBhIHkgdmFsdWUgYmVmb3JlIHJlbmRlcmluZy5cbiAqIEBwYXJhbSAge2Zsb2F0fSB5XG4gKiBAcmV0dXJuIHtmbG9hdH1cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5fdHkgPSBmdW5jdGlvbih5KSB7IHJldHVybiB5OyB9O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLkNhbnZhcyA9IENhbnZhcztcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG52YXIga2V5bWFwID0gcmVxdWlyZSgnLi9ldmVudHMvbWFwLmpzJyk7XG52YXIgcmVnaXN0ZXIgPSBrZXltYXAuTWFwLnJlZ2lzdGVyO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG5cbi8qKlxuICogSW5wdXQgY3Vyc29yLlxuICovXG52YXIgQ3Vyc29yID0gZnVuY3Rpb24obW9kZWwpIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMuX21vZGVsID0gbW9kZWw7XG4gICAgdGhpcy5fY2xpY2tfcm93ID0gbnVsbDtcbiAgICB0aGlzLl9jbGlja19jaGFyID0gbnVsbDtcbiAgICB0aGlzLl9hbmNob3Jfcm93ID0gbnVsbDtcbiAgICB0aGlzLl9hbmNob3JfY2hhciA9IG51bGw7XG4gICAgdGhpcy5fc3RhcnRfcm93ID0gbnVsbDtcbiAgICB0aGlzLl9zdGFydF9jaGFyID0gbnVsbDtcbiAgICB0aGlzLl9lbmRfcm93ID0gbnVsbDtcbiAgICB0aGlzLl9lbmRfY2hhciA9IG51bGw7XG5cbiAgICAvLyBCaW5kIGV2ZW50c1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICByZWdpc3RlcignY3Vyc29yLmtleXByZXNzJywgdXRpbHMucHJveHkodGhpcy5rZXlwcmVzcywgdGhpcyksIHRoaXMpO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3IubmV3bGluZScsIHV0aWxzLnByb3h5KHRoaXMubmV3bGluZSwgdGhpcyksIHRoaXMpO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3IuZGVsZXRlX2ZvcndhcmQnLCB1dGlscy5wcm94eSh0aGlzLmRlbGV0ZV9mb3J3YXJkLCB0aGlzKSwgdGhpcyk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5kZWxldGVfYmFja3dhcmQnLCB1dGlscy5wcm94eSh0aGlzLmRlbGV0ZV9iYWNrd2FyZCwgdGhpcyksIHRoaXMpO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3IubGVmdCcsIGZ1bmN0aW9uKCkgeyB0aGF0Lm1vdmVfY3Vyc29yKC0xLCAwKTsgcmV0dXJuIHRydWU7IH0sIHRoaXMpO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3IucmlnaHQnLCBmdW5jdGlvbigpIHsgdGhhdC5tb3ZlX2N1cnNvcigxLCAwKTsgcmV0dXJuIHRydWU7IH0sIHRoaXMpO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3IudXAnLCBmdW5jdGlvbigpIHsgdGhhdC5tb3ZlX2N1cnNvcigwLCAtMSk7IHJldHVybiB0cnVlOyB9LCB0aGlzKTtcbiAgICByZWdpc3RlcignY3Vyc29yLmRvd24nLCBmdW5jdGlvbigpIHsgdGhhdC5tb3ZlX2N1cnNvcigwLCAxKTsgcmV0dXJuIHRydWU7IH0sIHRoaXMpO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3Iuc2VsZWN0X2xlZnQnLCBmdW5jdGlvbigpIHsgdGhhdC5tb3ZlX2N1cnNvcigtMSwgMCwgdHJ1ZSk7IHJldHVybiB0cnVlOyB9LCB0aGlzKTtcbiAgICByZWdpc3RlcignY3Vyc29yLnNlbGVjdF9yaWdodCcsIGZ1bmN0aW9uKCkgeyB0aGF0Lm1vdmVfY3Vyc29yKDEsIDAsIHRydWUpOyByZXR1cm4gdHJ1ZTsgfSwgdGhpcyk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5zZWxlY3RfdXAnLCBmdW5jdGlvbigpIHsgdGhhdC5tb3ZlX2N1cnNvcigwLCAtMSwgdHJ1ZSk7IHJldHVybiB0cnVlOyB9LCB0aGlzKTtcbiAgICByZWdpc3RlcignY3Vyc29yLnNlbGVjdF9kb3duJywgZnVuY3Rpb24oKSB7IHRoYXQubW92ZV9jdXJzb3IoMCwgMSwgdHJ1ZSk7IHJldHVybiB0cnVlOyB9LCB0aGlzKTtcbn07XG51dGlscy5pbmhlcml0KEN1cnNvciwgdXRpbHMuUG9zdGVyQ2xhc3MpO1xuXG4vKipcbiAqIFJlbW92ZSB0aGUgcmVnaXN0ZXJlZCBhY3Rpb25zIGZvciB0aGlzIGN1cnNvci5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uKCkge1xuICAgIGtleW1hcC5NYXAudW5yZWdpc3Rlcl9ieV90YWcodGhpcyk7XG59O1xuXG4vKipcbiAqIFNldCB0aGUgY3Vyc29yJ3Mgc3RhcnQgcG9zaXRpb24uXG4gKiBAcGFyYW0ge2ludGVnZXJ9IHJvd19pbmRleCAgXG4gKiBAcGFyYW0ge2ludGVnZXJ9IGNoYXJfaW5kZXhcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5zZXRfc3RhcnQgPSBmdW5jdGlvbihyb3dfaW5kZXgsIGNoYXJfaW5kZXgpIHtcbiAgICB0aGlzLl9zdGFydF9yb3cgPSByb3dfaW5kZXg7XG4gICAgdGhpcy5fc3RhcnRfY2hhciA9IGNoYXJfaW5kZXg7XG4gICAgdGhpcy5fZW5kX3JvdyA9IHJvd19pbmRleDtcbiAgICB0aGlzLl9lbmRfY2hhciA9IGNoYXJfaW5kZXg7XG4gICAgdGhpcy5fY2xpY2tfcm93ID0gcm93X2luZGV4O1xuICAgIHRoaXMuX2NsaWNrX2NoYXIgPSBjaGFyX2luZGV4O1xuICAgIHRoaXMuX2FuY2hvcl9yb3cgPSByb3dfaW5kZXg7XG4gICAgdGhpcy5fYW5jaG9yX2NoYXIgPSBjaGFyX2luZGV4O1xuICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7XG59O1xuXG4vKipcbiAqIFNldCB0aGUgY3Vyc29yJ3MgZW5kIHBvc2l0aW9uLlxuICogQHBhcmFtIHtpbnRlZ2VyfSByb3dfaW5kZXggIFxuICogQHBhcmFtIHtpbnRlZ2VyfSBjaGFyX2luZGV4XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuc2V0X2VuZCA9IGZ1bmN0aW9uKHJvd19pbmRleCwgY2hhcl9pbmRleCkge1xuICAgIGlmIChyb3dfaW5kZXggPCB0aGlzLl9jbGlja19yb3cgfHwgKHJvd19pbmRleCA9PSB0aGlzLl9jbGlja19yb3cgJiYgY2hhcl9pbmRleCA8IHRoaXMuX2NsaWNrX2NoYXIpKSB7XG4gICAgICAgIHRoaXMuX3N0YXJ0X3JvdyA9IHJvd19pbmRleDtcbiAgICAgICAgdGhpcy5fc3RhcnRfY2hhciA9IGNoYXJfaW5kZXg7XG4gICAgICAgIHRoaXMuX2VuZF9yb3cgPSB0aGlzLl9jbGlja19yb3c7XG4gICAgICAgIHRoaXMuX2VuZF9jaGFyID0gdGhpcy5fY2xpY2tfY2hhcjtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9zdGFydF9yb3cgPSB0aGlzLl9jbGlja19yb3c7XG4gICAgICAgIHRoaXMuX3N0YXJ0X2NoYXIgPSB0aGlzLl9jbGlja19jaGFyO1xuICAgICAgICB0aGlzLl9lbmRfcm93ID0gcm93X2luZGV4O1xuICAgICAgICB0aGlzLl9lbmRfY2hhciA9IGNoYXJfaW5kZXg7XG4gICAgfVxuICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgd2hlbiBhIGtleSBpcyBwcmVzc2VkLlxuICogQHBhcmFtICB7c3RyaW5nfSBrZXkgLSBrZXkgdGhhdCB3YXMgcHJlc3NlZC5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvci5wcm90b3R5cGUua2V5cHJlc3MgPSBmdW5jdGlvbihlKSB7XG4gICAgdmFyIGNoYXJfY29kZSA9IGUud2hpY2ggfHwgZS5rZXlDb2RlO1xuICAgIHZhciBjaGFyX3R5cGVkID0gU3RyaW5nLmZyb21DaGFyQ29kZShjaGFyX2NvZGUpO1xuICAgIHRoaXMuX3JlbW92ZV9ibG9iKCk7XG4gICAgdGhpcy5fbW9kZWwuYWRkX3RleHQodGhpcy5fc3RhcnRfcm93LCB0aGlzLl9zdGFydF9jaGFyLCBjaGFyX3R5cGVkKTtcbiAgICB0aGlzLnNldF9zdGFydCh0aGlzLl9zdGFydF9yb3csIHRoaXMuX3N0YXJ0X2NoYXIgKyAxKTtcbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogQ3JlYXRlIGEgbmV3bGluZSB3aGVyZSB0aGUgY3Vyc29yIGlzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5uZXdsaW5lID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fcmVtb3ZlX2Jsb2IoKTtcbiAgICB0aGlzLl9tb2RlbC5hZGRfdGV4dCh0aGlzLl9zdGFydF9yb3csIHRoaXMuX3N0YXJ0X2NoYXIsICdcXG4nKTtcbiAgICB0aGlzLnNldF9zdGFydCh0aGlzLl9zdGFydF9yb3cgKyAxLCAwKTtcbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogSGFuZGxlcyB3aGVuIGRlbGV0ZSBpcyBwcmVzc2VkLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5kZWxldGVfZm9yd2FyZCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICghdGhpcy5fcmVtb3ZlX2Jsb2IoKSkge1xuICAgICAgICB2YXIgbW92ZWQgPSB0aGlzLl9jYWxjdWxhdGVfbW92ZV9jdXJzb3IodGhpcy5fc3RhcnRfcm93LCB0aGlzLl9zdGFydF9jaGFyLCAwLCAxKTtcbiAgICAgICAgaWYgKG1vdmVkLm1vdmVkKSB7XG4gICAgICAgICAgICB0aGlzLl9tb2RlbC5yZW1vdmVfdGV4dCh0aGlzLl9zdGFydF9yb3csIHRoaXMuX3N0YXJ0X2NoYXIsIG1vdmVkLnJvd19pbmRleCwgbW92ZWQuY2hhcl9pbmRleCk7XG4gICAgICAgICAgICB0aGlzLnNldF9zdGFydCh0aGlzLl9zdGFydF9yb3csIHRoaXMuX3N0YXJ0X2NoYXIpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIHdoZW4gYmFja3NwYWNlIGlzIHByZXNzZWQuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3IucHJvdG90eXBlLmRlbGV0ZV9iYWNrd2FyZCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICghdGhpcy5fcmVtb3ZlX2Jsb2IoKSkge1xuICAgICAgICB2YXIgbW92ZWQgPSB0aGlzLl9jYWxjdWxhdGVfbW92ZV9jdXJzb3IodGhpcy5fc3RhcnRfcm93LCB0aGlzLl9zdGFydF9jaGFyLCAwLCAtMSk7XG4gICAgICAgIGlmIChtb3ZlZC5tb3ZlZCkge1xuICAgICAgICAgICAgdGhpcy5fbW9kZWwucmVtb3ZlX3RleHQobW92ZWQucm93X2luZGV4LCBtb3ZlZC5jaGFyX2luZGV4LCB0aGlzLl9zdGFydF9yb3csIHRoaXMuX3N0YXJ0X2NoYXIpO1xuICAgICAgICAgICAgdGhpcy5zZXRfc3RhcnQobW92ZWQucm93X2luZGV4LCBtb3ZlZC5jaGFyX2luZGV4KTsgICAgXG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIE1vdmVzIHRoZSBjdXJzb3IgaW4gYSBkaXJlY3Rpb25cbiAqIEBwYXJhbSAge2ludGVnZXJ9IGRlbHRhX3hcbiAqIEBwYXJhbSAge2ludGVnZXJ9IGRlbHRhX3lcbiAqIEByZXR1cm4ge2Jvb2xlYW59IHRydWUgaWYgbW92ZWRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5tb3ZlX2N1cnNvciA9IGZ1bmN0aW9uKGRlbHRhX3gsIGRlbHRhX3ksIHNlbGVjdGluZykge1xuICAgIHZhciBtb3ZlZDtcbiAgICBtb3ZlZCA9IHRoaXMuX2NhbGN1bGF0ZV9tb3ZlX2N1cnNvcih0aGlzLl9hbmNob3Jfcm93LCB0aGlzLl9hbmNob3JfY2hhciwgZGVsdGFfeSwgZGVsdGFfeCk7XG4gICAgaWYgKG1vdmVkLm1vdmVkKSB7XG4gICAgICAgIGlmIChzZWxlY3RpbmcpIHtcbiAgICAgICAgICAgIGlmIChtb3ZlZC5yb3dfaW5kZXggPCB0aGlzLl9jbGlja19yb3cgfHwgKG1vdmVkLnJvd19pbmRleCA9PSB0aGlzLl9jbGlja19yb3cgJiYgbW92ZWQuY2hhcl9pbmRleCA8IHRoaXMuX2NsaWNrX2NoYXIpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3RhcnRfcm93ID0gbW92ZWQucm93X2luZGV4O1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0YXJ0X2NoYXIgPSBtb3ZlZC5jaGFyX2luZGV4O1xuICAgICAgICAgICAgICAgIHRoaXMuX2VuZF9yb3cgPSB0aGlzLl9jbGlja19yb3c7XG4gICAgICAgICAgICAgICAgdGhpcy5fZW5kX2NoYXIgPSB0aGlzLl9jbGlja19jaGFyO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdGFydF9yb3cgPSB0aGlzLl9jbGlja19yb3c7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3RhcnRfY2hhciA9IHRoaXMuX2NsaWNrX2NoYXI7XG4gICAgICAgICAgICAgICAgdGhpcy5fZW5kX3JvdyA9IG1vdmVkLnJvd19pbmRleDtcbiAgICAgICAgICAgICAgICB0aGlzLl9lbmRfY2hhciA9IG1vdmVkLmNoYXJfaW5kZXg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl9hbmNob3Jfcm93ID0gbW92ZWQucm93X2luZGV4O1xuICAgICAgICAgICAgdGhpcy5fYW5jaG9yX2NoYXIgPSBtb3ZlZC5jaGFyX2luZGV4O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5zZXRfc3RhcnQobW92ZWQucm93X2luZGV4LCBtb3ZlZC5jaGFyX2luZGV4KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufTtcblxuLyoqXG4gKiBDYWxjdWxhdGVzIGEgbmV3IHBvc2l0aW9uIGZyb20gc3RhcnQgYW5kIGRlbHRhIGN1cnNvciBjb29yZGluYXRlZC5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IHN0YXJ0X3Jvd1xuICogQHBhcmFtICB7aW50ZWdlcn0gc3RhcnRfY2hhclxuICogQHBhcmFtICB7aW50ZWdlcn0gZGVsdGFfcm93XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBkZWx0YV9jaGFyXG4gKiBAcmV0dXJuIHtkaWN0aW9uYXJ5fSBkaWN0aW9uYXJ5IG9mIHRoZSBmb3JtIHtyb3dfaW5kZXgsIGNoYXJfaW5kZXgsIG1vdmVkfSxcbiAqICAgICAgICAgICAgICAgICAgICAgIHdoZXJlIG1vdmVkIGlzIGEgYm9vbGVhbiB0cnVlIGlmIHRoZSBjdXJzb3IgY2FuIGJlIFxuICogICAgICAgICAgICAgICAgICAgICAgbW92ZWQuXG4gKi9cbkN1cnNvci5wcm90b3R5cGUuX2NhbGN1bGF0ZV9tb3ZlX2N1cnNvciA9IGZ1bmN0aW9uKHN0YXJ0X3Jvdywgc3RhcnRfY2hhciwgZGVsdGFfcm93LCBkZWx0YV9jaGFyKSB7XG4gICAgdmFyIGRlc3RfY2hhciA9IHN0YXJ0X2NoYXIgKyBkZWx0YV9jaGFyO1xuICAgIHZhciBkZXN0X3JvdyA9IHN0YXJ0X3JvdyArIGRlbHRhX3JvdztcbiAgICBpZiAoZGVzdF9yb3cgPCAwKSB7XG4gICAgICAgIGRlc3Rfcm93ID0gc3RhcnRfcm93O1xuICAgICAgICBkZXN0X2NoYXIgPSAwO1xuICAgIH1cbiAgICBpZiAoZGVzdF9yb3cgPj0gdGhpcy5fbW9kZWwuX3Jvd3MubGVuZ3RoKSB7XG4gICAgICAgIGRlc3Rfcm93ID0gdGhpcy5fbW9kZWwuX3Jvd3MubGVuZ3RoIC0gMTtcbiAgICAgICAgZGVzdF9jaGFyID0gdGhpcy5fbW9kZWwuX3Jvd3NbZGVzdF9yb3ddLmxlbmd0aDtcbiAgICB9XG4gICAgaWYgKGRlc3RfY2hhciA9PSAtMSkge1xuICAgICAgICBkZXN0X3Jvdy0tO1xuICAgICAgICBpZiAoZGVzdF9yb3cgPT0gLTEpIHtcbiAgICAgICAgICAgIGRlc3Rfcm93Kys7XG4gICAgICAgICAgICBkZXN0X2NoYXIgPSAwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZGVzdF9jaGFyID0gdGhpcy5fbW9kZWwuX3Jvd3NbZGVzdF9yb3ddLmxlbmd0aDtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAoZGVzdF9jaGFyID4gdGhpcy5fbW9kZWwuX3Jvd3NbZGVzdF9yb3ddLmxlbmd0aCkge1xuICAgICAgICBkZXN0X3JvdysrO1xuICAgICAgICBpZiAoZGVzdF9yb3cgPT0gLTEpIHtcbiAgICAgICAgICAgIGRlc3Rfcm93LS07XG4gICAgICAgICAgICBkZXN0X2NoYXIgPSB0aGlzLl9tb2RlbC5fcm93c1tkZXN0X3Jvd10ubGVuZ3RoO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZGVzdF9jaGFyID0gMDtcbiAgICAgICAgfVxuICAgIH1cbiAgICB2YXIgbW92ZWQgPSAoZGVzdF9jaGFyIT09c3RhcnRfY2hhcnx8ZGVzdF9yb3chPT1zdGFydF9yb3cpO1xuICAgIHJldHVybiB7cm93X2luZGV4OiBkZXN0X3JvdywgY2hhcl9pbmRleDogZGVzdF9jaGFyLCBtb3ZlZDogbW92ZWR9O1xufTtcblxuLyoqXG4gKiBJZiBhIGJsb2Igb2YgdGV4dCBpcyBzZWxlY3RlZCwgcmVtb3ZlIGl0LlxuICogQHJldHVybiB7Ym9vbGVhbn0gdHJ1ZSBpZiB0ZXh0IHdhcyByZW1vdmVkLlxuICovXG5DdXJzb3IucHJvdG90eXBlLl9yZW1vdmVfYmxvYiA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLl9zdGFydF9yb3cgIT09IHRoaXMuX2VuZF9yb3cgfHwgdGhpcy5fc3RhcnRfY2hhciAhPT0gdGhpcy5fZW5kX2NoYXIpIHtcbiAgICAgICAgdGhpcy5fbW9kZWwucmVtb3ZlX3RleHQodGhpcy5fc3RhcnRfcm93LCB0aGlzLl9zdGFydF9jaGFyLCB0aGlzLl9lbmRfcm93LCB0aGlzLl9lbmRfY2hhcik7XG4gICAgICAgIHRoaXMuX2VuZF9yb3cgPSB0aGlzLl9zdGFydF9yb3c7XG4gICAgICAgIHRoaXMuX2VuZF9jaGFyID0gdGhpcy5fc3RhcnRfY2hhcjtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn07XG5cbmV4cG9ydHMuQ3Vyc29yID0gQ3Vyc29yOyIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG52YXIga2V5bWFwID0gcmVxdWlyZSgnLi9ldmVudHMvbWFwLmpzJyk7XG52YXIgcmVnaXN0ZXIgPSBrZXltYXAuTWFwLnJlZ2lzdGVyO1xuXG52YXIgY3Vyc29yID0gcmVxdWlyZSgnLi9jdXJzb3IuanMnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKTtcbi8qKlxuICogTWFuYWdlcyBvbmUgb3IgbW9yZSBjdXJzb3JzXG4gKi9cbnZhciBDdXJzb3JzID0gZnVuY3Rpb24obW9kZWwpIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMuX21vZGVsID0gbW9kZWw7XG4gICAgdGhpcy5nZXRfcm93X2NoYXIgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5jdXJzb3JzID0gW107XG4gICAgdGhpcy5fc2VsZWN0aW5nX3RleHQgPSBmYWxzZTtcblxuICAgIC8vIENyZWF0ZSBpbml0aWFsIGN1cnNvci5cbiAgICB0aGlzLmNyZWF0ZSgpO1xuXG4gICAgLy8gUmVnaXN0ZXIgYWN0aW9ucy5cbiAgICByZWdpc3RlcignY3Vyc29ycy5zdGFydF9zZWxlY3Rpb24nLCB1dGlscy5wcm94eSh0aGlzLnN0YXJ0X3NlbGVjdGlvbiwgdGhpcykpO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3JzLnNldF9zZWxlY3Rpb24nLCB1dGlscy5wcm94eSh0aGlzLnNldF9zZWxlY3Rpb24sIHRoaXMpKTtcbiAgICByZWdpc3RlcignY3Vyc29ycy5lbmRfc2VsZWN0aW9uJywgdXRpbHMucHJveHkodGhpcy5lbmRfc2VsZWN0aW9uLCB0aGlzKSk7XG59O1xudXRpbHMuaW5oZXJpdChDdXJzb3JzLCB1dGlscy5Qb3N0ZXJDbGFzcyk7XG5cbi8qKlxuICogQ3JlYXRlcyBhIGN1cnNvciBhbmQgbWFuYWdlcyBpdC5cbiAqIEByZXR1cm4ge0N1cnNvcn0gY3Vyc29yXG4gKi9cbkN1cnNvcnMucHJvdG90eXBlLmNyZWF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBuZXdfY3Vyc29yID0gbmV3IGN1cnNvci5DdXJzb3IodGhpcy5fbW9kZWwsIHRoaXMuX2lucHV0X2Rpc3BhdGNoZXIpO1xuICAgIHRoaXMuY3Vyc29ycy5wdXNoKG5ld19jdXJzb3IpO1xuXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIG5ld19jdXJzb3Iub24oJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGF0LnRyaWdnZXIoJ2NoYW5nZScsIG5ld19jdXJzb3IpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIG5ld19jdXJzb3I7XG59O1xuXG4vKipcbiAqIFN0YXJ0cyBzZWxlY3RpbmcgdGV4dCBmcm9tIG1vdXNlIGNvb3JkaW5hdGVzLlxuICogQHBhcmFtICB7TW91c2VFdmVudH0gZSAtIG1vdXNlIGV2ZW50IGNvbnRhaW5pbmcgdGhlIGNvb3JkaW5hdGVzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29ycy5wcm90b3R5cGUuc3RhcnRfc2VsZWN0aW9uID0gZnVuY3Rpb24oZSkge1xuICAgIHZhciB4ID0gZS5vZmZzZXRYO1xuICAgIHZhciB5ID0gZS5vZmZzZXRZO1xuXG4gICAgdGhpcy5fc2VsZWN0aW5nX3RleHQgPSB0cnVlO1xuICAgIGlmICh0aGlzLmdldF9yb3dfY2hhcikge1xuICAgICAgICB2YXIgbG9jYXRpb24gPSB0aGlzLmdldF9yb3dfY2hhcih4LCB5KTtcbiAgICAgICAgdGhpcy5jdXJzb3JzWzBdLnNldF9zdGFydChsb2NhdGlvbi5yb3dfaW5kZXgsIGxvY2F0aW9uLmNoYXJfaW5kZXgpO1xuICAgIH1cbn07XG5cbi8qKlxuICogRmluYWxpemVzIHRoZSBzZWxlY3Rpb24gb2YgdGV4dC5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvcnMucHJvdG90eXBlLmVuZF9zZWxlY3Rpb24gPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9zZWxlY3RpbmdfdGV4dCA9IGZhbHNlO1xufTtcblxuLyoqXG4gKiBTZXRzIHRoZSBlbmRwb2ludCBvZiB0ZXh0IHNlbGVjdGlvbiBmcm9tIG1vdXNlIGNvb3JkaW5hdGVzLlxuICogQHBhcmFtICB7TW91c2VFdmVudH0gZSAtIG1vdXNlIGV2ZW50IGNvbnRhaW5pbmcgdGhlIGNvb3JkaW5hdGVzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29ycy5wcm90b3R5cGUuc2V0X3NlbGVjdGlvbiA9IGZ1bmN0aW9uKGUpIHtcbiAgICB2YXIgeCA9IGUub2Zmc2V0WDtcbiAgICB2YXIgeSA9IGUub2Zmc2V0WTtcblxuICAgIGlmICh0aGlzLl9zZWxlY3RpbmdfdGV4dCAmJiB0aGlzLmdldF9yb3dfY2hhcikge1xuICAgICAgICB2YXIgbG9jYXRpb24gPSB0aGlzLmdldF9yb3dfY2hhcih4LCB5KTtcbiAgICAgICAgdGhpcy5jdXJzb3JzWzBdLnNldF9lbmQobG9jYXRpb24ucm93X2luZGV4LCBsb2NhdGlvbi5jaGFyX2luZGV4KTtcbiAgICB9XG59O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLkN1cnNvcnMgPSBDdXJzb3JzO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xudmFyIG5vcm1hbGl6ZXIgPSByZXF1aXJlKCcuL2V2ZW50cy9ub3JtYWxpemVyLmpzJyk7XG52YXIga2V5bWFwID0gcmVxdWlyZSgnLi9ldmVudHMvbWFwLmpzJyk7XG52YXIgZGVmYXVsdF9rZXltYXAgPSByZXF1aXJlKCcuL2V2ZW50cy9kZWZhdWx0LmpzJyk7XG52YXIgY3Vyc29ycyA9IHJlcXVpcmUoJy4vY3Vyc29ycy5qcycpO1xudmFyIHRlc3RfaGlnaGxpZ2h0ZXIgPSByZXF1aXJlKCcuL2hpZ2hsaWdodGVycy90ZXN0LmpzJyk7XG5cbi8qKlxuICogQ29udHJvbGxlciBmb3IgYSBEb2N1bWVudE1vZGVsLlxuICovXG52YXIgRG9jdW1lbnRDb250cm9sbGVyID0gZnVuY3Rpb24oZWwsIG1vZGVsKSB7XG4gICAgdXRpbHMuUG9zdGVyQ2xhc3MuY2FsbCh0aGlzKTtcbiAgICB0aGlzLm5vcm1hbGl6ZXIgPSBuZXcgbm9ybWFsaXplci5Ob3JtYWxpemVyKCk7XG4gICAgdGhpcy5ub3JtYWxpemVyLmxpc3Rlbl90byhlbCk7XG4gICAgdGhpcy5tYXAgPSBuZXcga2V5bWFwLk1hcCh0aGlzLm5vcm1hbGl6ZXIpO1xuICAgIHRoaXMubWFwLm1hcChkZWZhdWx0X2tleW1hcC5tYXApO1xuXG4gICAgdGhpcy5jdXJzb3JzID0gbmV3IGN1cnNvcnMuQ3Vyc29ycyhtb2RlbCk7XG4gICAgdGhpcy5faGlnaGxpZ2h0ZXIgPSBuZXcgdGVzdF9oaWdobGlnaHRlci5UZXN0SGlnaGxpZ2h0ZXIobW9kZWwpO1xufTtcbnV0aWxzLmluaGVyaXQoRG9jdW1lbnRDb250cm9sbGVyLCB1dGlscy5Qb3N0ZXJDbGFzcyk7XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuRG9jdW1lbnRDb250cm9sbGVyID0gRG9jdW1lbnRDb250cm9sbGVyO1xuIiwidmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xuXG4vKipcbiAqIE1vZGVsIGNvbnRhaW5pbmcgYWxsIG9mIHRoZSBkb2N1bWVudCdzIGRhdGEgKHRleHQpLlxuICovXG52YXIgRG9jdW1lbnRNb2RlbCA9IGZ1bmN0aW9uKCkge1xuICAgIHV0aWxzLlBvc3RlckNsYXNzLmNhbGwodGhpcyk7XG4gICAgdGhpcy5fcm93cyA9IFtdO1xuICAgIHRoaXMuX3Jvd190YWdzID0gW107XG4gICAgdGhpcy5fdGFnX2xvY2sgPSAwO1xuICAgIHRoaXMuX2luaXRfcHJvcGVydGllcygpO1xufTtcbnV0aWxzLmluaGVyaXQoRG9jdW1lbnRNb2RlbCwgdXRpbHMuUG9zdGVyQ2xhc3MpO1xuXG4vKipcbiAvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG4qIEFjcXVpcmUgYSBsb2NrIG9uIHRhZyBldmVudHNcbiAqXG4gKiBQcmV2ZW50cyB0YWcgZXZlbnRzIGZyb20gZmlyaW5nLlxuICogQHJldHVybiB7aW50ZWdlcn0gbG9jayBjb3VudFxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS5hY3F1aXJlX3RhZ19ldmVudF9sb2NrID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3RhZ19sb2NrKys7XG59O1xuXG4vKipcbiAqIFJlbGVhc2UgYSBsb2NrIG9uIHRhZyBldmVudHNcbiAqIEByZXR1cm4ge2ludGVnZXJ9IGxvY2sgY291bnRcbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUucmVsZWFzZV90YWdfZXZlbnRfbG9jayA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3RhZ19sb2NrLS07XG4gICAgaWYgKHRoaXMuX3RhZ19sb2NrIDwgMCkgdGhpcy5fdGFnX2xvY2sgPSAwO1xuICAgIHJldHVybiB0aGlzLl90YWdfbG9jaztcbn07XG5cbi8qKlxuICogVHJpZ2dlcnMgdGhlIHRhZyBjaGFuZ2UgZXZlbnRzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUudHJpZ2dlcl90YWdfZXZlbnRzID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuX3RhZ19sb2NrID09PSAwKSB7XG4gICAgICAgIHRoaXMudHJpZ2dlcigndGFnc19jaGFuZ2VkJyk7XG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpOyAgICBcbiAgICB9XG59O1xuXG4vKipcbiAqIFNldHMgYSAndGFnJyBvbiB0aGUgdGV4dCBzcGVjaWZpZWQuXG4gKiBAcGFyYW0ge2ludGVnZXJ9IHN0YXJ0X3JvdyAtIHJvdyB0aGUgdGFnIHN0YXJ0cyBvblxuICogQHBhcmFtIHtpbnRlZ2VyfSBzdGFydF9jaGFyIC0gaW5kZXgsIGluIHRoZSByb3csIG9mIHRoZSBmaXJzdCB0YWdnZWQgY2hhcmFjdGVyXG4gKiBAcGFyYW0ge2ludGVnZXJ9IGVuZF9yb3cgLSByb3cgdGhlIHRhZyBlbmRzIG9uXG4gKiBAcGFyYW0ge2ludGVnZXJ9IGVuZF9jaGFyIC0gaW5kZXgsIGluIHRoZSByb3csIG9mIHRoZSBsYXN0IHRhZ2dlZCBjaGFyYWN0ZXJcbiAqIEBwYXJhbSB7c3RyaW5nfSB0YWdfbmFtZVxuICogQHBhcmFtIHthbnl9IHRhZ192YWx1ZSAtIG92ZXJyaWRlcyBhbnkgcHJldmlvdXMgdGFnc1xuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS5zZXRfdGFnID0gZnVuY3Rpb24oc3RhcnRfcm93LCBzdGFydF9jaGFyLCBlbmRfcm93LCBlbmRfY2hhciwgdGFnX25hbWUsIHRhZ192YWx1ZSkge1xuICAgIGZvciAodmFyIHJvdyA9IHN0YXJ0X3Jvdzsgcm93IDw9IGVuZF9yb3c7IHJvdysrKSB7XG4gICAgICAgIHZhciBzdGFydCA9IHN0YXJ0X2NoYXI7XG4gICAgICAgIHZhciBlbmQgPSBlbmRfY2hhcjtcbiAgICAgICAgaWYgKHJvdyA+IHN0YXJ0X3JvdykgeyBzdGFydCA9IC0xOyB9XG4gICAgICAgIGlmIChyb3cgPCBlbmRfcm93KSB7IGVuZCA9IC0xOyB9XG5cbiAgICAgICAgLy8gUmVtb3ZlIG9yIG1vZGlmeSBjb25mbGljdGluZyB0YWdzLlxuICAgICAgICB2YXIgYWRkX3RhZ3MgPSBbXTtcbiAgICAgICAgdGhpcy5fcm93X3RhZ3Nbcm93XS5maWx0ZXIoZnVuY3Rpb24odGFnKSB7XG4gICAgICAgICAgICBpZiAodGFnLm5hbWUgPT0gdGFnX25hbWUpIHtcbiAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0YWcgaXMgd2l0aGluXG4gICAgICAgICAgICAgICAgaWYgKHN0YXJ0ID09IC0xICYmIGVuZCA9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh0YWcuc3RhcnQgPj0gc3RhcnQgJiYgKHRhZy5lbmQgPCBlbmQgfHwgZW5kID09IC0xKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRhZyBpcyBvdXRzaWRlXG4gICAgICAgICAgICAgICAgLy8gVG8gdGhlIHJpZ2h0P1xuICAgICAgICAgICAgICAgIGlmICh0YWcuc3RhcnQgPiBlbmQgJiYgZW5kICE9IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBUbyB0aGUgbGVmdD9cbiAgICAgICAgICAgICAgICBpZiAodGFnLmVuZCA8IHN0YXJ0ICYmIHRhZy5lbmQgIT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGFnIGVuY2Fwc3VsYXRlc1xuICAgICAgICAgICAgICAgIHZhciBsZWZ0X2ludGVyc2VjdGluZyA9IHRhZy5zdGFydCA8IHN0YXJ0O1xuICAgICAgICAgICAgICAgIHZhciByaWdodF9pbnRlcnNlY3RpbmcgPSBlbmQgIT0gLTEgJiYgKHRhZy5lbmQgPT0gLTEgfHwgdGFnLmVuZCA+IGVuZCk7XG5cbiAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0YWcgaXMgbGVmdCBpbnRlcnNlY3RpbmdcbiAgICAgICAgICAgICAgICBpZiAobGVmdF9pbnRlcnNlY3RpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgYWRkX3RhZ3MucHVzaCh7bmFtZTogdGFnX25hbWUsIHZhbHVlOiB0YWcudmFsdWUsIHN0YXJ0OiB0YWcuc3RhcnQsIGVuZDogc3RhcnQtMX0pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRhZyBpcyByaWdodCBpbnRlcnNlY3RpbmdcbiAgICAgICAgICAgICAgICBpZiAocmlnaHRfaW50ZXJzZWN0aW5nKSB7XG4gICAgICAgICAgICAgICAgICAgIGFkZF90YWdzLnB1c2goe25hbWU6IHRhZ19uYW1lLCB2YWx1ZTogdGFnLnZhbHVlLCBzdGFydDogZW5kKzEsIGVuZDogdGFnLmVuZH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHRhZ3MgYW5kIGNvcnJlY3RlZCB0YWdzLlxuICAgICAgICB0aGlzLl9yb3dfdGFnc1tyb3ddID0gdGhpcy5fcm93X3RhZ3Nbcm93XS5jb25jYXQoYWRkX3RhZ3MpO1xuICAgICAgICB0aGlzLl9yb3dfdGFnc1tyb3ddLnB1c2goe25hbWU6IHRhZ19uYW1lLCB2YWx1ZTogdGFnX3ZhbHVlLCBzdGFydDogc3RhcnQsIGVuZDogZW5kfSk7XG4gICAgfVxuICAgIHRoaXMudHJpZ2dlcl90YWdfZXZlbnRzKCk7XG59O1xuXG4vKipcbiAqIFJlbW92ZWQgYWxsIG9mIHRoZSB0YWdzIG9uIHRoZSBkb2N1bWVudC5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkRvY3VtZW50TW9kZWwucHJvdG90eXBlLmNsZWFyX3RhZ3MgPSBmdW5jdGlvbigpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX3Jvd190YWdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHRoaXMuX3Jvd190YWdzW2ldID0gW107XG4gICAgfVxuICAgIHRoaXMudHJpZ2dlcigndGFnc19jaGFuZ2VkJyk7XG4gICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2VkJyk7XG59O1xuXG4vKipcbiAqIEdldCB0aGUgdGFncyBhcHBsaWVkIHRvIGEgY2hhcmFjdGVyLlxuICogQHBhcmFtICB7aW50ZWdlcn0gcm93X2luZGV4XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBjaGFyX2luZGV4XG4gKiBAcmV0dXJuIHtkaWN0aW9uYXJ5fVxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS5nZXRfdGFncyA9IGZ1bmN0aW9uKHJvd19pbmRleCwgY2hhcl9pbmRleCkge1xuICAgIHZhciB0YWdzID0ge307XG4gICAgdGhpcy5fcm93X3RhZ3Nbcm93X2luZGV4XS5mb3JFYWNoKGZ1bmN0aW9uKHRhZykge1xuICAgICAgICAvLyBUYWcgc3RhcnQgb2YgLTEgbWVhbnMgdGhlIHRhZyBjb250aW51ZXMgdG8gdGhlIHByZXZpb3VzIGxpbmUuXG4gICAgICAgIHZhciBhZnRlcl9zdGFydCA9IChjaGFyX2luZGV4ID49IHRhZy5zdGFydCB8fCB0YWcuc3RhcnQgPT0gLTEpO1xuICAgICAgICAvLyBUYWcgZW5kIG9mIC0xIG1lYW5zIHRoZSB0YWcgY29udGludWVzIHRvIHRoZSBuZXh0IGxpbmUuXG4gICAgICAgIHZhciBiZWZvcmVfZW5kID0gKGNoYXJfaW5kZXggPD0gdGFnLmVuZCB8fCB0YWcuZW5kID09IC0xKTtcbiAgICAgICAgaWYgKGFmdGVyX3N0YXJ0ICYmIGJlZm9yZV9lbmQpIHtcbiAgICAgICAgICAgIHRhZ3NbdGFnLm5hbWVdID0gdGFnLnZhbHVlO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHRhZ3M7XG59O1xuXG4vKipcbiAqIEFkZHMgdGV4dCBlZmZpY2llbnRseSBzb21ld2hlcmUgaW4gdGhlIGRvY3VtZW50LlxuICogQHBhcmFtIHtpbnRlZ2VyfSByb3dfaW5kZXggIFxuICogQHBhcmFtIHtpbnRlZ2VyfSBjaGFyX2luZGV4IFxuICogQHBhcmFtIHtzdHJpbmd9IHRleHRcbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUuYWRkX3RleHQgPSBmdW5jdGlvbihyb3dfaW5kZXgsIGNoYXJfaW5kZXgsIHRleHQpIHtcbiAgICAvLyBJZiB0aGUgdGV4dCBoYXMgYSBuZXcgbGluZSBpbiBpdCwganVzdCByZS1zZXRcbiAgICAvLyB0aGUgcm93cyBsaXN0LlxuICAgIGlmICh0ZXh0LmluZGV4T2YoJ1xcbicpICE9IC0xKSB7XG4gICAgICAgIHZhciBuZXdfcm93cyA9IFtdO1xuICAgICAgICBpZiAocm93X2luZGV4ID4gMCkge1xuICAgICAgICAgICAgbmV3X3Jvd3MgPSB0aGlzLl9yb3dzLnNsaWNlKDAsIHJvd19pbmRleCk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgb2xkX3JvdyA9IHRoaXMuX3Jvd3Nbcm93X2luZGV4XTtcbiAgICAgICAgdmFyIG9sZF9yb3dfc3RhcnQgPSBvbGRfcm93LnN1YnN0cmluZygwLCBjaGFyX2luZGV4KTtcbiAgICAgICAgdmFyIG9sZF9yb3dfZW5kID0gb2xkX3Jvdy5zdWJzdHJpbmcoY2hhcl9pbmRleCk7XG4gICAgICAgIHZhciBzcGxpdF90ZXh0ID0gdGV4dC5zcGxpdCgnXFxuJyk7XG4gICAgICAgIG5ld19yb3dzLnB1c2gob2xkX3Jvd19zdGFydCArIHNwbGl0X3RleHRbMF0pO1xuXG4gICAgICAgIGlmIChzcGxpdF90ZXh0Lmxlbmd0aCA+IDIpIHtcbiAgICAgICAgICAgIG5ld19yb3dzID0gbmV3X3Jvd3MuY29uY2F0KHNwbGl0X3RleHQuc2xpY2UoMSxzcGxpdF90ZXh0Lmxlbmd0aC0xKSk7XG4gICAgICAgIH1cblxuICAgICAgICBuZXdfcm93cy5wdXNoKHNwbGl0X3RleHRbc3BsaXRfdGV4dC5sZW5ndGgtMV0gKyBvbGRfcm93X2VuZCk7XG5cbiAgICAgICAgaWYgKHJvd19pbmRleCsxIDwgdGhpcy5fcm93cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIG5ld19yb3dzID0gbmV3X3Jvd3MuY29uY2F0KHRoaXMuX3Jvd3Muc2xpY2Uocm93X2luZGV4KzEpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX3Jvd3MgPSBuZXdfcm93cztcbiAgICAgICAgdGhpcy5fcmVzaXplZF9yb3dzKCk7XG5cbiAgICAvLyBUZXh0IGRvZXNuJ3QgaGF2ZSBhbnkgbmV3IGxpbmVzLCBqdXN0IG1vZGlmeSB0aGVcbiAgICAvLyBsaW5lIGFuZCB0aGVuIHRyaWdnZXIgdGhlIHJvdyBjaGFuZ2VkIGV2ZW50LlxuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBvbGRfdGV4dCA9IHRoaXMuX3Jvd3Nbcm93X2luZGV4XTtcbiAgICAgICAgdGhpcy5fcm93c1tyb3dfaW5kZXhdID0gb2xkX3RleHQuc3Vic3RyaW5nKDAsIGNoYXJfaW5kZXgpICsgdGV4dCArIG9sZF90ZXh0LnN1YnN0cmluZyhjaGFyX2luZGV4KTtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdyb3dfY2hhbmdlZCcsIHJvd19pbmRleCk7XG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpO1xuICAgIH1cbn07XG5cbi8qKlxuICogUmVtb3ZlcyBhIGJsb2NrIG9mIHRleHQgZnJvbSB0aGUgZG9jdW1lbnRcbiAqIEBwYXJhbSAge2ludGVnZXJ9IHN0YXJ0X3Jvd1xuICogQHBhcmFtICB7aW50ZWdlcn0gc3RhcnRfY2hhclxuICogQHBhcmFtICB7aW50ZWdlcn0gZW5kX3Jvd1xuICogQHBhcmFtICB7aW50ZWdlcn0gZW5kX2NoYXJcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkRvY3VtZW50TW9kZWwucHJvdG90eXBlLnJlbW92ZV90ZXh0ID0gZnVuY3Rpb24oc3RhcnRfcm93LCBzdGFydF9jaGFyLCBlbmRfcm93LCBlbmRfY2hhcikge1xuICAgIGlmIChzdGFydF9yb3cgPT0gZW5kX3Jvdykge1xuICAgICAgICB0aGlzLl9yb3dzW3N0YXJ0X3Jvd10gPSB0aGlzLl9yb3dzW3N0YXJ0X3Jvd10uc3Vic3RyaW5nKDAsIHN0YXJ0X2NoYXIpICsgdGhpcy5fcm93c1tzdGFydF9yb3ddLnN1YnN0cmluZyhlbmRfY2hhcik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fcm93c1tzdGFydF9yb3ddID0gdGhpcy5fcm93c1tzdGFydF9yb3ddLnN1YnN0cmluZygwLCBzdGFydF9jaGFyKSArIHRoaXMuX3Jvd3NbZW5kX3Jvd10uc3Vic3RyaW5nKGVuZF9jaGFyKTtcbiAgICB9XG5cbiAgICBpZiAoZW5kX3JvdyAtIHN0YXJ0X3JvdyA+IDApIHtcbiAgICAgICAgdGhpcy5fcm93cy5zcGxpY2Uoc3RhcnRfcm93ICsgMSwgZW5kX3JvdyAtIHN0YXJ0X3Jvdyk7XG4gICAgICAgIHRoaXMuX3Jlc2l6ZWRfcm93cygpO1xuICAgIH0gZWxzZSBpZiAoZW5kX3JvdyA9PSBzdGFydF9yb3cpIHtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdyb3dfY2hhbmdlZCcsIHN0YXJ0X3Jvdyk7XG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMudHJpZ2dlcigncm93X2NoYW5nZWQnLCBzdGFydF9yb3cpO1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ3Jvd19jaGFuZ2VkJywgZW5kX3Jvdyk7XG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpO1xuICAgIH1cbn07XG5cbi8qKlxuICogQWRkIGEgcm93IHRvIHRoZSBkb2N1bWVudFxuICogQHBhcmFtIHtpbnRlZ2VyfSByb3dfaW5kZXhcbiAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gbmV3IHJvdydzIHRleHRcbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUuYWRkX3JvdyA9IGZ1bmN0aW9uKHJvd19pbmRleCwgdGV4dCkge1xuICAgIHZhciBuZXdfcm93cyA9IFtdO1xuICAgIGlmIChyb3dfaW5kZXggPiAwKSB7XG4gICAgICAgIG5ld19yb3dzID0gdGhpcy5fcm93cy5zbGljZSgwLCByb3dfaW5kZXgpO1xuICAgIH1cbiAgICBuZXdfcm93cy5wdXNoKHRleHQpO1xuICAgIGlmIChyb3dfaW5kZXggPCB0aGlzLl9yb3dzLmxlbmd0aCkge1xuICAgICAgICBuZXdfcm93cyA9IG5ld19yb3dzLmNvbmNhdCh0aGlzLl9yb3dzLnNsaWNlKHJvd19pbmRleCkpO1xuICAgIH1cblxuICAgIHRoaXMuX3Jvd3MgPSBuZXdfcm93cztcbiAgICB0aGlzLl9yZXNpemVkX3Jvd3MoKTtcbn07XG5cbi8qKlxuICogR2V0cyB0aGUgdGV4dCBvZiB0aGUgZG9jdW1lbnQuXG4gKiBAcmV0dXJuIHtzdHJpbmd9XG4gKi9cbkRvY3VtZW50TW9kZWwucHJvdG90eXBlLl9nZXRfdGV4dCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9yb3dzLmpvaW4oJ1xcbicpO1xufTtcblxuLyoqXG4gKiBTZXRzIHRoZSB0ZXh0IG9mIHRoZSBkb2N1bWVudC5cbiAqIENvbXBsZXhpdHkgTyhOKSBmb3IgTiByb3dzXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWVcbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUuX3NldF90ZXh0ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICB0aGlzLl9yb3dzID0gdmFsdWUuc3BsaXQoJ1xcbicpO1xuICAgIHRoaXMuX3Jlc2l6ZWRfcm93cygpO1xufTtcblxuLyoqXG4gKiBVcGRhdGVzIF9yb3cncyBwYXJ0bmVyIGFycmF5cy5cbiAqIEByZXR1cm4ge251bGx9IFxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS5fcmVzaXplZF9yb3dzID0gZnVuY3Rpb24oKSB7XG5cbiAgICAvLyBNYWtlIHN1cmUgdGhlcmUgYXJlIGFzIG1hbnkgdGFnIHJvd3MgYXMgdGhlcmUgYXJlIHRleHQgcm93cy5cbiAgICB3aGlsZSAodGhpcy5fcm93X3RhZ3MubGVuZ3RoIDwgdGhpcy5fcm93cy5sZW5ndGgpIHtcbiAgICAgICAgdGhpcy5fcm93X3RhZ3MucHVzaChbXSk7XG4gICAgfVxuICAgIGlmICh0aGlzLl9yb3dfdGFncy5sZW5ndGggPiB0aGlzLl9yb3dzLmxlbmd0aCkge1xuICAgICAgICB0aGlzLl9yb3dfdGFncy5zcGxpY2UodGhpcy5fcm93cy5sZW5ndGgsIHRoaXMuX3Jvd190YWdzLmxlbmd0aCAtIHRoaXMuX3Jvd3MubGVuZ3RoKTtcbiAgICB9XG5cbiAgICAvLyBUcmlnZ2VyIGV2ZW50c1xuICAgIHRoaXMudHJpZ2dlcigndGV4dF9jaGFuZ2VkJyk7XG4gICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2VkJyk7XG59O1xuXG4vKipcbiAqIENyZWF0ZSB0aGUgZG9jdW1lbnQncyBwcm9wZXJ0aWVzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUuX2luaXRfcHJvcGVydGllcyA9IGZ1bmN0aW9uKCkgeyAgICBcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdGhpcy5wcm9wZXJ0eSgncm93cycsIGZ1bmN0aW9uKCkgeyBcbiAgICAgICAgLy8gUmV0dXJuIGEgc2hhbGxvdyBjb3B5IG9mIHRoZSBhcnJheSBzbyBpdCBjYW5ub3QgYmUgbW9kaWZpZWQuXG4gICAgICAgIHJldHVybiBbXS5jb25jYXQodGhhdC5fcm93cyk7IFxuICAgIH0pO1xuICAgIHRoaXMucHJvcGVydHkoJ3RleHQnLCBcbiAgICAgICAgdXRpbHMucHJveHkodGhpcy5fZ2V0X3RleHQsIHRoaXMpLCBcbiAgICAgICAgdXRpbHMucHJveHkodGhpcy5fc2V0X3RleHQsIHRoaXMpKTtcbn07XG5cbmV4cG9ydHMuRG9jdW1lbnRNb2RlbCA9IERvY3VtZW50TW9kZWw7IiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xuXG4vLyBSZW5kZXJlcnNcbnZhciBiYXRjaCA9IHJlcXVpcmUoJy4vcmVuZGVyZXJzL2JhdGNoLmpzJyk7XG52YXIgaGlnaGxpZ2h0ZWRfcm93ID0gcmVxdWlyZSgnLi9yZW5kZXJlcnMvaGlnaGxpZ2h0ZWRfcm93LmpzJyk7XG52YXIgY3Vyc29ycyA9IHJlcXVpcmUoJy4vcmVuZGVyZXJzL2N1cnNvcnMuanMnKTtcblxuLyoqXG4gKiBWaXN1YWwgcmVwcmVzZW50YXRpb24gb2YgYSBEb2N1bWVudE1vZGVsIGluc3RhbmNlXG4gKiBAcGFyYW0ge0NhbnZhc30gY2FudmFzIGluc3RhbmNlXG4gKiBAcGFyYW0ge0RvY3VtZW50TW9kZWx9IG1vZGVsIGluc3RhbmNlXG4gKiBAcGFyYW0ge0N1cnNvcnN9IGN1cnNvcnNfbW9kZWwgaW5zdGFuY2VcbiAqIEBwYXJhbSB7ZGljdGlvbmFyeX0gc3R5bGUgLSBkZXNjcmliZXMgcmVuZGVyaW5nIHN0eWxlXG4gKi9cbnZhciBEb2N1bWVudFZpZXcgPSBmdW5jdGlvbihjYW52YXMsIG1vZGVsLCBjdXJzb3JzX21vZGVsLCBzdHlsZSkge1xuICAgIHRoaXMuX21vZGVsID0gbW9kZWw7XG5cbiAgICAvLyBDcmVhdGUgY2hpbGQgcmVuZGVyZXJzLlxuICAgIHZhciByb3dfcmVuZGVyZXIgPSBuZXcgaGlnaGxpZ2h0ZWRfcm93LkhpZ2hsaWdodGVkUm93UmVuZGVyZXIobW9kZWwsIGNhbnZhcywgc3R5bGUpO1xuICAgIHZhciBjdXJzb3JzX3JlbmRlcmVyID0gbmV3IGN1cnNvcnMuQ3Vyc29yc1JlbmRlcmVyKFxuICAgICAgICBjdXJzb3JzX21vZGVsLCBcbiAgICAgICAgc3R5bGUsIFxuICAgICAgICB1dGlscy5wcm94eShyb3dfcmVuZGVyZXIuZ2V0X3Jvd19oZWlnaHQsIHJvd19yZW5kZXJlciksIFxuICAgICAgICB1dGlscy5wcm94eShyb3dfcmVuZGVyZXIuZ2V0X3Jvd190b3AsIHJvd19yZW5kZXJlciksIFxuICAgICAgICB1dGlscy5wcm94eShyb3dfcmVuZGVyZXIubWVhc3VyZV9wYXJ0aWFsX3Jvd193aWR0aCwgcm93X3JlbmRlcmVyKSxcbiAgICAgICAgZnVuY3Rpb24oKSB7IHJldHVybiBjYW52YXMuZm9jdXNlZDsgfSk7XG5cbiAgICAvLyBQYXNzIGdldF9yb3dfY2hhciBpbnRvIGN1cnNvcnMuXG4gICAgY3Vyc29yc19tb2RlbC5nZXRfcm93X2NoYXIgPSB1dGlscy5wcm94eShyb3dfcmVuZGVyZXIuZ2V0X3Jvd19jaGFyLCByb3dfcmVuZGVyZXIpO1xuXG4gICAgLy8gQ2FsbCBiYXNlIGNvbnN0cnVjdG9yLlxuICAgIGJhdGNoLkJhdGNoUmVuZGVyZXIuY2FsbCh0aGlzLCBbXG4gICAgICAgIHJvd19yZW5kZXJlcixcbiAgICAgICAgY3Vyc29yc19yZW5kZXJlcixcbiAgICBdLCBjYW52YXMpO1xuXG4gICAgLy8gSG9va3VwIHJlbmRlciBldmVudHMuXG4gICAgdGhpcy5fY2FudmFzLm9uKCdyZWRyYXcnLCB1dGlscy5wcm94eSh0aGlzLnJlbmRlciwgdGhpcykpO1xuICAgIHRoaXMuX21vZGVsLm9uKCdjaGFuZ2VkJywgdXRpbHMucHJveHkoY2FudmFzLnJlZHJhdywgY2FudmFzKSk7XG5cbiAgICAvLyBDcmVhdGUgcHJvcGVydGllc1xuICAgIHRoaXMucHJvcGVydHkoJ3N0eWxlJywgZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuIHJvd19yZW5kZXJlci5zdHlsZTtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICByb3dfcmVuZGVyZXIuc3R5bGUgPSB2YWx1ZTtcbiAgICAgICAgY3Vyc29yc19yZW5kZXJlci5zdHlsZSA9IHZhbHVlO1xuICAgIH0pO1xufTtcbnV0aWxzLmluaGVyaXQoRG9jdW1lbnRWaWV3LCBiYXRjaC5CYXRjaFJlbmRlcmVyKTtcblxuZXhwb3J0cy5Eb2N1bWVudFZpZXcgPSBEb2N1bWVudFZpZXc7IiwiZXhwb3J0cy5tYXAgPSB7XG4gICAgJ2tleXByZXNzJyA6ICdjdXJzb3Iua2V5cHJlc3MnLFxuICAgICdlbnRlcicgOiAnY3Vyc29yLm5ld2xpbmUnLFxuICAgICdkZWxldGUnIDogJ2N1cnNvci5kZWxldGVfZm9yd2FyZCcsXG4gICAgJ2JhY2tzcGFjZScgOiAnY3Vyc29yLmRlbGV0ZV9iYWNrd2FyZCcsXG4gICAgJ2xlZnQnIDogJ2N1cnNvci5sZWZ0JyxcbiAgICAncmlnaHQnIDogJ2N1cnNvci5yaWdodCcsXG4gICAgJ3VwJyA6ICdjdXJzb3IudXAnLFxuICAgICdkb3duJyA6ICdjdXJzb3IuZG93bicsXG4gICAgJ3NoaWZ0LWxlZnQnIDogJ2N1cnNvci5zZWxlY3RfbGVmdCcsXG4gICAgJ3NoaWZ0LXJpZ2h0JyA6ICdjdXJzb3Iuc2VsZWN0X3JpZ2h0JyxcbiAgICAnc2hpZnQtdXAnIDogJ2N1cnNvci5zZWxlY3RfdXAnLFxuICAgICdzaGlmdC1kb3duJyA6ICdjdXJzb3Iuc2VsZWN0X2Rvd24nLFxuICAgICdtb3VzZTAtZG93bicgOiAnY3Vyc29ycy5zdGFydF9zZWxlY3Rpb24nLFxuICAgICdtb3VzZS1tb3ZlJyA6ICdjdXJzb3JzLnNldF9zZWxlY3Rpb24nLFxuICAgICdtb3VzZTAtdXAnIDogJ2N1cnNvcnMuZW5kX3NlbGVjdGlvbicsXG59OyIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy5qcycpO1xuXG4vKipcbiAqIEV2ZW50IG5vcm1hbGl6ZXJcbiAqXG4gKiBMaXN0ZW5zIHRvIERPTSBldmVudHMgYW5kIGVtaXRzICdjbGVhbmVkJyB2ZXJzaW9ucyBvZiB0aG9zZSBldmVudHMuXG4gKi9cbnZhciBNYXAgPSBmdW5jdGlvbihub3JtYWxpemVyKSB7XG4gICAgdXRpbHMuUG9zdGVyQ2xhc3MuY2FsbCh0aGlzKTtcbiAgICB0aGlzLl9tYXAgPSB7fTtcblxuICAgIC8vIENyZWF0ZSBub3JtYWxpemVyIHByb3BlcnR5XG4gICAgdGhpcy5fbm9ybWFsaXplciA9IG51bGw7XG4gICAgdGhpcy5fcHJveHlfaGFuZGxlX2V2ZW50ID0gdXRpbHMucHJveHkodGhpcy5faGFuZGxlX2V2ZW50LCB0aGlzKTtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdGhpcy5wcm9wZXJ0eSgnbm9ybWFsaXplcicsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC5fbm9ybWFsaXplcjtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAvLyBSZW1vdmUgZXZlbnQgaGFuZGxlci5cbiAgICAgICAgaWYgKHRoYXQuX25vcm1hbGl6ZXIpIHRoYXQuX25vcm1hbGl6ZXIub2ZmX2FsbCh0aGF0Ll9wcm94eV9oYW5kbGVfZXZlbnQpO1xuICAgICAgICAvLyBTZXQsIGFuZCBhZGQgZXZlbnQgaGFuZGxlci5cbiAgICAgICAgdGhhdC5fbm9ybWFsaXplciA9IHZhbHVlO1xuICAgICAgICBpZiAodmFsdWUpIHZhbHVlLm9uX2FsbCh0aGF0Ll9wcm94eV9oYW5kbGVfZXZlbnQpO1xuICAgIH0pO1xuXG4gICAgLy8gSWYgZGVmaW5lZCwgc2V0IHRoZSBub3JtYWxpemVyLlxuICAgIGlmIChub3JtYWxpemVyKSB0aGlzLm5vcm1hbGl6ZXIgPSBub3JtYWxpemVyO1xufTtcbnV0aWxzLmluaGVyaXQoTWFwLCB1dGlscy5Qb3N0ZXJDbGFzcyk7XG5cbi8qKlxuICogTWFwIG9mIEFQSSBtZXRob2RzIGJ5IG5hbWUuXG4gKiBAdHlwZSB7ZGljdGlvbmFyeX1cbiAqL1xuTWFwLnJlZ2lzdHJ5ID0ge307XG5NYXAuX3JlZ2lzdHJ5X3RhZ3MgPSB7fTtcblxuLyoqXG4gKiBSZWdpc3RlcnMgYW4gYWN0aW9uLlxuICogQHBhcmFtICB7c3RyaW5nfSBuYW1lIC0gbmFtZSBvZiB0aGUgYWN0aW9uXG4gKiBAcGFyYW0gIHtmdW5jdGlvbn0gZlxuICogQHBhcmFtICB7T2JqZWN0fSAob3B0aW9uYWwpIHRhZyAtIGFsbG93cyB5b3UgdG8gc3BlY2lmeSBhIHRhZ1xuICogICAgICAgICAgICAgICAgICB3aGljaCBjYW4gYmUgdXNlZCB3aXRoIHRoZSBgdW5yZWdpc3Rlcl9ieV90YWdgXG4gKiAgICAgICAgICAgICAgICAgIG1ldGhvZCB0byBxdWlja2x5IHVucmVnaXN0ZXIgYWN0aW9ucyB3aXRoXG4gKiAgICAgICAgICAgICAgICAgIHRoZSB0YWcgc3BlY2lmaWVkLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuTWFwLnJlZ2lzdGVyID0gZnVuY3Rpb24obmFtZSwgZiwgdGFnKSB7XG4gICAgaWYgKHV0aWxzLmlzX2FycmF5KE1hcC5yZWdpc3RyeVtuYW1lXSkpIHtcbiAgICAgICAgTWFwLnJlZ2lzdHJ5W25hbWVdLnB1c2goZik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKE1hcC5yZWdpc3RyeVtuYW1lXT09PXVuZGVmaW5lZCkge1xuICAgICAgICAgICAgTWFwLnJlZ2lzdHJ5W25hbWVdID0gZjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIE1hcC5yZWdpc3RyeVtuYW1lXSA9IFtNYXAucmVnaXN0cnlbbmFtZV0sIGZdO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRhZykge1xuICAgICAgICBpZiAoTWFwLl9yZWdpc3RyeV90YWdzW3RhZ10gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgTWFwLl9yZWdpc3RyeV90YWdzW3RhZ10gPSBbXTtcbiAgICAgICAgfVxuICAgICAgICBNYXAuX3JlZ2lzdHJ5X3RhZ3NbdGFnXS5wdXNoKHtuYW1lOiBuYW1lLCBmOiBmfSk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBVbnJlZ2lzdGVyIGFuIGFjdGlvbi5cbiAqIEBwYXJhbSAge3N0cmluZ30gbmFtZSAtIG5hbWUgb2YgdGhlIGFjdGlvblxuICogQHBhcmFtICB7ZnVuY3Rpb259IGZcbiAqIEByZXR1cm4ge2Jvb2xlYW59IHRydWUgaWYgYWN0aW9uIHdhcyBmb3VuZCBhbmQgdW5yZWdpc3RlcmVkXG4gKi9cbk1hcC51bnJlZ2lzdGVyID0gZnVuY3Rpb24obmFtZSwgZikge1xuICAgIGlmICh1dGlscy5pc19hcnJheShNYXAucmVnaXN0cnlbbmFtZV0pKSB7XG4gICAgICAgIHZhciBpbmRleCA9IE1hcC5yZWdpc3RyeVtuYW1lXS5pbmRleE9mKGYpO1xuICAgICAgICBpZiAoaW5kZXggIT0gLTEpIHtcbiAgICAgICAgICAgIE1hcC5yZWdpc3RyeVtuYW1lXS5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKE1hcC5yZWdpc3RyeVtuYW1lXSA9PSBmKSB7XG4gICAgICAgIGRlbGV0ZSBNYXAucmVnaXN0cnlbbmFtZV07XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG4vKipcbiAqIFVucmVnaXN0ZXJzIGFsbCBvZiB0aGUgYWN0aW9ucyByZWdpc3RlcmVkIHdpdGggYSBnaXZlbiB0YWcuXG4gKiBAcGFyYW0gIHtPYmplY3R9IHRhZyAtIHNwZWNpZmllZCBpbiBNYXAucmVnaXN0ZXIuXG4gKiBAcmV0dXJuIHtib29sZWFufSB0cnVlIGlmIHRoZSB0YWcgd2FzIGZvdW5kIGFuZCBkZWxldGVkLlxuICovXG5NYXAudW5yZWdpc3Rlcl9ieV90YWcgPSBmdW5jdGlvbih0YWcpIHtcbiAgICBpZiAoTWFwLl9yZWdpc3RyeV90YWdzW3RhZ10pIHtcbiAgICAgICAgTWFwLl9yZWdpc3RyeV90YWdzW3RhZ10uZm9yRWFjaChmdW5jdGlvbihyZWdpc3RyYXRpb24pIHtcbiAgICAgICAgICAgIE1hcC51bnJlZ2lzdGVyKHJlZ2lzdHJhdGlvbi5uYW1lLCByZWdpc3RyYXRpb24uZik7XG4gICAgICAgIH0pO1xuICAgICAgICBkZWxldGUgTWFwLl9yZWdpc3RyeV90YWdzW3RhZ107XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbn07XG5cbi8qKlxuICogQXBwZW5kIGV2ZW50IGFjdGlvbnMgdG8gdGhlIG1hcC5cbiAqXG4gKiBUaGlzIG1ldGhvZCBoYXMgdHdvIHNpZ25hdHVyZXMuICBJZiBhIHNpbmdsZSBhcmd1bWVudFxuICogaXMgcGFzc2VkIHRvIGl0LCB0aGF0IGFyZ3VtZW50IGlzIHRyZWF0ZWQgbGlrZSBhXG4gKiBkaWN0aW9uYXJ5LiAgSWYgbW9yZSB0aGFuIG9uZSBhcmd1bWVudCBpcyBwYXNzZWQgdG8gaXQsXG4gKiBlYWNoIGFyZ3VtZW50IGlzIHRyZWF0ZWQgYXMgYWx0ZXJuYXRpbmcga2V5LCB2YWx1ZVxuICogcGFpcnMgb2YgYSBkaWN0aW9uYXJ5LlxuICpcbiAqIFRoZSBtYXAgYWxsb3dzIHlvdSB0byByZWdpc3RlciBhY3Rpb25zIGZvciBrZXlzLlxuICogRXhhbXBsZTpcbiAqICAgICBtYXAuYXBwZW5kX21hcCh7XG4gKiAgICAgICAgICdjdHJsLWEnOiAnY3Vyc29ycy5zZWxlY3RfYWxsJyxcbiAqICAgICB9KVxuICpcbiAqIE11bHRpcGxlIGFjdGlvbnMgY2FuIGJlIHJlZ2lzdGVyZWQgZm9yIGEgc2luZ2xlIGV2ZW50LlxuICogVGhlIGFjdGlvbnMgYXJlIGV4ZWN1dGVkIHNlcXVlbnRpYWxseSwgdW50aWwgb25lIGFjdGlvblxuICogcmV0dXJucyBgdHJ1ZWAgaW4gd2hpY2ggY2FzZSB0aGUgZXhlY3V0aW9uIGhhdWx0cy4gIFRoaXNcbiAqIGFsbG93cyBhY3Rpb25zIHRvIHJ1biBjb25kaXRpb25hbGx5LlxuICogRXhhbXBsZTpcbiAqICAgICAvLyBJbXBsZW1lbnRpbmcgYSBkdWFsIG1vZGUgZWRpdG9yLCB5b3UgbWF5IGhhdmUgdHdvXG4gKiAgICAgLy8gZnVuY3Rpb25zIHRvIHJlZ2lzdGVyIGZvciBvbmUga2V5LiBpLmUuOlxuICogICAgIHZhciBkb19hID0gZnVuY3Rpb24oZSkge1xuICogICAgICAgICBpZiAobW9kZT09J2VkaXQnKSB7XG4gKiAgICAgICAgICAgICBjb25zb2xlLmxvZygnQScpO1xuICogICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gKiAgICAgICAgIH1cbiAqICAgICB9XG4gKiAgICAgdmFyIGRvX2IgPSBmdW5jdGlvbihlKSB7XG4gKiAgICAgICAgIGlmIChtb2RlPT0nY29tbWFuZCcpIHtcbiAqICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdCJyk7XG4gKiAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAqICAgICAgICAgfVxuICogICAgIH1cbiAqXG4gKiAgICAgLy8gVG8gcmVnaXN0ZXIgYm90aCBmb3Igb25lIGtleVxuICogICAgIE1hcC5yZWdpc3RlcignYWN0aW9uX2EnLCBkb19hKTtcbiAqICAgICBNYXAucmVnaXN0ZXIoJ2FjdGlvbl9iJywgZG9fYik7XG4gKiAgICAgbWFwLmFwcGVuZF9tYXAoe1xuICogICAgICAgICAnYWx0LXYnOiBbJ2FjdGlvbl9hJywgJ2FjdGlvbl9iJ10sXG4gKiAgICAgfSk7XG4gKiBcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbk1hcC5wcm90b3R5cGUuYXBwZW5kX21hcCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB2YXIgcGFyc2VkID0gdGhpcy5fcGFyc2VfbWFwX2FyZ3VtZW50cyhhcmd1bWVudHMpO1xuICAgIE9iamVjdC5rZXlzKHBhcnNlZCkuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgaWYgKHRoYXQuX21hcFtrZXldID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRoYXQuX21hcFtrZXldID0gcGFyc2VkW2tleV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGF0Ll9tYXBba2V5XSA9IHRoYXQuX21hcFtrZXldLmNvbmNhdChwYXJzZWRba2V5XSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cbi8qKlxuICogQWxpYXMgZm9yIGBhcHBlbmRfbWFwYC5cbiAqIEB0eXBlIHtmdW5jdGlvbn1cbiAqL1xuTWFwLnByb3RvdHlwZS5tYXAgPSBNYXAucHJvdG90eXBlLmFwcGVuZF9tYXA7XG5cbi8qKlxuICogUHJlcGVuZCBldmVudCBhY3Rpb25zIHRvIHRoZSBtYXAuXG4gKlxuICogU2VlIHRoZSBkb2MgZm9yIGBhcHBlbmRfbWFwYCBmb3IgYSBkZXRhaWxlZCBkZXNjcmlwdGlvbiBvZlxuICogcG9zc2libGUgaW5wdXQgdmFsdWVzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuTWFwLnByb3RvdHlwZS5wcmVwZW5kX21hcCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB2YXIgcGFyc2VkID0gdGhpcy5fcGFyc2VfbWFwX2FyZ3VtZW50cyhhcmd1bWVudHMpO1xuICAgIE9iamVjdC5rZXlzKHBhcnNlZCkuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgaWYgKHRoYXQuX21hcFtrZXldID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRoYXQuX21hcFtrZXldID0gcGFyc2VkW2tleV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGF0Ll9tYXBba2V5XSA9IHBhcnNlZFtrZXldLmNvbmNhdCh0aGF0Ll9tYXBba2V5XSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cbi8qKlxuICogVW5tYXAgZXZlbnQgYWN0aW9ucyBpbiB0aGUgbWFwLlxuICpcbiAqIFNlZSB0aGUgZG9jIGZvciBgYXBwZW5kX21hcGAgZm9yIGEgZGV0YWlsZWQgZGVzY3JpcHRpb24gb2ZcbiAqIHBvc3NpYmxlIGlucHV0IHZhbHVlcy5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbk1hcC5wcm90b3R5cGUudW5tYXAgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdmFyIHBhcnNlZCA9IHRoaXMuX3BhcnNlX21hcF9hcmd1bWVudHMoYXJndW1lbnRzKTtcbiAgICBPYmplY3Qua2V5cyhwYXJzZWQpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIGlmICh0aGF0Ll9tYXBba2V5XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBwYXJzZWRba2V5XS5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdmFyIGluZGV4ID0gdGhhdC5fbWFwW2tleV0uaW5kZXhPZih2YWx1ZSk7XG4gICAgICAgICAgICAgICAgaWYgKGluZGV4ICE9IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQuX21hcFtrZXldLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cbi8qKlxuICogR2V0IGEgbW9kaWZpYWJsZSBhcnJheSBvZiB0aGUgYWN0aW9ucyBmb3IgYSBwYXJ0aWN1bGFyIGV2ZW50LlxuICogQHBhcmFtICB7c3RyaW5nfSBldmVudFxuICogQHJldHVybiB7YXJyYXl9IGJ5IHJlZiBjb3B5IG9mIHRoZSBhY3Rpb25zIHJlZ2lzdGVyZWQgdG8gYW4gZXZlbnQuXG4gKi9cbk1hcC5wcm90b3R5cGUuZ2V0X21hcHBpbmcgPSBmdW5jdGlvbihldmVudCkge1xuICAgIHJldHVybiB0aGlzLl9tYXBbdGhpcy5fbm9ybWFsaXplX2V2ZW50X25hbWUoZXZlbnQpXTtcbn07XG5cbi8qKlxuICogUGFyc2UgdGhlIGFyZ3VtZW50cyB0byBhIG1hcCBmdW5jdGlvbi5cbiAqIEBwYXJhbSAge2FyZ3VtZW50cyBhcnJheX0gYXJnc1xuICogQHJldHVybiB7ZGljdGlvbmFyeX0gcGFyc2VkIHJlc3VsdHNcbiAqL1xuTWFwLnByb3RvdHlwZS5fcGFyc2VfbWFwX2FyZ3VtZW50cyA9IGZ1bmN0aW9uKGFyZ3MpIHtcbiAgICB2YXIgcGFyc2VkID0ge307XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuXG4gICAgLy8gT25lIGFydW1lbnQsIHRyZWF0IGl0IGFzIGEgZGljdGlvbmFyeSBvZiBldmVudCBuYW1lcyBhbmRcbiAgICAvLyBhY3Rpb25zLlxuICAgIGlmIChhcmdzLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgIE9iamVjdC5rZXlzKGFyZ3NbMF0pLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBhcmdzWzBdW2tleV07XG4gICAgICAgICAgICB2YXIgbm9ybWFsaXplZF9rZXkgPSB0aGF0Ll9ub3JtYWxpemVfZXZlbnRfbmFtZShrZXkpO1xuXG4gICAgICAgICAgICAvLyBJZiB0aGUgdmFsdWUgaXMgbm90IGFuIGFycmF5LCB3cmFwIGl0IGluIG9uZS5cbiAgICAgICAgICAgIGlmICghdXRpbHMuaXNfYXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBbdmFsdWVdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBJZiB0aGUga2V5IGlzIGFscmVhZHkgZGVmaW5lZCwgY29uY2F0IHRoZSB2YWx1ZXMgdG9cbiAgICAgICAgICAgIC8vIGl0LiAgT3RoZXJ3aXNlLCBzZXQgaXQuXG4gICAgICAgICAgICBpZiAocGFyc2VkW25vcm1hbGl6ZWRfa2V5XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgcGFyc2VkW25vcm1hbGl6ZWRfa2V5XSA9IHZhbHVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwYXJzZWRbbm9ybWFsaXplZF9rZXldID0gcGFyc2VkW25vcm1hbGl6ZWRfa2V5XS5jb25jYXQodmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgIC8vIE1vcmUgdGhhbiBvbmUgYXJndW1lbnQuICBUcmVhdCBhcyB0aGUgZm9ybWF0OlxuICAgIC8vIGV2ZW50X25hbWUxLCBhY3Rpb24xLCBldmVudF9uYW1lMiwgYWN0aW9uMiwgLi4uLCBldmVudF9uYW1lTiwgYWN0aW9uTlxuICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAodmFyIGk9MDsgaTxNYXRoLmZsb29yKGFyZ3MubGVuZ3RoLzIpOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBrZXkgPSB0aGF0Ll9ub3JtYWxpemVfZXZlbnRfbmFtZShhcmdzWzIqaV0pO1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gYXJnc1syKmkgKyAxXTtcbiAgICAgICAgICAgIGlmIChwYXJzZWRba2V5XT09PXVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHBhcnNlZFtrZXldID0gW3ZhbHVlXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcGFyc2VkW2tleV0ucHVzaCh2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHBhcnNlZDtcbn07XG5cbi8qKlxuICogSGFuZGxlcyBhIG5vcm1hbGl6ZWQgZXZlbnQuXG4gKiBAcGFyYW0gIHtzdHJpbmd9IG5hbWUgLSBuYW1lIG9mIHRoZSBldmVudFxuICogQHBhcmFtICB7RXZlbnR9IGUgLSBicm93c2VyIEV2ZW50IG9iamVjdFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuTWFwLnByb3RvdHlwZS5faGFuZGxlX2V2ZW50ID0gZnVuY3Rpb24obmFtZSwgZSkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB2YXIgbm9ybWFsaXplZF9ldmVudCA9IHRoaXMuX25vcm1hbGl6ZV9ldmVudF9uYW1lKG5hbWUpO1xuICAgIHZhciBhY3Rpb25zID0gdGhpcy5fbWFwW25vcm1hbGl6ZWRfZXZlbnRdO1xuXG4gICAgaWYgKG5vcm1hbGl6ZWRfZXZlbnQgIT0gJ21vdXNlLW1vdmUnKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKG5vcm1hbGl6ZWRfZXZlbnQpO1xuICAgIH1cblxuICAgIGlmIChhY3Rpb25zKSB7XG4gICAgICAgIGFjdGlvbnMuZm9yRWFjaChmdW5jdGlvbihhY3Rpb24pIHtcbiAgICAgICAgICAgIHZhciBhY3Rpb25fY2FsbGJhY2tzID0gTWFwLnJlZ2lzdHJ5W2FjdGlvbl07XG4gICAgICAgICAgICBpZiAoYWN0aW9uX2NhbGxiYWNrcykge1xuICAgICAgICAgICAgICAgIGlmICh1dGlscy5pc19hcnJheShhY3Rpb25fY2FsbGJhY2tzKSkge1xuICAgICAgICAgICAgICAgICAgICBhY3Rpb25fY2FsbGJhY2tzLmZvckVhY2goZnVuY3Rpb24oYWN0aW9uX2NhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0aW9uX2NhbGxiYWNrLmNhbGwodW5kZWZpbmVkLCBlKT09PXRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Ll9jYW5jZWxfYnViYmxlKGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYWN0aW9uX2NhbGxiYWNrcy5jYWxsKHVuZGVmaW5lZCwgZSk9PT10cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0Ll9jYW5jZWxfYnViYmxlKGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG4vKipcbiAqIEFscGhhYmV0aWNhbGx5IHNvcnRzIGtleXMgaW4gZXZlbnQgbmFtZSwgc29cbiAqIEBwYXJhbSAge3N0cmluZ30gbmFtZSAtIGV2ZW50IG5hbWVcbiAqIEByZXR1cm4ge3N0cmluZ30gbm9ybWFsaXplZCBldmVudCBuYW1lXG4gKi9cbk1hcC5wcm90b3R5cGUuX25vcm1hbGl6ZV9ldmVudF9uYW1lID0gZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiBuYW1lLnRvTG93ZXJDYXNlKCkudHJpbSgpLnNwbGl0KCctJykuc29ydCgpLmpvaW4oJy0nKTtcbn07XG5cbi8qKlxuICogQ2FuY2VscyBldmVudCBidWJibGluZy5cbiAqIEBwYXJhbSAge2V2ZW50fSBlXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5NYXAucHJvdG90eXBlLl9jYW5jZWxfYnViYmxlID0gZnVuY3Rpb24oZSkge1xuICAgIGlmIChlLnN0b3BQcm9wYWdhdGlvbikgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICBpZiAoZS5jYW5jZWxCdWJibGUgIT09IG51bGwpIGUuY2FuY2VsQnViYmxlID0gdHJ1ZTtcbiAgICBpZiAoZS5wcmV2ZW50RGVmYXVsdCkgZS5wcmV2ZW50RGVmYXVsdCgpO1xufTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5NYXAgPSBNYXA7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMuanMnKTtcblxuLyoqXG4gKiBFdmVudCBub3JtYWxpemVyXG4gKlxuICogTGlzdGVucyB0byBET00gZXZlbnRzIGFuZCBlbWl0cyAnY2xlYW5lZCcgdmVyc2lvbnMgb2YgdGhvc2UgZXZlbnRzLlxuICovXG52YXIgTm9ybWFsaXplciA9IGZ1bmN0aW9uKCkge1xuICAgIHV0aWxzLlBvc3RlckNsYXNzLmNhbGwodGhpcyk7XG59O1xudXRpbHMuaW5oZXJpdChOb3JtYWxpemVyLCB1dGlscy5Qb3N0ZXJDbGFzcyk7XG5cbi8qKlxuICogTGlzdGVuIHRvIHRoZSBldmVudHMgb2YgYW4gZWxlbWVudC5cbiAqIEBwYXJhbSAge0hUTUxFbGVtZW50fSBlbFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuTm9ybWFsaXplci5wcm90b3R5cGUubGlzdGVuX3RvID0gZnVuY3Rpb24oZWwpIHtcbiAgICBlbC5vbmtleXByZXNzID0gdGhpcy5fcHJveHkoJ3ByZXNzJywgdGhpcy5faGFuZGxlX2tleXByZXNzX2V2ZW50LCBlbCk7XG4gICAgZWwub25rZXlkb3duID0gIHRoaXMuX3Byb3h5KCdkb3duJywgdGhpcy5faGFuZGxlX2tleWJvYXJkX2V2ZW50LCBlbCk7XG4gICAgZWwub25rZXl1cCA9ICB0aGlzLl9wcm94eSgndXAnLCB0aGlzLl9oYW5kbGVfa2V5Ym9hcmRfZXZlbnQsIGVsKTtcbiAgICBlbC5vbmRibGNsaWNrID0gIHRoaXMuX3Byb3h5KCdkYmxjbGljaycsIHRoaXMuX2hhbmRsZV9tb3VzZV9ldmVudCwgZWwpO1xuICAgIGVsLm9uY2xpY2sgPSAgdGhpcy5fcHJveHkoJ2NsaWNrJywgdGhpcy5faGFuZGxlX21vdXNlX2V2ZW50LCBlbCk7XG4gICAgZWwub25tb3VzZWRvd24gPSAgdGhpcy5fcHJveHkoJ2Rvd24nLCB0aGlzLl9oYW5kbGVfbW91c2VfZXZlbnQsIGVsKTtcbiAgICBlbC5vbm1vdXNldXAgPSAgdGhpcy5fcHJveHkoJ3VwJywgdGhpcy5faGFuZGxlX21vdXNlX2V2ZW50LCBlbCk7XG4gICAgZWwub25tb3VzZW1vdmUgPSAgdGhpcy5fcHJveHkoJ21vdmUnLCB0aGlzLl9oYW5kbGVfbW91c2Vtb3ZlX2V2ZW50LCBlbCk7XG59O1xuXG4vKipcbiAqIFN0b3BzIGxpc3RlbmluZyB0byBhbiBlbGVtZW50LlxuICogQHBhcmFtICB7SFRNTEVsZW1lbnR9IGVsXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Ob3JtYWxpemVyLnByb3RvdHlwZS5zdG9wX2xpc3RlbmluZ190byA9IGZ1bmN0aW9uKGVsKSB7XG4gICAgZWwub25rZXlwcmVzcyA9IG51bGw7XG4gICAgZWwub25rZXlkb3duID0gbnVsbDtcbiAgICBlbC5vbmRibGNsaWNrID0gbnVsbDtcbiAgICBlbC5vbmNsaWNrID0gbnVsbDtcbiAgICBlbC5vbm1vdXNlZG93biA9IG51bGw7XG4gICAgZWwub25tb3VzZXVwID0gbnVsbDtcbiAgICBlbC5vbm1vdXNlbW92ZSA9IG51bGw7XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgd2hlbiBhIG1vdXNlIGV2ZW50IG9jY3Vyc1xuICogQHBhcmFtICB7SFRNTEVsZW1lbnR9IGVsXG4gKiBAcGFyYW0gIHtFdmVudH0gZVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuTm9ybWFsaXplci5wcm90b3R5cGUuX2hhbmRsZV9tb3VzZV9ldmVudCA9IGZ1bmN0aW9uKGVsLCBldmVudF9uYW1lLCBlKSB7XG4gICAgZSA9IGUgfHwgd2luZG93LmV2ZW50O1xuICAgIHRoaXMudHJpZ2dlcih0aGlzLl9tb2RpZmllcl9zdHJpbmcoZSkgKyAnbW91c2UnICsgZS5idXR0b24gKyAnLScgKyBldmVudF9uYW1lLCBlKTtcbn07XG5cbi8qKlxuICogSGFuZGxlcyB3aGVuIGEgbW91c2UgZXZlbnQgb2NjdXJzXG4gKiBAcGFyYW0gIHtIVE1MRWxlbWVudH0gZWxcbiAqIEBwYXJhbSAge0V2ZW50fSBlXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Ob3JtYWxpemVyLnByb3RvdHlwZS5faGFuZGxlX21vdXNlbW92ZV9ldmVudCA9IGZ1bmN0aW9uKGVsLCBldmVudF9uYW1lLCBlKSB7XG4gICAgZSA9IGUgfHwgd2luZG93LmV2ZW50O1xuICAgIHRoaXMudHJpZ2dlcih0aGlzLl9tb2RpZmllcl9zdHJpbmcoZSkgKyAnbW91c2UnICsgJy0nICsgZXZlbnRfbmFtZSwgZSk7XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgd2hlbiBhIGtleWJvYXJkIGV2ZW50IG9jY3Vyc1xuICogQHBhcmFtICB7SFRNTEVsZW1lbnR9IGVsXG4gKiBAcGFyYW0gIHtFdmVudH0gZVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuTm9ybWFsaXplci5wcm90b3R5cGUuX2hhbmRsZV9rZXlib2FyZF9ldmVudCA9IGZ1bmN0aW9uKGVsLCBldmVudF9uYW1lLCBlKSB7XG4gICAgZSA9IGUgfHwgd2luZG93LmV2ZW50O1xuICAgIHZhciBrZXluYW1lID0gdGhpcy5fbG9va3VwX2tleWNvZGUoZS5rZXlDb2RlKTtcbiAgICBpZiAoa2V5bmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMudHJpZ2dlcih0aGlzLl9tb2RpZmllcl9zdHJpbmcoZSkgKyBrZXluYW1lICsgJy0nICsgZXZlbnRfbmFtZSwgZSk7XG5cbiAgICAgICAgaWYgKGV2ZW50X25hbWU9PSdkb3duJykgeyAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy50cmlnZ2VyKHRoaXMuX21vZGlmaWVyX3N0cmluZyhlKSArIGtleW5hbWUsIGUpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHRoaXMudHJpZ2dlcih0aGlzLl9tb2RpZmllcl9zdHJpbmcoZSkgKyBTdHJpbmcoZS5rZXlDb2RlKSArICctJyArIGV2ZW50X25hbWUsIGUpO1xuICAgIHRoaXMudHJpZ2dlcigna2V5JyArIGV2ZW50X25hbWUsIGUpO1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIHdoZW4gYSBrZXlwcmVzcyBldmVudCBvY2N1cnNcbiAqIEBwYXJhbSAge0hUTUxFbGVtZW50fSBlbFxuICogQHBhcmFtICB7RXZlbnR9IGVcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbk5vcm1hbGl6ZXIucHJvdG90eXBlLl9oYW5kbGVfa2V5cHJlc3NfZXZlbnQgPSBmdW5jdGlvbihlbCwgZXZlbnRfbmFtZSwgZSkge1xuICAgIHRoaXMudHJpZ2dlcigna2V5cHJlc3MnLCBlKTtcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBlbGVtZW50IGV2ZW50IHByb3h5LlxuICogQHBhcmFtICB7ZnVuY3Rpb259IGZcbiAqIEBwYXJhbSAge3N0cmluZ30gZXZlbnRfbmFtZVxuICogQHBhcmFtICB7SFRNTEVsZW1lbnR9IGVsXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Ob3JtYWxpemVyLnByb3RvdHlwZS5fcHJveHkgPSBmdW5jdGlvbihldmVudF9uYW1lLCBmLCBlbCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBhcmdzID0gW2VsLCBldmVudF9uYW1lXS5jb25jYXQoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKSk7XG4gICAgICAgIHJldHVybiBmLmFwcGx5KHRoYXQsIGFyZ3MpO1xuICAgIH07XG59O1xuXG4vKipcbiAqIENyZWF0ZSBhIG1vZGlmaWVycyBzdHJpbmcgZnJvbSBhbiBldmVudC5cbiAqIEBwYXJhbSAge0V2ZW50fSBlXG4gKiBAcmV0dXJuIHtzdHJpbmd9IGRhc2ggc2VwYXJhdGVkIG1vZGlmaWVyIHN0cmluZ1xuICovXG5Ob3JtYWxpemVyLnByb3RvdHlwZS5fbW9kaWZpZXJfc3RyaW5nID0gZnVuY3Rpb24oZSkge1xuICAgIHZhciBtb2RpZmllcnMgPSBbXTtcbiAgICBpZiAoZS5jdHJsS2V5KSBtb2RpZmllcnMucHVzaCgnY3RybCcpO1xuICAgIGlmIChlLmFsdEtleSkgbW9kaWZpZXJzLnB1c2goJ2FsdCcpO1xuICAgIGlmIChlLm1ldGFLZXkpIG1vZGlmaWVycy5wdXNoKCdtZXRhJyk7XG4gICAgaWYgKGUuc2hpZnRLZXkpIG1vZGlmaWVycy5wdXNoKCdzaGlmdCcpO1xuICAgIHZhciBzdHJpbmcgPSBtb2RpZmllcnMuc29ydCgpLmpvaW4oJy0nKTtcbiAgICBpZiAoc3RyaW5nLmxlbmd0aCA+IDApIHN0cmluZyA9IHN0cmluZyArICctJztcbiAgICByZXR1cm4gc3RyaW5nO1xufTtcblxuLyoqXG4gKiBMb29rdXAgdGhlIGh1bWFuIGZyaWVuZGx5IG5hbWUgZm9yIGEga2V5Y29kZS5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IGtleWNvZGVcbiAqIEByZXR1cm4ge3N0cmluZ30ga2V5IG5hbWVcbiAqL1xuTm9ybWFsaXplci5wcm90b3R5cGUuX2xvb2t1cF9rZXljb2RlID0gZnVuY3Rpb24oa2V5Y29kZSkge1xuICAgIGlmICgxMTIgPD0ga2V5Y29kZSAmJiBrZXljb2RlIDw9IDEyMykgeyAvLyBGMS1GMTJcbiAgICAgICAgcmV0dXJuICdmJyArIChrZXljb2RlLTExMSk7XG4gICAgfSBlbHNlIGlmICg0OCA8PSBrZXljb2RlICYmIGtleWNvZGUgPD0gNTcpIHsgLy8gMC05XG4gICAgICAgIHJldHVybiBTdHJpbmcoa2V5Y29kZS00OCk7XG4gICAgfSBlbHNlIGlmICg2NSA8PSBrZXljb2RlICYmIGtleWNvZGUgPD0gOTApIHsgLy8gQS1aXG4gICAgICAgIHJldHVybiAnYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXonLnN1YnN0cmluZyhTdHJpbmcoa2V5Y29kZS02NSksIFN0cmluZyhrZXljb2RlLTY0KSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGNvZGVzID0ge1xuICAgICAgICAgICAgODogJ2JhY2tzcGFjZScsXG4gICAgICAgICAgICA5OiAndGFiJyxcbiAgICAgICAgICAgIDEzOiAnZW50ZXInLFxuICAgICAgICAgICAgMTY6ICdzaGlmdCcsXG4gICAgICAgICAgICAxNzogJ2N0cmwnLFxuICAgICAgICAgICAgMTg6ICdhbHQnLFxuICAgICAgICAgICAgMTk6ICdwYXVzZScsXG4gICAgICAgICAgICAyMDogJ2NhcHNsb2NrJyxcbiAgICAgICAgICAgIDI3OiAnZXNjJyxcbiAgICAgICAgICAgIDMyOiAnc3BhY2UnLFxuICAgICAgICAgICAgMzM6ICdwYWdldXAnLFxuICAgICAgICAgICAgMzQ6ICdwYWdlZG93bicsXG4gICAgICAgICAgICAzNTogJ2VuZCcsXG4gICAgICAgICAgICAzNjogJ2hvbWUnLFxuICAgICAgICAgICAgMzc6ICdsZWZ0JyxcbiAgICAgICAgICAgIDM4OiAndXAnLFxuICAgICAgICAgICAgMzk6ICdyaWdodCcsXG4gICAgICAgICAgICA0MDogJ2Rvd24nLFxuICAgICAgICAgICAgNDQ6ICdwcmludHNjcmVlbicsXG4gICAgICAgICAgICA0NTogJ2luc2VydCcsXG4gICAgICAgICAgICA0NjogJ2RlbGV0ZScsXG4gICAgICAgICAgICA5MTogJ3dpbmRvd3MnLFxuICAgICAgICAgICAgOTM6ICdtZW51JyxcbiAgICAgICAgICAgIDE0NDogJ251bWxvY2snLFxuICAgICAgICAgICAgMTQ1OiAnc2Nyb2xsbG9jaycsXG4gICAgICAgICAgICAxODg6ICdjb21tYScsXG4gICAgICAgICAgICAxOTA6ICdwZXJpb2QnLFxuICAgICAgICAgICAgMTkxOiAnZm93YXJkc2xhc2gnLFxuICAgICAgICAgICAgMTkyOiAndGlsZGUnLFxuICAgICAgICAgICAgMjE5OiAnbGVmdGJyYWNrZXQnLFxuICAgICAgICAgICAgMjIwOiAnYmFja3NsYXNoJyxcbiAgICAgICAgICAgIDIyMTogJ3JpZ2h0YnJhY2tldCcsXG4gICAgICAgICAgICAyMjI6ICdxdW90ZScsXG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBjb2Rlc1trZXljb2RlXTtcbiAgICB9IFxuICAgIC8vIFRPRE86IHRoaXMgZnVuY3Rpb24gaXMgbWlzc2luZyBzb21lIGJyb3dzZXIgc3BlY2lmaWNcbiAgICAvLyBrZXljb2RlIG1hcHBpbmdzLlxufTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5Ob3JtYWxpemVyID0gTm9ybWFsaXplcjtcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzLmpzJyk7XG5cbi8qKlxuICogTGlzdGVucyB0byBhIG1vZGVsIGFuZCBoaWdsaWdodHMgdGhlIHRleHQgYWNjb3JkaW5nbHkuXG4gKiBAcGFyYW0ge0RvY3VtZW50TW9kZWx9IG1vZGVsXG4gKi9cbnZhciBIaWdobGlnaHRlckJhc2UgPSBmdW5jdGlvbihtb2RlbCkge1xuICAgIHV0aWxzLlBvc3RlckNsYXNzLmNhbGwodGhpcyk7XG4gICAgdGhpcy5fbW9kZWwgPSBtb2RlbDtcbiAgICB0aGlzLl9xdWV1ZWQgPSBudWxsO1xuICAgIHRoaXMuZGVsYXkgPSAxMDA7IC8vbXNcblxuICAgIC8vIEJpbmQgZXZlbnRzLlxuICAgIHRoaXMuX21vZGVsLm9uKCd0ZXh0X2NoYW5nZWQnLCB1dGlscy5wcm94eSh0aGlzLl9xdWV1ZV9oaWdobGlnaHRlciwgdGhpcykpO1xuICAgIHRoaXMuX21vZGVsLm9uKCdyb3dfY2hhbmdlZCcsIHV0aWxzLnByb3h5KHRoaXMuX3F1ZXVlX2hpZ2hsaWdodGVyLCB0aGlzKSk7XG59O1xudXRpbHMuaW5oZXJpdChIaWdobGlnaHRlckJhc2UsIHV0aWxzLlBvc3RlckNsYXNzKTtcblxuLyoqXG4gKiBIaWdobGlnaHQgdGhlIGRvY3VtZW50XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5IaWdobGlnaHRlckJhc2UucHJvdG90eXBlLmhpZ2hsaWdodCA9IGZ1bmN0aW9uKCkge1xuICAgIHRocm93IG5ldyBFcnJvcignTm90IGltcGxlbWVudGVkJyk7XG59O1xuXG4vKipcbiAqIFF1ZXVlcyBhIGhpZ2hsaWdodCBvcGVyYXRpb24uXG4gKlxuICogSWYgYSBoaWdobGlnaHQgb3BlcmF0aW9uIGlzIGFscmVhZHkgcXVldWVkLCBkb24ndCBxdWV1ZVxuICogYW5vdGhlciBvbmUuICBUaGlzIGVuc3VyZXMgdGhhdCB0aGUgaGlnaGxpZ2h0aW5nIGlzXG4gKiBmcmFtZSByYXRlIGxvY2tlZC4gIEhpZ2hsaWdodGluZyBpcyBhbiBleHBlbnNpdmUgb3BlcmF0aW9uLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuSGlnaGxpZ2h0ZXJCYXNlLnByb3RvdHlwZS5fcXVldWVfaGlnaGxpZ2h0ZXIgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5fcXVldWVkID09PSBudWxsKSB7XG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgdGhpcy5fcXVldWVkID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHRoYXQuX21vZGVsLmFjcXVpcmVfdGFnX2V2ZW50X2xvY2soKTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgdGhhdC5oaWdobGlnaHQoKTtcbiAgICAgICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICAgICAgdGhhdC5fbW9kZWwucmVsZWFzZV90YWdfZXZlbnRfbG9jaygpO1xuICAgICAgICAgICAgICAgIHRoYXQuX21vZGVsLnRyaWdnZXJfdGFnX2V2ZW50cygpO1xuICAgICAgICAgICAgICAgIHRoYXQuX3F1ZXVlZCA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRoaXMuZGVsYXkpO1xuICAgIH1cbn07XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuSGlnaGxpZ2h0ZXJCYXNlID0gSGlnaGxpZ2h0ZXJCYXNlO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMuanMnKTtcbnZhciBoaWdobGlnaHRlciA9IHJlcXVpcmUoJy4vaGlnaGxpZ2h0ZXIuanMnKTtcblxuLyoqXG4gKiBMaXN0ZW5zIHRvIGEgbW9kZWwgYW5kIGhpZ2xpZ2h0cyB0aGUgdGV4dCBhY2NvcmRpbmdseS5cbiAqIEBwYXJhbSB7RG9jdW1lbnRNb2RlbH0gbW9kZWxcbiAqL1xudmFyIFRlc3RIaWdobGlnaHRlciA9IGZ1bmN0aW9uKG1vZGVsKSB7XG4gICAgaGlnaGxpZ2h0ZXIuSGlnaGxpZ2h0ZXJCYXNlLmNhbGwodGhpcywgbW9kZWwpO1xufTtcbnV0aWxzLmluaGVyaXQoVGVzdEhpZ2hsaWdodGVyLCBoaWdobGlnaHRlci5IaWdobGlnaHRlckJhc2UpO1xuXG4vKipcbiAqIEhpZ2hsaWdodCB0aGUgZG9jdW1lbnRcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblRlc3RIaWdobGlnaHRlci5wcm90b3R5cGUuaGlnaGxpZ2h0ID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gVEVTVCBIaWdobGlnaHRpbmdcbiAgICB0aGlzLl9tb2RlbC5jbGVhcl90YWdzKCk7XG4gICAgZm9yICh2YXIgcm93X2luZGV4PTA7IHJvd19pbmRleDx0aGlzLl9tb2RlbC5fcm93cy5sZW5ndGg7IHJvd19pbmRleCsrKSB7XG4gICAgICAgIC8vIEhpZ2hsaWdodCBhbGwgRVMuXG4gICAgICAgIHZhciByb3cgPSB0aGlzLl9tb2RlbC5fcm93c1tyb3dfaW5kZXhdO1xuICAgICAgICB2YXIgaW5kZXggPSByb3cuaW5kZXhPZignZXMnKTtcbiAgICAgICAgd2hpbGUgKGluZGV4ICE9IC0xKSB7XG4gICAgICAgICAgICB0aGlzLl9tb2RlbC5zZXRfdGFnKHJvd19pbmRleCwgaW5kZXgsIHJvd19pbmRleCwgaW5kZXgrMSwgJ3N5bnRheCcsICdrZXl3b3JkJyk7XG4gICAgICAgICAgICBpbmRleCA9IHJvdy5pbmRleE9mKCdlcycsIGluZGV4KzEpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5UZXN0SGlnaGxpZ2h0ZXIgPSBUZXN0SGlnaGxpZ2h0ZXI7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy5qcycpO1xudmFyIHJlbmRlcmVyID0gcmVxdWlyZSgnLi9yZW5kZXJlci5qcycpO1xuXG4vKipcbiAqIEdyb3VwcyBtdWx0aXBsZSByZW5kZXJlcnNcbiAqIEBwYXJhbSB7YXJyYXl9IHJlbmRlcmVycyAtIGFycmF5IG9mIHJlbmRlcmVyc1xuICogQHBhcmFtIHtDYW52YXN9IGNhbnZhc1xuICovXG52YXIgQmF0Y2hSZW5kZXJlciA9IGZ1bmN0aW9uKHJlbmRlcmVycywgY2FudmFzKSB7XG4gICAgcmVuZGVyZXIuUmVuZGVyZXJCYXNlLmNhbGwodGhpcywgY2FudmFzKTtcbiAgICB0aGlzLl9yZW5kZXJlcnMgPSByZW5kZXJlcnM7XG5cbiAgICAvLyBMaXN0ZW4gdG8gdGhlIGxheWVycywgaWYgb25lIGxheWVyIGNoYW5nZXMsIHJlY29tcG9zZVxuICAgIC8vIHRoZSBmdWxsIGltYWdlIGJ5IGNvcHlpbmcgdGhlbSBhbGwgYWdhaW4uXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMuX3JlbmRlcmVycy5mb3JFYWNoKGZ1bmN0aW9uKHJlbmRlcmVyKSB7XG4gICAgICAgIHJlbmRlcmVyLm9uKCdjaGFuZ2VkJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0aGF0Ll9jb3B5X3JlbmRlcmVycygpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICBcbiAgICAvLyBDcmVhdGUgcHJvcGVydGllcy5cbiAgICB0aGlzLnByb3BlcnR5KCd3aWR0aCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC5fY2FudmFzLndpZHRoO1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQuX2NhbnZhcy53aWR0aCA9IHZhbHVlO1xuICAgICAgICB0aGF0Ll9yZW5kZXJlcnMuZm9yRWFjaChmdW5jdGlvbihyZW5kZXJlcikge1xuICAgICAgICAgICAgcmVuZGVyZXIud2lkdGggPSB2YWx1ZTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgdGhpcy5wcm9wZXJ0eSgnaGVpZ2h0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Ll9jYW52YXMuaGVpZ2h0O1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQuX2NhbnZhcy5oZWlnaHQgPSB2YWx1ZTtcbiAgICAgICAgdGhhdC5fcmVuZGVyZXJzLmZvckVhY2goZnVuY3Rpb24ocmVuZGVyZXIpIHtcbiAgICAgICAgICAgIHJlbmRlcmVyLmhlaWdodCA9IHZhbHVlO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn07XG51dGlscy5pbmhlcml0KEJhdGNoUmVuZGVyZXIsIHJlbmRlcmVyLlJlbmRlcmVyQmFzZSk7XG5cbi8qKlxuICogUmVuZGVyIHRvIHRoZSBjYW52YXNcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkJhdGNoUmVuZGVyZXIucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLl9yZW5kZXJlcnMuZm9yRWFjaChmdW5jdGlvbihyZW5kZXJlcikge1xuXG4gICAgICAgIC8vIEFwcGx5IHRoZSByZW5kZXJpbmcgY29vcmRpbmF0ZSB0cmFuc2Zvcm1zIG9mIHRoZSBwYXJlbnQuXG4gICAgICAgIHJlbmRlcmVyLl9jYW52YXMuX3R4ID0gdXRpbHMucHJveHkodGhhdC5fY2FudmFzLl90eCwgdGhhdC5fY2FudmFzKTtcbiAgICAgICAgcmVuZGVyZXIuX2NhbnZhcy5fdHkgPSB1dGlscy5wcm94eSh0aGF0Ll9jYW52YXMuX3R5LCB0aGF0Ll9jYW52YXMpO1xuXG4gICAgICAgIC8vIFRlbGwgdGhlIHJlbmRlcmVyIHRvIHJlbmRlciBpdHNlbGYuXG4gICAgICAgIHJlbmRlcmVyLnJlbmRlcigpO1xuICAgIH0pO1xuXG4gICAgLy8gQ29weSB0aGUgcmVzdWx0cyB0byBzZWxmLlxuICAgIHRoaXMuX2NvcHlfcmVuZGVyZXJzKCk7XG59O1xuXG4vKipcbiAqIENvcGllcyBhbGwgdGhlIHJlbmRlcmVyIGxheWVycyB0byB0aGUgY2FudmFzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQmF0Y2hSZW5kZXJlci5wcm90b3R5cGUuX2NvcHlfcmVuZGVyZXJzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMuX2NhbnZhcy5jbGVhcigpO1xuICAgIHRoaXMuX3JlbmRlcmVycy5mb3JFYWNoKGZ1bmN0aW9uKHJlbmRlcmVyKSB7XG4gICAgICAgIHRoYXQuX2NvcHlfcmVuZGVyZXIocmVuZGVyZXIpO1xuICAgIH0pO1xufTtcblxuLyoqXG4gKiBDb3B5IGEgcmVuZGVyZXIgdG8gdGhlIGNhbnZhcy5cbiAqIEBwYXJhbSAge1JlbmRlcmVyQmFzZX0gcmVuZGVyZXJcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkJhdGNoUmVuZGVyZXIucHJvdG90eXBlLl9jb3B5X3JlbmRlcmVyID0gZnVuY3Rpb24ocmVuZGVyZXIpIHtcbiAgICB0aGlzLl9jYW52YXMuZHJhd19pbWFnZShcbiAgICAgICAgcmVuZGVyZXIuX2NhbnZhcy5fY2FudmFzLCBcbiAgICAgICAgLXRoaXMuX2NhbnZhcy5fdHgoMCksIFxuICAgICAgICAtdGhpcy5fY2FudmFzLl90eSgwKSwgXG4gICAgICAgIHRoaXMuX2NhbnZhcy53aWR0aCwgXG4gICAgICAgIHRoaXMuX2NhbnZhcy5oZWlnaHQpO1xufTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5CYXRjaFJlbmRlcmVyID0gQmF0Y2hSZW5kZXJlcjtcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbnZhciBhbmltYXRvciA9IHJlcXVpcmUoJy4uL2FuaW1hdG9yLmpzJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy5qcycpO1xudmFyIHJlbmRlcmVyID0gcmVxdWlyZSgnLi9yZW5kZXJlci5qcycpO1xuXG4vKipcbiAqIFJlbmRlciBkb2N1bWVudCBjdXJzb3JzXG4gKi9cbnZhciBDdXJzb3JzUmVuZGVyZXIgPSBmdW5jdGlvbihjdXJzb3JzLCBzdHlsZSwgZ2V0X3Jvd19oZWlnaHQsIGdldF9yb3dfdG9wLCBtZWFzdXJlX3BhcnRpYWxfcm93LCBoYXNfZm9jdXMpIHtcbiAgICByZW5kZXJlci5SZW5kZXJlckJhc2UuY2FsbCh0aGlzKTtcbiAgICB0aGlzLnN0eWxlID0gc3R5bGU7XG4gICAgdGhpcy5faGFzX2ZvY3VzID0gaGFzX2ZvY3VzO1xuICAgIHRoaXMuX2N1cnNvcnMgPSBjdXJzb3JzO1xuICAgIHRoaXMuX2dldF9yb3dfaGVpZ2h0ID0gZ2V0X3Jvd19oZWlnaHQ7XG4gICAgdGhpcy5fZ2V0X3Jvd190b3AgPSBnZXRfcm93X3RvcDtcbiAgICB0aGlzLl9tZWFzdXJlX3BhcnRpYWxfcm93ID0gbWVhc3VyZV9wYXJ0aWFsX3JvdztcbiAgICB0aGlzLl9ibGlua19hbmltYXRvciA9IG5ldyBhbmltYXRvci5BbmltYXRvcigxMDAwKTtcbiAgICB0aGlzLl9mcHMgPSAxMDA7XG5cbiAgICAvLyBTdGFydCB0aGUgY3Vyc29yIHJlbmRlcmluZyBjbG9jay5cbiAgICB0aGlzLl9yZW5kZXJfY2xvY2soKTtcbn07XG51dGlscy5pbmhlcml0KEN1cnNvcnNSZW5kZXJlciwgcmVuZGVyZXIuUmVuZGVyZXJCYXNlKTtcblxuLyoqXG4gKiBSZW5kZXIgdG8gdGhlIGNhbnZhc1xuICogTm90ZTogVGhpcyBtZXRob2QgaXMgY2FsbGVkIG9mdGVuLCBzbyBpdCdzIGltcG9ydGFudCB0aGF0IGl0J3NcbiAqIG9wdGltaXplZCBmb3Igc3BlZWQuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3JzUmVuZGVyZXIucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2NhbnZhcy5jbGVhcigpO1xuXG4gICAgLy8gT25seSByZW5kZXIgaWYgdGhlIGNhbnZhcyBoYXMgZm9jdXMuXG4gICAgaWYgKHRoaXMuX2hhc19mb2N1cygpKSB7XG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgdGhpcy5fY3Vyc29ycy5jdXJzb3JzLmZvckVhY2goZnVuY3Rpb24oY3Vyc29yKSB7XG5cbiAgICAgICAgICAgIC8vIElmIGEgY3Vyc29yIGRvZXNuJ3QgaGF2ZSBhIHBvc2l0aW9uLCByZW5kZXIgaXQgYXQgdGhlXG4gICAgICAgICAgICAvLyBiZWdpbm5pbmcgb2YgdGhlIGRvY3VtZW50LlxuICAgICAgICAgICAgdmFyIHJvd19pbmRleCA9IGN1cnNvci5fc3RhcnRfcm93IHx8IDA7XG4gICAgICAgICAgICB2YXIgY2hhcl9pbmRleCA9IGN1cnNvci5fc3RhcnRfY2hhciB8fCAwO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBEcmF3IHRoZSBjdXJzb3IuXG4gICAgICAgICAgICB0aGF0Ll9jYW52YXMuZHJhd19yZWN0YW5nbGUoXG4gICAgICAgICAgICAgICAgY2hhcl9pbmRleCA9PT0gMCA/IDAgOiB0aGF0Ll9tZWFzdXJlX3BhcnRpYWxfcm93KHJvd19pbmRleCwgY2hhcl9pbmRleCksIFxuICAgICAgICAgICAgICAgIHRoYXQuX2dldF9yb3dfdG9wKHJvd19pbmRleCksIFxuICAgICAgICAgICAgICAgIDEsIFxuICAgICAgICAgICAgICAgIHRoYXQuX2dldF9yb3dfaGVpZ2h0KHJvd19pbmRleCksIFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZmlsbF9jb2xvcjogJ3JlZCcsXG4gICAgICAgICAgICAgICAgICAgIGFscGhhOiBNYXRoLm1heCgwLCBNYXRoLnNpbihNYXRoLlBJICogdGhhdC5fYmxpbmtfYW5pbWF0b3IudGltZSgpKSksXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgLy8gRHJhdyB0aGUgc2VsZWN0aW9uIGJveC5cbiAgICAgICAgICAgIGlmIChjdXJzb3IuX2VuZF9yb3cgIT09IG51bGwgJiYgY3Vyc29yLl9lbmRfY2hhciAhPT0gbnVsbCAmJlxuICAgICAgICAgICAgICAgIGN1cnNvci5fZW5kX3JvdyAhPSByb3dfaW5kZXggJiYgY3Vyc29yLl9lbmRfY2hhciAhPSBjaGFyX2luZGV4KSB7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IHJvd19pbmRleDsgaSA8PSBjdXJzb3IuX2VuZF9yb3c7IGkrKykge1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBsZWZ0ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGkgPT0gcm93X2luZGV4ICYmIGNoYXJfaW5kZXggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZWZ0ID0gdGhhdC5fbWVhc3VyZV9wYXJ0aWFsX3JvdyhpLCBjaGFyX2luZGV4KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHRoYXQuX2NhbnZhcy5kcmF3X3JlY3RhbmdsZShcbiAgICAgICAgICAgICAgICAgICAgICAgIGxlZnQsIFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5fZ2V0X3Jvd190b3AoaSksIFxuICAgICAgICAgICAgICAgICAgICAgICAgaSAhPT0gY3Vyc29yLl9lbmRfcm93ID8gdGhhdC5fbWVhc3VyZV9wYXJ0aWFsX3JvdyhpKSAtIGxlZnQgOiB0aGF0Ll9tZWFzdXJlX3BhcnRpYWxfcm93KGksIGN1cnNvci5fZW5kX2NoYXIpIC0gbGVmdCwgXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0Ll9nZXRfcm93X2hlaWdodChpKSwgXG4gICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsbF9jb2xvcjogJ3NreWJsdWUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFscGhhOiAwLjUsXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG5cbi8qKlxuICogQ2xvY2sgZm9yIHJlbmRlcmluZyB0aGUgY3Vyc29yLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29yc1JlbmRlcmVyLnByb3RvdHlwZS5fcmVuZGVyX2Nsb2NrID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gSWYgdGhlIGNhbnZhcyBpcyBmb2N1c2VkLCByZWRyYXcuXG4gICAgaWYgKHRoaXMuX2hhc19mb2N1cygpKSB7XG4gICAgICAgIHRoaXMuX3dhc19mb2N1c2VkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgLy8gVGVsbCBwYXJlbnQgbGF5ZXIgdGhpcyBvbmUgaGFzIGNoYW5nZWQuXG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpO1xuXG4gICAgLy8gVGhlIGNhbnZhcyBpc24ndCBmb2N1c2VkLiAgSWYgdGhpcyBpcyB0aGUgZmlyc3QgdGltZVxuICAgIC8vIGl0IGhhc24ndCBiZWVuIGZvY3VzZWQsIHJlbmRlciBhZ2FpbiB3aXRob3V0IHRoZSBcbiAgICAvLyBjdXJzb3JzLlxuICAgIH0gZWxzZSBpZiAodGhpcy5fd2FzX2ZvY3VzZWQpIHtcbiAgICAgICAgdGhpcy5fd2FzX2ZvY3VzZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgLy8gVGVsbCBwYXJlbnQgbGF5ZXIgdGhpcyBvbmUgaGFzIGNoYW5nZWQuXG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpO1xuICAgIH1cblxuICAgIC8vIDEwMCBGUFNcbiAgICBzZXRUaW1lb3V0KHV0aWxzLnByb3h5KHRoaXMuX3JlbmRlcl9jbG9jaywgdGhpcyksIDEwMDAgLyB0aGlzLl9mcHMpOyBcbn07XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuQ3Vyc29yc1JlbmRlcmVyID0gQ3Vyc29yc1JlbmRlcmVyO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMuanMnKTtcbnZhciByb3cgPSByZXF1aXJlKCcuL3Jvdy5qcycpO1xuXG4vKipcbiAqIFJlbmRlciB0aGUgdGV4dCByb3dzIG9mIGEgRG9jdW1lbnRNb2RlbC5cbiAqIEBwYXJhbSB7RG9jdW1lbnRNb2RlbH0gbW9kZWwgaW5zdGFuY2VcbiAqL1xudmFyIEhpZ2hsaWdodGVkUm93UmVuZGVyZXIgPSBmdW5jdGlvbihtb2RlbCwgc2Nyb2xsaW5nX2NhbnZhcywgc3R5bGUpIHtcbiAgICByb3cuUm93UmVuZGVyZXIuY2FsbCh0aGlzLCBtb2RlbCwgc2Nyb2xsaW5nX2NhbnZhcyk7XG4gICAgdGhpcy5zdHlsZSA9IHN0eWxlO1xufTtcbnV0aWxzLmluaGVyaXQoSGlnaGxpZ2h0ZWRSb3dSZW5kZXJlciwgcm93LlJvd1JlbmRlcmVyKTtcblxuLyoqXG4gKiBSZW5kZXIgYSBzaW5nbGUgcm93XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBpbmRleFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuSGlnaGxpZ2h0ZWRSb3dSZW5kZXJlci5wcm90b3R5cGUuX3JlbmRlcl9yb3cgPSBmdW5jdGlvbihpbmRleCkge1xuICAgIHZhciBncm91cHMgPSB0aGlzLl9nZXRfZ3JvdXBzKGluZGV4KTtcbiAgICB2YXIgbGVmdCA9IDA7XG4gICAgZm9yICh2YXIgaT0wOyBpPGdyb3Vwcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB0aGlzLl9jYW52YXMuZHJhd190ZXh0KGxlZnQsIHRoaXMuZ2V0X3Jvd190b3AoaW5kZXgpLCBncm91cHNbaV0udGV4dCwgZ3JvdXBzW2ldLm9wdGlvbnMpO1xuICAgICAgICBsZWZ0ICs9IHRoaXMuX2NhbnZhcy5tZWFzdXJlX3RleHQoZ3JvdXBzW2ldLnRleHQsIGdyb3Vwc1tpXS5vcHRpb25zKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEdldCByZW5kZXIgZ3JvdXBzIGZvciBhIHJvdy5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IGluZGV4IG9mIHRoZSByb3dcbiAqIEByZXR1cm4ge2FycmF5fSBhcnJheSBvZiByZW5kZXJpbmdzLCBlYWNoIHJlbmRlcmluZyBpcyBhbiBhcnJheSBvZlxuICogICAgICAgICAgICAgICAgIHRoZSBmb3JtIHtvcHRpb25zLCB0ZXh0fS5cbiAqL1xuSGlnaGxpZ2h0ZWRSb3dSZW5kZXJlci5wcm90b3R5cGUuX2dldF9ncm91cHMgPSBmdW5jdGlvbihpbmRleCkge1xuICAgIHZhciByb3dfdGV4dCA9IHRoaXMuX21vZGVsLl9yb3dzW2luZGV4XTtcbiAgICB2YXIgZ3JvdXBzID0gW107XG4gICAgdmFyIGxhc3Rfc3ludGF4ID0gbnVsbDtcbiAgICB2YXIgY2hhcl9pbmRleCA9IDA7XG4gICAgdmFyIHN0YXJ0ID0gMDtcbiAgICBmb3IgKGNoYXJfaW5kZXg7IGNoYXJfaW5kZXg8cm93X3RleHQubGVuZ3RoOyBjaGFyX2luZGV4KyspIHtcbiAgICAgICAgdmFyIHN5bnRheCA9IHRoaXMuX21vZGVsLmdldF90YWdzKGluZGV4LCBjaGFyX2luZGV4KS5zeW50YXg7XG4gICAgICAgIGlmICghdGhpcy5fY29tcGFyZV9zeW50YXgobGFzdF9zeW50YXgsc3ludGF4KSkge1xuICAgICAgICAgICAgaWYgKGNoYXJfaW5kZXggIT09IDApIHtcbiAgICAgICAgICAgICAgICBncm91cHMucHVzaCh7b3B0aW9uczogdGhpcy5fZ2V0X29wdGlvbnMobGFzdF9zeW50YXgpLCB0ZXh0OiByb3dfdGV4dC5zdWJzdHJpbmcoc3RhcnQsIGNoYXJfaW5kZXgpfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsYXN0X3N5bnRheCA9IHN5bnRheDtcbiAgICAgICAgICAgIHN0YXJ0ID0gY2hhcl9pbmRleDtcbiAgICAgICAgfVxuICAgIH1cbiAgICBncm91cHMucHVzaCh7b3B0aW9uczogdGhpcy5fZ2V0X29wdGlvbnMobGFzdF9zeW50YXgpLCB0ZXh0OiByb3dfdGV4dC5zdWJzdHJpbmcoc3RhcnQpfSk7XG5cbiAgICByZXR1cm4gZ3JvdXBzO1xufTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgc3R5bGUgb3B0aW9ucyBkaWN0aW9uYXJ5IGZyb20gYSBzeW50YXggdGFnLlxuICogQHBhcmFtICB7c3RyaW5nfSBzeW50YXhcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkhpZ2hsaWdodGVkUm93UmVuZGVyZXIucHJvdG90eXBlLl9nZXRfb3B0aW9ucyA9IGZ1bmN0aW9uKHN5bnRheCkge1xuICAgIHZhciByZW5kZXJfb3B0aW9ucyA9IHV0aWxzLnNoYWxsb3dfY29weSh0aGlzLl9iYXNlX29wdGlvbnMpO1xuXG4gICAgaWYgKHN5bnRheCAmJiB0aGlzLnN0eWxlICYmIHRoaXMuc3R5bGVbc3ludGF4XSkge1xuICAgICAgICByZW5kZXJfb3B0aW9ucy5jb2xvciA9IHRoaXMuc3R5bGVbc3ludGF4XTtcbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIHJlbmRlcl9vcHRpb25zO1xufTtcblxuLyoqXG4gKiBDb21wYXJlIHR3byBzeW50YXhzLlxuICogQHBhcmFtICB7c3RyaW5nfSBhIC0gc3ludGF4XG4gKiBAcGFyYW0gIHtzdHJpbmd9IGIgLSBzeW50YXhcbiAqIEByZXR1cm4ge2Jvb2x9IHRydWUgaWYgYSBhbmQgYiBhcmUgZXF1YWxcbiAqL1xuSGlnaGxpZ2h0ZWRSb3dSZW5kZXJlci5wcm90b3R5cGUuX2NvbXBhcmVfc3ludGF4ID0gZnVuY3Rpb24oYSwgYikge1xuICAgIHJldHVybiBhID09PSBiO1xufTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5IaWdobGlnaHRlZFJvd1JlbmRlcmVyID0gSGlnaGxpZ2h0ZWRSb3dSZW5kZXJlcjtcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbnZhciBjYW52YXMgPSByZXF1aXJlKCcuLi9jYW52YXMuanMnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzLmpzJyk7XG5cbi8qKlxuICogUmVuZGVycyB0byBhIGNhbnZhc1xuICogQHBhcmFtIHtDYW52YXN9IGRlZmF1bHRfY2FudmFzXG4gKi9cbnZhciBSZW5kZXJlckJhc2UgPSBmdW5jdGlvbihkZWZhdWx0X2NhbnZhcykge1xuICAgIHV0aWxzLlBvc3RlckNsYXNzLmNhbGwodGhpcyk7XG4gICAgdGhpcy5fY2FudmFzID0gZGVmYXVsdF9jYW52YXMgPyBkZWZhdWx0X2NhbnZhcyA6IG5ldyBjYW52YXMuQ2FudmFzKCk7XG4gICAgXG4gICAgLy8gQ3JlYXRlIHByb3BlcnRpZXMuXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMucHJvcGVydHkoJ3dpZHRoJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Ll9jYW52YXMud2lkdGg7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC5fY2FudmFzLndpZHRoID0gdmFsdWU7XG4gICAgfSk7XG4gICAgdGhpcy5wcm9wZXJ0eSgnaGVpZ2h0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Ll9jYW52YXMuaGVpZ2h0O1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQuX2NhbnZhcy5oZWlnaHQgPSB2YWx1ZTtcbiAgICB9KTtcbiAgICAgICAgXG4gICAgLy8gU3RyZXRjaCB0aGUgaW1hZ2UgZm9yIHJldGluYSBzdXBwb3J0LlxuICAgIHRoaXMuX2NhbnZhcy5zY2FsZSgyLDIpO1xufTtcbnV0aWxzLmluaGVyaXQoUmVuZGVyZXJCYXNlLCB1dGlscy5Qb3N0ZXJDbGFzcyk7XG5cbi8qKlxuICogUmVuZGVyIHRvIHRoZSBjYW52YXNcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblJlbmRlcmVyQmFzZS5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24oKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdOb3QgaW1wbGVtZW50ZWQnKTtcbn07XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuUmVuZGVyZXJCYXNlID0gUmVuZGVyZXJCYXNlO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMuanMnKTtcbnZhciByZW5kZXJlciA9IHJlcXVpcmUoJy4vcmVuZGVyZXIuanMnKTtcblxuLyoqXG4gKiBSZW5kZXIgdGhlIHRleHQgcm93cyBvZiBhIERvY3VtZW50TW9kZWwuXG4gKiBAcGFyYW0ge0RvY3VtZW50TW9kZWx9IG1vZGVsIGluc3RhbmNlXG4gKi9cbnZhciBSb3dSZW5kZXJlciA9IGZ1bmN0aW9uKG1vZGVsLCBzY3JvbGxpbmdfY2FudmFzKSB7XG4gICAgdGhpcy5fc2Nyb2xsaW5nX2NhbnZhcyA9IHNjcm9sbGluZ19jYW52YXM7XG4gICAgcmVuZGVyZXIuUmVuZGVyZXJCYXNlLmNhbGwodGhpcyk7XG4gICAgdGhpcy5fbW9kZWwgPSBtb2RlbDtcblxuICAgIC8vIFNldCBzb21lIGJhc2ljIHJlbmRlcmluZyBwcm9wZXJ0aWVzLlxuICAgIHRoaXMuX2Jhc2Vfb3B0aW9ucyA9IHtcbiAgICAgICAgZm9udF9mYW1pbHk6ICdtb25vc3BhY2UnLFxuICAgICAgICBmb250X3NpemU6IDEyLFxuICAgIH07XG4gICAgdGhpcy5fbGluZV9zcGFjaW5nID0gMjtcblxuICAgIHRoaXMuX21vZGVsLm9uKCd0YWdzX2NoYW5nZWQnLCB1dGlscy5wcm94eSh0aGlzLl9oYW5kbGVfdmFsdWVfY2hhbmdlZCwgdGhpcykpO1xuICAgIHRoaXMuX21vZGVsLm9uKCd0ZXh0X2NoYW5nZWQnLCB1dGlscy5wcm94eSh0aGlzLl9oYW5kbGVfdmFsdWVfY2hhbmdlZCwgdGhpcykpO1xuICAgIHRoaXMuX21vZGVsLm9uKCdyb3dfY2hhbmdlZCcsIHV0aWxzLnByb3h5KHRoaXMuX2hhbmRsZV9yb3dfY2hhbmdlZCwgdGhpcykpOyAvLyBUT0RPOiBJbXBsZW1lbnQgbXkgZXZlbnQuXG59O1xudXRpbHMuaW5oZXJpdChSb3dSZW5kZXJlciwgcmVuZGVyZXIuUmVuZGVyZXJCYXNlKTtcblxuLyoqXG4gKiBSZW5kZXIgdG8gdGhlIGNhbnZhc1xuICogTm90ZTogVGhpcyBtZXRob2QgaXMgY2FsbGVkIG9mdGVuLCBzbyBpdCdzIGltcG9ydGFudCB0aGF0IGl0J3NcbiAqIG9wdGltaXplZCBmb3Igc3BlZWQuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fY2FudmFzLmNsZWFyKCk7XG5cbiAgICAvLyBGaW5kIHRoZSByb3cgY2xvc2VzdCB0byB0aGUgc2Nyb2xsIHRvcC4gIElmIHRoYXQgcm93IGlzIGJlbG93XG4gICAgLy8gdGhlIHNjcm9sbCB0b3AsIHVzZSB0aGUgcm93IGFib3ZlIGl0LlxuICAgIHZhciByb3dfaW5kZXggPSBNYXRoLmZsb29yKHRoaXMuX3Njcm9sbGluZ19jYW52YXMuc2Nyb2xsX3RvcCAgLyB0aGlzLmdldF9yb3dfaGVpZ2h0KCkpO1xuXG4gICAgLy8gUmVuZGVyIHRpbGwgdGhlcmUgYXJlIG5vIHJvd3MgbGVmdCwgb3IgdGhlIHRvcCBvZiB0aGUgcm93IGlzXG4gICAgLy8gYmVsb3cgdGhlIGJvdHRvbSBvZiB0aGUgdmlzaWJsZSBhcmVhLlxuICAgIGZvciAodmFyIGkgPSByb3dfaW5kZXg7IFxuICAgICAgICBpIDwgTWF0aC5taW4ocm93X2luZGV4ICsgTWF0aC5jZWlsKHRoaXMuX3Njcm9sbGluZ19jYW52YXMuaGVpZ2h0IC8gdGhpcy5nZXRfcm93X2hlaWdodCgpKSwgdGhpcy5fbW9kZWwuX3Jvd3MubGVuZ3RoKTsgXG4gICAgICAgIGkrKykgeyAgICAgICAgXG5cbiAgICAgICAgdGhpcy5fcmVuZGVyX3JvdyhpKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEdldHMgdGhlIHJvdyBhbmQgY2hhcmFjdGVyIGluZGljaWVzIGNsb3Nlc3QgdG8gZ2l2ZW4gY29udHJvbCBzcGFjZSBjb29yZGluYXRlcy5cbiAqIEBwYXJhbSAge2Zsb2F0fSBjdXJzb3JfeCAtIHggdmFsdWUsIDAgaXMgdGhlIGxlZnQgb2YgdGhlIGNhbnZhcy5cbiAqIEBwYXJhbSAge2Zsb2F0fSBjdXJzb3JfeSAtIHkgdmFsdWUsIDAgaXMgdGhlIHRvcCBvZiB0aGUgY2FudmFzLlxuICogQHJldHVybiB7ZGljdGlvbmFyeX0gZGljdGlvbmFyeSBvZiB0aGUgZm9ybSB7cm93X2luZGV4LCBjaGFyX2luZGV4fVxuICovXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuZ2V0X3Jvd19jaGFyID0gZnVuY3Rpb24oY3Vyc29yX3gsIGN1cnNvcl95KSB7XG4gICAgdmFyIHJvd19pbmRleCA9IE1hdGguZmxvb3IoKGN1cnNvcl95ICsgdGhpcy5fc2Nyb2xsaW5nX2NhbnZhcy5zY3JvbGxfdG9wKSAvIHRoaXMuZ2V0X3Jvd19oZWlnaHQoKSk7XG5cbiAgICAvLyBGaW5kIHRoZSBjaGFyYWN0ZXIgaW5kZXguXG4gICAgdmFyIHdpZHRocyA9IFswXTtcbiAgICB0cnkge1xuICAgICAgICBmb3IgKHZhciBsZW5ndGg9MTsgbGVuZ3RoPD10aGlzLl9tb2RlbC5fcm93c1tyb3dfaW5kZXhdLmxlbmd0aDsgbGVuZ3RoKyspIHtcbiAgICAgICAgICAgIHdpZHRocy5wdXNoKHRoaXMubWVhc3VyZV9wYXJ0aWFsX3Jvd193aWR0aChyb3dfaW5kZXgsIGxlbmd0aCkpO1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvLyBOb20gbm9tIG5vbS4uLlxuICAgIH1cbiAgICByZXR1cm4ge3Jvd19pbmRleDogcm93X2luZGV4LCBjaGFyX2luZGV4OiB1dGlscy5maW5kX2Nsb3Nlc3Qod2lkdGhzLCBjdXJzb3JfeCArIHRoaXMuX3Njcm9sbGluZ19jYW52YXMuc2Nyb2xsX2xlZnQpfTtcbn07XG5cbi8qKlxuICogTWVhc3VyZXMgdGhlIHBhcnRpYWwgd2lkdGggb2YgYSB0ZXh0IHJvdy5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IGluZGV4XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSAob3B0aW9uYWwpIGxlbmd0aCAtIG51bWJlciBvZiBjaGFyYWN0ZXJzXG4gKiBAcmV0dXJuIHtmbG9hdH0gd2lkdGhcbiAqL1xuUm93UmVuZGVyZXIucHJvdG90eXBlLm1lYXN1cmVfcGFydGlhbF9yb3dfd2lkdGggPSBmdW5jdGlvbihpbmRleCwgbGVuZ3RoKSB7XG4gICAgaWYgKGluZGV4ID49IHRoaXMuX21vZGVsLl9yb3dzLmxlbmd0aCkgeyB0aHJvdyBuZXcgRXJyb3IoJ1JvdyBpbmRleCAnICsgaW5kZXggKyAnIGRvZXMgbm90IGV4aXN0Jyk7IH1cbiAgICB2YXIgdGV4dCA9IHRoaXMuX21vZGVsLl9yb3dzW2luZGV4XTtcbiAgICB0ZXh0ID0gbGVuZ3RoID09PSB1bmRlZmluZWQgPyB0ZXh0IDogdGV4dC5zdWJzdHJpbmcoMCwgbGVuZ3RoKTtcbiAgICByZXR1cm4gdGhpcy5fY2FudmFzLm1lYXN1cmVfdGV4dCh0ZXh0LCB0aGlzLl9iYXNlX29wdGlvbnMpO1xufTtcblxuLyoqXG4gKiBNZWFzdXJlcyB0aGUgaGVpZ2h0IG9mIGEgdGV4dCByb3cgYXMgaWYgaXQgd2VyZSByZW5kZXJlZC5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IGluZGV4XG4gKiBAcmV0dXJuIHtmbG9hdH0gaGVpZ2h0XG4gKi9cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5nZXRfcm93X2hlaWdodCA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgcmV0dXJuIHRoaXMuX2Jhc2Vfb3B0aW9ucy5mb250X3NpemUgKyB0aGlzLl9saW5lX3NwYWNpbmc7XG59O1xuXG4vKipcbiAqIEdldHMgdGhlIHRvcCBvZiB0aGUgcm93IHdoZW4gcmVuZGVyZWRcbiAqIEBwYXJhbSAge2ludGVnZXJ9IGluZGV4XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuZ2V0X3Jvd190b3AgPSBmdW5jdGlvbihpbmRleCkge1xuICAgIHJldHVybiBpbmRleCAqIHRoaXMuZ2V0X3Jvd19oZWlnaHQoaW5kZXgpO1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIHdoZW4gdGhlIG1vZGVsJ3MgdmFsdWUgY2hhbmdlc1xuICogQ29tcGxleGl0eTogTyhOKSBmb3IgTiByb3dzIG9mIHRleHQuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuX2hhbmRsZV92YWx1ZV9jaGFuZ2VkID0gZnVuY3Rpb24oKSB7XG5cbiAgICAvLyBDYWxjdWxhdGUgdGhlIGRvY3VtZW50IHdpZHRoLlxuICAgIHZhciBkb2N1bWVudF93aWR0aCA9IDA7XG4gICAgZm9yICh2YXIgaT0wOyBpPHRoaXMuX21vZGVsLl9yb3dzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGRvY3VtZW50X3dpZHRoID0gTWF0aC5tYXgodGhpcy5fbWVhc3VyZV9yb3dfd2lkdGgoaSksIGRvY3VtZW50X3dpZHRoKTtcbiAgICB9XG4gICAgdGhpcy5fc2Nyb2xsaW5nX2NhbnZhcy5zY3JvbGxfd2lkdGggPSBkb2N1bWVudF93aWR0aDtcbiAgICB0aGlzLl9zY3JvbGxpbmdfY2FudmFzLnNjcm9sbF9oZWlnaHQgPSB0aGlzLl9tb2RlbC5fcm93cy5sZW5ndGggKiB0aGlzLmdldF9yb3dfaGVpZ2h0KCk7XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgd2hlbiBvbmUgb2YgdGhlIG1vZGVsJ3Mgcm93cyBjaGFuZ2VcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5faGFuZGxlX3Jvd19jaGFuZ2VkID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICB0aGlzLl9zY3JvbGxpbmdfY2FudmFzLnNjcm9sbF93aWR0aCA9IE1hdGgubWF4KHRoaXMuX21lYXN1cmVfcm93X3dpZHRoKGluZGV4KSwgdGhpcy5fc2Nyb2xsaW5nX2NhbnZhcy5zY3JvbGxfd2lkdGgpO1xufTtcblxuLyoqXG4gKiBSZW5kZXIgYSBzaW5nbGUgcm93XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBpbmRleFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuUm93UmVuZGVyZXIucHJvdG90eXBlLl9yZW5kZXJfcm93ID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICB0aGlzLl9jYW52YXMuZHJhd190ZXh0KDAsIHRoaXMuX3Jvd190b3BzW2luZGV4XSwgdGhpcy5fbW9kZWwuX3Jvd3NbaW5kZXhdLCB0aGlzLl9iYXNlX29wdGlvbnMpO1xufTtcblxuLyoqXG4gKiBNZWFzdXJlcyB0aGUgd2lkdGggb2YgYSB0ZXh0IHJvdyBhcyBpZiBpdCB3ZXJlIHJlbmRlcmVkLlxuICogQHBhcmFtICB7aW50ZWdlcn0gaW5kZXhcbiAqIEByZXR1cm4ge2Zsb2F0fSB3aWR0aFxuICovXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuX21lYXN1cmVfcm93X3dpZHRoID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICByZXR1cm4gdGhpcy5tZWFzdXJlX3BhcnRpYWxfcm93X3dpZHRoKGluZGV4LCB0aGlzLl9tb2RlbC5fcm93c1tpbmRleF0ubGVuZ3RoKTtcbn07XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuUm93UmVuZGVyZXIgPSBSb3dSZW5kZXJlcjtcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG52YXIgY2FudmFzID0gcmVxdWlyZSgnLi9jYW52YXMuanMnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKTtcblxuLyoqXG4gKiBIVE1MIGNhbnZhcyB3aXRoIGRyYXdpbmcgY29udmluaWVuY2UgZnVuY3Rpb25zLlxuICovXG52YXIgU2Nyb2xsaW5nQ2FudmFzID0gZnVuY3Rpb24oKSB7XG4gICAgY2FudmFzLkNhbnZhcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMuX2JpbmRfZXZlbnRzKCk7XG5cbiAgICAvLyBTZXQgZGVmYXVsdCBzaXplLlxuICAgIHRoaXMud2lkdGggPSA0MDA7XG4gICAgdGhpcy5oZWlnaHQgPSAzMDA7XG59O1xudXRpbHMuaW5oZXJpdChTY3JvbGxpbmdDYW52YXMsIGNhbnZhcy5DYW52YXMpO1xuXG4vKipcbiAqIENhdXNlcyB0aGUgY2FudmFzIGNvbnRlbnRzIHRvIGJlIHJlZHJhd24uXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5TY3JvbGxpbmdDYW52YXMucHJvdG90eXBlLnJlZHJhdyA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuY2xlYXIoKTtcbiAgICB0aGlzLnRyaWdnZXIoJ3JlZHJhdycpO1xufTtcblxuLyoqXG4gKiBMYXlvdXQgdGhlIGVsZW1lbnRzIGZvciB0aGUgY2FudmFzLlxuICogQ3JlYXRlcyBgdGhpcy5lbGBcbiAqIFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuU2Nyb2xsaW5nQ2FudmFzLnByb3RvdHlwZS5fbGF5b3V0ID0gZnVuY3Rpb24oKSB7XG4gICAgY2FudmFzLkNhbnZhcy5wcm90b3R5cGUuX2xheW91dC5jYWxsKHRoaXMpO1xuICAgIC8vIENoYW5nZSB0aGUgY2FudmFzIGNsYXNzIHNvIGl0J3Mgbm90IGhpZGRlbi5cbiAgICB0aGlzLl9jYW52YXMuc2V0QXR0cmlidXRlKCdjbGFzcycsICdjYW52YXMnKTtcblxuICAgIHRoaXMuZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICB0aGlzLmVsLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAncG9zdGVyIHNjcm9sbC13aW5kb3cnKTtcbiAgICB0aGlzLmVsLnNldEF0dHJpYnV0ZSgndGFiaW5kZXgnLCAwKTtcbiAgICB0aGlzLl9zY3JvbGxfYmFycyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIHRoaXMuX3Njcm9sbF9iYXJzLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAnc2Nyb2xsLWJhcnMnKTtcbiAgICB0aGlzLl9kdW1teSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIHRoaXMuX2R1bW15LnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAnc2Nyb2xsLWR1bW15Jyk7XG5cbiAgICB0aGlzLmVsLmFwcGVuZENoaWxkKHRoaXMuX2NhbnZhcyk7XG4gICAgdGhpcy5lbC5hcHBlbmRDaGlsZCh0aGlzLl9zY3JvbGxfYmFycyk7XG4gICAgdGhpcy5fc2Nyb2xsX2JhcnMuYXBwZW5kQ2hpbGQodGhpcy5fZHVtbXkpO1xufTtcblxuLyoqXG4gKiBNYWtlIHRoZSBwcm9wZXJ0aWVzIG9mIHRoZSBjbGFzcy5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblNjcm9sbGluZ0NhbnZhcy5wcm90b3R5cGUuX2luaXRfcHJvcGVydGllcyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcblxuICAgIC8qKlxuICAgICAqIFdpZHRoIG9mIHRoZSBzY3JvbGxhYmxlIGNhbnZhcyBhcmVhXG4gICAgICovXG4gICAgdGhpcy5wcm9wZXJ0eSgnc2Nyb2xsX3dpZHRoJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIEdldFxuICAgICAgICByZXR1cm4gdGhhdC5fc2Nyb2xsX3dpZHRoIHx8IDA7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgLy8gU2V0XG4gICAgICAgIHRoYXQuX3Njcm9sbF93aWR0aCA9IHZhbHVlO1xuICAgICAgICB0aGF0Ll9tb3ZlX2R1bW15KHRoYXQuX3Njcm9sbF93aWR0aCwgdGhhdC5fc2Nyb2xsX2hlaWdodCB8fCAwKTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIEhlaWdodCBvZiB0aGUgc2Nyb2xsYWJsZSBjYW52YXMgYXJlYS5cbiAgICAgKi9cbiAgICB0aGlzLnByb3BlcnR5KCdzY3JvbGxfaGVpZ2h0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIEdldFxuICAgICAgICByZXR1cm4gdGhhdC5fc2Nyb2xsX2hlaWdodCB8fCAwO1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIC8vIFNldFxuICAgICAgICB0aGF0Ll9zY3JvbGxfaGVpZ2h0ID0gdmFsdWU7XG4gICAgICAgIHRoYXQuX21vdmVfZHVtbXkodGhhdC5fc2Nyb2xsX3dpZHRoIHx8IDAsIHRoYXQuX3Njcm9sbF9oZWlnaHQpO1xuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogVG9wIG1vc3QgcGl4ZWwgaW4gdGhlIHNjcm9sbGVkIHdpbmRvdy5cbiAgICAgKi9cbiAgICB0aGlzLnByb3BlcnR5KCdzY3JvbGxfdG9wJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIEdldFxuICAgICAgICByZXR1cm4gdGhhdC5fc2Nyb2xsX2JhcnMuc2Nyb2xsVG9wO1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIC8vIFNldFxuICAgICAgICB0aGF0Ll9zY3JvbGxfYmFycy5zY3JvbGxUb3AgPSB2YWx1ZTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIExlZnQgbW9zdCBwaXhlbCBpbiB0aGUgc2Nyb2xsZWQgd2luZG93LlxuICAgICAqL1xuICAgIHRoaXMucHJvcGVydHkoJ3Njcm9sbF9sZWZ0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIEdldFxuICAgICAgICByZXR1cm4gdGhhdC5fc2Nyb2xsX2JhcnMuc2Nyb2xsTGVmdDtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAvLyBTZXRcbiAgICAgICAgdGhhdC5fc2Nyb2xsX2JhcnMuc2Nyb2xsTGVmdCA9IHZhbHVlO1xuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogSGVpZ2h0IG9mIHRoZSBjYW52YXNcbiAgICAgKiBAcmV0dXJuIHtmbG9hdH1cbiAgICAgKi9cbiAgICB0aGlzLnByb3BlcnR5KCdoZWlnaHQnLCBmdW5jdGlvbigpIHsgXG4gICAgICAgIHJldHVybiB0aGF0Ll9jYW52YXMuaGVpZ2h0IC8gMjsgXG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC5fY2FudmFzLnNldEF0dHJpYnV0ZSgnaGVpZ2h0JywgdmFsdWUgKiAyKTtcbiAgICAgICAgdGhhdC5lbC5zZXRBdHRyaWJ1dGUoJ3N0eWxlJywgJ3dpZHRoOiAnICsgdGhhdC53aWR0aCArICc7IGhlaWdodDogJyArIHZhbHVlICsgJzsnKTtcblxuICAgICAgICB0aGF0LnRyaWdnZXIoJ3Jlc2l6ZScsIHtoZWlnaHQ6IHZhbHVlfSk7XG4gICAgICAgIHRoYXQuX3RyeV9yZWRyYXcoKTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIFdpZHRoIG9mIHRoZSBjYW52YXNcbiAgICAgKiBAcmV0dXJuIHtmbG9hdH1cbiAgICAgKi9cbiAgICB0aGlzLnByb3BlcnR5KCd3aWR0aCcsIGZ1bmN0aW9uKCkgeyBcbiAgICAgICAgcmV0dXJuIHRoYXQuX2NhbnZhcy53aWR0aCAvIDI7IFxuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQuX2NhbnZhcy5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgdmFsdWUgKiAyKTtcbiAgICAgICAgdGhhdC5lbC5zZXRBdHRyaWJ1dGUoJ3N0eWxlJywgJ3dpZHRoOiAnICsgdmFsdWUgKyAnOyBoZWlnaHQ6ICcgKyB0aGF0LmhlaWdodCArICc7Jyk7XG5cbiAgICAgICAgdGhhdC50cmlnZ2VyKCdyZXNpemUnLCB7d2lkdGg6IHZhbHVlfSk7XG4gICAgICAgIHRoYXQuX3RyeV9yZWRyYXcoKTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIElzIHRoZSBjYW52YXMgb3IgcmVsYXRlZCBlbGVtZW50cyBmb2N1c2VkP1xuICAgICAqIEByZXR1cm4ge2Jvb2xlYW59XG4gICAgICovXG4gICAgdGhpcy5wcm9wZXJ0eSgnZm9jdXNlZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gZG9jdW1lbnQuYWN0aXZlRWxlbWVudCA9PT0gdGhhdC5lbCB8fFxuICAgICAgICAgICAgZG9jdW1lbnQuYWN0aXZlRWxlbWVudCA9PT0gdGhhdC5fc2Nyb2xsX2JhcnMgfHxcbiAgICAgICAgICAgIGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQgPT09IHRoYXQuX2R1bW15IHx8XG4gICAgICAgICAgICBkb2N1bWVudC5hY3RpdmVFbGVtZW50ID09PSB0aGF0Ll9jYW52YXM7XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIEJpbmQgdG8gdGhlIGV2ZW50cyBvZiB0aGUgY2FudmFzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuU2Nyb2xsaW5nQ2FudmFzLnByb3RvdHlwZS5fYmluZF9ldmVudHMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG5cbiAgICAvLyBUcmlnZ2VyIHNjcm9sbCBhbmQgcmVkcmF3IGV2ZW50cyBvbiBzY3JvbGwuXG4gICAgdGhpcy5fc2Nyb2xsX2JhcnMub25zY3JvbGwgPSBmdW5jdGlvbihlKSB7XG4gICAgICAgIHRoYXQudHJpZ2dlcignc2Nyb2xsJywgZSk7XG4gICAgICAgIHRoYXQuX3RyeV9yZWRyYXcoKTtcbiAgICB9O1xufTtcblxuLyoqXG4gKiBRdWVyaWVzIHRvIHNlZSBpZiByZWRyYXcgaXMgb2theSwgYW5kIHRoZW4gcmVkcmF3cyBpZiBpdCBpcy5cbiAqIEByZXR1cm4ge2Jvb2xlYW59IHRydWUgaWYgcmVkcmF3IGhhcHBlbmVkLlxuICovXG5TY3JvbGxpbmdDYW52YXMucHJvdG90eXBlLl90cnlfcmVkcmF3ID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuX3F1ZXJ5X3JlZHJhdygpKSB7XG4gICAgICAgIHRoaXMucmVkcmF3KCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG4vKipcbiAqIFRyaWdnZXIgdGhlICdxdWVyeV9yZWRyYXcnIGV2ZW50LlxuICogQHJldHVybiB7Ym9vbGVhbn0gdHJ1ZSBpZiBjb250cm9sIHNob3VsZCByZWRyYXcgaXRzZWxmLlxuICovXG5TY3JvbGxpbmdDYW52YXMucHJvdG90eXBlLl9xdWVyeV9yZWRyYXcgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy50cmlnZ2VyKCdxdWVyeV9yZWRyYXcnKS5ldmVyeShmdW5jdGlvbih4KSB7IHJldHVybiB4OyB9KTsgXG59O1xuXG4vKipcbiAqIE1vdmVzIHRoZSBkdW1teSBlbGVtZW50IHRoYXQgY2F1c2VzIHRoZSBzY3JvbGxiYXIgdG8gYXBwZWFyLlxuICogQHBhcmFtICB7ZmxvYXR9IHhcbiAqIEBwYXJhbSAge2Zsb2F0fSB5XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5TY3JvbGxpbmdDYW52YXMucHJvdG90eXBlLl9tb3ZlX2R1bW15ID0gZnVuY3Rpb24oeCwgeSkge1xuICAgIHRoaXMuX2R1bW15LnNldEF0dHJpYnV0ZSgnc3R5bGUnLCAnbGVmdDogJyArIFN0cmluZyh4KSArICc7IHRvcDogJyArIFN0cmluZyh5KSArICc7Jyk7XG59O1xuXG4vKipcbiAqIFRyYW5zZm9ybSBhbiB4IHZhbHVlIGJhc2VkIG9uIHNjcm9sbCBwb3NpdGlvbi5cbiAqIEBwYXJhbSAge2Zsb2F0fSB4XG4gKiBAcmV0dXJuIHtmbG9hdH1cbiAqL1xuU2Nyb2xsaW5nQ2FudmFzLnByb3RvdHlwZS5fdHggPSBmdW5jdGlvbih4KSB7IHJldHVybiB4IC0gdGhpcy5zY3JvbGxfbGVmdDsgfTtcblxuLyoqXG4gKiBUcmFuc2Zvcm0gYSB5IHZhbHVlIGJhc2VkIG9uIHNjcm9sbCBwb3NpdGlvbi5cbiAqIEBwYXJhbSAge2Zsb2F0fSB5XG4gKiBAcmV0dXJuIHtmbG9hdH1cbiAqL1xuU2Nyb2xsaW5nQ2FudmFzLnByb3RvdHlwZS5fdHkgPSBmdW5jdGlvbih5KSB7IHJldHVybiB5IC0gdGhpcy5zY3JvbGxfdG9wOyB9O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLlNjcm9sbGluZ0NhbnZhcyA9IFNjcm9sbGluZ0NhbnZhcztcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbi8qKlxuQmFzZSBjbGFzcyB3aXRoIGhlbHBmdWwgdXRpbGl0aWVzXG4qL1xudmFyIFBvc3RlckNsYXNzID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgdGhpcy5fb25fYWxsID0gW107XG59O1xuXG4vKipcbiAqIERlZmluZSBhIHByb3BlcnR5IGZvciB0aGUgY2xhc3NcbiAqIEBwYXJhbSAge3N0cmluZ30gbmFtZVxuICogQHBhcmFtICB7ZnVuY3Rpb259IGdldHRlclxuICogQHBhcmFtICB7ZnVuY3Rpb259IHNldHRlclxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuUG9zdGVyQ2xhc3MucHJvdG90eXBlLnByb3BlcnR5ID0gZnVuY3Rpb24obmFtZSwgZ2V0dGVyLCBzZXR0ZXIpIHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgbmFtZSwge1xuICAgICAgICBnZXQ6IGdldHRlcixcbiAgICAgICAgc2V0OiBzZXR0ZXIsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH0pO1xufTtcblxuLyoqXG4gKiBSZWdpc3RlciBhbiBldmVudCBsaXN0ZW5lclxuICogQHBhcmFtICB7c3RyaW5nfSBldmVudFxuICogQHBhcmFtICB7ZnVuY3Rpb259IGhhbmRsZXJcbiAqIEBwYXJhbSAge29iamVjdH0gY29udGV4dFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuUG9zdGVyQ2xhc3MucHJvdG90eXBlLm9uID0gZnVuY3Rpb24oZXZlbnQsIGhhbmRsZXIsIGNvbnRleHQpIHtcbiAgICBldmVudCA9IGV2ZW50LnRyaW0oKS50b0xvd2VyQ2FzZSgpO1xuXG4gICAgLy8gTWFrZSBzdXJlIGEgbGlzdCBmb3IgdGhlIGV2ZW50IGV4aXN0cy5cbiAgICBpZiAoIXRoaXMuX2V2ZW50c1tldmVudF0pIHsgdGhpcy5fZXZlbnRzW2V2ZW50XSA9IFtdOyB9XG5cbiAgICAvLyBQdXNoIHRoZSBoYW5kbGVyIGFuZCB0aGUgY29udGV4dCB0byB0aGUgZXZlbnQncyBjYWxsYmFjayBsaXN0LlxuICAgIHRoaXMuX2V2ZW50c1tldmVudF0ucHVzaChbaGFuZGxlciwgY29udGV4dF0pO1xufTtcblxuLyoqXG4gKiBVbnJlZ2lzdGVyIG9uZSBvciBhbGwgZXZlbnQgbGlzdGVuZXJzIGZvciBhIHNwZWNpZmljIGV2ZW50XG4gKiBAcGFyYW0gIHtzdHJpbmd9IGV2ZW50XG4gKiBAcGFyYW0gIHtjYWxsYmFja30gKG9wdGlvbmFsKSBoYW5kbGVyXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Qb3N0ZXJDbGFzcy5wcm90b3R5cGUub2ZmID0gZnVuY3Rpb24oZXZlbnQsIGhhbmRsZXIpIHtcbiAgICBldmVudCA9IGV2ZW50LnRyaW0oKS50b0xvd2VyQ2FzZSgpO1xuICAgIFxuICAgIC8vIElmIGEgaGFuZGxlciBpcyBzcGVjaWZpZWQsIHJlbW92ZSBhbGwgdGhlIGNhbGxiYWNrc1xuICAgIC8vIHdpdGggdGhhdCBoYW5kbGVyLiAgT3RoZXJ3aXNlLCBqdXN0IHJlbW92ZSBhbGwgb2ZcbiAgICAvLyB0aGUgcmVnaXN0ZXJlZCBjYWxsYmFja3MuXG4gICAgaWYgKGhhbmRsZXIpIHtcbiAgICAgICAgdGhpcy5fZXZlbnRzW2V2ZW50XSA9IHRoaXMuX2V2ZW50c1tldmVudF0uZmlsdGVyKGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2tbMF0gIT09IGhhbmRsZXI7XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX2V2ZW50c1tldmVudF0gPSBbXTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFJlZ2lzdGVyIGEgZ2xvYmFsIGV2ZW50IGhhbmRsZXIuIFxuICogXG4gKiBBIGdsb2JhbCBldmVudCBoYW5kbGVyIGZpcmVzIGZvciBhbnkgZXZlbnQgdGhhdCdzXG4gKiB0cmlnZ2VyZWQuXG4gKiBAcGFyYW0gIHtzdHJpbmd9IGhhbmRsZXIgLSBmdW5jdGlvbiB0aGF0IGFjY2VwdHMgb25lXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcmd1bWVudCwgdGhlIG5hbWUgb2YgdGhlXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudCxcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblBvc3RlckNsYXNzLnByb3RvdHlwZS5vbl9hbGwgPSBmdW5jdGlvbihoYW5kbGVyKSB7XG4gICAgdmFyIGluZGV4ID0gdGhpcy5fb25fYWxsLmluZGV4T2YoaGFuZGxlcik7XG4gICAgaWYgKGluZGV4ID09PSAtMSkge1xuICAgICAgICB0aGlzLl9vbl9hbGwucHVzaChoYW5kbGVyKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFVucmVnaXN0ZXIgYSBnbG9iYWwgZXZlbnQgaGFuZGxlci5cbiAqIEBwYXJhbSAge1t0eXBlXX0gaGFuZGxlclxuICogQHJldHVybiB7Ym9vbGVhbn0gdHJ1ZSBpZiBhIGhhbmRsZXIgd2FzIHJlbW92ZWRcbiAqL1xuUG9zdGVyQ2xhc3MucHJvdG90eXBlLm9mZl9hbGwgPSBmdW5jdGlvbihoYW5kbGVyKSB7XG4gICAgdmFyIGluZGV4ID0gdGhpcy5fb25fYWxsLmluZGV4T2YoaGFuZGxlcik7XG4gICAgaWYgKGluZGV4ICE9IC0xKSB7XG4gICAgICAgIHRoaXMuX29uX2FsbC5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufTtcblxuLyoqXG4gKiBUcmlnZ2VycyB0aGUgY2FsbGJhY2tzIG9mIGFuIGV2ZW50IHRvIGZpcmUuXG4gKiBAcGFyYW0gIHtzdHJpbmd9IGV2ZW50XG4gKiBAcmV0dXJuIHthcnJheX0gYXJyYXkgb2YgcmV0dXJuIHZhbHVlc1xuICovXG5Qb3N0ZXJDbGFzcy5wcm90b3R5cGUudHJpZ2dlciA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgZXZlbnQgPSBldmVudC50cmltKCkudG9Mb3dlckNhc2UoKTtcblxuICAgIC8vIENvbnZlcnQgYXJndW1lbnRzIHRvIGFuIGFycmF5IGFuZCBjYWxsIGNhbGxiYWNrcy5cbiAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgYXJncy5zcGxpY2UoMCwxKTtcblxuICAgIC8vIFRyaWdnZXIgZ2xvYmFsIGhhbmRsZXJzIGZpcnN0LlxuICAgIHRoaXMuX29uX2FsbC5mb3JFYWNoKGZ1bmN0aW9uKGhhbmRsZXIpIHtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBbZXZlbnRdLmNvbmNhdChhcmdzKSk7XG4gICAgfSk7XG5cbiAgICAvLyBUcmlnZ2VyIGluZGl2aWR1YWwgaGFuZGxlcnMgc2Vjb25kLlxuICAgIHZhciBldmVudHMgPSB0aGlzLl9ldmVudHNbZXZlbnRdO1xuICAgIGlmIChldmVudHMpIHtcbiAgICAgICAgdmFyIHJldHVybnMgPSBbXTtcbiAgICAgICAgZXZlbnRzLmZvckVhY2goZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHJldHVybnMucHVzaChjYWxsYmFja1swXS5hcHBseShjYWxsYmFja1sxXSwgYXJncykpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHJldHVybnM7XG4gICAgfVxuICAgIHJldHVybiBbXTtcbn07XG5cbi8qKlxuICogQ2F1c2Ugb25lIGNsYXNzIHRvIGluaGVyaXQgZnJvbSBhbm90aGVyXG4gKiBAcGFyYW0gIHt0eXBlfSBjaGlsZFxuICogQHBhcmFtICB7dHlwZX0gcGFyZW50XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG52YXIgaW5oZXJpdCA9IGZ1bmN0aW9uKGNoaWxkLCBwYXJlbnQpIHtcbiAgICBjaGlsZC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHBhcmVudC5wcm90b3R5cGUsIHt9KTtcbn07XG5cbi8qKlxuICogQ2hlY2tzIGlmIGEgdmFsdWUgaXMgY2FsbGFibGVcbiAqIEBwYXJhbSAge2FueX0gdmFsdWVcbiAqIEByZXR1cm4ge2Jvb2xlYW59XG4gKi9cbnZhciBjYWxsYWJsZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PSAnZnVuY3Rpb24nO1xufTtcblxuLyoqXG4gKiBDYWxscyB0aGUgdmFsdWUgaWYgaXQncyBjYWxsYWJsZSBhbmQgcmV0dXJucyBpdCdzIHJldHVybi5cbiAqIE90aGVyd2lzZSByZXR1cm5zIHRoZSB2YWx1ZSBhcy1pcy5cbiAqIEBwYXJhbSAge2FueX0gdmFsdWVcbiAqIEByZXR1cm4ge2FueX1cbiAqL1xudmFyIHJlc29sdmVfY2FsbGFibGUgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIGlmIChjYWxsYWJsZSh2YWx1ZSkpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlLmNhbGwodGhpcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhIHByb3h5IHRvIGEgZnVuY3Rpb24gc28gaXQgaXMgY2FsbGVkIGluIHRoZSBjb3JyZWN0IGNvbnRleHQuXG4gKiBAcmV0dXJuIHtmdW5jdGlvbn0gcHJveGllZCBmdW5jdGlvbi5cbiAqL1xudmFyIHByb3h5ID0gZnVuY3Rpb24oZiwgY29udGV4dCkge1xuICAgIGlmIChmPT09dW5kZWZpbmVkKSB7IHRocm93IG5ldyBFcnJvcignZiBjYW5ub3QgYmUgdW5kZWZpbmVkJyk7IH1cbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7IHJldHVybiBmLmFwcGx5KGNvbnRleHQsIGFyZ3VtZW50cyk7IH07XG59O1xuXG4vKipcbiAqIENsZWFycyBhbiBhcnJheSBpbiBwbGFjZS5cbiAqXG4gKiBEZXNwaXRlIGFuIE8oTikgY29tcGxleGl0eSwgdGhpcyBzZWVtcyB0byBiZSB0aGUgZmFzdGVzdCB3YXkgdG8gY2xlYXJcbiAqIGEgbGlzdCBpbiBwbGFjZSBpbiBKYXZhc2NyaXB0LiBcbiAqIEJlbmNobWFyazogaHR0cDovL2pzcGVyZi5jb20vZW1wdHktamF2YXNjcmlwdC1hcnJheVxuICogQ29tcGxleGl0eTogTyhOKVxuICogQHBhcmFtICB7YXJyYXl9IGFycmF5XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG52YXIgY2xlYXJfYXJyYXkgPSBmdW5jdGlvbihhcnJheSkge1xuICAgIHdoaWxlIChhcnJheS5sZW5ndGggPiAwKSB7XG4gICAgICAgIGFycmF5LnBvcCgpO1xuICAgIH1cbn07XG5cbi8qKlxuICogQ2hlY2tzIGlmIGEgdmFsdWUgaXMgYW4gYXJyYXlcbiAqIEBwYXJhbSAge2FueX0geFxuICogQHJldHVybiB7Ym9vbGVhbn0gdHJ1ZSBpZiB2YWx1ZSBpcyBhbiBhcnJheVxuICovXG52YXIgaXNfYXJyYXkgPSBmdW5jdGlvbih4KSB7XG4gICAgcmV0dXJuIHggaW5zdGFuY2VvZiBBcnJheTtcbn07XG5cbi8qKlxuICogRmluZCB0aGUgY2xvc2VzdCB2YWx1ZSBpbiBhIGxpc3RcbiAqIFxuICogSW50ZXJwb2xhdGlvbiBzZWFyY2ggYWxnb3JpdGhtLiAgXG4gKiBDb21wbGV4aXR5OiBPKGxnKGxnKE4pKSlcbiAqIEBwYXJhbSAge2FycmF5fSBzb3J0ZWQgLSBzb3J0ZWQgYXJyYXkgb2YgbnVtYmVyc1xuICogQHBhcmFtICB7ZmxvYXR9IHggLSBudW1iZXIgdG8gdHJ5IHRvIGZpbmRcbiAqIEByZXR1cm4ge2ludGVnZXJ9IGluZGV4IG9mIHRoZSB2YWx1ZSB0aGF0J3MgY2xvc2VzdCB0byB4XG4gKi9cbnZhciBmaW5kX2Nsb3Nlc3QgPSBmdW5jdGlvbihzb3J0ZWQsIHgpIHtcbiAgICB2YXIgbWluID0gc29ydGVkWzBdO1xuICAgIHZhciBtYXggPSBzb3J0ZWRbc29ydGVkLmxlbmd0aC0xXTtcbiAgICBpZiAoeCA8IG1pbikgcmV0dXJuIDA7XG4gICAgaWYgKHggPiBtYXgpIHJldHVybiBzb3J0ZWQubGVuZ3RoLTE7XG4gICAgaWYgKHNvcnRlZC5sZW5ndGggPT0gMikge1xuICAgICAgICBpZiAobWF4IC0geCA+IHggLSBtaW4pIHtcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdmFyIHJhdGUgPSAobWF4IC0gbWluKSAvIHNvcnRlZC5sZW5ndGg7XG4gICAgaWYgKHJhdGUgPT09IDApIHJldHVybiAwO1xuICAgIHZhciBndWVzcyA9IE1hdGguZmxvb3IoeCAvIHJhdGUpO1xuICAgIGlmIChzb3J0ZWRbZ3Vlc3NdID09IHgpIHtcbiAgICAgICAgcmV0dXJuIGd1ZXNzO1xuICAgIH0gZWxzZSBpZiAoZ3Vlc3MgPiAwICYmIHNvcnRlZFtndWVzcy0xXSA8IHggJiYgeCA8IHNvcnRlZFtndWVzc10pIHtcbiAgICAgICAgcmV0dXJuIGZpbmRfY2xvc2VzdChzb3J0ZWQuc2xpY2UoZ3Vlc3MtMSwgZ3Vlc3MrMSksIHgpICsgZ3Vlc3MtMTtcbiAgICB9IGVsc2UgaWYgKGd1ZXNzIDwgc29ydGVkLmxlbmd0aC0xICYmIHNvcnRlZFtndWVzc10gPCB4ICYmIHggPCBzb3J0ZWRbZ3Vlc3MrMV0pIHtcbiAgICAgICAgcmV0dXJuIGZpbmRfY2xvc2VzdChzb3J0ZWQuc2xpY2UoZ3Vlc3MsIGd1ZXNzKzIpLCB4KSArIGd1ZXNzO1xuICAgIH0gZWxzZSBpZiAoc29ydGVkW2d1ZXNzXSA+IHgpIHtcbiAgICAgICAgcmV0dXJuIGZpbmRfY2xvc2VzdChzb3J0ZWQuc2xpY2UoMCwgZ3Vlc3MpLCB4KTtcbiAgICB9IGVsc2UgaWYgKHNvcnRlZFtndWVzc10gPCB4KSB7XG4gICAgICAgIHJldHVybiBmaW5kX2Nsb3Nlc3Qoc29ydGVkLnNsaWNlKGd1ZXNzKzEpLCB4KSArIGd1ZXNzKzE7XG4gICAgfVxufTtcblxuLyoqXG4gKiBNYWtlIGEgc2hhbGxvdyBjb3B5IG9mIGEgZGljdGlvbmFyeS5cbiAqIEBwYXJhbSAge2RpY3Rpb25hcnl9IHhcbiAqIEByZXR1cm4ge2RpY3Rpb25hcnl9XG4gKi9cbnZhciBzaGFsbG93X2NvcHkgPSBmdW5jdGlvbih4KSB7XG4gICAgdmFyIHkgPSB7fTtcbiAgICBmb3IgKHZhciBrZXkgaW4geCkge1xuICAgICAgICBpZiAoeC5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICB5W2tleV0gPSB4W2tleV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHk7XG59O1xuXG4vLyBFeHBvcnQgbmFtZXMuXG5leHBvcnRzLlBvc3RlckNsYXNzID0gUG9zdGVyQ2xhc3M7XG5leHBvcnRzLmluaGVyaXQgPSBpbmhlcml0O1xuZXhwb3J0cy5jYWxsYWJsZSA9IGNhbGxhYmxlO1xuZXhwb3J0cy5yZXNvbHZlX2NhbGxhYmxlID0gcmVzb2x2ZV9jYWxsYWJsZTtcbmV4cG9ydHMucHJveHkgPSBwcm94eTtcbmV4cG9ydHMuY2xlYXJfYXJyYXkgPSBjbGVhcl9hcnJheTtcbmV4cG9ydHMuaXNfYXJyYXkgPSBpc19hcnJheTtcbmV4cG9ydHMuZmluZF9jbG9zZXN0ID0gZmluZF9jbG9zZXN0O1xuZXhwb3J0cy5zaGFsbG93X2NvcHkgPSBzaGFsbG93X2NvcHk7XG4iXX0=
