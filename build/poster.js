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
        {
            comment: 'red',
            todo: 'orange',
            special: 'gold',
            string: 'green',
            character: 'blue',
            conditional: 'purple',
            repeat: 'white',
            operator: 'lightcoral',
            type: 'lightsalmon',
            statement: 'lightgoldenrodyellow',
            function: 'lightgreen',
            error: 'lightskyblue',
            boolean: 'magenta',
            identifier: 'indigo',
            label: 'gray',
            exception: 'olive',
            keyword: 'orangered',
            debug: 'royalblue',

            text: 'violet',
            background: 'black',
        },
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

},{"./document_controller.js":7,"./document_model.js":8,"./document_view.js":9,"./scrolling_canvas.js":21,"./utils.js":22}],2:[function(require,module,exports){
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
},{"./utils.js":22}],3:[function(require,module,exports){
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
        
        // Stretch the image for retina support.
        this.scale(2,2);
    });

    /**
     * Width of the canvas
     * @return {float}
     */
    this.property('width', function() { 
        return that._canvas.width / 2; 
    }, function(value) {
        that._canvas.setAttribute('width', value * 2);
        
        // Stretch the image for retina support.
        this.scale(2,2);
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

},{"./utils.js":22}],4:[function(require,module,exports){
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
Clipboard.prototype._handle_paste = function(e) {
    var pasted = e.clipboardData.getData(e.clipboardData.types[0]);
    utils.cancel_bubble(e);
    this.trigger('paste', pasted);
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
    utils.hook(this.hidden_input, 'oncut', function(e) {
        // Trigger the event in a timeout so it fires after the system event.
        setTimeout(function(){
            that.trigger('cut', that._clippable);
        }, 0);
    });
    utils.hook(this.hidden_input, 'oncopy', function(e) {
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

},{"./utils.js":22}],5:[function(require,module,exports){
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
 * @param  {boolean} (optional) hop=false - hop to the other side of the
 *                   selected region if the primary is on the opposite of the
 *                   direction of motion.
 * @return {null}
 */
Cursor.prototype.move_primary = function(x, y, hop) {
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
 * Select all of the text.
 * @return {null}
 */
Cursor.prototype.select_all = function() {
    this.primary_row = this._model._rows.length-1;
    this.primary_char = this._model._rows[this.primary_row].length;
    this.secondary_row = 0;
    this.secondary_char = 0;
    this.trigger('change'); 
};

/**
 * Move the primary cursor to the line end.
 * @return {null}
 */
Cursor.prototype.primary_goto_end = function() {
    this.primary_char = this._model._rows[this.primary_row].length;
    this._memory_char = this.primary_char;
    this.trigger('change'); 
};

/**
 * Move the primary cursor to the line start.
 * @return {null}
 */
Cursor.prototype.primary_goto_start = function() {
    this.primary_char = 0;
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
    if (this.primary_row == this.secondary_row && this.primary_char == this.secondary_char) {
        return this._model._rows[this.primary_row];
    } else {
        return this._model.get_text(this.start_row, this.start_char, this.end_row, this.end_char);
    }
};

/**
 * Cuts the selected text.
 * @return {string} selected text
 */
Cursor.prototype.cut = function() {
    var text = this.copy();
    if (this.primary_row == this.secondary_row && this.primary_char == this.secondary_char) {
        this._model.remove_row(this.primary_row);
    } else {
        this.remove_selected();
    }
    return text;
};

/**
 * Delete forward, typically called by `delete` keypress.
 * @return {null}
 */
Cursor.prototype.delete_forward = function() {
    if (!this.remove_selected()) {
        this.move_primary(1, 0);
        this.remove_selected();
    }
    return true;
};

/**
 * Delete backward, typically called by `backspace` keypress.
 * @return {null}
 */
Cursor.prototype.delete_backward = function() {
    if (!this.remove_selected()) {
        this.move_primary(-1, 0);
        this.remove_selected();
    }
    return true;
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
    register('cursor.delete_backward', utils.proxy(this.delete_backward, this), this);
    register('cursor.delete_forward', utils.proxy(this.delete_forward, this), this);
    register('cursor.select_all', utils.proxy(this.select_all, this), this);
    register('cursor.left', function() { that.move_primary(-1, 0, true); that._reset_secondary(); return true; });
    register('cursor.right', function() { that.move_primary(1, 0, true); that._reset_secondary(); return true; });
    register('cursor.up', function() { that.move_primary(0, -1, true); that._reset_secondary(); return true; });
    register('cursor.down', function() { that.move_primary(0, 1, true); that._reset_secondary(); return true; });
    register('cursor.select_left', function() { that.move_primary(-1, 0); return true; });
    register('cursor.select_right', function() { that.move_primary(1, 0); return true; });
    register('cursor.select_up', function() { that.move_primary(0, -1); return true; });
    register('cursor.select_down', function() { that.move_primary(0, 1); return true; });
    register('cursor.word_left', function() { that.word_primary(-1); that._reset_secondary(); return true; });
    register('cursor.word_right', function() { that.word_primary(1); that._reset_secondary(); return true; });
    register('cursor.select_word_left', function() { that.word_primary(-1); return true; });
    register('cursor.select_word_right', function() { that.word_primary(1); return true; });
    register('cursor.line_start', function() { that.primary_goto_start(); that._reset_secondary(); return true; });
    register('cursor.line_end', function() { that.primary_goto_end(); that._reset_secondary(); return true; });
    register('cursor.select_line_start', function() { that.primary_goto_start(); return true; });
    register('cursor.select_line_end', function() { that.primary_goto_end(); return true; });
};

exports.Cursor = Cursor;
},{"./events/map.js":11,"./utils.js":22}],6:[function(require,module,exports){
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

},{"./cursor.js":5,"./events/map.js":11,"./utils.js":22}],7:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('./utils.js');
var normalizer = require('./events/normalizer.js');
var keymap = require('./events/map.js');
var default_keymap = require('./events/default.js');
var cursors = require('./cursors.js');
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
};
utils.inherit(DocumentController, utils.PosterClass);

// Exports
exports.DocumentController = DocumentController;

},{"./clipboard.js":4,"./cursors.js":6,"./events/default.js":10,"./events/map.js":11,"./events/normalizer.js":12,"./utils.js":22}],8:[function(require,module,exports){
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
    var coords = this.validate_coords.apply(this, arguments);
    for (var row = coords.start_row; row <= coords.end_row; row++) {
        var start = coords.start_char;
        var end = coords.end_char;
        if (row > coords.start_row) { start = -1; }
        if (row < coords.end_row) { end = -1; }

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
 * @param  {integer} start_row
 * @param  {integer} end_row
 * @return {null}
 */
DocumentModel.prototype.clear_tags = function(start_row, end_row) {
    start_row = start_row !== undefined ? start_row : 0;
    end_row = end_row !== undefined ? end_row : this._row_tags.length - 1;
    for (var i = start_row; i <= end_row; i++) {
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
    var coords = this.validate_coords.apply(this, arguments);
    var tags = {};
    this._row_tags[coords.start_row].forEach(function(tag) {
        // Tag start of -1 means the tag continues to the previous line.
        var after_start = (coords.start_char >= tag.start || tag.start == -1);
        // Tag end of -1 means the tag continues to the next line.
        var before_end = (coords.start_char <= tag.end || tag.end == -1);
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
    var coords = this.validate_coords.apply(this, Array.prototype.slice.call(arguments, 0,2));
    // If the text has a new line in it, just re-set
    // the rows list.
    if (text.indexOf('\n') != -1) {
        var new_rows = [];
        if (coords.start_row > 0) {
            new_rows = this._rows.slice(0, coords.start_row);
        }

        var old_row = this._rows[coords.start_row];
        var old_row_start = old_row.substring(0, coords.start_char);
        var old_row_end = old_row.substring(coords.start_char);
        var split_text = text.split('\n');
        new_rows.push(old_row_start + split_text[0]);

        if (split_text.length > 2) {
            new_rows = new_rows.concat(split_text.slice(1,split_text.length-1));
        }

        new_rows.push(split_text[split_text.length-1] + old_row_end);

        if (coords.start_row+1 < this._rows.length) {
            new_rows = new_rows.concat(this._rows.slice(coords.start_row+1));
        }

        this._rows = new_rows;
        this._resized_rows();

    // Text doesn't have any new lines, just modify the
    // line and then trigger the row changed event.
    } else {
        var old_text = this._rows[coords.start_row];
        this._rows[coords.start_row] = old_text.substring(0, coords.start_char) + text + old_text.substring(coords.start_char);
        this.trigger('row_changed', coords.start_row);
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
    var coords = this.validate_coords.apply(this, arguments);
    if (coords.start_row == coords.end_row) {
        this._rows[coords.start_row] = this._rows[coords.start_row].substring(0, coords.start_char) + this._rows[coords.start_row].substring(coords.end_char);
    } else {
        this._rows[coords.start_row] = this._rows[coords.start_row].substring(0, coords.start_char) + this._rows[coords.end_row].substring(coords.end_char);
    }

    if (coords.end_row - coords.start_row > 0) {
        this._rows.splice(coords.start_row + 1, coords.end_row - coords.start_row);
        this._resized_rows();
    } else if (coords.end_row == coords.start_row) {
        this.trigger('row_changed', coords.start_row);
        this.trigger('changed');
    } else {
        this.trigger('row_changed', coords.start_row);
        this.trigger('row_changed', coords.end_row);
        this.trigger('changed');
    }
};

/**
 * Remove a row from the document.
 * @param  {integer} row_index
 * @return {null}
 */
DocumentModel.prototype.remove_row = function(row_index) {
    if (0 < row_index && row_index < this._rows.length) {
        this._rows.splice(row_index, 1);
        this._resized_rows();
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
    var coords = this.validate_coords.apply(this, arguments);
    if (coords.start_row==coords.end_row) {
        return this._rows[coords.start_row].substring(coords.start_char, coords.end_char);
    } else {
        var text = [];
        text.push(this._rows[coords.start_row].substring(coords.start_char));
        if (coords.end_row - coords.start_row > 1) {
            for (var i = coords.start_row + 1; i < coords.end_row; i++) {
                text.push(this._rows[i]);
            }
        }
        text.push(this._rows[coords.end_row].substring(0, coords.end_char));
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
 * Validates row, character coordinates in the document.
 * @param  {integer} start_row
 * @param  {integer} start_char
 * @param  {integer} (optional) end_row
 * @param  {integer} (optional) end_char
 * @return {dictionary} dictionary containing validated coordinates {start_row, 
 *                      start_char, end_row, end_char}
 */
DocumentModel.prototype.validate_coords = function(start_row, start_char, end_row, end_char) {

    // Make sure the values aren't undefined.
    if (start_row === undefined) start_row = 0;
    if (start_char === undefined) start_char = 0;
    if (end_row === undefined) end_row = start_row;
    if (end_char === undefined) end_char = start_char;

    // Make sure the values are within the bounds of the contents.
    if (this._rows.length === 0) {
        start_row = 0;
        start_char = 0;
        end_row = 0;
        end_char = 0;
    } else {
        if (start_row >= this._rows.length) start_row = this._rows.length - 1;
        if (start_row < 0) start_row = 0;
        if (end_row >= this._rows.length) end_row = this._rows.length - 1;
        if (end_row < 0) end_row = 0;

        if (start_char > this._rows[start_row].length) start_char = this._rows[start_row].length;
        if (start_char < 0) start_char = 0;
        if (end_char > this._rows[end_row].length) end_char = this._rows[end_row].length;
        if (end_char < 0) end_char = 0;
    }

    // Make sure the start is before the end.
    if (start_row > end_row || (start_row == end_row && start_char > end_char)) {
        return {
            start_row: end_row,
            start_char: end_char,
            end_row: start_row,
            end_char: start_char,
        };
    } else {
        return {
            start_row: start_row,
            start_char: start_char,
            end_row: end_row,
            end_char: end_char,
        };
    }
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
},{"./utils.js":22}],9:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('./utils.js');

// Renderers
var batch = require('./renderers/batch.js');
var highlighted_row = require('./renderers/highlighted_row.js');
var cursors = require('./renderers/cursors.js');
var color = require('./renderers/color.js');
var test_highlighter = require('./highlighters/test.js');

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
        row_renderer,
        has_focus);
    var color_renderer = new color.ColorRenderer();
    color_renderer.color = style ? style.background : 'white';

    // Create the document highlighter, which needs to know about the currently
    // rendered rows in order to know where to highlight.
    this.highlighter = new test_highlighter.TestHighlighter(model, row_renderer);

    // Pass get_row_char into cursors.
    cursors_model.get_row_char = utils.proxy(row_renderer.get_row_char, row_renderer);

    // Call base constructor.
    batch.BatchRenderer.call(this, [
        color_renderer,
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
        color_renderer.color = value.background;
    });
};
utils.inherit(DocumentView, batch.BatchRenderer);

exports.DocumentView = DocumentView;
},{"./highlighters/test.js":14,"./renderers/batch.js":15,"./renderers/color.js":16,"./renderers/cursors.js":17,"./renderers/highlighted_row.js":18,"./utils.js":22}],10:[function(require,module,exports){
// OSX bindings
if (navigator.appVersion.indexOf("Mac") != -1) {
    exports.map = {
        'alt-leftarrow' : 'cursor.word_left',
        'alt-rightarrow' : 'cursor.word_right',
        'shift-alt-leftarrow' : 'cursor.select_word_left',
        'shift-alt-rightarrow' : 'cursor.select_word_right',
        'meta-leftarrow' : 'cursor.line_start',
        'meta-rightarrow' : 'cursor.line_end',
        'shift-meta-leftarrow' : 'cursor.select_line_start',
        'shift-meta-rightarrow' : 'cursor.select_line_end',
        'meta-a' : 'cursor.select_all',
    };

// Non OSX bindings
} else {
    exports.map = {
        'ctrl-leftarrow' : 'cursor.word_left',
        'ctrl-rightarrow' : 'cursor.word_right',
        'shift-ctrl-leftarrow' : 'cursor.select_word_left',
        'shift-ctrl-rightarrow' : 'cursor.select_word_right',
        'home' : 'cursor.line_start',
        'end' : 'cursor.line_end',
        'shift-home' : 'cursor.select_line_start',
        'shift-end' : 'cursor.select_line_end',
        'ctrl-a' : 'cursor.select_all',
    };

}

// Common bindings
exports.map['keypress'] = 'cursor.keypress';
exports.map['enter'] = 'cursor.newline';
exports.map['delete'] = 'cursor.delete_forward';
exports.map['backspace'] = 'cursor.delete_backward';
exports.map['leftarrow'] = 'cursor.left';
exports.map['rightarrow'] = 'cursor.right';
exports.map['uparrow'] = 'cursor.up';
exports.map['downarrow'] = 'cursor.down';
exports.map['shift-leftarrow'] = 'cursor.select_left';
exports.map['shift-rightarrow'] = 'cursor.select_right';
exports.map['shift-uparrow'] = 'cursor.select_up';
exports.map['shift-downarrow'] = 'cursor.select_down';
exports.map['mouse0-down'] = 'cursors.start_selection';
exports.map['mouse-move'] = 'cursors.set_selection';
exports.map['mouse0-up'] = 'cursors.end_selection';

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
                        utils.cancel_bubble(e);
                        return true;
                    }
                } else {
                    if (action_callbacks.call(undefined, e)===true) {
                        utils.cancel_bubble(e);
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

// Exports
exports.Map = Map;

},{"../utils.js":22}],12:[function(require,module,exports){
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

},{"../utils.js":22}],13:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('../utils.js');

/**
 * Listens to a model and higlights the text accordingly.
 * @param {DocumentModel} model
 */
var HighlighterBase = function(model, row_renderer) {
    utils.PosterClass.call(this);
    this._model = model;
    this._row_renderer = row_renderer;
    this._queued = null;
    this.delay = 100; //ms

    // Bind events.
    this._row_renderer.on('rows_changed', utils.proxy(this._handle_scroll, this));
    this._model.on('text_changed', utils.proxy(this._handle_text_change, this));
    this._model.on('row_changed', utils.proxy(this._handle_text_change, this));
};
utils.inherit(HighlighterBase, utils.PosterClass);

/**
 * Highlight the document
 * @return {null}
 */
HighlighterBase.prototype.highlight = function(start_row, end_row) {
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
                var visible_rows = that._row_renderer.get_visible_rows();
                var top_row = visible_rows.top_row;
                var bottom_row = visible_rows.bottom_row;
                that.highlight(top_row, bottom_row);
            } finally {
                that._model.release_tag_event_lock();
                that._model.trigger_tag_events();
                that._queued = null;
            }
        }, this.delay);
    }
};

/**
 * Handles when the visible row indicies are changed.
 * @return {null}
 */
HighlighterBase.prototype._handle_scroll = function(start_row, end_row) {
    this._queue_highlighter();
};

/**
 * Handles when the text changes.
 * @return {null}
 */
HighlighterBase.prototype._handle_text_change = function() {
    this._queue_highlighter();
};

// Exports
exports.HighlighterBase = HighlighterBase;

},{"../utils.js":22}],14:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('../utils.js');
var highlighter = require('./highlighter.js');

/**
 * Listens to a model and higlights the text accordingly.
 * @param {DocumentModel} model
 */
var TestHighlighter = function(model, row_renderer) {
    highlighter.HighlighterBase.call(this, model, row_renderer);
    this._row_padding = 5;
};
utils.inherit(TestHighlighter, highlighter.HighlighterBase);

/**
 * Highlight the document
 * @return {null}
 */
TestHighlighter.prototype.highlight = function(start_row, end_row) {
    // TEST Highlighting
    start_row = Math.max(0, start_row - this._row_padding);
    end_row = Math.min(this._model._rows.length - 1, end_row + this._row_padding);

    // Clear the old highlighting.
    this._model.clear_tags(start_row, end_row);
    
    // New higlighting.
    for (var row_index=start_row; row_index<=end_row; row_index++) {
        // Highlight all ES.
        var row = this._model._rows[row_index];
        var index = row.indexOf('es');
        while (index != -1) {
            this._model.set_tag(row_index, index, row_index, index+1, 'syntax', 'keyword');
            index = row.indexOf('es', index+1);
        }

        index = row.indexOf('is');
        while (index != -1) {
            this._model.set_tag(row_index, index, row_index, index+1, 'syntax', 'string');
            index = row.indexOf('is', index+1);
        }
    }
};

// Exports
exports.TestHighlighter = TestHighlighter;

},{"../utils.js":22,"./highlighter.js":13}],15:[function(require,module,exports){
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
        if (!renderer.options.parent_independent) {
            renderer._canvas._tx = utils.proxy(that._canvas._tx, that._canvas);
            renderer._canvas._ty = utils.proxy(that._canvas._ty, that._canvas);
        }

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

},{"../utils.js":22,"./renderer.js":19}],16:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('../utils.js');
var renderer = require('./renderer.js');

/**
 * Renders to a canvas
 * @param {Canvas} default_canvas
 */
var ColorRenderer = function() {
    // Create with the option 'parent_independent' to disable
    // parent coordinate translations from being applied by 
    // a batch renderer.
    renderer.RendererBase.call(this, undefined, {parent_independent: true});
    this._rendered = false;
    
    // Create properties.
    var that = this;
    this.property('width', function() {
        return that._canvas.width;
    }, function(value) {
        that._canvas.width = value;
        that._render();

        // Tell parent layer this one has changed.
        this.trigger('changed');
    });
    this.property('height', function() {
        return that._canvas.height;
    }, function(value) {
        that._canvas.height = value;
        that._render();

        // Tell parent layer this one has changed.
        this.trigger('changed');
    });
    this.property('color', function() {
        return that._color;
    }, function(value) {
        that._color = value;
        that._render();

        // Tell parent layer this one has changed.
        this.trigger('changed');
    });
};
utils.inherit(ColorRenderer, renderer.RendererBase);

/**
 * Render to the canvas
 * @param {dictionary} (optional) scroll - How much the canvas was scrolled.  This
 *                     is a dictionary of the form {x: float, y: float}
 * @return {null}
 */
ColorRenderer.prototype.render = function(scroll) {
    if (!this._rendered) {
        this._render();
        this._rendered = true;
    }
};

/**
 * Render a frame.
 * @return {null}
 */
ColorRenderer.prototype._render = function() {
    this._canvas.clear();
    this._canvas.draw_rectangle(0, 0, this._canvas.width, this._canvas.height, {fill_color: this._color});
};

// Exports
exports.ColorRenderer = ColorRenderer;

},{"../utils.js":22,"./renderer.js":19}],17:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var animator = require('../animator.js');
var utils = require('../utils.js');
var renderer = require('./renderer.js');

/**
 * Render document cursors
 *
 * TODO: Only render visible.
 */
