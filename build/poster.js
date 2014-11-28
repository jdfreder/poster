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
    var that = this;
    this.model = new document_model.DocumentModel();
    this.controller = new document_controller.DocumentController(this.canvas.el, this.model);
    this.view = new document_view.DocumentView(
        this.canvas, 
        this.model, 
        this.controller.cursors, 
        {keyword: 'red'},
        function() { return that.controller.clipboard.hidden_input === document.activeElement || that.canvas.focused; }
    );

    // Create properties
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

},{"./document_controller.js":7,"./document_model.js":8,"./document_view.js":9,"./scrolling_canvas.js":20,"./utils.js":21}],2:[function(require,module,exports){
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
},{"./utils.js":21}],3:[function(require,module,exports){
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
 * Get's a chunk of the canvas as a raw image.
 * @param  {float} x
 * @param  {float} y
 * @param  {float} width
 * @param  {float} height
 * @return {image} canvas image data
 */
Canvas.prototype.get_raw_image = function(x, y, width, height) {
    x = this._tx(x);
    y = this._ty(y);
    // Multiply by two for pixel doubling.
    return this.context.getImageData(x*2, y*2, width*2, height*2);
};

/**
 * Put's a raw image on the canvas somewhere.
 * @param  {float} x
 * @param  {float} y
 * @return {image} canvas image data
 */
Canvas.prototype.put_raw_image = function(img, x, y) {
    x = this._tx(x);
    y = this._ty(y);
    // Multiply by two for pixel doubling.
    return this.context.putImageData(img, x*2, y*2);
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

},{"./utils.js":21}],4:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('./utils.js');

/**
 * Eventful clipboard support
 *
 * WARNING:  This class is a hudge kludge that works around the prehistoric
 * clipboard support (lack thereof) in modern webrowsers.  It creates a hidden
 * textbox which is focused.  The programmer must call `set_clippable` to change
 * what will be copied when the user hits keys corresponding to a copy 
 * operation.  Events `copy`, `cut`, and `paste` are raised by this class.
 */
var Clipboard = function(el) {
    utils.PosterClass.call(this);
    this._el = el;

    // Create a textbox that's hidden.
    this.hidden_input = document.createElement('textarea');
    this.hidden_input.setAttribute('class', 'poster hidden-clipboard');
    el.appendChild(this.hidden_input);

    this._bind_events();
};
utils.inherit(Clipboard, utils.PosterClass);

/**
 * Set what will be copied when the user copies.
 * @param {string} text
 */
Clipboard.prototype.set_clippable = function(text) {
    this._clippable = text;
    this.hidden_input.value = this._clippable;
    this._focus();
}; 

/**
 * Focus the hidden text area.
 * @return {null}
 */
Clipboard.prototype._focus = function() {
    this.hidden_input.focus();
    this.hidden_input.select();
};

/**
 * Handle when the user pastes into the textbox.
 * @return {null}
 */
Clipboard.prototype._handle_paste = function() {
    var that = this;
    setTimeout(function() {
        that.trigger('paste', that.hidden_input.value);
        that.hidden_input.value = that._clippable;
        that._focus();
    }, 0);
};

/**
 * Bind events of the hidden textbox.
 * @return {null}
 */
Clipboard.prototype._bind_events = function() {
    var that = this;

    // Listen to el's focus event.  If el is focused, focus the hidden input
    // instead.
    utils.hook(this._el, 'onfocus', utils.proxy(this._focus, this));

    utils.hook(this.hidden_input, 'onpaste', utils.proxy(this._handle_paste, this));
    utils.hook(this.hidden_input, 'oncut', function() {
        // Trigger the event in a timeout so it fires after the system event.
        setTimeout(function(){
            that.trigger('cut', that._clippable);
        }, 0);
    });
    utils.hook(this.hidden_input, 'oncopy', function() {
        that.trigger('copy', that._clippable);
    });
    utils.hook(this.hidden_input, 'onkeypress', function() {
        setTimeout(function() {
            that.hidden_input.value = that._clippable;
            that._focus();
        }, 0);
    });
    utils.hook(this.hidden_input, 'onkeyup', function() {
        setTimeout(function() {
            that.hidden_input.value = that._clippable;
            that._focus();
        }, 0);
    });
};

exports.Clipboard = Clipboard;

},{"./utils.js":21}],5:[function(require,module,exports){
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

    this.primary_row = null;
    this.primary_char = null;
    this.secondary_row = null;
    this.secondary_char = null;

    this._init_properties();
    this._register_api();
};
utils.inherit(Cursor, utils.PosterClass);

/**
 * Moves the primary cursor a given offset.
 * @param  {integer} x
 * @param  {integer} y
 * @return {null}
 */
Cursor.prototype.move_primary = function(x, y) {
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
        this.primary_row = Math.min(Math.max(this.primary_row, 0), this._model._rows.length);
        if (this._memory_char !== undefined) {
            this.primary_char = this._memory_char;
        }
        if (this.primary_char > this._model._rows[this.primary_row].length) {
            this.primary_char = this._model._rows[this.primary_row].length;
        }
    }

    this.trigger('change'); 
};

/**
 * Walk the primary cursor in a direction until a not-text character is found.
 * @param  {integer} direction
 * @return {null}
 */
Cursor.prototype.word_primary = function(direction) {
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
        while (0 < i && !(hit_text && this._not_text(row_text[i-1]))) {
            hit_text = hit_text || !this._not_text(row_text[i-1]);
            i += direction;
        }
    } else {
        while (i < row_text.length && !(hit_text && this._not_text(row_text[i]))) {
            hit_text = hit_text || !this._not_text(row_text[i]);
            i += direction;
        }
    }

    this.primary_char = i;
    this._memory_char = this.primary_char;
    this.trigger('change'); 
};

/**
 * Set the primary cursor position
 * @param {integer} row_index
 * @param {integer} char_index
 */
Cursor.prototype.set_primary = function(row_index, char_index) {
    this.primary_row = row_index;
    this.primary_char = char_index;

    // Remember the character position, vertical navigation across empty lines
    // shouldn't cause the horizontal position to be lost.
    this._memory_char = this.primary_char;

    this.trigger('change'); 
};

/**
 * Set the secondary cursor position
 * @param {integer} row_index
 * @param {integer} char_index
 */
Cursor.prototype.set_secondary = function(row_index, char_index) {
    this.secondary_row = row_index;
    this.secondary_char = char_index;    
    this.trigger('change'); 
};

/**
 * Handles when a key is pressed.
 * @param  {Event} e - original key press event.
 * @return {null}
 */
Cursor.prototype.keypress = function(e) {
    var char_code = e.which || e.keyCode;
    var char_typed = String.fromCharCode(char_code);
    this.remove_selected();
    this._model.add_text(this.primary_row, this.primary_char, char_typed);
    this.move_primary(1, 0);
    this._reset_secondary();
    return true;
};

/**
 * Insert a newline
 * @return {null}
 */
Cursor.prototype.newline = function(e) {
    this.remove_selected();
    this._model.add_text(this.primary_row, this.primary_char, '\n');
    this.move_primary(0, 1);
    this._reset_secondary();
    return true;
};

/**
 * Insert text
 * @param  {string} text
 * @return {null}
 */
Cursor.prototype.insert_text = function(text) {
    this.remove_selected();
    this._model.add_text(this.primary_row, this.primary_char, text);
    
    // Move cursor to the end.
    if (text.indexOf('\n')==-1) {
        this.primary_char = this.start_char + text.length;
    } else {
        var lines = text.split('\n');
        this.primary_row += lines.length - 1;
        this.primary_char = lines[lines.length-1].length;
    }
    this.trigger('change'); 

    this._reset_secondary();
    return true;
};

/**
 * Remove the selected text
 * @return {boolean} true if text was removed.
 */
Cursor.prototype.remove_selected = function() {
    if (this.primary_row !== this.secondary_row || this.primary_char !== this.secondary_char) {
        var row_index = this.start_row;
        var char_index = this.start_char;
        this._model.remove_text(this.start_row, this.start_char, this.end_row, this.end_char);
        this.primary_row = row_index;
        this.primary_char = char_index;
        this._reset_secondary();
        this.trigger('change'); 
        return true;
    }
    return false;
};

/**
 * Copies the selected text.
 * @return {string} selected text
 */
Cursor.prototype.copy = function() {
    return this._model.get_text(this.start_row, this.start_char, this.end_row, this.end_char);
};

/**
 * Cuts the selected text.
 * @return {string} selected text
 */
Cursor.prototype.cut = function() {
    var text = this.copy();
    this.remove_selected();
    return text;
};

/**
 * Reset the secondary cursor to the value of the primary.
 * @return {[type]} [description]
 */
Cursor.prototype._reset_secondary = function() {
    this.secondary_row = this.primary_row;
    this.secondary_char = this.primary_char;

    this.trigger('change'); 
};

/**
 * Create the properties of the cursor.
 * @return {null}
 */
Cursor.prototype._init_properties = function() {
    var that = this;
    this.property('start_row', function() { return Math.min(that.primary_row, that.secondary_row); });
    this.property('end_row', function() { return Math.max(that.primary_row, that.secondary_row); });
    this.property('start_char', function() {
        if (that.primary_row < that.secondary_row || (that.primary_row == that.secondary_row && that.primary_char <= that.secondary_char)) {
            return that.primary_char;
        } else {
            return that.secondary_char;
        }
    });
    this.property('end_char', function() {
        if (that.primary_row < that.secondary_row || (that.primary_row == that.secondary_row && that.primary_char <= that.secondary_char)) {
            return that.secondary_char;
        } else {
            return that.primary_char;
        }
    });
};

/**
 * Checks if the character isn't text.
 * @param  {char} c - character
 * @return {boolean} true if the character is not text.
 */
Cursor.prototype._not_text = function(c) {
    return 'abcdefghijklmnopqrstuvwxyz1234567890'.indexOf(c.toLowerCase()) == -1;
};

/**
 * Registers an action API with the map
 * @return {null}
 */
Cursor.prototype._register_api = function() {
    var that = this;
    register('cursor.remove_selected', utils.proxy(this.remove_selected, this), this);
    register('cursor.keypress', utils.proxy(this.keypress, this), this);
    register('cursor.newline', utils.proxy(this.newline, this), this);
    register('cursor.insert_text', utils.proxy(this.insert_text, this), this);
    register('cursor.left', function() { that.move_primary(-1, 0); that._reset_secondary(); return true; });
    register('cursor.right', function() { that.move_primary(1, 0); that._reset_secondary(); return true; });
    register('cursor.up', function() { that.move_primary(0, -1); that._reset_secondary(); return true; });
    register('cursor.down', function() { that.move_primary(0, 1); that._reset_secondary(); return true; });
    register('cursor.select_left', function() { that.move_primary(-1, 0); return true; });
    register('cursor.select_right', function() { that.move_primary(1, 0); return true; });
    register('cursor.select_up', function() { that.move_primary(0, -1); return true; });
    register('cursor.select_down', function() { that.move_primary(0, 1); return true; });
    register('cursor.word_left', function() { that.word_primary(-1); that._reset_secondary(); return true; });
    register('cursor.word_right', function() { that.word_primary(1); that._reset_secondary(); return true; });
    register('cursor.select_word_left', function() { that.word_primary(-1); return true; });
    register('cursor.select_word_right', function() { that.word_primary(1); return true; });
};

exports.Cursor = Cursor;
},{"./events/map.js":11,"./utils.js":21}],6:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var keymap = require('./events/map.js');
var register = keymap.Map.register;

var cursor = require('./cursor.js');
var utils = require('./utils.js');
/**
 * Manages one or more cursors
 */
var Cursors = function(model, clipboard) {
    utils.PosterClass.call(this);
    this._model = model;
    this.get_row_char = undefined;
    this.cursors = [];
    this._selecting_text = false;
    this._clipboard = clipboard;

    // Create initial cursor.
    this.create();

    // Register actions.
    register('cursors.start_selection', utils.proxy(this.start_selection, this));
    register('cursors.set_selection', utils.proxy(this.set_selection, this));
    register('cursors.end_selection', utils.proxy(this.end_selection, this));

    // Bind clipboard events.
    this._clipboard.on('cut', utils.proxy(this._handle_cut, this));
    this._clipboard.on('paste', utils.proxy(this._handle_paste, this));
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
        that._update_selection();
    });

    return new_cursor;
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
            cursor.insert_text(text);
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
        selections.push(cursor.copy());
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
        this.cursors[0].set_primary(location.row_index, location.char_index);
        this.cursors[0].set_secondary(location.row_index, location.char_index);
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

// Exports
exports.Cursors = Cursors;

},{"./cursor.js":5,"./events/map.js":11,"./utils.js":21}],7:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('./utils.js');
var normalizer = require('./events/normalizer.js');
var keymap = require('./events/map.js');
var default_keymap = require('./events/default.js');
var cursors = require('./cursors.js');
var test_highlighter = require('./highlighters/test.js');
var clipboard = require('./clipboard.js');

/**
 * Controller for a DocumentModel.
 */
var DocumentController = function(el, model) {
    utils.PosterClass.call(this);
    this.clipboard = new clipboard.Clipboard(el);
    this.normalizer = new normalizer.Normalizer();
    this.normalizer.listen_to(el);
    this.normalizer.listen_to(this.clipboard.hidden_input);
    this.map = new keymap.Map(this.normalizer);
    this.map.map(default_keymap.map);

    this.cursors = new cursors.Cursors(model, this.clipboard);
    this._highlighter = new test_highlighter.TestHighlighter(model);
};
utils.inherit(DocumentController, utils.PosterClass);

