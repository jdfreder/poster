!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.poster=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var scrolling_canvas = require('./scrolling_canvas.js');
var document_controller = require('./document_controller.js');
var document_model = require('./document_model.js');
var document_view = require('./document_view.js');
var style = require('./style.js');
var utils = require('./utils.js');

/**
 * Canvas based text editor
 */
var Poster = function() {
    utils.PosterClass.call(this);

    // Create canvas
    this.canvas = new scrolling_canvas.ScrollingCanvas();
    this.el = this.canvas.el; // Convenience
    this._style = new style.Style();
    this._config = new utils.PosterClass(['highlight_draw']);

    // Create model, controller, and view.
    var that = this;
    this.model = new document_model.DocumentModel();
    this.controller = new document_controller.DocumentController(this.canvas.el, this.model);
    this.view = new document_view.DocumentView(
        this.canvas, 
        this.model, 
        this.controller.cursors, 
        this._style,
        this._config,
        function() { return that.controller.clipboard.hidden_input === document.activeElement || that.canvas.focused; }
    );

    // Create properties
    this.property('style', function() {
        return that._style;
    });
    this.property('config', function() {
        return that._config;
    });
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
    this.property('language', function() {
        return that.view.language;
    }, function(value) {
        that.view.language = value;
    });
};
utils.inherit(Poster, utils.PosterClass);

// Exports
exports.Poster = Poster;

},{"./document_controller.js":7,"./document_model.js":8,"./document_view.js":9,"./scrolling_canvas.js":25,"./style.js":26,"./utils.js":29}],2:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('./utils.js');

/**
 * Animation helper.
 */
var Animator = function(duration) {
    utils.PosterClass.call(this);
    this.duration = duration;
    this._start = Date.now();
};
utils.inherit(Animator, utils.PosterClass);

/**
 * Get the time in the animation
 * @return {float} between 0 and 1
 */
Animator.prototype.time = function() {
    var elapsed = Date.now() - this._start;
    return (elapsed % this.duration) / this.duration;
};

exports.Animator = Animator;
},{"./utils.js":29}],3:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var utils = require('./utils.js');

/**
 * HTML canvas with drawing convinience functions.
 */
var Canvas = function() {
    this._rendered_region = [null, null, null, null]; // x1,y1,x2,y2

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
        this._touch();
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
        this._touch();
    });

    /**
     * Region of the canvas that has been rendered to
     * @return {dictionary} dictionary describing a rectangle {x,y,width,height}
     */
    this.property('rendered_region', function() {
        return {
            x: this._tx(this._rendered_region[0], true),
            y: this._ty(this._rendered_region[1], true),
            width: this._rendered_region[2] - this._rendered_region[0],
            height: this._rendered_region[3] - this._rendered_region[1],
        };
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
    this._touch(x, y, x+width, y+height);
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
    this._touch(x-r, y-r, x+r, y+r);
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
    width = width || img.width;
    height = height || img.height;
    img = img._canvas ? img._canvas : img;
    this.context.drawImage(img, x, y, width, height);
    this._touch(x, y, this.width, this.height);
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
    this._touch(x1, y1, x2, y2);
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

        var minx = this.width;
        var miny = this.height;
        var maxx = 0;
        var maxy = 0;
        for (var i = 1; i < points.length; i++) {
            point = points[i];
            this.context.lineTo(this._tx(point[0]), this._ty(point[1]));

            minx = Math.min(this._tx(point[0]), minx);
            miny = Math.min(this._ty(point[1]), miny);
            maxx = Math.max(this._tx(point[0]), maxx);
            maxy = Math.max(this._ty(point[1]), maxy);
        }
        this._do_draw(options); 
        this._touch(minx, miny, maxx, maxy);   
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
    this._touch(x, y, this.width, this.height);
};

/**
 * Get's a chunk of the canvas as a raw image.
 * @param  {float} (optional) x
 * @param  {float} (optional) y
 * @param  {float} (optional) width
 * @param  {float} (optional) height
 * @return {image} canvas image data
 */
Canvas.prototype.get_raw_image = function(x, y, width, height) {
    console.warn('get_raw_image image is slow, use canvas references instead with draw_image');
    if (x===undefined) {
        x = 0;
    } else {
        x = this._tx(x);
    }
    if (y===undefined) {
        y = 0;
    } else {
        y = this._ty(y);
    }
    if (width === undefined) width = this.width;
    if (height === undefined) height = this.height;

    // Multiply by two for pixel doubling.
    x = 2 * x;
    y = 2 * y;
    width = 2 * width;
    height = 2 * height;
    
    // Update the cached image if it's not the requested one.
    var region = [x, y, width, height];
    if (!(this._cached_timestamp === this._modified && utils.compare_arrays(region, this._cached_region))) {
        this._cached_image = this.context.getImageData(x, y, width, height);
        this._cached_timestamp = this._modified;
        this._cached_region = region;
    }

    // Return the cached image.
    return this._cached_image;
};

/**
 * Put's a raw image on the canvas somewhere.
 * @param  {float} x
 * @param  {float} y
 * @return {image} canvas image data
 */
Canvas.prototype.put_raw_image = function(img, x, y) {
    console.warn('put_raw_image image is slow, use draw_image instead');
    x = this._tx(x);
    y = this._ty(y);
    // Multiply by two for pixel doubling.
    ret = this.context.putImageData(img, x*2, y*2);
    this._touch(x, y, this.width, this.height);
    return ret;
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
    this._touch();
};

/**
 * Scale the current drawing.
 * @param  {float} x
 * @param  {float} y
 * @return {null}  
 */
Canvas.prototype.scale = function(x, y) {
    this.context.scale(x, y);
    this._touch();
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
 * Update the timestamp that the canvas was modified and
 * the region that has contents rendered to it.
 * @return {null}
 */
Canvas.prototype._touch = function(x1, y1, x2, y2) {
    this._modified = Date.now();

    // Set the render region.
    var comparitor = function(old_value, new_value, comparison) {
        if (old_value === null || old_value === undefined || new_value === null || new_value === undefined) {
            return new_value;
        } else {
            return comparison.call(undefined, old_value, new_value);
        }
    };
    this._rendered_region[0] = comparitor(this._rendered_region[0], x1, Math.min);
    this._rendered_region[1] = comparitor(this._rendered_region[1], y1, Math.min);
    this._rendered_region[2] = comparitor(this._rendered_region[2], x2, Math.max);
    this._rendered_region[3] = comparitor(this._rendered_region[3], y2, Math.max);
};

/**
 * Transform an x value before rendering.
 * @param  {float} x
 * @param  {boolean} inverse - perform inverse transformation
 * @return {float}
 */
Canvas.prototype._tx = function(x, inverse) { return x; };

/**
 * Transform a y value before rendering.
 * @param  {float} y
 * @param  {boolean} inverse - perform inverse transformation
 * @return {float}
 */
Canvas.prototype._ty = function(y, inverse) { return y; };

// Exports
exports.Canvas = Canvas;

},{"./utils.js":29}],4:[function(require,module,exports){
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

},{"./utils.js":29}],5:[function(require,module,exports){
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
},{"./events/map.js":11,"./utils.js":29}],6:[function(require,module,exports){
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

},{"./cursor.js":5,"./events/map.js":11,"./utils.js":29}],7:[function(require,module,exports){
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

},{"./clipboard.js":4,"./cursors.js":6,"./events/default.js":10,"./events/map.js":11,"./events/normalizer.js":12,"./utils.js":29}],8:[function(require,module,exports){
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
},{"./utils.js":29}],9:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('./utils.js');

// Renderers
var batch = require('./renderers/batch.js');
var highlighted_row = require('./renderers/highlighted_row.js');
var cursors = require('./renderers/cursors.js');
var selections = require('./renderers/selections.js');
var color = require('./renderers/color.js');
var syntax_highlighter = require('./highlighters/syntax.js');

/**
 * Visual representation of a DocumentModel instance
 * @param {Canvas} canvas instance
 * @param {DocumentModel} model instance
 * @param {Cursors} cursors_model instance
 * @param {Style} style - describes rendering style
 * @param {PosterClass} config - user config
 * @param {function} has_focus - function that checks if the text area has focus
 */
var DocumentView = function(canvas, model, cursors_model, style, config, has_focus) {
    this._model = model;

    // Create child renderers.
    var row_renderer = new highlighted_row.HighlightedRowRenderer(model, canvas, style, config);
    var cursors_renderer = new cursors.CursorsRenderer(
        cursors_model, 
        style, 
        row_renderer,
        has_focus);
    var selections_renderer = new selections.SelectionsRenderer(
        cursors_model, 
        style, 
        row_renderer,
        has_focus);

    // Create the background renderer
    var color_renderer = new color.ColorRenderer();
    color_renderer.color = style.background || 'white';
    style.on('changed:style', function() { color_renderer.color = style.background; });

    // Create the document highlighter, which needs to know about the currently
    // rendered rows in order to know where to highlight.
    this.highlighter = new syntax_highlighter.SyntaxHighlighter(model, row_renderer);

    // Pass get_row_char into cursors.
    cursors_model.get_row_char = utils.proxy(row_renderer.get_row_char, row_renderer);

    // Call base constructor.
    batch.BatchRenderer.call(this, [
        color_renderer,
        row_renderer,
        selections_renderer,
        cursors_renderer,
    ], canvas);

    // Hookup render events.
    this._canvas.on('redraw', utils.proxy(this.render, this));
    this._model.on('changed', utils.proxy(canvas.redraw, canvas));

    // Create properties
    var that = this;
    this.property('language', function() {
        return that._language;
    }, function(value) {
        that.highlighter.load(value);
        that._language = value;
    });
};
utils.inherit(DocumentView, batch.BatchRenderer);

exports.DocumentView = DocumentView;
},{"./highlighters/syntax.js":14,"./renderers/batch.js":18,"./renderers/color.js":19,"./renderers/cursors.js":20,"./renderers/highlighted_row.js":21,"./renderers/selections.js":24,"./utils.js":29}],10:[function(require,module,exports){
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

},{"../utils.js":29}],12:[function(require,module,exports){
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

},{"../utils.js":29}],13:[function(require,module,exports){
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

},{"../utils.js":29}],14:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('../utils.js');
var highlighter = require('./highlighter.js');
var languages = require('./syntax/init.js');

/**
 * Listens to a model and highlights the text accordingly.
 * @param {DocumentModel} model
 */
var SyntaxHighlighter = function(model, row_renderer) {
    highlighter.HighlighterBase.call(this, model, row_renderer);

    // Look back and forward this many rows for contextually 
    // sensitive highlighting.
    this._row_padding = 5;

    this._groups = {};
    this._toplevel_groups = {}; // All groups with contained == false
    this._tags = {};
};
utils.inherit(SyntaxHighlighter, highlighter.HighlighterBase);

/**
 * Highlight the document
 * @return {null}
 */
SyntaxHighlighter.prototype.highlight = function(start_row, end_row) {
    // Get the first and last rows that should be highlighted.
    start_row = Math.max(0, start_row - this._row_padding);
    end_row = Math.min(this._model._rows.length - 1, end_row + this._row_padding);

    // Clear the old highlighting.
    this._model.clear_tags(start_row, end_row);
    
    // Get the text of the rows.
    var text = this._model.get_text(start_row, 0, end_row, this._model._rows[end_row].length);

    // Figure out where each group belongs.
    var highlights = []; // [start_index, end_index, group]
    var that = this;
    for (var group_name in this._toplevel_groups) {
        if (this._toplevel_groups.hasOwnProperty(group_name)) {
            var group = this._toplevel_groups[group_name];
            for (var i=0; i<group.length; i++) {
                highlights = highlights.concat(that._find_highlights(text, group_name, group[i]));
            }
        }
    }

    // Apply tags
    highlights.forEach(function(highlight) {

        // Translate group character indicies to row, char coordinates.
        var before_rows = text.substring(0, highlight[0]).split('\n');
        var group_start_row = start_row + before_rows.length - 1;
        var group_start_char = before_rows[before_rows.length - 1].length;
        var after_rows = text.substring(0, highlight[1] - 1).split('\n');
        var group_end_row = start_row + after_rows.length - 1;
        var group_end_char = after_rows[after_rows.length - 1].length;

        // Get applicable tag name.
        var tag = highlight[2];
        while (that._tags[tag]!==undefined) {
            tag = that._tags[tag];
        }

        // Apply tag.
        that._model.set_tag(group_start_row, group_start_char, group_end_row, group_end_char, 'syntax', tag.toLowerCase());
    });
};

/**
 * Find each part of text that needs to be highlighted.
 * @param  {string} text
 * @param  {group dictionary} group - group to look for in the text.
 * @param  {boolean} at_start - whether or not to only check the start.
 * @return {array} list containing items of the form [start_index, end_index, group]
 */
SyntaxHighlighter.prototype._find_highlights = function(text, group_name, group, at_start) {

    // Find instances. [start_index, end_index, group, (& optionally) inner_left, inner_right]
    found_groups = [];
    switch (group.type) {
        case 'keyword':
            group.keywords.forEach(function(keyword) {
                var index;
                while (text.indexOf(keyword, index) != -1) {
                    index = text.indexOf(keyword, index);
                    found_groups.push([index, index + keyword.length, group_name]);
                    index++;
                }
            });
            break;
        case 'match':
            utils.findall(text, group.regex.regex).forEach(function(found) {
                found_groups.push([found[0], found[1] + group.regex.delta, group_name]);
            });
            break;
        case 'region':
            var starts = utils.findall(text, group.start.regex);
            var skips = [];
            if (group.skip) {
                skips = utils.findall(text, group.skip.regex);
            }
            var ends = utils.findall(text, group.end.regex);

            // Remove ends that contact skips.
            ends = ends.filter(function(end) {
                for (var i = 0; i < skips.length; i++) {
                    var skip = skips[i];
                    if (!(end[0] >= skip[1] + group.skip.delta || end[1] < skip[0])) {
                        return false;
                    }
                }
                return true;
            });
            
            // Find matching ends for the starts, backwards.  This allows nesting 
            // to work properly.
            starts.reverse();
            starts.forEach(function(start) {
                var found = null;
                var end;
                for (var i = 0; i < ends.length; i++) {
                    end = ends[i];
                    if (end[0] > start[1]) {
                        found = i;
                        break;
                    }
                }

                if (found !== null) {
                    end = ends.splice(found, 1)[0];
                    found_groups.push([start[0] + group.start.delta, end[1], group_name, start[1], end[0] + group.end.delta]);
                }
            });

            // Un-reverse results.
            found_groups.reverse();
            break;
    }

    // If at start is specified, only match if the index is 0.
    if (at_start) {
        found_groups = found_groups.filter(function(found_group) {
            return found_group[0] === 0;
        });
    }

    // Find nexts if requested.  Make sure to remove space if skipspace is provided.
    // TODO.
    
    // Find contained if requested.
    var that = this;
    var sub_found = [];
    if (group.contains && group.contains.length > 0) {
        found_groups.forEach(function(found_group) {
            var left = found_group[0];
            var right = found_group[1];
            if (group.type=='region') {
                left = found_group[3];
                right = found_group[4];
            }
            subtext = text.substring(left, right);
            group.contains.forEach(function(contain) {
                var sub_group = that._groups[contain];
                if (sub_group) {
                    sub_group.forEach(function(sub_group_child) {
                        that._find_highlights(subtext, contain, sub_group_child).forEach(function(found) {
                            sub_found.push([found[0] + left, found[1] + left, found[2]]);
                        });
                    });
                }
            });
        });
    }
    return found_groups.concat(sub_found);
};

/**
 * Loads a syntax by language name.
 * @param  {string or dictionary} language
 * @return {boolean} success
 */
SyntaxHighlighter.prototype.load = function(language) {
    try {

        // Unload current language
        this._groups = {};
        this._toplevel_groups = {}; 
        this._tags = {};

        // See if the language is built-in
        if (languages.languages[language]) {
            language = languages.languages[language].language;
        }
        this._groups = language.groups;
        this._tags = language.tags;

        // Find all groups where contained == false
        var that = this;
        for (var group_name in this._groups) {
            if (this._groups.hasOwnProperty(group_name)) {
                this._groups[group_name].forEach(function(group) {
                    if (!group.contained) {
                        if (that._toplevel_groups[group_name] === undefined) {
                            that._toplevel_groups[group_name] = [];
                        }
                        that._toplevel_groups[group_name].push(group);
                    }
                });
            }
        }

        return true;
    } catch (e) {
        console.error('Error loading language', e);
        return false;
    }
};

// Exports
exports.SyntaxHighlighter = SyntaxHighlighter;

},{"../utils.js":29,"./highlighter.js":13,"./syntax/init.js":15}],15:[function(require,module,exports){
exports.languages = {
    "vb": require("./vb.js"),
    "javascript": require("./javascript.js"),
};

},{"./javascript.js":16,"./vb.js":17}],16:[function(require,module,exports){
/*
Syntax file autogenerated from VIM's "javascript.vim" file.
Use poster/tools/import_vim.py to import more syntax files from VIM.
*/
exports.language = {
    "groups": {
        "javaScriptStringS": [
            {
                "start": {
                    "regex": "'", 
                    "delta": 0
                }, 
                "contains": [
                    "javaScriptSpecial", 
                    "@htmlPreproc"
                ], 
                "end": {
                    "regex": "'\\|$", 
                    "delta": 0
                }, 
                "type": "region", 
                "skip": {
                    "regex": "\\\\\\\\\\|\\\\'", 
                    "delta": 0
                }
            }
        ], 
        "javaScriptSpecialCharacter": [
            {
                "regex": {
                    "regex": "'\\\\.'", 
                    "delta": 0
                }, 
                "nextgroup": null, 
                "contained": false, 
                "contains": [], 
                "type": "match"
            }
        ], 
        "javaScriptType": [
            {
                "keywords": [
                    "Array", 
                    "Boolean", 
                    "Date", 
                    "Function", 
                    "Number", 
                    "Object", 
                    "String", 
                    "RegExp"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }
        ], 
        "javaScriptBoolean": [
            {
                "keywords": [
                    "true", 
                    "false"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }
        ], 
        "javaScriptRegexpString": [
            {
                "start": {
                    "regex": "/[^/*]", 
                    "delta": -1
                }, 
                "contains": [
                    "@htmlPreproc"
                ], 
                "end": {
                    "regex": "/[gim]\\{0,2\\}\\s*[;.,)\\]}]", 
                    "delta": -1
                }, 
                "type": "region", 
                "skip": {
                    "regex": "\\\\\\\\\\|\\\\/", 
                    "delta": 0
                }
            }
        ], 
        "javaScriptCommentSkip": [
            {
                "regex": {
                    "regex": "^[ \\t]*\\*\\($\\|[ \\t]\\+\\)", 
                    "delta": 0
                }, 
                "nextgroup": null, 
                "contained": false, 
                "contains": [], 
                "type": "match"
            }
        ], 
        "javaScriptSpecial": [
            {
                "regex": {
                    "regex": "\\\\\\d\\d\\d\\|\\\\.", 
                    "delta": 0
                }, 
                "nextgroup": null, 
                "contained": false, 
                "contains": [], 
                "type": "match"
            }
        ], 
        "javaScriptStringD": [
            {
                "start": {
                    "regex": "\"", 
                    "delta": 0
                }, 
                "contains": [
                    "javaScriptSpecial", 
                    "@htmlPreproc"
                ], 
                "end": {
                    "regex": "\"\\|$", 
                    "delta": 0
                }, 
                "type": "region", 
                "skip": {
                    "regex": "\\\\\\\\\\|\\\\\"", 
                    "delta": 0
                }
            }
        ], 
        "javaScriptConditional": [
            {
                "keywords": [
                    "if", 
                    "else", 
                    "switch"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }
        ], 
        "javaScriptIdentifier": [
            {
                "keywords": [
                    "arguments", 
                    "this", 
                    "var", 
                    "let"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }
        ], 
        "javaScriptLabel": [
            {
                "keywords": [
                    "case", 
                    "default"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }
        ], 
        "javaScriptLineComment": [
            {
                "regex": {
                    "regex": "//.*", 
                    "delta": 0
                }, 
                "nextgroup": null, 
                "contained": false, 
                "contains": [
                    "@Spell", 
                    "javaScriptCommentTodo"
                ], 
                "type": "match"
            }
        ], 
        "javaScriptRepeat": [
            {
                "keywords": [
                    "while", 
                    "for", 
                    "do", 
                    "in"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }
        ], 
        "javaScriptBraces": [
            {
                "regex": {
                    "regex": "[{}\\[\\]]", 
                    "delta": 0
                }, 
                "nextgroup": null, 
                "contained": false, 
                "contains": [], 
                "type": "match"
            }
        ], 
        "javaScriptOperator": [
            {
                "keywords": [
                    "new", 
                    "delete", 
                    "instanceof", 
                    "typeof"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }
        ], 
        "javaScriptGlobal": [
            {
                "keywords": [
                    "self", 
                    "window", 
                    "top", 
                    "parent"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }
        ], 
        "javaScriptBranch": [
            {
                "keywords": [
                    "break", 
                    "continue"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }
        ], 
        "javaScriptComment": [
            {
                "start": {
                    "regex": "/\\*", 
                    "delta": 0
                }, 
                "contains": [
                    "@Spell", 
                    "javaScriptCommentTodo"
                ], 
                "end": {
                    "regex": "\\*/", 
                    "delta": 0
                }, 
                "type": "region", 
                "skip": null
            }
        ], 
        "javaScriptException": [
            {
                "keywords": [
                    "try", 
                    "catch", 
                    "finally", 
                    "throw"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }
        ], 
        "javaScriptNull": [
            {
                "keywords": [
                    "null", 
                    "undefined"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }
        ], 
        "javaScriptMember": [
            {
                "keywords": [
                    "document", 
                    "event", 
                    "location"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }
        ], 
        "javaScriptCommentTodo": [
            {
                "keywords": [
                    "TODO", 
                    "FIXME", 
                    "XXX", 
                    "TBD"
                ], 
                "skipwhite": false, 
                "contained": true, 
                "type": "keyword", 
                "nextgroup": null
            }
        ], 
        "javaScriptFunction": [
            {
                "regex": {
                    "regex": "\\<function\\>", 
                    "delta": 0
                }, 
                "nextgroup": null, 
                "contained": false, 
                "contains": [], 
                "type": "match"
            }, 
            {
                "keywords": [
                    "function"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }
        ], 
        "javaScriptFunctionFold": [
            {
                "start": {
                    "regex": "\\<function\\>.*[^};]$", 
                    "delta": 0
                }, 
                "contains": [], 
                "end": {
                    "regex": "^\\z1}.*$", 
                    "delta": 0
                }, 
                "type": "region", 
                "skip": null
            }
        ], 
        "javaScriptStatement": [
            {
                "keywords": [
                    "return", 
                    "with"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }
        ], 
        "javaScriptParens": [
            {
                "regex": {
                    "regex": "[()]", 
                    "delta": 0
                }, 
                "nextgroup": null, 
                "contained": false, 
                "contains": [], 
                "type": "match"
            }
        ], 
        "javaScriptMessage": [
            {
                "keywords": [
                    "alert", 
                    "confirm", 
                    "prompt", 
                    "status"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }
        ], 
        "javaScriptReserved": [
            {
                "keywords": [
                    "abstract", 
                    "boolean", 
                    "byte", 
                    "char", 
                    "class", 
                    "const", 
                    "debugger", 
                    "double", 
                    "enum", 
                    "export", 
                    "extends", 
                    "final", 
                    "float", 
                    "goto", 
                    "implements", 
                    "import", 
                    "int", 
                    "interface", 
                    "long", 
                    "native", 
                    "package", 
                    "private", 
                    "protected", 
                    "public", 
                    "short", 
                    "static", 
                    "super", 
                    "synchronized", 
                    "throws", 
                    "transient", 
                    "volatile"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }
        ], 
        "javaScriptNumber": [
            {
                "regex": {
                    "regex": "-\\=\\<\\d\\+L\\=\\>\\|0[xX][0-9a-fA-F]\\+\\>", 
                    "delta": 0
                }, 
                "nextgroup": null, 
                "contained": false, 
                "contains": [], 
                "type": "match"
            }
        ], 
        "javaScriptDeprecated": [
            {
                "keywords": [
                    "escape", 
                    "unescape"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }
        ]
    }, 
    "tags": {
        "javaScrParenError": "javaScriptError", 
        "javaScriptStringS": "String", 
        "javaScriptConditional": "Conditional", 
        "javaScriptType": "Type", 
        "javaScriptBoolean": "Boolean", 
        "javaScriptRegexpString": "String", 
        "javaScriptNull": "Keyword", 
        "javaScriptSpecial": "Special", 
        "javaScriptStringD": "String", 
        "javaScriptError": "Error", 
        "javaScriptIdentifier": "Identifier", 
        "javaScriptSpecialCharacter": "javaScriptSpecial", 
        "javaScriptLabel": "Label", 
        "javaScriptLineComment": "Comment", 
        "javaScriptRepeat": "Repeat", 
        "javaScriptBraces": "Function", 
        "javaScriptOperator": "Operator", 
        "javaScriptGlobal": "Keyword", 
        "javaScriptBranch": "Conditional", 
        "javaScriptComment": "Comment", 
        "javaScriptCharacter": "Character", 
        "javaScriptException": "Exception", 
        "javaScriptMember": "Keyword", 
        "javaScriptCommentTodo": "Todo", 
        "javaScriptConstant": "Label", 
        "javaScriptDebug": "Debug", 
        "javaScriptFunction": "Function", 
        "javaScriptStatement": "Statement", 
        "javaScriptMessage": "Keyword", 
        "javaScriptReserved": "Keyword", 
        "javaScriptNumber": "javaScriptValue", 
        "javaScriptDeprecated": "Exception"
    }
};
},{}],17:[function(require,module,exports){
/*
Syntax file autogenerated from VIM's "vb.vim" file.
Use poster/tools/import_vim.py to import more syntax files from VIM.
*/
exports = {
    "groups": {
        "vbFunction": [
            {
                "keywords": [
                    "Abs", 
                    "Array", 
                    "Asc", 
                    "AscB", 
                    "AscW", 
                    "Atn", 
                    "Avg", 
                    "BOF", 
                    "CBool", 
                    "CByte"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "CCur", 
                    "CDate", 
                    "CDbl", 
                    "CInt", 
                    "CLng", 
                    "CSng", 
                    "CStr", 
                    "CVDate", 
                    "CVErr"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "CVar", 
                    "CallByName", 
                    "Cdec", 
                    "Choose", 
                    "Chr", 
                    "ChrB", 
                    "ChrW", 
                    "Command"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "Cos", 
                    "Count", 
                    "CreateObject", 
                    "CurDir", 
                    "DDB", 
                    "Date", 
                    "DateAdd"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "DateDiff", 
                    "DatePart", 
                    "DateSerial", 
                    "DateValue", 
                    "Day", 
                    "Dir"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "DoEvents", 
                    "EOF", 
                    "Environ", 
                    "Error", 
                    "Exp", 
                    "FV", 
                    "FileAttr"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "FileDateTime", 
                    "FileLen", 
                    "FilterFix", 
                    "Fix", 
                    "Format"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "FormatCurrency", 
                    "FormatDateTime", 
                    "FormatNumber"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "FormatPercent", 
                    "FreeFile", 
                    "GetAllStrings", 
                    "GetAttr"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "GetAutoServerSettings", 
                    "GetObject", 
                    "GetSetting", 
                    "Hex"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "Hour", 
                    "IIf", 
                    "IMEStatus", 
                    "IPmt", 
                    "InStr", 
                    "Input", 
                    "InputB"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "InputBox", 
                    "InstrB", 
                    "Int", 
                    "IsArray", 
                    "IsDate", 
                    "IsEmpty", 
                    "IsError"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "IsMissing", 
                    "IsNull", 
                    "IsNumeric", 
                    "IsObject", 
                    "Join", 
                    "LBound"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "LCase", 
                    "LOF", 
                    "LTrim", 
                    "Left", 
                    "LeftB", 
                    "Len", 
                    "LenB", 
                    "LoadPicture"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "LoadResData", 
                    "LoadResPicture", 
                    "LoadResString", 
                    "Loc", 
                    "Log"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "MIRR", 
                    "Max", 
                    "Mid", 
                    "MidB", 
                    "Min", 
                    "Minute", 
                    "Month", 
                    "MonthName"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "MsgBox", 
                    "NPV", 
                    "NPer", 
                    "Now", 
                    "Oct", 
                    "PPmt", 
                    "PV", 
                    "Partition", 
                    "Pmt"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "QBColor", 
                    "RGB", 
                    "RTrim", 
                    "Rate", 
                    "Replace", 
                    "Right", 
                    "RightB", 
                    "Rnd"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "Round", 
                    "SLN", 
                    "SYD", 
                    "Second", 
                    "Seek", 
                    "Sgn", 
                    "Shell", 
                    "Sin", 
                    "Space", 
                    "Spc"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "Split", 
                    "Sqr", 
                    "StDev", 
                    "StDevP", 
                    "Str", 
                    "StrComp", 
                    "StrConv"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "StrReverse", 
                    "String", 
                    "Sum", 
                    "Switch", 
                    "Tab", 
                    "Tan", 
                    "Time"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "TimeSerial", 
                    "TimeValue", 
                    "Timer", 
                    "Trim", 
                    "TypeName", 
                    "UBound"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "UCase", 
                    "Val", 
                    "Var", 
                    "VarP", 
                    "VarType", 
                    "Weekday", 
                    "WeekdayName"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "Year"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }
        ], 
        "vbNumber": [
            {
                "regex": {
                    "regex": "\\<\\d\\+\\>", 
                    "delta": 0
                }, 
                "nextgroup": null, 
                "contained": false, 
                "contains": [], 
                "type": "match"
            }, 
            {
                "regex": {
                    "regex": "\\<\\d\\+\\.\\d*\\>", 
                    "delta": 0
                }, 
                "nextgroup": null, 
                "contained": false, 
                "contains": [], 
                "type": "match"
            }, 
            {
                "regex": {
                    "regex": "\\.\\d\\+\\>", 
                    "delta": 0
                }, 
                "nextgroup": null, 
                "contained": false, 
                "contains": [], 
                "type": "match"
            }
        ], 
        "vbString": [
            {
                "start": {
                    "regex": "\"", 
                    "delta": 0
                }, 
                "contains": [], 
                "end": {
                    "regex": "\"\\|$", 
                    "delta": 0
                }, 
                "type": "region", 
                "skip": null
            }
        ], 
        "vbConst": [
            {
                "keywords": [
                    "Null", 
                    "Nothing"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }
        ], 
        "vbLineNumber": [
            {
                "regex": {
                    "regex": "^\\d\\+\\(\\s\\|$\\)", 
                    "delta": 0
                }, 
                "nextgroup": null, 
                "contained": false, 
                "contains": [], 
                "type": "match"
            }
        ], 
        "vbKeyword": [
            {
                "keywords": [
                    "As", 
                    "Binary", 
                    "ByRef", 
                    "ByVal", 
                    "Date", 
                    "Empty", 
                    "Error", 
                    "Friend", 
                    "Get"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "Input", 
                    "Is", 
                    "Len", 
                    "Lock", 
                    "Me", 
                    "Mid", 
                    "New", 
                    "Nothing", 
                    "Null", 
                    "On"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "Option", 
                    "Optional", 
                    "ParamArray", 
                    "Print", 
                    "Private", 
                    "Property"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "Public", 
                    "PublicNotCreateable", 
                    "OnNewProcessSingleUse"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "InSameProcessMultiUse", 
                    "GlobalMultiUse", 
                    "Resume", 
                    "Seek"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "Set", 
                    "Static", 
                    "Step", 
                    "String", 
                    "Time", 
                    "WithEvents"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }
        ], 
        "vbFloat": [
            {
                "regex": {
                    "regex": "[-+]\\=\\<\\d\\+[eE][\\-+]\\=\\d\\+", 
                    "delta": 0
                }, 
                "nextgroup": null, 
                "contained": false, 
                "contains": [], 
                "type": "match"
            }, 
            {
                "regex": {
                    "regex": "[-+]\\=\\<\\d\\+\\.\\d*\\([eE][\\-+]\\=\\d\\+\\)\\=", 
                    "delta": 0
                }, 
                "nextgroup": null, 
                "contained": false, 
                "contains": [], 
                "type": "match"
            }, 
            {
                "regex": {
                    "regex": "[-+]\\=\\<\\.\\d\\+\\([eE][\\-+]\\=\\d\\+\\)\\=", 
                    "delta": 0
                }, 
                "nextgroup": null, 
                "contained": false, 
                "contains": [], 
                "type": "match"
            }
        ], 
        "vbMethods": [
            {
                "keywords": [
                    "AboutBox", 
                    "Accept", 
                    "Activate", 
                    "Add", 
                    "AddCustom", 
                    "AddFile"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "AddFromFile", 
                    "AddFromGuid", 
                    "AddFromString"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "AddFromTemplate", 
                    "AddItem", 
                    "AddNew", 
                    "AddToAddInToolbar"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "AddToolboxProgID", 
                    "Append", 
                    "AppendAppendChunk"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "AppendChunk", 
                    "Arrange", 
                    "Assert", 
                    "AsyncRead", 
                    "BatchUpdate"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "BeginQueryEdit", 
                    "BeginTrans", 
                    "Bind", 
                    "BuildPath"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "CanPropertyChange", 
                    "Cancel", 
                    "CancelAsyncRead"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "CancelBatch", 
                    "CancelUpdate", 
                    "CaptureImage", 
                    "CellText"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "CellValue", 
                    "Circle", 
                    "Clear", 
                    "ClearFields", 
                    "ClearSel"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "ClearSelCols", 
                    "ClearStructure", 
                    "Clone", 
                    "Close", 
                    "Cls"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "ColContaining", 
                    "CollapseAll", 
                    "ColumnSize", 
                    "CommitTrans"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "CompactDatabase", 
                    "Compose", 
                    "Connect", 
                    "Copy", 
                    "CopyFile"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "CopyFolder", 
                    "CopyQueryDef", 
                    "Count", 
                    "CreateDatabase"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "CreateDragImage", 
                    "CreateEmbed", 
                    "CreateField"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "CreateFolder", 
                    "CreateGroup", 
                    "CreateIndex", 
                    "CreateLink"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "CreatePreparedStatement", 
                    "CreatePropery", 
                    "CreateQuery"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "CreateQueryDef", 
                    "CreateRelation", 
                    "CreateTableDef"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "CreateTextFile", 
                    "CreateToolWindow", 
                    "CreateUser"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "CreateWorkspace", 
                    "Customize", 
                    "Cut", 
                    "Delete"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "DeleteColumnLabels", 
                    "DeleteColumns", 
                    "DeleteFile"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "DeleteFolder", 
                    "DeleteLines", 
                    "DeleteRowLabels"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "DeleteRows", 
                    "DeselectAll", 
                    "DesignerWindow", 
                    "DoVerb", 
                    "Drag"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "Draw", 
                    "DriveExists", 
                    "Edit", 
                    "EditCopy", 
                    "EditPaste", 
                    "EndDoc"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "EnsureVisible", 
                    "EstablishConnection", 
                    "Execute", 
                    "Exists"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "Expand", 
                    "Export", 
                    "ExportReport", 
                    "ExtractIcon", 
                    "Fetch"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "FetchVerbs", 
                    "FileExists", 
                    "Files", 
                    "FillCache", 
                    "Find"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "FindFirst", 
                    "FindItem", 
                    "FindLast", 
                    "FindNext", 
                    "FindPrevious"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "FolderExists", 
                    "Forward", 
                    "GetAbsolutePathName"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "GetBaseName", 
                    "GetBookmark", 
                    "GetChunk", 
                    "GetClipString"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "GetData", 
                    "GetDrive", 
                    "GetDriveName", 
                    "GetFile", 
                    "GetFileName"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "GetFirstVisible", 
                    "GetFolder", 
                    "GetFormat", 
                    "GetHeader"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "GetLineFromChar", 
                    "GetNumTicks", 
                    "GetParentFolderName"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "GetRows", 
                    "GetSelectedPart", 
                    "GetSelection"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "GetSpecialFolder", 
                    "GetTempName", 
                    "GetText"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "GetVisibleCount", 
                    "GoBack", 
                    "GoForward", 
                    "Hide", 
                    "HitTest"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "HoldFields", 
                    "Idle", 
                    "Import", 
                    "InitializeLabels", 
                    "Insert"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "InsertColumnLabels", 
                    "InsertColumns", 
                    "InsertFile"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "InsertLines", 
                    "InsertObjDlg", 
                    "InsertRowLabels"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "InsertRows", 
                    "Item", 
                    "Keys", 
                    "KillDoc", 
                    "Layout", 
                    "Line", 
                    "Lines"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "LinkExecute", 
                    "LinkPoke", 
                    "LinkRequest", 
                    "LinkSend", 
                    "Listen"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "LoadFile", 
                    "LoadResData", 
                    "LoadResPicture", 
                    "LoadResString"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "LogEvent", 
                    "MakeCompileFile", 
                    "MakeCompiledFile"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "MakeReplica", 
                    "MoreResults", 
                    "Move", 
                    "MoveData", 
                    "MoveFile"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "MoveFirst", 
                    "MoveFolder", 
                    "MoveLast", 
                    "MoveNext"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "MovePrevious", 
                    "NavigateTo", 
                    "NewPage", 
                    "NewPassword"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "NextRecordset", 
                    "OLEDrag", 
                    "OnAddinsUpdate", 
                    "OnConnection"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "OnDisconnection", 
                    "OnStartupComplete", 
                    "Open"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "OpenAsTextStream", 
                    "OpenConnection", 
                    "OpenDatabase"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "OpenQueryDef", 
                    "OpenRecordset", 
                    "OpenResultset", 
                    "OpenURL"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "Overlay", 
                    "PSet", 
                    "PaintPicture", 
                    "PastSpecialDlg", 
                    "Paste"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "PeekData", 
                    "Play", 
                    "Point", 
                    "PopulatePartial", 
                    "PopupMenu"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "Print", 
                    "PrintForm", 
                    "PrintReport", 
                    "PropertyChanged", 
                    "Quit"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "Raise", 
                    "RandomDataFill", 
                    "RandomFillColumns"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "RandomFillRows", 
                    "ReFill", 
                    "Read", 
                    "ReadAll", 
                    "ReadFromFile"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "ReadLine", 
                    "ReadProperty", 
                    "Rebind", 
                    "Refresh", 
                    "RefreshLink"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "RegisterDatabase", 
                    "ReleaseInstance", 
                    "Reload", 
                    "Remove"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "RemoveAddInFromToolbar", 
                    "RemoveAll", 
                    "RemoveItem", 
                    "Render"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "RepairDatabase", 
                    "ReplaceLine", 
                    "Reply", 
                    "ReplyAll", 
                    "Requery"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "ResetCustom", 
                    "ResetCustomLabel", 
                    "ResolveName"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "RestoreToolbar", 
                    "Resync", 
                    "Rollback", 
                    "RollbackTrans"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "RowBookmark", 
                    "RowContaining", 
                    "RowTop", 
                    "Save", 
                    "SaveAs"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "SaveFile", 
                    "SaveToFile", 
                    "SaveToOle1File", 
                    "SaveToolbar"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "Scale", 
                    "ScaleX", 
                    "ScaleY", 
                    "Scroll", 
                    "SelPrint", 
                    "SelectAll"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "SelectPart", 
                    "Send", 
                    "SendData", 
                    "Set", 
                    "SetAutoServerSettings"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "SetData", 
                    "SetFocus", 
                    "SetOption", 
                    "SetSelection", 
                    "SetSize"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "SetText", 
                    "SetViewport", 
                    "Show", 
                    "ShowColor", 
                    "ShowFont"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "ShowHelp", 
                    "ShowOpen", 
                    "ShowPrinter", 
                    "ShowSave"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "ShowWhatsThis", 
                    "SignOff", 
                    "SignOn", 
                    "Size", 
                    "Skip", 
                    "SkipLine"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "Span", 
                    "Split", 
                    "SplitContaining", 
                    "StartLabelEdit"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "StartLogging", 
                    "Stop", 
                    "Synchronize", 
                    "Tag", 
                    "TextHeight"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "TextWidth", 
                    "ToDefaults", 
                    "Trace", 
                    "TwipsToChartPart"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "TypeByChartType", 
                    "URLFor", 
                    "Update", 
                    "UpdateControls"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "UpdateRecord", 
                    "UpdateRow", 
                    "Upto", 
                    "ValidateControls", 
                    "Value"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "WhatsThisMode", 
                    "Write", 
                    "WriteBlankLines", 
                    "WriteLine"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "WriteProperty", 
                    "WriteTemplate", 
                    "ZOrder"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "rdoCreateEnvironment", 
                    "rdoRegisterDataSource"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }
        ], 
        "vbRepeat": [
            {
                "keywords": [
                    "Do", 
                    "For", 
                    "ForEach", 
                    "Loop", 
                    "Next"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "Step", 
                    "To", 
                    "Until", 
                    "Wend", 
                    "While"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }
        ], 
        "vbComment": [
            {
                "start": {
                    "regex": "\\(^\\|\\s\\)REM\\s", 
                    "delta": 0
                }, 
                "contains": [
                    "vbTodo"
                ], 
                "end": {
                    "regex": "$", 
                    "delta": 0
                }, 
                "type": "region", 
                "skip": null
            }, 
            {
                "start": {
                    "regex": "\\(^\\|\\s\\)\\'", 
                    "delta": 0
                }, 
                "contains": [
                    "vbTodo"
                ], 
                "end": {
                    "regex": "$", 
                    "delta": 0
                }, 
                "type": "region", 
                "skip": null
            }
        ], 
        "vbConditional": [
            {
                "keywords": [
                    "If", 
                    "Then", 
                    "ElseIf", 
                    "Else", 
                    "Select", 
                    "Case"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }
        ], 
        "vbDefine": [
            {
                "keywords": [
                    "dbBigInt", 
                    "dbBinary", 
                    "dbBoolean", 
                    "dbByte", 
                    "dbChar"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "dbCurrency", 
                    "dbDate", 
                    "dbDecimal", 
                    "dbDouble", 
                    "dbFloat"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "dbGUID", 
                    "dbInteger", 
                    "dbLong", 
                    "dbLongBinary", 
                    "dbMemo"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "dbNumeric", 
                    "dbSingle", 
                    "dbText", 
                    "dbTime", 
                    "dbTimeStamp"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "dbVarBinary"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vb3DDKShadow", 
                    "vb3DFace", 
                    "vb3DHighlight", 
                    "vb3DLight"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vb3DShadow", 
                    "vbAbort", 
                    "vbAbortRetryIgnore"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbActiveBorder", 
                    "vbActiveTitleBar", 
                    "vbAlias"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbApplicationModal", 
                    "vbApplicationWorkspace"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbAppTaskManager", 
                    "vbAppWindows", 
                    "vbArchive", 
                    "vbArray"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbBack", 
                    "vbBinaryCompare", 
                    "vbBlack", 
                    "vbBlue", 
                    "vbBoolean"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbButtonFace", 
                    "vbButtonShadow", 
                    "vbButtonText", 
                    "vbByte"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbCalGreg", 
                    "vbCalHijri", 
                    "vbCancel", 
                    "vbCr", 
                    "vbCritical"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbCrLf", 
                    "vbCurrency", 
                    "vbCyan", 
                    "vbDatabaseCompare"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbDataObject", 
                    "vbDate", 
                    "vbDecimal", 
                    "vbDefaultButton1"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbDefaultButton2", 
                    "vbDefaultButton3", 
                    "vbDefaultButton4"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbDesktop", 
                    "vbDirectory", 
                    "vbDouble", 
                    "vbEmpty", 
                    "vbError"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbExclamation", 
                    "vbFirstFourDays", 
                    "vbFirstFullWeek"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbFirstJan1", 
                    "vbFormCode", 
                    "vbFormControlMenu"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbFormFeed", 
                    "vbFormMDIForm", 
                    "vbFriday", 
                    "vbFromUnicode"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbGrayText", 
                    "vbGreen", 
                    "vbHidden", 
                    "vbHide", 
                    "vbHighlight"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbHighlightText", 
                    "vbHiragana", 
                    "vbIgnore", 
                    "vbIMEAlphaDbl"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbIMEAlphaSng", 
                    "vbIMEDisable", 
                    "vbIMEHiragana"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbIMEKatakanaDbl", 
                    "vbIMEKatakanaSng", 
                    "vbIMEModeAlpha"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbIMEModeAlphaFull", 
                    "vbIMEModeDisable"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbIMEModeHangul", 
                    "vbIMEModeHangulFull"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbIMEModeHiragana", 
                    "vbIMEModeKatakana"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbIMEModeKatakanaHalf", 
                    "vbIMEModeNoControl"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbIMEModeOff", 
                    "vbIMEModeOn", 
                    "vbIMENoOp", 
                    "vbIMEOff"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbIMEOn", 
                    "vbInactiveBorder", 
                    "vbInactiveCaptionText"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbInactiveTitleBar", 
                    "vbInfoBackground", 
                    "vbInformation"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbInfoText", 
                    "vbInteger", 
                    "vbKatakana", 
                    "vbKey0", 
                    "vbKey1"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbKey2", 
                    "vbKey3", 
                    "vbKey4", 
                    "vbKey5", 
                    "vbKey6", 
                    "vbKey7", 
                    "vbKey8"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbKey9", 
                    "vbKeyA", 
                    "vbKeyAdd", 
                    "vbKeyB", 
                    "vbKeyBack", 
                    "vbKeyC"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbKeyCancel", 
                    "vbKeyCapital", 
                    "vbKeyClear", 
                    "vbKeyControl"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbKeyD", 
                    "vbKeyDecimal", 
                    "vbKeyDelete", 
                    "vbKeyDivide"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbKeyDown", 
                    "vbKeyE", 
                    "vbKeyEnd", 
                    "vbKeyEscape", 
                    "vbKeyExecute"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbKeyF", 
                    "vbKeyF1", 
                    "vbKeyF10", 
                    "vbKeyF11", 
                    "vbKeyF12", 
                    "vbKeyF13"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbKeyF14", 
                    "vbKeyF15", 
                    "vbKeyF16", 
                    "vbKeyF2", 
                    "vbKeyF3", 
                    "vbKeyF4"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbKeyF5", 
                    "vbKeyF6", 
                    "vbKeyF7", 
                    "vbKeyF8", 
                    "vbKeyF9", 
                    "vbKeyG"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbKeyH", 
                    "vbKeyHelp", 
                    "vbKeyHome", 
                    "vbKeyI", 
                    "vbKeyInsert"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbKeyJ", 
                    "vbKeyK", 
                    "vbKeyL", 
                    "vbKeyLButton", 
                    "vbKeyLeft", 
                    "vbKeyM"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbKeyMButton", 
                    "vbKeyMenu", 
                    "vbKeyMultiply", 
                    "vbKeyN"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbKeyNumlock", 
                    "vbKeyNumpad0", 
                    "vbKeyNumpad1"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbKeyNumpad2", 
                    "vbKeyNumpad3", 
                    "vbKeyNumpad4"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbKeyNumpad5", 
                    "vbKeyNumpad6", 
                    "vbKeyNumpad7"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbKeyNumpad8", 
                    "vbKeyNumpad9", 
                    "vbKeyO", 
                    "vbKeyP"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbKeyPageDown", 
                    "vbKeyPageUp", 
                    "vbKeyPause", 
                    "vbKeyPrint"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbKeyQ", 
                    "vbKeyR", 
                    "vbKeyRButton", 
                    "vbKeyReturn", 
                    "vbKeyRight"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbKeyS", 
                    "vbKeySelect", 
                    "vbKeySeparator", 
                    "vbKeyShift"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbKeySnapshot", 
                    "vbKeySpace", 
                    "vbKeySubtract", 
                    "vbKeyT"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbKeyTab", 
                    "vbKeyU", 
                    "vbKeyUp", 
                    "vbKeyV", 
                    "vbKeyW", 
                    "vbKeyX"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbKeyY", 
                    "vbKeyZ", 
                    "vbLf", 
                    "vbLong", 
                    "vbLowerCase", 
                    "vbMagenta"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbMaximizedFocus", 
                    "vbMenuBar", 
                    "vbMenuText"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbMinimizedFocus", 
                    "vbMinimizedNoFocus", 
                    "vbMonday"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbMsgBox", 
                    "vbMsgBoxHelpButton", 
                    "vbMsgBoxRight"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbMsgBoxRtlReading", 
                    "vbMsgBoxSetForeground"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbMsgBoxText", 
                    "vbNarrow", 
                    "vbNewLine", 
                    "vbNo", 
                    "vbNormal"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbNormalFocus", 
                    "vbNormalNoFocus", 
                    "vbNull", 
                    "vbNullChar"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbNullString", 
                    "vbObject", 
                    "vbObjectError", 
                    "vbOK"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbOKCancel", 
                    "vbOKOnly", 
                    "vbProperCase", 
                    "vbQuestion"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbReadOnly", 
                    "vbRed", 
                    "vbRetry", 
                    "vbRetryCancel", 
                    "vbSaturday"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbScrollBars", 
                    "vbSingle", 
                    "vbString", 
                    "vbSunday", 
                    "vbSystem"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbSystemModal", 
                    "vbTab", 
                    "vbTextCompare", 
                    "vbThursday"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbTitleBarText", 
                    "vbTuesday", 
                    "vbUnicode", 
                    "vbUpperCase"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbUseSystem", 
                    "vbUseSystemDayOfWeek", 
                    "vbVariant"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbVerticalTab", 
                    "vbVolume", 
                    "vbWednesday", 
                    "vbWhite", 
                    "vbWide"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbWindowBackground", 
                    "vbWindowFrame", 
                    "vbWindowText"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "vbYellow", 
                    "vbYes", 
                    "vbYesNo", 
                    "vbYesNoCancel"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }
        ], 
        "vbEvents": [
            {
                "keywords": [
                    "AccessKeyPress", 
                    "Activate", 
                    "ActiveRowChanged"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "AfterAddFile", 
                    "AfterChangeFileName", 
                    "AfterCloseFile"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "AfterColEdit", 
                    "AfterColUpdate", 
                    "AfterDelete"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "AfterInsert", 
                    "AfterLabelEdit", 
                    "AfterRemoveFile"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "AfterUpdate", 
                    "AfterWriteFile", 
                    "AmbientChanged"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "ApplyChanges", 
                    "Associate", 
                    "AsyncProgress"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "AsyncReadComplete", 
                    "AsyncReadProgress", 
                    "AxisActivated"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "AxisLabelActivated", 
                    "AxisLabelSelected"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "AxisLabelUpdated", 
                    "AxisSelected", 
                    "AxisTitleActivated"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "AxisTitleSelected", 
                    "AxisTitleUpdated", 
                    "AxisUpdated"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "BeforeClick", 
                    "BeforeColEdit", 
                    "BeforeColUpdate"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "BeforeConnect", 
                    "BeforeDelete", 
                    "BeforeInsert"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "BeforeLabelEdit", 
                    "BeforeLoadFile", 
                    "BeforeUpdate"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "BeginRequest", 
                    "BeginTrans", 
                    "ButtonClick"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "ButtonCompleted", 
                    "ButtonDropDown", 
                    "ButtonGotFocus"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "ButtonLostFocus", 
                    "CallbackKeyDown", 
                    "Change", 
                    "Changed"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "ChartActivated", 
                    "ChartSelected", 
                    "ChartUpdated", 
                    "Click"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "Close", 
                    "CloseQuery", 
                    "CloseUp", 
                    "ColEdit", 
                    "ColResize"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "Collapse", 
                    "ColumnClick", 
                    "CommitTrans", 
                    "Compare"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "ConfigChageCancelled", 
                    "ConfigChanged"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "ConfigChangedCancelled", 
                    "Connect", 
                    "ConnectionRequest"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "CurrentRecordChanged", 
                    "DECommandAdded"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "DECommandPropertyChanged", 
                    "DECommandRemoved"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "DEConnectionAdded", 
                    "DEConnectionPropertyChanged"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "DEConnectionRemoved", 
                    "DataArrival", 
                    "DataChanged"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "DataUpdated", 
                    "DateClicked", 
                    "DblClick", 
                    "Deactivate"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "DevModeChange", 
                    "DeviceArrival", 
                    "DeviceOtherEvent"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "DeviceQueryRemove", 
                    "DeviceQueryRemoveFailed"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "DeviceRemoveComplete", 
                    "DeviceRemovePending"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "Disconnect", 
                    "DisplayChanged", 
                    "Dissociate"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "DoGetNewFileName", 
                    "Done", 
                    "DonePainting", 
                    "DownClick"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "DragDrop", 
                    "DragOver", 
                    "DropDown", 
                    "EditProperty", 
                    "EditQuery"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "EndRequest", 
                    "EnterCell", 
                    "EnterFocus", 
                    "ExitFocus", 
                    "Expand"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "FontChanged", 
                    "FootnoteActivated", 
                    "FootnoteSelected"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "FootnoteUpdated", 
                    "Format", 
                    "FormatSize", 
                    "GotFocus"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "HeadClick", 
                    "HeightChanged", 
                    "Hide", 
                    "InfoMessage"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "IniProperties", 
                    "InitProperties", 
                    "Initialize"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "ItemActivated", 
                    "ItemAdded", 
                    "ItemCheck", 
                    "ItemClick"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "ItemReloaded", 
                    "ItemRemoved", 
                    "ItemRenamed"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "ItemSeletected", 
                    "KeyDown", 
                    "KeyPress", 
                    "KeyUp", 
                    "LeaveCell"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "LegendActivated", 
                    "LegendSelected", 
                    "LegendUpdated"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "LinkClose", 
                    "LinkError", 
                    "LinkExecute", 
                    "LinkNotify"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "LinkOpen", 
                    "Load", 
                    "LostFocus", 
                    "MouseDown", 
                    "MouseMove"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "MouseUp", 
                    "NodeCheck", 
                    "NodeClick", 
                    "OLECompleteDrag"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "OLEDragDrop", 
                    "OLEDragOver", 
                    "OLEGiveFeedback", 
                    "OLESetData"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "OLEStartDrag", 
                    "ObjectEvent", 
                    "ObjectMove", 
                    "OnAddNew"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "OnComm", 
                    "Paint", 
                    "PanelClick", 
                    "PanelDblClick", 
                    "PathChange"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "PatternChange", 
                    "PlotActivated", 
                    "PlotSelected"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "PlotUpdated", 
                    "PointActivated", 
                    "PointLabelActivated"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "PointLabelSelected", 
                    "PointLabelUpdated", 
                    "PointSelected"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "PointUpdated", 
                    "PowerQuerySuspend", 
                    "PowerResume"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "PowerStatusChanged", 
                    "PowerSuspend", 
                    "ProcessTag"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "ProcessingTimeout", 
                    "QueryChangeConfig", 
                    "QueryClose"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "QueryComplete", 
                    "QueryCompleted", 
                    "QueryTimeout"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "QueryUnload", 
                    "ReadProperties", 
                    "RepeatedControlLoaded"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "RepeatedControlUnloaded", 
                    "Reposition"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "RequestChangeFileName", 
                    "RequestWriteFile", 
                    "Resize"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "ResultsChanged", 
                    "RetainedProject", 
                    "RollbackTrans"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "RowColChange", 
                    "RowCurrencyChange", 
                    "RowResize"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "RowStatusChanged", 
                    "Scroll", 
                    "SelChange", 
                    "SelectionChanged"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "SendComplete", 
                    "SendProgress", 
                    "SeriesActivated"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "SeriesSelected", 
                    "SeriesUpdated", 
                    "SettingChanged", 
                    "Show"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "SplitChange", 
                    "Start", 
                    "StateChanged", 
                    "StatusUpdate"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "SysColorsChanged", 
                    "Terminate", 
                    "TimeChanged", 
                    "Timer"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "TitleActivated", 
                    "TitleSelected", 
                    "TitleUpdated"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "UnboundAddData", 
                    "UnboundDeleteRow"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "UnboundGetRelativeBookmark", 
                    "UnboundReadData"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "UnboundWriteData", 
                    "Unformat", 
                    "Unload", 
                    "UpClick", 
                    "Updated"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "UserEvent", 
                    "Validate", 
                    "ValidationError"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "VisibleRecordChanged", 
                    "WillAssociate", 
                    "WillChangeData"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "WillDissociate", 
                    "WillExecute", 
                    "WillUpdateRows"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "WriteProperties"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }
        ], 
        "vbStatement": [
            {
                "keywords": [
                    "Alias", 
                    "AppActivate", 
                    "As", 
                    "Base", 
                    "Beep", 
                    "Begin", 
                    "Call", 
                    "ChDir"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "ChDrive", 
                    "Close", 
                    "Const", 
                    "Date", 
                    "Declare", 
                    "DefBool", 
                    "DefByte"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "DefCur", 
                    "DefDate", 
                    "DefDbl", 
                    "DefDec", 
                    "DefInt", 
                    "DefLng", 
                    "DefObj"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "DefSng", 
                    "DefStr", 
                    "DefVar", 
                    "Deftype", 
                    "DeleteSetting", 
                    "Dim", 
                    "Do"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "Each", 
                    "ElseIf", 
                    "End", 
                    "Enum", 
                    "Erase", 
                    "Error", 
                    "Event", 
                    "Exit"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "Explicit", 
                    "FileCopy", 
                    "For", 
                    "ForEach", 
                    "Function", 
                    "Get", 
                    "GoSub"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "GoTo", 
                    "Gosub", 
                    "Implements", 
                    "Kill", 
                    "LSet", 
                    "Let", 
                    "Lib", 
                    "LineInput"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "Load", 
                    "Lock", 
                    "Loop", 
                    "Mid", 
                    "MkDir", 
                    "Name", 
                    "Next", 
                    "On", 
                    "OnError", 
                    "Open"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "Option", 
                    "Preserve", 
                    "Private", 
                    "Property", 
                    "Public", 
                    "Put", 
                    "RSet"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "RaiseEvent", 
                    "Randomize", 
                    "ReDim", 
                    "Redim", 
                    "Rem", 
                    "Reset", 
                    "Resume"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "Return", 
                    "RmDir", 
                    "SavePicture", 
                    "SaveSetting", 
                    "Seek", 
                    "SendKeys"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "Sendkeys", 
                    "Set", 
                    "SetAttr", 
                    "Static", 
                    "Step", 
                    "Stop", 
                    "Sub", 
                    "Time"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "Type", 
                    "Unload", 
                    "Unlock", 
                    "Until", 
                    "Wend", 
                    "While", 
                    "Width", 
                    "With"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "Write"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }
        ], 
        "vbOperator": [
            {
                "keywords": [
                    "AddressOf", 
                    "And", 
                    "ByRef", 
                    "ByVal", 
                    "Eqv", 
                    "Imp", 
                    "In"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "Is", 
                    "Like", 
                    "Mod", 
                    "Not", 
                    "Or", 
                    "To", 
                    "Xor"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "regex": {
                    "regex": "[()+.,\\-/*=&]", 
                    "delta": 0
                }, 
                "nextgroup": null, 
                "contained": false, 
                "contains": [], 
                "type": "match"
            }, 
            {
                "regex": {
                    "regex": "[<>]=\\=", 
                    "delta": 0
                }, 
                "nextgroup": null, 
                "contained": false, 
                "contains": [], 
                "type": "match"
            }, 
            {
                "regex": {
                    "regex": "<>", 
                    "delta": 0
                }, 
                "nextgroup": null, 
                "contained": false, 
                "contains": [], 
                "type": "match"
            }, 
            {
                "regex": {
                    "regex": "\\s\\+_$", 
                    "delta": 0
                }, 
                "nextgroup": null, 
                "contained": false, 
                "contains": [], 
                "type": "match"
            }
        ], 
        "vbTypes": [
            {
                "keywords": [
                    "Boolean", 
                    "Byte", 
                    "Currency", 
                    "Date", 
                    "Decimal", 
                    "Double", 
                    "Empty"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }, 
            {
                "keywords": [
                    "Integer", 
                    "Long", 
                    "Object", 
                    "Single", 
                    "String", 
                    "Variant"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }
        ], 
        "vbBoolean": [
            {
                "keywords": [
                    "True", 
                    "False"
                ], 
                "skipwhite": false, 
                "contained": false, 
                "type": "keyword", 
                "nextgroup": null
            }
        ], 
        "vbTodo": [
            {
                "keywords": [
                    "TODO"
                ], 
                "skipwhite": false, 
                "contained": true, 
                "type": "keyword", 
                "nextgroup": null
            }
        ], 
        "vbTypeSpecifier": [
            {
                "regex": {
                    "regex": "[a-zA-Z0-9][\\$%&!#]ms=s1", 
                    "delta": 0
                }, 
                "nextgroup": null, 
                "contained": false, 
                "contains": [], 
                "type": "match"
            }, 
            {
                "regex": {
                    "regex": "#[a-zA-Z0-9]", 
                    "delta": -1
                }, 
                "nextgroup": null, 
                "contained": false, 
                "contains": [], 
                "type": "match"
            }
        ]
    }, 
    "tags": {
        "vbFunction": "Identifier", 
        "vbNumber": "Number", 
        "vbString": "String", 
        "vbConst": "Constant", 
        "vbDefine": "Constant", 
        "vbKeyword": "Statement", 
        "vbFloat": "Float", 
        "vbMethods": "PreProc", 
        "vbConditional": "Conditional", 
        "vbComment": "Comment", 
        "vbIdentifier": "Identifier", 
        "vbRepeat": "Repeat", 
        "vbLineNumber": "Comment", 
        "vbEvents": "Special", 
        "vbStatement": "Statement", 
        "vbError": "Error", 
        "vbOperator": "Operator", 
        "vbTypes": "Type", 
        "vbBoolean": "Boolean", 
        "vbTodo": "Todo", 
        "vbTypeSpecifier": "Type"
    }
};
},{}],18:[function(require,module,exports){
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
        renderer._canvas, 
        -this._canvas._tx(0), 
        -this._canvas._ty(0), 
        this._canvas.width, 
        this._canvas.height);
};

// Exports
exports.BatchRenderer = BatchRenderer;

},{"../utils.js":29,"./renderer.js":22}],19:[function(require,module,exports){
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

},{"../utils.js":29,"./renderer.js":22}],20:[function(require,module,exports){
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
    this._fps = 30;

    // Start the cursor rendering clock.
    this._render_clock();
    this._last_rendered = null;
};
utils.inherit(CursorsRenderer, renderer.RendererBase);

/**
 * Render to the canvas
 * Note: This method is called often, so it's important that it's
 * optimized for speed.
 * @return {null}
 */
CursorsRenderer.prototype.render = function() {
    // Frame limit the rendering.
    if (Date.now() - this._last_rendered < 1000/this._fps) {
        return;
    }
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
        });
    }
    this._last_rendered = Date.now();
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

    // Timer.
    setTimeout(utils.proxy(this._render_clock, this), 1000 / this._fps);
};

// Exports
exports.CursorsRenderer = CursorsRenderer;

},{"../animator.js":2,"../utils.js":29,"./renderer.js":22}],21:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('../utils.js');
var row = require('./row.js');

/**
 * Render the text rows of a DocumentModel.
 * @param {DocumentModel} model instance
 */
var HighlightedRowRenderer = function(model, scrolling_canvas, style, config) {
    row.RowRenderer.call(this, model, scrolling_canvas);
    this.style = style;
    this.config = config;
};
utils.inherit(HighlightedRowRenderer, row.RowRenderer);

/**
 * Render a single row
 * @param  {integer} index
 * @param  {float} x
 * @param  {float} y
 * @return {null}
 */
HighlightedRowRenderer.prototype._render_row = function(index, x ,y) {
    if (index < 0 || this._model._rows.length <= index) return;
    
    var groups = this._get_groups(index);
    var left = x;
    for (var i=0; i<groups.length; i++) {
        var width = this._text_canvas.measure_text(groups[i].text, groups[i].options);
        
        if (this.config.highlight_draw) {
            this._text_canvas.draw_rectangle(left, y, width, this.get_row_height(i), {
                fill_color: utils.random_color(),
            });
        }

        this._text_canvas.draw_text(left, y, groups[i].text, groups[i].options);
        left += width;
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
        render_options.color = this.style.text || 'black';
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

},{"../utils.js":29,"./row.js":23}],22:[function(require,module,exports){
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

},{"../canvas.js":3,"../utils.js":29}],23:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var canvas = require('../canvas.js');
var utils = require('../utils.js');
var renderer = require('./renderer.js');

/**
 * Render the text rows of a DocumentModel.
 * @param {DocumentModel} model instance
 */
var RowRenderer = function(model, scrolling_canvas) {
    this._model = model;
    this._visible_row_count = 0;

    // Setup canvases
    this._text_canvas = new canvas.Canvas();
    this._tmp_canvas = new canvas.Canvas();
    this._scrolling_canvas = scrolling_canvas;

    // Base
    renderer.RendererBase.call(this);

    // Set some basic rendering properties.
    this._base_options = {
        font_family: 'monospace',
        font_size: 12,
    };
    this._line_spacing = 2;

    // Create properties.
    var that = this;
    this.property('width', function() {
        return that._canvas.width;
    }, function(value) {
        that._canvas.width = value;
        that._text_canvas.width = value;
        that._tmp_canvas.width = value;
    });
    this.property('height', function() {
        return that._canvas.height;
    }, function(value) {
        that._canvas.height = value;

        // The text canvas should be the right height to fit all of the lines
        // that will be rendered in the base canvas.  This includes the lines
        // that are partially rendered at the top and bottom of the base canvas.
        var row_height = that.get_row_height();
        that._visible_row_count = Math.ceil(value/row_height) + 1;
        that._text_canvas.height = that._visible_row_count * row_height;
        that._tmp_canvas.height = that._text_canvas.height;
    });

    // Set initial canvas sizes.  These lines may look redundant, but beware
    // because they actually cause an appropriate width and height to be set for
    // the text canvas because of the properties declared above.
    this.width = this._canvas.width;
    this.height = this._canvas.height;

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

    // If only the y axis was scrolled, blit the good contents and just render
    // what's missing.
    var partial_redraw = (scroll && scroll.x === 0 && Math.abs(scroll.y) < this._canvas.height);

    // Update the text rendering
    var visible_rows = this.get_visible_rows();
    this._render_text_canvas(-this._scrolling_canvas.scroll_left, visible_rows.top_row, !partial_redraw);

    // Copy the text image to this canvas
    this._canvas.clear();
    this._canvas.draw_image(
        this._text_canvas, 
        this._scrolling_canvas.scroll_left, 
        this.get_row_top(visible_rows.top_row));
};

/**
 * Render text to the text canvas.
 *
 * Later, the main rendering function can use this rendered text to draw the
 * base canvas.
 * @param  {float} x_offset - horizontal offset of the text
 * @param  {integer} top_row
 * @param  {boolean} force_redraw - redraw the contents even if they are
 *                                the same as the cached contents.
 * @return {null}          
 */
RowRenderer.prototype._render_text_canvas = function(x_offset, top_row, force_redraw) {

    // Try to reuse some of the already rendered text if possible.
    var rendered = false;
    var row_height = this.get_row_height();
    if (!force_redraw && this._last_rendered_offset === x_offset) {
        var last_top = this._last_rendered_row;
        var scroll = top_row - last_top; // Positive = user scrolling downward.
        if (scroll < this._last_rendered_row_count) {

            // Get a snapshot of the text before the scroll.
            this._tmp_canvas.clear();
            this._tmp_canvas.draw_image(this._text_canvas, 0, 0);

            // Render the new text.
            var saved_rows = this._last_rendered_row_count - Math.abs(scroll);
            var new_rows = this._visible_row_count - saved_rows;
            if (scroll > 0) {
                // Render the bottom.
                this._text_canvas.clear();
                for (i = top_row+saved_rows; i < top_row+this._visible_row_count; i++) {     
                    this._render_row(i, x_offset, (i - top_row) * row_height);
                }
            } else if (scroll < 0) {
                // Render the top.
                this._text_canvas.clear();
                for (i = top_row; i < top_row+new_rows; i++) {   
                    this._render_row(i, x_offset, (i - top_row) * row_height);
                }
            } else {
                // Nothing has changed.
                return;
            }
            
            // Use the old content to fill in the rest.
            this._text_canvas.draw_image(this._tmp_canvas, 0, -scroll * this.get_row_height());
            this.trigger('rows_changed', top_row, top_row + this._visible_row_count - 1);
            rendered = true;
        }
    }

    // Full rendering.
    if (!rendered) {
        this._text_canvas.clear();

        // Render till there are no rows left, or the top of the row is
        // below the bottom of the visible area.
        for (i = top_row; i < top_row + this._visible_row_count; i++) {        
            this._render_row(i, x_offset, (i - top_row) * row_height);
        }   
        this.trigger('rows_changed', top_row, top_row + this._visible_row_count - 1);
    }

    // Remember for delta rendering.
    this._last_rendered_row = top_row;
    this._last_rendered_row_count = this._visible_row_count;
    this._last_rendered_offset = x_offset;
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
 * @param  {integer} (optional) index
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
    return index * this.get_row_height();
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
 * @param  {float} x
 * @param  {float} y
 * @return {null}
 */
RowRenderer.prototype._render_row = function(index, x ,y) {
    this._text_canvas.draw_text(x, y, this._model._rows[index], this._base_options);
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

},{"../canvas.js":3,"../utils.js":29,"./renderer.js":22}],24:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var animator = require('../animator.js');
var utils = require('../utils.js');
var renderer = require('./renderer.js');

/**
 * Render document selection boxes
 *
 * TODO: Only render visible.
 */
var SelectionsRenderer = function(cursors, style, row_renderer, has_focus) {
    renderer.RendererBase.call(this);
    this.style = style;
    this._has_focus = has_focus;

    // When the cursors change, redraw the selection box(es).
    this._cursors = cursors;
    var that = this;
    this._cursors.on('change', function() {
        that.render();
        // Tell parent layer this one has changed.
        that.trigger('changed');
    });

    this._get_visible_rows = utils.proxy(row_renderer.get_visible_rows, row_renderer);
    this._get_row_height = utils.proxy(row_renderer.get_row_height, row_renderer);
    this._get_row_top = utils.proxy(row_renderer.get_row_top, row_renderer);
    this._measure_partial_row = utils.proxy(row_renderer.measure_partial_row_width, row_renderer);
};
utils.inherit(SelectionsRenderer, renderer.RendererBase);

/**
 * Render to the canvas
 * Note: This method is called often, so it's important that it's
 * optimized for speed.
 * @return {null}
 */
SelectionsRenderer.prototype.render = function() {
    this._canvas.clear();

    // Only render if the canvas has focus.
    if (this._has_focus()) {
        var that = this;
        this._cursors.cursors.forEach(function(cursor) {
            // Get the visible rows.
            var visible_rows = that._get_visible_rows();

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

// Exports
exports.SelectionsRenderer = SelectionsRenderer;

},{"../animator.js":2,"../utils.js":29,"./renderer.js":22}],25:[function(require,module,exports){
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
 * @param  {boolean} inverse - perform inverse transformation
 * @return {float}
 */
ScrollingCanvas.prototype._tx = function(x, inverse) { return x - (inverse?-1:1) * this.scroll_left; };

/**
 * Transform a y value based on scroll position.
 * @param  {float} y
 * @param  {boolean} inverse - perform inverse transformation
 * @return {float}
 */
ScrollingCanvas.prototype._ty = function(y, inverse) { return y - (inverse?-1:1) * this.scroll_top; };

// Exports
exports.ScrollingCanvas = ScrollingCanvas;

},{"./canvas.js":3,"./utils.js":29}],26:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('./utils.js');
var styles = require('./styles/init.js');

/**
 * Style
 */
var Style = function() {
    utils.PosterClass.call(this, [
        'comment',
        'todo',
        'special',
        'string',
        'character',
        'conditional',
        'repeat',
        'operator',
        'type',
        'statement',
        'function',
        'error',
        'boolean',
        'identifier',
        'label',
        'exception',
        'keyword',
        'debug',
        'text',
        'background',
    ]);

    // Load the default style.
    this.load('monokai');
};
utils.inherit(Style, utils.PosterClass);

/**
 * Load a rendering style
 * @param  {string or dictionary} style - name of the built-in style 
 *         or style dictionary itself.
 * @return {boolean} success
 */
Style.prototype.load = function(style) {
    try {
        // Load the style if it's built-in.
        if (styles.styles[style]) {
            style = styles.styles[style].style;
        }

        // Read each attribute of the style.
        for (var key in style) {
            if (style.hasOwnProperty(key)) {
                this[key] = style[key];
            }
        }
        
        return true;
    } catch (e) {
        console.error('Error loading style', e);
        return false;
    }
};

exports.Style = Style;
},{"./styles/init.js":27,"./utils.js":29}],27:[function(require,module,exports){
exports.styles = {
    "monokai": require("./monokai.js"),
};

},{"./monokai.js":28}],28:[function(require,module,exports){
exports.style = {
    comment: '#75715E',
    todo: '#FFFFFF', // BOLD
    special: '#66D9EF',
    string: '#E6DB74',
    character: '#E6DB74',
    conditional: '#F92672', // BOLD
    repeat: '#F92672',
    operator: '#F92672',
    type: '#66D9EF',
    statement: '#F92672',
    function: '#A6E22E',
    error: '#E6DB74', // BG: #1E0010
    boolean: '#AE81FF',
    identifier: '#FD971F',
    label: '#E6DB74',
    exception: '#A6E22E',
    keyword: '#F92672',
    debug: '#BCA3A3', // BOLD

    text: '#F8F8F2',
    background: '#333333',
};
},{}],29:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

/**
 * Base class with helpful utilities
 * @param {array} [eventful_properties] list of property names (strings)
 *                to create and wire change events to.
 */
var PosterClass = function(eventful_properties) {
    this._events = {};
    this._on_all = [];

    // Construct eventful properties.
    if (eventful_properties && eventful_properties.length>0) {
        var that = this;
        for (var i=0; i<eventful_properties.length; i++) {
            (function(name) {
                that.property(name, function() {
                    return that['_' + name];
                }, function(value) {
                    that.trigger('change:' + name, value);
                    that.trigger('change', name, value);
                    that['_' + name] = value;
                    that.trigger('changed:' + name);
                    that.trigger('changed', name);
                });
            })(eventful_properties[i]);
        }
    }
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

/**
 * Generates a random color string
 * @return {string} hexadecimal color string
 */
var random_color = function() {
    var random_byte = function() { 
        var b = Math.round(Math.random() * 255).toString(16);
        return b.length == 1 ? '0' + b : b;
    };
    return '#' + random_byte() + random_byte() + random_byte();
};

/**
 * Compare two arrays by contents for equality.
 * @param  {array} x
 * @param  {array} y
 * @return {boolean}
 */
var compare_arrays = function(x, y) {
    if (x.length != y.length) return false;
    for (i=0; i<x.length; i++) {
        if (x[i]!==y[i]) return false;
    }
    return true;
};

/**
 * Find all the occurances of a regular expression inside a string.
 * @param  {string} text - string to look in
 * @param  {string} re - regular expression to find
 * @return {array} array of [start_index, end_index] pairs
 */
var findall = function(text, re) {
    re = new RegExp(re, 'gm');
    var results;
    var found = [];
    while ((results = re.exec(text)) !== null) {
        found.push([results.index, results.index + results[0].length]);
    }
    return found;
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
exports.random_color = random_color;
exports.compare_arrays = compare_arrays;
exports.findall = findall;

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzb3VyY2UvanMvcG9zdGVyLmpzIiwic291cmNlL2pzL2FuaW1hdG9yLmpzIiwic291cmNlL2pzL2NhbnZhcy5qcyIsInNvdXJjZS9qcy9jbGlwYm9hcmQuanMiLCJzb3VyY2UvanMvY3Vyc29yLmpzIiwic291cmNlL2pzL2N1cnNvcnMuanMiLCJzb3VyY2UvanMvZG9jdW1lbnRfY29udHJvbGxlci5qcyIsInNvdXJjZS9qcy9kb2N1bWVudF9tb2RlbC5qcyIsInNvdXJjZS9qcy9kb2N1bWVudF92aWV3LmpzIiwic291cmNlL2pzL2V2ZW50cy9kZWZhdWx0LmpzIiwic291cmNlL2pzL2V2ZW50cy9tYXAuanMiLCJzb3VyY2UvanMvZXZlbnRzL25vcm1hbGl6ZXIuanMiLCJzb3VyY2UvanMvaGlnaGxpZ2h0ZXJzL2hpZ2hsaWdodGVyLmpzIiwic291cmNlL2pzL2hpZ2hsaWdodGVycy9zeW50YXguanMiLCJzb3VyY2UvanMvaGlnaGxpZ2h0ZXJzL3N5bnRheC9pbml0LmpzIiwic291cmNlL2pzL2hpZ2hsaWdodGVycy9zeW50YXgvamF2YXNjcmlwdC5qcyIsInNvdXJjZS9qcy9oaWdobGlnaHRlcnMvc3ludGF4L3ZiLmpzIiwic291cmNlL2pzL3JlbmRlcmVycy9iYXRjaC5qcyIsInNvdXJjZS9qcy9yZW5kZXJlcnMvY29sb3IuanMiLCJzb3VyY2UvanMvcmVuZGVyZXJzL2N1cnNvcnMuanMiLCJzb3VyY2UvanMvcmVuZGVyZXJzL2hpZ2hsaWdodGVkX3Jvdy5qcyIsInNvdXJjZS9qcy9yZW5kZXJlcnMvcmVuZGVyZXIuanMiLCJzb3VyY2UvanMvcmVuZGVyZXJzL3Jvdy5qcyIsInNvdXJjZS9qcy9yZW5kZXJlcnMvc2VsZWN0aW9ucy5qcyIsInNvdXJjZS9qcy9zY3JvbGxpbmdfY2FudmFzLmpzIiwic291cmNlL2pzL3N0eWxlLmpzIiwic291cmNlL2pzL3N0eWxlcy9pbml0LmpzIiwic291cmNlL2pzL3N0eWxlcy9tb25va2FpLmpzIiwic291cmNlL2pzL3V0aWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2YkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDclRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25mQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNy9HQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIHNjcm9sbGluZ19jYW52YXMgPSByZXF1aXJlKCcuL3Njcm9sbGluZ19jYW52YXMuanMnKTtcbnZhciBkb2N1bWVudF9jb250cm9sbGVyID0gcmVxdWlyZSgnLi9kb2N1bWVudF9jb250cm9sbGVyLmpzJyk7XG52YXIgZG9jdW1lbnRfbW9kZWwgPSByZXF1aXJlKCcuL2RvY3VtZW50X21vZGVsLmpzJyk7XG52YXIgZG9jdW1lbnRfdmlldyA9IHJlcXVpcmUoJy4vZG9jdW1lbnRfdmlldy5qcycpO1xudmFyIHN0eWxlID0gcmVxdWlyZSgnLi9zdHlsZS5qcycpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xuXG4vKipcbiAqIENhbnZhcyBiYXNlZCB0ZXh0IGVkaXRvclxuICovXG52YXIgUG9zdGVyID0gZnVuY3Rpb24oKSB7XG4gICAgdXRpbHMuUG9zdGVyQ2xhc3MuY2FsbCh0aGlzKTtcblxuICAgIC8vIENyZWF0ZSBjYW52YXNcbiAgICB0aGlzLmNhbnZhcyA9IG5ldyBzY3JvbGxpbmdfY2FudmFzLlNjcm9sbGluZ0NhbnZhcygpO1xuICAgIHRoaXMuZWwgPSB0aGlzLmNhbnZhcy5lbDsgLy8gQ29udmVuaWVuY2VcbiAgICB0aGlzLl9zdHlsZSA9IG5ldyBzdHlsZS5TdHlsZSgpO1xuICAgIHRoaXMuX2NvbmZpZyA9IG5ldyB1dGlscy5Qb3N0ZXJDbGFzcyhbJ2hpZ2hsaWdodF9kcmF3J10pO1xuXG4gICAgLy8gQ3JlYXRlIG1vZGVsLCBjb250cm9sbGVyLCBhbmQgdmlldy5cbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdGhpcy5tb2RlbCA9IG5ldyBkb2N1bWVudF9tb2RlbC5Eb2N1bWVudE1vZGVsKCk7XG4gICAgdGhpcy5jb250cm9sbGVyID0gbmV3IGRvY3VtZW50X2NvbnRyb2xsZXIuRG9jdW1lbnRDb250cm9sbGVyKHRoaXMuY2FudmFzLmVsLCB0aGlzLm1vZGVsKTtcbiAgICB0aGlzLnZpZXcgPSBuZXcgZG9jdW1lbnRfdmlldy5Eb2N1bWVudFZpZXcoXG4gICAgICAgIHRoaXMuY2FudmFzLCBcbiAgICAgICAgdGhpcy5tb2RlbCwgXG4gICAgICAgIHRoaXMuY29udHJvbGxlci5jdXJzb3JzLCBcbiAgICAgICAgdGhpcy5fc3R5bGUsXG4gICAgICAgIHRoaXMuX2NvbmZpZyxcbiAgICAgICAgZnVuY3Rpb24oKSB7IHJldHVybiB0aGF0LmNvbnRyb2xsZXIuY2xpcGJvYXJkLmhpZGRlbl9pbnB1dCA9PT0gZG9jdW1lbnQuYWN0aXZlRWxlbWVudCB8fCB0aGF0LmNhbnZhcy5mb2N1c2VkOyB9XG4gICAgKTtcblxuICAgIC8vIENyZWF0ZSBwcm9wZXJ0aWVzXG4gICAgdGhpcy5wcm9wZXJ0eSgnc3R5bGUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoYXQuX3N0eWxlO1xuICAgIH0pO1xuICAgIHRoaXMucHJvcGVydHkoJ2NvbmZpZycsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC5fY29uZmlnO1xuICAgIH0pO1xuICAgIHRoaXMucHJvcGVydHkoJ3ZhbHVlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Lm1vZGVsLnRleHQ7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC5tb2RlbC50ZXh0ID0gdmFsdWU7XG4gICAgfSk7XG4gICAgdGhpcy5wcm9wZXJ0eSgnd2lkdGgnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoYXQudmlldy53aWR0aDtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0LnZpZXcud2lkdGggPSB2YWx1ZTtcbiAgICB9KTtcbiAgICB0aGlzLnByb3BlcnR5KCdoZWlnaHQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoYXQudmlldy5oZWlnaHQ7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC52aWV3LmhlaWdodCA9IHZhbHVlO1xuICAgIH0pO1xuICAgIHRoaXMucHJvcGVydHkoJ2xhbmd1YWdlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0LnZpZXcubGFuZ3VhZ2U7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC52aWV3Lmxhbmd1YWdlID0gdmFsdWU7XG4gICAgfSk7XG59O1xudXRpbHMuaW5oZXJpdChQb3N0ZXIsIHV0aWxzLlBvc3RlckNsYXNzKTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5Qb3N0ZXIgPSBQb3N0ZXI7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG5cbi8qKlxuICogQW5pbWF0aW9uIGhlbHBlci5cbiAqL1xudmFyIEFuaW1hdG9yID0gZnVuY3Rpb24oZHVyYXRpb24pIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMuZHVyYXRpb24gPSBkdXJhdGlvbjtcbiAgICB0aGlzLl9zdGFydCA9IERhdGUubm93KCk7XG59O1xudXRpbHMuaW5oZXJpdChBbmltYXRvciwgdXRpbHMuUG9zdGVyQ2xhc3MpO1xuXG4vKipcbiAqIEdldCB0aGUgdGltZSBpbiB0aGUgYW5pbWF0aW9uXG4gKiBAcmV0dXJuIHtmbG9hdH0gYmV0d2VlbiAwIGFuZCAxXG4gKi9cbkFuaW1hdG9yLnByb3RvdHlwZS50aW1lID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGVsYXBzZWQgPSBEYXRlLm5vdygpIC0gdGhpcy5fc3RhcnQ7XG4gICAgcmV0dXJuIChlbGFwc2VkICUgdGhpcy5kdXJhdGlvbikgLyB0aGlzLmR1cmF0aW9uO1xufTtcblxuZXhwb3J0cy5BbmltYXRvciA9IEFuaW1hdG9yOyIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG5cbi8qKlxuICogSFRNTCBjYW52YXMgd2l0aCBkcmF3aW5nIGNvbnZpbmllbmNlIGZ1bmN0aW9ucy5cbiAqL1xudmFyIENhbnZhcyA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3JlbmRlcmVkX3JlZ2lvbiA9IFtudWxsLCBudWxsLCBudWxsLCBudWxsXTsgLy8geDEseTEseDIseTJcblxuICAgIHV0aWxzLlBvc3RlckNsYXNzLmNhbGwodGhpcyk7XG4gICAgdGhpcy5fbGF5b3V0KCk7XG4gICAgdGhpcy5faW5pdF9wcm9wZXJ0aWVzKCk7XG5cbiAgICAvLyBTZXQgZGVmYXVsdCBzaXplLlxuICAgIHRoaXMud2lkdGggPSA0MDA7XG4gICAgdGhpcy5oZWlnaHQgPSAzMDA7XG59O1xudXRpbHMuaW5oZXJpdChDYW52YXMsIHV0aWxzLlBvc3RlckNsYXNzKTtcblxuLyoqXG4gKiBMYXlvdXQgdGhlIGVsZW1lbnRzIGZvciB0aGUgY2FudmFzLlxuICogQ3JlYXRlcyBgdGhpcy5lbGBcbiAqIFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5fbGF5b3V0ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgdGhpcy5fY2FudmFzLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAncG9zdGVyIGhpZGRlbi1jYW52YXMnKTtcbiAgICB0aGlzLmNvbnRleHQgPSB0aGlzLl9jYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICAgICAgXG4gICAgLy8gU3RyZXRjaCB0aGUgaW1hZ2UgZm9yIHJldGluYSBzdXBwb3J0LlxuICAgIHRoaXMuc2NhbGUoMiwyKTtcbn07XG5cbi8qKlxuICogTWFrZSB0aGUgcHJvcGVydGllcyBvZiB0aGUgY2xhc3MuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DYW52YXMucHJvdG90eXBlLl9pbml0X3Byb3BlcnRpZXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBIZWlnaHQgb2YgdGhlIGNhbnZhc1xuICAgICAqIEByZXR1cm4ge2Zsb2F0fVxuICAgICAqL1xuICAgIHRoaXMucHJvcGVydHkoJ2hlaWdodCcsIGZ1bmN0aW9uKCkgeyBcbiAgICAgICAgcmV0dXJuIHRoYXQuX2NhbnZhcy5oZWlnaHQgLyAyOyBcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0Ll9jYW52YXMuc2V0QXR0cmlidXRlKCdoZWlnaHQnLCB2YWx1ZSAqIDIpO1xuICAgICAgICBcbiAgICAgICAgLy8gU3RyZXRjaCB0aGUgaW1hZ2UgZm9yIHJldGluYSBzdXBwb3J0LlxuICAgICAgICB0aGlzLnNjYWxlKDIsMik7XG4gICAgICAgIHRoaXMuX3RvdWNoKCk7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBXaWR0aCBvZiB0aGUgY2FudmFzXG4gICAgICogQHJldHVybiB7ZmxvYXR9XG4gICAgICovXG4gICAgdGhpcy5wcm9wZXJ0eSgnd2lkdGgnLCBmdW5jdGlvbigpIHsgXG4gICAgICAgIHJldHVybiB0aGF0Ll9jYW52YXMud2lkdGggLyAyOyBcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0Ll9jYW52YXMuc2V0QXR0cmlidXRlKCd3aWR0aCcsIHZhbHVlICogMik7XG4gICAgICAgIFxuICAgICAgICAvLyBTdHJldGNoIHRoZSBpbWFnZSBmb3IgcmV0aW5hIHN1cHBvcnQuXG4gICAgICAgIHRoaXMuc2NhbGUoMiwyKTtcbiAgICAgICAgdGhpcy5fdG91Y2goKTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIFJlZ2lvbiBvZiB0aGUgY2FudmFzIHRoYXQgaGFzIGJlZW4gcmVuZGVyZWQgdG9cbiAgICAgKiBAcmV0dXJuIHtkaWN0aW9uYXJ5fSBkaWN0aW9uYXJ5IGRlc2NyaWJpbmcgYSByZWN0YW5nbGUge3gseSx3aWR0aCxoZWlnaHR9XG4gICAgICovXG4gICAgdGhpcy5wcm9wZXJ0eSgncmVuZGVyZWRfcmVnaW9uJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB4OiB0aGlzLl90eCh0aGlzLl9yZW5kZXJlZF9yZWdpb25bMF0sIHRydWUpLFxuICAgICAgICAgICAgeTogdGhpcy5fdHkodGhpcy5fcmVuZGVyZWRfcmVnaW9uWzFdLCB0cnVlKSxcbiAgICAgICAgICAgIHdpZHRoOiB0aGlzLl9yZW5kZXJlZF9yZWdpb25bMl0gLSB0aGlzLl9yZW5kZXJlZF9yZWdpb25bMF0sXG4gICAgICAgICAgICBoZWlnaHQ6IHRoaXMuX3JlbmRlcmVkX3JlZ2lvblszXSAtIHRoaXMuX3JlbmRlcmVkX3JlZ2lvblsxXSxcbiAgICAgICAgfTtcbiAgICB9KTtcbn07XG5cbi8qKlxuICogRHJhd3MgYSByZWN0YW5nbGVcbiAqIEBwYXJhbSAge2Zsb2F0fSB4XG4gKiBAcGFyYW0gIHtmbG9hdH0geVxuICogQHBhcmFtICB7ZmxvYXR9IHdpZHRoXG4gKiBAcGFyYW0gIHtmbG9hdH0gaGVpZ2h0XG4gKiBAcGFyYW0gIHtkaWN0aW9uYXJ5fSBvcHRpb25zLCBzZWUgX2FwcGx5X29wdGlvbnMoKSBmb3IgZGV0YWlsc1xuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5kcmF3X3JlY3RhbmdsZSA9IGZ1bmN0aW9uKHgsIHksIHdpZHRoLCBoZWlnaHQsIG9wdGlvbnMpIHtcbiAgICB4ID0gdGhpcy5fdHgoeCk7XG4gICAgeSA9IHRoaXMuX3R5KHkpO1xuICAgIHRoaXMuY29udGV4dC5iZWdpblBhdGgoKTtcbiAgICB0aGlzLmNvbnRleHQucmVjdCh4LCB5LCB3aWR0aCwgaGVpZ2h0KTtcbiAgICB0aGlzLl9kb19kcmF3KG9wdGlvbnMpO1xuICAgIHRoaXMuX3RvdWNoKHgsIHksIHgrd2lkdGgsIHkraGVpZ2h0KTtcbn07XG5cbi8qKlxuICogRHJhd3MgYSBjaXJjbGVcbiAqIEBwYXJhbSAge2Zsb2F0fSB4XG4gKiBAcGFyYW0gIHtmbG9hdH0geVxuICogQHBhcmFtICB7ZmxvYXR9IHJcbiAqIEBwYXJhbSAge2RpY3Rpb25hcnl9IG9wdGlvbnMsIHNlZSBfYXBwbHlfb3B0aW9ucygpIGZvciBkZXRhaWxzXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DYW52YXMucHJvdG90eXBlLmRyYXdfY2lyY2xlID0gZnVuY3Rpb24oeCwgeSwgciwgb3B0aW9ucykge1xuICAgIHggPSB0aGlzLl90eCh4KTtcbiAgICB5ID0gdGhpcy5fdHkoeSk7XG4gICAgdGhpcy5jb250ZXh0LmJlZ2luUGF0aCgpO1xuICAgIHRoaXMuY29udGV4dC5hcmMoeCwgeSwgciwgMCwgMiAqIE1hdGguUEkpO1xuICAgIHRoaXMuX2RvX2RyYXcob3B0aW9ucyk7XG4gICAgdGhpcy5fdG91Y2goeC1yLCB5LXIsIHgrciwgeStyKTtcbn07XG5cbi8qKlxuICogRHJhd3MgYW4gaW1hZ2VcbiAqIEBwYXJhbSAge2ltZyBlbGVtZW50fSBpbWdcbiAqIEBwYXJhbSAge2Zsb2F0fSB4XG4gKiBAcGFyYW0gIHtmbG9hdH0geVxuICogQHBhcmFtICB7ZmxvYXR9IChvcHRpb25hbCkgd2lkdGhcbiAqIEBwYXJhbSAge2Zsb2F0fSAob3B0aW9uYWwpIGhlaWdodFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5kcmF3X2ltYWdlID0gZnVuY3Rpb24oaW1nLCB4LCB5LCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgeCA9IHRoaXMuX3R4KHgpO1xuICAgIHkgPSB0aGlzLl90eSh5KTtcbiAgICB3aWR0aCA9IHdpZHRoIHx8IGltZy53aWR0aDtcbiAgICBoZWlnaHQgPSBoZWlnaHQgfHwgaW1nLmhlaWdodDtcbiAgICBpbWcgPSBpbWcuX2NhbnZhcyA/IGltZy5fY2FudmFzIDogaW1nO1xuICAgIHRoaXMuY29udGV4dC5kcmF3SW1hZ2UoaW1nLCB4LCB5LCB3aWR0aCwgaGVpZ2h0KTtcbiAgICB0aGlzLl90b3VjaCh4LCB5LCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCk7XG59O1xuXG4vKipcbiAqIERyYXdzIGEgbGluZVxuICogQHBhcmFtICB7ZmxvYXR9IHgxXG4gKiBAcGFyYW0gIHtmbG9hdH0geTFcbiAqIEBwYXJhbSAge2Zsb2F0fSB4MlxuICogQHBhcmFtICB7ZmxvYXR9IHkyXG4gKiBAcGFyYW0gIHtkaWN0aW9uYXJ5fSBvcHRpb25zLCBzZWUgX2FwcGx5X29wdGlvbnMoKSBmb3IgZGV0YWlsc1xuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5kcmF3X2xpbmUgPSBmdW5jdGlvbih4MSwgeTEsIHgyLCB5Miwgb3B0aW9ucykge1xuICAgIHgxID0gdGhpcy5fdHgoeDEpO1xuICAgIHkxID0gdGhpcy5fdHkoeTEpO1xuICAgIHgyID0gdGhpcy5fdHgoeDIpO1xuICAgIHkyID0gdGhpcy5fdHkoeTIpO1xuICAgIHRoaXMuY29udGV4dC5iZWdpblBhdGgoKTtcbiAgICB0aGlzLmNvbnRleHQubW92ZVRvKHgxLCB5MSk7XG4gICAgdGhpcy5jb250ZXh0LmxpbmVUbyh4MiwgeTIpO1xuICAgIHRoaXMuX2RvX2RyYXcob3B0aW9ucyk7XG4gICAgdGhpcy5fdG91Y2goeDEsIHkxLCB4MiwgeTIpO1xufTtcblxuLyoqXG4gKiBEcmF3cyBhIHBvbHkgbGluZVxuICogQHBhcmFtICB7YXJyYXl9IHBvaW50cyAtIGFycmF5IG9mIHBvaW50cy4gIEVhY2ggcG9pbnQgaXNcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICBhbiBhcnJheSBpdHNlbGYsIG9mIHRoZSBmb3JtIFt4LCB5XSBcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICB3aGVyZSB4IGFuZCB5IGFyZSBmbG9hdGluZyBwb2ludFxuICogICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlcy5cbiAqIEBwYXJhbSAge2RpY3Rpb25hcnl9IG9wdGlvbnMsIHNlZSBfYXBwbHlfb3B0aW9ucygpIGZvciBkZXRhaWxzXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DYW52YXMucHJvdG90eXBlLmRyYXdfcG9seWxpbmUgPSBmdW5jdGlvbihwb2ludHMsIG9wdGlvbnMpIHtcbiAgICBpZiAocG9pbnRzLmxlbmd0aCA8IDIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdQb2x5IGxpbmUgbXVzdCBoYXZlIGF0bGVhc3QgdHdvIHBvaW50cy4nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmNvbnRleHQuYmVnaW5QYXRoKCk7XG4gICAgICAgIHZhciBwb2ludCA9IHBvaW50c1swXTtcbiAgICAgICAgdGhpcy5jb250ZXh0Lm1vdmVUbyh0aGlzLl90eChwb2ludFswXSksIHRoaXMuX3R5KHBvaW50WzFdKSk7XG5cbiAgICAgICAgdmFyIG1pbnggPSB0aGlzLndpZHRoO1xuICAgICAgICB2YXIgbWlueSA9IHRoaXMuaGVpZ2h0O1xuICAgICAgICB2YXIgbWF4eCA9IDA7XG4gICAgICAgIHZhciBtYXh5ID0gMDtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBwb2ludHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHBvaW50ID0gcG9pbnRzW2ldO1xuICAgICAgICAgICAgdGhpcy5jb250ZXh0LmxpbmVUbyh0aGlzLl90eChwb2ludFswXSksIHRoaXMuX3R5KHBvaW50WzFdKSk7XG5cbiAgICAgICAgICAgIG1pbnggPSBNYXRoLm1pbih0aGlzLl90eChwb2ludFswXSksIG1pbngpO1xuICAgICAgICAgICAgbWlueSA9IE1hdGgubWluKHRoaXMuX3R5KHBvaW50WzFdKSwgbWlueSk7XG4gICAgICAgICAgICBtYXh4ID0gTWF0aC5tYXgodGhpcy5fdHgocG9pbnRbMF0pLCBtYXh4KTtcbiAgICAgICAgICAgIG1heHkgPSBNYXRoLm1heCh0aGlzLl90eShwb2ludFsxXSksIG1heHkpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2RvX2RyYXcob3B0aW9ucyk7IFxuICAgICAgICB0aGlzLl90b3VjaChtaW54LCBtaW55LCBtYXh4LCBtYXh5KTsgICBcbiAgICB9XG59O1xuXG4vKipcbiAqIERyYXdzIGEgdGV4dCBzdHJpbmdcbiAqIEBwYXJhbSAge2Zsb2F0fSB4XG4gKiBAcGFyYW0gIHtmbG9hdH0geVxuICogQHBhcmFtICB7c3RyaW5nfSB0ZXh0IHN0cmluZyBvciBjYWxsYmFjayB0aGF0IHJlc29sdmVzIHRvIGEgc3RyaW5nLlxuICogQHBhcmFtICB7ZGljdGlvbmFyeX0gb3B0aW9ucywgc2VlIF9hcHBseV9vcHRpb25zKCkgZm9yIGRldGFpbHNcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuZHJhd190ZXh0ID0gZnVuY3Rpb24oeCwgeSwgdGV4dCwgb3B0aW9ucykge1xuICAgIHggPSB0aGlzLl90eCh4KTtcbiAgICB5ID0gdGhpcy5fdHkoeSk7XG4gICAgb3B0aW9ucyA9IHRoaXMuX2FwcGx5X29wdGlvbnMob3B0aW9ucyk7XG4gICAgLy8gJ2ZpbGwnIHRoZSB0ZXh0IGJ5IGRlZmF1bHQgd2hlbiBuZWl0aGVyIGEgc3Ryb2tlIG9yIGZpbGwgXG4gICAgLy8gaXMgZGVmaW5lZC4gIE90aGVyd2lzZSBvbmx5IGZpbGwgaWYgYSBmaWxsIGlzIGRlZmluZWQuXG4gICAgaWYgKG9wdGlvbnMuZmlsbCB8fCAhb3B0aW9ucy5zdHJva2UpIHtcbiAgICAgICAgdGhpcy5jb250ZXh0LmZpbGxUZXh0KHRleHQsIHgsIHkpO1xuICAgIH1cbiAgICAvLyBPbmx5IHN0cm9rZSBpZiBhIHN0cm9rZSBpcyBkZWZpbmVkLlxuICAgIGlmIChvcHRpb25zLnN0cm9rZSkge1xuICAgICAgICB0aGlzLmNvbnRleHQuc3Ryb2tlVGV4dCh0ZXh0LCB4LCB5KTsgICAgICAgXG4gICAgfVxuICAgIHRoaXMuX3RvdWNoKHgsIHksIHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KTtcbn07XG5cbi8qKlxuICogR2V0J3MgYSBjaHVuayBvZiB0aGUgY2FudmFzIGFzIGEgcmF3IGltYWdlLlxuICogQHBhcmFtICB7ZmxvYXR9IChvcHRpb25hbCkgeFxuICogQHBhcmFtICB7ZmxvYXR9IChvcHRpb25hbCkgeVxuICogQHBhcmFtICB7ZmxvYXR9IChvcHRpb25hbCkgd2lkdGhcbiAqIEBwYXJhbSAge2Zsb2F0fSAob3B0aW9uYWwpIGhlaWdodFxuICogQHJldHVybiB7aW1hZ2V9IGNhbnZhcyBpbWFnZSBkYXRhXG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuZ2V0X3Jhd19pbWFnZSA9IGZ1bmN0aW9uKHgsIHksIHdpZHRoLCBoZWlnaHQpIHtcbiAgICBjb25zb2xlLndhcm4oJ2dldF9yYXdfaW1hZ2UgaW1hZ2UgaXMgc2xvdywgdXNlIGNhbnZhcyByZWZlcmVuY2VzIGluc3RlYWQgd2l0aCBkcmF3X2ltYWdlJyk7XG4gICAgaWYgKHg9PT11bmRlZmluZWQpIHtcbiAgICAgICAgeCA9IDA7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgeCA9IHRoaXMuX3R4KHgpO1xuICAgIH1cbiAgICBpZiAoeT09PXVuZGVmaW5lZCkge1xuICAgICAgICB5ID0gMDtcbiAgICB9IGVsc2Uge1xuICAgICAgICB5ID0gdGhpcy5fdHkoeSk7XG4gICAgfVxuICAgIGlmICh3aWR0aCA9PT0gdW5kZWZpbmVkKSB3aWR0aCA9IHRoaXMud2lkdGg7XG4gICAgaWYgKGhlaWdodCA9PT0gdW5kZWZpbmVkKSBoZWlnaHQgPSB0aGlzLmhlaWdodDtcblxuICAgIC8vIE11bHRpcGx5IGJ5IHR3byBmb3IgcGl4ZWwgZG91YmxpbmcuXG4gICAgeCA9IDIgKiB4O1xuICAgIHkgPSAyICogeTtcbiAgICB3aWR0aCA9IDIgKiB3aWR0aDtcbiAgICBoZWlnaHQgPSAyICogaGVpZ2h0O1xuICAgIFxuICAgIC8vIFVwZGF0ZSB0aGUgY2FjaGVkIGltYWdlIGlmIGl0J3Mgbm90IHRoZSByZXF1ZXN0ZWQgb25lLlxuICAgIHZhciByZWdpb24gPSBbeCwgeSwgd2lkdGgsIGhlaWdodF07XG4gICAgaWYgKCEodGhpcy5fY2FjaGVkX3RpbWVzdGFtcCA9PT0gdGhpcy5fbW9kaWZpZWQgJiYgdXRpbHMuY29tcGFyZV9hcnJheXMocmVnaW9uLCB0aGlzLl9jYWNoZWRfcmVnaW9uKSkpIHtcbiAgICAgICAgdGhpcy5fY2FjaGVkX2ltYWdlID0gdGhpcy5jb250ZXh0LmdldEltYWdlRGF0YSh4LCB5LCB3aWR0aCwgaGVpZ2h0KTtcbiAgICAgICAgdGhpcy5fY2FjaGVkX3RpbWVzdGFtcCA9IHRoaXMuX21vZGlmaWVkO1xuICAgICAgICB0aGlzLl9jYWNoZWRfcmVnaW9uID0gcmVnaW9uO1xuICAgIH1cblxuICAgIC8vIFJldHVybiB0aGUgY2FjaGVkIGltYWdlLlxuICAgIHJldHVybiB0aGlzLl9jYWNoZWRfaW1hZ2U7XG59O1xuXG4vKipcbiAqIFB1dCdzIGEgcmF3IGltYWdlIG9uIHRoZSBjYW52YXMgc29tZXdoZXJlLlxuICogQHBhcmFtICB7ZmxvYXR9IHhcbiAqIEBwYXJhbSAge2Zsb2F0fSB5XG4gKiBAcmV0dXJuIHtpbWFnZX0gY2FudmFzIGltYWdlIGRhdGFcbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5wdXRfcmF3X2ltYWdlID0gZnVuY3Rpb24oaW1nLCB4LCB5KSB7XG4gICAgY29uc29sZS53YXJuKCdwdXRfcmF3X2ltYWdlIGltYWdlIGlzIHNsb3csIHVzZSBkcmF3X2ltYWdlIGluc3RlYWQnKTtcbiAgICB4ID0gdGhpcy5fdHgoeCk7XG4gICAgeSA9IHRoaXMuX3R5KHkpO1xuICAgIC8vIE11bHRpcGx5IGJ5IHR3byBmb3IgcGl4ZWwgZG91YmxpbmcuXG4gICAgcmV0ID0gdGhpcy5jb250ZXh0LnB1dEltYWdlRGF0YShpbWcsIHgqMiwgeSoyKTtcbiAgICB0aGlzLl90b3VjaCh4LCB5LCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCk7XG4gICAgcmV0dXJuIHJldDtcbn07XG5cbi8qKlxuICogTWVhc3VyZXMgdGhlIHdpZHRoIG9mIGEgdGV4dCBzdHJpbmcuXG4gKiBAcGFyYW0gIHtzdHJpbmd9IHRleHRcbiAqIEBwYXJhbSAge2RpY3Rpb25hcnl9IG9wdGlvbnMsIHNlZSBfYXBwbHlfb3B0aW9ucygpIGZvciBkZXRhaWxzXG4gKiBAcmV0dXJuIHtmbG9hdH0gd2lkdGhcbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5tZWFzdXJlX3RleHQgPSBmdW5jdGlvbih0ZXh0LCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IHRoaXMuX2FwcGx5X29wdGlvbnMob3B0aW9ucyk7XG4gICAgcmV0dXJuIHRoaXMuY29udGV4dC5tZWFzdXJlVGV4dCh0ZXh0KS53aWR0aDtcbn07XG5cbi8qKlxuICogQ2xlYXIncyB0aGUgY2FudmFzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuY29udGV4dC5jbGVhclJlY3QoMCwgMCwgdGhpcy53aWR0aCwgdGhpcy5oZWlnaHQpO1xuICAgIHRoaXMuX3RvdWNoKCk7XG59O1xuXG4vKipcbiAqIFNjYWxlIHRoZSBjdXJyZW50IGRyYXdpbmcuXG4gKiBAcGFyYW0gIHtmbG9hdH0geFxuICogQHBhcmFtICB7ZmxvYXR9IHlcbiAqIEByZXR1cm4ge251bGx9ICBcbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5zY2FsZSA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICB0aGlzLmNvbnRleHQuc2NhbGUoeCwgeSk7XG4gICAgdGhpcy5fdG91Y2goKTtcbn07XG5cbi8qKlxuICogRmluaXNoZXMgdGhlIGRyYXdpbmcgb3BlcmF0aW9uIHVzaW5nIHRoZSBzZXQgb2YgcHJvdmlkZWQgb3B0aW9ucy5cbiAqIEBwYXJhbSAge2RpY3Rpb25hcnl9IChvcHRpb25hbCkgZGljdGlvbmFyeSB0aGF0IFxuICogIHJlc29sdmVzIHRvIGEgZGljdGlvbmFyeS5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuX2RvX2RyYXcgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IHRoaXMuX2FwcGx5X29wdGlvbnMob3B0aW9ucyk7XG5cbiAgICAvLyBPbmx5IGZpbGwgaWYgYSBmaWxsIGlzIGRlZmluZWQuXG4gICAgaWYgKG9wdGlvbnMuZmlsbCkge1xuICAgICAgICB0aGlzLmNvbnRleHQuZmlsbCgpO1xuICAgIH1cbiAgICAvLyBTdHJva2UgYnkgZGVmYXVsdCwgaWYgbm8gc3Ryb2tlIG9yIGZpbGwgaXMgZGVmaW5lZC4gIE90aGVyd2lzZVxuICAgIC8vIG9ubHkgc3Ryb2tlIGlmIGEgc3Ryb2tlIGlzIGRlZmluZWQuXG4gICAgaWYgKG9wdGlvbnMuc3Ryb2tlIHx8ICFvcHRpb25zLmZpbGwpIHtcbiAgICAgICAgdGhpcy5jb250ZXh0LnN0cm9rZSgpO1xuICAgIH1cbn07XG5cbi8qKlxuICogQXBwbGllcyBhIGRpY3Rpb25hcnkgb2YgZHJhd2luZyBvcHRpb25zIHRvIHRoZSBwZW4uXG4gKiBAcGFyYW0gIHtkaWN0aW9uYXJ5fSBvcHRpb25zXG4gKiAgICAgIGFscGhhIHtmbG9hdH0gT3BhY2l0eSAoMC0xKVxuICogICAgICBjb21wb3NpdGVfb3BlcmF0aW9uIHtzdHJpbmd9IEhvdyBuZXcgaW1hZ2VzIGFyZSBcbiAqICAgICAgICAgIGRyYXduIG9udG8gYW4gZXhpc3RpbmcgaW1hZ2UuICBQb3NzaWJsZSB2YWx1ZXNcbiAqICAgICAgICAgIGFyZSBgc291cmNlLW92ZXJgLCBgc291cmNlLWF0b3BgLCBgc291cmNlLWluYCwgXG4gKiAgICAgICAgICBgc291cmNlLW91dGAsIGBkZXN0aW5hdGlvbi1vdmVyYCwgXG4gKiAgICAgICAgICBgZGVzdGluYXRpb24tYXRvcGAsIGBkZXN0aW5hdGlvbi1pbmAsIFxuICogICAgICAgICAgYGRlc3RpbmF0aW9uLW91dGAsIGBsaWdodGVyYCwgYGNvcHlgLCBvciBgeG9yYC5cbiAqICAgICAgbGluZV9jYXAge3N0cmluZ30gRW5kIGNhcCBzdHlsZSBmb3IgbGluZXMuXG4gKiAgICAgICAgICBQb3NzaWJsZSB2YWx1ZXMgYXJlICdidXR0JywgJ3JvdW5kJywgb3IgJ3NxdWFyZScuXG4gKiAgICAgIGxpbmVfam9pbiB7c3RyaW5nfSBIb3cgdG8gcmVuZGVyIHdoZXJlIHR3byBsaW5lc1xuICogICAgICAgICAgbWVldC4gIFBvc3NpYmxlIHZhbHVlcyBhcmUgJ2JldmVsJywgJ3JvdW5kJywgb3JcbiAqICAgICAgICAgICdtaXRlcicuXG4gKiAgICAgIGxpbmVfd2lkdGgge2Zsb2F0fSBIb3cgdGhpY2sgbGluZXMgYXJlLlxuICogICAgICBsaW5lX21pdGVyX2xpbWl0IHtmbG9hdH0gTWF4IGxlbmd0aCBvZiBtaXRlcnMuXG4gKiAgICAgIGxpbmVfY29sb3Ige3N0cmluZ30gQ29sb3Igb2YgdGhlIGxpbmUuXG4gKiAgICAgIGZpbGxfY29sb3Ige3N0cmluZ30gQ29sb3IgdG8gZmlsbCB0aGUgc2hhcGUuXG4gKiAgICAgIGNvbG9yIHtzdHJpbmd9IENvbG9yIHRvIHN0cm9rZSBhbmQgZmlsbCB0aGUgc2hhcGUuXG4gKiAgICAgICAgICBMb3dlciBwcmlvcml0eSB0byBsaW5lX2NvbG9yIGFuZCBmaWxsX2NvbG9yLlxuICogICAgICBmb250X3N0eWxlIHtzdHJpbmd9XG4gKiAgICAgIGZvbnRfdmFyaWFudCB7c3RyaW5nfVxuICogICAgICBmb250X3dlaWdodCB7c3RyaW5nfVxuICogICAgICBmb250X3NpemUge3N0cmluZ31cbiAqICAgICAgZm9udF9mYW1pbHkge3N0cmluZ31cbiAqICAgICAgZm9udCB7c3RyaW5nfSBPdmVycmlkZGVzIGFsbCBvdGhlciBmb250IHByb3BlcnRpZXMuXG4gKiAgICAgIHRleHRfYWxpZ24ge3N0cmluZ30gSG9yaXpvbnRhbCBhbGlnbm1lbnQgb2YgdGV4dC4gIFxuICogICAgICAgICAgUG9zc2libGUgdmFsdWVzIGFyZSBgc3RhcnRgLCBgZW5kYCwgYGNlbnRlcmAsXG4gKiAgICAgICAgICBgbGVmdGAsIG9yIGByaWdodGAuXG4gKiAgICAgIHRleHRfYmFzZWxpbmUge3N0cmluZ30gVmVydGljYWwgYWxpZ25tZW50IG9mIHRleHQuXG4gKiAgICAgICAgICBQb3NzaWJsZSB2YWx1ZXMgYXJlIGBhbHBoYWJldGljYCwgYHRvcGAsIFxuICogICAgICAgICAgYGhhbmdpbmdgLCBgbWlkZGxlYCwgYGlkZW9ncmFwaGljYCwgb3IgXG4gKiAgICAgICAgICBgYm90dG9tYC5cbiAqIEByZXR1cm4ge2RpY3Rpb25hcnl9IG9wdGlvbnMsIHJlc29sdmVkLlxuICovXG5DYW52YXMucHJvdG90eXBlLl9hcHBseV9vcHRpb25zID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIG9wdGlvbnMgPSB1dGlscy5yZXNvbHZlX2NhbGxhYmxlKG9wdGlvbnMpO1xuXG4gICAgLy8gU3BlY2lhbCBvcHRpb25zLlxuICAgIHRoaXMuY29udGV4dC5nbG9iYWxBbHBoYSA9IG9wdGlvbnMuYWxwaGEgfHwgMS4wO1xuICAgIHRoaXMuY29udGV4dC5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb24gPSBvcHRpb25zLmNvbXBvc2l0ZV9vcGVyYXRpb24gfHwgJ3NvdXJjZS1vdmVyJztcbiAgICBcbiAgICAvLyBMaW5lIHN0eWxlLlxuICAgIHRoaXMuY29udGV4dC5saW5lQ2FwID0gb3B0aW9ucy5saW5lX2NhcCB8fCAnYnV0dCc7XG4gICAgdGhpcy5jb250ZXh0LmxpbmVKb2luID0gb3B0aW9ucy5saW5lX2pvaW4gfHwgJ2JldmVsJztcbiAgICB0aGlzLmNvbnRleHQubGluZVdpZHRoID0gb3B0aW9ucy5saW5lX3dpZHRoIHx8IDEuMDtcbiAgICB0aGlzLmNvbnRleHQubWl0ZXJMaW1pdCA9IG9wdGlvbnMubGluZV9taXRlcl9saW1pdCB8fCAxMDtcbiAgICB0aGlzLmNvbnRleHQuc3Ryb2tlU3R5bGUgPSBvcHRpb25zLmxpbmVfY29sb3IgfHwgb3B0aW9ucy5jb2xvciB8fCAnYmxhY2snOyAvLyBUT0RPOiBTdXBwb3J0IGdyYWRpZW50XG4gICAgb3B0aW9ucy5zdHJva2UgPSAob3B0aW9ucy5saW5lX2NvbG9yICE9PSB1bmRlZmluZWQgfHwgb3B0aW9ucy5saW5lX3dpZHRoICE9PSB1bmRlZmluZWQpO1xuXG4gICAgLy8gRmlsbCBzdHlsZS5cbiAgICB0aGlzLmNvbnRleHQuZmlsbFN0eWxlID0gb3B0aW9ucy5maWxsX2NvbG9yIHx8IG9wdGlvbnMuY29sb3IgfHwgJ2JsYWNrJzsgLy8gVE9ETzogU3VwcG9ydCBncmFkaWVudFxuICAgIG9wdGlvbnMuZmlsbCA9IG9wdGlvbnMuZmlsbF9jb2xvciAhPT0gdW5kZWZpbmVkO1xuXG4gICAgLy8gRm9udCBzdHlsZS5cbiAgICB2YXIgZm9udF9zdHlsZSA9IG9wdGlvbnMuZm9udF9zdHlsZSB8fCAnJztcbiAgICB2YXIgZm9udF92YXJpYW50ID0gb3B0aW9ucy5mb250X3ZhcmlhbnQgfHwgJyc7XG4gICAgdmFyIGZvbnRfd2VpZ2h0ID0gb3B0aW9ucy5mb250X3dlaWdodCB8fCAnJztcbiAgICB2YXIgZm9udF9zaXplID0gb3B0aW9ucy5mb250X3NpemUgfHwgJzEycHQnO1xuICAgIHZhciBmb250X2ZhbWlseSA9IG9wdGlvbnMuZm9udF9mYW1pbHkgfHwgJ0FyaWFsJztcbiAgICB2YXIgZm9udCA9IGZvbnRfc3R5bGUgKyAnICcgKyBmb250X3ZhcmlhbnQgKyAnICcgKyBmb250X3dlaWdodCArICcgJyArIGZvbnRfc2l6ZSArICcgJyArIGZvbnRfZmFtaWx5O1xuICAgIHRoaXMuY29udGV4dC5mb250ID0gb3B0aW9ucy5mb250IHx8IGZvbnQ7XG5cbiAgICAvLyBUZXh0IHN0eWxlLlxuICAgIHRoaXMuY29udGV4dC50ZXh0QWxpZ24gPSBvcHRpb25zLnRleHRfYWxpZ24gfHwgJ2xlZnQnO1xuICAgIHRoaXMuY29udGV4dC50ZXh0QmFzZWxpbmUgPSBvcHRpb25zLnRleHRfYmFzZWxpbmUgfHwgJ3RvcCc7XG5cbiAgICAvLyBUT0RPOiBTdXBwb3J0IHNoYWRvd3MuXG5cbiAgICByZXR1cm4gb3B0aW9ucztcbn07XG5cbi8qKlxuICogVXBkYXRlIHRoZSB0aW1lc3RhbXAgdGhhdCB0aGUgY2FudmFzIHdhcyBtb2RpZmllZCBhbmRcbiAqIHRoZSByZWdpb24gdGhhdCBoYXMgY29udGVudHMgcmVuZGVyZWQgdG8gaXQuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DYW52YXMucHJvdG90eXBlLl90b3VjaCA9IGZ1bmN0aW9uKHgxLCB5MSwgeDIsIHkyKSB7XG4gICAgdGhpcy5fbW9kaWZpZWQgPSBEYXRlLm5vdygpO1xuXG4gICAgLy8gU2V0IHRoZSByZW5kZXIgcmVnaW9uLlxuICAgIHZhciBjb21wYXJpdG9yID0gZnVuY3Rpb24ob2xkX3ZhbHVlLCBuZXdfdmFsdWUsIGNvbXBhcmlzb24pIHtcbiAgICAgICAgaWYgKG9sZF92YWx1ZSA9PT0gbnVsbCB8fCBvbGRfdmFsdWUgPT09IHVuZGVmaW5lZCB8fCBuZXdfdmFsdWUgPT09IG51bGwgfHwgbmV3X3ZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXdfdmFsdWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gY29tcGFyaXNvbi5jYWxsKHVuZGVmaW5lZCwgb2xkX3ZhbHVlLCBuZXdfdmFsdWUpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB0aGlzLl9yZW5kZXJlZF9yZWdpb25bMF0gPSBjb21wYXJpdG9yKHRoaXMuX3JlbmRlcmVkX3JlZ2lvblswXSwgeDEsIE1hdGgubWluKTtcbiAgICB0aGlzLl9yZW5kZXJlZF9yZWdpb25bMV0gPSBjb21wYXJpdG9yKHRoaXMuX3JlbmRlcmVkX3JlZ2lvblsxXSwgeTEsIE1hdGgubWluKTtcbiAgICB0aGlzLl9yZW5kZXJlZF9yZWdpb25bMl0gPSBjb21wYXJpdG9yKHRoaXMuX3JlbmRlcmVkX3JlZ2lvblsyXSwgeDIsIE1hdGgubWF4KTtcbiAgICB0aGlzLl9yZW5kZXJlZF9yZWdpb25bM10gPSBjb21wYXJpdG9yKHRoaXMuX3JlbmRlcmVkX3JlZ2lvblszXSwgeTIsIE1hdGgubWF4KTtcbn07XG5cbi8qKlxuICogVHJhbnNmb3JtIGFuIHggdmFsdWUgYmVmb3JlIHJlbmRlcmluZy5cbiAqIEBwYXJhbSAge2Zsb2F0fSB4XG4gKiBAcGFyYW0gIHtib29sZWFufSBpbnZlcnNlIC0gcGVyZm9ybSBpbnZlcnNlIHRyYW5zZm9ybWF0aW9uXG4gKiBAcmV0dXJuIHtmbG9hdH1cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5fdHggPSBmdW5jdGlvbih4LCBpbnZlcnNlKSB7IHJldHVybiB4OyB9O1xuXG4vKipcbiAqIFRyYW5zZm9ybSBhIHkgdmFsdWUgYmVmb3JlIHJlbmRlcmluZy5cbiAqIEBwYXJhbSAge2Zsb2F0fSB5XG4gKiBAcGFyYW0gIHtib29sZWFufSBpbnZlcnNlIC0gcGVyZm9ybSBpbnZlcnNlIHRyYW5zZm9ybWF0aW9uXG4gKiBAcmV0dXJuIHtmbG9hdH1cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5fdHkgPSBmdW5jdGlvbih5LCBpbnZlcnNlKSB7IHJldHVybiB5OyB9O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLkNhbnZhcyA9IENhbnZhcztcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKTtcblxuLyoqXG4gKiBFdmVudGZ1bCBjbGlwYm9hcmQgc3VwcG9ydFxuICpcbiAqIFdBUk5JTkc6ICBUaGlzIGNsYXNzIGlzIGEgaHVkZ2Uga2x1ZGdlIHRoYXQgd29ya3MgYXJvdW5kIHRoZSBwcmVoaXN0b3JpY1xuICogY2xpcGJvYXJkIHN1cHBvcnQgKGxhY2sgdGhlcmVvZikgaW4gbW9kZXJuIHdlYnJvd3NlcnMuICBJdCBjcmVhdGVzIGEgaGlkZGVuXG4gKiB0ZXh0Ym94IHdoaWNoIGlzIGZvY3VzZWQuICBUaGUgcHJvZ3JhbW1lciBtdXN0IGNhbGwgYHNldF9jbGlwcGFibGVgIHRvIGNoYW5nZVxuICogd2hhdCB3aWxsIGJlIGNvcGllZCB3aGVuIHRoZSB1c2VyIGhpdHMga2V5cyBjb3JyZXNwb25kaW5nIHRvIGEgY29weSBcbiAqIG9wZXJhdGlvbi4gIEV2ZW50cyBgY29weWAsIGBjdXRgLCBhbmQgYHBhc3RlYCBhcmUgcmFpc2VkIGJ5IHRoaXMgY2xhc3MuXG4gKi9cbnZhciBDbGlwYm9hcmQgPSBmdW5jdGlvbihlbCkge1xuICAgIHV0aWxzLlBvc3RlckNsYXNzLmNhbGwodGhpcyk7XG4gICAgdGhpcy5fZWwgPSBlbDtcblxuICAgIC8vIENyZWF0ZSBhIHRleHRib3ggdGhhdCdzIGhpZGRlbi5cbiAgICB0aGlzLmhpZGRlbl9pbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RleHRhcmVhJyk7XG4gICAgdGhpcy5oaWRkZW5faW5wdXQuc2V0QXR0cmlidXRlKCdjbGFzcycsICdwb3N0ZXIgaGlkZGVuLWNsaXBib2FyZCcpO1xuICAgIGVsLmFwcGVuZENoaWxkKHRoaXMuaGlkZGVuX2lucHV0KTtcblxuICAgIHRoaXMuX2JpbmRfZXZlbnRzKCk7XG59O1xudXRpbHMuaW5oZXJpdChDbGlwYm9hcmQsIHV0aWxzLlBvc3RlckNsYXNzKTtcblxuLyoqXG4gKiBTZXQgd2hhdCB3aWxsIGJlIGNvcGllZCB3aGVuIHRoZSB1c2VyIGNvcGllcy5cbiAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0XG4gKi9cbkNsaXBib2FyZC5wcm90b3R5cGUuc2V0X2NsaXBwYWJsZSA9IGZ1bmN0aW9uKHRleHQpIHtcbiAgICB0aGlzLl9jbGlwcGFibGUgPSB0ZXh0O1xuICAgIHRoaXMuaGlkZGVuX2lucHV0LnZhbHVlID0gdGhpcy5fY2xpcHBhYmxlO1xuICAgIHRoaXMuX2ZvY3VzKCk7XG59OyBcblxuLyoqXG4gKiBGb2N1cyB0aGUgaGlkZGVuIHRleHQgYXJlYS5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkNsaXBib2FyZC5wcm90b3R5cGUuX2ZvY3VzID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5oaWRkZW5faW5wdXQuZm9jdXMoKTtcbiAgICB0aGlzLmhpZGRlbl9pbnB1dC5zZWxlY3QoKTtcbn07XG5cbi8qKlxuICogSGFuZGxlIHdoZW4gdGhlIHVzZXIgcGFzdGVzIGludG8gdGhlIHRleHRib3guXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DbGlwYm9hcmQucHJvdG90eXBlLl9oYW5kbGVfcGFzdGUgPSBmdW5jdGlvbihlKSB7XG4gICAgdmFyIHBhc3RlZCA9IGUuY2xpcGJvYXJkRGF0YS5nZXREYXRhKGUuY2xpcGJvYXJkRGF0YS50eXBlc1swXSk7XG4gICAgdXRpbHMuY2FuY2VsX2J1YmJsZShlKTtcbiAgICB0aGlzLnRyaWdnZXIoJ3Bhc3RlJywgcGFzdGVkKTtcbn07XG5cbi8qKlxuICogQmluZCBldmVudHMgb2YgdGhlIGhpZGRlbiB0ZXh0Ym94LlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ2xpcGJvYXJkLnByb3RvdHlwZS5fYmluZF9ldmVudHMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG5cbiAgICAvLyBMaXN0ZW4gdG8gZWwncyBmb2N1cyBldmVudC4gIElmIGVsIGlzIGZvY3VzZWQsIGZvY3VzIHRoZSBoaWRkZW4gaW5wdXRcbiAgICAvLyBpbnN0ZWFkLlxuICAgIHV0aWxzLmhvb2sodGhpcy5fZWwsICdvbmZvY3VzJywgdXRpbHMucHJveHkodGhpcy5fZm9jdXMsIHRoaXMpKTtcblxuICAgIHV0aWxzLmhvb2sodGhpcy5oaWRkZW5faW5wdXQsICdvbnBhc3RlJywgdXRpbHMucHJveHkodGhpcy5faGFuZGxlX3Bhc3RlLCB0aGlzKSk7XG4gICAgdXRpbHMuaG9vayh0aGlzLmhpZGRlbl9pbnB1dCwgJ29uY3V0JywgZnVuY3Rpb24oZSkge1xuICAgICAgICAvLyBUcmlnZ2VyIHRoZSBldmVudCBpbiBhIHRpbWVvdXQgc28gaXQgZmlyZXMgYWZ0ZXIgdGhlIHN5c3RlbSBldmVudC5cbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgdGhhdC50cmlnZ2VyKCdjdXQnLCB0aGF0Ll9jbGlwcGFibGUpO1xuICAgICAgICB9LCAwKTtcbiAgICB9KTtcbiAgICB1dGlscy5ob29rKHRoaXMuaGlkZGVuX2lucHV0LCAnb25jb3B5JywgZnVuY3Rpb24oZSkge1xuICAgICAgICB0aGF0LnRyaWdnZXIoJ2NvcHknLCB0aGF0Ll9jbGlwcGFibGUpO1xuICAgIH0pO1xuICAgIHV0aWxzLmhvb2sodGhpcy5oaWRkZW5faW5wdXQsICdvbmtleXByZXNzJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0aGF0LmhpZGRlbl9pbnB1dC52YWx1ZSA9IHRoYXQuX2NsaXBwYWJsZTtcbiAgICAgICAgICAgIHRoYXQuX2ZvY3VzKCk7XG4gICAgICAgIH0sIDApO1xuICAgIH0pO1xuICAgIHV0aWxzLmhvb2sodGhpcy5oaWRkZW5faW5wdXQsICdvbmtleXVwJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0aGF0LmhpZGRlbl9pbnB1dC52YWx1ZSA9IHRoYXQuX2NsaXBwYWJsZTtcbiAgICAgICAgICAgIHRoYXQuX2ZvY3VzKCk7XG4gICAgICAgIH0sIDApO1xuICAgIH0pO1xufTtcblxuZXhwb3J0cy5DbGlwYm9hcmQgPSBDbGlwYm9hcmQ7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxudmFyIGtleW1hcCA9IHJlcXVpcmUoJy4vZXZlbnRzL21hcC5qcycpO1xudmFyIHJlZ2lzdGVyID0ga2V5bWFwLk1hcC5yZWdpc3RlcjtcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xuXG4vKipcbiAqIElucHV0IGN1cnNvci5cbiAqL1xudmFyIEN1cnNvciA9IGZ1bmN0aW9uKG1vZGVsKSB7XG4gICAgdXRpbHMuUG9zdGVyQ2xhc3MuY2FsbCh0aGlzKTtcbiAgICB0aGlzLl9tb2RlbCA9IG1vZGVsO1xuXG4gICAgdGhpcy5wcmltYXJ5X3JvdyA9IG51bGw7XG4gICAgdGhpcy5wcmltYXJ5X2NoYXIgPSBudWxsO1xuICAgIHRoaXMuc2Vjb25kYXJ5X3JvdyA9IG51bGw7XG4gICAgdGhpcy5zZWNvbmRhcnlfY2hhciA9IG51bGw7XG5cbiAgICB0aGlzLl9pbml0X3Byb3BlcnRpZXMoKTtcbiAgICB0aGlzLl9yZWdpc3Rlcl9hcGkoKTtcbn07XG51dGlscy5pbmhlcml0KEN1cnNvciwgdXRpbHMuUG9zdGVyQ2xhc3MpO1xuXG4vKipcbiAqIE1vdmVzIHRoZSBwcmltYXJ5IGN1cnNvciBhIGdpdmVuIG9mZnNldC5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IHhcbiAqIEBwYXJhbSAge2ludGVnZXJ9IHlcbiAqIEBwYXJhbSAge2Jvb2xlYW59IChvcHRpb25hbCkgaG9wPWZhbHNlIC0gaG9wIHRvIHRoZSBvdGhlciBzaWRlIG9mIHRoZVxuICogICAgICAgICAgICAgICAgICAgc2VsZWN0ZWQgcmVnaW9uIGlmIHRoZSBwcmltYXJ5IGlzIG9uIHRoZSBvcHBvc2l0ZSBvZiB0aGVcbiAqICAgICAgICAgICAgICAgICAgIGRpcmVjdGlvbiBvZiBtb3Rpb24uXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3IucHJvdG90eXBlLm1vdmVfcHJpbWFyeSA9IGZ1bmN0aW9uKHgsIHksIGhvcCkge1xuICAgIGlmIChob3ApIHtcbiAgICAgICAgaWYgKHRoaXMucHJpbWFyeV9yb3cgIT0gdGhpcy5zZWNvbmRhcnlfcm93IHx8IHRoaXMucHJpbWFyeV9jaGFyICE9IHRoaXMuc2Vjb25kYXJ5X2NoYXIpIHtcbiAgICAgICAgICAgIHZhciBzdGFydF9yb3cgPSB0aGlzLnN0YXJ0X3JvdztcbiAgICAgICAgICAgIHZhciBzdGFydF9jaGFyID0gdGhpcy5zdGFydF9jaGFyO1xuICAgICAgICAgICAgdmFyIGVuZF9yb3cgPSB0aGlzLmVuZF9yb3c7XG4gICAgICAgICAgICB2YXIgZW5kX2NoYXIgPSB0aGlzLmVuZF9jaGFyO1xuICAgICAgICAgICAgaWYgKHg8MCB8fCB5PDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLnByaW1hcnlfcm93ID0gc3RhcnRfcm93O1xuICAgICAgICAgICAgICAgIHRoaXMucHJpbWFyeV9jaGFyID0gc3RhcnRfY2hhcjtcbiAgICAgICAgICAgICAgICB0aGlzLnNlY29uZGFyeV9yb3cgPSBlbmRfcm93O1xuICAgICAgICAgICAgICAgIHRoaXMuc2Vjb25kYXJ5X2NoYXIgPSBlbmRfY2hhcjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wcmltYXJ5X3JvdyA9IGVuZF9yb3c7XG4gICAgICAgICAgICAgICAgdGhpcy5wcmltYXJ5X2NoYXIgPSBlbmRfY2hhcjtcbiAgICAgICAgICAgICAgICB0aGlzLnNlY29uZGFyeV9yb3cgPSBzdGFydF9yb3c7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWNvbmRhcnlfY2hhciA9IHN0YXJ0X2NoYXI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoeCA8IDApIHtcbiAgICAgICAgaWYgKHRoaXMucHJpbWFyeV9jaGFyICsgeCA8IDApIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnByaW1hcnlfcm93ID09PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wcmltYXJ5X2NoYXIgPSAwO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnByaW1hcnlfcm93IC09IDE7XG4gICAgICAgICAgICAgICAgdGhpcy5wcmltYXJ5X2NoYXIgPSB0aGlzLl9tb2RlbC5fcm93c1t0aGlzLnByaW1hcnlfcm93XS5sZW5ndGg7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnByaW1hcnlfY2hhciArPSB4O1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmICh4ID4gMCkge1xuICAgICAgICBpZiAodGhpcy5wcmltYXJ5X2NoYXIgKyB4ID4gdGhpcy5fbW9kZWwuX3Jvd3NbdGhpcy5wcmltYXJ5X3Jvd10ubGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5wcmltYXJ5X3JvdyA9PT0gdGhpcy5fbW9kZWwuX3Jvd3MubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgICAgIHRoaXMucHJpbWFyeV9jaGFyID0gdGhpcy5fbW9kZWwuX3Jvd3NbdGhpcy5wcmltYXJ5X3Jvd10ubGVuZ3RoO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnByaW1hcnlfcm93ICs9IDE7XG4gICAgICAgICAgICAgICAgdGhpcy5wcmltYXJ5X2NoYXIgPSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5wcmltYXJ5X2NoYXIgKz0geDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIFJlbWVtYmVyIHRoZSBjaGFyYWN0ZXIgcG9zaXRpb24sIHZlcnRpY2FsIG5hdmlnYXRpb24gYWNyb3NzIGVtcHR5IGxpbmVzXG4gICAgLy8gc2hvdWxkbid0IGNhdXNlIHRoZSBob3Jpem9udGFsIHBvc2l0aW9uIHRvIGJlIGxvc3QuXG4gICAgaWYgKHggIT09IDApIHtcbiAgICAgICAgdGhpcy5fbWVtb3J5X2NoYXIgPSB0aGlzLnByaW1hcnlfY2hhcjtcbiAgICB9XG5cbiAgICBpZiAoeSAhPT0gMCkge1xuICAgICAgICB0aGlzLnByaW1hcnlfcm93ICs9IHk7XG4gICAgICAgIHRoaXMucHJpbWFyeV9yb3cgPSBNYXRoLm1pbihNYXRoLm1heCh0aGlzLnByaW1hcnlfcm93LCAwKSwgdGhpcy5fbW9kZWwuX3Jvd3MubGVuZ3RoLTEpO1xuICAgICAgICBpZiAodGhpcy5fbWVtb3J5X2NoYXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhpcy5wcmltYXJ5X2NoYXIgPSB0aGlzLl9tZW1vcnlfY2hhcjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5wcmltYXJ5X2NoYXIgPiB0aGlzLl9tb2RlbC5fcm93c1t0aGlzLnByaW1hcnlfcm93XS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMucHJpbWFyeV9jaGFyID0gdGhpcy5fbW9kZWwuX3Jvd3NbdGhpcy5wcmltYXJ5X3Jvd10ubGVuZ3RoO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2UnKTsgXG59O1xuXG4vKipcbiAqIFdhbGsgdGhlIHByaW1hcnkgY3Vyc29yIGluIGEgZGlyZWN0aW9uIHVudGlsIGEgbm90LXRleHQgY2hhcmFjdGVyIGlzIGZvdW5kLlxuICogQHBhcmFtICB7aW50ZWdlcn0gZGlyZWN0aW9uXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3IucHJvdG90eXBlLndvcmRfcHJpbWFyeSA9IGZ1bmN0aW9uKGRpcmVjdGlvbikge1xuICAgIC8vIE1ha2Ugc3VyZSBkaXJlY3Rpb24gaXMgMSBvciAtMS5cbiAgICBkaXJlY3Rpb24gPSBkaXJlY3Rpb24gPCAwID8gLTEgOiAxO1xuXG4gICAgLy8gSWYgbW92aW5nIGxlZnQgYW5kIGF0IGVuZCBvZiByb3csIG1vdmUgdXAgYSByb3cgaWYgcG9zc2libGUuXG4gICAgaWYgKHRoaXMucHJpbWFyeV9jaGFyID09PSAwICYmIGRpcmVjdGlvbiA9PSAtMSkge1xuICAgICAgICBpZiAodGhpcy5wcmltYXJ5X3JvdyAhPT0gMCkge1xuICAgICAgICAgICAgdGhpcy5wcmltYXJ5X3Jvdy0tO1xuICAgICAgICAgICAgdGhpcy5wcmltYXJ5X2NoYXIgPSB0aGlzLl9tb2RlbC5fcm93c1t0aGlzLnByaW1hcnlfcm93XS5sZW5ndGg7XG4gICAgICAgICAgICB0aGlzLl9tZW1vcnlfY2hhciA9IHRoaXMucHJpbWFyeV9jaGFyO1xuICAgICAgICAgICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2UnKTsgXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIElmIG1vdmluZyByaWdodCBhbmQgYXQgZW5kIG9mIHJvdywgbW92ZSBkb3duIGEgcm93IGlmIHBvc3NpYmxlLlxuICAgIGlmICh0aGlzLnByaW1hcnlfY2hhciA+PSB0aGlzLl9tb2RlbC5fcm93c1t0aGlzLnByaW1hcnlfcm93XS5sZW5ndGggJiYgZGlyZWN0aW9uID09IDEpIHtcbiAgICAgICAgaWYgKHRoaXMucHJpbWFyeV9yb3cgPCB0aGlzLl9tb2RlbC5fcm93cy5sZW5ndGgtMSkge1xuICAgICAgICAgICAgdGhpcy5wcmltYXJ5X3JvdysrO1xuICAgICAgICAgICAgdGhpcy5wcmltYXJ5X2NoYXIgPSAwO1xuICAgICAgICAgICAgdGhpcy5fbWVtb3J5X2NoYXIgPSB0aGlzLnByaW1hcnlfY2hhcjtcbiAgICAgICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7IFxuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgaSA9IHRoaXMucHJpbWFyeV9jaGFyO1xuICAgIHZhciBoaXRfdGV4dCA9IGZhbHNlO1xuICAgIHZhciByb3dfdGV4dCA9IHRoaXMuX21vZGVsLl9yb3dzW3RoaXMucHJpbWFyeV9yb3ddO1xuICAgIGlmIChkaXJlY3Rpb24gPT0gLTEpIHtcbiAgICAgICAgd2hpbGUgKDAgPCBpICYmICEoaGl0X3RleHQgJiYgdGhpcy5fbm90X3RleHQocm93X3RleHRbaS0xXSkpKSB7XG4gICAgICAgICAgICBoaXRfdGV4dCA9IGhpdF90ZXh0IHx8ICF0aGlzLl9ub3RfdGV4dChyb3dfdGV4dFtpLTFdKTtcbiAgICAgICAgICAgIGkgKz0gZGlyZWN0aW9uO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgd2hpbGUgKGkgPCByb3dfdGV4dC5sZW5ndGggJiYgIShoaXRfdGV4dCAmJiB0aGlzLl9ub3RfdGV4dChyb3dfdGV4dFtpXSkpKSB7XG4gICAgICAgICAgICBoaXRfdGV4dCA9IGhpdF90ZXh0IHx8ICF0aGlzLl9ub3RfdGV4dChyb3dfdGV4dFtpXSk7XG4gICAgICAgICAgICBpICs9IGRpcmVjdGlvbjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMucHJpbWFyeV9jaGFyID0gaTtcbiAgICB0aGlzLl9tZW1vcnlfY2hhciA9IHRoaXMucHJpbWFyeV9jaGFyO1xuICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7IFxufTtcblxuLyoqXG4gKiBTZWxlY3QgYWxsIG9mIHRoZSB0ZXh0LlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5zZWxlY3RfYWxsID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5wcmltYXJ5X3JvdyA9IHRoaXMuX21vZGVsLl9yb3dzLmxlbmd0aC0xO1xuICAgIHRoaXMucHJpbWFyeV9jaGFyID0gdGhpcy5fbW9kZWwuX3Jvd3NbdGhpcy5wcmltYXJ5X3Jvd10ubGVuZ3RoO1xuICAgIHRoaXMuc2Vjb25kYXJ5X3JvdyA9IDA7XG4gICAgdGhpcy5zZWNvbmRhcnlfY2hhciA9IDA7XG4gICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2UnKTsgXG59O1xuXG4vKipcbiAqIE1vdmUgdGhlIHByaW1hcnkgY3Vyc29yIHRvIHRoZSBsaW5lIGVuZC5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvci5wcm90b3R5cGUucHJpbWFyeV9nb3RvX2VuZCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMucHJpbWFyeV9jaGFyID0gdGhpcy5fbW9kZWwuX3Jvd3NbdGhpcy5wcmltYXJ5X3Jvd10ubGVuZ3RoO1xuICAgIHRoaXMuX21lbW9yeV9jaGFyID0gdGhpcy5wcmltYXJ5X2NoYXI7XG4gICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2UnKTsgXG59O1xuXG4vKipcbiAqIE1vdmUgdGhlIHByaW1hcnkgY3Vyc29yIHRvIHRoZSBsaW5lIHN0YXJ0LlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5wcmltYXJ5X2dvdG9fc3RhcnQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnByaW1hcnlfY2hhciA9IDA7XG4gICAgdGhpcy5fbWVtb3J5X2NoYXIgPSB0aGlzLnByaW1hcnlfY2hhcjtcbiAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZScpOyBcbn07XG5cbi8qKlxuICogU2V0IHRoZSBwcmltYXJ5IGN1cnNvciBwb3NpdGlvblxuICogQHBhcmFtIHtpbnRlZ2VyfSByb3dfaW5kZXhcbiAqIEBwYXJhbSB7aW50ZWdlcn0gY2hhcl9pbmRleFxuICovXG5DdXJzb3IucHJvdG90eXBlLnNldF9wcmltYXJ5ID0gZnVuY3Rpb24ocm93X2luZGV4LCBjaGFyX2luZGV4KSB7XG4gICAgdGhpcy5wcmltYXJ5X3JvdyA9IHJvd19pbmRleDtcbiAgICB0aGlzLnByaW1hcnlfY2hhciA9IGNoYXJfaW5kZXg7XG5cbiAgICAvLyBSZW1lbWJlciB0aGUgY2hhcmFjdGVyIHBvc2l0aW9uLCB2ZXJ0aWNhbCBuYXZpZ2F0aW9uIGFjcm9zcyBlbXB0eSBsaW5lc1xuICAgIC8vIHNob3VsZG4ndCBjYXVzZSB0aGUgaG9yaXpvbnRhbCBwb3NpdGlvbiB0byBiZSBsb3N0LlxuICAgIHRoaXMuX21lbW9yeV9jaGFyID0gdGhpcy5wcmltYXJ5X2NoYXI7XG5cbiAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZScpOyBcbn07XG5cbi8qKlxuICogU2V0IHRoZSBzZWNvbmRhcnkgY3Vyc29yIHBvc2l0aW9uXG4gKiBAcGFyYW0ge2ludGVnZXJ9IHJvd19pbmRleFxuICogQHBhcmFtIHtpbnRlZ2VyfSBjaGFyX2luZGV4XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuc2V0X3NlY29uZGFyeSA9IGZ1bmN0aW9uKHJvd19pbmRleCwgY2hhcl9pbmRleCkge1xuICAgIHRoaXMuc2Vjb25kYXJ5X3JvdyA9IHJvd19pbmRleDtcbiAgICB0aGlzLnNlY29uZGFyeV9jaGFyID0gY2hhcl9pbmRleDsgICAgXG4gICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2UnKTsgXG59O1xuXG4vKipcbiAqIEhhbmRsZXMgd2hlbiBhIGtleSBpcyBwcmVzc2VkLlxuICogQHBhcmFtICB7RXZlbnR9IGUgLSBvcmlnaW5hbCBrZXkgcHJlc3MgZXZlbnQuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3IucHJvdG90eXBlLmtleXByZXNzID0gZnVuY3Rpb24oZSkge1xuICAgIHZhciBjaGFyX2NvZGUgPSBlLndoaWNoIHx8IGUua2V5Q29kZTtcbiAgICB2YXIgY2hhcl90eXBlZCA9IFN0cmluZy5mcm9tQ2hhckNvZGUoY2hhcl9jb2RlKTtcbiAgICB0aGlzLnJlbW92ZV9zZWxlY3RlZCgpO1xuICAgIHRoaXMuX21vZGVsLmFkZF90ZXh0KHRoaXMucHJpbWFyeV9yb3csIHRoaXMucHJpbWFyeV9jaGFyLCBjaGFyX3R5cGVkKTtcbiAgICB0aGlzLm1vdmVfcHJpbWFyeSgxLCAwKTtcbiAgICB0aGlzLl9yZXNldF9zZWNvbmRhcnkoKTtcbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogSW5zZXJ0IGEgbmV3bGluZVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5uZXdsaW5lID0gZnVuY3Rpb24oZSkge1xuICAgIHRoaXMucmVtb3ZlX3NlbGVjdGVkKCk7XG4gICAgdGhpcy5fbW9kZWwuYWRkX3RleHQodGhpcy5wcmltYXJ5X3JvdywgdGhpcy5wcmltYXJ5X2NoYXIsICdcXG4nKTtcbiAgICB0aGlzLm1vdmVfcHJpbWFyeSgwLCAxKTtcbiAgICB0aGlzLl9yZXNldF9zZWNvbmRhcnkoKTtcbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogSW5zZXJ0IHRleHRcbiAqIEBwYXJhbSAge3N0cmluZ30gdGV4dFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5pbnNlcnRfdGV4dCA9IGZ1bmN0aW9uKHRleHQpIHtcbiAgICB0aGlzLnJlbW92ZV9zZWxlY3RlZCgpO1xuICAgIHRoaXMuX21vZGVsLmFkZF90ZXh0KHRoaXMucHJpbWFyeV9yb3csIHRoaXMucHJpbWFyeV9jaGFyLCB0ZXh0KTtcbiAgICBcbiAgICAvLyBNb3ZlIGN1cnNvciB0byB0aGUgZW5kLlxuICAgIGlmICh0ZXh0LmluZGV4T2YoJ1xcbicpPT0tMSkge1xuICAgICAgICB0aGlzLnByaW1hcnlfY2hhciA9IHRoaXMuc3RhcnRfY2hhciArIHRleHQubGVuZ3RoO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBsaW5lcyA9IHRleHQuc3BsaXQoJ1xcbicpO1xuICAgICAgICB0aGlzLnByaW1hcnlfcm93ICs9IGxpbmVzLmxlbmd0aCAtIDE7XG4gICAgICAgIHRoaXMucHJpbWFyeV9jaGFyID0gbGluZXNbbGluZXMubGVuZ3RoLTFdLmxlbmd0aDtcbiAgICB9XG4gICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2UnKTsgXG5cbiAgICB0aGlzLl9yZXNldF9zZWNvbmRhcnkoKTtcbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogUmVtb3ZlIHRoZSBzZWxlY3RlZCB0ZXh0XG4gKiBAcmV0dXJuIHtib29sZWFufSB0cnVlIGlmIHRleHQgd2FzIHJlbW92ZWQuXG4gKi9cbkN1cnNvci5wcm90b3R5cGUucmVtb3ZlX3NlbGVjdGVkID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMucHJpbWFyeV9yb3cgIT09IHRoaXMuc2Vjb25kYXJ5X3JvdyB8fCB0aGlzLnByaW1hcnlfY2hhciAhPT0gdGhpcy5zZWNvbmRhcnlfY2hhcikge1xuICAgICAgICB2YXIgcm93X2luZGV4ID0gdGhpcy5zdGFydF9yb3c7XG4gICAgICAgIHZhciBjaGFyX2luZGV4ID0gdGhpcy5zdGFydF9jaGFyO1xuICAgICAgICB0aGlzLl9tb2RlbC5yZW1vdmVfdGV4dCh0aGlzLnN0YXJ0X3JvdywgdGhpcy5zdGFydF9jaGFyLCB0aGlzLmVuZF9yb3csIHRoaXMuZW5kX2NoYXIpO1xuICAgICAgICB0aGlzLnByaW1hcnlfcm93ID0gcm93X2luZGV4O1xuICAgICAgICB0aGlzLnByaW1hcnlfY2hhciA9IGNoYXJfaW5kZXg7XG4gICAgICAgIHRoaXMuX3Jlc2V0X3NlY29uZGFyeSgpO1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZScpOyBcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn07XG5cbi8qKlxuICogQ29waWVzIHRoZSBzZWxlY3RlZCB0ZXh0LlxuICogQHJldHVybiB7c3RyaW5nfSBzZWxlY3RlZCB0ZXh0XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuY29weSA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLnByaW1hcnlfcm93ID09IHRoaXMuc2Vjb25kYXJ5X3JvdyAmJiB0aGlzLnByaW1hcnlfY2hhciA9PSB0aGlzLnNlY29uZGFyeV9jaGFyKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9tb2RlbC5fcm93c1t0aGlzLnByaW1hcnlfcm93XTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdGhpcy5fbW9kZWwuZ2V0X3RleHQodGhpcy5zdGFydF9yb3csIHRoaXMuc3RhcnRfY2hhciwgdGhpcy5lbmRfcm93LCB0aGlzLmVuZF9jaGFyKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEN1dHMgdGhlIHNlbGVjdGVkIHRleHQuXG4gKiBAcmV0dXJuIHtzdHJpbmd9IHNlbGVjdGVkIHRleHRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5jdXQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGV4dCA9IHRoaXMuY29weSgpO1xuICAgIGlmICh0aGlzLnByaW1hcnlfcm93ID09IHRoaXMuc2Vjb25kYXJ5X3JvdyAmJiB0aGlzLnByaW1hcnlfY2hhciA9PSB0aGlzLnNlY29uZGFyeV9jaGFyKSB7XG4gICAgICAgIHRoaXMuX21vZGVsLnJlbW92ZV9yb3codGhpcy5wcmltYXJ5X3Jvdyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5yZW1vdmVfc2VsZWN0ZWQoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRleHQ7XG59O1xuXG4vKipcbiAqIERlbGV0ZSBmb3J3YXJkLCB0eXBpY2FsbHkgY2FsbGVkIGJ5IGBkZWxldGVgIGtleXByZXNzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5kZWxldGVfZm9yd2FyZCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICghdGhpcy5yZW1vdmVfc2VsZWN0ZWQoKSkge1xuICAgICAgICB0aGlzLm1vdmVfcHJpbWFyeSgxLCAwKTtcbiAgICAgICAgdGhpcy5yZW1vdmVfc2VsZWN0ZWQoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIERlbGV0ZSBiYWNrd2FyZCwgdHlwaWNhbGx5IGNhbGxlZCBieSBgYmFja3NwYWNlYCBrZXlwcmVzcy5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuZGVsZXRlX2JhY2t3YXJkID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKCF0aGlzLnJlbW92ZV9zZWxlY3RlZCgpKSB7XG4gICAgICAgIHRoaXMubW92ZV9wcmltYXJ5KC0xLCAwKTtcbiAgICAgICAgdGhpcy5yZW1vdmVfc2VsZWN0ZWQoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIFJlc2V0IHRoZSBzZWNvbmRhcnkgY3Vyc29yIHRvIHRoZSB2YWx1ZSBvZiB0aGUgcHJpbWFyeS5cbiAqIEByZXR1cm4ge1t0eXBlXX0gW2Rlc2NyaXB0aW9uXVxuICovXG5DdXJzb3IucHJvdG90eXBlLl9yZXNldF9zZWNvbmRhcnkgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnNlY29uZGFyeV9yb3cgPSB0aGlzLnByaW1hcnlfcm93O1xuICAgIHRoaXMuc2Vjb25kYXJ5X2NoYXIgPSB0aGlzLnByaW1hcnlfY2hhcjtcblxuICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7IFxufTtcblxuLyoqXG4gKiBDcmVhdGUgdGhlIHByb3BlcnRpZXMgb2YgdGhlIGN1cnNvci5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuX2luaXRfcHJvcGVydGllcyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLnByb3BlcnR5KCdzdGFydF9yb3cnLCBmdW5jdGlvbigpIHsgcmV0dXJuIE1hdGgubWluKHRoYXQucHJpbWFyeV9yb3csIHRoYXQuc2Vjb25kYXJ5X3Jvdyk7IH0pO1xuICAgIHRoaXMucHJvcGVydHkoJ2VuZF9yb3cnLCBmdW5jdGlvbigpIHsgcmV0dXJuIE1hdGgubWF4KHRoYXQucHJpbWFyeV9yb3csIHRoYXQuc2Vjb25kYXJ5X3Jvdyk7IH0pO1xuICAgIHRoaXMucHJvcGVydHkoJ3N0YXJ0X2NoYXInLCBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHRoYXQucHJpbWFyeV9yb3cgPCB0aGF0LnNlY29uZGFyeV9yb3cgfHwgKHRoYXQucHJpbWFyeV9yb3cgPT0gdGhhdC5zZWNvbmRhcnlfcm93ICYmIHRoYXQucHJpbWFyeV9jaGFyIDw9IHRoYXQuc2Vjb25kYXJ5X2NoYXIpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhhdC5wcmltYXJ5X2NoYXI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhhdC5zZWNvbmRhcnlfY2hhcjtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHRoaXMucHJvcGVydHkoJ2VuZF9jaGFyJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0aGF0LnByaW1hcnlfcm93IDwgdGhhdC5zZWNvbmRhcnlfcm93IHx8ICh0aGF0LnByaW1hcnlfcm93ID09IHRoYXQuc2Vjb25kYXJ5X3JvdyAmJiB0aGF0LnByaW1hcnlfY2hhciA8PSB0aGF0LnNlY29uZGFyeV9jaGFyKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoYXQuc2Vjb25kYXJ5X2NoYXI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhhdC5wcmltYXJ5X2NoYXI7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cbi8qKlxuICogQ2hlY2tzIGlmIHRoZSBjaGFyYWN0ZXIgaXNuJ3QgdGV4dC5cbiAqIEBwYXJhbSAge2NoYXJ9IGMgLSBjaGFyYWN0ZXJcbiAqIEByZXR1cm4ge2Jvb2xlYW59IHRydWUgaWYgdGhlIGNoYXJhY3RlciBpcyBub3QgdGV4dC5cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5fbm90X3RleHQgPSBmdW5jdGlvbihjKSB7XG4gICAgcmV0dXJuICdhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejEyMzQ1Njc4OTAnLmluZGV4T2YoYy50b0xvd2VyQ2FzZSgpKSA9PSAtMTtcbn07XG5cbi8qKlxuICogUmVnaXN0ZXJzIGFuIGFjdGlvbiBBUEkgd2l0aCB0aGUgbWFwXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3IucHJvdG90eXBlLl9yZWdpc3Rlcl9hcGkgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5yZW1vdmVfc2VsZWN0ZWQnLCB1dGlscy5wcm94eSh0aGlzLnJlbW92ZV9zZWxlY3RlZCwgdGhpcyksIHRoaXMpO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3Iua2V5cHJlc3MnLCB1dGlscy5wcm94eSh0aGlzLmtleXByZXNzLCB0aGlzKSwgdGhpcyk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5uZXdsaW5lJywgdXRpbHMucHJveHkodGhpcy5uZXdsaW5lLCB0aGlzKSwgdGhpcyk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5pbnNlcnRfdGV4dCcsIHV0aWxzLnByb3h5KHRoaXMuaW5zZXJ0X3RleHQsIHRoaXMpLCB0aGlzKTtcbiAgICByZWdpc3RlcignY3Vyc29yLmRlbGV0ZV9iYWNrd2FyZCcsIHV0aWxzLnByb3h5KHRoaXMuZGVsZXRlX2JhY2t3YXJkLCB0aGlzKSwgdGhpcyk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5kZWxldGVfZm9yd2FyZCcsIHV0aWxzLnByb3h5KHRoaXMuZGVsZXRlX2ZvcndhcmQsIHRoaXMpLCB0aGlzKTtcbiAgICByZWdpc3RlcignY3Vyc29yLnNlbGVjdF9hbGwnLCB1dGlscy5wcm94eSh0aGlzLnNlbGVjdF9hbGwsIHRoaXMpLCB0aGlzKTtcbiAgICByZWdpc3RlcignY3Vyc29yLmxlZnQnLCBmdW5jdGlvbigpIHsgdGhhdC5tb3ZlX3ByaW1hcnkoLTEsIDAsIHRydWUpOyB0aGF0Ll9yZXNldF9zZWNvbmRhcnkoKTsgcmV0dXJuIHRydWU7IH0pO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3IucmlnaHQnLCBmdW5jdGlvbigpIHsgdGhhdC5tb3ZlX3ByaW1hcnkoMSwgMCwgdHJ1ZSk7IHRoYXQuX3Jlc2V0X3NlY29uZGFyeSgpOyByZXR1cm4gdHJ1ZTsgfSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci51cCcsIGZ1bmN0aW9uKCkgeyB0aGF0Lm1vdmVfcHJpbWFyeSgwLCAtMSwgdHJ1ZSk7IHRoYXQuX3Jlc2V0X3NlY29uZGFyeSgpOyByZXR1cm4gdHJ1ZTsgfSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5kb3duJywgZnVuY3Rpb24oKSB7IHRoYXQubW92ZV9wcmltYXJ5KDAsIDEsIHRydWUpOyB0aGF0Ll9yZXNldF9zZWNvbmRhcnkoKTsgcmV0dXJuIHRydWU7IH0pO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3Iuc2VsZWN0X2xlZnQnLCBmdW5jdGlvbigpIHsgdGhhdC5tb3ZlX3ByaW1hcnkoLTEsIDApOyByZXR1cm4gdHJ1ZTsgfSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5zZWxlY3RfcmlnaHQnLCBmdW5jdGlvbigpIHsgdGhhdC5tb3ZlX3ByaW1hcnkoMSwgMCk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLnNlbGVjdF91cCcsIGZ1bmN0aW9uKCkgeyB0aGF0Lm1vdmVfcHJpbWFyeSgwLCAtMSk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLnNlbGVjdF9kb3duJywgZnVuY3Rpb24oKSB7IHRoYXQubW92ZV9wcmltYXJ5KDAsIDEpOyByZXR1cm4gdHJ1ZTsgfSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci53b3JkX2xlZnQnLCBmdW5jdGlvbigpIHsgdGhhdC53b3JkX3ByaW1hcnkoLTEpOyB0aGF0Ll9yZXNldF9zZWNvbmRhcnkoKTsgcmV0dXJuIHRydWU7IH0pO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3Iud29yZF9yaWdodCcsIGZ1bmN0aW9uKCkgeyB0aGF0LndvcmRfcHJpbWFyeSgxKTsgdGhhdC5fcmVzZXRfc2Vjb25kYXJ5KCk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLnNlbGVjdF93b3JkX2xlZnQnLCBmdW5jdGlvbigpIHsgdGhhdC53b3JkX3ByaW1hcnkoLTEpOyByZXR1cm4gdHJ1ZTsgfSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5zZWxlY3Rfd29yZF9yaWdodCcsIGZ1bmN0aW9uKCkgeyB0aGF0LndvcmRfcHJpbWFyeSgxKTsgcmV0dXJuIHRydWU7IH0pO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3IubGluZV9zdGFydCcsIGZ1bmN0aW9uKCkgeyB0aGF0LnByaW1hcnlfZ290b19zdGFydCgpOyB0aGF0Ll9yZXNldF9zZWNvbmRhcnkoKTsgcmV0dXJuIHRydWU7IH0pO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3IubGluZV9lbmQnLCBmdW5jdGlvbigpIHsgdGhhdC5wcmltYXJ5X2dvdG9fZW5kKCk7IHRoYXQuX3Jlc2V0X3NlY29uZGFyeSgpOyByZXR1cm4gdHJ1ZTsgfSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5zZWxlY3RfbGluZV9zdGFydCcsIGZ1bmN0aW9uKCkgeyB0aGF0LnByaW1hcnlfZ290b19zdGFydCgpOyByZXR1cm4gdHJ1ZTsgfSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5zZWxlY3RfbGluZV9lbmQnLCBmdW5jdGlvbigpIHsgdGhhdC5wcmltYXJ5X2dvdG9fZW5kKCk7IHJldHVybiB0cnVlOyB9KTtcbn07XG5cbmV4cG9ydHMuQ3Vyc29yID0gQ3Vyc29yOyIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG52YXIga2V5bWFwID0gcmVxdWlyZSgnLi9ldmVudHMvbWFwLmpzJyk7XG52YXIgcmVnaXN0ZXIgPSBrZXltYXAuTWFwLnJlZ2lzdGVyO1xuXG52YXIgY3Vyc29yID0gcmVxdWlyZSgnLi9jdXJzb3IuanMnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKTtcbi8qKlxuICogTWFuYWdlcyBvbmUgb3IgbW9yZSBjdXJzb3JzXG4gKi9cbnZhciBDdXJzb3JzID0gZnVuY3Rpb24obW9kZWwsIGNsaXBib2FyZCkge1xuICAgIHV0aWxzLlBvc3RlckNsYXNzLmNhbGwodGhpcyk7XG4gICAgdGhpcy5fbW9kZWwgPSBtb2RlbDtcbiAgICB0aGlzLmdldF9yb3dfY2hhciA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLmN1cnNvcnMgPSBbXTtcbiAgICB0aGlzLl9zZWxlY3RpbmdfdGV4dCA9IGZhbHNlO1xuICAgIHRoaXMuX2NsaXBib2FyZCA9IGNsaXBib2FyZDtcblxuICAgIC8vIENyZWF0ZSBpbml0aWFsIGN1cnNvci5cbiAgICB0aGlzLmNyZWF0ZSgpO1xuXG4gICAgLy8gUmVnaXN0ZXIgYWN0aW9ucy5cbiAgICByZWdpc3RlcignY3Vyc29ycy5zdGFydF9zZWxlY3Rpb24nLCB1dGlscy5wcm94eSh0aGlzLnN0YXJ0X3NlbGVjdGlvbiwgdGhpcykpO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3JzLnNldF9zZWxlY3Rpb24nLCB1dGlscy5wcm94eSh0aGlzLnNldF9zZWxlY3Rpb24sIHRoaXMpKTtcbiAgICByZWdpc3RlcignY3Vyc29ycy5lbmRfc2VsZWN0aW9uJywgdXRpbHMucHJveHkodGhpcy5lbmRfc2VsZWN0aW9uLCB0aGlzKSk7XG5cbiAgICAvLyBCaW5kIGNsaXBib2FyZCBldmVudHMuXG4gICAgdGhpcy5fY2xpcGJvYXJkLm9uKCdjdXQnLCB1dGlscy5wcm94eSh0aGlzLl9oYW5kbGVfY3V0LCB0aGlzKSk7XG4gICAgdGhpcy5fY2xpcGJvYXJkLm9uKCdwYXN0ZScsIHV0aWxzLnByb3h5KHRoaXMuX2hhbmRsZV9wYXN0ZSwgdGhpcykpO1xufTtcbnV0aWxzLmluaGVyaXQoQ3Vyc29ycywgdXRpbHMuUG9zdGVyQ2xhc3MpO1xuXG4vKipcbiAqIENyZWF0ZXMgYSBjdXJzb3IgYW5kIG1hbmFnZXMgaXQuXG4gKiBAcmV0dXJuIHtDdXJzb3J9IGN1cnNvclxuICovXG5DdXJzb3JzLnByb3RvdHlwZS5jcmVhdGUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgbmV3X2N1cnNvciA9IG5ldyBjdXJzb3IuQ3Vyc29yKHRoaXMuX21vZGVsLCB0aGlzLl9pbnB1dF9kaXNwYXRjaGVyKTtcbiAgICB0aGlzLmN1cnNvcnMucHVzaChuZXdfY3Vyc29yKTtcblxuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICBuZXdfY3Vyc29yLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhhdC50cmlnZ2VyKCdjaGFuZ2UnLCBuZXdfY3Vyc29yKTtcbiAgICAgICAgdGhhdC5fdXBkYXRlX3NlbGVjdGlvbigpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIG5ld19jdXJzb3I7XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgd2hlbiB0aGUgc2VsZWN0ZWQgdGV4dCBpcyBjdXQgdG8gdGhlIGNsaXBib2FyZC5cbiAqIEBwYXJhbSAge3N0cmluZ30gdGV4dCAtIGJ5IHZhbCB0ZXh0IHRoYXQgd2FzIGN1dFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29ycy5wcm90b3R5cGUuX2hhbmRsZV9jdXQgPSBmdW5jdGlvbih0ZXh0KSB7XG4gICAgdGhpcy5jdXJzb3JzLmZvckVhY2goZnVuY3Rpb24oY3Vyc29yKSB7XG4gICAgICAgIGN1cnNvci5jdXQoKTtcbiAgICB9KTtcbn07XG5cbi8qKlxuICogSGFuZGxlcyB3aGVuIHRleHQgaXMgcGFzdGVkIGludG8gdGhlIGRvY3VtZW50LlxuICogQHBhcmFtICB7c3RyaW5nfSB0ZXh0XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3JzLnByb3RvdHlwZS5faGFuZGxlX3Bhc3RlID0gZnVuY3Rpb24odGV4dCkge1xuXG4gICAgLy8gSWYgdGhlIG1vZHVsdXMgb2YgdGhlIG51bWJlciBvZiBjdXJzb3JzIGFuZCB0aGUgbnVtYmVyIG9mIHBhc3RlZCBsaW5lc1xuICAgIC8vIG9mIHRleHQgaXMgemVybywgc3BsaXQgdGhlIGN1dCBsaW5lcyBhbW9uZyB0aGUgY3Vyc29ycy5cbiAgICB2YXIgbGluZXMgPSB0ZXh0LnNwbGl0KCdcXG4nKTtcbiAgICBpZiAodGhpcy5jdXJzb3JzLmxlbmd0aCA+IDEgJiYgbGluZXMubGVuZ3RoID4gMSAmJiBsaW5lcy5sZW5ndGggJSB0aGlzLmN1cnNvcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHZhciBsaW5lc19wZXJfY3Vyc29yID0gbGluZXMubGVuZ3RoIC8gdGhpcy5jdXJzb3JzLmxlbmd0aDtcbiAgICAgICAgdGhpcy5jdXJzb3JzLmZvckVhY2goZnVuY3Rpb24oY3Vyc29yLCBpbmRleCkge1xuICAgICAgICAgICAgY3Vyc29yLmluc2VydF90ZXh0KGxpbmVzLnNsaWNlKFxuICAgICAgICAgICAgICAgIGluZGV4ICogbGluZXNfcGVyX2N1cnNvciwgXG4gICAgICAgICAgICAgICAgaW5kZXggKiBsaW5lc19wZXJfY3Vyc29yICsgbGluZXNfcGVyX2N1cnNvcikuam9pbignXFxuJykpO1xuICAgICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmN1cnNvcnMuZm9yRWFjaChmdW5jdGlvbihjdXJzb3IpIHtcbiAgICAgICAgICAgIGN1cnNvci5pbnNlcnRfdGV4dCh0ZXh0KTtcbiAgICAgICAgfSk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBVcGRhdGUgdGhlIGNsaXBwYWJsZSB0ZXh0IGJhc2VkIG9uIG5ldyBzZWxlY3Rpb24uXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3JzLnByb3RvdHlwZS5fdXBkYXRlX3NlbGVjdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgIFxuICAgIC8vIENvcHkgYWxsIG9mIHRoZSBzZWxlY3RlZCB0ZXh0LlxuICAgIHZhciBzZWxlY3Rpb25zID0gW107XG4gICAgdGhpcy5jdXJzb3JzLmZvckVhY2goZnVuY3Rpb24oY3Vyc29yKSB7XG4gICAgICAgIHNlbGVjdGlvbnMucHVzaChjdXJzb3IuY29weSgpKTtcbiAgICB9KTtcblxuICAgIC8vIE1ha2UgdGhlIGNvcGllZCB0ZXh0IGNsaXBwYWJsZS5cbiAgICB0aGlzLl9jbGlwYm9hcmQuc2V0X2NsaXBwYWJsZShzZWxlY3Rpb25zLmpvaW4oJ1xcbicpKTtcbn07XG5cbi8qKlxuICogU3RhcnRzIHNlbGVjdGluZyB0ZXh0IGZyb20gbW91c2UgY29vcmRpbmF0ZXMuXG4gKiBAcGFyYW0gIHtNb3VzZUV2ZW50fSBlIC0gbW91c2UgZXZlbnQgY29udGFpbmluZyB0aGUgY29vcmRpbmF0ZXMuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3JzLnByb3RvdHlwZS5zdGFydF9zZWxlY3Rpb24gPSBmdW5jdGlvbihlKSB7XG4gICAgdmFyIHggPSBlLm9mZnNldFg7XG4gICAgdmFyIHkgPSBlLm9mZnNldFk7XG5cbiAgICB0aGlzLl9zZWxlY3RpbmdfdGV4dCA9IHRydWU7XG4gICAgaWYgKHRoaXMuZ2V0X3Jvd19jaGFyKSB7XG4gICAgICAgIHZhciBsb2NhdGlvbiA9IHRoaXMuZ2V0X3Jvd19jaGFyKHgsIHkpO1xuICAgICAgICB0aGlzLmN1cnNvcnNbMF0uc2V0X3ByaW1hcnkobG9jYXRpb24ucm93X2luZGV4LCBsb2NhdGlvbi5jaGFyX2luZGV4KTtcbiAgICAgICAgdGhpcy5jdXJzb3JzWzBdLnNldF9zZWNvbmRhcnkobG9jYXRpb24ucm93X2luZGV4LCBsb2NhdGlvbi5jaGFyX2luZGV4KTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEZpbmFsaXplcyB0aGUgc2VsZWN0aW9uIG9mIHRleHQuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3JzLnByb3RvdHlwZS5lbmRfc2VsZWN0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fc2VsZWN0aW5nX3RleHQgPSBmYWxzZTtcbn07XG5cbi8qKlxuICogU2V0cyB0aGUgZW5kcG9pbnQgb2YgdGV4dCBzZWxlY3Rpb24gZnJvbSBtb3VzZSBjb29yZGluYXRlcy5cbiAqIEBwYXJhbSAge01vdXNlRXZlbnR9IGUgLSBtb3VzZSBldmVudCBjb250YWluaW5nIHRoZSBjb29yZGluYXRlcy5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvcnMucHJvdG90eXBlLnNldF9zZWxlY3Rpb24gPSBmdW5jdGlvbihlKSB7XG4gICAgdmFyIHggPSBlLm9mZnNldFg7XG4gICAgdmFyIHkgPSBlLm9mZnNldFk7XG5cbiAgICBpZiAodGhpcy5fc2VsZWN0aW5nX3RleHQgJiYgdGhpcy5nZXRfcm93X2NoYXIpIHtcbiAgICAgICAgdmFyIGxvY2F0aW9uID0gdGhpcy5nZXRfcm93X2NoYXIoeCwgeSk7XG4gICAgICAgIHRoaXMuY3Vyc29yc1t0aGlzLmN1cnNvcnMubGVuZ3RoLTFdLnNldF9wcmltYXJ5KGxvY2F0aW9uLnJvd19pbmRleCwgbG9jYXRpb24uY2hhcl9pbmRleCk7XG4gICAgfVxufTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5DdXJzb3JzID0gQ3Vyc29ycztcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKTtcbnZhciBub3JtYWxpemVyID0gcmVxdWlyZSgnLi9ldmVudHMvbm9ybWFsaXplci5qcycpO1xudmFyIGtleW1hcCA9IHJlcXVpcmUoJy4vZXZlbnRzL21hcC5qcycpO1xudmFyIGRlZmF1bHRfa2V5bWFwID0gcmVxdWlyZSgnLi9ldmVudHMvZGVmYXVsdC5qcycpO1xudmFyIGN1cnNvcnMgPSByZXF1aXJlKCcuL2N1cnNvcnMuanMnKTtcbnZhciBjbGlwYm9hcmQgPSByZXF1aXJlKCcuL2NsaXBib2FyZC5qcycpO1xuXG4vKipcbiAqIENvbnRyb2xsZXIgZm9yIGEgRG9jdW1lbnRNb2RlbC5cbiAqL1xudmFyIERvY3VtZW50Q29udHJvbGxlciA9IGZ1bmN0aW9uKGVsLCBtb2RlbCkge1xuICAgIHV0aWxzLlBvc3RlckNsYXNzLmNhbGwodGhpcyk7XG4gICAgdGhpcy5jbGlwYm9hcmQgPSBuZXcgY2xpcGJvYXJkLkNsaXBib2FyZChlbCk7XG4gICAgdGhpcy5ub3JtYWxpemVyID0gbmV3IG5vcm1hbGl6ZXIuTm9ybWFsaXplcigpO1xuICAgIHRoaXMubm9ybWFsaXplci5saXN0ZW5fdG8oZWwpO1xuICAgIHRoaXMubm9ybWFsaXplci5saXN0ZW5fdG8odGhpcy5jbGlwYm9hcmQuaGlkZGVuX2lucHV0KTtcbiAgICB0aGlzLm1hcCA9IG5ldyBrZXltYXAuTWFwKHRoaXMubm9ybWFsaXplcik7XG4gICAgdGhpcy5tYXAubWFwKGRlZmF1bHRfa2V5bWFwLm1hcCk7XG5cbiAgICB0aGlzLmN1cnNvcnMgPSBuZXcgY3Vyc29ycy5DdXJzb3JzKG1vZGVsLCB0aGlzLmNsaXBib2FyZCk7XG59O1xudXRpbHMuaW5oZXJpdChEb2N1bWVudENvbnRyb2xsZXIsIHV0aWxzLlBvc3RlckNsYXNzKTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5Eb2N1bWVudENvbnRyb2xsZXIgPSBEb2N1bWVudENvbnRyb2xsZXI7XG4iLCJ2YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG5cbi8qKlxuICogTW9kZWwgY29udGFpbmluZyBhbGwgb2YgdGhlIGRvY3VtZW50J3MgZGF0YSAodGV4dCkuXG4gKi9cbnZhciBEb2N1bWVudE1vZGVsID0gZnVuY3Rpb24oKSB7XG4gICAgdXRpbHMuUG9zdGVyQ2xhc3MuY2FsbCh0aGlzKTtcbiAgICB0aGlzLl9yb3dzID0gW107XG4gICAgdGhpcy5fcm93X3RhZ3MgPSBbXTtcbiAgICB0aGlzLl90YWdfbG9jayA9IDA7XG4gICAgdGhpcy5faW5pdF9wcm9wZXJ0aWVzKCk7XG59O1xudXRpbHMuaW5oZXJpdChEb2N1bWVudE1vZGVsLCB1dGlscy5Qb3N0ZXJDbGFzcyk7XG5cbi8qKlxuIC8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbiogQWNxdWlyZSBhIGxvY2sgb24gdGFnIGV2ZW50c1xuICpcbiAqIFByZXZlbnRzIHRhZyBldmVudHMgZnJvbSBmaXJpbmcuXG4gKiBAcmV0dXJuIHtpbnRlZ2VyfSBsb2NrIGNvdW50XG4gKi9cbkRvY3VtZW50TW9kZWwucHJvdG90eXBlLmFjcXVpcmVfdGFnX2V2ZW50X2xvY2sgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fdGFnX2xvY2srKztcbn07XG5cbi8qKlxuICogUmVsZWFzZSBhIGxvY2sgb24gdGFnIGV2ZW50c1xuICogQHJldHVybiB7aW50ZWdlcn0gbG9jayBjb3VudFxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS5yZWxlYXNlX3RhZ19ldmVudF9sb2NrID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fdGFnX2xvY2stLTtcbiAgICBpZiAodGhpcy5fdGFnX2xvY2sgPCAwKSB0aGlzLl90YWdfbG9jayA9IDA7XG4gICAgcmV0dXJuIHRoaXMuX3RhZ19sb2NrO1xufTtcblxuLyoqXG4gKiBUcmlnZ2VycyB0aGUgdGFnIGNoYW5nZSBldmVudHMuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS50cmlnZ2VyX3RhZ19ldmVudHMgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5fdGFnX2xvY2sgPT09IDApIHtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCd0YWdzX2NoYW5nZWQnKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2VkJyk7ICAgIFxuICAgIH1cbn07XG5cbi8qKlxuICogU2V0cyBhICd0YWcnIG9uIHRoZSB0ZXh0IHNwZWNpZmllZC5cbiAqIEBwYXJhbSB7aW50ZWdlcn0gc3RhcnRfcm93IC0gcm93IHRoZSB0YWcgc3RhcnRzIG9uXG4gKiBAcGFyYW0ge2ludGVnZXJ9IHN0YXJ0X2NoYXIgLSBpbmRleCwgaW4gdGhlIHJvdywgb2YgdGhlIGZpcnN0IHRhZ2dlZCBjaGFyYWN0ZXJcbiAqIEBwYXJhbSB7aW50ZWdlcn0gZW5kX3JvdyAtIHJvdyB0aGUgdGFnIGVuZHMgb25cbiAqIEBwYXJhbSB7aW50ZWdlcn0gZW5kX2NoYXIgLSBpbmRleCwgaW4gdGhlIHJvdywgb2YgdGhlIGxhc3QgdGFnZ2VkIGNoYXJhY3RlclxuICogQHBhcmFtIHtzdHJpbmd9IHRhZ19uYW1lXG4gKiBAcGFyYW0ge2FueX0gdGFnX3ZhbHVlIC0gb3ZlcnJpZGVzIGFueSBwcmV2aW91cyB0YWdzXG4gKi9cbkRvY3VtZW50TW9kZWwucHJvdG90eXBlLnNldF90YWcgPSBmdW5jdGlvbihzdGFydF9yb3csIHN0YXJ0X2NoYXIsIGVuZF9yb3csIGVuZF9jaGFyLCB0YWdfbmFtZSwgdGFnX3ZhbHVlKSB7XG4gICAgdmFyIGNvb3JkcyA9IHRoaXMudmFsaWRhdGVfY29vcmRzLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgZm9yICh2YXIgcm93ID0gY29vcmRzLnN0YXJ0X3Jvdzsgcm93IDw9IGNvb3Jkcy5lbmRfcm93OyByb3crKykge1xuICAgICAgICB2YXIgc3RhcnQgPSBjb29yZHMuc3RhcnRfY2hhcjtcbiAgICAgICAgdmFyIGVuZCA9IGNvb3Jkcy5lbmRfY2hhcjtcbiAgICAgICAgaWYgKHJvdyA+IGNvb3Jkcy5zdGFydF9yb3cpIHsgc3RhcnQgPSAtMTsgfVxuICAgICAgICBpZiAocm93IDwgY29vcmRzLmVuZF9yb3cpIHsgZW5kID0gLTE7IH1cblxuICAgICAgICAvLyBSZW1vdmUgb3IgbW9kaWZ5IGNvbmZsaWN0aW5nIHRhZ3MuXG4gICAgICAgIHZhciBhZGRfdGFncyA9IFtdO1xuICAgICAgICB0aGlzLl9yb3dfdGFnc1tyb3ddLmZpbHRlcihmdW5jdGlvbih0YWcpIHtcbiAgICAgICAgICAgIGlmICh0YWcubmFtZSA9PSB0YWdfbmFtZSkge1xuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRhZyBpcyB3aXRoaW5cbiAgICAgICAgICAgICAgICBpZiAoc3RhcnQgPT0gLTEgJiYgZW5kID09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHRhZy5zdGFydCA+PSBzdGFydCAmJiAodGFnLmVuZCA8IGVuZCB8fCBlbmQgPT0gLTEpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGFnIGlzIG91dHNpZGVcbiAgICAgICAgICAgICAgICAvLyBUbyB0aGUgcmlnaHQ/XG4gICAgICAgICAgICAgICAgaWYgKHRhZy5zdGFydCA+IGVuZCAmJiBlbmQgIT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFRvIHRoZSBsZWZ0P1xuICAgICAgICAgICAgICAgIGlmICh0YWcuZW5kIDwgc3RhcnQgJiYgdGFnLmVuZCAhPSAtMSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0YWcgZW5jYXBzdWxhdGVzXG4gICAgICAgICAgICAgICAgdmFyIGxlZnRfaW50ZXJzZWN0aW5nID0gdGFnLnN0YXJ0IDwgc3RhcnQ7XG4gICAgICAgICAgICAgICAgdmFyIHJpZ2h0X2ludGVyc2VjdGluZyA9IGVuZCAhPSAtMSAmJiAodGFnLmVuZCA9PSAtMSB8fCB0YWcuZW5kID4gZW5kKTtcblxuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRhZyBpcyBsZWZ0IGludGVyc2VjdGluZ1xuICAgICAgICAgICAgICAgIGlmIChsZWZ0X2ludGVyc2VjdGluZykge1xuICAgICAgICAgICAgICAgICAgICBhZGRfdGFncy5wdXNoKHtuYW1lOiB0YWdfbmFtZSwgdmFsdWU6IHRhZy52YWx1ZSwgc3RhcnQ6IHRhZy5zdGFydCwgZW5kOiBzdGFydC0xfSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGFnIGlzIHJpZ2h0IGludGVyc2VjdGluZ1xuICAgICAgICAgICAgICAgIGlmIChyaWdodF9pbnRlcnNlY3RpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgYWRkX3RhZ3MucHVzaCh7bmFtZTogdGFnX25hbWUsIHZhbHVlOiB0YWcudmFsdWUsIHN0YXJ0OiBlbmQrMSwgZW5kOiB0YWcuZW5kfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgdGFncyBhbmQgY29ycmVjdGVkIHRhZ3MuXG4gICAgICAgIHRoaXMuX3Jvd190YWdzW3Jvd10gPSB0aGlzLl9yb3dfdGFnc1tyb3ddLmNvbmNhdChhZGRfdGFncyk7XG4gICAgICAgIHRoaXMuX3Jvd190YWdzW3Jvd10ucHVzaCh7bmFtZTogdGFnX25hbWUsIHZhbHVlOiB0YWdfdmFsdWUsIHN0YXJ0OiBzdGFydCwgZW5kOiBlbmR9KTtcbiAgICB9XG4gICAgdGhpcy50cmlnZ2VyX3RhZ19ldmVudHMoKTtcbn07XG5cbi8qKlxuICogUmVtb3ZlZCBhbGwgb2YgdGhlIHRhZ3Mgb24gdGhlIGRvY3VtZW50LlxuICogQHBhcmFtICB7aW50ZWdlcn0gc3RhcnRfcm93XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBlbmRfcm93XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS5jbGVhcl90YWdzID0gZnVuY3Rpb24oc3RhcnRfcm93LCBlbmRfcm93KSB7XG4gICAgc3RhcnRfcm93ID0gc3RhcnRfcm93ICE9PSB1bmRlZmluZWQgPyBzdGFydF9yb3cgOiAwO1xuICAgIGVuZF9yb3cgPSBlbmRfcm93ICE9PSB1bmRlZmluZWQgPyBlbmRfcm93IDogdGhpcy5fcm93X3RhZ3MubGVuZ3RoIC0gMTtcbiAgICBmb3IgKHZhciBpID0gc3RhcnRfcm93OyBpIDw9IGVuZF9yb3c7IGkrKykge1xuICAgICAgICB0aGlzLl9yb3dfdGFnc1tpXSA9IFtdO1xuICAgIH1cbiAgICB0aGlzLnRyaWdnZXIoJ3RhZ3NfY2hhbmdlZCcpO1xuICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpO1xufTtcblxuLyoqXG4gKiBHZXQgdGhlIHRhZ3MgYXBwbGllZCB0byBhIGNoYXJhY3Rlci5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IHJvd19pbmRleFxuICogQHBhcmFtICB7aW50ZWdlcn0gY2hhcl9pbmRleFxuICogQHJldHVybiB7ZGljdGlvbmFyeX1cbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUuZ2V0X3RhZ3MgPSBmdW5jdGlvbihyb3dfaW5kZXgsIGNoYXJfaW5kZXgpIHtcbiAgICB2YXIgY29vcmRzID0gdGhpcy52YWxpZGF0ZV9jb29yZHMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB2YXIgdGFncyA9IHt9O1xuICAgIHRoaXMuX3Jvd190YWdzW2Nvb3Jkcy5zdGFydF9yb3ddLmZvckVhY2goZnVuY3Rpb24odGFnKSB7XG4gICAgICAgIC8vIFRhZyBzdGFydCBvZiAtMSBtZWFucyB0aGUgdGFnIGNvbnRpbnVlcyB0byB0aGUgcHJldmlvdXMgbGluZS5cbiAgICAgICAgdmFyIGFmdGVyX3N0YXJ0ID0gKGNvb3Jkcy5zdGFydF9jaGFyID49IHRhZy5zdGFydCB8fCB0YWcuc3RhcnQgPT0gLTEpO1xuICAgICAgICAvLyBUYWcgZW5kIG9mIC0xIG1lYW5zIHRoZSB0YWcgY29udGludWVzIHRvIHRoZSBuZXh0IGxpbmUuXG4gICAgICAgIHZhciBiZWZvcmVfZW5kID0gKGNvb3Jkcy5zdGFydF9jaGFyIDw9IHRhZy5lbmQgfHwgdGFnLmVuZCA9PSAtMSk7XG4gICAgICAgIGlmIChhZnRlcl9zdGFydCAmJiBiZWZvcmVfZW5kKSB7XG4gICAgICAgICAgICB0YWdzW3RhZy5uYW1lXSA9IHRhZy52YWx1ZTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiB0YWdzO1xufTtcblxuLyoqXG4gKiBBZGRzIHRleHQgZWZmaWNpZW50bHkgc29tZXdoZXJlIGluIHRoZSBkb2N1bWVudC5cbiAqIEBwYXJhbSB7aW50ZWdlcn0gcm93X2luZGV4ICBcbiAqIEBwYXJhbSB7aW50ZWdlcn0gY2hhcl9pbmRleCBcbiAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0XG4gKi9cbkRvY3VtZW50TW9kZWwucHJvdG90eXBlLmFkZF90ZXh0ID0gZnVuY3Rpb24ocm93X2luZGV4LCBjaGFyX2luZGV4LCB0ZXh0KSB7XG4gICAgdmFyIGNvb3JkcyA9IHRoaXMudmFsaWRhdGVfY29vcmRzLmFwcGx5KHRoaXMsIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCwyKSk7XG4gICAgLy8gSWYgdGhlIHRleHQgaGFzIGEgbmV3IGxpbmUgaW4gaXQsIGp1c3QgcmUtc2V0XG4gICAgLy8gdGhlIHJvd3MgbGlzdC5cbiAgICBpZiAodGV4dC5pbmRleE9mKCdcXG4nKSAhPSAtMSkge1xuICAgICAgICB2YXIgbmV3X3Jvd3MgPSBbXTtcbiAgICAgICAgaWYgKGNvb3Jkcy5zdGFydF9yb3cgPiAwKSB7XG4gICAgICAgICAgICBuZXdfcm93cyA9IHRoaXMuX3Jvd3Muc2xpY2UoMCwgY29vcmRzLnN0YXJ0X3Jvdyk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgb2xkX3JvdyA9IHRoaXMuX3Jvd3NbY29vcmRzLnN0YXJ0X3Jvd107XG4gICAgICAgIHZhciBvbGRfcm93X3N0YXJ0ID0gb2xkX3Jvdy5zdWJzdHJpbmcoMCwgY29vcmRzLnN0YXJ0X2NoYXIpO1xuICAgICAgICB2YXIgb2xkX3Jvd19lbmQgPSBvbGRfcm93LnN1YnN0cmluZyhjb29yZHMuc3RhcnRfY2hhcik7XG4gICAgICAgIHZhciBzcGxpdF90ZXh0ID0gdGV4dC5zcGxpdCgnXFxuJyk7XG4gICAgICAgIG5ld19yb3dzLnB1c2gob2xkX3Jvd19zdGFydCArIHNwbGl0X3RleHRbMF0pO1xuXG4gICAgICAgIGlmIChzcGxpdF90ZXh0Lmxlbmd0aCA+IDIpIHtcbiAgICAgICAgICAgIG5ld19yb3dzID0gbmV3X3Jvd3MuY29uY2F0KHNwbGl0X3RleHQuc2xpY2UoMSxzcGxpdF90ZXh0Lmxlbmd0aC0xKSk7XG4gICAgICAgIH1cblxuICAgICAgICBuZXdfcm93cy5wdXNoKHNwbGl0X3RleHRbc3BsaXRfdGV4dC5sZW5ndGgtMV0gKyBvbGRfcm93X2VuZCk7XG5cbiAgICAgICAgaWYgKGNvb3Jkcy5zdGFydF9yb3crMSA8IHRoaXMuX3Jvd3MubGVuZ3RoKSB7XG4gICAgICAgICAgICBuZXdfcm93cyA9IG5ld19yb3dzLmNvbmNhdCh0aGlzLl9yb3dzLnNsaWNlKGNvb3Jkcy5zdGFydF9yb3crMSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fcm93cyA9IG5ld19yb3dzO1xuICAgICAgICB0aGlzLl9yZXNpemVkX3Jvd3MoKTtcblxuICAgIC8vIFRleHQgZG9lc24ndCBoYXZlIGFueSBuZXcgbGluZXMsIGp1c3QgbW9kaWZ5IHRoZVxuICAgIC8vIGxpbmUgYW5kIHRoZW4gdHJpZ2dlciB0aGUgcm93IGNoYW5nZWQgZXZlbnQuXG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIG9sZF90ZXh0ID0gdGhpcy5fcm93c1tjb29yZHMuc3RhcnRfcm93XTtcbiAgICAgICAgdGhpcy5fcm93c1tjb29yZHMuc3RhcnRfcm93XSA9IG9sZF90ZXh0LnN1YnN0cmluZygwLCBjb29yZHMuc3RhcnRfY2hhcikgKyB0ZXh0ICsgb2xkX3RleHQuc3Vic3RyaW5nKGNvb3Jkcy5zdGFydF9jaGFyKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdyb3dfY2hhbmdlZCcsIGNvb3Jkcy5zdGFydF9yb3cpO1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZWQnKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgYSBibG9jayBvZiB0ZXh0IGZyb20gdGhlIGRvY3VtZW50XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBzdGFydF9yb3dcbiAqIEBwYXJhbSAge2ludGVnZXJ9IHN0YXJ0X2NoYXJcbiAqIEBwYXJhbSAge2ludGVnZXJ9IGVuZF9yb3dcbiAqIEBwYXJhbSAge2ludGVnZXJ9IGVuZF9jaGFyXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS5yZW1vdmVfdGV4dCA9IGZ1bmN0aW9uKHN0YXJ0X3Jvdywgc3RhcnRfY2hhciwgZW5kX3JvdywgZW5kX2NoYXIpIHtcbiAgICB2YXIgY29vcmRzID0gdGhpcy52YWxpZGF0ZV9jb29yZHMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICBpZiAoY29vcmRzLnN0YXJ0X3JvdyA9PSBjb29yZHMuZW5kX3Jvdykge1xuICAgICAgICB0aGlzLl9yb3dzW2Nvb3Jkcy5zdGFydF9yb3ddID0gdGhpcy5fcm93c1tjb29yZHMuc3RhcnRfcm93XS5zdWJzdHJpbmcoMCwgY29vcmRzLnN0YXJ0X2NoYXIpICsgdGhpcy5fcm93c1tjb29yZHMuc3RhcnRfcm93XS5zdWJzdHJpbmcoY29vcmRzLmVuZF9jaGFyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9yb3dzW2Nvb3Jkcy5zdGFydF9yb3ddID0gdGhpcy5fcm93c1tjb29yZHMuc3RhcnRfcm93XS5zdWJzdHJpbmcoMCwgY29vcmRzLnN0YXJ0X2NoYXIpICsgdGhpcy5fcm93c1tjb29yZHMuZW5kX3Jvd10uc3Vic3RyaW5nKGNvb3Jkcy5lbmRfY2hhcik7XG4gICAgfVxuXG4gICAgaWYgKGNvb3Jkcy5lbmRfcm93IC0gY29vcmRzLnN0YXJ0X3JvdyA+IDApIHtcbiAgICAgICAgdGhpcy5fcm93cy5zcGxpY2UoY29vcmRzLnN0YXJ0X3JvdyArIDEsIGNvb3Jkcy5lbmRfcm93IC0gY29vcmRzLnN0YXJ0X3Jvdyk7XG4gICAgICAgIHRoaXMuX3Jlc2l6ZWRfcm93cygpO1xuICAgIH0gZWxzZSBpZiAoY29vcmRzLmVuZF9yb3cgPT0gY29vcmRzLnN0YXJ0X3Jvdykge1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ3Jvd19jaGFuZ2VkJywgY29vcmRzLnN0YXJ0X3Jvdyk7XG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMudHJpZ2dlcigncm93X2NoYW5nZWQnLCBjb29yZHMuc3RhcnRfcm93KTtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdyb3dfY2hhbmdlZCcsIGNvb3Jkcy5lbmRfcm93KTtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2VkJyk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBSZW1vdmUgYSByb3cgZnJvbSB0aGUgZG9jdW1lbnQuXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSByb3dfaW5kZXhcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkRvY3VtZW50TW9kZWwucHJvdG90eXBlLnJlbW92ZV9yb3cgPSBmdW5jdGlvbihyb3dfaW5kZXgpIHtcbiAgICBpZiAoMCA8IHJvd19pbmRleCAmJiByb3dfaW5kZXggPCB0aGlzLl9yb3dzLmxlbmd0aCkge1xuICAgICAgICB0aGlzLl9yb3dzLnNwbGljZShyb3dfaW5kZXgsIDEpO1xuICAgICAgICB0aGlzLl9yZXNpemVkX3Jvd3MoKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEdldHMgYSBjaHVuayBvZiB0ZXh0LlxuICogQHBhcmFtICB7aW50ZWdlcn0gc3RhcnRfcm93XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBzdGFydF9jaGFyXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBlbmRfcm93XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBlbmRfY2hhclxuICogQHJldHVybiB7c3RyaW5nfVxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS5nZXRfdGV4dCA9IGZ1bmN0aW9uKHN0YXJ0X3Jvdywgc3RhcnRfY2hhciwgZW5kX3JvdywgZW5kX2NoYXIpIHtcbiAgICB2YXIgY29vcmRzID0gdGhpcy52YWxpZGF0ZV9jb29yZHMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICBpZiAoY29vcmRzLnN0YXJ0X3Jvdz09Y29vcmRzLmVuZF9yb3cpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3Jvd3NbY29vcmRzLnN0YXJ0X3Jvd10uc3Vic3RyaW5nKGNvb3Jkcy5zdGFydF9jaGFyLCBjb29yZHMuZW5kX2NoYXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciB0ZXh0ID0gW107XG4gICAgICAgIHRleHQucHVzaCh0aGlzLl9yb3dzW2Nvb3Jkcy5zdGFydF9yb3ddLnN1YnN0cmluZyhjb29yZHMuc3RhcnRfY2hhcikpO1xuICAgICAgICBpZiAoY29vcmRzLmVuZF9yb3cgLSBjb29yZHMuc3RhcnRfcm93ID4gMSkge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IGNvb3Jkcy5zdGFydF9yb3cgKyAxOyBpIDwgY29vcmRzLmVuZF9yb3c7IGkrKykge1xuICAgICAgICAgICAgICAgIHRleHQucHVzaCh0aGlzLl9yb3dzW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0ZXh0LnB1c2godGhpcy5fcm93c1tjb29yZHMuZW5kX3Jvd10uc3Vic3RyaW5nKDAsIGNvb3Jkcy5lbmRfY2hhcikpO1xuICAgICAgICByZXR1cm4gdGV4dC5qb2luKCdcXG4nKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEFkZCBhIHJvdyB0byB0aGUgZG9jdW1lbnRcbiAqIEBwYXJhbSB7aW50ZWdlcn0gcm93X2luZGV4XG4gKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIG5ldyByb3cncyB0ZXh0XG4gKi9cbkRvY3VtZW50TW9kZWwucHJvdG90eXBlLmFkZF9yb3cgPSBmdW5jdGlvbihyb3dfaW5kZXgsIHRleHQpIHtcbiAgICB2YXIgbmV3X3Jvd3MgPSBbXTtcbiAgICBpZiAocm93X2luZGV4ID4gMCkge1xuICAgICAgICBuZXdfcm93cyA9IHRoaXMuX3Jvd3Muc2xpY2UoMCwgcm93X2luZGV4KTtcbiAgICB9XG4gICAgbmV3X3Jvd3MucHVzaCh0ZXh0KTtcbiAgICBpZiAocm93X2luZGV4IDwgdGhpcy5fcm93cy5sZW5ndGgpIHtcbiAgICAgICAgbmV3X3Jvd3MgPSBuZXdfcm93cy5jb25jYXQodGhpcy5fcm93cy5zbGljZShyb3dfaW5kZXgpKTtcbiAgICB9XG5cbiAgICB0aGlzLl9yb3dzID0gbmV3X3Jvd3M7XG4gICAgdGhpcy5fcmVzaXplZF9yb3dzKCk7XG59O1xuXG4vKipcbiAqIFZhbGlkYXRlcyByb3csIGNoYXJhY3RlciBjb29yZGluYXRlcyBpbiB0aGUgZG9jdW1lbnQuXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBzdGFydF9yb3dcbiAqIEBwYXJhbSAge2ludGVnZXJ9IHN0YXJ0X2NoYXJcbiAqIEBwYXJhbSAge2ludGVnZXJ9IChvcHRpb25hbCkgZW5kX3Jvd1xuICogQHBhcmFtICB7aW50ZWdlcn0gKG9wdGlvbmFsKSBlbmRfY2hhclxuICogQHJldHVybiB7ZGljdGlvbmFyeX0gZGljdGlvbmFyeSBjb250YWluaW5nIHZhbGlkYXRlZCBjb29yZGluYXRlcyB7c3RhcnRfcm93LCBcbiAqICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0X2NoYXIsIGVuZF9yb3csIGVuZF9jaGFyfVxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS52YWxpZGF0ZV9jb29yZHMgPSBmdW5jdGlvbihzdGFydF9yb3csIHN0YXJ0X2NoYXIsIGVuZF9yb3csIGVuZF9jaGFyKSB7XG5cbiAgICAvLyBNYWtlIHN1cmUgdGhlIHZhbHVlcyBhcmVuJ3QgdW5kZWZpbmVkLlxuICAgIGlmIChzdGFydF9yb3cgPT09IHVuZGVmaW5lZCkgc3RhcnRfcm93ID0gMDtcbiAgICBpZiAoc3RhcnRfY2hhciA9PT0gdW5kZWZpbmVkKSBzdGFydF9jaGFyID0gMDtcbiAgICBpZiAoZW5kX3JvdyA9PT0gdW5kZWZpbmVkKSBlbmRfcm93ID0gc3RhcnRfcm93O1xuICAgIGlmIChlbmRfY2hhciA9PT0gdW5kZWZpbmVkKSBlbmRfY2hhciA9IHN0YXJ0X2NoYXI7XG5cbiAgICAvLyBNYWtlIHN1cmUgdGhlIHZhbHVlcyBhcmUgd2l0aGluIHRoZSBib3VuZHMgb2YgdGhlIGNvbnRlbnRzLlxuICAgIGlmICh0aGlzLl9yb3dzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBzdGFydF9yb3cgPSAwO1xuICAgICAgICBzdGFydF9jaGFyID0gMDtcbiAgICAgICAgZW5kX3JvdyA9IDA7XG4gICAgICAgIGVuZF9jaGFyID0gMDtcbiAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoc3RhcnRfcm93ID49IHRoaXMuX3Jvd3MubGVuZ3RoKSBzdGFydF9yb3cgPSB0aGlzLl9yb3dzLmxlbmd0aCAtIDE7XG4gICAgICAgIGlmIChzdGFydF9yb3cgPCAwKSBzdGFydF9yb3cgPSAwO1xuICAgICAgICBpZiAoZW5kX3JvdyA+PSB0aGlzLl9yb3dzLmxlbmd0aCkgZW5kX3JvdyA9IHRoaXMuX3Jvd3MubGVuZ3RoIC0gMTtcbiAgICAgICAgaWYgKGVuZF9yb3cgPCAwKSBlbmRfcm93ID0gMDtcblxuICAgICAgICBpZiAoc3RhcnRfY2hhciA+IHRoaXMuX3Jvd3Nbc3RhcnRfcm93XS5sZW5ndGgpIHN0YXJ0X2NoYXIgPSB0aGlzLl9yb3dzW3N0YXJ0X3Jvd10ubGVuZ3RoO1xuICAgICAgICBpZiAoc3RhcnRfY2hhciA8IDApIHN0YXJ0X2NoYXIgPSAwO1xuICAgICAgICBpZiAoZW5kX2NoYXIgPiB0aGlzLl9yb3dzW2VuZF9yb3ddLmxlbmd0aCkgZW5kX2NoYXIgPSB0aGlzLl9yb3dzW2VuZF9yb3ddLmxlbmd0aDtcbiAgICAgICAgaWYgKGVuZF9jaGFyIDwgMCkgZW5kX2NoYXIgPSAwO1xuICAgIH1cblxuICAgIC8vIE1ha2Ugc3VyZSB0aGUgc3RhcnQgaXMgYmVmb3JlIHRoZSBlbmQuXG4gICAgaWYgKHN0YXJ0X3JvdyA+IGVuZF9yb3cgfHwgKHN0YXJ0X3JvdyA9PSBlbmRfcm93ICYmIHN0YXJ0X2NoYXIgPiBlbmRfY2hhcikpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN0YXJ0X3JvdzogZW5kX3JvdyxcbiAgICAgICAgICAgIHN0YXJ0X2NoYXI6IGVuZF9jaGFyLFxuICAgICAgICAgICAgZW5kX3Jvdzogc3RhcnRfcm93LFxuICAgICAgICAgICAgZW5kX2NoYXI6IHN0YXJ0X2NoYXIsXG4gICAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN0YXJ0X3Jvdzogc3RhcnRfcm93LFxuICAgICAgICAgICAgc3RhcnRfY2hhcjogc3RhcnRfY2hhcixcbiAgICAgICAgICAgIGVuZF9yb3c6IGVuZF9yb3csXG4gICAgICAgICAgICBlbmRfY2hhcjogZW5kX2NoYXIsXG4gICAgICAgIH07XG4gICAgfVxufTtcblxuLyoqXG4gKiBHZXRzIHRoZSB0ZXh0IG9mIHRoZSBkb2N1bWVudC5cbiAqIEByZXR1cm4ge3N0cmluZ31cbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUuX2dldF90ZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3Jvd3Muam9pbignXFxuJyk7XG59O1xuXG4vKipcbiAqIFNldHMgdGhlIHRleHQgb2YgdGhlIGRvY3VtZW50LlxuICogQ29tcGxleGl0eSBPKE4pIGZvciBOIHJvd3NcbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZVxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS5fc2V0X3RleHQgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHRoaXMuX3Jvd3MgPSB2YWx1ZS5zcGxpdCgnXFxuJyk7XG4gICAgdGhpcy5fcmVzaXplZF9yb3dzKCk7XG59O1xuXG4vKipcbiAqIFVwZGF0ZXMgX3JvdydzIHBhcnRuZXIgYXJyYXlzLlxuICogQHJldHVybiB7bnVsbH0gXG4gKi9cbkRvY3VtZW50TW9kZWwucHJvdG90eXBlLl9yZXNpemVkX3Jvd3MgPSBmdW5jdGlvbigpIHtcblxuICAgIC8vIE1ha2Ugc3VyZSB0aGVyZSBhcmUgYXMgbWFueSB0YWcgcm93cyBhcyB0aGVyZSBhcmUgdGV4dCByb3dzLlxuICAgIHdoaWxlICh0aGlzLl9yb3dfdGFncy5sZW5ndGggPCB0aGlzLl9yb3dzLmxlbmd0aCkge1xuICAgICAgICB0aGlzLl9yb3dfdGFncy5wdXNoKFtdKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuX3Jvd190YWdzLmxlbmd0aCA+IHRoaXMuX3Jvd3MubGVuZ3RoKSB7XG4gICAgICAgIHRoaXMuX3Jvd190YWdzLnNwbGljZSh0aGlzLl9yb3dzLmxlbmd0aCwgdGhpcy5fcm93X3RhZ3MubGVuZ3RoIC0gdGhpcy5fcm93cy5sZW5ndGgpO1xuICAgIH1cblxuICAgIC8vIFRyaWdnZXIgZXZlbnRzXG4gICAgdGhpcy50cmlnZ2VyKCd0ZXh0X2NoYW5nZWQnKTtcbiAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZWQnKTtcbn07XG5cbi8qKlxuICogQ3JlYXRlIHRoZSBkb2N1bWVudCdzIHByb3BlcnRpZXMuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS5faW5pdF9wcm9wZXJ0aWVzID0gZnVuY3Rpb24oKSB7ICAgIFxuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLnByb3BlcnR5KCdyb3dzJywgZnVuY3Rpb24oKSB7IFxuICAgICAgICAvLyBSZXR1cm4gYSBzaGFsbG93IGNvcHkgb2YgdGhlIGFycmF5IHNvIGl0IGNhbm5vdCBiZSBtb2RpZmllZC5cbiAgICAgICAgcmV0dXJuIFtdLmNvbmNhdCh0aGF0Ll9yb3dzKTsgXG4gICAgfSk7XG4gICAgdGhpcy5wcm9wZXJ0eSgndGV4dCcsIFxuICAgICAgICB1dGlscy5wcm94eSh0aGlzLl9nZXRfdGV4dCwgdGhpcyksIFxuICAgICAgICB1dGlscy5wcm94eSh0aGlzLl9zZXRfdGV4dCwgdGhpcykpO1xufTtcblxuZXhwb3J0cy5Eb2N1bWVudE1vZGVsID0gRG9jdW1lbnRNb2RlbDsiLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG5cbi8vIFJlbmRlcmVyc1xudmFyIGJhdGNoID0gcmVxdWlyZSgnLi9yZW5kZXJlcnMvYmF0Y2guanMnKTtcbnZhciBoaWdobGlnaHRlZF9yb3cgPSByZXF1aXJlKCcuL3JlbmRlcmVycy9oaWdobGlnaHRlZF9yb3cuanMnKTtcbnZhciBjdXJzb3JzID0gcmVxdWlyZSgnLi9yZW5kZXJlcnMvY3Vyc29ycy5qcycpO1xudmFyIHNlbGVjdGlvbnMgPSByZXF1aXJlKCcuL3JlbmRlcmVycy9zZWxlY3Rpb25zLmpzJyk7XG52YXIgY29sb3IgPSByZXF1aXJlKCcuL3JlbmRlcmVycy9jb2xvci5qcycpO1xudmFyIHN5bnRheF9oaWdobGlnaHRlciA9IHJlcXVpcmUoJy4vaGlnaGxpZ2h0ZXJzL3N5bnRheC5qcycpO1xuXG4vKipcbiAqIFZpc3VhbCByZXByZXNlbnRhdGlvbiBvZiBhIERvY3VtZW50TW9kZWwgaW5zdGFuY2VcbiAqIEBwYXJhbSB7Q2FudmFzfSBjYW52YXMgaW5zdGFuY2VcbiAqIEBwYXJhbSB7RG9jdW1lbnRNb2RlbH0gbW9kZWwgaW5zdGFuY2VcbiAqIEBwYXJhbSB7Q3Vyc29yc30gY3Vyc29yc19tb2RlbCBpbnN0YW5jZVxuICogQHBhcmFtIHtTdHlsZX0gc3R5bGUgLSBkZXNjcmliZXMgcmVuZGVyaW5nIHN0eWxlXG4gKiBAcGFyYW0ge1Bvc3RlckNsYXNzfSBjb25maWcgLSB1c2VyIGNvbmZpZ1xuICogQHBhcmFtIHtmdW5jdGlvbn0gaGFzX2ZvY3VzIC0gZnVuY3Rpb24gdGhhdCBjaGVja3MgaWYgdGhlIHRleHQgYXJlYSBoYXMgZm9jdXNcbiAqL1xudmFyIERvY3VtZW50VmlldyA9IGZ1bmN0aW9uKGNhbnZhcywgbW9kZWwsIGN1cnNvcnNfbW9kZWwsIHN0eWxlLCBjb25maWcsIGhhc19mb2N1cykge1xuICAgIHRoaXMuX21vZGVsID0gbW9kZWw7XG5cbiAgICAvLyBDcmVhdGUgY2hpbGQgcmVuZGVyZXJzLlxuICAgIHZhciByb3dfcmVuZGVyZXIgPSBuZXcgaGlnaGxpZ2h0ZWRfcm93LkhpZ2hsaWdodGVkUm93UmVuZGVyZXIobW9kZWwsIGNhbnZhcywgc3R5bGUsIGNvbmZpZyk7XG4gICAgdmFyIGN1cnNvcnNfcmVuZGVyZXIgPSBuZXcgY3Vyc29ycy5DdXJzb3JzUmVuZGVyZXIoXG4gICAgICAgIGN1cnNvcnNfbW9kZWwsIFxuICAgICAgICBzdHlsZSwgXG4gICAgICAgIHJvd19yZW5kZXJlcixcbiAgICAgICAgaGFzX2ZvY3VzKTtcbiAgICB2YXIgc2VsZWN0aW9uc19yZW5kZXJlciA9IG5ldyBzZWxlY3Rpb25zLlNlbGVjdGlvbnNSZW5kZXJlcihcbiAgICAgICAgY3Vyc29yc19tb2RlbCwgXG4gICAgICAgIHN0eWxlLCBcbiAgICAgICAgcm93X3JlbmRlcmVyLFxuICAgICAgICBoYXNfZm9jdXMpO1xuXG4gICAgLy8gQ3JlYXRlIHRoZSBiYWNrZ3JvdW5kIHJlbmRlcmVyXG4gICAgdmFyIGNvbG9yX3JlbmRlcmVyID0gbmV3IGNvbG9yLkNvbG9yUmVuZGVyZXIoKTtcbiAgICBjb2xvcl9yZW5kZXJlci5jb2xvciA9IHN0eWxlLmJhY2tncm91bmQgfHwgJ3doaXRlJztcbiAgICBzdHlsZS5vbignY2hhbmdlZDpzdHlsZScsIGZ1bmN0aW9uKCkgeyBjb2xvcl9yZW5kZXJlci5jb2xvciA9IHN0eWxlLmJhY2tncm91bmQ7IH0pO1xuXG4gICAgLy8gQ3JlYXRlIHRoZSBkb2N1bWVudCBoaWdobGlnaHRlciwgd2hpY2ggbmVlZHMgdG8ga25vdyBhYm91dCB0aGUgY3VycmVudGx5XG4gICAgLy8gcmVuZGVyZWQgcm93cyBpbiBvcmRlciB0byBrbm93IHdoZXJlIHRvIGhpZ2hsaWdodC5cbiAgICB0aGlzLmhpZ2hsaWdodGVyID0gbmV3IHN5bnRheF9oaWdobGlnaHRlci5TeW50YXhIaWdobGlnaHRlcihtb2RlbCwgcm93X3JlbmRlcmVyKTtcblxuICAgIC8vIFBhc3MgZ2V0X3Jvd19jaGFyIGludG8gY3Vyc29ycy5cbiAgICBjdXJzb3JzX21vZGVsLmdldF9yb3dfY2hhciA9IHV0aWxzLnByb3h5KHJvd19yZW5kZXJlci5nZXRfcm93X2NoYXIsIHJvd19yZW5kZXJlcik7XG5cbiAgICAvLyBDYWxsIGJhc2UgY29uc3RydWN0b3IuXG4gICAgYmF0Y2guQmF0Y2hSZW5kZXJlci5jYWxsKHRoaXMsIFtcbiAgICAgICAgY29sb3JfcmVuZGVyZXIsXG4gICAgICAgIHJvd19yZW5kZXJlcixcbiAgICAgICAgc2VsZWN0aW9uc19yZW5kZXJlcixcbiAgICAgICAgY3Vyc29yc19yZW5kZXJlcixcbiAgICBdLCBjYW52YXMpO1xuXG4gICAgLy8gSG9va3VwIHJlbmRlciBldmVudHMuXG4gICAgdGhpcy5fY2FudmFzLm9uKCdyZWRyYXcnLCB1dGlscy5wcm94eSh0aGlzLnJlbmRlciwgdGhpcykpO1xuICAgIHRoaXMuX21vZGVsLm9uKCdjaGFuZ2VkJywgdXRpbHMucHJveHkoY2FudmFzLnJlZHJhdywgY2FudmFzKSk7XG5cbiAgICAvLyBDcmVhdGUgcHJvcGVydGllc1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLnByb3BlcnR5KCdsYW5ndWFnZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC5fbGFuZ3VhZ2U7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC5oaWdobGlnaHRlci5sb2FkKHZhbHVlKTtcbiAgICAgICAgdGhhdC5fbGFuZ3VhZ2UgPSB2YWx1ZTtcbiAgICB9KTtcbn07XG51dGlscy5pbmhlcml0KERvY3VtZW50VmlldywgYmF0Y2guQmF0Y2hSZW5kZXJlcik7XG5cbmV4cG9ydHMuRG9jdW1lbnRWaWV3ID0gRG9jdW1lbnRWaWV3OyIsIi8vIE9TWCBiaW5kaW5nc1xuaWYgKG5hdmlnYXRvci5hcHBWZXJzaW9uLmluZGV4T2YoXCJNYWNcIikgIT0gLTEpIHtcbiAgICBleHBvcnRzLm1hcCA9IHtcbiAgICAgICAgJ2FsdC1sZWZ0YXJyb3cnIDogJ2N1cnNvci53b3JkX2xlZnQnLFxuICAgICAgICAnYWx0LXJpZ2h0YXJyb3cnIDogJ2N1cnNvci53b3JkX3JpZ2h0JyxcbiAgICAgICAgJ3NoaWZ0LWFsdC1sZWZ0YXJyb3cnIDogJ2N1cnNvci5zZWxlY3Rfd29yZF9sZWZ0JyxcbiAgICAgICAgJ3NoaWZ0LWFsdC1yaWdodGFycm93JyA6ICdjdXJzb3Iuc2VsZWN0X3dvcmRfcmlnaHQnLFxuICAgICAgICAnbWV0YS1sZWZ0YXJyb3cnIDogJ2N1cnNvci5saW5lX3N0YXJ0JyxcbiAgICAgICAgJ21ldGEtcmlnaHRhcnJvdycgOiAnY3Vyc29yLmxpbmVfZW5kJyxcbiAgICAgICAgJ3NoaWZ0LW1ldGEtbGVmdGFycm93JyA6ICdjdXJzb3Iuc2VsZWN0X2xpbmVfc3RhcnQnLFxuICAgICAgICAnc2hpZnQtbWV0YS1yaWdodGFycm93JyA6ICdjdXJzb3Iuc2VsZWN0X2xpbmVfZW5kJyxcbiAgICAgICAgJ21ldGEtYScgOiAnY3Vyc29yLnNlbGVjdF9hbGwnLFxuICAgIH07XG5cbi8vIE5vbiBPU1ggYmluZGluZ3Ncbn0gZWxzZSB7XG4gICAgZXhwb3J0cy5tYXAgPSB7XG4gICAgICAgICdjdHJsLWxlZnRhcnJvdycgOiAnY3Vyc29yLndvcmRfbGVmdCcsXG4gICAgICAgICdjdHJsLXJpZ2h0YXJyb3cnIDogJ2N1cnNvci53b3JkX3JpZ2h0JyxcbiAgICAgICAgJ3NoaWZ0LWN0cmwtbGVmdGFycm93JyA6ICdjdXJzb3Iuc2VsZWN0X3dvcmRfbGVmdCcsXG4gICAgICAgICdzaGlmdC1jdHJsLXJpZ2h0YXJyb3cnIDogJ2N1cnNvci5zZWxlY3Rfd29yZF9yaWdodCcsXG4gICAgICAgICdob21lJyA6ICdjdXJzb3IubGluZV9zdGFydCcsXG4gICAgICAgICdlbmQnIDogJ2N1cnNvci5saW5lX2VuZCcsXG4gICAgICAgICdzaGlmdC1ob21lJyA6ICdjdXJzb3Iuc2VsZWN0X2xpbmVfc3RhcnQnLFxuICAgICAgICAnc2hpZnQtZW5kJyA6ICdjdXJzb3Iuc2VsZWN0X2xpbmVfZW5kJyxcbiAgICAgICAgJ2N0cmwtYScgOiAnY3Vyc29yLnNlbGVjdF9hbGwnLFxuICAgIH07XG5cbn1cblxuLy8gQ29tbW9uIGJpbmRpbmdzXG5leHBvcnRzLm1hcFsna2V5cHJlc3MnXSA9ICdjdXJzb3Iua2V5cHJlc3MnO1xuZXhwb3J0cy5tYXBbJ2VudGVyJ10gPSAnY3Vyc29yLm5ld2xpbmUnO1xuZXhwb3J0cy5tYXBbJ2RlbGV0ZSddID0gJ2N1cnNvci5kZWxldGVfZm9yd2FyZCc7XG5leHBvcnRzLm1hcFsnYmFja3NwYWNlJ10gPSAnY3Vyc29yLmRlbGV0ZV9iYWNrd2FyZCc7XG5leHBvcnRzLm1hcFsnbGVmdGFycm93J10gPSAnY3Vyc29yLmxlZnQnO1xuZXhwb3J0cy5tYXBbJ3JpZ2h0YXJyb3cnXSA9ICdjdXJzb3IucmlnaHQnO1xuZXhwb3J0cy5tYXBbJ3VwYXJyb3cnXSA9ICdjdXJzb3IudXAnO1xuZXhwb3J0cy5tYXBbJ2Rvd25hcnJvdyddID0gJ2N1cnNvci5kb3duJztcbmV4cG9ydHMubWFwWydzaGlmdC1sZWZ0YXJyb3cnXSA9ICdjdXJzb3Iuc2VsZWN0X2xlZnQnO1xuZXhwb3J0cy5tYXBbJ3NoaWZ0LXJpZ2h0YXJyb3cnXSA9ICdjdXJzb3Iuc2VsZWN0X3JpZ2h0JztcbmV4cG9ydHMubWFwWydzaGlmdC11cGFycm93J10gPSAnY3Vyc29yLnNlbGVjdF91cCc7XG5leHBvcnRzLm1hcFsnc2hpZnQtZG93bmFycm93J10gPSAnY3Vyc29yLnNlbGVjdF9kb3duJztcbmV4cG9ydHMubWFwWydtb3VzZTAtZG93biddID0gJ2N1cnNvcnMuc3RhcnRfc2VsZWN0aW9uJztcbmV4cG9ydHMubWFwWydtb3VzZS1tb3ZlJ10gPSAnY3Vyc29ycy5zZXRfc2VsZWN0aW9uJztcbmV4cG9ydHMubWFwWydtb3VzZTAtdXAnXSA9ICdjdXJzb3JzLmVuZF9zZWxlY3Rpb24nO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzLmpzJyk7XG5cbi8qKlxuICogRXZlbnQgbm9ybWFsaXplclxuICpcbiAqIExpc3RlbnMgdG8gRE9NIGV2ZW50cyBhbmQgZW1pdHMgJ2NsZWFuZWQnIHZlcnNpb25zIG9mIHRob3NlIGV2ZW50cy5cbiAqL1xudmFyIE1hcCA9IGZ1bmN0aW9uKG5vcm1hbGl6ZXIpIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMuX21hcCA9IHt9O1xuXG4gICAgLy8gQ3JlYXRlIG5vcm1hbGl6ZXIgcHJvcGVydHlcbiAgICB0aGlzLl9ub3JtYWxpemVyID0gbnVsbDtcbiAgICB0aGlzLl9wcm94eV9oYW5kbGVfZXZlbnQgPSB1dGlscy5wcm94eSh0aGlzLl9oYW5kbGVfZXZlbnQsIHRoaXMpO1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLnByb3BlcnR5KCdub3JtYWxpemVyJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Ll9ub3JtYWxpemVyO1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIC8vIFJlbW92ZSBldmVudCBoYW5kbGVyLlxuICAgICAgICBpZiAodGhhdC5fbm9ybWFsaXplcikgdGhhdC5fbm9ybWFsaXplci5vZmZfYWxsKHRoYXQuX3Byb3h5X2hhbmRsZV9ldmVudCk7XG4gICAgICAgIC8vIFNldCwgYW5kIGFkZCBldmVudCBoYW5kbGVyLlxuICAgICAgICB0aGF0Ll9ub3JtYWxpemVyID0gdmFsdWU7XG4gICAgICAgIGlmICh2YWx1ZSkgdmFsdWUub25fYWxsKHRoYXQuX3Byb3h5X2hhbmRsZV9ldmVudCk7XG4gICAgfSk7XG5cbiAgICAvLyBJZiBkZWZpbmVkLCBzZXQgdGhlIG5vcm1hbGl6ZXIuXG4gICAgaWYgKG5vcm1hbGl6ZXIpIHRoaXMubm9ybWFsaXplciA9IG5vcm1hbGl6ZXI7XG59O1xudXRpbHMuaW5oZXJpdChNYXAsIHV0aWxzLlBvc3RlckNsYXNzKTtcblxuLyoqXG4gKiBNYXAgb2YgQVBJIG1ldGhvZHMgYnkgbmFtZS5cbiAqIEB0eXBlIHtkaWN0aW9uYXJ5fVxuICovXG5NYXAucmVnaXN0cnkgPSB7fTtcbk1hcC5fcmVnaXN0cnlfdGFncyA9IHt9O1xuXG4vKipcbiAqIFJlZ2lzdGVycyBhbiBhY3Rpb24uXG4gKiBAcGFyYW0gIHtzdHJpbmd9IG5hbWUgLSBuYW1lIG9mIHRoZSBhY3Rpb25cbiAqIEBwYXJhbSAge2Z1bmN0aW9ufSBmXG4gKiBAcGFyYW0gIHtPYmplY3R9IChvcHRpb25hbCkgdGFnIC0gYWxsb3dzIHlvdSB0byBzcGVjaWZ5IGEgdGFnXG4gKiAgICAgICAgICAgICAgICAgIHdoaWNoIGNhbiBiZSB1c2VkIHdpdGggdGhlIGB1bnJlZ2lzdGVyX2J5X3RhZ2BcbiAqICAgICAgICAgICAgICAgICAgbWV0aG9kIHRvIHF1aWNrbHkgdW5yZWdpc3RlciBhY3Rpb25zIHdpdGhcbiAqICAgICAgICAgICAgICAgICAgdGhlIHRhZyBzcGVjaWZpZWQuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5NYXAucmVnaXN0ZXIgPSBmdW5jdGlvbihuYW1lLCBmLCB0YWcpIHtcbiAgICBpZiAodXRpbHMuaXNfYXJyYXkoTWFwLnJlZ2lzdHJ5W25hbWVdKSkge1xuICAgICAgICBNYXAucmVnaXN0cnlbbmFtZV0ucHVzaChmKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoTWFwLnJlZ2lzdHJ5W25hbWVdPT09dW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBNYXAucmVnaXN0cnlbbmFtZV0gPSBmO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgTWFwLnJlZ2lzdHJ5W25hbWVdID0gW01hcC5yZWdpc3RyeVtuYW1lXSwgZl07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGFnKSB7XG4gICAgICAgIGlmIChNYXAuX3JlZ2lzdHJ5X3RhZ3NbdGFnXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBNYXAuX3JlZ2lzdHJ5X3RhZ3NbdGFnXSA9IFtdO1xuICAgICAgICB9XG4gICAgICAgIE1hcC5fcmVnaXN0cnlfdGFnc1t0YWddLnB1c2goe25hbWU6IG5hbWUsIGY6IGZ9KTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFVucmVnaXN0ZXIgYW4gYWN0aW9uLlxuICogQHBhcmFtICB7c3RyaW5nfSBuYW1lIC0gbmFtZSBvZiB0aGUgYWN0aW9uXG4gKiBAcGFyYW0gIHtmdW5jdGlvbn0gZlxuICogQHJldHVybiB7Ym9vbGVhbn0gdHJ1ZSBpZiBhY3Rpb24gd2FzIGZvdW5kIGFuZCB1bnJlZ2lzdGVyZWRcbiAqL1xuTWFwLnVucmVnaXN0ZXIgPSBmdW5jdGlvbihuYW1lLCBmKSB7XG4gICAgaWYgKHV0aWxzLmlzX2FycmF5KE1hcC5yZWdpc3RyeVtuYW1lXSkpIHtcbiAgICAgICAgdmFyIGluZGV4ID0gTWFwLnJlZ2lzdHJ5W25hbWVdLmluZGV4T2YoZik7XG4gICAgICAgIGlmIChpbmRleCAhPSAtMSkge1xuICAgICAgICAgICAgTWFwLnJlZ2lzdHJ5W25hbWVdLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoTWFwLnJlZ2lzdHJ5W25hbWVdID09IGYpIHtcbiAgICAgICAgZGVsZXRlIE1hcC5yZWdpc3RyeVtuYW1lXTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn07XG5cbi8qKlxuICogVW5yZWdpc3RlcnMgYWxsIG9mIHRoZSBhY3Rpb25zIHJlZ2lzdGVyZWQgd2l0aCBhIGdpdmVuIHRhZy5cbiAqIEBwYXJhbSAge09iamVjdH0gdGFnIC0gc3BlY2lmaWVkIGluIE1hcC5yZWdpc3Rlci5cbiAqIEByZXR1cm4ge2Jvb2xlYW59IHRydWUgaWYgdGhlIHRhZyB3YXMgZm91bmQgYW5kIGRlbGV0ZWQuXG4gKi9cbk1hcC51bnJlZ2lzdGVyX2J5X3RhZyA9IGZ1bmN0aW9uKHRhZykge1xuICAgIGlmIChNYXAuX3JlZ2lzdHJ5X3RhZ3NbdGFnXSkge1xuICAgICAgICBNYXAuX3JlZ2lzdHJ5X3RhZ3NbdGFnXS5mb3JFYWNoKGZ1bmN0aW9uKHJlZ2lzdHJhdGlvbikge1xuICAgICAgICAgICAgTWFwLnVucmVnaXN0ZXIocmVnaXN0cmF0aW9uLm5hbWUsIHJlZ2lzdHJhdGlvbi5mKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGRlbGV0ZSBNYXAuX3JlZ2lzdHJ5X3RhZ3NbdGFnXTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxufTtcblxuLyoqXG4gKiBBcHBlbmQgZXZlbnQgYWN0aW9ucyB0byB0aGUgbWFwLlxuICpcbiAqIFRoaXMgbWV0aG9kIGhhcyB0d28gc2lnbmF0dXJlcy4gIElmIGEgc2luZ2xlIGFyZ3VtZW50XG4gKiBpcyBwYXNzZWQgdG8gaXQsIHRoYXQgYXJndW1lbnQgaXMgdHJlYXRlZCBsaWtlIGFcbiAqIGRpY3Rpb25hcnkuICBJZiBtb3JlIHRoYW4gb25lIGFyZ3VtZW50IGlzIHBhc3NlZCB0byBpdCxcbiAqIGVhY2ggYXJndW1lbnQgaXMgdHJlYXRlZCBhcyBhbHRlcm5hdGluZyBrZXksIHZhbHVlXG4gKiBwYWlycyBvZiBhIGRpY3Rpb25hcnkuXG4gKlxuICogVGhlIG1hcCBhbGxvd3MgeW91IHRvIHJlZ2lzdGVyIGFjdGlvbnMgZm9yIGtleXMuXG4gKiBFeGFtcGxlOlxuICogICAgIG1hcC5hcHBlbmRfbWFwKHtcbiAqICAgICAgICAgJ2N0cmwtYSc6ICdjdXJzb3JzLnNlbGVjdF9hbGwnLFxuICogICAgIH0pXG4gKlxuICogTXVsdGlwbGUgYWN0aW9ucyBjYW4gYmUgcmVnaXN0ZXJlZCBmb3IgYSBzaW5nbGUgZXZlbnQuXG4gKiBUaGUgYWN0aW9ucyBhcmUgZXhlY3V0ZWQgc2VxdWVudGlhbGx5LCB1bnRpbCBvbmUgYWN0aW9uXG4gKiByZXR1cm5zIGB0cnVlYCBpbiB3aGljaCBjYXNlIHRoZSBleGVjdXRpb24gaGF1bHRzLiAgVGhpc1xuICogYWxsb3dzIGFjdGlvbnMgdG8gcnVuIGNvbmRpdGlvbmFsbHkuXG4gKiBFeGFtcGxlOlxuICogICAgIC8vIEltcGxlbWVudGluZyBhIGR1YWwgbW9kZSBlZGl0b3IsIHlvdSBtYXkgaGF2ZSB0d29cbiAqICAgICAvLyBmdW5jdGlvbnMgdG8gcmVnaXN0ZXIgZm9yIG9uZSBrZXkuIGkuZS46XG4gKiAgICAgdmFyIGRvX2EgPSBmdW5jdGlvbihlKSB7XG4gKiAgICAgICAgIGlmIChtb2RlPT0nZWRpdCcpIHtcbiAqICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdBJyk7XG4gKiAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAqICAgICAgICAgfVxuICogICAgIH1cbiAqICAgICB2YXIgZG9fYiA9IGZ1bmN0aW9uKGUpIHtcbiAqICAgICAgICAgaWYgKG1vZGU9PSdjb21tYW5kJykge1xuICogICAgICAgICAgICAgY29uc29sZS5sb2coJ0InKTtcbiAqICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICogICAgICAgICB9XG4gKiAgICAgfVxuICpcbiAqICAgICAvLyBUbyByZWdpc3RlciBib3RoIGZvciBvbmUga2V5XG4gKiAgICAgTWFwLnJlZ2lzdGVyKCdhY3Rpb25fYScsIGRvX2EpO1xuICogICAgIE1hcC5yZWdpc3RlcignYWN0aW9uX2InLCBkb19iKTtcbiAqICAgICBtYXAuYXBwZW5kX21hcCh7XG4gKiAgICAgICAgICdhbHQtdic6IFsnYWN0aW9uX2EnLCAnYWN0aW9uX2InXSxcbiAqICAgICB9KTtcbiAqIFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuTWFwLnByb3RvdHlwZS5hcHBlbmRfbWFwID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHZhciBwYXJzZWQgPSB0aGlzLl9wYXJzZV9tYXBfYXJndW1lbnRzKGFyZ3VtZW50cyk7XG4gICAgT2JqZWN0LmtleXMocGFyc2VkKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICBpZiAodGhhdC5fbWFwW2tleV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhhdC5fbWFwW2tleV0gPSBwYXJzZWRba2V5XTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoYXQuX21hcFtrZXldID0gdGhhdC5fbWFwW2tleV0uY29uY2F0KHBhcnNlZFtrZXldKTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuLyoqXG4gKiBBbGlhcyBmb3IgYGFwcGVuZF9tYXBgLlxuICogQHR5cGUge2Z1bmN0aW9ufVxuICovXG5NYXAucHJvdG90eXBlLm1hcCA9IE1hcC5wcm90b3R5cGUuYXBwZW5kX21hcDtcblxuLyoqXG4gKiBQcmVwZW5kIGV2ZW50IGFjdGlvbnMgdG8gdGhlIG1hcC5cbiAqXG4gKiBTZWUgdGhlIGRvYyBmb3IgYGFwcGVuZF9tYXBgIGZvciBhIGRldGFpbGVkIGRlc2NyaXB0aW9uIG9mXG4gKiBwb3NzaWJsZSBpbnB1dCB2YWx1ZXMuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5NYXAucHJvdG90eXBlLnByZXBlbmRfbWFwID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHZhciBwYXJzZWQgPSB0aGlzLl9wYXJzZV9tYXBfYXJndW1lbnRzKGFyZ3VtZW50cyk7XG4gICAgT2JqZWN0LmtleXMocGFyc2VkKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICBpZiAodGhhdC5fbWFwW2tleV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhhdC5fbWFwW2tleV0gPSBwYXJzZWRba2V5XTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoYXQuX21hcFtrZXldID0gcGFyc2VkW2tleV0uY29uY2F0KHRoYXQuX21hcFtrZXldKTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuLyoqXG4gKiBVbm1hcCBldmVudCBhY3Rpb25zIGluIHRoZSBtYXAuXG4gKlxuICogU2VlIHRoZSBkb2MgZm9yIGBhcHBlbmRfbWFwYCBmb3IgYSBkZXRhaWxlZCBkZXNjcmlwdGlvbiBvZlxuICogcG9zc2libGUgaW5wdXQgdmFsdWVzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuTWFwLnByb3RvdHlwZS51bm1hcCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB2YXIgcGFyc2VkID0gdGhpcy5fcGFyc2VfbWFwX2FyZ3VtZW50cyhhcmd1bWVudHMpO1xuICAgIE9iamVjdC5rZXlzKHBhcnNlZCkuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgaWYgKHRoYXQuX21hcFtrZXldICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHBhcnNlZFtrZXldLmZvckVhY2goZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICB2YXIgaW5kZXggPSB0aGF0Ll9tYXBba2V5XS5pbmRleE9mKHZhbHVlKTtcbiAgICAgICAgICAgICAgICBpZiAoaW5kZXggIT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5fbWFwW2tleV0uc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuLyoqXG4gKiBHZXQgYSBtb2RpZmlhYmxlIGFycmF5IG9mIHRoZSBhY3Rpb25zIGZvciBhIHBhcnRpY3VsYXIgZXZlbnQuXG4gKiBAcGFyYW0gIHtzdHJpbmd9IGV2ZW50XG4gKiBAcmV0dXJuIHthcnJheX0gYnkgcmVmIGNvcHkgb2YgdGhlIGFjdGlvbnMgcmVnaXN0ZXJlZCB0byBhbiBldmVudC5cbiAqL1xuTWFwLnByb3RvdHlwZS5nZXRfbWFwcGluZyA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgcmV0dXJuIHRoaXMuX21hcFt0aGlzLl9ub3JtYWxpemVfZXZlbnRfbmFtZShldmVudCldO1xufTtcblxuLyoqXG4gKiBQYXJzZSB0aGUgYXJndW1lbnRzIHRvIGEgbWFwIGZ1bmN0aW9uLlxuICogQHBhcmFtICB7YXJndW1lbnRzIGFycmF5fSBhcmdzXG4gKiBAcmV0dXJuIHtkaWN0aW9uYXJ5fSBwYXJzZWQgcmVzdWx0c1xuICovXG5NYXAucHJvdG90eXBlLl9wYXJzZV9tYXBfYXJndW1lbnRzID0gZnVuY3Rpb24oYXJncykge1xuICAgIHZhciBwYXJzZWQgPSB7fTtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG5cbiAgICAvLyBPbmUgYXJ1bWVudCwgdHJlYXQgaXQgYXMgYSBkaWN0aW9uYXJ5IG9mIGV2ZW50IG5hbWVzIGFuZFxuICAgIC8vIGFjdGlvbnMuXG4gICAgaWYgKGFyZ3MubGVuZ3RoID09IDEpIHtcbiAgICAgICAgT2JqZWN0LmtleXMoYXJnc1swXSkuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IGFyZ3NbMF1ba2V5XTtcbiAgICAgICAgICAgIHZhciBub3JtYWxpemVkX2tleSA9IHRoYXQuX25vcm1hbGl6ZV9ldmVudF9uYW1lKGtleSk7XG5cbiAgICAgICAgICAgIC8vIElmIHRoZSB2YWx1ZSBpcyBub3QgYW4gYXJyYXksIHdyYXAgaXQgaW4gb25lLlxuICAgICAgICAgICAgaWYgKCF1dGlscy5pc19hcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IFt2YWx1ZV07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIElmIHRoZSBrZXkgaXMgYWxyZWFkeSBkZWZpbmVkLCBjb25jYXQgdGhlIHZhbHVlcyB0b1xuICAgICAgICAgICAgLy8gaXQuICBPdGhlcndpc2UsIHNldCBpdC5cbiAgICAgICAgICAgIGlmIChwYXJzZWRbbm9ybWFsaXplZF9rZXldID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBwYXJzZWRbbm9ybWFsaXplZF9rZXldID0gdmFsdWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHBhcnNlZFtub3JtYWxpemVkX2tleV0gPSBwYXJzZWRbbm9ybWFsaXplZF9rZXldLmNvbmNhdCh2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgLy8gTW9yZSB0aGFuIG9uZSBhcmd1bWVudC4gIFRyZWF0IGFzIHRoZSBmb3JtYXQ6XG4gICAgLy8gZXZlbnRfbmFtZTEsIGFjdGlvbjEsIGV2ZW50X25hbWUyLCBhY3Rpb24yLCAuLi4sIGV2ZW50X25hbWVOLCBhY3Rpb25OXG4gICAgfSBlbHNlIHtcbiAgICAgICAgZm9yICh2YXIgaT0wOyBpPE1hdGguZmxvb3IoYXJncy5sZW5ndGgvMik7IGkrKykge1xuICAgICAgICAgICAgdmFyIGtleSA9IHRoYXQuX25vcm1hbGl6ZV9ldmVudF9uYW1lKGFyZ3NbMippXSk7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBhcmdzWzIqaSArIDFdO1xuICAgICAgICAgICAgaWYgKHBhcnNlZFtrZXldPT09dW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgcGFyc2VkW2tleV0gPSBbdmFsdWVdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwYXJzZWRba2V5XS5wdXNoKHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcGFyc2VkO1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIGEgbm9ybWFsaXplZCBldmVudC5cbiAqIEBwYXJhbSAge3N0cmluZ30gbmFtZSAtIG5hbWUgb2YgdGhlIGV2ZW50XG4gKiBAcGFyYW0gIHtFdmVudH0gZSAtIGJyb3dzZXIgRXZlbnQgb2JqZWN0XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5NYXAucHJvdG90eXBlLl9oYW5kbGVfZXZlbnQgPSBmdW5jdGlvbihuYW1lLCBlKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHZhciBub3JtYWxpemVkX2V2ZW50ID0gdGhpcy5fbm9ybWFsaXplX2V2ZW50X25hbWUobmFtZSk7XG4gICAgdmFyIGFjdGlvbnMgPSB0aGlzLl9tYXBbbm9ybWFsaXplZF9ldmVudF07XG5cbiAgICBpZiAoYWN0aW9ucykge1xuICAgICAgICBhY3Rpb25zLmZvckVhY2goZnVuY3Rpb24oYWN0aW9uKSB7XG4gICAgICAgICAgICB2YXIgYWN0aW9uX2NhbGxiYWNrcyA9IE1hcC5yZWdpc3RyeVthY3Rpb25dO1xuICAgICAgICAgICAgaWYgKGFjdGlvbl9jYWxsYmFja3MpIHtcbiAgICAgICAgICAgICAgICBpZiAodXRpbHMuaXNfYXJyYXkoYWN0aW9uX2NhbGxiYWNrcykpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJldHVybnMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgYWN0aW9uX2NhbGxiYWNrcy5mb3JFYWNoKGZ1bmN0aW9uKGFjdGlvbl9jYWxsYmFjaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJucy5hcHBlbmQoYWN0aW9uX2NhbGxiYWNrLmNhbGwodW5kZWZpbmVkLCBlKT09PXRydWUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBJZiBvbmUgb2YgdGhlIGFjdGlvbiBjYWxsYmFja3MgcmV0dXJuZWQgdHJ1ZSwgY2FuY2VsIGJ1YmJsaW5nLlxuICAgICAgICAgICAgICAgICAgICBpZiAocmV0dXJucy5zb21lKGZ1bmN0aW9uKHgpIHtyZXR1cm4geDt9KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXRpbHMuY2FuY2VsX2J1YmJsZShlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFjdGlvbl9jYWxsYmFja3MuY2FsbCh1bmRlZmluZWQsIGUpPT09dHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXRpbHMuY2FuY2VsX2J1YmJsZShlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufTtcblxuLyoqXG4gKiBBbHBoYWJldGljYWxseSBzb3J0cyBrZXlzIGluIGV2ZW50IG5hbWUsIHNvXG4gKiBAcGFyYW0gIHtzdHJpbmd9IG5hbWUgLSBldmVudCBuYW1lXG4gKiBAcmV0dXJuIHtzdHJpbmd9IG5vcm1hbGl6ZWQgZXZlbnQgbmFtZVxuICovXG5NYXAucHJvdG90eXBlLl9ub3JtYWxpemVfZXZlbnRfbmFtZSA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gbmFtZS50b0xvd2VyQ2FzZSgpLnRyaW0oKS5zcGxpdCgnLScpLnNvcnQoKS5qb2luKCctJyk7XG59O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLk1hcCA9IE1hcDtcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy5qcycpO1xuXG4vKipcbiAqIEV2ZW50IG5vcm1hbGl6ZXJcbiAqXG4gKiBMaXN0ZW5zIHRvIERPTSBldmVudHMgYW5kIGVtaXRzICdjbGVhbmVkJyB2ZXJzaW9ucyBvZiB0aG9zZSBldmVudHMuXG4gKi9cbnZhciBOb3JtYWxpemVyID0gZnVuY3Rpb24oKSB7XG4gICAgdXRpbHMuUG9zdGVyQ2xhc3MuY2FsbCh0aGlzKTtcbiAgICB0aGlzLl9lbF9ob29rcyA9IHt9O1xufTtcbnV0aWxzLmluaGVyaXQoTm9ybWFsaXplciwgdXRpbHMuUG9zdGVyQ2xhc3MpO1xuXG4vKipcbiAqIExpc3RlbiB0byB0aGUgZXZlbnRzIG9mIGFuIGVsZW1lbnQuXG4gKiBAcGFyYW0gIHtIVE1MRWxlbWVudH0gZWxcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbk5vcm1hbGl6ZXIucHJvdG90eXBlLmxpc3Rlbl90byA9IGZ1bmN0aW9uKGVsKSB7XG4gICAgdmFyIGhvb2tzID0gW107XG4gICAgaG9va3MucHVzaCh1dGlscy5ob29rKGVsLCAnb25rZXlwcmVzcycsIHRoaXMuX3Byb3h5KCdwcmVzcycsIHRoaXMuX2hhbmRsZV9rZXlwcmVzc19ldmVudCwgZWwpKSk7XG4gICAgaG9va3MucHVzaCh1dGlscy5ob29rKGVsLCAnb25rZXlkb3duJywgIHRoaXMuX3Byb3h5KCdkb3duJywgdGhpcy5faGFuZGxlX2tleWJvYXJkX2V2ZW50LCBlbCkpKTtcbiAgICBob29rcy5wdXNoKHV0aWxzLmhvb2soZWwsICdvbmtleXVwJywgIHRoaXMuX3Byb3h5KCd1cCcsIHRoaXMuX2hhbmRsZV9rZXlib2FyZF9ldmVudCwgZWwpKSk7XG4gICAgaG9va3MucHVzaCh1dGlscy5ob29rKGVsLCAnb25kYmxjbGljaycsICB0aGlzLl9wcm94eSgnZGJsY2xpY2snLCB0aGlzLl9oYW5kbGVfbW91c2VfZXZlbnQsIGVsKSkpO1xuICAgIGhvb2tzLnB1c2godXRpbHMuaG9vayhlbCwgJ29uY2xpY2snLCAgdGhpcy5fcHJveHkoJ2NsaWNrJywgdGhpcy5faGFuZGxlX21vdXNlX2V2ZW50LCBlbCkpKTtcbiAgICBob29rcy5wdXNoKHV0aWxzLmhvb2soZWwsICdvbm1vdXNlZG93bicsICB0aGlzLl9wcm94eSgnZG93bicsIHRoaXMuX2hhbmRsZV9tb3VzZV9ldmVudCwgZWwpKSk7XG4gICAgaG9va3MucHVzaCh1dGlscy5ob29rKGVsLCAnb25tb3VzZXVwJywgIHRoaXMuX3Byb3h5KCd1cCcsIHRoaXMuX2hhbmRsZV9tb3VzZV9ldmVudCwgZWwpKSk7XG4gICAgaG9va3MucHVzaCh1dGlscy5ob29rKGVsLCAnb25tb3VzZW1vdmUnLCAgdGhpcy5fcHJveHkoJ21vdmUnLCB0aGlzLl9oYW5kbGVfbW91c2Vtb3ZlX2V2ZW50LCBlbCkpKTtcbiAgICB0aGlzLl9lbF9ob29rc1tlbF0gPSBob29rcztcbn07XG5cbi8qKlxuICogU3RvcHMgbGlzdGVuaW5nIHRvIGFuIGVsZW1lbnQuXG4gKiBAcGFyYW0gIHtIVE1MRWxlbWVudH0gZWxcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbk5vcm1hbGl6ZXIucHJvdG90eXBlLnN0b3BfbGlzdGVuaW5nX3RvID0gZnVuY3Rpb24oZWwpIHtcbiAgICBpZiAodGhpcy5fZWxfaG9va3NbZWxdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5fZWxfaG9va3NbZWxdLmZvckVhY2goZnVuY3Rpb24oaG9vaykge1xuICAgICAgICAgICAgaG9vay51bmhvb2soKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGRlbGV0ZSB0aGlzLl9lbF9ob29rc1tlbF07XG4gICAgfVxufTtcblxuLyoqXG4gKiBIYW5kbGVzIHdoZW4gYSBtb3VzZSBldmVudCBvY2N1cnNcbiAqIEBwYXJhbSAge0hUTUxFbGVtZW50fSBlbFxuICogQHBhcmFtICB7RXZlbnR9IGVcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbk5vcm1hbGl6ZXIucHJvdG90eXBlLl9oYW5kbGVfbW91c2VfZXZlbnQgPSBmdW5jdGlvbihlbCwgZXZlbnRfbmFtZSwgZSkge1xuICAgIGUgPSBlIHx8IHdpbmRvdy5ldmVudDtcbiAgICB0aGlzLnRyaWdnZXIodGhpcy5fbW9kaWZpZXJfc3RyaW5nKGUpICsgJ21vdXNlJyArIGUuYnV0dG9uICsgJy0nICsgZXZlbnRfbmFtZSwgZSk7XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgd2hlbiBhIG1vdXNlIGV2ZW50IG9jY3Vyc1xuICogQHBhcmFtICB7SFRNTEVsZW1lbnR9IGVsXG4gKiBAcGFyYW0gIHtFdmVudH0gZVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuTm9ybWFsaXplci5wcm90b3R5cGUuX2hhbmRsZV9tb3VzZW1vdmVfZXZlbnQgPSBmdW5jdGlvbihlbCwgZXZlbnRfbmFtZSwgZSkge1xuICAgIGUgPSBlIHx8IHdpbmRvdy5ldmVudDtcbiAgICB0aGlzLnRyaWdnZXIodGhpcy5fbW9kaWZpZXJfc3RyaW5nKGUpICsgJ21vdXNlJyArICctJyArIGV2ZW50X25hbWUsIGUpO1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIHdoZW4gYSBrZXlib2FyZCBldmVudCBvY2N1cnNcbiAqIEBwYXJhbSAge0hUTUxFbGVtZW50fSBlbFxuICogQHBhcmFtICB7RXZlbnR9IGVcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbk5vcm1hbGl6ZXIucHJvdG90eXBlLl9oYW5kbGVfa2V5Ym9hcmRfZXZlbnQgPSBmdW5jdGlvbihlbCwgZXZlbnRfbmFtZSwgZSkge1xuICAgIGUgPSBlIHx8IHdpbmRvdy5ldmVudDtcbiAgICB2YXIga2V5bmFtZSA9IHRoaXMuX2xvb2t1cF9rZXljb2RlKGUua2V5Q29kZSk7XG4gICAgaWYgKGtleW5hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLnRyaWdnZXIodGhpcy5fbW9kaWZpZXJfc3RyaW5nKGUpICsga2V5bmFtZSArICctJyArIGV2ZW50X25hbWUsIGUpO1xuXG4gICAgICAgIGlmIChldmVudF9uYW1lPT0nZG93bicpIHsgICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMudHJpZ2dlcih0aGlzLl9tb2RpZmllcl9zdHJpbmcoZSkgKyBrZXluYW1lLCBlKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB0aGlzLnRyaWdnZXIodGhpcy5fbW9kaWZpZXJfc3RyaW5nKGUpICsgU3RyaW5nKGUua2V5Q29kZSkgKyAnLScgKyBldmVudF9uYW1lLCBlKTtcbiAgICB0aGlzLnRyaWdnZXIoJ2tleScgKyBldmVudF9uYW1lLCBlKTtcbn07XG5cbi8qKlxuICogSGFuZGxlcyB3aGVuIGEga2V5cHJlc3MgZXZlbnQgb2NjdXJzXG4gKiBAcGFyYW0gIHtIVE1MRWxlbWVudH0gZWxcbiAqIEBwYXJhbSAge0V2ZW50fSBlXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Ob3JtYWxpemVyLnByb3RvdHlwZS5faGFuZGxlX2tleXByZXNzX2V2ZW50ID0gZnVuY3Rpb24oZWwsIGV2ZW50X25hbWUsIGUpIHtcbiAgICB0aGlzLnRyaWdnZXIoJ2tleXByZXNzJywgZSk7XG59O1xuXG4vKipcbiAqIENyZWF0ZXMgYW4gZWxlbWVudCBldmVudCBwcm94eS5cbiAqIEBwYXJhbSAge2Z1bmN0aW9ufSBmXG4gKiBAcGFyYW0gIHtzdHJpbmd9IGV2ZW50X25hbWVcbiAqIEBwYXJhbSAge0hUTUxFbGVtZW50fSBlbFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuTm9ybWFsaXplci5wcm90b3R5cGUuX3Byb3h5ID0gZnVuY3Rpb24oZXZlbnRfbmFtZSwgZiwgZWwpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgYXJncyA9IFtlbCwgZXZlbnRfbmFtZV0uY29uY2F0KEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCkpO1xuICAgICAgICByZXR1cm4gZi5hcHBseSh0aGF0LCBhcmdzKTtcbiAgICB9O1xufTtcblxuLyoqXG4gKiBDcmVhdGUgYSBtb2RpZmllcnMgc3RyaW5nIGZyb20gYW4gZXZlbnQuXG4gKiBAcGFyYW0gIHtFdmVudH0gZVxuICogQHJldHVybiB7c3RyaW5nfSBkYXNoIHNlcGFyYXRlZCBtb2RpZmllciBzdHJpbmdcbiAqL1xuTm9ybWFsaXplci5wcm90b3R5cGUuX21vZGlmaWVyX3N0cmluZyA9IGZ1bmN0aW9uKGUpIHtcbiAgICB2YXIgbW9kaWZpZXJzID0gW107XG4gICAgaWYgKGUuY3RybEtleSkgbW9kaWZpZXJzLnB1c2goJ2N0cmwnKTtcbiAgICBpZiAoZS5hbHRLZXkpIG1vZGlmaWVycy5wdXNoKCdhbHQnKTtcbiAgICBpZiAoZS5tZXRhS2V5KSBtb2RpZmllcnMucHVzaCgnbWV0YScpO1xuICAgIGlmIChlLnNoaWZ0S2V5KSBtb2RpZmllcnMucHVzaCgnc2hpZnQnKTtcbiAgICB2YXIgc3RyaW5nID0gbW9kaWZpZXJzLnNvcnQoKS5qb2luKCctJyk7XG4gICAgaWYgKHN0cmluZy5sZW5ndGggPiAwKSBzdHJpbmcgPSBzdHJpbmcgKyAnLSc7XG4gICAgcmV0dXJuIHN0cmluZztcbn07XG5cbi8qKlxuICogTG9va3VwIHRoZSBodW1hbiBmcmllbmRseSBuYW1lIGZvciBhIGtleWNvZGUuXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBrZXljb2RlXG4gKiBAcmV0dXJuIHtzdHJpbmd9IGtleSBuYW1lXG4gKi9cbk5vcm1hbGl6ZXIucHJvdG90eXBlLl9sb29rdXBfa2V5Y29kZSA9IGZ1bmN0aW9uKGtleWNvZGUpIHtcbiAgICBpZiAoMTEyIDw9IGtleWNvZGUgJiYga2V5Y29kZSA8PSAxMjMpIHsgLy8gRjEtRjEyXG4gICAgICAgIHJldHVybiAnZicgKyAoa2V5Y29kZS0xMTEpO1xuICAgIH0gZWxzZSBpZiAoNDggPD0ga2V5Y29kZSAmJiBrZXljb2RlIDw9IDU3KSB7IC8vIDAtOVxuICAgICAgICByZXR1cm4gU3RyaW5nKGtleWNvZGUtNDgpO1xuICAgIH0gZWxzZSBpZiAoNjUgPD0ga2V5Y29kZSAmJiBrZXljb2RlIDw9IDkwKSB7IC8vIEEtWlxuICAgICAgICByZXR1cm4gJ2FiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6Jy5zdWJzdHJpbmcoU3RyaW5nKGtleWNvZGUtNjUpLCBTdHJpbmcoa2V5Y29kZS02NCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBjb2RlcyA9IHtcbiAgICAgICAgICAgIDg6ICdiYWNrc3BhY2UnLFxuICAgICAgICAgICAgOTogJ3RhYicsXG4gICAgICAgICAgICAxMzogJ2VudGVyJyxcbiAgICAgICAgICAgIDE2OiAnc2hpZnQnLFxuICAgICAgICAgICAgMTc6ICdjdHJsJyxcbiAgICAgICAgICAgIDE4OiAnYWx0JyxcbiAgICAgICAgICAgIDE5OiAncGF1c2UnLFxuICAgICAgICAgICAgMjA6ICdjYXBzbG9jaycsXG4gICAgICAgICAgICAyNzogJ2VzYycsXG4gICAgICAgICAgICAzMjogJ3NwYWNlJyxcbiAgICAgICAgICAgIDMzOiAncGFnZXVwJyxcbiAgICAgICAgICAgIDM0OiAncGFnZWRvd24nLFxuICAgICAgICAgICAgMzU6ICdlbmQnLFxuICAgICAgICAgICAgMzY6ICdob21lJyxcbiAgICAgICAgICAgIDM3OiAnbGVmdGFycm93JyxcbiAgICAgICAgICAgIDM4OiAndXBhcnJvdycsXG4gICAgICAgICAgICAzOTogJ3JpZ2h0YXJyb3cnLFxuICAgICAgICAgICAgNDA6ICdkb3duYXJyb3cnLFxuICAgICAgICAgICAgNDQ6ICdwcmludHNjcmVlbicsXG4gICAgICAgICAgICA0NTogJ2luc2VydCcsXG4gICAgICAgICAgICA0NjogJ2RlbGV0ZScsXG4gICAgICAgICAgICA5MTogJ3dpbmRvd3MnLFxuICAgICAgICAgICAgOTM6ICdtZW51JyxcbiAgICAgICAgICAgIDE0NDogJ251bWxvY2snLFxuICAgICAgICAgICAgMTQ1OiAnc2Nyb2xsbG9jaycsXG4gICAgICAgICAgICAxODg6ICdjb21tYScsXG4gICAgICAgICAgICAxOTA6ICdwZXJpb2QnLFxuICAgICAgICAgICAgMTkxOiAnZm93YXJkc2xhc2gnLFxuICAgICAgICAgICAgMTkyOiAndGlsZGUnLFxuICAgICAgICAgICAgMjE5OiAnbGVmdGJyYWNrZXQnLFxuICAgICAgICAgICAgMjIwOiAnYmFja3NsYXNoJyxcbiAgICAgICAgICAgIDIyMTogJ3JpZ2h0YnJhY2tldCcsXG4gICAgICAgICAgICAyMjI6ICdxdW90ZScsXG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBjb2Rlc1trZXljb2RlXTtcbiAgICB9IFxuICAgIC8vIFRPRE86IHRoaXMgZnVuY3Rpb24gaXMgbWlzc2luZyBzb21lIGJyb3dzZXIgc3BlY2lmaWNcbiAgICAvLyBrZXljb2RlIG1hcHBpbmdzLlxufTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5Ob3JtYWxpemVyID0gTm9ybWFsaXplcjtcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzLmpzJyk7XG5cbi8qKlxuICogTGlzdGVucyB0byBhIG1vZGVsIGFuZCBoaWdsaWdodHMgdGhlIHRleHQgYWNjb3JkaW5nbHkuXG4gKiBAcGFyYW0ge0RvY3VtZW50TW9kZWx9IG1vZGVsXG4gKi9cbnZhciBIaWdobGlnaHRlckJhc2UgPSBmdW5jdGlvbihtb2RlbCwgcm93X3JlbmRlcmVyKSB7XG4gICAgdXRpbHMuUG9zdGVyQ2xhc3MuY2FsbCh0aGlzKTtcbiAgICB0aGlzLl9tb2RlbCA9IG1vZGVsO1xuICAgIHRoaXMuX3Jvd19yZW5kZXJlciA9IHJvd19yZW5kZXJlcjtcbiAgICB0aGlzLl9xdWV1ZWQgPSBudWxsO1xuICAgIHRoaXMuZGVsYXkgPSAxMDA7IC8vbXNcblxuICAgIC8vIEJpbmQgZXZlbnRzLlxuICAgIHRoaXMuX3Jvd19yZW5kZXJlci5vbigncm93c19jaGFuZ2VkJywgdXRpbHMucHJveHkodGhpcy5faGFuZGxlX3Njcm9sbCwgdGhpcykpO1xuICAgIHRoaXMuX21vZGVsLm9uKCd0ZXh0X2NoYW5nZWQnLCB1dGlscy5wcm94eSh0aGlzLl9oYW5kbGVfdGV4dF9jaGFuZ2UsIHRoaXMpKTtcbiAgICB0aGlzLl9tb2RlbC5vbigncm93X2NoYW5nZWQnLCB1dGlscy5wcm94eSh0aGlzLl9oYW5kbGVfdGV4dF9jaGFuZ2UsIHRoaXMpKTtcbn07XG51dGlscy5pbmhlcml0KEhpZ2hsaWdodGVyQmFzZSwgdXRpbHMuUG9zdGVyQ2xhc3MpO1xuXG4vKipcbiAqIEhpZ2hsaWdodCB0aGUgZG9jdW1lbnRcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkhpZ2hsaWdodGVyQmFzZS5wcm90b3R5cGUuaGlnaGxpZ2h0ID0gZnVuY3Rpb24oc3RhcnRfcm93LCBlbmRfcm93KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdOb3QgaW1wbGVtZW50ZWQnKTtcbn07XG5cbi8qKlxuICogUXVldWVzIGEgaGlnaGxpZ2h0IG9wZXJhdGlvbi5cbiAqXG4gKiBJZiBhIGhpZ2hsaWdodCBvcGVyYXRpb24gaXMgYWxyZWFkeSBxdWV1ZWQsIGRvbid0IHF1ZXVlXG4gKiBhbm90aGVyIG9uZS4gIFRoaXMgZW5zdXJlcyB0aGF0IHRoZSBoaWdobGlnaHRpbmcgaXNcbiAqIGZyYW1lIHJhdGUgbG9ja2VkLiAgSGlnaGxpZ2h0aW5nIGlzIGFuIGV4cGVuc2l2ZSBvcGVyYXRpb24uXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5IaWdobGlnaHRlckJhc2UucHJvdG90eXBlLl9xdWV1ZV9oaWdobGlnaHRlciA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLl9xdWV1ZWQgPT09IG51bGwpIHtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICB0aGlzLl9xdWV1ZWQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhhdC5fbW9kZWwuYWNxdWlyZV90YWdfZXZlbnRfbG9jaygpO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB2YXIgdmlzaWJsZV9yb3dzID0gdGhhdC5fcm93X3JlbmRlcmVyLmdldF92aXNpYmxlX3Jvd3MoKTtcbiAgICAgICAgICAgICAgICB2YXIgdG9wX3JvdyA9IHZpc2libGVfcm93cy50b3Bfcm93O1xuICAgICAgICAgICAgICAgIHZhciBib3R0b21fcm93ID0gdmlzaWJsZV9yb3dzLmJvdHRvbV9yb3c7XG4gICAgICAgICAgICAgICAgdGhhdC5oaWdobGlnaHQodG9wX3JvdywgYm90dG9tX3Jvdyk7XG4gICAgICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgICAgIHRoYXQuX21vZGVsLnJlbGVhc2VfdGFnX2V2ZW50X2xvY2soKTtcbiAgICAgICAgICAgICAgICB0aGF0Ll9tb2RlbC50cmlnZ2VyX3RhZ19ldmVudHMoKTtcbiAgICAgICAgICAgICAgICB0aGF0Ll9xdWV1ZWQgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0aGlzLmRlbGF5KTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgd2hlbiB0aGUgdmlzaWJsZSByb3cgaW5kaWNpZXMgYXJlIGNoYW5nZWQuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5IaWdobGlnaHRlckJhc2UucHJvdG90eXBlLl9oYW5kbGVfc2Nyb2xsID0gZnVuY3Rpb24oc3RhcnRfcm93LCBlbmRfcm93KSB7XG4gICAgdGhpcy5fcXVldWVfaGlnaGxpZ2h0ZXIoKTtcbn07XG5cbi8qKlxuICogSGFuZGxlcyB3aGVuIHRoZSB0ZXh0IGNoYW5nZXMuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5IaWdobGlnaHRlckJhc2UucHJvdG90eXBlLl9oYW5kbGVfdGV4dF9jaGFuZ2UgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9xdWV1ZV9oaWdobGlnaHRlcigpO1xufTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5IaWdobGlnaHRlckJhc2UgPSBIaWdobGlnaHRlckJhc2U7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy5qcycpO1xudmFyIGhpZ2hsaWdodGVyID0gcmVxdWlyZSgnLi9oaWdobGlnaHRlci5qcycpO1xudmFyIGxhbmd1YWdlcyA9IHJlcXVpcmUoJy4vc3ludGF4L2luaXQuanMnKTtcblxuLyoqXG4gKiBMaXN0ZW5zIHRvIGEgbW9kZWwgYW5kIGhpZ2hsaWdodHMgdGhlIHRleHQgYWNjb3JkaW5nbHkuXG4gKiBAcGFyYW0ge0RvY3VtZW50TW9kZWx9IG1vZGVsXG4gKi9cbnZhciBTeW50YXhIaWdobGlnaHRlciA9IGZ1bmN0aW9uKG1vZGVsLCByb3dfcmVuZGVyZXIpIHtcbiAgICBoaWdobGlnaHRlci5IaWdobGlnaHRlckJhc2UuY2FsbCh0aGlzLCBtb2RlbCwgcm93X3JlbmRlcmVyKTtcblxuICAgIC8vIExvb2sgYmFjayBhbmQgZm9yd2FyZCB0aGlzIG1hbnkgcm93cyBmb3IgY29udGV4dHVhbGx5IFxuICAgIC8vIHNlbnNpdGl2ZSBoaWdobGlnaHRpbmcuXG4gICAgdGhpcy5fcm93X3BhZGRpbmcgPSA1O1xuXG4gICAgdGhpcy5fZ3JvdXBzID0ge307XG4gICAgdGhpcy5fdG9wbGV2ZWxfZ3JvdXBzID0ge307IC8vIEFsbCBncm91cHMgd2l0aCBjb250YWluZWQgPT0gZmFsc2VcbiAgICB0aGlzLl90YWdzID0ge307XG59O1xudXRpbHMuaW5oZXJpdChTeW50YXhIaWdobGlnaHRlciwgaGlnaGxpZ2h0ZXIuSGlnaGxpZ2h0ZXJCYXNlKTtcblxuLyoqXG4gKiBIaWdobGlnaHQgdGhlIGRvY3VtZW50XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5TeW50YXhIaWdobGlnaHRlci5wcm90b3R5cGUuaGlnaGxpZ2h0ID0gZnVuY3Rpb24oc3RhcnRfcm93LCBlbmRfcm93KSB7XG4gICAgLy8gR2V0IHRoZSBmaXJzdCBhbmQgbGFzdCByb3dzIHRoYXQgc2hvdWxkIGJlIGhpZ2hsaWdodGVkLlxuICAgIHN0YXJ0X3JvdyA9IE1hdGgubWF4KDAsIHN0YXJ0X3JvdyAtIHRoaXMuX3Jvd19wYWRkaW5nKTtcbiAgICBlbmRfcm93ID0gTWF0aC5taW4odGhpcy5fbW9kZWwuX3Jvd3MubGVuZ3RoIC0gMSwgZW5kX3JvdyArIHRoaXMuX3Jvd19wYWRkaW5nKTtcblxuICAgIC8vIENsZWFyIHRoZSBvbGQgaGlnaGxpZ2h0aW5nLlxuICAgIHRoaXMuX21vZGVsLmNsZWFyX3RhZ3Moc3RhcnRfcm93LCBlbmRfcm93KTtcbiAgICBcbiAgICAvLyBHZXQgdGhlIHRleHQgb2YgdGhlIHJvd3MuXG4gICAgdmFyIHRleHQgPSB0aGlzLl9tb2RlbC5nZXRfdGV4dChzdGFydF9yb3csIDAsIGVuZF9yb3csIHRoaXMuX21vZGVsLl9yb3dzW2VuZF9yb3ddLmxlbmd0aCk7XG5cbiAgICAvLyBGaWd1cmUgb3V0IHdoZXJlIGVhY2ggZ3JvdXAgYmVsb25ncy5cbiAgICB2YXIgaGlnaGxpZ2h0cyA9IFtdOyAvLyBbc3RhcnRfaW5kZXgsIGVuZF9pbmRleCwgZ3JvdXBdXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIGZvciAodmFyIGdyb3VwX25hbWUgaW4gdGhpcy5fdG9wbGV2ZWxfZ3JvdXBzKSB7XG4gICAgICAgIGlmICh0aGlzLl90b3BsZXZlbF9ncm91cHMuaGFzT3duUHJvcGVydHkoZ3JvdXBfbmFtZSkpIHtcbiAgICAgICAgICAgIHZhciBncm91cCA9IHRoaXMuX3RvcGxldmVsX2dyb3Vwc1tncm91cF9uYW1lXTtcbiAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaTxncm91cC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGhpZ2hsaWdodHMgPSBoaWdobGlnaHRzLmNvbmNhdCh0aGF0Ll9maW5kX2hpZ2hsaWdodHModGV4dCwgZ3JvdXBfbmFtZSwgZ3JvdXBbaV0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIEFwcGx5IHRhZ3NcbiAgICBoaWdobGlnaHRzLmZvckVhY2goZnVuY3Rpb24oaGlnaGxpZ2h0KSB7XG5cbiAgICAgICAgLy8gVHJhbnNsYXRlIGdyb3VwIGNoYXJhY3RlciBpbmRpY2llcyB0byByb3csIGNoYXIgY29vcmRpbmF0ZXMuXG4gICAgICAgIHZhciBiZWZvcmVfcm93cyA9IHRleHQuc3Vic3RyaW5nKDAsIGhpZ2hsaWdodFswXSkuc3BsaXQoJ1xcbicpO1xuICAgICAgICB2YXIgZ3JvdXBfc3RhcnRfcm93ID0gc3RhcnRfcm93ICsgYmVmb3JlX3Jvd3MubGVuZ3RoIC0gMTtcbiAgICAgICAgdmFyIGdyb3VwX3N0YXJ0X2NoYXIgPSBiZWZvcmVfcm93c1tiZWZvcmVfcm93cy5sZW5ndGggLSAxXS5sZW5ndGg7XG4gICAgICAgIHZhciBhZnRlcl9yb3dzID0gdGV4dC5zdWJzdHJpbmcoMCwgaGlnaGxpZ2h0WzFdIC0gMSkuc3BsaXQoJ1xcbicpO1xuICAgICAgICB2YXIgZ3JvdXBfZW5kX3JvdyA9IHN0YXJ0X3JvdyArIGFmdGVyX3Jvd3MubGVuZ3RoIC0gMTtcbiAgICAgICAgdmFyIGdyb3VwX2VuZF9jaGFyID0gYWZ0ZXJfcm93c1thZnRlcl9yb3dzLmxlbmd0aCAtIDFdLmxlbmd0aDtcblxuICAgICAgICAvLyBHZXQgYXBwbGljYWJsZSB0YWcgbmFtZS5cbiAgICAgICAgdmFyIHRhZyA9IGhpZ2hsaWdodFsyXTtcbiAgICAgICAgd2hpbGUgKHRoYXQuX3RhZ3NbdGFnXSE9PXVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGFnID0gdGhhdC5fdGFnc1t0YWddO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQXBwbHkgdGFnLlxuICAgICAgICB0aGF0Ll9tb2RlbC5zZXRfdGFnKGdyb3VwX3N0YXJ0X3JvdywgZ3JvdXBfc3RhcnRfY2hhciwgZ3JvdXBfZW5kX3JvdywgZ3JvdXBfZW5kX2NoYXIsICdzeW50YXgnLCB0YWcudG9Mb3dlckNhc2UoKSk7XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIEZpbmQgZWFjaCBwYXJ0IG9mIHRleHQgdGhhdCBuZWVkcyB0byBiZSBoaWdobGlnaHRlZC5cbiAqIEBwYXJhbSAge3N0cmluZ30gdGV4dFxuICogQHBhcmFtICB7Z3JvdXAgZGljdGlvbmFyeX0gZ3JvdXAgLSBncm91cCB0byBsb29rIGZvciBpbiB0aGUgdGV4dC5cbiAqIEBwYXJhbSAge2Jvb2xlYW59IGF0X3N0YXJ0IC0gd2hldGhlciBvciBub3QgdG8gb25seSBjaGVjayB0aGUgc3RhcnQuXG4gKiBAcmV0dXJuIHthcnJheX0gbGlzdCBjb250YWluaW5nIGl0ZW1zIG9mIHRoZSBmb3JtIFtzdGFydF9pbmRleCwgZW5kX2luZGV4LCBncm91cF1cbiAqL1xuU3ludGF4SGlnaGxpZ2h0ZXIucHJvdG90eXBlLl9maW5kX2hpZ2hsaWdodHMgPSBmdW5jdGlvbih0ZXh0LCBncm91cF9uYW1lLCBncm91cCwgYXRfc3RhcnQpIHtcblxuICAgIC8vIEZpbmQgaW5zdGFuY2VzLiBbc3RhcnRfaW5kZXgsIGVuZF9pbmRleCwgZ3JvdXAsICgmIG9wdGlvbmFsbHkpIGlubmVyX2xlZnQsIGlubmVyX3JpZ2h0XVxuICAgIGZvdW5kX2dyb3VwcyA9IFtdO1xuICAgIHN3aXRjaCAoZ3JvdXAudHlwZSkge1xuICAgICAgICBjYXNlICdrZXl3b3JkJzpcbiAgICAgICAgICAgIGdyb3VwLmtleXdvcmRzLmZvckVhY2goZnVuY3Rpb24oa2V5d29yZCkge1xuICAgICAgICAgICAgICAgIHZhciBpbmRleDtcbiAgICAgICAgICAgICAgICB3aGlsZSAodGV4dC5pbmRleE9mKGtleXdvcmQsIGluZGV4KSAhPSAtMSkge1xuICAgICAgICAgICAgICAgICAgICBpbmRleCA9IHRleHQuaW5kZXhPZihrZXl3b3JkLCBpbmRleCk7XG4gICAgICAgICAgICAgICAgICAgIGZvdW5kX2dyb3Vwcy5wdXNoKFtpbmRleCwgaW5kZXggKyBrZXl3b3JkLmxlbmd0aCwgZ3JvdXBfbmFtZV0pO1xuICAgICAgICAgICAgICAgICAgICBpbmRleCsrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ21hdGNoJzpcbiAgICAgICAgICAgIHV0aWxzLmZpbmRhbGwodGV4dCwgZ3JvdXAucmVnZXgucmVnZXgpLmZvckVhY2goZnVuY3Rpb24oZm91bmQpIHtcbiAgICAgICAgICAgICAgICBmb3VuZF9ncm91cHMucHVzaChbZm91bmRbMF0sIGZvdW5kWzFdICsgZ3JvdXAucmVnZXguZGVsdGEsIGdyb3VwX25hbWVdKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3JlZ2lvbic6XG4gICAgICAgICAgICB2YXIgc3RhcnRzID0gdXRpbHMuZmluZGFsbCh0ZXh0LCBncm91cC5zdGFydC5yZWdleCk7XG4gICAgICAgICAgICB2YXIgc2tpcHMgPSBbXTtcbiAgICAgICAgICAgIGlmIChncm91cC5za2lwKSB7XG4gICAgICAgICAgICAgICAgc2tpcHMgPSB1dGlscy5maW5kYWxsKHRleHQsIGdyb3VwLnNraXAucmVnZXgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGVuZHMgPSB1dGlscy5maW5kYWxsKHRleHQsIGdyb3VwLmVuZC5yZWdleCk7XG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSBlbmRzIHRoYXQgY29udGFjdCBza2lwcy5cbiAgICAgICAgICAgIGVuZHMgPSBlbmRzLmZpbHRlcihmdW5jdGlvbihlbmQpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNraXBzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBza2lwID0gc2tpcHNbaV07XG4gICAgICAgICAgICAgICAgICAgIGlmICghKGVuZFswXSA+PSBza2lwWzFdICsgZ3JvdXAuc2tpcC5kZWx0YSB8fCBlbmRbMV0gPCBza2lwWzBdKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEZpbmQgbWF0Y2hpbmcgZW5kcyBmb3IgdGhlIHN0YXJ0cywgYmFja3dhcmRzLiAgVGhpcyBhbGxvd3MgbmVzdGluZyBcbiAgICAgICAgICAgIC8vIHRvIHdvcmsgcHJvcGVybHkuXG4gICAgICAgICAgICBzdGFydHMucmV2ZXJzZSgpO1xuICAgICAgICAgICAgc3RhcnRzLmZvckVhY2goZnVuY3Rpb24oc3RhcnQpIHtcbiAgICAgICAgICAgICAgICB2YXIgZm91bmQgPSBudWxsO1xuICAgICAgICAgICAgICAgIHZhciBlbmQ7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbmRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGVuZCA9IGVuZHNbaV07XG4gICAgICAgICAgICAgICAgICAgIGlmIChlbmRbMF0gPiBzdGFydFsxXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm91bmQgPSBpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoZm91bmQgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgZW5kID0gZW5kcy5zcGxpY2UoZm91bmQsIDEpWzBdO1xuICAgICAgICAgICAgICAgICAgICBmb3VuZF9ncm91cHMucHVzaChbc3RhcnRbMF0gKyBncm91cC5zdGFydC5kZWx0YSwgZW5kWzFdLCBncm91cF9uYW1lLCBzdGFydFsxXSwgZW5kWzBdICsgZ3JvdXAuZW5kLmRlbHRhXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIFVuLXJldmVyc2UgcmVzdWx0cy5cbiAgICAgICAgICAgIGZvdW5kX2dyb3Vwcy5yZXZlcnNlKCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICB9XG5cbiAgICAvLyBJZiBhdCBzdGFydCBpcyBzcGVjaWZpZWQsIG9ubHkgbWF0Y2ggaWYgdGhlIGluZGV4IGlzIDAuXG4gICAgaWYgKGF0X3N0YXJ0KSB7XG4gICAgICAgIGZvdW5kX2dyb3VwcyA9IGZvdW5kX2dyb3Vwcy5maWx0ZXIoZnVuY3Rpb24oZm91bmRfZ3JvdXApIHtcbiAgICAgICAgICAgIHJldHVybiBmb3VuZF9ncm91cFswXSA9PT0gMDtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gRmluZCBuZXh0cyBpZiByZXF1ZXN0ZWQuICBNYWtlIHN1cmUgdG8gcmVtb3ZlIHNwYWNlIGlmIHNraXBzcGFjZSBpcyBwcm92aWRlZC5cbiAgICAvLyBUT0RPLlxuICAgIFxuICAgIC8vIEZpbmQgY29udGFpbmVkIGlmIHJlcXVlc3RlZC5cbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdmFyIHN1Yl9mb3VuZCA9IFtdO1xuICAgIGlmIChncm91cC5jb250YWlucyAmJiBncm91cC5jb250YWlucy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGZvdW5kX2dyb3Vwcy5mb3JFYWNoKGZ1bmN0aW9uKGZvdW5kX2dyb3VwKSB7XG4gICAgICAgICAgICB2YXIgbGVmdCA9IGZvdW5kX2dyb3VwWzBdO1xuICAgICAgICAgICAgdmFyIHJpZ2h0ID0gZm91bmRfZ3JvdXBbMV07XG4gICAgICAgICAgICBpZiAoZ3JvdXAudHlwZT09J3JlZ2lvbicpIHtcbiAgICAgICAgICAgICAgICBsZWZ0ID0gZm91bmRfZ3JvdXBbM107XG4gICAgICAgICAgICAgICAgcmlnaHQgPSBmb3VuZF9ncm91cFs0XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN1YnRleHQgPSB0ZXh0LnN1YnN0cmluZyhsZWZ0LCByaWdodCk7XG4gICAgICAgICAgICBncm91cC5jb250YWlucy5mb3JFYWNoKGZ1bmN0aW9uKGNvbnRhaW4pIHtcbiAgICAgICAgICAgICAgICB2YXIgc3ViX2dyb3VwID0gdGhhdC5fZ3JvdXBzW2NvbnRhaW5dO1xuICAgICAgICAgICAgICAgIGlmIChzdWJfZ3JvdXApIHtcbiAgICAgICAgICAgICAgICAgICAgc3ViX2dyb3VwLmZvckVhY2goZnVuY3Rpb24oc3ViX2dyb3VwX2NoaWxkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0Ll9maW5kX2hpZ2hsaWdodHMoc3VidGV4dCwgY29udGFpbiwgc3ViX2dyb3VwX2NoaWxkKS5mb3JFYWNoKGZ1bmN0aW9uKGZvdW5kKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3ViX2ZvdW5kLnB1c2goW2ZvdW5kWzBdICsgbGVmdCwgZm91bmRbMV0gKyBsZWZ0LCBmb3VuZFsyXV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIGZvdW5kX2dyb3Vwcy5jb25jYXQoc3ViX2ZvdW5kKTtcbn07XG5cbi8qKlxuICogTG9hZHMgYSBzeW50YXggYnkgbGFuZ3VhZ2UgbmFtZS5cbiAqIEBwYXJhbSAge3N0cmluZyBvciBkaWN0aW9uYXJ5fSBsYW5ndWFnZVxuICogQHJldHVybiB7Ym9vbGVhbn0gc3VjY2Vzc1xuICovXG5TeW50YXhIaWdobGlnaHRlci5wcm90b3R5cGUubG9hZCA9IGZ1bmN0aW9uKGxhbmd1YWdlKSB7XG4gICAgdHJ5IHtcblxuICAgICAgICAvLyBVbmxvYWQgY3VycmVudCBsYW5ndWFnZVxuICAgICAgICB0aGlzLl9ncm91cHMgPSB7fTtcbiAgICAgICAgdGhpcy5fdG9wbGV2ZWxfZ3JvdXBzID0ge307IFxuICAgICAgICB0aGlzLl90YWdzID0ge307XG5cbiAgICAgICAgLy8gU2VlIGlmIHRoZSBsYW5ndWFnZSBpcyBidWlsdC1pblxuICAgICAgICBpZiAobGFuZ3VhZ2VzLmxhbmd1YWdlc1tsYW5ndWFnZV0pIHtcbiAgICAgICAgICAgIGxhbmd1YWdlID0gbGFuZ3VhZ2VzLmxhbmd1YWdlc1tsYW5ndWFnZV0ubGFuZ3VhZ2U7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fZ3JvdXBzID0gbGFuZ3VhZ2UuZ3JvdXBzO1xuICAgICAgICB0aGlzLl90YWdzID0gbGFuZ3VhZ2UudGFncztcblxuICAgICAgICAvLyBGaW5kIGFsbCBncm91cHMgd2hlcmUgY29udGFpbmVkID09IGZhbHNlXG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgZm9yICh2YXIgZ3JvdXBfbmFtZSBpbiB0aGlzLl9ncm91cHMpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9ncm91cHMuaGFzT3duUHJvcGVydHkoZ3JvdXBfbmFtZSkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9ncm91cHNbZ3JvdXBfbmFtZV0uZm9yRWFjaChmdW5jdGlvbihncm91cCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWdyb3VwLmNvbnRhaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoYXQuX3RvcGxldmVsX2dyb3Vwc1tncm91cF9uYW1lXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5fdG9wbGV2ZWxfZ3JvdXBzW2dyb3VwX25hbWVdID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0Ll90b3BsZXZlbF9ncm91cHNbZ3JvdXBfbmFtZV0ucHVzaChncm91cCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgbG9hZGluZyBsYW5ndWFnZScsIGUpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5TeW50YXhIaWdobGlnaHRlciA9IFN5bnRheEhpZ2hsaWdodGVyO1xuIiwiZXhwb3J0cy5sYW5ndWFnZXMgPSB7XG4gICAgXCJ2YlwiOiByZXF1aXJlKFwiLi92Yi5qc1wiKSxcbiAgICBcImphdmFzY3JpcHRcIjogcmVxdWlyZShcIi4vamF2YXNjcmlwdC5qc1wiKSxcbn07XG4iLCIvKlxuU3ludGF4IGZpbGUgYXV0b2dlbmVyYXRlZCBmcm9tIFZJTSdzIFwiamF2YXNjcmlwdC52aW1cIiBmaWxlLlxuVXNlIHBvc3Rlci90b29scy9pbXBvcnRfdmltLnB5IHRvIGltcG9ydCBtb3JlIHN5bnRheCBmaWxlcyBmcm9tIFZJTS5cbiovXG5leHBvcnRzLmxhbmd1YWdlID0ge1xuICAgIFwiZ3JvdXBzXCI6IHtcbiAgICAgICAgXCJqYXZhU2NyaXB0U3RyaW5nU1wiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJzdGFydFwiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwicmVnZXhcIjogXCInXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRlbHRhXCI6IDBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5zXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJqYXZhU2NyaXB0U3BlY2lhbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJAaHRtbFByZXByb2NcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwiZW5kXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJyZWdleFwiOiBcIidcXFxcfCRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVsdGFcIjogMFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcInJlZ2lvblwiLCBcbiAgICAgICAgICAgICAgICBcInNraXBcIjoge1xuICAgICAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IFwiXFxcXFxcXFxcXFxcXFxcXFxcXFx8XFxcXFxcXFwnXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRlbHRhXCI6IDBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIF0sIFxuICAgICAgICBcImphdmFTY3JpcHRTcGVjaWFsQ2hhcmFjdGVyXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJyZWdleFwiOiBcIidcXFxcXFxcXC4nXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRlbHRhXCI6IDBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluc1wiOiBbXSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwibWF0Y2hcIlxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0VHlwZVwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQXJyYXlcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQm9vbGVhblwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEYXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkZ1bmN0aW9uXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk51bWJlclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJPYmplY3RcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU3RyaW5nXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJlZ0V4cFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSwgXG4gICAgICAgIFwiamF2YVNjcmlwdEJvb2xlYW5cIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInRydWVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZmFsc2VcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sIFxuICAgICAgICBcImphdmFTY3JpcHRSZWdleHBTdHJpbmdcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwic3RhcnRcIjoge1xuICAgICAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IFwiL1teLypdXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRlbHRhXCI6IC0xXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQGh0bWxQcmVwcm9jXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcImVuZFwiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwicmVnZXhcIjogXCIvW2dpbV1cXFxcezAsMlxcXFx9XFxcXHMqWzsuLClcXFxcXX1dXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRlbHRhXCI6IC0xXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwicmVnaW9uXCIsIFxuICAgICAgICAgICAgICAgIFwic2tpcFwiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwicmVnZXhcIjogXCJcXFxcXFxcXFxcXFxcXFxcXFxcXHxcXFxcXFxcXC9cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVsdGFcIjogMFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgXSwgXG4gICAgICAgIFwiamF2YVNjcmlwdENvbW1lbnRTa2lwXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJyZWdleFwiOiBcIl5bIFxcXFx0XSpcXFxcKlxcXFwoJFxcXFx8WyBcXFxcdF1cXFxcK1xcXFwpXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRlbHRhXCI6IDBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluc1wiOiBbXSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwibWF0Y2hcIlxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0U3BlY2lhbFwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJyZWdleFwiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwicmVnZXhcIjogXCJcXFxcXFxcXFxcXFxkXFxcXGRcXFxcZFxcXFx8XFxcXFxcXFwuXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRlbHRhXCI6IDBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluc1wiOiBbXSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwibWF0Y2hcIlxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0U3RyaW5nRFwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJzdGFydFwiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwicmVnZXhcIjogXCJcXFwiXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRlbHRhXCI6IDBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5zXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJqYXZhU2NyaXB0U3BlY2lhbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJAaHRtbFByZXByb2NcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwiZW5kXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJyZWdleFwiOiBcIlxcXCJcXFxcfCRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVsdGFcIjogMFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcInJlZ2lvblwiLCBcbiAgICAgICAgICAgICAgICBcInNraXBcIjoge1xuICAgICAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IFwiXFxcXFxcXFxcXFxcXFxcXFxcXFx8XFxcXFxcXFxcXFwiXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRlbHRhXCI6IDBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIF0sIFxuICAgICAgICBcImphdmFTY3JpcHRDb25kaXRpb25hbFwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiaWZcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZWxzZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJzd2l0Y2hcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sIFxuICAgICAgICBcImphdmFTY3JpcHRJZGVudGlmaWVyXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJhcmd1bWVudHNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidGhpc1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YXJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwibGV0XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0TGFiZWxcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcImNhc2VcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVmYXVsdFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSwgXG4gICAgICAgIFwiamF2YVNjcmlwdExpbmVDb21tZW50XCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJyZWdleFwiOiBcIi8vLipcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVsdGFcIjogMFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGwsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5zXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJAU3BlbGxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiamF2YVNjcmlwdENvbW1lbnRUb2RvXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJtYXRjaFwiXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sIFxuICAgICAgICBcImphdmFTY3JpcHRSZXBlYXRcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIndoaWxlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImZvclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkb1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJpblwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSwgXG4gICAgICAgIFwiamF2YVNjcmlwdEJyYWNlc1wiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJyZWdleFwiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwicmVnZXhcIjogXCJbe31cXFxcW1xcXFxdXVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkZWx0YVwiOiAwXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbCwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbnNcIjogW10sIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcIm1hdGNoXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSwgXG4gICAgICAgIFwiamF2YVNjcmlwdE9wZXJhdG9yXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJuZXdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVsZXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImluc3RhbmNlb2ZcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidHlwZW9mXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0R2xvYmFsXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJzZWxmXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIndpbmRvd1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ0b3BcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwicGFyZW50XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0QnJhbmNoXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJicmVha1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJjb250aW51ZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSwgXG4gICAgICAgIFwiamF2YVNjcmlwdENvbW1lbnRcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwic3RhcnRcIjoge1xuICAgICAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IFwiL1xcXFwqXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRlbHRhXCI6IDBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5zXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJAU3BlbGxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiamF2YVNjcmlwdENvbW1lbnRUb2RvXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcImVuZFwiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwicmVnZXhcIjogXCJcXFxcKi9cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVsdGFcIjogMFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcInJlZ2lvblwiLCBcbiAgICAgICAgICAgICAgICBcInNraXBcIjogbnVsbFxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0RXhjZXB0aW9uXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ0cnlcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiY2F0Y2hcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZmluYWxseVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ0aHJvd1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSwgXG4gICAgICAgIFwiamF2YVNjcmlwdE51bGxcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIm51bGxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidW5kZWZpbmVkXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0TWVtYmVyXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJkb2N1bWVudFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJldmVudFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJsb2NhdGlvblwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSwgXG4gICAgICAgIFwiamF2YVNjcmlwdENvbW1lbnRUb2RvXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJUT0RPXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkZJWE1FXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlhYWFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJUQkRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiB0cnVlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSwgXG4gICAgICAgIFwiamF2YVNjcmlwdEZ1bmN0aW9uXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJyZWdleFwiOiBcIlxcXFw8ZnVuY3Rpb25cXFxcPlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkZWx0YVwiOiAwXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbCwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbnNcIjogW10sIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcIm1hdGNoXCJcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcImZ1bmN0aW9uXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0RnVuY3Rpb25Gb2xkXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcInN0YXJ0XCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJyZWdleFwiOiBcIlxcXFw8ZnVuY3Rpb25cXFxcPi4qW159O10kXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRlbHRhXCI6IDBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5zXCI6IFtdLCBcbiAgICAgICAgICAgICAgICBcImVuZFwiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwicmVnZXhcIjogXCJeXFxcXHoxfS4qJFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkZWx0YVwiOiAwXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwicmVnaW9uXCIsIFxuICAgICAgICAgICAgICAgIFwic2tpcFwiOiBudWxsXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sIFxuICAgICAgICBcImphdmFTY3JpcHRTdGF0ZW1lbnRcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInJldHVyblwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ3aXRoXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0UGFyZW5zXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJyZWdleFwiOiBcIlsoKV1cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVsdGFcIjogMFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGwsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5zXCI6IFtdLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJtYXRjaFwiXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sIFxuICAgICAgICBcImphdmFTY3JpcHRNZXNzYWdlXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJhbGVydFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJjb25maXJtXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInByb21wdFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJzdGF0dXNcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sIFxuICAgICAgICBcImphdmFTY3JpcHRSZXNlcnZlZFwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiYWJzdHJhY3RcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiYm9vbGVhblwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJieXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImNoYXJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiY2xhc3NcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiY29uc3RcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVidWdnZXJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZG91YmxlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImVudW1cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZXhwb3J0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcImV4dGVuZHNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZmluYWxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZmxvYXRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZ290b1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJpbXBsZW1lbnRzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImltcG9ydFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJpbnRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiaW50ZXJmYWNlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImxvbmdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwibmF0aXZlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInBhY2thZ2VcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwicHJpdmF0ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJwcm90ZWN0ZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwicHVibGljXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInNob3J0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInN0YXRpY1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJzdXBlclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJzeW5jaHJvbml6ZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidGhyb3dzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInRyYW5zaWVudFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2b2xhdGlsZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSwgXG4gICAgICAgIFwiamF2YVNjcmlwdE51bWJlclwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJyZWdleFwiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwicmVnZXhcIjogXCItXFxcXD1cXFxcPFxcXFxkXFxcXCtMXFxcXD1cXFxcPlxcXFx8MFt4WF1bMC05YS1mQS1GXVxcXFwrXFxcXD5cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVsdGFcIjogMFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGwsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5zXCI6IFtdLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJtYXRjaFwiXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sIFxuICAgICAgICBcImphdmFTY3JpcHREZXByZWNhdGVkXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJlc2NhcGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidW5lc2NhcGVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICB9LCBcbiAgICBcInRhZ3NcIjoge1xuICAgICAgICBcImphdmFTY3JQYXJlbkVycm9yXCI6IFwiamF2YVNjcmlwdEVycm9yXCIsIFxuICAgICAgICBcImphdmFTY3JpcHRTdHJpbmdTXCI6IFwiU3RyaW5nXCIsIFxuICAgICAgICBcImphdmFTY3JpcHRDb25kaXRpb25hbFwiOiBcIkNvbmRpdGlvbmFsXCIsIFxuICAgICAgICBcImphdmFTY3JpcHRUeXBlXCI6IFwiVHlwZVwiLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0Qm9vbGVhblwiOiBcIkJvb2xlYW5cIiwgXG4gICAgICAgIFwiamF2YVNjcmlwdFJlZ2V4cFN0cmluZ1wiOiBcIlN0cmluZ1wiLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0TnVsbFwiOiBcIktleXdvcmRcIiwgXG4gICAgICAgIFwiamF2YVNjcmlwdFNwZWNpYWxcIjogXCJTcGVjaWFsXCIsIFxuICAgICAgICBcImphdmFTY3JpcHRTdHJpbmdEXCI6IFwiU3RyaW5nXCIsIFxuICAgICAgICBcImphdmFTY3JpcHRFcnJvclwiOiBcIkVycm9yXCIsIFxuICAgICAgICBcImphdmFTY3JpcHRJZGVudGlmaWVyXCI6IFwiSWRlbnRpZmllclwiLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0U3BlY2lhbENoYXJhY3RlclwiOiBcImphdmFTY3JpcHRTcGVjaWFsXCIsIFxuICAgICAgICBcImphdmFTY3JpcHRMYWJlbFwiOiBcIkxhYmVsXCIsIFxuICAgICAgICBcImphdmFTY3JpcHRMaW5lQ29tbWVudFwiOiBcIkNvbW1lbnRcIiwgXG4gICAgICAgIFwiamF2YVNjcmlwdFJlcGVhdFwiOiBcIlJlcGVhdFwiLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0QnJhY2VzXCI6IFwiRnVuY3Rpb25cIiwgXG4gICAgICAgIFwiamF2YVNjcmlwdE9wZXJhdG9yXCI6IFwiT3BlcmF0b3JcIiwgXG4gICAgICAgIFwiamF2YVNjcmlwdEdsb2JhbFwiOiBcIktleXdvcmRcIiwgXG4gICAgICAgIFwiamF2YVNjcmlwdEJyYW5jaFwiOiBcIkNvbmRpdGlvbmFsXCIsIFxuICAgICAgICBcImphdmFTY3JpcHRDb21tZW50XCI6IFwiQ29tbWVudFwiLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0Q2hhcmFjdGVyXCI6IFwiQ2hhcmFjdGVyXCIsIFxuICAgICAgICBcImphdmFTY3JpcHRFeGNlcHRpb25cIjogXCJFeGNlcHRpb25cIiwgXG4gICAgICAgIFwiamF2YVNjcmlwdE1lbWJlclwiOiBcIktleXdvcmRcIiwgXG4gICAgICAgIFwiamF2YVNjcmlwdENvbW1lbnRUb2RvXCI6IFwiVG9kb1wiLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0Q29uc3RhbnRcIjogXCJMYWJlbFwiLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0RGVidWdcIjogXCJEZWJ1Z1wiLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0RnVuY3Rpb25cIjogXCJGdW5jdGlvblwiLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0U3RhdGVtZW50XCI6IFwiU3RhdGVtZW50XCIsIFxuICAgICAgICBcImphdmFTY3JpcHRNZXNzYWdlXCI6IFwiS2V5d29yZFwiLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0UmVzZXJ2ZWRcIjogXCJLZXl3b3JkXCIsIFxuICAgICAgICBcImphdmFTY3JpcHROdW1iZXJcIjogXCJqYXZhU2NyaXB0VmFsdWVcIiwgXG4gICAgICAgIFwiamF2YVNjcmlwdERlcHJlY2F0ZWRcIjogXCJFeGNlcHRpb25cIlxuICAgIH1cbn07IiwiLypcblN5bnRheCBmaWxlIGF1dG9nZW5lcmF0ZWQgZnJvbSBWSU0ncyBcInZiLnZpbVwiIGZpbGUuXG5Vc2UgcG9zdGVyL3Rvb2xzL2ltcG9ydF92aW0ucHkgdG8gaW1wb3J0IG1vcmUgc3ludGF4IGZpbGVzIGZyb20gVklNLlxuKi9cbmV4cG9ydHMgPSB7XG4gICAgXCJncm91cHNcIjoge1xuICAgICAgICBcInZiRnVuY3Rpb25cIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkFic1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJBcnJheVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJBc2NcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQXNjQlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJBc2NXXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkF0blwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJBdmdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQk9GXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNCb29sXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNCeXRlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQ0N1clwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDRGF0ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDRGJsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNJbnRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ0xuZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDU25nXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNTdHJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ1ZEYXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNWRXJyXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQ1ZhclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDYWxsQnlOYW1lXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNkZWNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ2hvb3NlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNoclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDaHJCXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNocldcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ29tbWFuZFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkNvc1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDb3VudFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDcmVhdGVPYmplY3RcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ3VyRGlyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkREQlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEYXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRhdGVBZGRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJEYXRlRGlmZlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEYXRlUGFydFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEYXRlU2VyaWFsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRhdGVWYWx1ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEYXlcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRGlyXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiRG9FdmVudHNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRU9GXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkVudmlyb25cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRXJyb3JcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRXhwXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkZWXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkZpbGVBdHRyXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiRmlsZURhdGVUaW1lXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkZpbGVMZW5cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRmlsdGVyRml4XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkZpeFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJGb3JtYXRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJGb3JtYXRDdXJyZW5jeVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJGb3JtYXREYXRlVGltZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJGb3JtYXROdW1iZXJcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJGb3JtYXRQZXJjZW50XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkZyZWVGaWxlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkdldEFsbFN0cmluZ3NcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiR2V0QXR0clwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkdldEF1dG9TZXJ2ZXJTZXR0aW5nc1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJHZXRPYmplY3RcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiR2V0U2V0dGluZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJIZXhcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJIb3VyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIklJZlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJJTUVTdGF0dXNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiSVBtdFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJJblN0clwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJJbnB1dFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJJbnB1dEJcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJJbnB1dEJveFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJJbnN0ckJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiSW50XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIklzQXJyYXlcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiSXNEYXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIklzRW1wdHlcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiSXNFcnJvclwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIklzTWlzc2luZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJJc051bGxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiSXNOdW1lcmljXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIklzT2JqZWN0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkpvaW5cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTEJvdW5kXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiTENhc2VcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTE9GXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkxUcmltXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkxlZnRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTGVmdEJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTGVuXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkxlbkJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTG9hZFBpY3R1cmVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJMb2FkUmVzRGF0YVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJMb2FkUmVzUGljdHVyZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJMb2FkUmVzU3RyaW5nXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkxvY1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJMb2dcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJNSVJSXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk1heFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJNaWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTWlkQlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJNaW5cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTWludXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk1vbnRoXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk1vbnRoTmFtZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIk1zZ0JveFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJOUFZcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTlBlclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJOb3dcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiT2N0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlBQbXRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUFZcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUGFydGl0aW9uXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlBtdFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlFCQ29sb3JcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUkdCXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJUcmltXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJhdGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUmVwbGFjZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSaWdodFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSaWdodEJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUm5kXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiUm91bmRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU0xOXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNZRFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTZWNvbmRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2Vla1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTZ25cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2hlbGxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2luXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNwYWNlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNwY1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlNwbGl0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNxclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTdERldlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTdERldlBcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU3RyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlN0ckNvbXBcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU3RyQ29udlwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlN0clJldmVyc2VcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU3RyaW5nXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlN1bVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTd2l0Y2hcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiVGFiXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlRhblwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJUaW1lXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiVGltZVNlcmlhbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJUaW1lVmFsdWVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiVGltZXJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiVHJpbVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJUeXBlTmFtZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJVQm91bmRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJVQ2FzZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJWYWxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiVmFyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlZhclBcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiVmFyVHlwZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJXZWVrZGF5XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIldlZWtkYXlOYW1lXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiWWVhclwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSwgXG4gICAgICAgIFwidmJOdW1iZXJcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwicmVnZXhcIjoge1xuICAgICAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IFwiXFxcXDxcXFxcZFxcXFwrXFxcXD5cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVsdGFcIjogMFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGwsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5zXCI6IFtdLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJtYXRjaFwiXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJyZWdleFwiOiBcIlxcXFw8XFxcXGRcXFxcK1xcXFwuXFxcXGQqXFxcXD5cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVsdGFcIjogMFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGwsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5zXCI6IFtdLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJtYXRjaFwiXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJyZWdleFwiOiBcIlxcXFwuXFxcXGRcXFxcK1xcXFw+XCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRlbHRhXCI6IDBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluc1wiOiBbXSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwibWF0Y2hcIlxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJ2YlN0cmluZ1wiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJzdGFydFwiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwicmVnZXhcIjogXCJcXFwiXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRlbHRhXCI6IDBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5zXCI6IFtdLCBcbiAgICAgICAgICAgICAgICBcImVuZFwiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwicmVnZXhcIjogXCJcXFwiXFxcXHwkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRlbHRhXCI6IDBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJyZWdpb25cIiwgXG4gICAgICAgICAgICAgICAgXCJza2lwXCI6IG51bGxcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSwgXG4gICAgICAgIFwidmJDb25zdFwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiTnVsbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJOb3RoaW5nXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJ2YkxpbmVOdW1iZXJcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwicmVnZXhcIjoge1xuICAgICAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IFwiXlxcXFxkXFxcXCtcXFxcKFxcXFxzXFxcXHwkXFxcXClcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVsdGFcIjogMFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGwsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5zXCI6IFtdLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJtYXRjaFwiXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sIFxuICAgICAgICBcInZiS2V5d29yZFwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQXNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQmluYXJ5XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkJ5UmVmXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkJ5VmFsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRhdGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRW1wdHlcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRXJyb3JcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRnJpZW5kXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkdldFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIklucHV0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIklzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkxlblwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJMb2NrXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk1lXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk1pZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJOZXdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTm90aGluZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJOdWxsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk9uXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiT3B0aW9uXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk9wdGlvbmFsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlBhcmFtQXJyYXlcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUHJpbnRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUHJpdmF0ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJQcm9wZXJ0eVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlB1YmxpY1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJQdWJsaWNOb3RDcmVhdGVhYmxlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk9uTmV3UHJvY2Vzc1NpbmdsZVVzZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkluU2FtZVByb2Nlc3NNdWx0aVVzZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJHbG9iYWxNdWx0aVVzZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSZXN1bWVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2Vla1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlNldFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTdGF0aWNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU3RlcFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTdHJpbmdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiVGltZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJXaXRoRXZlbnRzXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJ2YkZsb2F0XCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJyZWdleFwiOiBcIlstK11cXFxcPVxcXFw8XFxcXGRcXFxcK1tlRV1bXFxcXC0rXVxcXFw9XFxcXGRcXFxcK1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkZWx0YVwiOiAwXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbCwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbnNcIjogW10sIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcIm1hdGNoXCJcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwicmVnZXhcIjoge1xuICAgICAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IFwiWy0rXVxcXFw9XFxcXDxcXFxcZFxcXFwrXFxcXC5cXFxcZCpcXFxcKFtlRV1bXFxcXC0rXVxcXFw9XFxcXGRcXFxcK1xcXFwpXFxcXD1cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVsdGFcIjogMFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGwsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5zXCI6IFtdLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJtYXRjaFwiXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJyZWdleFwiOiBcIlstK11cXFxcPVxcXFw8XFxcXC5cXFxcZFxcXFwrXFxcXChbZUVdW1xcXFwtK11cXFxcPVxcXFxkXFxcXCtcXFxcKVxcXFw9XCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRlbHRhXCI6IDBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluc1wiOiBbXSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwibWF0Y2hcIlxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJ2Yk1ldGhvZHNcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkFib3V0Qm94XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkFjY2VwdFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJBY3RpdmF0ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJBZGRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQWRkQ3VzdG9tXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkFkZEZpbGVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJBZGRGcm9tRmlsZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJBZGRGcm9tR3VpZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJBZGRGcm9tU3RyaW5nXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQWRkRnJvbVRlbXBsYXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkFkZEl0ZW1cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQWRkTmV3XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkFkZFRvQWRkSW5Ub29sYmFyXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQWRkVG9vbGJveFByb2dJRFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJBcHBlbmRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQXBwZW5kQXBwZW5kQ2h1bmtcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJBcHBlbmRDaHVua1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJBcnJhbmdlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkFzc2VydFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJBc3luY1JlYWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQmF0Y2hVcGRhdGVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJCZWdpblF1ZXJ5RWRpdFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJCZWdpblRyYW5zXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkJpbmRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQnVpbGRQYXRoXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQ2FuUHJvcGVydHlDaGFuZ2VcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ2FuY2VsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNhbmNlbEFzeW5jUmVhZFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkNhbmNlbEJhdGNoXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNhbmNlbFVwZGF0ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDYXB0dXJlSW1hZ2VcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ2VsbFRleHRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJDZWxsVmFsdWVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ2lyY2xlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNsZWFyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNsZWFyRmllbGRzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNsZWFyU2VsXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQ2xlYXJTZWxDb2xzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNsZWFyU3RydWN0dXJlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNsb25lXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNsb3NlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNsc1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkNvbENvbnRhaW5pbmdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ29sbGFwc2VBbGxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ29sdW1uU2l6ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDb21taXRUcmFuc1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkNvbXBhY3REYXRhYmFzZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDb21wb3NlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNvbm5lY3RcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ29weVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDb3B5RmlsZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkNvcHlGb2xkZXJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ29weVF1ZXJ5RGVmXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNvdW50XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNyZWF0ZURhdGFiYXNlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQ3JlYXRlRHJhZ0ltYWdlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNyZWF0ZUVtYmVkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNyZWF0ZUZpZWxkXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQ3JlYXRlRm9sZGVyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNyZWF0ZUdyb3VwXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNyZWF0ZUluZGV4XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNyZWF0ZUxpbmtcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJDcmVhdGVQcmVwYXJlZFN0YXRlbWVudFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDcmVhdGVQcm9wZXJ5XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNyZWF0ZVF1ZXJ5XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQ3JlYXRlUXVlcnlEZWZcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ3JlYXRlUmVsYXRpb25cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ3JlYXRlVGFibGVEZWZcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJDcmVhdGVUZXh0RmlsZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDcmVhdGVUb29sV2luZG93XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNyZWF0ZVVzZXJcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJDcmVhdGVXb3Jrc3BhY2VcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ3VzdG9taXplXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkN1dFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEZWxldGVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJEZWxldGVDb2x1bW5MYWJlbHNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRGVsZXRlQ29sdW1uc1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEZWxldGVGaWxlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiRGVsZXRlRm9sZGVyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRlbGV0ZUxpbmVzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRlbGV0ZVJvd0xhYmVsc1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkRlbGV0ZVJvd3NcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRGVzZWxlY3RBbGxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRGVzaWduZXJXaW5kb3dcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRG9WZXJiXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRyYWdcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJEcmF3XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRyaXZlRXhpc3RzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkVkaXRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRWRpdENvcHlcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRWRpdFBhc3RlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkVuZERvY1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkVuc3VyZVZpc2libGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRXN0YWJsaXNoQ29ubmVjdGlvblwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJFeGVjdXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkV4aXN0c1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkV4cGFuZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJFeHBvcnRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRXhwb3J0UmVwb3J0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkV4dHJhY3RJY29uXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkZldGNoXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiRmV0Y2hWZXJic1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJGaWxlRXhpc3RzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkZpbGVzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkZpbGxDYWNoZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJGaW5kXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiRmluZEZpcnN0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkZpbmRJdGVtXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkZpbmRMYXN0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkZpbmROZXh0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkZpbmRQcmV2aW91c1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkZvbGRlckV4aXN0c1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJGb3J3YXJkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkdldEFic29sdXRlUGF0aE5hbWVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJHZXRCYXNlTmFtZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJHZXRCb29rbWFya1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJHZXRDaHVua1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJHZXRDbGlwU3RyaW5nXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiR2V0RGF0YVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJHZXREcml2ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJHZXREcml2ZU5hbWVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiR2V0RmlsZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJHZXRGaWxlTmFtZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkdldEZpcnN0VmlzaWJsZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJHZXRGb2xkZXJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiR2V0Rm9ybWF0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkdldEhlYWRlclwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkdldExpbmVGcm9tQ2hhclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJHZXROdW1UaWNrc1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJHZXRQYXJlbnRGb2xkZXJOYW1lXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiR2V0Um93c1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJHZXRTZWxlY3RlZFBhcnRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiR2V0U2VsZWN0aW9uXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiR2V0U3BlY2lhbEZvbGRlclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJHZXRUZW1wTmFtZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJHZXRUZXh0XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiR2V0VmlzaWJsZUNvdW50XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkdvQmFja1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJHb0ZvcndhcmRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiSGlkZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJIaXRUZXN0XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiSG9sZEZpZWxkc1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJJZGxlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkltcG9ydFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJJbml0aWFsaXplTGFiZWxzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkluc2VydFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkluc2VydENvbHVtbkxhYmVsc1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJJbnNlcnRDb2x1bW5zXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkluc2VydEZpbGVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJJbnNlcnRMaW5lc1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJJbnNlcnRPYmpEbGdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiSW5zZXJ0Um93TGFiZWxzXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiSW5zZXJ0Um93c1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJJdGVtXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIktleXNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiS2lsbERvY1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJMYXlvdXRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTGluZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJMaW5lc1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkxpbmtFeGVjdXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkxpbmtQb2tlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkxpbmtSZXF1ZXN0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkxpbmtTZW5kXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkxpc3RlblwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkxvYWRGaWxlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkxvYWRSZXNEYXRhXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkxvYWRSZXNQaWN0dXJlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkxvYWRSZXNTdHJpbmdcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJMb2dFdmVudFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJNYWtlQ29tcGlsZUZpbGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTWFrZUNvbXBpbGVkRmlsZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIk1ha2VSZXBsaWNhXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk1vcmVSZXN1bHRzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk1vdmVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTW92ZURhdGFcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTW92ZUZpbGVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJNb3ZlRmlyc3RcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTW92ZUZvbGRlclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJNb3ZlTGFzdFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJNb3ZlTmV4dFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIk1vdmVQcmV2aW91c1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJOYXZpZ2F0ZVRvXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk5ld1BhZ2VcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTmV3UGFzc3dvcmRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJOZXh0UmVjb3Jkc2V0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk9MRURyYWdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiT25BZGRpbnNVcGRhdGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiT25Db25uZWN0aW9uXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiT25EaXNjb25uZWN0aW9uXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk9uU3RhcnR1cENvbXBsZXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk9wZW5cIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJPcGVuQXNUZXh0U3RyZWFtXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk9wZW5Db25uZWN0aW9uXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk9wZW5EYXRhYmFzZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIk9wZW5RdWVyeURlZlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJPcGVuUmVjb3Jkc2V0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk9wZW5SZXN1bHRzZXRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiT3BlblVSTFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIk92ZXJsYXlcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUFNldFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJQYWludFBpY3R1cmVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUGFzdFNwZWNpYWxEbGdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUGFzdGVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJQZWVrRGF0YVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJQbGF5XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlBvaW50XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlBvcHVsYXRlUGFydGlhbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJQb3B1cE1lbnVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJQcmludFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJQcmludEZvcm1cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUHJpbnRSZXBvcnRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUHJvcGVydHlDaGFuZ2VkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlF1aXRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJSYWlzZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSYW5kb21EYXRhRmlsbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSYW5kb21GaWxsQ29sdW1uc1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlJhbmRvbUZpbGxSb3dzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJlRmlsbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSZWFkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJlYWRBbGxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUmVhZEZyb21GaWxlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiUmVhZExpbmVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUmVhZFByb3BlcnR5XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJlYmluZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSZWZyZXNoXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJlZnJlc2hMaW5rXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiUmVnaXN0ZXJEYXRhYmFzZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSZWxlYXNlSW5zdGFuY2VcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUmVsb2FkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJlbW92ZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlJlbW92ZUFkZEluRnJvbVRvb2xiYXJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUmVtb3ZlQWxsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJlbW92ZUl0ZW1cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUmVuZGVyXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiUmVwYWlyRGF0YWJhc2VcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUmVwbGFjZUxpbmVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUmVwbHlcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUmVwbHlBbGxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUmVxdWVyeVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlJlc2V0Q3VzdG9tXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJlc2V0Q3VzdG9tTGFiZWxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUmVzb2x2ZU5hbWVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJSZXN0b3JlVG9vbGJhclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSZXN5bmNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUm9sbGJhY2tcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUm9sbGJhY2tUcmFuc1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlJvd0Jvb2ttYXJrXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJvd0NvbnRhaW5pbmdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUm93VG9wXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNhdmVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2F2ZUFzXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiU2F2ZUZpbGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2F2ZVRvRmlsZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTYXZlVG9PbGUxRmlsZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTYXZlVG9vbGJhclwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlNjYWxlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNjYWxlWFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTY2FsZVlcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2Nyb2xsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNlbFByaW50XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNlbGVjdEFsbFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlNlbGVjdFBhcnRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2VuZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTZW5kRGF0YVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTZXRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2V0QXV0b1NlcnZlclNldHRpbmdzXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiU2V0RGF0YVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTZXRGb2N1c1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTZXRPcHRpb25cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2V0U2VsZWN0aW9uXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNldFNpemVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJTZXRUZXh0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNldFZpZXdwb3J0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNob3dcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2hvd0NvbG9yXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNob3dGb250XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiU2hvd0hlbHBcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2hvd09wZW5cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2hvd1ByaW50ZXJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2hvd1NhdmVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJTaG93V2hhdHNUaGlzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNpZ25PZmZcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2lnbk9uXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNpemVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2tpcFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTa2lwTGluZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlNwYW5cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU3BsaXRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU3BsaXRDb250YWluaW5nXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlN0YXJ0TGFiZWxFZGl0XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiU3RhcnRMb2dnaW5nXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlN0b3BcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU3luY2hyb25pemVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiVGFnXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlRleHRIZWlnaHRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJUZXh0V2lkdGhcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiVG9EZWZhdWx0c1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJUcmFjZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJUd2lwc1RvQ2hhcnRQYXJ0XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiVHlwZUJ5Q2hhcnRUeXBlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlVSTEZvclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJVcGRhdGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiVXBkYXRlQ29udHJvbHNcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJVcGRhdGVSZWNvcmRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiVXBkYXRlUm93XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlVwdG9cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiVmFsaWRhdGVDb250cm9sc1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJWYWx1ZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIldoYXRzVGhpc01vZGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiV3JpdGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiV3JpdGVCbGFua0xpbmVzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIldyaXRlTGluZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIldyaXRlUHJvcGVydHlcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiV3JpdGVUZW1wbGF0ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJaT3JkZXJcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJyZG9DcmVhdGVFbnZpcm9ubWVudFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJyZG9SZWdpc3RlckRhdGFTb3VyY2VcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sIFxuICAgICAgICBcInZiUmVwZWF0XCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJEb1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJGb3JcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRm9yRWFjaFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJMb29wXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk5leHRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJTdGVwXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlRvXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlVudGlsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIldlbmRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiV2hpbGVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sIFxuICAgICAgICBcInZiQ29tbWVudFwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJzdGFydFwiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwicmVnZXhcIjogXCJcXFxcKF5cXFxcfFxcXFxzXFxcXClSRU1cXFxcc1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkZWx0YVwiOiAwXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJUb2RvXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcImVuZFwiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwicmVnZXhcIjogXCIkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRlbHRhXCI6IDBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJyZWdpb25cIiwgXG4gICAgICAgICAgICAgICAgXCJza2lwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwic3RhcnRcIjoge1xuICAgICAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IFwiXFxcXCheXFxcXHxcXFxcc1xcXFwpXFxcXCdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVsdGFcIjogMFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbnNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiVG9kb1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJlbmRcIjoge1xuICAgICAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IFwiJFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkZWx0YVwiOiAwXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwicmVnaW9uXCIsIFxuICAgICAgICAgICAgICAgIFwic2tpcFwiOiBudWxsXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sIFxuICAgICAgICBcInZiQ29uZGl0aW9uYWxcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIklmXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlRoZW5cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRWxzZUlmXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkVsc2VcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2VsZWN0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNhc2VcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sIFxuICAgICAgICBcInZiRGVmaW5lXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJkYkJpZ0ludFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkYkJpbmFyeVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkYkJvb2xlYW5cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGJCeXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRiQ2hhclwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcImRiQ3VycmVuY3lcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGJEYXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRiRGVjaW1hbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkYkRvdWJsZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkYkZsb2F0XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiZGJHVUlEXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRiSW50ZWdlclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkYkxvbmdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGJMb25nQmluYXJ5XCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRiTWVtb1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcImRiTnVtZXJpY1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkYlNpbmdsZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkYlRleHRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGJUaW1lXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRiVGltZVN0YW1wXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiZGJWYXJCaW5hcnlcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YjNEREtTaGFkb3dcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmIzREZhY2VcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmIzREhpZ2hsaWdodFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YjNETGlnaHRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YjNEU2hhZG93XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiQWJvcnRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJBYm9ydFJldHJ5SWdub3JlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJBY3RpdmVCb3JkZXJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJBY3RpdmVUaXRsZUJhclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkFsaWFzXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJBcHBsaWNhdGlvbk1vZGFsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiQXBwbGljYXRpb25Xb3Jrc3BhY2VcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkFwcFRhc2tNYW5hZ2VyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiQXBwV2luZG93c1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkFyY2hpdmVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJBcnJheVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiQmFja1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkJpbmFyeUNvbXBhcmVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJCbGFja1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkJsdWVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJCb29sZWFuXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJCdXR0b25GYWNlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiQnV0dG9uU2hhZG93XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiQnV0dG9uVGV4dFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkJ5dGVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkNhbEdyZWdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJDYWxIaWpyaVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkNhbmNlbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkNyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiQ3JpdGljYWxcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkNyTGZcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJDdXJyZW5jeVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkN5YW5cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJEYXRhYmFzZUNvbXBhcmVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkRhdGFPYmplY3RcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJEYXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiRGVjaW1hbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkRlZmF1bHRCdXR0b24xXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJEZWZhdWx0QnV0dG9uMlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkRlZmF1bHRCdXR0b24zXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiRGVmYXVsdEJ1dHRvbjRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkRlc2t0b3BcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJEaXJlY3RvcnlcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJEb3VibGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJFbXB0eVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkVycm9yXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJFeGNsYW1hdGlvblwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkZpcnN0Rm91ckRheXNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJGaXJzdEZ1bGxXZWVrXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJGaXJzdEphbjFcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJGb3JtQ29kZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkZvcm1Db250cm9sTWVudVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiRm9ybUZlZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJGb3JtTURJRm9ybVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkZyaWRheVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkZyb21Vbmljb2RlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJHcmF5VGV4dFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkdyZWVuXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiSGlkZGVuXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiSGlkZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkhpZ2hsaWdodFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiSGlnaGxpZ2h0VGV4dFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkhpcmFnYW5hXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiSWdub3JlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiSU1FQWxwaGFEYmxcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YklNRUFscGhhU25nXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiSU1FRGlzYWJsZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YklNRUhpcmFnYW5hXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJJTUVLYXRha2FuYURibFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YklNRUthdGFrYW5hU25nXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiSU1FTW9kZUFscGhhXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJJTUVNb2RlQWxwaGFGdWxsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiSU1FTW9kZURpc2FibGVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YklNRU1vZGVIYW5ndWxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJJTUVNb2RlSGFuZ3VsRnVsbFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiSU1FTW9kZUhpcmFnYW5hXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiSU1FTW9kZUthdGFrYW5hXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJJTUVNb2RlS2F0YWthbmFIYWxmXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiSU1FTW9kZU5vQ29udHJvbFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiSU1FTW9kZU9mZlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YklNRU1vZGVPblwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YklNRU5vT3BcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJJTUVPZmZcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YklNRU9uXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiSW5hY3RpdmVCb3JkZXJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJJbmFjdGl2ZUNhcHRpb25UZXh0XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJJbmFjdGl2ZVRpdGxlQmFyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiSW5mb0JhY2tncm91bmRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJJbmZvcm1hdGlvblwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiSW5mb1RleHRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJJbnRlZ2VyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2F0YWthbmFcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXkwXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5MVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiS2V5MlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleTNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXk0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5NVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleTZcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXk3XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5OFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiS2V5OVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleUFcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlBZGRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlCXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5QmFja1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleUNcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleUNhbmNlbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleUNhcGl0YWxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlDbGVhclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleUNvbnRyb2xcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleURcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlEZWNpbWFsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5RGVsZXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5RGl2aWRlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlEb3duXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5RVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleUVuZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleUVzY2FwZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleUV4ZWN1dGVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleUZcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlGMVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleUYxMFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleUYxMVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleUYxMlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleUYxM1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiS2V5RjE0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5RjE1XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5RjE2XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5RjJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlGM1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleUY0XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlGNVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleUY2XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5RjdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlGOFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleUY5XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5R1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiS2V5SFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleUhlbHBcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlIb21lXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5SVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleUluc2VydFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiS2V5SlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleUtcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlMXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5TEJ1dHRvblwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleUxlZnRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlNXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlNQnV0dG9uXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5TWVudVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleU11bHRpcGx5XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5TlwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiS2V5TnVtbG9ja1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleU51bXBhZDBcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlOdW1wYWQxXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlOdW1wYWQyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5TnVtcGFkM1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleU51bXBhZDRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleU51bXBhZDVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlOdW1wYWQ2XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5TnVtcGFkN1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiS2V5TnVtcGFkOFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleU51bXBhZDlcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlPXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5UFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiS2V5UGFnZURvd25cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlQYWdlVXBcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlQYXVzZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleVByaW50XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlRXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5UlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleVJCdXR0b25cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlSZXR1cm5cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlSaWdodFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiS2V5U1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleVNlbGVjdFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleVNlcGFyYXRvclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleVNoaWZ0XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlTbmFwc2hvdFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleVNwYWNlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5U3VidHJhY3RcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlUXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlUYWJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlVXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5VXBcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlWXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5V1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleVhcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleVlcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlaXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiTGZcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJMb25nXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiTG93ZXJDYXNlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiTWFnZW50YVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiTWF4aW1pemVkRm9jdXNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJNZW51QmFyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiTWVudVRleHRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2Yk1pbmltaXplZEZvY3VzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiTWluaW1pemVkTm9Gb2N1c1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2Yk1vbmRheVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiTXNnQm94XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiTXNnQm94SGVscEJ1dHRvblwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2Yk1zZ0JveFJpZ2h0XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJNc2dCb3hSdGxSZWFkaW5nXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiTXNnQm94U2V0Rm9yZWdyb3VuZFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiTXNnQm94VGV4dFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2Yk5hcnJvd1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2Yk5ld0xpbmVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJOb1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2Yk5vcm1hbFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiTm9ybWFsRm9jdXNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJOb3JtYWxOb0ZvY3VzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiTnVsbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2Yk51bGxDaGFyXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJOdWxsU3RyaW5nXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiT2JqZWN0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiT2JqZWN0RXJyb3JcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJPS1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiT0tDYW5jZWxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJPS09ubHlcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJQcm9wZXJDYXNlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiUXVlc3Rpb25cIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YlJlYWRPbmx5XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiUmVkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiUmV0cnlcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJSZXRyeUNhbmNlbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YlNhdHVyZGF5XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJTY3JvbGxCYXJzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiU2luZ2xlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiU3RyaW5nXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiU3VuZGF5XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiU3lzdGVtXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJTeXN0ZW1Nb2RhbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YlRhYlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YlRleHRDb21wYXJlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiVGh1cnNkYXlcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YlRpdGxlQmFyVGV4dFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YlR1ZXNkYXlcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJVbmljb2RlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiVXBwZXJDYXNlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJVc2VTeXN0ZW1cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJVc2VTeXN0ZW1EYXlPZldlZWtcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJWYXJpYW50XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJWZXJ0aWNhbFRhYlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YlZvbHVtZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YldlZG5lc2RheVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YldoaXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiV2lkZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiV2luZG93QmFja2dyb3VuZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YldpbmRvd0ZyYW1lXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiV2luZG93VGV4dFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiWWVsbG93XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiWWVzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiWWVzTm9cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJZZXNOb0NhbmNlbFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSwgXG4gICAgICAgIFwidmJFdmVudHNcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkFjY2Vzc0tleVByZXNzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkFjdGl2YXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkFjdGl2ZVJvd0NoYW5nZWRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJBZnRlckFkZEZpbGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQWZ0ZXJDaGFuZ2VGaWxlTmFtZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJBZnRlckNsb3NlRmlsZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkFmdGVyQ29sRWRpdFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJBZnRlckNvbFVwZGF0ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJBZnRlckRlbGV0ZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkFmdGVySW5zZXJ0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkFmdGVyTGFiZWxFZGl0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkFmdGVyUmVtb3ZlRmlsZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkFmdGVyVXBkYXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkFmdGVyV3JpdGVGaWxlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkFtYmllbnRDaGFuZ2VkXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQXBwbHlDaGFuZ2VzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkFzc29jaWF0ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJBc3luY1Byb2dyZXNzXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQXN5bmNSZWFkQ29tcGxldGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQXN5bmNSZWFkUHJvZ3Jlc3NcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQXhpc0FjdGl2YXRlZFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkF4aXNMYWJlbEFjdGl2YXRlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJBeGlzTGFiZWxTZWxlY3RlZFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkF4aXNMYWJlbFVwZGF0ZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQXhpc1NlbGVjdGVkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkF4aXNUaXRsZUFjdGl2YXRlZFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkF4aXNUaXRsZVNlbGVjdGVkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkF4aXNUaXRsZVVwZGF0ZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQXhpc1VwZGF0ZWRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJCZWZvcmVDbGlja1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJCZWZvcmVDb2xFZGl0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkJlZm9yZUNvbFVwZGF0ZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkJlZm9yZUNvbm5lY3RcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQmVmb3JlRGVsZXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkJlZm9yZUluc2VydFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkJlZm9yZUxhYmVsRWRpdFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJCZWZvcmVMb2FkRmlsZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJCZWZvcmVVcGRhdGVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJCZWdpblJlcXVlc3RcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQmVnaW5UcmFuc1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJCdXR0b25DbGlja1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkJ1dHRvbkNvbXBsZXRlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJCdXR0b25Ecm9wRG93blwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJCdXR0b25Hb3RGb2N1c1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkJ1dHRvbkxvc3RGb2N1c1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDYWxsYmFja0tleURvd25cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ2hhbmdlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNoYW5nZWRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJDaGFydEFjdGl2YXRlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDaGFydFNlbGVjdGVkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNoYXJ0VXBkYXRlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDbGlja1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkNsb3NlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNsb3NlUXVlcnlcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ2xvc2VVcFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDb2xFZGl0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNvbFJlc2l6ZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkNvbGxhcHNlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNvbHVtbkNsaWNrXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNvbW1pdFRyYW5zXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNvbXBhcmVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJDb25maWdDaGFnZUNhbmNlbGxlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDb25maWdDaGFuZ2VkXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQ29uZmlnQ2hhbmdlZENhbmNlbGxlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDb25uZWN0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNvbm5lY3Rpb25SZXF1ZXN0XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQ3VycmVudFJlY29yZENoYW5nZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiREVDb21tYW5kQWRkZWRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJERUNvbW1hbmRQcm9wZXJ0eUNoYW5nZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiREVDb21tYW5kUmVtb3ZlZFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkRFQ29ubmVjdGlvbkFkZGVkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRFQ29ubmVjdGlvblByb3BlcnR5Q2hhbmdlZFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkRFQ29ubmVjdGlvblJlbW92ZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRGF0YUFycml2YWxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRGF0YUNoYW5nZWRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJEYXRhVXBkYXRlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEYXRlQ2xpY2tlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEYmxDbGlja1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEZWFjdGl2YXRlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiRGV2TW9kZUNoYW5nZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEZXZpY2VBcnJpdmFsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRldmljZU90aGVyRXZlbnRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJEZXZpY2VRdWVyeVJlbW92ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEZXZpY2VRdWVyeVJlbW92ZUZhaWxlZFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkRldmljZVJlbW92ZUNvbXBsZXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRldmljZVJlbW92ZVBlbmRpbmdcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJEaXNjb25uZWN0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRpc3BsYXlDaGFuZ2VkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRpc3NvY2lhdGVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJEb0dldE5ld0ZpbGVOYW1lXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRvbmVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRG9uZVBhaW50aW5nXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRvd25DbGlja1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkRyYWdEcm9wXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRyYWdPdmVyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRyb3BEb3duXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkVkaXRQcm9wZXJ0eVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJFZGl0UXVlcnlcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJFbmRSZXF1ZXN0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkVudGVyQ2VsbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJFbnRlckZvY3VzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkV4aXRGb2N1c1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJFeHBhbmRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJGb250Q2hhbmdlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJGb290bm90ZUFjdGl2YXRlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJGb290bm90ZVNlbGVjdGVkXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiRm9vdG5vdGVVcGRhdGVkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkZvcm1hdFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJGb3JtYXRTaXplXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkdvdEZvY3VzXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiSGVhZENsaWNrXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkhlaWdodENoYW5nZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiSGlkZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJJbmZvTWVzc2FnZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkluaVByb3BlcnRpZXNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiSW5pdFByb3BlcnRpZXNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiSW5pdGlhbGl6ZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkl0ZW1BY3RpdmF0ZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiSXRlbUFkZGVkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkl0ZW1DaGVja1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJJdGVtQ2xpY2tcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJJdGVtUmVsb2FkZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiSXRlbVJlbW92ZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiSXRlbVJlbmFtZWRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJJdGVtU2VsZXRlY3RlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJLZXlEb3duXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIktleVByZXNzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIktleVVwXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkxlYXZlQ2VsbFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkxlZ2VuZEFjdGl2YXRlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJMZWdlbmRTZWxlY3RlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJMZWdlbmRVcGRhdGVkXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiTGlua0Nsb3NlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkxpbmtFcnJvclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJMaW5rRXhlY3V0ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJMaW5rTm90aWZ5XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiTGlua09wZW5cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTG9hZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJMb3N0Rm9jdXNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTW91c2VEb3duXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk1vdXNlTW92ZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIk1vdXNlVXBcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTm9kZUNoZWNrXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk5vZGVDbGlja1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJPTEVDb21wbGV0ZURyYWdcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJPTEVEcmFnRHJvcFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJPTEVEcmFnT3ZlclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJPTEVHaXZlRmVlZGJhY2tcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiT0xFU2V0RGF0YVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIk9MRVN0YXJ0RHJhZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJPYmplY3RFdmVudFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJPYmplY3RNb3ZlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk9uQWRkTmV3XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiT25Db21tXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlBhaW50XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlBhbmVsQ2xpY2tcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUGFuZWxEYmxDbGlja1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJQYXRoQ2hhbmdlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiUGF0dGVybkNoYW5nZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJQbG90QWN0aXZhdGVkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlBsb3RTZWxlY3RlZFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlBsb3RVcGRhdGVkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlBvaW50QWN0aXZhdGVkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlBvaW50TGFiZWxBY3RpdmF0ZWRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJQb2ludExhYmVsU2VsZWN0ZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUG9pbnRMYWJlbFVwZGF0ZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUG9pbnRTZWxlY3RlZFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlBvaW50VXBkYXRlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJQb3dlclF1ZXJ5U3VzcGVuZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJQb3dlclJlc3VtZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlBvd2VyU3RhdHVzQ2hhbmdlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJQb3dlclN1c3BlbmRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUHJvY2Vzc1RhZ1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlByb2Nlc3NpbmdUaW1lb3V0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlF1ZXJ5Q2hhbmdlQ29uZmlnXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlF1ZXJ5Q2xvc2VcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJRdWVyeUNvbXBsZXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlF1ZXJ5Q29tcGxldGVkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlF1ZXJ5VGltZW91dFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlF1ZXJ5VW5sb2FkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJlYWRQcm9wZXJ0aWVzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJlcGVhdGVkQ29udHJvbExvYWRlZFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlJlcGVhdGVkQ29udHJvbFVubG9hZGVkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJlcG9zaXRpb25cIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJSZXF1ZXN0Q2hhbmdlRmlsZU5hbWVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUmVxdWVzdFdyaXRlRmlsZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSZXNpemVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJSZXN1bHRzQ2hhbmdlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSZXRhaW5lZFByb2plY3RcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUm9sbGJhY2tUcmFuc1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlJvd0NvbENoYW5nZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSb3dDdXJyZW5jeUNoYW5nZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSb3dSZXNpemVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJSb3dTdGF0dXNDaGFuZ2VkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNjcm9sbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTZWxDaGFuZ2VcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2VsZWN0aW9uQ2hhbmdlZFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlNlbmRDb21wbGV0ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTZW5kUHJvZ3Jlc3NcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2VyaWVzQWN0aXZhdGVkXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiU2VyaWVzU2VsZWN0ZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2VyaWVzVXBkYXRlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTZXR0aW5nQ2hhbmdlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTaG93XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiU3BsaXRDaGFuZ2VcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU3RhcnRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU3RhdGVDaGFuZ2VkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlN0YXR1c1VwZGF0ZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlN5c0NvbG9yc0NoYW5nZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiVGVybWluYXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlRpbWVDaGFuZ2VkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlRpbWVyXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiVGl0bGVBY3RpdmF0ZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiVGl0bGVTZWxlY3RlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJUaXRsZVVwZGF0ZWRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJVbmJvdW5kQWRkRGF0YVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJVbmJvdW5kRGVsZXRlUm93XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiVW5ib3VuZEdldFJlbGF0aXZlQm9va21hcmtcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiVW5ib3VuZFJlYWREYXRhXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiVW5ib3VuZFdyaXRlRGF0YVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJVbmZvcm1hdFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJVbmxvYWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiVXBDbGlja1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJVcGRhdGVkXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiVXNlckV2ZW50XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlZhbGlkYXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlZhbGlkYXRpb25FcnJvclwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlZpc2libGVSZWNvcmRDaGFuZ2VkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIldpbGxBc3NvY2lhdGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiV2lsbENoYW5nZURhdGFcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJXaWxsRGlzc29jaWF0ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJXaWxsRXhlY3V0ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJXaWxsVXBkYXRlUm93c1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIldyaXRlUHJvcGVydGllc1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSwgXG4gICAgICAgIFwidmJTdGF0ZW1lbnRcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkFsaWFzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkFwcEFjdGl2YXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkFzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkJhc2VcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQmVlcFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJCZWdpblwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDYWxsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNoRGlyXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQ2hEcml2ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDbG9zZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDb25zdFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEYXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRlY2xhcmVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRGVmQm9vbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEZWZCeXRlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiRGVmQ3VyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRlZkRhdGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRGVmRGJsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRlZkRlY1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEZWZJbnRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRGVmTG5nXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRlZk9ialwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkRlZlNuZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEZWZTdHJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRGVmVmFyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRlZnR5cGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRGVsZXRlU2V0dGluZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEaW1cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRG9cIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJFYWNoXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkVsc2VJZlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJFbmRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRW51bVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJFcmFzZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJFcnJvclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJFdmVudFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJFeGl0XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiRXhwbGljaXRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRmlsZUNvcHlcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRm9yXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkZvckVhY2hcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRnVuY3Rpb25cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiR2V0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkdvU3ViXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiR29Ub1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJHb3N1YlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJJbXBsZW1lbnRzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIktpbGxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTFNldFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJMZXRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTGliXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkxpbmVJbnB1dFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkxvYWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTG9ja1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJMb29wXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk1pZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJNa0RpclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJOYW1lXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk5leHRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiT25cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiT25FcnJvclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJPcGVuXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiT3B0aW9uXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlByZXNlcnZlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlByaXZhdGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUHJvcGVydHlcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUHVibGljXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlB1dFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSU2V0XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiUmFpc2VFdmVudFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSYW5kb21pemVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUmVEaW1cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUmVkaW1cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUmVtXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJlc2V0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJlc3VtZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlJldHVyblwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSbURpclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTYXZlUGljdHVyZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTYXZlU2V0dGluZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTZWVrXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNlbmRLZXlzXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiU2VuZGtleXNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2V0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNldEF0dHJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU3RhdGljXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlN0ZXBcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU3RvcFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTdWJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiVGltZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlR5cGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiVW5sb2FkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlVubG9ja1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJVbnRpbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJXZW5kXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIldoaWxlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIldpZHRoXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIldpdGhcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJXcml0ZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSwgXG4gICAgICAgIFwidmJPcGVyYXRvclwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQWRkcmVzc09mXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkFuZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJCeVJlZlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJCeVZhbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJFcXZcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiSW1wXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkluXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiSXNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTGlrZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJNb2RcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTm90XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk9yXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlRvXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlhvclwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwicmVnZXhcIjoge1xuICAgICAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IFwiWygpKy4sXFxcXC0vKj0mXVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkZWx0YVwiOiAwXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbCwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbnNcIjogW10sIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcIm1hdGNoXCJcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwicmVnZXhcIjoge1xuICAgICAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IFwiWzw+XT1cXFxcPVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkZWx0YVwiOiAwXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbCwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbnNcIjogW10sIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcIm1hdGNoXCJcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwicmVnZXhcIjoge1xuICAgICAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IFwiPD5cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVsdGFcIjogMFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGwsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5zXCI6IFtdLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJtYXRjaFwiXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJyZWdleFwiOiBcIlxcXFxzXFxcXCtfJFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkZWx0YVwiOiAwXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbCwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbnNcIjogW10sIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcIm1hdGNoXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSwgXG4gICAgICAgIFwidmJUeXBlc1wiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQm9vbGVhblwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJCeXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkN1cnJlbmN5XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRhdGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRGVjaW1hbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEb3VibGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRW1wdHlcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJJbnRlZ2VyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkxvbmdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiT2JqZWN0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNpbmdsZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTdHJpbmdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiVmFyaWFudFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSwgXG4gICAgICAgIFwidmJCb29sZWFuXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJUcnVlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkZhbHNlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJ2YlRvZG9cIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlRPRE9cIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiB0cnVlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSwgXG4gICAgICAgIFwidmJUeXBlU3BlY2lmaWVyXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJyZWdleFwiOiBcIlthLXpBLVowLTldW1xcXFwkJSYhI11tcz1zMVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkZWx0YVwiOiAwXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbCwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbnNcIjogW10sIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcIm1hdGNoXCJcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwicmVnZXhcIjoge1xuICAgICAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IFwiI1thLXpBLVowLTldXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRlbHRhXCI6IC0xXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbCwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbnNcIjogW10sIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcIm1hdGNoXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgIH0sIFxuICAgIFwidGFnc1wiOiB7XG4gICAgICAgIFwidmJGdW5jdGlvblwiOiBcIklkZW50aWZpZXJcIiwgXG4gICAgICAgIFwidmJOdW1iZXJcIjogXCJOdW1iZXJcIiwgXG4gICAgICAgIFwidmJTdHJpbmdcIjogXCJTdHJpbmdcIiwgXG4gICAgICAgIFwidmJDb25zdFwiOiBcIkNvbnN0YW50XCIsIFxuICAgICAgICBcInZiRGVmaW5lXCI6IFwiQ29uc3RhbnRcIiwgXG4gICAgICAgIFwidmJLZXl3b3JkXCI6IFwiU3RhdGVtZW50XCIsIFxuICAgICAgICBcInZiRmxvYXRcIjogXCJGbG9hdFwiLCBcbiAgICAgICAgXCJ2Yk1ldGhvZHNcIjogXCJQcmVQcm9jXCIsIFxuICAgICAgICBcInZiQ29uZGl0aW9uYWxcIjogXCJDb25kaXRpb25hbFwiLCBcbiAgICAgICAgXCJ2YkNvbW1lbnRcIjogXCJDb21tZW50XCIsIFxuICAgICAgICBcInZiSWRlbnRpZmllclwiOiBcIklkZW50aWZpZXJcIiwgXG4gICAgICAgIFwidmJSZXBlYXRcIjogXCJSZXBlYXRcIiwgXG4gICAgICAgIFwidmJMaW5lTnVtYmVyXCI6IFwiQ29tbWVudFwiLCBcbiAgICAgICAgXCJ2YkV2ZW50c1wiOiBcIlNwZWNpYWxcIiwgXG4gICAgICAgIFwidmJTdGF0ZW1lbnRcIjogXCJTdGF0ZW1lbnRcIiwgXG4gICAgICAgIFwidmJFcnJvclwiOiBcIkVycm9yXCIsIFxuICAgICAgICBcInZiT3BlcmF0b3JcIjogXCJPcGVyYXRvclwiLCBcbiAgICAgICAgXCJ2YlR5cGVzXCI6IFwiVHlwZVwiLCBcbiAgICAgICAgXCJ2YkJvb2xlYW5cIjogXCJCb29sZWFuXCIsIFxuICAgICAgICBcInZiVG9kb1wiOiBcIlRvZG9cIiwgXG4gICAgICAgIFwidmJUeXBlU3BlY2lmaWVyXCI6IFwiVHlwZVwiXG4gICAgfVxufTsiLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy5qcycpO1xudmFyIHJlbmRlcmVyID0gcmVxdWlyZSgnLi9yZW5kZXJlci5qcycpO1xuXG4vKipcbiAqIEdyb3VwcyBtdWx0aXBsZSByZW5kZXJlcnNcbiAqIEBwYXJhbSB7YXJyYXl9IHJlbmRlcmVycyAtIGFycmF5IG9mIHJlbmRlcmVyc1xuICogQHBhcmFtIHtDYW52YXN9IGNhbnZhc1xuICovXG52YXIgQmF0Y2hSZW5kZXJlciA9IGZ1bmN0aW9uKHJlbmRlcmVycywgY2FudmFzKSB7XG4gICAgcmVuZGVyZXIuUmVuZGVyZXJCYXNlLmNhbGwodGhpcywgY2FudmFzKTtcbiAgICB0aGlzLl9yZW5kZXJlcnMgPSByZW5kZXJlcnM7XG5cbiAgICAvLyBMaXN0ZW4gdG8gdGhlIGxheWVycywgaWYgb25lIGxheWVyIGNoYW5nZXMsIHJlY29tcG9zZVxuICAgIC8vIHRoZSBmdWxsIGltYWdlIGJ5IGNvcHlpbmcgdGhlbSBhbGwgYWdhaW4uXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMuX3JlbmRlcmVycy5mb3JFYWNoKGZ1bmN0aW9uKHJlbmRlcmVyKSB7XG4gICAgICAgIHJlbmRlcmVyLm9uKCdjaGFuZ2VkJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0aGF0Ll9jb3B5X3JlbmRlcmVycygpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICBcbiAgICAvLyBDcmVhdGUgcHJvcGVydGllcy5cbiAgICB0aGlzLnByb3BlcnR5KCd3aWR0aCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC5fY2FudmFzLndpZHRoO1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQuX2NhbnZhcy53aWR0aCA9IHZhbHVlO1xuICAgICAgICB0aGF0Ll9yZW5kZXJlcnMuZm9yRWFjaChmdW5jdGlvbihyZW5kZXJlcikge1xuICAgICAgICAgICAgcmVuZGVyZXIud2lkdGggPSB2YWx1ZTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgdGhpcy5wcm9wZXJ0eSgnaGVpZ2h0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Ll9jYW52YXMuaGVpZ2h0O1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQuX2NhbnZhcy5oZWlnaHQgPSB2YWx1ZTtcbiAgICAgICAgdGhhdC5fcmVuZGVyZXJzLmZvckVhY2goZnVuY3Rpb24ocmVuZGVyZXIpIHtcbiAgICAgICAgICAgIHJlbmRlcmVyLmhlaWdodCA9IHZhbHVlO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn07XG51dGlscy5pbmhlcml0KEJhdGNoUmVuZGVyZXIsIHJlbmRlcmVyLlJlbmRlcmVyQmFzZSk7XG5cbi8qKlxuICogUmVuZGVyIHRvIHRoZSBjYW52YXNcbiAqIEBwYXJhbSB7ZGljdGlvbmFyeX0gKG9wdGlvbmFsKSBzY3JvbGwgLSBIb3cgbXVjaCB0aGUgY2FudmFzIHdhcyBzY3JvbGxlZC4gIFRoaXNcbiAqICAgICAgICAgICAgICAgICAgICAgaXMgYSBkaWN0aW9uYXJ5IG9mIHRoZSBmb3JtIHt4OiBmbG9hdCwgeTogZmxvYXR9XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5CYXRjaFJlbmRlcmVyLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbihzY3JvbGwpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdGhpcy5fcmVuZGVyZXJzLmZvckVhY2goZnVuY3Rpb24ocmVuZGVyZXIpIHtcblxuICAgICAgICAvLyBBcHBseSB0aGUgcmVuZGVyaW5nIGNvb3JkaW5hdGUgdHJhbnNmb3JtcyBvZiB0aGUgcGFyZW50LlxuICAgICAgICBpZiAoIXJlbmRlcmVyLm9wdGlvbnMucGFyZW50X2luZGVwZW5kZW50KSB7XG4gICAgICAgICAgICByZW5kZXJlci5fY2FudmFzLl90eCA9IHV0aWxzLnByb3h5KHRoYXQuX2NhbnZhcy5fdHgsIHRoYXQuX2NhbnZhcyk7XG4gICAgICAgICAgICByZW5kZXJlci5fY2FudmFzLl90eSA9IHV0aWxzLnByb3h5KHRoYXQuX2NhbnZhcy5fdHksIHRoYXQuX2NhbnZhcyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUZWxsIHRoZSByZW5kZXJlciB0byByZW5kZXIgaXRzZWxmLlxuICAgICAgICByZW5kZXJlci5yZW5kZXIoc2Nyb2xsKTtcbiAgICB9KTtcblxuICAgIC8vIENvcHkgdGhlIHJlc3VsdHMgdG8gc2VsZi5cbiAgICB0aGlzLl9jb3B5X3JlbmRlcmVycygpO1xufTtcblxuLyoqXG4gKiBDb3BpZXMgYWxsIHRoZSByZW5kZXJlciBsYXllcnMgdG8gdGhlIGNhbnZhcy5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkJhdGNoUmVuZGVyZXIucHJvdG90eXBlLl9jb3B5X3JlbmRlcmVycyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLl9jYW52YXMuY2xlYXIoKTtcbiAgICB0aGlzLl9yZW5kZXJlcnMuZm9yRWFjaChmdW5jdGlvbihyZW5kZXJlcikge1xuICAgICAgICB0aGF0Ll9jb3B5X3JlbmRlcmVyKHJlbmRlcmVyKTtcbiAgICB9KTtcbn07XG5cbi8qKlxuICogQ29weSBhIHJlbmRlcmVyIHRvIHRoZSBjYW52YXMuXG4gKiBAcGFyYW0gIHtSZW5kZXJlckJhc2V9IHJlbmRlcmVyXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5CYXRjaFJlbmRlcmVyLnByb3RvdHlwZS5fY29weV9yZW5kZXJlciA9IGZ1bmN0aW9uKHJlbmRlcmVyKSB7XG4gICAgdGhpcy5fY2FudmFzLmRyYXdfaW1hZ2UoXG4gICAgICAgIHJlbmRlcmVyLl9jYW52YXMsIFxuICAgICAgICAtdGhpcy5fY2FudmFzLl90eCgwKSwgXG4gICAgICAgIC10aGlzLl9jYW52YXMuX3R5KDApLCBcbiAgICAgICAgdGhpcy5fY2FudmFzLndpZHRoLCBcbiAgICAgICAgdGhpcy5fY2FudmFzLmhlaWdodCk7XG59O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLkJhdGNoUmVuZGVyZXIgPSBCYXRjaFJlbmRlcmVyO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMuanMnKTtcbnZhciByZW5kZXJlciA9IHJlcXVpcmUoJy4vcmVuZGVyZXIuanMnKTtcblxuLyoqXG4gKiBSZW5kZXJzIHRvIGEgY2FudmFzXG4gKiBAcGFyYW0ge0NhbnZhc30gZGVmYXVsdF9jYW52YXNcbiAqL1xudmFyIENvbG9yUmVuZGVyZXIgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBDcmVhdGUgd2l0aCB0aGUgb3B0aW9uICdwYXJlbnRfaW5kZXBlbmRlbnQnIHRvIGRpc2FibGVcbiAgICAvLyBwYXJlbnQgY29vcmRpbmF0ZSB0cmFuc2xhdGlvbnMgZnJvbSBiZWluZyBhcHBsaWVkIGJ5IFxuICAgIC8vIGEgYmF0Y2ggcmVuZGVyZXIuXG4gICAgcmVuZGVyZXIuUmVuZGVyZXJCYXNlLmNhbGwodGhpcywgdW5kZWZpbmVkLCB7cGFyZW50X2luZGVwZW5kZW50OiB0cnVlfSk7XG4gICAgdGhpcy5fcmVuZGVyZWQgPSBmYWxzZTtcbiAgICBcbiAgICAvLyBDcmVhdGUgcHJvcGVydGllcy5cbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdGhpcy5wcm9wZXJ0eSgnd2lkdGgnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoYXQuX2NhbnZhcy53aWR0aDtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0Ll9jYW52YXMud2lkdGggPSB2YWx1ZTtcbiAgICAgICAgdGhhdC5fcmVuZGVyKCk7XG5cbiAgICAgICAgLy8gVGVsbCBwYXJlbnQgbGF5ZXIgdGhpcyBvbmUgaGFzIGNoYW5nZWQuXG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpO1xuICAgIH0pO1xuICAgIHRoaXMucHJvcGVydHkoJ2hlaWdodCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC5fY2FudmFzLmhlaWdodDtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0Ll9jYW52YXMuaGVpZ2h0ID0gdmFsdWU7XG4gICAgICAgIHRoYXQuX3JlbmRlcigpO1xuXG4gICAgICAgIC8vIFRlbGwgcGFyZW50IGxheWVyIHRoaXMgb25lIGhhcyBjaGFuZ2VkLlxuICAgICAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZWQnKTtcbiAgICB9KTtcbiAgICB0aGlzLnByb3BlcnR5KCdjb2xvcicsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC5fY29sb3I7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC5fY29sb3IgPSB2YWx1ZTtcbiAgICAgICAgdGhhdC5fcmVuZGVyKCk7XG5cbiAgICAgICAgLy8gVGVsbCBwYXJlbnQgbGF5ZXIgdGhpcyBvbmUgaGFzIGNoYW5nZWQuXG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpO1xuICAgIH0pO1xufTtcbnV0aWxzLmluaGVyaXQoQ29sb3JSZW5kZXJlciwgcmVuZGVyZXIuUmVuZGVyZXJCYXNlKTtcblxuLyoqXG4gKiBSZW5kZXIgdG8gdGhlIGNhbnZhc1xuICogQHBhcmFtIHtkaWN0aW9uYXJ5fSAob3B0aW9uYWwpIHNjcm9sbCAtIEhvdyBtdWNoIHRoZSBjYW52YXMgd2FzIHNjcm9sbGVkLiAgVGhpc1xuICogICAgICAgICAgICAgICAgICAgICBpcyBhIGRpY3Rpb25hcnkgb2YgdGhlIGZvcm0ge3g6IGZsb2F0LCB5OiBmbG9hdH1cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkNvbG9yUmVuZGVyZXIucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKHNjcm9sbCkge1xuICAgIGlmICghdGhpcy5fcmVuZGVyZWQpIHtcbiAgICAgICAgdGhpcy5fcmVuZGVyKCk7XG4gICAgICAgIHRoaXMuX3JlbmRlcmVkID0gdHJ1ZTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFJlbmRlciBhIGZyYW1lLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ29sb3JSZW5kZXJlci5wcm90b3R5cGUuX3JlbmRlciA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2NhbnZhcy5jbGVhcigpO1xuICAgIHRoaXMuX2NhbnZhcy5kcmF3X3JlY3RhbmdsZSgwLCAwLCB0aGlzLl9jYW52YXMud2lkdGgsIHRoaXMuX2NhbnZhcy5oZWlnaHQsIHtmaWxsX2NvbG9yOiB0aGlzLl9jb2xvcn0pO1xufTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5Db2xvclJlbmRlcmVyID0gQ29sb3JSZW5kZXJlcjtcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbnZhciBhbmltYXRvciA9IHJlcXVpcmUoJy4uL2FuaW1hdG9yLmpzJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy5qcycpO1xudmFyIHJlbmRlcmVyID0gcmVxdWlyZSgnLi9yZW5kZXJlci5qcycpO1xuXG4vKipcbiAqIFJlbmRlciBkb2N1bWVudCBjdXJzb3JzXG4gKlxuICogVE9ETzogT25seSByZW5kZXIgdmlzaWJsZS5cbiAqL1xudmFyIEN1cnNvcnNSZW5kZXJlciA9IGZ1bmN0aW9uKGN1cnNvcnMsIHN0eWxlLCByb3dfcmVuZGVyZXIsIGhhc19mb2N1cykge1xuICAgIHJlbmRlcmVyLlJlbmRlcmVyQmFzZS5jYWxsKHRoaXMpO1xuICAgIHRoaXMuc3R5bGUgPSBzdHlsZTtcbiAgICB0aGlzLl9oYXNfZm9jdXMgPSBoYXNfZm9jdXM7XG4gICAgdGhpcy5fY3Vyc29ycyA9IGN1cnNvcnM7XG4gICAgdGhpcy5fZ2V0X3Zpc2libGVfcm93cyA9IHV0aWxzLnByb3h5KHJvd19yZW5kZXJlci5nZXRfdmlzaWJsZV9yb3dzLCByb3dfcmVuZGVyZXIpO1xuICAgIHRoaXMuX2dldF9yb3dfaGVpZ2h0ID0gdXRpbHMucHJveHkocm93X3JlbmRlcmVyLmdldF9yb3dfaGVpZ2h0LCByb3dfcmVuZGVyZXIpO1xuICAgIHRoaXMuX2dldF9yb3dfdG9wID0gdXRpbHMucHJveHkocm93X3JlbmRlcmVyLmdldF9yb3dfdG9wLCByb3dfcmVuZGVyZXIpO1xuICAgIHRoaXMuX21lYXN1cmVfcGFydGlhbF9yb3cgPSB1dGlscy5wcm94eShyb3dfcmVuZGVyZXIubWVhc3VyZV9wYXJ0aWFsX3Jvd193aWR0aCwgcm93X3JlbmRlcmVyKTtcbiAgICB0aGlzLl9ibGlua19hbmltYXRvciA9IG5ldyBhbmltYXRvci5BbmltYXRvcigxMDAwKTtcbiAgICB0aGlzLl9mcHMgPSAzMDtcblxuICAgIC8vIFN0YXJ0IHRoZSBjdXJzb3IgcmVuZGVyaW5nIGNsb2NrLlxuICAgIHRoaXMuX3JlbmRlcl9jbG9jaygpO1xuICAgIHRoaXMuX2xhc3RfcmVuZGVyZWQgPSBudWxsO1xufTtcbnV0aWxzLmluaGVyaXQoQ3Vyc29yc1JlbmRlcmVyLCByZW5kZXJlci5SZW5kZXJlckJhc2UpO1xuXG4vKipcbiAqIFJlbmRlciB0byB0aGUgY2FudmFzXG4gKiBOb3RlOiBUaGlzIG1ldGhvZCBpcyBjYWxsZWQgb2Z0ZW4sIHNvIGl0J3MgaW1wb3J0YW50IHRoYXQgaXQnc1xuICogb3B0aW1pemVkIGZvciBzcGVlZC5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvcnNSZW5kZXJlci5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gRnJhbWUgbGltaXQgdGhlIHJlbmRlcmluZy5cbiAgICBpZiAoRGF0ZS5ub3coKSAtIHRoaXMuX2xhc3RfcmVuZGVyZWQgPCAxMDAwL3RoaXMuX2Zwcykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuX2NhbnZhcy5jbGVhcigpO1xuXG4gICAgLy8gT25seSByZW5kZXIgaWYgdGhlIGNhbnZhcyBoYXMgZm9jdXMuXG4gICAgaWYgKHRoaXMuX2hhc19mb2N1cygpKSB7XG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgdGhpcy5fY3Vyc29ycy5jdXJzb3JzLmZvckVhY2goZnVuY3Rpb24oY3Vyc29yKSB7XG4gICAgICAgICAgICAvLyBHZXQgdGhlIHZpc2libGUgcm93cy5cbiAgICAgICAgICAgIHZhciB2aXNpYmxlX3Jvd3MgPSB0aGF0Ll9nZXRfdmlzaWJsZV9yb3dzKCk7XG5cbiAgICAgICAgICAgIC8vIElmIGEgY3Vyc29yIGRvZXNuJ3QgaGF2ZSBhIHBvc2l0aW9uLCByZW5kZXIgaXQgYXQgdGhlXG4gICAgICAgICAgICAvLyBiZWdpbm5pbmcgb2YgdGhlIGRvY3VtZW50LlxuICAgICAgICAgICAgdmFyIHJvd19pbmRleCA9IGN1cnNvci5wcmltYXJ5X3JvdyB8fCAwO1xuICAgICAgICAgICAgdmFyIGNoYXJfaW5kZXggPSBjdXJzb3IucHJpbWFyeV9jaGFyIHx8IDA7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIERyYXcgdGhlIGN1cnNvci5cbiAgICAgICAgICAgIGlmICh2aXNpYmxlX3Jvd3MudG9wX3JvdyA8PSByb3dfaW5kZXggJiYgcm93X2luZGV4IDw9IHZpc2libGVfcm93cy5ib3R0b21fcm93KSB7XG4gICAgICAgICAgICAgICAgdGhhdC5fY2FudmFzLmRyYXdfcmVjdGFuZ2xlKFxuICAgICAgICAgICAgICAgICAgICBjaGFyX2luZGV4ID09PSAwID8gMCA6IHRoYXQuX21lYXN1cmVfcGFydGlhbF9yb3cocm93X2luZGV4LCBjaGFyX2luZGV4KSwgXG4gICAgICAgICAgICAgICAgICAgIHRoYXQuX2dldF9yb3dfdG9wKHJvd19pbmRleCksIFxuICAgICAgICAgICAgICAgICAgICAxLCBcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5fZ2V0X3Jvd19oZWlnaHQocm93X2luZGV4KSwgXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbGxfY29sb3I6ICdyZWQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgYWxwaGE6IE1hdGgubWF4KDAsIE1hdGguc2luKE1hdGguUEkgKiB0aGF0Ll9ibGlua19hbmltYXRvci50aW1lKCkpKSxcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICB0aGlzLl9sYXN0X3JlbmRlcmVkID0gRGF0ZS5ub3coKTtcbn07XG5cbi8qKlxuICogQ2xvY2sgZm9yIHJlbmRlcmluZyB0aGUgY3Vyc29yLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29yc1JlbmRlcmVyLnByb3RvdHlwZS5fcmVuZGVyX2Nsb2NrID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gSWYgdGhlIGNhbnZhcyBpcyBmb2N1c2VkLCByZWRyYXcuXG4gICAgaWYgKHRoaXMuX2hhc19mb2N1cygpKSB7XG4gICAgICAgIHRoaXMuX3dhc19mb2N1c2VkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgLy8gVGVsbCBwYXJlbnQgbGF5ZXIgdGhpcyBvbmUgaGFzIGNoYW5nZWQuXG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpO1xuXG4gICAgLy8gVGhlIGNhbnZhcyBpc24ndCBmb2N1c2VkLiAgSWYgdGhpcyBpcyB0aGUgZmlyc3QgdGltZVxuICAgIC8vIGl0IGhhc24ndCBiZWVuIGZvY3VzZWQsIHJlbmRlciBhZ2FpbiB3aXRob3V0IHRoZSBcbiAgICAvLyBjdXJzb3JzLlxuICAgIH0gZWxzZSBpZiAodGhpcy5fd2FzX2ZvY3VzZWQpIHtcbiAgICAgICAgdGhpcy5fd2FzX2ZvY3VzZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgLy8gVGVsbCBwYXJlbnQgbGF5ZXIgdGhpcyBvbmUgaGFzIGNoYW5nZWQuXG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpO1xuICAgIH1cblxuICAgIC8vIFRpbWVyLlxuICAgIHNldFRpbWVvdXQodXRpbHMucHJveHkodGhpcy5fcmVuZGVyX2Nsb2NrLCB0aGlzKSwgMTAwMCAvIHRoaXMuX2Zwcyk7XG59O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLkN1cnNvcnNSZW5kZXJlciA9IEN1cnNvcnNSZW5kZXJlcjtcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzLmpzJyk7XG52YXIgcm93ID0gcmVxdWlyZSgnLi9yb3cuanMnKTtcblxuLyoqXG4gKiBSZW5kZXIgdGhlIHRleHQgcm93cyBvZiBhIERvY3VtZW50TW9kZWwuXG4gKiBAcGFyYW0ge0RvY3VtZW50TW9kZWx9IG1vZGVsIGluc3RhbmNlXG4gKi9cbnZhciBIaWdobGlnaHRlZFJvd1JlbmRlcmVyID0gZnVuY3Rpb24obW9kZWwsIHNjcm9sbGluZ19jYW52YXMsIHN0eWxlLCBjb25maWcpIHtcbiAgICByb3cuUm93UmVuZGVyZXIuY2FsbCh0aGlzLCBtb2RlbCwgc2Nyb2xsaW5nX2NhbnZhcyk7XG4gICAgdGhpcy5zdHlsZSA9IHN0eWxlO1xuICAgIHRoaXMuY29uZmlnID0gY29uZmlnO1xufTtcbnV0aWxzLmluaGVyaXQoSGlnaGxpZ2h0ZWRSb3dSZW5kZXJlciwgcm93LlJvd1JlbmRlcmVyKTtcblxuLyoqXG4gKiBSZW5kZXIgYSBzaW5nbGUgcm93XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBpbmRleFxuICogQHBhcmFtICB7ZmxvYXR9IHhcbiAqIEBwYXJhbSAge2Zsb2F0fSB5XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5IaWdobGlnaHRlZFJvd1JlbmRlcmVyLnByb3RvdHlwZS5fcmVuZGVyX3JvdyA9IGZ1bmN0aW9uKGluZGV4LCB4ICx5KSB7XG4gICAgaWYgKGluZGV4IDwgMCB8fCB0aGlzLl9tb2RlbC5fcm93cy5sZW5ndGggPD0gaW5kZXgpIHJldHVybjtcbiAgICBcbiAgICB2YXIgZ3JvdXBzID0gdGhpcy5fZ2V0X2dyb3VwcyhpbmRleCk7XG4gICAgdmFyIGxlZnQgPSB4O1xuICAgIGZvciAodmFyIGk9MDsgaTxncm91cHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHdpZHRoID0gdGhpcy5fdGV4dF9jYW52YXMubWVhc3VyZV90ZXh0KGdyb3Vwc1tpXS50ZXh0LCBncm91cHNbaV0ub3B0aW9ucyk7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5jb25maWcuaGlnaGxpZ2h0X2RyYXcpIHtcbiAgICAgICAgICAgIHRoaXMuX3RleHRfY2FudmFzLmRyYXdfcmVjdGFuZ2xlKGxlZnQsIHksIHdpZHRoLCB0aGlzLmdldF9yb3dfaGVpZ2h0KGkpLCB7XG4gICAgICAgICAgICAgICAgZmlsbF9jb2xvcjogdXRpbHMucmFuZG9tX2NvbG9yKCksXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX3RleHRfY2FudmFzLmRyYXdfdGV4dChsZWZ0LCB5LCBncm91cHNbaV0udGV4dCwgZ3JvdXBzW2ldLm9wdGlvbnMpO1xuICAgICAgICBsZWZ0ICs9IHdpZHRoO1xuICAgIH1cbn07XG5cbi8qKlxuICogR2V0IHJlbmRlciBncm91cHMgZm9yIGEgcm93LlxuICogQHBhcmFtICB7aW50ZWdlcn0gaW5kZXggb2YgdGhlIHJvd1xuICogQHJldHVybiB7YXJyYXl9IGFycmF5IG9mIHJlbmRlcmluZ3MsIGVhY2ggcmVuZGVyaW5nIGlzIGFuIGFycmF5IG9mXG4gKiAgICAgICAgICAgICAgICAgdGhlIGZvcm0ge29wdGlvbnMsIHRleHR9LlxuICovXG5IaWdobGlnaHRlZFJvd1JlbmRlcmVyLnByb3RvdHlwZS5fZ2V0X2dyb3VwcyA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgaWYgKGluZGV4IDwgMCB8fCB0aGlzLl9tb2RlbC5fcm93cy5sZW5ndGggPD0gaW5kZXgpIHJldHVybjtcblxuICAgIHZhciByb3dfdGV4dCA9IHRoaXMuX21vZGVsLl9yb3dzW2luZGV4XTtcbiAgICB2YXIgZ3JvdXBzID0gW107XG4gICAgdmFyIGxhc3Rfc3ludGF4ID0gbnVsbDtcbiAgICB2YXIgY2hhcl9pbmRleCA9IDA7XG4gICAgdmFyIHN0YXJ0ID0gMDtcbiAgICBmb3IgKGNoYXJfaW5kZXg7IGNoYXJfaW5kZXg8cm93X3RleHQubGVuZ3RoOyBjaGFyX2luZGV4KyspIHtcbiAgICAgICAgdmFyIHN5bnRheCA9IHRoaXMuX21vZGVsLmdldF90YWdzKGluZGV4LCBjaGFyX2luZGV4KS5zeW50YXg7XG4gICAgICAgIGlmICghdGhpcy5fY29tcGFyZV9zeW50YXgobGFzdF9zeW50YXgsc3ludGF4KSkge1xuICAgICAgICAgICAgaWYgKGNoYXJfaW5kZXggIT09IDApIHtcbiAgICAgICAgICAgICAgICBncm91cHMucHVzaCh7b3B0aW9uczogdGhpcy5fZ2V0X29wdGlvbnMobGFzdF9zeW50YXgpLCB0ZXh0OiByb3dfdGV4dC5zdWJzdHJpbmcoc3RhcnQsIGNoYXJfaW5kZXgpfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsYXN0X3N5bnRheCA9IHN5bnRheDtcbiAgICAgICAgICAgIHN0YXJ0ID0gY2hhcl9pbmRleDtcbiAgICAgICAgfVxuICAgIH1cbiAgICBncm91cHMucHVzaCh7b3B0aW9uczogdGhpcy5fZ2V0X29wdGlvbnMobGFzdF9zeW50YXgpLCB0ZXh0OiByb3dfdGV4dC5zdWJzdHJpbmcoc3RhcnQpfSk7XG5cbiAgICByZXR1cm4gZ3JvdXBzO1xufTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgc3R5bGUgb3B0aW9ucyBkaWN0aW9uYXJ5IGZyb20gYSBzeW50YXggdGFnLlxuICogQHBhcmFtICB7c3RyaW5nfSBzeW50YXhcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkhpZ2hsaWdodGVkUm93UmVuZGVyZXIucHJvdG90eXBlLl9nZXRfb3B0aW9ucyA9IGZ1bmN0aW9uKHN5bnRheCkge1xuICAgIHZhciByZW5kZXJfb3B0aW9ucyA9IHV0aWxzLnNoYWxsb3dfY29weSh0aGlzLl9iYXNlX29wdGlvbnMpO1xuXG4gICAgaWYgKHN5bnRheCAmJiB0aGlzLnN0eWxlICYmIHRoaXMuc3R5bGVbc3ludGF4XSkge1xuICAgICAgICByZW5kZXJfb3B0aW9ucy5jb2xvciA9IHRoaXMuc3R5bGVbc3ludGF4XTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZW5kZXJfb3B0aW9ucy5jb2xvciA9IHRoaXMuc3R5bGUudGV4dCB8fCAnYmxhY2snO1xuICAgIH1cbiAgICBcbiAgICByZXR1cm4gcmVuZGVyX29wdGlvbnM7XG59O1xuXG4vKipcbiAqIENvbXBhcmUgdHdvIHN5bnRheHMuXG4gKiBAcGFyYW0gIHtzdHJpbmd9IGEgLSBzeW50YXhcbiAqIEBwYXJhbSAge3N0cmluZ30gYiAtIHN5bnRheFxuICogQHJldHVybiB7Ym9vbH0gdHJ1ZSBpZiBhIGFuZCBiIGFyZSBlcXVhbFxuICovXG5IaWdobGlnaHRlZFJvd1JlbmRlcmVyLnByb3RvdHlwZS5fY29tcGFyZV9zeW50YXggPSBmdW5jdGlvbihhLCBiKSB7XG4gICAgcmV0dXJuIGEgPT09IGI7XG59O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLkhpZ2hsaWdodGVkUm93UmVuZGVyZXIgPSBIaWdobGlnaHRlZFJvd1JlbmRlcmVyO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIGNhbnZhcyA9IHJlcXVpcmUoJy4uL2NhbnZhcy5qcycpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMuanMnKTtcblxuLyoqXG4gKiBSZW5kZXJzIHRvIGEgY2FudmFzXG4gKiBAcGFyYW0ge0NhbnZhc30gZGVmYXVsdF9jYW52YXNcbiAqL1xudmFyIFJlbmRlcmVyQmFzZSA9IGZ1bmN0aW9uKGRlZmF1bHRfY2FudmFzLCBvcHRpb25zKSB7XG4gICAgdXRpbHMuUG9zdGVyQ2xhc3MuY2FsbCh0aGlzKTtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIHRoaXMuX2NhbnZhcyA9IGRlZmF1bHRfY2FudmFzID8gZGVmYXVsdF9jYW52YXMgOiBuZXcgY2FudmFzLkNhbnZhcygpO1xuICAgIFxuICAgIC8vIENyZWF0ZSBwcm9wZXJ0aWVzLlxuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLnByb3BlcnR5KCd3aWR0aCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC5fY2FudmFzLndpZHRoO1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQuX2NhbnZhcy53aWR0aCA9IHZhbHVlO1xuICAgIH0pO1xuICAgIHRoaXMucHJvcGVydHkoJ2hlaWdodCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC5fY2FudmFzLmhlaWdodDtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0Ll9jYW52YXMuaGVpZ2h0ID0gdmFsdWU7XG4gICAgfSk7XG59O1xudXRpbHMuaW5oZXJpdChSZW5kZXJlckJhc2UsIHV0aWxzLlBvc3RlckNsYXNzKTtcblxuLyoqXG4gKiBSZW5kZXIgdG8gdGhlIGNhbnZhc1xuICogQHBhcmFtIHtkaWN0aW9uYXJ5fSAob3B0aW9uYWwpIHNjcm9sbCAtIEhvdyBtdWNoIHRoZSBjYW52YXMgd2FzIHNjcm9sbGVkLiAgVGhpc1xuICogICAgICAgICAgICAgICAgICAgICBpcyBhIGRpY3Rpb25hcnkgb2YgdGhlIGZvcm0ge3g6IGZsb2F0LCB5OiBmbG9hdH1cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblJlbmRlcmVyQmFzZS5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24oc2Nyb2xsKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdOb3QgaW1wbGVtZW50ZWQnKTtcbn07XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuUmVuZGVyZXJCYXNlID0gUmVuZGVyZXJCYXNlO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIGNhbnZhcyA9IHJlcXVpcmUoJy4uL2NhbnZhcy5qcycpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMuanMnKTtcbnZhciByZW5kZXJlciA9IHJlcXVpcmUoJy4vcmVuZGVyZXIuanMnKTtcblxuLyoqXG4gKiBSZW5kZXIgdGhlIHRleHQgcm93cyBvZiBhIERvY3VtZW50TW9kZWwuXG4gKiBAcGFyYW0ge0RvY3VtZW50TW9kZWx9IG1vZGVsIGluc3RhbmNlXG4gKi9cbnZhciBSb3dSZW5kZXJlciA9IGZ1bmN0aW9uKG1vZGVsLCBzY3JvbGxpbmdfY2FudmFzKSB7XG4gICAgdGhpcy5fbW9kZWwgPSBtb2RlbDtcbiAgICB0aGlzLl92aXNpYmxlX3Jvd19jb3VudCA9IDA7XG5cbiAgICAvLyBTZXR1cCBjYW52YXNlc1xuICAgIHRoaXMuX3RleHRfY2FudmFzID0gbmV3IGNhbnZhcy5DYW52YXMoKTtcbiAgICB0aGlzLl90bXBfY2FudmFzID0gbmV3IGNhbnZhcy5DYW52YXMoKTtcbiAgICB0aGlzLl9zY3JvbGxpbmdfY2FudmFzID0gc2Nyb2xsaW5nX2NhbnZhcztcblxuICAgIC8vIEJhc2VcbiAgICByZW5kZXJlci5SZW5kZXJlckJhc2UuY2FsbCh0aGlzKTtcblxuICAgIC8vIFNldCBzb21lIGJhc2ljIHJlbmRlcmluZyBwcm9wZXJ0aWVzLlxuICAgIHRoaXMuX2Jhc2Vfb3B0aW9ucyA9IHtcbiAgICAgICAgZm9udF9mYW1pbHk6ICdtb25vc3BhY2UnLFxuICAgICAgICBmb250X3NpemU6IDEyLFxuICAgIH07XG4gICAgdGhpcy5fbGluZV9zcGFjaW5nID0gMjtcblxuICAgIC8vIENyZWF0ZSBwcm9wZXJ0aWVzLlxuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLnByb3BlcnR5KCd3aWR0aCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC5fY2FudmFzLndpZHRoO1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQuX2NhbnZhcy53aWR0aCA9IHZhbHVlO1xuICAgICAgICB0aGF0Ll90ZXh0X2NhbnZhcy53aWR0aCA9IHZhbHVlO1xuICAgICAgICB0aGF0Ll90bXBfY2FudmFzLndpZHRoID0gdmFsdWU7XG4gICAgfSk7XG4gICAgdGhpcy5wcm9wZXJ0eSgnaGVpZ2h0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Ll9jYW52YXMuaGVpZ2h0O1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQuX2NhbnZhcy5oZWlnaHQgPSB2YWx1ZTtcblxuICAgICAgICAvLyBUaGUgdGV4dCBjYW52YXMgc2hvdWxkIGJlIHRoZSByaWdodCBoZWlnaHQgdG8gZml0IGFsbCBvZiB0aGUgbGluZXNcbiAgICAgICAgLy8gdGhhdCB3aWxsIGJlIHJlbmRlcmVkIGluIHRoZSBiYXNlIGNhbnZhcy4gIFRoaXMgaW5jbHVkZXMgdGhlIGxpbmVzXG4gICAgICAgIC8vIHRoYXQgYXJlIHBhcnRpYWxseSByZW5kZXJlZCBhdCB0aGUgdG9wIGFuZCBib3R0b20gb2YgdGhlIGJhc2UgY2FudmFzLlxuICAgICAgICB2YXIgcm93X2hlaWdodCA9IHRoYXQuZ2V0X3Jvd19oZWlnaHQoKTtcbiAgICAgICAgdGhhdC5fdmlzaWJsZV9yb3dfY291bnQgPSBNYXRoLmNlaWwodmFsdWUvcm93X2hlaWdodCkgKyAxO1xuICAgICAgICB0aGF0Ll90ZXh0X2NhbnZhcy5oZWlnaHQgPSB0aGF0Ll92aXNpYmxlX3Jvd19jb3VudCAqIHJvd19oZWlnaHQ7XG4gICAgICAgIHRoYXQuX3RtcF9jYW52YXMuaGVpZ2h0ID0gdGhhdC5fdGV4dF9jYW52YXMuaGVpZ2h0O1xuICAgIH0pO1xuXG4gICAgLy8gU2V0IGluaXRpYWwgY2FudmFzIHNpemVzLiAgVGhlc2UgbGluZXMgbWF5IGxvb2sgcmVkdW5kYW50LCBidXQgYmV3YXJlXG4gICAgLy8gYmVjYXVzZSB0aGV5IGFjdHVhbGx5IGNhdXNlIGFuIGFwcHJvcHJpYXRlIHdpZHRoIGFuZCBoZWlnaHQgdG8gYmUgc2V0IGZvclxuICAgIC8vIHRoZSB0ZXh0IGNhbnZhcyBiZWNhdXNlIG9mIHRoZSBwcm9wZXJ0aWVzIGRlY2xhcmVkIGFib3ZlLlxuICAgIHRoaXMud2lkdGggPSB0aGlzLl9jYW52YXMud2lkdGg7XG4gICAgdGhpcy5oZWlnaHQgPSB0aGlzLl9jYW52YXMuaGVpZ2h0O1xuXG4gICAgdGhpcy5fbW9kZWwub24oJ3RhZ3NfY2hhbmdlZCcsIHV0aWxzLnByb3h5KHRoaXMuX2hhbmRsZV92YWx1ZV9jaGFuZ2VkLCB0aGlzKSk7XG4gICAgdGhpcy5fbW9kZWwub24oJ3RleHRfY2hhbmdlZCcsIHV0aWxzLnByb3h5KHRoaXMuX2hhbmRsZV92YWx1ZV9jaGFuZ2VkLCB0aGlzKSk7XG4gICAgdGhpcy5fbW9kZWwub24oJ3Jvd19jaGFuZ2VkJywgdXRpbHMucHJveHkodGhpcy5faGFuZGxlX3Jvd19jaGFuZ2VkLCB0aGlzKSk7IC8vIFRPRE86IEltcGxlbWVudCBteSBldmVudC5cbn07XG51dGlscy5pbmhlcml0KFJvd1JlbmRlcmVyLCByZW5kZXJlci5SZW5kZXJlckJhc2UpO1xuXG4vKipcbiAqIFJlbmRlciB0byB0aGUgY2FudmFzXG4gKiBOb3RlOiBUaGlzIG1ldGhvZCBpcyBjYWxsZWQgb2Z0ZW4sIHNvIGl0J3MgaW1wb3J0YW50IHRoYXQgaXQnc1xuICogb3B0aW1pemVkIGZvciBzcGVlZC5cbiAqIEBwYXJhbSB7ZGljdGlvbmFyeX0gKG9wdGlvbmFsKSBzY3JvbGwgLSBIb3cgbXVjaCB0aGUgY2FudmFzIHdhcyBzY3JvbGxlZC4gIFRoaXNcbiAqICAgICAgICAgICAgICAgICAgICAgaXMgYSBkaWN0aW9uYXJ5IG9mIHRoZSBmb3JtIHt4OiBmbG9hdCwgeTogZmxvYXR9XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24oc2Nyb2xsKSB7XG5cbiAgICAvLyBJZiBvbmx5IHRoZSB5IGF4aXMgd2FzIHNjcm9sbGVkLCBibGl0IHRoZSBnb29kIGNvbnRlbnRzIGFuZCBqdXN0IHJlbmRlclxuICAgIC8vIHdoYXQncyBtaXNzaW5nLlxuICAgIHZhciBwYXJ0aWFsX3JlZHJhdyA9IChzY3JvbGwgJiYgc2Nyb2xsLnggPT09IDAgJiYgTWF0aC5hYnMoc2Nyb2xsLnkpIDwgdGhpcy5fY2FudmFzLmhlaWdodCk7XG5cbiAgICAvLyBVcGRhdGUgdGhlIHRleHQgcmVuZGVyaW5nXG4gICAgdmFyIHZpc2libGVfcm93cyA9IHRoaXMuZ2V0X3Zpc2libGVfcm93cygpO1xuICAgIHRoaXMuX3JlbmRlcl90ZXh0X2NhbnZhcygtdGhpcy5fc2Nyb2xsaW5nX2NhbnZhcy5zY3JvbGxfbGVmdCwgdmlzaWJsZV9yb3dzLnRvcF9yb3csICFwYXJ0aWFsX3JlZHJhdyk7XG5cbiAgICAvLyBDb3B5IHRoZSB0ZXh0IGltYWdlIHRvIHRoaXMgY2FudmFzXG4gICAgdGhpcy5fY2FudmFzLmNsZWFyKCk7XG4gICAgdGhpcy5fY2FudmFzLmRyYXdfaW1hZ2UoXG4gICAgICAgIHRoaXMuX3RleHRfY2FudmFzLCBcbiAgICAgICAgdGhpcy5fc2Nyb2xsaW5nX2NhbnZhcy5zY3JvbGxfbGVmdCwgXG4gICAgICAgIHRoaXMuZ2V0X3Jvd190b3AodmlzaWJsZV9yb3dzLnRvcF9yb3cpKTtcbn07XG5cbi8qKlxuICogUmVuZGVyIHRleHQgdG8gdGhlIHRleHQgY2FudmFzLlxuICpcbiAqIExhdGVyLCB0aGUgbWFpbiByZW5kZXJpbmcgZnVuY3Rpb24gY2FuIHVzZSB0aGlzIHJlbmRlcmVkIHRleHQgdG8gZHJhdyB0aGVcbiAqIGJhc2UgY2FudmFzLlxuICogQHBhcmFtICB7ZmxvYXR9IHhfb2Zmc2V0IC0gaG9yaXpvbnRhbCBvZmZzZXQgb2YgdGhlIHRleHRcbiAqIEBwYXJhbSAge2ludGVnZXJ9IHRvcF9yb3dcbiAqIEBwYXJhbSAge2Jvb2xlYW59IGZvcmNlX3JlZHJhdyAtIHJlZHJhdyB0aGUgY29udGVudHMgZXZlbiBpZiB0aGV5IGFyZVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoZSBzYW1lIGFzIHRoZSBjYWNoZWQgY29udGVudHMuXG4gKiBAcmV0dXJuIHtudWxsfSAgICAgICAgICBcbiAqL1xuUm93UmVuZGVyZXIucHJvdG90eXBlLl9yZW5kZXJfdGV4dF9jYW52YXMgPSBmdW5jdGlvbih4X29mZnNldCwgdG9wX3JvdywgZm9yY2VfcmVkcmF3KSB7XG5cbiAgICAvLyBUcnkgdG8gcmV1c2Ugc29tZSBvZiB0aGUgYWxyZWFkeSByZW5kZXJlZCB0ZXh0IGlmIHBvc3NpYmxlLlxuICAgIHZhciByZW5kZXJlZCA9IGZhbHNlO1xuICAgIHZhciByb3dfaGVpZ2h0ID0gdGhpcy5nZXRfcm93X2hlaWdodCgpO1xuICAgIGlmICghZm9yY2VfcmVkcmF3ICYmIHRoaXMuX2xhc3RfcmVuZGVyZWRfb2Zmc2V0ID09PSB4X29mZnNldCkge1xuICAgICAgICB2YXIgbGFzdF90b3AgPSB0aGlzLl9sYXN0X3JlbmRlcmVkX3JvdztcbiAgICAgICAgdmFyIHNjcm9sbCA9IHRvcF9yb3cgLSBsYXN0X3RvcDsgLy8gUG9zaXRpdmUgPSB1c2VyIHNjcm9sbGluZyBkb3dud2FyZC5cbiAgICAgICAgaWYgKHNjcm9sbCA8IHRoaXMuX2xhc3RfcmVuZGVyZWRfcm93X2NvdW50KSB7XG5cbiAgICAgICAgICAgIC8vIEdldCBhIHNuYXBzaG90IG9mIHRoZSB0ZXh0IGJlZm9yZSB0aGUgc2Nyb2xsLlxuICAgICAgICAgICAgdGhpcy5fdG1wX2NhbnZhcy5jbGVhcigpO1xuICAgICAgICAgICAgdGhpcy5fdG1wX2NhbnZhcy5kcmF3X2ltYWdlKHRoaXMuX3RleHRfY2FudmFzLCAwLCAwKTtcblxuICAgICAgICAgICAgLy8gUmVuZGVyIHRoZSBuZXcgdGV4dC5cbiAgICAgICAgICAgIHZhciBzYXZlZF9yb3dzID0gdGhpcy5fbGFzdF9yZW5kZXJlZF9yb3dfY291bnQgLSBNYXRoLmFicyhzY3JvbGwpO1xuICAgICAgICAgICAgdmFyIG5ld19yb3dzID0gdGhpcy5fdmlzaWJsZV9yb3dfY291bnQgLSBzYXZlZF9yb3dzO1xuICAgICAgICAgICAgaWYgKHNjcm9sbCA+IDApIHtcbiAgICAgICAgICAgICAgICAvLyBSZW5kZXIgdGhlIGJvdHRvbS5cbiAgICAgICAgICAgICAgICB0aGlzLl90ZXh0X2NhbnZhcy5jbGVhcigpO1xuICAgICAgICAgICAgICAgIGZvciAoaSA9IHRvcF9yb3crc2F2ZWRfcm93czsgaSA8IHRvcF9yb3crdGhpcy5fdmlzaWJsZV9yb3dfY291bnQ7IGkrKykgeyAgICAgXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3JlbmRlcl9yb3coaSwgeF9vZmZzZXQsIChpIC0gdG9wX3JvdykgKiByb3dfaGVpZ2h0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHNjcm9sbCA8IDApIHtcbiAgICAgICAgICAgICAgICAvLyBSZW5kZXIgdGhlIHRvcC5cbiAgICAgICAgICAgICAgICB0aGlzLl90ZXh0X2NhbnZhcy5jbGVhcigpO1xuICAgICAgICAgICAgICAgIGZvciAoaSA9IHRvcF9yb3c7IGkgPCB0b3Bfcm93K25ld19yb3dzOyBpKyspIHsgICBcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fcmVuZGVyX3JvdyhpLCB4X29mZnNldCwgKGkgLSB0b3Bfcm93KSAqIHJvd19oZWlnaHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gTm90aGluZyBoYXMgY2hhbmdlZC5cbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVzZSB0aGUgb2xkIGNvbnRlbnQgdG8gZmlsbCBpbiB0aGUgcmVzdC5cbiAgICAgICAgICAgIHRoaXMuX3RleHRfY2FudmFzLmRyYXdfaW1hZ2UodGhpcy5fdG1wX2NhbnZhcywgMCwgLXNjcm9sbCAqIHRoaXMuZ2V0X3Jvd19oZWlnaHQoKSk7XG4gICAgICAgICAgICB0aGlzLnRyaWdnZXIoJ3Jvd3NfY2hhbmdlZCcsIHRvcF9yb3csIHRvcF9yb3cgKyB0aGlzLl92aXNpYmxlX3Jvd19jb3VudCAtIDEpO1xuICAgICAgICAgICAgcmVuZGVyZWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gRnVsbCByZW5kZXJpbmcuXG4gICAgaWYgKCFyZW5kZXJlZCkge1xuICAgICAgICB0aGlzLl90ZXh0X2NhbnZhcy5jbGVhcigpO1xuXG4gICAgICAgIC8vIFJlbmRlciB0aWxsIHRoZXJlIGFyZSBubyByb3dzIGxlZnQsIG9yIHRoZSB0b3Agb2YgdGhlIHJvdyBpc1xuICAgICAgICAvLyBiZWxvdyB0aGUgYm90dG9tIG9mIHRoZSB2aXNpYmxlIGFyZWEuXG4gICAgICAgIGZvciAoaSA9IHRvcF9yb3c7IGkgPCB0b3Bfcm93ICsgdGhpcy5fdmlzaWJsZV9yb3dfY291bnQ7IGkrKykgeyAgICAgICAgXG4gICAgICAgICAgICB0aGlzLl9yZW5kZXJfcm93KGksIHhfb2Zmc2V0LCAoaSAtIHRvcF9yb3cpICogcm93X2hlaWdodCk7XG4gICAgICAgIH0gICBcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdyb3dzX2NoYW5nZWQnLCB0b3Bfcm93LCB0b3Bfcm93ICsgdGhpcy5fdmlzaWJsZV9yb3dfY291bnQgLSAxKTtcbiAgICB9XG5cbiAgICAvLyBSZW1lbWJlciBmb3IgZGVsdGEgcmVuZGVyaW5nLlxuICAgIHRoaXMuX2xhc3RfcmVuZGVyZWRfcm93ID0gdG9wX3JvdztcbiAgICB0aGlzLl9sYXN0X3JlbmRlcmVkX3Jvd19jb3VudCA9IHRoaXMuX3Zpc2libGVfcm93X2NvdW50O1xuICAgIHRoaXMuX2xhc3RfcmVuZGVyZWRfb2Zmc2V0ID0geF9vZmZzZXQ7XG59O1xuXG4vKipcbiAqIEdldHMgdGhlIHJvdyBhbmQgY2hhcmFjdGVyIGluZGljaWVzIGNsb3Nlc3QgdG8gZ2l2ZW4gY29udHJvbCBzcGFjZSBjb29yZGluYXRlcy5cbiAqIEBwYXJhbSAge2Zsb2F0fSBjdXJzb3JfeCAtIHggdmFsdWUsIDAgaXMgdGhlIGxlZnQgb2YgdGhlIGNhbnZhcy5cbiAqIEBwYXJhbSAge2Zsb2F0fSBjdXJzb3JfeSAtIHkgdmFsdWUsIDAgaXMgdGhlIHRvcCBvZiB0aGUgY2FudmFzLlxuICogQHJldHVybiB7ZGljdGlvbmFyeX0gZGljdGlvbmFyeSBvZiB0aGUgZm9ybSB7cm93X2luZGV4LCBjaGFyX2luZGV4fVxuICovXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuZ2V0X3Jvd19jaGFyID0gZnVuY3Rpb24oY3Vyc29yX3gsIGN1cnNvcl95KSB7XG4gICAgdmFyIHJvd19pbmRleCA9IE1hdGguZmxvb3IoY3Vyc29yX3kgLyB0aGlzLmdldF9yb3dfaGVpZ2h0KCkpO1xuXG4gICAgLy8gRmluZCB0aGUgY2hhcmFjdGVyIGluZGV4LlxuICAgIHZhciB3aWR0aHMgPSBbMF07XG4gICAgdHJ5IHtcbiAgICAgICAgZm9yICh2YXIgbGVuZ3RoPTE7IGxlbmd0aDw9dGhpcy5fbW9kZWwuX3Jvd3Nbcm93X2luZGV4XS5sZW5ndGg7IGxlbmd0aCsrKSB7XG4gICAgICAgICAgICB3aWR0aHMucHVzaCh0aGlzLm1lYXN1cmVfcGFydGlhbF9yb3dfd2lkdGgocm93X2luZGV4LCBsZW5ndGgpKTtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gTm9tIG5vbSBub20uLi5cbiAgICB9XG4gICAgdmFyIGNvb3JkcyA9IHRoaXMuX21vZGVsLnZhbGlkYXRlX2Nvb3Jkcyhyb3dfaW5kZXgsIHV0aWxzLmZpbmRfY2xvc2VzdCh3aWR0aHMsIGN1cnNvcl94ICsgdGhpcy5fc2Nyb2xsaW5nX2NhbnZhcy5zY3JvbGxfbGVmdCkpO1xuICAgIHJldHVybiB7XG4gICAgICAgIHJvd19pbmRleDogY29vcmRzLnN0YXJ0X3JvdyxcbiAgICAgICAgY2hhcl9pbmRleDogY29vcmRzLnN0YXJ0X2NoYXIsXG4gICAgfTtcbn07XG5cbi8qKlxuICogTWVhc3VyZXMgdGhlIHBhcnRpYWwgd2lkdGggb2YgYSB0ZXh0IHJvdy5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IGluZGV4XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSAob3B0aW9uYWwpIGxlbmd0aCAtIG51bWJlciBvZiBjaGFyYWN0ZXJzXG4gKiBAcmV0dXJuIHtmbG9hdH0gd2lkdGhcbiAqL1xuUm93UmVuZGVyZXIucHJvdG90eXBlLm1lYXN1cmVfcGFydGlhbF9yb3dfd2lkdGggPSBmdW5jdGlvbihpbmRleCwgbGVuZ3RoKSB7XG4gICAgaWYgKGluZGV4ID49IHRoaXMuX21vZGVsLl9yb3dzLmxlbmd0aCkgeyByZXR1cm4gMDsgfVxuICAgIHZhciB0ZXh0ID0gdGhpcy5fbW9kZWwuX3Jvd3NbaW5kZXhdO1xuICAgIHRleHQgPSBsZW5ndGggPT09IHVuZGVmaW5lZCA/IHRleHQgOiB0ZXh0LnN1YnN0cmluZygwLCBsZW5ndGgpO1xuICAgIHJldHVybiB0aGlzLl9jYW52YXMubWVhc3VyZV90ZXh0KHRleHQsIHRoaXMuX2Jhc2Vfb3B0aW9ucyk7XG59O1xuXG4vKipcbiAqIE1lYXN1cmVzIHRoZSBoZWlnaHQgb2YgYSB0ZXh0IHJvdyBhcyBpZiBpdCB3ZXJlIHJlbmRlcmVkLlxuICogQHBhcmFtICB7aW50ZWdlcn0gKG9wdGlvbmFsKSBpbmRleFxuICogQHJldHVybiB7ZmxvYXR9IGhlaWdodFxuICovXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuZ2V0X3Jvd19oZWlnaHQgPSBmdW5jdGlvbihpbmRleCkge1xuICAgIHJldHVybiB0aGlzLl9iYXNlX29wdGlvbnMuZm9udF9zaXplICsgdGhpcy5fbGluZV9zcGFjaW5nO1xufTtcblxuLyoqXG4gKiBHZXRzIHRoZSB0b3Agb2YgdGhlIHJvdyB3aGVuIHJlbmRlcmVkXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBpbmRleFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuUm93UmVuZGVyZXIucHJvdG90eXBlLmdldF9yb3dfdG9wID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICByZXR1cm4gaW5kZXggKiB0aGlzLmdldF9yb3dfaGVpZ2h0KCk7XG59O1xuXG4vKipcbiAqIEdldHMgdGhlIHZpc2libGUgcm93cy5cbiAqIEByZXR1cm4ge2RpY3Rpb25hcnl9IGRpY3Rpb25hcnkgY29udGFpbmluZyBpbmZvcm1hdGlvbiBhYm91dCBcbiAqICAgICAgICAgICAgICAgICAgICAgIHRoZSB2aXNpYmxlIHJvd3MuICBGb3JtYXQge3RvcF9yb3csIFxuICogICAgICAgICAgICAgICAgICAgICAgYm90dG9tX3Jvdywgcm93X2NvdW50fS5cbiAqL1xuUm93UmVuZGVyZXIucHJvdG90eXBlLmdldF92aXNpYmxlX3Jvd3MgPSBmdW5jdGlvbigpIHtcblxuICAgIC8vIEZpbmQgdGhlIHJvdyBjbG9zZXN0IHRvIHRoZSBzY3JvbGwgdG9wLiAgSWYgdGhhdCByb3cgaXMgYmVsb3dcbiAgICAvLyB0aGUgc2Nyb2xsIHRvcCwgdXNlIHRoZSBwYXJ0aWFsbHkgZGlzcGxheWVkIHJvdyBhYm92ZSBpdC5cbiAgICB2YXIgdG9wX3JvdyA9IE1hdGgubWF4KDAsIE1hdGguZmxvb3IodGhpcy5fc2Nyb2xsaW5nX2NhbnZhcy5zY3JvbGxfdG9wICAvIHRoaXMuZ2V0X3Jvd19oZWlnaHQoKSkpO1xuXG4gICAgLy8gRmluZCB0aGUgcm93IGNsb3Nlc3QgdG8gdGhlIHNjcm9sbCBib3R0b20uICBJZiB0aGF0IHJvdyBpcyBhYm92ZVxuICAgIC8vIHRoZSBzY3JvbGwgYm90dG9tLCB1c2UgdGhlIHBhcnRpYWxseSBkaXNwbGF5ZWQgcm93IGJlbG93IGl0LlxuICAgIHZhciByb3dfY291bnQgPSBNYXRoLmNlaWwodGhpcy5fY2FudmFzLmhlaWdodCAvIHRoaXMuZ2V0X3Jvd19oZWlnaHQoKSk7XG4gICAgdmFyIGJvdHRvbV9yb3cgPSB0b3Bfcm93ICsgcm93X2NvdW50O1xuXG4gICAgLy8gUm93IGNvdW50ICsgMSB0byBpbmNsdWRlIGZpcnN0IHJvdy5cbiAgICByZXR1cm4ge3RvcF9yb3c6IHRvcF9yb3csIGJvdHRvbV9yb3c6IGJvdHRvbV9yb3csIHJvd19jb3VudDogcm93X2NvdW50KzF9O1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIHdoZW4gdGhlIG1vZGVsJ3MgdmFsdWUgY2hhbmdlc1xuICogQ29tcGxleGl0eTogTyhOKSBmb3IgTiByb3dzIG9mIHRleHQuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuX2hhbmRsZV92YWx1ZV9jaGFuZ2VkID0gZnVuY3Rpb24oKSB7XG5cbiAgICAvLyBDYWxjdWxhdGUgdGhlIGRvY3VtZW50IHdpZHRoLlxuICAgIHZhciBkb2N1bWVudF93aWR0aCA9IDA7XG4gICAgZm9yICh2YXIgaT0wOyBpPHRoaXMuX21vZGVsLl9yb3dzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGRvY3VtZW50X3dpZHRoID0gTWF0aC5tYXgodGhpcy5fbWVhc3VyZV9yb3dfd2lkdGgoaSksIGRvY3VtZW50X3dpZHRoKTtcbiAgICB9XG4gICAgdGhpcy5fc2Nyb2xsaW5nX2NhbnZhcy5zY3JvbGxfd2lkdGggPSBkb2N1bWVudF93aWR0aDtcbiAgICB0aGlzLl9zY3JvbGxpbmdfY2FudmFzLnNjcm9sbF9oZWlnaHQgPSB0aGlzLl9tb2RlbC5fcm93cy5sZW5ndGggKiB0aGlzLmdldF9yb3dfaGVpZ2h0KCk7XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgd2hlbiBvbmUgb2YgdGhlIG1vZGVsJ3Mgcm93cyBjaGFuZ2VcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5faGFuZGxlX3Jvd19jaGFuZ2VkID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICB0aGlzLl9zY3JvbGxpbmdfY2FudmFzLnNjcm9sbF93aWR0aCA9IE1hdGgubWF4KHRoaXMuX21lYXN1cmVfcm93X3dpZHRoKGluZGV4KSwgdGhpcy5fc2Nyb2xsaW5nX2NhbnZhcy5zY3JvbGxfd2lkdGgpO1xufTtcblxuLyoqXG4gKiBSZW5kZXIgYSBzaW5nbGUgcm93XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBpbmRleFxuICogQHBhcmFtICB7ZmxvYXR9IHhcbiAqIEBwYXJhbSAge2Zsb2F0fSB5XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuX3JlbmRlcl9yb3cgPSBmdW5jdGlvbihpbmRleCwgeCAseSkge1xuICAgIHRoaXMuX3RleHRfY2FudmFzLmRyYXdfdGV4dCh4LCB5LCB0aGlzLl9tb2RlbC5fcm93c1tpbmRleF0sIHRoaXMuX2Jhc2Vfb3B0aW9ucyk7XG59O1xuXG4vKipcbiAqIE1lYXN1cmVzIHRoZSB3aWR0aCBvZiBhIHRleHQgcm93IGFzIGlmIGl0IHdlcmUgcmVuZGVyZWQuXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBpbmRleFxuICogQHJldHVybiB7ZmxvYXR9IHdpZHRoXG4gKi9cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5fbWVhc3VyZV9yb3dfd2lkdGggPSBmdW5jdGlvbihpbmRleCkge1xuICAgIHJldHVybiB0aGlzLm1lYXN1cmVfcGFydGlhbF9yb3dfd2lkdGgoaW5kZXgsIHRoaXMuX21vZGVsLl9yb3dzW2luZGV4XS5sZW5ndGgpO1xufTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5Sb3dSZW5kZXJlciA9IFJvd1JlbmRlcmVyO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIGFuaW1hdG9yID0gcmVxdWlyZSgnLi4vYW5pbWF0b3IuanMnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzLmpzJyk7XG52YXIgcmVuZGVyZXIgPSByZXF1aXJlKCcuL3JlbmRlcmVyLmpzJyk7XG5cbi8qKlxuICogUmVuZGVyIGRvY3VtZW50IHNlbGVjdGlvbiBib3hlc1xuICpcbiAqIFRPRE86IE9ubHkgcmVuZGVyIHZpc2libGUuXG4gKi9cbnZhciBTZWxlY3Rpb25zUmVuZGVyZXIgPSBmdW5jdGlvbihjdXJzb3JzLCBzdHlsZSwgcm93X3JlbmRlcmVyLCBoYXNfZm9jdXMpIHtcbiAgICByZW5kZXJlci5SZW5kZXJlckJhc2UuY2FsbCh0aGlzKTtcbiAgICB0aGlzLnN0eWxlID0gc3R5bGU7XG4gICAgdGhpcy5faGFzX2ZvY3VzID0gaGFzX2ZvY3VzO1xuXG4gICAgLy8gV2hlbiB0aGUgY3Vyc29ycyBjaGFuZ2UsIHJlZHJhdyB0aGUgc2VsZWN0aW9uIGJveChlcykuXG4gICAgdGhpcy5fY3Vyc29ycyA9IGN1cnNvcnM7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMuX2N1cnNvcnMub24oJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGF0LnJlbmRlcigpO1xuICAgICAgICAvLyBUZWxsIHBhcmVudCBsYXllciB0aGlzIG9uZSBoYXMgY2hhbmdlZC5cbiAgICAgICAgdGhhdC50cmlnZ2VyKCdjaGFuZ2VkJyk7XG4gICAgfSk7XG5cbiAgICB0aGlzLl9nZXRfdmlzaWJsZV9yb3dzID0gdXRpbHMucHJveHkocm93X3JlbmRlcmVyLmdldF92aXNpYmxlX3Jvd3MsIHJvd19yZW5kZXJlcik7XG4gICAgdGhpcy5fZ2V0X3Jvd19oZWlnaHQgPSB1dGlscy5wcm94eShyb3dfcmVuZGVyZXIuZ2V0X3Jvd19oZWlnaHQsIHJvd19yZW5kZXJlcik7XG4gICAgdGhpcy5fZ2V0X3Jvd190b3AgPSB1dGlscy5wcm94eShyb3dfcmVuZGVyZXIuZ2V0X3Jvd190b3AsIHJvd19yZW5kZXJlcik7XG4gICAgdGhpcy5fbWVhc3VyZV9wYXJ0aWFsX3JvdyA9IHV0aWxzLnByb3h5KHJvd19yZW5kZXJlci5tZWFzdXJlX3BhcnRpYWxfcm93X3dpZHRoLCByb3dfcmVuZGVyZXIpO1xufTtcbnV0aWxzLmluaGVyaXQoU2VsZWN0aW9uc1JlbmRlcmVyLCByZW5kZXJlci5SZW5kZXJlckJhc2UpO1xuXG4vKipcbiAqIFJlbmRlciB0byB0aGUgY2FudmFzXG4gKiBOb3RlOiBUaGlzIG1ldGhvZCBpcyBjYWxsZWQgb2Z0ZW4sIHNvIGl0J3MgaW1wb3J0YW50IHRoYXQgaXQnc1xuICogb3B0aW1pemVkIGZvciBzcGVlZC5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblNlbGVjdGlvbnNSZW5kZXJlci5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fY2FudmFzLmNsZWFyKCk7XG5cbiAgICAvLyBPbmx5IHJlbmRlciBpZiB0aGUgY2FudmFzIGhhcyBmb2N1cy5cbiAgICBpZiAodGhpcy5faGFzX2ZvY3VzKCkpIHtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICB0aGlzLl9jdXJzb3JzLmN1cnNvcnMuZm9yRWFjaChmdW5jdGlvbihjdXJzb3IpIHtcbiAgICAgICAgICAgIC8vIEdldCB0aGUgdmlzaWJsZSByb3dzLlxuICAgICAgICAgICAgdmFyIHZpc2libGVfcm93cyA9IHRoYXQuX2dldF92aXNpYmxlX3Jvd3MoKTtcblxuICAgICAgICAgICAgLy8gRHJhdyB0aGUgc2VsZWN0aW9uIGJveC5cbiAgICAgICAgICAgIGlmIChjdXJzb3Iuc3RhcnRfcm93ICE9PSBudWxsICYmIGN1cnNvci5zdGFydF9jaGFyICE9PSBudWxsICYmXG4gICAgICAgICAgICAgICAgY3Vyc29yLmVuZF9yb3cgIT09IG51bGwgJiYgY3Vyc29yLmVuZF9jaGFyICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgXG5cbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gTWF0aC5tYXgoY3Vyc29yLnN0YXJ0X3JvdywgdmlzaWJsZV9yb3dzLnRvcF9yb3cpOyBcbiAgICAgICAgICAgICAgICAgICAgaSA8PSBNYXRoLm1pbihjdXJzb3IuZW5kX3JvdywgdmlzaWJsZV9yb3dzLmJvdHRvbV9yb3cpOyBcbiAgICAgICAgICAgICAgICAgICAgaSsrKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGxlZnQgPSAwO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaSA9PSBjdXJzb3Iuc3RhcnRfcm93ICYmIGN1cnNvci5zdGFydF9jaGFyID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGVmdCA9IHRoYXQuX21lYXN1cmVfcGFydGlhbF9yb3coaSwgY3Vyc29yLnN0YXJ0X2NoYXIpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgdGhhdC5fY2FudmFzLmRyYXdfcmVjdGFuZ2xlKFxuICAgICAgICAgICAgICAgICAgICAgICAgbGVmdCwgXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0Ll9nZXRfcm93X3RvcChpKSwgXG4gICAgICAgICAgICAgICAgICAgICAgICBpICE9PSBjdXJzb3IuZW5kX3JvdyA/IHRoYXQuX21lYXN1cmVfcGFydGlhbF9yb3coaSkgLSBsZWZ0IDogdGhhdC5fbWVhc3VyZV9wYXJ0aWFsX3JvdyhpLCBjdXJzb3IuZW5kX2NoYXIpIC0gbGVmdCwgXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0Ll9nZXRfcm93X2hlaWdodChpKSwgXG4gICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsbF9jb2xvcjogJ3NreWJsdWUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFscGhhOiAwLjUsXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG59O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLlNlbGVjdGlvbnNSZW5kZXJlciA9IFNlbGVjdGlvbnNSZW5kZXJlcjtcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG52YXIgY2FudmFzID0gcmVxdWlyZSgnLi9jYW52YXMuanMnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKTtcblxuLyoqXG4gKiBIVE1MIGNhbnZhcyB3aXRoIGRyYXdpbmcgY29udmluaWVuY2UgZnVuY3Rpb25zLlxuICovXG52YXIgU2Nyb2xsaW5nQ2FudmFzID0gZnVuY3Rpb24oKSB7XG4gICAgY2FudmFzLkNhbnZhcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMuX2JpbmRfZXZlbnRzKCk7XG4gICAgdGhpcy5fb2xkX3Njcm9sbF9sZWZ0ID0gMDtcbiAgICB0aGlzLl9vbGRfc2Nyb2xsX3RvcCA9IDA7XG5cbiAgICAvLyBTZXQgZGVmYXVsdCBzaXplLlxuICAgIHRoaXMud2lkdGggPSA0MDA7XG4gICAgdGhpcy5oZWlnaHQgPSAzMDA7XG59O1xudXRpbHMuaW5oZXJpdChTY3JvbGxpbmdDYW52YXMsIGNhbnZhcy5DYW52YXMpO1xuXG4vKipcbiAqIENhdXNlcyB0aGUgY2FudmFzIGNvbnRlbnRzIHRvIGJlIHJlZHJhd24uXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5TY3JvbGxpbmdDYW52YXMucHJvdG90eXBlLnJlZHJhdyA9IGZ1bmN0aW9uKHNjcm9sbCkge1xuICAgIHRoaXMuY2xlYXIoKTtcbiAgICB0aGlzLnRyaWdnZXIoJ3JlZHJhdycsIHNjcm9sbCk7XG59O1xuXG4vKipcbiAqIExheW91dCB0aGUgZWxlbWVudHMgZm9yIHRoZSBjYW52YXMuXG4gKiBDcmVhdGVzIGB0aGlzLmVsYFxuICogXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5TY3JvbGxpbmdDYW52YXMucHJvdG90eXBlLl9sYXlvdXQgPSBmdW5jdGlvbigpIHtcbiAgICBjYW52YXMuQ2FudmFzLnByb3RvdHlwZS5fbGF5b3V0LmNhbGwodGhpcyk7XG4gICAgLy8gQ2hhbmdlIHRoZSBjYW52YXMgY2xhc3Mgc28gaXQncyBub3QgaGlkZGVuLlxuICAgIHRoaXMuX2NhbnZhcy5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ2NhbnZhcycpO1xuXG4gICAgdGhpcy5lbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIHRoaXMuZWwuc2V0QXR0cmlidXRlKCdjbGFzcycsICdwb3N0ZXIgc2Nyb2xsLXdpbmRvdycpO1xuICAgIHRoaXMuZWwuc2V0QXR0cmlidXRlKCd0YWJpbmRleCcsIDApO1xuICAgIHRoaXMuX3Njcm9sbF9iYXJzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgdGhpcy5fc2Nyb2xsX2JhcnMuc2V0QXR0cmlidXRlKCdjbGFzcycsICdzY3JvbGwtYmFycycpO1xuICAgIHRoaXMuX3RvdWNoX3BhbmUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICB0aGlzLl90b3VjaF9wYW5lLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAndG91Y2gtcGFuZScpO1xuICAgIHRoaXMuX2R1bW15ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgdGhpcy5fZHVtbXkuc2V0QXR0cmlidXRlKCdjbGFzcycsICdzY3JvbGwtZHVtbXknKTtcblxuICAgIHRoaXMuZWwuYXBwZW5kQ2hpbGQodGhpcy5fY2FudmFzKTtcbiAgICB0aGlzLmVsLmFwcGVuZENoaWxkKHRoaXMuX3Njcm9sbF9iYXJzKTtcbiAgICB0aGlzLl9zY3JvbGxfYmFycy5hcHBlbmRDaGlsZCh0aGlzLl9kdW1teSk7XG4gICAgdGhpcy5fc2Nyb2xsX2JhcnMuYXBwZW5kQ2hpbGQodGhpcy5fdG91Y2hfcGFuZSk7XG59O1xuXG4vKipcbiAqIE1ha2UgdGhlIHByb3BlcnRpZXMgb2YgdGhlIGNsYXNzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuU2Nyb2xsaW5nQ2FudmFzLnByb3RvdHlwZS5faW5pdF9wcm9wZXJ0aWVzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogV2lkdGggb2YgdGhlIHNjcm9sbGFibGUgY2FudmFzIGFyZWFcbiAgICAgKi9cbiAgICB0aGlzLnByb3BlcnR5KCdzY3JvbGxfd2lkdGgnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gR2V0XG4gICAgICAgIHJldHVybiB0aGF0Ll9zY3JvbGxfd2lkdGggfHwgMDtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAvLyBTZXRcbiAgICAgICAgdGhhdC5fc2Nyb2xsX3dpZHRoID0gdmFsdWU7XG4gICAgICAgIHRoYXQuX21vdmVfZHVtbXkodGhhdC5fc2Nyb2xsX3dpZHRoLCB0aGF0Ll9zY3JvbGxfaGVpZ2h0IHx8IDApO1xuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogSGVpZ2h0IG9mIHRoZSBzY3JvbGxhYmxlIGNhbnZhcyBhcmVhLlxuICAgICAqL1xuICAgIHRoaXMucHJvcGVydHkoJ3Njcm9sbF9oZWlnaHQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gR2V0XG4gICAgICAgIHJldHVybiB0aGF0Ll9zY3JvbGxfaGVpZ2h0IHx8IDA7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgLy8gU2V0XG4gICAgICAgIHRoYXQuX3Njcm9sbF9oZWlnaHQgPSB2YWx1ZTtcbiAgICAgICAgdGhhdC5fbW92ZV9kdW1teSh0aGF0Ll9zY3JvbGxfd2lkdGggfHwgMCwgdGhhdC5fc2Nyb2xsX2hlaWdodCk7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBUb3AgbW9zdCBwaXhlbCBpbiB0aGUgc2Nyb2xsZWQgd2luZG93LlxuICAgICAqL1xuICAgIHRoaXMucHJvcGVydHkoJ3Njcm9sbF90b3AnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gR2V0XG4gICAgICAgIHJldHVybiB0aGF0Ll9zY3JvbGxfYmFycy5zY3JvbGxUb3A7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgLy8gU2V0XG4gICAgICAgIHRoYXQuX3Njcm9sbF9iYXJzLnNjcm9sbFRvcCA9IHZhbHVlO1xuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogTGVmdCBtb3N0IHBpeGVsIGluIHRoZSBzY3JvbGxlZCB3aW5kb3cuXG4gICAgICovXG4gICAgdGhpcy5wcm9wZXJ0eSgnc2Nyb2xsX2xlZnQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gR2V0XG4gICAgICAgIHJldHVybiB0aGF0Ll9zY3JvbGxfYmFycy5zY3JvbGxMZWZ0O1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIC8vIFNldFxuICAgICAgICB0aGF0Ll9zY3JvbGxfYmFycy5zY3JvbGxMZWZ0ID0gdmFsdWU7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBIZWlnaHQgb2YgdGhlIGNhbnZhc1xuICAgICAqIEByZXR1cm4ge2Zsb2F0fVxuICAgICAqL1xuICAgIHRoaXMucHJvcGVydHkoJ2hlaWdodCcsIGZ1bmN0aW9uKCkgeyBcbiAgICAgICAgcmV0dXJuIHRoYXQuX2NhbnZhcy5oZWlnaHQgLyAyOyBcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0Ll9jYW52YXMuc2V0QXR0cmlidXRlKCdoZWlnaHQnLCB2YWx1ZSAqIDIpO1xuICAgICAgICB0aGF0LmVsLnNldEF0dHJpYnV0ZSgnc3R5bGUnLCAnd2lkdGg6ICcgKyB0aGF0LndpZHRoICsgJzsgaGVpZ2h0OiAnICsgdmFsdWUgKyAnOycpO1xuXG4gICAgICAgIHRoYXQudHJpZ2dlcigncmVzaXplJywge2hlaWdodDogdmFsdWV9KTtcbiAgICAgICAgdGhhdC5fdHJ5X3JlZHJhdygpO1xuICAgICAgICBcbiAgICAgICAgLy8gU3RyZXRjaCB0aGUgaW1hZ2UgZm9yIHJldGluYSBzdXBwb3J0LlxuICAgICAgICB0aGlzLnNjYWxlKDIsMik7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBXaWR0aCBvZiB0aGUgY2FudmFzXG4gICAgICogQHJldHVybiB7ZmxvYXR9XG4gICAgICovXG4gICAgdGhpcy5wcm9wZXJ0eSgnd2lkdGgnLCBmdW5jdGlvbigpIHsgXG4gICAgICAgIHJldHVybiB0aGF0Ll9jYW52YXMud2lkdGggLyAyOyBcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0Ll9jYW52YXMuc2V0QXR0cmlidXRlKCd3aWR0aCcsIHZhbHVlICogMik7XG4gICAgICAgIHRoYXQuZWwuc2V0QXR0cmlidXRlKCdzdHlsZScsICd3aWR0aDogJyArIHZhbHVlICsgJzsgaGVpZ2h0OiAnICsgdGhhdC5oZWlnaHQgKyAnOycpO1xuXG4gICAgICAgIHRoYXQudHJpZ2dlcigncmVzaXplJywge3dpZHRoOiB2YWx1ZX0pO1xuICAgICAgICB0aGF0Ll90cnlfcmVkcmF3KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTdHJldGNoIHRoZSBpbWFnZSBmb3IgcmV0aW5hIHN1cHBvcnQuXG4gICAgICAgIHRoaXMuc2NhbGUoMiwyKTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIElzIHRoZSBjYW52YXMgb3IgcmVsYXRlZCBlbGVtZW50cyBmb2N1c2VkP1xuICAgICAqIEByZXR1cm4ge2Jvb2xlYW59XG4gICAgICovXG4gICAgdGhpcy5wcm9wZXJ0eSgnZm9jdXNlZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gZG9jdW1lbnQuYWN0aXZlRWxlbWVudCA9PT0gdGhhdC5lbCB8fFxuICAgICAgICAgICAgZG9jdW1lbnQuYWN0aXZlRWxlbWVudCA9PT0gdGhhdC5fc2Nyb2xsX2JhcnMgfHxcbiAgICAgICAgICAgIGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQgPT09IHRoYXQuX2R1bW15IHx8XG4gICAgICAgICAgICBkb2N1bWVudC5hY3RpdmVFbGVtZW50ID09PSB0aGF0Ll9jYW52YXM7XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIEJpbmQgdG8gdGhlIGV2ZW50cyBvZiB0aGUgY2FudmFzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuU2Nyb2xsaW5nQ2FudmFzLnByb3RvdHlwZS5fYmluZF9ldmVudHMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG5cbiAgICAvLyBUcmlnZ2VyIHNjcm9sbCBhbmQgcmVkcmF3IGV2ZW50cyBvbiBzY3JvbGwuXG4gICAgdGhpcy5fc2Nyb2xsX2JhcnMub25zY3JvbGwgPSBmdW5jdGlvbihlKSB7XG4gICAgICAgIHRoYXQudHJpZ2dlcignc2Nyb2xsJywgZSk7XG4gICAgICAgIGlmICh0aGF0Ll9vbGRfc2Nyb2xsX3RvcCAhPT0gdW5kZWZpbmVkICYmIHRoYXQuX29sZF9zY3JvbGxfbGVmdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB2YXIgc2Nyb2xsID0ge1xuICAgICAgICAgICAgICAgIHg6IHRoYXQuc2Nyb2xsX2xlZnQgLSB0aGF0Ll9vbGRfc2Nyb2xsX2xlZnQsXG4gICAgICAgICAgICAgICAgeTogdGhhdC5zY3JvbGxfdG9wIC0gdGhhdC5fb2xkX3Njcm9sbF90b3AsXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdGhhdC5fdHJ5X3JlZHJhdyhzY3JvbGwpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhhdC5fdHJ5X3JlZHJhdygpO1xuICAgICAgICB9XG4gICAgICAgIHRoYXQuX29sZF9zY3JvbGxfbGVmdCA9IHRoYXQuc2Nyb2xsX2xlZnQ7XG4gICAgICAgIHRoYXQuX29sZF9zY3JvbGxfdG9wID0gdGhhdC5zY3JvbGxfdG9wO1xuICAgIH07XG5cbiAgICAvLyBQcmV2ZW50IHNjcm9sbCBiYXIgaGFuZGxlZCBtb3VzZSBldmVudHMgZnJvbSBidWJibGluZy5cbiAgICB2YXIgc2Nyb2xsYmFyX2V2ZW50ID0gZnVuY3Rpb24oZSkge1xuICAgICAgICBpZiAoZS50YXJnZXQgIT09IHRoYXQuX3RvdWNoX3BhbmUpIHtcbiAgICAgICAgICAgIHV0aWxzLmNhbmNlbF9idWJibGUoZSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHRoaXMuX3Njcm9sbF9iYXJzLm9ubW91c2Vkb3duID0gc2Nyb2xsYmFyX2V2ZW50O1xuICAgIHRoaXMuX3Njcm9sbF9iYXJzLm9ubW91c2V1cCA9IHNjcm9sbGJhcl9ldmVudDtcbiAgICB0aGlzLl9zY3JvbGxfYmFycy5vbmNsaWNrID0gc2Nyb2xsYmFyX2V2ZW50O1xuICAgIHRoaXMuX3Njcm9sbF9iYXJzLm9uZGJsY2xpY2sgPSBzY3JvbGxiYXJfZXZlbnQ7XG59O1xuXG4vKipcbiAqIFF1ZXJpZXMgdG8gc2VlIGlmIHJlZHJhdyBpcyBva2F5LCBhbmQgdGhlbiByZWRyYXdzIGlmIGl0IGlzLlxuICogQHJldHVybiB7Ym9vbGVhbn0gdHJ1ZSBpZiByZWRyYXcgaGFwcGVuZWQuXG4gKi9cblNjcm9sbGluZ0NhbnZhcy5wcm90b3R5cGUuX3RyeV9yZWRyYXcgPSBmdW5jdGlvbihzY3JvbGwpIHtcbiAgICBpZiAodGhpcy5fcXVlcnlfcmVkcmF3KCkpIHtcbiAgICAgICAgdGhpcy5yZWRyYXcoc2Nyb2xsKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn07XG5cbi8qKlxuICogVHJpZ2dlciB0aGUgJ3F1ZXJ5X3JlZHJhdycgZXZlbnQuXG4gKiBAcmV0dXJuIHtib29sZWFufSB0cnVlIGlmIGNvbnRyb2wgc2hvdWxkIHJlZHJhdyBpdHNlbGYuXG4gKi9cblNjcm9sbGluZ0NhbnZhcy5wcm90b3R5cGUuX3F1ZXJ5X3JlZHJhdyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnRyaWdnZXIoJ3F1ZXJ5X3JlZHJhdycpLmV2ZXJ5KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHg7IH0pOyBcbn07XG5cbi8qKlxuICogTW92ZXMgdGhlIGR1bW15IGVsZW1lbnQgdGhhdCBjYXVzZXMgdGhlIHNjcm9sbGJhciB0byBhcHBlYXIuXG4gKiBAcGFyYW0gIHtmbG9hdH0geFxuICogQHBhcmFtICB7ZmxvYXR9IHlcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblNjcm9sbGluZ0NhbnZhcy5wcm90b3R5cGUuX21vdmVfZHVtbXkgPSBmdW5jdGlvbih4LCB5KSB7XG4gICAgdGhpcy5fZHVtbXkuc2V0QXR0cmlidXRlKCdzdHlsZScsICdsZWZ0OiAnICsgU3RyaW5nKHgpICsgJzsgdG9wOiAnICsgU3RyaW5nKHkpICsgJzsnKTtcbiAgICB0aGlzLl90b3VjaF9wYW5lLnNldEF0dHJpYnV0ZSgnc3R5bGUnLCBcbiAgICAgICAgJ3dpZHRoOiAnICsgU3RyaW5nKE1hdGgubWF4KHgsIHRoaXMuX3Njcm9sbF9iYXJzLmNsaWVudFdpZHRoKSkgKyAnOyAnICtcbiAgICAgICAgJ2hlaWdodDogJyArIFN0cmluZyhNYXRoLm1heCh5LCB0aGlzLl9zY3JvbGxfYmFycy5jbGllbnRIZWlnaHQpKSArICc7Jyk7XG59O1xuXG4vKipcbiAqIFRyYW5zZm9ybSBhbiB4IHZhbHVlIGJhc2VkIG9uIHNjcm9sbCBwb3NpdGlvbi5cbiAqIEBwYXJhbSAge2Zsb2F0fSB4XG4gKiBAcGFyYW0gIHtib29sZWFufSBpbnZlcnNlIC0gcGVyZm9ybSBpbnZlcnNlIHRyYW5zZm9ybWF0aW9uXG4gKiBAcmV0dXJuIHtmbG9hdH1cbiAqL1xuU2Nyb2xsaW5nQ2FudmFzLnByb3RvdHlwZS5fdHggPSBmdW5jdGlvbih4LCBpbnZlcnNlKSB7IHJldHVybiB4IC0gKGludmVyc2U/LTE6MSkgKiB0aGlzLnNjcm9sbF9sZWZ0OyB9O1xuXG4vKipcbiAqIFRyYW5zZm9ybSBhIHkgdmFsdWUgYmFzZWQgb24gc2Nyb2xsIHBvc2l0aW9uLlxuICogQHBhcmFtICB7ZmxvYXR9IHlcbiAqIEBwYXJhbSAge2Jvb2xlYW59IGludmVyc2UgLSBwZXJmb3JtIGludmVyc2UgdHJhbnNmb3JtYXRpb25cbiAqIEByZXR1cm4ge2Zsb2F0fVxuICovXG5TY3JvbGxpbmdDYW52YXMucHJvdG90eXBlLl90eSA9IGZ1bmN0aW9uKHksIGludmVyc2UpIHsgcmV0dXJuIHkgLSAoaW52ZXJzZT8tMToxKSAqIHRoaXMuc2Nyb2xsX3RvcDsgfTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5TY3JvbGxpbmdDYW52YXMgPSBTY3JvbGxpbmdDYW52YXM7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG52YXIgc3R5bGVzID0gcmVxdWlyZSgnLi9zdHlsZXMvaW5pdC5qcycpO1xuXG4vKipcbiAqIFN0eWxlXG4gKi9cbnZhciBTdHlsZSA9IGZ1bmN0aW9uKCkge1xuICAgIHV0aWxzLlBvc3RlckNsYXNzLmNhbGwodGhpcywgW1xuICAgICAgICAnY29tbWVudCcsXG4gICAgICAgICd0b2RvJyxcbiAgICAgICAgJ3NwZWNpYWwnLFxuICAgICAgICAnc3RyaW5nJyxcbiAgICAgICAgJ2NoYXJhY3RlcicsXG4gICAgICAgICdjb25kaXRpb25hbCcsXG4gICAgICAgICdyZXBlYXQnLFxuICAgICAgICAnb3BlcmF0b3InLFxuICAgICAgICAndHlwZScsXG4gICAgICAgICdzdGF0ZW1lbnQnLFxuICAgICAgICAnZnVuY3Rpb24nLFxuICAgICAgICAnZXJyb3InLFxuICAgICAgICAnYm9vbGVhbicsXG4gICAgICAgICdpZGVudGlmaWVyJyxcbiAgICAgICAgJ2xhYmVsJyxcbiAgICAgICAgJ2V4Y2VwdGlvbicsXG4gICAgICAgICdrZXl3b3JkJyxcbiAgICAgICAgJ2RlYnVnJyxcbiAgICAgICAgJ3RleHQnLFxuICAgICAgICAnYmFja2dyb3VuZCcsXG4gICAgXSk7XG5cbiAgICAvLyBMb2FkIHRoZSBkZWZhdWx0IHN0eWxlLlxuICAgIHRoaXMubG9hZCgnbW9ub2thaScpO1xufTtcbnV0aWxzLmluaGVyaXQoU3R5bGUsIHV0aWxzLlBvc3RlckNsYXNzKTtcblxuLyoqXG4gKiBMb2FkIGEgcmVuZGVyaW5nIHN0eWxlXG4gKiBAcGFyYW0gIHtzdHJpbmcgb3IgZGljdGlvbmFyeX0gc3R5bGUgLSBuYW1lIG9mIHRoZSBidWlsdC1pbiBzdHlsZSBcbiAqICAgICAgICAgb3Igc3R5bGUgZGljdGlvbmFyeSBpdHNlbGYuXG4gKiBAcmV0dXJuIHtib29sZWFufSBzdWNjZXNzXG4gKi9cblN0eWxlLnByb3RvdHlwZS5sb2FkID0gZnVuY3Rpb24oc3R5bGUpIHtcbiAgICB0cnkge1xuICAgICAgICAvLyBMb2FkIHRoZSBzdHlsZSBpZiBpdCdzIGJ1aWx0LWluLlxuICAgICAgICBpZiAoc3R5bGVzLnN0eWxlc1tzdHlsZV0pIHtcbiAgICAgICAgICAgIHN0eWxlID0gc3R5bGVzLnN0eWxlc1tzdHlsZV0uc3R5bGU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZWFkIGVhY2ggYXR0cmlidXRlIG9mIHRoZSBzdHlsZS5cbiAgICAgICAgZm9yICh2YXIga2V5IGluIHN0eWxlKSB7XG4gICAgICAgICAgICBpZiAoc3R5bGUuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgICAgIHRoaXNba2V5XSA9IHN0eWxlW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgbG9hZGluZyBzdHlsZScsIGUpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufTtcblxuZXhwb3J0cy5TdHlsZSA9IFN0eWxlOyIsImV4cG9ydHMuc3R5bGVzID0ge1xuICAgIFwibW9ub2thaVwiOiByZXF1aXJlKFwiLi9tb25va2FpLmpzXCIpLFxufTtcbiIsImV4cG9ydHMuc3R5bGUgPSB7XG4gICAgY29tbWVudDogJyM3NTcxNUUnLFxuICAgIHRvZG86ICcjRkZGRkZGJywgLy8gQk9MRFxuICAgIHNwZWNpYWw6ICcjNjZEOUVGJyxcbiAgICBzdHJpbmc6ICcjRTZEQjc0JyxcbiAgICBjaGFyYWN0ZXI6ICcjRTZEQjc0JyxcbiAgICBjb25kaXRpb25hbDogJyNGOTI2NzInLCAvLyBCT0xEXG4gICAgcmVwZWF0OiAnI0Y5MjY3MicsXG4gICAgb3BlcmF0b3I6ICcjRjkyNjcyJyxcbiAgICB0eXBlOiAnIzY2RDlFRicsXG4gICAgc3RhdGVtZW50OiAnI0Y5MjY3MicsXG4gICAgZnVuY3Rpb246ICcjQTZFMjJFJyxcbiAgICBlcnJvcjogJyNFNkRCNzQnLCAvLyBCRzogIzFFMDAxMFxuICAgIGJvb2xlYW46ICcjQUU4MUZGJyxcbiAgICBpZGVudGlmaWVyOiAnI0ZEOTcxRicsXG4gICAgbGFiZWw6ICcjRTZEQjc0JyxcbiAgICBleGNlcHRpb246ICcjQTZFMjJFJyxcbiAgICBrZXl3b3JkOiAnI0Y5MjY3MicsXG4gICAgZGVidWc6ICcjQkNBM0EzJywgLy8gQk9MRFxuXG4gICAgdGV4dDogJyNGOEY4RjInLFxuICAgIGJhY2tncm91bmQ6ICcjMzMzMzMzJyxcbn07IiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxuLyoqXG4gKiBCYXNlIGNsYXNzIHdpdGggaGVscGZ1bCB1dGlsaXRpZXNcbiAqIEBwYXJhbSB7YXJyYXl9IFtldmVudGZ1bF9wcm9wZXJ0aWVzXSBsaXN0IG9mIHByb3BlcnR5IG5hbWVzIChzdHJpbmdzKVxuICogICAgICAgICAgICAgICAgdG8gY3JlYXRlIGFuZCB3aXJlIGNoYW5nZSBldmVudHMgdG8uXG4gKi9cbnZhciBQb3N0ZXJDbGFzcyA9IGZ1bmN0aW9uKGV2ZW50ZnVsX3Byb3BlcnRpZXMpIHtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICB0aGlzLl9vbl9hbGwgPSBbXTtcblxuICAgIC8vIENvbnN0cnVjdCBldmVudGZ1bCBwcm9wZXJ0aWVzLlxuICAgIGlmIChldmVudGZ1bF9wcm9wZXJ0aWVzICYmIGV2ZW50ZnVsX3Byb3BlcnRpZXMubGVuZ3RoPjApIHtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICBmb3IgKHZhciBpPTA7IGk8ZXZlbnRmdWxfcHJvcGVydGllcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgICAgICAgICB0aGF0LnByb3BlcnR5KG5hbWUsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhhdFsnXycgKyBuYW1lXTtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICB0aGF0LnRyaWdnZXIoJ2NoYW5nZTonICsgbmFtZSwgdmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB0aGF0LnRyaWdnZXIoJ2NoYW5nZScsIG5hbWUsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgdGhhdFsnXycgKyBuYW1lXSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICB0aGF0LnRyaWdnZXIoJ2NoYW5nZWQ6JyArIG5hbWUpO1xuICAgICAgICAgICAgICAgICAgICB0aGF0LnRyaWdnZXIoJ2NoYW5nZWQnLCBuYW1lKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pKGV2ZW50ZnVsX3Byb3BlcnRpZXNbaV0pO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuLyoqXG4gKiBEZWZpbmUgYSBwcm9wZXJ0eSBmb3IgdGhlIGNsYXNzXG4gKiBAcGFyYW0gIHtzdHJpbmd9IG5hbWVcbiAqIEBwYXJhbSAge2Z1bmN0aW9ufSBnZXR0ZXJcbiAqIEBwYXJhbSAge2Z1bmN0aW9ufSBzZXR0ZXJcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblBvc3RlckNsYXNzLnByb3RvdHlwZS5wcm9wZXJ0eSA9IGZ1bmN0aW9uKG5hbWUsIGdldHRlciwgc2V0dGVyKSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIG5hbWUsIHtcbiAgICAgICAgZ2V0OiBnZXR0ZXIsXG4gICAgICAgIHNldDogc2V0dGVyLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICB9KTtcbn07XG5cbi8qKlxuICogUmVnaXN0ZXIgYW4gZXZlbnQgbGlzdGVuZXJcbiAqIEBwYXJhbSAge3N0cmluZ30gZXZlbnRcbiAqIEBwYXJhbSAge2Z1bmN0aW9ufSBoYW5kbGVyXG4gKiBAcGFyYW0gIHtvYmplY3R9IGNvbnRleHRcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblBvc3RlckNsYXNzLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uKGV2ZW50LCBoYW5kbGVyLCBjb250ZXh0KSB7XG4gICAgZXZlbnQgPSBldmVudC50cmltKCkudG9Mb3dlckNhc2UoKTtcblxuICAgIC8vIE1ha2Ugc3VyZSBhIGxpc3QgZm9yIHRoZSBldmVudCBleGlzdHMuXG4gICAgaWYgKCF0aGlzLl9ldmVudHNbZXZlbnRdKSB7IHRoaXMuX2V2ZW50c1tldmVudF0gPSBbXTsgfVxuXG4gICAgLy8gUHVzaCB0aGUgaGFuZGxlciBhbmQgdGhlIGNvbnRleHQgdG8gdGhlIGV2ZW50J3MgY2FsbGJhY2sgbGlzdC5cbiAgICB0aGlzLl9ldmVudHNbZXZlbnRdLnB1c2goW2hhbmRsZXIsIGNvbnRleHRdKTtcbn07XG5cbi8qKlxuICogVW5yZWdpc3RlciBvbmUgb3IgYWxsIGV2ZW50IGxpc3RlbmVycyBmb3IgYSBzcGVjaWZpYyBldmVudFxuICogQHBhcmFtICB7c3RyaW5nfSBldmVudFxuICogQHBhcmFtICB7Y2FsbGJhY2t9IChvcHRpb25hbCkgaGFuZGxlclxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuUG9zdGVyQ2xhc3MucHJvdG90eXBlLm9mZiA9IGZ1bmN0aW9uKGV2ZW50LCBoYW5kbGVyKSB7XG4gICAgZXZlbnQgPSBldmVudC50cmltKCkudG9Mb3dlckNhc2UoKTtcbiAgICBcbiAgICAvLyBJZiBhIGhhbmRsZXIgaXMgc3BlY2lmaWVkLCByZW1vdmUgYWxsIHRoZSBjYWxsYmFja3NcbiAgICAvLyB3aXRoIHRoYXQgaGFuZGxlci4gIE90aGVyd2lzZSwganVzdCByZW1vdmUgYWxsIG9mXG4gICAgLy8gdGhlIHJlZ2lzdGVyZWQgY2FsbGJhY2tzLlxuICAgIGlmIChoYW5kbGVyKSB7XG4gICAgICAgIHRoaXMuX2V2ZW50c1tldmVudF0gPSB0aGlzLl9ldmVudHNbZXZlbnRdLmZpbHRlcihmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrWzBdICE9PSBoYW5kbGVyO1xuICAgICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9ldmVudHNbZXZlbnRdID0gW107XG4gICAgfVxufTtcblxuLyoqXG4gKiBSZWdpc3RlciBhIGdsb2JhbCBldmVudCBoYW5kbGVyLiBcbiAqIFxuICogQSBnbG9iYWwgZXZlbnQgaGFuZGxlciBmaXJlcyBmb3IgYW55IGV2ZW50IHRoYXQnc1xuICogdHJpZ2dlcmVkLlxuICogQHBhcmFtICB7c3RyaW5nfSBoYW5kbGVyIC0gZnVuY3Rpb24gdGhhdCBhY2NlcHRzIG9uZVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJndW1lbnQsIHRoZSBuYW1lIG9mIHRoZVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQsXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Qb3N0ZXJDbGFzcy5wcm90b3R5cGUub25fYWxsID0gZnVuY3Rpb24oaGFuZGxlcikge1xuICAgIHZhciBpbmRleCA9IHRoaXMuX29uX2FsbC5pbmRleE9mKGhhbmRsZXIpO1xuICAgIGlmIChpbmRleCA9PT0gLTEpIHtcbiAgICAgICAgdGhpcy5fb25fYWxsLnB1c2goaGFuZGxlcik7XG4gICAgfVxufTtcblxuLyoqXG4gKiBVbnJlZ2lzdGVyIGEgZ2xvYmFsIGV2ZW50IGhhbmRsZXIuXG4gKiBAcGFyYW0gIHtbdHlwZV19IGhhbmRsZXJcbiAqIEByZXR1cm4ge2Jvb2xlYW59IHRydWUgaWYgYSBoYW5kbGVyIHdhcyByZW1vdmVkXG4gKi9cblBvc3RlckNsYXNzLnByb3RvdHlwZS5vZmZfYWxsID0gZnVuY3Rpb24oaGFuZGxlcikge1xuICAgIHZhciBpbmRleCA9IHRoaXMuX29uX2FsbC5pbmRleE9mKGhhbmRsZXIpO1xuICAgIGlmIChpbmRleCAhPSAtMSkge1xuICAgICAgICB0aGlzLl9vbl9hbGwuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn07XG5cbi8qKlxuICogVHJpZ2dlcnMgdGhlIGNhbGxiYWNrcyBvZiBhbiBldmVudCB0byBmaXJlLlxuICogQHBhcmFtICB7c3RyaW5nfSBldmVudFxuICogQHJldHVybiB7YXJyYXl9IGFycmF5IG9mIHJldHVybiB2YWx1ZXNcbiAqL1xuUG9zdGVyQ2xhc3MucHJvdG90eXBlLnRyaWdnZXIgPSBmdW5jdGlvbihldmVudCkge1xuICAgIGV2ZW50ID0gZXZlbnQudHJpbSgpLnRvTG93ZXJDYXNlKCk7XG5cbiAgICAvLyBDb252ZXJ0IGFyZ3VtZW50cyB0byBhbiBhcnJheSBhbmQgY2FsbCBjYWxsYmFja3MuXG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgIGFyZ3Muc3BsaWNlKDAsMSk7XG5cbiAgICAvLyBUcmlnZ2VyIGdsb2JhbCBoYW5kbGVycyBmaXJzdC5cbiAgICB0aGlzLl9vbl9hbGwuZm9yRWFjaChmdW5jdGlvbihoYW5kbGVyKSB7XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgW2V2ZW50XS5jb25jYXQoYXJncykpO1xuICAgIH0pO1xuXG4gICAgLy8gVHJpZ2dlciBpbmRpdmlkdWFsIGhhbmRsZXJzIHNlY29uZC5cbiAgICB2YXIgZXZlbnRzID0gdGhpcy5fZXZlbnRzW2V2ZW50XTtcbiAgICBpZiAoZXZlbnRzKSB7XG4gICAgICAgIHZhciByZXR1cm5zID0gW107XG4gICAgICAgIGV2ZW50cy5mb3JFYWNoKGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICByZXR1cm5zLnB1c2goY2FsbGJhY2tbMF0uYXBwbHkoY2FsbGJhY2tbMV0sIGFyZ3MpKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiByZXR1cm5zO1xuICAgIH1cbiAgICByZXR1cm4gW107XG59O1xuXG4vKipcbiAqIENhdXNlIG9uZSBjbGFzcyB0byBpbmhlcml0IGZyb20gYW5vdGhlclxuICogQHBhcmFtICB7dHlwZX0gY2hpbGRcbiAqIEBwYXJhbSAge3R5cGV9IHBhcmVudFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xudmFyIGluaGVyaXQgPSBmdW5jdGlvbihjaGlsZCwgcGFyZW50KSB7XG4gICAgY2hpbGQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShwYXJlbnQucHJvdG90eXBlLCB7fSk7XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiBhIHZhbHVlIGlzIGNhbGxhYmxlXG4gKiBAcGFyYW0gIHthbnl9IHZhbHVlXG4gKiBAcmV0dXJuIHtib29sZWFufVxuICovXG52YXIgY2FsbGFibGUgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT0gJ2Z1bmN0aW9uJztcbn07XG5cbi8qKlxuICogQ2FsbHMgdGhlIHZhbHVlIGlmIGl0J3MgY2FsbGFibGUgYW5kIHJldHVybnMgaXQncyByZXR1cm4uXG4gKiBPdGhlcndpc2UgcmV0dXJucyB0aGUgdmFsdWUgYXMtaXMuXG4gKiBAcGFyYW0gIHthbnl9IHZhbHVlXG4gKiBAcmV0dXJuIHthbnl9XG4gKi9cbnZhciByZXNvbHZlX2NhbGxhYmxlID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICBpZiAoY2FsbGFibGUodmFsdWUpKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZS5jYWxsKHRoaXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG59O1xuXG4vKipcbiAqIENyZWF0ZXMgYSBwcm94eSB0byBhIGZ1bmN0aW9uIHNvIGl0IGlzIGNhbGxlZCBpbiB0aGUgY29ycmVjdCBjb250ZXh0LlxuICogQHJldHVybiB7ZnVuY3Rpb259IHByb3hpZWQgZnVuY3Rpb24uXG4gKi9cbnZhciBwcm94eSA9IGZ1bmN0aW9uKGYsIGNvbnRleHQpIHtcbiAgICBpZiAoZj09PXVuZGVmaW5lZCkgeyB0aHJvdyBuZXcgRXJyb3IoJ2YgY2Fubm90IGJlIHVuZGVmaW5lZCcpOyB9XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkgeyByZXR1cm4gZi5hcHBseShjb250ZXh0LCBhcmd1bWVudHMpOyB9O1xufTtcblxuLyoqXG4gKiBDbGVhcnMgYW4gYXJyYXkgaW4gcGxhY2UuXG4gKlxuICogRGVzcGl0ZSBhbiBPKE4pIGNvbXBsZXhpdHksIHRoaXMgc2VlbXMgdG8gYmUgdGhlIGZhc3Rlc3Qgd2F5IHRvIGNsZWFyXG4gKiBhIGxpc3QgaW4gcGxhY2UgaW4gSmF2YXNjcmlwdC4gXG4gKiBCZW5jaG1hcms6IGh0dHA6Ly9qc3BlcmYuY29tL2VtcHR5LWphdmFzY3JpcHQtYXJyYXlcbiAqIENvbXBsZXhpdHk6IE8oTilcbiAqIEBwYXJhbSAge2FycmF5fSBhcnJheVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xudmFyIGNsZWFyX2FycmF5ID0gZnVuY3Rpb24oYXJyYXkpIHtcbiAgICB3aGlsZSAoYXJyYXkubGVuZ3RoID4gMCkge1xuICAgICAgICBhcnJheS5wb3AoKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiBhIHZhbHVlIGlzIGFuIGFycmF5XG4gKiBAcGFyYW0gIHthbnl9IHhcbiAqIEByZXR1cm4ge2Jvb2xlYW59IHRydWUgaWYgdmFsdWUgaXMgYW4gYXJyYXlcbiAqL1xudmFyIGlzX2FycmF5ID0gZnVuY3Rpb24oeCkge1xuICAgIHJldHVybiB4IGluc3RhbmNlb2YgQXJyYXk7XG59O1xuXG4vKipcbiAqIEZpbmQgdGhlIGNsb3Nlc3QgdmFsdWUgaW4gYSBsaXN0XG4gKiBcbiAqIEludGVycG9sYXRpb24gc2VhcmNoIGFsZ29yaXRobS4gIFxuICogQ29tcGxleGl0eTogTyhsZyhsZyhOKSkpXG4gKiBAcGFyYW0gIHthcnJheX0gc29ydGVkIC0gc29ydGVkIGFycmF5IG9mIG51bWJlcnNcbiAqIEBwYXJhbSAge2Zsb2F0fSB4IC0gbnVtYmVyIHRvIHRyeSB0byBmaW5kXG4gKiBAcmV0dXJuIHtpbnRlZ2VyfSBpbmRleCBvZiB0aGUgdmFsdWUgdGhhdCdzIGNsb3Nlc3QgdG8geFxuICovXG52YXIgZmluZF9jbG9zZXN0ID0gZnVuY3Rpb24oc29ydGVkLCB4KSB7XG4gICAgdmFyIG1pbiA9IHNvcnRlZFswXTtcbiAgICB2YXIgbWF4ID0gc29ydGVkW3NvcnRlZC5sZW5ndGgtMV07XG4gICAgaWYgKHggPCBtaW4pIHJldHVybiAwO1xuICAgIGlmICh4ID4gbWF4KSByZXR1cm4gc29ydGVkLmxlbmd0aC0xO1xuICAgIGlmIChzb3J0ZWQubGVuZ3RoID09IDIpIHtcbiAgICAgICAgaWYgKG1heCAtIHggPiB4IC0gbWluKSB7XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9XG4gICAgfVxuICAgIHZhciByYXRlID0gKG1heCAtIG1pbikgLyBzb3J0ZWQubGVuZ3RoO1xuICAgIGlmIChyYXRlID09PSAwKSByZXR1cm4gMDtcbiAgICB2YXIgZ3Vlc3MgPSBNYXRoLmZsb29yKHggLyByYXRlKTtcbiAgICBpZiAoc29ydGVkW2d1ZXNzXSA9PSB4KSB7XG4gICAgICAgIHJldHVybiBndWVzcztcbiAgICB9IGVsc2UgaWYgKGd1ZXNzID4gMCAmJiBzb3J0ZWRbZ3Vlc3MtMV0gPCB4ICYmIHggPCBzb3J0ZWRbZ3Vlc3NdKSB7XG4gICAgICAgIHJldHVybiBmaW5kX2Nsb3Nlc3Qoc29ydGVkLnNsaWNlKGd1ZXNzLTEsIGd1ZXNzKzEpLCB4KSArIGd1ZXNzLTE7XG4gICAgfSBlbHNlIGlmIChndWVzcyA8IHNvcnRlZC5sZW5ndGgtMSAmJiBzb3J0ZWRbZ3Vlc3NdIDwgeCAmJiB4IDwgc29ydGVkW2d1ZXNzKzFdKSB7XG4gICAgICAgIHJldHVybiBmaW5kX2Nsb3Nlc3Qoc29ydGVkLnNsaWNlKGd1ZXNzLCBndWVzcysyKSwgeCkgKyBndWVzcztcbiAgICB9IGVsc2UgaWYgKHNvcnRlZFtndWVzc10gPiB4KSB7XG4gICAgICAgIHJldHVybiBmaW5kX2Nsb3Nlc3Qoc29ydGVkLnNsaWNlKDAsIGd1ZXNzKSwgeCk7XG4gICAgfSBlbHNlIGlmIChzb3J0ZWRbZ3Vlc3NdIDwgeCkge1xuICAgICAgICByZXR1cm4gZmluZF9jbG9zZXN0KHNvcnRlZC5zbGljZShndWVzcysxKSwgeCkgKyBndWVzcysxO1xuICAgIH1cbn07XG5cbi8qKlxuICogTWFrZSBhIHNoYWxsb3cgY29weSBvZiBhIGRpY3Rpb25hcnkuXG4gKiBAcGFyYW0gIHtkaWN0aW9uYXJ5fSB4XG4gKiBAcmV0dXJuIHtkaWN0aW9uYXJ5fVxuICovXG52YXIgc2hhbGxvd19jb3B5ID0gZnVuY3Rpb24oeCkge1xuICAgIHZhciB5ID0ge307XG4gICAgZm9yICh2YXIga2V5IGluIHgpIHtcbiAgICAgICAgaWYgKHguaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgeVtrZXldID0geFtrZXldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB5O1xufTtcblxuLyoqXG4gKiBIb29rcyBhIGZ1bmN0aW9uLlxuICogQHBhcmFtICB7b2JqZWN0fSBvYmogLSBvYmplY3QgdG8gaG9va1xuICogQHBhcmFtICB7c3RyaW5nfSBtZXRob2QgLSBuYW1lIG9mIHRoZSBmdW5jdGlvbiB0byBob29rXG4gKiBAcGFyYW0gIHtmdW5jdGlvbn0gaG9vayAtIGZ1bmN0aW9uIHRvIGNhbGwgYmVmb3JlIHRoZSBvcmlnaW5hbFxuICogQHJldHVybiB7b2JqZWN0fSBob29rIHJlZmVyZW5jZSwgb2JqZWN0IHdpdGggYW4gYHVuaG9va2AgbWV0aG9kXG4gKi9cbnZhciBob29rID0gZnVuY3Rpb24ob2JqLCBtZXRob2QsIGhvb2spIHtcblxuICAgIC8vIElmIHRoZSBvcmlnaW5hbCBoYXMgYWxyZWFkeSBiZWVuIGhvb2tlZCwgYWRkIHRoaXMgaG9vayB0byB0aGUgbGlzdCBcbiAgICAvLyBvZiBob29rcy5cbiAgICBpZiAob2JqW21ldGhvZF0gJiYgb2JqW21ldGhvZF0ub3JpZ2luYWwgJiYgb2JqW21ldGhvZF0uaG9va3MpIHtcbiAgICAgICAgb2JqW21ldGhvZF0uaG9va3MucHVzaChob29rKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBDcmVhdGUgdGhlIGhvb2tlZCBmdW5jdGlvblxuICAgICAgICB2YXIgaG9va3MgPSBbaG9va107XG4gICAgICAgIHZhciBvcmlnaW5hbCA9IG9ialttZXRob2RdO1xuICAgICAgICB2YXIgaG9va2VkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgICAgICAgIHZhciByZXQ7XG4gICAgICAgICAgICB2YXIgcmVzdWx0cztcbiAgICAgICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgICAgIGhvb2tzLmZvckVhY2goZnVuY3Rpb24oaG9vaykge1xuICAgICAgICAgICAgICAgIHJlc3VsdHMgPSBob29rLmFwcGx5KHRoYXQsIGFyZ3MpO1xuICAgICAgICAgICAgICAgIHJldCA9IHJldCAhPT0gdW5kZWZpbmVkID8gcmV0IDogcmVzdWx0cztcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKG9yaWdpbmFsKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0cyA9IG9yaWdpbmFsLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJldCAhPT0gdW5kZWZpbmVkID8gcmV0IDogcmVzdWx0cztcbiAgICAgICAgfTtcbiAgICAgICAgaG9va2VkLm9yaWdpbmFsID0gb3JpZ2luYWw7XG4gICAgICAgIGhvb2tlZC5ob29rcyA9IGhvb2tzO1xuICAgICAgICBvYmpbbWV0aG9kXSA9IGhvb2tlZDtcbiAgICB9XG5cbiAgICAvLyBSZXR1cm4gdW5ob29rIG1ldGhvZC5cbiAgICByZXR1cm4ge1xuICAgICAgICB1bmhvb2s6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGluZGV4ID0gb2JqW21ldGhvZF0uaG9va3MuaW5kZXhPZihob29rKTtcbiAgICAgICAgICAgIGlmIChpbmRleCAhPSAtMSkge1xuICAgICAgICAgICAgICAgIG9ialttZXRob2RdLmhvb2tzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChvYmpbbWV0aG9kXS5ob29rcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICBvYmpbbWV0aG9kXSA9IG9ialttZXRob2RdLm9yaWdpbmFsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgIH07XG4gICAgXG59O1xuXG4vKipcbiAqIENhbmNlbHMgZXZlbnQgYnViYmxpbmcuXG4gKiBAcGFyYW0gIHtldmVudH0gZVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xudmFyIGNhbmNlbF9idWJibGUgPSBmdW5jdGlvbihlKSB7XG4gICAgaWYgKGUuc3RvcFByb3BhZ2F0aW9uKSBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIGlmIChlLmNhbmNlbEJ1YmJsZSAhPT0gbnVsbCkgZS5jYW5jZWxCdWJibGUgPSB0cnVlO1xuICAgIGlmIChlLnByZXZlbnREZWZhdWx0KSBlLnByZXZlbnREZWZhdWx0KCk7XG59O1xuXG4vKipcbiAqIEdlbmVyYXRlcyBhIHJhbmRvbSBjb2xvciBzdHJpbmdcbiAqIEByZXR1cm4ge3N0cmluZ30gaGV4YWRlY2ltYWwgY29sb3Igc3RyaW5nXG4gKi9cbnZhciByYW5kb21fY29sb3IgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcmFuZG9tX2J5dGUgPSBmdW5jdGlvbigpIHsgXG4gICAgICAgIHZhciBiID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogMjU1KS50b1N0cmluZygxNik7XG4gICAgICAgIHJldHVybiBiLmxlbmd0aCA9PSAxID8gJzAnICsgYiA6IGI7XG4gICAgfTtcbiAgICByZXR1cm4gJyMnICsgcmFuZG9tX2J5dGUoKSArIHJhbmRvbV9ieXRlKCkgKyByYW5kb21fYnl0ZSgpO1xufTtcblxuLyoqXG4gKiBDb21wYXJlIHR3byBhcnJheXMgYnkgY29udGVudHMgZm9yIGVxdWFsaXR5LlxuICogQHBhcmFtICB7YXJyYXl9IHhcbiAqIEBwYXJhbSAge2FycmF5fSB5XG4gKiBAcmV0dXJuIHtib29sZWFufVxuICovXG52YXIgY29tcGFyZV9hcnJheXMgPSBmdW5jdGlvbih4LCB5KSB7XG4gICAgaWYgKHgubGVuZ3RoICE9IHkubGVuZ3RoKSByZXR1cm4gZmFsc2U7XG4gICAgZm9yIChpPTA7IGk8eC5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoeFtpXSE9PXlbaV0pIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIEZpbmQgYWxsIHRoZSBvY2N1cmFuY2VzIG9mIGEgcmVndWxhciBleHByZXNzaW9uIGluc2lkZSBhIHN0cmluZy5cbiAqIEBwYXJhbSAge3N0cmluZ30gdGV4dCAtIHN0cmluZyB0byBsb29rIGluXG4gKiBAcGFyYW0gIHtzdHJpbmd9IHJlIC0gcmVndWxhciBleHByZXNzaW9uIHRvIGZpbmRcbiAqIEByZXR1cm4ge2FycmF5fSBhcnJheSBvZiBbc3RhcnRfaW5kZXgsIGVuZF9pbmRleF0gcGFpcnNcbiAqL1xudmFyIGZpbmRhbGwgPSBmdW5jdGlvbih0ZXh0LCByZSkge1xuICAgIHJlID0gbmV3IFJlZ0V4cChyZSwgJ2dtJyk7XG4gICAgdmFyIHJlc3VsdHM7XG4gICAgdmFyIGZvdW5kID0gW107XG4gICAgd2hpbGUgKChyZXN1bHRzID0gcmUuZXhlYyh0ZXh0KSkgIT09IG51bGwpIHtcbiAgICAgICAgZm91bmQucHVzaChbcmVzdWx0cy5pbmRleCwgcmVzdWx0cy5pbmRleCArIHJlc3VsdHNbMF0ubGVuZ3RoXSk7XG4gICAgfVxuICAgIHJldHVybiBmb3VuZDtcbn07XG5cbi8vIEV4cG9ydCBuYW1lcy5cbmV4cG9ydHMuUG9zdGVyQ2xhc3MgPSBQb3N0ZXJDbGFzcztcbmV4cG9ydHMuaW5oZXJpdCA9IGluaGVyaXQ7XG5leHBvcnRzLmNhbGxhYmxlID0gY2FsbGFibGU7XG5leHBvcnRzLnJlc29sdmVfY2FsbGFibGUgPSByZXNvbHZlX2NhbGxhYmxlO1xuZXhwb3J0cy5wcm94eSA9IHByb3h5O1xuZXhwb3J0cy5jbGVhcl9hcnJheSA9IGNsZWFyX2FycmF5O1xuZXhwb3J0cy5pc19hcnJheSA9IGlzX2FycmF5O1xuZXhwb3J0cy5maW5kX2Nsb3Nlc3QgPSBmaW5kX2Nsb3Nlc3Q7XG5leHBvcnRzLnNoYWxsb3dfY29weSA9IHNoYWxsb3dfY29weTtcbmV4cG9ydHMuaG9vayA9IGhvb2s7XG5leHBvcnRzLmNhbmNlbF9idWJibGUgPSBjYW5jZWxfYnViYmxlO1xuZXhwb3J0cy5yYW5kb21fY29sb3IgPSByYW5kb21fY29sb3I7XG5leHBvcnRzLmNvbXBhcmVfYXJyYXlzID0gY29tcGFyZV9hcnJheXM7XG5leHBvcnRzLmZpbmRhbGwgPSBmaW5kYWxsO1xuIl19