var CursorsRenderer = function(cursors, style, row_renderer, has_focus) {
    renderer.RendererBase.call(this);
    this.style = style;
    this._has_focus = has_focus;
    this._cursors = cursors;
    this._get_visible_rows = utils.proxy(row_renderer.get_visible_rows, row_renderer);
    this._get_row_height = utils.proxy(row_renderer.get_row_height, row_renderer);
    this._get_row_top = utils.proxy(row_renderer.get_row_top, row_renderer);
    this._measure_partial_row = utils.proxy(row_renderer.measure_partial_row_width, row_renderer);
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
            // Get the visible rows.
            var visible_rows = that._get_visible_rows();

            // If a cursor doesn't have a position, render it at the
            // beginning of the document.
            var row_index = cursor.primary_row || 0;
            var char_index = cursor.primary_char || 0;
            
            // Draw the cursor.
            if (visible_rows.top_row <= row_index && row_index <= visible_rows.bottom_row) {
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
            }
            
            // Draw the selection box.
            if (cursor.start_row !== null && cursor.start_char !== null &&
                cursor.end_row !== null && cursor.end_char !== null) {
                

                for (var i = Math.max(cursor.start_row, visible_rows.top_row); 
                    i <= Math.min(cursor.end_row, visible_rows.bottom_row); 
                    i++) {

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

},{"../animator.js":2,"../utils.js":22,"./renderer.js":19}],18:[function(require,module,exports){
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
    } else {
        render_options.color = this.style.text;
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

},{"../utils.js":22,"./row.js":20}],19:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var canvas = require('../canvas.js');
var utils = require('../utils.js');

/**
 * Renders to a canvas
 * @param {Canvas} default_canvas
 */
var RendererBase = function(default_canvas, options) {
    utils.PosterClass.call(this);
    this.options = options || {};
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

},{"../canvas.js":3,"../utils.js":22}],20:[function(require,module,exports){
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
    var visible_rows = this.get_visible_rows();
    var new_top_row = visible_rows.top_row;
    var new_bottom_row = visible_rows.bottom_row;

    // Check if this is a new range of rows.  If it is, notify anyone who's listening.
    if (this.last_top_row !== new_top_row || this.last_bottom_row !== new_bottom_row) {
        this.last_top_row = new_top_row;
        this.last_bottom_row = new_bottom_row;
        this.trigger('rows_changed', new_top_row, new_bottom_row);
    }

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
    var row_index = Math.floor(cursor_y / this.get_row_height());

    // Find the character index.
    var widths = [0];
    try {
        for (var length=1; length<=this._model._rows[row_index].length; length++) {
            widths.push(this.measure_partial_row_width(row_index, length));
        }
    } catch (e) {
        // Nom nom nom...
    }
    var coords = this._model.validate_coords(row_index, utils.find_closest(widths, cursor_x + this._scrolling_canvas.scroll_left));
    return {
        row_index: coords.start_row,
        char_index: coords.start_char,
    };
};

/**
 * Measures the partial width of a text row.
 * @param  {integer} index
 * @param  {integer} (optional) length - number of characters
 * @return {float} width
 */
RowRenderer.prototype.measure_partial_row_width = function(index, length) {
    if (index >= this._model._rows.length) { return 0; }
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
 * Gets the visible rows.
 * @return {dictionary} dictionary containing information about 
 *                      the visible rows.  Format {top_row, 
 *                      bottom_row, row_count}.
 */
RowRenderer.prototype.get_visible_rows = function() {

    // Find the row closest to the scroll top.  If that row is below
    // the scroll top, use the partially displayed row above it.
    var top_row = Math.max(0, Math.floor(this._scrolling_canvas.scroll_top  / this.get_row_height()));

    // Find the row closest to the scroll bottom.  If that row is above
    // the scroll bottom, use the partially displayed row below it.
    var row_count = Math.ceil(this._canvas.height / this.get_row_height());
    var bottom_row = top_row + row_count;

    // Row count + 1 to include first row.
    return {top_row: top_row, bottom_row: bottom_row, row_count: row_count+1};
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

},{"../utils.js":22,"./renderer.js":19}],21:[function(require,module,exports){
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
    this._touch_pane = document.createElement('div');
    this._touch_pane.setAttribute('class', 'touch-pane');
    this._dummy = document.createElement('div');
    this._dummy.setAttribute('class', 'scroll-dummy');

    this.el.appendChild(this._canvas);
    this.el.appendChild(this._scroll_bars);
    this._scroll_bars.appendChild(this._dummy);
    this._scroll_bars.appendChild(this._touch_pane);
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
        
        // Stretch the image for retina support.
        this.scale(2,2);
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
        
        // Stretch the image for retina support.
        this.scale(2,2);
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

    // Prevent scroll bar handled mouse events from bubbling.
    var scrollbar_event = function(e) {
        if (e.target !== that._touch_pane) {
            utils.cancel_bubble(e);
        }
    };
    this._scroll_bars.onmousedown = scrollbar_event;
    this._scroll_bars.onmouseup = scrollbar_event;
    this._scroll_bars.onclick = scrollbar_event;
    this._scroll_bars.ondblclick = scrollbar_event;
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
    this._touch_pane.setAttribute('style', 
        'width: ' + String(Math.max(x, this._scroll_bars.clientWidth)) + '; ' +
        'height: ' + String(Math.max(y, this._scroll_bars.clientHeight)) + ';');
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

},{"./canvas.js":3,"./utils.js":22}],22:[function(require,module,exports){
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

/**
 * Cancels event bubbling.
 * @param  {event} e
 * @return {null}
 */
var cancel_bubble = function(e) {
    if (e.stopPropagation) e.stopPropagation();
    if (e.cancelBubble !== null) e.cancelBubble = true;
    if (e.preventDefault) e.preventDefault();
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
exports.cancel_bubble = cancel_bubble;

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzb3VyY2UvanMvcG9zdGVyLmpzIiwic291cmNlL2pzL2FuaW1hdG9yLmpzIiwic291cmNlL2pzL2NhbnZhcy5qcyIsInNvdXJjZS9qcy9jbGlwYm9hcmQuanMiLCJzb3VyY2UvanMvY3Vyc29yLmpzIiwic291cmNlL2pzL2N1cnNvcnMuanMiLCJzb3VyY2UvanMvZG9jdW1lbnRfY29udHJvbGxlci5qcyIsInNvdXJjZS9qcy9kb2N1bWVudF9tb2RlbC5qcyIsInNvdXJjZS9qcy9kb2N1bWVudF92aWV3LmpzIiwic291cmNlL2pzL2V2ZW50cy9kZWZhdWx0LmpzIiwic291cmNlL2pzL2V2ZW50cy9tYXAuanMiLCJzb3VyY2UvanMvZXZlbnRzL25vcm1hbGl6ZXIuanMiLCJzb3VyY2UvanMvaGlnaGxpZ2h0ZXJzL2hpZ2hsaWdodGVyLmpzIiwic291cmNlL2pzL2hpZ2hsaWdodGVycy90ZXN0LmpzIiwic291cmNlL2pzL3JlbmRlcmVycy9iYXRjaC5qcyIsInNvdXJjZS9qcy9yZW5kZXJlcnMvY29sb3IuanMiLCJzb3VyY2UvanMvcmVuZGVyZXJzL2N1cnNvcnMuanMiLCJzb3VyY2UvanMvcmVuZGVyZXJzL2hpZ2hsaWdodGVkX3Jvdy5qcyIsInNvdXJjZS9qcy9yZW5kZXJlcnMvcmVuZGVyZXIuanMiLCJzb3VyY2UvanMvcmVuZGVyZXJzL3Jvdy5qcyIsInNvdXJjZS9qcy9zY3JvbGxpbmdfY2FudmFzLmpzIiwic291cmNlL2pzL3V0aWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1VkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIHNjcm9sbGluZ19jYW52YXMgPSByZXF1aXJlKCcuL3Njcm9sbGluZ19jYW52YXMuanMnKTtcbnZhciBkb2N1bWVudF9jb250cm9sbGVyID0gcmVxdWlyZSgnLi9kb2N1bWVudF9jb250cm9sbGVyLmpzJyk7XG52YXIgZG9jdW1lbnRfbW9kZWwgPSByZXF1aXJlKCcuL2RvY3VtZW50X21vZGVsLmpzJyk7XG52YXIgZG9jdW1lbnRfdmlldyA9IHJlcXVpcmUoJy4vZG9jdW1lbnRfdmlldy5qcycpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xuXG4vKipcbiAqIENhbnZhcyBiYXNlZCB0ZXh0IGVkaXRvclxuICovXG52YXIgUG9zdGVyID0gZnVuY3Rpb24oKSB7XG4gICAgdXRpbHMuUG9zdGVyQ2xhc3MuY2FsbCh0aGlzKTtcblxuICAgIC8vIENyZWF0ZSBjYW52YXNcbiAgICB0aGlzLmNhbnZhcyA9IG5ldyBzY3JvbGxpbmdfY2FudmFzLlNjcm9sbGluZ0NhbnZhcygpO1xuICAgIHRoaXMuZWwgPSB0aGlzLmNhbnZhcy5lbDsgLy8gQ29udmVuaWVuY2VcblxuICAgIC8vIENyZWF0ZSBtb2RlbCwgY29udHJvbGxlciwgYW5kIHZpZXcuXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMubW9kZWwgPSBuZXcgZG9jdW1lbnRfbW9kZWwuRG9jdW1lbnRNb2RlbCgpO1xuICAgIHRoaXMuY29udHJvbGxlciA9IG5ldyBkb2N1bWVudF9jb250cm9sbGVyLkRvY3VtZW50Q29udHJvbGxlcih0aGlzLmNhbnZhcy5lbCwgdGhpcy5tb2RlbCk7XG4gICAgdGhpcy52aWV3ID0gbmV3IGRvY3VtZW50X3ZpZXcuRG9jdW1lbnRWaWV3KFxuICAgICAgICB0aGlzLmNhbnZhcywgXG4gICAgICAgIHRoaXMubW9kZWwsIFxuICAgICAgICB0aGlzLmNvbnRyb2xsZXIuY3Vyc29ycywgXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNvbW1lbnQ6ICdyZWQnLFxuICAgICAgICAgICAgdG9kbzogJ29yYW5nZScsXG4gICAgICAgICAgICBzcGVjaWFsOiAnZ29sZCcsXG4gICAgICAgICAgICBzdHJpbmc6ICdncmVlbicsXG4gICAgICAgICAgICBjaGFyYWN0ZXI6ICdibHVlJyxcbiAgICAgICAgICAgIGNvbmRpdGlvbmFsOiAncHVycGxlJyxcbiAgICAgICAgICAgIHJlcGVhdDogJ3doaXRlJyxcbiAgICAgICAgICAgIG9wZXJhdG9yOiAnbGlnaHRjb3JhbCcsXG4gICAgICAgICAgICB0eXBlOiAnbGlnaHRzYWxtb24nLFxuICAgICAgICAgICAgc3RhdGVtZW50OiAnbGlnaHRnb2xkZW5yb2R5ZWxsb3cnLFxuICAgICAgICAgICAgZnVuY3Rpb246ICdsaWdodGdyZWVuJyxcbiAgICAgICAgICAgIGVycm9yOiAnbGlnaHRza3libHVlJyxcbiAgICAgICAgICAgIGJvb2xlYW46ICdtYWdlbnRhJyxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdpbmRpZ28nLFxuICAgICAgICAgICAgbGFiZWw6ICdncmF5JyxcbiAgICAgICAgICAgIGV4Y2VwdGlvbjogJ29saXZlJyxcbiAgICAgICAgICAgIGtleXdvcmQ6ICdvcmFuZ2VyZWQnLFxuICAgICAgICAgICAgZGVidWc6ICdyb3lhbGJsdWUnLFxuXG4gICAgICAgICAgICB0ZXh0OiAndmlvbGV0JyxcbiAgICAgICAgICAgIGJhY2tncm91bmQ6ICdibGFjaycsXG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhhdC5jb250cm9sbGVyLmNsaXBib2FyZC5oaWRkZW5faW5wdXQgPT09IGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQgfHwgdGhhdC5jYW52YXMuZm9jdXNlZDsgfVxuICAgICk7XG5cbiAgICAvLyBDcmVhdGUgcHJvcGVydGllc1xuICAgIHRoaXMucHJvcGVydHkoJ3ZhbHVlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Lm1vZGVsLnRleHQ7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC5tb2RlbC50ZXh0ID0gdmFsdWU7XG4gICAgfSk7XG4gICAgdGhpcy5wcm9wZXJ0eSgnd2lkdGgnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoYXQudmlldy53aWR0aDtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0LnZpZXcud2lkdGggPSB2YWx1ZTtcbiAgICB9KTtcbiAgICB0aGlzLnByb3BlcnR5KCdoZWlnaHQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoYXQudmlldy5oZWlnaHQ7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC52aWV3LmhlaWdodCA9IHZhbHVlO1xuICAgIH0pO1xufTtcbnV0aWxzLmluaGVyaXQoUG9zdGVyLCB1dGlscy5Qb3N0ZXJDbGFzcyk7XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuUG9zdGVyID0gUG9zdGVyO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xuXG4vKipcbiAqIEFuaW1hdGlvbiBoZWxwZXIuXG4gKi9cbnZhciBBbmltYXRvciA9IGZ1bmN0aW9uKGR1cmF0aW9uKSB7XG4gICAgdXRpbHMuUG9zdGVyQ2xhc3MuY2FsbCh0aGlzKTtcbiAgICB0aGlzLmR1cmF0aW9uID0gZHVyYXRpb247XG4gICAgdGhpcy5fc3RhcnQgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbn07XG51dGlscy5pbmhlcml0KEFuaW1hdG9yLCB1dGlscy5Qb3N0ZXJDbGFzcyk7XG5cbi8qKlxuICogR2V0IHRoZSB0aW1lIGluIHRoZSBhbmltYXRpb25cbiAqIEByZXR1cm4ge2Zsb2F0fSBiZXR3ZWVuIDAgYW5kIDFcbiAqL1xuQW5pbWF0b3IucHJvdG90eXBlLnRpbWUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZWxhcHNlZCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gdGhpcy5fc3RhcnQ7XG4gICAgcmV0dXJuIChlbGFwc2VkICUgdGhpcy5kdXJhdGlvbikgLyB0aGlzLmR1cmF0aW9uO1xufTtcblxuZXhwb3J0cy5BbmltYXRvciA9IEFuaW1hdG9yOyIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG5cbi8qKlxuICogSFRNTCBjYW52YXMgd2l0aCBkcmF3aW5nIGNvbnZpbmllbmNlIGZ1bmN0aW9ucy5cbiAqL1xudmFyIENhbnZhcyA9IGZ1bmN0aW9uKCkge1xuICAgIHV0aWxzLlBvc3RlckNsYXNzLmNhbGwodGhpcyk7XG4gICAgdGhpcy5fbGF5b3V0KCk7XG4gICAgdGhpcy5faW5pdF9wcm9wZXJ0aWVzKCk7XG5cbiAgICAvLyBTZXQgZGVmYXVsdCBzaXplLlxuICAgIHRoaXMud2lkdGggPSA0MDA7XG4gICAgdGhpcy5oZWlnaHQgPSAzMDA7XG59O1xudXRpbHMuaW5oZXJpdChDYW52YXMsIHV0aWxzLlBvc3RlckNsYXNzKTtcblxuLyoqXG4gKiBMYXlvdXQgdGhlIGVsZW1lbnRzIGZvciB0aGUgY2FudmFzLlxuICogQ3JlYXRlcyBgdGhpcy5lbGBcbiAqIFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5fbGF5b3V0ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgdGhpcy5fY2FudmFzLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAncG9zdGVyIGhpZGRlbi1jYW52YXMnKTtcbiAgICB0aGlzLmNvbnRleHQgPSB0aGlzLl9jYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICAgICAgXG4gICAgLy8gU3RyZXRjaCB0aGUgaW1hZ2UgZm9yIHJldGluYSBzdXBwb3J0LlxuICAgIHRoaXMuc2NhbGUoMiwyKTtcbn07XG5cbi8qKlxuICogTWFrZSB0aGUgcHJvcGVydGllcyBvZiB0aGUgY2xhc3MuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DYW52YXMucHJvdG90eXBlLl9pbml0X3Byb3BlcnRpZXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBIZWlnaHQgb2YgdGhlIGNhbnZhc1xuICAgICAqIEByZXR1cm4ge2Zsb2F0fVxuICAgICAqL1xuICAgIHRoaXMucHJvcGVydHkoJ2hlaWdodCcsIGZ1bmN0aW9uKCkgeyBcbiAgICAgICAgcmV0dXJuIHRoYXQuX2NhbnZhcy5oZWlnaHQgLyAyOyBcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0Ll9jYW52YXMuc2V0QXR0cmlidXRlKCdoZWlnaHQnLCB2YWx1ZSAqIDIpO1xuICAgICAgICBcbiAgICAgICAgLy8gU3RyZXRjaCB0aGUgaW1hZ2UgZm9yIHJldGluYSBzdXBwb3J0LlxuICAgICAgICB0aGlzLnNjYWxlKDIsMik7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBXaWR0aCBvZiB0aGUgY2FudmFzXG4gICAgICogQHJldHVybiB7ZmxvYXR9XG4gICAgICovXG4gICAgdGhpcy5wcm9wZXJ0eSgnd2lkdGgnLCBmdW5jdGlvbigpIHsgXG4gICAgICAgIHJldHVybiB0aGF0Ll9jYW52YXMud2lkdGggLyAyOyBcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0Ll9jYW52YXMuc2V0QXR0cmlidXRlKCd3aWR0aCcsIHZhbHVlICogMik7XG4gICAgICAgIFxuICAgICAgICAvLyBTdHJldGNoIHRoZSBpbWFnZSBmb3IgcmV0aW5hIHN1cHBvcnQuXG4gICAgICAgIHRoaXMuc2NhbGUoMiwyKTtcbiAgICB9KTtcbn07XG5cbi8qKlxuICogRHJhd3MgYSByZWN0YW5nbGVcbiAqIEBwYXJhbSAge2Zsb2F0fSB4XG4gKiBAcGFyYW0gIHtmbG9hdH0geVxuICogQHBhcmFtICB7ZmxvYXR9IHdpZHRoXG4gKiBAcGFyYW0gIHtmbG9hdH0gaGVpZ2h0XG4gKiBAcGFyYW0gIHtkaWN0aW9uYXJ5fSBvcHRpb25zLCBzZWUgX2FwcGx5X29wdGlvbnMoKSBmb3IgZGV0YWlsc1xuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5kcmF3X3JlY3RhbmdsZSA9IGZ1bmN0aW9uKHgsIHksIHdpZHRoLCBoZWlnaHQsIG9wdGlvbnMpIHtcbiAgICB4ID0gdGhpcy5fdHgoeCk7XG4gICAgeSA9IHRoaXMuX3R5KHkpO1xuICAgIHRoaXMuY29udGV4dC5iZWdpblBhdGgoKTtcbiAgICB0aGlzLmNvbnRleHQucmVjdCh4LCB5LCB3aWR0aCwgaGVpZ2h0KTtcbiAgICB0aGlzLl9kb19kcmF3KG9wdGlvbnMpO1xufTtcblxuLyoqXG4gKiBEcmF3cyBhIGNpcmNsZVxuICogQHBhcmFtICB7ZmxvYXR9IHhcbiAqIEBwYXJhbSAge2Zsb2F0fSB5XG4gKiBAcGFyYW0gIHtmbG9hdH0gclxuICogQHBhcmFtICB7ZGljdGlvbmFyeX0gb3B0aW9ucywgc2VlIF9hcHBseV9vcHRpb25zKCkgZm9yIGRldGFpbHNcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuZHJhd19jaXJjbGUgPSBmdW5jdGlvbih4LCB5LCByLCBvcHRpb25zKSB7XG4gICAgeCA9IHRoaXMuX3R4KHgpO1xuICAgIHkgPSB0aGlzLl90eSh5KTtcbiAgICB0aGlzLmNvbnRleHQuYmVnaW5QYXRoKCk7XG4gICAgdGhpcy5jb250ZXh0LmFyYyh4LCB5LCByLCAwLCAyICogTWF0aC5QSSk7XG4gICAgdGhpcy5fZG9fZHJhdyhvcHRpb25zKTtcbn07XG5cbi8qKlxuICogRHJhd3MgYW4gaW1hZ2VcbiAqIEBwYXJhbSAge2ltZyBlbGVtZW50fSBpbWdcbiAqIEBwYXJhbSAge2Zsb2F0fSB4XG4gKiBAcGFyYW0gIHtmbG9hdH0geVxuICogQHBhcmFtICB7ZmxvYXR9IChvcHRpb25hbCkgd2lkdGhcbiAqIEBwYXJhbSAge2Zsb2F0fSAob3B0aW9uYWwpIGhlaWdodFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5kcmF3X2ltYWdlID0gZnVuY3Rpb24oaW1nLCB4LCB5LCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgeCA9IHRoaXMuX3R4KHgpO1xuICAgIHkgPSB0aGlzLl90eSh5KTtcbiAgICB0aGlzLmNvbnRleHQuZHJhd0ltYWdlKGltZywgeCwgeSwgd2lkdGgsIGhlaWdodCk7XG59O1xuXG4vKipcbiAqIERyYXdzIGEgbGluZVxuICogQHBhcmFtICB7ZmxvYXR9IHgxXG4gKiBAcGFyYW0gIHtmbG9hdH0geTFcbiAqIEBwYXJhbSAge2Zsb2F0fSB4MlxuICogQHBhcmFtICB7ZmxvYXR9IHkyXG4gKiBAcGFyYW0gIHtkaWN0aW9uYXJ5fSBvcHRpb25zLCBzZWUgX2FwcGx5X29wdGlvbnMoKSBmb3IgZGV0YWlsc1xuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5kcmF3X2xpbmUgPSBmdW5jdGlvbih4MSwgeTEsIHgyLCB5Miwgb3B0aW9ucykge1xuICAgIHgxID0gdGhpcy5fdHgoeDEpO1xuICAgIHkxID0gdGhpcy5fdHkoeTEpO1xuICAgIHgyID0gdGhpcy5fdHgoeDIpO1xuICAgIHkyID0gdGhpcy5fdHkoeTIpO1xuICAgIHRoaXMuY29udGV4dC5iZWdpblBhdGgoKTtcbiAgICB0aGlzLmNvbnRleHQubW92ZVRvKHgxLCB5MSk7XG4gICAgdGhpcy5jb250ZXh0LmxpbmVUbyh4MiwgeTIpO1xuICAgIHRoaXMuX2RvX2RyYXcob3B0aW9ucyk7XG59O1xuXG4vKipcbiAqIERyYXdzIGEgcG9seSBsaW5lXG4gKiBAcGFyYW0gIHthcnJheX0gcG9pbnRzIC0gYXJyYXkgb2YgcG9pbnRzLiAgRWFjaCBwb2ludCBpc1xuICogICAgICAgICAgICAgICAgICAgICAgICAgIGFuIGFycmF5IGl0c2VsZiwgb2YgdGhlIGZvcm0gW3gsIHldIFxuICogICAgICAgICAgICAgICAgICAgICAgICAgIHdoZXJlIHggYW5kIHkgYXJlIGZsb2F0aW5nIHBvaW50XG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWVzLlxuICogQHBhcmFtICB7ZGljdGlvbmFyeX0gb3B0aW9ucywgc2VlIF9hcHBseV9vcHRpb25zKCkgZm9yIGRldGFpbHNcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuZHJhd19wb2x5bGluZSA9IGZ1bmN0aW9uKHBvaW50cywgb3B0aW9ucykge1xuICAgIGlmIChwb2ludHMubGVuZ3RoIDwgMikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1BvbHkgbGluZSBtdXN0IGhhdmUgYXRsZWFzdCB0d28gcG9pbnRzLicpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuY29udGV4dC5iZWdpblBhdGgoKTtcbiAgICAgICAgdmFyIHBvaW50ID0gcG9pbnRzWzBdO1xuICAgICAgICB0aGlzLmNvbnRleHQubW92ZVRvKHRoaXMuX3R4KHBvaW50WzBdKSwgdGhpcy5fdHkocG9pbnRbMV0pKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBwb2ludHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHBvaW50ID0gcG9pbnRzW2ldO1xuICAgICAgICAgICAgdGhpcy5jb250ZXh0LmxpbmVUbyh0aGlzLl90eChwb2ludFswXSksIHRoaXMuX3R5KHBvaW50WzFdKSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fZG9fZHJhdyhvcHRpb25zKTsgICAgXG4gICAgfVxufTtcblxuLyoqXG4gKiBEcmF3cyBhIHRleHQgc3RyaW5nXG4gKiBAcGFyYW0gIHtmbG9hdH0geFxuICogQHBhcmFtICB7ZmxvYXR9IHlcbiAqIEBwYXJhbSAge3N0cmluZ30gdGV4dCBzdHJpbmcgb3IgY2FsbGJhY2sgdGhhdCByZXNvbHZlcyB0byBhIHN0cmluZy5cbiAqIEBwYXJhbSAge2RpY3Rpb25hcnl9IG9wdGlvbnMsIHNlZSBfYXBwbHlfb3B0aW9ucygpIGZvciBkZXRhaWxzXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DYW52YXMucHJvdG90eXBlLmRyYXdfdGV4dCA9IGZ1bmN0aW9uKHgsIHksIHRleHQsIG9wdGlvbnMpIHtcbiAgICB4ID0gdGhpcy5fdHgoeCk7XG4gICAgeSA9IHRoaXMuX3R5KHkpO1xuICAgIG9wdGlvbnMgPSB0aGlzLl9hcHBseV9vcHRpb25zKG9wdGlvbnMpO1xuICAgIC8vICdmaWxsJyB0aGUgdGV4dCBieSBkZWZhdWx0IHdoZW4gbmVpdGhlciBhIHN0cm9rZSBvciBmaWxsIFxuICAgIC8vIGlzIGRlZmluZWQuICBPdGhlcndpc2Ugb25seSBmaWxsIGlmIGEgZmlsbCBpcyBkZWZpbmVkLlxuICAgIGlmIChvcHRpb25zLmZpbGwgfHwgIW9wdGlvbnMuc3Ryb2tlKSB7XG4gICAgICAgIHRoaXMuY29udGV4dC5maWxsVGV4dCh0ZXh0LCB4LCB5KTtcbiAgICB9XG4gICAgLy8gT25seSBzdHJva2UgaWYgYSBzdHJva2UgaXMgZGVmaW5lZC5cbiAgICBpZiAob3B0aW9ucy5zdHJva2UpIHtcbiAgICAgICAgdGhpcy5jb250ZXh0LnN0cm9rZVRleHQodGV4dCwgeCwgeSk7ICAgICAgIFxuICAgIH1cbn07XG5cbi8qKlxuICogR2V0J3MgYSBjaHVuayBvZiB0aGUgY2FudmFzIGFzIGEgcmF3IGltYWdlLlxuICogQHBhcmFtICB7ZmxvYXR9IHhcbiAqIEBwYXJhbSAge2Zsb2F0fSB5XG4gKiBAcGFyYW0gIHtmbG9hdH0gd2lkdGhcbiAqIEBwYXJhbSAge2Zsb2F0fSBoZWlnaHRcbiAqIEByZXR1cm4ge2ltYWdlfSBjYW52YXMgaW1hZ2UgZGF0YVxuICovXG5DYW52YXMucHJvdG90eXBlLmdldF9yYXdfaW1hZ2UgPSBmdW5jdGlvbih4LCB5LCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgeCA9IHRoaXMuX3R4KHgpO1xuICAgIHkgPSB0aGlzLl90eSh5KTtcbiAgICAvLyBNdWx0aXBseSBieSB0d28gZm9yIHBpeGVsIGRvdWJsaW5nLlxuICAgIHJldHVybiB0aGlzLmNvbnRleHQuZ2V0SW1hZ2VEYXRhKHgqMiwgeSoyLCB3aWR0aCoyLCBoZWlnaHQqMik7XG59O1xuXG4vKipcbiAqIFB1dCdzIGEgcmF3IGltYWdlIG9uIHRoZSBjYW52YXMgc29tZXdoZXJlLlxuICogQHBhcmFtICB7ZmxvYXR9IHhcbiAqIEBwYXJhbSAge2Zsb2F0fSB5XG4gKiBAcmV0dXJuIHtpbWFnZX0gY2FudmFzIGltYWdlIGRhdGFcbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5wdXRfcmF3X2ltYWdlID0gZnVuY3Rpb24oaW1nLCB4LCB5KSB7XG4gICAgeCA9IHRoaXMuX3R4KHgpO1xuICAgIHkgPSB0aGlzLl90eSh5KTtcbiAgICAvLyBNdWx0aXBseSBieSB0d28gZm9yIHBpeGVsIGRvdWJsaW5nLlxuICAgIHJldHVybiB0aGlzLmNvbnRleHQucHV0SW1hZ2VEYXRhKGltZywgeCoyLCB5KjIpO1xufTtcblxuLyoqXG4gKiBNZWFzdXJlcyB0aGUgd2lkdGggb2YgYSB0ZXh0IHN0cmluZy5cbiAqIEBwYXJhbSAge3N0cmluZ30gdGV4dFxuICogQHBhcmFtICB7ZGljdGlvbmFyeX0gb3B0aW9ucywgc2VlIF9hcHBseV9vcHRpb25zKCkgZm9yIGRldGFpbHNcbiAqIEByZXR1cm4ge2Zsb2F0fSB3aWR0aFxuICovXG5DYW52YXMucHJvdG90eXBlLm1lYXN1cmVfdGV4dCA9IGZ1bmN0aW9uKHRleHQsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gdGhpcy5fYXBwbHlfb3B0aW9ucyhvcHRpb25zKTtcbiAgICByZXR1cm4gdGhpcy5jb250ZXh0Lm1lYXN1cmVUZXh0KHRleHQpLndpZHRoO1xufTtcblxuLyoqXG4gKiBDbGVhcidzIHRoZSBjYW52YXMuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DYW52YXMucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5jb250ZXh0LmNsZWFyUmVjdCgwLCAwLCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCk7XG59O1xuXG4vKipcbiAqIFNjYWxlIHRoZSBjdXJyZW50IGRyYXdpbmcuXG4gKiBAcGFyYW0gIHtmbG9hdH0geFxuICogQHBhcmFtICB7ZmxvYXR9IHlcbiAqIEByZXR1cm4ge251bGx9ICBcbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5zY2FsZSA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICB0aGlzLmNvbnRleHQuc2NhbGUoeCwgeSk7XG59O1xuXG4vKipcbiAqIEZpbmlzaGVzIHRoZSBkcmF3aW5nIG9wZXJhdGlvbiB1c2luZyB0aGUgc2V0IG9mIHByb3ZpZGVkIG9wdGlvbnMuXG4gKiBAcGFyYW0gIHtkaWN0aW9uYXJ5fSAob3B0aW9uYWwpIGRpY3Rpb25hcnkgdGhhdCBcbiAqICByZXNvbHZlcyB0byBhIGRpY3Rpb25hcnkuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DYW52YXMucHJvdG90eXBlLl9kb19kcmF3ID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSB0aGlzLl9hcHBseV9vcHRpb25zKG9wdGlvbnMpO1xuXG4gICAgLy8gT25seSBmaWxsIGlmIGEgZmlsbCBpcyBkZWZpbmVkLlxuICAgIGlmIChvcHRpb25zLmZpbGwpIHtcbiAgICAgICAgdGhpcy5jb250ZXh0LmZpbGwoKTtcbiAgICB9XG4gICAgLy8gU3Ryb2tlIGJ5IGRlZmF1bHQsIGlmIG5vIHN0cm9rZSBvciBmaWxsIGlzIGRlZmluZWQuICBPdGhlcndpc2VcbiAgICAvLyBvbmx5IHN0cm9rZSBpZiBhIHN0cm9rZSBpcyBkZWZpbmVkLlxuICAgIGlmIChvcHRpb25zLnN0cm9rZSB8fCAhb3B0aW9ucy5maWxsKSB7XG4gICAgICAgIHRoaXMuY29udGV4dC5zdHJva2UoKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEFwcGxpZXMgYSBkaWN0aW9uYXJ5IG9mIGRyYXdpbmcgb3B0aW9ucyB0byB0aGUgcGVuLlxuICogQHBhcmFtICB7ZGljdGlvbmFyeX0gb3B0aW9uc1xuICogICAgICBhbHBoYSB7ZmxvYXR9IE9wYWNpdHkgKDAtMSlcbiAqICAgICAgY29tcG9zaXRlX29wZXJhdGlvbiB7c3RyaW5nfSBIb3cgbmV3IGltYWdlcyBhcmUgXG4gKiAgICAgICAgICBkcmF3biBvbnRvIGFuIGV4aXN0aW5nIGltYWdlLiAgUG9zc2libGUgdmFsdWVzXG4gKiAgICAgICAgICBhcmUgYHNvdXJjZS1vdmVyYCwgYHNvdXJjZS1hdG9wYCwgYHNvdXJjZS1pbmAsIFxuICogICAgICAgICAgYHNvdXJjZS1vdXRgLCBgZGVzdGluYXRpb24tb3ZlcmAsIFxuICogICAgICAgICAgYGRlc3RpbmF0aW9uLWF0b3BgLCBgZGVzdGluYXRpb24taW5gLCBcbiAqICAgICAgICAgIGBkZXN0aW5hdGlvbi1vdXRgLCBgbGlnaHRlcmAsIGBjb3B5YCwgb3IgYHhvcmAuXG4gKiAgICAgIGxpbmVfY2FwIHtzdHJpbmd9IEVuZCBjYXAgc3R5bGUgZm9yIGxpbmVzLlxuICogICAgICAgICAgUG9zc2libGUgdmFsdWVzIGFyZSAnYnV0dCcsICdyb3VuZCcsIG9yICdzcXVhcmUnLlxuICogICAgICBsaW5lX2pvaW4ge3N0cmluZ30gSG93IHRvIHJlbmRlciB3aGVyZSB0d28gbGluZXNcbiAqICAgICAgICAgIG1lZXQuICBQb3NzaWJsZSB2YWx1ZXMgYXJlICdiZXZlbCcsICdyb3VuZCcsIG9yXG4gKiAgICAgICAgICAnbWl0ZXInLlxuICogICAgICBsaW5lX3dpZHRoIHtmbG9hdH0gSG93IHRoaWNrIGxpbmVzIGFyZS5cbiAqICAgICAgbGluZV9taXRlcl9saW1pdCB7ZmxvYXR9IE1heCBsZW5ndGggb2YgbWl0ZXJzLlxuICogICAgICBsaW5lX2NvbG9yIHtzdHJpbmd9IENvbG9yIG9mIHRoZSBsaW5lLlxuICogICAgICBmaWxsX2NvbG9yIHtzdHJpbmd9IENvbG9yIHRvIGZpbGwgdGhlIHNoYXBlLlxuICogICAgICBjb2xvciB7c3RyaW5nfSBDb2xvciB0byBzdHJva2UgYW5kIGZpbGwgdGhlIHNoYXBlLlxuICogICAgICAgICAgTG93ZXIgcHJpb3JpdHkgdG8gbGluZV9jb2xvciBhbmQgZmlsbF9jb2xvci5cbiAqICAgICAgZm9udF9zdHlsZSB7c3RyaW5nfVxuICogICAgICBmb250X3ZhcmlhbnQge3N0cmluZ31cbiAqICAgICAgZm9udF93ZWlnaHQge3N0cmluZ31cbiAqICAgICAgZm9udF9zaXplIHtzdHJpbmd9XG4gKiAgICAgIGZvbnRfZmFtaWx5IHtzdHJpbmd9XG4gKiAgICAgIGZvbnQge3N0cmluZ30gT3ZlcnJpZGRlcyBhbGwgb3RoZXIgZm9udCBwcm9wZXJ0aWVzLlxuICogICAgICB0ZXh0X2FsaWduIHtzdHJpbmd9IEhvcml6b250YWwgYWxpZ25tZW50IG9mIHRleHQuICBcbiAqICAgICAgICAgIFBvc3NpYmxlIHZhbHVlcyBhcmUgYHN0YXJ0YCwgYGVuZGAsIGBjZW50ZXJgLFxuICogICAgICAgICAgYGxlZnRgLCBvciBgcmlnaHRgLlxuICogICAgICB0ZXh0X2Jhc2VsaW5lIHtzdHJpbmd9IFZlcnRpY2FsIGFsaWdubWVudCBvZiB0ZXh0LlxuICogICAgICAgICAgUG9zc2libGUgdmFsdWVzIGFyZSBgYWxwaGFiZXRpY2AsIGB0b3BgLCBcbiAqICAgICAgICAgIGBoYW5naW5nYCwgYG1pZGRsZWAsIGBpZGVvZ3JhcGhpY2AsIG9yIFxuICogICAgICAgICAgYGJvdHRvbWAuXG4gKiBAcmV0dXJuIHtkaWN0aW9uYXJ5fSBvcHRpb25zLCByZXNvbHZlZC5cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5fYXBwbHlfb3B0aW9ucyA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICBvcHRpb25zID0gdXRpbHMucmVzb2x2ZV9jYWxsYWJsZShvcHRpb25zKTtcblxuICAgIC8vIFNwZWNpYWwgb3B0aW9ucy5cbiAgICB0aGlzLmNvbnRleHQuZ2xvYmFsQWxwaGEgPSBvcHRpb25zLmFscGhhIHx8IDEuMDtcbiAgICB0aGlzLmNvbnRleHQuZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uID0gb3B0aW9ucy5jb21wb3NpdGVfb3BlcmF0aW9uIHx8ICdzb3VyY2Utb3Zlcic7XG4gICAgXG4gICAgLy8gTGluZSBzdHlsZS5cbiAgICB0aGlzLmNvbnRleHQubGluZUNhcCA9IG9wdGlvbnMubGluZV9jYXAgfHwgJ2J1dHQnO1xuICAgIHRoaXMuY29udGV4dC5saW5lSm9pbiA9IG9wdGlvbnMubGluZV9qb2luIHx8ICdiZXZlbCc7XG4gICAgdGhpcy5jb250ZXh0LmxpbmVXaWR0aCA9IG9wdGlvbnMubGluZV93aWR0aCB8fCAxLjA7XG4gICAgdGhpcy5jb250ZXh0Lm1pdGVyTGltaXQgPSBvcHRpb25zLmxpbmVfbWl0ZXJfbGltaXQgfHwgMTA7XG4gICAgdGhpcy5jb250ZXh0LnN0cm9rZVN0eWxlID0gb3B0aW9ucy5saW5lX2NvbG9yIHx8IG9wdGlvbnMuY29sb3IgfHwgJ2JsYWNrJzsgLy8gVE9ETzogU3VwcG9ydCBncmFkaWVudFxuICAgIG9wdGlvbnMuc3Ryb2tlID0gKG9wdGlvbnMubGluZV9jb2xvciAhPT0gdW5kZWZpbmVkIHx8IG9wdGlvbnMubGluZV93aWR0aCAhPT0gdW5kZWZpbmVkKTtcblxuICAgIC8vIEZpbGwgc3R5bGUuXG4gICAgdGhpcy5jb250ZXh0LmZpbGxTdHlsZSA9IG9wdGlvbnMuZmlsbF9jb2xvciB8fCBvcHRpb25zLmNvbG9yIHx8ICdibGFjayc7IC8vIFRPRE86IFN1cHBvcnQgZ3JhZGllbnRcbiAgICBvcHRpb25zLmZpbGwgPSBvcHRpb25zLmZpbGxfY29sb3IgIT09IHVuZGVmaW5lZDtcblxuICAgIC8vIEZvbnQgc3R5bGUuXG4gICAgdmFyIGZvbnRfc3R5bGUgPSBvcHRpb25zLmZvbnRfc3R5bGUgfHwgJyc7XG4gICAgdmFyIGZvbnRfdmFyaWFudCA9IG9wdGlvbnMuZm9udF92YXJpYW50IHx8ICcnO1xuICAgIHZhciBmb250X3dlaWdodCA9IG9wdGlvbnMuZm9udF93ZWlnaHQgfHwgJyc7XG4gICAgdmFyIGZvbnRfc2l6ZSA9IG9wdGlvbnMuZm9udF9zaXplIHx8ICcxMnB0JztcbiAgICB2YXIgZm9udF9mYW1pbHkgPSBvcHRpb25zLmZvbnRfZmFtaWx5IHx8ICdBcmlhbCc7XG4gICAgdmFyIGZvbnQgPSBmb250X3N0eWxlICsgJyAnICsgZm9udF92YXJpYW50ICsgJyAnICsgZm9udF93ZWlnaHQgKyAnICcgKyBmb250X3NpemUgKyAnICcgKyBmb250X2ZhbWlseTtcbiAgICB0aGlzLmNvbnRleHQuZm9udCA9IG9wdGlvbnMuZm9udCB8fCBmb250O1xuXG4gICAgLy8gVGV4dCBzdHlsZS5cbiAgICB0aGlzLmNvbnRleHQudGV4dEFsaWduID0gb3B0aW9ucy50ZXh0X2FsaWduIHx8ICdsZWZ0JztcbiAgICB0aGlzLmNvbnRleHQudGV4dEJhc2VsaW5lID0gb3B0aW9ucy50ZXh0X2Jhc2VsaW5lIHx8ICd0b3AnO1xuXG4gICAgLy8gVE9ETzogU3VwcG9ydCBzaGFkb3dzLlxuXG4gICAgcmV0dXJuIG9wdGlvbnM7XG59O1xuXG4vKipcbiAqIFRyYW5zZm9ybSBhbiB4IHZhbHVlIGJlZm9yZSByZW5kZXJpbmcuXG4gKiBAcGFyYW0gIHtmbG9hdH0geFxuICogQHJldHVybiB7ZmxvYXR9XG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuX3R4ID0gZnVuY3Rpb24oeCkgeyByZXR1cm4geDsgfTtcblxuLyoqXG4gKiBUcmFuc2Zvcm0gYSB5IHZhbHVlIGJlZm9yZSByZW5kZXJpbmcuXG4gKiBAcGFyYW0gIHtmbG9hdH0geVxuICogQHJldHVybiB7ZmxvYXR9XG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuX3R5ID0gZnVuY3Rpb24oeSkgeyByZXR1cm4geTsgfTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5DYW52YXMgPSBDYW52YXM7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG5cbi8qKlxuICogRXZlbnRmdWwgY2xpcGJvYXJkIHN1cHBvcnRcbiAqXG4gKiBXQVJOSU5HOiAgVGhpcyBjbGFzcyBpcyBhIGh1ZGdlIGtsdWRnZSB0aGF0IHdvcmtzIGFyb3VuZCB0aGUgcHJlaGlzdG9yaWNcbiAqIGNsaXBib2FyZCBzdXBwb3J0IChsYWNrIHRoZXJlb2YpIGluIG1vZGVybiB3ZWJyb3dzZXJzLiAgSXQgY3JlYXRlcyBhIGhpZGRlblxuICogdGV4dGJveCB3aGljaCBpcyBmb2N1c2VkLiAgVGhlIHByb2dyYW1tZXIgbXVzdCBjYWxsIGBzZXRfY2xpcHBhYmxlYCB0byBjaGFuZ2VcbiAqIHdoYXQgd2lsbCBiZSBjb3BpZWQgd2hlbiB0aGUgdXNlciBoaXRzIGtleXMgY29ycmVzcG9uZGluZyB0byBhIGNvcHkgXG4gKiBvcGVyYXRpb24uICBFdmVudHMgYGNvcHlgLCBgY3V0YCwgYW5kIGBwYXN0ZWAgYXJlIHJhaXNlZCBieSB0aGlzIGNsYXNzLlxuICovXG52YXIgQ2xpcGJvYXJkID0gZnVuY3Rpb24oZWwpIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMuX2VsID0gZWw7XG5cbiAgICAvLyBDcmVhdGUgYSB0ZXh0Ym94IHRoYXQncyBoaWRkZW4uXG4gICAgdGhpcy5oaWRkZW5faW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZXh0YXJlYScpO1xuICAgIHRoaXMuaGlkZGVuX2lucHV0LnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAncG9zdGVyIGhpZGRlbi1jbGlwYm9hcmQnKTtcbiAgICBlbC5hcHBlbmRDaGlsZCh0aGlzLmhpZGRlbl9pbnB1dCk7XG5cbiAgICB0aGlzLl9iaW5kX2V2ZW50cygpO1xufTtcbnV0aWxzLmluaGVyaXQoQ2xpcGJvYXJkLCB1dGlscy5Qb3N0ZXJDbGFzcyk7XG5cbi8qKlxuICogU2V0IHdoYXQgd2lsbCBiZSBjb3BpZWQgd2hlbiB0aGUgdXNlciBjb3BpZXMuXG4gKiBAcGFyYW0ge3N0cmluZ30gdGV4dFxuICovXG5DbGlwYm9hcmQucHJvdG90eXBlLnNldF9jbGlwcGFibGUgPSBmdW5jdGlvbih0ZXh0KSB7XG4gICAgdGhpcy5fY2xpcHBhYmxlID0gdGV4dDtcbiAgICB0aGlzLmhpZGRlbl9pbnB1dC52YWx1ZSA9IHRoaXMuX2NsaXBwYWJsZTtcbiAgICB0aGlzLl9mb2N1cygpO1xufTsgXG5cbi8qKlxuICogRm9jdXMgdGhlIGhpZGRlbiB0ZXh0IGFyZWEuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DbGlwYm9hcmQucHJvdG90eXBlLl9mb2N1cyA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuaGlkZGVuX2lucHV0LmZvY3VzKCk7XG4gICAgdGhpcy5oaWRkZW5faW5wdXQuc2VsZWN0KCk7XG59O1xuXG4vKipcbiAqIEhhbmRsZSB3aGVuIHRoZSB1c2VyIHBhc3RlcyBpbnRvIHRoZSB0ZXh0Ym94LlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ2xpcGJvYXJkLnByb3RvdHlwZS5faGFuZGxlX3Bhc3RlID0gZnVuY3Rpb24oZSkge1xuICAgIHZhciBwYXN0ZWQgPSBlLmNsaXBib2FyZERhdGEuZ2V0RGF0YShlLmNsaXBib2FyZERhdGEudHlwZXNbMF0pO1xuICAgIHV0aWxzLmNhbmNlbF9idWJibGUoZSk7XG4gICAgdGhpcy50cmlnZ2VyKCdwYXN0ZScsIHBhc3RlZCk7XG59O1xuXG4vKipcbiAqIEJpbmQgZXZlbnRzIG9mIHRoZSBoaWRkZW4gdGV4dGJveC5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkNsaXBib2FyZC5wcm90b3R5cGUuX2JpbmRfZXZlbnRzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuXG4gICAgLy8gTGlzdGVuIHRvIGVsJ3MgZm9jdXMgZXZlbnQuICBJZiBlbCBpcyBmb2N1c2VkLCBmb2N1cyB0aGUgaGlkZGVuIGlucHV0XG4gICAgLy8gaW5zdGVhZC5cbiAgICB1dGlscy5ob29rKHRoaXMuX2VsLCAnb25mb2N1cycsIHV0aWxzLnByb3h5KHRoaXMuX2ZvY3VzLCB0aGlzKSk7XG5cbiAgICB1dGlscy5ob29rKHRoaXMuaGlkZGVuX2lucHV0LCAnb25wYXN0ZScsIHV0aWxzLnByb3h5KHRoaXMuX2hhbmRsZV9wYXN0ZSwgdGhpcykpO1xuICAgIHV0aWxzLmhvb2sodGhpcy5oaWRkZW5faW5wdXQsICdvbmN1dCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgLy8gVHJpZ2dlciB0aGUgZXZlbnQgaW4gYSB0aW1lb3V0IHNvIGl0IGZpcmVzIGFmdGVyIHRoZSBzeXN0ZW0gZXZlbnQuXG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHRoYXQudHJpZ2dlcignY3V0JywgdGhhdC5fY2xpcHBhYmxlKTtcbiAgICAgICAgfSwgMCk7XG4gICAgfSk7XG4gICAgdXRpbHMuaG9vayh0aGlzLmhpZGRlbl9pbnB1dCwgJ29uY29weScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgdGhhdC50cmlnZ2VyKCdjb3B5JywgdGhhdC5fY2xpcHBhYmxlKTtcbiAgICB9KTtcbiAgICB1dGlscy5ob29rKHRoaXMuaGlkZGVuX2lucHV0LCAnb25rZXlwcmVzcycsIGZ1bmN0aW9uKCkge1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhhdC5oaWRkZW5faW5wdXQudmFsdWUgPSB0aGF0Ll9jbGlwcGFibGU7XG4gICAgICAgICAgICB0aGF0Ll9mb2N1cygpO1xuICAgICAgICB9LCAwKTtcbiAgICB9KTtcbiAgICB1dGlscy5ob29rKHRoaXMuaGlkZGVuX2lucHV0LCAnb25rZXl1cCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhhdC5oaWRkZW5faW5wdXQudmFsdWUgPSB0aGF0Ll9jbGlwcGFibGU7XG4gICAgICAgICAgICB0aGF0Ll9mb2N1cygpO1xuICAgICAgICB9LCAwKTtcbiAgICB9KTtcbn07XG5cbmV4cG9ydHMuQ2xpcGJvYXJkID0gQ2xpcGJvYXJkO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cbnZhciBrZXltYXAgPSByZXF1aXJlKCcuL2V2ZW50cy9tYXAuanMnKTtcbnZhciByZWdpc3RlciA9IGtleW1hcC5NYXAucmVnaXN0ZXI7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKTtcblxuLyoqXG4gKiBJbnB1dCBjdXJzb3IuXG4gKi9cbnZhciBDdXJzb3IgPSBmdW5jdGlvbihtb2RlbCkge1xuICAgIHV0aWxzLlBvc3RlckNsYXNzLmNhbGwodGhpcyk7XG4gICAgdGhpcy5fbW9kZWwgPSBtb2RlbDtcblxuICAgIHRoaXMucHJpbWFyeV9yb3cgPSBudWxsO1xuICAgIHRoaXMucHJpbWFyeV9jaGFyID0gbnVsbDtcbiAgICB0aGlzLnNlY29uZGFyeV9yb3cgPSBudWxsO1xuICAgIHRoaXMuc2Vjb25kYXJ5X2NoYXIgPSBudWxsO1xuXG4gICAgdGhpcy5faW5pdF9wcm9wZXJ0aWVzKCk7XG4gICAgdGhpcy5fcmVnaXN0ZXJfYXBpKCk7XG59O1xudXRpbHMuaW5oZXJpdChDdXJzb3IsIHV0aWxzLlBvc3RlckNsYXNzKTtcblxuLyoqXG4gKiBNb3ZlcyB0aGUgcHJpbWFyeSBjdXJzb3IgYSBnaXZlbiBvZmZzZXQuXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSB4XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSB5XG4gKiBAcGFyYW0gIHtib29sZWFufSAob3B0aW9uYWwpIGhvcD1mYWxzZSAtIGhvcCB0byB0aGUgb3RoZXIgc2lkZSBvZiB0aGVcbiAqICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkIHJlZ2lvbiBpZiB0aGUgcHJpbWFyeSBpcyBvbiB0aGUgb3Bwb3NpdGUgb2YgdGhlXG4gKiAgICAgICAgICAgICAgICAgICBkaXJlY3Rpb24gb2YgbW90aW9uLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5tb3ZlX3ByaW1hcnkgPSBmdW5jdGlvbih4LCB5LCBob3ApIHtcbiAgICBpZiAoaG9wKSB7XG4gICAgICAgIGlmICh0aGlzLnByaW1hcnlfcm93ICE9IHRoaXMuc2Vjb25kYXJ5X3JvdyB8fCB0aGlzLnByaW1hcnlfY2hhciAhPSB0aGlzLnNlY29uZGFyeV9jaGFyKSB7XG4gICAgICAgICAgICB2YXIgc3RhcnRfcm93ID0gdGhpcy5zdGFydF9yb3c7XG4gICAgICAgICAgICB2YXIgc3RhcnRfY2hhciA9IHRoaXMuc3RhcnRfY2hhcjtcbiAgICAgICAgICAgIHZhciBlbmRfcm93ID0gdGhpcy5lbmRfcm93O1xuICAgICAgICAgICAgdmFyIGVuZF9jaGFyID0gdGhpcy5lbmRfY2hhcjtcbiAgICAgICAgICAgIGlmICh4PDAgfHwgeTwwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wcmltYXJ5X3JvdyA9IHN0YXJ0X3JvdztcbiAgICAgICAgICAgICAgICB0aGlzLnByaW1hcnlfY2hhciA9IHN0YXJ0X2NoYXI7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWNvbmRhcnlfcm93ID0gZW5kX3JvdztcbiAgICAgICAgICAgICAgICB0aGlzLnNlY29uZGFyeV9jaGFyID0gZW5kX2NoYXI7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMucHJpbWFyeV9yb3cgPSBlbmRfcm93O1xuICAgICAgICAgICAgICAgIHRoaXMucHJpbWFyeV9jaGFyID0gZW5kX2NoYXI7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWNvbmRhcnlfcm93ID0gc3RhcnRfcm93O1xuICAgICAgICAgICAgICAgIHRoaXMuc2Vjb25kYXJ5X2NoYXIgPSBzdGFydF9jaGFyO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHggPCAwKSB7XG4gICAgICAgIGlmICh0aGlzLnByaW1hcnlfY2hhciArIHggPCAwKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5wcmltYXJ5X3JvdyA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMucHJpbWFyeV9jaGFyID0gMDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wcmltYXJ5X3JvdyAtPSAxO1xuICAgICAgICAgICAgICAgIHRoaXMucHJpbWFyeV9jaGFyID0gdGhpcy5fbW9kZWwuX3Jvd3NbdGhpcy5wcmltYXJ5X3Jvd10ubGVuZ3RoO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5wcmltYXJ5X2NoYXIgKz0geDtcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoeCA+IDApIHtcbiAgICAgICAgaWYgKHRoaXMucHJpbWFyeV9jaGFyICsgeCA+IHRoaXMuX21vZGVsLl9yb3dzW3RoaXMucHJpbWFyeV9yb3ddLmxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKHRoaXMucHJpbWFyeV9yb3cgPT09IHRoaXMuX21vZGVsLl9yb3dzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnByaW1hcnlfY2hhciA9IHRoaXMuX21vZGVsLl9yb3dzW3RoaXMucHJpbWFyeV9yb3ddLmxlbmd0aDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wcmltYXJ5X3JvdyArPSAxO1xuICAgICAgICAgICAgICAgIHRoaXMucHJpbWFyeV9jaGFyID0gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMucHJpbWFyeV9jaGFyICs9IHg7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBSZW1lbWJlciB0aGUgY2hhcmFjdGVyIHBvc2l0aW9uLCB2ZXJ0aWNhbCBuYXZpZ2F0aW9uIGFjcm9zcyBlbXB0eSBsaW5lc1xuICAgIC8vIHNob3VsZG4ndCBjYXVzZSB0aGUgaG9yaXpvbnRhbCBwb3NpdGlvbiB0byBiZSBsb3N0LlxuICAgIGlmICh4ICE9PSAwKSB7XG4gICAgICAgIHRoaXMuX21lbW9yeV9jaGFyID0gdGhpcy5wcmltYXJ5X2NoYXI7XG4gICAgfVxuXG4gICAgaWYgKHkgIT09IDApIHtcbiAgICAgICAgdGhpcy5wcmltYXJ5X3JvdyArPSB5O1xuICAgICAgICB0aGlzLnByaW1hcnlfcm93ID0gTWF0aC5taW4oTWF0aC5tYXgodGhpcy5wcmltYXJ5X3JvdywgMCksIHRoaXMuX21vZGVsLl9yb3dzLmxlbmd0aC0xKTtcbiAgICAgICAgaWYgKHRoaXMuX21lbW9yeV9jaGFyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRoaXMucHJpbWFyeV9jaGFyID0gdGhpcy5fbWVtb3J5X2NoYXI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMucHJpbWFyeV9jaGFyID4gdGhpcy5fbW9kZWwuX3Jvd3NbdGhpcy5wcmltYXJ5X3Jvd10ubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLnByaW1hcnlfY2hhciA9IHRoaXMuX21vZGVsLl9yb3dzW3RoaXMucHJpbWFyeV9yb3ddLmxlbmd0aDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7IFxufTtcblxuLyoqXG4gKiBXYWxrIHRoZSBwcmltYXJ5IGN1cnNvciBpbiBhIGRpcmVjdGlvbiB1bnRpbCBhIG5vdC10ZXh0IGNoYXJhY3RlciBpcyBmb3VuZC5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IGRpcmVjdGlvblxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS53b3JkX3ByaW1hcnkgPSBmdW5jdGlvbihkaXJlY3Rpb24pIHtcbiAgICAvLyBNYWtlIHN1cmUgZGlyZWN0aW9uIGlzIDEgb3IgLTEuXG4gICAgZGlyZWN0aW9uID0gZGlyZWN0aW9uIDwgMCA/IC0xIDogMTtcblxuICAgIC8vIElmIG1vdmluZyBsZWZ0IGFuZCBhdCBlbmQgb2Ygcm93LCBtb3ZlIHVwIGEgcm93IGlmIHBvc3NpYmxlLlxuICAgIGlmICh0aGlzLnByaW1hcnlfY2hhciA9PT0gMCAmJiBkaXJlY3Rpb24gPT0gLTEpIHtcbiAgICAgICAgaWYgKHRoaXMucHJpbWFyeV9yb3cgIT09IDApIHtcbiAgICAgICAgICAgIHRoaXMucHJpbWFyeV9yb3ctLTtcbiAgICAgICAgICAgIHRoaXMucHJpbWFyeV9jaGFyID0gdGhpcy5fbW9kZWwuX3Jvd3NbdGhpcy5wcmltYXJ5X3Jvd10ubGVuZ3RoO1xuICAgICAgICAgICAgdGhpcy5fbWVtb3J5X2NoYXIgPSB0aGlzLnByaW1hcnlfY2hhcjtcbiAgICAgICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7IFxuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBJZiBtb3ZpbmcgcmlnaHQgYW5kIGF0IGVuZCBvZiByb3csIG1vdmUgZG93biBhIHJvdyBpZiBwb3NzaWJsZS5cbiAgICBpZiAodGhpcy5wcmltYXJ5X2NoYXIgPj0gdGhpcy5fbW9kZWwuX3Jvd3NbdGhpcy5wcmltYXJ5X3Jvd10ubGVuZ3RoICYmIGRpcmVjdGlvbiA9PSAxKSB7XG4gICAgICAgIGlmICh0aGlzLnByaW1hcnlfcm93IDwgdGhpcy5fbW9kZWwuX3Jvd3MubGVuZ3RoLTEpIHtcbiAgICAgICAgICAgIHRoaXMucHJpbWFyeV9yb3crKztcbiAgICAgICAgICAgIHRoaXMucHJpbWFyeV9jaGFyID0gMDtcbiAgICAgICAgICAgIHRoaXMuX21lbW9yeV9jaGFyID0gdGhpcy5wcmltYXJ5X2NoYXI7XG4gICAgICAgICAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZScpOyBcbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGkgPSB0aGlzLnByaW1hcnlfY2hhcjtcbiAgICB2YXIgaGl0X3RleHQgPSBmYWxzZTtcbiAgICB2YXIgcm93X3RleHQgPSB0aGlzLl9tb2RlbC5fcm93c1t0aGlzLnByaW1hcnlfcm93XTtcbiAgICBpZiAoZGlyZWN0aW9uID09IC0xKSB7XG4gICAgICAgIHdoaWxlICgwIDwgaSAmJiAhKGhpdF90ZXh0ICYmIHRoaXMuX25vdF90ZXh0KHJvd190ZXh0W2ktMV0pKSkge1xuICAgICAgICAgICAgaGl0X3RleHQgPSBoaXRfdGV4dCB8fCAhdGhpcy5fbm90X3RleHQocm93X3RleHRbaS0xXSk7XG4gICAgICAgICAgICBpICs9IGRpcmVjdGlvbjtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHdoaWxlIChpIDwgcm93X3RleHQubGVuZ3RoICYmICEoaGl0X3RleHQgJiYgdGhpcy5fbm90X3RleHQocm93X3RleHRbaV0pKSkge1xuICAgICAgICAgICAgaGl0X3RleHQgPSBoaXRfdGV4dCB8fCAhdGhpcy5fbm90X3RleHQocm93X3RleHRbaV0pO1xuICAgICAgICAgICAgaSArPSBkaXJlY3Rpb247XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLnByaW1hcnlfY2hhciA9IGk7XG4gICAgdGhpcy5fbWVtb3J5X2NoYXIgPSB0aGlzLnByaW1hcnlfY2hhcjtcbiAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZScpOyBcbn07XG5cbi8qKlxuICogU2VsZWN0IGFsbCBvZiB0aGUgdGV4dC5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuc2VsZWN0X2FsbCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMucHJpbWFyeV9yb3cgPSB0aGlzLl9tb2RlbC5fcm93cy5sZW5ndGgtMTtcbiAgICB0aGlzLnByaW1hcnlfY2hhciA9IHRoaXMuX21vZGVsLl9yb3dzW3RoaXMucHJpbWFyeV9yb3ddLmxlbmd0aDtcbiAgICB0aGlzLnNlY29uZGFyeV9yb3cgPSAwO1xuICAgIHRoaXMuc2Vjb25kYXJ5X2NoYXIgPSAwO1xuICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7IFxufTtcblxuLyoqXG4gKiBNb3ZlIHRoZSBwcmltYXJ5IGN1cnNvciB0byB0aGUgbGluZSBlbmQuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3IucHJvdG90eXBlLnByaW1hcnlfZ290b19lbmQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnByaW1hcnlfY2hhciA9IHRoaXMuX21vZGVsLl9yb3dzW3RoaXMucHJpbWFyeV9yb3ddLmxlbmd0aDtcbiAgICB0aGlzLl9tZW1vcnlfY2hhciA9IHRoaXMucHJpbWFyeV9jaGFyO1xuICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7IFxufTtcblxuLyoqXG4gKiBNb3ZlIHRoZSBwcmltYXJ5IGN1cnNvciB0byB0aGUgbGluZSBzdGFydC5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvci5wcm90b3R5cGUucHJpbWFyeV9nb3RvX3N0YXJ0ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5wcmltYXJ5X2NoYXIgPSAwO1xuICAgIHRoaXMuX21lbW9yeV9jaGFyID0gdGhpcy5wcmltYXJ5X2NoYXI7XG4gICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2UnKTsgXG59O1xuXG4vKipcbiAqIFNldCB0aGUgcHJpbWFyeSBjdXJzb3IgcG9zaXRpb25cbiAqIEBwYXJhbSB7aW50ZWdlcn0gcm93X2luZGV4XG4gKiBAcGFyYW0ge2ludGVnZXJ9IGNoYXJfaW5kZXhcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5zZXRfcHJpbWFyeSA9IGZ1bmN0aW9uKHJvd19pbmRleCwgY2hhcl9pbmRleCkge1xuICAgIHRoaXMucHJpbWFyeV9yb3cgPSByb3dfaW5kZXg7XG4gICAgdGhpcy5wcmltYXJ5X2NoYXIgPSBjaGFyX2luZGV4O1xuXG4gICAgLy8gUmVtZW1iZXIgdGhlIGNoYXJhY3RlciBwb3NpdGlvbiwgdmVydGljYWwgbmF2aWdhdGlvbiBhY3Jvc3MgZW1wdHkgbGluZXNcbiAgICAvLyBzaG91bGRuJ3QgY2F1c2UgdGhlIGhvcml6b250YWwgcG9zaXRpb24gdG8gYmUgbG9zdC5cbiAgICB0aGlzLl9tZW1vcnlfY2hhciA9IHRoaXMucHJpbWFyeV9jaGFyO1xuXG4gICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2UnKTsgXG59O1xuXG4vKipcbiAqIFNldCB0aGUgc2Vjb25kYXJ5IGN1cnNvciBwb3NpdGlvblxuICogQHBhcmFtIHtpbnRlZ2VyfSByb3dfaW5kZXhcbiAqIEBwYXJhbSB7aW50ZWdlcn0gY2hhcl9pbmRleFxuICovXG5DdXJzb3IucHJvdG90eXBlLnNldF9zZWNvbmRhcnkgPSBmdW5jdGlvbihyb3dfaW5kZXgsIGNoYXJfaW5kZXgpIHtcbiAgICB0aGlzLnNlY29uZGFyeV9yb3cgPSByb3dfaW5kZXg7XG4gICAgdGhpcy5zZWNvbmRhcnlfY2hhciA9IGNoYXJfaW5kZXg7ICAgIFxuICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7IFxufTtcblxuLyoqXG4gKiBIYW5kbGVzIHdoZW4gYSBrZXkgaXMgcHJlc3NlZC5cbiAqIEBwYXJhbSAge0V2ZW50fSBlIC0gb3JpZ2luYWwga2V5IHByZXNzIGV2ZW50LlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5rZXlwcmVzcyA9IGZ1bmN0aW9uKGUpIHtcbiAgICB2YXIgY2hhcl9jb2RlID0gZS53aGljaCB8fCBlLmtleUNvZGU7XG4gICAgdmFyIGNoYXJfdHlwZWQgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGNoYXJfY29kZSk7XG4gICAgdGhpcy5yZW1vdmVfc2VsZWN0ZWQoKTtcbiAgICB0aGlzLl9tb2RlbC5hZGRfdGV4dCh0aGlzLnByaW1hcnlfcm93LCB0aGlzLnByaW1hcnlfY2hhciwgY2hhcl90eXBlZCk7XG4gICAgdGhpcy5tb3ZlX3ByaW1hcnkoMSwgMCk7XG4gICAgdGhpcy5fcmVzZXRfc2Vjb25kYXJ5KCk7XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIEluc2VydCBhIG5ld2xpbmVcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvci5wcm90b3R5cGUubmV3bGluZSA9IGZ1bmN0aW9uKGUpIHtcbiAgICB0aGlzLnJlbW92ZV9zZWxlY3RlZCgpO1xuICAgIHRoaXMuX21vZGVsLmFkZF90ZXh0KHRoaXMucHJpbWFyeV9yb3csIHRoaXMucHJpbWFyeV9jaGFyLCAnXFxuJyk7XG4gICAgdGhpcy5tb3ZlX3ByaW1hcnkoMCwgMSk7XG4gICAgdGhpcy5fcmVzZXRfc2Vjb25kYXJ5KCk7XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIEluc2VydCB0ZXh0XG4gKiBAcGFyYW0gIHtzdHJpbmd9IHRleHRcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuaW5zZXJ0X3RleHQgPSBmdW5jdGlvbih0ZXh0KSB7XG4gICAgdGhpcy5yZW1vdmVfc2VsZWN0ZWQoKTtcbiAgICB0aGlzLl9tb2RlbC5hZGRfdGV4dCh0aGlzLnByaW1hcnlfcm93LCB0aGlzLnByaW1hcnlfY2hhciwgdGV4dCk7XG4gICAgXG4gICAgLy8gTW92ZSBjdXJzb3IgdG8gdGhlIGVuZC5cbiAgICBpZiAodGV4dC5pbmRleE9mKCdcXG4nKT09LTEpIHtcbiAgICAgICAgdGhpcy5wcmltYXJ5X2NoYXIgPSB0aGlzLnN0YXJ0X2NoYXIgKyB0ZXh0Lmxlbmd0aDtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgbGluZXMgPSB0ZXh0LnNwbGl0KCdcXG4nKTtcbiAgICAgICAgdGhpcy5wcmltYXJ5X3JvdyArPSBsaW5lcy5sZW5ndGggLSAxO1xuICAgICAgICB0aGlzLnByaW1hcnlfY2hhciA9IGxpbmVzW2xpbmVzLmxlbmd0aC0xXS5sZW5ndGg7XG4gICAgfVxuICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7IFxuXG4gICAgdGhpcy5fcmVzZXRfc2Vjb25kYXJ5KCk7XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIFJlbW92ZSB0aGUgc2VsZWN0ZWQgdGV4dFxuICogQHJldHVybiB7Ym9vbGVhbn0gdHJ1ZSBpZiB0ZXh0IHdhcyByZW1vdmVkLlxuICovXG5DdXJzb3IucHJvdG90eXBlLnJlbW92ZV9zZWxlY3RlZCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLnByaW1hcnlfcm93ICE9PSB0aGlzLnNlY29uZGFyeV9yb3cgfHwgdGhpcy5wcmltYXJ5X2NoYXIgIT09IHRoaXMuc2Vjb25kYXJ5X2NoYXIpIHtcbiAgICAgICAgdmFyIHJvd19pbmRleCA9IHRoaXMuc3RhcnRfcm93O1xuICAgICAgICB2YXIgY2hhcl9pbmRleCA9IHRoaXMuc3RhcnRfY2hhcjtcbiAgICAgICAgdGhpcy5fbW9kZWwucmVtb3ZlX3RleHQodGhpcy5zdGFydF9yb3csIHRoaXMuc3RhcnRfY2hhciwgdGhpcy5lbmRfcm93LCB0aGlzLmVuZF9jaGFyKTtcbiAgICAgICAgdGhpcy5wcmltYXJ5X3JvdyA9IHJvd19pbmRleDtcbiAgICAgICAgdGhpcy5wcmltYXJ5X2NoYXIgPSBjaGFyX2luZGV4O1xuICAgICAgICB0aGlzLl9yZXNldF9zZWNvbmRhcnkoKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2UnKTsgXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG4vKipcbiAqIENvcGllcyB0aGUgc2VsZWN0ZWQgdGV4dC5cbiAqIEByZXR1cm4ge3N0cmluZ30gc2VsZWN0ZWQgdGV4dFxuICovXG5DdXJzb3IucHJvdG90eXBlLmNvcHkgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5wcmltYXJ5X3JvdyA9PSB0aGlzLnNlY29uZGFyeV9yb3cgJiYgdGhpcy5wcmltYXJ5X2NoYXIgPT0gdGhpcy5zZWNvbmRhcnlfY2hhcikge1xuICAgICAgICByZXR1cm4gdGhpcy5fbW9kZWwuX3Jvd3NbdGhpcy5wcmltYXJ5X3Jvd107XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX21vZGVsLmdldF90ZXh0KHRoaXMuc3RhcnRfcm93LCB0aGlzLnN0YXJ0X2NoYXIsIHRoaXMuZW5kX3JvdywgdGhpcy5lbmRfY2hhcik7XG4gICAgfVxufTtcblxuLyoqXG4gKiBDdXRzIHRoZSBzZWxlY3RlZCB0ZXh0LlxuICogQHJldHVybiB7c3RyaW5nfSBzZWxlY3RlZCB0ZXh0XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuY3V0ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRleHQgPSB0aGlzLmNvcHkoKTtcbiAgICBpZiAodGhpcy5wcmltYXJ5X3JvdyA9PSB0aGlzLnNlY29uZGFyeV9yb3cgJiYgdGhpcy5wcmltYXJ5X2NoYXIgPT0gdGhpcy5zZWNvbmRhcnlfY2hhcikge1xuICAgICAgICB0aGlzLl9tb2RlbC5yZW1vdmVfcm93KHRoaXMucHJpbWFyeV9yb3cpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMucmVtb3ZlX3NlbGVjdGVkKCk7XG4gICAgfVxuICAgIHJldHVybiB0ZXh0O1xufTtcblxuLyoqXG4gKiBEZWxldGUgZm9yd2FyZCwgdHlwaWNhbGx5IGNhbGxlZCBieSBgZGVsZXRlYCBrZXlwcmVzcy5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuZGVsZXRlX2ZvcndhcmQgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoIXRoaXMucmVtb3ZlX3NlbGVjdGVkKCkpIHtcbiAgICAgICAgdGhpcy5tb3ZlX3ByaW1hcnkoMSwgMCk7XG4gICAgICAgIHRoaXMucmVtb3ZlX3NlbGVjdGVkKCk7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBEZWxldGUgYmFja3dhcmQsIHR5cGljYWxseSBjYWxsZWQgYnkgYGJhY2tzcGFjZWAga2V5cHJlc3MuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3IucHJvdG90eXBlLmRlbGV0ZV9iYWNrd2FyZCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICghdGhpcy5yZW1vdmVfc2VsZWN0ZWQoKSkge1xuICAgICAgICB0aGlzLm1vdmVfcHJpbWFyeSgtMSwgMCk7XG4gICAgICAgIHRoaXMucmVtb3ZlX3NlbGVjdGVkKCk7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBSZXNldCB0aGUgc2Vjb25kYXJ5IGN1cnNvciB0byB0aGUgdmFsdWUgb2YgdGhlIHByaW1hcnkuXG4gKiBAcmV0dXJuIHtbdHlwZV19IFtkZXNjcmlwdGlvbl1cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5fcmVzZXRfc2Vjb25kYXJ5ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zZWNvbmRhcnlfcm93ID0gdGhpcy5wcmltYXJ5X3JvdztcbiAgICB0aGlzLnNlY29uZGFyeV9jaGFyID0gdGhpcy5wcmltYXJ5X2NoYXI7XG5cbiAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZScpOyBcbn07XG5cbi8qKlxuICogQ3JlYXRlIHRoZSBwcm9wZXJ0aWVzIG9mIHRoZSBjdXJzb3IuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3IucHJvdG90eXBlLl9pbml0X3Byb3BlcnRpZXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdGhpcy5wcm9wZXJ0eSgnc3RhcnRfcm93JywgZnVuY3Rpb24oKSB7IHJldHVybiBNYXRoLm1pbih0aGF0LnByaW1hcnlfcm93LCB0aGF0LnNlY29uZGFyeV9yb3cpOyB9KTtcbiAgICB0aGlzLnByb3BlcnR5KCdlbmRfcm93JywgZnVuY3Rpb24oKSB7IHJldHVybiBNYXRoLm1heCh0aGF0LnByaW1hcnlfcm93LCB0aGF0LnNlY29uZGFyeV9yb3cpOyB9KTtcbiAgICB0aGlzLnByb3BlcnR5KCdzdGFydF9jaGFyJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0aGF0LnByaW1hcnlfcm93IDwgdGhhdC5zZWNvbmRhcnlfcm93IHx8ICh0aGF0LnByaW1hcnlfcm93ID09IHRoYXQuc2Vjb25kYXJ5X3JvdyAmJiB0aGF0LnByaW1hcnlfY2hhciA8PSB0aGF0LnNlY29uZGFyeV9jaGFyKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoYXQucHJpbWFyeV9jaGFyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoYXQuc2Vjb25kYXJ5X2NoYXI7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICB0aGlzLnByb3BlcnR5KCdlbmRfY2hhcicsIGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodGhhdC5wcmltYXJ5X3JvdyA8IHRoYXQuc2Vjb25kYXJ5X3JvdyB8fCAodGhhdC5wcmltYXJ5X3JvdyA9PSB0aGF0LnNlY29uZGFyeV9yb3cgJiYgdGhhdC5wcmltYXJ5X2NoYXIgPD0gdGhhdC5zZWNvbmRhcnlfY2hhcikpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGF0LnNlY29uZGFyeV9jaGFyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoYXQucHJpbWFyeV9jaGFyO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiB0aGUgY2hhcmFjdGVyIGlzbid0IHRleHQuXG4gKiBAcGFyYW0gIHtjaGFyfSBjIC0gY2hhcmFjdGVyXG4gKiBAcmV0dXJuIHtib29sZWFufSB0cnVlIGlmIHRoZSBjaGFyYWN0ZXIgaXMgbm90IHRleHQuXG4gKi9cbkN1cnNvci5wcm90b3R5cGUuX25vdF90ZXh0ID0gZnVuY3Rpb24oYykge1xuICAgIHJldHVybiAnYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY3ODkwJy5pbmRleE9mKGMudG9Mb3dlckNhc2UoKSkgPT0gLTE7XG59O1xuXG4vKipcbiAqIFJlZ2lzdGVycyBhbiBhY3Rpb24gQVBJIHdpdGggdGhlIG1hcFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5fcmVnaXN0ZXJfYXBpID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3IucmVtb3ZlX3NlbGVjdGVkJywgdXRpbHMucHJveHkodGhpcy5yZW1vdmVfc2VsZWN0ZWQsIHRoaXMpLCB0aGlzKTtcbiAgICByZWdpc3RlcignY3Vyc29yLmtleXByZXNzJywgdXRpbHMucHJveHkodGhpcy5rZXlwcmVzcywgdGhpcyksIHRoaXMpO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3IubmV3bGluZScsIHV0aWxzLnByb3h5KHRoaXMubmV3bGluZSwgdGhpcyksIHRoaXMpO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3IuaW5zZXJ0X3RleHQnLCB1dGlscy5wcm94eSh0aGlzLmluc2VydF90ZXh0LCB0aGlzKSwgdGhpcyk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5kZWxldGVfYmFja3dhcmQnLCB1dGlscy5wcm94eSh0aGlzLmRlbGV0ZV9iYWNrd2FyZCwgdGhpcyksIHRoaXMpO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3IuZGVsZXRlX2ZvcndhcmQnLCB1dGlscy5wcm94eSh0aGlzLmRlbGV0ZV9mb3J3YXJkLCB0aGlzKSwgdGhpcyk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5zZWxlY3RfYWxsJywgdXRpbHMucHJveHkodGhpcy5zZWxlY3RfYWxsLCB0aGlzKSwgdGhpcyk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5sZWZ0JywgZnVuY3Rpb24oKSB7IHRoYXQubW92ZV9wcmltYXJ5KC0xLCAwLCB0cnVlKTsgdGhhdC5fcmVzZXRfc2Vjb25kYXJ5KCk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLnJpZ2h0JywgZnVuY3Rpb24oKSB7IHRoYXQubW92ZV9wcmltYXJ5KDEsIDAsIHRydWUpOyB0aGF0Ll9yZXNldF9zZWNvbmRhcnkoKTsgcmV0dXJuIHRydWU7IH0pO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3IudXAnLCBmdW5jdGlvbigpIHsgdGhhdC5tb3ZlX3ByaW1hcnkoMCwgLTEsIHRydWUpOyB0aGF0Ll9yZXNldF9zZWNvbmRhcnkoKTsgcmV0dXJuIHRydWU7IH0pO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3IuZG93bicsIGZ1bmN0aW9uKCkgeyB0aGF0Lm1vdmVfcHJpbWFyeSgwLCAxLCB0cnVlKTsgdGhhdC5fcmVzZXRfc2Vjb25kYXJ5KCk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLnNlbGVjdF9sZWZ0JywgZnVuY3Rpb24oKSB7IHRoYXQubW92ZV9wcmltYXJ5KC0xLCAwKTsgcmV0dXJuIHRydWU7IH0pO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3Iuc2VsZWN0X3JpZ2h0JywgZnVuY3Rpb24oKSB7IHRoYXQubW92ZV9wcmltYXJ5KDEsIDApOyByZXR1cm4gdHJ1ZTsgfSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5zZWxlY3RfdXAnLCBmdW5jdGlvbigpIHsgdGhhdC5tb3ZlX3ByaW1hcnkoMCwgLTEpOyByZXR1cm4gdHJ1ZTsgfSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5zZWxlY3RfZG93bicsIGZ1bmN0aW9uKCkgeyB0aGF0Lm1vdmVfcHJpbWFyeSgwLCAxKTsgcmV0dXJuIHRydWU7IH0pO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3Iud29yZF9sZWZ0JywgZnVuY3Rpb24oKSB7IHRoYXQud29yZF9wcmltYXJ5KC0xKTsgdGhhdC5fcmVzZXRfc2Vjb25kYXJ5KCk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLndvcmRfcmlnaHQnLCBmdW5jdGlvbigpIHsgdGhhdC53b3JkX3ByaW1hcnkoMSk7IHRoYXQuX3Jlc2V0X3NlY29uZGFyeSgpOyByZXR1cm4gdHJ1ZTsgfSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5zZWxlY3Rfd29yZF9sZWZ0JywgZnVuY3Rpb24oKSB7IHRoYXQud29yZF9wcmltYXJ5KC0xKTsgcmV0dXJuIHRydWU7IH0pO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3Iuc2VsZWN0X3dvcmRfcmlnaHQnLCBmdW5jdGlvbigpIHsgdGhhdC53b3JkX3ByaW1hcnkoMSk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLmxpbmVfc3RhcnQnLCBmdW5jdGlvbigpIHsgdGhhdC5wcmltYXJ5X2dvdG9fc3RhcnQoKTsgdGhhdC5fcmVzZXRfc2Vjb25kYXJ5KCk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLmxpbmVfZW5kJywgZnVuY3Rpb24oKSB7IHRoYXQucHJpbWFyeV9nb3RvX2VuZCgpOyB0aGF0Ll9yZXNldF9zZWNvbmRhcnkoKTsgcmV0dXJuIHRydWU7IH0pO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3Iuc2VsZWN0X2xpbmVfc3RhcnQnLCBmdW5jdGlvbigpIHsgdGhhdC5wcmltYXJ5X2dvdG9fc3RhcnQoKTsgcmV0dXJuIHRydWU7IH0pO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3Iuc2VsZWN0X2xpbmVfZW5kJywgZnVuY3Rpb24oKSB7IHRoYXQucHJpbWFyeV9nb3RvX2VuZCgpOyByZXR1cm4gdHJ1ZTsgfSk7XG59O1xuXG5leHBvcnRzLkN1cnNvciA9IEN1cnNvcjsiLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxudmFyIGtleW1hcCA9IHJlcXVpcmUoJy4vZXZlbnRzL21hcC5qcycpO1xudmFyIHJlZ2lzdGVyID0ga2V5bWFwLk1hcC5yZWdpc3RlcjtcblxudmFyIGN1cnNvciA9IHJlcXVpcmUoJy4vY3Vyc29yLmpzJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG4vKipcbiAqIE1hbmFnZXMgb25lIG9yIG1vcmUgY3Vyc29yc1xuICovXG52YXIgQ3Vyc29ycyA9IGZ1bmN0aW9uKG1vZGVsLCBjbGlwYm9hcmQpIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMuX21vZGVsID0gbW9kZWw7XG4gICAgdGhpcy5nZXRfcm93X2NoYXIgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5jdXJzb3JzID0gW107XG4gICAgdGhpcy5fc2VsZWN0aW5nX3RleHQgPSBmYWxzZTtcbiAgICB0aGlzLl9jbGlwYm9hcmQgPSBjbGlwYm9hcmQ7XG5cbiAgICAvLyBDcmVhdGUgaW5pdGlhbCBjdXJzb3IuXG4gICAgdGhpcy5jcmVhdGUoKTtcblxuICAgIC8vIFJlZ2lzdGVyIGFjdGlvbnMuXG4gICAgcmVnaXN0ZXIoJ2N1cnNvcnMuc3RhcnRfc2VsZWN0aW9uJywgdXRpbHMucHJveHkodGhpcy5zdGFydF9zZWxlY3Rpb24sIHRoaXMpKTtcbiAgICByZWdpc3RlcignY3Vyc29ycy5zZXRfc2VsZWN0aW9uJywgdXRpbHMucHJveHkodGhpcy5zZXRfc2VsZWN0aW9uLCB0aGlzKSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvcnMuZW5kX3NlbGVjdGlvbicsIHV0aWxzLnByb3h5KHRoaXMuZW5kX3NlbGVjdGlvbiwgdGhpcykpO1xuXG4gICAgLy8gQmluZCBjbGlwYm9hcmQgZXZlbnRzLlxuICAgIHRoaXMuX2NsaXBib2FyZC5vbignY3V0JywgdXRpbHMucHJveHkodGhpcy5faGFuZGxlX2N1dCwgdGhpcykpO1xuICAgIHRoaXMuX2NsaXBib2FyZC5vbigncGFzdGUnLCB1dGlscy5wcm94eSh0aGlzLl9oYW5kbGVfcGFzdGUsIHRoaXMpKTtcbn07XG51dGlscy5pbmhlcml0KEN1cnNvcnMsIHV0aWxzLlBvc3RlckNsYXNzKTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgY3Vyc29yIGFuZCBtYW5hZ2VzIGl0LlxuICogQHJldHVybiB7Q3Vyc29yfSBjdXJzb3JcbiAqL1xuQ3Vyc29ycy5wcm90b3R5cGUuY3JlYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIG5ld19jdXJzb3IgPSBuZXcgY3Vyc29yLkN1cnNvcih0aGlzLl9tb2RlbCwgdGhpcy5faW5wdXRfZGlzcGF0Y2hlcik7XG4gICAgdGhpcy5jdXJzb3JzLnB1c2gobmV3X2N1cnNvcik7XG5cbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgbmV3X2N1cnNvci5vbignY2hhbmdlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoYXQudHJpZ2dlcignY2hhbmdlJywgbmV3X2N1cnNvcik7XG4gICAgICAgIHRoYXQuX3VwZGF0ZV9zZWxlY3Rpb24oKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBuZXdfY3Vyc29yO1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIHdoZW4gdGhlIHNlbGVjdGVkIHRleHQgaXMgY3V0IHRvIHRoZSBjbGlwYm9hcmQuXG4gKiBAcGFyYW0gIHtzdHJpbmd9IHRleHQgLSBieSB2YWwgdGV4dCB0aGF0IHdhcyBjdXRcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvcnMucHJvdG90eXBlLl9oYW5kbGVfY3V0ID0gZnVuY3Rpb24odGV4dCkge1xuICAgIHRoaXMuY3Vyc29ycy5mb3JFYWNoKGZ1bmN0aW9uKGN1cnNvcikge1xuICAgICAgICBjdXJzb3IuY3V0KCk7XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgd2hlbiB0ZXh0IGlzIHBhc3RlZCBpbnRvIHRoZSBkb2N1bWVudC5cbiAqIEBwYXJhbSAge3N0cmluZ30gdGV4dFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29ycy5wcm90b3R5cGUuX2hhbmRsZV9wYXN0ZSA9IGZ1bmN0aW9uKHRleHQpIHtcblxuICAgIC8vIElmIHRoZSBtb2R1bHVzIG9mIHRoZSBudW1iZXIgb2YgY3Vyc29ycyBhbmQgdGhlIG51bWJlciBvZiBwYXN0ZWQgbGluZXNcbiAgICAvLyBvZiB0ZXh0IGlzIHplcm8sIHNwbGl0IHRoZSBjdXQgbGluZXMgYW1vbmcgdGhlIGN1cnNvcnMuXG4gICAgdmFyIGxpbmVzID0gdGV4dC5zcGxpdCgnXFxuJyk7XG4gICAgaWYgKHRoaXMuY3Vyc29ycy5sZW5ndGggPiAxICYmIGxpbmVzLmxlbmd0aCA+IDEgJiYgbGluZXMubGVuZ3RoICUgdGhpcy5jdXJzb3JzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB2YXIgbGluZXNfcGVyX2N1cnNvciA9IGxpbmVzLmxlbmd0aCAvIHRoaXMuY3Vyc29ycy5sZW5ndGg7XG4gICAgICAgIHRoaXMuY3Vyc29ycy5mb3JFYWNoKGZ1bmN0aW9uKGN1cnNvciwgaW5kZXgpIHtcbiAgICAgICAgICAgIGN1cnNvci5pbnNlcnRfdGV4dChsaW5lcy5zbGljZShcbiAgICAgICAgICAgICAgICBpbmRleCAqIGxpbmVzX3Blcl9jdXJzb3IsIFxuICAgICAgICAgICAgICAgIGluZGV4ICogbGluZXNfcGVyX2N1cnNvciArIGxpbmVzX3Blcl9jdXJzb3IpLmpvaW4oJ1xcbicpKTtcbiAgICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5jdXJzb3JzLmZvckVhY2goZnVuY3Rpb24oY3Vyc29yKSB7XG4gICAgICAgICAgICBjdXJzb3IuaW5zZXJ0X3RleHQodGV4dCk7XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG5cbi8qKlxuICogVXBkYXRlIHRoZSBjbGlwcGFibGUgdGV4dCBiYXNlZCBvbiBuZXcgc2VsZWN0aW9uLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29ycy5wcm90b3R5cGUuX3VwZGF0ZV9zZWxlY3Rpb24gPSBmdW5jdGlvbigpIHtcbiAgICBcbiAgICAvLyBDb3B5IGFsbCBvZiB0aGUgc2VsZWN0ZWQgdGV4dC5cbiAgICB2YXIgc2VsZWN0aW9ucyA9IFtdO1xuICAgIHRoaXMuY3Vyc29ycy5mb3JFYWNoKGZ1bmN0aW9uKGN1cnNvcikge1xuICAgICAgICBzZWxlY3Rpb25zLnB1c2goY3Vyc29yLmNvcHkoKSk7XG4gICAgfSk7XG5cbiAgICAvLyBNYWtlIHRoZSBjb3BpZWQgdGV4dCBjbGlwcGFibGUuXG4gICAgdGhpcy5fY2xpcGJvYXJkLnNldF9jbGlwcGFibGUoc2VsZWN0aW9ucy5qb2luKCdcXG4nKSk7XG59O1xuXG4vKipcbiAqIFN0YXJ0cyBzZWxlY3RpbmcgdGV4dCBmcm9tIG1vdXNlIGNvb3JkaW5hdGVzLlxuICogQHBhcmFtICB7TW91c2VFdmVudH0gZSAtIG1vdXNlIGV2ZW50IGNvbnRhaW5pbmcgdGhlIGNvb3JkaW5hdGVzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29ycy5wcm90b3R5cGUuc3RhcnRfc2VsZWN0aW9uID0gZnVuY3Rpb24oZSkge1xuICAgIHZhciB4ID0gZS5vZmZzZXRYO1xuICAgIHZhciB5ID0gZS5vZmZzZXRZO1xuXG4gICAgdGhpcy5fc2VsZWN0aW5nX3RleHQgPSB0cnVlO1xuICAgIGlmICh0aGlzLmdldF9yb3dfY2hhcikge1xuICAgICAgICB2YXIgbG9jYXRpb24gPSB0aGlzLmdldF9yb3dfY2hhcih4LCB5KTtcbiAgICAgICAgdGhpcy5jdXJzb3JzWzBdLnNldF9wcmltYXJ5KGxvY2F0aW9uLnJvd19pbmRleCwgbG9jYXRpb24uY2hhcl9pbmRleCk7XG4gICAgICAgIHRoaXMuY3Vyc29yc1swXS5zZXRfc2Vjb25kYXJ5KGxvY2F0aW9uLnJvd19pbmRleCwgbG9jYXRpb24uY2hhcl9pbmRleCk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBGaW5hbGl6ZXMgdGhlIHNlbGVjdGlvbiBvZiB0ZXh0LlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29ycy5wcm90b3R5cGUuZW5kX3NlbGVjdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3NlbGVjdGluZ190ZXh0ID0gZmFsc2U7XG59O1xuXG4vKipcbiAqIFNldHMgdGhlIGVuZHBvaW50IG9mIHRleHQgc2VsZWN0aW9uIGZyb20gbW91c2UgY29vcmRpbmF0ZXMuXG4gKiBAcGFyYW0gIHtNb3VzZUV2ZW50fSBlIC0gbW91c2UgZXZlbnQgY29udGFpbmluZyB0aGUgY29vcmRpbmF0ZXMuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3JzLnByb3RvdHlwZS5zZXRfc2VsZWN0aW9uID0gZnVuY3Rpb24oZSkge1xuICAgIHZhciB4ID0gZS5vZmZzZXRYO1xuICAgIHZhciB5ID0gZS5vZmZzZXRZO1xuXG4gICAgaWYgKHRoaXMuX3NlbGVjdGluZ190ZXh0ICYmIHRoaXMuZ2V0X3Jvd19jaGFyKSB7XG4gICAgICAgIHZhciBsb2NhdGlvbiA9IHRoaXMuZ2V0X3Jvd19jaGFyKHgsIHkpO1xuICAgICAgICB0aGlzLmN1cnNvcnNbdGhpcy5jdXJzb3JzLmxlbmd0aC0xXS5zZXRfcHJpbWFyeShsb2NhdGlvbi5yb3dfaW5kZXgsIGxvY2F0aW9uLmNoYXJfaW5kZXgpO1xuICAgIH1cbn07XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuQ3Vyc29ycyA9IEN1cnNvcnM7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG52YXIgbm9ybWFsaXplciA9IHJlcXVpcmUoJy4vZXZlbnRzL25vcm1hbGl6ZXIuanMnKTtcbnZhciBrZXltYXAgPSByZXF1aXJlKCcuL2V2ZW50cy9tYXAuanMnKTtcbnZhciBkZWZhdWx0X2tleW1hcCA9IHJlcXVpcmUoJy4vZXZlbnRzL2RlZmF1bHQuanMnKTtcbnZhciBjdXJzb3JzID0gcmVxdWlyZSgnLi9jdXJzb3JzLmpzJyk7XG52YXIgY2xpcGJvYXJkID0gcmVxdWlyZSgnLi9jbGlwYm9hcmQuanMnKTtcblxuLyoqXG4gKiBDb250cm9sbGVyIGZvciBhIERvY3VtZW50TW9kZWwuXG4gKi9cbnZhciBEb2N1bWVudENvbnRyb2xsZXIgPSBmdW5jdGlvbihlbCwgbW9kZWwpIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMuY2xpcGJvYXJkID0gbmV3IGNsaXBib2FyZC5DbGlwYm9hcmQoZWwpO1xuICAgIHRoaXMubm9ybWFsaXplciA9IG5ldyBub3JtYWxpemVyLk5vcm1hbGl6ZXIoKTtcbiAgICB0aGlzLm5vcm1hbGl6ZXIubGlzdGVuX3RvKGVsKTtcbiAgICB0aGlzLm5vcm1hbGl6ZXIubGlzdGVuX3RvKHRoaXMuY2xpcGJvYXJkLmhpZGRlbl9pbnB1dCk7XG4gICAgdGhpcy5tYXAgPSBuZXcga2V5bWFwLk1hcCh0aGlzLm5vcm1hbGl6ZXIpO1xuICAgIHRoaXMubWFwLm1hcChkZWZhdWx0X2tleW1hcC5tYXApO1xuXG4gICAgdGhpcy5jdXJzb3JzID0gbmV3IGN1cnNvcnMuQ3Vyc29ycyhtb2RlbCwgdGhpcy5jbGlwYm9hcmQpO1xufTtcbnV0aWxzLmluaGVyaXQoRG9jdW1lbnRDb250cm9sbGVyLCB1dGlscy5Qb3N0ZXJDbGFzcyk7XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuRG9jdW1lbnRDb250cm9sbGVyID0gRG9jdW1lbnRDb250cm9sbGVyO1xuIiwidmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xuXG4vKipcbiAqIE1vZGVsIGNvbnRhaW5pbmcgYWxsIG9mIHRoZSBkb2N1bWVudCdzIGRhdGEgKHRleHQpLlxuICovXG52YXIgRG9jdW1lbnRNb2RlbCA9IGZ1bmN0aW9uKCkge1xuICAgIHV0aWxzLlBvc3RlckNsYXNzLmNhbGwodGhpcyk7XG4gICAgdGhpcy5fcm93cyA9IFtdO1xuICAgIHRoaXMuX3Jvd190YWdzID0gW107XG4gICAgdGhpcy5fdGFnX2xvY2sgPSAwO1xuICAgIHRoaXMuX2luaXRfcHJvcGVydGllcygpO1xufTtcbnV0aWxzLmluaGVyaXQoRG9jdW1lbnRNb2RlbCwgdXRpbHMuUG9zdGVyQ2xhc3MpO1xuXG4vKipcbiAvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG4qIEFjcXVpcmUgYSBsb2NrIG9uIHRhZyBldmVudHNcbiAqXG4gKiBQcmV2ZW50cyB0YWcgZXZlbnRzIGZyb20gZmlyaW5nLlxuICogQHJldHVybiB7aW50ZWdlcn0gbG9jayBjb3VudFxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS5hY3F1aXJlX3RhZ19ldmVudF9sb2NrID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3RhZ19sb2NrKys7XG59O1xuXG4vKipcbiAqIFJlbGVhc2UgYSBsb2NrIG9uIHRhZyBldmVudHNcbiAqIEByZXR1cm4ge2ludGVnZXJ9IGxvY2sgY291bnRcbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUucmVsZWFzZV90YWdfZXZlbnRfbG9jayA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3RhZ19sb2NrLS07XG4gICAgaWYgKHRoaXMuX3RhZ19sb2NrIDwgMCkgdGhpcy5fdGFnX2xvY2sgPSAwO1xuICAgIHJldHVybiB0aGlzLl90YWdfbG9jaztcbn07XG5cbi8qKlxuICogVHJpZ2dlcnMgdGhlIHRhZyBjaGFuZ2UgZXZlbnRzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUudHJpZ2dlcl90YWdfZXZlbnRzID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuX3RhZ19sb2NrID09PSAwKSB7XG4gICAgICAgIHRoaXMudHJpZ2dlcigndGFnc19jaGFuZ2VkJyk7XG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpOyAgICBcbiAgICB9XG59O1xuXG4vKipcbiAqIFNldHMgYSAndGFnJyBvbiB0aGUgdGV4dCBzcGVjaWZpZWQuXG4gKiBAcGFyYW0ge2ludGVnZXJ9IHN0YXJ0X3JvdyAtIHJvdyB0aGUgdGFnIHN0YXJ0cyBvblxuICogQHBhcmFtIHtpbnRlZ2VyfSBzdGFydF9jaGFyIC0gaW5kZXgsIGluIHRoZSByb3csIG9mIHRoZSBmaXJzdCB0YWdnZWQgY2hhcmFjdGVyXG4gKiBAcGFyYW0ge2ludGVnZXJ9IGVuZF9yb3cgLSByb3cgdGhlIHRhZyBlbmRzIG9uXG4gKiBAcGFyYW0ge2ludGVnZXJ9IGVuZF9jaGFyIC0gaW5kZXgsIGluIHRoZSByb3csIG9mIHRoZSBsYXN0IHRhZ2dlZCBjaGFyYWN0ZXJcbiAqIEBwYXJhbSB7c3RyaW5nfSB0YWdfbmFtZVxuICogQHBhcmFtIHthbnl9IHRhZ192YWx1ZSAtIG92ZXJyaWRlcyBhbnkgcHJldmlvdXMgdGFnc1xuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS5zZXRfdGFnID0gZnVuY3Rpb24oc3RhcnRfcm93LCBzdGFydF9jaGFyLCBlbmRfcm93LCBlbmRfY2hhciwgdGFnX25hbWUsIHRhZ192YWx1ZSkge1xuICAgIHZhciBjb29yZHMgPSB0aGlzLnZhbGlkYXRlX2Nvb3Jkcy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIGZvciAodmFyIHJvdyA9IGNvb3Jkcy5zdGFydF9yb3c7IHJvdyA8PSBjb29yZHMuZW5kX3Jvdzsgcm93KyspIHtcbiAgICAgICAgdmFyIHN0YXJ0ID0gY29vcmRzLnN0YXJ0X2NoYXI7XG4gICAgICAgIHZhciBlbmQgPSBjb29yZHMuZW5kX2NoYXI7XG4gICAgICAgIGlmIChyb3cgPiBjb29yZHMuc3RhcnRfcm93KSB7IHN0YXJ0ID0gLTE7IH1cbiAgICAgICAgaWYgKHJvdyA8IGNvb3Jkcy5lbmRfcm93KSB7IGVuZCA9IC0xOyB9XG5cbiAgICAgICAgLy8gUmVtb3ZlIG9yIG1vZGlmeSBjb25mbGljdGluZyB0YWdzLlxuICAgICAgICB2YXIgYWRkX3RhZ3MgPSBbXTtcbiAgICAgICAgdGhpcy5fcm93X3RhZ3Nbcm93XS5maWx0ZXIoZnVuY3Rpb24odGFnKSB7XG4gICAgICAgICAgICBpZiAodGFnLm5hbWUgPT0gdGFnX25hbWUpIHtcbiAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0YWcgaXMgd2l0aGluXG4gICAgICAgICAgICAgICAgaWYgKHN0YXJ0ID09IC0xICYmIGVuZCA9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh0YWcuc3RhcnQgPj0gc3RhcnQgJiYgKHRhZy5lbmQgPCBlbmQgfHwgZW5kID09IC0xKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRhZyBpcyBvdXRzaWRlXG4gICAgICAgICAgICAgICAgLy8gVG8gdGhlIHJpZ2h0P1xuICAgICAgICAgICAgICAgIGlmICh0YWcuc3RhcnQgPiBlbmQgJiYgZW5kICE9IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBUbyB0aGUgbGVmdD9cbiAgICAgICAgICAgICAgICBpZiAodGFnLmVuZCA8IHN0YXJ0ICYmIHRhZy5lbmQgIT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGFnIGVuY2Fwc3VsYXRlc1xuICAgICAgICAgICAgICAgIHZhciBsZWZ0X2ludGVyc2VjdGluZyA9IHRhZy5zdGFydCA8IHN0YXJ0O1xuICAgICAgICAgICAgICAgIHZhciByaWdodF9pbnRlcnNlY3RpbmcgPSBlbmQgIT0gLTEgJiYgKHRhZy5lbmQgPT0gLTEgfHwgdGFnLmVuZCA+IGVuZCk7XG5cbiAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0YWcgaXMgbGVmdCBpbnRlcnNlY3RpbmdcbiAgICAgICAgICAgICAgICBpZiAobGVmdF9pbnRlcnNlY3RpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgYWRkX3RhZ3MucHVzaCh7bmFtZTogdGFnX25hbWUsIHZhbHVlOiB0YWcudmFsdWUsIHN0YXJ0OiB0YWcuc3RhcnQsIGVuZDogc3RhcnQtMX0pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRhZyBpcyByaWdodCBpbnRlcnNlY3RpbmdcbiAgICAgICAgICAgICAgICBpZiAocmlnaHRfaW50ZXJzZWN0aW5nKSB7XG4gICAgICAgICAgICAgICAgICAgIGFkZF90YWdzLnB1c2goe25hbWU6IHRhZ19uYW1lLCB2YWx1ZTogdGFnLnZhbHVlLCBzdGFydDogZW5kKzEsIGVuZDogdGFnLmVuZH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHRhZ3MgYW5kIGNvcnJlY3RlZCB0YWdzLlxuICAgICAgICB0aGlzLl9yb3dfdGFnc1tyb3ddID0gdGhpcy5fcm93X3RhZ3Nbcm93XS5jb25jYXQoYWRkX3RhZ3MpO1xuICAgICAgICB0aGlzLl9yb3dfdGFnc1tyb3ddLnB1c2goe25hbWU6IHRhZ19uYW1lLCB2YWx1ZTogdGFnX3ZhbHVlLCBzdGFydDogc3RhcnQsIGVuZDogZW5kfSk7XG4gICAgfVxuICAgIHRoaXMudHJpZ2dlcl90YWdfZXZlbnRzKCk7XG59O1xuXG4vKipcbiAqIFJlbW92ZWQgYWxsIG9mIHRoZSB0YWdzIG9uIHRoZSBkb2N1bWVudC5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IHN0YXJ0X3Jvd1xuICogQHBhcmFtICB7aW50ZWdlcn0gZW5kX3Jvd1xuICogQHJldHVybiB7bnVsbH1cbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUuY2xlYXJfdGFncyA9IGZ1bmN0aW9uKHN0YXJ0X3JvdywgZW5kX3Jvdykge1xuICAgIHN0YXJ0X3JvdyA9IHN0YXJ0X3JvdyAhPT0gdW5kZWZpbmVkID8gc3RhcnRfcm93IDogMDtcbiAgICBlbmRfcm93ID0gZW5kX3JvdyAhPT0gdW5kZWZpbmVkID8gZW5kX3JvdyA6IHRoaXMuX3Jvd190YWdzLmxlbmd0aCAtIDE7XG4gICAgZm9yICh2YXIgaSA9IHN0YXJ0X3JvdzsgaSA8PSBlbmRfcm93OyBpKyspIHtcbiAgICAgICAgdGhpcy5fcm93X3RhZ3NbaV0gPSBbXTtcbiAgICB9XG4gICAgdGhpcy50cmlnZ2VyKCd0YWdzX2NoYW5nZWQnKTtcbiAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZWQnKTtcbn07XG5cbi8qKlxuICogR2V0IHRoZSB0YWdzIGFwcGxpZWQgdG8gYSBjaGFyYWN0ZXIuXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSByb3dfaW5kZXhcbiAqIEBwYXJhbSAge2ludGVnZXJ9IGNoYXJfaW5kZXhcbiAqIEByZXR1cm4ge2RpY3Rpb25hcnl9XG4gKi9cbkRvY3VtZW50TW9kZWwucHJvdG90eXBlLmdldF90YWdzID0gZnVuY3Rpb24ocm93X2luZGV4LCBjaGFyX2luZGV4KSB7XG4gICAgdmFyIGNvb3JkcyA9IHRoaXMudmFsaWRhdGVfY29vcmRzLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgdmFyIHRhZ3MgPSB7fTtcbiAgICB0aGlzLl9yb3dfdGFnc1tjb29yZHMuc3RhcnRfcm93XS5mb3JFYWNoKGZ1bmN0aW9uKHRhZykge1xuICAgICAgICAvLyBUYWcgc3RhcnQgb2YgLTEgbWVhbnMgdGhlIHRhZyBjb250aW51ZXMgdG8gdGhlIHByZXZpb3VzIGxpbmUuXG4gICAgICAgIHZhciBhZnRlcl9zdGFydCA9IChjb29yZHMuc3RhcnRfY2hhciA+PSB0YWcuc3RhcnQgfHwgdGFnLnN0YXJ0ID09IC0xKTtcbiAgICAgICAgLy8gVGFnIGVuZCBvZiAtMSBtZWFucyB0aGUgdGFnIGNvbnRpbnVlcyB0byB0aGUgbmV4dCBsaW5lLlxuICAgICAgICB2YXIgYmVmb3JlX2VuZCA9IChjb29yZHMuc3RhcnRfY2hhciA8PSB0YWcuZW5kIHx8IHRhZy5lbmQgPT0gLTEpO1xuICAgICAgICBpZiAoYWZ0ZXJfc3RhcnQgJiYgYmVmb3JlX2VuZCkge1xuICAgICAgICAgICAgdGFnc1t0YWcubmFtZV0gPSB0YWcudmFsdWU7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gdGFncztcbn07XG5cbi8qKlxuICogQWRkcyB0ZXh0IGVmZmljaWVudGx5IHNvbWV3aGVyZSBpbiB0aGUgZG9jdW1lbnQuXG4gKiBAcGFyYW0ge2ludGVnZXJ9IHJvd19pbmRleCAgXG4gKiBAcGFyYW0ge2ludGVnZXJ9IGNoYXJfaW5kZXggXG4gKiBAcGFyYW0ge3N0cmluZ30gdGV4dFxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS5hZGRfdGV4dCA9IGZ1bmN0aW9uKHJvd19pbmRleCwgY2hhcl9pbmRleCwgdGV4dCkge1xuICAgIHZhciBjb29yZHMgPSB0aGlzLnZhbGlkYXRlX2Nvb3Jkcy5hcHBseSh0aGlzLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDAsMikpO1xuICAgIC8vIElmIHRoZSB0ZXh0IGhhcyBhIG5ldyBsaW5lIGluIGl0LCBqdXN0IHJlLXNldFxuICAgIC8vIHRoZSByb3dzIGxpc3QuXG4gICAgaWYgKHRleHQuaW5kZXhPZignXFxuJykgIT0gLTEpIHtcbiAgICAgICAgdmFyIG5ld19yb3dzID0gW107XG4gICAgICAgIGlmIChjb29yZHMuc3RhcnRfcm93ID4gMCkge1xuICAgICAgICAgICAgbmV3X3Jvd3MgPSB0aGlzLl9yb3dzLnNsaWNlKDAsIGNvb3Jkcy5zdGFydF9yb3cpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIG9sZF9yb3cgPSB0aGlzLl9yb3dzW2Nvb3Jkcy5zdGFydF9yb3ddO1xuICAgICAgICB2YXIgb2xkX3Jvd19zdGFydCA9IG9sZF9yb3cuc3Vic3RyaW5nKDAsIGNvb3Jkcy5zdGFydF9jaGFyKTtcbiAgICAgICAgdmFyIG9sZF9yb3dfZW5kID0gb2xkX3Jvdy5zdWJzdHJpbmcoY29vcmRzLnN0YXJ0X2NoYXIpO1xuICAgICAgICB2YXIgc3BsaXRfdGV4dCA9IHRleHQuc3BsaXQoJ1xcbicpO1xuICAgICAgICBuZXdfcm93cy5wdXNoKG9sZF9yb3dfc3RhcnQgKyBzcGxpdF90ZXh0WzBdKTtcblxuICAgICAgICBpZiAoc3BsaXRfdGV4dC5sZW5ndGggPiAyKSB7XG4gICAgICAgICAgICBuZXdfcm93cyA9IG5ld19yb3dzLmNvbmNhdChzcGxpdF90ZXh0LnNsaWNlKDEsc3BsaXRfdGV4dC5sZW5ndGgtMSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgbmV3X3Jvd3MucHVzaChzcGxpdF90ZXh0W3NwbGl0X3RleHQubGVuZ3RoLTFdICsgb2xkX3Jvd19lbmQpO1xuXG4gICAgICAgIGlmIChjb29yZHMuc3RhcnRfcm93KzEgPCB0aGlzLl9yb3dzLmxlbmd0aCkge1xuICAgICAgICAgICAgbmV3X3Jvd3MgPSBuZXdfcm93cy5jb25jYXQodGhpcy5fcm93cy5zbGljZShjb29yZHMuc3RhcnRfcm93KzEpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX3Jvd3MgPSBuZXdfcm93cztcbiAgICAgICAgdGhpcy5fcmVzaXplZF9yb3dzKCk7XG5cbiAgICAvLyBUZXh0IGRvZXNuJ3QgaGF2ZSBhbnkgbmV3IGxpbmVzLCBqdXN0IG1vZGlmeSB0aGVcbiAgICAvLyBsaW5lIGFuZCB0aGVuIHRyaWdnZXIgdGhlIHJvdyBjaGFuZ2VkIGV2ZW50LlxuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBvbGRfdGV4dCA9IHRoaXMuX3Jvd3NbY29vcmRzLnN0YXJ0X3Jvd107XG4gICAgICAgIHRoaXMuX3Jvd3NbY29vcmRzLnN0YXJ0X3Jvd10gPSBvbGRfdGV4dC5zdWJzdHJpbmcoMCwgY29vcmRzLnN0YXJ0X2NoYXIpICsgdGV4dCArIG9sZF90ZXh0LnN1YnN0cmluZyhjb29yZHMuc3RhcnRfY2hhcik7XG4gICAgICAgIHRoaXMudHJpZ2dlcigncm93X2NoYW5nZWQnLCBjb29yZHMuc3RhcnRfcm93KTtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2VkJyk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBSZW1vdmVzIGEgYmxvY2sgb2YgdGV4dCBmcm9tIHRoZSBkb2N1bWVudFxuICogQHBhcmFtICB7aW50ZWdlcn0gc3RhcnRfcm93XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBzdGFydF9jaGFyXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBlbmRfcm93XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBlbmRfY2hhclxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUucmVtb3ZlX3RleHQgPSBmdW5jdGlvbihzdGFydF9yb3csIHN0YXJ0X2NoYXIsIGVuZF9yb3csIGVuZF9jaGFyKSB7XG4gICAgdmFyIGNvb3JkcyA9IHRoaXMudmFsaWRhdGVfY29vcmRzLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgaWYgKGNvb3Jkcy5zdGFydF9yb3cgPT0gY29vcmRzLmVuZF9yb3cpIHtcbiAgICAgICAgdGhpcy5fcm93c1tjb29yZHMuc3RhcnRfcm93XSA9IHRoaXMuX3Jvd3NbY29vcmRzLnN0YXJ0X3Jvd10uc3Vic3RyaW5nKDAsIGNvb3Jkcy5zdGFydF9jaGFyKSArIHRoaXMuX3Jvd3NbY29vcmRzLnN0YXJ0X3Jvd10uc3Vic3RyaW5nKGNvb3Jkcy5lbmRfY2hhcik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fcm93c1tjb29yZHMuc3RhcnRfcm93XSA9IHRoaXMuX3Jvd3NbY29vcmRzLnN0YXJ0X3Jvd10uc3Vic3RyaW5nKDAsIGNvb3Jkcy5zdGFydF9jaGFyKSArIHRoaXMuX3Jvd3NbY29vcmRzLmVuZF9yb3ddLnN1YnN0cmluZyhjb29yZHMuZW5kX2NoYXIpO1xuICAgIH1cblxuICAgIGlmIChjb29yZHMuZW5kX3JvdyAtIGNvb3Jkcy5zdGFydF9yb3cgPiAwKSB7XG4gICAgICAgIHRoaXMuX3Jvd3Muc3BsaWNlKGNvb3Jkcy5zdGFydF9yb3cgKyAxLCBjb29yZHMuZW5kX3JvdyAtIGNvb3Jkcy5zdGFydF9yb3cpO1xuICAgICAgICB0aGlzLl9yZXNpemVkX3Jvd3MoKTtcbiAgICB9IGVsc2UgaWYgKGNvb3Jkcy5lbmRfcm93ID09IGNvb3Jkcy5zdGFydF9yb3cpIHtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdyb3dfY2hhbmdlZCcsIGNvb3Jkcy5zdGFydF9yb3cpO1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZWQnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ3Jvd19jaGFuZ2VkJywgY29vcmRzLnN0YXJ0X3Jvdyk7XG4gICAgICAgIHRoaXMudHJpZ2dlcigncm93X2NoYW5nZWQnLCBjb29yZHMuZW5kX3Jvdyk7XG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpO1xuICAgIH1cbn07XG5cbi8qKlxuICogUmVtb3ZlIGEgcm93IGZyb20gdGhlIGRvY3VtZW50LlxuICogQHBhcmFtICB7aW50ZWdlcn0gcm93X2luZGV4XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS5yZW1vdmVfcm93ID0gZnVuY3Rpb24ocm93X2luZGV4KSB7XG4gICAgaWYgKDAgPCByb3dfaW5kZXggJiYgcm93X2luZGV4IDwgdGhpcy5fcm93cy5sZW5ndGgpIHtcbiAgICAgICAgdGhpcy5fcm93cy5zcGxpY2Uocm93X2luZGV4LCAxKTtcbiAgICAgICAgdGhpcy5fcmVzaXplZF9yb3dzKCk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBHZXRzIGEgY2h1bmsgb2YgdGV4dC5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IHN0YXJ0X3Jvd1xuICogQHBhcmFtICB7aW50ZWdlcn0gc3RhcnRfY2hhclxuICogQHBhcmFtICB7aW50ZWdlcn0gZW5kX3Jvd1xuICogQHBhcmFtICB7aW50ZWdlcn0gZW5kX2NoYXJcbiAqIEByZXR1cm4ge3N0cmluZ31cbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUuZ2V0X3RleHQgPSBmdW5jdGlvbihzdGFydF9yb3csIHN0YXJ0X2NoYXIsIGVuZF9yb3csIGVuZF9jaGFyKSB7XG4gICAgdmFyIGNvb3JkcyA9IHRoaXMudmFsaWRhdGVfY29vcmRzLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgaWYgKGNvb3Jkcy5zdGFydF9yb3c9PWNvb3Jkcy5lbmRfcm93KSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9yb3dzW2Nvb3Jkcy5zdGFydF9yb3ddLnN1YnN0cmluZyhjb29yZHMuc3RhcnRfY2hhciwgY29vcmRzLmVuZF9jaGFyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgdGV4dCA9IFtdO1xuICAgICAgICB0ZXh0LnB1c2godGhpcy5fcm93c1tjb29yZHMuc3RhcnRfcm93XS5zdWJzdHJpbmcoY29vcmRzLnN0YXJ0X2NoYXIpKTtcbiAgICAgICAgaWYgKGNvb3Jkcy5lbmRfcm93IC0gY29vcmRzLnN0YXJ0X3JvdyA+IDEpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSBjb29yZHMuc3RhcnRfcm93ICsgMTsgaSA8IGNvb3Jkcy5lbmRfcm93OyBpKyspIHtcbiAgICAgICAgICAgICAgICB0ZXh0LnB1c2godGhpcy5fcm93c1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGV4dC5wdXNoKHRoaXMuX3Jvd3NbY29vcmRzLmVuZF9yb3ddLnN1YnN0cmluZygwLCBjb29yZHMuZW5kX2NoYXIpKTtcbiAgICAgICAgcmV0dXJuIHRleHQuam9pbignXFxuJyk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBBZGQgYSByb3cgdG8gdGhlIGRvY3VtZW50XG4gKiBAcGFyYW0ge2ludGVnZXJ9IHJvd19pbmRleFxuICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBuZXcgcm93J3MgdGV4dFxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS5hZGRfcm93ID0gZnVuY3Rpb24ocm93X2luZGV4LCB0ZXh0KSB7XG4gICAgdmFyIG5ld19yb3dzID0gW107XG4gICAgaWYgKHJvd19pbmRleCA+IDApIHtcbiAgICAgICAgbmV3X3Jvd3MgPSB0aGlzLl9yb3dzLnNsaWNlKDAsIHJvd19pbmRleCk7XG4gICAgfVxuICAgIG5ld19yb3dzLnB1c2godGV4dCk7XG4gICAgaWYgKHJvd19pbmRleCA8IHRoaXMuX3Jvd3MubGVuZ3RoKSB7XG4gICAgICAgIG5ld19yb3dzID0gbmV3X3Jvd3MuY29uY2F0KHRoaXMuX3Jvd3Muc2xpY2Uocm93X2luZGV4KSk7XG4gICAgfVxuXG4gICAgdGhpcy5fcm93cyA9IG5ld19yb3dzO1xuICAgIHRoaXMuX3Jlc2l6ZWRfcm93cygpO1xufTtcblxuLyoqXG4gKiBWYWxpZGF0ZXMgcm93LCBjaGFyYWN0ZXIgY29vcmRpbmF0ZXMgaW4gdGhlIGRvY3VtZW50LlxuICogQHBhcmFtICB7aW50ZWdlcn0gc3RhcnRfcm93XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBzdGFydF9jaGFyXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSAob3B0aW9uYWwpIGVuZF9yb3dcbiAqIEBwYXJhbSAge2ludGVnZXJ9IChvcHRpb25hbCkgZW5kX2NoYXJcbiAqIEByZXR1cm4ge2RpY3Rpb25hcnl9IGRpY3Rpb25hcnkgY29udGFpbmluZyB2YWxpZGF0ZWQgY29vcmRpbmF0ZXMge3N0YXJ0X3JvdywgXG4gKiAgICAgICAgICAgICAgICAgICAgICBzdGFydF9jaGFyLCBlbmRfcm93LCBlbmRfY2hhcn1cbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUudmFsaWRhdGVfY29vcmRzID0gZnVuY3Rpb24oc3RhcnRfcm93LCBzdGFydF9jaGFyLCBlbmRfcm93LCBlbmRfY2hhcikge1xuXG4gICAgLy8gTWFrZSBzdXJlIHRoZSB2YWx1ZXMgYXJlbid0IHVuZGVmaW5lZC5cbiAgICBpZiAoc3RhcnRfcm93ID09PSB1bmRlZmluZWQpIHN0YXJ0X3JvdyA9IDA7XG4gICAgaWYgKHN0YXJ0X2NoYXIgPT09IHVuZGVmaW5lZCkgc3RhcnRfY2hhciA9IDA7XG4gICAgaWYgKGVuZF9yb3cgPT09IHVuZGVmaW5lZCkgZW5kX3JvdyA9IHN0YXJ0X3JvdztcbiAgICBpZiAoZW5kX2NoYXIgPT09IHVuZGVmaW5lZCkgZW5kX2NoYXIgPSBzdGFydF9jaGFyO1xuXG4gICAgLy8gTWFrZSBzdXJlIHRoZSB2YWx1ZXMgYXJlIHdpdGhpbiB0aGUgYm91bmRzIG9mIHRoZSBjb250ZW50cy5cbiAgICBpZiAodGhpcy5fcm93cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgc3RhcnRfcm93ID0gMDtcbiAgICAgICAgc3RhcnRfY2hhciA9IDA7XG4gICAgICAgIGVuZF9yb3cgPSAwO1xuICAgICAgICBlbmRfY2hhciA9IDA7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHN0YXJ0X3JvdyA+PSB0aGlzLl9yb3dzLmxlbmd0aCkgc3RhcnRfcm93ID0gdGhpcy5fcm93cy5sZW5ndGggLSAxO1xuICAgICAgICBpZiAoc3RhcnRfcm93IDwgMCkgc3RhcnRfcm93ID0gMDtcbiAgICAgICAgaWYgKGVuZF9yb3cgPj0gdGhpcy5fcm93cy5sZW5ndGgpIGVuZF9yb3cgPSB0aGlzLl9yb3dzLmxlbmd0aCAtIDE7XG4gICAgICAgIGlmIChlbmRfcm93IDwgMCkgZW5kX3JvdyA9IDA7XG5cbiAgICAgICAgaWYgKHN0YXJ0X2NoYXIgPiB0aGlzLl9yb3dzW3N0YXJ0X3Jvd10ubGVuZ3RoKSBzdGFydF9jaGFyID0gdGhpcy5fcm93c1tzdGFydF9yb3ddLmxlbmd0aDtcbiAgICAgICAgaWYgKHN0YXJ0X2NoYXIgPCAwKSBzdGFydF9jaGFyID0gMDtcbiAgICAgICAgaWYgKGVuZF9jaGFyID4gdGhpcy5fcm93c1tlbmRfcm93XS5sZW5ndGgpIGVuZF9jaGFyID0gdGhpcy5fcm93c1tlbmRfcm93XS5sZW5ndGg7XG4gICAgICAgIGlmIChlbmRfY2hhciA8IDApIGVuZF9jaGFyID0gMDtcbiAgICB9XG5cbiAgICAvLyBNYWtlIHN1cmUgdGhlIHN0YXJ0IGlzIGJlZm9yZSB0aGUgZW5kLlxuICAgIGlmIChzdGFydF9yb3cgPiBlbmRfcm93IHx8IChzdGFydF9yb3cgPT0gZW5kX3JvdyAmJiBzdGFydF9jaGFyID4gZW5kX2NoYXIpKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdGFydF9yb3c6IGVuZF9yb3csXG4gICAgICAgICAgICBzdGFydF9jaGFyOiBlbmRfY2hhcixcbiAgICAgICAgICAgIGVuZF9yb3c6IHN0YXJ0X3JvdyxcbiAgICAgICAgICAgIGVuZF9jaGFyOiBzdGFydF9jaGFyLFxuICAgICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdGFydF9yb3c6IHN0YXJ0X3JvdyxcbiAgICAgICAgICAgIHN0YXJ0X2NoYXI6IHN0YXJ0X2NoYXIsXG4gICAgICAgICAgICBlbmRfcm93OiBlbmRfcm93LFxuICAgICAgICAgICAgZW5kX2NoYXI6IGVuZF9jaGFyLFxuICAgICAgICB9O1xuICAgIH1cbn07XG5cbi8qKlxuICogR2V0cyB0aGUgdGV4dCBvZiB0aGUgZG9jdW1lbnQuXG4gKiBAcmV0dXJuIHtzdHJpbmd9XG4gKi9cbkRvY3VtZW50TW9kZWwucHJvdG90eXBlLl9nZXRfdGV4dCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9yb3dzLmpvaW4oJ1xcbicpO1xufTtcblxuLyoqXG4gKiBTZXRzIHRoZSB0ZXh0IG9mIHRoZSBkb2N1bWVudC5cbiAqIENvbXBsZXhpdHkgTyhOKSBmb3IgTiByb3dzXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWVcbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUuX3NldF90ZXh0ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICB0aGlzLl9yb3dzID0gdmFsdWUuc3BsaXQoJ1xcbicpO1xuICAgIHRoaXMuX3Jlc2l6ZWRfcm93cygpO1xufTtcblxuLyoqXG4gKiBVcGRhdGVzIF9yb3cncyBwYXJ0bmVyIGFycmF5cy5cbiAqIEByZXR1cm4ge251bGx9IFxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS5fcmVzaXplZF9yb3dzID0gZnVuY3Rpb24oKSB7XG5cbiAgICAvLyBNYWtlIHN1cmUgdGhlcmUgYXJlIGFzIG1hbnkgdGFnIHJvd3MgYXMgdGhlcmUgYXJlIHRleHQgcm93cy5cbiAgICB3aGlsZSAodGhpcy5fcm93X3RhZ3MubGVuZ3RoIDwgdGhpcy5fcm93cy5sZW5ndGgpIHtcbiAgICAgICAgdGhpcy5fcm93X3RhZ3MucHVzaChbXSk7XG4gICAgfVxuICAgIGlmICh0aGlzLl9yb3dfdGFncy5sZW5ndGggPiB0aGlzLl9yb3dzLmxlbmd0aCkge1xuICAgICAgICB0aGlzLl9yb3dfdGFncy5zcGxpY2UodGhpcy5fcm93cy5sZW5ndGgsIHRoaXMuX3Jvd190YWdzLmxlbmd0aCAtIHRoaXMuX3Jvd3MubGVuZ3RoKTtcbiAgICB9XG5cbiAgICAvLyBUcmlnZ2VyIGV2ZW50c1xuICAgIHRoaXMudHJpZ2dlcigndGV4dF9jaGFuZ2VkJyk7XG4gICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2VkJyk7XG59O1xuXG4vKipcbiAqIENyZWF0ZSB0aGUgZG9jdW1lbnQncyBwcm9wZXJ0aWVzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUuX2luaXRfcHJvcGVydGllcyA9IGZ1bmN0aW9uKCkgeyAgICBcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdGhpcy5wcm9wZXJ0eSgncm93cycsIGZ1bmN0aW9uKCkgeyBcbiAgICAgICAgLy8gUmV0dXJuIGEgc2hhbGxvdyBjb3B5IG9mIHRoZSBhcnJheSBzbyBpdCBjYW5ub3QgYmUgbW9kaWZpZWQuXG4gICAgICAgIHJldHVybiBbXS5jb25jYXQodGhhdC5fcm93cyk7IFxuICAgIH0pO1xuICAgIHRoaXMucHJvcGVydHkoJ3RleHQnLCBcbiAgICAgICAgdXRpbHMucHJveHkodGhpcy5fZ2V0X3RleHQsIHRoaXMpLCBcbiAgICAgICAgdXRpbHMucHJveHkodGhpcy5fc2V0X3RleHQsIHRoaXMpKTtcbn07XG5cbmV4cG9ydHMuRG9jdW1lbnRNb2RlbCA9IERvY3VtZW50TW9kZWw7IiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xuXG4vLyBSZW5kZXJlcnNcbnZhciBiYXRjaCA9IHJlcXVpcmUoJy4vcmVuZGVyZXJzL2JhdGNoLmpzJyk7XG52YXIgaGlnaGxpZ2h0ZWRfcm93ID0gcmVxdWlyZSgnLi9yZW5kZXJlcnMvaGlnaGxpZ2h0ZWRfcm93LmpzJyk7XG52YXIgY3Vyc29ycyA9IHJlcXVpcmUoJy4vcmVuZGVyZXJzL2N1cnNvcnMuanMnKTtcbnZhciBjb2xvciA9IHJlcXVpcmUoJy4vcmVuZGVyZXJzL2NvbG9yLmpzJyk7XG52YXIgdGVzdF9oaWdobGlnaHRlciA9IHJlcXVpcmUoJy4vaGlnaGxpZ2h0ZXJzL3Rlc3QuanMnKTtcblxuLyoqXG4gKiBWaXN1YWwgcmVwcmVzZW50YXRpb24gb2YgYSBEb2N1bWVudE1vZGVsIGluc3RhbmNlXG4gKiBAcGFyYW0ge0NhbnZhc30gY2FudmFzIGluc3RhbmNlXG4gKiBAcGFyYW0ge0RvY3VtZW50TW9kZWx9IG1vZGVsIGluc3RhbmNlXG4gKiBAcGFyYW0ge0N1cnNvcnN9IGN1cnNvcnNfbW9kZWwgaW5zdGFuY2VcbiAqIEBwYXJhbSB7ZGljdGlvbmFyeX0gc3R5bGUgLSBkZXNjcmliZXMgcmVuZGVyaW5nIHN0eWxlXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBoYXNfZm9jdXMgLSBmdW5jdGlvbiB0aGF0IGNoZWNrcyBpZiB0aGUgdGV4dCBhcmVhIGhhcyBmb2N1c1xuICovXG52YXIgRG9jdW1lbnRWaWV3ID0gZnVuY3Rpb24oY2FudmFzLCBtb2RlbCwgY3Vyc29yc19tb2RlbCwgc3R5bGUsIGhhc19mb2N1cykge1xuICAgIHRoaXMuX21vZGVsID0gbW9kZWw7XG5cbiAgICAvLyBDcmVhdGUgY2hpbGQgcmVuZGVyZXJzLlxuICAgIHZhciByb3dfcmVuZGVyZXIgPSBuZXcgaGlnaGxpZ2h0ZWRfcm93LkhpZ2hsaWdodGVkUm93UmVuZGVyZXIobW9kZWwsIGNhbnZhcywgc3R5bGUpO1xuICAgIHZhciBjdXJzb3JzX3JlbmRlcmVyID0gbmV3IGN1cnNvcnMuQ3Vyc29yc1JlbmRlcmVyKFxuICAgICAgICBjdXJzb3JzX21vZGVsLCBcbiAgICAgICAgc3R5bGUsIFxuICAgICAgICByb3dfcmVuZGVyZXIsXG4gICAgICAgIGhhc19mb2N1cyk7XG4gICAgdmFyIGNvbG9yX3JlbmRlcmVyID0gbmV3IGNvbG9yLkNvbG9yUmVuZGVyZXIoKTtcbiAgICBjb2xvcl9yZW5kZXJlci5jb2xvciA9IHN0eWxlID8gc3R5bGUuYmFja2dyb3VuZCA6ICd3aGl0ZSc7XG5cbiAgICAvLyBDcmVhdGUgdGhlIGRvY3VtZW50IGhpZ2hsaWdodGVyLCB3aGljaCBuZWVkcyB0byBrbm93IGFib3V0IHRoZSBjdXJyZW50bHlcbiAgICAvLyByZW5kZXJlZCByb3dzIGluIG9yZGVyIHRvIGtub3cgd2hlcmUgdG8gaGlnaGxpZ2h0LlxuICAgIHRoaXMuaGlnaGxpZ2h0ZXIgPSBuZXcgdGVzdF9oaWdobGlnaHRlci5UZXN0SGlnaGxpZ2h0ZXIobW9kZWwsIHJvd19yZW5kZXJlcik7XG5cbiAgICAvLyBQYXNzIGdldF9yb3dfY2hhciBpbnRvIGN1cnNvcnMuXG4gICAgY3Vyc29yc19tb2RlbC5nZXRfcm93X2NoYXIgPSB1dGlscy5wcm94eShyb3dfcmVuZGVyZXIuZ2V0X3Jvd19jaGFyLCByb3dfcmVuZGVyZXIpO1xuXG4gICAgLy8gQ2FsbCBiYXNlIGNvbnN0cnVjdG9yLlxuICAgIGJhdGNoLkJhdGNoUmVuZGVyZXIuY2FsbCh0aGlzLCBbXG4gICAgICAgIGNvbG9yX3JlbmRlcmVyLFxuICAgICAgICByb3dfcmVuZGVyZXIsXG4gICAgICAgIGN1cnNvcnNfcmVuZGVyZXIsXG4gICAgXSwgY2FudmFzKTtcblxuICAgIC8vIEhvb2t1cCByZW5kZXIgZXZlbnRzLlxuICAgIHRoaXMuX2NhbnZhcy5vbigncmVkcmF3JywgdXRpbHMucHJveHkodGhpcy5yZW5kZXIsIHRoaXMpKTtcbiAgICB0aGlzLl9tb2RlbC5vbignY2hhbmdlZCcsIHV0aWxzLnByb3h5KGNhbnZhcy5yZWRyYXcsIGNhbnZhcykpO1xuXG4gICAgLy8gQ3JlYXRlIHByb3BlcnRpZXNcbiAgICB0aGlzLnByb3BlcnR5KCdzdHlsZScsIGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiByb3dfcmVuZGVyZXIuc3R5bGU7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgcm93X3JlbmRlcmVyLnN0eWxlID0gdmFsdWU7XG4gICAgICAgIGN1cnNvcnNfcmVuZGVyZXIuc3R5bGUgPSB2YWx1ZTtcbiAgICAgICAgY29sb3JfcmVuZGVyZXIuY29sb3IgPSB2YWx1ZS5iYWNrZ3JvdW5kO1xuICAgIH0pO1xufTtcbnV0aWxzLmluaGVyaXQoRG9jdW1lbnRWaWV3LCBiYXRjaC5CYXRjaFJlbmRlcmVyKTtcblxuZXhwb3J0cy5Eb2N1bWVudFZpZXcgPSBEb2N1bWVudFZpZXc7IiwiLy8gT1NYIGJpbmRpbmdzXG5pZiAobmF2aWdhdG9yLmFwcFZlcnNpb24uaW5kZXhPZihcIk1hY1wiKSAhPSAtMSkge1xuICAgIGV4cG9ydHMubWFwID0ge1xuICAgICAgICAnYWx0LWxlZnRhcnJvdycgOiAnY3Vyc29yLndvcmRfbGVmdCcsXG4gICAgICAgICdhbHQtcmlnaHRhcnJvdycgOiAnY3Vyc29yLndvcmRfcmlnaHQnLFxuICAgICAgICAnc2hpZnQtYWx0LWxlZnRhcnJvdycgOiAnY3Vyc29yLnNlbGVjdF93b3JkX2xlZnQnLFxuICAgICAgICAnc2hpZnQtYWx0LXJpZ2h0YXJyb3cnIDogJ2N1cnNvci5zZWxlY3Rfd29yZF9yaWdodCcsXG4gICAgICAgICdtZXRhLWxlZnRhcnJvdycgOiAnY3Vyc29yLmxpbmVfc3RhcnQnLFxuICAgICAgICAnbWV0YS1yaWdodGFycm93JyA6ICdjdXJzb3IubGluZV9lbmQnLFxuICAgICAgICAnc2hpZnQtbWV0YS1sZWZ0YXJyb3cnIDogJ2N1cnNvci5zZWxlY3RfbGluZV9zdGFydCcsXG4gICAgICAgICdzaGlmdC1tZXRhLXJpZ2h0YXJyb3cnIDogJ2N1cnNvci5zZWxlY3RfbGluZV9lbmQnLFxuICAgICAgICAnbWV0YS1hJyA6ICdjdXJzb3Iuc2VsZWN0X2FsbCcsXG4gICAgfTtcblxuLy8gTm9uIE9TWCBiaW5kaW5nc1xufSBlbHNlIHtcbiAgICBleHBvcnRzLm1hcCA9IHtcbiAgICAgICAgJ2N0cmwtbGVmdGFycm93JyA6ICdjdXJzb3Iud29yZF9sZWZ0JyxcbiAgICAgICAgJ2N0cmwtcmlnaHRhcnJvdycgOiAnY3Vyc29yLndvcmRfcmlnaHQnLFxuICAgICAgICAnc2hpZnQtY3RybC1sZWZ0YXJyb3cnIDogJ2N1cnNvci5zZWxlY3Rfd29yZF9sZWZ0JyxcbiAgICAgICAgJ3NoaWZ0LWN0cmwtcmlnaHRhcnJvdycgOiAnY3Vyc29yLnNlbGVjdF93b3JkX3JpZ2h0JyxcbiAgICAgICAgJ2hvbWUnIDogJ2N1cnNvci5saW5lX3N0YXJ0JyxcbiAgICAgICAgJ2VuZCcgOiAnY3Vyc29yLmxpbmVfZW5kJyxcbiAgICAgICAgJ3NoaWZ0LWhvbWUnIDogJ2N1cnNvci5zZWxlY3RfbGluZV9zdGFydCcsXG4gICAgICAgICdzaGlmdC1lbmQnIDogJ2N1cnNvci5zZWxlY3RfbGluZV9lbmQnLFxuICAgICAgICAnY3RybC1hJyA6ICdjdXJzb3Iuc2VsZWN0X2FsbCcsXG4gICAgfTtcblxufVxuXG4vLyBDb21tb24gYmluZGluZ3NcbmV4cG9ydHMubWFwWydrZXlwcmVzcyddID0gJ2N1cnNvci5rZXlwcmVzcyc7XG5leHBvcnRzLm1hcFsnZW50ZXInXSA9ICdjdXJzb3IubmV3bGluZSc7XG5leHBvcnRzLm1hcFsnZGVsZXRlJ10gPSAnY3Vyc29yLmRlbGV0ZV9mb3J3YXJkJztcbmV4cG9ydHMubWFwWydiYWNrc3BhY2UnXSA9ICdjdXJzb3IuZGVsZXRlX2JhY2t3YXJkJztcbmV4cG9ydHMubWFwWydsZWZ0YXJyb3cnXSA9ICdjdXJzb3IubGVmdCc7XG5leHBvcnRzLm1hcFsncmlnaHRhcnJvdyddID0gJ2N1cnNvci5yaWdodCc7XG5leHBvcnRzLm1hcFsndXBhcnJvdyddID0gJ2N1cnNvci51cCc7XG5leHBvcnRzLm1hcFsnZG93bmFycm93J10gPSAnY3Vyc29yLmRvd24nO1xuZXhwb3J0cy5tYXBbJ3NoaWZ0LWxlZnRhcnJvdyddID0gJ2N1cnNvci5zZWxlY3RfbGVmdCc7XG5leHBvcnRzLm1hcFsnc2hpZnQtcmlnaHRhcnJvdyddID0gJ2N1cnNvci5zZWxlY3RfcmlnaHQnO1xuZXhwb3J0cy5tYXBbJ3NoaWZ0LXVwYXJyb3cnXSA9ICdjdXJzb3Iuc2VsZWN0X3VwJztcbmV4cG9ydHMubWFwWydzaGlmdC1kb3duYXJyb3cnXSA9ICdjdXJzb3Iuc2VsZWN0X2Rvd24nO1xuZXhwb3J0cy5tYXBbJ21vdXNlMC1kb3duJ10gPSAnY3Vyc29ycy5zdGFydF9zZWxlY3Rpb24nO1xuZXhwb3J0cy5tYXBbJ21vdXNlLW1vdmUnXSA9ICdjdXJzb3JzLnNldF9zZWxlY3Rpb24nO1xuZXhwb3J0cy5tYXBbJ21vdXNlMC11cCddID0gJ2N1cnNvcnMuZW5kX3NlbGVjdGlvbic7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMuanMnKTtcblxuLyoqXG4gKiBFdmVudCBub3JtYWxpemVyXG4gKlxuICogTGlzdGVucyB0byBET00gZXZlbnRzIGFuZCBlbWl0cyAnY2xlYW5lZCcgdmVyc2lvbnMgb2YgdGhvc2UgZXZlbnRzLlxuICovXG52YXIgTWFwID0gZnVuY3Rpb24obm9ybWFsaXplcikge1xuICAgIHV0aWxzLlBvc3RlckNsYXNzLmNhbGwodGhpcyk7XG4gICAgdGhpcy5fbWFwID0ge307XG5cbiAgICAvLyBDcmVhdGUgbm9ybWFsaXplciBwcm9wZXJ0eVxuICAgIHRoaXMuX25vcm1hbGl6ZXIgPSBudWxsO1xuICAgIHRoaXMuX3Byb3h5X2hhbmRsZV9ldmVudCA9IHV0aWxzLnByb3h5KHRoaXMuX2hhbmRsZV9ldmVudCwgdGhpcyk7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMucHJvcGVydHkoJ25vcm1hbGl6ZXInLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoYXQuX25vcm1hbGl6ZXI7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgLy8gUmVtb3ZlIGV2ZW50IGhhbmRsZXIuXG4gICAgICAgIGlmICh0aGF0Ll9ub3JtYWxpemVyKSB0aGF0Ll9ub3JtYWxpemVyLm9mZl9hbGwodGhhdC5fcHJveHlfaGFuZGxlX2V2ZW50KTtcbiAgICAgICAgLy8gU2V0LCBhbmQgYWRkIGV2ZW50IGhhbmRsZXIuXG4gICAgICAgIHRoYXQuX25vcm1hbGl6ZXIgPSB2YWx1ZTtcbiAgICAgICAgaWYgKHZhbHVlKSB2YWx1ZS5vbl9hbGwodGhhdC5fcHJveHlfaGFuZGxlX2V2ZW50KTtcbiAgICB9KTtcblxuICAgIC8vIElmIGRlZmluZWQsIHNldCB0aGUgbm9ybWFsaXplci5cbiAgICBpZiAobm9ybWFsaXplcikgdGhpcy5ub3JtYWxpemVyID0gbm9ybWFsaXplcjtcbn07XG51dGlscy5pbmhlcml0KE1hcCwgdXRpbHMuUG9zdGVyQ2xhc3MpO1xuXG4vKipcbiAqIE1hcCBvZiBBUEkgbWV0aG9kcyBieSBuYW1lLlxuICogQHR5cGUge2RpY3Rpb25hcnl9XG4gKi9cbk1hcC5yZWdpc3RyeSA9IHt9O1xuTWFwLl9yZWdpc3RyeV90YWdzID0ge307XG5cbi8qKlxuICogUmVnaXN0ZXJzIGFuIGFjdGlvbi5cbiAqIEBwYXJhbSAge3N0cmluZ30gbmFtZSAtIG5hbWUgb2YgdGhlIGFjdGlvblxuICogQHBhcmFtICB7ZnVuY3Rpb259IGZcbiAqIEBwYXJhbSAge09iamVjdH0gKG9wdGlvbmFsKSB0YWcgLSBhbGxvd3MgeW91IHRvIHNwZWNpZnkgYSB0YWdcbiAqICAgICAgICAgICAgICAgICAgd2hpY2ggY2FuIGJlIHVzZWQgd2l0aCB0aGUgYHVucmVnaXN0ZXJfYnlfdGFnYFxuICogICAgICAgICAgICAgICAgICBtZXRob2QgdG8gcXVpY2tseSB1bnJlZ2lzdGVyIGFjdGlvbnMgd2l0aFxuICogICAgICAgICAgICAgICAgICB0aGUgdGFnIHNwZWNpZmllZC5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbk1hcC5yZWdpc3RlciA9IGZ1bmN0aW9uKG5hbWUsIGYsIHRhZykge1xuICAgIGlmICh1dGlscy5pc19hcnJheShNYXAucmVnaXN0cnlbbmFtZV0pKSB7XG4gICAgICAgIE1hcC5yZWdpc3RyeVtuYW1lXS5wdXNoKGYpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChNYXAucmVnaXN0cnlbbmFtZV09PT11bmRlZmluZWQpIHtcbiAgICAgICAgICAgIE1hcC5yZWdpc3RyeVtuYW1lXSA9IGY7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBNYXAucmVnaXN0cnlbbmFtZV0gPSBbTWFwLnJlZ2lzdHJ5W25hbWVdLCBmXTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0YWcpIHtcbiAgICAgICAgaWYgKE1hcC5fcmVnaXN0cnlfdGFnc1t0YWddID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIE1hcC5fcmVnaXN0cnlfdGFnc1t0YWddID0gW107XG4gICAgICAgIH1cbiAgICAgICAgTWFwLl9yZWdpc3RyeV90YWdzW3RhZ10ucHVzaCh7bmFtZTogbmFtZSwgZjogZn0pO1xuICAgIH1cbn07XG5cbi8qKlxuICogVW5yZWdpc3RlciBhbiBhY3Rpb24uXG4gKiBAcGFyYW0gIHtzdHJpbmd9IG5hbWUgLSBuYW1lIG9mIHRoZSBhY3Rpb25cbiAqIEBwYXJhbSAge2Z1bmN0aW9ufSBmXG4gKiBAcmV0dXJuIHtib29sZWFufSB0cnVlIGlmIGFjdGlvbiB3YXMgZm91bmQgYW5kIHVucmVnaXN0ZXJlZFxuICovXG5NYXAudW5yZWdpc3RlciA9IGZ1bmN0aW9uKG5hbWUsIGYpIHtcbiAgICBpZiAodXRpbHMuaXNfYXJyYXkoTWFwLnJlZ2lzdHJ5W25hbWVdKSkge1xuICAgICAgICB2YXIgaW5kZXggPSBNYXAucmVnaXN0cnlbbmFtZV0uaW5kZXhPZihmKTtcbiAgICAgICAgaWYgKGluZGV4ICE9IC0xKSB7XG4gICAgICAgICAgICBNYXAucmVnaXN0cnlbbmFtZV0uc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChNYXAucmVnaXN0cnlbbmFtZV0gPT0gZikge1xuICAgICAgICBkZWxldGUgTWFwLnJlZ2lzdHJ5W25hbWVdO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufTtcblxuLyoqXG4gKiBVbnJlZ2lzdGVycyBhbGwgb2YgdGhlIGFjdGlvbnMgcmVnaXN0ZXJlZCB3aXRoIGEgZ2l2ZW4gdGFnLlxuICogQHBhcmFtICB7T2JqZWN0fSB0YWcgLSBzcGVjaWZpZWQgaW4gTWFwLnJlZ2lzdGVyLlxuICogQHJldHVybiB7Ym9vbGVhbn0gdHJ1ZSBpZiB0aGUgdGFnIHdhcyBmb3VuZCBhbmQgZGVsZXRlZC5cbiAqL1xuTWFwLnVucmVnaXN0ZXJfYnlfdGFnID0gZnVuY3Rpb24odGFnKSB7XG4gICAgaWYgKE1hcC5fcmVnaXN0cnlfdGFnc1t0YWddKSB7XG4gICAgICAgIE1hcC5fcmVnaXN0cnlfdGFnc1t0YWddLmZvckVhY2goZnVuY3Rpb24ocmVnaXN0cmF0aW9uKSB7XG4gICAgICAgICAgICBNYXAudW5yZWdpc3RlcihyZWdpc3RyYXRpb24ubmFtZSwgcmVnaXN0cmF0aW9uLmYpO1xuICAgICAgICB9KTtcbiAgICAgICAgZGVsZXRlIE1hcC5fcmVnaXN0cnlfdGFnc1t0YWddO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEFwcGVuZCBldmVudCBhY3Rpb25zIHRvIHRoZSBtYXAuXG4gKlxuICogVGhpcyBtZXRob2QgaGFzIHR3byBzaWduYXR1cmVzLiAgSWYgYSBzaW5nbGUgYXJndW1lbnRcbiAqIGlzIHBhc3NlZCB0byBpdCwgdGhhdCBhcmd1bWVudCBpcyB0cmVhdGVkIGxpa2UgYVxuICogZGljdGlvbmFyeS4gIElmIG1vcmUgdGhhbiBvbmUgYXJndW1lbnQgaXMgcGFzc2VkIHRvIGl0LFxuICogZWFjaCBhcmd1bWVudCBpcyB0cmVhdGVkIGFzIGFsdGVybmF0aW5nIGtleSwgdmFsdWVcbiAqIHBhaXJzIG9mIGEgZGljdGlvbmFyeS5cbiAqXG4gKiBUaGUgbWFwIGFsbG93cyB5b3UgdG8gcmVnaXN0ZXIgYWN0aW9ucyBmb3Iga2V5cy5cbiAqIEV4YW1wbGU6XG4gKiAgICAgbWFwLmFwcGVuZF9tYXAoe1xuICogICAgICAgICAnY3RybC1hJzogJ2N1cnNvcnMuc2VsZWN0X2FsbCcsXG4gKiAgICAgfSlcbiAqXG4gKiBNdWx0aXBsZSBhY3Rpb25zIGNhbiBiZSByZWdpc3RlcmVkIGZvciBhIHNpbmdsZSBldmVudC5cbiAqIFRoZSBhY3Rpb25zIGFyZSBleGVjdXRlZCBzZXF1ZW50aWFsbHksIHVudGlsIG9uZSBhY3Rpb25cbiAqIHJldHVybnMgYHRydWVgIGluIHdoaWNoIGNhc2UgdGhlIGV4ZWN1dGlvbiBoYXVsdHMuICBUaGlzXG4gKiBhbGxvd3MgYWN0aW9ucyB0byBydW4gY29uZGl0aW9uYWxseS5cbiAqIEV4YW1wbGU6XG4gKiAgICAgLy8gSW1wbGVtZW50aW5nIGEgZHVhbCBtb2RlIGVkaXRvciwgeW91IG1heSBoYXZlIHR3b1xuICogICAgIC8vIGZ1bmN0aW9ucyB0byByZWdpc3RlciBmb3Igb25lIGtleS4gaS5lLjpcbiAqICAgICB2YXIgZG9fYSA9IGZ1bmN0aW9uKGUpIHtcbiAqICAgICAgICAgaWYgKG1vZGU9PSdlZGl0Jykge1xuICogICAgICAgICAgICAgY29uc29sZS5sb2coJ0EnKTtcbiAqICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICogICAgICAgICB9XG4gKiAgICAgfVxuICogICAgIHZhciBkb19iID0gZnVuY3Rpb24oZSkge1xuICogICAgICAgICBpZiAobW9kZT09J2NvbW1hbmQnKSB7XG4gKiAgICAgICAgICAgICBjb25zb2xlLmxvZygnQicpO1xuICogICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gKiAgICAgICAgIH1cbiAqICAgICB9XG4gKlxuICogICAgIC8vIFRvIHJlZ2lzdGVyIGJvdGggZm9yIG9uZSBrZXlcbiAqICAgICBNYXAucmVnaXN0ZXIoJ2FjdGlvbl9hJywgZG9fYSk7XG4gKiAgICAgTWFwLnJlZ2lzdGVyKCdhY3Rpb25fYicsIGRvX2IpO1xuICogICAgIG1hcC5hcHBlbmRfbWFwKHtcbiAqICAgICAgICAgJ2FsdC12JzogWydhY3Rpb25fYScsICdhY3Rpb25fYiddLFxuICogICAgIH0pO1xuICogXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5NYXAucHJvdG90eXBlLmFwcGVuZF9tYXAgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdmFyIHBhcnNlZCA9IHRoaXMuX3BhcnNlX21hcF9hcmd1bWVudHMoYXJndW1lbnRzKTtcbiAgICBPYmplY3Qua2V5cyhwYXJzZWQpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIGlmICh0aGF0Ll9tYXBba2V5XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aGF0Ll9tYXBba2V5XSA9IHBhcnNlZFtrZXldO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhhdC5fbWFwW2tleV0gPSB0aGF0Ll9tYXBba2V5XS5jb25jYXQocGFyc2VkW2tleV0pO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIEFsaWFzIGZvciBgYXBwZW5kX21hcGAuXG4gKiBAdHlwZSB7ZnVuY3Rpb259XG4gKi9cbk1hcC5wcm90b3R5cGUubWFwID0gTWFwLnByb3RvdHlwZS5hcHBlbmRfbWFwO1xuXG4vKipcbiAqIFByZXBlbmQgZXZlbnQgYWN0aW9ucyB0byB0aGUgbWFwLlxuICpcbiAqIFNlZSB0aGUgZG9jIGZvciBgYXBwZW5kX21hcGAgZm9yIGEgZGV0YWlsZWQgZGVzY3JpcHRpb24gb2ZcbiAqIHBvc3NpYmxlIGlucHV0IHZhbHVlcy5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbk1hcC5wcm90b3R5cGUucHJlcGVuZF9tYXAgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdmFyIHBhcnNlZCA9IHRoaXMuX3BhcnNlX21hcF9hcmd1bWVudHMoYXJndW1lbnRzKTtcbiAgICBPYmplY3Qua2V5cyhwYXJzZWQpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIGlmICh0aGF0Ll9tYXBba2V5XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aGF0Ll9tYXBba2V5XSA9IHBhcnNlZFtrZXldO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhhdC5fbWFwW2tleV0gPSBwYXJzZWRba2V5XS5jb25jYXQodGhhdC5fbWFwW2tleV0pO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIFVubWFwIGV2ZW50IGFjdGlvbnMgaW4gdGhlIG1hcC5cbiAqXG4gKiBTZWUgdGhlIGRvYyBmb3IgYGFwcGVuZF9tYXBgIGZvciBhIGRldGFpbGVkIGRlc2NyaXB0aW9uIG9mXG4gKiBwb3NzaWJsZSBpbnB1dCB2YWx1ZXMuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5NYXAucHJvdG90eXBlLnVubWFwID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHZhciBwYXJzZWQgPSB0aGlzLl9wYXJzZV9tYXBfYXJndW1lbnRzKGFyZ3VtZW50cyk7XG4gICAgT2JqZWN0LmtleXMocGFyc2VkKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICBpZiAodGhhdC5fbWFwW2tleV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcGFyc2VkW2tleV0uZm9yRWFjaChmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHZhciBpbmRleCA9IHRoYXQuX21hcFtrZXldLmluZGV4T2YodmFsdWUpO1xuICAgICAgICAgICAgICAgIGlmIChpbmRleCAhPSAtMSkge1xuICAgICAgICAgICAgICAgICAgICB0aGF0Ll9tYXBba2V5XS5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIEdldCBhIG1vZGlmaWFibGUgYXJyYXkgb2YgdGhlIGFjdGlvbnMgZm9yIGEgcGFydGljdWxhciBldmVudC5cbiAqIEBwYXJhbSAge3N0cmluZ30gZXZlbnRcbiAqIEByZXR1cm4ge2FycmF5fSBieSByZWYgY29weSBvZiB0aGUgYWN0aW9ucyByZWdpc3RlcmVkIHRvIGFuIGV2ZW50LlxuICovXG5NYXAucHJvdG90eXBlLmdldF9tYXBwaW5nID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICByZXR1cm4gdGhpcy5fbWFwW3RoaXMuX25vcm1hbGl6ZV9ldmVudF9uYW1lKGV2ZW50KV07XG59O1xuXG4vKipcbiAqIFBhcnNlIHRoZSBhcmd1bWVudHMgdG8gYSBtYXAgZnVuY3Rpb24uXG4gKiBAcGFyYW0gIHthcmd1bWVudHMgYXJyYXl9IGFyZ3NcbiAqIEByZXR1cm4ge2RpY3Rpb25hcnl9IHBhcnNlZCByZXN1bHRzXG4gKi9cbk1hcC5wcm90b3R5cGUuX3BhcnNlX21hcF9hcmd1bWVudHMgPSBmdW5jdGlvbihhcmdzKSB7XG4gICAgdmFyIHBhcnNlZCA9IHt9O1xuICAgIHZhciB0aGF0ID0gdGhpcztcblxuICAgIC8vIE9uZSBhcnVtZW50LCB0cmVhdCBpdCBhcyBhIGRpY3Rpb25hcnkgb2YgZXZlbnQgbmFtZXMgYW5kXG4gICAgLy8gYWN0aW9ucy5cbiAgICBpZiAoYXJncy5sZW5ndGggPT0gMSkge1xuICAgICAgICBPYmplY3Qua2V5cyhhcmdzWzBdKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gYXJnc1swXVtrZXldO1xuICAgICAgICAgICAgdmFyIG5vcm1hbGl6ZWRfa2V5ID0gdGhhdC5fbm9ybWFsaXplX2V2ZW50X25hbWUoa2V5KTtcblxuICAgICAgICAgICAgLy8gSWYgdGhlIHZhbHVlIGlzIG5vdCBhbiBhcnJheSwgd3JhcCBpdCBpbiBvbmUuXG4gICAgICAgICAgICBpZiAoIXV0aWxzLmlzX2FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gW3ZhbHVlXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gSWYgdGhlIGtleSBpcyBhbHJlYWR5IGRlZmluZWQsIGNvbmNhdCB0aGUgdmFsdWVzIHRvXG4gICAgICAgICAgICAvLyBpdC4gIE90aGVyd2lzZSwgc2V0IGl0LlxuICAgICAgICAgICAgaWYgKHBhcnNlZFtub3JtYWxpemVkX2tleV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHBhcnNlZFtub3JtYWxpemVkX2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcGFyc2VkW25vcm1hbGl6ZWRfa2V5XSA9IHBhcnNlZFtub3JtYWxpemVkX2tleV0uY29uY2F0KHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAvLyBNb3JlIHRoYW4gb25lIGFyZ3VtZW50LiAgVHJlYXQgYXMgdGhlIGZvcm1hdDpcbiAgICAvLyBldmVudF9uYW1lMSwgYWN0aW9uMSwgZXZlbnRfbmFtZTIsIGFjdGlvbjIsIC4uLiwgZXZlbnRfbmFtZU4sIGFjdGlvbk5cbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKHZhciBpPTA7IGk8TWF0aC5mbG9vcihhcmdzLmxlbmd0aC8yKTsgaSsrKSB7XG4gICAgICAgICAgICB2YXIga2V5ID0gdGhhdC5fbm9ybWFsaXplX2V2ZW50X25hbWUoYXJnc1syKmldKTtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IGFyZ3NbMippICsgMV07XG4gICAgICAgICAgICBpZiAocGFyc2VkW2tleV09PT11bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBwYXJzZWRba2V5XSA9IFt2YWx1ZV07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHBhcnNlZFtrZXldLnB1c2godmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBwYXJzZWQ7XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgYSBub3JtYWxpemVkIGV2ZW50LlxuICogQHBhcmFtICB7c3RyaW5nfSBuYW1lIC0gbmFtZSBvZiB0aGUgZXZlbnRcbiAqIEBwYXJhbSAge0V2ZW50fSBlIC0gYnJvd3NlciBFdmVudCBvYmplY3RcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbk1hcC5wcm90b3R5cGUuX2hhbmRsZV9ldmVudCA9IGZ1bmN0aW9uKG5hbWUsIGUpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdmFyIG5vcm1hbGl6ZWRfZXZlbnQgPSB0aGlzLl9ub3JtYWxpemVfZXZlbnRfbmFtZShuYW1lKTtcbiAgICB2YXIgYWN0aW9ucyA9IHRoaXMuX21hcFtub3JtYWxpemVkX2V2ZW50XTtcblxuICAgIGlmIChhY3Rpb25zKSB7XG4gICAgICAgIGFjdGlvbnMuZm9yRWFjaChmdW5jdGlvbihhY3Rpb24pIHtcbiAgICAgICAgICAgIHZhciBhY3Rpb25fY2FsbGJhY2tzID0gTWFwLnJlZ2lzdHJ5W2FjdGlvbl07XG4gICAgICAgICAgICBpZiAoYWN0aW9uX2NhbGxiYWNrcykge1xuICAgICAgICAgICAgICAgIGlmICh1dGlscy5pc19hcnJheShhY3Rpb25fY2FsbGJhY2tzKSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmV0dXJucyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBhY3Rpb25fY2FsbGJhY2tzLmZvckVhY2goZnVuY3Rpb24oYWN0aW9uX2NhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm5zLmFwcGVuZChhY3Rpb25fY2FsbGJhY2suY2FsbCh1bmRlZmluZWQsIGUpPT09dHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIElmIG9uZSBvZiB0aGUgYWN0aW9uIGNhbGxiYWNrcyByZXR1cm5lZCB0cnVlLCBjYW5jZWwgYnViYmxpbmcuXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXR1cm5zLnNvbWUoZnVuY3Rpb24oeCkge3JldHVybiB4O30pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1dGlscy5jYW5jZWxfYnViYmxlKGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYWN0aW9uX2NhbGxiYWNrcy5jYWxsKHVuZGVmaW5lZCwgZSk9PT10cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1dGlscy5jYW5jZWxfYnViYmxlKGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG4vKipcbiAqIEFscGhhYmV0aWNhbGx5IHNvcnRzIGtleXMgaW4gZXZlbnQgbmFtZSwgc29cbiAqIEBwYXJhbSAge3N0cmluZ30gbmFtZSAtIGV2ZW50IG5hbWVcbiAqIEByZXR1cm4ge3N0cmluZ30gbm9ybWFsaXplZCBldmVudCBuYW1lXG4gKi9cbk1hcC5wcm90b3R5cGUuX25vcm1hbGl6ZV9ldmVudF9uYW1lID0gZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiBuYW1lLnRvTG93ZXJDYXNlKCkudHJpbSgpLnNwbGl0KCctJykuc29ydCgpLmpvaW4oJy0nKTtcbn07XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuTWFwID0gTWFwO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzLmpzJyk7XG5cbi8qKlxuICogRXZlbnQgbm9ybWFsaXplclxuICpcbiAqIExpc3RlbnMgdG8gRE9NIGV2ZW50cyBhbmQgZW1pdHMgJ2NsZWFuZWQnIHZlcnNpb25zIG9mIHRob3NlIGV2ZW50cy5cbiAqL1xudmFyIE5vcm1hbGl6ZXIgPSBmdW5jdGlvbigpIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMuX2VsX2hvb2tzID0ge307XG59O1xudXRpbHMuaW5oZXJpdChOb3JtYWxpemVyLCB1dGlscy5Qb3N0ZXJDbGFzcyk7XG5cbi8qKlxuICogTGlzdGVuIHRvIHRoZSBldmVudHMgb2YgYW4gZWxlbWVudC5cbiAqIEBwYXJhbSAge0hUTUxFbGVtZW50fSBlbFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuTm9ybWFsaXplci5wcm90b3R5cGUubGlzdGVuX3RvID0gZnVuY3Rpb24oZWwpIHtcbiAgICB2YXIgaG9va3MgPSBbXTtcbiAgICBob29rcy5wdXNoKHV0aWxzLmhvb2soZWwsICdvbmtleXByZXNzJywgdGhpcy5fcHJveHkoJ3ByZXNzJywgdGhpcy5faGFuZGxlX2tleXByZXNzX2V2ZW50LCBlbCkpKTtcbiAgICBob29rcy5wdXNoKHV0aWxzLmhvb2soZWwsICdvbmtleWRvd24nLCAgdGhpcy5fcHJveHkoJ2Rvd24nLCB0aGlzLl9oYW5kbGVfa2V5Ym9hcmRfZXZlbnQsIGVsKSkpO1xuICAgIGhvb2tzLnB1c2godXRpbHMuaG9vayhlbCwgJ29ua2V5dXAnLCAgdGhpcy5fcHJveHkoJ3VwJywgdGhpcy5faGFuZGxlX2tleWJvYXJkX2V2ZW50LCBlbCkpKTtcbiAgICBob29rcy5wdXNoKHV0aWxzLmhvb2soZWwsICdvbmRibGNsaWNrJywgIHRoaXMuX3Byb3h5KCdkYmxjbGljaycsIHRoaXMuX2hhbmRsZV9tb3VzZV9ldmVudCwgZWwpKSk7XG4gICAgaG9va3MucHVzaCh1dGlscy5ob29rKGVsLCAnb25jbGljaycsICB0aGlzLl9wcm94eSgnY2xpY2snLCB0aGlzLl9oYW5kbGVfbW91c2VfZXZlbnQsIGVsKSkpO1xuICAgIGhvb2tzLnB1c2godXRpbHMuaG9vayhlbCwgJ29ubW91c2Vkb3duJywgIHRoaXMuX3Byb3h5KCdkb3duJywgdGhpcy5faGFuZGxlX21vdXNlX2V2ZW50LCBlbCkpKTtcbiAgICBob29rcy5wdXNoKHV0aWxzLmhvb2soZWwsICdvbm1vdXNldXAnLCAgdGhpcy5fcHJveHkoJ3VwJywgdGhpcy5faGFuZGxlX21vdXNlX2V2ZW50LCBlbCkpKTtcbiAgICBob29rcy5wdXNoKHV0aWxzLmhvb2soZWwsICdvbm1vdXNlbW92ZScsICB0aGlzLl9wcm94eSgnbW92ZScsIHRoaXMuX2hhbmRsZV9tb3VzZW1vdmVfZXZlbnQsIGVsKSkpO1xuICAgIHRoaXMuX2VsX2hvb2tzW2VsXSA9IGhvb2tzO1xufTtcblxuLyoqXG4gKiBTdG9wcyBsaXN0ZW5pbmcgdG8gYW4gZWxlbWVudC5cbiAqIEBwYXJhbSAge0hUTUxFbGVtZW50fSBlbFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuTm9ybWFsaXplci5wcm90b3R5cGUuc3RvcF9saXN0ZW5pbmdfdG8gPSBmdW5jdGlvbihlbCkge1xuICAgIGlmICh0aGlzLl9lbF9ob29rc1tlbF0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLl9lbF9ob29rc1tlbF0uZm9yRWFjaChmdW5jdGlvbihob29rKSB7XG4gICAgICAgICAgICBob29rLnVuaG9vaygpO1xuICAgICAgICB9KTtcbiAgICAgICAgZGVsZXRlIHRoaXMuX2VsX2hvb2tzW2VsXTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgd2hlbiBhIG1vdXNlIGV2ZW50IG9jY3Vyc1xuICogQHBhcmFtICB7SFRNTEVsZW1lbnR9IGVsXG4gKiBAcGFyYW0gIHtFdmVudH0gZVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuTm9ybWFsaXplci5wcm90b3R5cGUuX2hhbmRsZV9tb3VzZV9ldmVudCA9IGZ1bmN0aW9uKGVsLCBldmVudF9uYW1lLCBlKSB7XG4gICAgZSA9IGUgfHwgd2luZG93LmV2ZW50O1xuICAgIHRoaXMudHJpZ2dlcih0aGlzLl9tb2RpZmllcl9zdHJpbmcoZSkgKyAnbW91c2UnICsgZS5idXR0b24gKyAnLScgKyBldmVudF9uYW1lLCBlKTtcbn07XG5cbi8qKlxuICogSGFuZGxlcyB3aGVuIGEgbW91c2UgZXZlbnQgb2NjdXJzXG4gKiBAcGFyYW0gIHtIVE1MRWxlbWVudH0gZWxcbiAqIEBwYXJhbSAge0V2ZW50fSBlXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Ob3JtYWxpemVyLnByb3RvdHlwZS5faGFuZGxlX21vdXNlbW92ZV9ldmVudCA9IGZ1bmN0aW9uKGVsLCBldmVudF9uYW1lLCBlKSB7XG4gICAgZSA9IGUgfHwgd2luZG93LmV2ZW50O1xuICAgIHRoaXMudHJpZ2dlcih0aGlzLl9tb2RpZmllcl9zdHJpbmcoZSkgKyAnbW91c2UnICsgJy0nICsgZXZlbnRfbmFtZSwgZSk7XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgd2hlbiBhIGtleWJvYXJkIGV2ZW50IG9jY3Vyc1xuICogQHBhcmFtICB7SFRNTEVsZW1lbnR9IGVsXG4gKiBAcGFyYW0gIHtFdmVudH0gZVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuTm9ybWFsaXplci5wcm90b3R5cGUuX2hhbmRsZV9rZXlib2FyZF9ldmVudCA9IGZ1bmN0aW9uKGVsLCBldmVudF9uYW1lLCBlKSB7XG4gICAgZSA9IGUgfHwgd2luZG93LmV2ZW50O1xuICAgIHZhciBrZXluYW1lID0gdGhpcy5fbG9va3VwX2tleWNvZGUoZS5rZXlDb2RlKTtcbiAgICBpZiAoa2V5bmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMudHJpZ2dlcih0aGlzLl9tb2RpZmllcl9zdHJpbmcoZSkgKyBrZXluYW1lICsgJy0nICsgZXZlbnRfbmFtZSwgZSk7XG5cbiAgICAgICAgaWYgKGV2ZW50X25hbWU9PSdkb3duJykgeyAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy50cmlnZ2VyKHRoaXMuX21vZGlmaWVyX3N0cmluZyhlKSArIGtleW5hbWUsIGUpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHRoaXMudHJpZ2dlcih0aGlzLl9tb2RpZmllcl9zdHJpbmcoZSkgKyBTdHJpbmcoZS5rZXlDb2RlKSArICctJyArIGV2ZW50X25hbWUsIGUpO1xuICAgIHRoaXMudHJpZ2dlcigna2V5JyArIGV2ZW50X25hbWUsIGUpO1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIHdoZW4gYSBrZXlwcmVzcyBldmVudCBvY2N1cnNcbiAqIEBwYXJhbSAge0hUTUxFbGVtZW50fSBlbFxuICogQHBhcmFtICB7RXZlbnR9IGVcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbk5vcm1hbGl6ZXIucHJvdG90eXBlLl9oYW5kbGVfa2V5cHJlc3NfZXZlbnQgPSBmdW5jdGlvbihlbCwgZXZlbnRfbmFtZSwgZSkge1xuICAgIHRoaXMudHJpZ2dlcigna2V5cHJlc3MnLCBlKTtcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBlbGVtZW50IGV2ZW50IHByb3h5LlxuICogQHBhcmFtICB7ZnVuY3Rpb259IGZcbiAqIEBwYXJhbSAge3N0cmluZ30gZXZlbnRfbmFtZVxuICogQHBhcmFtICB7SFRNTEVsZW1lbnR9IGVsXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Ob3JtYWxpemVyLnByb3RvdHlwZS5fcHJveHkgPSBmdW5jdGlvbihldmVudF9uYW1lLCBmLCBlbCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBhcmdzID0gW2VsLCBldmVudF9uYW1lXS5jb25jYXQoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKSk7XG4gICAgICAgIHJldHVybiBmLmFwcGx5KHRoYXQsIGFyZ3MpO1xuICAgIH07XG59O1xuXG4vKipcbiAqIENyZWF0ZSBhIG1vZGlmaWVycyBzdHJpbmcgZnJvbSBhbiBldmVudC5cbiAqIEBwYXJhbSAge0V2ZW50fSBlXG4gKiBAcmV0dXJuIHtzdHJpbmd9IGRhc2ggc2VwYXJhdGVkIG1vZGlmaWVyIHN0cmluZ1xuICovXG5Ob3JtYWxpemVyLnByb3RvdHlwZS5fbW9kaWZpZXJfc3RyaW5nID0gZnVuY3Rpb24oZSkge1xuICAgIHZhciBtb2RpZmllcnMgPSBbXTtcbiAgICBpZiAoZS5jdHJsS2V5KSBtb2RpZmllcnMucHVzaCgnY3RybCcpO1xuICAgIGlmIChlLmFsdEtleSkgbW9kaWZpZXJzLnB1c2goJ2FsdCcpO1xuICAgIGlmIChlLm1ldGFLZXkpIG1vZGlmaWVycy5wdXNoKCdtZXRhJyk7XG4gICAgaWYgKGUuc2hpZnRLZXkpIG1vZGlmaWVycy5wdXNoKCdzaGlmdCcpO1xuICAgIHZhciBzdHJpbmcgPSBtb2RpZmllcnMuc29ydCgpLmpvaW4oJy0nKTtcbiAgICBpZiAoc3RyaW5nLmxlbmd0aCA+IDApIHN0cmluZyA9IHN0cmluZyArICctJztcbiAgICByZXR1cm4gc3RyaW5nO1xufTtcblxuLyoqXG4gKiBMb29rdXAgdGhlIGh1bWFuIGZyaWVuZGx5IG5hbWUgZm9yIGEga2V5Y29kZS5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IGtleWNvZGVcbiAqIEByZXR1cm4ge3N0cmluZ30ga2V5IG5hbWVcbiAqL1xuTm9ybWFsaXplci5wcm90b3R5cGUuX2xvb2t1cF9rZXljb2RlID0gZnVuY3Rpb24oa2V5Y29kZSkge1xuICAgIGlmICgxMTIgPD0ga2V5Y29kZSAmJiBrZXljb2RlIDw9IDEyMykgeyAvLyBGMS1GMTJcbiAgICAgICAgcmV0dXJuICdmJyArIChrZXljb2RlLTExMSk7XG4gICAgfSBlbHNlIGlmICg0OCA8PSBrZXljb2RlICYmIGtleWNvZGUgPD0gNTcpIHsgLy8gMC05XG4gICAgICAgIHJldHVybiBTdHJpbmcoa2V5Y29kZS00OCk7XG4gICAgfSBlbHNlIGlmICg2NSA8PSBrZXljb2RlICYmIGtleWNvZGUgPD0gOTApIHsgLy8gQS1aXG4gICAgICAgIHJldHVybiAnYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXonLnN1YnN0cmluZyhTdHJpbmcoa2V5Y29kZS02NSksIFN0cmluZyhrZXljb2RlLTY0KSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGNvZGVzID0ge1xuICAgICAgICAgICAgODogJ2JhY2tzcGFjZScsXG4gICAgICAgICAgICA5OiAndGFiJyxcbiAgICAgICAgICAgIDEzOiAnZW50ZXInLFxuICAgICAgICAgICAgMTY6ICdzaGlmdCcsXG4gICAgICAgICAgICAxNzogJ2N0cmwnLFxuICAgICAgICAgICAgMTg6ICdhbHQnLFxuICAgICAgICAgICAgMTk6ICdwYXVzZScsXG4gICAgICAgICAgICAyMDogJ2NhcHNsb2NrJyxcbiAgICAgICAgICAgIDI3OiAnZXNjJyxcbiAgICAgICAgICAgIDMyOiAnc3BhY2UnLFxuICAgICAgICAgICAgMzM6ICdwYWdldXAnLFxuICAgICAgICAgICAgMzQ6ICdwYWdlZG93bicsXG4gICAgICAgICAgICAzNTogJ2VuZCcsXG4gICAgICAgICAgICAzNjogJ2hvbWUnLFxuICAgICAgICAgICAgMzc6ICdsZWZ0YXJyb3cnLFxuICAgICAgICAgICAgMzg6ICd1cGFycm93JyxcbiAgICAgICAgICAgIDM5OiAncmlnaHRhcnJvdycsXG4gICAgICAgICAgICA0MDogJ2Rvd25hcnJvdycsXG4gICAgICAgICAgICA0NDogJ3ByaW50c2NyZWVuJyxcbiAgICAgICAgICAgIDQ1OiAnaW5zZXJ0JyxcbiAgICAgICAgICAgIDQ2OiAnZGVsZXRlJyxcbiAgICAgICAgICAgIDkxOiAnd2luZG93cycsXG4gICAgICAgICAgICA5MzogJ21lbnUnLFxuICAgICAgICAgICAgMTQ0OiAnbnVtbG9jaycsXG4gICAgICAgICAgICAxNDU6ICdzY3JvbGxsb2NrJyxcbiAgICAgICAgICAgIDE4ODogJ2NvbW1hJyxcbiAgICAgICAgICAgIDE5MDogJ3BlcmlvZCcsXG4gICAgICAgICAgICAxOTE6ICdmb3dhcmRzbGFzaCcsXG4gICAgICAgICAgICAxOTI6ICd0aWxkZScsXG4gICAgICAgICAgICAyMTk6ICdsZWZ0YnJhY2tldCcsXG4gICAgICAgICAgICAyMjA6ICdiYWNrc2xhc2gnLFxuICAgICAgICAgICAgMjIxOiAncmlnaHRicmFja2V0JyxcbiAgICAgICAgICAgIDIyMjogJ3F1b3RlJyxcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIGNvZGVzW2tleWNvZGVdO1xuICAgIH0gXG4gICAgLy8gVE9ETzogdGhpcyBmdW5jdGlvbiBpcyBtaXNzaW5nIHNvbWUgYnJvd3NlciBzcGVjaWZpY1xuICAgIC8vIGtleWNvZGUgbWFwcGluZ3MuXG59O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLk5vcm1hbGl6ZXIgPSBOb3JtYWxpemVyO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMuanMnKTtcblxuLyoqXG4gKiBMaXN0ZW5zIHRvIGEgbW9kZWwgYW5kIGhpZ2xpZ2h0cyB0aGUgdGV4dCBhY2NvcmRpbmdseS5cbiAqIEBwYXJhbSB7RG9jdW1lbnRNb2RlbH0gbW9kZWxcbiAqL1xudmFyIEhpZ2hsaWdodGVyQmFzZSA9IGZ1bmN0aW9uKG1vZGVsLCByb3dfcmVuZGVyZXIpIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMuX21vZGVsID0gbW9kZWw7XG4gICAgdGhpcy5fcm93X3JlbmRlcmVyID0gcm93X3JlbmRlcmVyO1xuICAgIHRoaXMuX3F1ZXVlZCA9IG51bGw7XG4gICAgdGhpcy5kZWxheSA9IDEwMDsgLy9tc1xuXG4gICAgLy8gQmluZCBldmVudHMuXG4gICAgdGhpcy5fcm93X3JlbmRlcmVyLm9uKCdyb3dzX2NoYW5nZWQnLCB1dGlscy5wcm94eSh0aGlzLl9oYW5kbGVfc2Nyb2xsLCB0aGlzKSk7XG4gICAgdGhpcy5fbW9kZWwub24oJ3RleHRfY2hhbmdlZCcsIHV0aWxzLnByb3h5KHRoaXMuX2hhbmRsZV90ZXh0X2NoYW5nZSwgdGhpcykpO1xuICAgIHRoaXMuX21vZGVsLm9uKCdyb3dfY2hhbmdlZCcsIHV0aWxzLnByb3h5KHRoaXMuX2hhbmRsZV90ZXh0X2NoYW5nZSwgdGhpcykpO1xufTtcbnV0aWxzLmluaGVyaXQoSGlnaGxpZ2h0ZXJCYXNlLCB1dGlscy5Qb3N0ZXJDbGFzcyk7XG5cbi8qKlxuICogSGlnaGxpZ2h0IHRoZSBkb2N1bWVudFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuSGlnaGxpZ2h0ZXJCYXNlLnByb3RvdHlwZS5oaWdobGlnaHQgPSBmdW5jdGlvbihzdGFydF9yb3csIGVuZF9yb3cpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ05vdCBpbXBsZW1lbnRlZCcpO1xufTtcblxuLyoqXG4gKiBRdWV1ZXMgYSBoaWdobGlnaHQgb3BlcmF0aW9uLlxuICpcbiAqIElmIGEgaGlnaGxpZ2h0IG9wZXJhdGlvbiBpcyBhbHJlYWR5IHF1ZXVlZCwgZG9uJ3QgcXVldWVcbiAqIGFub3RoZXIgb25lLiAgVGhpcyBlbnN1cmVzIHRoYXQgdGhlIGhpZ2hsaWdodGluZyBpc1xuICogZnJhbWUgcmF0ZSBsb2NrZWQuICBIaWdobGlnaHRpbmcgaXMgYW4gZXhwZW5zaXZlIG9wZXJhdGlvbi5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkhpZ2hsaWdodGVyQmFzZS5wcm90b3R5cGUuX3F1ZXVlX2hpZ2hsaWdodGVyID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuX3F1ZXVlZCA9PT0gbnVsbCkge1xuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgIHRoaXMuX3F1ZXVlZCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0aGF0Ll9tb2RlbC5hY3F1aXJlX3RhZ19ldmVudF9sb2NrKCk7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHZhciB2aXNpYmxlX3Jvd3MgPSB0aGF0Ll9yb3dfcmVuZGVyZXIuZ2V0X3Zpc2libGVfcm93cygpO1xuICAgICAgICAgICAgICAgIHZhciB0b3Bfcm93ID0gdmlzaWJsZV9yb3dzLnRvcF9yb3c7XG4gICAgICAgICAgICAgICAgdmFyIGJvdHRvbV9yb3cgPSB2aXNpYmxlX3Jvd3MuYm90dG9tX3JvdztcbiAgICAgICAgICAgICAgICB0aGF0LmhpZ2hsaWdodCh0b3Bfcm93LCBib3R0b21fcm93KTtcbiAgICAgICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICAgICAgdGhhdC5fbW9kZWwucmVsZWFzZV90YWdfZXZlbnRfbG9jaygpO1xuICAgICAgICAgICAgICAgIHRoYXQuX21vZGVsLnRyaWdnZXJfdGFnX2V2ZW50cygpO1xuICAgICAgICAgICAgICAgIHRoYXQuX3F1ZXVlZCA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRoaXMuZGVsYXkpO1xuICAgIH1cbn07XG5cbi8qKlxuICogSGFuZGxlcyB3aGVuIHRoZSB2aXNpYmxlIHJvdyBpbmRpY2llcyBhcmUgY2hhbmdlZC5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkhpZ2hsaWdodGVyQmFzZS5wcm90b3R5cGUuX2hhbmRsZV9zY3JvbGwgPSBmdW5jdGlvbihzdGFydF9yb3csIGVuZF9yb3cpIHtcbiAgICB0aGlzLl9xdWV1ZV9oaWdobGlnaHRlcigpO1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIHdoZW4gdGhlIHRleHQgY2hhbmdlcy5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkhpZ2hsaWdodGVyQmFzZS5wcm90b3R5cGUuX2hhbmRsZV90ZXh0X2NoYW5nZSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3F1ZXVlX2hpZ2hsaWdodGVyKCk7XG59O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLkhpZ2hsaWdodGVyQmFzZSA9IEhpZ2hsaWdodGVyQmFzZTtcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzLmpzJyk7XG52YXIgaGlnaGxpZ2h0ZXIgPSByZXF1aXJlKCcuL2hpZ2hsaWdodGVyLmpzJyk7XG5cbi8qKlxuICogTGlzdGVucyB0byBhIG1vZGVsIGFuZCBoaWdsaWdodHMgdGhlIHRleHQgYWNjb3JkaW5nbHkuXG4gKiBAcGFyYW0ge0RvY3VtZW50TW9kZWx9IG1vZGVsXG4gKi9cbnZhciBUZXN0SGlnaGxpZ2h0ZXIgPSBmdW5jdGlvbihtb2RlbCwgcm93X3JlbmRlcmVyKSB7XG4gICAgaGlnaGxpZ2h0ZXIuSGlnaGxpZ2h0ZXJCYXNlLmNhbGwodGhpcywgbW9kZWwsIHJvd19yZW5kZXJlcik7XG4gICAgdGhpcy5fcm93X3BhZGRpbmcgPSA1O1xufTtcbnV0aWxzLmluaGVyaXQoVGVzdEhpZ2hsaWdodGVyLCBoaWdobGlnaHRlci5IaWdobGlnaHRlckJhc2UpO1xuXG4vKipcbiAqIEhpZ2hsaWdodCB0aGUgZG9jdW1lbnRcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblRlc3RIaWdobGlnaHRlci5wcm90b3R5cGUuaGlnaGxpZ2h0ID0gZnVuY3Rpb24oc3RhcnRfcm93LCBlbmRfcm93KSB7XG4gICAgLy8gVEVTVCBIaWdobGlnaHRpbmdcbiAgICBzdGFydF9yb3cgPSBNYXRoLm1heCgwLCBzdGFydF9yb3cgLSB0aGlzLl9yb3dfcGFkZGluZyk7XG4gICAgZW5kX3JvdyA9IE1hdGgubWluKHRoaXMuX21vZGVsLl9yb3dzLmxlbmd0aCAtIDEsIGVuZF9yb3cgKyB0aGlzLl9yb3dfcGFkZGluZyk7XG5cbiAgICAvLyBDbGVhciB0aGUgb2xkIGhpZ2hsaWdodGluZy5cbiAgICB0aGlzLl9tb2RlbC5jbGVhcl90YWdzKHN0YXJ0X3JvdywgZW5kX3Jvdyk7XG4gICAgXG4gICAgLy8gTmV3IGhpZ2xpZ2h0aW5nLlxuICAgIGZvciAodmFyIHJvd19pbmRleD1zdGFydF9yb3c7IHJvd19pbmRleDw9ZW5kX3Jvdzsgcm93X2luZGV4KyspIHtcbiAgICAgICAgLy8gSGlnaGxpZ2h0IGFsbCBFUy5cbiAgICAgICAgdmFyIHJvdyA9IHRoaXMuX21vZGVsLl9yb3dzW3Jvd19pbmRleF07XG4gICAgICAgIHZhciBpbmRleCA9IHJvdy5pbmRleE9mKCdlcycpO1xuICAgICAgICB3aGlsZSAoaW5kZXggIT0gLTEpIHtcbiAgICAgICAgICAgIHRoaXMuX21vZGVsLnNldF90YWcocm93X2luZGV4LCBpbmRleCwgcm93X2luZGV4LCBpbmRleCsxLCAnc3ludGF4JywgJ2tleXdvcmQnKTtcbiAgICAgICAgICAgIGluZGV4ID0gcm93LmluZGV4T2YoJ2VzJywgaW5kZXgrMSk7XG4gICAgICAgIH1cblxuICAgICAgICBpbmRleCA9IHJvdy5pbmRleE9mKCdpcycpO1xuICAgICAgICB3aGlsZSAoaW5kZXggIT0gLTEpIHtcbiAgICAgICAgICAgIHRoaXMuX21vZGVsLnNldF90YWcocm93X2luZGV4LCBpbmRleCwgcm93X2luZGV4LCBpbmRleCsxLCAnc3ludGF4JywgJ3N0cmluZycpO1xuICAgICAgICAgICAgaW5kZXggPSByb3cuaW5kZXhPZignaXMnLCBpbmRleCsxKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuVGVzdEhpZ2hsaWdodGVyID0gVGVzdEhpZ2hsaWdodGVyO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMuanMnKTtcbnZhciByZW5kZXJlciA9IHJlcXVpcmUoJy4vcmVuZGVyZXIuanMnKTtcblxuLyoqXG4gKiBHcm91cHMgbXVsdGlwbGUgcmVuZGVyZXJzXG4gKiBAcGFyYW0ge2FycmF5fSByZW5kZXJlcnMgLSBhcnJheSBvZiByZW5kZXJlcnNcbiAqIEBwYXJhbSB7Q2FudmFzfSBjYW52YXNcbiAqL1xudmFyIEJhdGNoUmVuZGVyZXIgPSBmdW5jdGlvbihyZW5kZXJlcnMsIGNhbnZhcykge1xuICAgIHJlbmRlcmVyLlJlbmRlcmVyQmFzZS5jYWxsKHRoaXMsIGNhbnZhcyk7XG4gICAgdGhpcy5fcmVuZGVyZXJzID0gcmVuZGVyZXJzO1xuXG4gICAgLy8gTGlzdGVuIHRvIHRoZSBsYXllcnMsIGlmIG9uZSBsYXllciBjaGFuZ2VzLCByZWNvbXBvc2VcbiAgICAvLyB0aGUgZnVsbCBpbWFnZSBieSBjb3B5aW5nIHRoZW0gYWxsIGFnYWluLlxuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLl9yZW5kZXJlcnMuZm9yRWFjaChmdW5jdGlvbihyZW5kZXJlcikge1xuICAgICAgICByZW5kZXJlci5vbignY2hhbmdlZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhhdC5fY29weV9yZW5kZXJlcnMoKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgXG4gICAgLy8gQ3JlYXRlIHByb3BlcnRpZXMuXG4gICAgdGhpcy5wcm9wZXJ0eSgnd2lkdGgnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoYXQuX2NhbnZhcy53aWR0aDtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0Ll9jYW52YXMud2lkdGggPSB2YWx1ZTtcbiAgICAgICAgdGhhdC5fcmVuZGVyZXJzLmZvckVhY2goZnVuY3Rpb24ocmVuZGVyZXIpIHtcbiAgICAgICAgICAgIHJlbmRlcmVyLndpZHRoID0gdmFsdWU7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIHRoaXMucHJvcGVydHkoJ2hlaWdodCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC5fY2FudmFzLmhlaWdodDtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0Ll9jYW52YXMuaGVpZ2h0ID0gdmFsdWU7XG4gICAgICAgIHRoYXQuX3JlbmRlcmVycy5mb3JFYWNoKGZ1bmN0aW9uKHJlbmRlcmVyKSB7XG4gICAgICAgICAgICByZW5kZXJlci5oZWlnaHQgPSB2YWx1ZTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59O1xudXRpbHMuaW5oZXJpdChCYXRjaFJlbmRlcmVyLCByZW5kZXJlci5SZW5kZXJlckJhc2UpO1xuXG4vKipcbiAqIFJlbmRlciB0byB0aGUgY2FudmFzXG4gKiBAcGFyYW0ge2RpY3Rpb25hcnl9IChvcHRpb25hbCkgc2Nyb2xsIC0gSG93IG11Y2ggdGhlIGNhbnZhcyB3YXMgc2Nyb2xsZWQuICBUaGlzXG4gKiAgICAgICAgICAgICAgICAgICAgIGlzIGEgZGljdGlvbmFyeSBvZiB0aGUgZm9ybSB7eDogZmxvYXQsIHk6IGZsb2F0fVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQmF0Y2hSZW5kZXJlci5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24oc2Nyb2xsKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMuX3JlbmRlcmVycy5mb3JFYWNoKGZ1bmN0aW9uKHJlbmRlcmVyKSB7XG5cbiAgICAgICAgLy8gQXBwbHkgdGhlIHJlbmRlcmluZyBjb29yZGluYXRlIHRyYW5zZm9ybXMgb2YgdGhlIHBhcmVudC5cbiAgICAgICAgaWYgKCFyZW5kZXJlci5vcHRpb25zLnBhcmVudF9pbmRlcGVuZGVudCkge1xuICAgICAgICAgICAgcmVuZGVyZXIuX2NhbnZhcy5fdHggPSB1dGlscy5wcm94eSh0aGF0Ll9jYW52YXMuX3R4LCB0aGF0Ll9jYW52YXMpO1xuICAgICAgICAgICAgcmVuZGVyZXIuX2NhbnZhcy5fdHkgPSB1dGlscy5wcm94eSh0aGF0Ll9jYW52YXMuX3R5LCB0aGF0Ll9jYW52YXMpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVGVsbCB0aGUgcmVuZGVyZXIgdG8gcmVuZGVyIGl0c2VsZi5cbiAgICAgICAgcmVuZGVyZXIucmVuZGVyKHNjcm9sbCk7XG4gICAgfSk7XG5cbiAgICAvLyBDb3B5IHRoZSByZXN1bHRzIHRvIHNlbGYuXG4gICAgdGhpcy5fY29weV9yZW5kZXJlcnMoKTtcbn07XG5cbi8qKlxuICogQ29waWVzIGFsbCB0aGUgcmVuZGVyZXIgbGF5ZXJzIHRvIHRoZSBjYW52YXMuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5CYXRjaFJlbmRlcmVyLnByb3RvdHlwZS5fY29weV9yZW5kZXJlcnMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdGhpcy5fY2FudmFzLmNsZWFyKCk7XG4gICAgdGhpcy5fcmVuZGVyZXJzLmZvckVhY2goZnVuY3Rpb24ocmVuZGVyZXIpIHtcbiAgICAgICAgdGhhdC5fY29weV9yZW5kZXJlcihyZW5kZXJlcik7XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIENvcHkgYSByZW5kZXJlciB0byB0aGUgY2FudmFzLlxuICogQHBhcmFtICB7UmVuZGVyZXJCYXNlfSByZW5kZXJlclxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQmF0Y2hSZW5kZXJlci5wcm90b3R5cGUuX2NvcHlfcmVuZGVyZXIgPSBmdW5jdGlvbihyZW5kZXJlcikge1xuICAgIHRoaXMuX2NhbnZhcy5kcmF3X2ltYWdlKFxuICAgICAgICByZW5kZXJlci5fY2FudmFzLl9jYW52YXMsIFxuICAgICAgICAtdGhpcy5fY2FudmFzLl90eCgwKSwgXG4gICAgICAgIC10aGlzLl9jYW52YXMuX3R5KDApLCBcbiAgICAgICAgdGhpcy5fY2FudmFzLndpZHRoLCBcbiAgICAgICAgdGhpcy5fY2FudmFzLmhlaWdodCk7XG59O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLkJhdGNoUmVuZGVyZXIgPSBCYXRjaFJlbmRlcmVyO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMuanMnKTtcbnZhciByZW5kZXJlciA9IHJlcXVpcmUoJy4vcmVuZGVyZXIuanMnKTtcblxuLyoqXG4gKiBSZW5kZXJzIHRvIGEgY2FudmFzXG4gKiBAcGFyYW0ge0NhbnZhc30gZGVmYXVsdF9jYW52YXNcbiAqL1xudmFyIENvbG9yUmVuZGVyZXIgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBDcmVhdGUgd2l0aCB0aGUgb3B0aW9uICdwYXJlbnRfaW5kZXBlbmRlbnQnIHRvIGRpc2FibGVcbiAgICAvLyBwYXJlbnQgY29vcmRpbmF0ZSB0cmFuc2xhdGlvbnMgZnJvbSBiZWluZyBhcHBsaWVkIGJ5IFxuICAgIC8vIGEgYmF0Y2ggcmVuZGVyZXIuXG4gICAgcmVuZGVyZXIuUmVuZGVyZXJCYXNlLmNhbGwodGhpcywgdW5kZWZpbmVkLCB7cGFyZW50X2luZGVwZW5kZW50OiB0cnVlfSk7XG4gICAgdGhpcy5fcmVuZGVyZWQgPSBmYWxzZTtcbiAgICBcbiAgICAvLyBDcmVhdGUgcHJvcGVydGllcy5cbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdGhpcy5wcm9wZXJ0eSgnd2lkdGgnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoYXQuX2NhbnZhcy53aWR0aDtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0Ll9jYW52YXMud2lkdGggPSB2YWx1ZTtcbiAgICAgICAgdGhhdC5fcmVuZGVyKCk7XG5cbiAgICAgICAgLy8gVGVsbCBwYXJlbnQgbGF5ZXIgdGhpcyBvbmUgaGFzIGNoYW5nZWQuXG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpO1xuICAgIH0pO1xuICAgIHRoaXMucHJvcGVydHkoJ2hlaWdodCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC5fY2FudmFzLmhlaWdodDtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0Ll9jYW52YXMuaGVpZ2h0ID0gdmFsdWU7XG4gICAgICAgIHRoYXQuX3JlbmRlcigpO1xuXG4gICAgICAgIC8vIFRlbGwgcGFyZW50IGxheWVyIHRoaXMgb25lIGhhcyBjaGFuZ2VkLlxuICAgICAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZWQnKTtcbiAgICB9KTtcbiAgICB0aGlzLnByb3BlcnR5KCdjb2xvcicsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC5fY29sb3I7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC5fY29sb3IgPSB2YWx1ZTtcbiAgICAgICAgdGhhdC5fcmVuZGVyKCk7XG5cbiAgICAgICAgLy8gVGVsbCBwYXJlbnQgbGF5ZXIgdGhpcyBvbmUgaGFzIGNoYW5nZWQuXG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpO1xuICAgIH0pO1xufTtcbnV0aWxzLmluaGVyaXQoQ29sb3JSZW5kZXJlciwgcmVuZGVyZXIuUmVuZGVyZXJCYXNlKTtcblxuLyoqXG4gKiBSZW5kZXIgdG8gdGhlIGNhbnZhc1xuICogQHBhcmFtIHtkaWN0aW9uYXJ5fSAob3B0aW9uYWwpIHNjcm9sbCAtIEhvdyBtdWNoIHRoZSBjYW52YXMgd2FzIHNjcm9sbGVkLiAgVGhpc1xuICogICAgICAgICAgICAgICAgICAgICBpcyBhIGRpY3Rpb25hcnkgb2YgdGhlIGZvcm0ge3g6IGZsb2F0LCB5OiBmbG9hdH1cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkNvbG9yUmVuZGVyZXIucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKHNjcm9sbCkge1xuICAgIGlmICghdGhpcy5fcmVuZGVyZWQpIHtcbiAgICAgICAgdGhpcy5fcmVuZGVyKCk7XG4gICAgICAgIHRoaXMuX3JlbmRlcmVkID0gdHJ1ZTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFJlbmRlciBhIGZyYW1lLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ29sb3JSZW5kZXJlci5wcm90b3R5cGUuX3JlbmRlciA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2NhbnZhcy5jbGVhcigpO1xuICAgIHRoaXMuX2NhbnZhcy5kcmF3X3JlY3RhbmdsZSgwLCAwLCB0aGlzLl9jYW52YXMud2lkdGgsIHRoaXMuX2NhbnZhcy5oZWlnaHQsIHtmaWxsX2NvbG9yOiB0aGlzLl9jb2xvcn0pO1xufTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5Db2xvclJlbmRlcmVyID0gQ29sb3JSZW5kZXJlcjtcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbnZhciBhbmltYXRvciA9IHJlcXVpcmUoJy4uL2FuaW1hdG9yLmpzJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy5qcycpO1xudmFyIHJlbmRlcmVyID0gcmVxdWlyZSgnLi9yZW5kZXJlci5qcycpO1xuXG4vKipcbiAqIFJlbmRlciBkb2N1bWVudCBjdXJzb3JzXG4gKlxuICogVE9ETzogT25seSByZW5kZXIgdmlzaWJsZS5cbiAqL1xudmFyIEN1cnNvcnNSZW5kZXJlciA9IGZ1bmN0aW9uKGN1cnNvcnMsIHN0eWxlLCByb3dfcmVuZGVyZXIsIGhhc19mb2N1cykge1xuICAgIHJlbmRlcmVyLlJlbmRlcmVyQmFzZS5jYWxsKHRoaXMpO1xuICAgIHRoaXMuc3R5bGUgPSBzdHlsZTtcbiAgICB0aGlzLl9oYXNfZm9jdXMgPSBoYXNfZm9jdXM7XG4gICAgdGhpcy5fY3Vyc29ycyA9IGN1cnNvcnM7XG4gICAgdGhpcy5fZ2V0X3Zpc2libGVfcm93cyA9IHV0aWxzLnByb3h5KHJvd19yZW5kZXJlci5nZXRfdmlzaWJsZV9yb3dzLCByb3dfcmVuZGVyZXIpO1xuICAgIHRoaXMuX2dldF9yb3dfaGVpZ2h0ID0gdXRpbHMucHJveHkocm93X3JlbmRlcmVyLmdldF9yb3dfaGVpZ2h0LCByb3dfcmVuZGVyZXIpO1xuICAgIHRoaXMuX2dldF9yb3dfdG9wID0gdXRpbHMucHJveHkocm93X3JlbmRlcmVyLmdldF9yb3dfdG9wLCByb3dfcmVuZGVyZXIpO1xuICAgIHRoaXMuX21lYXN1cmVfcGFydGlhbF9yb3cgPSB1dGlscy5wcm94eShyb3dfcmVuZGVyZXIubWVhc3VyZV9wYXJ0aWFsX3Jvd193aWR0aCwgcm93X3JlbmRlcmVyKTtcbiAgICB0aGlzLl9ibGlua19hbmltYXRvciA9IG5ldyBhbmltYXRvci5BbmltYXRvcigxMDAwKTtcbiAgICB0aGlzLl9mcHMgPSAxMDA7XG5cbiAgICAvLyBTdGFydCB0aGUgY3Vyc29yIHJlbmRlcmluZyBjbG9jay5cbiAgICB0aGlzLl9yZW5kZXJfY2xvY2soKTtcbn07XG51dGlscy5pbmhlcml0KEN1cnNvcnNSZW5kZXJlciwgcmVuZGVyZXIuUmVuZGVyZXJCYXNlKTtcblxuLyoqXG4gKiBSZW5kZXIgdG8gdGhlIGNhbnZhc1xuICogTm90ZTogVGhpcyBtZXRob2QgaXMgY2FsbGVkIG9mdGVuLCBzbyBpdCdzIGltcG9ydGFudCB0aGF0IGl0J3NcbiAqIG9wdGltaXplZCBmb3Igc3BlZWQuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3JzUmVuZGVyZXIucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2NhbnZhcy5jbGVhcigpO1xuXG4gICAgLy8gT25seSByZW5kZXIgaWYgdGhlIGNhbnZhcyBoYXMgZm9jdXMuXG4gICAgaWYgKHRoaXMuX2hhc19mb2N1cygpKSB7XG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgdGhpcy5fY3Vyc29ycy5jdXJzb3JzLmZvckVhY2goZnVuY3Rpb24oY3Vyc29yKSB7XG4gICAgICAgICAgICAvLyBHZXQgdGhlIHZpc2libGUgcm93cy5cbiAgICAgICAgICAgIHZhciB2aXNpYmxlX3Jvd3MgPSB0aGF0Ll9nZXRfdmlzaWJsZV9yb3dzKCk7XG5cbiAgICAgICAgICAgIC8vIElmIGEgY3Vyc29yIGRvZXNuJ3QgaGF2ZSBhIHBvc2l0aW9uLCByZW5kZXIgaXQgYXQgdGhlXG4gICAgICAgICAgICAvLyBiZWdpbm5pbmcgb2YgdGhlIGRvY3VtZW50LlxuICAgICAgICAgICAgdmFyIHJvd19pbmRleCA9IGN1cnNvci5wcmltYXJ5X3JvdyB8fCAwO1xuICAgICAgICAgICAgdmFyIGNoYXJfaW5kZXggPSBjdXJzb3IucHJpbWFyeV9jaGFyIHx8IDA7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIERyYXcgdGhlIGN1cnNvci5cbiAgICAgICAgICAgIGlmICh2aXNpYmxlX3Jvd3MudG9wX3JvdyA8PSByb3dfaW5kZXggJiYgcm93X2luZGV4IDw9IHZpc2libGVfcm93cy5ib3R0b21fcm93KSB7XG4gICAgICAgICAgICAgICAgdGhhdC5fY2FudmFzLmRyYXdfcmVjdGFuZ2xlKFxuICAgICAgICAgICAgICAgICAgICBjaGFyX2luZGV4ID09PSAwID8gMCA6IHRoYXQuX21lYXN1cmVfcGFydGlhbF9yb3cocm93X2luZGV4LCBjaGFyX2luZGV4KSwgXG4gICAgICAgICAgICAgICAgICAgIHRoYXQuX2dldF9yb3dfdG9wKHJvd19pbmRleCksIFxuICAgICAgICAgICAgICAgICAgICAxLCBcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5fZ2V0X3Jvd19oZWlnaHQocm93X2luZGV4KSwgXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbGxfY29sb3I6ICdyZWQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgYWxwaGE6IE1hdGgubWF4KDAsIE1hdGguc2luKE1hdGguUEkgKiB0aGF0Ll9ibGlua19hbmltYXRvci50aW1lKCkpKSxcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIERyYXcgdGhlIHNlbGVjdGlvbiBib3guXG4gICAgICAgICAgICBpZiAoY3Vyc29yLnN0YXJ0X3JvdyAhPT0gbnVsbCAmJiBjdXJzb3Iuc3RhcnRfY2hhciAhPT0gbnVsbCAmJlxuICAgICAgICAgICAgICAgIGN1cnNvci5lbmRfcm93ICE9PSBudWxsICYmIGN1cnNvci5lbmRfY2hhciAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIFxuXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IE1hdGgubWF4KGN1cnNvci5zdGFydF9yb3csIHZpc2libGVfcm93cy50b3Bfcm93KTsgXG4gICAgICAgICAgICAgICAgICAgIGkgPD0gTWF0aC5taW4oY3Vyc29yLmVuZF9yb3csIHZpc2libGVfcm93cy5ib3R0b21fcm93KTsgXG4gICAgICAgICAgICAgICAgICAgIGkrKykge1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBsZWZ0ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGkgPT0gY3Vyc29yLnN0YXJ0X3JvdyAmJiBjdXJzb3Iuc3RhcnRfY2hhciA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxlZnQgPSB0aGF0Ll9tZWFzdXJlX3BhcnRpYWxfcm93KGksIGN1cnNvci5zdGFydF9jaGFyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHRoYXQuX2NhbnZhcy5kcmF3X3JlY3RhbmdsZShcbiAgICAgICAgICAgICAgICAgICAgICAgIGxlZnQsIFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5fZ2V0X3Jvd190b3AoaSksIFxuICAgICAgICAgICAgICAgICAgICAgICAgaSAhPT0gY3Vyc29yLmVuZF9yb3cgPyB0aGF0Ll9tZWFzdXJlX3BhcnRpYWxfcm93KGkpIC0gbGVmdCA6IHRoYXQuX21lYXN1cmVfcGFydGlhbF9yb3coaSwgY3Vyc29yLmVuZF9jaGFyKSAtIGxlZnQsIFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5fZ2V0X3Jvd19oZWlnaHQoaSksIFxuICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGxfY29sb3I6ICdza3libHVlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbHBoYTogMC41LFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBDbG9jayBmb3IgcmVuZGVyaW5nIHRoZSBjdXJzb3IuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3JzUmVuZGVyZXIucHJvdG90eXBlLl9yZW5kZXJfY2xvY2sgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBJZiB0aGUgY2FudmFzIGlzIGZvY3VzZWQsIHJlZHJhdy5cbiAgICBpZiAodGhpcy5faGFzX2ZvY3VzKCkpIHtcbiAgICAgICAgdGhpcy5fd2FzX2ZvY3VzZWQgPSB0cnVlO1xuICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgICAgICAvLyBUZWxsIHBhcmVudCBsYXllciB0aGlzIG9uZSBoYXMgY2hhbmdlZC5cbiAgICAgICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2VkJyk7XG5cbiAgICAvLyBUaGUgY2FudmFzIGlzbid0IGZvY3VzZWQuICBJZiB0aGlzIGlzIHRoZSBmaXJzdCB0aW1lXG4gICAgLy8gaXQgaGFzbid0IGJlZW4gZm9jdXNlZCwgcmVuZGVyIGFnYWluIHdpdGhvdXQgdGhlIFxuICAgIC8vIGN1cnNvcnMuXG4gICAgfSBlbHNlIGlmICh0aGlzLl93YXNfZm9jdXNlZCkge1xuICAgICAgICB0aGlzLl93YXNfZm9jdXNlZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgICAgICAvLyBUZWxsIHBhcmVudCBsYXllciB0aGlzIG9uZSBoYXMgY2hhbmdlZC5cbiAgICAgICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2VkJyk7XG4gICAgfVxuXG4gICAgLy8gMTAwIEZQU1xuICAgIHNldFRpbWVvdXQodXRpbHMucHJveHkodGhpcy5fcmVuZGVyX2Nsb2NrLCB0aGlzKSwgMTAwMCAvIHRoaXMuX2Zwcyk7IFxufTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5DdXJzb3JzUmVuZGVyZXIgPSBDdXJzb3JzUmVuZGVyZXI7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy5qcycpO1xudmFyIHJvdyA9IHJlcXVpcmUoJy4vcm93LmpzJyk7XG5cbi8qKlxuICogUmVuZGVyIHRoZSB0ZXh0IHJvd3Mgb2YgYSBEb2N1bWVudE1vZGVsLlxuICogQHBhcmFtIHtEb2N1bWVudE1vZGVsfSBtb2RlbCBpbnN0YW5jZVxuICovXG52YXIgSGlnaGxpZ2h0ZWRSb3dSZW5kZXJlciA9IGZ1bmN0aW9uKG1vZGVsLCBzY3JvbGxpbmdfY2FudmFzLCBzdHlsZSkge1xuICAgIHJvdy5Sb3dSZW5kZXJlci5jYWxsKHRoaXMsIG1vZGVsLCBzY3JvbGxpbmdfY2FudmFzKTtcbiAgICB0aGlzLnN0eWxlID0gc3R5bGU7XG59O1xudXRpbHMuaW5oZXJpdChIaWdobGlnaHRlZFJvd1JlbmRlcmVyLCByb3cuUm93UmVuZGVyZXIpO1xuXG4vKipcbiAqIFJlbmRlciBhIHNpbmdsZSByb3dcbiAqIEBwYXJhbSAge2ludGVnZXJ9IGluZGV4XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5IaWdobGlnaHRlZFJvd1JlbmRlcmVyLnByb3RvdHlwZS5fcmVuZGVyX3JvdyA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgaWYgKGluZGV4IDwgMCB8fCB0aGlzLl9tb2RlbC5fcm93cy5sZW5ndGggPD0gaW5kZXgpIHJldHVybjtcbiAgICBcbiAgICB2YXIgZ3JvdXBzID0gdGhpcy5fZ2V0X2dyb3VwcyhpbmRleCk7XG4gICAgdmFyIGxlZnQgPSAwO1xuICAgIGZvciAodmFyIGk9MDsgaTxncm91cHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdGhpcy5fY2FudmFzLmRyYXdfdGV4dChsZWZ0LCB0aGlzLmdldF9yb3dfdG9wKGluZGV4KSwgZ3JvdXBzW2ldLnRleHQsIGdyb3Vwc1tpXS5vcHRpb25zKTtcbiAgICAgICAgbGVmdCArPSB0aGlzLl9jYW52YXMubWVhc3VyZV90ZXh0KGdyb3Vwc1tpXS50ZXh0LCBncm91cHNbaV0ub3B0aW9ucyk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBHZXQgcmVuZGVyIGdyb3VwcyBmb3IgYSByb3cuXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBpbmRleCBvZiB0aGUgcm93XG4gKiBAcmV0dXJuIHthcnJheX0gYXJyYXkgb2YgcmVuZGVyaW5ncywgZWFjaCByZW5kZXJpbmcgaXMgYW4gYXJyYXkgb2ZcbiAqICAgICAgICAgICAgICAgICB0aGUgZm9ybSB7b3B0aW9ucywgdGV4dH0uXG4gKi9cbkhpZ2hsaWdodGVkUm93UmVuZGVyZXIucHJvdG90eXBlLl9nZXRfZ3JvdXBzID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICBpZiAoaW5kZXggPCAwIHx8IHRoaXMuX21vZGVsLl9yb3dzLmxlbmd0aCA8PSBpbmRleCkgcmV0dXJuO1xuXG4gICAgdmFyIHJvd190ZXh0ID0gdGhpcy5fbW9kZWwuX3Jvd3NbaW5kZXhdO1xuICAgIHZhciBncm91cHMgPSBbXTtcbiAgICB2YXIgbGFzdF9zeW50YXggPSBudWxsO1xuICAgIHZhciBjaGFyX2luZGV4ID0gMDtcbiAgICB2YXIgc3RhcnQgPSAwO1xuICAgIGZvciAoY2hhcl9pbmRleDsgY2hhcl9pbmRleDxyb3dfdGV4dC5sZW5ndGg7IGNoYXJfaW5kZXgrKykge1xuICAgICAgICB2YXIgc3ludGF4ID0gdGhpcy5fbW9kZWwuZ2V0X3RhZ3MoaW5kZXgsIGNoYXJfaW5kZXgpLnN5bnRheDtcbiAgICAgICAgaWYgKCF0aGlzLl9jb21wYXJlX3N5bnRheChsYXN0X3N5bnRheCxzeW50YXgpKSB7XG4gICAgICAgICAgICBpZiAoY2hhcl9pbmRleCAhPT0gMCkge1xuICAgICAgICAgICAgICAgIGdyb3Vwcy5wdXNoKHtvcHRpb25zOiB0aGlzLl9nZXRfb3B0aW9ucyhsYXN0X3N5bnRheCksIHRleHQ6IHJvd190ZXh0LnN1YnN0cmluZyhzdGFydCwgY2hhcl9pbmRleCl9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxhc3Rfc3ludGF4ID0gc3ludGF4O1xuICAgICAgICAgICAgc3RhcnQgPSBjaGFyX2luZGV4O1xuICAgICAgICB9XG4gICAgfVxuICAgIGdyb3Vwcy5wdXNoKHtvcHRpb25zOiB0aGlzLl9nZXRfb3B0aW9ucyhsYXN0X3N5bnRheCksIHRleHQ6IHJvd190ZXh0LnN1YnN0cmluZyhzdGFydCl9KTtcblxuICAgIHJldHVybiBncm91cHM7XG59O1xuXG4vKipcbiAqIENyZWF0ZXMgYSBzdHlsZSBvcHRpb25zIGRpY3Rpb25hcnkgZnJvbSBhIHN5bnRheCB0YWcuXG4gKiBAcGFyYW0gIHtzdHJpbmd9IHN5bnRheFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuSGlnaGxpZ2h0ZWRSb3dSZW5kZXJlci5wcm90b3R5cGUuX2dldF9vcHRpb25zID0gZnVuY3Rpb24oc3ludGF4KSB7XG4gICAgdmFyIHJlbmRlcl9vcHRpb25zID0gdXRpbHMuc2hhbGxvd19jb3B5KHRoaXMuX2Jhc2Vfb3B0aW9ucyk7XG5cbiAgICBpZiAoc3ludGF4ICYmIHRoaXMuc3R5bGUgJiYgdGhpcy5zdHlsZVtzeW50YXhdKSB7XG4gICAgICAgIHJlbmRlcl9vcHRpb25zLmNvbG9yID0gdGhpcy5zdHlsZVtzeW50YXhdO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJlbmRlcl9vcHRpb25zLmNvbG9yID0gdGhpcy5zdHlsZS50ZXh0O1xuICAgIH1cbiAgICBcbiAgICByZXR1cm4gcmVuZGVyX29wdGlvbnM7XG59O1xuXG4vKipcbiAqIENvbXBhcmUgdHdvIHN5bnRheHMuXG4gKiBAcGFyYW0gIHtzdHJpbmd9IGEgLSBzeW50YXhcbiAqIEBwYXJhbSAge3N0cmluZ30gYiAtIHN5bnRheFxuICogQHJldHVybiB7Ym9vbH0gdHJ1ZSBpZiBhIGFuZCBiIGFyZSBlcXVhbFxuICovXG5IaWdobGlnaHRlZFJvd1JlbmRlcmVyLnByb3RvdHlwZS5fY29tcGFyZV9zeW50YXggPSBmdW5jdGlvbihhLCBiKSB7XG4gICAgcmV0dXJuIGEgPT09IGI7XG59O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLkhpZ2hsaWdodGVkUm93UmVuZGVyZXIgPSBIaWdobGlnaHRlZFJvd1JlbmRlcmVyO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIGNhbnZhcyA9IHJlcXVpcmUoJy4uL2NhbnZhcy5qcycpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMuanMnKTtcblxuLyoqXG4gKiBSZW5kZXJzIHRvIGEgY2FudmFzXG4gKiBAcGFyYW0ge0NhbnZhc30gZGVmYXVsdF9jYW52YXNcbiAqL1xudmFyIFJlbmRlcmVyQmFzZSA9IGZ1bmN0aW9uKGRlZmF1bHRfY2FudmFzLCBvcHRpb25zKSB7XG4gICAgdXRpbHMuUG9zdGVyQ2xhc3MuY2FsbCh0aGlzKTtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIHRoaXMuX2NhbnZhcyA9IGRlZmF1bHRfY2FudmFzID8gZGVmYXVsdF9jYW52YXMgOiBuZXcgY2FudmFzLkNhbnZhcygpO1xuICAgIFxuICAgIC8vIENyZWF0ZSBwcm9wZXJ0aWVzLlxuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLnByb3BlcnR5KCd3aWR0aCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC5fY2FudmFzLndpZHRoO1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQuX2NhbnZhcy53aWR0aCA9IHZhbHVlO1xuICAgIH0pO1xuICAgIHRoaXMucHJvcGVydHkoJ2hlaWdodCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC5fY2FudmFzLmhlaWdodDtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0Ll9jYW52YXMuaGVpZ2h0ID0gdmFsdWU7XG4gICAgfSk7XG4gICAgICAgIFxuICAgIC8vIFN0cmV0Y2ggdGhlIGltYWdlIGZvciByZXRpbmEgc3VwcG9ydC5cbiAgICB0aGlzLl9jYW52YXMuc2NhbGUoMiwyKTtcbn07XG51dGlscy5pbmhlcml0KFJlbmRlcmVyQmFzZSwgdXRpbHMuUG9zdGVyQ2xhc3MpO1xuXG4vKipcbiAqIFJlbmRlciB0byB0aGUgY2FudmFzXG4gKiBAcGFyYW0ge2RpY3Rpb25hcnl9IChvcHRpb25hbCkgc2Nyb2xsIC0gSG93IG11Y2ggdGhlIGNhbnZhcyB3YXMgc2Nyb2xsZWQuICBUaGlzXG4gKiAgICAgICAgICAgICAgICAgICAgIGlzIGEgZGljdGlvbmFyeSBvZiB0aGUgZm9ybSB7eDogZmxvYXQsIHk6IGZsb2F0fVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuUmVuZGVyZXJCYXNlLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbihzY3JvbGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ05vdCBpbXBsZW1lbnRlZCcpO1xufTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5SZW5kZXJlckJhc2UgPSBSZW5kZXJlckJhc2U7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy5qcycpO1xudmFyIHJlbmRlcmVyID0gcmVxdWlyZSgnLi9yZW5kZXJlci5qcycpO1xuXG4vKipcbiAqIFJlbmRlciB0aGUgdGV4dCByb3dzIG9mIGEgRG9jdW1lbnRNb2RlbC5cbiAqIEBwYXJhbSB7RG9jdW1lbnRNb2RlbH0gbW9kZWwgaW5zdGFuY2VcbiAqL1xudmFyIFJvd1JlbmRlcmVyID0gZnVuY3Rpb24obW9kZWwsIHNjcm9sbGluZ19jYW52YXMpIHtcbiAgICB0aGlzLl9zY3JvbGxpbmdfY2FudmFzID0gc2Nyb2xsaW5nX2NhbnZhcztcbiAgICByZW5kZXJlci5SZW5kZXJlckJhc2UuY2FsbCh0aGlzKTtcbiAgICB0aGlzLl9tb2RlbCA9IG1vZGVsO1xuXG4gICAgLy8gU2V0IHNvbWUgYmFzaWMgcmVuZGVyaW5nIHByb3BlcnRpZXMuXG4gICAgdGhpcy5fYmFzZV9vcHRpb25zID0ge1xuICAgICAgICBmb250X2ZhbWlseTogJ21vbm9zcGFjZScsXG4gICAgICAgIGZvbnRfc2l6ZTogMTIsXG4gICAgfTtcbiAgICB0aGlzLl9saW5lX3NwYWNpbmcgPSAyO1xuXG4gICAgdGhpcy5fbW9kZWwub24oJ3RhZ3NfY2hhbmdlZCcsIHV0aWxzLnByb3h5KHRoaXMuX2hhbmRsZV92YWx1ZV9jaGFuZ2VkLCB0aGlzKSk7XG4gICAgdGhpcy5fbW9kZWwub24oJ3RleHRfY2hhbmdlZCcsIHV0aWxzLnByb3h5KHRoaXMuX2hhbmRsZV92YWx1ZV9jaGFuZ2VkLCB0aGlzKSk7XG4gICAgdGhpcy5fbW9kZWwub24oJ3Jvd19jaGFuZ2VkJywgdXRpbHMucHJveHkodGhpcy5faGFuZGxlX3Jvd19jaGFuZ2VkLCB0aGlzKSk7IC8vIFRPRE86IEltcGxlbWVudCBteSBldmVudC5cbn07XG51dGlscy5pbmhlcml0KFJvd1JlbmRlcmVyLCByZW5kZXJlci5SZW5kZXJlckJhc2UpO1xuXG4vKipcbiAqIFJlbmRlciB0byB0aGUgY2FudmFzXG4gKiBOb3RlOiBUaGlzIG1ldGhvZCBpcyBjYWxsZWQgb2Z0ZW4sIHNvIGl0J3MgaW1wb3J0YW50IHRoYXQgaXQnc1xuICogb3B0aW1pemVkIGZvciBzcGVlZC5cbiAqIEBwYXJhbSB7ZGljdGlvbmFyeX0gKG9wdGlvbmFsKSBzY3JvbGwgLSBIb3cgbXVjaCB0aGUgY2FudmFzIHdhcyBzY3JvbGxlZC4gIFRoaXNcbiAqICAgICAgICAgICAgICAgICAgICAgaXMgYSBkaWN0aW9uYXJ5IG9mIHRoZSBmb3JtIHt4OiBmbG9hdCwgeTogZmxvYXR9XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24oc2Nyb2xsKSB7XG4gICAgdmFyIGk7XG4gICAgdmFyIHZpc2libGVfcm93cyA9IHRoaXMuZ2V0X3Zpc2libGVfcm93cygpO1xuICAgIHZhciBuZXdfdG9wX3JvdyA9IHZpc2libGVfcm93cy50b3Bfcm93O1xuICAgIHZhciBuZXdfYm90dG9tX3JvdyA9IHZpc2libGVfcm93cy5ib3R0b21fcm93O1xuXG4gICAgLy8gQ2hlY2sgaWYgdGhpcyBpcyBhIG5ldyByYW5nZSBvZiByb3dzLiAgSWYgaXQgaXMsIG5vdGlmeSBhbnlvbmUgd2hvJ3MgbGlzdGVuaW5nLlxuICAgIGlmICh0aGlzLmxhc3RfdG9wX3JvdyAhPT0gbmV3X3RvcF9yb3cgfHwgdGhpcy5sYXN0X2JvdHRvbV9yb3cgIT09IG5ld19ib3R0b21fcm93KSB7XG4gICAgICAgIHRoaXMubGFzdF90b3Bfcm93ID0gbmV3X3RvcF9yb3c7XG4gICAgICAgIHRoaXMubGFzdF9ib3R0b21fcm93ID0gbmV3X2JvdHRvbV9yb3c7XG4gICAgICAgIHRoaXMudHJpZ2dlcigncm93c19jaGFuZ2VkJywgbmV3X3RvcF9yb3csIG5ld19ib3R0b21fcm93KTtcbiAgICB9XG5cbiAgICAvLyBJZiBvbmx5IHRoZSB5IGF4aXMgd2FzIHNjcm9sbGVkLCBibGl0IHRoZSBnb29kIGNvbnRlbnRzIGFuZCBqdXN0IHJlbmRlclxuICAgIC8vIHdoYXQncyBtaXNzaW5nLlxuICAgIGlmIChzY3JvbGwgJiYgc2Nyb2xsLnggPT09IDAgJiYgTWF0aC5hYnMoc2Nyb2xsLnkpIDwgdGhpcy5fY2FudmFzLmhlaWdodCkge1xuXG4gICAgICAgIC8vIENvcHkgb2xkIGNvbnRlbnRzLlxuICAgICAgICB2YXIgb2xkX3JlbmRlciA9IHRoaXMuX2NhbnZhcy5nZXRfcmF3X2ltYWdlKFxuICAgICAgICAgICAgdGhpcy5fc2Nyb2xsaW5nX2NhbnZhcy5zY3JvbGxfbGVmdCwgXG4gICAgICAgICAgICB0aGlzLl9zY3JvbGxpbmdfY2FudmFzLnNjcm9sbF90b3AsIFxuICAgICAgICAgICAgdGhpcy5fY2FudmFzLndpZHRoLCB0aGlzLl9jYW52YXMuaGVpZ2h0KTtcbiAgICAgICAgdGhpcy5fY2FudmFzLmNsZWFyKCk7XG5cbiAgICAgICAgLy8gRHJhdyBtaXNzaW5nIHJvd3MuXG4gICAgICAgIC8vIFBvc2l0aXZlIHksIHNjcm9sbGluZyBkb3duIHRoZSBwYWdlIChwYWdlIGl0c2VsZiBpcyBtb3ZpbmcgdXApLlxuICAgICAgICB2YXIgbmV3X3Jvd19jb3VudCA9IE1hdGguY2VpbChNYXRoLmFicyhzY3JvbGwueSkgLyB0aGlzLmdldF9yb3dfaGVpZ2h0KCkpICsgMTtcbiAgICAgICAgaWYgKHNjcm9sbC55ID4gMCkge1xuICAgICAgICAgICAgZm9yIChpID0gbmV3X2JvdHRvbV9yb3cgLSBuZXdfcm93X2NvdW50OyBpIDw9IG5ld19ib3R0b21fcm93OyBpKyspIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9yZW5kZXJfcm93KGkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9yIChpID0gbmV3X3RvcF9yb3c7IGkgPD0gbmV3X3RvcF9yb3cgKyBuZXdfcm93X2NvdW50OyBpKyspIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9yZW5kZXJfcm93KGkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVkcmF3IG9sZCBjb250ZW50cyBpbiBuZXcgbG9jYXRpb24uXG4gICAgICAgIHRoaXMuX2NhbnZhcy5wdXRfcmF3X2ltYWdlKFxuICAgICAgICAgICAgb2xkX3JlbmRlciwgXG4gICAgICAgICAgICB0aGlzLl9zY3JvbGxpbmdfY2FudmFzLnNjcm9sbF9sZWZ0LCBcbiAgICAgICAgICAgIHRoaXMuX3Njcm9sbGluZ19jYW52YXMuc2Nyb2xsX3RvcCAtIHNjcm9sbC55KTtcblxuICAgIH0gZWxzZSB7IC8vIEZ1bGwgcmVkcmF3XG4gICAgICAgIHRoaXMuX2NhbnZhcy5jbGVhcigpO1xuXG4gICAgICAgIC8vIFJlbmRlciB0aWxsIHRoZXJlIGFyZSBubyByb3dzIGxlZnQsIG9yIHRoZSB0b3Agb2YgdGhlIHJvdyBpc1xuICAgICAgICAvLyBiZWxvdyB0aGUgYm90dG9tIG9mIHRoZSB2aXNpYmxlIGFyZWEuXG4gICAgICAgIGZvciAoaSA9IG5ld190b3Bfcm93OyBcbiAgICAgICAgICAgIGkgPCBNYXRoLm1pbihuZXdfYm90dG9tX3JvdysxLCB0aGlzLl9tb2RlbC5fcm93cy5sZW5ndGgpOyBcbiAgICAgICAgICAgIGkrKykgeyAgICAgICAgXG5cbiAgICAgICAgICAgIHRoaXMuX3JlbmRlcl9yb3coaSk7XG4gICAgICAgIH0gICAgXG4gICAgfVxuICAgIFxufTtcblxuLyoqXG4gKiBHZXRzIHRoZSByb3cgYW5kIGNoYXJhY3RlciBpbmRpY2llcyBjbG9zZXN0IHRvIGdpdmVuIGNvbnRyb2wgc3BhY2UgY29vcmRpbmF0ZXMuXG4gKiBAcGFyYW0gIHtmbG9hdH0gY3Vyc29yX3ggLSB4IHZhbHVlLCAwIGlzIHRoZSBsZWZ0IG9mIHRoZSBjYW52YXMuXG4gKiBAcGFyYW0gIHtmbG9hdH0gY3Vyc29yX3kgLSB5IHZhbHVlLCAwIGlzIHRoZSB0b3Agb2YgdGhlIGNhbnZhcy5cbiAqIEByZXR1cm4ge2RpY3Rpb25hcnl9IGRpY3Rpb25hcnkgb2YgdGhlIGZvcm0ge3Jvd19pbmRleCwgY2hhcl9pbmRleH1cbiAqL1xuUm93UmVuZGVyZXIucHJvdG90eXBlLmdldF9yb3dfY2hhciA9IGZ1bmN0aW9uKGN1cnNvcl94LCBjdXJzb3JfeSkge1xuICAgIHZhciByb3dfaW5kZXggPSBNYXRoLmZsb29yKGN1cnNvcl95IC8gdGhpcy5nZXRfcm93X2hlaWdodCgpKTtcblxuICAgIC8vIEZpbmQgdGhlIGNoYXJhY3RlciBpbmRleC5cbiAgICB2YXIgd2lkdGhzID0gWzBdO1xuICAgIHRyeSB7XG4gICAgICAgIGZvciAodmFyIGxlbmd0aD0xOyBsZW5ndGg8PXRoaXMuX21vZGVsLl9yb3dzW3Jvd19pbmRleF0ubGVuZ3RoOyBsZW5ndGgrKykge1xuICAgICAgICAgICAgd2lkdGhzLnB1c2godGhpcy5tZWFzdXJlX3BhcnRpYWxfcm93X3dpZHRoKHJvd19pbmRleCwgbGVuZ3RoKSk7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8vIE5vbSBub20gbm9tLi4uXG4gICAgfVxuICAgIHZhciBjb29yZHMgPSB0aGlzLl9tb2RlbC52YWxpZGF0ZV9jb29yZHMocm93X2luZGV4LCB1dGlscy5maW5kX2Nsb3Nlc3Qod2lkdGhzLCBjdXJzb3JfeCArIHRoaXMuX3Njcm9sbGluZ19jYW52YXMuc2Nyb2xsX2xlZnQpKTtcbiAgICByZXR1cm4ge1xuICAgICAgICByb3dfaW5kZXg6IGNvb3Jkcy5zdGFydF9yb3csXG4gICAgICAgIGNoYXJfaW5kZXg6IGNvb3Jkcy5zdGFydF9jaGFyLFxuICAgIH07XG59O1xuXG4vKipcbiAqIE1lYXN1cmVzIHRoZSBwYXJ0aWFsIHdpZHRoIG9mIGEgdGV4dCByb3cuXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBpbmRleFxuICogQHBhcmFtICB7aW50ZWdlcn0gKG9wdGlvbmFsKSBsZW5ndGggLSBudW1iZXIgb2YgY2hhcmFjdGVyc1xuICogQHJldHVybiB7ZmxvYXR9IHdpZHRoXG4gKi9cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5tZWFzdXJlX3BhcnRpYWxfcm93X3dpZHRoID0gZnVuY3Rpb24oaW5kZXgsIGxlbmd0aCkge1xuICAgIGlmIChpbmRleCA+PSB0aGlzLl9tb2RlbC5fcm93cy5sZW5ndGgpIHsgcmV0dXJuIDA7IH1cbiAgICB2YXIgdGV4dCA9IHRoaXMuX21vZGVsLl9yb3dzW2luZGV4XTtcbiAgICB0ZXh0ID0gbGVuZ3RoID09PSB1bmRlZmluZWQgPyB0ZXh0IDogdGV4dC5zdWJzdHJpbmcoMCwgbGVuZ3RoKTtcbiAgICByZXR1cm4gdGhpcy5fY2FudmFzLm1lYXN1cmVfdGV4dCh0ZXh0LCB0aGlzLl9iYXNlX29wdGlvbnMpO1xufTtcblxuLyoqXG4gKiBNZWFzdXJlcyB0aGUgaGVpZ2h0IG9mIGEgdGV4dCByb3cgYXMgaWYgaXQgd2VyZSByZW5kZXJlZC5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IGluZGV4XG4gKiBAcmV0dXJuIHtmbG9hdH0gaGVpZ2h0XG4gKi9cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5nZXRfcm93X2hlaWdodCA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgcmV0dXJuIHRoaXMuX2Jhc2Vfb3B0aW9ucy5mb250X3NpemUgKyB0aGlzLl9saW5lX3NwYWNpbmc7XG59O1xuXG4vKipcbiAqIEdldHMgdGhlIHRvcCBvZiB0aGUgcm93IHdoZW4gcmVuZGVyZWRcbiAqIEBwYXJhbSAge2ludGVnZXJ9IGluZGV4XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuZ2V0X3Jvd190b3AgPSBmdW5jdGlvbihpbmRleCkge1xuICAgIHJldHVybiBpbmRleCAqIHRoaXMuZ2V0X3Jvd19oZWlnaHQoaW5kZXgpO1xufTtcblxuLyoqXG4gKiBHZXRzIHRoZSB2aXNpYmxlIHJvd3MuXG4gKiBAcmV0dXJuIHtkaWN0aW9uYXJ5fSBkaWN0aW9uYXJ5IGNvbnRhaW5pbmcgaW5mb3JtYXRpb24gYWJvdXQgXG4gKiAgICAgICAgICAgICAgICAgICAgICB0aGUgdmlzaWJsZSByb3dzLiAgRm9ybWF0IHt0b3Bfcm93LCBcbiAqICAgICAgICAgICAgICAgICAgICAgIGJvdHRvbV9yb3csIHJvd19jb3VudH0uXG4gKi9cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5nZXRfdmlzaWJsZV9yb3dzID0gZnVuY3Rpb24oKSB7XG5cbiAgICAvLyBGaW5kIHRoZSByb3cgY2xvc2VzdCB0byB0aGUgc2Nyb2xsIHRvcC4gIElmIHRoYXQgcm93IGlzIGJlbG93XG4gICAgLy8gdGhlIHNjcm9sbCB0b3AsIHVzZSB0aGUgcGFydGlhbGx5IGRpc3BsYXllZCByb3cgYWJvdmUgaXQuXG4gICAgdmFyIHRvcF9yb3cgPSBNYXRoLm1heCgwLCBNYXRoLmZsb29yKHRoaXMuX3Njcm9sbGluZ19jYW52YXMuc2Nyb2xsX3RvcCAgLyB0aGlzLmdldF9yb3dfaGVpZ2h0KCkpKTtcblxuICAgIC8vIEZpbmQgdGhlIHJvdyBjbG9zZXN0IHRvIHRoZSBzY3JvbGwgYm90dG9tLiAgSWYgdGhhdCByb3cgaXMgYWJvdmVcbiAgICAvLyB0aGUgc2Nyb2xsIGJvdHRvbSwgdXNlIHRoZSBwYXJ0aWFsbHkgZGlzcGxheWVkIHJvdyBiZWxvdyBpdC5cbiAgICB2YXIgcm93X2NvdW50ID0gTWF0aC5jZWlsKHRoaXMuX2NhbnZhcy5oZWlnaHQgLyB0aGlzLmdldF9yb3dfaGVpZ2h0KCkpO1xuICAgIHZhciBib3R0b21fcm93ID0gdG9wX3JvdyArIHJvd19jb3VudDtcblxuICAgIC8vIFJvdyBjb3VudCArIDEgdG8gaW5jbHVkZSBmaXJzdCByb3cuXG4gICAgcmV0dXJuIHt0b3Bfcm93OiB0b3Bfcm93LCBib3R0b21fcm93OiBib3R0b21fcm93LCByb3dfY291bnQ6IHJvd19jb3VudCsxfTtcbn07XG5cbi8qKlxuICogSGFuZGxlcyB3aGVuIHRoZSBtb2RlbCdzIHZhbHVlIGNoYW5nZXNcbiAqIENvbXBsZXhpdHk6IE8oTikgZm9yIE4gcm93cyBvZiB0ZXh0LlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuUm93UmVuZGVyZXIucHJvdG90eXBlLl9oYW5kbGVfdmFsdWVfY2hhbmdlZCA9IGZ1bmN0aW9uKCkge1xuXG4gICAgLy8gQ2FsY3VsYXRlIHRoZSBkb2N1bWVudCB3aWR0aC5cbiAgICB2YXIgZG9jdW1lbnRfd2lkdGggPSAwO1xuICAgIGZvciAodmFyIGk9MDsgaTx0aGlzLl9tb2RlbC5fcm93cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBkb2N1bWVudF93aWR0aCA9IE1hdGgubWF4KHRoaXMuX21lYXN1cmVfcm93X3dpZHRoKGkpLCBkb2N1bWVudF93aWR0aCk7XG4gICAgfVxuICAgIHRoaXMuX3Njcm9sbGluZ19jYW52YXMuc2Nyb2xsX3dpZHRoID0gZG9jdW1lbnRfd2lkdGg7XG4gICAgdGhpcy5fc2Nyb2xsaW5nX2NhbnZhcy5zY3JvbGxfaGVpZ2h0ID0gdGhpcy5fbW9kZWwuX3Jvd3MubGVuZ3RoICogdGhpcy5nZXRfcm93X2hlaWdodCgpO1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIHdoZW4gb25lIG9mIHRoZSBtb2RlbCdzIHJvd3MgY2hhbmdlXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuX2hhbmRsZV9yb3dfY2hhbmdlZCA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgdGhpcy5fc2Nyb2xsaW5nX2NhbnZhcy5zY3JvbGxfd2lkdGggPSBNYXRoLm1heCh0aGlzLl9tZWFzdXJlX3Jvd193aWR0aChpbmRleCksIHRoaXMuX3Njcm9sbGluZ19jYW52YXMuc2Nyb2xsX3dpZHRoKTtcbn07XG5cbi8qKlxuICogUmVuZGVyIGEgc2luZ2xlIHJvd1xuICogQHBhcmFtICB7aW50ZWdlcn0gaW5kZXhcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5fcmVuZGVyX3JvdyA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgdGhpcy5fY2FudmFzLmRyYXdfdGV4dCgwLCB0aGlzLl9yb3dfdG9wc1tpbmRleF0sIHRoaXMuX21vZGVsLl9yb3dzW2luZGV4XSwgdGhpcy5fYmFzZV9vcHRpb25zKTtcbn07XG5cbi8qKlxuICogTWVhc3VyZXMgdGhlIHdpZHRoIG9mIGEgdGV4dCByb3cgYXMgaWYgaXQgd2VyZSByZW5kZXJlZC5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IGluZGV4XG4gKiBAcmV0dXJuIHtmbG9hdH0gd2lkdGhcbiAqL1xuUm93UmVuZGVyZXIucHJvdG90eXBlLl9tZWFzdXJlX3Jvd193aWR0aCA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgcmV0dXJuIHRoaXMubWVhc3VyZV9wYXJ0aWFsX3Jvd193aWR0aChpbmRleCwgdGhpcy5fbW9kZWwuX3Jvd3NbaW5kZXhdLmxlbmd0aCk7XG59O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLlJvd1JlbmRlcmVyID0gUm93UmVuZGVyZXI7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxudmFyIGNhbnZhcyA9IHJlcXVpcmUoJy4vY2FudmFzLmpzJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG5cbi8qKlxuICogSFRNTCBjYW52YXMgd2l0aCBkcmF3aW5nIGNvbnZpbmllbmNlIGZ1bmN0aW9ucy5cbiAqL1xudmFyIFNjcm9sbGluZ0NhbnZhcyA9IGZ1bmN0aW9uKCkge1xuICAgIGNhbnZhcy5DYW52YXMuY2FsbCh0aGlzKTtcbiAgICB0aGlzLl9iaW5kX2V2ZW50cygpO1xuICAgIHRoaXMuX29sZF9zY3JvbGxfbGVmdCA9IDA7XG4gICAgdGhpcy5fb2xkX3Njcm9sbF90b3AgPSAwO1xuXG4gICAgLy8gU2V0IGRlZmF1bHQgc2l6ZS5cbiAgICB0aGlzLndpZHRoID0gNDAwO1xuICAgIHRoaXMuaGVpZ2h0ID0gMzAwO1xufTtcbnV0aWxzLmluaGVyaXQoU2Nyb2xsaW5nQ2FudmFzLCBjYW52YXMuQ2FudmFzKTtcblxuLyoqXG4gKiBDYXVzZXMgdGhlIGNhbnZhcyBjb250ZW50cyB0byBiZSByZWRyYXduLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuU2Nyb2xsaW5nQ2FudmFzLnByb3RvdHlwZS5yZWRyYXcgPSBmdW5jdGlvbihzY3JvbGwpIHtcbiAgICB0aGlzLmNsZWFyKCk7XG4gICAgdGhpcy50cmlnZ2VyKCdyZWRyYXcnLCBzY3JvbGwpO1xufTtcblxuLyoqXG4gKiBMYXlvdXQgdGhlIGVsZW1lbnRzIGZvciB0aGUgY2FudmFzLlxuICogQ3JlYXRlcyBgdGhpcy5lbGBcbiAqIFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuU2Nyb2xsaW5nQ2FudmFzLnByb3RvdHlwZS5fbGF5b3V0ID0gZnVuY3Rpb24oKSB7XG4gICAgY2FudmFzLkNhbnZhcy5wcm90b3R5cGUuX2xheW91dC5jYWxsKHRoaXMpO1xuICAgIC8vIENoYW5nZSB0aGUgY2FudmFzIGNsYXNzIHNvIGl0J3Mgbm90IGhpZGRlbi5cbiAgICB0aGlzLl9jYW52YXMuc2V0QXR0cmlidXRlKCdjbGFzcycsICdjYW52YXMnKTtcblxuICAgIHRoaXMuZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICB0aGlzLmVsLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAncG9zdGVyIHNjcm9sbC13aW5kb3cnKTtcbiAgICB0aGlzLmVsLnNldEF0dHJpYnV0ZSgndGFiaW5kZXgnLCAwKTtcbiAgICB0aGlzLl9zY3JvbGxfYmFycyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIHRoaXMuX3Njcm9sbF9iYXJzLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAnc2Nyb2xsLWJhcnMnKTtcbiAgICB0aGlzLl90b3VjaF9wYW5lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgdGhpcy5fdG91Y2hfcGFuZS5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ3RvdWNoLXBhbmUnKTtcbiAgICB0aGlzLl9kdW1teSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIHRoaXMuX2R1bW15LnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAnc2Nyb2xsLWR1bW15Jyk7XG5cbiAgICB0aGlzLmVsLmFwcGVuZENoaWxkKHRoaXMuX2NhbnZhcyk7XG4gICAgdGhpcy5lbC5hcHBlbmRDaGlsZCh0aGlzLl9zY3JvbGxfYmFycyk7XG4gICAgdGhpcy5fc2Nyb2xsX2JhcnMuYXBwZW5kQ2hpbGQodGhpcy5fZHVtbXkpO1xuICAgIHRoaXMuX3Njcm9sbF9iYXJzLmFwcGVuZENoaWxkKHRoaXMuX3RvdWNoX3BhbmUpO1xufTtcblxuLyoqXG4gKiBNYWtlIHRoZSBwcm9wZXJ0aWVzIG9mIHRoZSBjbGFzcy5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblNjcm9sbGluZ0NhbnZhcy5wcm90b3R5cGUuX2luaXRfcHJvcGVydGllcyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcblxuICAgIC8qKlxuICAgICAqIFdpZHRoIG9mIHRoZSBzY3JvbGxhYmxlIGNhbnZhcyBhcmVhXG4gICAgICovXG4gICAgdGhpcy5wcm9wZXJ0eSgnc2Nyb2xsX3dpZHRoJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIEdldFxuICAgICAgICByZXR1cm4gdGhhdC5fc2Nyb2xsX3dpZHRoIHx8IDA7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgLy8gU2V0XG4gICAgICAgIHRoYXQuX3Njcm9sbF93aWR0aCA9IHZhbHVlO1xuICAgICAgICB0aGF0Ll9tb3ZlX2R1bW15KHRoYXQuX3Njcm9sbF93aWR0aCwgdGhhdC5fc2Nyb2xsX2hlaWdodCB8fCAwKTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIEhlaWdodCBvZiB0aGUgc2Nyb2xsYWJsZSBjYW52YXMgYXJlYS5cbiAgICAgKi9cbiAgICB0aGlzLnByb3BlcnR5KCdzY3JvbGxfaGVpZ2h0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIEdldFxuICAgICAgICByZXR1cm4gdGhhdC5fc2Nyb2xsX2hlaWdodCB8fCAwO1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIC8vIFNldFxuICAgICAgICB0aGF0Ll9zY3JvbGxfaGVpZ2h0ID0gdmFsdWU7XG4gICAgICAgIHRoYXQuX21vdmVfZHVtbXkodGhhdC5fc2Nyb2xsX3dpZHRoIHx8IDAsIHRoYXQuX3Njcm9sbF9oZWlnaHQpO1xuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogVG9wIG1vc3QgcGl4ZWwgaW4gdGhlIHNjcm9sbGVkIHdpbmRvdy5cbiAgICAgKi9cbiAgICB0aGlzLnByb3BlcnR5KCdzY3JvbGxfdG9wJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIEdldFxuICAgICAgICByZXR1cm4gdGhhdC5fc2Nyb2xsX2JhcnMuc2Nyb2xsVG9wO1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIC8vIFNldFxuICAgICAgICB0aGF0Ll9zY3JvbGxfYmFycy5zY3JvbGxUb3AgPSB2YWx1ZTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIExlZnQgbW9zdCBwaXhlbCBpbiB0aGUgc2Nyb2xsZWQgd2luZG93LlxuICAgICAqL1xuICAgIHRoaXMucHJvcGVydHkoJ3Njcm9sbF9sZWZ0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIEdldFxuICAgICAgICByZXR1cm4gdGhhdC5fc2Nyb2xsX2JhcnMuc2Nyb2xsTGVmdDtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAvLyBTZXRcbiAgICAgICAgdGhhdC5fc2Nyb2xsX2JhcnMuc2Nyb2xsTGVmdCA9IHZhbHVlO1xuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogSGVpZ2h0IG9mIHRoZSBjYW52YXNcbiAgICAgKiBAcmV0dXJuIHtmbG9hdH1cbiAgICAgKi9cbiAgICB0aGlzLnByb3BlcnR5KCdoZWlnaHQnLCBmdW5jdGlvbigpIHsgXG4gICAgICAgIHJldHVybiB0aGF0Ll9jYW52YXMuaGVpZ2h0IC8gMjsgXG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC5fY2FudmFzLnNldEF0dHJpYnV0ZSgnaGVpZ2h0JywgdmFsdWUgKiAyKTtcbiAgICAgICAgdGhhdC5lbC5zZXRBdHRyaWJ1dGUoJ3N0eWxlJywgJ3dpZHRoOiAnICsgdGhhdC53aWR0aCArICc7IGhlaWdodDogJyArIHZhbHVlICsgJzsnKTtcblxuICAgICAgICB0aGF0LnRyaWdnZXIoJ3Jlc2l6ZScsIHtoZWlnaHQ6IHZhbHVlfSk7XG4gICAgICAgIHRoYXQuX3RyeV9yZWRyYXcoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFN0cmV0Y2ggdGhlIGltYWdlIGZvciByZXRpbmEgc3VwcG9ydC5cbiAgICAgICAgdGhpcy5zY2FsZSgyLDIpO1xuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogV2lkdGggb2YgdGhlIGNhbnZhc1xuICAgICAqIEByZXR1cm4ge2Zsb2F0fVxuICAgICAqL1xuICAgIHRoaXMucHJvcGVydHkoJ3dpZHRoJywgZnVuY3Rpb24oKSB7IFxuICAgICAgICByZXR1cm4gdGhhdC5fY2FudmFzLndpZHRoIC8gMjsgXG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC5fY2FudmFzLnNldEF0dHJpYnV0ZSgnd2lkdGgnLCB2YWx1ZSAqIDIpO1xuICAgICAgICB0aGF0LmVsLnNldEF0dHJpYnV0ZSgnc3R5bGUnLCAnd2lkdGg6ICcgKyB2YWx1ZSArICc7IGhlaWdodDogJyArIHRoYXQuaGVpZ2h0ICsgJzsnKTtcblxuICAgICAgICB0aGF0LnRyaWdnZXIoJ3Jlc2l6ZScsIHt3aWR0aDogdmFsdWV9KTtcbiAgICAgICAgdGhhdC5fdHJ5X3JlZHJhdygpO1xuICAgICAgICBcbiAgICAgICAgLy8gU3RyZXRjaCB0aGUgaW1hZ2UgZm9yIHJldGluYSBzdXBwb3J0LlxuICAgICAgICB0aGlzLnNjYWxlKDIsMik7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBJcyB0aGUgY2FudmFzIG9yIHJlbGF0ZWQgZWxlbWVudHMgZm9jdXNlZD9cbiAgICAgKiBAcmV0dXJuIHtib29sZWFufVxuICAgICAqL1xuICAgIHRoaXMucHJvcGVydHkoJ2ZvY3VzZWQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQgPT09IHRoYXQuZWwgfHxcbiAgICAgICAgICAgIGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQgPT09IHRoYXQuX3Njcm9sbF9iYXJzIHx8XG4gICAgICAgICAgICBkb2N1bWVudC5hY3RpdmVFbGVtZW50ID09PSB0aGF0Ll9kdW1teSB8fFxuICAgICAgICAgICAgZG9jdW1lbnQuYWN0aXZlRWxlbWVudCA9PT0gdGhhdC5fY2FudmFzO1xuICAgIH0pO1xufTtcblxuLyoqXG4gKiBCaW5kIHRvIHRoZSBldmVudHMgb2YgdGhlIGNhbnZhcy5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblNjcm9sbGluZ0NhbnZhcy5wcm90b3R5cGUuX2JpbmRfZXZlbnRzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuXG4gICAgLy8gVHJpZ2dlciBzY3JvbGwgYW5kIHJlZHJhdyBldmVudHMgb24gc2Nyb2xsLlxuICAgIHRoaXMuX3Njcm9sbF9iYXJzLm9uc2Nyb2xsID0gZnVuY3Rpb24oZSkge1xuICAgICAgICB0aGF0LnRyaWdnZXIoJ3Njcm9sbCcsIGUpO1xuICAgICAgICBpZiAodGhhdC5fb2xkX3Njcm9sbF90b3AgIT09IHVuZGVmaW5lZCAmJiB0aGF0Ll9vbGRfc2Nyb2xsX2xlZnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdmFyIHNjcm9sbCA9IHtcbiAgICAgICAgICAgICAgICB4OiB0aGF0LnNjcm9sbF9sZWZ0IC0gdGhhdC5fb2xkX3Njcm9sbF9sZWZ0LFxuICAgICAgICAgICAgICAgIHk6IHRoYXQuc2Nyb2xsX3RvcCAtIHRoYXQuX29sZF9zY3JvbGxfdG9wLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHRoYXQuX3RyeV9yZWRyYXcoc2Nyb2xsKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoYXQuX3RyeV9yZWRyYXcoKTtcbiAgICAgICAgfVxuICAgICAgICB0aGF0Ll9vbGRfc2Nyb2xsX2xlZnQgPSB0aGF0LnNjcm9sbF9sZWZ0O1xuICAgICAgICB0aGF0Ll9vbGRfc2Nyb2xsX3RvcCA9IHRoYXQuc2Nyb2xsX3RvcDtcbiAgICB9O1xuXG4gICAgLy8gUHJldmVudCBzY3JvbGwgYmFyIGhhbmRsZWQgbW91c2UgZXZlbnRzIGZyb20gYnViYmxpbmcuXG4gICAgdmFyIHNjcm9sbGJhcl9ldmVudCA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgaWYgKGUudGFyZ2V0ICE9PSB0aGF0Ll90b3VjaF9wYW5lKSB7XG4gICAgICAgICAgICB1dGlscy5jYW5jZWxfYnViYmxlKGUpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB0aGlzLl9zY3JvbGxfYmFycy5vbm1vdXNlZG93biA9IHNjcm9sbGJhcl9ldmVudDtcbiAgICB0aGlzLl9zY3JvbGxfYmFycy5vbm1vdXNldXAgPSBzY3JvbGxiYXJfZXZlbnQ7XG4gICAgdGhpcy5fc2Nyb2xsX2JhcnMub25jbGljayA9IHNjcm9sbGJhcl9ldmVudDtcbiAgICB0aGlzLl9zY3JvbGxfYmFycy5vbmRibGNsaWNrID0gc2Nyb2xsYmFyX2V2ZW50O1xufTtcblxuLyoqXG4gKiBRdWVyaWVzIHRvIHNlZSBpZiByZWRyYXcgaXMgb2theSwgYW5kIHRoZW4gcmVkcmF3cyBpZiBpdCBpcy5cbiAqIEByZXR1cm4ge2Jvb2xlYW59IHRydWUgaWYgcmVkcmF3IGhhcHBlbmVkLlxuICovXG5TY3JvbGxpbmdDYW52YXMucHJvdG90eXBlLl90cnlfcmVkcmF3ID0gZnVuY3Rpb24oc2Nyb2xsKSB7XG4gICAgaWYgKHRoaXMuX3F1ZXJ5X3JlZHJhdygpKSB7XG4gICAgICAgIHRoaXMucmVkcmF3KHNjcm9sbCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG4vKipcbiAqIFRyaWdnZXIgdGhlICdxdWVyeV9yZWRyYXcnIGV2ZW50LlxuICogQHJldHVybiB7Ym9vbGVhbn0gdHJ1ZSBpZiBjb250cm9sIHNob3VsZCByZWRyYXcgaXRzZWxmLlxuICovXG5TY3JvbGxpbmdDYW52YXMucHJvdG90eXBlLl9xdWVyeV9yZWRyYXcgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy50cmlnZ2VyKCdxdWVyeV9yZWRyYXcnKS5ldmVyeShmdW5jdGlvbih4KSB7IHJldHVybiB4OyB9KTsgXG59O1xuXG4vKipcbiAqIE1vdmVzIHRoZSBkdW1teSBlbGVtZW50IHRoYXQgY2F1c2VzIHRoZSBzY3JvbGxiYXIgdG8gYXBwZWFyLlxuICogQHBhcmFtICB7ZmxvYXR9IHhcbiAqIEBwYXJhbSAge2Zsb2F0fSB5XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5TY3JvbGxpbmdDYW52YXMucHJvdG90eXBlLl9tb3ZlX2R1bW15ID0gZnVuY3Rpb24oeCwgeSkge1xuICAgIHRoaXMuX2R1bW15LnNldEF0dHJpYnV0ZSgnc3R5bGUnLCAnbGVmdDogJyArIFN0cmluZyh4KSArICc7IHRvcDogJyArIFN0cmluZyh5KSArICc7Jyk7XG4gICAgdGhpcy5fdG91Y2hfcGFuZS5zZXRBdHRyaWJ1dGUoJ3N0eWxlJywgXG4gICAgICAgICd3aWR0aDogJyArIFN0cmluZyhNYXRoLm1heCh4LCB0aGlzLl9zY3JvbGxfYmFycy5jbGllbnRXaWR0aCkpICsgJzsgJyArXG4gICAgICAgICdoZWlnaHQ6ICcgKyBTdHJpbmcoTWF0aC5tYXgoeSwgdGhpcy5fc2Nyb2xsX2JhcnMuY2xpZW50SGVpZ2h0KSkgKyAnOycpO1xufTtcblxuLyoqXG4gKiBUcmFuc2Zvcm0gYW4geCB2YWx1ZSBiYXNlZCBvbiBzY3JvbGwgcG9zaXRpb24uXG4gKiBAcGFyYW0gIHtmbG9hdH0geFxuICogQHJldHVybiB7ZmxvYXR9XG4gKi9cblNjcm9sbGluZ0NhbnZhcy5wcm90b3R5cGUuX3R4ID0gZnVuY3Rpb24oeCkgeyByZXR1cm4geCAtIHRoaXMuc2Nyb2xsX2xlZnQ7IH07XG5cbi8qKlxuICogVHJhbnNmb3JtIGEgeSB2YWx1ZSBiYXNlZCBvbiBzY3JvbGwgcG9zaXRpb24uXG4gKiBAcGFyYW0gIHtmbG9hdH0geVxuICogQHJldHVybiB7ZmxvYXR9XG4gKi9cblNjcm9sbGluZ0NhbnZhcy5wcm90b3R5cGUuX3R5ID0gZnVuY3Rpb24oeSkgeyByZXR1cm4geSAtIHRoaXMuc2Nyb2xsX3RvcDsgfTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5TY3JvbGxpbmdDYW52YXMgPSBTY3JvbGxpbmdDYW52YXM7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG4vKipcbkJhc2UgY2xhc3Mgd2l0aCBoZWxwZnVsIHV0aWxpdGllc1xuKi9cbnZhciBQb3N0ZXJDbGFzcyA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHRoaXMuX29uX2FsbCA9IFtdO1xufTtcblxuLyoqXG4gKiBEZWZpbmUgYSBwcm9wZXJ0eSBmb3IgdGhlIGNsYXNzXG4gKiBAcGFyYW0gIHtzdHJpbmd9IG5hbWVcbiAqIEBwYXJhbSAge2Z1bmN0aW9ufSBnZXR0ZXJcbiAqIEBwYXJhbSAge2Z1bmN0aW9ufSBzZXR0ZXJcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblBvc3RlckNsYXNzLnByb3RvdHlwZS5wcm9wZXJ0eSA9IGZ1bmN0aW9uKG5hbWUsIGdldHRlciwgc2V0dGVyKSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIG5hbWUsIHtcbiAgICAgICAgZ2V0OiBnZXR0ZXIsXG4gICAgICAgIHNldDogc2V0dGVyLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICB9KTtcbn07XG5cbi8qKlxuICogUmVnaXN0ZXIgYW4gZXZlbnQgbGlzdGVuZXJcbiAqIEBwYXJhbSAge3N0cmluZ30gZXZlbnRcbiAqIEBwYXJhbSAge2Z1bmN0aW9ufSBoYW5kbGVyXG4gKiBAcGFyYW0gIHtvYmplY3R9IGNvbnRleHRcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblBvc3RlckNsYXNzLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uKGV2ZW50LCBoYW5kbGVyLCBjb250ZXh0KSB7XG4gICAgZXZlbnQgPSBldmVudC50cmltKCkudG9Mb3dlckNhc2UoKTtcblxuICAgIC8vIE1ha2Ugc3VyZSBhIGxpc3QgZm9yIHRoZSBldmVudCBleGlzdHMuXG4gICAgaWYgKCF0aGlzLl9ldmVudHNbZXZlbnRdKSB7IHRoaXMuX2V2ZW50c1tldmVudF0gPSBbXTsgfVxuXG4gICAgLy8gUHVzaCB0aGUgaGFuZGxlciBhbmQgdGhlIGNvbnRleHQgdG8gdGhlIGV2ZW50J3MgY2FsbGJhY2sgbGlzdC5cbiAgICB0aGlzLl9ldmVudHNbZXZlbnRdLnB1c2goW2hhbmRsZXIsIGNvbnRleHRdKTtcbn07XG5cbi8qKlxuICogVW5yZWdpc3RlciBvbmUgb3IgYWxsIGV2ZW50IGxpc3RlbmVycyBmb3IgYSBzcGVjaWZpYyBldmVudFxuICogQHBhcmFtICB7c3RyaW5nfSBldmVudFxuICogQHBhcmFtICB7Y2FsbGJhY2t9IChvcHRpb25hbCkgaGFuZGxlclxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuUG9zdGVyQ2xhc3MucHJvdG90eXBlLm9mZiA9IGZ1bmN0aW9uKGV2ZW50LCBoYW5kbGVyKSB7XG4gICAgZXZlbnQgPSBldmVudC50cmltKCkudG9Mb3dlckNhc2UoKTtcbiAgICBcbiAgICAvLyBJZiBhIGhhbmRsZXIgaXMgc3BlY2lmaWVkLCByZW1vdmUgYWxsIHRoZSBjYWxsYmFja3NcbiAgICAvLyB3aXRoIHRoYXQgaGFuZGxlci4gIE90aGVyd2lzZSwganVzdCByZW1vdmUgYWxsIG9mXG4gICAgLy8gdGhlIHJlZ2lzdGVyZWQgY2FsbGJhY2tzLlxuICAgIGlmIChoYW5kbGVyKSB7XG4gICAgICAgIHRoaXMuX2V2ZW50c1tldmVudF0gPSB0aGlzLl9ldmVudHNbZXZlbnRdLmZpbHRlcihmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrWzBdICE9PSBoYW5kbGVyO1xuICAgICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9ldmVudHNbZXZlbnRdID0gW107XG4gICAgfVxufTtcblxuLyoqXG4gKiBSZWdpc3RlciBhIGdsb2JhbCBldmVudCBoYW5kbGVyLiBcbiAqIFxuICogQSBnbG9iYWwgZXZlbnQgaGFuZGxlciBmaXJlcyBmb3IgYW55IGV2ZW50IHRoYXQnc1xuICogdHJpZ2dlcmVkLlxuICogQHBhcmFtICB7c3RyaW5nfSBoYW5kbGVyIC0gZnVuY3Rpb24gdGhhdCBhY2NlcHRzIG9uZVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJndW1lbnQsIHRoZSBuYW1lIG9mIHRoZVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQsXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Qb3N0ZXJDbGFzcy5wcm90b3R5cGUub25fYWxsID0gZnVuY3Rpb24oaGFuZGxlcikge1xuICAgIHZhciBpbmRleCA9IHRoaXMuX29uX2FsbC5pbmRleE9mKGhhbmRsZXIpO1xuICAgIGlmIChpbmRleCA9PT0gLTEpIHtcbiAgICAgICAgdGhpcy5fb25fYWxsLnB1c2goaGFuZGxlcik7XG4gICAgfVxufTtcblxuLyoqXG4gKiBVbnJlZ2lzdGVyIGEgZ2xvYmFsIGV2ZW50IGhhbmRsZXIuXG4gKiBAcGFyYW0gIHtbdHlwZV19IGhhbmRsZXJcbiAqIEByZXR1cm4ge2Jvb2xlYW59IHRydWUgaWYgYSBoYW5kbGVyIHdhcyByZW1vdmVkXG4gKi9cblBvc3RlckNsYXNzLnByb3RvdHlwZS5vZmZfYWxsID0gZnVuY3Rpb24oaGFuZGxlcikge1xuICAgIHZhciBpbmRleCA9IHRoaXMuX29uX2FsbC5pbmRleE9mKGhhbmRsZXIpO1xuICAgIGlmIChpbmRleCAhPSAtMSkge1xuICAgICAgICB0aGlzLl9vbl9hbGwuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn07XG5cbi8qKlxuICogVHJpZ2dlcnMgdGhlIGNhbGxiYWNrcyBvZiBhbiBldmVudCB0byBmaXJlLlxuICogQHBhcmFtICB7c3RyaW5nfSBldmVudFxuICogQHJldHVybiB7YXJyYXl9IGFycmF5IG9mIHJldHVybiB2YWx1ZXNcbiAqL1xuUG9zdGVyQ2xhc3MucHJvdG90eXBlLnRyaWdnZXIgPSBmdW5jdGlvbihldmVudCkge1xuICAgIGV2ZW50ID0gZXZlbnQudHJpbSgpLnRvTG93ZXJDYXNlKCk7XG5cbiAgICAvLyBDb252ZXJ0IGFyZ3VtZW50cyB0byBhbiBhcnJheSBhbmQgY2FsbCBjYWxsYmFja3MuXG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgIGFyZ3Muc3BsaWNlKDAsMSk7XG5cbiAgICAvLyBUcmlnZ2VyIGdsb2JhbCBoYW5kbGVycyBmaXJzdC5cbiAgICB0aGlzLl9vbl9hbGwuZm9yRWFjaChmdW5jdGlvbihoYW5kbGVyKSB7XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgW2V2ZW50XS5jb25jYXQoYXJncykpO1xuICAgIH0pO1xuXG4gICAgLy8gVHJpZ2dlciBpbmRpdmlkdWFsIGhhbmRsZXJzIHNlY29uZC5cbiAgICB2YXIgZXZlbnRzID0gdGhpcy5fZXZlbnRzW2V2ZW50XTtcbiAgICBpZiAoZXZlbnRzKSB7XG4gICAgICAgIHZhciByZXR1cm5zID0gW107XG4gICAgICAgIGV2ZW50cy5mb3JFYWNoKGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICByZXR1cm5zLnB1c2goY2FsbGJhY2tbMF0uYXBwbHkoY2FsbGJhY2tbMV0sIGFyZ3MpKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiByZXR1cm5zO1xuICAgIH1cbiAgICByZXR1cm4gW107XG59O1xuXG4vKipcbiAqIENhdXNlIG9uZSBjbGFzcyB0byBpbmhlcml0IGZyb20gYW5vdGhlclxuICogQHBhcmFtICB7dHlwZX0gY2hpbGRcbiAqIEBwYXJhbSAge3R5cGV9IHBhcmVudFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xudmFyIGluaGVyaXQgPSBmdW5jdGlvbihjaGlsZCwgcGFyZW50KSB7XG4gICAgY2hpbGQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShwYXJlbnQucHJvdG90eXBlLCB7fSk7XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiBhIHZhbHVlIGlzIGNhbGxhYmxlXG4gKiBAcGFyYW0gIHthbnl9IHZhbHVlXG4gKiBAcmV0dXJuIHtib29sZWFufVxuICovXG52YXIgY2FsbGFibGUgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT0gJ2Z1bmN0aW9uJztcbn07XG5cbi8qKlxuICogQ2FsbHMgdGhlIHZhbHVlIGlmIGl0J3MgY2FsbGFibGUgYW5kIHJldHVybnMgaXQncyByZXR1cm4uXG4gKiBPdGhlcndpc2UgcmV0dXJucyB0aGUgdmFsdWUgYXMtaXMuXG4gKiBAcGFyYW0gIHthbnl9IHZhbHVlXG4gKiBAcmV0dXJuIHthbnl9XG4gKi9cbnZhciByZXNvbHZlX2NhbGxhYmxlID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICBpZiAoY2FsbGFibGUodmFsdWUpKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZS5jYWxsKHRoaXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG59O1xuXG4vKipcbiAqIENyZWF0ZXMgYSBwcm94eSB0byBhIGZ1bmN0aW9uIHNvIGl0IGlzIGNhbGxlZCBpbiB0aGUgY29ycmVjdCBjb250ZXh0LlxuICogQHJldHVybiB7ZnVuY3Rpb259IHByb3hpZWQgZnVuY3Rpb24uXG4gKi9cbnZhciBwcm94eSA9IGZ1bmN0aW9uKGYsIGNvbnRleHQpIHtcbiAgICBpZiAoZj09PXVuZGVmaW5lZCkgeyB0aHJvdyBuZXcgRXJyb3IoJ2YgY2Fubm90IGJlIHVuZGVmaW5lZCcpOyB9XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkgeyByZXR1cm4gZi5hcHBseShjb250ZXh0LCBhcmd1bWVudHMpOyB9O1xufTtcblxuLyoqXG4gKiBDbGVhcnMgYW4gYXJyYXkgaW4gcGxhY2UuXG4gKlxuICogRGVzcGl0ZSBhbiBPKE4pIGNvbXBsZXhpdHksIHRoaXMgc2VlbXMgdG8gYmUgdGhlIGZhc3Rlc3Qgd2F5IHRvIGNsZWFyXG4gKiBhIGxpc3QgaW4gcGxhY2UgaW4gSmF2YXNjcmlwdC4gXG4gKiBCZW5jaG1hcms6IGh0dHA6Ly9qc3BlcmYuY29tL2VtcHR5LWphdmFzY3JpcHQtYXJyYXlcbiAqIENvbXBsZXhpdHk6IE8oTilcbiAqIEBwYXJhbSAge2FycmF5fSBhcnJheVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xudmFyIGNsZWFyX2FycmF5ID0gZnVuY3Rpb24oYXJyYXkpIHtcbiAgICB3aGlsZSAoYXJyYXkubGVuZ3RoID4gMCkge1xuICAgICAgICBhcnJheS5wb3AoKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiBhIHZhbHVlIGlzIGFuIGFycmF5XG4gKiBAcGFyYW0gIHthbnl9IHhcbiAqIEByZXR1cm4ge2Jvb2xlYW59IHRydWUgaWYgdmFsdWUgaXMgYW4gYXJyYXlcbiAqL1xudmFyIGlzX2FycmF5ID0gZnVuY3Rpb24oeCkge1xuICAgIHJldHVybiB4IGluc3RhbmNlb2YgQXJyYXk7XG59O1xuXG4vKipcbiAqIEZpbmQgdGhlIGNsb3Nlc3QgdmFsdWUgaW4gYSBsaXN0XG4gKiBcbiAqIEludGVycG9sYXRpb24gc2VhcmNoIGFsZ29yaXRobS4gIFxuICogQ29tcGxleGl0eTogTyhsZyhsZyhOKSkpXG4gKiBAcGFyYW0gIHthcnJheX0gc29ydGVkIC0gc29ydGVkIGFycmF5IG9mIG51bWJlcnNcbiAqIEBwYXJhbSAge2Zsb2F0fSB4IC0gbnVtYmVyIHRvIHRyeSB0byBmaW5kXG4gKiBAcmV0dXJuIHtpbnRlZ2VyfSBpbmRleCBvZiB0aGUgdmFsdWUgdGhhdCdzIGNsb3Nlc3QgdG8geFxuICovXG52YXIgZmluZF9jbG9zZXN0ID0gZnVuY3Rpb24oc29ydGVkLCB4KSB7XG4gICAgdmFyIG1pbiA9IHNvcnRlZFswXTtcbiAgICB2YXIgbWF4ID0gc29ydGVkW3NvcnRlZC5sZW5ndGgtMV07XG4gICAgaWYgKHggPCBtaW4pIHJldHVybiAwO1xuICAgIGlmICh4ID4gbWF4KSByZXR1cm4gc29ydGVkLmxlbmd0aC0xO1xuICAgIGlmIChzb3J0ZWQubGVuZ3RoID09IDIpIHtcbiAgICAgICAgaWYgKG1heCAtIHggPiB4IC0gbWluKSB7XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9XG4gICAgfVxuICAgIHZhciByYXRlID0gKG1heCAtIG1pbikgLyBzb3J0ZWQubGVuZ3RoO1xuICAgIGlmIChyYXRlID09PSAwKSByZXR1cm4gMDtcbiAgICB2YXIgZ3Vlc3MgPSBNYXRoLmZsb29yKHggLyByYXRlKTtcbiAgICBpZiAoc29ydGVkW2d1ZXNzXSA9PSB4KSB7XG4gICAgICAgIHJldHVybiBndWVzcztcbiAgICB9IGVsc2UgaWYgKGd1ZXNzID4gMCAmJiBzb3J0ZWRbZ3Vlc3MtMV0gPCB4ICYmIHggPCBzb3J0ZWRbZ3Vlc3NdKSB7XG4gICAgICAgIHJldHVybiBmaW5kX2Nsb3Nlc3Qoc29ydGVkLnNsaWNlKGd1ZXNzLTEsIGd1ZXNzKzEpLCB4KSArIGd1ZXNzLTE7XG4gICAgfSBlbHNlIGlmIChndWVzcyA8IHNvcnRlZC5sZW5ndGgtMSAmJiBzb3J0ZWRbZ3Vlc3NdIDwgeCAmJiB4IDwgc29ydGVkW2d1ZXNzKzFdKSB7XG4gICAgICAgIHJldHVybiBmaW5kX2Nsb3Nlc3Qoc29ydGVkLnNsaWNlKGd1ZXNzLCBndWVzcysyKSwgeCkgKyBndWVzcztcbiAgICB9IGVsc2UgaWYgKHNvcnRlZFtndWVzc10gPiB4KSB7XG4gICAgICAgIHJldHVybiBmaW5kX2Nsb3Nlc3Qoc29ydGVkLnNsaWNlKDAsIGd1ZXNzKSwgeCk7XG4gICAgfSBlbHNlIGlmIChzb3J0ZWRbZ3Vlc3NdIDwgeCkge1xuICAgICAgICByZXR1cm4gZmluZF9jbG9zZXN0KHNvcnRlZC5zbGljZShndWVzcysxKSwgeCkgKyBndWVzcysxO1xuICAgIH1cbn07XG5cbi8qKlxuICogTWFrZSBhIHNoYWxsb3cgY29weSBvZiBhIGRpY3Rpb25hcnkuXG4gKiBAcGFyYW0gIHtkaWN0aW9uYXJ5fSB4XG4gKiBAcmV0dXJuIHtkaWN0aW9uYXJ5fVxuICovXG52YXIgc2hhbGxvd19jb3B5ID0gZnVuY3Rpb24oeCkge1xuICAgIHZhciB5ID0ge307XG4gICAgZm9yICh2YXIga2V5IGluIHgpIHtcbiAgICAgICAgaWYgKHguaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgeVtrZXldID0geFtrZXldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB5O1xufTtcblxuLyoqXG4gKiBIb29rcyBhIGZ1bmN0aW9uLlxuICogQHBhcmFtICB7b2JqZWN0fSBvYmogLSBvYmplY3QgdG8gaG9va1xuICogQHBhcmFtICB7c3RyaW5nfSBtZXRob2QgLSBuYW1lIG9mIHRoZSBmdW5jdGlvbiB0byBob29rXG4gKiBAcGFyYW0gIHtmdW5jdGlvbn0gaG9vayAtIGZ1bmN0aW9uIHRvIGNhbGwgYmVmb3JlIHRoZSBvcmlnaW5hbFxuICogQHJldHVybiB7b2JqZWN0fSBob29rIHJlZmVyZW5jZSwgb2JqZWN0IHdpdGggYW4gYHVuaG9va2AgbWV0aG9kXG4gKi9cbnZhciBob29rID0gZnVuY3Rpb24ob2JqLCBtZXRob2QsIGhvb2spIHtcblxuICAgIC8vIElmIHRoZSBvcmlnaW5hbCBoYXMgYWxyZWFkeSBiZWVuIGhvb2tlZCwgYWRkIHRoaXMgaG9vayB0byB0aGUgbGlzdCBcbiAgICAvLyBvZiBob29rcy5cbiAgICBpZiAob2JqW21ldGhvZF0gJiYgb2JqW21ldGhvZF0ub3JpZ2luYWwgJiYgb2JqW21ldGhvZF0uaG9va3MpIHtcbiAgICAgICAgb2JqW21ldGhvZF0uaG9va3MucHVzaChob29rKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBDcmVhdGUgdGhlIGhvb2tlZCBmdW5jdGlvblxuICAgICAgICB2YXIgaG9va3MgPSBbaG9va107XG4gICAgICAgIHZhciBvcmlnaW5hbCA9IG9ialttZXRob2RdO1xuICAgICAgICB2YXIgaG9va2VkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgICAgICAgIHZhciByZXQ7XG4gICAgICAgICAgICB2YXIgcmVzdWx0cztcbiAgICAgICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgICAgIGhvb2tzLmZvckVhY2goZnVuY3Rpb24oaG9vaykge1xuICAgICAgICAgICAgICAgIHJlc3VsdHMgPSBob29rLmFwcGx5KHRoYXQsIGFyZ3MpO1xuICAgICAgICAgICAgICAgIHJldCA9IHJldCAhPT0gdW5kZWZpbmVkID8gcmV0IDogcmVzdWx0cztcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKG9yaWdpbmFsKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0cyA9IG9yaWdpbmFsLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJldCAhPT0gdW5kZWZpbmVkID8gcmV0IDogcmVzdWx0cztcbiAgICAgICAgfTtcbiAgICAgICAgaG9va2VkLm9yaWdpbmFsID0gb3JpZ2luYWw7XG4gICAgICAgIGhvb2tlZC5ob29rcyA9IGhvb2tzO1xuICAgICAgICBvYmpbbWV0aG9kXSA9IGhvb2tlZDtcbiAgICB9XG5cbiAgICAvLyBSZXR1cm4gdW5ob29rIG1ldGhvZC5cbiAgICByZXR1cm4ge1xuICAgICAgICB1bmhvb2s6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGluZGV4ID0gb2JqW21ldGhvZF0uaG9va3MuaW5kZXhPZihob29rKTtcbiAgICAgICAgICAgIGlmIChpbmRleCAhPSAtMSkge1xuICAgICAgICAgICAgICAgIG9ialttZXRob2RdLmhvb2tzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChvYmpbbWV0aG9kXS5ob29rcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICBvYmpbbWV0aG9kXSA9IG9ialttZXRob2RdLm9yaWdpbmFsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgIH07XG4gICAgXG59O1xuXG4vKipcbiAqIENhbmNlbHMgZXZlbnQgYnViYmxpbmcuXG4gKiBAcGFyYW0gIHtldmVudH0gZVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xudmFyIGNhbmNlbF9idWJibGUgPSBmdW5jdGlvbihlKSB7XG4gICAgaWYgKGUuc3RvcFByb3BhZ2F0aW9uKSBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIGlmIChlLmNhbmNlbEJ1YmJsZSAhPT0gbnVsbCkgZS5jYW5jZWxCdWJibGUgPSB0cnVlO1xuICAgIGlmIChlLnByZXZlbnREZWZhdWx0KSBlLnByZXZlbnREZWZhdWx0KCk7XG59O1xuXG5cbi8vIEV4cG9ydCBuYW1lcy5cbmV4cG9ydHMuUG9zdGVyQ2xhc3MgPSBQb3N0ZXJDbGFzcztcbmV4cG9ydHMuaW5oZXJpdCA9IGluaGVyaXQ7XG5leHBvcnRzLmNhbGxhYmxlID0gY2FsbGFibGU7XG5leHBvcnRzLnJlc29sdmVfY2FsbGFibGUgPSByZXNvbHZlX2NhbGxhYmxlO1xuZXhwb3J0cy5wcm94eSA9IHByb3h5O1xuZXhwb3J0cy5jbGVhcl9hcnJheSA9IGNsZWFyX2FycmF5O1xuZXhwb3J0cy5pc19hcnJheSA9IGlzX2FycmF5O1xuZXhwb3J0cy5maW5kX2Nsb3Nlc3QgPSBmaW5kX2Nsb3Nlc3Q7XG5leHBvcnRzLnNoYWxsb3dfY29weSA9IHNoYWxsb3dfY29weTtcbmV4cG9ydHMuaG9vayA9IGhvb2s7XG5leHBvcnRzLmNhbmNlbF9idWJibGUgPSBjYW5jZWxfYnViYmxlO1xuIl19