// Exports
exports.DocumentController = DocumentController;

},{"./clipboard.js":4,"./cursors.js":6,"./events/default.js":10,"./events/map.js":11,"./events/normalizer.js":12,"./highlighters/test.js":14,"./utils.js":21}],8:[function(require,module,exports){
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
 * Gets a chunk of text.
 * @param  {integer} start_row
 * @param  {integer} start_char
 * @param  {integer} end_row
 * @param  {integer} end_char
 * @return {string}
 */
DocumentModel.prototype.get_text = function(start_row, start_char, end_row, end_char) {
    if (start_row==end_row) {
        return this._rows[start_row].substring(start_char, end_char);
    } else {
        var text = [];
        text.push(this._rows[start_row].substring(start_char));
        if (end_row - start_row > 1) {
            for (var i = start_row + 1; i < end_row; i++) {
                text.push(this._rows[i]);
            }
        }
        text.push(this._rows[end_row].substring(0, end_char));
        return text.join('\n');
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
},{"./utils.js":21}],9:[function(require,module,exports){
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
 * @param {function} has_focus - function that checks if the text area has focus
 */
var DocumentView = function(canvas, model, cursors_model, style, has_focus) {
    this._model = model;

    // Create child renderers.
    var row_renderer = new highlighted_row.HighlightedRowRenderer(model, canvas, style);
    var cursors_renderer = new cursors.CursorsRenderer(
        cursors_model, 
        style, 
        utils.proxy(row_renderer.get_row_height, row_renderer), 
        utils.proxy(row_renderer.get_row_top, row_renderer), 
        utils.proxy(row_renderer.measure_partial_row_width, row_renderer),
        has_focus);

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
},{"./renderers/batch.js":15,"./renderers/cursors.js":16,"./renderers/highlighted_row.js":17,"./utils.js":21}],10:[function(require,module,exports){
exports.map = {
    'keypress' : 'cursor.keypress',
    'enter' : 'cursor.newline',
    'delete' : 'cursor.delete_forward',
    'backspace' : 'cursor.delete_backward',
    'leftarrow' : 'cursor.left',
    'rightarrow' : 'cursor.right',
    'uparrow' : 'cursor.up',
    'downarrow' : 'cursor.down',
    'shift-leftarrow' : 'cursor.select_left',
    'shift-rightarrow' : 'cursor.select_right',
    'shift-uparrow' : 'cursor.select_up',
    'shift-downarrow' : 'cursor.select_down',
    'alt-leftarrow' : 'cursor.word_left',
    'alt-rightarrow' : 'cursor.word_right',
    'shift-alt-leftarrow' : 'cursor.select_word_left',
    'shift-alt-rightarrow' : 'cursor.select_word_right',
    'mouse0-down' : 'cursors.start_selection',
    'mouse-move' : 'cursors.set_selection',
    'mouse0-up' : 'cursors.end_selection',
};
},{}],11:[function(require,module,exports){
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
                    var returns = [];
                    action_callbacks.forEach(function(action_callback) {
                        returns.append(action_callback.call(undefined, e)===true);
                    });

                    // If one of the action callbacks returned true, cancel bubbling.
                    if (returns.some(function(x) {return x;})) {
                        that._cancel_bubble(e);
                        return true;
                    }
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

},{"../utils.js":21}],12:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var utils = require('../utils.js');

/**
 * Event normalizer
 *
 * Listens to DOM events and emits 'cleaned' versions of those events.
 */
var Normalizer = function() {
    utils.PosterClass.call(this);
    this._el_hooks = {};
};
utils.inherit(Normalizer, utils.PosterClass);

/**
 * Listen to the events of an element.
 * @param  {HTMLElement} el
 * @return {null}
 */
Normalizer.prototype.listen_to = function(el) {
    var hooks = [];
    hooks.push(utils.hook(el, 'onkeypress', this._proxy('press', this._handle_keypress_event, el)));
    hooks.push(utils.hook(el, 'onkeydown',  this._proxy('down', this._handle_keyboard_event, el)));
    hooks.push(utils.hook(el, 'onkeyup',  this._proxy('up', this._handle_keyboard_event, el)));
    hooks.push(utils.hook(el, 'ondblclick',  this._proxy('dblclick', this._handle_mouse_event, el)));
    hooks.push(utils.hook(el, 'onclick',  this._proxy('click', this._handle_mouse_event, el)));
    hooks.push(utils.hook(el, 'onmousedown',  this._proxy('down', this._handle_mouse_event, el)));
    hooks.push(utils.hook(el, 'onmouseup',  this._proxy('up', this._handle_mouse_event, el)));
    hooks.push(utils.hook(el, 'onmousemove',  this._proxy('move', this._handle_mousemove_event, el)));
    this._el_hooks[el] = hooks;
};

/**
 * Stops listening to an element.
 * @param  {HTMLElement} el
 * @return {null}
 */
Normalizer.prototype.stop_listening_to = function(el) {
    if (this._el_hooks[el] !== undefined) {
        this._el_hooks[el].forEach(function(hook) {
            hook.unhook();
        });
        delete this._el_hooks[el];
    }
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
            37: 'leftarrow',
            38: 'uparrow',
            39: 'rightarrow',
            40: 'downarrow',
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

},{"../utils.js":21}],13:[function(require,module,exports){
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

},{"../utils.js":21}],14:[function(require,module,exports){
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

},{"../utils.js":21,"./highlighter.js":13}],15:[function(require,module,exports){
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
 * @param {dictionary} (optional) scroll - How much the canvas was scrolled.  This
 *                     is a dictionary of the form {x: float, y: float}
 * @return {null}
 */
BatchRenderer.prototype.render = function(scroll) {
    var that = this;
    this._renderers.forEach(function(renderer) {

        // Apply the rendering coordinate transforms of the parent.
        renderer._canvas._tx = utils.proxy(that._canvas._tx, that._canvas);
        renderer._canvas._ty = utils.proxy(that._canvas._ty, that._canvas);

        // Tell the renderer to render itself.
        renderer.render(scroll);
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

},{"../utils.js":21,"./renderer.js":18}],16:[function(require,module,exports){
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
            var row_index = cursor.primary_row || 0;
            var char_index = cursor.primary_char || 0;
            
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
            if (cursor.start_row !== null && cursor.start_char !== null &&
                cursor.end_row !== null && cursor.end_char !== null) {
                
                for (var i = cursor.start_row; i <= cursor.end_row; i++) {

                    var left = 0;
                    if (i == cursor.start_row && cursor.start_char > 0) {
                        left = that._measure_partial_row(i, cursor.start_char);
                    }

                    that._canvas.draw_rectangle(
                        left, 
                        that._get_row_top(i), 
                        i !== cursor.end_row ? that._measure_partial_row(i) - left : that._measure_partial_row(i, cursor.end_char) - left, 
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

},{"../animator.js":2,"../utils.js":21,"./renderer.js":18}],17:[function(require,module,exports){
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
    if (index < 0 || this._model._rows.length <= index) return;
    
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
    if (index < 0 || this._model._rows.length <= index) return;

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

},{"../utils.js":21,"./row.js":19}],18:[function(require,module,exports){
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
 * @param {dictionary} (optional) scroll - How much the canvas was scrolled.  This
 *                     is a dictionary of the form {x: float, y: float}
 * @return {null}
 */
RendererBase.prototype.render = function(scroll) {
    throw new Error('Not implemented');
};

// Exports
exports.RendererBase = RendererBase;

},{"../canvas.js":3,"../utils.js":21}],19:[function(require,module,exports){
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
 * @param {dictionary} (optional) scroll - How much the canvas was scrolled.  This
 *                     is a dictionary of the form {x: float, y: float}
 * @return {null}
 */
RowRenderer.prototype.render = function(scroll) {
    var i;

    // Find the row closest to the scroll top.  If that row is below
    // the scroll top, use the partially displayed row above it.
    var new_top_row = Math.max(0, Math.floor(this._scrolling_canvas.scroll_top  / this.get_row_height()));

    // Find the row closest to the scroll bottom.  If that row is above
    // the scroll bottom, use the partially displayed row below it.
    var row_count = Math.ceil(this._canvas.height / this.get_row_height());
    var new_bottom_row = new_top_row + row_count;

    // If only the y axis was scrolled, blit the good contents and just render
    // what's missing.
    if (scroll && scroll.x === 0 && Math.abs(scroll.y) < this._canvas.height) {

        // Copy old contents.
        var old_render = this._canvas.get_raw_image(
            this._scrolling_canvas.scroll_left, 
            this._scrolling_canvas.scroll_top, 
            this._canvas.width, this._canvas.height);
        this._canvas.clear();

        // Draw missing rows.
        // Positive y, scrolling down the page (page itself is moving up).
        var new_row_count = Math.ceil(Math.abs(scroll.y) / this.get_row_height()) + 1;
        if (scroll.y > 0) {
            for (i = new_bottom_row - new_row_count; i <= new_bottom_row; i++) {
                this._render_row(i);
            }
        } else {
            for (i = new_top_row; i <= new_top_row + new_row_count; i++) {
                this._render_row(i);
            }
        }

        // Redraw old contents in new location.
        this._canvas.put_raw_image(
            old_render, 
            this._scrolling_canvas.scroll_left, 
            this._scrolling_canvas.scroll_top - scroll.y);

    } else { // Full redraw
        this._canvas.clear();

        // Render till there are no rows left, or the top of the row is
        // below the bottom of the visible area.
        for (i = new_top_row; 
            i < Math.min(new_bottom_row+1, this._model._rows.length); 
            i++) {        

            this._render_row(i);
        }    
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

},{"../utils.js":21,"./renderer.js":18}],20:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var canvas = require('./canvas.js');
var utils = require('./utils.js');

/**
 * HTML canvas with drawing convinience functions.
 */
var ScrollingCanvas = function() {
    canvas.Canvas.call(this);
    this._bind_events();
    this._old_scroll_left = 0;
    this._old_scroll_top = 0;

    // Set default size.
    this.width = 400;
    this.height = 300;
};
utils.inherit(ScrollingCanvas, canvas.Canvas);

/**
 * Causes the canvas contents to be redrawn.
 * @return {null}
 */
ScrollingCanvas.prototype.redraw = function(scroll) {
    this.clear();
    this.trigger('redraw', scroll);
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
        if (that._old_scroll_top !== undefined && that._old_scroll_left !== undefined) {
            var scroll = {
                x: that.scroll_left - that._old_scroll_left,
                y: that.scroll_top - that._old_scroll_top,
            };
            that._try_redraw(scroll);
        } else {
            that._try_redraw();
        }
        that._old_scroll_left = that.scroll_left;
        that._old_scroll_top = that.scroll_top;
    };
};

/**
 * Queries to see if redraw is okay, and then redraws if it is.
 * @return {boolean} true if redraw happened.
 */
ScrollingCanvas.prototype._try_redraw = function(scroll) {
    if (this._query_redraw()) {
        this.redraw(scroll);
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

},{"./canvas.js":3,"./utils.js":21}],21:[function(require,module,exports){
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

/**
 * Hooks a function.
 * @param  {object} obj - object to hook
 * @param  {string} method - name of the function to hook
 * @param  {function} hook - function to call before the original
 * @return {object} hook reference, object with an `unhook` method
 */
var hook = function(obj, method, hook) {

    // If the original has already been hooked, add this hook to the list 
    // of hooks.
    if (obj[method] && obj[method].original && obj[method].hooks) {
        obj[method].hooks.push(hook);
    } else {
        // Create the hooked function
        var hooks = [hook];
        var original = obj[method];
        var hooked = function() {
            var args = arguments;
            var ret;
            var results;
            var that = this;
            hooks.forEach(function(hook) {
                results = hook.apply(that, args);
                ret = ret !== undefined ? ret : results;
            });
            if (original) {
                results = original.apply(this, args);
            }
            return ret !== undefined ? ret : results;
        };
        hooked.original = original;
        hooked.hooks = hooks;
        obj[method] = hooked;
    }

    // Return unhook method.
    return {
        unhook: function() {
            var index = obj[method].hooks.indexOf(hook);
            if (index != -1) {
                obj[method].hooks.splice(index, 1);
            }

            if (obj[method].hooks.length === 0) {
                obj[method] = obj[method].original;
            }
        },
    };
    
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
exports.hook = hook;

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzb3VyY2UvanMvcG9zdGVyLmpzIiwic291cmNlL2pzL2FuaW1hdG9yLmpzIiwic291cmNlL2pzL2NhbnZhcy5qcyIsInNvdXJjZS9qcy9jbGlwYm9hcmQuanMiLCJzb3VyY2UvanMvY3Vyc29yLmpzIiwic291cmNlL2pzL2N1cnNvcnMuanMiLCJzb3VyY2UvanMvZG9jdW1lbnRfY29udHJvbGxlci5qcyIsInNvdXJjZS9qcy9kb2N1bWVudF9tb2RlbC5qcyIsInNvdXJjZS9qcy9kb2N1bWVudF92aWV3LmpzIiwic291cmNlL2pzL2V2ZW50cy9kZWZhdWx0LmpzIiwic291cmNlL2pzL2V2ZW50cy9tYXAuanMiLCJzb3VyY2UvanMvZXZlbnRzL25vcm1hbGl6ZXIuanMiLCJzb3VyY2UvanMvaGlnaGxpZ2h0ZXJzL2hpZ2hsaWdodGVyLmpzIiwic291cmNlL2pzL2hpZ2hsaWdodGVycy90ZXN0LmpzIiwic291cmNlL2pzL3JlbmRlcmVycy9iYXRjaC5qcyIsInNvdXJjZS9qcy9yZW5kZXJlcnMvY3Vyc29ycy5qcyIsInNvdXJjZS9qcy9yZW5kZXJlcnMvaGlnaGxpZ2h0ZWRfcm93LmpzIiwic291cmNlL2pzL3JlbmRlcmVycy9yZW5kZXJlci5qcyIsInNvdXJjZS9qcy9yZW5kZXJlcnMvcm93LmpzIiwic291cmNlL2pzL3Njcm9sbGluZ19jYW52YXMuanMiLCJzb3VyY2UvanMvdXRpbHMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0VkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbFRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoVUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9HQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdk5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbnZhciBzY3JvbGxpbmdfY2FudmFzID0gcmVxdWlyZSgnLi9zY3JvbGxpbmdfY2FudmFzLmpzJyk7XG52YXIgZG9jdW1lbnRfY29udHJvbGxlciA9IHJlcXVpcmUoJy4vZG9jdW1lbnRfY29udHJvbGxlci5qcycpO1xudmFyIGRvY3VtZW50X21vZGVsID0gcmVxdWlyZSgnLi9kb2N1bWVudF9tb2RlbC5qcycpO1xudmFyIGRvY3VtZW50X3ZpZXcgPSByZXF1aXJlKCcuL2RvY3VtZW50X3ZpZXcuanMnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKTtcblxuLyoqXG4gKiBDYW52YXMgYmFzZWQgdGV4dCBlZGl0b3JcbiAqL1xudmFyIFBvc3RlciA9IGZ1bmN0aW9uKCkge1xuICAgIHV0aWxzLlBvc3RlckNsYXNzLmNhbGwodGhpcyk7XG5cbiAgICAvLyBDcmVhdGUgY2FudmFzXG4gICAgdGhpcy5jYW52YXMgPSBuZXcgc2Nyb2xsaW5nX2NhbnZhcy5TY3JvbGxpbmdDYW52YXMoKTtcbiAgICB0aGlzLmVsID0gdGhpcy5jYW52YXMuZWw7IC8vIENvbnZlbmllbmNlXG5cbiAgICAvLyBDcmVhdGUgbW9kZWwsIGNvbnRyb2xsZXIsIGFuZCB2aWV3LlxuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLm1vZGVsID0gbmV3IGRvY3VtZW50X21vZGVsLkRvY3VtZW50TW9kZWwoKTtcbiAgICB0aGlzLmNvbnRyb2xsZXIgPSBuZXcgZG9jdW1lbnRfY29udHJvbGxlci5Eb2N1bWVudENvbnRyb2xsZXIodGhpcy5jYW52YXMuZWwsIHRoaXMubW9kZWwpO1xuICAgIHRoaXMudmlldyA9IG5ldyBkb2N1bWVudF92aWV3LkRvY3VtZW50VmlldyhcbiAgICAgICAgdGhpcy5jYW52YXMsIFxuICAgICAgICB0aGlzLm1vZGVsLCBcbiAgICAgICAgdGhpcy5jb250cm9sbGVyLmN1cnNvcnMsIFxuICAgICAgICB7a2V5d29yZDogJ3JlZCd9LFxuICAgICAgICBmdW5jdGlvbigpIHsgcmV0dXJuIHRoYXQuY29udHJvbGxlci5jbGlwYm9hcmQuaGlkZGVuX2lucHV0ID09PSBkb2N1bWVudC5hY3RpdmVFbGVtZW50IHx8IHRoYXQuY2FudmFzLmZvY3VzZWQ7IH1cbiAgICApO1xuXG4gICAgLy8gQ3JlYXRlIHByb3BlcnRpZXNcbiAgICB0aGlzLnByb3BlcnR5KCd2YWx1ZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC5tb2RlbC50ZXh0O1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQubW9kZWwudGV4dCA9IHZhbHVlO1xuICAgIH0pO1xuICAgIHRoaXMucHJvcGVydHkoJ3dpZHRoJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0LnZpZXcud2lkdGg7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC52aWV3LndpZHRoID0gdmFsdWU7XG4gICAgfSk7XG4gICAgdGhpcy5wcm9wZXJ0eSgnaGVpZ2h0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0LnZpZXcuaGVpZ2h0O1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQudmlldy5oZWlnaHQgPSB2YWx1ZTtcbiAgICB9KTtcbn07XG51dGlscy5pbmhlcml0KFBvc3RlciwgdXRpbHMuUG9zdGVyQ2xhc3MpO1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLlBvc3RlciA9IFBvc3RlcjtcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKTtcblxuLyoqXG4gKiBBbmltYXRpb24gaGVscGVyLlxuICovXG52YXIgQW5pbWF0b3IgPSBmdW5jdGlvbihkdXJhdGlvbikge1xuICAgIHV0aWxzLlBvc3RlckNsYXNzLmNhbGwodGhpcyk7XG4gICAgdGhpcy5kdXJhdGlvbiA9IGR1cmF0aW9uO1xuICAgIHRoaXMuX3N0YXJ0ID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG59O1xudXRpbHMuaW5oZXJpdChBbmltYXRvciwgdXRpbHMuUG9zdGVyQ2xhc3MpO1xuXG4vKipcbiAqIEdldCB0aGUgdGltZSBpbiB0aGUgYW5pbWF0aW9uXG4gKiBAcmV0dXJuIHtmbG9hdH0gYmV0d2VlbiAwIGFuZCAxXG4gKi9cbkFuaW1hdG9yLnByb3RvdHlwZS50aW1lID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGVsYXBzZWQgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIHRoaXMuX3N0YXJ0O1xuICAgIHJldHVybiAoZWxhcHNlZCAlIHRoaXMuZHVyYXRpb24pIC8gdGhpcy5kdXJhdGlvbjtcbn07XG5cbmV4cG9ydHMuQW5pbWF0b3IgPSBBbmltYXRvcjsiLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xuXG4vKipcbiAqIEhUTUwgY2FudmFzIHdpdGggZHJhd2luZyBjb252aW5pZW5jZSBmdW5jdGlvbnMuXG4gKi9cbnZhciBDYW52YXMgPSBmdW5jdGlvbigpIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMuX2xheW91dCgpO1xuICAgIHRoaXMuX2luaXRfcHJvcGVydGllcygpO1xuXG4gICAgLy8gU2V0IGRlZmF1bHQgc2l6ZS5cbiAgICB0aGlzLndpZHRoID0gNDAwO1xuICAgIHRoaXMuaGVpZ2h0ID0gMzAwO1xufTtcbnV0aWxzLmluaGVyaXQoQ2FudmFzLCB1dGlscy5Qb3N0ZXJDbGFzcyk7XG5cbi8qKlxuICogTGF5b3V0IHRoZSBlbGVtZW50cyBmb3IgdGhlIGNhbnZhcy5cbiAqIENyZWF0ZXMgYHRoaXMuZWxgXG4gKiBcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuX2xheW91dCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2NhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuICAgIHRoaXMuX2NhbnZhcy5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ3Bvc3RlciBoaWRkZW4tY2FudmFzJyk7XG4gICAgdGhpcy5jb250ZXh0ID0gdGhpcy5fY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgICAgIFxuICAgIC8vIFN0cmV0Y2ggdGhlIGltYWdlIGZvciByZXRpbmEgc3VwcG9ydC5cbiAgICB0aGlzLnNjYWxlKDIsMik7XG59O1xuXG4vKipcbiAqIE1ha2UgdGhlIHByb3BlcnRpZXMgb2YgdGhlIGNsYXNzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5faW5pdF9wcm9wZXJ0aWVzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogSGVpZ2h0IG9mIHRoZSBjYW52YXNcbiAgICAgKiBAcmV0dXJuIHtmbG9hdH1cbiAgICAgKi9cbiAgICB0aGlzLnByb3BlcnR5KCdoZWlnaHQnLCBmdW5jdGlvbigpIHsgXG4gICAgICAgIHJldHVybiB0aGF0Ll9jYW52YXMuaGVpZ2h0IC8gMjsgXG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC5fY2FudmFzLnNldEF0dHJpYnV0ZSgnaGVpZ2h0JywgdmFsdWUgKiAyKTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIFdpZHRoIG9mIHRoZSBjYW52YXNcbiAgICAgKiBAcmV0dXJuIHtmbG9hdH1cbiAgICAgKi9cbiAgICB0aGlzLnByb3BlcnR5KCd3aWR0aCcsIGZ1bmN0aW9uKCkgeyBcbiAgICAgICAgcmV0dXJuIHRoYXQuX2NhbnZhcy53aWR0aCAvIDI7IFxuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQuX2NhbnZhcy5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgdmFsdWUgKiAyKTtcbiAgICB9KTtcbn07XG5cbi8qKlxuICogRHJhd3MgYSByZWN0YW5nbGVcbiAqIEBwYXJhbSAge2Zsb2F0fSB4XG4gKiBAcGFyYW0gIHtmbG9hdH0geVxuICogQHBhcmFtICB7ZmxvYXR9IHdpZHRoXG4gKiBAcGFyYW0gIHtmbG9hdH0gaGVpZ2h0XG4gKiBAcGFyYW0gIHtkaWN0aW9uYXJ5fSBvcHRpb25zLCBzZWUgX2FwcGx5X29wdGlvbnMoKSBmb3IgZGV0YWlsc1xuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5kcmF3X3JlY3RhbmdsZSA9IGZ1bmN0aW9uKHgsIHksIHdpZHRoLCBoZWlnaHQsIG9wdGlvbnMpIHtcbiAgICB4ID0gdGhpcy5fdHgoeCk7XG4gICAgeSA9IHRoaXMuX3R5KHkpO1xuICAgIHRoaXMuY29udGV4dC5iZWdpblBhdGgoKTtcbiAgICB0aGlzLmNvbnRleHQucmVjdCh4LCB5LCB3aWR0aCwgaGVpZ2h0KTtcbiAgICB0aGlzLl9kb19kcmF3KG9wdGlvbnMpO1xufTtcblxuLyoqXG4gKiBEcmF3cyBhIGNpcmNsZVxuICogQHBhcmFtICB7ZmxvYXR9IHhcbiAqIEBwYXJhbSAge2Zsb2F0fSB5XG4gKiBAcGFyYW0gIHtmbG9hdH0gclxuICogQHBhcmFtICB7ZGljdGlvbmFyeX0gb3B0aW9ucywgc2VlIF9hcHBseV9vcHRpb25zKCkgZm9yIGRldGFpbHNcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuZHJhd19jaXJjbGUgPSBmdW5jdGlvbih4LCB5LCByLCBvcHRpb25zKSB7XG4gICAgeCA9IHRoaXMuX3R4KHgpO1xuICAgIHkgPSB0aGlzLl90eSh5KTtcbiAgICB0aGlzLmNvbnRleHQuYmVnaW5QYXRoKCk7XG4gICAgdGhpcy5jb250ZXh0LmFyYyh4LCB5LCByLCAwLCAyICogTWF0aC5QSSk7XG4gICAgdGhpcy5fZG9fZHJhdyhvcHRpb25zKTtcbn07XG5cbi8qKlxuICogRHJhd3MgYW4gaW1hZ2VcbiAqIEBwYXJhbSAge2ltZyBlbGVtZW50fSBpbWdcbiAqIEBwYXJhbSAge2Zsb2F0fSB4XG4gKiBAcGFyYW0gIHtmbG9hdH0geVxuICogQHBhcmFtICB7ZmxvYXR9IChvcHRpb25hbCkgd2lkdGhcbiAqIEBwYXJhbSAge2Zsb2F0fSAob3B0aW9uYWwpIGhlaWdodFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5kcmF3X2ltYWdlID0gZnVuY3Rpb24oaW1nLCB4LCB5LCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgeCA9IHRoaXMuX3R4KHgpO1xuICAgIHkgPSB0aGlzLl90eSh5KTtcbiAgICB0aGlzLmNvbnRleHQuZHJhd0ltYWdlKGltZywgeCwgeSwgd2lkdGgsIGhlaWdodCk7XG59O1xuXG4vKipcbiAqIERyYXdzIGEgbGluZVxuICogQHBhcmFtICB7ZmxvYXR9IHgxXG4gKiBAcGFyYW0gIHtmbG9hdH0geTFcbiAqIEBwYXJhbSAge2Zsb2F0fSB4MlxuICogQHBhcmFtICB7ZmxvYXR9IHkyXG4gKiBAcGFyYW0gIHtkaWN0aW9uYXJ5fSBvcHRpb25zLCBzZWUgX2FwcGx5X29wdGlvbnMoKSBmb3IgZGV0YWlsc1xuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5kcmF3X2xpbmUgPSBmdW5jdGlvbih4MSwgeTEsIHgyLCB5Miwgb3B0aW9ucykge1xuICAgIHgxID0gdGhpcy5fdHgoeDEpO1xuICAgIHkxID0gdGhpcy5fdHkoeTEpO1xuICAgIHgyID0gdGhpcy5fdHgoeDIpO1xuICAgIHkyID0gdGhpcy5fdHkoeTIpO1xuICAgIHRoaXMuY29udGV4dC5iZWdpblBhdGgoKTtcbiAgICB0aGlzLmNvbnRleHQubW92ZVRvKHgxLCB5MSk7XG4gICAgdGhpcy5jb250ZXh0LmxpbmVUbyh4MiwgeTIpO1xuICAgIHRoaXMuX2RvX2RyYXcob3B0aW9ucyk7XG59O1xuXG4vKipcbiAqIERyYXdzIGEgcG9seSBsaW5lXG4gKiBAcGFyYW0gIHthcnJheX0gcG9pbnRzIC0gYXJyYXkgb2YgcG9pbnRzLiAgRWFjaCBwb2ludCBpc1xuICogICAgICAgICAgICAgICAgICAgICAgICAgIGFuIGFycmF5IGl0c2VsZiwgb2YgdGhlIGZvcm0gW3gsIHldIFxuICogICAgICAgICAgICAgICAgICAgICAgICAgIHdoZXJlIHggYW5kIHkgYXJlIGZsb2F0aW5nIHBvaW50XG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWVzLlxuICogQHBhcmFtICB7ZGljdGlvbmFyeX0gb3B0aW9ucywgc2VlIF9hcHBseV9vcHRpb25zKCkgZm9yIGRldGFpbHNcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuZHJhd19wb2x5bGluZSA9IGZ1bmN0aW9uKHBvaW50cywgb3B0aW9ucykge1xuICAgIGlmIChwb2ludHMubGVuZ3RoIDwgMikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1BvbHkgbGluZSBtdXN0IGhhdmUgYXRsZWFzdCB0d28gcG9pbnRzLicpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuY29udGV4dC5iZWdpblBhdGgoKTtcbiAgICAgICAgdmFyIHBvaW50ID0gcG9pbnRzWzBdO1xuICAgICAgICB0aGlzLmNvbnRleHQubW92ZVRvKHRoaXMuX3R4KHBvaW50WzBdKSwgdGhpcy5fdHkocG9pbnRbMV0pKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBwb2ludHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHBvaW50ID0gcG9pbnRzW2ldO1xuICAgICAgICAgICAgdGhpcy5jb250ZXh0LmxpbmVUbyh0aGlzLl90eChwb2ludFswXSksIHRoaXMuX3R5KHBvaW50WzFdKSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fZG9fZHJhdyhvcHRpb25zKTsgICAgXG4gICAgfVxufTtcblxuLyoqXG4gKiBEcmF3cyBhIHRleHQgc3RyaW5nXG4gKiBAcGFyYW0gIHtmbG9hdH0geFxuICogQHBhcmFtICB7ZmxvYXR9IHlcbiAqIEBwYXJhbSAge3N0cmluZ30gdGV4dCBzdHJpbmcgb3IgY2FsbGJhY2sgdGhhdCByZXNvbHZlcyB0byBhIHN0cmluZy5cbiAqIEBwYXJhbSAge2RpY3Rpb25hcnl9IG9wdGlvbnMsIHNlZSBfYXBwbHlfb3B0aW9ucygpIGZvciBkZXRhaWxzXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DYW52YXMucHJvdG90eXBlLmRyYXdfdGV4dCA9IGZ1bmN0aW9uKHgsIHksIHRleHQsIG9wdGlvbnMpIHtcbiAgICB4ID0gdGhpcy5fdHgoeCk7XG4gICAgeSA9IHRoaXMuX3R5KHkpO1xuICAgIG9wdGlvbnMgPSB0aGlzLl9hcHBseV9vcHRpb25zKG9wdGlvbnMpO1xuICAgIC8vICdmaWxsJyB0aGUgdGV4dCBieSBkZWZhdWx0IHdoZW4gbmVpdGhlciBhIHN0cm9rZSBvciBmaWxsIFxuICAgIC8vIGlzIGRlZmluZWQuICBPdGhlcndpc2Ugb25seSBmaWxsIGlmIGEgZmlsbCBpcyBkZWZpbmVkLlxuICAgIGlmIChvcHRpb25zLmZpbGwgfHwgIW9wdGlvbnMuc3Ryb2tlKSB7XG4gICAgICAgIHRoaXMuY29udGV4dC5maWxsVGV4dCh0ZXh0LCB4LCB5KTtcbiAgICB9XG4gICAgLy8gT25seSBzdHJva2UgaWYgYSBzdHJva2UgaXMgZGVmaW5lZC5cbiAgICBpZiAob3B0aW9ucy5zdHJva2UpIHtcbiAgICAgICAgdGhpcy5jb250ZXh0LnN0cm9rZVRleHQodGV4dCwgeCwgeSk7ICAgICAgIFxuICAgIH1cbn07XG5cbi8qKlxuICogR2V0J3MgYSBjaHVuayBvZiB0aGUgY2FudmFzIGFzIGEgcmF3IGltYWdlLlxuICogQHBhcmFtICB7ZmxvYXR9IHhcbiAqIEBwYXJhbSAge2Zsb2F0fSB5XG4gKiBAcGFyYW0gIHtmbG9hdH0gd2lkdGhcbiAqIEBwYXJhbSAge2Zsb2F0fSBoZWlnaHRcbiAqIEByZXR1cm4ge2ltYWdlfSBjYW52YXMgaW1hZ2UgZGF0YVxuICovXG5DYW52YXMucHJvdG90eXBlLmdldF9yYXdfaW1hZ2UgPSBmdW5jdGlvbih4LCB5LCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgeCA9IHRoaXMuX3R4KHgpO1xuICAgIHkgPSB0aGlzLl90eSh5KTtcbiAgICAvLyBNdWx0aXBseSBieSB0d28gZm9yIHBpeGVsIGRvdWJsaW5nLlxuICAgIHJldHVybiB0aGlzLmNvbnRleHQuZ2V0SW1hZ2VEYXRhKHgqMiwgeSoyLCB3aWR0aCoyLCBoZWlnaHQqMik7XG59O1xuXG4vKipcbiAqIFB1dCdzIGEgcmF3IGltYWdlIG9uIHRoZSBjYW52YXMgc29tZXdoZXJlLlxuICogQHBhcmFtICB7ZmxvYXR9IHhcbiAqIEBwYXJhbSAge2Zsb2F0fSB5XG4gKiBAcmV0dXJuIHtpbWFnZX0gY2FudmFzIGltYWdlIGRhdGFcbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5wdXRfcmF3X2ltYWdlID0gZnVuY3Rpb24oaW1nLCB4LCB5KSB7XG4gICAgeCA9IHRoaXMuX3R4KHgpO1xuICAgIHkgPSB0aGlzLl90eSh5KTtcbiAgICAvLyBNdWx0aXBseSBieSB0d28gZm9yIHBpeGVsIGRvdWJsaW5nLlxuICAgIHJldHVybiB0aGlzLmNvbnRleHQucHV0SW1hZ2VEYXRhKGltZywgeCoyLCB5KjIpO1xufTtcblxuLyoqXG4gKiBNZWFzdXJlcyB0aGUgd2lkdGggb2YgYSB0ZXh0IHN0cmluZy5cbiAqIEBwYXJhbSAge3N0cmluZ30gdGV4dFxuICogQHBhcmFtICB7ZGljdGlvbmFyeX0gb3B0aW9ucywgc2VlIF9hcHBseV9vcHRpb25zKCkgZm9yIGRldGFpbHNcbiAqIEByZXR1cm4ge2Zsb2F0fSB3aWR0aFxuICovXG5DYW52YXMucHJvdG90eXBlLm1lYXN1cmVfdGV4dCA9IGZ1bmN0aW9uKHRleHQsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gdGhpcy5fYXBwbHlfb3B0aW9ucyhvcHRpb25zKTtcbiAgICByZXR1cm4gdGhpcy5jb250ZXh0Lm1lYXN1cmVUZXh0KHRleHQpLndpZHRoO1xufTtcblxuLyoqXG4gKiBDbGVhcidzIHRoZSBjYW52YXMuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DYW52YXMucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5jb250ZXh0LmNsZWFyUmVjdCgwLCAwLCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCk7XG59O1xuXG4vKipcbiAqIFNjYWxlIHRoZSBjdXJyZW50IGRyYXdpbmcuXG4gKiBAcGFyYW0gIHtmbG9hdH0geFxuICogQHBhcmFtICB7ZmxvYXR9IHlcbiAqIEByZXR1cm4ge251bGx9ICBcbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5zY2FsZSA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICB0aGlzLmNvbnRleHQuc2NhbGUoeCwgeSk7XG59O1xuXG4vKipcbiAqIEZpbmlzaGVzIHRoZSBkcmF3aW5nIG9wZXJhdGlvbiB1c2luZyB0aGUgc2V0IG9mIHByb3ZpZGVkIG9wdGlvbnMuXG4gKiBAcGFyYW0gIHtkaWN0aW9uYXJ5fSAob3B0aW9uYWwpIGRpY3Rpb25hcnkgdGhhdCBcbiAqICByZXNvbHZlcyB0byBhIGRpY3Rpb25hcnkuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DYW52YXMucHJvdG90eXBlLl9kb19kcmF3ID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSB0aGlzLl9hcHBseV9vcHRpb25zKG9wdGlvbnMpO1xuXG4gICAgLy8gT25seSBmaWxsIGlmIGEgZmlsbCBpcyBkZWZpbmVkLlxuICAgIGlmIChvcHRpb25zLmZpbGwpIHtcbiAgICAgICAgdGhpcy5jb250ZXh0LmZpbGwoKTtcbiAgICB9XG4gICAgLy8gU3Ryb2tlIGJ5IGRlZmF1bHQsIGlmIG5vIHN0cm9rZSBvciBmaWxsIGlzIGRlZmluZWQuICBPdGhlcndpc2VcbiAgICAvLyBvbmx5IHN0cm9rZSBpZiBhIHN0cm9rZSBpcyBkZWZpbmVkLlxuICAgIGlmIChvcHRpb25zLnN0cm9rZSB8fCAhb3B0aW9ucy5maWxsKSB7XG4gICAgICAgIHRoaXMuY29udGV4dC5zdHJva2UoKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEFwcGxpZXMgYSBkaWN0aW9uYXJ5IG9mIGRyYXdpbmcgb3B0aW9ucyB0byB0aGUgcGVuLlxuICogQHBhcmFtICB7ZGljdGlvbmFyeX0gb3B0aW9uc1xuICogICAgICBhbHBoYSB7ZmxvYXR9IE9wYWNpdHkgKDAtMSlcbiAqICAgICAgY29tcG9zaXRlX29wZXJhdGlvbiB7c3RyaW5nfSBIb3cgbmV3IGltYWdlcyBhcmUgXG4gKiAgICAgICAgICBkcmF3biBvbnRvIGFuIGV4aXN0aW5nIGltYWdlLiAgUG9zc2libGUgdmFsdWVzXG4gKiAgICAgICAgICBhcmUgYHNvdXJjZS1vdmVyYCwgYHNvdXJjZS1hdG9wYCwgYHNvdXJjZS1pbmAsIFxuICogICAgICAgICAgYHNvdXJjZS1vdXRgLCBgZGVzdGluYXRpb24tb3ZlcmAsIFxuICogICAgICAgICAgYGRlc3RpbmF0aW9uLWF0b3BgLCBgZGVzdGluYXRpb24taW5gLCBcbiAqICAgICAgICAgIGBkZXN0aW5hdGlvbi1vdXRgLCBgbGlnaHRlcmAsIGBjb3B5YCwgb3IgYHhvcmAuXG4gKiAgICAgIGxpbmVfY2FwIHtzdHJpbmd9IEVuZCBjYXAgc3R5bGUgZm9yIGxpbmVzLlxuICogICAgICAgICAgUG9zc2libGUgdmFsdWVzIGFyZSAnYnV0dCcsICdyb3VuZCcsIG9yICdzcXVhcmUnLlxuICogICAgICBsaW5lX2pvaW4ge3N0cmluZ30gSG93IHRvIHJlbmRlciB3aGVyZSB0d28gbGluZXNcbiAqICAgICAgICAgIG1lZXQuICBQb3NzaWJsZSB2YWx1ZXMgYXJlICdiZXZlbCcsICdyb3VuZCcsIG9yXG4gKiAgICAgICAgICAnbWl0ZXInLlxuICogICAgICBsaW5lX3dpZHRoIHtmbG9hdH0gSG93IHRoaWNrIGxpbmVzIGFyZS5cbiAqICAgICAgbGluZV9taXRlcl9saW1pdCB7ZmxvYXR9IE1heCBsZW5ndGggb2YgbWl0ZXJzLlxuICogICAgICBsaW5lX2NvbG9yIHtzdHJpbmd9IENvbG9yIG9mIHRoZSBsaW5lLlxuICogICAgICBmaWxsX2NvbG9yIHtzdHJpbmd9IENvbG9yIHRvIGZpbGwgdGhlIHNoYXBlLlxuICogICAgICBjb2xvciB7c3RyaW5nfSBDb2xvciB0byBzdHJva2UgYW5kIGZpbGwgdGhlIHNoYXBlLlxuICogICAgICAgICAgTG93ZXIgcHJpb3JpdHkgdG8gbGluZV9jb2xvciBhbmQgZmlsbF9jb2xvci5cbiAqICAgICAgZm9udF9zdHlsZSB7c3RyaW5nfVxuICogICAgICBmb250X3ZhcmlhbnQge3N0cmluZ31cbiAqICAgICAgZm9udF93ZWlnaHQge3N0cmluZ31cbiAqICAgICAgZm9udF9zaXplIHtzdHJpbmd9XG4gKiAgICAgIGZvbnRfZmFtaWx5IHtzdHJpbmd9XG4gKiAgICAgIGZvbnQge3N0cmluZ30gT3ZlcnJpZGRlcyBhbGwgb3RoZXIgZm9udCBwcm9wZXJ0aWVzLlxuICogICAgICB0ZXh0X2FsaWduIHtzdHJpbmd9IEhvcml6b250YWwgYWxpZ25tZW50IG9mIHRleHQuICBcbiAqICAgICAgICAgIFBvc3NpYmxlIHZhbHVlcyBhcmUgYHN0YXJ0YCwgYGVuZGAsIGBjZW50ZXJgLFxuICogICAgICAgICAgYGxlZnRgLCBvciBgcmlnaHRgLlxuICogICAgICB0ZXh0X2Jhc2VsaW5lIHtzdHJpbmd9IFZlcnRpY2FsIGFsaWdubWVudCBvZiB0ZXh0LlxuICogICAgICAgICAgUG9zc2libGUgdmFsdWVzIGFyZSBgYWxwaGFiZXRpY2AsIGB0b3BgLCBcbiAqICAgICAgICAgIGBoYW5naW5nYCwgYG1pZGRsZWAsIGBpZGVvZ3JhcGhpY2AsIG9yIFxuICogICAgICAgICAgYGJvdHRvbWAuXG4gKiBAcmV0dXJuIHtkaWN0aW9uYXJ5fSBvcHRpb25zLCByZXNvbHZlZC5cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5fYXBwbHlfb3B0aW9ucyA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICBvcHRpb25zID0gdXRpbHMucmVzb2x2ZV9jYWxsYWJsZShvcHRpb25zKTtcblxuICAgIC8vIFNwZWNpYWwgb3B0aW9ucy5cbiAgICB0aGlzLmNvbnRleHQuZ2xvYmFsQWxwaGEgPSBvcHRpb25zLmFscGhhIHx8IDEuMDtcbiAgICB0aGlzLmNvbnRleHQuZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uID0gb3B0aW9ucy5jb21wb3NpdGVfb3BlcmF0aW9uIHx8ICdzb3VyY2Utb3Zlcic7XG4gICAgXG4gICAgLy8gTGluZSBzdHlsZS5cbiAgICB0aGlzLmNvbnRleHQubGluZUNhcCA9IG9wdGlvbnMubGluZV9jYXAgfHwgJ2J1dHQnO1xuICAgIHRoaXMuY29udGV4dC5saW5lSm9pbiA9IG9wdGlvbnMubGluZV9qb2luIHx8ICdiZXZlbCc7XG4gICAgdGhpcy5jb250ZXh0LmxpbmVXaWR0aCA9IG9wdGlvbnMubGluZV93aWR0aCB8fCAxLjA7XG4gICAgdGhpcy5jb250ZXh0Lm1pdGVyTGltaXQgPSBvcHRpb25zLmxpbmVfbWl0ZXJfbGltaXQgfHwgMTA7XG4gICAgdGhpcy5jb250ZXh0LnN0cm9rZVN0eWxlID0gb3B0aW9ucy5saW5lX2NvbG9yIHx8IG9wdGlvbnMuY29sb3IgfHwgJ2JsYWNrJzsgLy8gVE9ETzogU3VwcG9ydCBncmFkaWVudFxuICAgIG9wdGlvbnMuc3Ryb2tlID0gKG9wdGlvbnMubGluZV9jb2xvciAhPT0gdW5kZWZpbmVkIHx8IG9wdGlvbnMubGluZV93aWR0aCAhPT0gdW5kZWZpbmVkKTtcblxuICAgIC8vIEZpbGwgc3R5bGUuXG4gICAgdGhpcy5jb250ZXh0LmZpbGxTdHlsZSA9IG9wdGlvbnMuZmlsbF9jb2xvciB8fCBvcHRpb25zLmNvbG9yIHx8ICdibGFjayc7IC8vIFRPRE86IFN1cHBvcnQgZ3JhZGllbnRcbiAgICBvcHRpb25zLmZpbGwgPSBvcHRpb25zLmZpbGxfY29sb3IgIT09IHVuZGVmaW5lZDtcblxuICAgIC8vIEZvbnQgc3R5bGUuXG4gICAgdmFyIGZvbnRfc3R5bGUgPSBvcHRpb25zLmZvbnRfc3R5bGUgfHwgJyc7XG4gICAgdmFyIGZvbnRfdmFyaWFudCA9IG9wdGlvbnMuZm9udF92YXJpYW50IHx8ICcnO1xuICAgIHZhciBmb250X3dlaWdodCA9IG9wdGlvbnMuZm9udF93ZWlnaHQgfHwgJyc7XG4gICAgdmFyIGZvbnRfc2l6ZSA9IG9wdGlvbnMuZm9udF9zaXplIHx8ICcxMnB0JztcbiAgICB2YXIgZm9udF9mYW1pbHkgPSBvcHRpb25zLmZvbnRfZmFtaWx5IHx8ICdBcmlhbCc7XG4gICAgdmFyIGZvbnQgPSBmb250X3N0eWxlICsgJyAnICsgZm9udF92YXJpYW50ICsgJyAnICsgZm9udF93ZWlnaHQgKyAnICcgKyBmb250X3NpemUgKyAnICcgKyBmb250X2ZhbWlseTtcbiAgICB0aGlzLmNvbnRleHQuZm9udCA9IG9wdGlvbnMuZm9udCB8fCBmb250O1xuXG4gICAgLy8gVGV4dCBzdHlsZS5cbiAgICB0aGlzLmNvbnRleHQudGV4dEFsaWduID0gb3B0aW9ucy50ZXh0X2FsaWduIHx8ICdsZWZ0JztcbiAgICB0aGlzLmNvbnRleHQudGV4dEJhc2VsaW5lID0gb3B0aW9ucy50ZXh0X2Jhc2VsaW5lIHx8ICd0b3AnO1xuXG4gICAgLy8gVE9ETzogU3VwcG9ydCBzaGFkb3dzLlxuXG4gICAgcmV0dXJuIG9wdGlvbnM7XG59O1xuXG4vKipcbiAqIFRyYW5zZm9ybSBhbiB4IHZhbHVlIGJlZm9yZSByZW5kZXJpbmcuXG4gKiBAcGFyYW0gIHtmbG9hdH0geFxuICogQHJldHVybiB7ZmxvYXR9XG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuX3R4ID0gZnVuY3Rpb24oeCkgeyByZXR1cm4geDsgfTtcblxuLyoqXG4gKiBUcmFuc2Zvcm0gYSB5IHZhbHVlIGJlZm9yZSByZW5kZXJpbmcuXG4gKiBAcGFyYW0gIHtmbG9hdH0geVxuICogQHJldHVybiB7ZmxvYXR9XG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuX3R5ID0gZnVuY3Rpb24oeSkgeyByZXR1cm4geTsgfTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5DYW52YXMgPSBDYW52YXM7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG5cbi8qKlxuICogRXZlbnRmdWwgY2xpcGJvYXJkIHN1cHBvcnRcbiAqXG4gKiBXQVJOSU5HOiAgVGhpcyBjbGFzcyBpcyBhIGh1ZGdlIGtsdWRnZSB0aGF0IHdvcmtzIGFyb3VuZCB0aGUgcHJlaGlzdG9yaWNcbiAqIGNsaXBib2FyZCBzdXBwb3J0IChsYWNrIHRoZXJlb2YpIGluIG1vZGVybiB3ZWJyb3dzZXJzLiAgSXQgY3JlYXRlcyBhIGhpZGRlblxuICogdGV4dGJveCB3aGljaCBpcyBmb2N1c2VkLiAgVGhlIHByb2dyYW1tZXIgbXVzdCBjYWxsIGBzZXRfY2xpcHBhYmxlYCB0byBjaGFuZ2VcbiAqIHdoYXQgd2lsbCBiZSBjb3BpZWQgd2hlbiB0aGUgdXNlciBoaXRzIGtleXMgY29ycmVzcG9uZGluZyB0byBhIGNvcHkgXG4gKiBvcGVyYXRpb24uICBFdmVudHMgYGNvcHlgLCBgY3V0YCwgYW5kIGBwYXN0ZWAgYXJlIHJhaXNlZCBieSB0aGlzIGNsYXNzLlxuICovXG52YXIgQ2xpcGJvYXJkID0gZnVuY3Rpb24oZWwpIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMuX2VsID0gZWw7XG5cbiAgICAvLyBDcmVhdGUgYSB0ZXh0Ym94IHRoYXQncyBoaWRkZW4uXG4gICAgdGhpcy5oaWRkZW5faW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZXh0YXJlYScpO1xuICAgIHRoaXMuaGlkZGVuX2lucHV0LnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAncG9zdGVyIGhpZGRlbi1jbGlwYm9hcmQnKTtcbiAgICBlbC5hcHBlbmRDaGlsZCh0aGlzLmhpZGRlbl9pbnB1dCk7XG5cbiAgICB0aGlzLl9iaW5kX2V2ZW50cygpO1xufTtcbnV0aWxzLmluaGVyaXQoQ2xpcGJvYXJkLCB1dGlscy5Qb3N0ZXJDbGFzcyk7XG5cbi8qKlxuICogU2V0IHdoYXQgd2lsbCBiZSBjb3BpZWQgd2hlbiB0aGUgdXNlciBjb3BpZXMuXG4gKiBAcGFyYW0ge3N0cmluZ30gdGV4dFxuICovXG5DbGlwYm9hcmQucHJvdG90eXBlLnNldF9jbGlwcGFibGUgPSBmdW5jdGlvbih0ZXh0KSB7XG4gICAgdGhpcy5fY2xpcHBhYmxlID0gdGV4dDtcbiAgICB0aGlzLmhpZGRlbl9pbnB1dC52YWx1ZSA9IHRoaXMuX2NsaXBwYWJsZTtcbiAgICB0aGlzLl9mb2N1cygpO1xufTsgXG5cbi8qKlxuICogRm9jdXMgdGhlIGhpZGRlbiB0ZXh0IGFyZWEuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DbGlwYm9hcmQucHJvdG90eXBlLl9mb2N1cyA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuaGlkZGVuX2lucHV0LmZvY3VzKCk7XG4gICAgdGhpcy5oaWRkZW5faW5wdXQuc2VsZWN0KCk7XG59O1xuXG4vKipcbiAqIEhhbmRsZSB3aGVuIHRoZSB1c2VyIHBhc3RlcyBpbnRvIHRoZSB0ZXh0Ym94LlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ2xpcGJvYXJkLnByb3RvdHlwZS5faGFuZGxlX3Bhc3RlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoYXQudHJpZ2dlcigncGFzdGUnLCB0aGF0LmhpZGRlbl9pbnB1dC52YWx1ZSk7XG4gICAgICAgIHRoYXQuaGlkZGVuX2lucHV0LnZhbHVlID0gdGhhdC5fY2xpcHBhYmxlO1xuICAgICAgICB0aGF0Ll9mb2N1cygpO1xuICAgIH0sIDApO1xufTtcblxuLyoqXG4gKiBCaW5kIGV2ZW50cyBvZiB0aGUgaGlkZGVuIHRleHRib3guXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DbGlwYm9hcmQucHJvdG90eXBlLl9iaW5kX2V2ZW50cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcblxuICAgIC8vIExpc3RlbiB0byBlbCdzIGZvY3VzIGV2ZW50LiAgSWYgZWwgaXMgZm9jdXNlZCwgZm9jdXMgdGhlIGhpZGRlbiBpbnB1dFxuICAgIC8vIGluc3RlYWQuXG4gICAgdXRpbHMuaG9vayh0aGlzLl9lbCwgJ29uZm9jdXMnLCB1dGlscy5wcm94eSh0aGlzLl9mb2N1cywgdGhpcykpO1xuXG4gICAgdXRpbHMuaG9vayh0aGlzLmhpZGRlbl9pbnB1dCwgJ29ucGFzdGUnLCB1dGlscy5wcm94eSh0aGlzLl9oYW5kbGVfcGFzdGUsIHRoaXMpKTtcbiAgICB1dGlscy5ob29rKHRoaXMuaGlkZGVuX2lucHV0LCAnb25jdXQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gVHJpZ2dlciB0aGUgZXZlbnQgaW4gYSB0aW1lb3V0IHNvIGl0IGZpcmVzIGFmdGVyIHRoZSBzeXN0ZW0gZXZlbnQuXG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHRoYXQudHJpZ2dlcignY3V0JywgdGhhdC5fY2xpcHBhYmxlKTtcbiAgICAgICAgfSwgMCk7XG4gICAgfSk7XG4gICAgdXRpbHMuaG9vayh0aGlzLmhpZGRlbl9pbnB1dCwgJ29uY29weScsIGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGF0LnRyaWdnZXIoJ2NvcHknLCB0aGF0Ll9jbGlwcGFibGUpO1xuICAgIH0pO1xuICAgIHV0aWxzLmhvb2sodGhpcy5oaWRkZW5faW5wdXQsICdvbmtleXByZXNzJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0aGF0LmhpZGRlbl9pbnB1dC52YWx1ZSA9IHRoYXQuX2NsaXBwYWJsZTtcbiAgICAgICAgICAgIHRoYXQuX2ZvY3VzKCk7XG4gICAgICAgIH0sIDApO1xuICAgIH0pO1xuICAgIHV0aWxzLmhvb2sodGhpcy5oaWRkZW5faW5wdXQsICdvbmtleXVwJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0aGF0LmhpZGRlbl9pbnB1dC52YWx1ZSA9IHRoYXQuX2NsaXBwYWJsZTtcbiAgICAgICAgICAgIHRoYXQuX2ZvY3VzKCk7XG4gICAgICAgIH0sIDApO1xuICAgIH0pO1xufTtcblxuZXhwb3J0cy5DbGlwYm9hcmQgPSBDbGlwYm9hcmQ7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxudmFyIGtleW1hcCA9IHJlcXVpcmUoJy4vZXZlbnRzL21hcC5qcycpO1xudmFyIHJlZ2lzdGVyID0ga2V5bWFwLk1hcC5yZWdpc3RlcjtcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xuXG4vKipcbiAqIElucHV0IGN1cnNvci5cbiAqL1xudmFyIEN1cnNvciA9IGZ1bmN0aW9uKG1vZGVsKSB7XG4gICAgdXRpbHMuUG9zdGVyQ2xhc3MuY2FsbCh0aGlzKTtcbiAgICB0aGlzLl9tb2RlbCA9IG1vZGVsO1xuXG4gICAgdGhpcy5wcmltYXJ5X3JvdyA9IG51bGw7XG4gICAgdGhpcy5wcmltYXJ5X2NoYXIgPSBudWxsO1xuICAgIHRoaXMuc2Vjb25kYXJ5X3JvdyA9IG51bGw7XG4gICAgdGhpcy5zZWNvbmRhcnlfY2hhciA9IG51bGw7XG5cbiAgICB0aGlzLl9pbml0X3Byb3BlcnRpZXMoKTtcbiAgICB0aGlzLl9yZWdpc3Rlcl9hcGkoKTtcbn07XG51dGlscy5pbmhlcml0KEN1cnNvciwgdXRpbHMuUG9zdGVyQ2xhc3MpO1xuXG4vKipcbiAqIE1vdmVzIHRoZSBwcmltYXJ5IGN1cnNvciBhIGdpdmVuIG9mZnNldC5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IHhcbiAqIEBwYXJhbSAge2ludGVnZXJ9IHlcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvci5wcm90b3R5cGUubW92ZV9wcmltYXJ5ID0gZnVuY3Rpb24oeCwgeSkge1xuICAgIGlmICh4IDwgMCkge1xuICAgICAgICBpZiAodGhpcy5wcmltYXJ5X2NoYXIgKyB4IDwgMCkge1xuICAgICAgICAgICAgaWYgKHRoaXMucHJpbWFyeV9yb3cgPT09IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLnByaW1hcnlfY2hhciA9IDA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMucHJpbWFyeV9yb3cgLT0gMTtcbiAgICAgICAgICAgICAgICB0aGlzLnByaW1hcnlfY2hhciA9IHRoaXMuX21vZGVsLl9yb3dzW3RoaXMucHJpbWFyeV9yb3ddLmxlbmd0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMucHJpbWFyeV9jaGFyICs9IHg7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHggPiAwKSB7XG4gICAgICAgIGlmICh0aGlzLnByaW1hcnlfY2hhciArIHggPiB0aGlzLl9tb2RlbC5fcm93c1t0aGlzLnByaW1hcnlfcm93XS5sZW5ndGgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnByaW1hcnlfcm93ID09PSB0aGlzLl9tb2RlbC5fcm93cy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wcmltYXJ5X2NoYXIgPSB0aGlzLl9tb2RlbC5fcm93c1t0aGlzLnByaW1hcnlfcm93XS5sZW5ndGg7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMucHJpbWFyeV9yb3cgKz0gMTtcbiAgICAgICAgICAgICAgICB0aGlzLnByaW1hcnlfY2hhciA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnByaW1hcnlfY2hhciArPSB4O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gUmVtZW1iZXIgdGhlIGNoYXJhY3RlciBwb3NpdGlvbiwgdmVydGljYWwgbmF2aWdhdGlvbiBhY3Jvc3MgZW1wdHkgbGluZXNcbiAgICAvLyBzaG91bGRuJ3QgY2F1c2UgdGhlIGhvcml6b250YWwgcG9zaXRpb24gdG8gYmUgbG9zdC5cbiAgICBpZiAoeCAhPT0gMCkge1xuICAgICAgICB0aGlzLl9tZW1vcnlfY2hhciA9IHRoaXMucHJpbWFyeV9jaGFyO1xuICAgIH1cblxuICAgIGlmICh5ICE9PSAwKSB7XG4gICAgICAgIHRoaXMucHJpbWFyeV9yb3cgKz0geTtcbiAgICAgICAgdGhpcy5wcmltYXJ5X3JvdyA9IE1hdGgubWluKE1hdGgubWF4KHRoaXMucHJpbWFyeV9yb3csIDApLCB0aGlzLl9tb2RlbC5fcm93cy5sZW5ndGgpO1xuICAgICAgICBpZiAodGhpcy5fbWVtb3J5X2NoYXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhpcy5wcmltYXJ5X2NoYXIgPSB0aGlzLl9tZW1vcnlfY2hhcjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5wcmltYXJ5X2NoYXIgPiB0aGlzLl9tb2RlbC5fcm93c1t0aGlzLnByaW1hcnlfcm93XS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMucHJpbWFyeV9jaGFyID0gdGhpcy5fbW9kZWwuX3Jvd3NbdGhpcy5wcmltYXJ5X3Jvd10ubGVuZ3RoO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2UnKTsgXG59O1xuXG4vKipcbiAqIFdhbGsgdGhlIHByaW1hcnkgY3Vyc29yIGluIGEgZGlyZWN0aW9uIHVudGlsIGEgbm90LXRleHQgY2hhcmFjdGVyIGlzIGZvdW5kLlxuICogQHBhcmFtICB7aW50ZWdlcn0gZGlyZWN0aW9uXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3IucHJvdG90eXBlLndvcmRfcHJpbWFyeSA9IGZ1bmN0aW9uKGRpcmVjdGlvbikge1xuICAgIC8vIE1ha2Ugc3VyZSBkaXJlY3Rpb24gaXMgMSBvciAtMS5cbiAgICBkaXJlY3Rpb24gPSBkaXJlY3Rpb24gPCAwID8gLTEgOiAxO1xuXG4gICAgLy8gSWYgbW92aW5nIGxlZnQgYW5kIGF0IGVuZCBvZiByb3csIG1vdmUgdXAgYSByb3cgaWYgcG9zc2libGUuXG4gICAgaWYgKHRoaXMucHJpbWFyeV9jaGFyID09PSAwICYmIGRpcmVjdGlvbiA9PSAtMSkge1xuICAgICAgICBpZiAodGhpcy5wcmltYXJ5X3JvdyAhPT0gMCkge1xuICAgICAgICAgICAgdGhpcy5wcmltYXJ5X3Jvdy0tO1xuICAgICAgICAgICAgdGhpcy5wcmltYXJ5X2NoYXIgPSB0aGlzLl9tb2RlbC5fcm93c1t0aGlzLnByaW1hcnlfcm93XS5sZW5ndGg7XG4gICAgICAgICAgICB0aGlzLl9tZW1vcnlfY2hhciA9IHRoaXMucHJpbWFyeV9jaGFyO1xuICAgICAgICAgICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2UnKTsgXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIElmIG1vdmluZyByaWdodCBhbmQgYXQgZW5kIG9mIHJvdywgbW92ZSBkb3duIGEgcm93IGlmIHBvc3NpYmxlLlxuICAgIGlmICh0aGlzLnByaW1hcnlfY2hhciA+PSB0aGlzLl9tb2RlbC5fcm93c1t0aGlzLnByaW1hcnlfcm93XS5sZW5ndGggJiYgZGlyZWN0aW9uID09IDEpIHtcbiAgICAgICAgaWYgKHRoaXMucHJpbWFyeV9yb3cgPCB0aGlzLl9tb2RlbC5fcm93cy5sZW5ndGgtMSkge1xuICAgICAgICAgICAgdGhpcy5wcmltYXJ5X3JvdysrO1xuICAgICAgICAgICAgdGhpcy5wcmltYXJ5X2NoYXIgPSAwO1xuICAgICAgICAgICAgdGhpcy5fbWVtb3J5X2NoYXIgPSB0aGlzLnByaW1hcnlfY2hhcjtcbiAgICAgICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7IFxuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgaSA9IHRoaXMucHJpbWFyeV9jaGFyO1xuICAgIHZhciBoaXRfdGV4dCA9IGZhbHNlO1xuICAgIHZhciByb3dfdGV4dCA9IHRoaXMuX21vZGVsLl9yb3dzW3RoaXMucHJpbWFyeV9yb3ddO1xuICAgIGlmIChkaXJlY3Rpb24gPT0gLTEpIHtcbiAgICAgICAgd2hpbGUgKDAgPCBpICYmICEoaGl0X3RleHQgJiYgdGhpcy5fbm90X3RleHQocm93X3RleHRbaS0xXSkpKSB7XG4gICAgICAgICAgICBoaXRfdGV4dCA9IGhpdF90ZXh0IHx8ICF0aGlzLl9ub3RfdGV4dChyb3dfdGV4dFtpLTFdKTtcbiAgICAgICAgICAgIGkgKz0gZGlyZWN0aW9uO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgd2hpbGUgKGkgPCByb3dfdGV4dC5sZW5ndGggJiYgIShoaXRfdGV4dCAmJiB0aGlzLl9ub3RfdGV4dChyb3dfdGV4dFtpXSkpKSB7XG4gICAgICAgICAgICBoaXRfdGV4dCA9IGhpdF90ZXh0IHx8ICF0aGlzLl9ub3RfdGV4dChyb3dfdGV4dFtpXSk7XG4gICAgICAgICAgICBpICs9IGRpcmVjdGlvbjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMucHJpbWFyeV9jaGFyID0gaTtcbiAgICB0aGlzLl9tZW1vcnlfY2hhciA9IHRoaXMucHJpbWFyeV9jaGFyO1xuICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7IFxufTtcblxuLyoqXG4gKiBTZXQgdGhlIHByaW1hcnkgY3Vyc29yIHBvc2l0aW9uXG4gKiBAcGFyYW0ge2ludGVnZXJ9IHJvd19pbmRleFxuICogQHBhcmFtIHtpbnRlZ2VyfSBjaGFyX2luZGV4XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuc2V0X3ByaW1hcnkgPSBmdW5jdGlvbihyb3dfaW5kZXgsIGNoYXJfaW5kZXgpIHtcbiAgICB0aGlzLnByaW1hcnlfcm93ID0gcm93X2luZGV4O1xuICAgIHRoaXMucHJpbWFyeV9jaGFyID0gY2hhcl9pbmRleDtcblxuICAgIC8vIFJlbWVtYmVyIHRoZSBjaGFyYWN0ZXIgcG9zaXRpb24sIHZlcnRpY2FsIG5hdmlnYXRpb24gYWNyb3NzIGVtcHR5IGxpbmVzXG4gICAgLy8gc2hvdWxkbid0IGNhdXNlIHRoZSBob3Jpem9udGFsIHBvc2l0aW9uIHRvIGJlIGxvc3QuXG4gICAgdGhpcy5fbWVtb3J5X2NoYXIgPSB0aGlzLnByaW1hcnlfY2hhcjtcblxuICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7IFxufTtcblxuLyoqXG4gKiBTZXQgdGhlIHNlY29uZGFyeSBjdXJzb3IgcG9zaXRpb25cbiAqIEBwYXJhbSB7aW50ZWdlcn0gcm93X2luZGV4XG4gKiBAcGFyYW0ge2ludGVnZXJ9IGNoYXJfaW5kZXhcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5zZXRfc2Vjb25kYXJ5ID0gZnVuY3Rpb24ocm93X2luZGV4LCBjaGFyX2luZGV4KSB7XG4gICAgdGhpcy5zZWNvbmRhcnlfcm93ID0gcm93X2luZGV4O1xuICAgIHRoaXMuc2Vjb25kYXJ5X2NoYXIgPSBjaGFyX2luZGV4OyAgICBcbiAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZScpOyBcbn07XG5cbi8qKlxuICogSGFuZGxlcyB3aGVuIGEga2V5IGlzIHByZXNzZWQuXG4gKiBAcGFyYW0gIHtFdmVudH0gZSAtIG9yaWdpbmFsIGtleSBwcmVzcyBldmVudC5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvci5wcm90b3R5cGUua2V5cHJlc3MgPSBmdW5jdGlvbihlKSB7XG4gICAgdmFyIGNoYXJfY29kZSA9IGUud2hpY2ggfHwgZS5rZXlDb2RlO1xuICAgIHZhciBjaGFyX3R5cGVkID0gU3RyaW5nLmZyb21DaGFyQ29kZShjaGFyX2NvZGUpO1xuICAgIHRoaXMucmVtb3ZlX3NlbGVjdGVkKCk7XG4gICAgdGhpcy5fbW9kZWwuYWRkX3RleHQodGhpcy5wcmltYXJ5X3JvdywgdGhpcy5wcmltYXJ5X2NoYXIsIGNoYXJfdHlwZWQpO1xuICAgIHRoaXMubW92ZV9wcmltYXJ5KDEsIDApO1xuICAgIHRoaXMuX3Jlc2V0X3NlY29uZGFyeSgpO1xuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBJbnNlcnQgYSBuZXdsaW5lXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3IucHJvdG90eXBlLm5ld2xpbmUgPSBmdW5jdGlvbihlKSB7XG4gICAgdGhpcy5yZW1vdmVfc2VsZWN0ZWQoKTtcbiAgICB0aGlzLl9tb2RlbC5hZGRfdGV4dCh0aGlzLnByaW1hcnlfcm93LCB0aGlzLnByaW1hcnlfY2hhciwgJ1xcbicpO1xuICAgIHRoaXMubW92ZV9wcmltYXJ5KDAsIDEpO1xuICAgIHRoaXMuX3Jlc2V0X3NlY29uZGFyeSgpO1xuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBJbnNlcnQgdGV4dFxuICogQHBhcmFtICB7c3RyaW5nfSB0ZXh0XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3IucHJvdG90eXBlLmluc2VydF90ZXh0ID0gZnVuY3Rpb24odGV4dCkge1xuICAgIHRoaXMucmVtb3ZlX3NlbGVjdGVkKCk7XG4gICAgdGhpcy5fbW9kZWwuYWRkX3RleHQodGhpcy5wcmltYXJ5X3JvdywgdGhpcy5wcmltYXJ5X2NoYXIsIHRleHQpO1xuICAgIFxuICAgIC8vIE1vdmUgY3Vyc29yIHRvIHRoZSBlbmQuXG4gICAgaWYgKHRleHQuaW5kZXhPZignXFxuJyk9PS0xKSB7XG4gICAgICAgIHRoaXMucHJpbWFyeV9jaGFyID0gdGhpcy5zdGFydF9jaGFyICsgdGV4dC5sZW5ndGg7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGxpbmVzID0gdGV4dC5zcGxpdCgnXFxuJyk7XG4gICAgICAgIHRoaXMucHJpbWFyeV9yb3cgKz0gbGluZXMubGVuZ3RoIC0gMTtcbiAgICAgICAgdGhpcy5wcmltYXJ5X2NoYXIgPSBsaW5lc1tsaW5lcy5sZW5ndGgtMV0ubGVuZ3RoO1xuICAgIH1cbiAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZScpOyBcblxuICAgIHRoaXMuX3Jlc2V0X3NlY29uZGFyeSgpO1xuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgdGhlIHNlbGVjdGVkIHRleHRcbiAqIEByZXR1cm4ge2Jvb2xlYW59IHRydWUgaWYgdGV4dCB3YXMgcmVtb3ZlZC5cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5yZW1vdmVfc2VsZWN0ZWQgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5wcmltYXJ5X3JvdyAhPT0gdGhpcy5zZWNvbmRhcnlfcm93IHx8IHRoaXMucHJpbWFyeV9jaGFyICE9PSB0aGlzLnNlY29uZGFyeV9jaGFyKSB7XG4gICAgICAgIHZhciByb3dfaW5kZXggPSB0aGlzLnN0YXJ0X3JvdztcbiAgICAgICAgdmFyIGNoYXJfaW5kZXggPSB0aGlzLnN0YXJ0X2NoYXI7XG4gICAgICAgIHRoaXMuX21vZGVsLnJlbW92ZV90ZXh0KHRoaXMuc3RhcnRfcm93LCB0aGlzLnN0YXJ0X2NoYXIsIHRoaXMuZW5kX3JvdywgdGhpcy5lbmRfY2hhcik7XG4gICAgICAgIHRoaXMucHJpbWFyeV9yb3cgPSByb3dfaW5kZXg7XG4gICAgICAgIHRoaXMucHJpbWFyeV9jaGFyID0gY2hhcl9pbmRleDtcbiAgICAgICAgdGhpcy5fcmVzZXRfc2Vjb25kYXJ5KCk7XG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7IFxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufTtcblxuLyoqXG4gKiBDb3BpZXMgdGhlIHNlbGVjdGVkIHRleHQuXG4gKiBAcmV0dXJuIHtzdHJpbmd9IHNlbGVjdGVkIHRleHRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5jb3B5ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX21vZGVsLmdldF90ZXh0KHRoaXMuc3RhcnRfcm93LCB0aGlzLnN0YXJ0X2NoYXIsIHRoaXMuZW5kX3JvdywgdGhpcy5lbmRfY2hhcik7XG59O1xuXG4vKipcbiAqIEN1dHMgdGhlIHNlbGVjdGVkIHRleHQuXG4gKiBAcmV0dXJuIHtzdHJpbmd9IHNlbGVjdGVkIHRleHRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5jdXQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGV4dCA9IHRoaXMuY29weSgpO1xuICAgIHRoaXMucmVtb3ZlX3NlbGVjdGVkKCk7XG4gICAgcmV0dXJuIHRleHQ7XG59O1xuXG4vKipcbiAqIFJlc2V0IHRoZSBzZWNvbmRhcnkgY3Vyc29yIHRvIHRoZSB2YWx1ZSBvZiB0aGUgcHJpbWFyeS5cbiAqIEByZXR1cm4ge1t0eXBlXX0gW2Rlc2NyaXB0aW9uXVxuICovXG5DdXJzb3IucHJvdG90eXBlLl9yZXNldF9zZWNvbmRhcnkgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnNlY29uZGFyeV9yb3cgPSB0aGlzLnByaW1hcnlfcm93O1xuICAgIHRoaXMuc2Vjb25kYXJ5X2NoYXIgPSB0aGlzLnByaW1hcnlfY2hhcjtcblxuICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7IFxufTtcblxuLyoqXG4gKiBDcmVhdGUgdGhlIHByb3BlcnRpZXMgb2YgdGhlIGN1cnNvci5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuX2luaXRfcHJvcGVydGllcyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLnByb3BlcnR5KCdzdGFydF9yb3cnLCBmdW5jdGlvbigpIHsgcmV0dXJuIE1hdGgubWluKHRoYXQucHJpbWFyeV9yb3csIHRoYXQuc2Vjb25kYXJ5X3Jvdyk7IH0pO1xuICAgIHRoaXMucHJvcGVydHkoJ2VuZF9yb3cnLCBmdW5jdGlvbigpIHsgcmV0dXJuIE1hdGgubWF4KHRoYXQucHJpbWFyeV9yb3csIHRoYXQuc2Vjb25kYXJ5X3Jvdyk7IH0pO1xuICAgIHRoaXMucHJvcGVydHkoJ3N0YXJ0X2NoYXInLCBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHRoYXQucHJpbWFyeV9yb3cgPCB0aGF0LnNlY29uZGFyeV9yb3cgfHwgKHRoYXQucHJpbWFyeV9yb3cgPT0gdGhhdC5zZWNvbmRhcnlfcm93ICYmIHRoYXQucHJpbWFyeV9jaGFyIDw9IHRoYXQuc2Vjb25kYXJ5X2NoYXIpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhhdC5wcmltYXJ5X2NoYXI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhhdC5zZWNvbmRhcnlfY2hhcjtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHRoaXMucHJvcGVydHkoJ2VuZF9jaGFyJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0aGF0LnByaW1hcnlfcm93IDwgdGhhdC5zZWNvbmRhcnlfcm93IHx8ICh0aGF0LnByaW1hcnlfcm93ID09IHRoYXQuc2Vjb25kYXJ5X3JvdyAmJiB0aGF0LnByaW1hcnlfY2hhciA8PSB0aGF0LnNlY29uZGFyeV9jaGFyKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoYXQuc2Vjb25kYXJ5X2NoYXI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhhdC5wcmltYXJ5X2NoYXI7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cbi8qKlxuICogQ2hlY2tzIGlmIHRoZSBjaGFyYWN0ZXIgaXNuJ3QgdGV4dC5cbiAqIEBwYXJhbSAge2NoYXJ9IGMgLSBjaGFyYWN0ZXJcbiAqIEByZXR1cm4ge2Jvb2xlYW59IHRydWUgaWYgdGhlIGNoYXJhY3RlciBpcyBub3QgdGV4dC5cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5fbm90X3RleHQgPSBmdW5jdGlvbihjKSB7XG4gICAgcmV0dXJuICdhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejEyMzQ1Njc4OTAnLmluZGV4T2YoYy50b0xvd2VyQ2FzZSgpKSA9PSAtMTtcbn07XG5cbi8qKlxuICogUmVnaXN0ZXJzIGFuIGFjdGlvbiBBUEkgd2l0aCB0aGUgbWFwXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3IucHJvdG90eXBlLl9yZWdpc3Rlcl9hcGkgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5yZW1vdmVfc2VsZWN0ZWQnLCB1dGlscy5wcm94eSh0aGlzLnJlbW92ZV9zZWxlY3RlZCwgdGhpcyksIHRoaXMpO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3Iua2V5cHJlc3MnLCB1dGlscy5wcm94eSh0aGlzLmtleXByZXNzLCB0aGlzKSwgdGhpcyk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5uZXdsaW5lJywgdXRpbHMucHJveHkodGhpcy5uZXdsaW5lLCB0aGlzKSwgdGhpcyk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5pbnNlcnRfdGV4dCcsIHV0aWxzLnByb3h5KHRoaXMuaW5zZXJ0X3RleHQsIHRoaXMpLCB0aGlzKTtcbiAgICByZWdpc3RlcignY3Vyc29yLmxlZnQnLCBmdW5jdGlvbigpIHsgdGhhdC5tb3ZlX3ByaW1hcnkoLTEsIDApOyB0aGF0Ll9yZXNldF9zZWNvbmRhcnkoKTsgcmV0dXJuIHRydWU7IH0pO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3IucmlnaHQnLCBmdW5jdGlvbigpIHsgdGhhdC5tb3ZlX3ByaW1hcnkoMSwgMCk7IHRoYXQuX3Jlc2V0X3NlY29uZGFyeSgpOyByZXR1cm4gdHJ1ZTsgfSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci51cCcsIGZ1bmN0aW9uKCkgeyB0aGF0Lm1vdmVfcHJpbWFyeSgwLCAtMSk7IHRoYXQuX3Jlc2V0X3NlY29uZGFyeSgpOyByZXR1cm4gdHJ1ZTsgfSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5kb3duJywgZnVuY3Rpb24oKSB7IHRoYXQubW92ZV9wcmltYXJ5KDAsIDEpOyB0aGF0Ll9yZXNldF9zZWNvbmRhcnkoKTsgcmV0dXJuIHRydWU7IH0pO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3Iuc2VsZWN0X2xlZnQnLCBmdW5jdGlvbigpIHsgdGhhdC5tb3ZlX3ByaW1hcnkoLTEsIDApOyByZXR1cm4gdHJ1ZTsgfSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5zZWxlY3RfcmlnaHQnLCBmdW5jdGlvbigpIHsgdGhhdC5tb3ZlX3ByaW1hcnkoMSwgMCk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLnNlbGVjdF91cCcsIGZ1bmN0aW9uKCkgeyB0aGF0Lm1vdmVfcHJpbWFyeSgwLCAtMSk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLnNlbGVjdF9kb3duJywgZnVuY3Rpb24oKSB7IHRoYXQubW92ZV9wcmltYXJ5KDAsIDEpOyByZXR1cm4gdHJ1ZTsgfSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci53b3JkX2xlZnQnLCBmdW5jdGlvbigpIHsgdGhhdC53b3JkX3ByaW1hcnkoLTEpOyB0aGF0Ll9yZXNldF9zZWNvbmRhcnkoKTsgcmV0dXJuIHRydWU7IH0pO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3Iud29yZF9yaWdodCcsIGZ1bmN0aW9uKCkgeyB0aGF0LndvcmRfcHJpbWFyeSgxKTsgdGhhdC5fcmVzZXRfc2Vjb25kYXJ5KCk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLnNlbGVjdF93b3JkX2xlZnQnLCBmdW5jdGlvbigpIHsgdGhhdC53b3JkX3ByaW1hcnkoLTEpOyByZXR1cm4gdHJ1ZTsgfSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5zZWxlY3Rfd29yZF9yaWdodCcsIGZ1bmN0aW9uKCkgeyB0aGF0LndvcmRfcHJpbWFyeSgxKTsgcmV0dXJuIHRydWU7IH0pO1xufTtcblxuZXhwb3J0cy5DdXJzb3IgPSBDdXJzb3I7IiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cbnZhciBrZXltYXAgPSByZXF1aXJlKCcuL2V2ZW50cy9tYXAuanMnKTtcbnZhciByZWdpc3RlciA9IGtleW1hcC5NYXAucmVnaXN0ZXI7XG5cbnZhciBjdXJzb3IgPSByZXF1aXJlKCcuL2N1cnNvci5qcycpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xuLyoqXG4gKiBNYW5hZ2VzIG9uZSBvciBtb3JlIGN1cnNvcnNcbiAqL1xudmFyIEN1cnNvcnMgPSBmdW5jdGlvbihtb2RlbCwgY2xpcGJvYXJkKSB7XG4gICAgdXRpbHMuUG9zdGVyQ2xhc3MuY2FsbCh0aGlzKTtcbiAgICB0aGlzLl9tb2RlbCA9IG1vZGVsO1xuICAgIHRoaXMuZ2V0X3Jvd19jaGFyID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuY3Vyc29ycyA9IFtdO1xuICAgIHRoaXMuX3NlbGVjdGluZ190ZXh0ID0gZmFsc2U7XG4gICAgdGhpcy5fY2xpcGJvYXJkID0gY2xpcGJvYXJkO1xuXG4gICAgLy8gQ3JlYXRlIGluaXRpYWwgY3Vyc29yLlxuICAgIHRoaXMuY3JlYXRlKCk7XG5cbiAgICAvLyBSZWdpc3RlciBhY3Rpb25zLlxuICAgIHJlZ2lzdGVyKCdjdXJzb3JzLnN0YXJ0X3NlbGVjdGlvbicsIHV0aWxzLnByb3h5KHRoaXMuc3RhcnRfc2VsZWN0aW9uLCB0aGlzKSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvcnMuc2V0X3NlbGVjdGlvbicsIHV0aWxzLnByb3h5KHRoaXMuc2V0X3NlbGVjdGlvbiwgdGhpcykpO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3JzLmVuZF9zZWxlY3Rpb24nLCB1dGlscy5wcm94eSh0aGlzLmVuZF9zZWxlY3Rpb24sIHRoaXMpKTtcblxuICAgIC8vIEJpbmQgY2xpcGJvYXJkIGV2ZW50cy5cbiAgICB0aGlzLl9jbGlwYm9hcmQub24oJ2N1dCcsIHV0aWxzLnByb3h5KHRoaXMuX2hhbmRsZV9jdXQsIHRoaXMpKTtcbiAgICB0aGlzLl9jbGlwYm9hcmQub24oJ3Bhc3RlJywgdXRpbHMucHJveHkodGhpcy5faGFuZGxlX3Bhc3RlLCB0aGlzKSk7XG59O1xudXRpbHMuaW5oZXJpdChDdXJzb3JzLCB1dGlscy5Qb3N0ZXJDbGFzcyk7XG5cbi8qKlxuICogQ3JlYXRlcyBhIGN1cnNvciBhbmQgbWFuYWdlcyBpdC5cbiAqIEByZXR1cm4ge0N1cnNvcn0gY3Vyc29yXG4gKi9cbkN1cnNvcnMucHJvdG90eXBlLmNyZWF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBuZXdfY3Vyc29yID0gbmV3IGN1cnNvci5DdXJzb3IodGhpcy5fbW9kZWwsIHRoaXMuX2lucHV0X2Rpc3BhdGNoZXIpO1xuICAgIHRoaXMuY3Vyc29ycy5wdXNoKG5ld19jdXJzb3IpO1xuXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIG5ld19jdXJzb3Iub24oJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGF0LnRyaWdnZXIoJ2NoYW5nZScsIG5ld19jdXJzb3IpO1xuICAgICAgICB0aGF0Ll91cGRhdGVfc2VsZWN0aW9uKCk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbmV3X2N1cnNvcjtcbn07XG5cbi8qKlxuICogSGFuZGxlcyB3aGVuIHRoZSBzZWxlY3RlZCB0ZXh0IGlzIGN1dCB0byB0aGUgY2xpcGJvYXJkLlxuICogQHBhcmFtICB7c3RyaW5nfSB0ZXh0IC0gYnkgdmFsIHRleHQgdGhhdCB3YXMgY3V0XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3JzLnByb3RvdHlwZS5faGFuZGxlX2N1dCA9IGZ1bmN0aW9uKHRleHQpIHtcbiAgICB0aGlzLmN1cnNvcnMuZm9yRWFjaChmdW5jdGlvbihjdXJzb3IpIHtcbiAgICAgICAgY3Vyc29yLmN1dCgpO1xuICAgIH0pO1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIHdoZW4gdGV4dCBpcyBwYXN0ZWQgaW50byB0aGUgZG9jdW1lbnQuXG4gKiBAcGFyYW0gIHtzdHJpbmd9IHRleHRcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvcnMucHJvdG90eXBlLl9oYW5kbGVfcGFzdGUgPSBmdW5jdGlvbih0ZXh0KSB7XG5cbiAgICAvLyBJZiB0aGUgbW9kdWx1cyBvZiB0aGUgbnVtYmVyIG9mIGN1cnNvcnMgYW5kIHRoZSBudW1iZXIgb2YgcGFzdGVkIGxpbmVzXG4gICAgLy8gb2YgdGV4dCBpcyB6ZXJvLCBzcGxpdCB0aGUgY3V0IGxpbmVzIGFtb25nIHRoZSBjdXJzb3JzLlxuICAgIHZhciBsaW5lcyA9IHRleHQuc3BsaXQoJ1xcbicpO1xuICAgIGlmICh0aGlzLmN1cnNvcnMubGVuZ3RoID4gMSAmJiBsaW5lcy5sZW5ndGggPiAxICYmIGxpbmVzLmxlbmd0aCAlIHRoaXMuY3Vyc29ycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdmFyIGxpbmVzX3Blcl9jdXJzb3IgPSBsaW5lcy5sZW5ndGggLyB0aGlzLmN1cnNvcnMubGVuZ3RoO1xuICAgICAgICB0aGlzLmN1cnNvcnMuZm9yRWFjaChmdW5jdGlvbihjdXJzb3IsIGluZGV4KSB7XG4gICAgICAgICAgICBjdXJzb3IuaW5zZXJ0X3RleHQobGluZXMuc2xpY2UoXG4gICAgICAgICAgICAgICAgaW5kZXggKiBsaW5lc19wZXJfY3Vyc29yLCBcbiAgICAgICAgICAgICAgICBpbmRleCAqIGxpbmVzX3Blcl9jdXJzb3IgKyBsaW5lc19wZXJfY3Vyc29yKS5qb2luKCdcXG4nKSk7XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuY3Vyc29ycy5mb3JFYWNoKGZ1bmN0aW9uKGN1cnNvcikge1xuICAgICAgICAgICAgY3Vyc29yLmluc2VydF90ZXh0KHRleHQpO1xuICAgICAgICB9KTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFVwZGF0ZSB0aGUgY2xpcHBhYmxlIHRleHQgYmFzZWQgb24gbmV3IHNlbGVjdGlvbi5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvcnMucHJvdG90eXBlLl91cGRhdGVfc2VsZWN0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgXG4gICAgLy8gQ29weSBhbGwgb2YgdGhlIHNlbGVjdGVkIHRleHQuXG4gICAgdmFyIHNlbGVjdGlvbnMgPSBbXTtcbiAgICB0aGlzLmN1cnNvcnMuZm9yRWFjaChmdW5jdGlvbihjdXJzb3IpIHtcbiAgICAgICAgc2VsZWN0aW9ucy5wdXNoKGN1cnNvci5jb3B5KCkpO1xuICAgIH0pO1xuXG4gICAgLy8gTWFrZSB0aGUgY29waWVkIHRleHQgY2xpcHBhYmxlLlxuICAgIHRoaXMuX2NsaXBib2FyZC5zZXRfY2xpcHBhYmxlKHNlbGVjdGlvbnMuam9pbignXFxuJykpO1xufTtcblxuLyoqXG4gKiBTdGFydHMgc2VsZWN0aW5nIHRleHQgZnJvbSBtb3VzZSBjb29yZGluYXRlcy5cbiAqIEBwYXJhbSAge01vdXNlRXZlbnR9IGUgLSBtb3VzZSBldmVudCBjb250YWluaW5nIHRoZSBjb29yZGluYXRlcy5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvcnMucHJvdG90eXBlLnN0YXJ0X3NlbGVjdGlvbiA9IGZ1bmN0aW9uKGUpIHtcbiAgICB2YXIgeCA9IGUub2Zmc2V0WDtcbiAgICB2YXIgeSA9IGUub2Zmc2V0WTtcblxuICAgIHRoaXMuX3NlbGVjdGluZ190ZXh0ID0gdHJ1ZTtcbiAgICBpZiAodGhpcy5nZXRfcm93X2NoYXIpIHtcbiAgICAgICAgdmFyIGxvY2F0aW9uID0gdGhpcy5nZXRfcm93X2NoYXIoeCwgeSk7XG4gICAgICAgIHRoaXMuY3Vyc29yc1swXS5zZXRfcHJpbWFyeShsb2NhdGlvbi5yb3dfaW5kZXgsIGxvY2F0aW9uLmNoYXJfaW5kZXgpO1xuICAgICAgICB0aGlzLmN1cnNvcnNbMF0uc2V0X3NlY29uZGFyeShsb2NhdGlvbi5yb3dfaW5kZXgsIGxvY2F0aW9uLmNoYXJfaW5kZXgpO1xuICAgIH1cbn07XG5cbi8qKlxuICogRmluYWxpemVzIHRoZSBzZWxlY3Rpb24gb2YgdGV4dC5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvcnMucHJvdG90eXBlLmVuZF9zZWxlY3Rpb24gPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9zZWxlY3RpbmdfdGV4dCA9IGZhbHNlO1xufTtcblxuLyoqXG4gKiBTZXRzIHRoZSBlbmRwb2ludCBvZiB0ZXh0IHNlbGVjdGlvbiBmcm9tIG1vdXNlIGNvb3JkaW5hdGVzLlxuICogQHBhcmFtICB7TW91c2VFdmVudH0gZSAtIG1vdXNlIGV2ZW50IGNvbnRhaW5pbmcgdGhlIGNvb3JkaW5hdGVzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29ycy5wcm90b3R5cGUuc2V0X3NlbGVjdGlvbiA9IGZ1bmN0aW9uKGUpIHtcbiAgICB2YXIgeCA9IGUub2Zmc2V0WDtcbiAgICB2YXIgeSA9IGUub2Zmc2V0WTtcblxuICAgIGlmICh0aGlzLl9zZWxlY3RpbmdfdGV4dCAmJiB0aGlzLmdldF9yb3dfY2hhcikge1xuICAgICAgICB2YXIgbG9jYXRpb24gPSB0aGlzLmdldF9yb3dfY2hhcih4LCB5KTtcbiAgICAgICAgdGhpcy5jdXJzb3JzW3RoaXMuY3Vyc29ycy5sZW5ndGgtMV0uc2V0X3ByaW1hcnkobG9jYXRpb24ucm93X2luZGV4LCBsb2NhdGlvbi5jaGFyX2luZGV4KTtcbiAgICB9XG59O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLkN1cnNvcnMgPSBDdXJzb3JzO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xudmFyIG5vcm1hbGl6ZXIgPSByZXF1aXJlKCcuL2V2ZW50cy9ub3JtYWxpemVyLmpzJyk7XG52YXIga2V5bWFwID0gcmVxdWlyZSgnLi9ldmVudHMvbWFwLmpzJyk7XG52YXIgZGVmYXVsdF9rZXltYXAgPSByZXF1aXJlKCcuL2V2ZW50cy9kZWZhdWx0LmpzJyk7XG52YXIgY3Vyc29ycyA9IHJlcXVpcmUoJy4vY3Vyc29ycy5qcycpO1xudmFyIHRlc3RfaGlnaGxpZ2h0ZXIgPSByZXF1aXJlKCcuL2hpZ2hsaWdodGVycy90ZXN0LmpzJyk7XG52YXIgY2xpcGJvYXJkID0gcmVxdWlyZSgnLi9jbGlwYm9hcmQuanMnKTtcblxuLyoqXG4gKiBDb250cm9sbGVyIGZvciBhIERvY3VtZW50TW9kZWwuXG4gKi9cbnZhciBEb2N1bWVudENvbnRyb2xsZXIgPSBmdW5jdGlvbihlbCwgbW9kZWwpIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMuY2xpcGJvYXJkID0gbmV3IGNsaXBib2FyZC5DbGlwYm9hcmQoZWwpO1xuICAgIHRoaXMubm9ybWFsaXplciA9IG5ldyBub3JtYWxpemVyLk5vcm1hbGl6ZXIoKTtcbiAgICB0aGlzLm5vcm1hbGl6ZXIubGlzdGVuX3RvKGVsKTtcbiAgICB0aGlzLm5vcm1hbGl6ZXIubGlzdGVuX3RvKHRoaXMuY2xpcGJvYXJkLmhpZGRlbl9pbnB1dCk7XG4gICAgdGhpcy5tYXAgPSBuZXcga2V5bWFwLk1hcCh0aGlzLm5vcm1hbGl6ZXIpO1xuICAgIHRoaXMubWFwLm1hcChkZWZhdWx0X2tleW1hcC5tYXApO1xuXG4gICAgdGhpcy5jdXJzb3JzID0gbmV3IGN1cnNvcnMuQ3Vyc29ycyhtb2RlbCwgdGhpcy5jbGlwYm9hcmQpO1xuICAgIHRoaXMuX2hpZ2hsaWdodGVyID0gbmV3IHRlc3RfaGlnaGxpZ2h0ZXIuVGVzdEhpZ2hsaWdodGVyKG1vZGVsKTtcbn07XG51dGlscy5pbmhlcml0KERvY3VtZW50Q29udHJvbGxlciwgdXRpbHMuUG9zdGVyQ2xhc3MpO1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLkRvY3VtZW50Q29udHJvbGxlciA9IERvY3VtZW50Q29udHJvbGxlcjtcbiIsInZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKTtcblxuLyoqXG4gKiBNb2RlbCBjb250YWluaW5nIGFsbCBvZiB0aGUgZG9jdW1lbnQncyBkYXRhICh0ZXh0KS5cbiAqL1xudmFyIERvY3VtZW50TW9kZWwgPSBmdW5jdGlvbigpIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMuX3Jvd3MgPSBbXTtcbiAgICB0aGlzLl9yb3dfdGFncyA9IFtdO1xuICAgIHRoaXMuX3RhZ19sb2NrID0gMDtcbiAgICB0aGlzLl9pbml0X3Byb3BlcnRpZXMoKTtcbn07XG51dGlscy5pbmhlcml0KERvY3VtZW50TW9kZWwsIHV0aWxzLlBvc3RlckNsYXNzKTtcblxuLyoqXG4gLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxuKiBBY3F1aXJlIGEgbG9jayBvbiB0YWcgZXZlbnRzXG4gKlxuICogUHJldmVudHMgdGFnIGV2ZW50cyBmcm9tIGZpcmluZy5cbiAqIEByZXR1cm4ge2ludGVnZXJ9IGxvY2sgY291bnRcbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUuYWNxdWlyZV90YWdfZXZlbnRfbG9jayA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl90YWdfbG9jaysrO1xufTtcblxuLyoqXG4gKiBSZWxlYXNlIGEgbG9jayBvbiB0YWcgZXZlbnRzXG4gKiBAcmV0dXJuIHtpbnRlZ2VyfSBsb2NrIGNvdW50XG4gKi9cbkRvY3VtZW50TW9kZWwucHJvdG90eXBlLnJlbGVhc2VfdGFnX2V2ZW50X2xvY2sgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl90YWdfbG9jay0tO1xuICAgIGlmICh0aGlzLl90YWdfbG9jayA8IDApIHRoaXMuX3RhZ19sb2NrID0gMDtcbiAgICByZXR1cm4gdGhpcy5fdGFnX2xvY2s7XG59O1xuXG4vKipcbiAqIFRyaWdnZXJzIHRoZSB0YWcgY2hhbmdlIGV2ZW50cy5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkRvY3VtZW50TW9kZWwucHJvdG90eXBlLnRyaWdnZXJfdGFnX2V2ZW50cyA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLl90YWdfbG9jayA9PT0gMCkge1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ3RhZ3NfY2hhbmdlZCcpO1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZWQnKTsgICAgXG4gICAgfVxufTtcblxuLyoqXG4gKiBTZXRzIGEgJ3RhZycgb24gdGhlIHRleHQgc3BlY2lmaWVkLlxuICogQHBhcmFtIHtpbnRlZ2VyfSBzdGFydF9yb3cgLSByb3cgdGhlIHRhZyBzdGFydHMgb25cbiAqIEBwYXJhbSB7aW50ZWdlcn0gc3RhcnRfY2hhciAtIGluZGV4LCBpbiB0aGUgcm93LCBvZiB0aGUgZmlyc3QgdGFnZ2VkIGNoYXJhY3RlclxuICogQHBhcmFtIHtpbnRlZ2VyfSBlbmRfcm93IC0gcm93IHRoZSB0YWcgZW5kcyBvblxuICogQHBhcmFtIHtpbnRlZ2VyfSBlbmRfY2hhciAtIGluZGV4LCBpbiB0aGUgcm93LCBvZiB0aGUgbGFzdCB0YWdnZWQgY2hhcmFjdGVyXG4gKiBAcGFyYW0ge3N0cmluZ30gdGFnX25hbWVcbiAqIEBwYXJhbSB7YW55fSB0YWdfdmFsdWUgLSBvdmVycmlkZXMgYW55IHByZXZpb3VzIHRhZ3NcbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUuc2V0X3RhZyA9IGZ1bmN0aW9uKHN0YXJ0X3Jvdywgc3RhcnRfY2hhciwgZW5kX3JvdywgZW5kX2NoYXIsIHRhZ19uYW1lLCB0YWdfdmFsdWUpIHtcbiAgICBmb3IgKHZhciByb3cgPSBzdGFydF9yb3c7IHJvdyA8PSBlbmRfcm93OyByb3crKykge1xuICAgICAgICB2YXIgc3RhcnQgPSBzdGFydF9jaGFyO1xuICAgICAgICB2YXIgZW5kID0gZW5kX2NoYXI7XG4gICAgICAgIGlmIChyb3cgPiBzdGFydF9yb3cpIHsgc3RhcnQgPSAtMTsgfVxuICAgICAgICBpZiAocm93IDwgZW5kX3JvdykgeyBlbmQgPSAtMTsgfVxuXG4gICAgICAgIC8vIFJlbW92ZSBvciBtb2RpZnkgY29uZmxpY3RpbmcgdGFncy5cbiAgICAgICAgdmFyIGFkZF90YWdzID0gW107XG4gICAgICAgIHRoaXMuX3Jvd190YWdzW3Jvd10uZmlsdGVyKGZ1bmN0aW9uKHRhZykge1xuICAgICAgICAgICAgaWYgKHRhZy5uYW1lID09IHRhZ19uYW1lKSB7XG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGFnIGlzIHdpdGhpblxuICAgICAgICAgICAgICAgIGlmIChzdGFydCA9PSAtMSAmJiBlbmQgPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodGFnLnN0YXJ0ID49IHN0YXJ0ICYmICh0YWcuZW5kIDwgZW5kIHx8IGVuZCA9PSAtMSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0YWcgaXMgb3V0c2lkZVxuICAgICAgICAgICAgICAgIC8vIFRvIHRoZSByaWdodD9cbiAgICAgICAgICAgICAgICBpZiAodGFnLnN0YXJ0ID4gZW5kICYmIGVuZCAhPSAtMSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gVG8gdGhlIGxlZnQ/XG4gICAgICAgICAgICAgICAgaWYgKHRhZy5lbmQgPCBzdGFydCAmJiB0YWcuZW5kICE9IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRhZyBlbmNhcHN1bGF0ZXNcbiAgICAgICAgICAgICAgICB2YXIgbGVmdF9pbnRlcnNlY3RpbmcgPSB0YWcuc3RhcnQgPCBzdGFydDtcbiAgICAgICAgICAgICAgICB2YXIgcmlnaHRfaW50ZXJzZWN0aW5nID0gZW5kICE9IC0xICYmICh0YWcuZW5kID09IC0xIHx8IHRhZy5lbmQgPiBlbmQpO1xuXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGFnIGlzIGxlZnQgaW50ZXJzZWN0aW5nXG4gICAgICAgICAgICAgICAgaWYgKGxlZnRfaW50ZXJzZWN0aW5nKSB7XG4gICAgICAgICAgICAgICAgICAgIGFkZF90YWdzLnB1c2goe25hbWU6IHRhZ19uYW1lLCB2YWx1ZTogdGFnLnZhbHVlLCBzdGFydDogdGFnLnN0YXJ0LCBlbmQ6IHN0YXJ0LTF9KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0YWcgaXMgcmlnaHQgaW50ZXJzZWN0aW5nXG4gICAgICAgICAgICAgICAgaWYgKHJpZ2h0X2ludGVyc2VjdGluZykge1xuICAgICAgICAgICAgICAgICAgICBhZGRfdGFncy5wdXNoKHtuYW1lOiB0YWdfbmFtZSwgdmFsdWU6IHRhZy52YWx1ZSwgc3RhcnQ6IGVuZCsxLCBlbmQ6IHRhZy5lbmR9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCB0YWdzIGFuZCBjb3JyZWN0ZWQgdGFncy5cbiAgICAgICAgdGhpcy5fcm93X3RhZ3Nbcm93XSA9IHRoaXMuX3Jvd190YWdzW3Jvd10uY29uY2F0KGFkZF90YWdzKTtcbiAgICAgICAgdGhpcy5fcm93X3RhZ3Nbcm93XS5wdXNoKHtuYW1lOiB0YWdfbmFtZSwgdmFsdWU6IHRhZ192YWx1ZSwgc3RhcnQ6IHN0YXJ0LCBlbmQ6IGVuZH0pO1xuICAgIH1cbiAgICB0aGlzLnRyaWdnZXJfdGFnX2V2ZW50cygpO1xufTtcblxuLyoqXG4gKiBSZW1vdmVkIGFsbCBvZiB0aGUgdGFncyBvbiB0aGUgZG9jdW1lbnQuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS5jbGVhcl90YWdzID0gZnVuY3Rpb24oKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9yb3dfdGFncy5sZW5ndGg7IGkrKykge1xuICAgICAgICB0aGlzLl9yb3dfdGFnc1tpXSA9IFtdO1xuICAgIH1cbiAgICB0aGlzLnRyaWdnZXIoJ3RhZ3NfY2hhbmdlZCcpO1xuICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpO1xufTtcblxuLyoqXG4gKiBHZXQgdGhlIHRhZ3MgYXBwbGllZCB0byBhIGNoYXJhY3Rlci5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IHJvd19pbmRleFxuICogQHBhcmFtICB7aW50ZWdlcn0gY2hhcl9pbmRleFxuICogQHJldHVybiB7ZGljdGlvbmFyeX1cbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUuZ2V0X3RhZ3MgPSBmdW5jdGlvbihyb3dfaW5kZXgsIGNoYXJfaW5kZXgpIHtcbiAgICB2YXIgdGFncyA9IHt9O1xuICAgIHRoaXMuX3Jvd190YWdzW3Jvd19pbmRleF0uZm9yRWFjaChmdW5jdGlvbih0YWcpIHtcbiAgICAgICAgLy8gVGFnIHN0YXJ0IG9mIC0xIG1lYW5zIHRoZSB0YWcgY29udGludWVzIHRvIHRoZSBwcmV2aW91cyBsaW5lLlxuICAgICAgICB2YXIgYWZ0ZXJfc3RhcnQgPSAoY2hhcl9pbmRleCA+PSB0YWcuc3RhcnQgfHwgdGFnLnN0YXJ0ID09IC0xKTtcbiAgICAgICAgLy8gVGFnIGVuZCBvZiAtMSBtZWFucyB0aGUgdGFnIGNvbnRpbnVlcyB0byB0aGUgbmV4dCBsaW5lLlxuICAgICAgICB2YXIgYmVmb3JlX2VuZCA9IChjaGFyX2luZGV4IDw9IHRhZy5lbmQgfHwgdGFnLmVuZCA9PSAtMSk7XG4gICAgICAgIGlmIChhZnRlcl9zdGFydCAmJiBiZWZvcmVfZW5kKSB7XG4gICAgICAgICAgICB0YWdzW3RhZy5uYW1lXSA9IHRhZy52YWx1ZTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiB0YWdzO1xufTtcblxuLyoqXG4gKiBBZGRzIHRleHQgZWZmaWNpZW50bHkgc29tZXdoZXJlIGluIHRoZSBkb2N1bWVudC5cbiAqIEBwYXJhbSB7aW50ZWdlcn0gcm93X2luZGV4ICBcbiAqIEBwYXJhbSB7aW50ZWdlcn0gY2hhcl9pbmRleCBcbiAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0XG4gKi9cbkRvY3VtZW50TW9kZWwucHJvdG90eXBlLmFkZF90ZXh0ID0gZnVuY3Rpb24ocm93X2luZGV4LCBjaGFyX2luZGV4LCB0ZXh0KSB7XG4gICAgLy8gSWYgdGhlIHRleHQgaGFzIGEgbmV3IGxpbmUgaW4gaXQsIGp1c3QgcmUtc2V0XG4gICAgLy8gdGhlIHJvd3MgbGlzdC5cbiAgICBpZiAodGV4dC5pbmRleE9mKCdcXG4nKSAhPSAtMSkge1xuICAgICAgICB2YXIgbmV3X3Jvd3MgPSBbXTtcbiAgICAgICAgaWYgKHJvd19pbmRleCA+IDApIHtcbiAgICAgICAgICAgIG5ld19yb3dzID0gdGhpcy5fcm93cy5zbGljZSgwLCByb3dfaW5kZXgpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIG9sZF9yb3cgPSB0aGlzLl9yb3dzW3Jvd19pbmRleF07XG4gICAgICAgIHZhciBvbGRfcm93X3N0YXJ0ID0gb2xkX3Jvdy5zdWJzdHJpbmcoMCwgY2hhcl9pbmRleCk7XG4gICAgICAgIHZhciBvbGRfcm93X2VuZCA9IG9sZF9yb3cuc3Vic3RyaW5nKGNoYXJfaW5kZXgpO1xuICAgICAgICB2YXIgc3BsaXRfdGV4dCA9IHRleHQuc3BsaXQoJ1xcbicpO1xuICAgICAgICBuZXdfcm93cy5wdXNoKG9sZF9yb3dfc3RhcnQgKyBzcGxpdF90ZXh0WzBdKTtcblxuICAgICAgICBpZiAoc3BsaXRfdGV4dC5sZW5ndGggPiAyKSB7XG4gICAgICAgICAgICBuZXdfcm93cyA9IG5ld19yb3dzLmNvbmNhdChzcGxpdF90ZXh0LnNsaWNlKDEsc3BsaXRfdGV4dC5sZW5ndGgtMSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgbmV3X3Jvd3MucHVzaChzcGxpdF90ZXh0W3NwbGl0X3RleHQubGVuZ3RoLTFdICsgb2xkX3Jvd19lbmQpO1xuXG4gICAgICAgIGlmIChyb3dfaW5kZXgrMSA8IHRoaXMuX3Jvd3MubGVuZ3RoKSB7XG4gICAgICAgICAgICBuZXdfcm93cyA9IG5ld19yb3dzLmNvbmNhdCh0aGlzLl9yb3dzLnNsaWNlKHJvd19pbmRleCsxKSk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9yb3dzID0gbmV3X3Jvd3M7XG4gICAgICAgIHRoaXMuX3Jlc2l6ZWRfcm93cygpO1xuXG4gICAgLy8gVGV4dCBkb2Vzbid0IGhhdmUgYW55IG5ldyBsaW5lcywganVzdCBtb2RpZnkgdGhlXG4gICAgLy8gbGluZSBhbmQgdGhlbiB0cmlnZ2VyIHRoZSByb3cgY2hhbmdlZCBldmVudC5cbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgb2xkX3RleHQgPSB0aGlzLl9yb3dzW3Jvd19pbmRleF07XG4gICAgICAgIHRoaXMuX3Jvd3Nbcm93X2luZGV4XSA9IG9sZF90ZXh0LnN1YnN0cmluZygwLCBjaGFyX2luZGV4KSArIHRleHQgKyBvbGRfdGV4dC5zdWJzdHJpbmcoY2hhcl9pbmRleCk7XG4gICAgICAgIHRoaXMudHJpZ2dlcigncm93X2NoYW5nZWQnLCByb3dfaW5kZXgpO1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZWQnKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgYSBibG9jayBvZiB0ZXh0IGZyb20gdGhlIGRvY3VtZW50XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBzdGFydF9yb3dcbiAqIEBwYXJhbSAge2ludGVnZXJ9IHN0YXJ0X2NoYXJcbiAqIEBwYXJhbSAge2ludGVnZXJ9IGVuZF9yb3dcbiAqIEBwYXJhbSAge2ludGVnZXJ9IGVuZF9jaGFyXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS5yZW1vdmVfdGV4dCA9IGZ1bmN0aW9uKHN0YXJ0X3Jvdywgc3RhcnRfY2hhciwgZW5kX3JvdywgZW5kX2NoYXIpIHtcbiAgICBpZiAoc3RhcnRfcm93ID09IGVuZF9yb3cpIHtcbiAgICAgICAgdGhpcy5fcm93c1tzdGFydF9yb3ddID0gdGhpcy5fcm93c1tzdGFydF9yb3ddLnN1YnN0cmluZygwLCBzdGFydF9jaGFyKSArIHRoaXMuX3Jvd3Nbc3RhcnRfcm93XS5zdWJzdHJpbmcoZW5kX2NoYXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX3Jvd3Nbc3RhcnRfcm93XSA9IHRoaXMuX3Jvd3Nbc3RhcnRfcm93XS5zdWJzdHJpbmcoMCwgc3RhcnRfY2hhcikgKyB0aGlzLl9yb3dzW2VuZF9yb3ddLnN1YnN0cmluZyhlbmRfY2hhcik7XG4gICAgfVxuXG4gICAgaWYgKGVuZF9yb3cgLSBzdGFydF9yb3cgPiAwKSB7XG4gICAgICAgIHRoaXMuX3Jvd3Muc3BsaWNlKHN0YXJ0X3JvdyArIDEsIGVuZF9yb3cgLSBzdGFydF9yb3cpO1xuICAgICAgICB0aGlzLl9yZXNpemVkX3Jvd3MoKTtcbiAgICB9IGVsc2UgaWYgKGVuZF9yb3cgPT0gc3RhcnRfcm93KSB7XG4gICAgICAgIHRoaXMudHJpZ2dlcigncm93X2NoYW5nZWQnLCBzdGFydF9yb3cpO1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZWQnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ3Jvd19jaGFuZ2VkJywgc3RhcnRfcm93KTtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdyb3dfY2hhbmdlZCcsIGVuZF9yb3cpO1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZWQnKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEdldHMgYSBjaHVuayBvZiB0ZXh0LlxuICogQHBhcmFtICB7aW50ZWdlcn0gc3RhcnRfcm93XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBzdGFydF9jaGFyXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBlbmRfcm93XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBlbmRfY2hhclxuICogQHJldHVybiB7c3RyaW5nfVxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS5nZXRfdGV4dCA9IGZ1bmN0aW9uKHN0YXJ0X3Jvdywgc3RhcnRfY2hhciwgZW5kX3JvdywgZW5kX2NoYXIpIHtcbiAgICBpZiAoc3RhcnRfcm93PT1lbmRfcm93KSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9yb3dzW3N0YXJ0X3Jvd10uc3Vic3RyaW5nKHN0YXJ0X2NoYXIsIGVuZF9jaGFyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgdGV4dCA9IFtdO1xuICAgICAgICB0ZXh0LnB1c2godGhpcy5fcm93c1tzdGFydF9yb3ddLnN1YnN0cmluZyhzdGFydF9jaGFyKSk7XG4gICAgICAgIGlmIChlbmRfcm93IC0gc3RhcnRfcm93ID4gMSkge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IHN0YXJ0X3JvdyArIDE7IGkgPCBlbmRfcm93OyBpKyspIHtcbiAgICAgICAgICAgICAgICB0ZXh0LnB1c2godGhpcy5fcm93c1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGV4dC5wdXNoKHRoaXMuX3Jvd3NbZW5kX3Jvd10uc3Vic3RyaW5nKDAsIGVuZF9jaGFyKSk7XG4gICAgICAgIHJldHVybiB0ZXh0LmpvaW4oJ1xcbicpO1xuICAgIH1cbn07XG5cbi8qKlxuICogQWRkIGEgcm93IHRvIHRoZSBkb2N1bWVudFxuICogQHBhcmFtIHtpbnRlZ2VyfSByb3dfaW5kZXhcbiAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gbmV3IHJvdydzIHRleHRcbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUuYWRkX3JvdyA9IGZ1bmN0aW9uKHJvd19pbmRleCwgdGV4dCkge1xuICAgIHZhciBuZXdfcm93cyA9IFtdO1xuICAgIGlmIChyb3dfaW5kZXggPiAwKSB7XG4gICAgICAgIG5ld19yb3dzID0gdGhpcy5fcm93cy5zbGljZSgwLCByb3dfaW5kZXgpO1xuICAgIH1cbiAgICBuZXdfcm93cy5wdXNoKHRleHQpO1xuICAgIGlmIChyb3dfaW5kZXggPCB0aGlzLl9yb3dzLmxlbmd0aCkge1xuICAgICAgICBuZXdfcm93cyA9IG5ld19yb3dzLmNvbmNhdCh0aGlzLl9yb3dzLnNsaWNlKHJvd19pbmRleCkpO1xuICAgIH1cblxuICAgIHRoaXMuX3Jvd3MgPSBuZXdfcm93cztcbiAgICB0aGlzLl9yZXNpemVkX3Jvd3MoKTtcbn07XG5cbi8qKlxuICogR2V0cyB0aGUgdGV4dCBvZiB0aGUgZG9jdW1lbnQuXG4gKiBAcmV0dXJuIHtzdHJpbmd9XG4gKi9cbkRvY3VtZW50TW9kZWwucHJvdG90eXBlLl9nZXRfdGV4dCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9yb3dzLmpvaW4oJ1xcbicpO1xufTtcblxuLyoqXG4gKiBTZXRzIHRoZSB0ZXh0IG9mIHRoZSBkb2N1bWVudC5cbiAqIENvbXBsZXhpdHkgTyhOKSBmb3IgTiByb3dzXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWVcbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUuX3NldF90ZXh0ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICB0aGlzLl9yb3dzID0gdmFsdWUuc3BsaXQoJ1xcbicpO1xuICAgIHRoaXMuX3Jlc2l6ZWRfcm93cygpO1xufTtcblxuLyoqXG4gKiBVcGRhdGVzIF9yb3cncyBwYXJ0bmVyIGFycmF5cy5cbiAqIEByZXR1cm4ge251bGx9IFxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS5fcmVzaXplZF9yb3dzID0gZnVuY3Rpb24oKSB7XG5cbiAgICAvLyBNYWtlIHN1cmUgdGhlcmUgYXJlIGFzIG1hbnkgdGFnIHJvd3MgYXMgdGhlcmUgYXJlIHRleHQgcm93cy5cbiAgICB3aGlsZSAodGhpcy5fcm93X3RhZ3MubGVuZ3RoIDwgdGhpcy5fcm93cy5sZW5ndGgpIHtcbiAgICAgICAgdGhpcy5fcm93X3RhZ3MucHVzaChbXSk7XG4gICAgfVxuICAgIGlmICh0aGlzLl9yb3dfdGFncy5sZW5ndGggPiB0aGlzLl9yb3dzLmxlbmd0aCkge1xuICAgICAgICB0aGlzLl9yb3dfdGFncy5zcGxpY2UodGhpcy5fcm93cy5sZW5ndGgsIHRoaXMuX3Jvd190YWdzLmxlbmd0aCAtIHRoaXMuX3Jvd3MubGVuZ3RoKTtcbiAgICB9XG5cbiAgICAvLyBUcmlnZ2VyIGV2ZW50c1xuICAgIHRoaXMudHJpZ2dlcigndGV4dF9jaGFuZ2VkJyk7XG4gICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2VkJyk7XG59O1xuXG4vKipcbiAqIENyZWF0ZSB0aGUgZG9jdW1lbnQncyBwcm9wZXJ0aWVzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUuX2luaXRfcHJvcGVydGllcyA9IGZ1bmN0aW9uKCkgeyAgICBcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdGhpcy5wcm9wZXJ0eSgncm93cycsIGZ1bmN0aW9uKCkgeyBcbiAgICAgICAgLy8gUmV0dXJuIGEgc2hhbGxvdyBjb3B5IG9mIHRoZSBhcnJheSBzbyBpdCBjYW5ub3QgYmUgbW9kaWZpZWQuXG4gICAgICAgIHJldHVybiBbXS5jb25jYXQodGhhdC5fcm93cyk7IFxuICAgIH0pO1xuICAgIHRoaXMucHJvcGVydHkoJ3RleHQnLCBcbiAgICAgICAgdXRpbHMucHJveHkodGhpcy5fZ2V0X3RleHQsIHRoaXMpLCBcbiAgICAgICAgdXRpbHMucHJveHkodGhpcy5fc2V0X3RleHQsIHRoaXMpKTtcbn07XG5cbmV4cG9ydHMuRG9jdW1lbnRNb2RlbCA9IERvY3VtZW50TW9kZWw7IiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xuXG4vLyBSZW5kZXJlcnNcbnZhciBiYXRjaCA9IHJlcXVpcmUoJy4vcmVuZGVyZXJzL2JhdGNoLmpzJyk7XG52YXIgaGlnaGxpZ2h0ZWRfcm93ID0gcmVxdWlyZSgnLi9yZW5kZXJlcnMvaGlnaGxpZ2h0ZWRfcm93LmpzJyk7XG52YXIgY3Vyc29ycyA9IHJlcXVpcmUoJy4vcmVuZGVyZXJzL2N1cnNvcnMuanMnKTtcblxuLyoqXG4gKiBWaXN1YWwgcmVwcmVzZW50YXRpb24gb2YgYSBEb2N1bWVudE1vZGVsIGluc3RhbmNlXG4gKiBAcGFyYW0ge0NhbnZhc30gY2FudmFzIGluc3RhbmNlXG4gKiBAcGFyYW0ge0RvY3VtZW50TW9kZWx9IG1vZGVsIGluc3RhbmNlXG4gKiBAcGFyYW0ge0N1cnNvcnN9IGN1cnNvcnNfbW9kZWwgaW5zdGFuY2VcbiAqIEBwYXJhbSB7ZGljdGlvbmFyeX0gc3R5bGUgLSBkZXNjcmliZXMgcmVuZGVyaW5nIHN0eWxlXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBoYXNfZm9jdXMgLSBmdW5jdGlvbiB0aGF0IGNoZWNrcyBpZiB0aGUgdGV4dCBhcmVhIGhhcyBmb2N1c1xuICovXG52YXIgRG9jdW1lbnRWaWV3ID0gZnVuY3Rpb24oY2FudmFzLCBtb2RlbCwgY3Vyc29yc19tb2RlbCwgc3R5bGUsIGhhc19mb2N1cykge1xuICAgIHRoaXMuX21vZGVsID0gbW9kZWw7XG5cbiAgICAvLyBDcmVhdGUgY2hpbGQgcmVuZGVyZXJzLlxuICAgIHZhciByb3dfcmVuZGVyZXIgPSBuZXcgaGlnaGxpZ2h0ZWRfcm93LkhpZ2hsaWdodGVkUm93UmVuZGVyZXIobW9kZWwsIGNhbnZhcywgc3R5bGUpO1xuICAgIHZhciBjdXJzb3JzX3JlbmRlcmVyID0gbmV3IGN1cnNvcnMuQ3Vyc29yc1JlbmRlcmVyKFxuICAgICAgICBjdXJzb3JzX21vZGVsLCBcbiAgICAgICAgc3R5bGUsIFxuICAgICAgICB1dGlscy5wcm94eShyb3dfcmVuZGVyZXIuZ2V0X3Jvd19oZWlnaHQsIHJvd19yZW5kZXJlciksIFxuICAgICAgICB1dGlscy5wcm94eShyb3dfcmVuZGVyZXIuZ2V0X3Jvd190b3AsIHJvd19yZW5kZXJlciksIFxuICAgICAgICB1dGlscy5wcm94eShyb3dfcmVuZGVyZXIubWVhc3VyZV9wYXJ0aWFsX3Jvd193aWR0aCwgcm93X3JlbmRlcmVyKSxcbiAgICAgICAgaGFzX2ZvY3VzKTtcblxuICAgIC8vIFBhc3MgZ2V0X3Jvd19jaGFyIGludG8gY3Vyc29ycy5cbiAgICBjdXJzb3JzX21vZGVsLmdldF9yb3dfY2hhciA9IHV0aWxzLnByb3h5KHJvd19yZW5kZXJlci5nZXRfcm93X2NoYXIsIHJvd19yZW5kZXJlcik7XG5cbiAgICAvLyBDYWxsIGJhc2UgY29uc3RydWN0b3IuXG4gICAgYmF0Y2guQmF0Y2hSZW5kZXJlci5jYWxsKHRoaXMsIFtcbiAgICAgICAgcm93X3JlbmRlcmVyLFxuICAgICAgICBjdXJzb3JzX3JlbmRlcmVyLFxuICAgIF0sIGNhbnZhcyk7XG5cbiAgICAvLyBIb29rdXAgcmVuZGVyIGV2ZW50cy5cbiAgICB0aGlzLl9jYW52YXMub24oJ3JlZHJhdycsIHV0aWxzLnByb3h5KHRoaXMucmVuZGVyLCB0aGlzKSk7XG4gICAgdGhpcy5fbW9kZWwub24oJ2NoYW5nZWQnLCB1dGlscy5wcm94eShjYW52YXMucmVkcmF3LCBjYW52YXMpKTtcblxuICAgIC8vIENyZWF0ZSBwcm9wZXJ0aWVzXG4gICAgdGhpcy5wcm9wZXJ0eSgnc3R5bGUnLCBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gcm93X3JlbmRlcmVyLnN0eWxlO1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHJvd19yZW5kZXJlci5zdHlsZSA9IHZhbHVlO1xuICAgICAgICBjdXJzb3JzX3JlbmRlcmVyLnN0eWxlID0gdmFsdWU7XG4gICAgfSk7XG59O1xudXRpbHMuaW5oZXJpdChEb2N1bWVudFZpZXcsIGJhdGNoLkJhdGNoUmVuZGVyZXIpO1xuXG5leHBvcnRzLkRvY3VtZW50VmlldyA9IERvY3VtZW50VmlldzsiLCJleHBvcnRzLm1hcCA9IHtcbiAgICAna2V5cHJlc3MnIDogJ2N1cnNvci5rZXlwcmVzcycsXG4gICAgJ2VudGVyJyA6ICdjdXJzb3IubmV3bGluZScsXG4gICAgJ2RlbGV0ZScgOiAnY3Vyc29yLmRlbGV0ZV9mb3J3YXJkJyxcbiAgICAnYmFja3NwYWNlJyA6ICdjdXJzb3IuZGVsZXRlX2JhY2t3YXJkJyxcbiAgICAnbGVmdGFycm93JyA6ICdjdXJzb3IubGVmdCcsXG4gICAgJ3JpZ2h0YXJyb3cnIDogJ2N1cnNvci5yaWdodCcsXG4gICAgJ3VwYXJyb3cnIDogJ2N1cnNvci51cCcsXG4gICAgJ2Rvd25hcnJvdycgOiAnY3Vyc29yLmRvd24nLFxuICAgICdzaGlmdC1sZWZ0YXJyb3cnIDogJ2N1cnNvci5zZWxlY3RfbGVmdCcsXG4gICAgJ3NoaWZ0LXJpZ2h0YXJyb3cnIDogJ2N1cnNvci5zZWxlY3RfcmlnaHQnLFxuICAgICdzaGlmdC11cGFycm93JyA6ICdjdXJzb3Iuc2VsZWN0X3VwJyxcbiAgICAnc2hpZnQtZG93bmFycm93JyA6ICdjdXJzb3Iuc2VsZWN0X2Rvd24nLFxuICAgICdhbHQtbGVmdGFycm93JyA6ICdjdXJzb3Iud29yZF9sZWZ0JyxcbiAgICAnYWx0LXJpZ2h0YXJyb3cnIDogJ2N1cnNvci53b3JkX3JpZ2h0JyxcbiAgICAnc2hpZnQtYWx0LWxlZnRhcnJvdycgOiAnY3Vyc29yLnNlbGVjdF93b3JkX2xlZnQnLFxuICAgICdzaGlmdC1hbHQtcmlnaHRhcnJvdycgOiAnY3Vyc29yLnNlbGVjdF93b3JkX3JpZ2h0JyxcbiAgICAnbW91c2UwLWRvd24nIDogJ2N1cnNvcnMuc3RhcnRfc2VsZWN0aW9uJyxcbiAgICAnbW91c2UtbW92ZScgOiAnY3Vyc29ycy5zZXRfc2VsZWN0aW9uJyxcbiAgICAnbW91c2UwLXVwJyA6ICdjdXJzb3JzLmVuZF9zZWxlY3Rpb24nLFxufTsiLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMuanMnKTtcblxuLyoqXG4gKiBFdmVudCBub3JtYWxpemVyXG4gKlxuICogTGlzdGVucyB0byBET00gZXZlbnRzIGFuZCBlbWl0cyAnY2xlYW5lZCcgdmVyc2lvbnMgb2YgdGhvc2UgZXZlbnRzLlxuICovXG52YXIgTWFwID0gZnVuY3Rpb24obm9ybWFsaXplcikge1xuICAgIHV0aWxzLlBvc3RlckNsYXNzLmNhbGwodGhpcyk7XG4gICAgdGhpcy5fbWFwID0ge307XG5cbiAgICAvLyBDcmVhdGUgbm9ybWFsaXplciBwcm9wZXJ0eVxuICAgIHRoaXMuX25vcm1hbGl6ZXIgPSBudWxsO1xuICAgIHRoaXMuX3Byb3h5X2hhbmRsZV9ldmVudCA9IHV0aWxzLnByb3h5KHRoaXMuX2hhbmRsZV9ldmVudCwgdGhpcyk7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMucHJvcGVydHkoJ25vcm1hbGl6ZXInLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoYXQuX25vcm1hbGl6ZXI7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgLy8gUmVtb3ZlIGV2ZW50IGhhbmRsZXIuXG4gICAgICAgIGlmICh0aGF0Ll9ub3JtYWxpemVyKSB0aGF0Ll9ub3JtYWxpemVyLm9mZl9hbGwodGhhdC5fcHJveHlfaGFuZGxlX2V2ZW50KTtcbiAgICAgICAgLy8gU2V0LCBhbmQgYWRkIGV2ZW50IGhhbmRsZXIuXG4gICAgICAgIHRoYXQuX25vcm1hbGl6ZXIgPSB2YWx1ZTtcbiAgICAgICAgaWYgKHZhbHVlKSB2YWx1ZS5vbl9hbGwodGhhdC5fcHJveHlfaGFuZGxlX2V2ZW50KTtcbiAgICB9KTtcblxuICAgIC8vIElmIGRlZmluZWQsIHNldCB0aGUgbm9ybWFsaXplci5cbiAgICBpZiAobm9ybWFsaXplcikgdGhpcy5ub3JtYWxpemVyID0gbm9ybWFsaXplcjtcbn07XG51dGlscy5pbmhlcml0KE1hcCwgdXRpbHMuUG9zdGVyQ2xhc3MpO1xuXG4vKipcbiAqIE1hcCBvZiBBUEkgbWV0aG9kcyBieSBuYW1lLlxuICogQHR5cGUge2RpY3Rpb25hcnl9XG4gKi9cbk1hcC5yZWdpc3RyeSA9IHt9O1xuTWFwLl9yZWdpc3RyeV90YWdzID0ge307XG5cbi8qKlxuICogUmVnaXN0ZXJzIGFuIGFjdGlvbi5cbiAqIEBwYXJhbSAge3N0cmluZ30gbmFtZSAtIG5hbWUgb2YgdGhlIGFjdGlvblxuICogQHBhcmFtICB7ZnVuY3Rpb259IGZcbiAqIEBwYXJhbSAge09iamVjdH0gKG9wdGlvbmFsKSB0YWcgLSBhbGxvd3MgeW91IHRvIHNwZWNpZnkgYSB0YWdcbiAqICAgICAgICAgICAgICAgICAgd2hpY2ggY2FuIGJlIHVzZWQgd2l0aCB0aGUgYHVucmVnaXN0ZXJfYnlfdGFnYFxuICogICAgICAgICAgICAgICAgICBtZXRob2QgdG8gcXVpY2tseSB1bnJlZ2lzdGVyIGFjdGlvbnMgd2l0aFxuICogICAgICAgICAgICAgICAgICB0aGUgdGFnIHNwZWNpZmllZC5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbk1hcC5yZWdpc3RlciA9IGZ1bmN0aW9uKG5hbWUsIGYsIHRhZykge1xuICAgIGlmICh1dGlscy5pc19hcnJheShNYXAucmVnaXN0cnlbbmFtZV0pKSB7XG4gICAgICAgIE1hcC5yZWdpc3RyeVtuYW1lXS5wdXNoKGYpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChNYXAucmVnaXN0cnlbbmFtZV09PT11bmRlZmluZWQpIHtcbiAgICAgICAgICAgIE1hcC5yZWdpc3RyeVtuYW1lXSA9IGY7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBNYXAucmVnaXN0cnlbbmFtZV0gPSBbTWFwLnJlZ2lzdHJ5W25hbWVdLCBmXTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0YWcpIHtcbiAgICAgICAgaWYgKE1hcC5fcmVnaXN0cnlfdGFnc1t0YWddID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIE1hcC5fcmVnaXN0cnlfdGFnc1t0YWddID0gW107XG4gICAgICAgIH1cbiAgICAgICAgTWFwLl9yZWdpc3RyeV90YWdzW3RhZ10ucHVzaCh7bmFtZTogbmFtZSwgZjogZn0pO1xuICAgIH1cbn07XG5cbi8qKlxuICogVW5yZWdpc3RlciBhbiBhY3Rpb24uXG4gKiBAcGFyYW0gIHtzdHJpbmd9IG5hbWUgLSBuYW1lIG9mIHRoZSBhY3Rpb25cbiAqIEBwYXJhbSAge2Z1bmN0aW9ufSBmXG4gKiBAcmV0dXJuIHtib29sZWFufSB0cnVlIGlmIGFjdGlvbiB3YXMgZm91bmQgYW5kIHVucmVnaXN0ZXJlZFxuICovXG5NYXAudW5yZWdpc3RlciA9IGZ1bmN0aW9uKG5hbWUsIGYpIHtcbiAgICBpZiAodXRpbHMuaXNfYXJyYXkoTWFwLnJlZ2lzdHJ5W25hbWVdKSkge1xuICAgICAgICB2YXIgaW5kZXggPSBNYXAucmVnaXN0cnlbbmFtZV0uaW5kZXhPZihmKTtcbiAgICAgICAgaWYgKGluZGV4ICE9IC0xKSB7XG4gICAgICAgICAgICBNYXAucmVnaXN0cnlbbmFtZV0uc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChNYXAucmVnaXN0cnlbbmFtZV0gPT0gZikge1xuICAgICAgICBkZWxldGUgTWFwLnJlZ2lzdHJ5W25hbWVdO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufTtcblxuLyoqXG4gKiBVbnJlZ2lzdGVycyBhbGwgb2YgdGhlIGFjdGlvbnMgcmVnaXN0ZXJlZCB3aXRoIGEgZ2l2ZW4gdGFnLlxuICogQHBhcmFtICB7T2JqZWN0fSB0YWcgLSBzcGVjaWZpZWQgaW4gTWFwLnJlZ2lzdGVyLlxuICogQHJldHVybiB7Ym9vbGVhbn0gdHJ1ZSBpZiB0aGUgdGFnIHdhcyBmb3VuZCBhbmQgZGVsZXRlZC5cbiAqL1xuTWFwLnVucmVnaXN0ZXJfYnlfdGFnID0gZnVuY3Rpb24odGFnKSB7XG4gICAgaWYgKE1hcC5fcmVnaXN0cnlfdGFnc1t0YWddKSB7XG4gICAgICAgIE1hcC5fcmVnaXN0cnlfdGFnc1t0YWddLmZvckVhY2goZnVuY3Rpb24ocmVnaXN0cmF0aW9uKSB7XG4gICAgICAgICAgICBNYXAudW5yZWdpc3RlcihyZWdpc3RyYXRpb24ubmFtZSwgcmVnaXN0cmF0aW9uLmYpO1xuICAgICAgICB9KTtcbiAgICAgICAgZGVsZXRlIE1hcC5fcmVnaXN0cnlfdGFnc1t0YWddO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEFwcGVuZCBldmVudCBhY3Rpb25zIHRvIHRoZSBtYXAuXG4gKlxuICogVGhpcyBtZXRob2QgaGFzIHR3byBzaWduYXR1cmVzLiAgSWYgYSBzaW5nbGUgYXJndW1lbnRcbiAqIGlzIHBhc3NlZCB0byBpdCwgdGhhdCBhcmd1bWVudCBpcyB0cmVhdGVkIGxpa2UgYVxuICogZGljdGlvbmFyeS4gIElmIG1vcmUgdGhhbiBvbmUgYXJndW1lbnQgaXMgcGFzc2VkIHRvIGl0LFxuICogZWFjaCBhcmd1bWVudCBpcyB0cmVhdGVkIGFzIGFsdGVybmF0aW5nIGtleSwgdmFsdWVcbiAqIHBhaXJzIG9mIGEgZGljdGlvbmFyeS5cbiAqXG4gKiBUaGUgbWFwIGFsbG93cyB5b3UgdG8gcmVnaXN0ZXIgYWN0aW9ucyBmb3Iga2V5cy5cbiAqIEV4YW1wbGU6XG4gKiAgICAgbWFwLmFwcGVuZF9tYXAoe1xuICogICAgICAgICAnY3RybC1hJzogJ2N1cnNvcnMuc2VsZWN0X2FsbCcsXG4gKiAgICAgfSlcbiAqXG4gKiBNdWx0aXBsZSBhY3Rpb25zIGNhbiBiZSByZWdpc3RlcmVkIGZvciBhIHNpbmdsZSBldmVudC5cbiAqIFRoZSBhY3Rpb25zIGFyZSBleGVjdXRlZCBzZXF1ZW50aWFsbHksIHVudGlsIG9uZSBhY3Rpb25cbiAqIHJldHVybnMgYHRydWVgIGluIHdoaWNoIGNhc2UgdGhlIGV4ZWN1dGlvbiBoYXVsdHMuICBUaGlzXG4gKiBhbGxvd3MgYWN0aW9ucyB0byBydW4gY29uZGl0aW9uYWxseS5cbiAqIEV4YW1wbGU6XG4gKiAgICAgLy8gSW1wbGVtZW50aW5nIGEgZHVhbCBtb2RlIGVkaXRvciwgeW91IG1heSBoYXZlIHR3b1xuICogICAgIC8vIGZ1bmN0aW9ucyB0byByZWdpc3RlciBmb3Igb25lIGtleS4gaS5lLjpcbiAqICAgICB2YXIgZG9fYSA9IGZ1bmN0aW9uKGUpIHtcbiAqICAgICAgICAgaWYgKG1vZGU9PSdlZGl0Jykge1xuICogICAgICAgICAgICAgY29uc29sZS5sb2coJ0EnKTtcbiAqICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICogICAgICAgICB9XG4gKiAgICAgfVxuICogICAgIHZhciBkb19iID0gZnVuY3Rpb24oZSkge1xuICogICAgICAgICBpZiAobW9kZT09J2NvbW1hbmQnKSB7XG4gKiAgICAgICAgICAgICBjb25zb2xlLmxvZygnQicpO1xuICogICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gKiAgICAgICAgIH1cbiAqICAgICB9XG4gKlxuICogICAgIC8vIFRvIHJlZ2lzdGVyIGJvdGggZm9yIG9uZSBrZXlcbiAqICAgICBNYXAucmVnaXN0ZXIoJ2FjdGlvbl9hJywgZG9fYSk7XG4gKiAgICAgTWFwLnJlZ2lzdGVyKCdhY3Rpb25fYicsIGRvX2IpO1xuICogICAgIG1hcC5hcHBlbmRfbWFwKHtcbiAqICAgICAgICAgJ2FsdC12JzogWydhY3Rpb25fYScsICdhY3Rpb25fYiddLFxuICogICAgIH0pO1xuICogXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5NYXAucHJvdG90eXBlLmFwcGVuZF9tYXAgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdmFyIHBhcnNlZCA9IHRoaXMuX3BhcnNlX21hcF9hcmd1bWVudHMoYXJndW1lbnRzKTtcbiAgICBPYmplY3Qua2V5cyhwYXJzZWQpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIGlmICh0aGF0Ll9tYXBba2V5XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aGF0Ll9tYXBba2V5XSA9IHBhcnNlZFtrZXldO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhhdC5fbWFwW2tleV0gPSB0aGF0Ll9tYXBba2V5XS5jb25jYXQocGFyc2VkW2tleV0pO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIEFsaWFzIGZvciBgYXBwZW5kX21hcGAuXG4gKiBAdHlwZSB7ZnVuY3Rpb259XG4gKi9cbk1hcC5wcm90b3R5cGUubWFwID0gTWFwLnByb3RvdHlwZS5hcHBlbmRfbWFwO1xuXG4vKipcbiAqIFByZXBlbmQgZXZlbnQgYWN0aW9ucyB0byB0aGUgbWFwLlxuICpcbiAqIFNlZSB0aGUgZG9jIGZvciBgYXBwZW5kX21hcGAgZm9yIGEgZGV0YWlsZWQgZGVzY3JpcHRpb24gb2ZcbiAqIHBvc3NpYmxlIGlucHV0IHZhbHVlcy5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbk1hcC5wcm90b3R5cGUucHJlcGVuZF9tYXAgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdmFyIHBhcnNlZCA9IHRoaXMuX3BhcnNlX21hcF9hcmd1bWVudHMoYXJndW1lbnRzKTtcbiAgICBPYmplY3Qua2V5cyhwYXJzZWQpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIGlmICh0aGF0Ll9tYXBba2V5XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aGF0Ll9tYXBba2V5XSA9IHBhcnNlZFtrZXldO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhhdC5fbWFwW2tleV0gPSBwYXJzZWRba2V5XS5jb25jYXQodGhhdC5fbWFwW2tleV0pO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIFVubWFwIGV2ZW50IGFjdGlvbnMgaW4gdGhlIG1hcC5cbiAqXG4gKiBTZWUgdGhlIGRvYyBmb3IgYGFwcGVuZF9tYXBgIGZvciBhIGRldGFpbGVkIGRlc2NyaXB0aW9uIG9mXG4gKiBwb3NzaWJsZSBpbnB1dCB2YWx1ZXMuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5NYXAucHJvdG90eXBlLnVubWFwID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHZhciBwYXJzZWQgPSB0aGlzLl9wYXJzZV9tYXBfYXJndW1lbnRzKGFyZ3VtZW50cyk7XG4gICAgT2JqZWN0LmtleXMocGFyc2VkKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICBpZiAodGhhdC5fbWFwW2tleV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcGFyc2VkW2tleV0uZm9yRWFjaChmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHZhciBpbmRleCA9IHRoYXQuX21hcFtrZXldLmluZGV4T2YodmFsdWUpO1xuICAgICAgICAgICAgICAgIGlmIChpbmRleCAhPSAtMSkge1xuICAgICAgICAgICAgICAgICAgICB0aGF0Ll9tYXBba2V5XS5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIEdldCBhIG1vZGlmaWFibGUgYXJyYXkgb2YgdGhlIGFjdGlvbnMgZm9yIGEgcGFydGljdWxhciBldmVudC5cbiAqIEBwYXJhbSAge3N0cmluZ30gZXZlbnRcbiAqIEByZXR1cm4ge2FycmF5fSBieSByZWYgY29weSBvZiB0aGUgYWN0aW9ucyByZWdpc3RlcmVkIHRvIGFuIGV2ZW50LlxuICovXG5NYXAucHJvdG90eXBlLmdldF9tYXBwaW5nID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICByZXR1cm4gdGhpcy5fbWFwW3RoaXMuX25vcm1hbGl6ZV9ldmVudF9uYW1lKGV2ZW50KV07XG59O1xuXG4vKipcbiAqIFBhcnNlIHRoZSBhcmd1bWVudHMgdG8gYSBtYXAgZnVuY3Rpb24uXG4gKiBAcGFyYW0gIHthcmd1bWVudHMgYXJyYXl9IGFyZ3NcbiAqIEByZXR1cm4ge2RpY3Rpb25hcnl9IHBhcnNlZCByZXN1bHRzXG4gKi9cbk1hcC5wcm90b3R5cGUuX3BhcnNlX21hcF9hcmd1bWVudHMgPSBmdW5jdGlvbihhcmdzKSB7XG4gICAgdmFyIHBhcnNlZCA9IHt9O1xuICAgIHZhciB0aGF0ID0gdGhpcztcblxuICAgIC8vIE9uZSBhcnVtZW50LCB0cmVhdCBpdCBhcyBhIGRpY3Rpb25hcnkgb2YgZXZlbnQgbmFtZXMgYW5kXG4gICAgLy8gYWN0aW9ucy5cbiAgICBpZiAoYXJncy5sZW5ndGggPT0gMSkge1xuICAgICAgICBPYmplY3Qua2V5cyhhcmdzWzBdKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gYXJnc1swXVtrZXldO1xuICAgICAgICAgICAgdmFyIG5vcm1hbGl6ZWRfa2V5ID0gdGhhdC5fbm9ybWFsaXplX2V2ZW50X25hbWUoa2V5KTtcblxuICAgICAgICAgICAgLy8gSWYgdGhlIHZhbHVlIGlzIG5vdCBhbiBhcnJheSwgd3JhcCBpdCBpbiBvbmUuXG4gICAgICAgICAgICBpZiAoIXV0aWxzLmlzX2FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gW3ZhbHVlXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gSWYgdGhlIGtleSBpcyBhbHJlYWR5IGRlZmluZWQsIGNvbmNhdCB0aGUgdmFsdWVzIHRvXG4gICAgICAgICAgICAvLyBpdC4gIE90aGVyd2lzZSwgc2V0IGl0LlxuICAgICAgICAgICAgaWYgKHBhcnNlZFtub3JtYWxpemVkX2tleV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHBhcnNlZFtub3JtYWxpemVkX2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcGFyc2VkW25vcm1hbGl6ZWRfa2V5XSA9IHBhcnNlZFtub3JtYWxpemVkX2tleV0uY29uY2F0KHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAvLyBNb3JlIHRoYW4gb25lIGFyZ3VtZW50LiAgVHJlYXQgYXMgdGhlIGZvcm1hdDpcbiAgICAvLyBldmVudF9uYW1lMSwgYWN0aW9uMSwgZXZlbnRfbmFtZTIsIGFjdGlvbjIsIC4uLiwgZXZlbnRfbmFtZU4sIGFjdGlvbk5cbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKHZhciBpPTA7IGk8TWF0aC5mbG9vcihhcmdzLmxlbmd0aC8yKTsgaSsrKSB7XG4gICAgICAgICAgICB2YXIga2V5ID0gdGhhdC5fbm9ybWFsaXplX2V2ZW50X25hbWUoYXJnc1syKmldKTtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IGFyZ3NbMippICsgMV07XG4gICAgICAgICAgICBpZiAocGFyc2VkW2tleV09PT11bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBwYXJzZWRba2V5XSA9IFt2YWx1ZV07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHBhcnNlZFtrZXldLnB1c2godmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBwYXJzZWQ7XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgYSBub3JtYWxpemVkIGV2ZW50LlxuICogQHBhcmFtICB7c3RyaW5nfSBuYW1lIC0gbmFtZSBvZiB0aGUgZXZlbnRcbiAqIEBwYXJhbSAge0V2ZW50fSBlIC0gYnJvd3NlciBFdmVudCBvYmplY3RcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbk1hcC5wcm90b3R5cGUuX2hhbmRsZV9ldmVudCA9IGZ1bmN0aW9uKG5hbWUsIGUpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdmFyIG5vcm1hbGl6ZWRfZXZlbnQgPSB0aGlzLl9ub3JtYWxpemVfZXZlbnRfbmFtZShuYW1lKTtcbiAgICB2YXIgYWN0aW9ucyA9IHRoaXMuX21hcFtub3JtYWxpemVkX2V2ZW50XTtcblxuICAgIGlmIChhY3Rpb25zKSB7XG4gICAgICAgIGFjdGlvbnMuZm9yRWFjaChmdW5jdGlvbihhY3Rpb24pIHtcbiAgICAgICAgICAgIHZhciBhY3Rpb25fY2FsbGJhY2tzID0gTWFwLnJlZ2lzdHJ5W2FjdGlvbl07XG4gICAgICAgICAgICBpZiAoYWN0aW9uX2NhbGxiYWNrcykge1xuICAgICAgICAgICAgICAgIGlmICh1dGlscy5pc19hcnJheShhY3Rpb25fY2FsbGJhY2tzKSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmV0dXJucyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBhY3Rpb25fY2FsbGJhY2tzLmZvckVhY2goZnVuY3Rpb24oYWN0aW9uX2NhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm5zLmFwcGVuZChhY3Rpb25fY2FsbGJhY2suY2FsbCh1bmRlZmluZWQsIGUpPT09dHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIElmIG9uZSBvZiB0aGUgYWN0aW9uIGNhbGxiYWNrcyByZXR1cm5lZCB0cnVlLCBjYW5jZWwgYnViYmxpbmcuXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXR1cm5zLnNvbWUoZnVuY3Rpb24oeCkge3JldHVybiB4O30pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0Ll9jYW5jZWxfYnViYmxlKGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYWN0aW9uX2NhbGxiYWNrcy5jYWxsKHVuZGVmaW5lZCwgZSk9PT10cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0Ll9jYW5jZWxfYnViYmxlKGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG4vKipcbiAqIEFscGhhYmV0aWNhbGx5IHNvcnRzIGtleXMgaW4gZXZlbnQgbmFtZSwgc29cbiAqIEBwYXJhbSAge3N0cmluZ30gbmFtZSAtIGV2ZW50IG5hbWVcbiAqIEByZXR1cm4ge3N0cmluZ30gbm9ybWFsaXplZCBldmVudCBuYW1lXG4gKi9cbk1hcC5wcm90b3R5cGUuX25vcm1hbGl6ZV9ldmVudF9uYW1lID0gZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiBuYW1lLnRvTG93ZXJDYXNlKCkudHJpbSgpLnNwbGl0KCctJykuc29ydCgpLmpvaW4oJy0nKTtcbn07XG5cbi8qKlxuICogQ2FuY2VscyBldmVudCBidWJibGluZy5cbiAqIEBwYXJhbSAge2V2ZW50fSBlXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5NYXAucHJvdG90eXBlLl9jYW5jZWxfYnViYmxlID0gZnVuY3Rpb24oZSkge1xuICAgIGlmIChlLnN0b3BQcm9wYWdhdGlvbikgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICBpZiAoZS5jYW5jZWxCdWJibGUgIT09IG51bGwpIGUuY2FuY2VsQnViYmxlID0gdHJ1ZTtcbiAgICBpZiAoZS5wcmV2ZW50RGVmYXVsdCkgZS5wcmV2ZW50RGVmYXVsdCgpO1xufTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5NYXAgPSBNYXA7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMuanMnKTtcblxuLyoqXG4gKiBFdmVudCBub3JtYWxpemVyXG4gKlxuICogTGlzdGVucyB0byBET00gZXZlbnRzIGFuZCBlbWl0cyAnY2xlYW5lZCcgdmVyc2lvbnMgb2YgdGhvc2UgZXZlbnRzLlxuICovXG52YXIgTm9ybWFsaXplciA9IGZ1bmN0aW9uKCkge1xuICAgIHV0aWxzLlBvc3RlckNsYXNzLmNhbGwodGhpcyk7XG4gICAgdGhpcy5fZWxfaG9va3MgPSB7fTtcbn07XG51dGlscy5pbmhlcml0KE5vcm1hbGl6ZXIsIHV0aWxzLlBvc3RlckNsYXNzKTtcblxuLyoqXG4gKiBMaXN0ZW4gdG8gdGhlIGV2ZW50cyBvZiBhbiBlbGVtZW50LlxuICogQHBhcmFtICB7SFRNTEVsZW1lbnR9IGVsXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Ob3JtYWxpemVyLnByb3RvdHlwZS5saXN0ZW5fdG8gPSBmdW5jdGlvbihlbCkge1xuICAgIHZhciBob29rcyA9IFtdO1xuICAgIGhvb2tzLnB1c2godXRpbHMuaG9vayhlbCwgJ29ua2V5cHJlc3MnLCB0aGlzLl9wcm94eSgncHJlc3MnLCB0aGlzLl9oYW5kbGVfa2V5cHJlc3NfZXZlbnQsIGVsKSkpO1xuICAgIGhvb2tzLnB1c2godXRpbHMuaG9vayhlbCwgJ29ua2V5ZG93bicsICB0aGlzLl9wcm94eSgnZG93bicsIHRoaXMuX2hhbmRsZV9rZXlib2FyZF9ldmVudCwgZWwpKSk7XG4gICAgaG9va3MucHVzaCh1dGlscy5ob29rKGVsLCAnb25rZXl1cCcsICB0aGlzLl9wcm94eSgndXAnLCB0aGlzLl9oYW5kbGVfa2V5Ym9hcmRfZXZlbnQsIGVsKSkpO1xuICAgIGhvb2tzLnB1c2godXRpbHMuaG9vayhlbCwgJ29uZGJsY2xpY2snLCAgdGhpcy5fcHJveHkoJ2RibGNsaWNrJywgdGhpcy5faGFuZGxlX21vdXNlX2V2ZW50LCBlbCkpKTtcbiAgICBob29rcy5wdXNoKHV0aWxzLmhvb2soZWwsICdvbmNsaWNrJywgIHRoaXMuX3Byb3h5KCdjbGljaycsIHRoaXMuX2hhbmRsZV9tb3VzZV9ldmVudCwgZWwpKSk7XG4gICAgaG9va3MucHVzaCh1dGlscy5ob29rKGVsLCAnb25tb3VzZWRvd24nLCAgdGhpcy5fcHJveHkoJ2Rvd24nLCB0aGlzLl9oYW5kbGVfbW91c2VfZXZlbnQsIGVsKSkpO1xuICAgIGhvb2tzLnB1c2godXRpbHMuaG9vayhlbCwgJ29ubW91c2V1cCcsICB0aGlzLl9wcm94eSgndXAnLCB0aGlzLl9oYW5kbGVfbW91c2VfZXZlbnQsIGVsKSkpO1xuICAgIGhvb2tzLnB1c2godXRpbHMuaG9vayhlbCwgJ29ubW91c2Vtb3ZlJywgIHRoaXMuX3Byb3h5KCdtb3ZlJywgdGhpcy5faGFuZGxlX21vdXNlbW92ZV9ldmVudCwgZWwpKSk7XG4gICAgdGhpcy5fZWxfaG9va3NbZWxdID0gaG9va3M7XG59O1xuXG4vKipcbiAqIFN0b3BzIGxpc3RlbmluZyB0byBhbiBlbGVtZW50LlxuICogQHBhcmFtICB7SFRNTEVsZW1lbnR9IGVsXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Ob3JtYWxpemVyLnByb3RvdHlwZS5zdG9wX2xpc3RlbmluZ190byA9IGZ1bmN0aW9uKGVsKSB7XG4gICAgaWYgKHRoaXMuX2VsX2hvb2tzW2VsXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuX2VsX2hvb2tzW2VsXS5mb3JFYWNoKGZ1bmN0aW9uKGhvb2spIHtcbiAgICAgICAgICAgIGhvb2sudW5ob29rKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBkZWxldGUgdGhpcy5fZWxfaG9va3NbZWxdO1xuICAgIH1cbn07XG5cbi8qKlxuICogSGFuZGxlcyB3aGVuIGEgbW91c2UgZXZlbnQgb2NjdXJzXG4gKiBAcGFyYW0gIHtIVE1MRWxlbWVudH0gZWxcbiAqIEBwYXJhbSAge0V2ZW50fSBlXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Ob3JtYWxpemVyLnByb3RvdHlwZS5faGFuZGxlX21vdXNlX2V2ZW50ID0gZnVuY3Rpb24oZWwsIGV2ZW50X25hbWUsIGUpIHtcbiAgICBlID0gZSB8fCB3aW5kb3cuZXZlbnQ7XG4gICAgdGhpcy50cmlnZ2VyKHRoaXMuX21vZGlmaWVyX3N0cmluZyhlKSArICdtb3VzZScgKyBlLmJ1dHRvbiArICctJyArIGV2ZW50X25hbWUsIGUpO1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIHdoZW4gYSBtb3VzZSBldmVudCBvY2N1cnNcbiAqIEBwYXJhbSAge0hUTUxFbGVtZW50fSBlbFxuICogQHBhcmFtICB7RXZlbnR9IGVcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbk5vcm1hbGl6ZXIucHJvdG90eXBlLl9oYW5kbGVfbW91c2Vtb3ZlX2V2ZW50ID0gZnVuY3Rpb24oZWwsIGV2ZW50X25hbWUsIGUpIHtcbiAgICBlID0gZSB8fCB3aW5kb3cuZXZlbnQ7XG4gICAgdGhpcy50cmlnZ2VyKHRoaXMuX21vZGlmaWVyX3N0cmluZyhlKSArICdtb3VzZScgKyAnLScgKyBldmVudF9uYW1lLCBlKTtcbn07XG5cbi8qKlxuICogSGFuZGxlcyB3aGVuIGEga2V5Ym9hcmQgZXZlbnQgb2NjdXJzXG4gKiBAcGFyYW0gIHtIVE1MRWxlbWVudH0gZWxcbiAqIEBwYXJhbSAge0V2ZW50fSBlXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Ob3JtYWxpemVyLnByb3RvdHlwZS5faGFuZGxlX2tleWJvYXJkX2V2ZW50ID0gZnVuY3Rpb24oZWwsIGV2ZW50X25hbWUsIGUpIHtcbiAgICBlID0gZSB8fCB3aW5kb3cuZXZlbnQ7XG4gICAgdmFyIGtleW5hbWUgPSB0aGlzLl9sb29rdXBfa2V5Y29kZShlLmtleUNvZGUpO1xuICAgIGlmIChrZXluYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy50cmlnZ2VyKHRoaXMuX21vZGlmaWVyX3N0cmluZyhlKSArIGtleW5hbWUgKyAnLScgKyBldmVudF9uYW1lLCBlKTtcblxuICAgICAgICBpZiAoZXZlbnRfbmFtZT09J2Rvd24nKSB7ICAgICAgICAgICAgXG4gICAgICAgICAgICB0aGlzLnRyaWdnZXIodGhpcy5fbW9kaWZpZXJfc3RyaW5nKGUpICsga2V5bmFtZSwgZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdGhpcy50cmlnZ2VyKHRoaXMuX21vZGlmaWVyX3N0cmluZyhlKSArIFN0cmluZyhlLmtleUNvZGUpICsgJy0nICsgZXZlbnRfbmFtZSwgZSk7XG4gICAgdGhpcy50cmlnZ2VyKCdrZXknICsgZXZlbnRfbmFtZSwgZSk7XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgd2hlbiBhIGtleXByZXNzIGV2ZW50IG9jY3Vyc1xuICogQHBhcmFtICB7SFRNTEVsZW1lbnR9IGVsXG4gKiBAcGFyYW0gIHtFdmVudH0gZVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuTm9ybWFsaXplci5wcm90b3R5cGUuX2hhbmRsZV9rZXlwcmVzc19ldmVudCA9IGZ1bmN0aW9uKGVsLCBldmVudF9uYW1lLCBlKSB7XG4gICAgdGhpcy50cmlnZ2VyKCdrZXlwcmVzcycsIGUpO1xufTtcblxuLyoqXG4gKiBDcmVhdGVzIGFuIGVsZW1lbnQgZXZlbnQgcHJveHkuXG4gKiBAcGFyYW0gIHtmdW5jdGlvbn0gZlxuICogQHBhcmFtICB7c3RyaW5nfSBldmVudF9uYW1lXG4gKiBAcGFyYW0gIHtIVE1MRWxlbWVudH0gZWxcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbk5vcm1hbGl6ZXIucHJvdG90eXBlLl9wcm94eSA9IGZ1bmN0aW9uKGV2ZW50X25hbWUsIGYsIGVsKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBbZWwsIGV2ZW50X25hbWVdLmNvbmNhdChBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApKTtcbiAgICAgICAgcmV0dXJuIGYuYXBwbHkodGhhdCwgYXJncyk7XG4gICAgfTtcbn07XG5cbi8qKlxuICogQ3JlYXRlIGEgbW9kaWZpZXJzIHN0cmluZyBmcm9tIGFuIGV2ZW50LlxuICogQHBhcmFtICB7RXZlbnR9IGVcbiAqIEByZXR1cm4ge3N0cmluZ30gZGFzaCBzZXBhcmF0ZWQgbW9kaWZpZXIgc3RyaW5nXG4gKi9cbk5vcm1hbGl6ZXIucHJvdG90eXBlLl9tb2RpZmllcl9zdHJpbmcgPSBmdW5jdGlvbihlKSB7XG4gICAgdmFyIG1vZGlmaWVycyA9IFtdO1xuICAgIGlmIChlLmN0cmxLZXkpIG1vZGlmaWVycy5wdXNoKCdjdHJsJyk7XG4gICAgaWYgKGUuYWx0S2V5KSBtb2RpZmllcnMucHVzaCgnYWx0Jyk7XG4gICAgaWYgKGUubWV0YUtleSkgbW9kaWZpZXJzLnB1c2goJ21ldGEnKTtcbiAgICBpZiAoZS5zaGlmdEtleSkgbW9kaWZpZXJzLnB1c2goJ3NoaWZ0Jyk7XG4gICAgdmFyIHN0cmluZyA9IG1vZGlmaWVycy5zb3J0KCkuam9pbignLScpO1xuICAgIGlmIChzdHJpbmcubGVuZ3RoID4gMCkgc3RyaW5nID0gc3RyaW5nICsgJy0nO1xuICAgIHJldHVybiBzdHJpbmc7XG59O1xuXG4vKipcbiAqIExvb2t1cCB0aGUgaHVtYW4gZnJpZW5kbHkgbmFtZSBmb3IgYSBrZXljb2RlLlxuICogQHBhcmFtICB7aW50ZWdlcn0ga2V5Y29kZVxuICogQHJldHVybiB7c3RyaW5nfSBrZXkgbmFtZVxuICovXG5Ob3JtYWxpemVyLnByb3RvdHlwZS5fbG9va3VwX2tleWNvZGUgPSBmdW5jdGlvbihrZXljb2RlKSB7XG4gICAgaWYgKDExMiA8PSBrZXljb2RlICYmIGtleWNvZGUgPD0gMTIzKSB7IC8vIEYxLUYxMlxuICAgICAgICByZXR1cm4gJ2YnICsgKGtleWNvZGUtMTExKTtcbiAgICB9IGVsc2UgaWYgKDQ4IDw9IGtleWNvZGUgJiYga2V5Y29kZSA8PSA1NykgeyAvLyAwLTlcbiAgICAgICAgcmV0dXJuIFN0cmluZyhrZXljb2RlLTQ4KTtcbiAgICB9IGVsc2UgaWYgKDY1IDw9IGtleWNvZGUgJiYga2V5Y29kZSA8PSA5MCkgeyAvLyBBLVpcbiAgICAgICAgcmV0dXJuICdhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5eicuc3Vic3RyaW5nKFN0cmluZyhrZXljb2RlLTY1KSwgU3RyaW5nKGtleWNvZGUtNjQpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgY29kZXMgPSB7XG4gICAgICAgICAgICA4OiAnYmFja3NwYWNlJyxcbiAgICAgICAgICAgIDk6ICd0YWInLFxuICAgICAgICAgICAgMTM6ICdlbnRlcicsXG4gICAgICAgICAgICAxNjogJ3NoaWZ0JyxcbiAgICAgICAgICAgIDE3OiAnY3RybCcsXG4gICAgICAgICAgICAxODogJ2FsdCcsXG4gICAgICAgICAgICAxOTogJ3BhdXNlJyxcbiAgICAgICAgICAgIDIwOiAnY2Fwc2xvY2snLFxuICAgICAgICAgICAgMjc6ICdlc2MnLFxuICAgICAgICAgICAgMzI6ICdzcGFjZScsXG4gICAgICAgICAgICAzMzogJ3BhZ2V1cCcsXG4gICAgICAgICAgICAzNDogJ3BhZ2Vkb3duJyxcbiAgICAgICAgICAgIDM1OiAnZW5kJyxcbiAgICAgICAgICAgIDM2OiAnaG9tZScsXG4gICAgICAgICAgICAzNzogJ2xlZnRhcnJvdycsXG4gICAgICAgICAgICAzODogJ3VwYXJyb3cnLFxuICAgICAgICAgICAgMzk6ICdyaWdodGFycm93JyxcbiAgICAgICAgICAgIDQwOiAnZG93bmFycm93JyxcbiAgICAgICAgICAgIDQ0OiAncHJpbnRzY3JlZW4nLFxuICAgICAgICAgICAgNDU6ICdpbnNlcnQnLFxuICAgICAgICAgICAgNDY6ICdkZWxldGUnLFxuICAgICAgICAgICAgOTE6ICd3aW5kb3dzJyxcbiAgICAgICAgICAgIDkzOiAnbWVudScsXG4gICAgICAgICAgICAxNDQ6ICdudW1sb2NrJyxcbiAgICAgICAgICAgIDE0NTogJ3Njcm9sbGxvY2snLFxuICAgICAgICAgICAgMTg4OiAnY29tbWEnLFxuICAgICAgICAgICAgMTkwOiAncGVyaW9kJyxcbiAgICAgICAgICAgIDE5MTogJ2Zvd2FyZHNsYXNoJyxcbiAgICAgICAgICAgIDE5MjogJ3RpbGRlJyxcbiAgICAgICAgICAgIDIxOTogJ2xlZnRicmFja2V0JyxcbiAgICAgICAgICAgIDIyMDogJ2JhY2tzbGFzaCcsXG4gICAgICAgICAgICAyMjE6ICdyaWdodGJyYWNrZXQnLFxuICAgICAgICAgICAgMjIyOiAncXVvdGUnLFxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gY29kZXNba2V5Y29kZV07XG4gICAgfSBcbiAgICAvLyBUT0RPOiB0aGlzIGZ1bmN0aW9uIGlzIG1pc3Npbmcgc29tZSBicm93c2VyIHNwZWNpZmljXG4gICAgLy8ga2V5Y29kZSBtYXBwaW5ncy5cbn07XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuTm9ybWFsaXplciA9IE5vcm1hbGl6ZXI7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy5qcycpO1xuXG4vKipcbiAqIExpc3RlbnMgdG8gYSBtb2RlbCBhbmQgaGlnbGlnaHRzIHRoZSB0ZXh0IGFjY29yZGluZ2x5LlxuICogQHBhcmFtIHtEb2N1bWVudE1vZGVsfSBtb2RlbFxuICovXG52YXIgSGlnaGxpZ2h0ZXJCYXNlID0gZnVuY3Rpb24obW9kZWwpIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMuX21vZGVsID0gbW9kZWw7XG4gICAgdGhpcy5fcXVldWVkID0gbnVsbDtcbiAgICB0aGlzLmRlbGF5ID0gMTAwOyAvL21zXG5cbiAgICAvLyBCaW5kIGV2ZW50cy5cbiAgICB0aGlzLl9tb2RlbC5vbigndGV4dF9jaGFuZ2VkJywgdXRpbHMucHJveHkodGhpcy5fcXVldWVfaGlnaGxpZ2h0ZXIsIHRoaXMpKTtcbiAgICB0aGlzLl9tb2RlbC5vbigncm93X2NoYW5nZWQnLCB1dGlscy5wcm94eSh0aGlzLl9xdWV1ZV9oaWdobGlnaHRlciwgdGhpcykpO1xufTtcbnV0aWxzLmluaGVyaXQoSGlnaGxpZ2h0ZXJCYXNlLCB1dGlscy5Qb3N0ZXJDbGFzcyk7XG5cbi8qKlxuICogSGlnaGxpZ2h0IHRoZSBkb2N1bWVudFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuSGlnaGxpZ2h0ZXJCYXNlLnByb3RvdHlwZS5oaWdobGlnaHQgPSBmdW5jdGlvbigpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ05vdCBpbXBsZW1lbnRlZCcpO1xufTtcblxuLyoqXG4gKiBRdWV1ZXMgYSBoaWdobGlnaHQgb3BlcmF0aW9uLlxuICpcbiAqIElmIGEgaGlnaGxpZ2h0IG9wZXJhdGlvbiBpcyBhbHJlYWR5IHF1ZXVlZCwgZG9uJ3QgcXVldWVcbiAqIGFub3RoZXIgb25lLiAgVGhpcyBlbnN1cmVzIHRoYXQgdGhlIGhpZ2hsaWdodGluZyBpc1xuICogZnJhbWUgcmF0ZSBsb2NrZWQuICBIaWdobGlnaHRpbmcgaXMgYW4gZXhwZW5zaXZlIG9wZXJhdGlvbi5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkhpZ2hsaWdodGVyQmFzZS5wcm90b3R5cGUuX3F1ZXVlX2hpZ2hsaWdodGVyID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuX3F1ZXVlZCA9PT0gbnVsbCkge1xuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgIHRoaXMuX3F1ZXVlZCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0aGF0Ll9tb2RlbC5hY3F1aXJlX3RhZ19ldmVudF9sb2NrKCk7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHRoYXQuaGlnaGxpZ2h0KCk7XG4gICAgICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgICAgIHRoYXQuX21vZGVsLnJlbGVhc2VfdGFnX2V2ZW50X2xvY2soKTtcbiAgICAgICAgICAgICAgICB0aGF0Ll9tb2RlbC50cmlnZ2VyX3RhZ19ldmVudHMoKTtcbiAgICAgICAgICAgICAgICB0aGF0Ll9xdWV1ZWQgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0aGlzLmRlbGF5KTtcbiAgICB9XG59O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLkhpZ2hsaWdodGVyQmFzZSA9IEhpZ2hsaWdodGVyQmFzZTtcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzLmpzJyk7XG52YXIgaGlnaGxpZ2h0ZXIgPSByZXF1aXJlKCcuL2hpZ2hsaWdodGVyLmpzJyk7XG5cbi8qKlxuICogTGlzdGVucyB0byBhIG1vZGVsIGFuZCBoaWdsaWdodHMgdGhlIHRleHQgYWNjb3JkaW5nbHkuXG4gKiBAcGFyYW0ge0RvY3VtZW50TW9kZWx9IG1vZGVsXG4gKi9cbnZhciBUZXN0SGlnaGxpZ2h0ZXIgPSBmdW5jdGlvbihtb2RlbCkge1xuICAgIGhpZ2hsaWdodGVyLkhpZ2hsaWdodGVyQmFzZS5jYWxsKHRoaXMsIG1vZGVsKTtcbn07XG51dGlscy5pbmhlcml0KFRlc3RIaWdobGlnaHRlciwgaGlnaGxpZ2h0ZXIuSGlnaGxpZ2h0ZXJCYXNlKTtcblxuLyoqXG4gKiBIaWdobGlnaHQgdGhlIGRvY3VtZW50XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5UZXN0SGlnaGxpZ2h0ZXIucHJvdG90eXBlLmhpZ2hsaWdodCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIFRFU1QgSGlnaGxpZ2h0aW5nXG4gICAgdGhpcy5fbW9kZWwuY2xlYXJfdGFncygpO1xuICAgIGZvciAodmFyIHJvd19pbmRleD0wOyByb3dfaW5kZXg8dGhpcy5fbW9kZWwuX3Jvd3MubGVuZ3RoOyByb3dfaW5kZXgrKykge1xuICAgICAgICAvLyBIaWdobGlnaHQgYWxsIEVTLlxuICAgICAgICB2YXIgcm93ID0gdGhpcy5fbW9kZWwuX3Jvd3Nbcm93X2luZGV4XTtcbiAgICAgICAgdmFyIGluZGV4ID0gcm93LmluZGV4T2YoJ2VzJyk7XG4gICAgICAgIHdoaWxlIChpbmRleCAhPSAtMSkge1xuICAgICAgICAgICAgdGhpcy5fbW9kZWwuc2V0X3RhZyhyb3dfaW5kZXgsIGluZGV4LCByb3dfaW5kZXgsIGluZGV4KzEsICdzeW50YXgnLCAna2V5d29yZCcpO1xuICAgICAgICAgICAgaW5kZXggPSByb3cuaW5kZXhPZignZXMnLCBpbmRleCsxKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuVGVzdEhpZ2hsaWdodGVyID0gVGVzdEhpZ2hsaWdodGVyO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMuanMnKTtcbnZhciByZW5kZXJlciA9IHJlcXVpcmUoJy4vcmVuZGVyZXIuanMnKTtcblxuLyoqXG4gKiBHcm91cHMgbXVsdGlwbGUgcmVuZGVyZXJzXG4gKiBAcGFyYW0ge2FycmF5fSByZW5kZXJlcnMgLSBhcnJheSBvZiByZW5kZXJlcnNcbiAqIEBwYXJhbSB7Q2FudmFzfSBjYW52YXNcbiAqL1xudmFyIEJhdGNoUmVuZGVyZXIgPSBmdW5jdGlvbihyZW5kZXJlcnMsIGNhbnZhcykge1xuICAgIHJlbmRlcmVyLlJlbmRlcmVyQmFzZS5jYWxsKHRoaXMsIGNhbnZhcyk7XG4gICAgdGhpcy5fcmVuZGVyZXJzID0gcmVuZGVyZXJzO1xuXG4gICAgLy8gTGlzdGVuIHRvIHRoZSBsYXllcnMsIGlmIG9uZSBsYXllciBjaGFuZ2VzLCByZWNvbXBvc2VcbiAgICAvLyB0aGUgZnVsbCBpbWFnZSBieSBjb3B5aW5nIHRoZW0gYWxsIGFnYWluLlxuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLl9yZW5kZXJlcnMuZm9yRWFjaChmdW5jdGlvbihyZW5kZXJlcikge1xuICAgICAgICByZW5kZXJlci5vbignY2hhbmdlZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhhdC5fY29weV9yZW5kZXJlcnMoKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgXG4gICAgLy8gQ3JlYXRlIHByb3BlcnRpZXMuXG4gICAgdGhpcy5wcm9wZXJ0eSgnd2lkdGgnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoYXQuX2NhbnZhcy53aWR0aDtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0Ll9jYW52YXMud2lkdGggPSB2YWx1ZTtcbiAgICAgICAgdGhhdC5fcmVuZGVyZXJzLmZvckVhY2goZnVuY3Rpb24ocmVuZGVyZXIpIHtcbiAgICAgICAgICAgIHJlbmRlcmVyLndpZHRoID0gdmFsdWU7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIHRoaXMucHJvcGVydHkoJ2hlaWdodCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC5fY2FudmFzLmhlaWdodDtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0Ll9jYW52YXMuaGVpZ2h0ID0gdmFsdWU7XG4gICAgICAgIHRoYXQuX3JlbmRlcmVycy5mb3JFYWNoKGZ1bmN0aW9uKHJlbmRlcmVyKSB7XG4gICAgICAgICAgICByZW5kZXJlci5oZWlnaHQgPSB2YWx1ZTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59O1xudXRpbHMuaW5oZXJpdChCYXRjaFJlbmRlcmVyLCByZW5kZXJlci5SZW5kZXJlckJhc2UpO1xuXG4vKipcbiAqIFJlbmRlciB0byB0aGUgY2FudmFzXG4gKiBAcGFyYW0ge2RpY3Rpb25hcnl9IChvcHRpb25hbCkgc2Nyb2xsIC0gSG93IG11Y2ggdGhlIGNhbnZhcyB3YXMgc2Nyb2xsZWQuICBUaGlzXG4gKiAgICAgICAgICAgICAgICAgICAgIGlzIGEgZGljdGlvbmFyeSBvZiB0aGUgZm9ybSB7eDogZmxvYXQsIHk6IGZsb2F0fVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQmF0Y2hSZW5kZXJlci5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24oc2Nyb2xsKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMuX3JlbmRlcmVycy5mb3JFYWNoKGZ1bmN0aW9uKHJlbmRlcmVyKSB7XG5cbiAgICAgICAgLy8gQXBwbHkgdGhlIHJlbmRlcmluZyBjb29yZGluYXRlIHRyYW5zZm9ybXMgb2YgdGhlIHBhcmVudC5cbiAgICAgICAgcmVuZGVyZXIuX2NhbnZhcy5fdHggPSB1dGlscy5wcm94eSh0aGF0Ll9jYW52YXMuX3R4LCB0aGF0Ll9jYW52YXMpO1xuICAgICAgICByZW5kZXJlci5fY2FudmFzLl90eSA9IHV0aWxzLnByb3h5KHRoYXQuX2NhbnZhcy5fdHksIHRoYXQuX2NhbnZhcyk7XG5cbiAgICAgICAgLy8gVGVsbCB0aGUgcmVuZGVyZXIgdG8gcmVuZGVyIGl0c2VsZi5cbiAgICAgICAgcmVuZGVyZXIucmVuZGVyKHNjcm9sbCk7XG4gICAgfSk7XG5cbiAgICAvLyBDb3B5IHRoZSByZXN1bHRzIHRvIHNlbGYuXG4gICAgdGhpcy5fY29weV9yZW5kZXJlcnMoKTtcbn07XG5cbi8qKlxuICogQ29waWVzIGFsbCB0aGUgcmVuZGVyZXIgbGF5ZXJzIHRvIHRoZSBjYW52YXMuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5CYXRjaFJlbmRlcmVyLnByb3RvdHlwZS5fY29weV9yZW5kZXJlcnMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdGhpcy5fY2FudmFzLmNsZWFyKCk7XG4gICAgdGhpcy5fcmVuZGVyZXJzLmZvckVhY2goZnVuY3Rpb24ocmVuZGVyZXIpIHtcbiAgICAgICAgdGhhdC5fY29weV9yZW5kZXJlcihyZW5kZXJlcik7XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIENvcHkgYSByZW5kZXJlciB0byB0aGUgY2FudmFzLlxuICogQHBhcmFtICB7UmVuZGVyZXJCYXNlfSByZW5kZXJlclxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQmF0Y2hSZW5kZXJlci5wcm90b3R5cGUuX2NvcHlfcmVuZGVyZXIgPSBmdW5jdGlvbihyZW5kZXJlcikge1xuICAgIHRoaXMuX2NhbnZhcy5kcmF3X2ltYWdlKFxuICAgICAgICByZW5kZXJlci5fY2FudmFzLl9jYW52YXMsIFxuICAgICAgICAtdGhpcy5fY2FudmFzLl90eCgwKSwgXG4gICAgICAgIC10aGlzLl9jYW52YXMuX3R5KDApLCBcbiAgICAgICAgdGhpcy5fY2FudmFzLndpZHRoLCBcbiAgICAgICAgdGhpcy5fY2FudmFzLmhlaWdodCk7XG59O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLkJhdGNoUmVuZGVyZXIgPSBCYXRjaFJlbmRlcmVyO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIGFuaW1hdG9yID0gcmVxdWlyZSgnLi4vYW5pbWF0b3IuanMnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzLmpzJyk7XG52YXIgcmVuZGVyZXIgPSByZXF1aXJlKCcuL3JlbmRlcmVyLmpzJyk7XG5cbi8qKlxuICogUmVuZGVyIGRvY3VtZW50IGN1cnNvcnNcbiAqL1xudmFyIEN1cnNvcnNSZW5kZXJlciA9IGZ1bmN0aW9uKGN1cnNvcnMsIHN0eWxlLCBnZXRfcm93X2hlaWdodCwgZ2V0X3Jvd190b3AsIG1lYXN1cmVfcGFydGlhbF9yb3csIGhhc19mb2N1cykge1xuICAgIHJlbmRlcmVyLlJlbmRlcmVyQmFzZS5jYWxsKHRoaXMpO1xuICAgIHRoaXMuc3R5bGUgPSBzdHlsZTtcbiAgICB0aGlzLl9oYXNfZm9jdXMgPSBoYXNfZm9jdXM7XG4gICAgdGhpcy5fY3Vyc29ycyA9IGN1cnNvcnM7XG4gICAgdGhpcy5fZ2V0X3Jvd19oZWlnaHQgPSBnZXRfcm93X2hlaWdodDtcbiAgICB0aGlzLl9nZXRfcm93X3RvcCA9IGdldF9yb3dfdG9wO1xuICAgIHRoaXMuX21lYXN1cmVfcGFydGlhbF9yb3cgPSBtZWFzdXJlX3BhcnRpYWxfcm93O1xuICAgIHRoaXMuX2JsaW5rX2FuaW1hdG9yID0gbmV3IGFuaW1hdG9yLkFuaW1hdG9yKDEwMDApO1xuICAgIHRoaXMuX2ZwcyA9IDEwMDtcblxuICAgIC8vIFN0YXJ0IHRoZSBjdXJzb3IgcmVuZGVyaW5nIGNsb2NrLlxuICAgIHRoaXMuX3JlbmRlcl9jbG9jaygpO1xufTtcbnV0aWxzLmluaGVyaXQoQ3Vyc29yc1JlbmRlcmVyLCByZW5kZXJlci5SZW5kZXJlckJhc2UpO1xuXG4vKipcbiAqIFJlbmRlciB0byB0aGUgY2FudmFzXG4gKiBOb3RlOiBUaGlzIG1ldGhvZCBpcyBjYWxsZWQgb2Z0ZW4sIHNvIGl0J3MgaW1wb3J0YW50IHRoYXQgaXQnc1xuICogb3B0aW1pemVkIGZvciBzcGVlZC5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvcnNSZW5kZXJlci5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fY2FudmFzLmNsZWFyKCk7XG5cbiAgICAvLyBPbmx5IHJlbmRlciBpZiB0aGUgY2FudmFzIGhhcyBmb2N1cy5cbiAgICBpZiAodGhpcy5faGFzX2ZvY3VzKCkpIHtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICB0aGlzLl9jdXJzb3JzLmN1cnNvcnMuZm9yRWFjaChmdW5jdGlvbihjdXJzb3IpIHtcblxuICAgICAgICAgICAgLy8gSWYgYSBjdXJzb3IgZG9lc24ndCBoYXZlIGEgcG9zaXRpb24sIHJlbmRlciBpdCBhdCB0aGVcbiAgICAgICAgICAgIC8vIGJlZ2lubmluZyBvZiB0aGUgZG9jdW1lbnQuXG4gICAgICAgICAgICB2YXIgcm93X2luZGV4ID0gY3Vyc29yLnByaW1hcnlfcm93IHx8IDA7XG4gICAgICAgICAgICB2YXIgY2hhcl9pbmRleCA9IGN1cnNvci5wcmltYXJ5X2NoYXIgfHwgMDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRHJhdyB0aGUgY3Vyc29yLlxuICAgICAgICAgICAgdGhhdC5fY2FudmFzLmRyYXdfcmVjdGFuZ2xlKFxuICAgICAgICAgICAgICAgIGNoYXJfaW5kZXggPT09IDAgPyAwIDogdGhhdC5fbWVhc3VyZV9wYXJ0aWFsX3Jvdyhyb3dfaW5kZXgsIGNoYXJfaW5kZXgpLCBcbiAgICAgICAgICAgICAgICB0aGF0Ll9nZXRfcm93X3RvcChyb3dfaW5kZXgpLCBcbiAgICAgICAgICAgICAgICAxLCBcbiAgICAgICAgICAgICAgICB0aGF0Ll9nZXRfcm93X2hlaWdodChyb3dfaW5kZXgpLCBcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGZpbGxfY29sb3I6ICdyZWQnLFxuICAgICAgICAgICAgICAgICAgICBhbHBoYTogTWF0aC5tYXgoMCwgTWF0aC5zaW4oTWF0aC5QSSAqIHRoYXQuX2JsaW5rX2FuaW1hdG9yLnRpbWUoKSkpLFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIC8vIERyYXcgdGhlIHNlbGVjdGlvbiBib3guXG4gICAgICAgICAgICBpZiAoY3Vyc29yLnN0YXJ0X3JvdyAhPT0gbnVsbCAmJiBjdXJzb3Iuc3RhcnRfY2hhciAhPT0gbnVsbCAmJlxuICAgICAgICAgICAgICAgIGN1cnNvci5lbmRfcm93ICE9PSBudWxsICYmIGN1cnNvci5lbmRfY2hhciAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSBjdXJzb3Iuc3RhcnRfcm93OyBpIDw9IGN1cnNvci5lbmRfcm93OyBpKyspIHtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgbGVmdCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpID09IGN1cnNvci5zdGFydF9yb3cgJiYgY3Vyc29yLnN0YXJ0X2NoYXIgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZWZ0ID0gdGhhdC5fbWVhc3VyZV9wYXJ0aWFsX3JvdyhpLCBjdXJzb3Iuc3RhcnRfY2hhcik7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICB0aGF0Ll9jYW52YXMuZHJhd19yZWN0YW5nbGUoXG4gICAgICAgICAgICAgICAgICAgICAgICBsZWZ0LCBcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuX2dldF9yb3dfdG9wKGkpLCBcbiAgICAgICAgICAgICAgICAgICAgICAgIGkgIT09IGN1cnNvci5lbmRfcm93ID8gdGhhdC5fbWVhc3VyZV9wYXJ0aWFsX3JvdyhpKSAtIGxlZnQgOiB0aGF0Ll9tZWFzdXJlX3BhcnRpYWxfcm93KGksIGN1cnNvci5lbmRfY2hhcikgLSBsZWZ0LCBcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuX2dldF9yb3dfaGVpZ2h0KGkpLCBcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxsX2NvbG9yOiAnc2t5Ymx1ZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWxwaGE6IDAuNSxcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG5cbi8qKlxuICogQ2xvY2sgZm9yIHJlbmRlcmluZyB0aGUgY3Vyc29yLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29yc1JlbmRlcmVyLnByb3RvdHlwZS5fcmVuZGVyX2Nsb2NrID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gSWYgdGhlIGNhbnZhcyBpcyBmb2N1c2VkLCByZWRyYXcuXG4gICAgaWYgKHRoaXMuX2hhc19mb2N1cygpKSB7XG4gICAgICAgIHRoaXMuX3dhc19mb2N1c2VkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgLy8gVGVsbCBwYXJlbnQgbGF5ZXIgdGhpcyBvbmUgaGFzIGNoYW5nZWQuXG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpO1xuXG4gICAgLy8gVGhlIGNhbnZhcyBpc24ndCBmb2N1c2VkLiAgSWYgdGhpcyBpcyB0aGUgZmlyc3QgdGltZVxuICAgIC8vIGl0IGhhc24ndCBiZWVuIGZvY3VzZWQsIHJlbmRlciBhZ2FpbiB3aXRob3V0IHRoZSBcbiAgICAvLyBjdXJzb3JzLlxuICAgIH0gZWxzZSBpZiAodGhpcy5fd2FzX2ZvY3VzZWQpIHtcbiAgICAgICAgdGhpcy5fd2FzX2ZvY3VzZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgLy8gVGVsbCBwYXJlbnQgbGF5ZXIgdGhpcyBvbmUgaGFzIGNoYW5nZWQuXG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpO1xuICAgIH1cblxuICAgIC8vIDEwMCBGUFNcbiAgICBzZXRUaW1lb3V0KHV0aWxzLnByb3h5KHRoaXMuX3JlbmRlcl9jbG9jaywgdGhpcyksIDEwMDAgLyB0aGlzLl9mcHMpOyBcbn07XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuQ3Vyc29yc1JlbmRlcmVyID0gQ3Vyc29yc1JlbmRlcmVyO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMuanMnKTtcbnZhciByb3cgPSByZXF1aXJlKCcuL3Jvdy5qcycpO1xuXG4vKipcbiAqIFJlbmRlciB0aGUgdGV4dCByb3dzIG9mIGEgRG9jdW1lbnRNb2RlbC5cbiAqIEBwYXJhbSB7RG9jdW1lbnRNb2RlbH0gbW9kZWwgaW5zdGFuY2VcbiAqL1xudmFyIEhpZ2hsaWdodGVkUm93UmVuZGVyZXIgPSBmdW5jdGlvbihtb2RlbCwgc2Nyb2xsaW5nX2NhbnZhcywgc3R5bGUpIHtcbiAgICByb3cuUm93UmVuZGVyZXIuY2FsbCh0aGlzLCBtb2RlbCwgc2Nyb2xsaW5nX2NhbnZhcyk7XG4gICAgdGhpcy5zdHlsZSA9IHN0eWxlO1xufTtcbnV0aWxzLmluaGVyaXQoSGlnaGxpZ2h0ZWRSb3dSZW5kZXJlciwgcm93LlJvd1JlbmRlcmVyKTtcblxuLyoqXG4gKiBSZW5kZXIgYSBzaW5nbGUgcm93XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBpbmRleFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuSGlnaGxpZ2h0ZWRSb3dSZW5kZXJlci5wcm90b3R5cGUuX3JlbmRlcl9yb3cgPSBmdW5jdGlvbihpbmRleCkge1xuICAgIGlmIChpbmRleCA8IDAgfHwgdGhpcy5fbW9kZWwuX3Jvd3MubGVuZ3RoIDw9IGluZGV4KSByZXR1cm47XG4gICAgXG4gICAgdmFyIGdyb3VwcyA9IHRoaXMuX2dldF9ncm91cHMoaW5kZXgpO1xuICAgIHZhciBsZWZ0ID0gMDtcbiAgICBmb3IgKHZhciBpPTA7IGk8Z3JvdXBzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHRoaXMuX2NhbnZhcy5kcmF3X3RleHQobGVmdCwgdGhpcy5nZXRfcm93X3RvcChpbmRleCksIGdyb3Vwc1tpXS50ZXh0LCBncm91cHNbaV0ub3B0aW9ucyk7XG4gICAgICAgIGxlZnQgKz0gdGhpcy5fY2FudmFzLm1lYXN1cmVfdGV4dChncm91cHNbaV0udGV4dCwgZ3JvdXBzW2ldLm9wdGlvbnMpO1xuICAgIH1cbn07XG5cbi8qKlxuICogR2V0IHJlbmRlciBncm91cHMgZm9yIGEgcm93LlxuICogQHBhcmFtICB7aW50ZWdlcn0gaW5kZXggb2YgdGhlIHJvd1xuICogQHJldHVybiB7YXJyYXl9IGFycmF5IG9mIHJlbmRlcmluZ3MsIGVhY2ggcmVuZGVyaW5nIGlzIGFuIGFycmF5IG9mXG4gKiAgICAgICAgICAgICAgICAgdGhlIGZvcm0ge29wdGlvbnMsIHRleHR9LlxuICovXG5IaWdobGlnaHRlZFJvd1JlbmRlcmVyLnByb3RvdHlwZS5fZ2V0X2dyb3VwcyA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgaWYgKGluZGV4IDwgMCB8fCB0aGlzLl9tb2RlbC5fcm93cy5sZW5ndGggPD0gaW5kZXgpIHJldHVybjtcblxuICAgIHZhciByb3dfdGV4dCA9IHRoaXMuX21vZGVsLl9yb3dzW2luZGV4XTtcbiAgICB2YXIgZ3JvdXBzID0gW107XG4gICAgdmFyIGxhc3Rfc3ludGF4ID0gbnVsbDtcbiAgICB2YXIgY2hhcl9pbmRleCA9IDA7XG4gICAgdmFyIHN0YXJ0ID0gMDtcbiAgICBmb3IgKGNoYXJfaW5kZXg7IGNoYXJfaW5kZXg8cm93X3RleHQubGVuZ3RoOyBjaGFyX2luZGV4KyspIHtcbiAgICAgICAgdmFyIHN5bnRheCA9IHRoaXMuX21vZGVsLmdldF90YWdzKGluZGV4LCBjaGFyX2luZGV4KS5zeW50YXg7XG4gICAgICAgIGlmICghdGhpcy5fY29tcGFyZV9zeW50YXgobGFzdF9zeW50YXgsc3ludGF4KSkge1xuICAgICAgICAgICAgaWYgKGNoYXJfaW5kZXggIT09IDApIHtcbiAgICAgICAgICAgICAgICBncm91cHMucHVzaCh7b3B0aW9uczogdGhpcy5fZ2V0X29wdGlvbnMobGFzdF9zeW50YXgpLCB0ZXh0OiByb3dfdGV4dC5zdWJzdHJpbmcoc3RhcnQsIGNoYXJfaW5kZXgpfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsYXN0X3N5bnRheCA9IHN5bnRheDtcbiAgICAgICAgICAgIHN0YXJ0ID0gY2hhcl9pbmRleDtcbiAgICAgICAgfVxuICAgIH1cbiAgICBncm91cHMucHVzaCh7b3B0aW9uczogdGhpcy5fZ2V0X29wdGlvbnMobGFzdF9zeW50YXgpLCB0ZXh0OiByb3dfdGV4dC5zdWJzdHJpbmcoc3RhcnQpfSk7XG5cbiAgICByZXR1cm4gZ3JvdXBzO1xufTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgc3R5bGUgb3B0aW9ucyBkaWN0aW9uYXJ5IGZyb20gYSBzeW50YXggdGFnLlxuICogQHBhcmFtICB7c3RyaW5nfSBzeW50YXhcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkhpZ2hsaWdodGVkUm93UmVuZGVyZXIucHJvdG90eXBlLl9nZXRfb3B0aW9ucyA9IGZ1bmN0aW9uKHN5bnRheCkge1xuICAgIHZhciByZW5kZXJfb3B0aW9ucyA9IHV0aWxzLnNoYWxsb3dfY29weSh0aGlzLl9iYXNlX29wdGlvbnMpO1xuXG4gICAgaWYgKHN5bnRheCAmJiB0aGlzLnN0eWxlICYmIHRoaXMuc3R5bGVbc3ludGF4XSkge1xuICAgICAgICByZW5kZXJfb3B0aW9ucy5jb2xvciA9IHRoaXMuc3R5bGVbc3ludGF4XTtcbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIHJlbmRlcl9vcHRpb25zO1xufTtcblxuLyoqXG4gKiBDb21wYXJlIHR3byBzeW50YXhzLlxuICogQHBhcmFtICB7c3RyaW5nfSBhIC0gc3ludGF4XG4gKiBAcGFyYW0gIHtzdHJpbmd9IGIgLSBzeW50YXhcbiAqIEByZXR1cm4ge2Jvb2x9IHRydWUgaWYgYSBhbmQgYiBhcmUgZXF1YWxcbiAqL1xuSGlnaGxpZ2h0ZWRSb3dSZW5kZXJlci5wcm90b3R5cGUuX2NvbXBhcmVfc3ludGF4ID0gZnVuY3Rpb24oYSwgYikge1xuICAgIHJldHVybiBhID09PSBiO1xufTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5IaWdobGlnaHRlZFJvd1JlbmRlcmVyID0gSGlnaGxpZ2h0ZWRSb3dSZW5kZXJlcjtcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbnZhciBjYW52YXMgPSByZXF1aXJlKCcuLi9jYW52YXMuanMnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzLmpzJyk7XG5cbi8qKlxuICogUmVuZGVycyB0byBhIGNhbnZhc1xuICogQHBhcmFtIHtDYW52YXN9IGRlZmF1bHRfY2FudmFzXG4gKi9cbnZhciBSZW5kZXJlckJhc2UgPSBmdW5jdGlvbihkZWZhdWx0X2NhbnZhcykge1xuICAgIHV0aWxzLlBvc3RlckNsYXNzLmNhbGwodGhpcyk7XG4gICAgdGhpcy5fY2FudmFzID0gZGVmYXVsdF9jYW52YXMgPyBkZWZhdWx0X2NhbnZhcyA6IG5ldyBjYW52YXMuQ2FudmFzKCk7XG4gICAgXG4gICAgLy8gQ3JlYXRlIHByb3BlcnRpZXMuXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMucHJvcGVydHkoJ3dpZHRoJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Ll9jYW52YXMud2lkdGg7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC5fY2FudmFzLndpZHRoID0gdmFsdWU7XG4gICAgfSk7XG4gICAgdGhpcy5wcm9wZXJ0eSgnaGVpZ2h0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Ll9jYW52YXMuaGVpZ2h0O1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQuX2NhbnZhcy5oZWlnaHQgPSB2YWx1ZTtcbiAgICB9KTtcbiAgICAgICAgXG4gICAgLy8gU3RyZXRjaCB0aGUgaW1hZ2UgZm9yIHJldGluYSBzdXBwb3J0LlxuICAgIHRoaXMuX2NhbnZhcy5zY2FsZSgyLDIpO1xufTtcbnV0aWxzLmluaGVyaXQoUmVuZGVyZXJCYXNlLCB1dGlscy5Qb3N0ZXJDbGFzcyk7XG5cbi8qKlxuICogUmVuZGVyIHRvIHRoZSBjYW52YXNcbiAqIEBwYXJhbSB7ZGljdGlvbmFyeX0gKG9wdGlvbmFsKSBzY3JvbGwgLSBIb3cgbXVjaCB0aGUgY2FudmFzIHdhcyBzY3JvbGxlZC4gIFRoaXNcbiAqICAgICAgICAgICAgICAgICAgICAgaXMgYSBkaWN0aW9uYXJ5IG9mIHRoZSBmb3JtIHt4OiBmbG9hdCwgeTogZmxvYXR9XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5SZW5kZXJlckJhc2UucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKHNjcm9sbCkge1xuICAgIHRocm93IG5ldyBFcnJvcignTm90IGltcGxlbWVudGVkJyk7XG59O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLlJlbmRlcmVyQmFzZSA9IFJlbmRlcmVyQmFzZTtcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzLmpzJyk7XG52YXIgcmVuZGVyZXIgPSByZXF1aXJlKCcuL3JlbmRlcmVyLmpzJyk7XG5cbi8qKlxuICogUmVuZGVyIHRoZSB0ZXh0IHJvd3Mgb2YgYSBEb2N1bWVudE1vZGVsLlxuICogQHBhcmFtIHtEb2N1bWVudE1vZGVsfSBtb2RlbCBpbnN0YW5jZVxuICovXG52YXIgUm93UmVuZGVyZXIgPSBmdW5jdGlvbihtb2RlbCwgc2Nyb2xsaW5nX2NhbnZhcykge1xuICAgIHRoaXMuX3Njcm9sbGluZ19jYW52YXMgPSBzY3JvbGxpbmdfY2FudmFzO1xuICAgIHJlbmRlcmVyLlJlbmRlcmVyQmFzZS5jYWxsKHRoaXMpO1xuICAgIHRoaXMuX21vZGVsID0gbW9kZWw7XG5cbiAgICAvLyBTZXQgc29tZSBiYXNpYyByZW5kZXJpbmcgcHJvcGVydGllcy5cbiAgICB0aGlzLl9iYXNlX29wdGlvbnMgPSB7XG4gICAgICAgIGZvbnRfZmFtaWx5OiAnbW9ub3NwYWNlJyxcbiAgICAgICAgZm9udF9zaXplOiAxMixcbiAgICB9O1xuICAgIHRoaXMuX2xpbmVfc3BhY2luZyA9IDI7XG5cbiAgICB0aGlzLl9tb2RlbC5vbigndGFnc19jaGFuZ2VkJywgdXRpbHMucHJveHkodGhpcy5faGFuZGxlX3ZhbHVlX2NoYW5nZWQsIHRoaXMpKTtcbiAgICB0aGlzLl9tb2RlbC5vbigndGV4dF9jaGFuZ2VkJywgdXRpbHMucHJveHkodGhpcy5faGFuZGxlX3ZhbHVlX2NoYW5nZWQsIHRoaXMpKTtcbiAgICB0aGlzLl9tb2RlbC5vbigncm93X2NoYW5nZWQnLCB1dGlscy5wcm94eSh0aGlzLl9oYW5kbGVfcm93X2NoYW5nZWQsIHRoaXMpKTsgLy8gVE9ETzogSW1wbGVtZW50IG15IGV2ZW50LlxufTtcbnV0aWxzLmluaGVyaXQoUm93UmVuZGVyZXIsIHJlbmRlcmVyLlJlbmRlcmVyQmFzZSk7XG5cbi8qKlxuICogUmVuZGVyIHRvIHRoZSBjYW52YXNcbiAqIE5vdGU6IFRoaXMgbWV0aG9kIGlzIGNhbGxlZCBvZnRlbiwgc28gaXQncyBpbXBvcnRhbnQgdGhhdCBpdCdzXG4gKiBvcHRpbWl6ZWQgZm9yIHNwZWVkLlxuICogQHBhcmFtIHtkaWN0aW9uYXJ5fSAob3B0aW9uYWwpIHNjcm9sbCAtIEhvdyBtdWNoIHRoZSBjYW52YXMgd2FzIHNjcm9sbGVkLiAgVGhpc1xuICogICAgICAgICAgICAgICAgICAgICBpcyBhIGRpY3Rpb25hcnkgb2YgdGhlIGZvcm0ge3g6IGZsb2F0LCB5OiBmbG9hdH1cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbihzY3JvbGwpIHtcbiAgICB2YXIgaTtcblxuICAgIC8vIEZpbmQgdGhlIHJvdyBjbG9zZXN0IHRvIHRoZSBzY3JvbGwgdG9wLiAgSWYgdGhhdCByb3cgaXMgYmVsb3dcbiAgICAvLyB0aGUgc2Nyb2xsIHRvcCwgdXNlIHRoZSBwYXJ0aWFsbHkgZGlzcGxheWVkIHJvdyBhYm92ZSBpdC5cbiAgICB2YXIgbmV3X3RvcF9yb3cgPSBNYXRoLm1heCgwLCBNYXRoLmZsb29yKHRoaXMuX3Njcm9sbGluZ19jYW52YXMuc2Nyb2xsX3RvcCAgLyB0aGlzLmdldF9yb3dfaGVpZ2h0KCkpKTtcblxuICAgIC8vIEZpbmQgdGhlIHJvdyBjbG9zZXN0IHRvIHRoZSBzY3JvbGwgYm90dG9tLiAgSWYgdGhhdCByb3cgaXMgYWJvdmVcbiAgICAvLyB0aGUgc2Nyb2xsIGJvdHRvbSwgdXNlIHRoZSBwYXJ0aWFsbHkgZGlzcGxheWVkIHJvdyBiZWxvdyBpdC5cbiAgICB2YXIgcm93X2NvdW50ID0gTWF0aC5jZWlsKHRoaXMuX2NhbnZhcy5oZWlnaHQgLyB0aGlzLmdldF9yb3dfaGVpZ2h0KCkpO1xuICAgIHZhciBuZXdfYm90dG9tX3JvdyA9IG5ld190b3Bfcm93ICsgcm93X2NvdW50O1xuXG4gICAgLy8gSWYgb25seSB0aGUgeSBheGlzIHdhcyBzY3JvbGxlZCwgYmxpdCB0aGUgZ29vZCBjb250ZW50cyBhbmQganVzdCByZW5kZXJcbiAgICAvLyB3aGF0J3MgbWlzc2luZy5cbiAgICBpZiAoc2Nyb2xsICYmIHNjcm9sbC54ID09PSAwICYmIE1hdGguYWJzKHNjcm9sbC55KSA8IHRoaXMuX2NhbnZhcy5oZWlnaHQpIHtcblxuICAgICAgICAvLyBDb3B5IG9sZCBjb250ZW50cy5cbiAgICAgICAgdmFyIG9sZF9yZW5kZXIgPSB0aGlzLl9jYW52YXMuZ2V0X3Jhd19pbWFnZShcbiAgICAgICAgICAgIHRoaXMuX3Njcm9sbGluZ19jYW52YXMuc2Nyb2xsX2xlZnQsIFxuICAgICAgICAgICAgdGhpcy5fc2Nyb2xsaW5nX2NhbnZhcy5zY3JvbGxfdG9wLCBcbiAgICAgICAgICAgIHRoaXMuX2NhbnZhcy53aWR0aCwgdGhpcy5fY2FudmFzLmhlaWdodCk7XG4gICAgICAgIHRoaXMuX2NhbnZhcy5jbGVhcigpO1xuXG4gICAgICAgIC8vIERyYXcgbWlzc2luZyByb3dzLlxuICAgICAgICAvLyBQb3NpdGl2ZSB5LCBzY3JvbGxpbmcgZG93biB0aGUgcGFnZSAocGFnZSBpdHNlbGYgaXMgbW92aW5nIHVwKS5cbiAgICAgICAgdmFyIG5ld19yb3dfY291bnQgPSBNYXRoLmNlaWwoTWF0aC5hYnMoc2Nyb2xsLnkpIC8gdGhpcy5nZXRfcm93X2hlaWdodCgpKSArIDE7XG4gICAgICAgIGlmIChzY3JvbGwueSA+IDApIHtcbiAgICAgICAgICAgIGZvciAoaSA9IG5ld19ib3R0b21fcm93IC0gbmV3X3Jvd19jb3VudDsgaSA8PSBuZXdfYm90dG9tX3JvdzsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fcmVuZGVyX3JvdyhpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAoaSA9IG5ld190b3Bfcm93OyBpIDw9IG5ld190b3Bfcm93ICsgbmV3X3Jvd19jb3VudDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fcmVuZGVyX3JvdyhpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlZHJhdyBvbGQgY29udGVudHMgaW4gbmV3IGxvY2F0aW9uLlxuICAgICAgICB0aGlzLl9jYW52YXMucHV0X3Jhd19pbWFnZShcbiAgICAgICAgICAgIG9sZF9yZW5kZXIsIFxuICAgICAgICAgICAgdGhpcy5fc2Nyb2xsaW5nX2NhbnZhcy5zY3JvbGxfbGVmdCwgXG4gICAgICAgICAgICB0aGlzLl9zY3JvbGxpbmdfY2FudmFzLnNjcm9sbF90b3AgLSBzY3JvbGwueSk7XG5cbiAgICB9IGVsc2UgeyAvLyBGdWxsIHJlZHJhd1xuICAgICAgICB0aGlzLl9jYW52YXMuY2xlYXIoKTtcblxuICAgICAgICAvLyBSZW5kZXIgdGlsbCB0aGVyZSBhcmUgbm8gcm93cyBsZWZ0LCBvciB0aGUgdG9wIG9mIHRoZSByb3cgaXNcbiAgICAgICAgLy8gYmVsb3cgdGhlIGJvdHRvbSBvZiB0aGUgdmlzaWJsZSBhcmVhLlxuICAgICAgICBmb3IgKGkgPSBuZXdfdG9wX3JvdzsgXG4gICAgICAgICAgICBpIDwgTWF0aC5taW4obmV3X2JvdHRvbV9yb3crMSwgdGhpcy5fbW9kZWwuX3Jvd3MubGVuZ3RoKTsgXG4gICAgICAgICAgICBpKyspIHsgICAgICAgIFxuXG4gICAgICAgICAgICB0aGlzLl9yZW5kZXJfcm93KGkpO1xuICAgICAgICB9ICAgIFxuICAgIH1cbiAgICBcbn07XG5cbi8qKlxuICogR2V0cyB0aGUgcm93IGFuZCBjaGFyYWN0ZXIgaW5kaWNpZXMgY2xvc2VzdCB0byBnaXZlbiBjb250cm9sIHNwYWNlIGNvb3JkaW5hdGVzLlxuICogQHBhcmFtICB7ZmxvYXR9IGN1cnNvcl94IC0geCB2YWx1ZSwgMCBpcyB0aGUgbGVmdCBvZiB0aGUgY2FudmFzLlxuICogQHBhcmFtICB7ZmxvYXR9IGN1cnNvcl95IC0geSB2YWx1ZSwgMCBpcyB0aGUgdG9wIG9mIHRoZSBjYW52YXMuXG4gKiBAcmV0dXJuIHtkaWN0aW9uYXJ5fSBkaWN0aW9uYXJ5IG9mIHRoZSBmb3JtIHtyb3dfaW5kZXgsIGNoYXJfaW5kZXh9XG4gKi9cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5nZXRfcm93X2NoYXIgPSBmdW5jdGlvbihjdXJzb3JfeCwgY3Vyc29yX3kpIHtcbiAgICB2YXIgcm93X2luZGV4ID0gTWF0aC5mbG9vcigoY3Vyc29yX3kgKyB0aGlzLl9zY3JvbGxpbmdfY2FudmFzLnNjcm9sbF90b3ApIC8gdGhpcy5nZXRfcm93X2hlaWdodCgpKTtcblxuICAgIC8vIEZpbmQgdGhlIGNoYXJhY3RlciBpbmRleC5cbiAgICB2YXIgd2lkdGhzID0gWzBdO1xuICAgIHRyeSB7XG4gICAgICAgIGZvciAodmFyIGxlbmd0aD0xOyBsZW5ndGg8PXRoaXMuX21vZGVsLl9yb3dzW3Jvd19pbmRleF0ubGVuZ3RoOyBsZW5ndGgrKykge1xuICAgICAgICAgICAgd2lkdGhzLnB1c2godGhpcy5tZWFzdXJlX3BhcnRpYWxfcm93X3dpZHRoKHJvd19pbmRleCwgbGVuZ3RoKSk7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8vIE5vbSBub20gbm9tLi4uXG4gICAgfVxuICAgIHJldHVybiB7cm93X2luZGV4OiByb3dfaW5kZXgsIGNoYXJfaW5kZXg6IHV0aWxzLmZpbmRfY2xvc2VzdCh3aWR0aHMsIGN1cnNvcl94ICsgdGhpcy5fc2Nyb2xsaW5nX2NhbnZhcy5zY3JvbGxfbGVmdCl9O1xufTtcblxuLyoqXG4gKiBNZWFzdXJlcyB0aGUgcGFydGlhbCB3aWR0aCBvZiBhIHRleHQgcm93LlxuICogQHBhcmFtICB7aW50ZWdlcn0gaW5kZXhcbiAqIEBwYXJhbSAge2ludGVnZXJ9IChvcHRpb25hbCkgbGVuZ3RoIC0gbnVtYmVyIG9mIGNoYXJhY3RlcnNcbiAqIEByZXR1cm4ge2Zsb2F0fSB3aWR0aFxuICovXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUubWVhc3VyZV9wYXJ0aWFsX3Jvd193aWR0aCA9IGZ1bmN0aW9uKGluZGV4LCBsZW5ndGgpIHtcbiAgICBpZiAoaW5kZXggPj0gdGhpcy5fbW9kZWwuX3Jvd3MubGVuZ3RoKSB7IHRocm93IG5ldyBFcnJvcignUm93IGluZGV4ICcgKyBpbmRleCArICcgZG9lcyBub3QgZXhpc3QnKTsgfVxuICAgIHZhciB0ZXh0ID0gdGhpcy5fbW9kZWwuX3Jvd3NbaW5kZXhdO1xuICAgIHRleHQgPSBsZW5ndGggPT09IHVuZGVmaW5lZCA/IHRleHQgOiB0ZXh0LnN1YnN0cmluZygwLCBsZW5ndGgpO1xuICAgIHJldHVybiB0aGlzLl9jYW52YXMubWVhc3VyZV90ZXh0KHRleHQsIHRoaXMuX2Jhc2Vfb3B0aW9ucyk7XG59O1xuXG4vKipcbiAqIE1lYXN1cmVzIHRoZSBoZWlnaHQgb2YgYSB0ZXh0IHJvdyBhcyBpZiBpdCB3ZXJlIHJlbmRlcmVkLlxuICogQHBhcmFtICB7aW50ZWdlcn0gaW5kZXhcbiAqIEByZXR1cm4ge2Zsb2F0fSBoZWlnaHRcbiAqL1xuUm93UmVuZGVyZXIucHJvdG90eXBlLmdldF9yb3dfaGVpZ2h0ID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICByZXR1cm4gdGhpcy5fYmFzZV9vcHRpb25zLmZvbnRfc2l6ZSArIHRoaXMuX2xpbmVfc3BhY2luZztcbn07XG5cbi8qKlxuICogR2V0cyB0aGUgdG9wIG9mIHRoZSByb3cgd2hlbiByZW5kZXJlZFxuICogQHBhcmFtICB7aW50ZWdlcn0gaW5kZXhcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5nZXRfcm93X3RvcCA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgcmV0dXJuIGluZGV4ICogdGhpcy5nZXRfcm93X2hlaWdodChpbmRleCk7XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgd2hlbiB0aGUgbW9kZWwncyB2YWx1ZSBjaGFuZ2VzXG4gKiBDb21wbGV4aXR5OiBPKE4pIGZvciBOIHJvd3Mgb2YgdGV4dC5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5faGFuZGxlX3ZhbHVlX2NoYW5nZWQgPSBmdW5jdGlvbigpIHtcblxuICAgIC8vIENhbGN1bGF0ZSB0aGUgZG9jdW1lbnQgd2lkdGguXG4gICAgdmFyIGRvY3VtZW50X3dpZHRoID0gMDtcbiAgICBmb3IgKHZhciBpPTA7IGk8dGhpcy5fbW9kZWwuX3Jvd3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgZG9jdW1lbnRfd2lkdGggPSBNYXRoLm1heCh0aGlzLl9tZWFzdXJlX3Jvd193aWR0aChpKSwgZG9jdW1lbnRfd2lkdGgpO1xuICAgIH1cbiAgICB0aGlzLl9zY3JvbGxpbmdfY2FudmFzLnNjcm9sbF93aWR0aCA9IGRvY3VtZW50X3dpZHRoO1xuICAgIHRoaXMuX3Njcm9sbGluZ19jYW52YXMuc2Nyb2xsX2hlaWdodCA9IHRoaXMuX21vZGVsLl9yb3dzLmxlbmd0aCAqIHRoaXMuZ2V0X3Jvd19oZWlnaHQoKTtcbn07XG5cbi8qKlxuICogSGFuZGxlcyB3aGVuIG9uZSBvZiB0aGUgbW9kZWwncyByb3dzIGNoYW5nZVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuUm93UmVuZGVyZXIucHJvdG90eXBlLl9oYW5kbGVfcm93X2NoYW5nZWQgPSBmdW5jdGlvbihpbmRleCkge1xuICAgIHRoaXMuX3Njcm9sbGluZ19jYW52YXMuc2Nyb2xsX3dpZHRoID0gTWF0aC5tYXgodGhpcy5fbWVhc3VyZV9yb3dfd2lkdGgoaW5kZXgpLCB0aGlzLl9zY3JvbGxpbmdfY2FudmFzLnNjcm9sbF93aWR0aCk7XG59O1xuXG4vKipcbiAqIFJlbmRlciBhIHNpbmdsZSByb3dcbiAqIEBwYXJhbSAge2ludGVnZXJ9IGluZGV4XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuX3JlbmRlcl9yb3cgPSBmdW5jdGlvbihpbmRleCkge1xuICAgIHRoaXMuX2NhbnZhcy5kcmF3X3RleHQoMCwgdGhpcy5fcm93X3RvcHNbaW5kZXhdLCB0aGlzLl9tb2RlbC5fcm93c1tpbmRleF0sIHRoaXMuX2Jhc2Vfb3B0aW9ucyk7XG59O1xuXG4vKipcbiAqIE1lYXN1cmVzIHRoZSB3aWR0aCBvZiBhIHRleHQgcm93IGFzIGlmIGl0IHdlcmUgcmVuZGVyZWQuXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBpbmRleFxuICogQHJldHVybiB7ZmxvYXR9IHdpZHRoXG4gKi9cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5fbWVhc3VyZV9yb3dfd2lkdGggPSBmdW5jdGlvbihpbmRleCkge1xuICAgIHJldHVybiB0aGlzLm1lYXN1cmVfcGFydGlhbF9yb3dfd2lkdGgoaW5kZXgsIHRoaXMuX21vZGVsLl9yb3dzW2luZGV4XS5sZW5ndGgpO1xufTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5Sb3dSZW5kZXJlciA9IFJvd1JlbmRlcmVyO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cbnZhciBjYW52YXMgPSByZXF1aXJlKCcuL2NhbnZhcy5qcycpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xuXG4vKipcbiAqIEhUTUwgY2FudmFzIHdpdGggZHJhd2luZyBjb252aW5pZW5jZSBmdW5jdGlvbnMuXG4gKi9cbnZhciBTY3JvbGxpbmdDYW52YXMgPSBmdW5jdGlvbigpIHtcbiAgICBjYW52YXMuQ2FudmFzLmNhbGwodGhpcyk7XG4gICAgdGhpcy5fYmluZF9ldmVudHMoKTtcbiAgICB0aGlzLl9vbGRfc2Nyb2xsX2xlZnQgPSAwO1xuICAgIHRoaXMuX29sZF9zY3JvbGxfdG9wID0gMDtcblxuICAgIC8vIFNldCBkZWZhdWx0IHNpemUuXG4gICAgdGhpcy53aWR0aCA9IDQwMDtcbiAgICB0aGlzLmhlaWdodCA9IDMwMDtcbn07XG51dGlscy5pbmhlcml0KFNjcm9sbGluZ0NhbnZhcywgY2FudmFzLkNhbnZhcyk7XG5cbi8qKlxuICogQ2F1c2VzIHRoZSBjYW52YXMgY29udGVudHMgdG8gYmUgcmVkcmF3bi5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblNjcm9sbGluZ0NhbnZhcy5wcm90b3R5cGUucmVkcmF3ID0gZnVuY3Rpb24oc2Nyb2xsKSB7XG4gICAgdGhpcy5jbGVhcigpO1xuICAgIHRoaXMudHJpZ2dlcigncmVkcmF3Jywgc2Nyb2xsKTtcbn07XG5cbi8qKlxuICogTGF5b3V0IHRoZSBlbGVtZW50cyBmb3IgdGhlIGNhbnZhcy5cbiAqIENyZWF0ZXMgYHRoaXMuZWxgXG4gKiBcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblNjcm9sbGluZ0NhbnZhcy5wcm90b3R5cGUuX2xheW91dCA9IGZ1bmN0aW9uKCkge1xuICAgIGNhbnZhcy5DYW52YXMucHJvdG90eXBlLl9sYXlvdXQuY2FsbCh0aGlzKTtcbiAgICAvLyBDaGFuZ2UgdGhlIGNhbnZhcyBjbGFzcyBzbyBpdCdzIG5vdCBoaWRkZW4uXG4gICAgdGhpcy5fY2FudmFzLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAnY2FudmFzJyk7XG5cbiAgICB0aGlzLmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgdGhpcy5lbC5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ3Bvc3RlciBzY3JvbGwtd2luZG93Jyk7XG4gICAgdGhpcy5lbC5zZXRBdHRyaWJ1dGUoJ3RhYmluZGV4JywgMCk7XG4gICAgdGhpcy5fc2Nyb2xsX2JhcnMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICB0aGlzLl9zY3JvbGxfYmFycy5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ3Njcm9sbC1iYXJzJyk7XG4gICAgdGhpcy5fZHVtbXkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICB0aGlzLl9kdW1teS5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ3Njcm9sbC1kdW1teScpO1xuXG4gICAgdGhpcy5lbC5hcHBlbmRDaGlsZCh0aGlzLl9jYW52YXMpO1xuICAgIHRoaXMuZWwuYXBwZW5kQ2hpbGQodGhpcy5fc2Nyb2xsX2JhcnMpO1xuICAgIHRoaXMuX3Njcm9sbF9iYXJzLmFwcGVuZENoaWxkKHRoaXMuX2R1bW15KTtcbn07XG5cbi8qKlxuICogTWFrZSB0aGUgcHJvcGVydGllcyBvZiB0aGUgY2xhc3MuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5TY3JvbGxpbmdDYW52YXMucHJvdG90eXBlLl9pbml0X3Byb3BlcnRpZXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBXaWR0aCBvZiB0aGUgc2Nyb2xsYWJsZSBjYW52YXMgYXJlYVxuICAgICAqL1xuICAgIHRoaXMucHJvcGVydHkoJ3Njcm9sbF93aWR0aCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBHZXRcbiAgICAgICAgcmV0dXJuIHRoYXQuX3Njcm9sbF93aWR0aCB8fCAwO1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIC8vIFNldFxuICAgICAgICB0aGF0Ll9zY3JvbGxfd2lkdGggPSB2YWx1ZTtcbiAgICAgICAgdGhhdC5fbW92ZV9kdW1teSh0aGF0Ll9zY3JvbGxfd2lkdGgsIHRoYXQuX3Njcm9sbF9oZWlnaHQgfHwgMCk7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBIZWlnaHQgb2YgdGhlIHNjcm9sbGFibGUgY2FudmFzIGFyZWEuXG4gICAgICovXG4gICAgdGhpcy5wcm9wZXJ0eSgnc2Nyb2xsX2hlaWdodCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBHZXRcbiAgICAgICAgcmV0dXJuIHRoYXQuX3Njcm9sbF9oZWlnaHQgfHwgMDtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAvLyBTZXRcbiAgICAgICAgdGhhdC5fc2Nyb2xsX2hlaWdodCA9IHZhbHVlO1xuICAgICAgICB0aGF0Ll9tb3ZlX2R1bW15KHRoYXQuX3Njcm9sbF93aWR0aCB8fCAwLCB0aGF0Ll9zY3JvbGxfaGVpZ2h0KTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIFRvcCBtb3N0IHBpeGVsIGluIHRoZSBzY3JvbGxlZCB3aW5kb3cuXG4gICAgICovXG4gICAgdGhpcy5wcm9wZXJ0eSgnc2Nyb2xsX3RvcCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBHZXRcbiAgICAgICAgcmV0dXJuIHRoYXQuX3Njcm9sbF9iYXJzLnNjcm9sbFRvcDtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAvLyBTZXRcbiAgICAgICAgdGhhdC5fc2Nyb2xsX2JhcnMuc2Nyb2xsVG9wID0gdmFsdWU7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBMZWZ0IG1vc3QgcGl4ZWwgaW4gdGhlIHNjcm9sbGVkIHdpbmRvdy5cbiAgICAgKi9cbiAgICB0aGlzLnByb3BlcnR5KCdzY3JvbGxfbGVmdCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBHZXRcbiAgICAgICAgcmV0dXJuIHRoYXQuX3Njcm9sbF9iYXJzLnNjcm9sbExlZnQ7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgLy8gU2V0XG4gICAgICAgIHRoYXQuX3Njcm9sbF9iYXJzLnNjcm9sbExlZnQgPSB2YWx1ZTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIEhlaWdodCBvZiB0aGUgY2FudmFzXG4gICAgICogQHJldHVybiB7ZmxvYXR9XG4gICAgICovXG4gICAgdGhpcy5wcm9wZXJ0eSgnaGVpZ2h0JywgZnVuY3Rpb24oKSB7IFxuICAgICAgICByZXR1cm4gdGhhdC5fY2FudmFzLmhlaWdodCAvIDI7IFxuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQuX2NhbnZhcy5zZXRBdHRyaWJ1dGUoJ2hlaWdodCcsIHZhbHVlICogMik7XG4gICAgICAgIHRoYXQuZWwuc2V0QXR0cmlidXRlKCdzdHlsZScsICd3aWR0aDogJyArIHRoYXQud2lkdGggKyAnOyBoZWlnaHQ6ICcgKyB2YWx1ZSArICc7Jyk7XG5cbiAgICAgICAgdGhhdC50cmlnZ2VyKCdyZXNpemUnLCB7aGVpZ2h0OiB2YWx1ZX0pO1xuICAgICAgICB0aGF0Ll90cnlfcmVkcmF3KCk7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBXaWR0aCBvZiB0aGUgY2FudmFzXG4gICAgICogQHJldHVybiB7ZmxvYXR9XG4gICAgICovXG4gICAgdGhpcy5wcm9wZXJ0eSgnd2lkdGgnLCBmdW5jdGlvbigpIHsgXG4gICAgICAgIHJldHVybiB0aGF0Ll9jYW52YXMud2lkdGggLyAyOyBcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0Ll9jYW52YXMuc2V0QXR0cmlidXRlKCd3aWR0aCcsIHZhbHVlICogMik7XG4gICAgICAgIHRoYXQuZWwuc2V0QXR0cmlidXRlKCdzdHlsZScsICd3aWR0aDogJyArIHZhbHVlICsgJzsgaGVpZ2h0OiAnICsgdGhhdC5oZWlnaHQgKyAnOycpO1xuXG4gICAgICAgIHRoYXQudHJpZ2dlcigncmVzaXplJywge3dpZHRoOiB2YWx1ZX0pO1xuICAgICAgICB0aGF0Ll90cnlfcmVkcmF3KCk7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBJcyB0aGUgY2FudmFzIG9yIHJlbGF0ZWQgZWxlbWVudHMgZm9jdXNlZD9cbiAgICAgKiBAcmV0dXJuIHtib29sZWFufVxuICAgICAqL1xuICAgIHRoaXMucHJvcGVydHkoJ2ZvY3VzZWQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQgPT09IHRoYXQuZWwgfHxcbiAgICAgICAgICAgIGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQgPT09IHRoYXQuX3Njcm9sbF9iYXJzIHx8XG4gICAgICAgICAgICBkb2N1bWVudC5hY3RpdmVFbGVtZW50ID09PSB0aGF0Ll9kdW1teSB8fFxuICAgICAgICAgICAgZG9jdW1lbnQuYWN0aXZlRWxlbWVudCA9PT0gdGhhdC5fY2FudmFzO1xuICAgIH0pO1xufTtcblxuLyoqXG4gKiBCaW5kIHRvIHRoZSBldmVudHMgb2YgdGhlIGNhbnZhcy5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblNjcm9sbGluZ0NhbnZhcy5wcm90b3R5cGUuX2JpbmRfZXZlbnRzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuXG4gICAgLy8gVHJpZ2dlciBzY3JvbGwgYW5kIHJlZHJhdyBldmVudHMgb24gc2Nyb2xsLlxuICAgIHRoaXMuX3Njcm9sbF9iYXJzLm9uc2Nyb2xsID0gZnVuY3Rpb24oZSkge1xuICAgICAgICB0aGF0LnRyaWdnZXIoJ3Njcm9sbCcsIGUpO1xuICAgICAgICBpZiAodGhhdC5fb2xkX3Njcm9sbF90b3AgIT09IHVuZGVmaW5lZCAmJiB0aGF0Ll9vbGRfc2Nyb2xsX2xlZnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdmFyIHNjcm9sbCA9IHtcbiAgICAgICAgICAgICAgICB4OiB0aGF0LnNjcm9sbF9sZWZ0IC0gdGhhdC5fb2xkX3Njcm9sbF9sZWZ0LFxuICAgICAgICAgICAgICAgIHk6IHRoYXQuc2Nyb2xsX3RvcCAtIHRoYXQuX29sZF9zY3JvbGxfdG9wLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHRoYXQuX3RyeV9yZWRyYXcoc2Nyb2xsKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoYXQuX3RyeV9yZWRyYXcoKTtcbiAgICAgICAgfVxuICAgICAgICB0aGF0Ll9vbGRfc2Nyb2xsX2xlZnQgPSB0aGF0LnNjcm9sbF9sZWZ0O1xuICAgICAgICB0aGF0Ll9vbGRfc2Nyb2xsX3RvcCA9IHRoYXQuc2Nyb2xsX3RvcDtcbiAgICB9O1xufTtcblxuLyoqXG4gKiBRdWVyaWVzIHRvIHNlZSBpZiByZWRyYXcgaXMgb2theSwgYW5kIHRoZW4gcmVkcmF3cyBpZiBpdCBpcy5cbiAqIEByZXR1cm4ge2Jvb2xlYW59IHRydWUgaWYgcmVkcmF3IGhhcHBlbmVkLlxuICovXG5TY3JvbGxpbmdDYW52YXMucHJvdG90eXBlLl90cnlfcmVkcmF3ID0gZnVuY3Rpb24oc2Nyb2xsKSB7XG4gICAgaWYgKHRoaXMuX3F1ZXJ5X3JlZHJhdygpKSB7XG4gICAgICAgIHRoaXMucmVkcmF3KHNjcm9sbCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG4vKipcbiAqIFRyaWdnZXIgdGhlICdxdWVyeV9yZWRyYXcnIGV2ZW50LlxuICogQHJldHVybiB7Ym9vbGVhbn0gdHJ1ZSBpZiBjb250cm9sIHNob3VsZCByZWRyYXcgaXRzZWxmLlxuICovXG5TY3JvbGxpbmdDYW52YXMucHJvdG90eXBlLl9xdWVyeV9yZWRyYXcgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy50cmlnZ2VyKCdxdWVyeV9yZWRyYXcnKS5ldmVyeShmdW5jdGlvbih4KSB7IHJldHVybiB4OyB9KTsgXG59O1xuXG4vKipcbiAqIE1vdmVzIHRoZSBkdW1teSBlbGVtZW50IHRoYXQgY2F1c2VzIHRoZSBzY3JvbGxiYXIgdG8gYXBwZWFyLlxuICogQHBhcmFtICB7ZmxvYXR9IHhcbiAqIEBwYXJhbSAge2Zsb2F0fSB5XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5TY3JvbGxpbmdDYW52YXMucHJvdG90eXBlLl9tb3ZlX2R1bW15ID0gZnVuY3Rpb24oeCwgeSkge1xuICAgIHRoaXMuX2R1bW15LnNldEF0dHJpYnV0ZSgnc3R5bGUnLCAnbGVmdDogJyArIFN0cmluZyh4KSArICc7IHRvcDogJyArIFN0cmluZyh5KSArICc7Jyk7XG59O1xuXG4vKipcbiAqIFRyYW5zZm9ybSBhbiB4IHZhbHVlIGJhc2VkIG9uIHNjcm9sbCBwb3NpdGlvbi5cbiAqIEBwYXJhbSAge2Zsb2F0fSB4XG4gKiBAcmV0dXJuIHtmbG9hdH1cbiAqL1xuU2Nyb2xsaW5nQ2FudmFzLnByb3RvdHlwZS5fdHggPSBmdW5jdGlvbih4KSB7IHJldHVybiB4IC0gdGhpcy5zY3JvbGxfbGVmdDsgfTtcblxuLyoqXG4gKiBUcmFuc2Zvcm0gYSB5IHZhbHVlIGJhc2VkIG9uIHNjcm9sbCBwb3NpdGlvbi5cbiAqIEBwYXJhbSAge2Zsb2F0fSB5XG4gKiBAcmV0dXJuIHtmbG9hdH1cbiAqL1xuU2Nyb2xsaW5nQ2FudmFzLnByb3RvdHlwZS5fdHkgPSBmdW5jdGlvbih5KSB7IHJldHVybiB5IC0gdGhpcy5zY3JvbGxfdG9wOyB9O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLlNjcm9sbGluZ0NhbnZhcyA9IFNjcm9sbGluZ0NhbnZhcztcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbi8qKlxuQmFzZSBjbGFzcyB3aXRoIGhlbHBmdWwgdXRpbGl0aWVzXG4qL1xudmFyIFBvc3RlckNsYXNzID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgdGhpcy5fb25fYWxsID0gW107XG59O1xuXG4vKipcbiAqIERlZmluZSBhIHByb3BlcnR5IGZvciB0aGUgY2xhc3NcbiAqIEBwYXJhbSAge3N0cmluZ30gbmFtZVxuICogQHBhcmFtICB7ZnVuY3Rpb259IGdldHRlclxuICogQHBhcmFtICB7ZnVuY3Rpb259IHNldHRlclxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuUG9zdGVyQ2xhc3MucHJvdG90eXBlLnByb3BlcnR5ID0gZnVuY3Rpb24obmFtZSwgZ2V0dGVyLCBzZXR0ZXIpIHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgbmFtZSwge1xuICAgICAgICBnZXQ6IGdldHRlcixcbiAgICAgICAgc2V0OiBzZXR0ZXIsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH0pO1xufTtcblxuLyoqXG4gKiBSZWdpc3RlciBhbiBldmVudCBsaXN0ZW5lclxuICogQHBhcmFtICB7c3RyaW5nfSBldmVudFxuICogQHBhcmFtICB7ZnVuY3Rpb259IGhhbmRsZXJcbiAqIEBwYXJhbSAge29iamVjdH0gY29udGV4dFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuUG9zdGVyQ2xhc3MucHJvdG90eXBlLm9uID0gZnVuY3Rpb24oZXZlbnQsIGhhbmRsZXIsIGNvbnRleHQpIHtcbiAgICBldmVudCA9IGV2ZW50LnRyaW0oKS50b0xvd2VyQ2FzZSgpO1xuXG4gICAgLy8gTWFrZSBzdXJlIGEgbGlzdCBmb3IgdGhlIGV2ZW50IGV4aXN0cy5cbiAgICBpZiAoIXRoaXMuX2V2ZW50c1tldmVudF0pIHsgdGhpcy5fZXZlbnRzW2V2ZW50XSA9IFtdOyB9XG5cbiAgICAvLyBQdXNoIHRoZSBoYW5kbGVyIGFuZCB0aGUgY29udGV4dCB0byB0aGUgZXZlbnQncyBjYWxsYmFjayBsaXN0LlxuICAgIHRoaXMuX2V2ZW50c1tldmVudF0ucHVzaChbaGFuZGxlciwgY29udGV4dF0pO1xufTtcblxuLyoqXG4gKiBVbnJlZ2lzdGVyIG9uZSBvciBhbGwgZXZlbnQgbGlzdGVuZXJzIGZvciBhIHNwZWNpZmljIGV2ZW50XG4gKiBAcGFyYW0gIHtzdHJpbmd9IGV2ZW50XG4gKiBAcGFyYW0gIHtjYWxsYmFja30gKG9wdGlvbmFsKSBoYW5kbGVyXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Qb3N0ZXJDbGFzcy5wcm90b3R5cGUub2ZmID0gZnVuY3Rpb24oZXZlbnQsIGhhbmRsZXIpIHtcbiAgICBldmVudCA9IGV2ZW50LnRyaW0oKS50b0xvd2VyQ2FzZSgpO1xuICAgIFxuICAgIC8vIElmIGEgaGFuZGxlciBpcyBzcGVjaWZpZWQsIHJlbW92ZSBhbGwgdGhlIGNhbGxiYWNrc1xuICAgIC8vIHdpdGggdGhhdCBoYW5kbGVyLiAgT3RoZXJ3aXNlLCBqdXN0IHJlbW92ZSBhbGwgb2ZcbiAgICAvLyB0aGUgcmVnaXN0ZXJlZCBjYWxsYmFja3MuXG4gICAgaWYgKGhhbmRsZXIpIHtcbiAgICAgICAgdGhpcy5fZXZlbnRzW2V2ZW50XSA9IHRoaXMuX2V2ZW50c1tldmVudF0uZmlsdGVyKGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2tbMF0gIT09IGhhbmRsZXI7XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX2V2ZW50c1tldmVudF0gPSBbXTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFJlZ2lzdGVyIGEgZ2xvYmFsIGV2ZW50IGhhbmRsZXIuIFxuICogXG4gKiBBIGdsb2JhbCBldmVudCBoYW5kbGVyIGZpcmVzIGZvciBhbnkgZXZlbnQgdGhhdCdzXG4gKiB0cmlnZ2VyZWQuXG4gKiBAcGFyYW0gIHtzdHJpbmd9IGhhbmRsZXIgLSBmdW5jdGlvbiB0aGF0IGFjY2VwdHMgb25lXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcmd1bWVudCwgdGhlIG5hbWUgb2YgdGhlXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudCxcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblBvc3RlckNsYXNzLnByb3RvdHlwZS5vbl9hbGwgPSBmdW5jdGlvbihoYW5kbGVyKSB7XG4gICAgdmFyIGluZGV4ID0gdGhpcy5fb25fYWxsLmluZGV4T2YoaGFuZGxlcik7XG4gICAgaWYgKGluZGV4ID09PSAtMSkge1xuICAgICAgICB0aGlzLl9vbl9hbGwucHVzaChoYW5kbGVyKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFVucmVnaXN0ZXIgYSBnbG9iYWwgZXZlbnQgaGFuZGxlci5cbiAqIEBwYXJhbSAge1t0eXBlXX0gaGFuZGxlclxuICogQHJldHVybiB7Ym9vbGVhbn0gdHJ1ZSBpZiBhIGhhbmRsZXIgd2FzIHJlbW92ZWRcbiAqL1xuUG9zdGVyQ2xhc3MucHJvdG90eXBlLm9mZl9hbGwgPSBmdW5jdGlvbihoYW5kbGVyKSB7XG4gICAgdmFyIGluZGV4ID0gdGhpcy5fb25fYWxsLmluZGV4T2YoaGFuZGxlcik7XG4gICAgaWYgKGluZGV4ICE9IC0xKSB7XG4gICAgICAgIHRoaXMuX29uX2FsbC5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufTtcblxuLyoqXG4gKiBUcmlnZ2VycyB0aGUgY2FsbGJhY2tzIG9mIGFuIGV2ZW50IHRvIGZpcmUuXG4gKiBAcGFyYW0gIHtzdHJpbmd9IGV2ZW50XG4gKiBAcmV0dXJuIHthcnJheX0gYXJyYXkgb2YgcmV0dXJuIHZhbHVlc1xuICovXG5Qb3N0ZXJDbGFzcy5wcm90b3R5cGUudHJpZ2dlciA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgZXZlbnQgPSBldmVudC50cmltKCkudG9Mb3dlckNhc2UoKTtcblxuICAgIC8vIENvbnZlcnQgYXJndW1lbnRzIHRvIGFuIGFycmF5IGFuZCBjYWxsIGNhbGxiYWNrcy5cbiAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgYXJncy5zcGxpY2UoMCwxKTtcblxuICAgIC8vIFRyaWdnZXIgZ2xvYmFsIGhhbmRsZXJzIGZpcnN0LlxuICAgIHRoaXMuX29uX2FsbC5mb3JFYWNoKGZ1bmN0aW9uKGhhbmRsZXIpIHtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBbZXZlbnRdLmNvbmNhdChhcmdzKSk7XG4gICAgfSk7XG5cbiAgICAvLyBUcmlnZ2VyIGluZGl2aWR1YWwgaGFuZGxlcnMgc2Vjb25kLlxuICAgIHZhciBldmVudHMgPSB0aGlzLl9ldmVudHNbZXZlbnRdO1xuICAgIGlmIChldmVudHMpIHtcbiAgICAgICAgdmFyIHJldHVybnMgPSBbXTtcbiAgICAgICAgZXZlbnRzLmZvckVhY2goZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHJldHVybnMucHVzaChjYWxsYmFja1swXS5hcHBseShjYWxsYmFja1sxXSwgYXJncykpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHJldHVybnM7XG4gICAgfVxuICAgIHJldHVybiBbXTtcbn07XG5cbi8qKlxuICogQ2F1c2Ugb25lIGNsYXNzIHRvIGluaGVyaXQgZnJvbSBhbm90aGVyXG4gKiBAcGFyYW0gIHt0eXBlfSBjaGlsZFxuICogQHBhcmFtICB7dHlwZX0gcGFyZW50XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG52YXIgaW5oZXJpdCA9IGZ1bmN0aW9uKGNoaWxkLCBwYXJlbnQpIHtcbiAgICBjaGlsZC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHBhcmVudC5wcm90b3R5cGUsIHt9KTtcbn07XG5cbi8qKlxuICogQ2hlY2tzIGlmIGEgdmFsdWUgaXMgY2FsbGFibGVcbiAqIEBwYXJhbSAge2FueX0gdmFsdWVcbiAqIEByZXR1cm4ge2Jvb2xlYW59XG4gKi9cbnZhciBjYWxsYWJsZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PSAnZnVuY3Rpb24nO1xufTtcblxuLyoqXG4gKiBDYWxscyB0aGUgdmFsdWUgaWYgaXQncyBjYWxsYWJsZSBhbmQgcmV0dXJucyBpdCdzIHJldHVybi5cbiAqIE90aGVyd2lzZSByZXR1cm5zIHRoZSB2YWx1ZSBhcy1pcy5cbiAqIEBwYXJhbSAge2FueX0gdmFsdWVcbiAqIEByZXR1cm4ge2FueX1cbiAqL1xudmFyIHJlc29sdmVfY2FsbGFibGUgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIGlmIChjYWxsYWJsZSh2YWx1ZSkpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlLmNhbGwodGhpcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhIHByb3h5IHRvIGEgZnVuY3Rpb24gc28gaXQgaXMgY2FsbGVkIGluIHRoZSBjb3JyZWN0IGNvbnRleHQuXG4gKiBAcmV0dXJuIHtmdW5jdGlvbn0gcHJveGllZCBmdW5jdGlvbi5cbiAqL1xudmFyIHByb3h5ID0gZnVuY3Rpb24oZiwgY29udGV4dCkge1xuICAgIGlmIChmPT09dW5kZWZpbmVkKSB7IHRocm93IG5ldyBFcnJvcignZiBjYW5ub3QgYmUgdW5kZWZpbmVkJyk7IH1cbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7IHJldHVybiBmLmFwcGx5KGNvbnRleHQsIGFyZ3VtZW50cyk7IH07XG59O1xuXG4vKipcbiAqIENsZWFycyBhbiBhcnJheSBpbiBwbGFjZS5cbiAqXG4gKiBEZXNwaXRlIGFuIE8oTikgY29tcGxleGl0eSwgdGhpcyBzZWVtcyB0byBiZSB0aGUgZmFzdGVzdCB3YXkgdG8gY2xlYXJcbiAqIGEgbGlzdCBpbiBwbGFjZSBpbiBKYXZhc2NyaXB0LiBcbiAqIEJlbmNobWFyazogaHR0cDovL2pzcGVyZi5jb20vZW1wdHktamF2YXNjcmlwdC1hcnJheVxuICogQ29tcGxleGl0eTogTyhOKVxuICogQHBhcmFtICB7YXJyYXl9IGFycmF5XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG52YXIgY2xlYXJfYXJyYXkgPSBmdW5jdGlvbihhcnJheSkge1xuICAgIHdoaWxlIChhcnJheS5sZW5ndGggPiAwKSB7XG4gICAgICAgIGFycmF5LnBvcCgpO1xuICAgIH1cbn07XG5cbi8qKlxuICogQ2hlY2tzIGlmIGEgdmFsdWUgaXMgYW4gYXJyYXlcbiAqIEBwYXJhbSAge2FueX0geFxuICogQHJldHVybiB7Ym9vbGVhbn0gdHJ1ZSBpZiB2YWx1ZSBpcyBhbiBhcnJheVxuICovXG52YXIgaXNfYXJyYXkgPSBmdW5jdGlvbih4KSB7XG4gICAgcmV0dXJuIHggaW5zdGFuY2VvZiBBcnJheTtcbn07XG5cbi8qKlxuICogRmluZCB0aGUgY2xvc2VzdCB2YWx1ZSBpbiBhIGxpc3RcbiAqIFxuICogSW50ZXJwb2xhdGlvbiBzZWFyY2ggYWxnb3JpdGhtLiAgXG4gKiBDb21wbGV4aXR5OiBPKGxnKGxnKE4pKSlcbiAqIEBwYXJhbSAge2FycmF5fSBzb3J0ZWQgLSBzb3J0ZWQgYXJyYXkgb2YgbnVtYmVyc1xuICogQHBhcmFtICB7ZmxvYXR9IHggLSBudW1iZXIgdG8gdHJ5IHRvIGZpbmRcbiAqIEByZXR1cm4ge2ludGVnZXJ9IGluZGV4IG9mIHRoZSB2YWx1ZSB0aGF0J3MgY2xvc2VzdCB0byB4XG4gKi9cbnZhciBmaW5kX2Nsb3Nlc3QgPSBmdW5jdGlvbihzb3J0ZWQsIHgpIHtcbiAgICB2YXIgbWluID0gc29ydGVkWzBdO1xuICAgIHZhciBtYXggPSBzb3J0ZWRbc29ydGVkLmxlbmd0aC0xXTtcbiAgICBpZiAoeCA8IG1pbikgcmV0dXJuIDA7XG4gICAgaWYgKHggPiBtYXgpIHJldHVybiBzb3J0ZWQubGVuZ3RoLTE7XG4gICAgaWYgKHNvcnRlZC5sZW5ndGggPT0gMikge1xuICAgICAgICBpZiAobWF4IC0geCA+IHggLSBtaW4pIHtcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdmFyIHJhdGUgPSAobWF4IC0gbWluKSAvIHNvcnRlZC5sZW5ndGg7XG4gICAgaWYgKHJhdGUgPT09IDApIHJldHVybiAwO1xuICAgIHZhciBndWVzcyA9IE1hdGguZmxvb3IoeCAvIHJhdGUpO1xuICAgIGlmIChzb3J0ZWRbZ3Vlc3NdID09IHgpIHtcbiAgICAgICAgcmV0dXJuIGd1ZXNzO1xuICAgIH0gZWxzZSBpZiAoZ3Vlc3MgPiAwICYmIHNvcnRlZFtndWVzcy0xXSA8IHggJiYgeCA8IHNvcnRlZFtndWVzc10pIHtcbiAgICAgICAgcmV0dXJuIGZpbmRfY2xvc2VzdChzb3J0ZWQuc2xpY2UoZ3Vlc3MtMSwgZ3Vlc3MrMSksIHgpICsgZ3Vlc3MtMTtcbiAgICB9IGVsc2UgaWYgKGd1ZXNzIDwgc29ydGVkLmxlbmd0aC0xICYmIHNvcnRlZFtndWVzc10gPCB4ICYmIHggPCBzb3J0ZWRbZ3Vlc3MrMV0pIHtcbiAgICAgICAgcmV0dXJuIGZpbmRfY2xvc2VzdChzb3J0ZWQuc2xpY2UoZ3Vlc3MsIGd1ZXNzKzIpLCB4KSArIGd1ZXNzO1xuICAgIH0gZWxzZSBpZiAoc29ydGVkW2d1ZXNzXSA+IHgpIHtcbiAgICAgICAgcmV0dXJuIGZpbmRfY2xvc2VzdChzb3J0ZWQuc2xpY2UoMCwgZ3Vlc3MpLCB4KTtcbiAgICB9IGVsc2UgaWYgKHNvcnRlZFtndWVzc10gPCB4KSB7XG4gICAgICAgIHJldHVybiBmaW5kX2Nsb3Nlc3Qoc29ydGVkLnNsaWNlKGd1ZXNzKzEpLCB4KSArIGd1ZXNzKzE7XG4gICAgfVxufTtcblxuLyoqXG4gKiBNYWtlIGEgc2hhbGxvdyBjb3B5IG9mIGEgZGljdGlvbmFyeS5cbiAqIEBwYXJhbSAge2RpY3Rpb25hcnl9IHhcbiAqIEByZXR1cm4ge2RpY3Rpb25hcnl9XG4gKi9cbnZhciBzaGFsbG93X2NvcHkgPSBmdW5jdGlvbih4KSB7XG4gICAgdmFyIHkgPSB7fTtcbiAgICBmb3IgKHZhciBrZXkgaW4geCkge1xuICAgICAgICBpZiAoeC5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICB5W2tleV0gPSB4W2tleV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHk7XG59O1xuXG4vKipcbiAqIEhvb2tzIGEgZnVuY3Rpb24uXG4gKiBAcGFyYW0gIHtvYmplY3R9IG9iaiAtIG9iamVjdCB0byBob29rXG4gKiBAcGFyYW0gIHtzdHJpbmd9IG1ldGhvZCAtIG5hbWUgb2YgdGhlIGZ1bmN0aW9uIHRvIGhvb2tcbiAqIEBwYXJhbSAge2Z1bmN0aW9ufSBob29rIC0gZnVuY3Rpb24gdG8gY2FsbCBiZWZvcmUgdGhlIG9yaWdpbmFsXG4gKiBAcmV0dXJuIHtvYmplY3R9IGhvb2sgcmVmZXJlbmNlLCBvYmplY3Qgd2l0aCBhbiBgdW5ob29rYCBtZXRob2RcbiAqL1xudmFyIGhvb2sgPSBmdW5jdGlvbihvYmosIG1ldGhvZCwgaG9vaykge1xuXG4gICAgLy8gSWYgdGhlIG9yaWdpbmFsIGhhcyBhbHJlYWR5IGJlZW4gaG9va2VkLCBhZGQgdGhpcyBob29rIHRvIHRoZSBsaXN0IFxuICAgIC8vIG9mIGhvb2tzLlxuICAgIGlmIChvYmpbbWV0aG9kXSAmJiBvYmpbbWV0aG9kXS5vcmlnaW5hbCAmJiBvYmpbbWV0aG9kXS5ob29rcykge1xuICAgICAgICBvYmpbbWV0aG9kXS5ob29rcy5wdXNoKGhvb2spO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIENyZWF0ZSB0aGUgaG9va2VkIGZ1bmN0aW9uXG4gICAgICAgIHZhciBob29rcyA9IFtob29rXTtcbiAgICAgICAgdmFyIG9yaWdpbmFsID0gb2JqW21ldGhvZF07XG4gICAgICAgIHZhciBob29rZWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgICAgICAgdmFyIHJldDtcbiAgICAgICAgICAgIHZhciByZXN1bHRzO1xuICAgICAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICAgICAgaG9va3MuZm9yRWFjaChmdW5jdGlvbihob29rKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0cyA9IGhvb2suYXBwbHkodGhhdCwgYXJncyk7XG4gICAgICAgICAgICAgICAgcmV0ID0gcmV0ICE9PSB1bmRlZmluZWQgPyByZXQgOiByZXN1bHRzO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAob3JpZ2luYWwpIHtcbiAgICAgICAgICAgICAgICByZXN1bHRzID0gb3JpZ2luYWwuYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmV0ICE9PSB1bmRlZmluZWQgPyByZXQgOiByZXN1bHRzO1xuICAgICAgICB9O1xuICAgICAgICBob29rZWQub3JpZ2luYWwgPSBvcmlnaW5hbDtcbiAgICAgICAgaG9va2VkLmhvb2tzID0gaG9va3M7XG4gICAgICAgIG9ialttZXRob2RdID0gaG9va2VkO1xuICAgIH1cblxuICAgIC8vIFJldHVybiB1bmhvb2sgbWV0aG9kLlxuICAgIHJldHVybiB7XG4gICAgICAgIHVuaG9vazogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgaW5kZXggPSBvYmpbbWV0aG9kXS5ob29rcy5pbmRleE9mKGhvb2spO1xuICAgICAgICAgICAgaWYgKGluZGV4ICE9IC0xKSB7XG4gICAgICAgICAgICAgICAgb2JqW21ldGhvZF0uaG9va3Muc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKG9ialttZXRob2RdLmhvb2tzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIG9ialttZXRob2RdID0gb2JqW21ldGhvZF0ub3JpZ2luYWw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgfTtcbiAgICBcbn07XG5cblxuLy8gRXhwb3J0IG5hbWVzLlxuZXhwb3J0cy5Qb3N0ZXJDbGFzcyA9IFBvc3RlckNsYXNzO1xuZXhwb3J0cy5pbmhlcml0ID0gaW5oZXJpdDtcbmV4cG9ydHMuY2FsbGFibGUgPSBjYWxsYWJsZTtcbmV4cG9ydHMucmVzb2x2ZV9jYWxsYWJsZSA9IHJlc29sdmVfY2FsbGFibGU7XG5leHBvcnRzLnByb3h5ID0gcHJveHk7XG5leHBvcnRzLmNsZWFyX2FycmF5ID0gY2xlYXJfYXJyYXk7XG5leHBvcnRzLmlzX2FycmF5ID0gaXNfYXJyYXk7XG5leHBvcnRzLmZpbmRfY2xvc2VzdCA9IGZpbmRfY2xvc2VzdDtcbmV4cG9ydHMuc2hhbGxvd19jb3B5ID0gc2hhbGxvd19jb3B5O1xuZXhwb3J0cy5ob29rID0gaG9vaztcbiJdfQ==
