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
    this._last_set_options = {};

    this._text_size_cache = {};
    this._text_size_array = [];
    this._text_size_cache_size = 1000;

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

    // Cache the size if it's not already cached.
    if (this._text_size_cache[text] === undefined) {
        this._text_size_cache[text] = this.context.measureText(text).width;
        this._text_size_array.push(text);

        // Remove the oldest item in the array if the cache is too large.
        while (this._text_size_array.length > this._text_size_cache_size) {
            var oldest = this._text_size_array.shift();
            delete this._text_size_cache[oldest];
        }
    }
    
    // Use the cached size.
    return this._text_size_cache[text];
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
    var set_options = {};
    set_options.globalAlpha = options.alpha===undefined ? 1.0 : options.alpha;
    set_options.globalCompositeOperation = options.composite_operation || 'source-over';
    
    // Line style.
    set_options.lineCap = options.line_cap || 'butt';
    set_options.lineJoin = options.line_join || 'bevel';
    set_options.lineWidth = options.line_width===undefined ? 1.0 : options.line_width;
    set_options.miterLimit = options.line_miter_limit===undefined ? 10 : options.line_miter_limit;
    set_options.strokeStyle = options.line_color || options.color || 'black'; // TODO: Support gradient
    options.stroke = (options.line_color !== undefined || options.line_width !== undefined);

    // Fill style.
    set_options.fillStyle = options.fill_color || options.color || 'black'; // TODO: Support gradient
    options.fill = options.fill_color !== undefined;

    // Font style.
    var font_style = options.font_style || '';
    var font_variant = options.font_variant || '';
    var font_weight = options.font_weight || '';
    var font_size = options.font_size || '12pt';
    var font_family = options.font_family || 'Arial';
    var font = font_style + ' ' + font_variant + ' ' + font_weight + ' ' + font_size + ' ' + font_family;
    set_options.font = options.font || font;

    // Text style.
    set_options.textAlign = options.text_align || 'left';
    set_options.textBaseline = options.text_baseline || 'top';

    // TODO: Support shadows.
    
    // Empty the measure text cache if the font is changed.
    if (set_options.font !== this._last_set_options.font) {
        this._text_size_cache = {};
        this._text_size_array = [];
    }
    
    // Set the options on the context object.  Only set options that
    // have changed since the last call.
    for (var key in set_options) {
        if (set_options.hasOwnProperty(key)) {
            if (this._last_set_options[key] !== set_options[key]) {
                this._last_set_options[key] = set_options[key];
                this.context[key] = set_options[key];
            }
        }
    }

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
 * Sets both the primary and secondary cursor positions
 * @param {integer} row_index
 * @param {integer} char_index
 */
Cursor.prototype.set_both = function(row_index, char_index) {
    this.primary_row = row_index;
    this.primary_char = char_index;
    this.secondary_row = row_index;
    this.secondary_char = char_index;

    // Remember the character position, vertical navigation across empty lines
    // shouldn't cause the horizontal position to be lost.
    this._memory_char = this.primary_char;

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
    this._reset_secondary();

    this.trigger('change'); 
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
    this._pending_tag_events = false;
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
    if (this._tag_lock < 0) {
        this._tag_lock = 0;
    }
    if (this._tag_lock === 0 && this._pending_tag_events) {
        this._pending_tag_events = false;
        this.trigger_tag_events();
    }
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
    } else {
        this._pending_tag_events = true;
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
    this.trigger_tag_events();
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
        this.trigger('row_changed', coords.start_row);
        this.trigger('rows_added', coords.start_row + 1, coords.start_row + split_text.length - 1);
        this.trigger('changed');

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
        this.trigger('text_changed');
        this.trigger('changed');
    } else if (coords.end_row == coords.start_row) {
        this.trigger('row_changed', coords.start_row);
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
        this.trigger('text_changed');
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
    this.trigger('rows_added', row_index, row_index);
    this.trigger('changed');
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
    this.trigger('text_changed');
    this.trigger('changed');
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
        has_focus,
        cursors_renderer);

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
        selections_renderer,
        row_renderer,
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
            utils.findall(text, group.regex.regex, group.regex.flags).forEach(function(found) {
                found_groups.push([found[0], found[1] + group.regex.delta, group_name]);
            });
            break;
        case 'region':
            var starts = utils.findall(text, group.start.regex, group.start.flags);
            var skips = [];
            if (group.skip) {
                skips = utils.findall(text, group.skip.regex, group.skip.flags);
            }
            var ends = utils.findall(text, group.end.regex, group.end.flags);

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

        // Processesing that must happen at load time.
        var that = this;
        for (var group_name in this._groups) {
            if (this._groups.hasOwnProperty(group_name)) {
                this._groups[group_name].forEach(function(group) {
                    
                    // Find all groups where contained == false
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
Syntax file generated using VIM's "javascript.vim" file.
Use poster/tools/import_vim.py to import more syntax files from VIM.
*/
exports.language = {
    "groups": {
        "javaScriptStringS": [
            {
                "start": {
                    "regex": "'", 
                    "flags": "smg", 
                    "delta": 0
                }, 
                "contains": [
                    "javaScriptSpecial", 
                    "@htmlPreproc"
                ], 
                "end": {
                    "regex": "'|$", 
                    "flags": "smg", 
                    "delta": 0
                }, 
                "type": "region", 
                "skip": {
                    "regex": "\\\\\\\\|\\\\'", 
                    "flags": "smg", 
                    "delta": 0
                }
            }
        ], 
        "javaScriptSpecialCharacter": [
            {
                "regex": {
                    "regex": "'\\\\.'", 
                    "flags": "smg", 
                    "delta": 0
                }, 
                "skipwhite": false, 
                "contains": [], 
                "nextgroup": null, 
                "contained": false, 
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
                    "flags": "smg", 
                    "delta": -1
                }, 
                "contains": [
                    "@htmlPreproc"
                ], 
                "end": {
                    "regex": "/[gim]{0,2\\}\\s*[;.,\\)\\]}]", 
                    "flags": "smg", 
                    "delta": -1
                }, 
                "type": "region", 
                "skip": {
                    "regex": "\\\\\\\\|\\\\/", 
                    "flags": "smg", 
                    "delta": 0
                }
            }
        ], 
        "javaScriptCommentSkip": [
            {
                "regex": {
                    "regex": "^[ \\t]*\\*($|[ \\t]+)", 
                    "flags": "smg", 
                    "delta": 0
                }, 
                "skipwhite": false, 
                "contains": [], 
                "nextgroup": null, 
                "contained": false, 
                "type": "match"
            }
        ], 
        "javaScriptSpecial": [
            {
                "regex": {
                    "regex": "\\\\\\d\\d\\d|\\\\.", 
                    "flags": "smg", 
                    "delta": 0
                }, 
                "skipwhite": false, 
                "contains": [], 
                "nextgroup": null, 
                "contained": false, 
                "type": "match"
            }
        ], 
        "javaScriptStringD": [
            {
                "start": {
                    "regex": "\"", 
                    "flags": "smg", 
                    "delta": 0
                }, 
                "contains": [
                    "javaScriptSpecial", 
                    "@htmlPreproc"
                ], 
                "end": {
                    "regex": "\"|$", 
                    "flags": "smg", 
                    "delta": 0
                }, 
                "type": "region", 
                "skip": {
                    "regex": "\\\\\\\\|\\\\\"", 
                    "flags": "smg", 
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
                    "regex": "\\/\\/.*", 
                    "flags": "smg", 
                    "delta": 0
                }, 
                "skipwhite": false, 
                "contains": [
                    "@Spell", 
                    "javaScriptCommentTodo"
                ], 
                "nextgroup": null, 
                "contained": false, 
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
                    "regex": "[\\{}\\[\\]]", 
                    "flags": "smg", 
                    "delta": 0
                }, 
                "skipwhite": false, 
                "contains": [], 
                "nextgroup": null, 
                "contained": false, 
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
                    "flags": "smg", 
                    "delta": 0
                }, 
                "contains": [
                    "@Spell", 
                    "javaScriptCommentTodo"
                ], 
                "end": {
                    "regex": "\\*/", 
                    "flags": "smg", 
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
                    "regex": "[^a-zA-Z0-9]function[^a-zA-Z0-9]", 
                    "flags": "smg", 
                    "delta": 0
                }, 
                "skipwhite": false, 
                "contains": [], 
                "nextgroup": null, 
                "contained": false, 
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
                    "regex": "[^a-zA-Z0-9]function[^a-zA-Z0-9].*[^};]$", 
                    "flags": "smg", 
                    "delta": 0
                }, 
                "contains": [], 
                "end": {
                    "regex": "^\\z1}.*$", 
                    "flags": "smg", 
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
                    "regex": "[\\(\\)]", 
                    "flags": "smg", 
                    "delta": 0
                }, 
                "skipwhite": false, 
                "contains": [], 
                "nextgroup": null, 
                "contained": false, 
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
                    "regex": "-?[^a-zA-Z0-9]\\d+L?[^a-zA-Z0-9]|0[xX][0-9a-fA-F]+[^a-zA-Z0-9]", 
                    "flags": "smg", 
                    "delta": 0
                }, 
                "skipwhite": false, 
                "contains": [], 
                "nextgroup": null, 
                "contained": false, 
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
Syntax file generated using VIM's "vb.vim" file.
Use poster/tools/import_vim.py to import more syntax files from VIM.
*/
exports.language = {
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
                    "regex": "[^a-zA-Z0-9]\\d+[^a-zA-Z0-9]", 
                    "flags": "smg", 
                    "delta": 0
                }, 
                "skipwhite": false, 
                "contains": [], 
                "nextgroup": null, 
                "contained": false, 
                "type": "match"
            }, 
            {
                "regex": {
                    "regex": "[^a-zA-Z0-9]\\d+\\.\\d*[^a-zA-Z0-9]", 
                    "flags": "smg", 
                    "delta": 0
                }, 
                "skipwhite": false, 
                "contains": [], 
                "nextgroup": null, 
                "contained": false, 
                "type": "match"
            }, 
            {
                "regex": {
                    "regex": "\\.\\d+[^a-zA-Z0-9]", 
                    "flags": "smg", 
                    "delta": 0
                }, 
                "skipwhite": false, 
                "contains": [], 
                "nextgroup": null, 
                "contained": false, 
                "type": "match"
            }
        ], 
        "vbString": [
            {
                "start": {
                    "regex": "\"", 
                    "flags": "smg", 
                    "delta": 0
                }, 
                "contains": [], 
                "end": {
                    "regex": "\"|$", 
                    "flags": "smg", 
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
                    "regex": "^\\d+(\\s|$)", 
                    "flags": "smg", 
                    "delta": 0
                }, 
                "skipwhite": false, 
                "contains": [], 
                "nextgroup": null, 
                "contained": false, 
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
                    "regex": "[-\\+]?[^a-zA-Z0-9]\\d+[eE][\\-\\+]?\\d+", 
                    "flags": "smg", 
                    "delta": 0
                }, 
                "skipwhite": false, 
                "contains": [], 
                "nextgroup": null, 
                "contained": false, 
                "type": "match"
            }, 
            {
                "regex": {
                    "regex": "[-\\+]?[^a-zA-Z0-9]\\d+\\.\\d*([eE][\\-\\+]?\\d+)?", 
                    "flags": "smg", 
                    "delta": 0
                }, 
                "skipwhite": false, 
                "contains": [], 
                "nextgroup": null, 
                "contained": false, 
                "type": "match"
            }, 
            {
                "regex": {
                    "regex": "[-\\+]?[^a-zA-Z0-9]\\.\\d+([eE][\\-\\+]?\\d+)?", 
                    "flags": "smg", 
                    "delta": 0
                }, 
                "skipwhite": false, 
                "contains": [], 
                "nextgroup": null, 
                "contained": false, 
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
                    "regex": "(^|\\s)REM\\s", 
                    "flags": "smg", 
                    "delta": 0
                }, 
                "contains": [
                    "vbTodo"
                ], 
                "end": {
                    "regex": "$", 
                    "flags": "smg", 
                    "delta": 0
                }, 
                "type": "region", 
                "skip": null
            }, 
            {
                "start": {
                    "regex": "(^|\\s)\\'", 
                    "flags": "smg", 
                    "delta": 0
                }, 
                "contains": [
                    "vbTodo"
                ], 
                "end": {
                    "regex": "$", 
                    "flags": "smg", 
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
                    "regex": "[\\(\\)\\+.,\\-/*\\?&]", 
                    "flags": "smg", 
                    "delta": 0
                }, 
                "skipwhite": false, 
                "contains": [], 
                "nextgroup": null, 
                "contained": false, 
                "type": "match"
            }, 
            {
                "regex": {
                    "regex": "[<>]\\??", 
                    "flags": "smg", 
                    "delta": 0
                }, 
                "skipwhite": false, 
                "contains": [], 
                "nextgroup": null, 
                "contained": false, 
                "type": "match"
            }, 
            {
                "regex": {
                    "regex": "<>", 
                    "flags": "smg", 
                    "delta": 0
                }, 
                "skipwhite": false, 
                "contains": [], 
                "nextgroup": null, 
                "contained": false, 
                "type": "match"
            }, 
            {
                "regex": {
                    "regex": "\\s+_$", 
                    "flags": "smg", 
                    "delta": 0
                }, 
                "skipwhite": false, 
                "contains": [], 
                "nextgroup": null, 
                "contained": false, 
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
                    "regex": "[a-zA-Z0-9][\\$%&!#]ms\\?s1", 
                    "flags": "smg", 
                    "delta": 0
                }, 
                "skipwhite": false, 
                "contains": [], 
                "nextgroup": null, 
                "contained": false, 
                "type": "match"
            }, 
            {
                "regex": {
                    "regex": "#[a-zA-Z0-9]", 
                    "flags": "smg", 
                    "delta": -1
                }, 
                "skipwhite": false, 
                "contains": [], 
                "nextgroup": null, 
                "contained": false, 
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

            // Calculate opacity of the cursor.  Blinking cursor.
            var sin = Math.sin(2*Math.PI*that._blink_animator.time());
            var alpha = Math.min(Math.max(sin+0.5, 0), 1); // Offset, truncated sine wave.

            // Draw the cursor.
            if (alpha > 0) {
                var height = that._get_row_height(row_index);
                var multiplier = that.style.cursor_height || 1.0;
                var offset = (height - (multiplier*height)) / 2;
                height *= multiplier;
                if (visible_rows.top_row <= row_index && row_index <= visible_rows.bottom_row) {
                    that._canvas.draw_rectangle(
                        char_index === 0 ? 0 : that._measure_partial_row(row_index, char_index), 
                        that._get_row_top(row_index) + offset, 
                        that.style.cursor_width===undefined ? 1.0 : that.style.cursor_width, 
                        height, 
                        {
                            fill_color: that.style.cursor || 'back',
                            alpha: alpha,
                        }
                    );
                }    
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
        var first_render = !this._was_focused;
        this._was_focused = true;
        this.render();
        // Tell parent layer this one has changed.
        this.trigger('changed');
        if (first_render) this.trigger('toggle');

    // The canvas isn't focused.  If this is the first time
    // it hasn't been focused, render again without the 
    // cursors.
    } else if (this._was_focused) {
        this._was_focused = false;
        this.render();
        // Tell parent layer this one has changed.
        this.trigger('changed');
        this.trigger('toggle');
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

    this._model.on('text_changed', utils.proxy(this._handle_value_changed, this));
    this._model.on('rows_added', utils.proxy(this._handle_rows_added, this));
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
    if (0 > index || index >= this._model._rows.length) {
        return 0; 
    }

    var text = this._model._rows[index];
    text = (length === undefined) ? text : text.substring(0, length);

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
 * Handles when one or more rows are added to the model
 *
 * Assumes constant row height.
 * @param  {integer} start
 * @param  {integer} end
 * @return {null}
 */
RowRenderer.prototype._handle_rows_added = function(start, end) {
    this._scrolling_canvas.scroll_height += (end - start + 1) * this.get_row_height();
    var width = this._scrolling_canvas.scroll_width;
    for (var i = start; i <= end; i++) { 
        width = Math.max(this._measure_row_width(index), width);
    }
    this._scrolling_canvas.scroll_width = width;
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
var SelectionsRenderer = function(cursors, style, row_renderer, has_focus, cursors_renderer) {
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

    // When the cursor is hidden/shown, redraw the selection.
    cursors_renderer.on('toggle', function() {
        that.render();
        // Tell parent layer this one has changed.
        that.trigger('changed');
    });
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

                var selection_color;
                if (that._has_focus()) {
                    selection_color = that.style.selection || 'skyblue';
                } else {
                    selection_color = that.style.selection_unfocused || 'gray';
                }

                that._canvas.draw_rectangle(
                    left, 
                    that._get_row_top(i), 
                    i !== cursor.end_row ? that._measure_partial_row(i) - left : that._measure_partial_row(i, cursor.end_char) - left, 
                    that._get_row_height(i), 
                    {
                        fill_color: selection_color,
                    }
                );
            }
        }
    });
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

        'cursor',
        'selection',
        'selection_unfocused',

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

    cursor: '#F8F8F2',
    cursor_width: 1.0,
    cursor_height: 1.1,
    selection: '#465457',
    selection_unfocused: '#364447',

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
var findall = function(text, re, flags) {
    re = new RegExp(re, flags || 'gm');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzb3VyY2UvanMvcG9zdGVyLmpzIiwic291cmNlL2pzL2FuaW1hdG9yLmpzIiwic291cmNlL2pzL2NhbnZhcy5qcyIsInNvdXJjZS9qcy9jbGlwYm9hcmQuanMiLCJzb3VyY2UvanMvY3Vyc29yLmpzIiwic291cmNlL2pzL2N1cnNvcnMuanMiLCJzb3VyY2UvanMvZG9jdW1lbnRfY29udHJvbGxlci5qcyIsInNvdXJjZS9qcy9kb2N1bWVudF9tb2RlbC5qcyIsInNvdXJjZS9qcy9kb2N1bWVudF92aWV3LmpzIiwic291cmNlL2pzL2V2ZW50cy9kZWZhdWx0LmpzIiwic291cmNlL2pzL2V2ZW50cy9tYXAuanMiLCJzb3VyY2UvanMvZXZlbnRzL25vcm1hbGl6ZXIuanMiLCJzb3VyY2UvanMvaGlnaGxpZ2h0ZXJzL2hpZ2hsaWdodGVyLmpzIiwic291cmNlL2pzL2hpZ2hsaWdodGVycy9zeW50YXguanMiLCJzb3VyY2UvanMvaGlnaGxpZ2h0ZXJzL3N5bnRheC9pbml0LmpzIiwic291cmNlL2pzL2hpZ2hsaWdodGVycy9zeW50YXgvamF2YXNjcmlwdC5qcyIsInNvdXJjZS9qcy9oaWdobGlnaHRlcnMvc3ludGF4L3ZiLmpzIiwic291cmNlL2pzL3JlbmRlcmVycy9iYXRjaC5qcyIsInNvdXJjZS9qcy9yZW5kZXJlcnMvY29sb3IuanMiLCJzb3VyY2UvanMvcmVuZGVyZXJzL2N1cnNvcnMuanMiLCJzb3VyY2UvanMvcmVuZGVyZXJzL2hpZ2hsaWdodGVkX3Jvdy5qcyIsInNvdXJjZS9qcy9yZW5kZXJlcnMvcmVuZGVyZXIuanMiLCJzb3VyY2UvanMvcmVuZGVyZXJzL3Jvdy5qcyIsInNvdXJjZS9qcy9yZW5kZXJlcnMvc2VsZWN0aW9ucy5qcyIsInNvdXJjZS9qcy9zY3JvbGxpbmdfY2FudmFzLmpzIiwic291cmNlL2pzL3N0eWxlLmpzIiwic291cmNlL2pzL3N0eWxlcy9pbml0LmpzIiwic291cmNlL2pzL3N0eWxlcy9tb25va2FpLmpzIiwic291cmNlL2pzL3V0aWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xhQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6WUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDclRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3aEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckVBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIHNjcm9sbGluZ19jYW52YXMgPSByZXF1aXJlKCcuL3Njcm9sbGluZ19jYW52YXMuanMnKTtcbnZhciBkb2N1bWVudF9jb250cm9sbGVyID0gcmVxdWlyZSgnLi9kb2N1bWVudF9jb250cm9sbGVyLmpzJyk7XG52YXIgZG9jdW1lbnRfbW9kZWwgPSByZXF1aXJlKCcuL2RvY3VtZW50X21vZGVsLmpzJyk7XG52YXIgZG9jdW1lbnRfdmlldyA9IHJlcXVpcmUoJy4vZG9jdW1lbnRfdmlldy5qcycpO1xudmFyIHN0eWxlID0gcmVxdWlyZSgnLi9zdHlsZS5qcycpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xuXG4vKipcbiAqIENhbnZhcyBiYXNlZCB0ZXh0IGVkaXRvclxuICovXG52YXIgUG9zdGVyID0gZnVuY3Rpb24oKSB7XG4gICAgdXRpbHMuUG9zdGVyQ2xhc3MuY2FsbCh0aGlzKTtcblxuICAgIC8vIENyZWF0ZSBjYW52YXNcbiAgICB0aGlzLmNhbnZhcyA9IG5ldyBzY3JvbGxpbmdfY2FudmFzLlNjcm9sbGluZ0NhbnZhcygpO1xuICAgIHRoaXMuZWwgPSB0aGlzLmNhbnZhcy5lbDsgLy8gQ29udmVuaWVuY2VcbiAgICB0aGlzLl9zdHlsZSA9IG5ldyBzdHlsZS5TdHlsZSgpO1xuICAgIHRoaXMuX2NvbmZpZyA9IG5ldyB1dGlscy5Qb3N0ZXJDbGFzcyhbJ2hpZ2hsaWdodF9kcmF3J10pO1xuXG4gICAgLy8gQ3JlYXRlIG1vZGVsLCBjb250cm9sbGVyLCBhbmQgdmlldy5cbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdGhpcy5tb2RlbCA9IG5ldyBkb2N1bWVudF9tb2RlbC5Eb2N1bWVudE1vZGVsKCk7XG4gICAgdGhpcy5jb250cm9sbGVyID0gbmV3IGRvY3VtZW50X2NvbnRyb2xsZXIuRG9jdW1lbnRDb250cm9sbGVyKHRoaXMuY2FudmFzLmVsLCB0aGlzLm1vZGVsKTtcbiAgICB0aGlzLnZpZXcgPSBuZXcgZG9jdW1lbnRfdmlldy5Eb2N1bWVudFZpZXcoXG4gICAgICAgIHRoaXMuY2FudmFzLCBcbiAgICAgICAgdGhpcy5tb2RlbCwgXG4gICAgICAgIHRoaXMuY29udHJvbGxlci5jdXJzb3JzLCBcbiAgICAgICAgdGhpcy5fc3R5bGUsXG4gICAgICAgIHRoaXMuX2NvbmZpZyxcbiAgICAgICAgZnVuY3Rpb24oKSB7IHJldHVybiB0aGF0LmNvbnRyb2xsZXIuY2xpcGJvYXJkLmhpZGRlbl9pbnB1dCA9PT0gZG9jdW1lbnQuYWN0aXZlRWxlbWVudCB8fCB0aGF0LmNhbnZhcy5mb2N1c2VkOyB9XG4gICAgKTtcblxuICAgIC8vIENyZWF0ZSBwcm9wZXJ0aWVzXG4gICAgdGhpcy5wcm9wZXJ0eSgnc3R5bGUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoYXQuX3N0eWxlO1xuICAgIH0pO1xuICAgIHRoaXMucHJvcGVydHkoJ2NvbmZpZycsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC5fY29uZmlnO1xuICAgIH0pO1xuICAgIHRoaXMucHJvcGVydHkoJ3ZhbHVlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Lm1vZGVsLnRleHQ7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC5tb2RlbC50ZXh0ID0gdmFsdWU7XG4gICAgfSk7XG4gICAgdGhpcy5wcm9wZXJ0eSgnd2lkdGgnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoYXQudmlldy53aWR0aDtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0LnZpZXcud2lkdGggPSB2YWx1ZTtcbiAgICB9KTtcbiAgICB0aGlzLnByb3BlcnR5KCdoZWlnaHQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoYXQudmlldy5oZWlnaHQ7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC52aWV3LmhlaWdodCA9IHZhbHVlO1xuICAgIH0pO1xuICAgIHRoaXMucHJvcGVydHkoJ2xhbmd1YWdlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0LnZpZXcubGFuZ3VhZ2U7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC52aWV3Lmxhbmd1YWdlID0gdmFsdWU7XG4gICAgfSk7XG59O1xudXRpbHMuaW5oZXJpdChQb3N0ZXIsIHV0aWxzLlBvc3RlckNsYXNzKTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5Qb3N0ZXIgPSBQb3N0ZXI7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG5cbi8qKlxuICogQW5pbWF0aW9uIGhlbHBlci5cbiAqL1xudmFyIEFuaW1hdG9yID0gZnVuY3Rpb24oZHVyYXRpb24pIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMuZHVyYXRpb24gPSBkdXJhdGlvbjtcbiAgICB0aGlzLl9zdGFydCA9IERhdGUubm93KCk7XG59O1xudXRpbHMuaW5oZXJpdChBbmltYXRvciwgdXRpbHMuUG9zdGVyQ2xhc3MpO1xuXG4vKipcbiAqIEdldCB0aGUgdGltZSBpbiB0aGUgYW5pbWF0aW9uXG4gKiBAcmV0dXJuIHtmbG9hdH0gYmV0d2VlbiAwIGFuZCAxXG4gKi9cbkFuaW1hdG9yLnByb3RvdHlwZS50aW1lID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGVsYXBzZWQgPSBEYXRlLm5vdygpIC0gdGhpcy5fc3RhcnQ7XG4gICAgcmV0dXJuIChlbGFwc2VkICUgdGhpcy5kdXJhdGlvbikgLyB0aGlzLmR1cmF0aW9uO1xufTtcblxuZXhwb3J0cy5BbmltYXRvciA9IEFuaW1hdG9yOyIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG5cbi8qKlxuICogSFRNTCBjYW52YXMgd2l0aCBkcmF3aW5nIGNvbnZpbmllbmNlIGZ1bmN0aW9ucy5cbiAqL1xudmFyIENhbnZhcyA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3JlbmRlcmVkX3JlZ2lvbiA9IFtudWxsLCBudWxsLCBudWxsLCBudWxsXTsgLy8geDEseTEseDIseTJcblxuICAgIHV0aWxzLlBvc3RlckNsYXNzLmNhbGwodGhpcyk7XG4gICAgdGhpcy5fbGF5b3V0KCk7XG4gICAgdGhpcy5faW5pdF9wcm9wZXJ0aWVzKCk7XG4gICAgdGhpcy5fbGFzdF9zZXRfb3B0aW9ucyA9IHt9O1xuXG4gICAgdGhpcy5fdGV4dF9zaXplX2NhY2hlID0ge307XG4gICAgdGhpcy5fdGV4dF9zaXplX2FycmF5ID0gW107XG4gICAgdGhpcy5fdGV4dF9zaXplX2NhY2hlX3NpemUgPSAxMDAwO1xuXG4gICAgLy8gU2V0IGRlZmF1bHQgc2l6ZS5cbiAgICB0aGlzLndpZHRoID0gNDAwO1xuICAgIHRoaXMuaGVpZ2h0ID0gMzAwO1xufTtcbnV0aWxzLmluaGVyaXQoQ2FudmFzLCB1dGlscy5Qb3N0ZXJDbGFzcyk7XG5cbi8qKlxuICogTGF5b3V0IHRoZSBlbGVtZW50cyBmb3IgdGhlIGNhbnZhcy5cbiAqIENyZWF0ZXMgYHRoaXMuZWxgXG4gKiBcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuX2xheW91dCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2NhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuICAgIHRoaXMuX2NhbnZhcy5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ3Bvc3RlciBoaWRkZW4tY2FudmFzJyk7XG4gICAgdGhpcy5jb250ZXh0ID0gdGhpcy5fY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgICAgIFxuICAgIC8vIFN0cmV0Y2ggdGhlIGltYWdlIGZvciByZXRpbmEgc3VwcG9ydC5cbiAgICB0aGlzLnNjYWxlKDIsMik7XG59O1xuXG4vKipcbiAqIE1ha2UgdGhlIHByb3BlcnRpZXMgb2YgdGhlIGNsYXNzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5faW5pdF9wcm9wZXJ0aWVzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogSGVpZ2h0IG9mIHRoZSBjYW52YXNcbiAgICAgKiBAcmV0dXJuIHtmbG9hdH1cbiAgICAgKi9cbiAgICB0aGlzLnByb3BlcnR5KCdoZWlnaHQnLCBmdW5jdGlvbigpIHsgXG4gICAgICAgIHJldHVybiB0aGF0Ll9jYW52YXMuaGVpZ2h0IC8gMjsgXG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC5fY2FudmFzLnNldEF0dHJpYnV0ZSgnaGVpZ2h0JywgdmFsdWUgKiAyKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFN0cmV0Y2ggdGhlIGltYWdlIGZvciByZXRpbmEgc3VwcG9ydC5cbiAgICAgICAgdGhpcy5zY2FsZSgyLDIpO1xuICAgICAgICB0aGlzLl90b3VjaCgpO1xuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogV2lkdGggb2YgdGhlIGNhbnZhc1xuICAgICAqIEByZXR1cm4ge2Zsb2F0fVxuICAgICAqL1xuICAgIHRoaXMucHJvcGVydHkoJ3dpZHRoJywgZnVuY3Rpb24oKSB7IFxuICAgICAgICByZXR1cm4gdGhhdC5fY2FudmFzLndpZHRoIC8gMjsgXG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC5fY2FudmFzLnNldEF0dHJpYnV0ZSgnd2lkdGgnLCB2YWx1ZSAqIDIpO1xuICAgICAgICBcbiAgICAgICAgLy8gU3RyZXRjaCB0aGUgaW1hZ2UgZm9yIHJldGluYSBzdXBwb3J0LlxuICAgICAgICB0aGlzLnNjYWxlKDIsMik7XG4gICAgICAgIHRoaXMuX3RvdWNoKCk7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBSZWdpb24gb2YgdGhlIGNhbnZhcyB0aGF0IGhhcyBiZWVuIHJlbmRlcmVkIHRvXG4gICAgICogQHJldHVybiB7ZGljdGlvbmFyeX0gZGljdGlvbmFyeSBkZXNjcmliaW5nIGEgcmVjdGFuZ2xlIHt4LHksd2lkdGgsaGVpZ2h0fVxuICAgICAqL1xuICAgIHRoaXMucHJvcGVydHkoJ3JlbmRlcmVkX3JlZ2lvbicsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgeDogdGhpcy5fdHgodGhpcy5fcmVuZGVyZWRfcmVnaW9uWzBdLCB0cnVlKSxcbiAgICAgICAgICAgIHk6IHRoaXMuX3R5KHRoaXMuX3JlbmRlcmVkX3JlZ2lvblsxXSwgdHJ1ZSksXG4gICAgICAgICAgICB3aWR0aDogdGhpcy5fcmVuZGVyZWRfcmVnaW9uWzJdIC0gdGhpcy5fcmVuZGVyZWRfcmVnaW9uWzBdLFxuICAgICAgICAgICAgaGVpZ2h0OiB0aGlzLl9yZW5kZXJlZF9yZWdpb25bM10gLSB0aGlzLl9yZW5kZXJlZF9yZWdpb25bMV0sXG4gICAgICAgIH07XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIERyYXdzIGEgcmVjdGFuZ2xlXG4gKiBAcGFyYW0gIHtmbG9hdH0geFxuICogQHBhcmFtICB7ZmxvYXR9IHlcbiAqIEBwYXJhbSAge2Zsb2F0fSB3aWR0aFxuICogQHBhcmFtICB7ZmxvYXR9IGhlaWdodFxuICogQHBhcmFtICB7ZGljdGlvbmFyeX0gb3B0aW9ucywgc2VlIF9hcHBseV9vcHRpb25zKCkgZm9yIGRldGFpbHNcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuZHJhd19yZWN0YW5nbGUgPSBmdW5jdGlvbih4LCB5LCB3aWR0aCwgaGVpZ2h0LCBvcHRpb25zKSB7XG4gICAgeCA9IHRoaXMuX3R4KHgpO1xuICAgIHkgPSB0aGlzLl90eSh5KTtcbiAgICB0aGlzLmNvbnRleHQuYmVnaW5QYXRoKCk7XG4gICAgdGhpcy5jb250ZXh0LnJlY3QoeCwgeSwgd2lkdGgsIGhlaWdodCk7XG4gICAgdGhpcy5fZG9fZHJhdyhvcHRpb25zKTtcbiAgICB0aGlzLl90b3VjaCh4LCB5LCB4K3dpZHRoLCB5K2hlaWdodCk7XG59O1xuXG4vKipcbiAqIERyYXdzIGEgY2lyY2xlXG4gKiBAcGFyYW0gIHtmbG9hdH0geFxuICogQHBhcmFtICB7ZmxvYXR9IHlcbiAqIEBwYXJhbSAge2Zsb2F0fSByXG4gKiBAcGFyYW0gIHtkaWN0aW9uYXJ5fSBvcHRpb25zLCBzZWUgX2FwcGx5X29wdGlvbnMoKSBmb3IgZGV0YWlsc1xuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5kcmF3X2NpcmNsZSA9IGZ1bmN0aW9uKHgsIHksIHIsIG9wdGlvbnMpIHtcbiAgICB4ID0gdGhpcy5fdHgoeCk7XG4gICAgeSA9IHRoaXMuX3R5KHkpO1xuICAgIHRoaXMuY29udGV4dC5iZWdpblBhdGgoKTtcbiAgICB0aGlzLmNvbnRleHQuYXJjKHgsIHksIHIsIDAsIDIgKiBNYXRoLlBJKTtcbiAgICB0aGlzLl9kb19kcmF3KG9wdGlvbnMpO1xuICAgIHRoaXMuX3RvdWNoKHgtciwgeS1yLCB4K3IsIHkrcik7XG59O1xuXG4vKipcbiAqIERyYXdzIGFuIGltYWdlXG4gKiBAcGFyYW0gIHtpbWcgZWxlbWVudH0gaW1nXG4gKiBAcGFyYW0gIHtmbG9hdH0geFxuICogQHBhcmFtICB7ZmxvYXR9IHlcbiAqIEBwYXJhbSAge2Zsb2F0fSAob3B0aW9uYWwpIHdpZHRoXG4gKiBAcGFyYW0gIHtmbG9hdH0gKG9wdGlvbmFsKSBoZWlnaHRcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuZHJhd19pbWFnZSA9IGZ1bmN0aW9uKGltZywgeCwgeSwgd2lkdGgsIGhlaWdodCkge1xuICAgIHggPSB0aGlzLl90eCh4KTtcbiAgICB5ID0gdGhpcy5fdHkoeSk7XG4gICAgd2lkdGggPSB3aWR0aCB8fCBpbWcud2lkdGg7XG4gICAgaGVpZ2h0ID0gaGVpZ2h0IHx8IGltZy5oZWlnaHQ7XG4gICAgaW1nID0gaW1nLl9jYW52YXMgPyBpbWcuX2NhbnZhcyA6IGltZztcbiAgICB0aGlzLmNvbnRleHQuZHJhd0ltYWdlKGltZywgeCwgeSwgd2lkdGgsIGhlaWdodCk7XG4gICAgdGhpcy5fdG91Y2goeCwgeSwgdGhpcy53aWR0aCwgdGhpcy5oZWlnaHQpO1xufTtcblxuLyoqXG4gKiBEcmF3cyBhIGxpbmVcbiAqIEBwYXJhbSAge2Zsb2F0fSB4MVxuICogQHBhcmFtICB7ZmxvYXR9IHkxXG4gKiBAcGFyYW0gIHtmbG9hdH0geDJcbiAqIEBwYXJhbSAge2Zsb2F0fSB5MlxuICogQHBhcmFtICB7ZGljdGlvbmFyeX0gb3B0aW9ucywgc2VlIF9hcHBseV9vcHRpb25zKCkgZm9yIGRldGFpbHNcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuZHJhd19saW5lID0gZnVuY3Rpb24oeDEsIHkxLCB4MiwgeTIsIG9wdGlvbnMpIHtcbiAgICB4MSA9IHRoaXMuX3R4KHgxKTtcbiAgICB5MSA9IHRoaXMuX3R5KHkxKTtcbiAgICB4MiA9IHRoaXMuX3R4KHgyKTtcbiAgICB5MiA9IHRoaXMuX3R5KHkyKTtcbiAgICB0aGlzLmNvbnRleHQuYmVnaW5QYXRoKCk7XG4gICAgdGhpcy5jb250ZXh0Lm1vdmVUbyh4MSwgeTEpO1xuICAgIHRoaXMuY29udGV4dC5saW5lVG8oeDIsIHkyKTtcbiAgICB0aGlzLl9kb19kcmF3KG9wdGlvbnMpO1xuICAgIHRoaXMuX3RvdWNoKHgxLCB5MSwgeDIsIHkyKTtcbn07XG5cbi8qKlxuICogRHJhd3MgYSBwb2x5IGxpbmVcbiAqIEBwYXJhbSAge2FycmF5fSBwb2ludHMgLSBhcnJheSBvZiBwb2ludHMuICBFYWNoIHBvaW50IGlzXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgYW4gYXJyYXkgaXRzZWxmLCBvZiB0aGUgZm9ybSBbeCwgeV0gXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgd2hlcmUgeCBhbmQgeSBhcmUgZmxvYXRpbmcgcG9pbnRcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZXMuXG4gKiBAcGFyYW0gIHtkaWN0aW9uYXJ5fSBvcHRpb25zLCBzZWUgX2FwcGx5X29wdGlvbnMoKSBmb3IgZGV0YWlsc1xuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5kcmF3X3BvbHlsaW5lID0gZnVuY3Rpb24ocG9pbnRzLCBvcHRpb25zKSB7XG4gICAgaWYgKHBvaW50cy5sZW5ndGggPCAyKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignUG9seSBsaW5lIG11c3QgaGF2ZSBhdGxlYXN0IHR3byBwb2ludHMuJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5jb250ZXh0LmJlZ2luUGF0aCgpO1xuICAgICAgICB2YXIgcG9pbnQgPSBwb2ludHNbMF07XG4gICAgICAgIHRoaXMuY29udGV4dC5tb3ZlVG8odGhpcy5fdHgocG9pbnRbMF0pLCB0aGlzLl90eShwb2ludFsxXSkpO1xuXG4gICAgICAgIHZhciBtaW54ID0gdGhpcy53aWR0aDtcbiAgICAgICAgdmFyIG1pbnkgPSB0aGlzLmhlaWdodDtcbiAgICAgICAgdmFyIG1heHggPSAwO1xuICAgICAgICB2YXIgbWF4eSA9IDA7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgcG9pbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBwb2ludCA9IHBvaW50c1tpXTtcbiAgICAgICAgICAgIHRoaXMuY29udGV4dC5saW5lVG8odGhpcy5fdHgocG9pbnRbMF0pLCB0aGlzLl90eShwb2ludFsxXSkpO1xuXG4gICAgICAgICAgICBtaW54ID0gTWF0aC5taW4odGhpcy5fdHgocG9pbnRbMF0pLCBtaW54KTtcbiAgICAgICAgICAgIG1pbnkgPSBNYXRoLm1pbih0aGlzLl90eShwb2ludFsxXSksIG1pbnkpO1xuICAgICAgICAgICAgbWF4eCA9IE1hdGgubWF4KHRoaXMuX3R4KHBvaW50WzBdKSwgbWF4eCk7XG4gICAgICAgICAgICBtYXh5ID0gTWF0aC5tYXgodGhpcy5fdHkocG9pbnRbMV0pLCBtYXh5KTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9kb19kcmF3KG9wdGlvbnMpOyBcbiAgICAgICAgdGhpcy5fdG91Y2gobWlueCwgbWlueSwgbWF4eCwgbWF4eSk7ICAgXG4gICAgfVxufTtcblxuLyoqXG4gKiBEcmF3cyBhIHRleHQgc3RyaW5nXG4gKiBAcGFyYW0gIHtmbG9hdH0geFxuICogQHBhcmFtICB7ZmxvYXR9IHlcbiAqIEBwYXJhbSAge3N0cmluZ30gdGV4dCBzdHJpbmcgb3IgY2FsbGJhY2sgdGhhdCByZXNvbHZlcyB0byBhIHN0cmluZy5cbiAqIEBwYXJhbSAge2RpY3Rpb25hcnl9IG9wdGlvbnMsIHNlZSBfYXBwbHlfb3B0aW9ucygpIGZvciBkZXRhaWxzXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DYW52YXMucHJvdG90eXBlLmRyYXdfdGV4dCA9IGZ1bmN0aW9uKHgsIHksIHRleHQsIG9wdGlvbnMpIHtcbiAgICB4ID0gdGhpcy5fdHgoeCk7XG4gICAgeSA9IHRoaXMuX3R5KHkpO1xuICAgIG9wdGlvbnMgPSB0aGlzLl9hcHBseV9vcHRpb25zKG9wdGlvbnMpO1xuICAgIC8vICdmaWxsJyB0aGUgdGV4dCBieSBkZWZhdWx0IHdoZW4gbmVpdGhlciBhIHN0cm9rZSBvciBmaWxsIFxuICAgIC8vIGlzIGRlZmluZWQuICBPdGhlcndpc2Ugb25seSBmaWxsIGlmIGEgZmlsbCBpcyBkZWZpbmVkLlxuICAgIGlmIChvcHRpb25zLmZpbGwgfHwgIW9wdGlvbnMuc3Ryb2tlKSB7XG4gICAgICAgIHRoaXMuY29udGV4dC5maWxsVGV4dCh0ZXh0LCB4LCB5KTtcbiAgICB9XG4gICAgLy8gT25seSBzdHJva2UgaWYgYSBzdHJva2UgaXMgZGVmaW5lZC5cbiAgICBpZiAob3B0aW9ucy5zdHJva2UpIHtcbiAgICAgICAgdGhpcy5jb250ZXh0LnN0cm9rZVRleHQodGV4dCwgeCwgeSk7ICAgICAgIFxuICAgIH1cbiAgICB0aGlzLl90b3VjaCh4LCB5LCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCk7XG59O1xuXG4vKipcbiAqIEdldCdzIGEgY2h1bmsgb2YgdGhlIGNhbnZhcyBhcyBhIHJhdyBpbWFnZS5cbiAqIEBwYXJhbSAge2Zsb2F0fSAob3B0aW9uYWwpIHhcbiAqIEBwYXJhbSAge2Zsb2F0fSAob3B0aW9uYWwpIHlcbiAqIEBwYXJhbSAge2Zsb2F0fSAob3B0aW9uYWwpIHdpZHRoXG4gKiBAcGFyYW0gIHtmbG9hdH0gKG9wdGlvbmFsKSBoZWlnaHRcbiAqIEByZXR1cm4ge2ltYWdlfSBjYW52YXMgaW1hZ2UgZGF0YVxuICovXG5DYW52YXMucHJvdG90eXBlLmdldF9yYXdfaW1hZ2UgPSBmdW5jdGlvbih4LCB5LCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgY29uc29sZS53YXJuKCdnZXRfcmF3X2ltYWdlIGltYWdlIGlzIHNsb3csIHVzZSBjYW52YXMgcmVmZXJlbmNlcyBpbnN0ZWFkIHdpdGggZHJhd19pbWFnZScpO1xuICAgIGlmICh4PT09dW5kZWZpbmVkKSB7XG4gICAgICAgIHggPSAwO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHggPSB0aGlzLl90eCh4KTtcbiAgICB9XG4gICAgaWYgKHk9PT11bmRlZmluZWQpIHtcbiAgICAgICAgeSA9IDA7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgeSA9IHRoaXMuX3R5KHkpO1xuICAgIH1cbiAgICBpZiAod2lkdGggPT09IHVuZGVmaW5lZCkgd2lkdGggPSB0aGlzLndpZHRoO1xuICAgIGlmIChoZWlnaHQgPT09IHVuZGVmaW5lZCkgaGVpZ2h0ID0gdGhpcy5oZWlnaHQ7XG5cbiAgICAvLyBNdWx0aXBseSBieSB0d28gZm9yIHBpeGVsIGRvdWJsaW5nLlxuICAgIHggPSAyICogeDtcbiAgICB5ID0gMiAqIHk7XG4gICAgd2lkdGggPSAyICogd2lkdGg7XG4gICAgaGVpZ2h0ID0gMiAqIGhlaWdodDtcbiAgICBcbiAgICAvLyBVcGRhdGUgdGhlIGNhY2hlZCBpbWFnZSBpZiBpdCdzIG5vdCB0aGUgcmVxdWVzdGVkIG9uZS5cbiAgICB2YXIgcmVnaW9uID0gW3gsIHksIHdpZHRoLCBoZWlnaHRdO1xuICAgIGlmICghKHRoaXMuX2NhY2hlZF90aW1lc3RhbXAgPT09IHRoaXMuX21vZGlmaWVkICYmIHV0aWxzLmNvbXBhcmVfYXJyYXlzKHJlZ2lvbiwgdGhpcy5fY2FjaGVkX3JlZ2lvbikpKSB7XG4gICAgICAgIHRoaXMuX2NhY2hlZF9pbWFnZSA9IHRoaXMuY29udGV4dC5nZXRJbWFnZURhdGEoeCwgeSwgd2lkdGgsIGhlaWdodCk7XG4gICAgICAgIHRoaXMuX2NhY2hlZF90aW1lc3RhbXAgPSB0aGlzLl9tb2RpZmllZDtcbiAgICAgICAgdGhpcy5fY2FjaGVkX3JlZ2lvbiA9IHJlZ2lvbjtcbiAgICB9XG5cbiAgICAvLyBSZXR1cm4gdGhlIGNhY2hlZCBpbWFnZS5cbiAgICByZXR1cm4gdGhpcy5fY2FjaGVkX2ltYWdlO1xufTtcblxuLyoqXG4gKiBQdXQncyBhIHJhdyBpbWFnZSBvbiB0aGUgY2FudmFzIHNvbWV3aGVyZS5cbiAqIEBwYXJhbSAge2Zsb2F0fSB4XG4gKiBAcGFyYW0gIHtmbG9hdH0geVxuICogQHJldHVybiB7aW1hZ2V9IGNhbnZhcyBpbWFnZSBkYXRhXG4gKi9cbkNhbnZhcy5wcm90b3R5cGUucHV0X3Jhd19pbWFnZSA9IGZ1bmN0aW9uKGltZywgeCwgeSkge1xuICAgIGNvbnNvbGUud2FybigncHV0X3Jhd19pbWFnZSBpbWFnZSBpcyBzbG93LCB1c2UgZHJhd19pbWFnZSBpbnN0ZWFkJyk7XG4gICAgeCA9IHRoaXMuX3R4KHgpO1xuICAgIHkgPSB0aGlzLl90eSh5KTtcbiAgICAvLyBNdWx0aXBseSBieSB0d28gZm9yIHBpeGVsIGRvdWJsaW5nLlxuICAgIHJldCA9IHRoaXMuY29udGV4dC5wdXRJbWFnZURhdGEoaW1nLCB4KjIsIHkqMik7XG4gICAgdGhpcy5fdG91Y2goeCwgeSwgdGhpcy53aWR0aCwgdGhpcy5oZWlnaHQpO1xuICAgIHJldHVybiByZXQ7XG59O1xuXG4vKipcbiAqIE1lYXN1cmVzIHRoZSB3aWR0aCBvZiBhIHRleHQgc3RyaW5nLlxuICogQHBhcmFtICB7c3RyaW5nfSB0ZXh0XG4gKiBAcGFyYW0gIHtkaWN0aW9uYXJ5fSBvcHRpb25zLCBzZWUgX2FwcGx5X29wdGlvbnMoKSBmb3IgZGV0YWlsc1xuICogQHJldHVybiB7ZmxvYXR9IHdpZHRoXG4gKi9cbkNhbnZhcy5wcm90b3R5cGUubWVhc3VyZV90ZXh0ID0gZnVuY3Rpb24odGV4dCwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSB0aGlzLl9hcHBseV9vcHRpb25zKG9wdGlvbnMpO1xuXG4gICAgLy8gQ2FjaGUgdGhlIHNpemUgaWYgaXQncyBub3QgYWxyZWFkeSBjYWNoZWQuXG4gICAgaWYgKHRoaXMuX3RleHRfc2l6ZV9jYWNoZVt0ZXh0XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuX3RleHRfc2l6ZV9jYWNoZVt0ZXh0XSA9IHRoaXMuY29udGV4dC5tZWFzdXJlVGV4dCh0ZXh0KS53aWR0aDtcbiAgICAgICAgdGhpcy5fdGV4dF9zaXplX2FycmF5LnB1c2godGV4dCk7XG5cbiAgICAgICAgLy8gUmVtb3ZlIHRoZSBvbGRlc3QgaXRlbSBpbiB0aGUgYXJyYXkgaWYgdGhlIGNhY2hlIGlzIHRvbyBsYXJnZS5cbiAgICAgICAgd2hpbGUgKHRoaXMuX3RleHRfc2l6ZV9hcnJheS5sZW5ndGggPiB0aGlzLl90ZXh0X3NpemVfY2FjaGVfc2l6ZSkge1xuICAgICAgICAgICAgdmFyIG9sZGVzdCA9IHRoaXMuX3RleHRfc2l6ZV9hcnJheS5zaGlmdCgpO1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuX3RleHRfc2l6ZV9jYWNoZVtvbGRlc3RdO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8vIFVzZSB0aGUgY2FjaGVkIHNpemUuXG4gICAgcmV0dXJuIHRoaXMuX3RleHRfc2l6ZV9jYWNoZVt0ZXh0XTtcbn07XG5cbi8qKlxuICogQ2xlYXIncyB0aGUgY2FudmFzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuY29udGV4dC5jbGVhclJlY3QoMCwgMCwgdGhpcy53aWR0aCwgdGhpcy5oZWlnaHQpO1xuICAgIHRoaXMuX3RvdWNoKCk7XG59O1xuXG4vKipcbiAqIFNjYWxlIHRoZSBjdXJyZW50IGRyYXdpbmcuXG4gKiBAcGFyYW0gIHtmbG9hdH0geFxuICogQHBhcmFtICB7ZmxvYXR9IHlcbiAqIEByZXR1cm4ge251bGx9ICBcbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5zY2FsZSA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICB0aGlzLmNvbnRleHQuc2NhbGUoeCwgeSk7XG4gICAgdGhpcy5fdG91Y2goKTtcbn07XG5cbi8qKlxuICogRmluaXNoZXMgdGhlIGRyYXdpbmcgb3BlcmF0aW9uIHVzaW5nIHRoZSBzZXQgb2YgcHJvdmlkZWQgb3B0aW9ucy5cbiAqIEBwYXJhbSAge2RpY3Rpb25hcnl9IChvcHRpb25hbCkgZGljdGlvbmFyeSB0aGF0IFxuICogIHJlc29sdmVzIHRvIGEgZGljdGlvbmFyeS5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuX2RvX2RyYXcgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IHRoaXMuX2FwcGx5X29wdGlvbnMob3B0aW9ucyk7XG5cbiAgICAvLyBPbmx5IGZpbGwgaWYgYSBmaWxsIGlzIGRlZmluZWQuXG4gICAgaWYgKG9wdGlvbnMuZmlsbCkge1xuICAgICAgICB0aGlzLmNvbnRleHQuZmlsbCgpO1xuICAgIH1cbiAgICAvLyBTdHJva2UgYnkgZGVmYXVsdCwgaWYgbm8gc3Ryb2tlIG9yIGZpbGwgaXMgZGVmaW5lZC4gIE90aGVyd2lzZVxuICAgIC8vIG9ubHkgc3Ryb2tlIGlmIGEgc3Ryb2tlIGlzIGRlZmluZWQuXG4gICAgaWYgKG9wdGlvbnMuc3Ryb2tlIHx8ICFvcHRpb25zLmZpbGwpIHtcbiAgICAgICAgdGhpcy5jb250ZXh0LnN0cm9rZSgpO1xuICAgIH1cbn07XG5cbi8qKlxuICogQXBwbGllcyBhIGRpY3Rpb25hcnkgb2YgZHJhd2luZyBvcHRpb25zIHRvIHRoZSBwZW4uXG4gKiBAcGFyYW0gIHtkaWN0aW9uYXJ5fSBvcHRpb25zXG4gKiAgICAgIGFscGhhIHtmbG9hdH0gT3BhY2l0eSAoMC0xKVxuICogICAgICBjb21wb3NpdGVfb3BlcmF0aW9uIHtzdHJpbmd9IEhvdyBuZXcgaW1hZ2VzIGFyZSBcbiAqICAgICAgICAgIGRyYXduIG9udG8gYW4gZXhpc3RpbmcgaW1hZ2UuICBQb3NzaWJsZSB2YWx1ZXNcbiAqICAgICAgICAgIGFyZSBgc291cmNlLW92ZXJgLCBgc291cmNlLWF0b3BgLCBgc291cmNlLWluYCwgXG4gKiAgICAgICAgICBgc291cmNlLW91dGAsIGBkZXN0aW5hdGlvbi1vdmVyYCwgXG4gKiAgICAgICAgICBgZGVzdGluYXRpb24tYXRvcGAsIGBkZXN0aW5hdGlvbi1pbmAsIFxuICogICAgICAgICAgYGRlc3RpbmF0aW9uLW91dGAsIGBsaWdodGVyYCwgYGNvcHlgLCBvciBgeG9yYC5cbiAqICAgICAgbGluZV9jYXAge3N0cmluZ30gRW5kIGNhcCBzdHlsZSBmb3IgbGluZXMuXG4gKiAgICAgICAgICBQb3NzaWJsZSB2YWx1ZXMgYXJlICdidXR0JywgJ3JvdW5kJywgb3IgJ3NxdWFyZScuXG4gKiAgICAgIGxpbmVfam9pbiB7c3RyaW5nfSBIb3cgdG8gcmVuZGVyIHdoZXJlIHR3byBsaW5lc1xuICogICAgICAgICAgbWVldC4gIFBvc3NpYmxlIHZhbHVlcyBhcmUgJ2JldmVsJywgJ3JvdW5kJywgb3JcbiAqICAgICAgICAgICdtaXRlcicuXG4gKiAgICAgIGxpbmVfd2lkdGgge2Zsb2F0fSBIb3cgdGhpY2sgbGluZXMgYXJlLlxuICogICAgICBsaW5lX21pdGVyX2xpbWl0IHtmbG9hdH0gTWF4IGxlbmd0aCBvZiBtaXRlcnMuXG4gKiAgICAgIGxpbmVfY29sb3Ige3N0cmluZ30gQ29sb3Igb2YgdGhlIGxpbmUuXG4gKiAgICAgIGZpbGxfY29sb3Ige3N0cmluZ30gQ29sb3IgdG8gZmlsbCB0aGUgc2hhcGUuXG4gKiAgICAgIGNvbG9yIHtzdHJpbmd9IENvbG9yIHRvIHN0cm9rZSBhbmQgZmlsbCB0aGUgc2hhcGUuXG4gKiAgICAgICAgICBMb3dlciBwcmlvcml0eSB0byBsaW5lX2NvbG9yIGFuZCBmaWxsX2NvbG9yLlxuICogICAgICBmb250X3N0eWxlIHtzdHJpbmd9XG4gKiAgICAgIGZvbnRfdmFyaWFudCB7c3RyaW5nfVxuICogICAgICBmb250X3dlaWdodCB7c3RyaW5nfVxuICogICAgICBmb250X3NpemUge3N0cmluZ31cbiAqICAgICAgZm9udF9mYW1pbHkge3N0cmluZ31cbiAqICAgICAgZm9udCB7c3RyaW5nfSBPdmVycmlkZGVzIGFsbCBvdGhlciBmb250IHByb3BlcnRpZXMuXG4gKiAgICAgIHRleHRfYWxpZ24ge3N0cmluZ30gSG9yaXpvbnRhbCBhbGlnbm1lbnQgb2YgdGV4dC4gIFxuICogICAgICAgICAgUG9zc2libGUgdmFsdWVzIGFyZSBgc3RhcnRgLCBgZW5kYCwgYGNlbnRlcmAsXG4gKiAgICAgICAgICBgbGVmdGAsIG9yIGByaWdodGAuXG4gKiAgICAgIHRleHRfYmFzZWxpbmUge3N0cmluZ30gVmVydGljYWwgYWxpZ25tZW50IG9mIHRleHQuXG4gKiAgICAgICAgICBQb3NzaWJsZSB2YWx1ZXMgYXJlIGBhbHBoYWJldGljYCwgYHRvcGAsIFxuICogICAgICAgICAgYGhhbmdpbmdgLCBgbWlkZGxlYCwgYGlkZW9ncmFwaGljYCwgb3IgXG4gKiAgICAgICAgICBgYm90dG9tYC5cbiAqIEByZXR1cm4ge2RpY3Rpb25hcnl9IG9wdGlvbnMsIHJlc29sdmVkLlxuICovXG5DYW52YXMucHJvdG90eXBlLl9hcHBseV9vcHRpb25zID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIG9wdGlvbnMgPSB1dGlscy5yZXNvbHZlX2NhbGxhYmxlKG9wdGlvbnMpO1xuXG4gICAgLy8gU3BlY2lhbCBvcHRpb25zLlxuICAgIHZhciBzZXRfb3B0aW9ucyA9IHt9O1xuICAgIHNldF9vcHRpb25zLmdsb2JhbEFscGhhID0gb3B0aW9ucy5hbHBoYT09PXVuZGVmaW5lZCA/IDEuMCA6IG9wdGlvbnMuYWxwaGE7XG4gICAgc2V0X29wdGlvbnMuZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uID0gb3B0aW9ucy5jb21wb3NpdGVfb3BlcmF0aW9uIHx8ICdzb3VyY2Utb3Zlcic7XG4gICAgXG4gICAgLy8gTGluZSBzdHlsZS5cbiAgICBzZXRfb3B0aW9ucy5saW5lQ2FwID0gb3B0aW9ucy5saW5lX2NhcCB8fCAnYnV0dCc7XG4gICAgc2V0X29wdGlvbnMubGluZUpvaW4gPSBvcHRpb25zLmxpbmVfam9pbiB8fCAnYmV2ZWwnO1xuICAgIHNldF9vcHRpb25zLmxpbmVXaWR0aCA9IG9wdGlvbnMubGluZV93aWR0aD09PXVuZGVmaW5lZCA/IDEuMCA6IG9wdGlvbnMubGluZV93aWR0aDtcbiAgICBzZXRfb3B0aW9ucy5taXRlckxpbWl0ID0gb3B0aW9ucy5saW5lX21pdGVyX2xpbWl0PT09dW5kZWZpbmVkID8gMTAgOiBvcHRpb25zLmxpbmVfbWl0ZXJfbGltaXQ7XG4gICAgc2V0X29wdGlvbnMuc3Ryb2tlU3R5bGUgPSBvcHRpb25zLmxpbmVfY29sb3IgfHwgb3B0aW9ucy5jb2xvciB8fCAnYmxhY2snOyAvLyBUT0RPOiBTdXBwb3J0IGdyYWRpZW50XG4gICAgb3B0aW9ucy5zdHJva2UgPSAob3B0aW9ucy5saW5lX2NvbG9yICE9PSB1bmRlZmluZWQgfHwgb3B0aW9ucy5saW5lX3dpZHRoICE9PSB1bmRlZmluZWQpO1xuXG4gICAgLy8gRmlsbCBzdHlsZS5cbiAgICBzZXRfb3B0aW9ucy5maWxsU3R5bGUgPSBvcHRpb25zLmZpbGxfY29sb3IgfHwgb3B0aW9ucy5jb2xvciB8fCAnYmxhY2snOyAvLyBUT0RPOiBTdXBwb3J0IGdyYWRpZW50XG4gICAgb3B0aW9ucy5maWxsID0gb3B0aW9ucy5maWxsX2NvbG9yICE9PSB1bmRlZmluZWQ7XG5cbiAgICAvLyBGb250IHN0eWxlLlxuICAgIHZhciBmb250X3N0eWxlID0gb3B0aW9ucy5mb250X3N0eWxlIHx8ICcnO1xuICAgIHZhciBmb250X3ZhcmlhbnQgPSBvcHRpb25zLmZvbnRfdmFyaWFudCB8fCAnJztcbiAgICB2YXIgZm9udF93ZWlnaHQgPSBvcHRpb25zLmZvbnRfd2VpZ2h0IHx8ICcnO1xuICAgIHZhciBmb250X3NpemUgPSBvcHRpb25zLmZvbnRfc2l6ZSB8fCAnMTJwdCc7XG4gICAgdmFyIGZvbnRfZmFtaWx5ID0gb3B0aW9ucy5mb250X2ZhbWlseSB8fCAnQXJpYWwnO1xuICAgIHZhciBmb250ID0gZm9udF9zdHlsZSArICcgJyArIGZvbnRfdmFyaWFudCArICcgJyArIGZvbnRfd2VpZ2h0ICsgJyAnICsgZm9udF9zaXplICsgJyAnICsgZm9udF9mYW1pbHk7XG4gICAgc2V0X29wdGlvbnMuZm9udCA9IG9wdGlvbnMuZm9udCB8fCBmb250O1xuXG4gICAgLy8gVGV4dCBzdHlsZS5cbiAgICBzZXRfb3B0aW9ucy50ZXh0QWxpZ24gPSBvcHRpb25zLnRleHRfYWxpZ24gfHwgJ2xlZnQnO1xuICAgIHNldF9vcHRpb25zLnRleHRCYXNlbGluZSA9IG9wdGlvbnMudGV4dF9iYXNlbGluZSB8fCAndG9wJztcblxuICAgIC8vIFRPRE86IFN1cHBvcnQgc2hhZG93cy5cbiAgICBcbiAgICAvLyBFbXB0eSB0aGUgbWVhc3VyZSB0ZXh0IGNhY2hlIGlmIHRoZSBmb250IGlzIGNoYW5nZWQuXG4gICAgaWYgKHNldF9vcHRpb25zLmZvbnQgIT09IHRoaXMuX2xhc3Rfc2V0X29wdGlvbnMuZm9udCkge1xuICAgICAgICB0aGlzLl90ZXh0X3NpemVfY2FjaGUgPSB7fTtcbiAgICAgICAgdGhpcy5fdGV4dF9zaXplX2FycmF5ID0gW107XG4gICAgfVxuICAgIFxuICAgIC8vIFNldCB0aGUgb3B0aW9ucyBvbiB0aGUgY29udGV4dCBvYmplY3QuICBPbmx5IHNldCBvcHRpb25zIHRoYXRcbiAgICAvLyBoYXZlIGNoYW5nZWQgc2luY2UgdGhlIGxhc3QgY2FsbC5cbiAgICBmb3IgKHZhciBrZXkgaW4gc2V0X29wdGlvbnMpIHtcbiAgICAgICAgaWYgKHNldF9vcHRpb25zLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9sYXN0X3NldF9vcHRpb25zW2tleV0gIT09IHNldF9vcHRpb25zW2tleV0pIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9sYXN0X3NldF9vcHRpb25zW2tleV0gPSBzZXRfb3B0aW9uc1trZXldO1xuICAgICAgICAgICAgICAgIHRoaXMuY29udGV4dFtrZXldID0gc2V0X29wdGlvbnNba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBvcHRpb25zO1xufTtcblxuLyoqXG4gKiBVcGRhdGUgdGhlIHRpbWVzdGFtcCB0aGF0IHRoZSBjYW52YXMgd2FzIG1vZGlmaWVkIGFuZFxuICogdGhlIHJlZ2lvbiB0aGF0IGhhcyBjb250ZW50cyByZW5kZXJlZCB0byBpdC5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuX3RvdWNoID0gZnVuY3Rpb24oeDEsIHkxLCB4MiwgeTIpIHtcbiAgICB0aGlzLl9tb2RpZmllZCA9IERhdGUubm93KCk7XG5cbiAgICAvLyBTZXQgdGhlIHJlbmRlciByZWdpb24uXG4gICAgdmFyIGNvbXBhcml0b3IgPSBmdW5jdGlvbihvbGRfdmFsdWUsIG5ld192YWx1ZSwgY29tcGFyaXNvbikge1xuICAgICAgICBpZiAob2xkX3ZhbHVlID09PSBudWxsIHx8IG9sZF92YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IG5ld192YWx1ZSA9PT0gbnVsbCB8fCBuZXdfdmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ld192YWx1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBjb21wYXJpc29uLmNhbGwodW5kZWZpbmVkLCBvbGRfdmFsdWUsIG5ld192YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHRoaXMuX3JlbmRlcmVkX3JlZ2lvblswXSA9IGNvbXBhcml0b3IodGhpcy5fcmVuZGVyZWRfcmVnaW9uWzBdLCB4MSwgTWF0aC5taW4pO1xuICAgIHRoaXMuX3JlbmRlcmVkX3JlZ2lvblsxXSA9IGNvbXBhcml0b3IodGhpcy5fcmVuZGVyZWRfcmVnaW9uWzFdLCB5MSwgTWF0aC5taW4pO1xuICAgIHRoaXMuX3JlbmRlcmVkX3JlZ2lvblsyXSA9IGNvbXBhcml0b3IodGhpcy5fcmVuZGVyZWRfcmVnaW9uWzJdLCB4MiwgTWF0aC5tYXgpO1xuICAgIHRoaXMuX3JlbmRlcmVkX3JlZ2lvblszXSA9IGNvbXBhcml0b3IodGhpcy5fcmVuZGVyZWRfcmVnaW9uWzNdLCB5MiwgTWF0aC5tYXgpO1xufTtcblxuLyoqXG4gKiBUcmFuc2Zvcm0gYW4geCB2YWx1ZSBiZWZvcmUgcmVuZGVyaW5nLlxuICogQHBhcmFtICB7ZmxvYXR9IHhcbiAqIEBwYXJhbSAge2Jvb2xlYW59IGludmVyc2UgLSBwZXJmb3JtIGludmVyc2UgdHJhbnNmb3JtYXRpb25cbiAqIEByZXR1cm4ge2Zsb2F0fVxuICovXG5DYW52YXMucHJvdG90eXBlLl90eCA9IGZ1bmN0aW9uKHgsIGludmVyc2UpIHsgcmV0dXJuIHg7IH07XG5cbi8qKlxuICogVHJhbnNmb3JtIGEgeSB2YWx1ZSBiZWZvcmUgcmVuZGVyaW5nLlxuICogQHBhcmFtICB7ZmxvYXR9IHlcbiAqIEBwYXJhbSAge2Jvb2xlYW59IGludmVyc2UgLSBwZXJmb3JtIGludmVyc2UgdHJhbnNmb3JtYXRpb25cbiAqIEByZXR1cm4ge2Zsb2F0fVxuICovXG5DYW52YXMucHJvdG90eXBlLl90eSA9IGZ1bmN0aW9uKHksIGludmVyc2UpIHsgcmV0dXJuIHk7IH07XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuQ2FudmFzID0gQ2FudmFzO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xuXG4vKipcbiAqIEV2ZW50ZnVsIGNsaXBib2FyZCBzdXBwb3J0XG4gKlxuICogV0FSTklORzogIFRoaXMgY2xhc3MgaXMgYSBodWRnZSBrbHVkZ2UgdGhhdCB3b3JrcyBhcm91bmQgdGhlIHByZWhpc3RvcmljXG4gKiBjbGlwYm9hcmQgc3VwcG9ydCAobGFjayB0aGVyZW9mKSBpbiBtb2Rlcm4gd2Vicm93c2Vycy4gIEl0IGNyZWF0ZXMgYSBoaWRkZW5cbiAqIHRleHRib3ggd2hpY2ggaXMgZm9jdXNlZC4gIFRoZSBwcm9ncmFtbWVyIG11c3QgY2FsbCBgc2V0X2NsaXBwYWJsZWAgdG8gY2hhbmdlXG4gKiB3aGF0IHdpbGwgYmUgY29waWVkIHdoZW4gdGhlIHVzZXIgaGl0cyBrZXlzIGNvcnJlc3BvbmRpbmcgdG8gYSBjb3B5IFxuICogb3BlcmF0aW9uLiAgRXZlbnRzIGBjb3B5YCwgYGN1dGAsIGFuZCBgcGFzdGVgIGFyZSByYWlzZWQgYnkgdGhpcyBjbGFzcy5cbiAqL1xudmFyIENsaXBib2FyZCA9IGZ1bmN0aW9uKGVsKSB7XG4gICAgdXRpbHMuUG9zdGVyQ2xhc3MuY2FsbCh0aGlzKTtcbiAgICB0aGlzLl9lbCA9IGVsO1xuXG4gICAgLy8gQ3JlYXRlIGEgdGV4dGJveCB0aGF0J3MgaGlkZGVuLlxuICAgIHRoaXMuaGlkZGVuX2lucHV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGV4dGFyZWEnKTtcbiAgICB0aGlzLmhpZGRlbl9pbnB1dC5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ3Bvc3RlciBoaWRkZW4tY2xpcGJvYXJkJyk7XG4gICAgZWwuYXBwZW5kQ2hpbGQodGhpcy5oaWRkZW5faW5wdXQpO1xuXG4gICAgdGhpcy5fYmluZF9ldmVudHMoKTtcbn07XG51dGlscy5pbmhlcml0KENsaXBib2FyZCwgdXRpbHMuUG9zdGVyQ2xhc3MpO1xuXG4vKipcbiAqIFNldCB3aGF0IHdpbGwgYmUgY29waWVkIHdoZW4gdGhlIHVzZXIgY29waWVzLlxuICogQHBhcmFtIHtzdHJpbmd9IHRleHRcbiAqL1xuQ2xpcGJvYXJkLnByb3RvdHlwZS5zZXRfY2xpcHBhYmxlID0gZnVuY3Rpb24odGV4dCkge1xuICAgIHRoaXMuX2NsaXBwYWJsZSA9IHRleHQ7XG4gICAgdGhpcy5oaWRkZW5faW5wdXQudmFsdWUgPSB0aGlzLl9jbGlwcGFibGU7XG4gICAgdGhpcy5fZm9jdXMoKTtcbn07IFxuXG4vKipcbiAqIEZvY3VzIHRoZSBoaWRkZW4gdGV4dCBhcmVhLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ2xpcGJvYXJkLnByb3RvdHlwZS5fZm9jdXMgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmhpZGRlbl9pbnB1dC5mb2N1cygpO1xuICAgIHRoaXMuaGlkZGVuX2lucHV0LnNlbGVjdCgpO1xufTtcblxuLyoqXG4gKiBIYW5kbGUgd2hlbiB0aGUgdXNlciBwYXN0ZXMgaW50byB0aGUgdGV4dGJveC5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkNsaXBib2FyZC5wcm90b3R5cGUuX2hhbmRsZV9wYXN0ZSA9IGZ1bmN0aW9uKGUpIHtcbiAgICB2YXIgcGFzdGVkID0gZS5jbGlwYm9hcmREYXRhLmdldERhdGEoZS5jbGlwYm9hcmREYXRhLnR5cGVzWzBdKTtcbiAgICB1dGlscy5jYW5jZWxfYnViYmxlKGUpO1xuICAgIHRoaXMudHJpZ2dlcigncGFzdGUnLCBwYXN0ZWQpO1xufTtcblxuLyoqXG4gKiBCaW5kIGV2ZW50cyBvZiB0aGUgaGlkZGVuIHRleHRib3guXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DbGlwYm9hcmQucHJvdG90eXBlLl9iaW5kX2V2ZW50cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcblxuICAgIC8vIExpc3RlbiB0byBlbCdzIGZvY3VzIGV2ZW50LiAgSWYgZWwgaXMgZm9jdXNlZCwgZm9jdXMgdGhlIGhpZGRlbiBpbnB1dFxuICAgIC8vIGluc3RlYWQuXG4gICAgdXRpbHMuaG9vayh0aGlzLl9lbCwgJ29uZm9jdXMnLCB1dGlscy5wcm94eSh0aGlzLl9mb2N1cywgdGhpcykpO1xuXG4gICAgdXRpbHMuaG9vayh0aGlzLmhpZGRlbl9pbnB1dCwgJ29ucGFzdGUnLCB1dGlscy5wcm94eSh0aGlzLl9oYW5kbGVfcGFzdGUsIHRoaXMpKTtcbiAgICB1dGlscy5ob29rKHRoaXMuaGlkZGVuX2lucHV0LCAnb25jdXQnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIC8vIFRyaWdnZXIgdGhlIGV2ZW50IGluIGEgdGltZW91dCBzbyBpdCBmaXJlcyBhZnRlciB0aGUgc3lzdGVtIGV2ZW50LlxuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB0aGF0LnRyaWdnZXIoJ2N1dCcsIHRoYXQuX2NsaXBwYWJsZSk7XG4gICAgICAgIH0sIDApO1xuICAgIH0pO1xuICAgIHV0aWxzLmhvb2sodGhpcy5oaWRkZW5faW5wdXQsICdvbmNvcHknLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIHRoYXQudHJpZ2dlcignY29weScsIHRoYXQuX2NsaXBwYWJsZSk7XG4gICAgfSk7XG4gICAgdXRpbHMuaG9vayh0aGlzLmhpZGRlbl9pbnB1dCwgJ29ua2V5cHJlc3MnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHRoYXQuaGlkZGVuX2lucHV0LnZhbHVlID0gdGhhdC5fY2xpcHBhYmxlO1xuICAgICAgICAgICAgdGhhdC5fZm9jdXMoKTtcbiAgICAgICAgfSwgMCk7XG4gICAgfSk7XG4gICAgdXRpbHMuaG9vayh0aGlzLmhpZGRlbl9pbnB1dCwgJ29ua2V5dXAnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHRoYXQuaGlkZGVuX2lucHV0LnZhbHVlID0gdGhhdC5fY2xpcHBhYmxlO1xuICAgICAgICAgICAgdGhhdC5fZm9jdXMoKTtcbiAgICAgICAgfSwgMCk7XG4gICAgfSk7XG59O1xuXG5leHBvcnRzLkNsaXBib2FyZCA9IENsaXBib2FyZDtcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG52YXIga2V5bWFwID0gcmVxdWlyZSgnLi9ldmVudHMvbWFwLmpzJyk7XG52YXIgcmVnaXN0ZXIgPSBrZXltYXAuTWFwLnJlZ2lzdGVyO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG5cbi8qKlxuICogSW5wdXQgY3Vyc29yLlxuICovXG52YXIgQ3Vyc29yID0gZnVuY3Rpb24obW9kZWwpIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMuX21vZGVsID0gbW9kZWw7XG5cbiAgICB0aGlzLnByaW1hcnlfcm93ID0gbnVsbDtcbiAgICB0aGlzLnByaW1hcnlfY2hhciA9IG51bGw7XG4gICAgdGhpcy5zZWNvbmRhcnlfcm93ID0gbnVsbDtcbiAgICB0aGlzLnNlY29uZGFyeV9jaGFyID0gbnVsbDtcblxuICAgIHRoaXMuX2luaXRfcHJvcGVydGllcygpO1xuICAgIHRoaXMuX3JlZ2lzdGVyX2FwaSgpO1xufTtcbnV0aWxzLmluaGVyaXQoQ3Vyc29yLCB1dGlscy5Qb3N0ZXJDbGFzcyk7XG5cbi8qKlxuICogTW92ZXMgdGhlIHByaW1hcnkgY3Vyc29yIGEgZ2l2ZW4gb2Zmc2V0LlxuICogQHBhcmFtICB7aW50ZWdlcn0geFxuICogQHBhcmFtICB7aW50ZWdlcn0geVxuICogQHBhcmFtICB7Ym9vbGVhbn0gKG9wdGlvbmFsKSBob3A9ZmFsc2UgLSBob3AgdG8gdGhlIG90aGVyIHNpZGUgb2YgdGhlXG4gKiAgICAgICAgICAgICAgICAgICBzZWxlY3RlZCByZWdpb24gaWYgdGhlIHByaW1hcnkgaXMgb24gdGhlIG9wcG9zaXRlIG9mIHRoZVxuICogICAgICAgICAgICAgICAgICAgZGlyZWN0aW9uIG9mIG1vdGlvbi5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvci5wcm90b3R5cGUubW92ZV9wcmltYXJ5ID0gZnVuY3Rpb24oeCwgeSwgaG9wKSB7XG4gICAgaWYgKGhvcCkge1xuICAgICAgICBpZiAodGhpcy5wcmltYXJ5X3JvdyAhPSB0aGlzLnNlY29uZGFyeV9yb3cgfHwgdGhpcy5wcmltYXJ5X2NoYXIgIT0gdGhpcy5zZWNvbmRhcnlfY2hhcikge1xuICAgICAgICAgICAgdmFyIHN0YXJ0X3JvdyA9IHRoaXMuc3RhcnRfcm93O1xuICAgICAgICAgICAgdmFyIHN0YXJ0X2NoYXIgPSB0aGlzLnN0YXJ0X2NoYXI7XG4gICAgICAgICAgICB2YXIgZW5kX3JvdyA9IHRoaXMuZW5kX3JvdztcbiAgICAgICAgICAgIHZhciBlbmRfY2hhciA9IHRoaXMuZW5kX2NoYXI7XG4gICAgICAgICAgICBpZiAoeDwwIHx8IHk8MCkge1xuICAgICAgICAgICAgICAgIHRoaXMucHJpbWFyeV9yb3cgPSBzdGFydF9yb3c7XG4gICAgICAgICAgICAgICAgdGhpcy5wcmltYXJ5X2NoYXIgPSBzdGFydF9jaGFyO1xuICAgICAgICAgICAgICAgIHRoaXMuc2Vjb25kYXJ5X3JvdyA9IGVuZF9yb3c7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWNvbmRhcnlfY2hhciA9IGVuZF9jaGFyO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnByaW1hcnlfcm93ID0gZW5kX3JvdztcbiAgICAgICAgICAgICAgICB0aGlzLnByaW1hcnlfY2hhciA9IGVuZF9jaGFyO1xuICAgICAgICAgICAgICAgIHRoaXMuc2Vjb25kYXJ5X3JvdyA9IHN0YXJ0X3JvdztcbiAgICAgICAgICAgICAgICB0aGlzLnNlY29uZGFyeV9jaGFyID0gc3RhcnRfY2hhcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmICh4IDwgMCkge1xuICAgICAgICBpZiAodGhpcy5wcmltYXJ5X2NoYXIgKyB4IDwgMCkge1xuICAgICAgICAgICAgaWYgKHRoaXMucHJpbWFyeV9yb3cgPT09IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLnByaW1hcnlfY2hhciA9IDA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMucHJpbWFyeV9yb3cgLT0gMTtcbiAgICAgICAgICAgICAgICB0aGlzLnByaW1hcnlfY2hhciA9IHRoaXMuX21vZGVsLl9yb3dzW3RoaXMucHJpbWFyeV9yb3ddLmxlbmd0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMucHJpbWFyeV9jaGFyICs9IHg7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHggPiAwKSB7XG4gICAgICAgIGlmICh0aGlzLnByaW1hcnlfY2hhciArIHggPiB0aGlzLl9tb2RlbC5fcm93c1t0aGlzLnByaW1hcnlfcm93XS5sZW5ndGgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnByaW1hcnlfcm93ID09PSB0aGlzLl9tb2RlbC5fcm93cy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wcmltYXJ5X2NoYXIgPSB0aGlzLl9tb2RlbC5fcm93c1t0aGlzLnByaW1hcnlfcm93XS5sZW5ndGg7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMucHJpbWFyeV9yb3cgKz0gMTtcbiAgICAgICAgICAgICAgICB0aGlzLnByaW1hcnlfY2hhciA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnByaW1hcnlfY2hhciArPSB4O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gUmVtZW1iZXIgdGhlIGNoYXJhY3RlciBwb3NpdGlvbiwgdmVydGljYWwgbmF2aWdhdGlvbiBhY3Jvc3MgZW1wdHkgbGluZXNcbiAgICAvLyBzaG91bGRuJ3QgY2F1c2UgdGhlIGhvcml6b250YWwgcG9zaXRpb24gdG8gYmUgbG9zdC5cbiAgICBpZiAoeCAhPT0gMCkge1xuICAgICAgICB0aGlzLl9tZW1vcnlfY2hhciA9IHRoaXMucHJpbWFyeV9jaGFyO1xuICAgIH1cblxuICAgIGlmICh5ICE9PSAwKSB7XG4gICAgICAgIHRoaXMucHJpbWFyeV9yb3cgKz0geTtcbiAgICAgICAgdGhpcy5wcmltYXJ5X3JvdyA9IE1hdGgubWluKE1hdGgubWF4KHRoaXMucHJpbWFyeV9yb3csIDApLCB0aGlzLl9tb2RlbC5fcm93cy5sZW5ndGgtMSk7XG4gICAgICAgIGlmICh0aGlzLl9tZW1vcnlfY2hhciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aGlzLnByaW1hcnlfY2hhciA9IHRoaXMuX21lbW9yeV9jaGFyO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLnByaW1hcnlfY2hhciA+IHRoaXMuX21vZGVsLl9yb3dzW3RoaXMucHJpbWFyeV9yb3ddLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5wcmltYXJ5X2NoYXIgPSB0aGlzLl9tb2RlbC5fcm93c1t0aGlzLnByaW1hcnlfcm93XS5sZW5ndGg7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZScpOyBcbn07XG5cbi8qKlxuICogV2FsayB0aGUgcHJpbWFyeSBjdXJzb3IgaW4gYSBkaXJlY3Rpb24gdW50aWwgYSBub3QtdGV4dCBjaGFyYWN0ZXIgaXMgZm91bmQuXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBkaXJlY3Rpb25cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvci5wcm90b3R5cGUud29yZF9wcmltYXJ5ID0gZnVuY3Rpb24oZGlyZWN0aW9uKSB7XG4gICAgLy8gTWFrZSBzdXJlIGRpcmVjdGlvbiBpcyAxIG9yIC0xLlxuICAgIGRpcmVjdGlvbiA9IGRpcmVjdGlvbiA8IDAgPyAtMSA6IDE7XG5cbiAgICAvLyBJZiBtb3ZpbmcgbGVmdCBhbmQgYXQgZW5kIG9mIHJvdywgbW92ZSB1cCBhIHJvdyBpZiBwb3NzaWJsZS5cbiAgICBpZiAodGhpcy5wcmltYXJ5X2NoYXIgPT09IDAgJiYgZGlyZWN0aW9uID09IC0xKSB7XG4gICAgICAgIGlmICh0aGlzLnByaW1hcnlfcm93ICE9PSAwKSB7XG4gICAgICAgICAgICB0aGlzLnByaW1hcnlfcm93LS07XG4gICAgICAgICAgICB0aGlzLnByaW1hcnlfY2hhciA9IHRoaXMuX21vZGVsLl9yb3dzW3RoaXMucHJpbWFyeV9yb3ddLmxlbmd0aDtcbiAgICAgICAgICAgIHRoaXMuX21lbW9yeV9jaGFyID0gdGhpcy5wcmltYXJ5X2NoYXI7XG4gICAgICAgICAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZScpOyBcbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gSWYgbW92aW5nIHJpZ2h0IGFuZCBhdCBlbmQgb2Ygcm93LCBtb3ZlIGRvd24gYSByb3cgaWYgcG9zc2libGUuXG4gICAgaWYgKHRoaXMucHJpbWFyeV9jaGFyID49IHRoaXMuX21vZGVsLl9yb3dzW3RoaXMucHJpbWFyeV9yb3ddLmxlbmd0aCAmJiBkaXJlY3Rpb24gPT0gMSkge1xuICAgICAgICBpZiAodGhpcy5wcmltYXJ5X3JvdyA8IHRoaXMuX21vZGVsLl9yb3dzLmxlbmd0aC0xKSB7XG4gICAgICAgICAgICB0aGlzLnByaW1hcnlfcm93Kys7XG4gICAgICAgICAgICB0aGlzLnByaW1hcnlfY2hhciA9IDA7XG4gICAgICAgICAgICB0aGlzLl9tZW1vcnlfY2hhciA9IHRoaXMucHJpbWFyeV9jaGFyO1xuICAgICAgICAgICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2UnKTsgXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBpID0gdGhpcy5wcmltYXJ5X2NoYXI7XG4gICAgdmFyIGhpdF90ZXh0ID0gZmFsc2U7XG4gICAgdmFyIHJvd190ZXh0ID0gdGhpcy5fbW9kZWwuX3Jvd3NbdGhpcy5wcmltYXJ5X3Jvd107XG4gICAgaWYgKGRpcmVjdGlvbiA9PSAtMSkge1xuICAgICAgICB3aGlsZSAoMCA8IGkgJiYgIShoaXRfdGV4dCAmJiB0aGlzLl9ub3RfdGV4dChyb3dfdGV4dFtpLTFdKSkpIHtcbiAgICAgICAgICAgIGhpdF90ZXh0ID0gaGl0X3RleHQgfHwgIXRoaXMuX25vdF90ZXh0KHJvd190ZXh0W2ktMV0pO1xuICAgICAgICAgICAgaSArPSBkaXJlY3Rpb247XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICB3aGlsZSAoaSA8IHJvd190ZXh0Lmxlbmd0aCAmJiAhKGhpdF90ZXh0ICYmIHRoaXMuX25vdF90ZXh0KHJvd190ZXh0W2ldKSkpIHtcbiAgICAgICAgICAgIGhpdF90ZXh0ID0gaGl0X3RleHQgfHwgIXRoaXMuX25vdF90ZXh0KHJvd190ZXh0W2ldKTtcbiAgICAgICAgICAgIGkgKz0gZGlyZWN0aW9uO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5wcmltYXJ5X2NoYXIgPSBpO1xuICAgIHRoaXMuX21lbW9yeV9jaGFyID0gdGhpcy5wcmltYXJ5X2NoYXI7XG4gICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2UnKTsgXG59O1xuXG4vKipcbiAqIFNlbGVjdCBhbGwgb2YgdGhlIHRleHQuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3IucHJvdG90eXBlLnNlbGVjdF9hbGwgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnByaW1hcnlfcm93ID0gdGhpcy5fbW9kZWwuX3Jvd3MubGVuZ3RoLTE7XG4gICAgdGhpcy5wcmltYXJ5X2NoYXIgPSB0aGlzLl9tb2RlbC5fcm93c1t0aGlzLnByaW1hcnlfcm93XS5sZW5ndGg7XG4gICAgdGhpcy5zZWNvbmRhcnlfcm93ID0gMDtcbiAgICB0aGlzLnNlY29uZGFyeV9jaGFyID0gMDtcbiAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZScpOyBcbn07XG5cbi8qKlxuICogTW92ZSB0aGUgcHJpbWFyeSBjdXJzb3IgdG8gdGhlIGxpbmUgZW5kLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5wcmltYXJ5X2dvdG9fZW5kID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5wcmltYXJ5X2NoYXIgPSB0aGlzLl9tb2RlbC5fcm93c1t0aGlzLnByaW1hcnlfcm93XS5sZW5ndGg7XG4gICAgdGhpcy5fbWVtb3J5X2NoYXIgPSB0aGlzLnByaW1hcnlfY2hhcjtcbiAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZScpOyBcbn07XG5cbi8qKlxuICogTW92ZSB0aGUgcHJpbWFyeSBjdXJzb3IgdG8gdGhlIGxpbmUgc3RhcnQuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3IucHJvdG90eXBlLnByaW1hcnlfZ290b19zdGFydCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMucHJpbWFyeV9jaGFyID0gMDtcbiAgICB0aGlzLl9tZW1vcnlfY2hhciA9IHRoaXMucHJpbWFyeV9jaGFyO1xuICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7IFxufTtcblxuLyoqXG4gKiBTZXQgdGhlIHByaW1hcnkgY3Vyc29yIHBvc2l0aW9uXG4gKiBAcGFyYW0ge2ludGVnZXJ9IHJvd19pbmRleFxuICogQHBhcmFtIHtpbnRlZ2VyfSBjaGFyX2luZGV4XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuc2V0X3ByaW1hcnkgPSBmdW5jdGlvbihyb3dfaW5kZXgsIGNoYXJfaW5kZXgpIHtcbiAgICB0aGlzLnByaW1hcnlfcm93ID0gcm93X2luZGV4O1xuICAgIHRoaXMucHJpbWFyeV9jaGFyID0gY2hhcl9pbmRleDtcblxuICAgIC8vIFJlbWVtYmVyIHRoZSBjaGFyYWN0ZXIgcG9zaXRpb24sIHZlcnRpY2FsIG5hdmlnYXRpb24gYWNyb3NzIGVtcHR5IGxpbmVzXG4gICAgLy8gc2hvdWxkbid0IGNhdXNlIHRoZSBob3Jpem9udGFsIHBvc2l0aW9uIHRvIGJlIGxvc3QuXG4gICAgdGhpcy5fbWVtb3J5X2NoYXIgPSB0aGlzLnByaW1hcnlfY2hhcjtcblxuICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7IFxufTtcblxuLyoqXG4gKiBTZXQgdGhlIHNlY29uZGFyeSBjdXJzb3IgcG9zaXRpb25cbiAqIEBwYXJhbSB7aW50ZWdlcn0gcm93X2luZGV4XG4gKiBAcGFyYW0ge2ludGVnZXJ9IGNoYXJfaW5kZXhcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5zZXRfc2Vjb25kYXJ5ID0gZnVuY3Rpb24ocm93X2luZGV4LCBjaGFyX2luZGV4KSB7XG4gICAgdGhpcy5zZWNvbmRhcnlfcm93ID0gcm93X2luZGV4O1xuICAgIHRoaXMuc2Vjb25kYXJ5X2NoYXIgPSBjaGFyX2luZGV4O1xuICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7IFxufTtcblxuLyoqXG4gKiBTZXRzIGJvdGggdGhlIHByaW1hcnkgYW5kIHNlY29uZGFyeSBjdXJzb3IgcG9zaXRpb25zXG4gKiBAcGFyYW0ge2ludGVnZXJ9IHJvd19pbmRleFxuICogQHBhcmFtIHtpbnRlZ2VyfSBjaGFyX2luZGV4XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuc2V0X2JvdGggPSBmdW5jdGlvbihyb3dfaW5kZXgsIGNoYXJfaW5kZXgpIHtcbiAgICB0aGlzLnByaW1hcnlfcm93ID0gcm93X2luZGV4O1xuICAgIHRoaXMucHJpbWFyeV9jaGFyID0gY2hhcl9pbmRleDtcbiAgICB0aGlzLnNlY29uZGFyeV9yb3cgPSByb3dfaW5kZXg7XG4gICAgdGhpcy5zZWNvbmRhcnlfY2hhciA9IGNoYXJfaW5kZXg7XG5cbiAgICAvLyBSZW1lbWJlciB0aGUgY2hhcmFjdGVyIHBvc2l0aW9uLCB2ZXJ0aWNhbCBuYXZpZ2F0aW9uIGFjcm9zcyBlbXB0eSBsaW5lc1xuICAgIC8vIHNob3VsZG4ndCBjYXVzZSB0aGUgaG9yaXpvbnRhbCBwb3NpdGlvbiB0byBiZSBsb3N0LlxuICAgIHRoaXMuX21lbW9yeV9jaGFyID0gdGhpcy5wcmltYXJ5X2NoYXI7XG5cbiAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZScpOyBcbn07XG5cbi8qKlxuICogSGFuZGxlcyB3aGVuIGEga2V5IGlzIHByZXNzZWQuXG4gKiBAcGFyYW0gIHtFdmVudH0gZSAtIG9yaWdpbmFsIGtleSBwcmVzcyBldmVudC5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvci5wcm90b3R5cGUua2V5cHJlc3MgPSBmdW5jdGlvbihlKSB7XG4gICAgdmFyIGNoYXJfY29kZSA9IGUud2hpY2ggfHwgZS5rZXlDb2RlO1xuICAgIHZhciBjaGFyX3R5cGVkID0gU3RyaW5nLmZyb21DaGFyQ29kZShjaGFyX2NvZGUpO1xuICAgIHRoaXMucmVtb3ZlX3NlbGVjdGVkKCk7XG4gICAgdGhpcy5fbW9kZWwuYWRkX3RleHQodGhpcy5wcmltYXJ5X3JvdywgdGhpcy5wcmltYXJ5X2NoYXIsIGNoYXJfdHlwZWQpO1xuICAgIHRoaXMubW92ZV9wcmltYXJ5KDEsIDApO1xuICAgIHRoaXMuX3Jlc2V0X3NlY29uZGFyeSgpO1xuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBJbnNlcnQgYSBuZXdsaW5lXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3IucHJvdG90eXBlLm5ld2xpbmUgPSBmdW5jdGlvbihlKSB7XG4gICAgdGhpcy5yZW1vdmVfc2VsZWN0ZWQoKTtcbiAgICB0aGlzLl9tb2RlbC5hZGRfdGV4dCh0aGlzLnByaW1hcnlfcm93LCB0aGlzLnByaW1hcnlfY2hhciwgJ1xcbicpO1xuICAgIHRoaXMubW92ZV9wcmltYXJ5KDAsIDEpO1xuICAgIHRoaXMuX3Jlc2V0X3NlY29uZGFyeSgpO1xuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBJbnNlcnQgdGV4dFxuICogQHBhcmFtICB7c3RyaW5nfSB0ZXh0XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3IucHJvdG90eXBlLmluc2VydF90ZXh0ID0gZnVuY3Rpb24odGV4dCkge1xuICAgIHRoaXMucmVtb3ZlX3NlbGVjdGVkKCk7XG4gICAgdGhpcy5fbW9kZWwuYWRkX3RleHQodGhpcy5wcmltYXJ5X3JvdywgdGhpcy5wcmltYXJ5X2NoYXIsIHRleHQpO1xuICAgIFxuICAgIC8vIE1vdmUgY3Vyc29yIHRvIHRoZSBlbmQuXG4gICAgaWYgKHRleHQuaW5kZXhPZignXFxuJyk9PS0xKSB7XG4gICAgICAgIHRoaXMucHJpbWFyeV9jaGFyID0gdGhpcy5zdGFydF9jaGFyICsgdGV4dC5sZW5ndGg7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGxpbmVzID0gdGV4dC5zcGxpdCgnXFxuJyk7XG4gICAgICAgIHRoaXMucHJpbWFyeV9yb3cgKz0gbGluZXMubGVuZ3RoIC0gMTtcbiAgICAgICAgdGhpcy5wcmltYXJ5X2NoYXIgPSBsaW5lc1tsaW5lcy5sZW5ndGgtMV0ubGVuZ3RoO1xuICAgIH1cbiAgICB0aGlzLl9yZXNldF9zZWNvbmRhcnkoKTtcblxuICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7IFxuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgdGhlIHNlbGVjdGVkIHRleHRcbiAqIEByZXR1cm4ge2Jvb2xlYW59IHRydWUgaWYgdGV4dCB3YXMgcmVtb3ZlZC5cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5yZW1vdmVfc2VsZWN0ZWQgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5wcmltYXJ5X3JvdyAhPT0gdGhpcy5zZWNvbmRhcnlfcm93IHx8IHRoaXMucHJpbWFyeV9jaGFyICE9PSB0aGlzLnNlY29uZGFyeV9jaGFyKSB7XG4gICAgICAgIHZhciByb3dfaW5kZXggPSB0aGlzLnN0YXJ0X3JvdztcbiAgICAgICAgdmFyIGNoYXJfaW5kZXggPSB0aGlzLnN0YXJ0X2NoYXI7XG4gICAgICAgIHRoaXMuX21vZGVsLnJlbW92ZV90ZXh0KHRoaXMuc3RhcnRfcm93LCB0aGlzLnN0YXJ0X2NoYXIsIHRoaXMuZW5kX3JvdywgdGhpcy5lbmRfY2hhcik7XG4gICAgICAgIHRoaXMucHJpbWFyeV9yb3cgPSByb3dfaW5kZXg7XG4gICAgICAgIHRoaXMucHJpbWFyeV9jaGFyID0gY2hhcl9pbmRleDtcbiAgICAgICAgdGhpcy5fcmVzZXRfc2Vjb25kYXJ5KCk7XG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7IFxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufTtcblxuLyoqXG4gKiBDb3BpZXMgdGhlIHNlbGVjdGVkIHRleHQuXG4gKiBAcmV0dXJuIHtzdHJpbmd9IHNlbGVjdGVkIHRleHRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5jb3B5ID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMucHJpbWFyeV9yb3cgPT0gdGhpcy5zZWNvbmRhcnlfcm93ICYmIHRoaXMucHJpbWFyeV9jaGFyID09IHRoaXMuc2Vjb25kYXJ5X2NoYXIpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX21vZGVsLl9yb3dzW3RoaXMucHJpbWFyeV9yb3ddO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9tb2RlbC5nZXRfdGV4dCh0aGlzLnN0YXJ0X3JvdywgdGhpcy5zdGFydF9jaGFyLCB0aGlzLmVuZF9yb3csIHRoaXMuZW5kX2NoYXIpO1xuICAgIH1cbn07XG5cbi8qKlxuICogQ3V0cyB0aGUgc2VsZWN0ZWQgdGV4dC5cbiAqIEByZXR1cm4ge3N0cmluZ30gc2VsZWN0ZWQgdGV4dFxuICovXG5DdXJzb3IucHJvdG90eXBlLmN1dCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0ZXh0ID0gdGhpcy5jb3B5KCk7XG4gICAgaWYgKHRoaXMucHJpbWFyeV9yb3cgPT0gdGhpcy5zZWNvbmRhcnlfcm93ICYmIHRoaXMucHJpbWFyeV9jaGFyID09IHRoaXMuc2Vjb25kYXJ5X2NoYXIpIHtcbiAgICAgICAgdGhpcy5fbW9kZWwucmVtb3ZlX3Jvdyh0aGlzLnByaW1hcnlfcm93KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnJlbW92ZV9zZWxlY3RlZCgpO1xuICAgIH1cbiAgICByZXR1cm4gdGV4dDtcbn07XG5cbi8qKlxuICogRGVsZXRlIGZvcndhcmQsIHR5cGljYWxseSBjYWxsZWQgYnkgYGRlbGV0ZWAga2V5cHJlc3MuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3IucHJvdG90eXBlLmRlbGV0ZV9mb3J3YXJkID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKCF0aGlzLnJlbW92ZV9zZWxlY3RlZCgpKSB7XG4gICAgICAgIHRoaXMubW92ZV9wcmltYXJ5KDEsIDApO1xuICAgICAgICB0aGlzLnJlbW92ZV9zZWxlY3RlZCgpO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogRGVsZXRlIGJhY2t3YXJkLCB0eXBpY2FsbHkgY2FsbGVkIGJ5IGBiYWNrc3BhY2VgIGtleXByZXNzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5kZWxldGVfYmFja3dhcmQgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoIXRoaXMucmVtb3ZlX3NlbGVjdGVkKCkpIHtcbiAgICAgICAgdGhpcy5tb3ZlX3ByaW1hcnkoLTEsIDApO1xuICAgICAgICB0aGlzLnJlbW92ZV9zZWxlY3RlZCgpO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogUmVzZXQgdGhlIHNlY29uZGFyeSBjdXJzb3IgdG8gdGhlIHZhbHVlIG9mIHRoZSBwcmltYXJ5LlxuICogQHJldHVybiB7W3R5cGVdfSBbZGVzY3JpcHRpb25dXG4gKi9cbkN1cnNvci5wcm90b3R5cGUuX3Jlc2V0X3NlY29uZGFyeSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc2Vjb25kYXJ5X3JvdyA9IHRoaXMucHJpbWFyeV9yb3c7XG4gICAgdGhpcy5zZWNvbmRhcnlfY2hhciA9IHRoaXMucHJpbWFyeV9jaGFyO1xuXG4gICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2UnKTsgXG59O1xuXG4vKipcbiAqIENyZWF0ZSB0aGUgcHJvcGVydGllcyBvZiB0aGUgY3Vyc29yLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5faW5pdF9wcm9wZXJ0aWVzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMucHJvcGVydHkoJ3N0YXJ0X3JvdycsIGZ1bmN0aW9uKCkgeyByZXR1cm4gTWF0aC5taW4odGhhdC5wcmltYXJ5X3JvdywgdGhhdC5zZWNvbmRhcnlfcm93KTsgfSk7XG4gICAgdGhpcy5wcm9wZXJ0eSgnZW5kX3JvdycsIGZ1bmN0aW9uKCkgeyByZXR1cm4gTWF0aC5tYXgodGhhdC5wcmltYXJ5X3JvdywgdGhhdC5zZWNvbmRhcnlfcm93KTsgfSk7XG4gICAgdGhpcy5wcm9wZXJ0eSgnc3RhcnRfY2hhcicsIGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodGhhdC5wcmltYXJ5X3JvdyA8IHRoYXQuc2Vjb25kYXJ5X3JvdyB8fCAodGhhdC5wcmltYXJ5X3JvdyA9PSB0aGF0LnNlY29uZGFyeV9yb3cgJiYgdGhhdC5wcmltYXJ5X2NoYXIgPD0gdGhhdC5zZWNvbmRhcnlfY2hhcikpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGF0LnByaW1hcnlfY2hhcjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGF0LnNlY29uZGFyeV9jaGFyO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgdGhpcy5wcm9wZXJ0eSgnZW5kX2NoYXInLCBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHRoYXQucHJpbWFyeV9yb3cgPCB0aGF0LnNlY29uZGFyeV9yb3cgfHwgKHRoYXQucHJpbWFyeV9yb3cgPT0gdGhhdC5zZWNvbmRhcnlfcm93ICYmIHRoYXQucHJpbWFyeV9jaGFyIDw9IHRoYXQuc2Vjb25kYXJ5X2NoYXIpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhhdC5zZWNvbmRhcnlfY2hhcjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGF0LnByaW1hcnlfY2hhcjtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuLyoqXG4gKiBDaGVja3MgaWYgdGhlIGNoYXJhY3RlciBpc24ndCB0ZXh0LlxuICogQHBhcmFtICB7Y2hhcn0gYyAtIGNoYXJhY3RlclxuICogQHJldHVybiB7Ym9vbGVhbn0gdHJ1ZSBpZiB0aGUgY2hhcmFjdGVyIGlzIG5vdCB0ZXh0LlxuICovXG5DdXJzb3IucHJvdG90eXBlLl9ub3RfdGV4dCA9IGZ1bmN0aW9uKGMpIHtcbiAgICByZXR1cm4gJ2FiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MTIzNDU2Nzg5MCcuaW5kZXhPZihjLnRvTG93ZXJDYXNlKCkpID09IC0xO1xufTtcblxuLyoqXG4gKiBSZWdpc3RlcnMgYW4gYWN0aW9uIEFQSSB3aXRoIHRoZSBtYXBcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuX3JlZ2lzdGVyX2FwaSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICByZWdpc3RlcignY3Vyc29yLnJlbW92ZV9zZWxlY3RlZCcsIHV0aWxzLnByb3h5KHRoaXMucmVtb3ZlX3NlbGVjdGVkLCB0aGlzKSwgdGhpcyk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5rZXlwcmVzcycsIHV0aWxzLnByb3h5KHRoaXMua2V5cHJlc3MsIHRoaXMpLCB0aGlzKTtcbiAgICByZWdpc3RlcignY3Vyc29yLm5ld2xpbmUnLCB1dGlscy5wcm94eSh0aGlzLm5ld2xpbmUsIHRoaXMpLCB0aGlzKTtcbiAgICByZWdpc3RlcignY3Vyc29yLmluc2VydF90ZXh0JywgdXRpbHMucHJveHkodGhpcy5pbnNlcnRfdGV4dCwgdGhpcyksIHRoaXMpO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3IuZGVsZXRlX2JhY2t3YXJkJywgdXRpbHMucHJveHkodGhpcy5kZWxldGVfYmFja3dhcmQsIHRoaXMpLCB0aGlzKTtcbiAgICByZWdpc3RlcignY3Vyc29yLmRlbGV0ZV9mb3J3YXJkJywgdXRpbHMucHJveHkodGhpcy5kZWxldGVfZm9yd2FyZCwgdGhpcyksIHRoaXMpO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3Iuc2VsZWN0X2FsbCcsIHV0aWxzLnByb3h5KHRoaXMuc2VsZWN0X2FsbCwgdGhpcyksIHRoaXMpO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3IubGVmdCcsIGZ1bmN0aW9uKCkgeyB0aGF0Lm1vdmVfcHJpbWFyeSgtMSwgMCwgdHJ1ZSk7IHRoYXQuX3Jlc2V0X3NlY29uZGFyeSgpOyByZXR1cm4gdHJ1ZTsgfSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5yaWdodCcsIGZ1bmN0aW9uKCkgeyB0aGF0Lm1vdmVfcHJpbWFyeSgxLCAwLCB0cnVlKTsgdGhhdC5fcmVzZXRfc2Vjb25kYXJ5KCk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLnVwJywgZnVuY3Rpb24oKSB7IHRoYXQubW92ZV9wcmltYXJ5KDAsIC0xLCB0cnVlKTsgdGhhdC5fcmVzZXRfc2Vjb25kYXJ5KCk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLmRvd24nLCBmdW5jdGlvbigpIHsgdGhhdC5tb3ZlX3ByaW1hcnkoMCwgMSwgdHJ1ZSk7IHRoYXQuX3Jlc2V0X3NlY29uZGFyeSgpOyByZXR1cm4gdHJ1ZTsgfSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5zZWxlY3RfbGVmdCcsIGZ1bmN0aW9uKCkgeyB0aGF0Lm1vdmVfcHJpbWFyeSgtMSwgMCk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLnNlbGVjdF9yaWdodCcsIGZ1bmN0aW9uKCkgeyB0aGF0Lm1vdmVfcHJpbWFyeSgxLCAwKTsgcmV0dXJuIHRydWU7IH0pO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3Iuc2VsZWN0X3VwJywgZnVuY3Rpb24oKSB7IHRoYXQubW92ZV9wcmltYXJ5KDAsIC0xKTsgcmV0dXJuIHRydWU7IH0pO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3Iuc2VsZWN0X2Rvd24nLCBmdW5jdGlvbigpIHsgdGhhdC5tb3ZlX3ByaW1hcnkoMCwgMSk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLndvcmRfbGVmdCcsIGZ1bmN0aW9uKCkgeyB0aGF0LndvcmRfcHJpbWFyeSgtMSk7IHRoYXQuX3Jlc2V0X3NlY29uZGFyeSgpOyByZXR1cm4gdHJ1ZTsgfSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci53b3JkX3JpZ2h0JywgZnVuY3Rpb24oKSB7IHRoYXQud29yZF9wcmltYXJ5KDEpOyB0aGF0Ll9yZXNldF9zZWNvbmRhcnkoKTsgcmV0dXJuIHRydWU7IH0pO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3Iuc2VsZWN0X3dvcmRfbGVmdCcsIGZ1bmN0aW9uKCkgeyB0aGF0LndvcmRfcHJpbWFyeSgtMSk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLnNlbGVjdF93b3JkX3JpZ2h0JywgZnVuY3Rpb24oKSB7IHRoYXQud29yZF9wcmltYXJ5KDEpOyByZXR1cm4gdHJ1ZTsgfSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5saW5lX3N0YXJ0JywgZnVuY3Rpb24oKSB7IHRoYXQucHJpbWFyeV9nb3RvX3N0YXJ0KCk7IHRoYXQuX3Jlc2V0X3NlY29uZGFyeSgpOyByZXR1cm4gdHJ1ZTsgfSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5saW5lX2VuZCcsIGZ1bmN0aW9uKCkgeyB0aGF0LnByaW1hcnlfZ290b19lbmQoKTsgdGhhdC5fcmVzZXRfc2Vjb25kYXJ5KCk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLnNlbGVjdF9saW5lX3N0YXJ0JywgZnVuY3Rpb24oKSB7IHRoYXQucHJpbWFyeV9nb3RvX3N0YXJ0KCk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLnNlbGVjdF9saW5lX2VuZCcsIGZ1bmN0aW9uKCkgeyB0aGF0LnByaW1hcnlfZ290b19lbmQoKTsgcmV0dXJuIHRydWU7IH0pO1xufTtcblxuZXhwb3J0cy5DdXJzb3IgPSBDdXJzb3I7IiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cbnZhciBrZXltYXAgPSByZXF1aXJlKCcuL2V2ZW50cy9tYXAuanMnKTtcbnZhciByZWdpc3RlciA9IGtleW1hcC5NYXAucmVnaXN0ZXI7XG5cbnZhciBjdXJzb3IgPSByZXF1aXJlKCcuL2N1cnNvci5qcycpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xuLyoqXG4gKiBNYW5hZ2VzIG9uZSBvciBtb3JlIGN1cnNvcnNcbiAqL1xudmFyIEN1cnNvcnMgPSBmdW5jdGlvbihtb2RlbCwgY2xpcGJvYXJkKSB7XG4gICAgdXRpbHMuUG9zdGVyQ2xhc3MuY2FsbCh0aGlzKTtcbiAgICB0aGlzLl9tb2RlbCA9IG1vZGVsO1xuICAgIHRoaXMuZ2V0X3Jvd19jaGFyID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuY3Vyc29ycyA9IFtdO1xuICAgIHRoaXMuX3NlbGVjdGluZ190ZXh0ID0gZmFsc2U7XG4gICAgdGhpcy5fY2xpcGJvYXJkID0gY2xpcGJvYXJkO1xuXG4gICAgLy8gQ3JlYXRlIGluaXRpYWwgY3Vyc29yLlxuICAgIHRoaXMuY3JlYXRlKCk7XG5cbiAgICAvLyBSZWdpc3RlciBhY3Rpb25zLlxuICAgIHJlZ2lzdGVyKCdjdXJzb3JzLnN0YXJ0X3NlbGVjdGlvbicsIHV0aWxzLnByb3h5KHRoaXMuc3RhcnRfc2VsZWN0aW9uLCB0aGlzKSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvcnMuc2V0X3NlbGVjdGlvbicsIHV0aWxzLnByb3h5KHRoaXMuc2V0X3NlbGVjdGlvbiwgdGhpcykpO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3JzLmVuZF9zZWxlY3Rpb24nLCB1dGlscy5wcm94eSh0aGlzLmVuZF9zZWxlY3Rpb24sIHRoaXMpKTtcblxuICAgIC8vIEJpbmQgY2xpcGJvYXJkIGV2ZW50cy5cbiAgICB0aGlzLl9jbGlwYm9hcmQub24oJ2N1dCcsIHV0aWxzLnByb3h5KHRoaXMuX2hhbmRsZV9jdXQsIHRoaXMpKTtcbiAgICB0aGlzLl9jbGlwYm9hcmQub24oJ3Bhc3RlJywgdXRpbHMucHJveHkodGhpcy5faGFuZGxlX3Bhc3RlLCB0aGlzKSk7XG59O1xudXRpbHMuaW5oZXJpdChDdXJzb3JzLCB1dGlscy5Qb3N0ZXJDbGFzcyk7XG5cbi8qKlxuICogQ3JlYXRlcyBhIGN1cnNvciBhbmQgbWFuYWdlcyBpdC5cbiAqIEByZXR1cm4ge0N1cnNvcn0gY3Vyc29yXG4gKi9cbkN1cnNvcnMucHJvdG90eXBlLmNyZWF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBuZXdfY3Vyc29yID0gbmV3IGN1cnNvci5DdXJzb3IodGhpcy5fbW9kZWwsIHRoaXMuX2lucHV0X2Rpc3BhdGNoZXIpO1xuICAgIHRoaXMuY3Vyc29ycy5wdXNoKG5ld19jdXJzb3IpO1xuXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIG5ld19jdXJzb3Iub24oJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGF0LnRyaWdnZXIoJ2NoYW5nZScsIG5ld19jdXJzb3IpO1xuICAgICAgICB0aGF0Ll91cGRhdGVfc2VsZWN0aW9uKCk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbmV3X2N1cnNvcjtcbn07XG5cbi8qKlxuICogSGFuZGxlcyB3aGVuIHRoZSBzZWxlY3RlZCB0ZXh0IGlzIGN1dCB0byB0aGUgY2xpcGJvYXJkLlxuICogQHBhcmFtICB7c3RyaW5nfSB0ZXh0IC0gYnkgdmFsIHRleHQgdGhhdCB3YXMgY3V0XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3JzLnByb3RvdHlwZS5faGFuZGxlX2N1dCA9IGZ1bmN0aW9uKHRleHQpIHtcbiAgICB0aGlzLmN1cnNvcnMuZm9yRWFjaChmdW5jdGlvbihjdXJzb3IpIHtcbiAgICAgICAgY3Vyc29yLmN1dCgpO1xuICAgIH0pO1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIHdoZW4gdGV4dCBpcyBwYXN0ZWQgaW50byB0aGUgZG9jdW1lbnQuXG4gKiBAcGFyYW0gIHtzdHJpbmd9IHRleHRcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvcnMucHJvdG90eXBlLl9oYW5kbGVfcGFzdGUgPSBmdW5jdGlvbih0ZXh0KSB7XG5cbiAgICAvLyBJZiB0aGUgbW9kdWx1cyBvZiB0aGUgbnVtYmVyIG9mIGN1cnNvcnMgYW5kIHRoZSBudW1iZXIgb2YgcGFzdGVkIGxpbmVzXG4gICAgLy8gb2YgdGV4dCBpcyB6ZXJvLCBzcGxpdCB0aGUgY3V0IGxpbmVzIGFtb25nIHRoZSBjdXJzb3JzLlxuICAgIHZhciBsaW5lcyA9IHRleHQuc3BsaXQoJ1xcbicpO1xuICAgIGlmICh0aGlzLmN1cnNvcnMubGVuZ3RoID4gMSAmJiBsaW5lcy5sZW5ndGggPiAxICYmIGxpbmVzLmxlbmd0aCAlIHRoaXMuY3Vyc29ycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdmFyIGxpbmVzX3Blcl9jdXJzb3IgPSBsaW5lcy5sZW5ndGggLyB0aGlzLmN1cnNvcnMubGVuZ3RoO1xuICAgICAgICB0aGlzLmN1cnNvcnMuZm9yRWFjaChmdW5jdGlvbihjdXJzb3IsIGluZGV4KSB7XG4gICAgICAgICAgICBjdXJzb3IuaW5zZXJ0X3RleHQobGluZXMuc2xpY2UoXG4gICAgICAgICAgICAgICAgaW5kZXggKiBsaW5lc19wZXJfY3Vyc29yLCBcbiAgICAgICAgICAgICAgICBpbmRleCAqIGxpbmVzX3Blcl9jdXJzb3IgKyBsaW5lc19wZXJfY3Vyc29yKS5qb2luKCdcXG4nKSk7XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuY3Vyc29ycy5mb3JFYWNoKGZ1bmN0aW9uKGN1cnNvcikge1xuICAgICAgICAgICAgY3Vyc29yLmluc2VydF90ZXh0KHRleHQpO1xuICAgICAgICB9KTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFVwZGF0ZSB0aGUgY2xpcHBhYmxlIHRleHQgYmFzZWQgb24gbmV3IHNlbGVjdGlvbi5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvcnMucHJvdG90eXBlLl91cGRhdGVfc2VsZWN0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgXG4gICAgLy8gQ29weSBhbGwgb2YgdGhlIHNlbGVjdGVkIHRleHQuXG4gICAgdmFyIHNlbGVjdGlvbnMgPSBbXTtcbiAgICB0aGlzLmN1cnNvcnMuZm9yRWFjaChmdW5jdGlvbihjdXJzb3IpIHtcbiAgICAgICAgc2VsZWN0aW9ucy5wdXNoKGN1cnNvci5jb3B5KCkpO1xuICAgIH0pO1xuXG4gICAgLy8gTWFrZSB0aGUgY29waWVkIHRleHQgY2xpcHBhYmxlLlxuICAgIHRoaXMuX2NsaXBib2FyZC5zZXRfY2xpcHBhYmxlKHNlbGVjdGlvbnMuam9pbignXFxuJykpO1xufTtcblxuLyoqXG4gKiBTdGFydHMgc2VsZWN0aW5nIHRleHQgZnJvbSBtb3VzZSBjb29yZGluYXRlcy5cbiAqIEBwYXJhbSAge01vdXNlRXZlbnR9IGUgLSBtb3VzZSBldmVudCBjb250YWluaW5nIHRoZSBjb29yZGluYXRlcy5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvcnMucHJvdG90eXBlLnN0YXJ0X3NlbGVjdGlvbiA9IGZ1bmN0aW9uKGUpIHtcbiAgICB2YXIgeCA9IGUub2Zmc2V0WDtcbiAgICB2YXIgeSA9IGUub2Zmc2V0WTtcblxuICAgIHRoaXMuX3NlbGVjdGluZ190ZXh0ID0gdHJ1ZTtcbiAgICBpZiAodGhpcy5nZXRfcm93X2NoYXIpIHtcbiAgICAgICAgdmFyIGxvY2F0aW9uID0gdGhpcy5nZXRfcm93X2NoYXIoeCwgeSk7XG4gICAgICAgIHRoaXMuY3Vyc29yc1swXS5zZXRfYm90aChsb2NhdGlvbi5yb3dfaW5kZXgsIGxvY2F0aW9uLmNoYXJfaW5kZXgpO1xuICAgIH1cbn07XG5cbi8qKlxuICogRmluYWxpemVzIHRoZSBzZWxlY3Rpb24gb2YgdGV4dC5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvcnMucHJvdG90eXBlLmVuZF9zZWxlY3Rpb24gPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9zZWxlY3RpbmdfdGV4dCA9IGZhbHNlO1xufTtcblxuLyoqXG4gKiBTZXRzIHRoZSBlbmRwb2ludCBvZiB0ZXh0IHNlbGVjdGlvbiBmcm9tIG1vdXNlIGNvb3JkaW5hdGVzLlxuICogQHBhcmFtICB7TW91c2VFdmVudH0gZSAtIG1vdXNlIGV2ZW50IGNvbnRhaW5pbmcgdGhlIGNvb3JkaW5hdGVzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29ycy5wcm90b3R5cGUuc2V0X3NlbGVjdGlvbiA9IGZ1bmN0aW9uKGUpIHtcbiAgICB2YXIgeCA9IGUub2Zmc2V0WDtcbiAgICB2YXIgeSA9IGUub2Zmc2V0WTtcblxuICAgIGlmICh0aGlzLl9zZWxlY3RpbmdfdGV4dCAmJiB0aGlzLmdldF9yb3dfY2hhcikge1xuICAgICAgICB2YXIgbG9jYXRpb24gPSB0aGlzLmdldF9yb3dfY2hhcih4LCB5KTtcbiAgICAgICAgdGhpcy5jdXJzb3JzW3RoaXMuY3Vyc29ycy5sZW5ndGgtMV0uc2V0X3ByaW1hcnkobG9jYXRpb24ucm93X2luZGV4LCBsb2NhdGlvbi5jaGFyX2luZGV4KTtcbiAgICB9XG59O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLkN1cnNvcnMgPSBDdXJzb3JzO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xudmFyIG5vcm1hbGl6ZXIgPSByZXF1aXJlKCcuL2V2ZW50cy9ub3JtYWxpemVyLmpzJyk7XG52YXIga2V5bWFwID0gcmVxdWlyZSgnLi9ldmVudHMvbWFwLmpzJyk7XG52YXIgZGVmYXVsdF9rZXltYXAgPSByZXF1aXJlKCcuL2V2ZW50cy9kZWZhdWx0LmpzJyk7XG52YXIgY3Vyc29ycyA9IHJlcXVpcmUoJy4vY3Vyc29ycy5qcycpO1xudmFyIGNsaXBib2FyZCA9IHJlcXVpcmUoJy4vY2xpcGJvYXJkLmpzJyk7XG5cbi8qKlxuICogQ29udHJvbGxlciBmb3IgYSBEb2N1bWVudE1vZGVsLlxuICovXG52YXIgRG9jdW1lbnRDb250cm9sbGVyID0gZnVuY3Rpb24oZWwsIG1vZGVsKSB7XG4gICAgdXRpbHMuUG9zdGVyQ2xhc3MuY2FsbCh0aGlzKTtcbiAgICB0aGlzLmNsaXBib2FyZCA9IG5ldyBjbGlwYm9hcmQuQ2xpcGJvYXJkKGVsKTtcbiAgICB0aGlzLm5vcm1hbGl6ZXIgPSBuZXcgbm9ybWFsaXplci5Ob3JtYWxpemVyKCk7XG4gICAgdGhpcy5ub3JtYWxpemVyLmxpc3Rlbl90byhlbCk7XG4gICAgdGhpcy5ub3JtYWxpemVyLmxpc3Rlbl90byh0aGlzLmNsaXBib2FyZC5oaWRkZW5faW5wdXQpO1xuICAgIHRoaXMubWFwID0gbmV3IGtleW1hcC5NYXAodGhpcy5ub3JtYWxpemVyKTtcbiAgICB0aGlzLm1hcC5tYXAoZGVmYXVsdF9rZXltYXAubWFwKTtcblxuICAgIHRoaXMuY3Vyc29ycyA9IG5ldyBjdXJzb3JzLkN1cnNvcnMobW9kZWwsIHRoaXMuY2xpcGJvYXJkKTtcbn07XG51dGlscy5pbmhlcml0KERvY3VtZW50Q29udHJvbGxlciwgdXRpbHMuUG9zdGVyQ2xhc3MpO1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLkRvY3VtZW50Q29udHJvbGxlciA9IERvY3VtZW50Q29udHJvbGxlcjtcbiIsInZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKTtcblxuLyoqXG4gKiBNb2RlbCBjb250YWluaW5nIGFsbCBvZiB0aGUgZG9jdW1lbnQncyBkYXRhICh0ZXh0KS5cbiAqL1xudmFyIERvY3VtZW50TW9kZWwgPSBmdW5jdGlvbigpIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMuX3Jvd3MgPSBbXTtcbiAgICB0aGlzLl9yb3dfdGFncyA9IFtdO1xuICAgIHRoaXMuX3RhZ19sb2NrID0gMDtcbiAgICB0aGlzLl9wZW5kaW5nX3RhZ19ldmVudHMgPSBmYWxzZTtcbiAgICB0aGlzLl9pbml0X3Byb3BlcnRpZXMoKTtcbn07XG51dGlscy5pbmhlcml0KERvY3VtZW50TW9kZWwsIHV0aWxzLlBvc3RlckNsYXNzKTtcblxuLyoqXG4gLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxuKiBBY3F1aXJlIGEgbG9jayBvbiB0YWcgZXZlbnRzXG4gKlxuICogUHJldmVudHMgdGFnIGV2ZW50cyBmcm9tIGZpcmluZy5cbiAqIEByZXR1cm4ge2ludGVnZXJ9IGxvY2sgY291bnRcbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUuYWNxdWlyZV90YWdfZXZlbnRfbG9jayA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl90YWdfbG9jaysrO1xufTtcblxuLyoqXG4gKiBSZWxlYXNlIGEgbG9jayBvbiB0YWcgZXZlbnRzXG4gKiBAcmV0dXJuIHtpbnRlZ2VyfSBsb2NrIGNvdW50XG4gKi9cbkRvY3VtZW50TW9kZWwucHJvdG90eXBlLnJlbGVhc2VfdGFnX2V2ZW50X2xvY2sgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl90YWdfbG9jay0tO1xuICAgIGlmICh0aGlzLl90YWdfbG9jayA8IDApIHtcbiAgICAgICAgdGhpcy5fdGFnX2xvY2sgPSAwO1xuICAgIH1cbiAgICBpZiAodGhpcy5fdGFnX2xvY2sgPT09IDAgJiYgdGhpcy5fcGVuZGluZ190YWdfZXZlbnRzKSB7XG4gICAgICAgIHRoaXMuX3BlbmRpbmdfdGFnX2V2ZW50cyA9IGZhbHNlO1xuICAgICAgICB0aGlzLnRyaWdnZXJfdGFnX2V2ZW50cygpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fdGFnX2xvY2s7XG59O1xuXG4vKipcbiAqIFRyaWdnZXJzIHRoZSB0YWcgY2hhbmdlIGV2ZW50cy5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkRvY3VtZW50TW9kZWwucHJvdG90eXBlLnRyaWdnZXJfdGFnX2V2ZW50cyA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLl90YWdfbG9jayA9PT0gMCkge1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ3RhZ3NfY2hhbmdlZCcpO1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZWQnKTsgICAgXG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fcGVuZGluZ190YWdfZXZlbnRzID0gdHJ1ZTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFNldHMgYSAndGFnJyBvbiB0aGUgdGV4dCBzcGVjaWZpZWQuXG4gKiBAcGFyYW0ge2ludGVnZXJ9IHN0YXJ0X3JvdyAtIHJvdyB0aGUgdGFnIHN0YXJ0cyBvblxuICogQHBhcmFtIHtpbnRlZ2VyfSBzdGFydF9jaGFyIC0gaW5kZXgsIGluIHRoZSByb3csIG9mIHRoZSBmaXJzdCB0YWdnZWQgY2hhcmFjdGVyXG4gKiBAcGFyYW0ge2ludGVnZXJ9IGVuZF9yb3cgLSByb3cgdGhlIHRhZyBlbmRzIG9uXG4gKiBAcGFyYW0ge2ludGVnZXJ9IGVuZF9jaGFyIC0gaW5kZXgsIGluIHRoZSByb3csIG9mIHRoZSBsYXN0IHRhZ2dlZCBjaGFyYWN0ZXJcbiAqIEBwYXJhbSB7c3RyaW5nfSB0YWdfbmFtZVxuICogQHBhcmFtIHthbnl9IHRhZ192YWx1ZSAtIG92ZXJyaWRlcyBhbnkgcHJldmlvdXMgdGFnc1xuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS5zZXRfdGFnID0gZnVuY3Rpb24oc3RhcnRfcm93LCBzdGFydF9jaGFyLCBlbmRfcm93LCBlbmRfY2hhciwgdGFnX25hbWUsIHRhZ192YWx1ZSkge1xuICAgIHZhciBjb29yZHMgPSB0aGlzLnZhbGlkYXRlX2Nvb3Jkcy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIGZvciAodmFyIHJvdyA9IGNvb3Jkcy5zdGFydF9yb3c7IHJvdyA8PSBjb29yZHMuZW5kX3Jvdzsgcm93KyspIHtcbiAgICAgICAgdmFyIHN0YXJ0ID0gY29vcmRzLnN0YXJ0X2NoYXI7XG4gICAgICAgIHZhciBlbmQgPSBjb29yZHMuZW5kX2NoYXI7XG4gICAgICAgIGlmIChyb3cgPiBjb29yZHMuc3RhcnRfcm93KSB7IHN0YXJ0ID0gLTE7IH1cbiAgICAgICAgaWYgKHJvdyA8IGNvb3Jkcy5lbmRfcm93KSB7IGVuZCA9IC0xOyB9XG5cbiAgICAgICAgLy8gUmVtb3ZlIG9yIG1vZGlmeSBjb25mbGljdGluZyB0YWdzLlxuICAgICAgICB2YXIgYWRkX3RhZ3MgPSBbXTtcbiAgICAgICAgdGhpcy5fcm93X3RhZ3Nbcm93XS5maWx0ZXIoZnVuY3Rpb24odGFnKSB7XG4gICAgICAgICAgICBpZiAodGFnLm5hbWUgPT0gdGFnX25hbWUpIHtcbiAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0YWcgaXMgd2l0aGluXG4gICAgICAgICAgICAgICAgaWYgKHN0YXJ0ID09IC0xICYmIGVuZCA9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh0YWcuc3RhcnQgPj0gc3RhcnQgJiYgKHRhZy5lbmQgPCBlbmQgfHwgZW5kID09IC0xKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRhZyBpcyBvdXRzaWRlXG4gICAgICAgICAgICAgICAgLy8gVG8gdGhlIHJpZ2h0P1xuICAgICAgICAgICAgICAgIGlmICh0YWcuc3RhcnQgPiBlbmQgJiYgZW5kICE9IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBUbyB0aGUgbGVmdD9cbiAgICAgICAgICAgICAgICBpZiAodGFnLmVuZCA8IHN0YXJ0ICYmIHRhZy5lbmQgIT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGFnIGVuY2Fwc3VsYXRlc1xuICAgICAgICAgICAgICAgIHZhciBsZWZ0X2ludGVyc2VjdGluZyA9IHRhZy5zdGFydCA8IHN0YXJ0O1xuICAgICAgICAgICAgICAgIHZhciByaWdodF9pbnRlcnNlY3RpbmcgPSBlbmQgIT0gLTEgJiYgKHRhZy5lbmQgPT0gLTEgfHwgdGFnLmVuZCA+IGVuZCk7XG5cbiAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0YWcgaXMgbGVmdCBpbnRlcnNlY3RpbmdcbiAgICAgICAgICAgICAgICBpZiAobGVmdF9pbnRlcnNlY3RpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgYWRkX3RhZ3MucHVzaCh7bmFtZTogdGFnX25hbWUsIHZhbHVlOiB0YWcudmFsdWUsIHN0YXJ0OiB0YWcuc3RhcnQsIGVuZDogc3RhcnQtMX0pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRhZyBpcyByaWdodCBpbnRlcnNlY3RpbmdcbiAgICAgICAgICAgICAgICBpZiAocmlnaHRfaW50ZXJzZWN0aW5nKSB7XG4gICAgICAgICAgICAgICAgICAgIGFkZF90YWdzLnB1c2goe25hbWU6IHRhZ19uYW1lLCB2YWx1ZTogdGFnLnZhbHVlLCBzdGFydDogZW5kKzEsIGVuZDogdGFnLmVuZH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHRhZ3MgYW5kIGNvcnJlY3RlZCB0YWdzLlxuICAgICAgICB0aGlzLl9yb3dfdGFnc1tyb3ddID0gdGhpcy5fcm93X3RhZ3Nbcm93XS5jb25jYXQoYWRkX3RhZ3MpO1xuICAgICAgICB0aGlzLl9yb3dfdGFnc1tyb3ddLnB1c2goe25hbWU6IHRhZ19uYW1lLCB2YWx1ZTogdGFnX3ZhbHVlLCBzdGFydDogc3RhcnQsIGVuZDogZW5kfSk7XG4gICAgfVxuICAgIHRoaXMudHJpZ2dlcl90YWdfZXZlbnRzKCk7XG59O1xuXG4vKipcbiAqIFJlbW92ZWQgYWxsIG9mIHRoZSB0YWdzIG9uIHRoZSBkb2N1bWVudC5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IHN0YXJ0X3Jvd1xuICogQHBhcmFtICB7aW50ZWdlcn0gZW5kX3Jvd1xuICogQHJldHVybiB7bnVsbH1cbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUuY2xlYXJfdGFncyA9IGZ1bmN0aW9uKHN0YXJ0X3JvdywgZW5kX3Jvdykge1xuICAgIHN0YXJ0X3JvdyA9IHN0YXJ0X3JvdyAhPT0gdW5kZWZpbmVkID8gc3RhcnRfcm93IDogMDtcbiAgICBlbmRfcm93ID0gZW5kX3JvdyAhPT0gdW5kZWZpbmVkID8gZW5kX3JvdyA6IHRoaXMuX3Jvd190YWdzLmxlbmd0aCAtIDE7XG4gICAgZm9yICh2YXIgaSA9IHN0YXJ0X3JvdzsgaSA8PSBlbmRfcm93OyBpKyspIHtcbiAgICAgICAgdGhpcy5fcm93X3RhZ3NbaV0gPSBbXTtcbiAgICB9XG4gICAgdGhpcy50cmlnZ2VyX3RhZ19ldmVudHMoKTtcbn07XG5cbi8qKlxuICogR2V0IHRoZSB0YWdzIGFwcGxpZWQgdG8gYSBjaGFyYWN0ZXIuXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSByb3dfaW5kZXhcbiAqIEBwYXJhbSAge2ludGVnZXJ9IGNoYXJfaW5kZXhcbiAqIEByZXR1cm4ge2RpY3Rpb25hcnl9XG4gKi9cbkRvY3VtZW50TW9kZWwucHJvdG90eXBlLmdldF90YWdzID0gZnVuY3Rpb24ocm93X2luZGV4LCBjaGFyX2luZGV4KSB7XG4gICAgdmFyIGNvb3JkcyA9IHRoaXMudmFsaWRhdGVfY29vcmRzLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgdmFyIHRhZ3MgPSB7fTtcbiAgICB0aGlzLl9yb3dfdGFnc1tjb29yZHMuc3RhcnRfcm93XS5mb3JFYWNoKGZ1bmN0aW9uKHRhZykge1xuICAgICAgICAvLyBUYWcgc3RhcnQgb2YgLTEgbWVhbnMgdGhlIHRhZyBjb250aW51ZXMgdG8gdGhlIHByZXZpb3VzIGxpbmUuXG4gICAgICAgIHZhciBhZnRlcl9zdGFydCA9IChjb29yZHMuc3RhcnRfY2hhciA+PSB0YWcuc3RhcnQgfHwgdGFnLnN0YXJ0ID09IC0xKTtcbiAgICAgICAgLy8gVGFnIGVuZCBvZiAtMSBtZWFucyB0aGUgdGFnIGNvbnRpbnVlcyB0byB0aGUgbmV4dCBsaW5lLlxuICAgICAgICB2YXIgYmVmb3JlX2VuZCA9IChjb29yZHMuc3RhcnRfY2hhciA8PSB0YWcuZW5kIHx8IHRhZy5lbmQgPT0gLTEpO1xuICAgICAgICBpZiAoYWZ0ZXJfc3RhcnQgJiYgYmVmb3JlX2VuZCkge1xuICAgICAgICAgICAgdGFnc1t0YWcubmFtZV0gPSB0YWcudmFsdWU7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gdGFncztcbn07XG5cbi8qKlxuICogQWRkcyB0ZXh0IGVmZmljaWVudGx5IHNvbWV3aGVyZSBpbiB0aGUgZG9jdW1lbnQuXG4gKiBAcGFyYW0ge2ludGVnZXJ9IHJvd19pbmRleCAgXG4gKiBAcGFyYW0ge2ludGVnZXJ9IGNoYXJfaW5kZXggXG4gKiBAcGFyYW0ge3N0cmluZ30gdGV4dFxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS5hZGRfdGV4dCA9IGZ1bmN0aW9uKHJvd19pbmRleCwgY2hhcl9pbmRleCwgdGV4dCkge1xuICAgIHZhciBjb29yZHMgPSB0aGlzLnZhbGlkYXRlX2Nvb3Jkcy5hcHBseSh0aGlzLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDAsMikpO1xuICAgIC8vIElmIHRoZSB0ZXh0IGhhcyBhIG5ldyBsaW5lIGluIGl0LCBqdXN0IHJlLXNldFxuICAgIC8vIHRoZSByb3dzIGxpc3QuXG4gICAgaWYgKHRleHQuaW5kZXhPZignXFxuJykgIT0gLTEpIHtcbiAgICAgICAgdmFyIG5ld19yb3dzID0gW107XG4gICAgICAgIGlmIChjb29yZHMuc3RhcnRfcm93ID4gMCkge1xuICAgICAgICAgICAgbmV3X3Jvd3MgPSB0aGlzLl9yb3dzLnNsaWNlKDAsIGNvb3Jkcy5zdGFydF9yb3cpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIG9sZF9yb3cgPSB0aGlzLl9yb3dzW2Nvb3Jkcy5zdGFydF9yb3ddO1xuICAgICAgICB2YXIgb2xkX3Jvd19zdGFydCA9IG9sZF9yb3cuc3Vic3RyaW5nKDAsIGNvb3Jkcy5zdGFydF9jaGFyKTtcbiAgICAgICAgdmFyIG9sZF9yb3dfZW5kID0gb2xkX3Jvdy5zdWJzdHJpbmcoY29vcmRzLnN0YXJ0X2NoYXIpO1xuICAgICAgICB2YXIgc3BsaXRfdGV4dCA9IHRleHQuc3BsaXQoJ1xcbicpO1xuICAgICAgICBuZXdfcm93cy5wdXNoKG9sZF9yb3dfc3RhcnQgKyBzcGxpdF90ZXh0WzBdKTtcblxuICAgICAgICBpZiAoc3BsaXRfdGV4dC5sZW5ndGggPiAyKSB7XG4gICAgICAgICAgICBuZXdfcm93cyA9IG5ld19yb3dzLmNvbmNhdChzcGxpdF90ZXh0LnNsaWNlKDEsc3BsaXRfdGV4dC5sZW5ndGgtMSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgbmV3X3Jvd3MucHVzaChzcGxpdF90ZXh0W3NwbGl0X3RleHQubGVuZ3RoLTFdICsgb2xkX3Jvd19lbmQpO1xuXG4gICAgICAgIGlmIChjb29yZHMuc3RhcnRfcm93KzEgPCB0aGlzLl9yb3dzLmxlbmd0aCkge1xuICAgICAgICAgICAgbmV3X3Jvd3MgPSBuZXdfcm93cy5jb25jYXQodGhpcy5fcm93cy5zbGljZShjb29yZHMuc3RhcnRfcm93KzEpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX3Jvd3MgPSBuZXdfcm93cztcbiAgICAgICAgdGhpcy5fcmVzaXplZF9yb3dzKCk7XG4gICAgICAgIHRoaXMudHJpZ2dlcigncm93X2NoYW5nZWQnLCBjb29yZHMuc3RhcnRfcm93KTtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdyb3dzX2FkZGVkJywgY29vcmRzLnN0YXJ0X3JvdyArIDEsIGNvb3Jkcy5zdGFydF9yb3cgKyBzcGxpdF90ZXh0Lmxlbmd0aCAtIDEpO1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZWQnKTtcblxuICAgIC8vIFRleHQgZG9lc24ndCBoYXZlIGFueSBuZXcgbGluZXMsIGp1c3QgbW9kaWZ5IHRoZVxuICAgIC8vIGxpbmUgYW5kIHRoZW4gdHJpZ2dlciB0aGUgcm93IGNoYW5nZWQgZXZlbnQuXG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIG9sZF90ZXh0ID0gdGhpcy5fcm93c1tjb29yZHMuc3RhcnRfcm93XTtcbiAgICAgICAgdGhpcy5fcm93c1tjb29yZHMuc3RhcnRfcm93XSA9IG9sZF90ZXh0LnN1YnN0cmluZygwLCBjb29yZHMuc3RhcnRfY2hhcikgKyB0ZXh0ICsgb2xkX3RleHQuc3Vic3RyaW5nKGNvb3Jkcy5zdGFydF9jaGFyKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdyb3dfY2hhbmdlZCcsIGNvb3Jkcy5zdGFydF9yb3cpO1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZWQnKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgYSBibG9jayBvZiB0ZXh0IGZyb20gdGhlIGRvY3VtZW50XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBzdGFydF9yb3dcbiAqIEBwYXJhbSAge2ludGVnZXJ9IHN0YXJ0X2NoYXJcbiAqIEBwYXJhbSAge2ludGVnZXJ9IGVuZF9yb3dcbiAqIEBwYXJhbSAge2ludGVnZXJ9IGVuZF9jaGFyXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS5yZW1vdmVfdGV4dCA9IGZ1bmN0aW9uKHN0YXJ0X3Jvdywgc3RhcnRfY2hhciwgZW5kX3JvdywgZW5kX2NoYXIpIHtcbiAgICB2YXIgY29vcmRzID0gdGhpcy52YWxpZGF0ZV9jb29yZHMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICBpZiAoY29vcmRzLnN0YXJ0X3JvdyA9PSBjb29yZHMuZW5kX3Jvdykge1xuICAgICAgICB0aGlzLl9yb3dzW2Nvb3Jkcy5zdGFydF9yb3ddID0gdGhpcy5fcm93c1tjb29yZHMuc3RhcnRfcm93XS5zdWJzdHJpbmcoMCwgY29vcmRzLnN0YXJ0X2NoYXIpICsgdGhpcy5fcm93c1tjb29yZHMuc3RhcnRfcm93XS5zdWJzdHJpbmcoY29vcmRzLmVuZF9jaGFyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9yb3dzW2Nvb3Jkcy5zdGFydF9yb3ddID0gdGhpcy5fcm93c1tjb29yZHMuc3RhcnRfcm93XS5zdWJzdHJpbmcoMCwgY29vcmRzLnN0YXJ0X2NoYXIpICsgdGhpcy5fcm93c1tjb29yZHMuZW5kX3Jvd10uc3Vic3RyaW5nKGNvb3Jkcy5lbmRfY2hhcik7XG4gICAgfVxuXG4gICAgaWYgKGNvb3Jkcy5lbmRfcm93IC0gY29vcmRzLnN0YXJ0X3JvdyA+IDApIHtcbiAgICAgICAgdGhpcy5fcm93cy5zcGxpY2UoY29vcmRzLnN0YXJ0X3JvdyArIDEsIGNvb3Jkcy5lbmRfcm93IC0gY29vcmRzLnN0YXJ0X3Jvdyk7XG4gICAgICAgIHRoaXMuX3Jlc2l6ZWRfcm93cygpO1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ3RleHRfY2hhbmdlZCcpO1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZWQnKTtcbiAgICB9IGVsc2UgaWYgKGNvb3Jkcy5lbmRfcm93ID09IGNvb3Jkcy5zdGFydF9yb3cpIHtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdyb3dfY2hhbmdlZCcsIGNvb3Jkcy5zdGFydF9yb3cpO1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZWQnKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFJlbW92ZSBhIHJvdyBmcm9tIHRoZSBkb2N1bWVudC5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IHJvd19pbmRleFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUucmVtb3ZlX3JvdyA9IGZ1bmN0aW9uKHJvd19pbmRleCkge1xuICAgIGlmICgwIDwgcm93X2luZGV4ICYmIHJvd19pbmRleCA8IHRoaXMuX3Jvd3MubGVuZ3RoKSB7XG4gICAgICAgIHRoaXMuX3Jvd3Muc3BsaWNlKHJvd19pbmRleCwgMSk7XG4gICAgICAgIHRoaXMuX3Jlc2l6ZWRfcm93cygpO1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ3RleHRfY2hhbmdlZCcpO1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZWQnKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEdldHMgYSBjaHVuayBvZiB0ZXh0LlxuICogQHBhcmFtICB7aW50ZWdlcn0gc3RhcnRfcm93XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBzdGFydF9jaGFyXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBlbmRfcm93XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBlbmRfY2hhclxuICogQHJldHVybiB7c3RyaW5nfVxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS5nZXRfdGV4dCA9IGZ1bmN0aW9uKHN0YXJ0X3Jvdywgc3RhcnRfY2hhciwgZW5kX3JvdywgZW5kX2NoYXIpIHtcbiAgICB2YXIgY29vcmRzID0gdGhpcy52YWxpZGF0ZV9jb29yZHMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICBpZiAoY29vcmRzLnN0YXJ0X3Jvdz09Y29vcmRzLmVuZF9yb3cpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3Jvd3NbY29vcmRzLnN0YXJ0X3Jvd10uc3Vic3RyaW5nKGNvb3Jkcy5zdGFydF9jaGFyLCBjb29yZHMuZW5kX2NoYXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciB0ZXh0ID0gW107XG4gICAgICAgIHRleHQucHVzaCh0aGlzLl9yb3dzW2Nvb3Jkcy5zdGFydF9yb3ddLnN1YnN0cmluZyhjb29yZHMuc3RhcnRfY2hhcikpO1xuICAgICAgICBpZiAoY29vcmRzLmVuZF9yb3cgLSBjb29yZHMuc3RhcnRfcm93ID4gMSkge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IGNvb3Jkcy5zdGFydF9yb3cgKyAxOyBpIDwgY29vcmRzLmVuZF9yb3c7IGkrKykge1xuICAgICAgICAgICAgICAgIHRleHQucHVzaCh0aGlzLl9yb3dzW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0ZXh0LnB1c2godGhpcy5fcm93c1tjb29yZHMuZW5kX3Jvd10uc3Vic3RyaW5nKDAsIGNvb3Jkcy5lbmRfY2hhcikpO1xuICAgICAgICByZXR1cm4gdGV4dC5qb2luKCdcXG4nKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEFkZCBhIHJvdyB0byB0aGUgZG9jdW1lbnRcbiAqIEBwYXJhbSB7aW50ZWdlcn0gcm93X2luZGV4XG4gKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIG5ldyByb3cncyB0ZXh0XG4gKi9cbkRvY3VtZW50TW9kZWwucHJvdG90eXBlLmFkZF9yb3cgPSBmdW5jdGlvbihyb3dfaW5kZXgsIHRleHQpIHtcbiAgICB2YXIgbmV3X3Jvd3MgPSBbXTtcbiAgICBpZiAocm93X2luZGV4ID4gMCkge1xuICAgICAgICBuZXdfcm93cyA9IHRoaXMuX3Jvd3Muc2xpY2UoMCwgcm93X2luZGV4KTtcbiAgICB9XG4gICAgbmV3X3Jvd3MucHVzaCh0ZXh0KTtcbiAgICBpZiAocm93X2luZGV4IDwgdGhpcy5fcm93cy5sZW5ndGgpIHtcbiAgICAgICAgbmV3X3Jvd3MgPSBuZXdfcm93cy5jb25jYXQodGhpcy5fcm93cy5zbGljZShyb3dfaW5kZXgpKTtcbiAgICB9XG5cbiAgICB0aGlzLl9yb3dzID0gbmV3X3Jvd3M7XG4gICAgdGhpcy5fcmVzaXplZF9yb3dzKCk7XG4gICAgdGhpcy50cmlnZ2VyKCdyb3dzX2FkZGVkJywgcm93X2luZGV4LCByb3dfaW5kZXgpO1xuICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpO1xufTtcblxuLyoqXG4gKiBWYWxpZGF0ZXMgcm93LCBjaGFyYWN0ZXIgY29vcmRpbmF0ZXMgaW4gdGhlIGRvY3VtZW50LlxuICogQHBhcmFtICB7aW50ZWdlcn0gc3RhcnRfcm93XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBzdGFydF9jaGFyXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSAob3B0aW9uYWwpIGVuZF9yb3dcbiAqIEBwYXJhbSAge2ludGVnZXJ9IChvcHRpb25hbCkgZW5kX2NoYXJcbiAqIEByZXR1cm4ge2RpY3Rpb25hcnl9IGRpY3Rpb25hcnkgY29udGFpbmluZyB2YWxpZGF0ZWQgY29vcmRpbmF0ZXMge3N0YXJ0X3JvdywgXG4gKiAgICAgICAgICAgICAgICAgICAgICBzdGFydF9jaGFyLCBlbmRfcm93LCBlbmRfY2hhcn1cbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUudmFsaWRhdGVfY29vcmRzID0gZnVuY3Rpb24oc3RhcnRfcm93LCBzdGFydF9jaGFyLCBlbmRfcm93LCBlbmRfY2hhcikge1xuXG4gICAgLy8gTWFrZSBzdXJlIHRoZSB2YWx1ZXMgYXJlbid0IHVuZGVmaW5lZC5cbiAgICBpZiAoc3RhcnRfcm93ID09PSB1bmRlZmluZWQpIHN0YXJ0X3JvdyA9IDA7XG4gICAgaWYgKHN0YXJ0X2NoYXIgPT09IHVuZGVmaW5lZCkgc3RhcnRfY2hhciA9IDA7XG4gICAgaWYgKGVuZF9yb3cgPT09IHVuZGVmaW5lZCkgZW5kX3JvdyA9IHN0YXJ0X3JvdztcbiAgICBpZiAoZW5kX2NoYXIgPT09IHVuZGVmaW5lZCkgZW5kX2NoYXIgPSBzdGFydF9jaGFyO1xuXG4gICAgLy8gTWFrZSBzdXJlIHRoZSB2YWx1ZXMgYXJlIHdpdGhpbiB0aGUgYm91bmRzIG9mIHRoZSBjb250ZW50cy5cbiAgICBpZiAodGhpcy5fcm93cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgc3RhcnRfcm93ID0gMDtcbiAgICAgICAgc3RhcnRfY2hhciA9IDA7XG4gICAgICAgIGVuZF9yb3cgPSAwO1xuICAgICAgICBlbmRfY2hhciA9IDA7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHN0YXJ0X3JvdyA+PSB0aGlzLl9yb3dzLmxlbmd0aCkgc3RhcnRfcm93ID0gdGhpcy5fcm93cy5sZW5ndGggLSAxO1xuICAgICAgICBpZiAoc3RhcnRfcm93IDwgMCkgc3RhcnRfcm93ID0gMDtcbiAgICAgICAgaWYgKGVuZF9yb3cgPj0gdGhpcy5fcm93cy5sZW5ndGgpIGVuZF9yb3cgPSB0aGlzLl9yb3dzLmxlbmd0aCAtIDE7XG4gICAgICAgIGlmIChlbmRfcm93IDwgMCkgZW5kX3JvdyA9IDA7XG5cbiAgICAgICAgaWYgKHN0YXJ0X2NoYXIgPiB0aGlzLl9yb3dzW3N0YXJ0X3Jvd10ubGVuZ3RoKSBzdGFydF9jaGFyID0gdGhpcy5fcm93c1tzdGFydF9yb3ddLmxlbmd0aDtcbiAgICAgICAgaWYgKHN0YXJ0X2NoYXIgPCAwKSBzdGFydF9jaGFyID0gMDtcbiAgICAgICAgaWYgKGVuZF9jaGFyID4gdGhpcy5fcm93c1tlbmRfcm93XS5sZW5ndGgpIGVuZF9jaGFyID0gdGhpcy5fcm93c1tlbmRfcm93XS5sZW5ndGg7XG4gICAgICAgIGlmIChlbmRfY2hhciA8IDApIGVuZF9jaGFyID0gMDtcbiAgICB9XG5cbiAgICAvLyBNYWtlIHN1cmUgdGhlIHN0YXJ0IGlzIGJlZm9yZSB0aGUgZW5kLlxuICAgIGlmIChzdGFydF9yb3cgPiBlbmRfcm93IHx8IChzdGFydF9yb3cgPT0gZW5kX3JvdyAmJiBzdGFydF9jaGFyID4gZW5kX2NoYXIpKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdGFydF9yb3c6IGVuZF9yb3csXG4gICAgICAgICAgICBzdGFydF9jaGFyOiBlbmRfY2hhcixcbiAgICAgICAgICAgIGVuZF9yb3c6IHN0YXJ0X3JvdyxcbiAgICAgICAgICAgIGVuZF9jaGFyOiBzdGFydF9jaGFyLFxuICAgICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdGFydF9yb3c6IHN0YXJ0X3JvdyxcbiAgICAgICAgICAgIHN0YXJ0X2NoYXI6IHN0YXJ0X2NoYXIsXG4gICAgICAgICAgICBlbmRfcm93OiBlbmRfcm93LFxuICAgICAgICAgICAgZW5kX2NoYXI6IGVuZF9jaGFyLFxuICAgICAgICB9O1xuICAgIH1cbn07XG5cbi8qKlxuICogR2V0cyB0aGUgdGV4dCBvZiB0aGUgZG9jdW1lbnQuXG4gKiBAcmV0dXJuIHtzdHJpbmd9XG4gKi9cbkRvY3VtZW50TW9kZWwucHJvdG90eXBlLl9nZXRfdGV4dCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9yb3dzLmpvaW4oJ1xcbicpO1xufTtcblxuLyoqXG4gKiBTZXRzIHRoZSB0ZXh0IG9mIHRoZSBkb2N1bWVudC5cbiAqIENvbXBsZXhpdHkgTyhOKSBmb3IgTiByb3dzXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWVcbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUuX3NldF90ZXh0ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICB0aGlzLl9yb3dzID0gdmFsdWUuc3BsaXQoJ1xcbicpO1xuICAgIHRoaXMuX3Jlc2l6ZWRfcm93cygpO1xuICAgIHRoaXMudHJpZ2dlcigndGV4dF9jaGFuZ2VkJyk7XG4gICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2VkJyk7XG59O1xuXG4vKipcbiAqIFVwZGF0ZXMgX3JvdydzIHBhcnRuZXIgYXJyYXlzLlxuICogQHJldHVybiB7bnVsbH0gXG4gKi9cbkRvY3VtZW50TW9kZWwucHJvdG90eXBlLl9yZXNpemVkX3Jvd3MgPSBmdW5jdGlvbigpIHtcblxuICAgIC8vIE1ha2Ugc3VyZSB0aGVyZSBhcmUgYXMgbWFueSB0YWcgcm93cyBhcyB0aGVyZSBhcmUgdGV4dCByb3dzLlxuICAgIHdoaWxlICh0aGlzLl9yb3dfdGFncy5sZW5ndGggPCB0aGlzLl9yb3dzLmxlbmd0aCkge1xuICAgICAgICB0aGlzLl9yb3dfdGFncy5wdXNoKFtdKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuX3Jvd190YWdzLmxlbmd0aCA+IHRoaXMuX3Jvd3MubGVuZ3RoKSB7XG4gICAgICAgIHRoaXMuX3Jvd190YWdzLnNwbGljZSh0aGlzLl9yb3dzLmxlbmd0aCwgdGhpcy5fcm93X3RhZ3MubGVuZ3RoIC0gdGhpcy5fcm93cy5sZW5ndGgpO1xuICAgIH1cbn07XG5cbi8qKlxuICogQ3JlYXRlIHRoZSBkb2N1bWVudCdzIHByb3BlcnRpZXMuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS5faW5pdF9wcm9wZXJ0aWVzID0gZnVuY3Rpb24oKSB7ICAgIFxuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLnByb3BlcnR5KCdyb3dzJywgZnVuY3Rpb24oKSB7IFxuICAgICAgICAvLyBSZXR1cm4gYSBzaGFsbG93IGNvcHkgb2YgdGhlIGFycmF5IHNvIGl0IGNhbm5vdCBiZSBtb2RpZmllZC5cbiAgICAgICAgcmV0dXJuIFtdLmNvbmNhdCh0aGF0Ll9yb3dzKTsgXG4gICAgfSk7XG4gICAgdGhpcy5wcm9wZXJ0eSgndGV4dCcsIFxuICAgICAgICB1dGlscy5wcm94eSh0aGlzLl9nZXRfdGV4dCwgdGhpcyksIFxuICAgICAgICB1dGlscy5wcm94eSh0aGlzLl9zZXRfdGV4dCwgdGhpcykpO1xufTtcblxuZXhwb3J0cy5Eb2N1bWVudE1vZGVsID0gRG9jdW1lbnRNb2RlbDsiLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG5cbi8vIFJlbmRlcmVyc1xudmFyIGJhdGNoID0gcmVxdWlyZSgnLi9yZW5kZXJlcnMvYmF0Y2guanMnKTtcbnZhciBoaWdobGlnaHRlZF9yb3cgPSByZXF1aXJlKCcuL3JlbmRlcmVycy9oaWdobGlnaHRlZF9yb3cuanMnKTtcbnZhciBjdXJzb3JzID0gcmVxdWlyZSgnLi9yZW5kZXJlcnMvY3Vyc29ycy5qcycpO1xudmFyIHNlbGVjdGlvbnMgPSByZXF1aXJlKCcuL3JlbmRlcmVycy9zZWxlY3Rpb25zLmpzJyk7XG52YXIgY29sb3IgPSByZXF1aXJlKCcuL3JlbmRlcmVycy9jb2xvci5qcycpO1xudmFyIHN5bnRheF9oaWdobGlnaHRlciA9IHJlcXVpcmUoJy4vaGlnaGxpZ2h0ZXJzL3N5bnRheC5qcycpO1xuXG4vKipcbiAqIFZpc3VhbCByZXByZXNlbnRhdGlvbiBvZiBhIERvY3VtZW50TW9kZWwgaW5zdGFuY2VcbiAqIEBwYXJhbSB7Q2FudmFzfSBjYW52YXMgaW5zdGFuY2VcbiAqIEBwYXJhbSB7RG9jdW1lbnRNb2RlbH0gbW9kZWwgaW5zdGFuY2VcbiAqIEBwYXJhbSB7Q3Vyc29yc30gY3Vyc29yc19tb2RlbCBpbnN0YW5jZVxuICogQHBhcmFtIHtTdHlsZX0gc3R5bGUgLSBkZXNjcmliZXMgcmVuZGVyaW5nIHN0eWxlXG4gKiBAcGFyYW0ge1Bvc3RlckNsYXNzfSBjb25maWcgLSB1c2VyIGNvbmZpZ1xuICogQHBhcmFtIHtmdW5jdGlvbn0gaGFzX2ZvY3VzIC0gZnVuY3Rpb24gdGhhdCBjaGVja3MgaWYgdGhlIHRleHQgYXJlYSBoYXMgZm9jdXNcbiAqL1xudmFyIERvY3VtZW50VmlldyA9IGZ1bmN0aW9uKGNhbnZhcywgbW9kZWwsIGN1cnNvcnNfbW9kZWwsIHN0eWxlLCBjb25maWcsIGhhc19mb2N1cykge1xuICAgIHRoaXMuX21vZGVsID0gbW9kZWw7XG5cbiAgICAvLyBDcmVhdGUgY2hpbGQgcmVuZGVyZXJzLlxuICAgIHZhciByb3dfcmVuZGVyZXIgPSBuZXcgaGlnaGxpZ2h0ZWRfcm93LkhpZ2hsaWdodGVkUm93UmVuZGVyZXIobW9kZWwsIGNhbnZhcywgc3R5bGUsIGNvbmZpZyk7XG4gICAgdmFyIGN1cnNvcnNfcmVuZGVyZXIgPSBuZXcgY3Vyc29ycy5DdXJzb3JzUmVuZGVyZXIoXG4gICAgICAgIGN1cnNvcnNfbW9kZWwsIFxuICAgICAgICBzdHlsZSwgXG4gICAgICAgIHJvd19yZW5kZXJlcixcbiAgICAgICAgaGFzX2ZvY3VzKTtcbiAgICB2YXIgc2VsZWN0aW9uc19yZW5kZXJlciA9IG5ldyBzZWxlY3Rpb25zLlNlbGVjdGlvbnNSZW5kZXJlcihcbiAgICAgICAgY3Vyc29yc19tb2RlbCwgXG4gICAgICAgIHN0eWxlLCBcbiAgICAgICAgcm93X3JlbmRlcmVyLFxuICAgICAgICBoYXNfZm9jdXMsXG4gICAgICAgIGN1cnNvcnNfcmVuZGVyZXIpO1xuXG4gICAgLy8gQ3JlYXRlIHRoZSBiYWNrZ3JvdW5kIHJlbmRlcmVyXG4gICAgdmFyIGNvbG9yX3JlbmRlcmVyID0gbmV3IGNvbG9yLkNvbG9yUmVuZGVyZXIoKTtcbiAgICBjb2xvcl9yZW5kZXJlci5jb2xvciA9IHN0eWxlLmJhY2tncm91bmQgfHwgJ3doaXRlJztcbiAgICBzdHlsZS5vbignY2hhbmdlZDpzdHlsZScsIGZ1bmN0aW9uKCkgeyBjb2xvcl9yZW5kZXJlci5jb2xvciA9IHN0eWxlLmJhY2tncm91bmQ7IH0pO1xuXG4gICAgLy8gQ3JlYXRlIHRoZSBkb2N1bWVudCBoaWdobGlnaHRlciwgd2hpY2ggbmVlZHMgdG8ga25vdyBhYm91dCB0aGUgY3VycmVudGx5XG4gICAgLy8gcmVuZGVyZWQgcm93cyBpbiBvcmRlciB0byBrbm93IHdoZXJlIHRvIGhpZ2hsaWdodC5cbiAgICB0aGlzLmhpZ2hsaWdodGVyID0gbmV3IHN5bnRheF9oaWdobGlnaHRlci5TeW50YXhIaWdobGlnaHRlcihtb2RlbCwgcm93X3JlbmRlcmVyKTtcblxuICAgIC8vIFBhc3MgZ2V0X3Jvd19jaGFyIGludG8gY3Vyc29ycy5cbiAgICBjdXJzb3JzX21vZGVsLmdldF9yb3dfY2hhciA9IHV0aWxzLnByb3h5KHJvd19yZW5kZXJlci5nZXRfcm93X2NoYXIsIHJvd19yZW5kZXJlcik7XG5cbiAgICAvLyBDYWxsIGJhc2UgY29uc3RydWN0b3IuXG4gICAgYmF0Y2guQmF0Y2hSZW5kZXJlci5jYWxsKHRoaXMsIFtcbiAgICAgICAgY29sb3JfcmVuZGVyZXIsXG4gICAgICAgIHNlbGVjdGlvbnNfcmVuZGVyZXIsXG4gICAgICAgIHJvd19yZW5kZXJlcixcbiAgICAgICAgY3Vyc29yc19yZW5kZXJlcixcbiAgICBdLCBjYW52YXMpO1xuXG4gICAgLy8gSG9va3VwIHJlbmRlciBldmVudHMuXG4gICAgdGhpcy5fY2FudmFzLm9uKCdyZWRyYXcnLCB1dGlscy5wcm94eSh0aGlzLnJlbmRlciwgdGhpcykpO1xuICAgIHRoaXMuX21vZGVsLm9uKCdjaGFuZ2VkJywgdXRpbHMucHJveHkoY2FudmFzLnJlZHJhdywgY2FudmFzKSk7XG5cbiAgICAvLyBDcmVhdGUgcHJvcGVydGllc1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLnByb3BlcnR5KCdsYW5ndWFnZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC5fbGFuZ3VhZ2U7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC5oaWdobGlnaHRlci5sb2FkKHZhbHVlKTtcbiAgICAgICAgdGhhdC5fbGFuZ3VhZ2UgPSB2YWx1ZTtcbiAgICB9KTtcbn07XG51dGlscy5pbmhlcml0KERvY3VtZW50VmlldywgYmF0Y2guQmF0Y2hSZW5kZXJlcik7XG5cbmV4cG9ydHMuRG9jdW1lbnRWaWV3ID0gRG9jdW1lbnRWaWV3OyIsIi8vIE9TWCBiaW5kaW5nc1xuaWYgKG5hdmlnYXRvci5hcHBWZXJzaW9uLmluZGV4T2YoXCJNYWNcIikgIT0gLTEpIHtcbiAgICBleHBvcnRzLm1hcCA9IHtcbiAgICAgICAgJ2FsdC1sZWZ0YXJyb3cnIDogJ2N1cnNvci53b3JkX2xlZnQnLFxuICAgICAgICAnYWx0LXJpZ2h0YXJyb3cnIDogJ2N1cnNvci53b3JkX3JpZ2h0JyxcbiAgICAgICAgJ3NoaWZ0LWFsdC1sZWZ0YXJyb3cnIDogJ2N1cnNvci5zZWxlY3Rfd29yZF9sZWZ0JyxcbiAgICAgICAgJ3NoaWZ0LWFsdC1yaWdodGFycm93JyA6ICdjdXJzb3Iuc2VsZWN0X3dvcmRfcmlnaHQnLFxuICAgICAgICAnbWV0YS1sZWZ0YXJyb3cnIDogJ2N1cnNvci5saW5lX3N0YXJ0JyxcbiAgICAgICAgJ21ldGEtcmlnaHRhcnJvdycgOiAnY3Vyc29yLmxpbmVfZW5kJyxcbiAgICAgICAgJ3NoaWZ0LW1ldGEtbGVmdGFycm93JyA6ICdjdXJzb3Iuc2VsZWN0X2xpbmVfc3RhcnQnLFxuICAgICAgICAnc2hpZnQtbWV0YS1yaWdodGFycm93JyA6ICdjdXJzb3Iuc2VsZWN0X2xpbmVfZW5kJyxcbiAgICAgICAgJ21ldGEtYScgOiAnY3Vyc29yLnNlbGVjdF9hbGwnLFxuICAgIH07XG5cbi8vIE5vbiBPU1ggYmluZGluZ3Ncbn0gZWxzZSB7XG4gICAgZXhwb3J0cy5tYXAgPSB7XG4gICAgICAgICdjdHJsLWxlZnRhcnJvdycgOiAnY3Vyc29yLndvcmRfbGVmdCcsXG4gICAgICAgICdjdHJsLXJpZ2h0YXJyb3cnIDogJ2N1cnNvci53b3JkX3JpZ2h0JyxcbiAgICAgICAgJ3NoaWZ0LWN0cmwtbGVmdGFycm93JyA6ICdjdXJzb3Iuc2VsZWN0X3dvcmRfbGVmdCcsXG4gICAgICAgICdzaGlmdC1jdHJsLXJpZ2h0YXJyb3cnIDogJ2N1cnNvci5zZWxlY3Rfd29yZF9yaWdodCcsXG4gICAgICAgICdob21lJyA6ICdjdXJzb3IubGluZV9zdGFydCcsXG4gICAgICAgICdlbmQnIDogJ2N1cnNvci5saW5lX2VuZCcsXG4gICAgICAgICdzaGlmdC1ob21lJyA6ICdjdXJzb3Iuc2VsZWN0X2xpbmVfc3RhcnQnLFxuICAgICAgICAnc2hpZnQtZW5kJyA6ICdjdXJzb3Iuc2VsZWN0X2xpbmVfZW5kJyxcbiAgICAgICAgJ2N0cmwtYScgOiAnY3Vyc29yLnNlbGVjdF9hbGwnLFxuICAgIH07XG5cbn1cblxuLy8gQ29tbW9uIGJpbmRpbmdzXG5leHBvcnRzLm1hcFsna2V5cHJlc3MnXSA9ICdjdXJzb3Iua2V5cHJlc3MnO1xuZXhwb3J0cy5tYXBbJ2VudGVyJ10gPSAnY3Vyc29yLm5ld2xpbmUnO1xuZXhwb3J0cy5tYXBbJ2RlbGV0ZSddID0gJ2N1cnNvci5kZWxldGVfZm9yd2FyZCc7XG5leHBvcnRzLm1hcFsnYmFja3NwYWNlJ10gPSAnY3Vyc29yLmRlbGV0ZV9iYWNrd2FyZCc7XG5leHBvcnRzLm1hcFsnbGVmdGFycm93J10gPSAnY3Vyc29yLmxlZnQnO1xuZXhwb3J0cy5tYXBbJ3JpZ2h0YXJyb3cnXSA9ICdjdXJzb3IucmlnaHQnO1xuZXhwb3J0cy5tYXBbJ3VwYXJyb3cnXSA9ICdjdXJzb3IudXAnO1xuZXhwb3J0cy5tYXBbJ2Rvd25hcnJvdyddID0gJ2N1cnNvci5kb3duJztcbmV4cG9ydHMubWFwWydzaGlmdC1sZWZ0YXJyb3cnXSA9ICdjdXJzb3Iuc2VsZWN0X2xlZnQnO1xuZXhwb3J0cy5tYXBbJ3NoaWZ0LXJpZ2h0YXJyb3cnXSA9ICdjdXJzb3Iuc2VsZWN0X3JpZ2h0JztcbmV4cG9ydHMubWFwWydzaGlmdC11cGFycm93J10gPSAnY3Vyc29yLnNlbGVjdF91cCc7XG5leHBvcnRzLm1hcFsnc2hpZnQtZG93bmFycm93J10gPSAnY3Vyc29yLnNlbGVjdF9kb3duJztcbmV4cG9ydHMubWFwWydtb3VzZTAtZG93biddID0gJ2N1cnNvcnMuc3RhcnRfc2VsZWN0aW9uJztcbmV4cG9ydHMubWFwWydtb3VzZS1tb3ZlJ10gPSAnY3Vyc29ycy5zZXRfc2VsZWN0aW9uJztcbmV4cG9ydHMubWFwWydtb3VzZTAtdXAnXSA9ICdjdXJzb3JzLmVuZF9zZWxlY3Rpb24nO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzLmpzJyk7XG5cbi8qKlxuICogRXZlbnQgbm9ybWFsaXplclxuICpcbiAqIExpc3RlbnMgdG8gRE9NIGV2ZW50cyBhbmQgZW1pdHMgJ2NsZWFuZWQnIHZlcnNpb25zIG9mIHRob3NlIGV2ZW50cy5cbiAqL1xudmFyIE1hcCA9IGZ1bmN0aW9uKG5vcm1hbGl6ZXIpIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMuX21hcCA9IHt9O1xuXG4gICAgLy8gQ3JlYXRlIG5vcm1hbGl6ZXIgcHJvcGVydHlcbiAgICB0aGlzLl9ub3JtYWxpemVyID0gbnVsbDtcbiAgICB0aGlzLl9wcm94eV9oYW5kbGVfZXZlbnQgPSB1dGlscy5wcm94eSh0aGlzLl9oYW5kbGVfZXZlbnQsIHRoaXMpO1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLnByb3BlcnR5KCdub3JtYWxpemVyJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Ll9ub3JtYWxpemVyO1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIC8vIFJlbW92ZSBldmVudCBoYW5kbGVyLlxuICAgICAgICBpZiAodGhhdC5fbm9ybWFsaXplcikgdGhhdC5fbm9ybWFsaXplci5vZmZfYWxsKHRoYXQuX3Byb3h5X2hhbmRsZV9ldmVudCk7XG4gICAgICAgIC8vIFNldCwgYW5kIGFkZCBldmVudCBoYW5kbGVyLlxuICAgICAgICB0aGF0Ll9ub3JtYWxpemVyID0gdmFsdWU7XG4gICAgICAgIGlmICh2YWx1ZSkgdmFsdWUub25fYWxsKHRoYXQuX3Byb3h5X2hhbmRsZV9ldmVudCk7XG4gICAgfSk7XG5cbiAgICAvLyBJZiBkZWZpbmVkLCBzZXQgdGhlIG5vcm1hbGl6ZXIuXG4gICAgaWYgKG5vcm1hbGl6ZXIpIHRoaXMubm9ybWFsaXplciA9IG5vcm1hbGl6ZXI7XG59O1xudXRpbHMuaW5oZXJpdChNYXAsIHV0aWxzLlBvc3RlckNsYXNzKTtcblxuLyoqXG4gKiBNYXAgb2YgQVBJIG1ldGhvZHMgYnkgbmFtZS5cbiAqIEB0eXBlIHtkaWN0aW9uYXJ5fVxuICovXG5NYXAucmVnaXN0cnkgPSB7fTtcbk1hcC5fcmVnaXN0cnlfdGFncyA9IHt9O1xuXG4vKipcbiAqIFJlZ2lzdGVycyBhbiBhY3Rpb24uXG4gKiBAcGFyYW0gIHtzdHJpbmd9IG5hbWUgLSBuYW1lIG9mIHRoZSBhY3Rpb25cbiAqIEBwYXJhbSAge2Z1bmN0aW9ufSBmXG4gKiBAcGFyYW0gIHtPYmplY3R9IChvcHRpb25hbCkgdGFnIC0gYWxsb3dzIHlvdSB0byBzcGVjaWZ5IGEgdGFnXG4gKiAgICAgICAgICAgICAgICAgIHdoaWNoIGNhbiBiZSB1c2VkIHdpdGggdGhlIGB1bnJlZ2lzdGVyX2J5X3RhZ2BcbiAqICAgICAgICAgICAgICAgICAgbWV0aG9kIHRvIHF1aWNrbHkgdW5yZWdpc3RlciBhY3Rpb25zIHdpdGhcbiAqICAgICAgICAgICAgICAgICAgdGhlIHRhZyBzcGVjaWZpZWQuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5NYXAucmVnaXN0ZXIgPSBmdW5jdGlvbihuYW1lLCBmLCB0YWcpIHtcbiAgICBpZiAodXRpbHMuaXNfYXJyYXkoTWFwLnJlZ2lzdHJ5W25hbWVdKSkge1xuICAgICAgICBNYXAucmVnaXN0cnlbbmFtZV0ucHVzaChmKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoTWFwLnJlZ2lzdHJ5W25hbWVdPT09dW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBNYXAucmVnaXN0cnlbbmFtZV0gPSBmO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgTWFwLnJlZ2lzdHJ5W25hbWVdID0gW01hcC5yZWdpc3RyeVtuYW1lXSwgZl07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGFnKSB7XG4gICAgICAgIGlmIChNYXAuX3JlZ2lzdHJ5X3RhZ3NbdGFnXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBNYXAuX3JlZ2lzdHJ5X3RhZ3NbdGFnXSA9IFtdO1xuICAgICAgICB9XG4gICAgICAgIE1hcC5fcmVnaXN0cnlfdGFnc1t0YWddLnB1c2goe25hbWU6IG5hbWUsIGY6IGZ9KTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFVucmVnaXN0ZXIgYW4gYWN0aW9uLlxuICogQHBhcmFtICB7c3RyaW5nfSBuYW1lIC0gbmFtZSBvZiB0aGUgYWN0aW9uXG4gKiBAcGFyYW0gIHtmdW5jdGlvbn0gZlxuICogQHJldHVybiB7Ym9vbGVhbn0gdHJ1ZSBpZiBhY3Rpb24gd2FzIGZvdW5kIGFuZCB1bnJlZ2lzdGVyZWRcbiAqL1xuTWFwLnVucmVnaXN0ZXIgPSBmdW5jdGlvbihuYW1lLCBmKSB7XG4gICAgaWYgKHV0aWxzLmlzX2FycmF5KE1hcC5yZWdpc3RyeVtuYW1lXSkpIHtcbiAgICAgICAgdmFyIGluZGV4ID0gTWFwLnJlZ2lzdHJ5W25hbWVdLmluZGV4T2YoZik7XG4gICAgICAgIGlmIChpbmRleCAhPSAtMSkge1xuICAgICAgICAgICAgTWFwLnJlZ2lzdHJ5W25hbWVdLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoTWFwLnJlZ2lzdHJ5W25hbWVdID09IGYpIHtcbiAgICAgICAgZGVsZXRlIE1hcC5yZWdpc3RyeVtuYW1lXTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn07XG5cbi8qKlxuICogVW5yZWdpc3RlcnMgYWxsIG9mIHRoZSBhY3Rpb25zIHJlZ2lzdGVyZWQgd2l0aCBhIGdpdmVuIHRhZy5cbiAqIEBwYXJhbSAge09iamVjdH0gdGFnIC0gc3BlY2lmaWVkIGluIE1hcC5yZWdpc3Rlci5cbiAqIEByZXR1cm4ge2Jvb2xlYW59IHRydWUgaWYgdGhlIHRhZyB3YXMgZm91bmQgYW5kIGRlbGV0ZWQuXG4gKi9cbk1hcC51bnJlZ2lzdGVyX2J5X3RhZyA9IGZ1bmN0aW9uKHRhZykge1xuICAgIGlmIChNYXAuX3JlZ2lzdHJ5X3RhZ3NbdGFnXSkge1xuICAgICAgICBNYXAuX3JlZ2lzdHJ5X3RhZ3NbdGFnXS5mb3JFYWNoKGZ1bmN0aW9uKHJlZ2lzdHJhdGlvbikge1xuICAgICAgICAgICAgTWFwLnVucmVnaXN0ZXIocmVnaXN0cmF0aW9uLm5hbWUsIHJlZ2lzdHJhdGlvbi5mKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGRlbGV0ZSBNYXAuX3JlZ2lzdHJ5X3RhZ3NbdGFnXTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxufTtcblxuLyoqXG4gKiBBcHBlbmQgZXZlbnQgYWN0aW9ucyB0byB0aGUgbWFwLlxuICpcbiAqIFRoaXMgbWV0aG9kIGhhcyB0d28gc2lnbmF0dXJlcy4gIElmIGEgc2luZ2xlIGFyZ3VtZW50XG4gKiBpcyBwYXNzZWQgdG8gaXQsIHRoYXQgYXJndW1lbnQgaXMgdHJlYXRlZCBsaWtlIGFcbiAqIGRpY3Rpb25hcnkuICBJZiBtb3JlIHRoYW4gb25lIGFyZ3VtZW50IGlzIHBhc3NlZCB0byBpdCxcbiAqIGVhY2ggYXJndW1lbnQgaXMgdHJlYXRlZCBhcyBhbHRlcm5hdGluZyBrZXksIHZhbHVlXG4gKiBwYWlycyBvZiBhIGRpY3Rpb25hcnkuXG4gKlxuICogVGhlIG1hcCBhbGxvd3MgeW91IHRvIHJlZ2lzdGVyIGFjdGlvbnMgZm9yIGtleXMuXG4gKiBFeGFtcGxlOlxuICogICAgIG1hcC5hcHBlbmRfbWFwKHtcbiAqICAgICAgICAgJ2N0cmwtYSc6ICdjdXJzb3JzLnNlbGVjdF9hbGwnLFxuICogICAgIH0pXG4gKlxuICogTXVsdGlwbGUgYWN0aW9ucyBjYW4gYmUgcmVnaXN0ZXJlZCBmb3IgYSBzaW5nbGUgZXZlbnQuXG4gKiBUaGUgYWN0aW9ucyBhcmUgZXhlY3V0ZWQgc2VxdWVudGlhbGx5LCB1bnRpbCBvbmUgYWN0aW9uXG4gKiByZXR1cm5zIGB0cnVlYCBpbiB3aGljaCBjYXNlIHRoZSBleGVjdXRpb24gaGF1bHRzLiAgVGhpc1xuICogYWxsb3dzIGFjdGlvbnMgdG8gcnVuIGNvbmRpdGlvbmFsbHkuXG4gKiBFeGFtcGxlOlxuICogICAgIC8vIEltcGxlbWVudGluZyBhIGR1YWwgbW9kZSBlZGl0b3IsIHlvdSBtYXkgaGF2ZSB0d29cbiAqICAgICAvLyBmdW5jdGlvbnMgdG8gcmVnaXN0ZXIgZm9yIG9uZSBrZXkuIGkuZS46XG4gKiAgICAgdmFyIGRvX2EgPSBmdW5jdGlvbihlKSB7XG4gKiAgICAgICAgIGlmIChtb2RlPT0nZWRpdCcpIHtcbiAqICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdBJyk7XG4gKiAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAqICAgICAgICAgfVxuICogICAgIH1cbiAqICAgICB2YXIgZG9fYiA9IGZ1bmN0aW9uKGUpIHtcbiAqICAgICAgICAgaWYgKG1vZGU9PSdjb21tYW5kJykge1xuICogICAgICAgICAgICAgY29uc29sZS5sb2coJ0InKTtcbiAqICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICogICAgICAgICB9XG4gKiAgICAgfVxuICpcbiAqICAgICAvLyBUbyByZWdpc3RlciBib3RoIGZvciBvbmUga2V5XG4gKiAgICAgTWFwLnJlZ2lzdGVyKCdhY3Rpb25fYScsIGRvX2EpO1xuICogICAgIE1hcC5yZWdpc3RlcignYWN0aW9uX2InLCBkb19iKTtcbiAqICAgICBtYXAuYXBwZW5kX21hcCh7XG4gKiAgICAgICAgICdhbHQtdic6IFsnYWN0aW9uX2EnLCAnYWN0aW9uX2InXSxcbiAqICAgICB9KTtcbiAqIFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuTWFwLnByb3RvdHlwZS5hcHBlbmRfbWFwID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHZhciBwYXJzZWQgPSB0aGlzLl9wYXJzZV9tYXBfYXJndW1lbnRzKGFyZ3VtZW50cyk7XG4gICAgT2JqZWN0LmtleXMocGFyc2VkKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICBpZiAodGhhdC5fbWFwW2tleV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhhdC5fbWFwW2tleV0gPSBwYXJzZWRba2V5XTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoYXQuX21hcFtrZXldID0gdGhhdC5fbWFwW2tleV0uY29uY2F0KHBhcnNlZFtrZXldKTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuLyoqXG4gKiBBbGlhcyBmb3IgYGFwcGVuZF9tYXBgLlxuICogQHR5cGUge2Z1bmN0aW9ufVxuICovXG5NYXAucHJvdG90eXBlLm1hcCA9IE1hcC5wcm90b3R5cGUuYXBwZW5kX21hcDtcblxuLyoqXG4gKiBQcmVwZW5kIGV2ZW50IGFjdGlvbnMgdG8gdGhlIG1hcC5cbiAqXG4gKiBTZWUgdGhlIGRvYyBmb3IgYGFwcGVuZF9tYXBgIGZvciBhIGRldGFpbGVkIGRlc2NyaXB0aW9uIG9mXG4gKiBwb3NzaWJsZSBpbnB1dCB2YWx1ZXMuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5NYXAucHJvdG90eXBlLnByZXBlbmRfbWFwID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHZhciBwYXJzZWQgPSB0aGlzLl9wYXJzZV9tYXBfYXJndW1lbnRzKGFyZ3VtZW50cyk7XG4gICAgT2JqZWN0LmtleXMocGFyc2VkKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICBpZiAodGhhdC5fbWFwW2tleV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhhdC5fbWFwW2tleV0gPSBwYXJzZWRba2V5XTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoYXQuX21hcFtrZXldID0gcGFyc2VkW2tleV0uY29uY2F0KHRoYXQuX21hcFtrZXldKTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuLyoqXG4gKiBVbm1hcCBldmVudCBhY3Rpb25zIGluIHRoZSBtYXAuXG4gKlxuICogU2VlIHRoZSBkb2MgZm9yIGBhcHBlbmRfbWFwYCBmb3IgYSBkZXRhaWxlZCBkZXNjcmlwdGlvbiBvZlxuICogcG9zc2libGUgaW5wdXQgdmFsdWVzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuTWFwLnByb3RvdHlwZS51bm1hcCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB2YXIgcGFyc2VkID0gdGhpcy5fcGFyc2VfbWFwX2FyZ3VtZW50cyhhcmd1bWVudHMpO1xuICAgIE9iamVjdC5rZXlzKHBhcnNlZCkuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgaWYgKHRoYXQuX21hcFtrZXldICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHBhcnNlZFtrZXldLmZvckVhY2goZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICB2YXIgaW5kZXggPSB0aGF0Ll9tYXBba2V5XS5pbmRleE9mKHZhbHVlKTtcbiAgICAgICAgICAgICAgICBpZiAoaW5kZXggIT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5fbWFwW2tleV0uc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuLyoqXG4gKiBHZXQgYSBtb2RpZmlhYmxlIGFycmF5IG9mIHRoZSBhY3Rpb25zIGZvciBhIHBhcnRpY3VsYXIgZXZlbnQuXG4gKiBAcGFyYW0gIHtzdHJpbmd9IGV2ZW50XG4gKiBAcmV0dXJuIHthcnJheX0gYnkgcmVmIGNvcHkgb2YgdGhlIGFjdGlvbnMgcmVnaXN0ZXJlZCB0byBhbiBldmVudC5cbiAqL1xuTWFwLnByb3RvdHlwZS5nZXRfbWFwcGluZyA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgcmV0dXJuIHRoaXMuX21hcFt0aGlzLl9ub3JtYWxpemVfZXZlbnRfbmFtZShldmVudCldO1xufTtcblxuLyoqXG4gKiBQYXJzZSB0aGUgYXJndW1lbnRzIHRvIGEgbWFwIGZ1bmN0aW9uLlxuICogQHBhcmFtICB7YXJndW1lbnRzIGFycmF5fSBhcmdzXG4gKiBAcmV0dXJuIHtkaWN0aW9uYXJ5fSBwYXJzZWQgcmVzdWx0c1xuICovXG5NYXAucHJvdG90eXBlLl9wYXJzZV9tYXBfYXJndW1lbnRzID0gZnVuY3Rpb24oYXJncykge1xuICAgIHZhciBwYXJzZWQgPSB7fTtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG5cbiAgICAvLyBPbmUgYXJ1bWVudCwgdHJlYXQgaXQgYXMgYSBkaWN0aW9uYXJ5IG9mIGV2ZW50IG5hbWVzIGFuZFxuICAgIC8vIGFjdGlvbnMuXG4gICAgaWYgKGFyZ3MubGVuZ3RoID09IDEpIHtcbiAgICAgICAgT2JqZWN0LmtleXMoYXJnc1swXSkuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IGFyZ3NbMF1ba2V5XTtcbiAgICAgICAgICAgIHZhciBub3JtYWxpemVkX2tleSA9IHRoYXQuX25vcm1hbGl6ZV9ldmVudF9uYW1lKGtleSk7XG5cbiAgICAgICAgICAgIC8vIElmIHRoZSB2YWx1ZSBpcyBub3QgYW4gYXJyYXksIHdyYXAgaXQgaW4gb25lLlxuICAgICAgICAgICAgaWYgKCF1dGlscy5pc19hcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IFt2YWx1ZV07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIElmIHRoZSBrZXkgaXMgYWxyZWFkeSBkZWZpbmVkLCBjb25jYXQgdGhlIHZhbHVlcyB0b1xuICAgICAgICAgICAgLy8gaXQuICBPdGhlcndpc2UsIHNldCBpdC5cbiAgICAgICAgICAgIGlmIChwYXJzZWRbbm9ybWFsaXplZF9rZXldID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBwYXJzZWRbbm9ybWFsaXplZF9rZXldID0gdmFsdWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHBhcnNlZFtub3JtYWxpemVkX2tleV0gPSBwYXJzZWRbbm9ybWFsaXplZF9rZXldLmNvbmNhdCh2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgLy8gTW9yZSB0aGFuIG9uZSBhcmd1bWVudC4gIFRyZWF0IGFzIHRoZSBmb3JtYXQ6XG4gICAgLy8gZXZlbnRfbmFtZTEsIGFjdGlvbjEsIGV2ZW50X25hbWUyLCBhY3Rpb24yLCAuLi4sIGV2ZW50X25hbWVOLCBhY3Rpb25OXG4gICAgfSBlbHNlIHtcbiAgICAgICAgZm9yICh2YXIgaT0wOyBpPE1hdGguZmxvb3IoYXJncy5sZW5ndGgvMik7IGkrKykge1xuICAgICAgICAgICAgdmFyIGtleSA9IHRoYXQuX25vcm1hbGl6ZV9ldmVudF9uYW1lKGFyZ3NbMippXSk7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBhcmdzWzIqaSArIDFdO1xuICAgICAgICAgICAgaWYgKHBhcnNlZFtrZXldPT09dW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgcGFyc2VkW2tleV0gPSBbdmFsdWVdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwYXJzZWRba2V5XS5wdXNoKHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcGFyc2VkO1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIGEgbm9ybWFsaXplZCBldmVudC5cbiAqIEBwYXJhbSAge3N0cmluZ30gbmFtZSAtIG5hbWUgb2YgdGhlIGV2ZW50XG4gKiBAcGFyYW0gIHtFdmVudH0gZSAtIGJyb3dzZXIgRXZlbnQgb2JqZWN0XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5NYXAucHJvdG90eXBlLl9oYW5kbGVfZXZlbnQgPSBmdW5jdGlvbihuYW1lLCBlKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHZhciBub3JtYWxpemVkX2V2ZW50ID0gdGhpcy5fbm9ybWFsaXplX2V2ZW50X25hbWUobmFtZSk7XG4gICAgdmFyIGFjdGlvbnMgPSB0aGlzLl9tYXBbbm9ybWFsaXplZF9ldmVudF07XG5cbiAgICBpZiAoYWN0aW9ucykge1xuICAgICAgICBhY3Rpb25zLmZvckVhY2goZnVuY3Rpb24oYWN0aW9uKSB7XG4gICAgICAgICAgICB2YXIgYWN0aW9uX2NhbGxiYWNrcyA9IE1hcC5yZWdpc3RyeVthY3Rpb25dO1xuICAgICAgICAgICAgaWYgKGFjdGlvbl9jYWxsYmFja3MpIHtcbiAgICAgICAgICAgICAgICBpZiAodXRpbHMuaXNfYXJyYXkoYWN0aW9uX2NhbGxiYWNrcykpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJldHVybnMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgYWN0aW9uX2NhbGxiYWNrcy5mb3JFYWNoKGZ1bmN0aW9uKGFjdGlvbl9jYWxsYmFjaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJucy5hcHBlbmQoYWN0aW9uX2NhbGxiYWNrLmNhbGwodW5kZWZpbmVkLCBlKT09PXRydWUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBJZiBvbmUgb2YgdGhlIGFjdGlvbiBjYWxsYmFja3MgcmV0dXJuZWQgdHJ1ZSwgY2FuY2VsIGJ1YmJsaW5nLlxuICAgICAgICAgICAgICAgICAgICBpZiAocmV0dXJucy5zb21lKGZ1bmN0aW9uKHgpIHtyZXR1cm4geDt9KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXRpbHMuY2FuY2VsX2J1YmJsZShlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFjdGlvbl9jYWxsYmFja3MuY2FsbCh1bmRlZmluZWQsIGUpPT09dHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXRpbHMuY2FuY2VsX2J1YmJsZShlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufTtcblxuLyoqXG4gKiBBbHBoYWJldGljYWxseSBzb3J0cyBrZXlzIGluIGV2ZW50IG5hbWUsIHNvXG4gKiBAcGFyYW0gIHtzdHJpbmd9IG5hbWUgLSBldmVudCBuYW1lXG4gKiBAcmV0dXJuIHtzdHJpbmd9IG5vcm1hbGl6ZWQgZXZlbnQgbmFtZVxuICovXG5NYXAucHJvdG90eXBlLl9ub3JtYWxpemVfZXZlbnRfbmFtZSA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gbmFtZS50b0xvd2VyQ2FzZSgpLnRyaW0oKS5zcGxpdCgnLScpLnNvcnQoKS5qb2luKCctJyk7XG59O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLk1hcCA9IE1hcDtcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy5qcycpO1xuXG4vKipcbiAqIEV2ZW50IG5vcm1hbGl6ZXJcbiAqXG4gKiBMaXN0ZW5zIHRvIERPTSBldmVudHMgYW5kIGVtaXRzICdjbGVhbmVkJyB2ZXJzaW9ucyBvZiB0aG9zZSBldmVudHMuXG4gKi9cbnZhciBOb3JtYWxpemVyID0gZnVuY3Rpb24oKSB7XG4gICAgdXRpbHMuUG9zdGVyQ2xhc3MuY2FsbCh0aGlzKTtcbiAgICB0aGlzLl9lbF9ob29rcyA9IHt9O1xufTtcbnV0aWxzLmluaGVyaXQoTm9ybWFsaXplciwgdXRpbHMuUG9zdGVyQ2xhc3MpO1xuXG4vKipcbiAqIExpc3RlbiB0byB0aGUgZXZlbnRzIG9mIGFuIGVsZW1lbnQuXG4gKiBAcGFyYW0gIHtIVE1MRWxlbWVudH0gZWxcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbk5vcm1hbGl6ZXIucHJvdG90eXBlLmxpc3Rlbl90byA9IGZ1bmN0aW9uKGVsKSB7XG4gICAgdmFyIGhvb2tzID0gW107XG4gICAgaG9va3MucHVzaCh1dGlscy5ob29rKGVsLCAnb25rZXlwcmVzcycsIHRoaXMuX3Byb3h5KCdwcmVzcycsIHRoaXMuX2hhbmRsZV9rZXlwcmVzc19ldmVudCwgZWwpKSk7XG4gICAgaG9va3MucHVzaCh1dGlscy5ob29rKGVsLCAnb25rZXlkb3duJywgIHRoaXMuX3Byb3h5KCdkb3duJywgdGhpcy5faGFuZGxlX2tleWJvYXJkX2V2ZW50LCBlbCkpKTtcbiAgICBob29rcy5wdXNoKHV0aWxzLmhvb2soZWwsICdvbmtleXVwJywgIHRoaXMuX3Byb3h5KCd1cCcsIHRoaXMuX2hhbmRsZV9rZXlib2FyZF9ldmVudCwgZWwpKSk7XG4gICAgaG9va3MucHVzaCh1dGlscy5ob29rKGVsLCAnb25kYmxjbGljaycsICB0aGlzLl9wcm94eSgnZGJsY2xpY2snLCB0aGlzLl9oYW5kbGVfbW91c2VfZXZlbnQsIGVsKSkpO1xuICAgIGhvb2tzLnB1c2godXRpbHMuaG9vayhlbCwgJ29uY2xpY2snLCAgdGhpcy5fcHJveHkoJ2NsaWNrJywgdGhpcy5faGFuZGxlX21vdXNlX2V2ZW50LCBlbCkpKTtcbiAgICBob29rcy5wdXNoKHV0aWxzLmhvb2soZWwsICdvbm1vdXNlZG93bicsICB0aGlzLl9wcm94eSgnZG93bicsIHRoaXMuX2hhbmRsZV9tb3VzZV9ldmVudCwgZWwpKSk7XG4gICAgaG9va3MucHVzaCh1dGlscy5ob29rKGVsLCAnb25tb3VzZXVwJywgIHRoaXMuX3Byb3h5KCd1cCcsIHRoaXMuX2hhbmRsZV9tb3VzZV9ldmVudCwgZWwpKSk7XG4gICAgaG9va3MucHVzaCh1dGlscy5ob29rKGVsLCAnb25tb3VzZW1vdmUnLCAgdGhpcy5fcHJveHkoJ21vdmUnLCB0aGlzLl9oYW5kbGVfbW91c2Vtb3ZlX2V2ZW50LCBlbCkpKTtcbiAgICB0aGlzLl9lbF9ob29rc1tlbF0gPSBob29rcztcbn07XG5cbi8qKlxuICogU3RvcHMgbGlzdGVuaW5nIHRvIGFuIGVsZW1lbnQuXG4gKiBAcGFyYW0gIHtIVE1MRWxlbWVudH0gZWxcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbk5vcm1hbGl6ZXIucHJvdG90eXBlLnN0b3BfbGlzdGVuaW5nX3RvID0gZnVuY3Rpb24oZWwpIHtcbiAgICBpZiAodGhpcy5fZWxfaG9va3NbZWxdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5fZWxfaG9va3NbZWxdLmZvckVhY2goZnVuY3Rpb24oaG9vaykge1xuICAgICAgICAgICAgaG9vay51bmhvb2soKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGRlbGV0ZSB0aGlzLl9lbF9ob29rc1tlbF07XG4gICAgfVxufTtcblxuLyoqXG4gKiBIYW5kbGVzIHdoZW4gYSBtb3VzZSBldmVudCBvY2N1cnNcbiAqIEBwYXJhbSAge0hUTUxFbGVtZW50fSBlbFxuICogQHBhcmFtICB7RXZlbnR9IGVcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbk5vcm1hbGl6ZXIucHJvdG90eXBlLl9oYW5kbGVfbW91c2VfZXZlbnQgPSBmdW5jdGlvbihlbCwgZXZlbnRfbmFtZSwgZSkge1xuICAgIGUgPSBlIHx8IHdpbmRvdy5ldmVudDtcbiAgICB0aGlzLnRyaWdnZXIodGhpcy5fbW9kaWZpZXJfc3RyaW5nKGUpICsgJ21vdXNlJyArIGUuYnV0dG9uICsgJy0nICsgZXZlbnRfbmFtZSwgZSk7XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgd2hlbiBhIG1vdXNlIGV2ZW50IG9jY3Vyc1xuICogQHBhcmFtICB7SFRNTEVsZW1lbnR9IGVsXG4gKiBAcGFyYW0gIHtFdmVudH0gZVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuTm9ybWFsaXplci5wcm90b3R5cGUuX2hhbmRsZV9tb3VzZW1vdmVfZXZlbnQgPSBmdW5jdGlvbihlbCwgZXZlbnRfbmFtZSwgZSkge1xuICAgIGUgPSBlIHx8IHdpbmRvdy5ldmVudDtcbiAgICB0aGlzLnRyaWdnZXIodGhpcy5fbW9kaWZpZXJfc3RyaW5nKGUpICsgJ21vdXNlJyArICctJyArIGV2ZW50X25hbWUsIGUpO1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIHdoZW4gYSBrZXlib2FyZCBldmVudCBvY2N1cnNcbiAqIEBwYXJhbSAge0hUTUxFbGVtZW50fSBlbFxuICogQHBhcmFtICB7RXZlbnR9IGVcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbk5vcm1hbGl6ZXIucHJvdG90eXBlLl9oYW5kbGVfa2V5Ym9hcmRfZXZlbnQgPSBmdW5jdGlvbihlbCwgZXZlbnRfbmFtZSwgZSkge1xuICAgIGUgPSBlIHx8IHdpbmRvdy5ldmVudDtcbiAgICB2YXIga2V5bmFtZSA9IHRoaXMuX2xvb2t1cF9rZXljb2RlKGUua2V5Q29kZSk7XG4gICAgaWYgKGtleW5hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLnRyaWdnZXIodGhpcy5fbW9kaWZpZXJfc3RyaW5nKGUpICsga2V5bmFtZSArICctJyArIGV2ZW50X25hbWUsIGUpO1xuXG4gICAgICAgIGlmIChldmVudF9uYW1lPT0nZG93bicpIHsgICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMudHJpZ2dlcih0aGlzLl9tb2RpZmllcl9zdHJpbmcoZSkgKyBrZXluYW1lLCBlKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB0aGlzLnRyaWdnZXIodGhpcy5fbW9kaWZpZXJfc3RyaW5nKGUpICsgU3RyaW5nKGUua2V5Q29kZSkgKyAnLScgKyBldmVudF9uYW1lLCBlKTtcbiAgICB0aGlzLnRyaWdnZXIoJ2tleScgKyBldmVudF9uYW1lLCBlKTtcbn07XG5cbi8qKlxuICogSGFuZGxlcyB3aGVuIGEga2V5cHJlc3MgZXZlbnQgb2NjdXJzXG4gKiBAcGFyYW0gIHtIVE1MRWxlbWVudH0gZWxcbiAqIEBwYXJhbSAge0V2ZW50fSBlXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Ob3JtYWxpemVyLnByb3RvdHlwZS5faGFuZGxlX2tleXByZXNzX2V2ZW50ID0gZnVuY3Rpb24oZWwsIGV2ZW50X25hbWUsIGUpIHtcbiAgICB0aGlzLnRyaWdnZXIoJ2tleXByZXNzJywgZSk7XG59O1xuXG4vKipcbiAqIENyZWF0ZXMgYW4gZWxlbWVudCBldmVudCBwcm94eS5cbiAqIEBwYXJhbSAge2Z1bmN0aW9ufSBmXG4gKiBAcGFyYW0gIHtzdHJpbmd9IGV2ZW50X25hbWVcbiAqIEBwYXJhbSAge0hUTUxFbGVtZW50fSBlbFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuTm9ybWFsaXplci5wcm90b3R5cGUuX3Byb3h5ID0gZnVuY3Rpb24oZXZlbnRfbmFtZSwgZiwgZWwpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgYXJncyA9IFtlbCwgZXZlbnRfbmFtZV0uY29uY2F0KEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCkpO1xuICAgICAgICByZXR1cm4gZi5hcHBseSh0aGF0LCBhcmdzKTtcbiAgICB9O1xufTtcblxuLyoqXG4gKiBDcmVhdGUgYSBtb2RpZmllcnMgc3RyaW5nIGZyb20gYW4gZXZlbnQuXG4gKiBAcGFyYW0gIHtFdmVudH0gZVxuICogQHJldHVybiB7c3RyaW5nfSBkYXNoIHNlcGFyYXRlZCBtb2RpZmllciBzdHJpbmdcbiAqL1xuTm9ybWFsaXplci5wcm90b3R5cGUuX21vZGlmaWVyX3N0cmluZyA9IGZ1bmN0aW9uKGUpIHtcbiAgICB2YXIgbW9kaWZpZXJzID0gW107XG4gICAgaWYgKGUuY3RybEtleSkgbW9kaWZpZXJzLnB1c2goJ2N0cmwnKTtcbiAgICBpZiAoZS5hbHRLZXkpIG1vZGlmaWVycy5wdXNoKCdhbHQnKTtcbiAgICBpZiAoZS5tZXRhS2V5KSBtb2RpZmllcnMucHVzaCgnbWV0YScpO1xuICAgIGlmIChlLnNoaWZ0S2V5KSBtb2RpZmllcnMucHVzaCgnc2hpZnQnKTtcbiAgICB2YXIgc3RyaW5nID0gbW9kaWZpZXJzLnNvcnQoKS5qb2luKCctJyk7XG4gICAgaWYgKHN0cmluZy5sZW5ndGggPiAwKSBzdHJpbmcgPSBzdHJpbmcgKyAnLSc7XG4gICAgcmV0dXJuIHN0cmluZztcbn07XG5cbi8qKlxuICogTG9va3VwIHRoZSBodW1hbiBmcmllbmRseSBuYW1lIGZvciBhIGtleWNvZGUuXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBrZXljb2RlXG4gKiBAcmV0dXJuIHtzdHJpbmd9IGtleSBuYW1lXG4gKi9cbk5vcm1hbGl6ZXIucHJvdG90eXBlLl9sb29rdXBfa2V5Y29kZSA9IGZ1bmN0aW9uKGtleWNvZGUpIHtcbiAgICBpZiAoMTEyIDw9IGtleWNvZGUgJiYga2V5Y29kZSA8PSAxMjMpIHsgLy8gRjEtRjEyXG4gICAgICAgIHJldHVybiAnZicgKyAoa2V5Y29kZS0xMTEpO1xuICAgIH0gZWxzZSBpZiAoNDggPD0ga2V5Y29kZSAmJiBrZXljb2RlIDw9IDU3KSB7IC8vIDAtOVxuICAgICAgICByZXR1cm4gU3RyaW5nKGtleWNvZGUtNDgpO1xuICAgIH0gZWxzZSBpZiAoNjUgPD0ga2V5Y29kZSAmJiBrZXljb2RlIDw9IDkwKSB7IC8vIEEtWlxuICAgICAgICByZXR1cm4gJ2FiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6Jy5zdWJzdHJpbmcoU3RyaW5nKGtleWNvZGUtNjUpLCBTdHJpbmcoa2V5Y29kZS02NCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBjb2RlcyA9IHtcbiAgICAgICAgICAgIDg6ICdiYWNrc3BhY2UnLFxuICAgICAgICAgICAgOTogJ3RhYicsXG4gICAgICAgICAgICAxMzogJ2VudGVyJyxcbiAgICAgICAgICAgIDE2OiAnc2hpZnQnLFxuICAgICAgICAgICAgMTc6ICdjdHJsJyxcbiAgICAgICAgICAgIDE4OiAnYWx0JyxcbiAgICAgICAgICAgIDE5OiAncGF1c2UnLFxuICAgICAgICAgICAgMjA6ICdjYXBzbG9jaycsXG4gICAgICAgICAgICAyNzogJ2VzYycsXG4gICAgICAgICAgICAzMjogJ3NwYWNlJyxcbiAgICAgICAgICAgIDMzOiAncGFnZXVwJyxcbiAgICAgICAgICAgIDM0OiAncGFnZWRvd24nLFxuICAgICAgICAgICAgMzU6ICdlbmQnLFxuICAgICAgICAgICAgMzY6ICdob21lJyxcbiAgICAgICAgICAgIDM3OiAnbGVmdGFycm93JyxcbiAgICAgICAgICAgIDM4OiAndXBhcnJvdycsXG4gICAgICAgICAgICAzOTogJ3JpZ2h0YXJyb3cnLFxuICAgICAgICAgICAgNDA6ICdkb3duYXJyb3cnLFxuICAgICAgICAgICAgNDQ6ICdwcmludHNjcmVlbicsXG4gICAgICAgICAgICA0NTogJ2luc2VydCcsXG4gICAgICAgICAgICA0NjogJ2RlbGV0ZScsXG4gICAgICAgICAgICA5MTogJ3dpbmRvd3MnLFxuICAgICAgICAgICAgOTM6ICdtZW51JyxcbiAgICAgICAgICAgIDE0NDogJ251bWxvY2snLFxuICAgICAgICAgICAgMTQ1OiAnc2Nyb2xsbG9jaycsXG4gICAgICAgICAgICAxODg6ICdjb21tYScsXG4gICAgICAgICAgICAxOTA6ICdwZXJpb2QnLFxuICAgICAgICAgICAgMTkxOiAnZm93YXJkc2xhc2gnLFxuICAgICAgICAgICAgMTkyOiAndGlsZGUnLFxuICAgICAgICAgICAgMjE5OiAnbGVmdGJyYWNrZXQnLFxuICAgICAgICAgICAgMjIwOiAnYmFja3NsYXNoJyxcbiAgICAgICAgICAgIDIyMTogJ3JpZ2h0YnJhY2tldCcsXG4gICAgICAgICAgICAyMjI6ICdxdW90ZScsXG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBjb2Rlc1trZXljb2RlXTtcbiAgICB9IFxuICAgIC8vIFRPRE86IHRoaXMgZnVuY3Rpb24gaXMgbWlzc2luZyBzb21lIGJyb3dzZXIgc3BlY2lmaWNcbiAgICAvLyBrZXljb2RlIG1hcHBpbmdzLlxufTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5Ob3JtYWxpemVyID0gTm9ybWFsaXplcjtcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzLmpzJyk7XG5cbi8qKlxuICogTGlzdGVucyB0byBhIG1vZGVsIGFuZCBoaWdsaWdodHMgdGhlIHRleHQgYWNjb3JkaW5nbHkuXG4gKiBAcGFyYW0ge0RvY3VtZW50TW9kZWx9IG1vZGVsXG4gKi9cbnZhciBIaWdobGlnaHRlckJhc2UgPSBmdW5jdGlvbihtb2RlbCwgcm93X3JlbmRlcmVyKSB7XG4gICAgdXRpbHMuUG9zdGVyQ2xhc3MuY2FsbCh0aGlzKTtcbiAgICB0aGlzLl9tb2RlbCA9IG1vZGVsO1xuICAgIHRoaXMuX3Jvd19yZW5kZXJlciA9IHJvd19yZW5kZXJlcjtcbiAgICB0aGlzLl9xdWV1ZWQgPSBudWxsO1xuICAgIHRoaXMuZGVsYXkgPSAxMDA7IC8vbXNcblxuICAgIC8vIEJpbmQgZXZlbnRzLlxuICAgIHRoaXMuX3Jvd19yZW5kZXJlci5vbigncm93c19jaGFuZ2VkJywgdXRpbHMucHJveHkodGhpcy5faGFuZGxlX3Njcm9sbCwgdGhpcykpO1xuICAgIHRoaXMuX21vZGVsLm9uKCd0ZXh0X2NoYW5nZWQnLCB1dGlscy5wcm94eSh0aGlzLl9oYW5kbGVfdGV4dF9jaGFuZ2UsIHRoaXMpKTtcbiAgICB0aGlzLl9tb2RlbC5vbigncm93X2NoYW5nZWQnLCB1dGlscy5wcm94eSh0aGlzLl9oYW5kbGVfdGV4dF9jaGFuZ2UsIHRoaXMpKTtcbn07XG51dGlscy5pbmhlcml0KEhpZ2hsaWdodGVyQmFzZSwgdXRpbHMuUG9zdGVyQ2xhc3MpO1xuXG4vKipcbiAqIEhpZ2hsaWdodCB0aGUgZG9jdW1lbnRcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkhpZ2hsaWdodGVyQmFzZS5wcm90b3R5cGUuaGlnaGxpZ2h0ID0gZnVuY3Rpb24oc3RhcnRfcm93LCBlbmRfcm93KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdOb3QgaW1wbGVtZW50ZWQnKTtcbn07XG5cbi8qKlxuICogUXVldWVzIGEgaGlnaGxpZ2h0IG9wZXJhdGlvbi5cbiAqXG4gKiBJZiBhIGhpZ2hsaWdodCBvcGVyYXRpb24gaXMgYWxyZWFkeSBxdWV1ZWQsIGRvbid0IHF1ZXVlXG4gKiBhbm90aGVyIG9uZS4gIFRoaXMgZW5zdXJlcyB0aGF0IHRoZSBoaWdobGlnaHRpbmcgaXNcbiAqIGZyYW1lIHJhdGUgbG9ja2VkLiAgSGlnaGxpZ2h0aW5nIGlzIGFuIGV4cGVuc2l2ZSBvcGVyYXRpb24uXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5IaWdobGlnaHRlckJhc2UucHJvdG90eXBlLl9xdWV1ZV9oaWdobGlnaHRlciA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLl9xdWV1ZWQgPT09IG51bGwpIHtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICB0aGlzLl9xdWV1ZWQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhhdC5fbW9kZWwuYWNxdWlyZV90YWdfZXZlbnRfbG9jaygpO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB2YXIgdmlzaWJsZV9yb3dzID0gdGhhdC5fcm93X3JlbmRlcmVyLmdldF92aXNpYmxlX3Jvd3MoKTtcbiAgICAgICAgICAgICAgICB2YXIgdG9wX3JvdyA9IHZpc2libGVfcm93cy50b3Bfcm93O1xuICAgICAgICAgICAgICAgIHZhciBib3R0b21fcm93ID0gdmlzaWJsZV9yb3dzLmJvdHRvbV9yb3c7XG4gICAgICAgICAgICAgICAgdGhhdC5oaWdobGlnaHQodG9wX3JvdywgYm90dG9tX3Jvdyk7XG4gICAgICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgICAgIHRoYXQuX21vZGVsLnJlbGVhc2VfdGFnX2V2ZW50X2xvY2soKTtcbiAgICAgICAgICAgICAgICB0aGF0Ll9xdWV1ZWQgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0aGlzLmRlbGF5KTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgd2hlbiB0aGUgdmlzaWJsZSByb3cgaW5kaWNpZXMgYXJlIGNoYW5nZWQuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5IaWdobGlnaHRlckJhc2UucHJvdG90eXBlLl9oYW5kbGVfc2Nyb2xsID0gZnVuY3Rpb24oc3RhcnRfcm93LCBlbmRfcm93KSB7XG4gICAgdGhpcy5fcXVldWVfaGlnaGxpZ2h0ZXIoKTtcbn07XG5cbi8qKlxuICogSGFuZGxlcyB3aGVuIHRoZSB0ZXh0IGNoYW5nZXMuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5IaWdobGlnaHRlckJhc2UucHJvdG90eXBlLl9oYW5kbGVfdGV4dF9jaGFuZ2UgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9xdWV1ZV9oaWdobGlnaHRlcigpO1xufTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5IaWdobGlnaHRlckJhc2UgPSBIaWdobGlnaHRlckJhc2U7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy5qcycpO1xudmFyIGhpZ2hsaWdodGVyID0gcmVxdWlyZSgnLi9oaWdobGlnaHRlci5qcycpO1xudmFyIGxhbmd1YWdlcyA9IHJlcXVpcmUoJy4vc3ludGF4L2luaXQuanMnKTtcblxuLyoqXG4gKiBMaXN0ZW5zIHRvIGEgbW9kZWwgYW5kIGhpZ2hsaWdodHMgdGhlIHRleHQgYWNjb3JkaW5nbHkuXG4gKiBAcGFyYW0ge0RvY3VtZW50TW9kZWx9IG1vZGVsXG4gKi9cbnZhciBTeW50YXhIaWdobGlnaHRlciA9IGZ1bmN0aW9uKG1vZGVsLCByb3dfcmVuZGVyZXIpIHtcbiAgICBoaWdobGlnaHRlci5IaWdobGlnaHRlckJhc2UuY2FsbCh0aGlzLCBtb2RlbCwgcm93X3JlbmRlcmVyKTtcblxuICAgIC8vIExvb2sgYmFjayBhbmQgZm9yd2FyZCB0aGlzIG1hbnkgcm93cyBmb3IgY29udGV4dHVhbGx5IFxuICAgIC8vIHNlbnNpdGl2ZSBoaWdobGlnaHRpbmcuXG4gICAgdGhpcy5fcm93X3BhZGRpbmcgPSA1O1xuXG4gICAgdGhpcy5fZ3JvdXBzID0ge307XG4gICAgdGhpcy5fdG9wbGV2ZWxfZ3JvdXBzID0ge307IC8vIEFsbCBncm91cHMgd2l0aCBjb250YWluZWQgPT0gZmFsc2VcbiAgICB0aGlzLl90YWdzID0ge307XG59O1xudXRpbHMuaW5oZXJpdChTeW50YXhIaWdobGlnaHRlciwgaGlnaGxpZ2h0ZXIuSGlnaGxpZ2h0ZXJCYXNlKTtcblxuLyoqXG4gKiBIaWdobGlnaHQgdGhlIGRvY3VtZW50XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5TeW50YXhIaWdobGlnaHRlci5wcm90b3R5cGUuaGlnaGxpZ2h0ID0gZnVuY3Rpb24oc3RhcnRfcm93LCBlbmRfcm93KSB7XG4gICAgLy8gR2V0IHRoZSBmaXJzdCBhbmQgbGFzdCByb3dzIHRoYXQgc2hvdWxkIGJlIGhpZ2hsaWdodGVkLlxuICAgIHN0YXJ0X3JvdyA9IE1hdGgubWF4KDAsIHN0YXJ0X3JvdyAtIHRoaXMuX3Jvd19wYWRkaW5nKTtcbiAgICBlbmRfcm93ID0gTWF0aC5taW4odGhpcy5fbW9kZWwuX3Jvd3MubGVuZ3RoIC0gMSwgZW5kX3JvdyArIHRoaXMuX3Jvd19wYWRkaW5nKTtcblxuICAgIC8vIENsZWFyIHRoZSBvbGQgaGlnaGxpZ2h0aW5nLlxuICAgIHRoaXMuX21vZGVsLmNsZWFyX3RhZ3Moc3RhcnRfcm93LCBlbmRfcm93KTtcbiAgICBcbiAgICAvLyBHZXQgdGhlIHRleHQgb2YgdGhlIHJvd3MuXG4gICAgdmFyIHRleHQgPSB0aGlzLl9tb2RlbC5nZXRfdGV4dChzdGFydF9yb3csIDAsIGVuZF9yb3csIHRoaXMuX21vZGVsLl9yb3dzW2VuZF9yb3ddLmxlbmd0aCk7XG5cbiAgICAvLyBGaWd1cmUgb3V0IHdoZXJlIGVhY2ggZ3JvdXAgYmVsb25ncy5cbiAgICB2YXIgaGlnaGxpZ2h0cyA9IFtdOyAvLyBbc3RhcnRfaW5kZXgsIGVuZF9pbmRleCwgZ3JvdXBdXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIGZvciAodmFyIGdyb3VwX25hbWUgaW4gdGhpcy5fdG9wbGV2ZWxfZ3JvdXBzKSB7XG4gICAgICAgIGlmICh0aGlzLl90b3BsZXZlbF9ncm91cHMuaGFzT3duUHJvcGVydHkoZ3JvdXBfbmFtZSkpIHtcbiAgICAgICAgICAgIHZhciBncm91cCA9IHRoaXMuX3RvcGxldmVsX2dyb3Vwc1tncm91cF9uYW1lXTtcbiAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaTxncm91cC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGhpZ2hsaWdodHMgPSBoaWdobGlnaHRzLmNvbmNhdCh0aGF0Ll9maW5kX2hpZ2hsaWdodHModGV4dCwgZ3JvdXBfbmFtZSwgZ3JvdXBbaV0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIEFwcGx5IHRhZ3NcbiAgICBoaWdobGlnaHRzLmZvckVhY2goZnVuY3Rpb24oaGlnaGxpZ2h0KSB7XG5cbiAgICAgICAgLy8gVHJhbnNsYXRlIGdyb3VwIGNoYXJhY3RlciBpbmRpY2llcyB0byByb3csIGNoYXIgY29vcmRpbmF0ZXMuXG4gICAgICAgIHZhciBiZWZvcmVfcm93cyA9IHRleHQuc3Vic3RyaW5nKDAsIGhpZ2hsaWdodFswXSkuc3BsaXQoJ1xcbicpO1xuICAgICAgICB2YXIgZ3JvdXBfc3RhcnRfcm93ID0gc3RhcnRfcm93ICsgYmVmb3JlX3Jvd3MubGVuZ3RoIC0gMTtcbiAgICAgICAgdmFyIGdyb3VwX3N0YXJ0X2NoYXIgPSBiZWZvcmVfcm93c1tiZWZvcmVfcm93cy5sZW5ndGggLSAxXS5sZW5ndGg7XG4gICAgICAgIHZhciBhZnRlcl9yb3dzID0gdGV4dC5zdWJzdHJpbmcoMCwgaGlnaGxpZ2h0WzFdIC0gMSkuc3BsaXQoJ1xcbicpO1xuICAgICAgICB2YXIgZ3JvdXBfZW5kX3JvdyA9IHN0YXJ0X3JvdyArIGFmdGVyX3Jvd3MubGVuZ3RoIC0gMTtcbiAgICAgICAgdmFyIGdyb3VwX2VuZF9jaGFyID0gYWZ0ZXJfcm93c1thZnRlcl9yb3dzLmxlbmd0aCAtIDFdLmxlbmd0aDtcblxuICAgICAgICAvLyBHZXQgYXBwbGljYWJsZSB0YWcgbmFtZS5cbiAgICAgICAgdmFyIHRhZyA9IGhpZ2hsaWdodFsyXTtcbiAgICAgICAgd2hpbGUgKHRoYXQuX3RhZ3NbdGFnXSE9PXVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGFnID0gdGhhdC5fdGFnc1t0YWddO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQXBwbHkgdGFnLlxuICAgICAgICB0aGF0Ll9tb2RlbC5zZXRfdGFnKGdyb3VwX3N0YXJ0X3JvdywgZ3JvdXBfc3RhcnRfY2hhciwgZ3JvdXBfZW5kX3JvdywgZ3JvdXBfZW5kX2NoYXIsICdzeW50YXgnLCB0YWcudG9Mb3dlckNhc2UoKSk7XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIEZpbmQgZWFjaCBwYXJ0IG9mIHRleHQgdGhhdCBuZWVkcyB0byBiZSBoaWdobGlnaHRlZC5cbiAqIEBwYXJhbSAge3N0cmluZ30gdGV4dFxuICogQHBhcmFtICB7Z3JvdXAgZGljdGlvbmFyeX0gZ3JvdXAgLSBncm91cCB0byBsb29rIGZvciBpbiB0aGUgdGV4dC5cbiAqIEBwYXJhbSAge2Jvb2xlYW59IGF0X3N0YXJ0IC0gd2hldGhlciBvciBub3QgdG8gb25seSBjaGVjayB0aGUgc3RhcnQuXG4gKiBAcmV0dXJuIHthcnJheX0gbGlzdCBjb250YWluaW5nIGl0ZW1zIG9mIHRoZSBmb3JtIFtzdGFydF9pbmRleCwgZW5kX2luZGV4LCBncm91cF1cbiAqL1xuU3ludGF4SGlnaGxpZ2h0ZXIucHJvdG90eXBlLl9maW5kX2hpZ2hsaWdodHMgPSBmdW5jdGlvbih0ZXh0LCBncm91cF9uYW1lLCBncm91cCwgYXRfc3RhcnQpIHtcblxuICAgIC8vIEZpbmQgaW5zdGFuY2VzLiBbc3RhcnRfaW5kZXgsIGVuZF9pbmRleCwgZ3JvdXAsICgmIG9wdGlvbmFsbHkpIGlubmVyX2xlZnQsIGlubmVyX3JpZ2h0XVxuICAgIGZvdW5kX2dyb3VwcyA9IFtdO1xuICAgIHN3aXRjaCAoZ3JvdXAudHlwZSkge1xuICAgICAgICBjYXNlICdrZXl3b3JkJzpcbiAgICAgICAgICAgIGdyb3VwLmtleXdvcmRzLmZvckVhY2goZnVuY3Rpb24oa2V5d29yZCkge1xuICAgICAgICAgICAgICAgIHZhciBpbmRleDtcbiAgICAgICAgICAgICAgICB3aGlsZSAodGV4dC5pbmRleE9mKGtleXdvcmQsIGluZGV4KSAhPSAtMSkge1xuICAgICAgICAgICAgICAgICAgICBpbmRleCA9IHRleHQuaW5kZXhPZihrZXl3b3JkLCBpbmRleCk7XG4gICAgICAgICAgICAgICAgICAgIGZvdW5kX2dyb3Vwcy5wdXNoKFtpbmRleCwgaW5kZXggKyBrZXl3b3JkLmxlbmd0aCwgZ3JvdXBfbmFtZV0pO1xuICAgICAgICAgICAgICAgICAgICBpbmRleCsrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ21hdGNoJzpcbiAgICAgICAgICAgIHV0aWxzLmZpbmRhbGwodGV4dCwgZ3JvdXAucmVnZXgucmVnZXgsIGdyb3VwLnJlZ2V4LmZsYWdzKS5mb3JFYWNoKGZ1bmN0aW9uKGZvdW5kKSB7XG4gICAgICAgICAgICAgICAgZm91bmRfZ3JvdXBzLnB1c2goW2ZvdW5kWzBdLCBmb3VuZFsxXSArIGdyb3VwLnJlZ2V4LmRlbHRhLCBncm91cF9uYW1lXSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdyZWdpb24nOlxuICAgICAgICAgICAgdmFyIHN0YXJ0cyA9IHV0aWxzLmZpbmRhbGwodGV4dCwgZ3JvdXAuc3RhcnQucmVnZXgsIGdyb3VwLnN0YXJ0LmZsYWdzKTtcbiAgICAgICAgICAgIHZhciBza2lwcyA9IFtdO1xuICAgICAgICAgICAgaWYgKGdyb3VwLnNraXApIHtcbiAgICAgICAgICAgICAgICBza2lwcyA9IHV0aWxzLmZpbmRhbGwodGV4dCwgZ3JvdXAuc2tpcC5yZWdleCwgZ3JvdXAuc2tpcC5mbGFncyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgZW5kcyA9IHV0aWxzLmZpbmRhbGwodGV4dCwgZ3JvdXAuZW5kLnJlZ2V4LCBncm91cC5lbmQuZmxhZ3MpO1xuXG4gICAgICAgICAgICAvLyBSZW1vdmUgZW5kcyB0aGF0IGNvbnRhY3Qgc2tpcHMuXG4gICAgICAgICAgICBlbmRzID0gZW5kcy5maWx0ZXIoZnVuY3Rpb24oZW5kKSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBza2lwcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgc2tpcCA9IHNraXBzW2ldO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIShlbmRbMF0gPj0gc2tpcFsxXSArIGdyb3VwLnNraXAuZGVsdGEgfHwgZW5kWzFdIDwgc2tpcFswXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBGaW5kIG1hdGNoaW5nIGVuZHMgZm9yIHRoZSBzdGFydHMsIGJhY2t3YXJkcy4gIFRoaXMgYWxsb3dzIG5lc3RpbmcgXG4gICAgICAgICAgICAvLyB0byB3b3JrIHByb3Blcmx5LlxuICAgICAgICAgICAgc3RhcnRzLnJldmVyc2UoKTtcbiAgICAgICAgICAgIHN0YXJ0cy5mb3JFYWNoKGZ1bmN0aW9uKHN0YXJ0KSB7XG4gICAgICAgICAgICAgICAgdmFyIGZvdW5kID0gbnVsbDtcbiAgICAgICAgICAgICAgICB2YXIgZW5kO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZW5kcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBlbmQgPSBlbmRzW2ldO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZW5kWzBdID4gc3RhcnRbMV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvdW5kID0gaTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGZvdW5kICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIGVuZCA9IGVuZHMuc3BsaWNlKGZvdW5kLCAxKVswXTtcbiAgICAgICAgICAgICAgICAgICAgZm91bmRfZ3JvdXBzLnB1c2goW3N0YXJ0WzBdICsgZ3JvdXAuc3RhcnQuZGVsdGEsIGVuZFsxXSwgZ3JvdXBfbmFtZSwgc3RhcnRbMV0sIGVuZFswXSArIGdyb3VwLmVuZC5kZWx0YV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBVbi1yZXZlcnNlIHJlc3VsdHMuXG4gICAgICAgICAgICBmb3VuZF9ncm91cHMucmV2ZXJzZSgpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgLy8gSWYgYXQgc3RhcnQgaXMgc3BlY2lmaWVkLCBvbmx5IG1hdGNoIGlmIHRoZSBpbmRleCBpcyAwLlxuICAgIGlmIChhdF9zdGFydCkge1xuICAgICAgICBmb3VuZF9ncm91cHMgPSBmb3VuZF9ncm91cHMuZmlsdGVyKGZ1bmN0aW9uKGZvdW5kX2dyb3VwKSB7XG4gICAgICAgICAgICByZXR1cm4gZm91bmRfZ3JvdXBbMF0gPT09IDA7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEZpbmQgbmV4dHMgaWYgcmVxdWVzdGVkLiAgTWFrZSBzdXJlIHRvIHJlbW92ZSBzcGFjZSBpZiBza2lwc3BhY2UgaXMgcHJvdmlkZWQuXG4gICAgLy8gVE9ETy5cbiAgICBcbiAgICAvLyBGaW5kIGNvbnRhaW5lZCBpZiByZXF1ZXN0ZWQuXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHZhciBzdWJfZm91bmQgPSBbXTtcbiAgICBpZiAoZ3JvdXAuY29udGFpbnMgJiYgZ3JvdXAuY29udGFpbnMubGVuZ3RoID4gMCkge1xuICAgICAgICBmb3VuZF9ncm91cHMuZm9yRWFjaChmdW5jdGlvbihmb3VuZF9ncm91cCkge1xuICAgICAgICAgICAgdmFyIGxlZnQgPSBmb3VuZF9ncm91cFswXTtcbiAgICAgICAgICAgIHZhciByaWdodCA9IGZvdW5kX2dyb3VwWzFdO1xuICAgICAgICAgICAgaWYgKGdyb3VwLnR5cGU9PSdyZWdpb24nKSB7XG4gICAgICAgICAgICAgICAgbGVmdCA9IGZvdW5kX2dyb3VwWzNdO1xuICAgICAgICAgICAgICAgIHJpZ2h0ID0gZm91bmRfZ3JvdXBbNF07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdWJ0ZXh0ID0gdGV4dC5zdWJzdHJpbmcobGVmdCwgcmlnaHQpO1xuICAgICAgICAgICAgZ3JvdXAuY29udGFpbnMuZm9yRWFjaChmdW5jdGlvbihjb250YWluKSB7XG4gICAgICAgICAgICAgICAgdmFyIHN1Yl9ncm91cCA9IHRoYXQuX2dyb3Vwc1tjb250YWluXTtcbiAgICAgICAgICAgICAgICBpZiAoc3ViX2dyb3VwKSB7XG4gICAgICAgICAgICAgICAgICAgIHN1Yl9ncm91cC5mb3JFYWNoKGZ1bmN0aW9uKHN1Yl9ncm91cF9jaGlsZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5fZmluZF9oaWdobGlnaHRzKHN1YnRleHQsIGNvbnRhaW4sIHN1Yl9ncm91cF9jaGlsZCkuZm9yRWFjaChmdW5jdGlvbihmb3VuZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Yl9mb3VuZC5wdXNoKFtmb3VuZFswXSArIGxlZnQsIGZvdW5kWzFdICsgbGVmdCwgZm91bmRbMl1dKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBmb3VuZF9ncm91cHMuY29uY2F0KHN1Yl9mb3VuZCk7XG59O1xuXG4vKipcbiAqIExvYWRzIGEgc3ludGF4IGJ5IGxhbmd1YWdlIG5hbWUuXG4gKiBAcGFyYW0gIHtzdHJpbmcgb3IgZGljdGlvbmFyeX0gbGFuZ3VhZ2VcbiAqIEByZXR1cm4ge2Jvb2xlYW59IHN1Y2Nlc3NcbiAqL1xuU3ludGF4SGlnaGxpZ2h0ZXIucHJvdG90eXBlLmxvYWQgPSBmdW5jdGlvbihsYW5ndWFnZSkge1xuICAgIHRyeSB7XG5cbiAgICAgICAgLy8gVW5sb2FkIGN1cnJlbnQgbGFuZ3VhZ2VcbiAgICAgICAgdGhpcy5fZ3JvdXBzID0ge307XG4gICAgICAgIHRoaXMuX3RvcGxldmVsX2dyb3VwcyA9IHt9OyBcbiAgICAgICAgdGhpcy5fdGFncyA9IHt9O1xuXG4gICAgICAgIC8vIFNlZSBpZiB0aGUgbGFuZ3VhZ2UgaXMgYnVpbHQtaW5cbiAgICAgICAgaWYgKGxhbmd1YWdlcy5sYW5ndWFnZXNbbGFuZ3VhZ2VdKSB7XG4gICAgICAgICAgICBsYW5ndWFnZSA9IGxhbmd1YWdlcy5sYW5ndWFnZXNbbGFuZ3VhZ2VdLmxhbmd1YWdlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2dyb3VwcyA9IGxhbmd1YWdlLmdyb3VwcztcbiAgICAgICAgdGhpcy5fdGFncyA9IGxhbmd1YWdlLnRhZ3M7XG5cbiAgICAgICAgLy8gUHJvY2Vzc2VzaW5nIHRoYXQgbXVzdCBoYXBwZW4gYXQgbG9hZCB0aW1lLlxuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgIGZvciAodmFyIGdyb3VwX25hbWUgaW4gdGhpcy5fZ3JvdXBzKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5fZ3JvdXBzLmhhc093blByb3BlcnR5KGdyb3VwX25hbWUpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZ3JvdXBzW2dyb3VwX25hbWVdLmZvckVhY2goZnVuY3Rpb24oZ3JvdXApIHtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEZpbmQgYWxsIGdyb3VwcyB3aGVyZSBjb250YWluZWQgPT0gZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFncm91cC5jb250YWluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGF0Ll90b3BsZXZlbF9ncm91cHNbZ3JvdXBfbmFtZV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuX3RvcGxldmVsX2dyb3Vwc1tncm91cF9uYW1lXSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5fdG9wbGV2ZWxfZ3JvdXBzW2dyb3VwX25hbWVdLnB1c2goZ3JvdXApO1xuICAgICAgICAgICAgICAgICAgICB9ICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGxvYWRpbmcgbGFuZ3VhZ2UnLCBlKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn07XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuU3ludGF4SGlnaGxpZ2h0ZXIgPSBTeW50YXhIaWdobGlnaHRlcjtcbiIsImV4cG9ydHMubGFuZ3VhZ2VzID0ge1xuICAgIFwidmJcIjogcmVxdWlyZShcIi4vdmIuanNcIiksXG4gICAgXCJqYXZhc2NyaXB0XCI6IHJlcXVpcmUoXCIuL2phdmFzY3JpcHQuanNcIiksXG59O1xuIiwiLypcblN5bnRheCBmaWxlIGdlbmVyYXRlZCB1c2luZyBWSU0ncyBcImphdmFzY3JpcHQudmltXCIgZmlsZS5cblVzZSBwb3N0ZXIvdG9vbHMvaW1wb3J0X3ZpbS5weSB0byBpbXBvcnQgbW9yZSBzeW50YXggZmlsZXMgZnJvbSBWSU0uXG4qL1xuZXhwb3J0cy5sYW5ndWFnZSA9IHtcbiAgICBcImdyb3Vwc1wiOiB7XG4gICAgICAgIFwiamF2YVNjcmlwdFN0cmluZ1NcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwic3RhcnRcIjoge1xuICAgICAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IFwiJ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJmbGFnc1wiOiBcInNtZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkZWx0YVwiOiAwXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiamF2YVNjcmlwdFNwZWNpYWxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQGh0bWxQcmVwcm9jXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcImVuZFwiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwicmVnZXhcIjogXCInfCRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZmxhZ3NcIjogXCJzbWdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVsdGFcIjogMFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcInJlZ2lvblwiLCBcbiAgICAgICAgICAgICAgICBcInNraXBcIjoge1xuICAgICAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IFwiXFxcXFxcXFxcXFxcXFxcXHxcXFxcXFxcXCdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZmxhZ3NcIjogXCJzbWdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVsdGFcIjogMFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgXSwgXG4gICAgICAgIFwiamF2YVNjcmlwdFNwZWNpYWxDaGFyYWN0ZXJcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwicmVnZXhcIjoge1xuICAgICAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IFwiJ1xcXFxcXFxcLidcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZmxhZ3NcIjogXCJzbWdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVsdGFcIjogMFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5zXCI6IFtdLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwibWF0Y2hcIlxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0VHlwZVwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQXJyYXlcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQm9vbGVhblwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEYXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkZ1bmN0aW9uXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk51bWJlclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJPYmplY3RcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU3RyaW5nXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJlZ0V4cFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSwgXG4gICAgICAgIFwiamF2YVNjcmlwdEJvb2xlYW5cIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInRydWVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZmFsc2VcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sIFxuICAgICAgICBcImphdmFTY3JpcHRSZWdleHBTdHJpbmdcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwic3RhcnRcIjoge1xuICAgICAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IFwiL1teLypdXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImZsYWdzXCI6IFwic21nXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRlbHRhXCI6IC0xXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQGh0bWxQcmVwcm9jXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcImVuZFwiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwicmVnZXhcIjogXCIvW2dpbV17MCwyXFxcXH1cXFxccypbOy4sXFxcXClcXFxcXX1dXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImZsYWdzXCI6IFwic21nXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRlbHRhXCI6IC0xXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwicmVnaW9uXCIsIFxuICAgICAgICAgICAgICAgIFwic2tpcFwiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwicmVnZXhcIjogXCJcXFxcXFxcXFxcXFxcXFxcfFxcXFxcXFxcL1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJmbGFnc1wiOiBcInNtZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkZWx0YVwiOiAwXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0Q29tbWVudFNraXBcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwicmVnZXhcIjoge1xuICAgICAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IFwiXlsgXFxcXHRdKlxcXFwqKCR8WyBcXFxcdF0rKVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJmbGFnc1wiOiBcInNtZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkZWx0YVwiOiAwXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbnNcIjogW10sIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGwsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJtYXRjaFwiXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sIFxuICAgICAgICBcImphdmFTY3JpcHRTcGVjaWFsXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJyZWdleFwiOiBcIlxcXFxcXFxcXFxcXGRcXFxcZFxcXFxkfFxcXFxcXFxcLlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJmbGFnc1wiOiBcInNtZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkZWx0YVwiOiAwXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbnNcIjogW10sIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGwsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJtYXRjaFwiXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sIFxuICAgICAgICBcImphdmFTY3JpcHRTdHJpbmdEXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcInN0YXJ0XCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJyZWdleFwiOiBcIlxcXCJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZmxhZ3NcIjogXCJzbWdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVsdGFcIjogMFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbnNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcImphdmFTY3JpcHRTcGVjaWFsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkBodG1sUHJlcHJvY1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJlbmRcIjoge1xuICAgICAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IFwiXFxcInwkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImZsYWdzXCI6IFwic21nXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRlbHRhXCI6IDBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJyZWdpb25cIiwgXG4gICAgICAgICAgICAgICAgXCJza2lwXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJyZWdleFwiOiBcIlxcXFxcXFxcXFxcXFxcXFx8XFxcXFxcXFxcXFwiXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImZsYWdzXCI6IFwic21nXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRlbHRhXCI6IDBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIF0sIFxuICAgICAgICBcImphdmFTY3JpcHRDb25kaXRpb25hbFwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiaWZcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZWxzZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJzd2l0Y2hcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sIFxuICAgICAgICBcImphdmFTY3JpcHRJZGVudGlmaWVyXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJhcmd1bWVudHNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidGhpc1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YXJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwibGV0XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0TGFiZWxcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcImNhc2VcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVmYXVsdFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSwgXG4gICAgICAgIFwiamF2YVNjcmlwdExpbmVDb21tZW50XCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJyZWdleFwiOiBcIlxcXFwvXFxcXC8uKlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJmbGFnc1wiOiBcInNtZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkZWx0YVwiOiAwXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbnNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkBTcGVsbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJqYXZhU2NyaXB0Q29tbWVudFRvZG9cIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGwsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJtYXRjaFwiXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sIFxuICAgICAgICBcImphdmFTY3JpcHRSZXBlYXRcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIndoaWxlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImZvclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkb1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJpblwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSwgXG4gICAgICAgIFwiamF2YVNjcmlwdEJyYWNlc1wiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJyZWdleFwiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwicmVnZXhcIjogXCJbXFxcXHt9XFxcXFtcXFxcXV1cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZmxhZ3NcIjogXCJzbWdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVsdGFcIjogMFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5zXCI6IFtdLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwibWF0Y2hcIlxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0T3BlcmF0b3JcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIm5ld1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkZWxldGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiaW5zdGFuY2VvZlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ0eXBlb2ZcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sIFxuICAgICAgICBcImphdmFTY3JpcHRHbG9iYWxcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInNlbGZcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwid2luZG93XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInRvcFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJwYXJlbnRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sIFxuICAgICAgICBcImphdmFTY3JpcHRCcmFuY2hcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcImJyZWFrXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImNvbnRpbnVlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0Q29tbWVudFwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJzdGFydFwiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwicmVnZXhcIjogXCIvXFxcXCpcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZmxhZ3NcIjogXCJzbWdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVsdGFcIjogMFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbnNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkBTcGVsbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJqYXZhU2NyaXB0Q29tbWVudFRvZG9cIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwiZW5kXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJyZWdleFwiOiBcIlxcXFwqL1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJmbGFnc1wiOiBcInNtZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkZWx0YVwiOiAwXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwicmVnaW9uXCIsIFxuICAgICAgICAgICAgICAgIFwic2tpcFwiOiBudWxsXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sIFxuICAgICAgICBcImphdmFTY3JpcHRFeGNlcHRpb25cIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInRyeVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJjYXRjaFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJmaW5hbGx5XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInRocm93XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0TnVsbFwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwibnVsbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ1bmRlZmluZWRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sIFxuICAgICAgICBcImphdmFTY3JpcHRNZW1iZXJcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcImRvY3VtZW50XCIsIFxuICAgICAgICAgICAgICAgICAgICBcImV2ZW50XCIsIFxuICAgICAgICAgICAgICAgICAgICBcImxvY2F0aW9uXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0Q29tbWVudFRvZG9cIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlRPRE9cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRklYTUVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiWFhYXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlRCRFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IHRydWUsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0RnVuY3Rpb25cIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwicmVnZXhcIjoge1xuICAgICAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IFwiW15hLXpBLVowLTldZnVuY3Rpb25bXmEtekEtWjAtOV1cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZmxhZ3NcIjogXCJzbWdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVsdGFcIjogMFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5zXCI6IFtdLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwibWF0Y2hcIlxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiZnVuY3Rpb25cIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sIFxuICAgICAgICBcImphdmFTY3JpcHRGdW5jdGlvbkZvbGRcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwic3RhcnRcIjoge1xuICAgICAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IFwiW15hLXpBLVowLTldZnVuY3Rpb25bXmEtekEtWjAtOV0uKltefTtdJFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJmbGFnc1wiOiBcInNtZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkZWx0YVwiOiAwXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluc1wiOiBbXSwgXG4gICAgICAgICAgICAgICAgXCJlbmRcIjoge1xuICAgICAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IFwiXlxcXFx6MX0uKiRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZmxhZ3NcIjogXCJzbWdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVsdGFcIjogMFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcInJlZ2lvblwiLCBcbiAgICAgICAgICAgICAgICBcInNraXBcIjogbnVsbFxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0U3RhdGVtZW50XCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJyZXR1cm5cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwid2l0aFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSwgXG4gICAgICAgIFwiamF2YVNjcmlwdFBhcmVuc1wiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJyZWdleFwiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwicmVnZXhcIjogXCJbXFxcXChcXFxcKV1cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZmxhZ3NcIjogXCJzbWdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVsdGFcIjogMFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5zXCI6IFtdLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwibWF0Y2hcIlxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0TWVzc2FnZVwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiYWxlcnRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiY29uZmlybVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJwcm9tcHRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwic3RhdHVzXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0UmVzZXJ2ZWRcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcImFic3RyYWN0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcImJvb2xlYW5cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiYnl0ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJjaGFyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImNsYXNzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImNvbnN0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRlYnVnZ2VyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRvdWJsZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJlbnVtXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImV4cG9ydFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJleHRlbmRzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImZpbmFsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImZsb2F0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcImdvdG9cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiaW1wbGVtZW50c1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJpbXBvcnRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiaW50XCIsIFxuICAgICAgICAgICAgICAgICAgICBcImludGVyZmFjZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJsb25nXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIm5hdGl2ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJwYWNrYWdlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInByaXZhdGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwicHJvdGVjdGVkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInB1YmxpY1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJzaG9ydFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJzdGF0aWNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwic3VwZXJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwic3luY2hyb25pemVkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInRocm93c1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ0cmFuc2llbnRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidm9sYXRpbGVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sIFxuICAgICAgICBcImphdmFTY3JpcHROdW1iZXJcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwicmVnZXhcIjoge1xuICAgICAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IFwiLT9bXmEtekEtWjAtOV1cXFxcZCtMP1teYS16QS1aMC05XXwwW3hYXVswLTlhLWZBLUZdK1teYS16QS1aMC05XVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJmbGFnc1wiOiBcInNtZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkZWx0YVwiOiAwXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbnNcIjogW10sIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGwsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJtYXRjaFwiXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sIFxuICAgICAgICBcImphdmFTY3JpcHREZXByZWNhdGVkXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJlc2NhcGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidW5lc2NhcGVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICB9LCBcbiAgICBcInRhZ3NcIjoge1xuICAgICAgICBcImphdmFTY3JQYXJlbkVycm9yXCI6IFwiamF2YVNjcmlwdEVycm9yXCIsIFxuICAgICAgICBcImphdmFTY3JpcHRTdHJpbmdTXCI6IFwiU3RyaW5nXCIsIFxuICAgICAgICBcImphdmFTY3JpcHRDb25kaXRpb25hbFwiOiBcIkNvbmRpdGlvbmFsXCIsIFxuICAgICAgICBcImphdmFTY3JpcHRUeXBlXCI6IFwiVHlwZVwiLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0Qm9vbGVhblwiOiBcIkJvb2xlYW5cIiwgXG4gICAgICAgIFwiamF2YVNjcmlwdFJlZ2V4cFN0cmluZ1wiOiBcIlN0cmluZ1wiLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0TnVsbFwiOiBcIktleXdvcmRcIiwgXG4gICAgICAgIFwiamF2YVNjcmlwdFNwZWNpYWxcIjogXCJTcGVjaWFsXCIsIFxuICAgICAgICBcImphdmFTY3JpcHRTdHJpbmdEXCI6IFwiU3RyaW5nXCIsIFxuICAgICAgICBcImphdmFTY3JpcHRFcnJvclwiOiBcIkVycm9yXCIsIFxuICAgICAgICBcImphdmFTY3JpcHRJZGVudGlmaWVyXCI6IFwiSWRlbnRpZmllclwiLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0U3BlY2lhbENoYXJhY3RlclwiOiBcImphdmFTY3JpcHRTcGVjaWFsXCIsIFxuICAgICAgICBcImphdmFTY3JpcHRMYWJlbFwiOiBcIkxhYmVsXCIsIFxuICAgICAgICBcImphdmFTY3JpcHRMaW5lQ29tbWVudFwiOiBcIkNvbW1lbnRcIiwgXG4gICAgICAgIFwiamF2YVNjcmlwdFJlcGVhdFwiOiBcIlJlcGVhdFwiLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0QnJhY2VzXCI6IFwiRnVuY3Rpb25cIiwgXG4gICAgICAgIFwiamF2YVNjcmlwdE9wZXJhdG9yXCI6IFwiT3BlcmF0b3JcIiwgXG4gICAgICAgIFwiamF2YVNjcmlwdEdsb2JhbFwiOiBcIktleXdvcmRcIiwgXG4gICAgICAgIFwiamF2YVNjcmlwdEJyYW5jaFwiOiBcIkNvbmRpdGlvbmFsXCIsIFxuICAgICAgICBcImphdmFTY3JpcHRDb21tZW50XCI6IFwiQ29tbWVudFwiLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0Q2hhcmFjdGVyXCI6IFwiQ2hhcmFjdGVyXCIsIFxuICAgICAgICBcImphdmFTY3JpcHRFeGNlcHRpb25cIjogXCJFeGNlcHRpb25cIiwgXG4gICAgICAgIFwiamF2YVNjcmlwdE1lbWJlclwiOiBcIktleXdvcmRcIiwgXG4gICAgICAgIFwiamF2YVNjcmlwdENvbW1lbnRUb2RvXCI6IFwiVG9kb1wiLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0Q29uc3RhbnRcIjogXCJMYWJlbFwiLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0RGVidWdcIjogXCJEZWJ1Z1wiLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0RnVuY3Rpb25cIjogXCJGdW5jdGlvblwiLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0U3RhdGVtZW50XCI6IFwiU3RhdGVtZW50XCIsIFxuICAgICAgICBcImphdmFTY3JpcHRNZXNzYWdlXCI6IFwiS2V5d29yZFwiLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0UmVzZXJ2ZWRcIjogXCJLZXl3b3JkXCIsIFxuICAgICAgICBcImphdmFTY3JpcHROdW1iZXJcIjogXCJqYXZhU2NyaXB0VmFsdWVcIiwgXG4gICAgICAgIFwiamF2YVNjcmlwdERlcHJlY2F0ZWRcIjogXCJFeGNlcHRpb25cIlxuICAgIH1cbn07IiwiLypcblN5bnRheCBmaWxlIGdlbmVyYXRlZCB1c2luZyBWSU0ncyBcInZiLnZpbVwiIGZpbGUuXG5Vc2UgcG9zdGVyL3Rvb2xzL2ltcG9ydF92aW0ucHkgdG8gaW1wb3J0IG1vcmUgc3ludGF4IGZpbGVzIGZyb20gVklNLlxuKi9cbmV4cG9ydHMubGFuZ3VhZ2UgPSB7XG4gICAgXCJncm91cHNcIjoge1xuICAgICAgICBcInZiRnVuY3Rpb25cIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkFic1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJBcnJheVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJBc2NcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQXNjQlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJBc2NXXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkF0blwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJBdmdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQk9GXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNCb29sXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNCeXRlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQ0N1clwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDRGF0ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDRGJsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNJbnRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ0xuZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDU25nXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNTdHJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ1ZEYXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNWRXJyXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQ1ZhclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDYWxsQnlOYW1lXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNkZWNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ2hvb3NlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNoclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDaHJCXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNocldcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ29tbWFuZFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkNvc1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDb3VudFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDcmVhdGVPYmplY3RcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ3VyRGlyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkREQlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEYXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRhdGVBZGRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJEYXRlRGlmZlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEYXRlUGFydFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEYXRlU2VyaWFsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRhdGVWYWx1ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEYXlcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRGlyXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiRG9FdmVudHNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRU9GXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkVudmlyb25cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRXJyb3JcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRXhwXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkZWXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkZpbGVBdHRyXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiRmlsZURhdGVUaW1lXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkZpbGVMZW5cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRmlsdGVyRml4XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkZpeFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJGb3JtYXRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJGb3JtYXRDdXJyZW5jeVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJGb3JtYXREYXRlVGltZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJGb3JtYXROdW1iZXJcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJGb3JtYXRQZXJjZW50XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkZyZWVGaWxlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkdldEFsbFN0cmluZ3NcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiR2V0QXR0clwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkdldEF1dG9TZXJ2ZXJTZXR0aW5nc1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJHZXRPYmplY3RcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiR2V0U2V0dGluZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJIZXhcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJIb3VyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIklJZlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJJTUVTdGF0dXNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiSVBtdFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJJblN0clwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJJbnB1dFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJJbnB1dEJcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJJbnB1dEJveFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJJbnN0ckJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiSW50XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIklzQXJyYXlcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiSXNEYXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIklzRW1wdHlcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiSXNFcnJvclwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIklzTWlzc2luZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJJc051bGxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiSXNOdW1lcmljXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIklzT2JqZWN0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkpvaW5cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTEJvdW5kXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiTENhc2VcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTE9GXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkxUcmltXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkxlZnRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTGVmdEJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTGVuXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkxlbkJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTG9hZFBpY3R1cmVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJMb2FkUmVzRGF0YVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJMb2FkUmVzUGljdHVyZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJMb2FkUmVzU3RyaW5nXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkxvY1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJMb2dcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJNSVJSXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk1heFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJNaWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTWlkQlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJNaW5cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTWludXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk1vbnRoXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk1vbnRoTmFtZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIk1zZ0JveFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJOUFZcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTlBlclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJOb3dcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiT2N0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlBQbXRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUFZcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUGFydGl0aW9uXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlBtdFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlFCQ29sb3JcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUkdCXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJUcmltXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJhdGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUmVwbGFjZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSaWdodFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSaWdodEJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUm5kXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiUm91bmRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU0xOXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNZRFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTZWNvbmRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2Vla1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTZ25cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2hlbGxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2luXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNwYWNlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNwY1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlNwbGl0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNxclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTdERldlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTdERldlBcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU3RyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlN0ckNvbXBcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU3RyQ29udlwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlN0clJldmVyc2VcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU3RyaW5nXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlN1bVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTd2l0Y2hcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiVGFiXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlRhblwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJUaW1lXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiVGltZVNlcmlhbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJUaW1lVmFsdWVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiVGltZXJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiVHJpbVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJUeXBlTmFtZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJVQm91bmRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJVQ2FzZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJWYWxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiVmFyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlZhclBcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiVmFyVHlwZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJXZWVrZGF5XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIldlZWtkYXlOYW1lXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiWWVhclwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSwgXG4gICAgICAgIFwidmJOdW1iZXJcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwicmVnZXhcIjoge1xuICAgICAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IFwiW15hLXpBLVowLTldXFxcXGQrW15hLXpBLVowLTldXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImZsYWdzXCI6IFwic21nXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRlbHRhXCI6IDBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluc1wiOiBbXSwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbCwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcIm1hdGNoXCJcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwicmVnZXhcIjoge1xuICAgICAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IFwiW15hLXpBLVowLTldXFxcXGQrXFxcXC5cXFxcZCpbXmEtekEtWjAtOV1cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZmxhZ3NcIjogXCJzbWdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVsdGFcIjogMFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5zXCI6IFtdLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwibWF0Y2hcIlxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJyZWdleFwiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwicmVnZXhcIjogXCJcXFxcLlxcXFxkK1teYS16QS1aMC05XVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJmbGFnc1wiOiBcInNtZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkZWx0YVwiOiAwXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbnNcIjogW10sIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGwsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJtYXRjaFwiXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sIFxuICAgICAgICBcInZiU3RyaW5nXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcInN0YXJ0XCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJyZWdleFwiOiBcIlxcXCJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZmxhZ3NcIjogXCJzbWdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVsdGFcIjogMFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbnNcIjogW10sIFxuICAgICAgICAgICAgICAgIFwiZW5kXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJyZWdleFwiOiBcIlxcXCJ8JFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJmbGFnc1wiOiBcInNtZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkZWx0YVwiOiAwXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwicmVnaW9uXCIsIFxuICAgICAgICAgICAgICAgIFwic2tpcFwiOiBudWxsXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sIFxuICAgICAgICBcInZiQ29uc3RcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIk51bGxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTm90aGluZ1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSwgXG4gICAgICAgIFwidmJMaW5lTnVtYmVyXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJyZWdleFwiOiBcIl5cXFxcZCsoXFxcXHN8JClcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZmxhZ3NcIjogXCJzbWdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVsdGFcIjogMFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5zXCI6IFtdLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwibWF0Y2hcIlxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJ2YktleXdvcmRcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkFzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkJpbmFyeVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJCeVJlZlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJCeVZhbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEYXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkVtcHR5XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkVycm9yXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkZyaWVuZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJHZXRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJJbnB1dFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJJc1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJMZW5cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTG9ja1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJNZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJNaWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTmV3XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk5vdGhpbmdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTnVsbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJPblwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIk9wdGlvblwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJPcHRpb25hbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJQYXJhbUFycmF5XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlByaW50XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlByaXZhdGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUHJvcGVydHlcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJQdWJsaWNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUHVibGljTm90Q3JlYXRlYWJsZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJPbk5ld1Byb2Nlc3NTaW5nbGVVc2VcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJJblNhbWVQcm9jZXNzTXVsdGlVc2VcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiR2xvYmFsTXVsdGlVc2VcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUmVzdW1lXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNlZWtcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJTZXRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU3RhdGljXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlN0ZXBcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU3RyaW5nXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlRpbWVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiV2l0aEV2ZW50c1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSwgXG4gICAgICAgIFwidmJGbG9hdFwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJyZWdleFwiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwicmVnZXhcIjogXCJbLVxcXFwrXT9bXmEtekEtWjAtOV1cXFxcZCtbZUVdW1xcXFwtXFxcXCtdP1xcXFxkK1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJmbGFnc1wiOiBcInNtZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkZWx0YVwiOiAwXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbnNcIjogW10sIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGwsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJtYXRjaFwiXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJyZWdleFwiOiBcIlstXFxcXCtdP1teYS16QS1aMC05XVxcXFxkK1xcXFwuXFxcXGQqKFtlRV1bXFxcXC1cXFxcK10/XFxcXGQrKT9cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZmxhZ3NcIjogXCJzbWdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVsdGFcIjogMFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5zXCI6IFtdLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwibWF0Y2hcIlxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJyZWdleFwiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwicmVnZXhcIjogXCJbLVxcXFwrXT9bXmEtekEtWjAtOV1cXFxcLlxcXFxkKyhbZUVdW1xcXFwtXFxcXCtdP1xcXFxkKyk/XCIsIFxuICAgICAgICAgICAgICAgICAgICBcImZsYWdzXCI6IFwic21nXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRlbHRhXCI6IDBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluc1wiOiBbXSwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbCwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcIm1hdGNoXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSwgXG4gICAgICAgIFwidmJNZXRob2RzXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJBYm91dEJveFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJBY2NlcHRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQWN0aXZhdGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQWRkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkFkZEN1c3RvbVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJBZGRGaWxlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQWRkRnJvbUZpbGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQWRkRnJvbUd1aWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQWRkRnJvbVN0cmluZ1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkFkZEZyb21UZW1wbGF0ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJBZGRJdGVtXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkFkZE5ld1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJBZGRUb0FkZEluVG9vbGJhclwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkFkZFRvb2xib3hQcm9nSURcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQXBwZW5kXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkFwcGVuZEFwcGVuZENodW5rXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQXBwZW5kQ2h1bmtcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQXJyYW5nZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJBc3NlcnRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQXN5bmNSZWFkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkJhdGNoVXBkYXRlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQmVnaW5RdWVyeUVkaXRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQmVnaW5UcmFuc1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJCaW5kXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkJ1aWxkUGF0aFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkNhblByb3BlcnR5Q2hhbmdlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNhbmNlbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDYW5jZWxBc3luY1JlYWRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJDYW5jZWxCYXRjaFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDYW5jZWxVcGRhdGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ2FwdHVyZUltYWdlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNlbGxUZXh0XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQ2VsbFZhbHVlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNpcmNsZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDbGVhclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDbGVhckZpZWxkc1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDbGVhclNlbFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkNsZWFyU2VsQ29sc1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDbGVhclN0cnVjdHVyZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDbG9uZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDbG9zZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDbHNcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJDb2xDb250YWluaW5nXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNvbGxhcHNlQWxsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNvbHVtblNpemVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ29tbWl0VHJhbnNcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJDb21wYWN0RGF0YWJhc2VcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ29tcG9zZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDb25uZWN0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNvcHlcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ29weUZpbGVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJDb3B5Rm9sZGVyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNvcHlRdWVyeURlZlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDb3VudFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDcmVhdGVEYXRhYmFzZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkNyZWF0ZURyYWdJbWFnZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDcmVhdGVFbWJlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDcmVhdGVGaWVsZFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkNyZWF0ZUZvbGRlclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDcmVhdGVHcm91cFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDcmVhdGVJbmRleFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDcmVhdGVMaW5rXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQ3JlYXRlUHJlcGFyZWRTdGF0ZW1lbnRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ3JlYXRlUHJvcGVyeVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDcmVhdGVRdWVyeVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkNyZWF0ZVF1ZXJ5RGVmXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNyZWF0ZVJlbGF0aW9uXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNyZWF0ZVRhYmxlRGVmXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQ3JlYXRlVGV4dEZpbGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ3JlYXRlVG9vbFdpbmRvd1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDcmVhdGVVc2VyXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQ3JlYXRlV29ya3NwYWNlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkN1c3RvbWl6ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDdXRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRGVsZXRlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiRGVsZXRlQ29sdW1uTGFiZWxzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRlbGV0ZUNvbHVtbnNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRGVsZXRlRmlsZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkRlbGV0ZUZvbGRlclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEZWxldGVMaW5lc1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEZWxldGVSb3dMYWJlbHNcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJEZWxldGVSb3dzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRlc2VsZWN0QWxsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRlc2lnbmVyV2luZG93XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRvVmVyYlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEcmFnXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiRHJhd1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEcml2ZUV4aXN0c1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJFZGl0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkVkaXRDb3B5XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkVkaXRQYXN0ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJFbmREb2NcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJFbnN1cmVWaXNpYmxlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkVzdGFibGlzaENvbm5lY3Rpb25cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRXhlY3V0ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJFeGlzdHNcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJFeHBhbmRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRXhwb3J0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkV4cG9ydFJlcG9ydFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJFeHRyYWN0SWNvblwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJGZXRjaFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkZldGNoVmVyYnNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRmlsZUV4aXN0c1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJGaWxlc1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJGaWxsQ2FjaGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRmluZFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkZpbmRGaXJzdFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJGaW5kSXRlbVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJGaW5kTGFzdFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJGaW5kTmV4dFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJGaW5kUHJldmlvdXNcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJGb2xkZXJFeGlzdHNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRm9yd2FyZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJHZXRBYnNvbHV0ZVBhdGhOYW1lXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiR2V0QmFzZU5hbWVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiR2V0Qm9va21hcmtcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiR2V0Q2h1bmtcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiR2V0Q2xpcFN0cmluZ1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkdldERhdGFcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiR2V0RHJpdmVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiR2V0RHJpdmVOYW1lXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkdldEZpbGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiR2V0RmlsZU5hbWVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJHZXRGaXJzdFZpc2libGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiR2V0Rm9sZGVyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkdldEZvcm1hdFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJHZXRIZWFkZXJcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJHZXRMaW5lRnJvbUNoYXJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiR2V0TnVtVGlja3NcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiR2V0UGFyZW50Rm9sZGVyTmFtZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkdldFJvd3NcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiR2V0U2VsZWN0ZWRQYXJ0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkdldFNlbGVjdGlvblwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkdldFNwZWNpYWxGb2xkZXJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiR2V0VGVtcE5hbWVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiR2V0VGV4dFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkdldFZpc2libGVDb3VudFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJHb0JhY2tcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiR29Gb3J3YXJkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkhpZGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiSGl0VGVzdFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkhvbGRGaWVsZHNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiSWRsZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJJbXBvcnRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiSW5pdGlhbGl6ZUxhYmVsc1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJJbnNlcnRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJJbnNlcnRDb2x1bW5MYWJlbHNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiSW5zZXJ0Q29sdW1uc1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJJbnNlcnRGaWxlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiSW5zZXJ0TGluZXNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiSW5zZXJ0T2JqRGxnXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkluc2VydFJvd0xhYmVsc1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkluc2VydFJvd3NcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiSXRlbVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJLZXlzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIktpbGxEb2NcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTGF5b3V0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkxpbmVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTGluZXNcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJMaW5rRXhlY3V0ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJMaW5rUG9rZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJMaW5rUmVxdWVzdFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJMaW5rU2VuZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJMaXN0ZW5cIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJMb2FkRmlsZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJMb2FkUmVzRGF0YVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJMb2FkUmVzUGljdHVyZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJMb2FkUmVzU3RyaW5nXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiTG9nRXZlbnRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTWFrZUNvbXBpbGVGaWxlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk1ha2VDb21waWxlZEZpbGVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJNYWtlUmVwbGljYVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJNb3JlUmVzdWx0c1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJNb3ZlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk1vdmVEYXRhXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk1vdmVGaWxlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiTW92ZUZpcnN0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk1vdmVGb2xkZXJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTW92ZUxhc3RcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTW92ZU5leHRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJNb3ZlUHJldmlvdXNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTmF2aWdhdGVUb1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJOZXdQYWdlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk5ld1Bhc3N3b3JkXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiTmV4dFJlY29yZHNldFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJPTEVEcmFnXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk9uQWRkaW5zVXBkYXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk9uQ29ubmVjdGlvblwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIk9uRGlzY29ubmVjdGlvblwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJPblN0YXJ0dXBDb21wbGV0ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJPcGVuXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiT3BlbkFzVGV4dFN0cmVhbVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJPcGVuQ29ubmVjdGlvblwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJPcGVuRGF0YWJhc2VcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJPcGVuUXVlcnlEZWZcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiT3BlblJlY29yZHNldFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJPcGVuUmVzdWx0c2V0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk9wZW5VUkxcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJPdmVybGF5XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlBTZXRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUGFpbnRQaWN0dXJlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlBhc3RTcGVjaWFsRGxnXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlBhc3RlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiUGVla0RhdGFcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUGxheVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJQb2ludFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJQb3B1bGF0ZVBhcnRpYWxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUG9wdXBNZW51XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiUHJpbnRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUHJpbnRGb3JtXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlByaW50UmVwb3J0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlByb3BlcnR5Q2hhbmdlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJRdWl0XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiUmFpc2VcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUmFuZG9tRGF0YUZpbGxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUmFuZG9tRmlsbENvbHVtbnNcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJSYW5kb21GaWxsUm93c1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSZUZpbGxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUmVhZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSZWFkQWxsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJlYWRGcm9tRmlsZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlJlYWRMaW5lXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJlYWRQcm9wZXJ0eVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSZWJpbmRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUmVmcmVzaFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSZWZyZXNoTGlua1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlJlZ2lzdGVyRGF0YWJhc2VcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUmVsZWFzZUluc3RhbmNlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJlbG9hZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSZW1vdmVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJSZW1vdmVBZGRJbkZyb21Ub29sYmFyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJlbW92ZUFsbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSZW1vdmVJdGVtXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJlbmRlclwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlJlcGFpckRhdGFiYXNlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJlcGxhY2VMaW5lXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJlcGx5XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJlcGx5QWxsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJlcXVlcnlcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJSZXNldEN1c3RvbVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSZXNldEN1c3RvbUxhYmVsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJlc29sdmVOYW1lXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiUmVzdG9yZVRvb2xiYXJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUmVzeW5jXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJvbGxiYWNrXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJvbGxiYWNrVHJhbnNcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJSb3dCb29rbWFya1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSb3dDb250YWluaW5nXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJvd1RvcFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTYXZlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNhdmVBc1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlNhdmVGaWxlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNhdmVUb0ZpbGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2F2ZVRvT2xlMUZpbGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2F2ZVRvb2xiYXJcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJTY2FsZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTY2FsZVhcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2NhbGVZXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNjcm9sbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTZWxQcmludFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTZWxlY3RBbGxcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJTZWxlY3RQYXJ0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNlbmRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2VuZERhdGFcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2V0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNldEF1dG9TZXJ2ZXJTZXR0aW5nc1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlNldERhdGFcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2V0Rm9jdXNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2V0T3B0aW9uXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNldFNlbGVjdGlvblwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTZXRTaXplXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiU2V0VGV4dFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTZXRWaWV3cG9ydFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTaG93XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNob3dDb2xvclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTaG93Rm9udFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlNob3dIZWxwXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNob3dPcGVuXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNob3dQcmludGVyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNob3dTYXZlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiU2hvd1doYXRzVGhpc1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTaWduT2ZmXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNpZ25PblwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTaXplXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNraXBcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2tpcExpbmVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJTcGFuXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNwbGl0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNwbGl0Q29udGFpbmluZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTdGFydExhYmVsRWRpdFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlN0YXJ0TG9nZ2luZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTdG9wXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlN5bmNocm9uaXplXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlRhZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJUZXh0SGVpZ2h0XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiVGV4dFdpZHRoXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlRvRGVmYXVsdHNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiVHJhY2VcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiVHdpcHNUb0NoYXJ0UGFydFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlR5cGVCeUNoYXJ0VHlwZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJVUkxGb3JcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiVXBkYXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlVwZGF0ZUNvbnRyb2xzXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiVXBkYXRlUmVjb3JkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlVwZGF0ZVJvd1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJVcHRvXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlZhbGlkYXRlQ29udHJvbHNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiVmFsdWVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJXaGF0c1RoaXNNb2RlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIldyaXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIldyaXRlQmxhbmtMaW5lc1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJXcml0ZUxpbmVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJXcml0ZVByb3BlcnR5XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIldyaXRlVGVtcGxhdGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiWk9yZGVyXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwicmRvQ3JlYXRlRW52aXJvbm1lbnRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwicmRvUmVnaXN0ZXJEYXRhU291cmNlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJ2YlJlcGVhdFwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiRG9cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRm9yXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkZvckVhY2hcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTG9vcFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJOZXh0XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiU3RlcFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJUb1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJVbnRpbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJXZW5kXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIldoaWxlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJ2YkNvbW1lbnRcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwic3RhcnRcIjoge1xuICAgICAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IFwiKF58XFxcXHMpUkVNXFxcXHNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZmxhZ3NcIjogXCJzbWdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVsdGFcIjogMFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbnNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiVG9kb1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJlbmRcIjoge1xuICAgICAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IFwiJFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJmbGFnc1wiOiBcInNtZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkZWx0YVwiOiAwXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwicmVnaW9uXCIsIFxuICAgICAgICAgICAgICAgIFwic2tpcFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcInN0YXJ0XCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJyZWdleFwiOiBcIihefFxcXFxzKVxcXFwnXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImZsYWdzXCI6IFwic21nXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRlbHRhXCI6IDBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5zXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YlRvZG9cIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwiZW5kXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJyZWdleFwiOiBcIiRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZmxhZ3NcIjogXCJzbWdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVsdGFcIjogMFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcInJlZ2lvblwiLCBcbiAgICAgICAgICAgICAgICBcInNraXBcIjogbnVsbFxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJ2YkNvbmRpdGlvbmFsXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJJZlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJUaGVuXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkVsc2VJZlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJFbHNlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNlbGVjdFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDYXNlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJ2YkRlZmluZVwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiZGJCaWdJbnRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGJCaW5hcnlcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGJCb29sZWFuXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRiQnl0ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkYkNoYXJcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJkYkN1cnJlbmN5XCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRiRGF0ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkYkRlY2ltYWxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGJEb3VibGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGJGbG9hdFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcImRiR1VJRFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkYkludGVnZXJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGJMb25nXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRiTG9uZ0JpbmFyeVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkYk1lbW9cIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJkYk51bWVyaWNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGJTaW5nbGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGJUZXh0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRiVGltZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkYlRpbWVTdGFtcFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcImRiVmFyQmluYXJ5XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmIzRERLU2hhZG93XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiM0RGYWNlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiM0RIaWdobGlnaHRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmIzRExpZ2h0XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmIzRFNoYWRvd1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkFib3J0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiQWJvcnRSZXRyeUlnbm9yZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiQWN0aXZlQm9yZGVyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiQWN0aXZlVGl0bGVCYXJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJBbGlhc1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiQXBwbGljYXRpb25Nb2RhbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkFwcGxpY2F0aW9uV29ya3NwYWNlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJBcHBUYXNrTWFuYWdlclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkFwcFdpbmRvd3NcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJBcmNoaXZlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiQXJyYXlcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkJhY2tcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJCaW5hcnlDb21wYXJlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiQmxhY2tcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJCbHVlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiQm9vbGVhblwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiQnV0dG9uRmFjZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkJ1dHRvblNoYWRvd1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkJ1dHRvblRleHRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJCeXRlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJDYWxHcmVnXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiQ2FsSGlqcmlcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJDYW5jZWxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJDclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkNyaXRpY2FsXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJDckxmXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiQ3VycmVuY3lcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJDeWFuXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiRGF0YWJhc2VDb21wYXJlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJEYXRhT2JqZWN0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiRGF0ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkRlY2ltYWxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJEZWZhdWx0QnV0dG9uMVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiRGVmYXVsdEJ1dHRvbjJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJEZWZhdWx0QnV0dG9uM1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkRlZmF1bHRCdXR0b240XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJEZXNrdG9wXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiRGlyZWN0b3J5XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiRG91YmxlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiRW1wdHlcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJFcnJvclwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiRXhjbGFtYXRpb25cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJGaXJzdEZvdXJEYXlzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiRmlyc3RGdWxsV2Vla1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiRmlyc3RKYW4xXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiRm9ybUNvZGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJGb3JtQ29udHJvbE1lbnVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkZvcm1GZWVkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiRm9ybU1ESUZvcm1cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJGcmlkYXlcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJGcm9tVW5pY29kZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiR3JheVRleHRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJHcmVlblwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkhpZGRlblwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkhpZGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJIaWdobGlnaHRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkhpZ2hsaWdodFRleHRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJIaXJhZ2FuYVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2Yklnbm9yZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YklNRUFscGhhRGJsXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJJTUVBbHBoYVNuZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YklNRURpc2FibGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJJTUVIaXJhZ2FuYVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiSU1FS2F0YWthbmFEYmxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJJTUVLYXRha2FuYVNuZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YklNRU1vZGVBbHBoYVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiSU1FTW9kZUFscGhhRnVsbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YklNRU1vZGVEaXNhYmxlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJJTUVNb2RlSGFuZ3VsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiSU1FTW9kZUhhbmd1bEZ1bGxcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YklNRU1vZGVIaXJhZ2FuYVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YklNRU1vZGVLYXRha2FuYVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiSU1FTW9kZUthdGFrYW5hSGFsZlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YklNRU1vZGVOb0NvbnRyb2xcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YklNRU1vZGVPZmZcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJJTUVNb2RlT25cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJJTUVOb09wXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiSU1FT2ZmXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJJTUVPblwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkluYWN0aXZlQm9yZGVyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiSW5hY3RpdmVDYXB0aW9uVGV4dFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiSW5hY3RpdmVUaXRsZUJhclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkluZm9CYWNrZ3JvdW5kXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiSW5mb3JtYXRpb25cIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkluZm9UZXh0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiSW50ZWdlclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkthdGFrYW5hXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5MFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleTFcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleTJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXkzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5NFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleTVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXk2XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5N1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleThcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleTlcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlBXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5QWRkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5QlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleUJhY2tcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlDXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlDYW5jZWxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlDYXBpdGFsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5Q2xlYXJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlDb250cm9sXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlEXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5RGVjaW1hbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleURlbGV0ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleURpdmlkZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiS2V5RG93blwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleUVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlFbmRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlFc2NhcGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlFeGVjdXRlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlGXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5RjFcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlGMTBcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlGMTFcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlGMTJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlGMTNcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleUYxNFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleUYxNVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleUYxNlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleUYyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5RjNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlGNFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiS2V5RjVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlGNlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleUY3XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5RjhcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlGOVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleUdcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleUhcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlIZWxwXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5SG9tZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleUlcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlJbnNlcnRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleUpcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlLXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5TFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleUxCdXR0b25cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlMZWZ0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5TVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiS2V5TUJ1dHRvblwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleU1lbnVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlNdWx0aXBseVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleU5cIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleU51bWxvY2tcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlOdW1wYWQwXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5TnVtcGFkMVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiS2V5TnVtcGFkMlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleU51bXBhZDNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlOdW1wYWQ0XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlOdW1wYWQ1XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5TnVtcGFkNlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleU51bXBhZDdcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleU51bXBhZDhcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlOdW1wYWQ5XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5T1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleVBcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleVBhZ2VEb3duXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5UGFnZVVwXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5UGF1c2VcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlQcmludFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiS2V5UVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleVJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlSQnV0dG9uXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5UmV0dXJuXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5UmlnaHRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleVNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlTZWxlY3RcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlTZXBhcmF0b3JcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlTaGlmdFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiS2V5U25hcHNob3RcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlTcGFjZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleVN1YnRyYWN0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5VFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiS2V5VGFiXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5VVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleVVwXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5VlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleVdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlYXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlZXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5WlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkxmXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiTG9uZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2Ykxvd2VyQ2FzZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2Yk1hZ2VudGFcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2Yk1heGltaXplZEZvY3VzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiTWVudUJhclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2Yk1lbnVUZXh0XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJNaW5pbWl6ZWRGb2N1c1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2Yk1pbmltaXplZE5vRm9jdXNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJNb25kYXlcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2Yk1zZ0JveFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2Yk1zZ0JveEhlbHBCdXR0b25cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJNc2dCb3hSaWdodFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiTXNnQm94UnRsUmVhZGluZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2Yk1zZ0JveFNldEZvcmVncm91bmRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2Yk1zZ0JveFRleHRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJOYXJyb3dcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJOZXdMaW5lXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiTm9cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJOb3JtYWxcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2Yk5vcm1hbEZvY3VzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiTm9ybWFsTm9Gb2N1c1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2Yk51bGxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJOdWxsQ2hhclwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiTnVsbFN0cmluZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2Yk9iamVjdFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2Yk9iamVjdEVycm9yXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiT0tcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2Yk9LQ2FuY2VsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiT0tPbmx5XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiUHJvcGVyQ2FzZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YlF1ZXN0aW9uXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJSZWFkT25seVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YlJlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YlJldHJ5XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiUmV0cnlDYW5jZWxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJTYXR1cmRheVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiU2Nyb2xsQmFyc1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YlNpbmdsZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YlN0cmluZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YlN1bmRheVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YlN5c3RlbVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiU3lzdGVtTW9kYWxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJUYWJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJUZXh0Q29tcGFyZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YlRodXJzZGF5XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJUaXRsZUJhclRleHRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJUdWVzZGF5XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiVW5pY29kZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YlVwcGVyQ2FzZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiVXNlU3lzdGVtXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiVXNlU3lzdGVtRGF5T2ZXZWVrXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiVmFyaWFudFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiVmVydGljYWxUYWJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJWb2x1bWVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJXZWRuZXNkYXlcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJXaGl0ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YldpZGVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YldpbmRvd0JhY2tncm91bmRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJXaW5kb3dGcmFtZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YldpbmRvd1RleHRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YlllbGxvd1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2Ylllc1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2Ylllc05vXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiWWVzTm9DYW5jZWxcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sIFxuICAgICAgICBcInZiRXZlbnRzXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJBY2Nlc3NLZXlQcmVzc1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJBY3RpdmF0ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJBY3RpdmVSb3dDaGFuZ2VkXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQWZ0ZXJBZGRGaWxlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkFmdGVyQ2hhbmdlRmlsZU5hbWVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQWZ0ZXJDbG9zZUZpbGVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJBZnRlckNvbEVkaXRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQWZ0ZXJDb2xVcGRhdGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQWZ0ZXJEZWxldGVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJBZnRlckluc2VydFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJBZnRlckxhYmVsRWRpdFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJBZnRlclJlbW92ZUZpbGVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJBZnRlclVwZGF0ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJBZnRlcldyaXRlRmlsZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJBbWJpZW50Q2hhbmdlZFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkFwcGx5Q2hhbmdlc1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJBc3NvY2lhdGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQXN5bmNQcm9ncmVzc1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkFzeW5jUmVhZENvbXBsZXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkFzeW5jUmVhZFByb2dyZXNzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkF4aXNBY3RpdmF0ZWRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJBeGlzTGFiZWxBY3RpdmF0ZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQXhpc0xhYmVsU2VsZWN0ZWRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJBeGlzTGFiZWxVcGRhdGVkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkF4aXNTZWxlY3RlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJBeGlzVGl0bGVBY3RpdmF0ZWRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJBeGlzVGl0bGVTZWxlY3RlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJBeGlzVGl0bGVVcGRhdGVkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkF4aXNVcGRhdGVkXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQmVmb3JlQ2xpY2tcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQmVmb3JlQ29sRWRpdFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJCZWZvcmVDb2xVcGRhdGVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJCZWZvcmVDb25uZWN0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkJlZm9yZURlbGV0ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJCZWZvcmVJbnNlcnRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJCZWZvcmVMYWJlbEVkaXRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQmVmb3JlTG9hZEZpbGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQmVmb3JlVXBkYXRlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQmVnaW5SZXF1ZXN0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkJlZ2luVHJhbnNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQnV0dG9uQ2xpY2tcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJCdXR0b25Db21wbGV0ZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQnV0dG9uRHJvcERvd25cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQnV0dG9uR290Rm9jdXNcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJCdXR0b25Mb3N0Rm9jdXNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ2FsbGJhY2tLZXlEb3duXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNoYW5nZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDaGFuZ2VkXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQ2hhcnRBY3RpdmF0ZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ2hhcnRTZWxlY3RlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDaGFydFVwZGF0ZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ2xpY2tcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJDbG9zZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDbG9zZVF1ZXJ5XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNsb3NlVXBcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ29sRWRpdFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDb2xSZXNpemVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJDb2xsYXBzZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDb2x1bW5DbGlja1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDb21taXRUcmFuc1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDb21wYXJlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQ29uZmlnQ2hhZ2VDYW5jZWxsZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ29uZmlnQ2hhbmdlZFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkNvbmZpZ0NoYW5nZWRDYW5jZWxsZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ29ubmVjdFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDb25uZWN0aW9uUmVxdWVzdFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkN1cnJlbnRSZWNvcmRDaGFuZ2VkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRFQ29tbWFuZEFkZGVkXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiREVDb21tYW5kUHJvcGVydHlDaGFuZ2VkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRFQ29tbWFuZFJlbW92ZWRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJERUNvbm5lY3Rpb25BZGRlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJERUNvbm5lY3Rpb25Qcm9wZXJ0eUNoYW5nZWRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJERUNvbm5lY3Rpb25SZW1vdmVkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRhdGFBcnJpdmFsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRhdGFDaGFuZ2VkXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiRGF0YVVwZGF0ZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRGF0ZUNsaWNrZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRGJsQ2xpY2tcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRGVhY3RpdmF0ZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkRldk1vZGVDaGFuZ2VcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRGV2aWNlQXJyaXZhbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEZXZpY2VPdGhlckV2ZW50XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiRGV2aWNlUXVlcnlSZW1vdmVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRGV2aWNlUXVlcnlSZW1vdmVGYWlsZWRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJEZXZpY2VSZW1vdmVDb21wbGV0ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEZXZpY2VSZW1vdmVQZW5kaW5nXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiRGlzY29ubmVjdFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEaXNwbGF5Q2hhbmdlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEaXNzb2NpYXRlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiRG9HZXROZXdGaWxlTmFtZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEb25lXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRvbmVQYWludGluZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEb3duQ2xpY2tcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJEcmFnRHJvcFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEcmFnT3ZlclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEcm9wRG93blwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJFZGl0UHJvcGVydHlcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRWRpdFF1ZXJ5XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiRW5kUmVxdWVzdFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJFbnRlckNlbGxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRW50ZXJGb2N1c1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJFeGl0Rm9jdXNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRXhwYW5kXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiRm9udENoYW5nZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRm9vdG5vdGVBY3RpdmF0ZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRm9vdG5vdGVTZWxlY3RlZFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkZvb3Rub3RlVXBkYXRlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJGb3JtYXRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRm9ybWF0U2l6ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJHb3RGb2N1c1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkhlYWRDbGlja1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJIZWlnaHRDaGFuZ2VkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkhpZGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiSW5mb01lc3NhZ2VcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJJbmlQcm9wZXJ0aWVzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkluaXRQcm9wZXJ0aWVzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkluaXRpYWxpemVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJJdGVtQWN0aXZhdGVkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkl0ZW1BZGRlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJJdGVtQ2hlY2tcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiSXRlbUNsaWNrXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiSXRlbVJlbG9hZGVkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkl0ZW1SZW1vdmVkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkl0ZW1SZW5hbWVkXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiSXRlbVNlbGV0ZWN0ZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiS2V5RG93blwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJLZXlQcmVzc1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJLZXlVcFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJMZWF2ZUNlbGxcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJMZWdlbmRBY3RpdmF0ZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTGVnZW5kU2VsZWN0ZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTGVnZW5kVXBkYXRlZFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkxpbmtDbG9zZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJMaW5rRXJyb3JcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTGlua0V4ZWN1dGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTGlua05vdGlmeVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkxpbmtPcGVuXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkxvYWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTG9zdEZvY3VzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk1vdXNlRG93blwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJNb3VzZU1vdmVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJNb3VzZVVwXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk5vZGVDaGVja1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJOb2RlQ2xpY2tcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiT0xFQ29tcGxldGVEcmFnXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiT0xFRHJhZ0Ryb3BcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiT0xFRHJhZ092ZXJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiT0xFR2l2ZUZlZWRiYWNrXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk9MRVNldERhdGFcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJPTEVTdGFydERyYWdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiT2JqZWN0RXZlbnRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiT2JqZWN0TW92ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJPbkFkZE5ld1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIk9uQ29tbVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJQYWludFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJQYW5lbENsaWNrXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlBhbmVsRGJsQ2xpY2tcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUGF0aENoYW5nZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlBhdHRlcm5DaGFuZ2VcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUGxvdEFjdGl2YXRlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJQbG90U2VsZWN0ZWRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJQbG90VXBkYXRlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJQb2ludEFjdGl2YXRlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJQb2ludExhYmVsQWN0aXZhdGVkXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiUG9pbnRMYWJlbFNlbGVjdGVkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlBvaW50TGFiZWxVcGRhdGVkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlBvaW50U2VsZWN0ZWRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJQb2ludFVwZGF0ZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUG93ZXJRdWVyeVN1c3BlbmRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUG93ZXJSZXN1bWVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJQb3dlclN0YXR1c0NoYW5nZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUG93ZXJTdXNwZW5kXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlByb2Nlc3NUYWdcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJQcm9jZXNzaW5nVGltZW91dFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJRdWVyeUNoYW5nZUNvbmZpZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJRdWVyeUNsb3NlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiUXVlcnlDb21wbGV0ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJRdWVyeUNvbXBsZXRlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJRdWVyeVRpbWVvdXRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJRdWVyeVVubG9hZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSZWFkUHJvcGVydGllc1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSZXBlYXRlZENvbnRyb2xMb2FkZWRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJSZXBlYXRlZENvbnRyb2xVbmxvYWRlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSZXBvc2l0aW9uXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiUmVxdWVzdENoYW5nZUZpbGVOYW1lXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJlcXVlc3RXcml0ZUZpbGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUmVzaXplXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiUmVzdWx0c0NoYW5nZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUmV0YWluZWRQcm9qZWN0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJvbGxiYWNrVHJhbnNcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJSb3dDb2xDaGFuZ2VcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUm93Q3VycmVuY3lDaGFuZ2VcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUm93UmVzaXplXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiUm93U3RhdHVzQ2hhbmdlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTY3JvbGxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2VsQ2hhbmdlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNlbGVjdGlvbkNoYW5nZWRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJTZW5kQ29tcGxldGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2VuZFByb2dyZXNzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNlcmllc0FjdGl2YXRlZFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlNlcmllc1NlbGVjdGVkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNlcmllc1VwZGF0ZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2V0dGluZ0NoYW5nZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2hvd1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlNwbGl0Q2hhbmdlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlN0YXJ0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlN0YXRlQ2hhbmdlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTdGF0dXNVcGRhdGVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJTeXNDb2xvcnNDaGFuZ2VkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlRlcm1pbmF0ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJUaW1lQ2hhbmdlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJUaW1lclwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlRpdGxlQWN0aXZhdGVkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlRpdGxlU2VsZWN0ZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiVGl0bGVVcGRhdGVkXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiVW5ib3VuZEFkZERhdGFcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiVW5ib3VuZERlbGV0ZVJvd1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlVuYm91bmRHZXRSZWxhdGl2ZUJvb2ttYXJrXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlVuYm91bmRSZWFkRGF0YVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlVuYm91bmRXcml0ZURhdGFcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiVW5mb3JtYXRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiVW5sb2FkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlVwQ2xpY2tcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiVXBkYXRlZFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlVzZXJFdmVudFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJWYWxpZGF0ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJWYWxpZGF0aW9uRXJyb3JcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJWaXNpYmxlUmVjb3JkQ2hhbmdlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJXaWxsQXNzb2NpYXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIldpbGxDaGFuZ2VEYXRhXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiV2lsbERpc3NvY2lhdGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiV2lsbEV4ZWN1dGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiV2lsbFVwZGF0ZVJvd3NcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJXcml0ZVByb3BlcnRpZXNcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sIFxuICAgICAgICBcInZiU3RhdGVtZW50XCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJBbGlhc1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJBcHBBY3RpdmF0ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJBc1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJCYXNlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkJlZXBcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQmVnaW5cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ2FsbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDaERpclwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkNoRHJpdmVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ2xvc2VcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ29uc3RcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRGF0ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEZWNsYXJlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRlZkJvb2xcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRGVmQnl0ZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkRlZkN1clwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEZWZEYXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRlZkRibFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEZWZEZWNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRGVmSW50XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRlZkxuZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEZWZPYmpcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJEZWZTbmdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRGVmU3RyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRlZlZhclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEZWZ0eXBlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRlbGV0ZVNldHRpbmdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRGltXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRvXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiRWFjaFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJFbHNlSWZcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRW5kXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkVudW1cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRXJhc2VcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRXJyb3JcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRXZlbnRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRXhpdFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkV4cGxpY2l0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkZpbGVDb3B5XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkZvclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJGb3JFYWNoXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkZ1bmN0aW9uXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkdldFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJHb1N1YlwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkdvVG9cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiR29zdWJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiSW1wbGVtZW50c1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJLaWxsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkxTZXRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTGV0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkxpYlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJMaW5lSW5wdXRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJMb2FkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkxvY2tcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTG9vcFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJNaWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTWtEaXJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTmFtZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJOZXh0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk9uXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk9uRXJyb3JcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiT3BlblwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIk9wdGlvblwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJQcmVzZXJ2ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJQcml2YXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlByb3BlcnR5XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlB1YmxpY1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJQdXRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUlNldFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlJhaXNlRXZlbnRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUmFuZG9taXplXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJlRGltXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJlZGltXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJlbVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSZXNldFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSZXN1bWVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJSZXR1cm5cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUm1EaXJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2F2ZVBpY3R1cmVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2F2ZVNldHRpbmdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2Vla1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTZW5kS2V5c1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlNlbmRrZXlzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNldFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTZXRBdHRyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlN0YXRpY1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTdGVwXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlN0b3BcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU3ViXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlRpbWVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJUeXBlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlVubG9hZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJVbmxvY2tcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiVW50aWxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiV2VuZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJXaGlsZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJXaWR0aFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJXaXRoXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiV3JpdGVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sIFxuICAgICAgICBcInZiT3BlcmF0b3JcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkFkZHJlc3NPZlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJBbmRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQnlSZWZcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQnlWYWxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRXF2XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkltcFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJJblwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIklzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkxpa2VcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTW9kXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk5vdFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJPclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJUb1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJYb3JcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJyZWdleFwiOiBcIltcXFxcKFxcXFwpXFxcXCsuLFxcXFwtLypcXFxcPyZdXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImZsYWdzXCI6IFwic21nXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRlbHRhXCI6IDBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluc1wiOiBbXSwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbCwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcIm1hdGNoXCJcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwicmVnZXhcIjoge1xuICAgICAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IFwiWzw+XVxcXFw/P1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJmbGFnc1wiOiBcInNtZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkZWx0YVwiOiAwXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbnNcIjogW10sIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGwsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJtYXRjaFwiXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJyZWdleFwiOiBcIjw+XCIsIFxuICAgICAgICAgICAgICAgICAgICBcImZsYWdzXCI6IFwic21nXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRlbHRhXCI6IDBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluc1wiOiBbXSwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbCwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcIm1hdGNoXCJcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwicmVnZXhcIjoge1xuICAgICAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IFwiXFxcXHMrXyRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZmxhZ3NcIjogXCJzbWdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVsdGFcIjogMFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5zXCI6IFtdLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwibWF0Y2hcIlxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJ2YlR5cGVzXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJCb29sZWFuXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkJ5dGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ3VycmVuY3lcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRGF0ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEZWNpbWFsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRvdWJsZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJFbXB0eVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkludGVnZXJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTG9uZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJPYmplY3RcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2luZ2xlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlN0cmluZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJWYXJpYW50XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJ2YkJvb2xlYW5cIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlRydWVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRmFsc2VcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sIFxuICAgICAgICBcInZiVG9kb1wiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiVE9ET1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IHRydWUsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJ2YlR5cGVTcGVjaWZpZXJcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwicmVnZXhcIjoge1xuICAgICAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IFwiW2EtekEtWjAtOV1bXFxcXCQlJiEjXW1zXFxcXD9zMVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJmbGFnc1wiOiBcInNtZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkZWx0YVwiOiAwXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbnNcIjogW10sIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGwsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJtYXRjaFwiXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJyZWdleFwiOiBcIiNbYS16QS1aMC05XVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJmbGFnc1wiOiBcInNtZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkZWx0YVwiOiAtMVxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5zXCI6IFtdLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwibWF0Y2hcIlxuICAgICAgICAgICAgfVxuICAgICAgICBdXG4gICAgfSwgXG4gICAgXCJ0YWdzXCI6IHtcbiAgICAgICAgXCJ2YkZ1bmN0aW9uXCI6IFwiSWRlbnRpZmllclwiLCBcbiAgICAgICAgXCJ2Yk51bWJlclwiOiBcIk51bWJlclwiLCBcbiAgICAgICAgXCJ2YlN0cmluZ1wiOiBcIlN0cmluZ1wiLCBcbiAgICAgICAgXCJ2YkNvbnN0XCI6IFwiQ29uc3RhbnRcIiwgXG4gICAgICAgIFwidmJEZWZpbmVcIjogXCJDb25zdGFudFwiLCBcbiAgICAgICAgXCJ2YktleXdvcmRcIjogXCJTdGF0ZW1lbnRcIiwgXG4gICAgICAgIFwidmJGbG9hdFwiOiBcIkZsb2F0XCIsIFxuICAgICAgICBcInZiTWV0aG9kc1wiOiBcIlByZVByb2NcIiwgXG4gICAgICAgIFwidmJDb25kaXRpb25hbFwiOiBcIkNvbmRpdGlvbmFsXCIsIFxuICAgICAgICBcInZiQ29tbWVudFwiOiBcIkNvbW1lbnRcIiwgXG4gICAgICAgIFwidmJJZGVudGlmaWVyXCI6IFwiSWRlbnRpZmllclwiLCBcbiAgICAgICAgXCJ2YlJlcGVhdFwiOiBcIlJlcGVhdFwiLCBcbiAgICAgICAgXCJ2YkxpbmVOdW1iZXJcIjogXCJDb21tZW50XCIsIFxuICAgICAgICBcInZiRXZlbnRzXCI6IFwiU3BlY2lhbFwiLCBcbiAgICAgICAgXCJ2YlN0YXRlbWVudFwiOiBcIlN0YXRlbWVudFwiLCBcbiAgICAgICAgXCJ2YkVycm9yXCI6IFwiRXJyb3JcIiwgXG4gICAgICAgIFwidmJPcGVyYXRvclwiOiBcIk9wZXJhdG9yXCIsIFxuICAgICAgICBcInZiVHlwZXNcIjogXCJUeXBlXCIsIFxuICAgICAgICBcInZiQm9vbGVhblwiOiBcIkJvb2xlYW5cIiwgXG4gICAgICAgIFwidmJUb2RvXCI6IFwiVG9kb1wiLCBcbiAgICAgICAgXCJ2YlR5cGVTcGVjaWZpZXJcIjogXCJUeXBlXCJcbiAgICB9XG59OyIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzLmpzJyk7XG52YXIgcmVuZGVyZXIgPSByZXF1aXJlKCcuL3JlbmRlcmVyLmpzJyk7XG5cbi8qKlxuICogR3JvdXBzIG11bHRpcGxlIHJlbmRlcmVyc1xuICogQHBhcmFtIHthcnJheX0gcmVuZGVyZXJzIC0gYXJyYXkgb2YgcmVuZGVyZXJzXG4gKiBAcGFyYW0ge0NhbnZhc30gY2FudmFzXG4gKi9cbnZhciBCYXRjaFJlbmRlcmVyID0gZnVuY3Rpb24ocmVuZGVyZXJzLCBjYW52YXMpIHtcbiAgICByZW5kZXJlci5SZW5kZXJlckJhc2UuY2FsbCh0aGlzLCBjYW52YXMpO1xuICAgIHRoaXMuX3JlbmRlcmVycyA9IHJlbmRlcmVycztcblxuICAgIC8vIExpc3RlbiB0byB0aGUgbGF5ZXJzLCBpZiBvbmUgbGF5ZXIgY2hhbmdlcywgcmVjb21wb3NlXG4gICAgLy8gdGhlIGZ1bGwgaW1hZ2UgYnkgY29weWluZyB0aGVtIGFsbCBhZ2Fpbi5cbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdGhpcy5fcmVuZGVyZXJzLmZvckVhY2goZnVuY3Rpb24ocmVuZGVyZXIpIHtcbiAgICAgICAgcmVuZGVyZXIub24oJ2NoYW5nZWQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHRoYXQuX2NvcHlfcmVuZGVyZXJzKCk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIFxuICAgIC8vIENyZWF0ZSBwcm9wZXJ0aWVzLlxuICAgIHRoaXMucHJvcGVydHkoJ3dpZHRoJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Ll9jYW52YXMud2lkdGg7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC5fY2FudmFzLndpZHRoID0gdmFsdWU7XG4gICAgICAgIHRoYXQuX3JlbmRlcmVycy5mb3JFYWNoKGZ1bmN0aW9uKHJlbmRlcmVyKSB7XG4gICAgICAgICAgICByZW5kZXJlci53aWR0aCA9IHZhbHVlO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICB0aGlzLnByb3BlcnR5KCdoZWlnaHQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoYXQuX2NhbnZhcy5oZWlnaHQ7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC5fY2FudmFzLmhlaWdodCA9IHZhbHVlO1xuICAgICAgICB0aGF0Ll9yZW5kZXJlcnMuZm9yRWFjaChmdW5jdGlvbihyZW5kZXJlcikge1xuICAgICAgICAgICAgcmVuZGVyZXIuaGVpZ2h0ID0gdmFsdWU7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufTtcbnV0aWxzLmluaGVyaXQoQmF0Y2hSZW5kZXJlciwgcmVuZGVyZXIuUmVuZGVyZXJCYXNlKTtcblxuLyoqXG4gKiBSZW5kZXIgdG8gdGhlIGNhbnZhc1xuICogQHBhcmFtIHtkaWN0aW9uYXJ5fSAob3B0aW9uYWwpIHNjcm9sbCAtIEhvdyBtdWNoIHRoZSBjYW52YXMgd2FzIHNjcm9sbGVkLiAgVGhpc1xuICogICAgICAgICAgICAgICAgICAgICBpcyBhIGRpY3Rpb25hcnkgb2YgdGhlIGZvcm0ge3g6IGZsb2F0LCB5OiBmbG9hdH1cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkJhdGNoUmVuZGVyZXIucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKHNjcm9sbCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLl9yZW5kZXJlcnMuZm9yRWFjaChmdW5jdGlvbihyZW5kZXJlcikge1xuXG4gICAgICAgIC8vIEFwcGx5IHRoZSByZW5kZXJpbmcgY29vcmRpbmF0ZSB0cmFuc2Zvcm1zIG9mIHRoZSBwYXJlbnQuXG4gICAgICAgIGlmICghcmVuZGVyZXIub3B0aW9ucy5wYXJlbnRfaW5kZXBlbmRlbnQpIHtcbiAgICAgICAgICAgIHJlbmRlcmVyLl9jYW52YXMuX3R4ID0gdXRpbHMucHJveHkodGhhdC5fY2FudmFzLl90eCwgdGhhdC5fY2FudmFzKTtcbiAgICAgICAgICAgIHJlbmRlcmVyLl9jYW52YXMuX3R5ID0gdXRpbHMucHJveHkodGhhdC5fY2FudmFzLl90eSwgdGhhdC5fY2FudmFzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRlbGwgdGhlIHJlbmRlcmVyIHRvIHJlbmRlciBpdHNlbGYuXG4gICAgICAgIHJlbmRlcmVyLnJlbmRlcihzY3JvbGwpO1xuICAgIH0pO1xuXG4gICAgLy8gQ29weSB0aGUgcmVzdWx0cyB0byBzZWxmLlxuICAgIHRoaXMuX2NvcHlfcmVuZGVyZXJzKCk7XG59O1xuXG4vKipcbiAqIENvcGllcyBhbGwgdGhlIHJlbmRlcmVyIGxheWVycyB0byB0aGUgY2FudmFzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQmF0Y2hSZW5kZXJlci5wcm90b3R5cGUuX2NvcHlfcmVuZGVyZXJzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMuX2NhbnZhcy5jbGVhcigpO1xuICAgIHRoaXMuX3JlbmRlcmVycy5mb3JFYWNoKGZ1bmN0aW9uKHJlbmRlcmVyKSB7XG4gICAgICAgIHRoYXQuX2NvcHlfcmVuZGVyZXIocmVuZGVyZXIpO1xuICAgIH0pO1xufTtcblxuLyoqXG4gKiBDb3B5IGEgcmVuZGVyZXIgdG8gdGhlIGNhbnZhcy5cbiAqIEBwYXJhbSAge1JlbmRlcmVyQmFzZX0gcmVuZGVyZXJcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkJhdGNoUmVuZGVyZXIucHJvdG90eXBlLl9jb3B5X3JlbmRlcmVyID0gZnVuY3Rpb24ocmVuZGVyZXIpIHtcbiAgICB0aGlzLl9jYW52YXMuZHJhd19pbWFnZShcbiAgICAgICAgcmVuZGVyZXIuX2NhbnZhcywgXG4gICAgICAgIC10aGlzLl9jYW52YXMuX3R4KDApLCBcbiAgICAgICAgLXRoaXMuX2NhbnZhcy5fdHkoMCksIFxuICAgICAgICB0aGlzLl9jYW52YXMud2lkdGgsIFxuICAgICAgICB0aGlzLl9jYW52YXMuaGVpZ2h0KTtcbn07XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuQmF0Y2hSZW5kZXJlciA9IEJhdGNoUmVuZGVyZXI7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy5qcycpO1xudmFyIHJlbmRlcmVyID0gcmVxdWlyZSgnLi9yZW5kZXJlci5qcycpO1xuXG4vKipcbiAqIFJlbmRlcnMgdG8gYSBjYW52YXNcbiAqIEBwYXJhbSB7Q2FudmFzfSBkZWZhdWx0X2NhbnZhc1xuICovXG52YXIgQ29sb3JSZW5kZXJlciA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIENyZWF0ZSB3aXRoIHRoZSBvcHRpb24gJ3BhcmVudF9pbmRlcGVuZGVudCcgdG8gZGlzYWJsZVxuICAgIC8vIHBhcmVudCBjb29yZGluYXRlIHRyYW5zbGF0aW9ucyBmcm9tIGJlaW5nIGFwcGxpZWQgYnkgXG4gICAgLy8gYSBiYXRjaCByZW5kZXJlci5cbiAgICByZW5kZXJlci5SZW5kZXJlckJhc2UuY2FsbCh0aGlzLCB1bmRlZmluZWQsIHtwYXJlbnRfaW5kZXBlbmRlbnQ6IHRydWV9KTtcbiAgICB0aGlzLl9yZW5kZXJlZCA9IGZhbHNlO1xuICAgIFxuICAgIC8vIENyZWF0ZSBwcm9wZXJ0aWVzLlxuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLnByb3BlcnR5KCd3aWR0aCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC5fY2FudmFzLndpZHRoO1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQuX2NhbnZhcy53aWR0aCA9IHZhbHVlO1xuICAgICAgICB0aGF0Ll9yZW5kZXIoKTtcblxuICAgICAgICAvLyBUZWxsIHBhcmVudCBsYXllciB0aGlzIG9uZSBoYXMgY2hhbmdlZC5cbiAgICAgICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2VkJyk7XG4gICAgfSk7XG4gICAgdGhpcy5wcm9wZXJ0eSgnaGVpZ2h0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Ll9jYW52YXMuaGVpZ2h0O1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQuX2NhbnZhcy5oZWlnaHQgPSB2YWx1ZTtcbiAgICAgICAgdGhhdC5fcmVuZGVyKCk7XG5cbiAgICAgICAgLy8gVGVsbCBwYXJlbnQgbGF5ZXIgdGhpcyBvbmUgaGFzIGNoYW5nZWQuXG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpO1xuICAgIH0pO1xuICAgIHRoaXMucHJvcGVydHkoJ2NvbG9yJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Ll9jb2xvcjtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0Ll9jb2xvciA9IHZhbHVlO1xuICAgICAgICB0aGF0Ll9yZW5kZXIoKTtcblxuICAgICAgICAvLyBUZWxsIHBhcmVudCBsYXllciB0aGlzIG9uZSBoYXMgY2hhbmdlZC5cbiAgICAgICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2VkJyk7XG4gICAgfSk7XG59O1xudXRpbHMuaW5oZXJpdChDb2xvclJlbmRlcmVyLCByZW5kZXJlci5SZW5kZXJlckJhc2UpO1xuXG4vKipcbiAqIFJlbmRlciB0byB0aGUgY2FudmFzXG4gKiBAcGFyYW0ge2RpY3Rpb25hcnl9IChvcHRpb25hbCkgc2Nyb2xsIC0gSG93IG11Y2ggdGhlIGNhbnZhcyB3YXMgc2Nyb2xsZWQuICBUaGlzXG4gKiAgICAgICAgICAgICAgICAgICAgIGlzIGEgZGljdGlvbmFyeSBvZiB0aGUgZm9ybSB7eDogZmxvYXQsIHk6IGZsb2F0fVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ29sb3JSZW5kZXJlci5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24oc2Nyb2xsKSB7XG4gICAgaWYgKCF0aGlzLl9yZW5kZXJlZCkge1xuICAgICAgICB0aGlzLl9yZW5kZXIoKTtcbiAgICAgICAgdGhpcy5fcmVuZGVyZWQgPSB0cnVlO1xuICAgIH1cbn07XG5cbi8qKlxuICogUmVuZGVyIGEgZnJhbWUuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Db2xvclJlbmRlcmVyLnByb3RvdHlwZS5fcmVuZGVyID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fY2FudmFzLmNsZWFyKCk7XG4gICAgdGhpcy5fY2FudmFzLmRyYXdfcmVjdGFuZ2xlKDAsIDAsIHRoaXMuX2NhbnZhcy53aWR0aCwgdGhpcy5fY2FudmFzLmhlaWdodCwge2ZpbGxfY29sb3I6IHRoaXMuX2NvbG9yfSk7XG59O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLkNvbG9yUmVuZGVyZXIgPSBDb2xvclJlbmRlcmVyO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIGFuaW1hdG9yID0gcmVxdWlyZSgnLi4vYW5pbWF0b3IuanMnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzLmpzJyk7XG52YXIgcmVuZGVyZXIgPSByZXF1aXJlKCcuL3JlbmRlcmVyLmpzJyk7XG5cbi8qKlxuICogUmVuZGVyIGRvY3VtZW50IGN1cnNvcnNcbiAqXG4gKiBUT0RPOiBPbmx5IHJlbmRlciB2aXNpYmxlLlxuICovXG52YXIgQ3Vyc29yc1JlbmRlcmVyID0gZnVuY3Rpb24oY3Vyc29ycywgc3R5bGUsIHJvd19yZW5kZXJlciwgaGFzX2ZvY3VzKSB7XG4gICAgcmVuZGVyZXIuUmVuZGVyZXJCYXNlLmNhbGwodGhpcyk7XG4gICAgdGhpcy5zdHlsZSA9IHN0eWxlO1xuICAgIHRoaXMuX2hhc19mb2N1cyA9IGhhc19mb2N1cztcbiAgICB0aGlzLl9jdXJzb3JzID0gY3Vyc29ycztcbiAgICB0aGlzLl9nZXRfdmlzaWJsZV9yb3dzID0gdXRpbHMucHJveHkocm93X3JlbmRlcmVyLmdldF92aXNpYmxlX3Jvd3MsIHJvd19yZW5kZXJlcik7XG4gICAgdGhpcy5fZ2V0X3Jvd19oZWlnaHQgPSB1dGlscy5wcm94eShyb3dfcmVuZGVyZXIuZ2V0X3Jvd19oZWlnaHQsIHJvd19yZW5kZXJlcik7XG4gICAgdGhpcy5fZ2V0X3Jvd190b3AgPSB1dGlscy5wcm94eShyb3dfcmVuZGVyZXIuZ2V0X3Jvd190b3AsIHJvd19yZW5kZXJlcik7XG4gICAgdGhpcy5fbWVhc3VyZV9wYXJ0aWFsX3JvdyA9IHV0aWxzLnByb3h5KHJvd19yZW5kZXJlci5tZWFzdXJlX3BhcnRpYWxfcm93X3dpZHRoLCByb3dfcmVuZGVyZXIpO1xuICAgIHRoaXMuX2JsaW5rX2FuaW1hdG9yID0gbmV3IGFuaW1hdG9yLkFuaW1hdG9yKDEwMDApO1xuICAgIHRoaXMuX2ZwcyA9IDMwO1xuXG4gICAgLy8gU3RhcnQgdGhlIGN1cnNvciByZW5kZXJpbmcgY2xvY2suXG4gICAgdGhpcy5fcmVuZGVyX2Nsb2NrKCk7XG4gICAgdGhpcy5fbGFzdF9yZW5kZXJlZCA9IG51bGw7XG59O1xudXRpbHMuaW5oZXJpdChDdXJzb3JzUmVuZGVyZXIsIHJlbmRlcmVyLlJlbmRlcmVyQmFzZSk7XG5cbi8qKlxuICogUmVuZGVyIHRvIHRoZSBjYW52YXNcbiAqIE5vdGU6IFRoaXMgbWV0aG9kIGlzIGNhbGxlZCBvZnRlbiwgc28gaXQncyBpbXBvcnRhbnQgdGhhdCBpdCdzXG4gKiBvcHRpbWl6ZWQgZm9yIHNwZWVkLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29yc1JlbmRlcmVyLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBGcmFtZSBsaW1pdCB0aGUgcmVuZGVyaW5nLlxuICAgIGlmIChEYXRlLm5vdygpIC0gdGhpcy5fbGFzdF9yZW5kZXJlZCA8IDEwMDAvdGhpcy5fZnBzKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5fY2FudmFzLmNsZWFyKCk7XG5cbiAgICAvLyBPbmx5IHJlbmRlciBpZiB0aGUgY2FudmFzIGhhcyBmb2N1cy5cbiAgICBpZiAodGhpcy5faGFzX2ZvY3VzKCkpIHtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICB0aGlzLl9jdXJzb3JzLmN1cnNvcnMuZm9yRWFjaChmdW5jdGlvbihjdXJzb3IpIHtcbiAgICAgICAgICAgIC8vIEdldCB0aGUgdmlzaWJsZSByb3dzLlxuICAgICAgICAgICAgdmFyIHZpc2libGVfcm93cyA9IHRoYXQuX2dldF92aXNpYmxlX3Jvd3MoKTtcblxuICAgICAgICAgICAgLy8gSWYgYSBjdXJzb3IgZG9lc24ndCBoYXZlIGEgcG9zaXRpb24sIHJlbmRlciBpdCBhdCB0aGVcbiAgICAgICAgICAgIC8vIGJlZ2lubmluZyBvZiB0aGUgZG9jdW1lbnQuXG4gICAgICAgICAgICB2YXIgcm93X2luZGV4ID0gY3Vyc29yLnByaW1hcnlfcm93IHx8IDA7XG4gICAgICAgICAgICB2YXIgY2hhcl9pbmRleCA9IGN1cnNvci5wcmltYXJ5X2NoYXIgfHwgMDtcblxuICAgICAgICAgICAgLy8gQ2FsY3VsYXRlIG9wYWNpdHkgb2YgdGhlIGN1cnNvci4gIEJsaW5raW5nIGN1cnNvci5cbiAgICAgICAgICAgIHZhciBzaW4gPSBNYXRoLnNpbigyKk1hdGguUEkqdGhhdC5fYmxpbmtfYW5pbWF0b3IudGltZSgpKTtcbiAgICAgICAgICAgIHZhciBhbHBoYSA9IE1hdGgubWluKE1hdGgubWF4KHNpbiswLjUsIDApLCAxKTsgLy8gT2Zmc2V0LCB0cnVuY2F0ZWQgc2luZSB3YXZlLlxuXG4gICAgICAgICAgICAvLyBEcmF3IHRoZSBjdXJzb3IuXG4gICAgICAgICAgICBpZiAoYWxwaGEgPiAwKSB7XG4gICAgICAgICAgICAgICAgdmFyIGhlaWdodCA9IHRoYXQuX2dldF9yb3dfaGVpZ2h0KHJvd19pbmRleCk7XG4gICAgICAgICAgICAgICAgdmFyIG11bHRpcGxpZXIgPSB0aGF0LnN0eWxlLmN1cnNvcl9oZWlnaHQgfHwgMS4wO1xuICAgICAgICAgICAgICAgIHZhciBvZmZzZXQgPSAoaGVpZ2h0IC0gKG11bHRpcGxpZXIqaGVpZ2h0KSkgLyAyO1xuICAgICAgICAgICAgICAgIGhlaWdodCAqPSBtdWx0aXBsaWVyO1xuICAgICAgICAgICAgICAgIGlmICh2aXNpYmxlX3Jvd3MudG9wX3JvdyA8PSByb3dfaW5kZXggJiYgcm93X2luZGV4IDw9IHZpc2libGVfcm93cy5ib3R0b21fcm93KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQuX2NhbnZhcy5kcmF3X3JlY3RhbmdsZShcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoYXJfaW5kZXggPT09IDAgPyAwIDogdGhhdC5fbWVhc3VyZV9wYXJ0aWFsX3Jvdyhyb3dfaW5kZXgsIGNoYXJfaW5kZXgpLCBcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuX2dldF9yb3dfdG9wKHJvd19pbmRleCkgKyBvZmZzZXQsIFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5zdHlsZS5jdXJzb3Jfd2lkdGg9PT11bmRlZmluZWQgPyAxLjAgOiB0aGF0LnN0eWxlLmN1cnNvcl93aWR0aCwgXG4gICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQsIFxuICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGxfY29sb3I6IHRoYXQuc3R5bGUuY3Vyc29yIHx8ICdiYWNrJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbHBoYTogYWxwaGEsXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfSAgICBcbiAgICAgICAgICAgIH0gICBcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHRoaXMuX2xhc3RfcmVuZGVyZWQgPSBEYXRlLm5vdygpO1xufTtcblxuLyoqXG4gKiBDbG9jayBmb3IgcmVuZGVyaW5nIHRoZSBjdXJzb3IuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3JzUmVuZGVyZXIucHJvdG90eXBlLl9yZW5kZXJfY2xvY2sgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBJZiB0aGUgY2FudmFzIGlzIGZvY3VzZWQsIHJlZHJhdy5cbiAgICBpZiAodGhpcy5faGFzX2ZvY3VzKCkpIHtcbiAgICAgICAgdmFyIGZpcnN0X3JlbmRlciA9ICF0aGlzLl93YXNfZm9jdXNlZDtcbiAgICAgICAgdGhpcy5fd2FzX2ZvY3VzZWQgPSB0cnVlO1xuICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgICAgICAvLyBUZWxsIHBhcmVudCBsYXllciB0aGlzIG9uZSBoYXMgY2hhbmdlZC5cbiAgICAgICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2VkJyk7XG4gICAgICAgIGlmIChmaXJzdF9yZW5kZXIpIHRoaXMudHJpZ2dlcigndG9nZ2xlJyk7XG5cbiAgICAvLyBUaGUgY2FudmFzIGlzbid0IGZvY3VzZWQuICBJZiB0aGlzIGlzIHRoZSBmaXJzdCB0aW1lXG4gICAgLy8gaXQgaGFzbid0IGJlZW4gZm9jdXNlZCwgcmVuZGVyIGFnYWluIHdpdGhvdXQgdGhlIFxuICAgIC8vIGN1cnNvcnMuXG4gICAgfSBlbHNlIGlmICh0aGlzLl93YXNfZm9jdXNlZCkge1xuICAgICAgICB0aGlzLl93YXNfZm9jdXNlZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgICAgICAvLyBUZWxsIHBhcmVudCBsYXllciB0aGlzIG9uZSBoYXMgY2hhbmdlZC5cbiAgICAgICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2VkJyk7XG4gICAgICAgIHRoaXMudHJpZ2dlcigndG9nZ2xlJyk7XG4gICAgfVxuXG4gICAgLy8gVGltZXIuXG4gICAgc2V0VGltZW91dCh1dGlscy5wcm94eSh0aGlzLl9yZW5kZXJfY2xvY2ssIHRoaXMpLCAxMDAwIC8gdGhpcy5fZnBzKTtcbn07XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuQ3Vyc29yc1JlbmRlcmVyID0gQ3Vyc29yc1JlbmRlcmVyO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMuanMnKTtcbnZhciByb3cgPSByZXF1aXJlKCcuL3Jvdy5qcycpO1xuXG4vKipcbiAqIFJlbmRlciB0aGUgdGV4dCByb3dzIG9mIGEgRG9jdW1lbnRNb2RlbC5cbiAqIEBwYXJhbSB7RG9jdW1lbnRNb2RlbH0gbW9kZWwgaW5zdGFuY2VcbiAqL1xudmFyIEhpZ2hsaWdodGVkUm93UmVuZGVyZXIgPSBmdW5jdGlvbihtb2RlbCwgc2Nyb2xsaW5nX2NhbnZhcywgc3R5bGUsIGNvbmZpZykge1xuICAgIHJvdy5Sb3dSZW5kZXJlci5jYWxsKHRoaXMsIG1vZGVsLCBzY3JvbGxpbmdfY2FudmFzKTtcbiAgICB0aGlzLnN0eWxlID0gc3R5bGU7XG4gICAgdGhpcy5jb25maWcgPSBjb25maWc7XG59O1xudXRpbHMuaW5oZXJpdChIaWdobGlnaHRlZFJvd1JlbmRlcmVyLCByb3cuUm93UmVuZGVyZXIpO1xuXG4vKipcbiAqIFJlbmRlciBhIHNpbmdsZSByb3dcbiAqIEBwYXJhbSAge2ludGVnZXJ9IGluZGV4XG4gKiBAcGFyYW0gIHtmbG9hdH0geFxuICogQHBhcmFtICB7ZmxvYXR9IHlcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkhpZ2hsaWdodGVkUm93UmVuZGVyZXIucHJvdG90eXBlLl9yZW5kZXJfcm93ID0gZnVuY3Rpb24oaW5kZXgsIHggLHkpIHtcbiAgICBpZiAoaW5kZXggPCAwIHx8IHRoaXMuX21vZGVsLl9yb3dzLmxlbmd0aCA8PSBpbmRleCkgcmV0dXJuO1xuICAgIFxuICAgIHZhciBncm91cHMgPSB0aGlzLl9nZXRfZ3JvdXBzKGluZGV4KTtcbiAgICB2YXIgbGVmdCA9IHg7XG4gICAgZm9yICh2YXIgaT0wOyBpPGdyb3Vwcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgd2lkdGggPSB0aGlzLl90ZXh0X2NhbnZhcy5tZWFzdXJlX3RleHQoZ3JvdXBzW2ldLnRleHQsIGdyb3Vwc1tpXS5vcHRpb25zKTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy5oaWdobGlnaHRfZHJhdykge1xuICAgICAgICAgICAgdGhpcy5fdGV4dF9jYW52YXMuZHJhd19yZWN0YW5nbGUobGVmdCwgeSwgd2lkdGgsIHRoaXMuZ2V0X3Jvd19oZWlnaHQoaSksIHtcbiAgICAgICAgICAgICAgICBmaWxsX2NvbG9yOiB1dGlscy5yYW5kb21fY29sb3IoKSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fdGV4dF9jYW52YXMuZHJhd190ZXh0KGxlZnQsIHksIGdyb3Vwc1tpXS50ZXh0LCBncm91cHNbaV0ub3B0aW9ucyk7XG4gICAgICAgIGxlZnQgKz0gd2lkdGg7XG4gICAgfVxufTtcblxuLyoqXG4gKiBHZXQgcmVuZGVyIGdyb3VwcyBmb3IgYSByb3cuXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBpbmRleCBvZiB0aGUgcm93XG4gKiBAcmV0dXJuIHthcnJheX0gYXJyYXkgb2YgcmVuZGVyaW5ncywgZWFjaCByZW5kZXJpbmcgaXMgYW4gYXJyYXkgb2ZcbiAqICAgICAgICAgICAgICAgICB0aGUgZm9ybSB7b3B0aW9ucywgdGV4dH0uXG4gKi9cbkhpZ2hsaWdodGVkUm93UmVuZGVyZXIucHJvdG90eXBlLl9nZXRfZ3JvdXBzID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICBpZiAoaW5kZXggPCAwIHx8IHRoaXMuX21vZGVsLl9yb3dzLmxlbmd0aCA8PSBpbmRleCkgcmV0dXJuO1xuXG4gICAgdmFyIHJvd190ZXh0ID0gdGhpcy5fbW9kZWwuX3Jvd3NbaW5kZXhdO1xuICAgIHZhciBncm91cHMgPSBbXTtcbiAgICB2YXIgbGFzdF9zeW50YXggPSBudWxsO1xuICAgIHZhciBjaGFyX2luZGV4ID0gMDtcbiAgICB2YXIgc3RhcnQgPSAwO1xuICAgIGZvciAoY2hhcl9pbmRleDsgY2hhcl9pbmRleDxyb3dfdGV4dC5sZW5ndGg7IGNoYXJfaW5kZXgrKykge1xuICAgICAgICB2YXIgc3ludGF4ID0gdGhpcy5fbW9kZWwuZ2V0X3RhZ3MoaW5kZXgsIGNoYXJfaW5kZXgpLnN5bnRheDtcbiAgICAgICAgaWYgKCF0aGlzLl9jb21wYXJlX3N5bnRheChsYXN0X3N5bnRheCxzeW50YXgpKSB7XG4gICAgICAgICAgICBpZiAoY2hhcl9pbmRleCAhPT0gMCkge1xuICAgICAgICAgICAgICAgIGdyb3Vwcy5wdXNoKHtvcHRpb25zOiB0aGlzLl9nZXRfb3B0aW9ucyhsYXN0X3N5bnRheCksIHRleHQ6IHJvd190ZXh0LnN1YnN0cmluZyhzdGFydCwgY2hhcl9pbmRleCl9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxhc3Rfc3ludGF4ID0gc3ludGF4O1xuICAgICAgICAgICAgc3RhcnQgPSBjaGFyX2luZGV4O1xuICAgICAgICB9XG4gICAgfVxuICAgIGdyb3Vwcy5wdXNoKHtvcHRpb25zOiB0aGlzLl9nZXRfb3B0aW9ucyhsYXN0X3N5bnRheCksIHRleHQ6IHJvd190ZXh0LnN1YnN0cmluZyhzdGFydCl9KTtcblxuICAgIHJldHVybiBncm91cHM7XG59O1xuXG4vKipcbiAqIENyZWF0ZXMgYSBzdHlsZSBvcHRpb25zIGRpY3Rpb25hcnkgZnJvbSBhIHN5bnRheCB0YWcuXG4gKiBAcGFyYW0gIHtzdHJpbmd9IHN5bnRheFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuSGlnaGxpZ2h0ZWRSb3dSZW5kZXJlci5wcm90b3R5cGUuX2dldF9vcHRpb25zID0gZnVuY3Rpb24oc3ludGF4KSB7XG4gICAgdmFyIHJlbmRlcl9vcHRpb25zID0gdXRpbHMuc2hhbGxvd19jb3B5KHRoaXMuX2Jhc2Vfb3B0aW9ucyk7XG5cbiAgICBpZiAoc3ludGF4ICYmIHRoaXMuc3R5bGUgJiYgdGhpcy5zdHlsZVtzeW50YXhdKSB7XG4gICAgICAgIHJlbmRlcl9vcHRpb25zLmNvbG9yID0gdGhpcy5zdHlsZVtzeW50YXhdO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJlbmRlcl9vcHRpb25zLmNvbG9yID0gdGhpcy5zdHlsZS50ZXh0IHx8ICdibGFjayc7XG4gICAgfVxuICAgIFxuICAgIHJldHVybiByZW5kZXJfb3B0aW9ucztcbn07XG5cbi8qKlxuICogQ29tcGFyZSB0d28gc3ludGF4cy5cbiAqIEBwYXJhbSAge3N0cmluZ30gYSAtIHN5bnRheFxuICogQHBhcmFtICB7c3RyaW5nfSBiIC0gc3ludGF4XG4gKiBAcmV0dXJuIHtib29sfSB0cnVlIGlmIGEgYW5kIGIgYXJlIGVxdWFsXG4gKi9cbkhpZ2hsaWdodGVkUm93UmVuZGVyZXIucHJvdG90eXBlLl9jb21wYXJlX3N5bnRheCA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgICByZXR1cm4gYSA9PT0gYjtcbn07XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuSGlnaGxpZ2h0ZWRSb3dSZW5kZXJlciA9IEhpZ2hsaWdodGVkUm93UmVuZGVyZXI7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgY2FudmFzID0gcmVxdWlyZSgnLi4vY2FudmFzLmpzJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy5qcycpO1xuXG4vKipcbiAqIFJlbmRlcnMgdG8gYSBjYW52YXNcbiAqIEBwYXJhbSB7Q2FudmFzfSBkZWZhdWx0X2NhbnZhc1xuICovXG52YXIgUmVuZGVyZXJCYXNlID0gZnVuY3Rpb24oZGVmYXVsdF9jYW52YXMsIG9wdGlvbnMpIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgdGhpcy5fY2FudmFzID0gZGVmYXVsdF9jYW52YXMgPyBkZWZhdWx0X2NhbnZhcyA6IG5ldyBjYW52YXMuQ2FudmFzKCk7XG4gICAgXG4gICAgLy8gQ3JlYXRlIHByb3BlcnRpZXMuXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMucHJvcGVydHkoJ3dpZHRoJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Ll9jYW52YXMud2lkdGg7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC5fY2FudmFzLndpZHRoID0gdmFsdWU7XG4gICAgfSk7XG4gICAgdGhpcy5wcm9wZXJ0eSgnaGVpZ2h0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Ll9jYW52YXMuaGVpZ2h0O1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQuX2NhbnZhcy5oZWlnaHQgPSB2YWx1ZTtcbiAgICB9KTtcbn07XG51dGlscy5pbmhlcml0KFJlbmRlcmVyQmFzZSwgdXRpbHMuUG9zdGVyQ2xhc3MpO1xuXG4vKipcbiAqIFJlbmRlciB0byB0aGUgY2FudmFzXG4gKiBAcGFyYW0ge2RpY3Rpb25hcnl9IChvcHRpb25hbCkgc2Nyb2xsIC0gSG93IG11Y2ggdGhlIGNhbnZhcyB3YXMgc2Nyb2xsZWQuICBUaGlzXG4gKiAgICAgICAgICAgICAgICAgICAgIGlzIGEgZGljdGlvbmFyeSBvZiB0aGUgZm9ybSB7eDogZmxvYXQsIHk6IGZsb2F0fVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuUmVuZGVyZXJCYXNlLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbihzY3JvbGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ05vdCBpbXBsZW1lbnRlZCcpO1xufTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5SZW5kZXJlckJhc2UgPSBSZW5kZXJlckJhc2U7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgY2FudmFzID0gcmVxdWlyZSgnLi4vY2FudmFzLmpzJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy5qcycpO1xudmFyIHJlbmRlcmVyID0gcmVxdWlyZSgnLi9yZW5kZXJlci5qcycpO1xuXG4vKipcbiAqIFJlbmRlciB0aGUgdGV4dCByb3dzIG9mIGEgRG9jdW1lbnRNb2RlbC5cbiAqIEBwYXJhbSB7RG9jdW1lbnRNb2RlbH0gbW9kZWwgaW5zdGFuY2VcbiAqL1xudmFyIFJvd1JlbmRlcmVyID0gZnVuY3Rpb24obW9kZWwsIHNjcm9sbGluZ19jYW52YXMpIHtcbiAgICB0aGlzLl9tb2RlbCA9IG1vZGVsO1xuICAgIHRoaXMuX3Zpc2libGVfcm93X2NvdW50ID0gMDtcblxuICAgIC8vIFNldHVwIGNhbnZhc2VzXG4gICAgdGhpcy5fdGV4dF9jYW52YXMgPSBuZXcgY2FudmFzLkNhbnZhcygpO1xuICAgIHRoaXMuX3RtcF9jYW52YXMgPSBuZXcgY2FudmFzLkNhbnZhcygpO1xuICAgIHRoaXMuX3Njcm9sbGluZ19jYW52YXMgPSBzY3JvbGxpbmdfY2FudmFzO1xuXG4gICAgLy8gQmFzZVxuICAgIHJlbmRlcmVyLlJlbmRlcmVyQmFzZS5jYWxsKHRoaXMpO1xuXG4gICAgLy8gU2V0IHNvbWUgYmFzaWMgcmVuZGVyaW5nIHByb3BlcnRpZXMuXG4gICAgdGhpcy5fYmFzZV9vcHRpb25zID0ge1xuICAgICAgICBmb250X2ZhbWlseTogJ21vbm9zcGFjZScsXG4gICAgICAgIGZvbnRfc2l6ZTogMTIsXG4gICAgfTtcbiAgICB0aGlzLl9saW5lX3NwYWNpbmcgPSAyO1xuXG4gICAgLy8gQ3JlYXRlIHByb3BlcnRpZXMuXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMucHJvcGVydHkoJ3dpZHRoJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Ll9jYW52YXMud2lkdGg7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC5fY2FudmFzLndpZHRoID0gdmFsdWU7XG4gICAgICAgIHRoYXQuX3RleHRfY2FudmFzLndpZHRoID0gdmFsdWU7XG4gICAgICAgIHRoYXQuX3RtcF9jYW52YXMud2lkdGggPSB2YWx1ZTtcbiAgICB9KTtcbiAgICB0aGlzLnByb3BlcnR5KCdoZWlnaHQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoYXQuX2NhbnZhcy5oZWlnaHQ7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC5fY2FudmFzLmhlaWdodCA9IHZhbHVlO1xuXG4gICAgICAgIC8vIFRoZSB0ZXh0IGNhbnZhcyBzaG91bGQgYmUgdGhlIHJpZ2h0IGhlaWdodCB0byBmaXQgYWxsIG9mIHRoZSBsaW5lc1xuICAgICAgICAvLyB0aGF0IHdpbGwgYmUgcmVuZGVyZWQgaW4gdGhlIGJhc2UgY2FudmFzLiAgVGhpcyBpbmNsdWRlcyB0aGUgbGluZXNcbiAgICAgICAgLy8gdGhhdCBhcmUgcGFydGlhbGx5IHJlbmRlcmVkIGF0IHRoZSB0b3AgYW5kIGJvdHRvbSBvZiB0aGUgYmFzZSBjYW52YXMuXG4gICAgICAgIHZhciByb3dfaGVpZ2h0ID0gdGhhdC5nZXRfcm93X2hlaWdodCgpO1xuICAgICAgICB0aGF0Ll92aXNpYmxlX3Jvd19jb3VudCA9IE1hdGguY2VpbCh2YWx1ZS9yb3dfaGVpZ2h0KSArIDE7XG4gICAgICAgIHRoYXQuX3RleHRfY2FudmFzLmhlaWdodCA9IHRoYXQuX3Zpc2libGVfcm93X2NvdW50ICogcm93X2hlaWdodDtcbiAgICAgICAgdGhhdC5fdG1wX2NhbnZhcy5oZWlnaHQgPSB0aGF0Ll90ZXh0X2NhbnZhcy5oZWlnaHQ7XG4gICAgfSk7XG5cbiAgICAvLyBTZXQgaW5pdGlhbCBjYW52YXMgc2l6ZXMuICBUaGVzZSBsaW5lcyBtYXkgbG9vayByZWR1bmRhbnQsIGJ1dCBiZXdhcmVcbiAgICAvLyBiZWNhdXNlIHRoZXkgYWN0dWFsbHkgY2F1c2UgYW4gYXBwcm9wcmlhdGUgd2lkdGggYW5kIGhlaWdodCB0byBiZSBzZXQgZm9yXG4gICAgLy8gdGhlIHRleHQgY2FudmFzIGJlY2F1c2Ugb2YgdGhlIHByb3BlcnRpZXMgZGVjbGFyZWQgYWJvdmUuXG4gICAgdGhpcy53aWR0aCA9IHRoaXMuX2NhbnZhcy53aWR0aDtcbiAgICB0aGlzLmhlaWdodCA9IHRoaXMuX2NhbnZhcy5oZWlnaHQ7XG5cbiAgICB0aGlzLl9tb2RlbC5vbigndGV4dF9jaGFuZ2VkJywgdXRpbHMucHJveHkodGhpcy5faGFuZGxlX3ZhbHVlX2NoYW5nZWQsIHRoaXMpKTtcbiAgICB0aGlzLl9tb2RlbC5vbigncm93c19hZGRlZCcsIHV0aWxzLnByb3h5KHRoaXMuX2hhbmRsZV9yb3dzX2FkZGVkLCB0aGlzKSk7XG4gICAgdGhpcy5fbW9kZWwub24oJ3Jvd19jaGFuZ2VkJywgdXRpbHMucHJveHkodGhpcy5faGFuZGxlX3Jvd19jaGFuZ2VkLCB0aGlzKSk7IC8vIFRPRE86IEltcGxlbWVudCBteSBldmVudC5cbn07XG51dGlscy5pbmhlcml0KFJvd1JlbmRlcmVyLCByZW5kZXJlci5SZW5kZXJlckJhc2UpO1xuXG4vKipcbiAqIFJlbmRlciB0byB0aGUgY2FudmFzXG4gKiBOb3RlOiBUaGlzIG1ldGhvZCBpcyBjYWxsZWQgb2Z0ZW4sIHNvIGl0J3MgaW1wb3J0YW50IHRoYXQgaXQnc1xuICogb3B0aW1pemVkIGZvciBzcGVlZC5cbiAqIEBwYXJhbSB7ZGljdGlvbmFyeX0gKG9wdGlvbmFsKSBzY3JvbGwgLSBIb3cgbXVjaCB0aGUgY2FudmFzIHdhcyBzY3JvbGxlZC4gIFRoaXNcbiAqICAgICAgICAgICAgICAgICAgICAgaXMgYSBkaWN0aW9uYXJ5IG9mIHRoZSBmb3JtIHt4OiBmbG9hdCwgeTogZmxvYXR9XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24oc2Nyb2xsKSB7XG5cbiAgICAvLyBJZiBvbmx5IHRoZSB5IGF4aXMgd2FzIHNjcm9sbGVkLCBibGl0IHRoZSBnb29kIGNvbnRlbnRzIGFuZCBqdXN0IHJlbmRlclxuICAgIC8vIHdoYXQncyBtaXNzaW5nLlxuICAgIHZhciBwYXJ0aWFsX3JlZHJhdyA9IChzY3JvbGwgJiYgc2Nyb2xsLnggPT09IDAgJiYgTWF0aC5hYnMoc2Nyb2xsLnkpIDwgdGhpcy5fY2FudmFzLmhlaWdodCk7XG5cbiAgICAvLyBVcGRhdGUgdGhlIHRleHQgcmVuZGVyaW5nXG4gICAgdmFyIHZpc2libGVfcm93cyA9IHRoaXMuZ2V0X3Zpc2libGVfcm93cygpO1xuICAgIHRoaXMuX3JlbmRlcl90ZXh0X2NhbnZhcygtdGhpcy5fc2Nyb2xsaW5nX2NhbnZhcy5zY3JvbGxfbGVmdCwgdmlzaWJsZV9yb3dzLnRvcF9yb3csICFwYXJ0aWFsX3JlZHJhdyk7XG5cbiAgICAvLyBDb3B5IHRoZSB0ZXh0IGltYWdlIHRvIHRoaXMgY2FudmFzXG4gICAgdGhpcy5fY2FudmFzLmNsZWFyKCk7XG4gICAgdGhpcy5fY2FudmFzLmRyYXdfaW1hZ2UoXG4gICAgICAgIHRoaXMuX3RleHRfY2FudmFzLCBcbiAgICAgICAgdGhpcy5fc2Nyb2xsaW5nX2NhbnZhcy5zY3JvbGxfbGVmdCwgXG4gICAgICAgIHRoaXMuZ2V0X3Jvd190b3AodmlzaWJsZV9yb3dzLnRvcF9yb3cpKTtcbn07XG5cbi8qKlxuICogUmVuZGVyIHRleHQgdG8gdGhlIHRleHQgY2FudmFzLlxuICpcbiAqIExhdGVyLCB0aGUgbWFpbiByZW5kZXJpbmcgZnVuY3Rpb24gY2FuIHVzZSB0aGlzIHJlbmRlcmVkIHRleHQgdG8gZHJhdyB0aGVcbiAqIGJhc2UgY2FudmFzLlxuICogQHBhcmFtICB7ZmxvYXR9IHhfb2Zmc2V0IC0gaG9yaXpvbnRhbCBvZmZzZXQgb2YgdGhlIHRleHRcbiAqIEBwYXJhbSAge2ludGVnZXJ9IHRvcF9yb3dcbiAqIEBwYXJhbSAge2Jvb2xlYW59IGZvcmNlX3JlZHJhdyAtIHJlZHJhdyB0aGUgY29udGVudHMgZXZlbiBpZiB0aGV5IGFyZVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoZSBzYW1lIGFzIHRoZSBjYWNoZWQgY29udGVudHMuXG4gKiBAcmV0dXJuIHtudWxsfSAgICAgICAgICBcbiAqL1xuUm93UmVuZGVyZXIucHJvdG90eXBlLl9yZW5kZXJfdGV4dF9jYW52YXMgPSBmdW5jdGlvbih4X29mZnNldCwgdG9wX3JvdywgZm9yY2VfcmVkcmF3KSB7XG5cbiAgICAvLyBUcnkgdG8gcmV1c2Ugc29tZSBvZiB0aGUgYWxyZWFkeSByZW5kZXJlZCB0ZXh0IGlmIHBvc3NpYmxlLlxuICAgIHZhciByZW5kZXJlZCA9IGZhbHNlO1xuICAgIHZhciByb3dfaGVpZ2h0ID0gdGhpcy5nZXRfcm93X2hlaWdodCgpO1xuICAgIGlmICghZm9yY2VfcmVkcmF3ICYmIHRoaXMuX2xhc3RfcmVuZGVyZWRfb2Zmc2V0ID09PSB4X29mZnNldCkge1xuICAgICAgICB2YXIgbGFzdF90b3AgPSB0aGlzLl9sYXN0X3JlbmRlcmVkX3JvdztcbiAgICAgICAgdmFyIHNjcm9sbCA9IHRvcF9yb3cgLSBsYXN0X3RvcDsgLy8gUG9zaXRpdmUgPSB1c2VyIHNjcm9sbGluZyBkb3dud2FyZC5cbiAgICAgICAgaWYgKHNjcm9sbCA8IHRoaXMuX2xhc3RfcmVuZGVyZWRfcm93X2NvdW50KSB7XG5cbiAgICAgICAgICAgIC8vIEdldCBhIHNuYXBzaG90IG9mIHRoZSB0ZXh0IGJlZm9yZSB0aGUgc2Nyb2xsLlxuICAgICAgICAgICAgdGhpcy5fdG1wX2NhbnZhcy5jbGVhcigpO1xuICAgICAgICAgICAgdGhpcy5fdG1wX2NhbnZhcy5kcmF3X2ltYWdlKHRoaXMuX3RleHRfY2FudmFzLCAwLCAwKTtcblxuICAgICAgICAgICAgLy8gUmVuZGVyIHRoZSBuZXcgdGV4dC5cbiAgICAgICAgICAgIHZhciBzYXZlZF9yb3dzID0gdGhpcy5fbGFzdF9yZW5kZXJlZF9yb3dfY291bnQgLSBNYXRoLmFicyhzY3JvbGwpO1xuICAgICAgICAgICAgdmFyIG5ld19yb3dzID0gdGhpcy5fdmlzaWJsZV9yb3dfY291bnQgLSBzYXZlZF9yb3dzO1xuICAgICAgICAgICAgaWYgKHNjcm9sbCA+IDApIHtcbiAgICAgICAgICAgICAgICAvLyBSZW5kZXIgdGhlIGJvdHRvbS5cbiAgICAgICAgICAgICAgICB0aGlzLl90ZXh0X2NhbnZhcy5jbGVhcigpO1xuICAgICAgICAgICAgICAgIGZvciAoaSA9IHRvcF9yb3crc2F2ZWRfcm93czsgaSA8IHRvcF9yb3crdGhpcy5fdmlzaWJsZV9yb3dfY291bnQ7IGkrKykgeyAgICAgXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3JlbmRlcl9yb3coaSwgeF9vZmZzZXQsIChpIC0gdG9wX3JvdykgKiByb3dfaGVpZ2h0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHNjcm9sbCA8IDApIHtcbiAgICAgICAgICAgICAgICAvLyBSZW5kZXIgdGhlIHRvcC5cbiAgICAgICAgICAgICAgICB0aGlzLl90ZXh0X2NhbnZhcy5jbGVhcigpO1xuICAgICAgICAgICAgICAgIGZvciAoaSA9IHRvcF9yb3c7IGkgPCB0b3Bfcm93K25ld19yb3dzOyBpKyspIHsgICBcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fcmVuZGVyX3JvdyhpLCB4X29mZnNldCwgKGkgLSB0b3Bfcm93KSAqIHJvd19oZWlnaHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gTm90aGluZyBoYXMgY2hhbmdlZC5cbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVzZSB0aGUgb2xkIGNvbnRlbnQgdG8gZmlsbCBpbiB0aGUgcmVzdC5cbiAgICAgICAgICAgIHRoaXMuX3RleHRfY2FudmFzLmRyYXdfaW1hZ2UodGhpcy5fdG1wX2NhbnZhcywgMCwgLXNjcm9sbCAqIHRoaXMuZ2V0X3Jvd19oZWlnaHQoKSk7XG4gICAgICAgICAgICB0aGlzLnRyaWdnZXIoJ3Jvd3NfY2hhbmdlZCcsIHRvcF9yb3csIHRvcF9yb3cgKyB0aGlzLl92aXNpYmxlX3Jvd19jb3VudCAtIDEpO1xuICAgICAgICAgICAgcmVuZGVyZWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gRnVsbCByZW5kZXJpbmcuXG4gICAgaWYgKCFyZW5kZXJlZCkge1xuICAgICAgICB0aGlzLl90ZXh0X2NhbnZhcy5jbGVhcigpO1xuXG4gICAgICAgIC8vIFJlbmRlciB0aWxsIHRoZXJlIGFyZSBubyByb3dzIGxlZnQsIG9yIHRoZSB0b3Agb2YgdGhlIHJvdyBpc1xuICAgICAgICAvLyBiZWxvdyB0aGUgYm90dG9tIG9mIHRoZSB2aXNpYmxlIGFyZWEuXG4gICAgICAgIGZvciAoaSA9IHRvcF9yb3c7IGkgPCB0b3Bfcm93ICsgdGhpcy5fdmlzaWJsZV9yb3dfY291bnQ7IGkrKykgeyAgICAgICAgXG4gICAgICAgICAgICB0aGlzLl9yZW5kZXJfcm93KGksIHhfb2Zmc2V0LCAoaSAtIHRvcF9yb3cpICogcm93X2hlaWdodCk7XG4gICAgICAgIH0gICBcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdyb3dzX2NoYW5nZWQnLCB0b3Bfcm93LCB0b3Bfcm93ICsgdGhpcy5fdmlzaWJsZV9yb3dfY291bnQgLSAxKTtcbiAgICB9XG5cbiAgICAvLyBSZW1lbWJlciBmb3IgZGVsdGEgcmVuZGVyaW5nLlxuICAgIHRoaXMuX2xhc3RfcmVuZGVyZWRfcm93ID0gdG9wX3JvdztcbiAgICB0aGlzLl9sYXN0X3JlbmRlcmVkX3Jvd19jb3VudCA9IHRoaXMuX3Zpc2libGVfcm93X2NvdW50O1xuICAgIHRoaXMuX2xhc3RfcmVuZGVyZWRfb2Zmc2V0ID0geF9vZmZzZXQ7XG59O1xuXG4vKipcbiAqIEdldHMgdGhlIHJvdyBhbmQgY2hhcmFjdGVyIGluZGljaWVzIGNsb3Nlc3QgdG8gZ2l2ZW4gY29udHJvbCBzcGFjZSBjb29yZGluYXRlcy5cbiAqIEBwYXJhbSAge2Zsb2F0fSBjdXJzb3JfeCAtIHggdmFsdWUsIDAgaXMgdGhlIGxlZnQgb2YgdGhlIGNhbnZhcy5cbiAqIEBwYXJhbSAge2Zsb2F0fSBjdXJzb3JfeSAtIHkgdmFsdWUsIDAgaXMgdGhlIHRvcCBvZiB0aGUgY2FudmFzLlxuICogQHJldHVybiB7ZGljdGlvbmFyeX0gZGljdGlvbmFyeSBvZiB0aGUgZm9ybSB7cm93X2luZGV4LCBjaGFyX2luZGV4fVxuICovXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuZ2V0X3Jvd19jaGFyID0gZnVuY3Rpb24oY3Vyc29yX3gsIGN1cnNvcl95KSB7XG4gICAgdmFyIHJvd19pbmRleCA9IE1hdGguZmxvb3IoY3Vyc29yX3kgLyB0aGlzLmdldF9yb3dfaGVpZ2h0KCkpO1xuXG4gICAgLy8gRmluZCB0aGUgY2hhcmFjdGVyIGluZGV4LlxuICAgIHZhciB3aWR0aHMgPSBbMF07XG4gICAgdHJ5IHtcbiAgICAgICAgZm9yICh2YXIgbGVuZ3RoPTE7IGxlbmd0aDw9dGhpcy5fbW9kZWwuX3Jvd3Nbcm93X2luZGV4XS5sZW5ndGg7IGxlbmd0aCsrKSB7XG4gICAgICAgICAgICB3aWR0aHMucHVzaCh0aGlzLm1lYXN1cmVfcGFydGlhbF9yb3dfd2lkdGgocm93X2luZGV4LCBsZW5ndGgpKTtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gTm9tIG5vbSBub20uLi5cbiAgICB9XG4gICAgdmFyIGNvb3JkcyA9IHRoaXMuX21vZGVsLnZhbGlkYXRlX2Nvb3Jkcyhyb3dfaW5kZXgsIHV0aWxzLmZpbmRfY2xvc2VzdCh3aWR0aHMsIGN1cnNvcl94ICsgdGhpcy5fc2Nyb2xsaW5nX2NhbnZhcy5zY3JvbGxfbGVmdCkpO1xuICAgIHJldHVybiB7XG4gICAgICAgIHJvd19pbmRleDogY29vcmRzLnN0YXJ0X3JvdyxcbiAgICAgICAgY2hhcl9pbmRleDogY29vcmRzLnN0YXJ0X2NoYXIsXG4gICAgfTtcbn07XG5cbi8qKlxuICogTWVhc3VyZXMgdGhlIHBhcnRpYWwgd2lkdGggb2YgYSB0ZXh0IHJvdy5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IGluZGV4XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSAob3B0aW9uYWwpIGxlbmd0aCAtIG51bWJlciBvZiBjaGFyYWN0ZXJzXG4gKiBAcmV0dXJuIHtmbG9hdH0gd2lkdGhcbiAqL1xuUm93UmVuZGVyZXIucHJvdG90eXBlLm1lYXN1cmVfcGFydGlhbF9yb3dfd2lkdGggPSBmdW5jdGlvbihpbmRleCwgbGVuZ3RoKSB7XG4gICAgaWYgKDAgPiBpbmRleCB8fCBpbmRleCA+PSB0aGlzLl9tb2RlbC5fcm93cy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIDA7IFxuICAgIH1cblxuICAgIHZhciB0ZXh0ID0gdGhpcy5fbW9kZWwuX3Jvd3NbaW5kZXhdO1xuICAgIHRleHQgPSAobGVuZ3RoID09PSB1bmRlZmluZWQpID8gdGV4dCA6IHRleHQuc3Vic3RyaW5nKDAsIGxlbmd0aCk7XG5cbiAgICByZXR1cm4gdGhpcy5fY2FudmFzLm1lYXN1cmVfdGV4dCh0ZXh0LCB0aGlzLl9iYXNlX29wdGlvbnMpO1xufTtcblxuLyoqXG4gKiBNZWFzdXJlcyB0aGUgaGVpZ2h0IG9mIGEgdGV4dCByb3cgYXMgaWYgaXQgd2VyZSByZW5kZXJlZC5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IChvcHRpb25hbCkgaW5kZXhcbiAqIEByZXR1cm4ge2Zsb2F0fSBoZWlnaHRcbiAqL1xuUm93UmVuZGVyZXIucHJvdG90eXBlLmdldF9yb3dfaGVpZ2h0ID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICByZXR1cm4gdGhpcy5fYmFzZV9vcHRpb25zLmZvbnRfc2l6ZSArIHRoaXMuX2xpbmVfc3BhY2luZztcbn07XG5cbi8qKlxuICogR2V0cyB0aGUgdG9wIG9mIHRoZSByb3cgd2hlbiByZW5kZXJlZFxuICogQHBhcmFtICB7aW50ZWdlcn0gaW5kZXhcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5nZXRfcm93X3RvcCA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgcmV0dXJuIGluZGV4ICogdGhpcy5nZXRfcm93X2hlaWdodCgpO1xufTtcblxuLyoqXG4gKiBHZXRzIHRoZSB2aXNpYmxlIHJvd3MuXG4gKiBAcmV0dXJuIHtkaWN0aW9uYXJ5fSBkaWN0aW9uYXJ5IGNvbnRhaW5pbmcgaW5mb3JtYXRpb24gYWJvdXQgXG4gKiAgICAgICAgICAgICAgICAgICAgICB0aGUgdmlzaWJsZSByb3dzLiAgRm9ybWF0IHt0b3Bfcm93LCBcbiAqICAgICAgICAgICAgICAgICAgICAgIGJvdHRvbV9yb3csIHJvd19jb3VudH0uXG4gKi9cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5nZXRfdmlzaWJsZV9yb3dzID0gZnVuY3Rpb24oKSB7XG5cbiAgICAvLyBGaW5kIHRoZSByb3cgY2xvc2VzdCB0byB0aGUgc2Nyb2xsIHRvcC4gIElmIHRoYXQgcm93IGlzIGJlbG93XG4gICAgLy8gdGhlIHNjcm9sbCB0b3AsIHVzZSB0aGUgcGFydGlhbGx5IGRpc3BsYXllZCByb3cgYWJvdmUgaXQuXG4gICAgdmFyIHRvcF9yb3cgPSBNYXRoLm1heCgwLCBNYXRoLmZsb29yKHRoaXMuX3Njcm9sbGluZ19jYW52YXMuc2Nyb2xsX3RvcCAgLyB0aGlzLmdldF9yb3dfaGVpZ2h0KCkpKTtcblxuICAgIC8vIEZpbmQgdGhlIHJvdyBjbG9zZXN0IHRvIHRoZSBzY3JvbGwgYm90dG9tLiAgSWYgdGhhdCByb3cgaXMgYWJvdmVcbiAgICAvLyB0aGUgc2Nyb2xsIGJvdHRvbSwgdXNlIHRoZSBwYXJ0aWFsbHkgZGlzcGxheWVkIHJvdyBiZWxvdyBpdC5cbiAgICB2YXIgcm93X2NvdW50ID0gTWF0aC5jZWlsKHRoaXMuX2NhbnZhcy5oZWlnaHQgLyB0aGlzLmdldF9yb3dfaGVpZ2h0KCkpO1xuICAgIHZhciBib3R0b21fcm93ID0gdG9wX3JvdyArIHJvd19jb3VudDtcblxuICAgIC8vIFJvdyBjb3VudCArIDEgdG8gaW5jbHVkZSBmaXJzdCByb3cuXG4gICAgcmV0dXJuIHt0b3Bfcm93OiB0b3Bfcm93LCBib3R0b21fcm93OiBib3R0b21fcm93LCByb3dfY291bnQ6IHJvd19jb3VudCsxfTtcbn07XG5cbi8qKlxuICogSGFuZGxlcyB3aGVuIHRoZSBtb2RlbCdzIHZhbHVlIGNoYW5nZXNcbiAqIENvbXBsZXhpdHk6IE8oTikgZm9yIE4gcm93cyBvZiB0ZXh0LlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuUm93UmVuZGVyZXIucHJvdG90eXBlLl9oYW5kbGVfdmFsdWVfY2hhbmdlZCA9IGZ1bmN0aW9uKCkge1xuXG4gICAgLy8gQ2FsY3VsYXRlIHRoZSBkb2N1bWVudCB3aWR0aC5cbiAgICB2YXIgZG9jdW1lbnRfd2lkdGggPSAwO1xuICAgIGZvciAodmFyIGk9MDsgaTx0aGlzLl9tb2RlbC5fcm93cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBkb2N1bWVudF93aWR0aCA9IE1hdGgubWF4KHRoaXMuX21lYXN1cmVfcm93X3dpZHRoKGkpLCBkb2N1bWVudF93aWR0aCk7XG4gICAgfVxuICAgIHRoaXMuX3Njcm9sbGluZ19jYW52YXMuc2Nyb2xsX3dpZHRoID0gZG9jdW1lbnRfd2lkdGg7XG4gICAgdGhpcy5fc2Nyb2xsaW5nX2NhbnZhcy5zY3JvbGxfaGVpZ2h0ID0gdGhpcy5fbW9kZWwuX3Jvd3MubGVuZ3RoICogdGhpcy5nZXRfcm93X2hlaWdodCgpO1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIHdoZW4gb25lIG9mIHRoZSBtb2RlbCdzIHJvd3MgY2hhbmdlXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuX2hhbmRsZV9yb3dfY2hhbmdlZCA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgdGhpcy5fc2Nyb2xsaW5nX2NhbnZhcy5zY3JvbGxfd2lkdGggPSBNYXRoLm1heCh0aGlzLl9tZWFzdXJlX3Jvd193aWR0aChpbmRleCksIHRoaXMuX3Njcm9sbGluZ19jYW52YXMuc2Nyb2xsX3dpZHRoKTtcbn07XG5cbi8qKlxuICogSGFuZGxlcyB3aGVuIG9uZSBvciBtb3JlIHJvd3MgYXJlIGFkZGVkIHRvIHRoZSBtb2RlbFxuICpcbiAqIEFzc3VtZXMgY29uc3RhbnQgcm93IGhlaWdodC5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IHN0YXJ0XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBlbmRcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5faGFuZGxlX3Jvd3NfYWRkZWQgPSBmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gICAgdGhpcy5fc2Nyb2xsaW5nX2NhbnZhcy5zY3JvbGxfaGVpZ2h0ICs9IChlbmQgLSBzdGFydCArIDEpICogdGhpcy5nZXRfcm93X2hlaWdodCgpO1xuICAgIHZhciB3aWR0aCA9IHRoaXMuX3Njcm9sbGluZ19jYW52YXMuc2Nyb2xsX3dpZHRoO1xuICAgIGZvciAodmFyIGkgPSBzdGFydDsgaSA8PSBlbmQ7IGkrKykgeyBcbiAgICAgICAgd2lkdGggPSBNYXRoLm1heCh0aGlzLl9tZWFzdXJlX3Jvd193aWR0aChpbmRleCksIHdpZHRoKTtcbiAgICB9XG4gICAgdGhpcy5fc2Nyb2xsaW5nX2NhbnZhcy5zY3JvbGxfd2lkdGggPSB3aWR0aDtcbn07XG5cbi8qKlxuICogUmVuZGVyIGEgc2luZ2xlIHJvd1xuICogQHBhcmFtICB7aW50ZWdlcn0gaW5kZXhcbiAqIEBwYXJhbSAge2Zsb2F0fSB4XG4gKiBAcGFyYW0gIHtmbG9hdH0geVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuUm93UmVuZGVyZXIucHJvdG90eXBlLl9yZW5kZXJfcm93ID0gZnVuY3Rpb24oaW5kZXgsIHggLHkpIHtcbiAgICB0aGlzLl90ZXh0X2NhbnZhcy5kcmF3X3RleHQoeCwgeSwgdGhpcy5fbW9kZWwuX3Jvd3NbaW5kZXhdLCB0aGlzLl9iYXNlX29wdGlvbnMpO1xufTtcblxuLyoqXG4gKiBNZWFzdXJlcyB0aGUgd2lkdGggb2YgYSB0ZXh0IHJvdyBhcyBpZiBpdCB3ZXJlIHJlbmRlcmVkLlxuICogQHBhcmFtICB7aW50ZWdlcn0gaW5kZXhcbiAqIEByZXR1cm4ge2Zsb2F0fSB3aWR0aFxuICovXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuX21lYXN1cmVfcm93X3dpZHRoID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICByZXR1cm4gdGhpcy5tZWFzdXJlX3BhcnRpYWxfcm93X3dpZHRoKGluZGV4LCB0aGlzLl9tb2RlbC5fcm93c1tpbmRleF0ubGVuZ3RoKTtcbn07XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuUm93UmVuZGVyZXIgPSBSb3dSZW5kZXJlcjtcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbnZhciBhbmltYXRvciA9IHJlcXVpcmUoJy4uL2FuaW1hdG9yLmpzJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy5qcycpO1xudmFyIHJlbmRlcmVyID0gcmVxdWlyZSgnLi9yZW5kZXJlci5qcycpO1xuXG4vKipcbiAqIFJlbmRlciBkb2N1bWVudCBzZWxlY3Rpb24gYm94ZXNcbiAqXG4gKiBUT0RPOiBPbmx5IHJlbmRlciB2aXNpYmxlLlxuICovXG52YXIgU2VsZWN0aW9uc1JlbmRlcmVyID0gZnVuY3Rpb24oY3Vyc29ycywgc3R5bGUsIHJvd19yZW5kZXJlciwgaGFzX2ZvY3VzLCBjdXJzb3JzX3JlbmRlcmVyKSB7XG4gICAgcmVuZGVyZXIuUmVuZGVyZXJCYXNlLmNhbGwodGhpcyk7XG4gICAgdGhpcy5zdHlsZSA9IHN0eWxlO1xuICAgIHRoaXMuX2hhc19mb2N1cyA9IGhhc19mb2N1cztcblxuICAgIC8vIFdoZW4gdGhlIGN1cnNvcnMgY2hhbmdlLCByZWRyYXcgdGhlIHNlbGVjdGlvbiBib3goZXMpLlxuICAgIHRoaXMuX2N1cnNvcnMgPSBjdXJzb3JzO1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLl9jdXJzb3JzLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhhdC5yZW5kZXIoKTtcbiAgICAgICAgLy8gVGVsbCBwYXJlbnQgbGF5ZXIgdGhpcyBvbmUgaGFzIGNoYW5nZWQuXG4gICAgICAgIHRoYXQudHJpZ2dlcignY2hhbmdlZCcpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5fZ2V0X3Zpc2libGVfcm93cyA9IHV0aWxzLnByb3h5KHJvd19yZW5kZXJlci5nZXRfdmlzaWJsZV9yb3dzLCByb3dfcmVuZGVyZXIpO1xuICAgIHRoaXMuX2dldF9yb3dfaGVpZ2h0ID0gdXRpbHMucHJveHkocm93X3JlbmRlcmVyLmdldF9yb3dfaGVpZ2h0LCByb3dfcmVuZGVyZXIpO1xuICAgIHRoaXMuX2dldF9yb3dfdG9wID0gdXRpbHMucHJveHkocm93X3JlbmRlcmVyLmdldF9yb3dfdG9wLCByb3dfcmVuZGVyZXIpO1xuICAgIHRoaXMuX21lYXN1cmVfcGFydGlhbF9yb3cgPSB1dGlscy5wcm94eShyb3dfcmVuZGVyZXIubWVhc3VyZV9wYXJ0aWFsX3Jvd193aWR0aCwgcm93X3JlbmRlcmVyKTtcblxuICAgIC8vIFdoZW4gdGhlIGN1cnNvciBpcyBoaWRkZW4vc2hvd24sIHJlZHJhdyB0aGUgc2VsZWN0aW9uLlxuICAgIGN1cnNvcnNfcmVuZGVyZXIub24oJ3RvZ2dsZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGF0LnJlbmRlcigpO1xuICAgICAgICAvLyBUZWxsIHBhcmVudCBsYXllciB0aGlzIG9uZSBoYXMgY2hhbmdlZC5cbiAgICAgICAgdGhhdC50cmlnZ2VyKCdjaGFuZ2VkJyk7XG4gICAgfSk7XG59O1xudXRpbHMuaW5oZXJpdChTZWxlY3Rpb25zUmVuZGVyZXIsIHJlbmRlcmVyLlJlbmRlcmVyQmFzZSk7XG5cbi8qKlxuICogUmVuZGVyIHRvIHRoZSBjYW52YXNcbiAqIE5vdGU6IFRoaXMgbWV0aG9kIGlzIGNhbGxlZCBvZnRlbiwgc28gaXQncyBpbXBvcnRhbnQgdGhhdCBpdCdzXG4gKiBvcHRpbWl6ZWQgZm9yIHNwZWVkLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuU2VsZWN0aW9uc1JlbmRlcmVyLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9jYW52YXMuY2xlYXIoKTtcblxuICAgIC8vIE9ubHkgcmVuZGVyIGlmIHRoZSBjYW52YXMgaGFzIGZvY3VzLlxuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLl9jdXJzb3JzLmN1cnNvcnMuZm9yRWFjaChmdW5jdGlvbihjdXJzb3IpIHtcbiAgICAgICAgLy8gR2V0IHRoZSB2aXNpYmxlIHJvd3MuXG4gICAgICAgIHZhciB2aXNpYmxlX3Jvd3MgPSB0aGF0Ll9nZXRfdmlzaWJsZV9yb3dzKCk7XG5cbiAgICAgICAgLy8gRHJhdyB0aGUgc2VsZWN0aW9uIGJveC5cbiAgICAgICAgaWYgKGN1cnNvci5zdGFydF9yb3cgIT09IG51bGwgJiYgY3Vyc29yLnN0YXJ0X2NoYXIgIT09IG51bGwgJiZcbiAgICAgICAgICAgIGN1cnNvci5lbmRfcm93ICE9PSBudWxsICYmIGN1cnNvci5lbmRfY2hhciAhPT0gbnVsbCkge1xuICAgICAgICAgICAgXG5cbiAgICAgICAgICAgIGZvciAodmFyIGkgPSBNYXRoLm1heChjdXJzb3Iuc3RhcnRfcm93LCB2aXNpYmxlX3Jvd3MudG9wX3Jvdyk7IFxuICAgICAgICAgICAgICAgIGkgPD0gTWF0aC5taW4oY3Vyc29yLmVuZF9yb3csIHZpc2libGVfcm93cy5ib3R0b21fcm93KTsgXG4gICAgICAgICAgICAgICAgaSsrKSB7XG5cbiAgICAgICAgICAgICAgICB2YXIgbGVmdCA9IDA7XG4gICAgICAgICAgICAgICAgaWYgKGkgPT0gY3Vyc29yLnN0YXJ0X3JvdyAmJiBjdXJzb3Iuc3RhcnRfY2hhciA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgbGVmdCA9IHRoYXQuX21lYXN1cmVfcGFydGlhbF9yb3coaSwgY3Vyc29yLnN0YXJ0X2NoYXIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciBzZWxlY3Rpb25fY29sb3I7XG4gICAgICAgICAgICAgICAgaWYgKHRoYXQuX2hhc19mb2N1cygpKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdGlvbl9jb2xvciA9IHRoYXQuc3R5bGUuc2VsZWN0aW9uIHx8ICdza3libHVlJztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzZWxlY3Rpb25fY29sb3IgPSB0aGF0LnN0eWxlLnNlbGVjdGlvbl91bmZvY3VzZWQgfHwgJ2dyYXknO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHRoYXQuX2NhbnZhcy5kcmF3X3JlY3RhbmdsZShcbiAgICAgICAgICAgICAgICAgICAgbGVmdCwgXG4gICAgICAgICAgICAgICAgICAgIHRoYXQuX2dldF9yb3dfdG9wKGkpLCBcbiAgICAgICAgICAgICAgICAgICAgaSAhPT0gY3Vyc29yLmVuZF9yb3cgPyB0aGF0Ll9tZWFzdXJlX3BhcnRpYWxfcm93KGkpIC0gbGVmdCA6IHRoYXQuX21lYXN1cmVfcGFydGlhbF9yb3coaSwgY3Vyc29yLmVuZF9jaGFyKSAtIGxlZnQsIFxuICAgICAgICAgICAgICAgICAgICB0aGF0Ll9nZXRfcm93X2hlaWdodChpKSwgXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbGxfY29sb3I6IHNlbGVjdGlvbl9jb2xvcixcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuU2VsZWN0aW9uc1JlbmRlcmVyID0gU2VsZWN0aW9uc1JlbmRlcmVyO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cbnZhciBjYW52YXMgPSByZXF1aXJlKCcuL2NhbnZhcy5qcycpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xuXG4vKipcbiAqIEhUTUwgY2FudmFzIHdpdGggZHJhd2luZyBjb252aW5pZW5jZSBmdW5jdGlvbnMuXG4gKi9cbnZhciBTY3JvbGxpbmdDYW52YXMgPSBmdW5jdGlvbigpIHtcbiAgICBjYW52YXMuQ2FudmFzLmNhbGwodGhpcyk7XG4gICAgdGhpcy5fYmluZF9ldmVudHMoKTtcbiAgICB0aGlzLl9vbGRfc2Nyb2xsX2xlZnQgPSAwO1xuICAgIHRoaXMuX29sZF9zY3JvbGxfdG9wID0gMDtcblxuICAgIC8vIFNldCBkZWZhdWx0IHNpemUuXG4gICAgdGhpcy53aWR0aCA9IDQwMDtcbiAgICB0aGlzLmhlaWdodCA9IDMwMDtcbn07XG51dGlscy5pbmhlcml0KFNjcm9sbGluZ0NhbnZhcywgY2FudmFzLkNhbnZhcyk7XG5cbi8qKlxuICogQ2F1c2VzIHRoZSBjYW52YXMgY29udGVudHMgdG8gYmUgcmVkcmF3bi5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblNjcm9sbGluZ0NhbnZhcy5wcm90b3R5cGUucmVkcmF3ID0gZnVuY3Rpb24oc2Nyb2xsKSB7XG4gICAgdGhpcy5jbGVhcigpO1xuICAgIHRoaXMudHJpZ2dlcigncmVkcmF3Jywgc2Nyb2xsKTtcbn07XG5cbi8qKlxuICogTGF5b3V0IHRoZSBlbGVtZW50cyBmb3IgdGhlIGNhbnZhcy5cbiAqIENyZWF0ZXMgYHRoaXMuZWxgXG4gKiBcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblNjcm9sbGluZ0NhbnZhcy5wcm90b3R5cGUuX2xheW91dCA9IGZ1bmN0aW9uKCkge1xuICAgIGNhbnZhcy5DYW52YXMucHJvdG90eXBlLl9sYXlvdXQuY2FsbCh0aGlzKTtcbiAgICAvLyBDaGFuZ2UgdGhlIGNhbnZhcyBjbGFzcyBzbyBpdCdzIG5vdCBoaWRkZW4uXG4gICAgdGhpcy5fY2FudmFzLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAnY2FudmFzJyk7XG5cbiAgICB0aGlzLmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgdGhpcy5lbC5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ3Bvc3RlciBzY3JvbGwtd2luZG93Jyk7XG4gICAgdGhpcy5lbC5zZXRBdHRyaWJ1dGUoJ3RhYmluZGV4JywgMCk7XG4gICAgdGhpcy5fc2Nyb2xsX2JhcnMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICB0aGlzLl9zY3JvbGxfYmFycy5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ3Njcm9sbC1iYXJzJyk7XG4gICAgdGhpcy5fdG91Y2hfcGFuZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIHRoaXMuX3RvdWNoX3BhbmUuc2V0QXR0cmlidXRlKCdjbGFzcycsICd0b3VjaC1wYW5lJyk7XG4gICAgdGhpcy5fZHVtbXkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICB0aGlzLl9kdW1teS5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ3Njcm9sbC1kdW1teScpO1xuXG4gICAgdGhpcy5lbC5hcHBlbmRDaGlsZCh0aGlzLl9jYW52YXMpO1xuICAgIHRoaXMuZWwuYXBwZW5kQ2hpbGQodGhpcy5fc2Nyb2xsX2JhcnMpO1xuICAgIHRoaXMuX3Njcm9sbF9iYXJzLmFwcGVuZENoaWxkKHRoaXMuX2R1bW15KTtcbiAgICB0aGlzLl9zY3JvbGxfYmFycy5hcHBlbmRDaGlsZCh0aGlzLl90b3VjaF9wYW5lKTtcbn07XG5cbi8qKlxuICogTWFrZSB0aGUgcHJvcGVydGllcyBvZiB0aGUgY2xhc3MuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5TY3JvbGxpbmdDYW52YXMucHJvdG90eXBlLl9pbml0X3Byb3BlcnRpZXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBXaWR0aCBvZiB0aGUgc2Nyb2xsYWJsZSBjYW52YXMgYXJlYVxuICAgICAqL1xuICAgIHRoaXMucHJvcGVydHkoJ3Njcm9sbF93aWR0aCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBHZXRcbiAgICAgICAgcmV0dXJuIHRoYXQuX3Njcm9sbF93aWR0aCB8fCAwO1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIC8vIFNldFxuICAgICAgICB0aGF0Ll9zY3JvbGxfd2lkdGggPSB2YWx1ZTtcbiAgICAgICAgdGhhdC5fbW92ZV9kdW1teSh0aGF0Ll9zY3JvbGxfd2lkdGgsIHRoYXQuX3Njcm9sbF9oZWlnaHQgfHwgMCk7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBIZWlnaHQgb2YgdGhlIHNjcm9sbGFibGUgY2FudmFzIGFyZWEuXG4gICAgICovXG4gICAgdGhpcy5wcm9wZXJ0eSgnc2Nyb2xsX2hlaWdodCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBHZXRcbiAgICAgICAgcmV0dXJuIHRoYXQuX3Njcm9sbF9oZWlnaHQgfHwgMDtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAvLyBTZXRcbiAgICAgICAgdGhhdC5fc2Nyb2xsX2hlaWdodCA9IHZhbHVlO1xuICAgICAgICB0aGF0Ll9tb3ZlX2R1bW15KHRoYXQuX3Njcm9sbF93aWR0aCB8fCAwLCB0aGF0Ll9zY3JvbGxfaGVpZ2h0KTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIFRvcCBtb3N0IHBpeGVsIGluIHRoZSBzY3JvbGxlZCB3aW5kb3cuXG4gICAgICovXG4gICAgdGhpcy5wcm9wZXJ0eSgnc2Nyb2xsX3RvcCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBHZXRcbiAgICAgICAgcmV0dXJuIHRoYXQuX3Njcm9sbF9iYXJzLnNjcm9sbFRvcDtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAvLyBTZXRcbiAgICAgICAgdGhhdC5fc2Nyb2xsX2JhcnMuc2Nyb2xsVG9wID0gdmFsdWU7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBMZWZ0IG1vc3QgcGl4ZWwgaW4gdGhlIHNjcm9sbGVkIHdpbmRvdy5cbiAgICAgKi9cbiAgICB0aGlzLnByb3BlcnR5KCdzY3JvbGxfbGVmdCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBHZXRcbiAgICAgICAgcmV0dXJuIHRoYXQuX3Njcm9sbF9iYXJzLnNjcm9sbExlZnQ7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgLy8gU2V0XG4gICAgICAgIHRoYXQuX3Njcm9sbF9iYXJzLnNjcm9sbExlZnQgPSB2YWx1ZTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIEhlaWdodCBvZiB0aGUgY2FudmFzXG4gICAgICogQHJldHVybiB7ZmxvYXR9XG4gICAgICovXG4gICAgdGhpcy5wcm9wZXJ0eSgnaGVpZ2h0JywgZnVuY3Rpb24oKSB7IFxuICAgICAgICByZXR1cm4gdGhhdC5fY2FudmFzLmhlaWdodCAvIDI7IFxuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQuX2NhbnZhcy5zZXRBdHRyaWJ1dGUoJ2hlaWdodCcsIHZhbHVlICogMik7XG4gICAgICAgIHRoYXQuZWwuc2V0QXR0cmlidXRlKCdzdHlsZScsICd3aWR0aDogJyArIHRoYXQud2lkdGggKyAnOyBoZWlnaHQ6ICcgKyB2YWx1ZSArICc7Jyk7XG5cbiAgICAgICAgdGhhdC50cmlnZ2VyKCdyZXNpemUnLCB7aGVpZ2h0OiB2YWx1ZX0pO1xuICAgICAgICB0aGF0Ll90cnlfcmVkcmF3KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTdHJldGNoIHRoZSBpbWFnZSBmb3IgcmV0aW5hIHN1cHBvcnQuXG4gICAgICAgIHRoaXMuc2NhbGUoMiwyKTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIFdpZHRoIG9mIHRoZSBjYW52YXNcbiAgICAgKiBAcmV0dXJuIHtmbG9hdH1cbiAgICAgKi9cbiAgICB0aGlzLnByb3BlcnR5KCd3aWR0aCcsIGZ1bmN0aW9uKCkgeyBcbiAgICAgICAgcmV0dXJuIHRoYXQuX2NhbnZhcy53aWR0aCAvIDI7IFxuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQuX2NhbnZhcy5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgdmFsdWUgKiAyKTtcbiAgICAgICAgdGhhdC5lbC5zZXRBdHRyaWJ1dGUoJ3N0eWxlJywgJ3dpZHRoOiAnICsgdmFsdWUgKyAnOyBoZWlnaHQ6ICcgKyB0aGF0LmhlaWdodCArICc7Jyk7XG5cbiAgICAgICAgdGhhdC50cmlnZ2VyKCdyZXNpemUnLCB7d2lkdGg6IHZhbHVlfSk7XG4gICAgICAgIHRoYXQuX3RyeV9yZWRyYXcoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFN0cmV0Y2ggdGhlIGltYWdlIGZvciByZXRpbmEgc3VwcG9ydC5cbiAgICAgICAgdGhpcy5zY2FsZSgyLDIpO1xuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogSXMgdGhlIGNhbnZhcyBvciByZWxhdGVkIGVsZW1lbnRzIGZvY3VzZWQ/XG4gICAgICogQHJldHVybiB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICB0aGlzLnByb3BlcnR5KCdmb2N1c2VkJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBkb2N1bWVudC5hY3RpdmVFbGVtZW50ID09PSB0aGF0LmVsIHx8XG4gICAgICAgICAgICBkb2N1bWVudC5hY3RpdmVFbGVtZW50ID09PSB0aGF0Ll9zY3JvbGxfYmFycyB8fFxuICAgICAgICAgICAgZG9jdW1lbnQuYWN0aXZlRWxlbWVudCA9PT0gdGhhdC5fZHVtbXkgfHxcbiAgICAgICAgICAgIGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQgPT09IHRoYXQuX2NhbnZhcztcbiAgICB9KTtcbn07XG5cbi8qKlxuICogQmluZCB0byB0aGUgZXZlbnRzIG9mIHRoZSBjYW52YXMuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5TY3JvbGxpbmdDYW52YXMucHJvdG90eXBlLl9iaW5kX2V2ZW50cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcblxuICAgIC8vIFRyaWdnZXIgc2Nyb2xsIGFuZCByZWRyYXcgZXZlbnRzIG9uIHNjcm9sbC5cbiAgICB0aGlzLl9zY3JvbGxfYmFycy5vbnNjcm9sbCA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgdGhhdC50cmlnZ2VyKCdzY3JvbGwnLCBlKTtcbiAgICAgICAgaWYgKHRoYXQuX29sZF9zY3JvbGxfdG9wICE9PSB1bmRlZmluZWQgJiYgdGhhdC5fb2xkX3Njcm9sbF9sZWZ0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHZhciBzY3JvbGwgPSB7XG4gICAgICAgICAgICAgICAgeDogdGhhdC5zY3JvbGxfbGVmdCAtIHRoYXQuX29sZF9zY3JvbGxfbGVmdCxcbiAgICAgICAgICAgICAgICB5OiB0aGF0LnNjcm9sbF90b3AgLSB0aGF0Ll9vbGRfc2Nyb2xsX3RvcCxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB0aGF0Ll90cnlfcmVkcmF3KHNjcm9sbCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGF0Ll90cnlfcmVkcmF3KCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhhdC5fb2xkX3Njcm9sbF9sZWZ0ID0gdGhhdC5zY3JvbGxfbGVmdDtcbiAgICAgICAgdGhhdC5fb2xkX3Njcm9sbF90b3AgPSB0aGF0LnNjcm9sbF90b3A7XG4gICAgfTtcblxuICAgIC8vIFByZXZlbnQgc2Nyb2xsIGJhciBoYW5kbGVkIG1vdXNlIGV2ZW50cyBmcm9tIGJ1YmJsaW5nLlxuICAgIHZhciBzY3JvbGxiYXJfZXZlbnQgPSBmdW5jdGlvbihlKSB7XG4gICAgICAgIGlmIChlLnRhcmdldCAhPT0gdGhhdC5fdG91Y2hfcGFuZSkge1xuICAgICAgICAgICAgdXRpbHMuY2FuY2VsX2J1YmJsZShlKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdGhpcy5fc2Nyb2xsX2JhcnMub25tb3VzZWRvd24gPSBzY3JvbGxiYXJfZXZlbnQ7XG4gICAgdGhpcy5fc2Nyb2xsX2JhcnMub25tb3VzZXVwID0gc2Nyb2xsYmFyX2V2ZW50O1xuICAgIHRoaXMuX3Njcm9sbF9iYXJzLm9uY2xpY2sgPSBzY3JvbGxiYXJfZXZlbnQ7XG4gICAgdGhpcy5fc2Nyb2xsX2JhcnMub25kYmxjbGljayA9IHNjcm9sbGJhcl9ldmVudDtcbn07XG5cbi8qKlxuICogUXVlcmllcyB0byBzZWUgaWYgcmVkcmF3IGlzIG9rYXksIGFuZCB0aGVuIHJlZHJhd3MgaWYgaXQgaXMuXG4gKiBAcmV0dXJuIHtib29sZWFufSB0cnVlIGlmIHJlZHJhdyBoYXBwZW5lZC5cbiAqL1xuU2Nyb2xsaW5nQ2FudmFzLnByb3RvdHlwZS5fdHJ5X3JlZHJhdyA9IGZ1bmN0aW9uKHNjcm9sbCkge1xuICAgIGlmICh0aGlzLl9xdWVyeV9yZWRyYXcoKSkge1xuICAgICAgICB0aGlzLnJlZHJhdyhzY3JvbGwpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufTtcblxuLyoqXG4gKiBUcmlnZ2VyIHRoZSAncXVlcnlfcmVkcmF3JyBldmVudC5cbiAqIEByZXR1cm4ge2Jvb2xlYW59IHRydWUgaWYgY29udHJvbCBzaG91bGQgcmVkcmF3IGl0c2VsZi5cbiAqL1xuU2Nyb2xsaW5nQ2FudmFzLnByb3RvdHlwZS5fcXVlcnlfcmVkcmF3ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMudHJpZ2dlcigncXVlcnlfcmVkcmF3JykuZXZlcnkoZnVuY3Rpb24oeCkgeyByZXR1cm4geDsgfSk7IFxufTtcblxuLyoqXG4gKiBNb3ZlcyB0aGUgZHVtbXkgZWxlbWVudCB0aGF0IGNhdXNlcyB0aGUgc2Nyb2xsYmFyIHRvIGFwcGVhci5cbiAqIEBwYXJhbSAge2Zsb2F0fSB4XG4gKiBAcGFyYW0gIHtmbG9hdH0geVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuU2Nyb2xsaW5nQ2FudmFzLnByb3RvdHlwZS5fbW92ZV9kdW1teSA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICB0aGlzLl9kdW1teS5zZXRBdHRyaWJ1dGUoJ3N0eWxlJywgJ2xlZnQ6ICcgKyBTdHJpbmcoeCkgKyAnOyB0b3A6ICcgKyBTdHJpbmcoeSkgKyAnOycpO1xuICAgIHRoaXMuX3RvdWNoX3BhbmUuc2V0QXR0cmlidXRlKCdzdHlsZScsIFxuICAgICAgICAnd2lkdGg6ICcgKyBTdHJpbmcoTWF0aC5tYXgoeCwgdGhpcy5fc2Nyb2xsX2JhcnMuY2xpZW50V2lkdGgpKSArICc7ICcgK1xuICAgICAgICAnaGVpZ2h0OiAnICsgU3RyaW5nKE1hdGgubWF4KHksIHRoaXMuX3Njcm9sbF9iYXJzLmNsaWVudEhlaWdodCkpICsgJzsnKTtcbn07XG5cbi8qKlxuICogVHJhbnNmb3JtIGFuIHggdmFsdWUgYmFzZWQgb24gc2Nyb2xsIHBvc2l0aW9uLlxuICogQHBhcmFtICB7ZmxvYXR9IHhcbiAqIEBwYXJhbSAge2Jvb2xlYW59IGludmVyc2UgLSBwZXJmb3JtIGludmVyc2UgdHJhbnNmb3JtYXRpb25cbiAqIEByZXR1cm4ge2Zsb2F0fVxuICovXG5TY3JvbGxpbmdDYW52YXMucHJvdG90eXBlLl90eCA9IGZ1bmN0aW9uKHgsIGludmVyc2UpIHsgcmV0dXJuIHggLSAoaW52ZXJzZT8tMToxKSAqIHRoaXMuc2Nyb2xsX2xlZnQ7IH07XG5cbi8qKlxuICogVHJhbnNmb3JtIGEgeSB2YWx1ZSBiYXNlZCBvbiBzY3JvbGwgcG9zaXRpb24uXG4gKiBAcGFyYW0gIHtmbG9hdH0geVxuICogQHBhcmFtICB7Ym9vbGVhbn0gaW52ZXJzZSAtIHBlcmZvcm0gaW52ZXJzZSB0cmFuc2Zvcm1hdGlvblxuICogQHJldHVybiB7ZmxvYXR9XG4gKi9cblNjcm9sbGluZ0NhbnZhcy5wcm90b3R5cGUuX3R5ID0gZnVuY3Rpb24oeSwgaW52ZXJzZSkgeyByZXR1cm4geSAtIChpbnZlcnNlPy0xOjEpICogdGhpcy5zY3JvbGxfdG9wOyB9O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLlNjcm9sbGluZ0NhbnZhcyA9IFNjcm9sbGluZ0NhbnZhcztcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKTtcbnZhciBzdHlsZXMgPSByZXF1aXJlKCcuL3N0eWxlcy9pbml0LmpzJyk7XG5cbi8qKlxuICogU3R5bGVcbiAqL1xudmFyIFN0eWxlID0gZnVuY3Rpb24oKSB7XG4gICAgdXRpbHMuUG9zdGVyQ2xhc3MuY2FsbCh0aGlzLCBbXG4gICAgICAgICdjb21tZW50JyxcbiAgICAgICAgJ3RvZG8nLFxuICAgICAgICAnc3BlY2lhbCcsXG4gICAgICAgICdzdHJpbmcnLFxuICAgICAgICAnY2hhcmFjdGVyJyxcbiAgICAgICAgJ2NvbmRpdGlvbmFsJyxcbiAgICAgICAgJ3JlcGVhdCcsXG4gICAgICAgICdvcGVyYXRvcicsXG4gICAgICAgICd0eXBlJyxcbiAgICAgICAgJ3N0YXRlbWVudCcsXG4gICAgICAgICdmdW5jdGlvbicsXG4gICAgICAgICdlcnJvcicsXG4gICAgICAgICdib29sZWFuJyxcbiAgICAgICAgJ2lkZW50aWZpZXInLFxuICAgICAgICAnbGFiZWwnLFxuICAgICAgICAnZXhjZXB0aW9uJyxcbiAgICAgICAgJ2tleXdvcmQnLFxuICAgICAgICAnZGVidWcnLFxuXG4gICAgICAgICdjdXJzb3InLFxuICAgICAgICAnc2VsZWN0aW9uJyxcbiAgICAgICAgJ3NlbGVjdGlvbl91bmZvY3VzZWQnLFxuXG4gICAgICAgICd0ZXh0JyxcbiAgICAgICAgJ2JhY2tncm91bmQnLFxuICAgIF0pO1xuXG4gICAgLy8gTG9hZCB0aGUgZGVmYXVsdCBzdHlsZS5cbiAgICB0aGlzLmxvYWQoJ21vbm9rYWknKTtcbn07XG51dGlscy5pbmhlcml0KFN0eWxlLCB1dGlscy5Qb3N0ZXJDbGFzcyk7XG5cbi8qKlxuICogTG9hZCBhIHJlbmRlcmluZyBzdHlsZVxuICogQHBhcmFtICB7c3RyaW5nIG9yIGRpY3Rpb25hcnl9IHN0eWxlIC0gbmFtZSBvZiB0aGUgYnVpbHQtaW4gc3R5bGUgXG4gKiAgICAgICAgIG9yIHN0eWxlIGRpY3Rpb25hcnkgaXRzZWxmLlxuICogQHJldHVybiB7Ym9vbGVhbn0gc3VjY2Vzc1xuICovXG5TdHlsZS5wcm90b3R5cGUubG9hZCA9IGZ1bmN0aW9uKHN0eWxlKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gTG9hZCB0aGUgc3R5bGUgaWYgaXQncyBidWlsdC1pbi5cbiAgICAgICAgaWYgKHN0eWxlcy5zdHlsZXNbc3R5bGVdKSB7XG4gICAgICAgICAgICBzdHlsZSA9IHN0eWxlcy5zdHlsZXNbc3R5bGVdLnN0eWxlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVhZCBlYWNoIGF0dHJpYnV0ZSBvZiB0aGUgc3R5bGUuXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBzdHlsZSkge1xuICAgICAgICAgICAgaWYgKHN0eWxlLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgICAgICB0aGlzW2tleV0gPSBzdHlsZVtrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGxvYWRpbmcgc3R5bGUnLCBlKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn07XG5cbmV4cG9ydHMuU3R5bGUgPSBTdHlsZTsiLCJleHBvcnRzLnN0eWxlcyA9IHtcbiAgICBcIm1vbm9rYWlcIjogcmVxdWlyZShcIi4vbW9ub2thaS5qc1wiKSxcbn07XG4iLCJleHBvcnRzLnN0eWxlID0ge1xuICAgIGNvbW1lbnQ6ICcjNzU3MTVFJyxcbiAgICB0b2RvOiAnI0ZGRkZGRicsIC8vIEJPTERcbiAgICBzcGVjaWFsOiAnIzY2RDlFRicsXG4gICAgc3RyaW5nOiAnI0U2REI3NCcsXG4gICAgY2hhcmFjdGVyOiAnI0U2REI3NCcsXG4gICAgY29uZGl0aW9uYWw6ICcjRjkyNjcyJywgLy8gQk9MRFxuICAgIHJlcGVhdDogJyNGOTI2NzInLFxuICAgIG9wZXJhdG9yOiAnI0Y5MjY3MicsXG4gICAgdHlwZTogJyM2NkQ5RUYnLFxuICAgIHN0YXRlbWVudDogJyNGOTI2NzInLFxuICAgIGZ1bmN0aW9uOiAnI0E2RTIyRScsXG4gICAgZXJyb3I6ICcjRTZEQjc0JywgLy8gQkc6ICMxRTAwMTBcbiAgICBib29sZWFuOiAnI0FFODFGRicsXG4gICAgaWRlbnRpZmllcjogJyNGRDk3MUYnLFxuICAgIGxhYmVsOiAnI0U2REI3NCcsXG4gICAgZXhjZXB0aW9uOiAnI0E2RTIyRScsXG4gICAga2V5d29yZDogJyNGOTI2NzInLFxuICAgIGRlYnVnOiAnI0JDQTNBMycsIC8vIEJPTERcblxuICAgIGN1cnNvcjogJyNGOEY4RjInLFxuICAgIGN1cnNvcl93aWR0aDogMS4wLFxuICAgIGN1cnNvcl9oZWlnaHQ6IDEuMSxcbiAgICBzZWxlY3Rpb246ICcjNDY1NDU3JyxcbiAgICBzZWxlY3Rpb25fdW5mb2N1c2VkOiAnIzM2NDQ0NycsXG5cbiAgICB0ZXh0OiAnI0Y4RjhGMicsXG4gICAgYmFja2dyb3VuZDogJyMzMzMzMzMnLFxufTsiLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG4vKipcbiAqIEJhc2UgY2xhc3Mgd2l0aCBoZWxwZnVsIHV0aWxpdGllc1xuICogQHBhcmFtIHthcnJheX0gW2V2ZW50ZnVsX3Byb3BlcnRpZXNdIGxpc3Qgb2YgcHJvcGVydHkgbmFtZXMgKHN0cmluZ3MpXG4gKiAgICAgICAgICAgICAgICB0byBjcmVhdGUgYW5kIHdpcmUgY2hhbmdlIGV2ZW50cyB0by5cbiAqL1xudmFyIFBvc3RlckNsYXNzID0gZnVuY3Rpb24oZXZlbnRmdWxfcHJvcGVydGllcykge1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHRoaXMuX29uX2FsbCA9IFtdO1xuXG4gICAgLy8gQ29uc3RydWN0IGV2ZW50ZnVsIHByb3BlcnRpZXMuXG4gICAgaWYgKGV2ZW50ZnVsX3Byb3BlcnRpZXMgJiYgZXZlbnRmdWxfcHJvcGVydGllcy5sZW5ndGg+MCkge1xuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgIGZvciAodmFyIGk9MDsgaTxldmVudGZ1bF9wcm9wZXJ0aWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAoZnVuY3Rpb24obmFtZSkge1xuICAgICAgICAgICAgICAgIHRoYXQucHJvcGVydHkobmFtZSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGF0WydfJyArIG5hbWVdO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQudHJpZ2dlcignY2hhbmdlOicgKyBuYW1lLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQudHJpZ2dlcignY2hhbmdlJywgbmFtZSwgdmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB0aGF0WydfJyArIG5hbWVdID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQudHJpZ2dlcignY2hhbmdlZDonICsgbmFtZSk7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQudHJpZ2dlcignY2hhbmdlZCcsIG5hbWUpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkoZXZlbnRmdWxfcHJvcGVydGllc1tpXSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vKipcbiAqIERlZmluZSBhIHByb3BlcnR5IGZvciB0aGUgY2xhc3NcbiAqIEBwYXJhbSAge3N0cmluZ30gbmFtZVxuICogQHBhcmFtICB7ZnVuY3Rpb259IGdldHRlclxuICogQHBhcmFtICB7ZnVuY3Rpb259IHNldHRlclxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuUG9zdGVyQ2xhc3MucHJvdG90eXBlLnByb3BlcnR5ID0gZnVuY3Rpb24obmFtZSwgZ2V0dGVyLCBzZXR0ZXIpIHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgbmFtZSwge1xuICAgICAgICBnZXQ6IGdldHRlcixcbiAgICAgICAgc2V0OiBzZXR0ZXIsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH0pO1xufTtcblxuLyoqXG4gKiBSZWdpc3RlciBhbiBldmVudCBsaXN0ZW5lclxuICogQHBhcmFtICB7c3RyaW5nfSBldmVudFxuICogQHBhcmFtICB7ZnVuY3Rpb259IGhhbmRsZXJcbiAqIEBwYXJhbSAge29iamVjdH0gY29udGV4dFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuUG9zdGVyQ2xhc3MucHJvdG90eXBlLm9uID0gZnVuY3Rpb24oZXZlbnQsIGhhbmRsZXIsIGNvbnRleHQpIHtcbiAgICBldmVudCA9IGV2ZW50LnRyaW0oKS50b0xvd2VyQ2FzZSgpO1xuXG4gICAgLy8gTWFrZSBzdXJlIGEgbGlzdCBmb3IgdGhlIGV2ZW50IGV4aXN0cy5cbiAgICBpZiAoIXRoaXMuX2V2ZW50c1tldmVudF0pIHsgdGhpcy5fZXZlbnRzW2V2ZW50XSA9IFtdOyB9XG5cbiAgICAvLyBQdXNoIHRoZSBoYW5kbGVyIGFuZCB0aGUgY29udGV4dCB0byB0aGUgZXZlbnQncyBjYWxsYmFjayBsaXN0LlxuICAgIHRoaXMuX2V2ZW50c1tldmVudF0ucHVzaChbaGFuZGxlciwgY29udGV4dF0pO1xufTtcblxuLyoqXG4gKiBVbnJlZ2lzdGVyIG9uZSBvciBhbGwgZXZlbnQgbGlzdGVuZXJzIGZvciBhIHNwZWNpZmljIGV2ZW50XG4gKiBAcGFyYW0gIHtzdHJpbmd9IGV2ZW50XG4gKiBAcGFyYW0gIHtjYWxsYmFja30gKG9wdGlvbmFsKSBoYW5kbGVyXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Qb3N0ZXJDbGFzcy5wcm90b3R5cGUub2ZmID0gZnVuY3Rpb24oZXZlbnQsIGhhbmRsZXIpIHtcbiAgICBldmVudCA9IGV2ZW50LnRyaW0oKS50b0xvd2VyQ2FzZSgpO1xuICAgIFxuICAgIC8vIElmIGEgaGFuZGxlciBpcyBzcGVjaWZpZWQsIHJlbW92ZSBhbGwgdGhlIGNhbGxiYWNrc1xuICAgIC8vIHdpdGggdGhhdCBoYW5kbGVyLiAgT3RoZXJ3aXNlLCBqdXN0IHJlbW92ZSBhbGwgb2ZcbiAgICAvLyB0aGUgcmVnaXN0ZXJlZCBjYWxsYmFja3MuXG4gICAgaWYgKGhhbmRsZXIpIHtcbiAgICAgICAgdGhpcy5fZXZlbnRzW2V2ZW50XSA9IHRoaXMuX2V2ZW50c1tldmVudF0uZmlsdGVyKGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2tbMF0gIT09IGhhbmRsZXI7XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX2V2ZW50c1tldmVudF0gPSBbXTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFJlZ2lzdGVyIGEgZ2xvYmFsIGV2ZW50IGhhbmRsZXIuIFxuICogXG4gKiBBIGdsb2JhbCBldmVudCBoYW5kbGVyIGZpcmVzIGZvciBhbnkgZXZlbnQgdGhhdCdzXG4gKiB0cmlnZ2VyZWQuXG4gKiBAcGFyYW0gIHtzdHJpbmd9IGhhbmRsZXIgLSBmdW5jdGlvbiB0aGF0IGFjY2VwdHMgb25lXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcmd1bWVudCwgdGhlIG5hbWUgb2YgdGhlXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudCxcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblBvc3RlckNsYXNzLnByb3RvdHlwZS5vbl9hbGwgPSBmdW5jdGlvbihoYW5kbGVyKSB7XG4gICAgdmFyIGluZGV4ID0gdGhpcy5fb25fYWxsLmluZGV4T2YoaGFuZGxlcik7XG4gICAgaWYgKGluZGV4ID09PSAtMSkge1xuICAgICAgICB0aGlzLl9vbl9hbGwucHVzaChoYW5kbGVyKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFVucmVnaXN0ZXIgYSBnbG9iYWwgZXZlbnQgaGFuZGxlci5cbiAqIEBwYXJhbSAge1t0eXBlXX0gaGFuZGxlclxuICogQHJldHVybiB7Ym9vbGVhbn0gdHJ1ZSBpZiBhIGhhbmRsZXIgd2FzIHJlbW92ZWRcbiAqL1xuUG9zdGVyQ2xhc3MucHJvdG90eXBlLm9mZl9hbGwgPSBmdW5jdGlvbihoYW5kbGVyKSB7XG4gICAgdmFyIGluZGV4ID0gdGhpcy5fb25fYWxsLmluZGV4T2YoaGFuZGxlcik7XG4gICAgaWYgKGluZGV4ICE9IC0xKSB7XG4gICAgICAgIHRoaXMuX29uX2FsbC5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufTtcblxuLyoqXG4gKiBUcmlnZ2VycyB0aGUgY2FsbGJhY2tzIG9mIGFuIGV2ZW50IHRvIGZpcmUuXG4gKiBAcGFyYW0gIHtzdHJpbmd9IGV2ZW50XG4gKiBAcmV0dXJuIHthcnJheX0gYXJyYXkgb2YgcmV0dXJuIHZhbHVlc1xuICovXG5Qb3N0ZXJDbGFzcy5wcm90b3R5cGUudHJpZ2dlciA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgZXZlbnQgPSBldmVudC50cmltKCkudG9Mb3dlckNhc2UoKTtcblxuICAgIC8vIENvbnZlcnQgYXJndW1lbnRzIHRvIGFuIGFycmF5IGFuZCBjYWxsIGNhbGxiYWNrcy5cbiAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgYXJncy5zcGxpY2UoMCwxKTtcblxuICAgIC8vIFRyaWdnZXIgZ2xvYmFsIGhhbmRsZXJzIGZpcnN0LlxuICAgIHRoaXMuX29uX2FsbC5mb3JFYWNoKGZ1bmN0aW9uKGhhbmRsZXIpIHtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBbZXZlbnRdLmNvbmNhdChhcmdzKSk7XG4gICAgfSk7XG5cbiAgICAvLyBUcmlnZ2VyIGluZGl2aWR1YWwgaGFuZGxlcnMgc2Vjb25kLlxuICAgIHZhciBldmVudHMgPSB0aGlzLl9ldmVudHNbZXZlbnRdO1xuICAgIGlmIChldmVudHMpIHtcbiAgICAgICAgdmFyIHJldHVybnMgPSBbXTtcbiAgICAgICAgZXZlbnRzLmZvckVhY2goZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHJldHVybnMucHVzaChjYWxsYmFja1swXS5hcHBseShjYWxsYmFja1sxXSwgYXJncykpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHJldHVybnM7XG4gICAgfVxuICAgIHJldHVybiBbXTtcbn07XG5cbi8qKlxuICogQ2F1c2Ugb25lIGNsYXNzIHRvIGluaGVyaXQgZnJvbSBhbm90aGVyXG4gKiBAcGFyYW0gIHt0eXBlfSBjaGlsZFxuICogQHBhcmFtICB7dHlwZX0gcGFyZW50XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG52YXIgaW5oZXJpdCA9IGZ1bmN0aW9uKGNoaWxkLCBwYXJlbnQpIHtcbiAgICBjaGlsZC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHBhcmVudC5wcm90b3R5cGUsIHt9KTtcbn07XG5cbi8qKlxuICogQ2hlY2tzIGlmIGEgdmFsdWUgaXMgY2FsbGFibGVcbiAqIEBwYXJhbSAge2FueX0gdmFsdWVcbiAqIEByZXR1cm4ge2Jvb2xlYW59XG4gKi9cbnZhciBjYWxsYWJsZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PSAnZnVuY3Rpb24nO1xufTtcblxuLyoqXG4gKiBDYWxscyB0aGUgdmFsdWUgaWYgaXQncyBjYWxsYWJsZSBhbmQgcmV0dXJucyBpdCdzIHJldHVybi5cbiAqIE90aGVyd2lzZSByZXR1cm5zIHRoZSB2YWx1ZSBhcy1pcy5cbiAqIEBwYXJhbSAge2FueX0gdmFsdWVcbiAqIEByZXR1cm4ge2FueX1cbiAqL1xudmFyIHJlc29sdmVfY2FsbGFibGUgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIGlmIChjYWxsYWJsZSh2YWx1ZSkpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlLmNhbGwodGhpcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhIHByb3h5IHRvIGEgZnVuY3Rpb24gc28gaXQgaXMgY2FsbGVkIGluIHRoZSBjb3JyZWN0IGNvbnRleHQuXG4gKiBAcmV0dXJuIHtmdW5jdGlvbn0gcHJveGllZCBmdW5jdGlvbi5cbiAqL1xudmFyIHByb3h5ID0gZnVuY3Rpb24oZiwgY29udGV4dCkge1xuICAgIGlmIChmPT09dW5kZWZpbmVkKSB7IHRocm93IG5ldyBFcnJvcignZiBjYW5ub3QgYmUgdW5kZWZpbmVkJyk7IH1cbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7IHJldHVybiBmLmFwcGx5KGNvbnRleHQsIGFyZ3VtZW50cyk7IH07XG59O1xuXG4vKipcbiAqIENsZWFycyBhbiBhcnJheSBpbiBwbGFjZS5cbiAqXG4gKiBEZXNwaXRlIGFuIE8oTikgY29tcGxleGl0eSwgdGhpcyBzZWVtcyB0byBiZSB0aGUgZmFzdGVzdCB3YXkgdG8gY2xlYXJcbiAqIGEgbGlzdCBpbiBwbGFjZSBpbiBKYXZhc2NyaXB0LiBcbiAqIEJlbmNobWFyazogaHR0cDovL2pzcGVyZi5jb20vZW1wdHktamF2YXNjcmlwdC1hcnJheVxuICogQ29tcGxleGl0eTogTyhOKVxuICogQHBhcmFtICB7YXJyYXl9IGFycmF5XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG52YXIgY2xlYXJfYXJyYXkgPSBmdW5jdGlvbihhcnJheSkge1xuICAgIHdoaWxlIChhcnJheS5sZW5ndGggPiAwKSB7XG4gICAgICAgIGFycmF5LnBvcCgpO1xuICAgIH1cbn07XG5cbi8qKlxuICogQ2hlY2tzIGlmIGEgdmFsdWUgaXMgYW4gYXJyYXlcbiAqIEBwYXJhbSAge2FueX0geFxuICogQHJldHVybiB7Ym9vbGVhbn0gdHJ1ZSBpZiB2YWx1ZSBpcyBhbiBhcnJheVxuICovXG52YXIgaXNfYXJyYXkgPSBmdW5jdGlvbih4KSB7XG4gICAgcmV0dXJuIHggaW5zdGFuY2VvZiBBcnJheTtcbn07XG5cbi8qKlxuICogRmluZCB0aGUgY2xvc2VzdCB2YWx1ZSBpbiBhIGxpc3RcbiAqIFxuICogSW50ZXJwb2xhdGlvbiBzZWFyY2ggYWxnb3JpdGhtLiAgXG4gKiBDb21wbGV4aXR5OiBPKGxnKGxnKE4pKSlcbiAqIEBwYXJhbSAge2FycmF5fSBzb3J0ZWQgLSBzb3J0ZWQgYXJyYXkgb2YgbnVtYmVyc1xuICogQHBhcmFtICB7ZmxvYXR9IHggLSBudW1iZXIgdG8gdHJ5IHRvIGZpbmRcbiAqIEByZXR1cm4ge2ludGVnZXJ9IGluZGV4IG9mIHRoZSB2YWx1ZSB0aGF0J3MgY2xvc2VzdCB0byB4XG4gKi9cbnZhciBmaW5kX2Nsb3Nlc3QgPSBmdW5jdGlvbihzb3J0ZWQsIHgpIHtcbiAgICB2YXIgbWluID0gc29ydGVkWzBdO1xuICAgIHZhciBtYXggPSBzb3J0ZWRbc29ydGVkLmxlbmd0aC0xXTtcbiAgICBpZiAoeCA8IG1pbikgcmV0dXJuIDA7XG4gICAgaWYgKHggPiBtYXgpIHJldHVybiBzb3J0ZWQubGVuZ3RoLTE7XG4gICAgaWYgKHNvcnRlZC5sZW5ndGggPT0gMikge1xuICAgICAgICBpZiAobWF4IC0geCA+IHggLSBtaW4pIHtcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdmFyIHJhdGUgPSAobWF4IC0gbWluKSAvIHNvcnRlZC5sZW5ndGg7XG4gICAgaWYgKHJhdGUgPT09IDApIHJldHVybiAwO1xuICAgIHZhciBndWVzcyA9IE1hdGguZmxvb3IoeCAvIHJhdGUpO1xuICAgIGlmIChzb3J0ZWRbZ3Vlc3NdID09IHgpIHtcbiAgICAgICAgcmV0dXJuIGd1ZXNzO1xuICAgIH0gZWxzZSBpZiAoZ3Vlc3MgPiAwICYmIHNvcnRlZFtndWVzcy0xXSA8IHggJiYgeCA8IHNvcnRlZFtndWVzc10pIHtcbiAgICAgICAgcmV0dXJuIGZpbmRfY2xvc2VzdChzb3J0ZWQuc2xpY2UoZ3Vlc3MtMSwgZ3Vlc3MrMSksIHgpICsgZ3Vlc3MtMTtcbiAgICB9IGVsc2UgaWYgKGd1ZXNzIDwgc29ydGVkLmxlbmd0aC0xICYmIHNvcnRlZFtndWVzc10gPCB4ICYmIHggPCBzb3J0ZWRbZ3Vlc3MrMV0pIHtcbiAgICAgICAgcmV0dXJuIGZpbmRfY2xvc2VzdChzb3J0ZWQuc2xpY2UoZ3Vlc3MsIGd1ZXNzKzIpLCB4KSArIGd1ZXNzO1xuICAgIH0gZWxzZSBpZiAoc29ydGVkW2d1ZXNzXSA+IHgpIHtcbiAgICAgICAgcmV0dXJuIGZpbmRfY2xvc2VzdChzb3J0ZWQuc2xpY2UoMCwgZ3Vlc3MpLCB4KTtcbiAgICB9IGVsc2UgaWYgKHNvcnRlZFtndWVzc10gPCB4KSB7XG4gICAgICAgIHJldHVybiBmaW5kX2Nsb3Nlc3Qoc29ydGVkLnNsaWNlKGd1ZXNzKzEpLCB4KSArIGd1ZXNzKzE7XG4gICAgfVxufTtcblxuLyoqXG4gKiBNYWtlIGEgc2hhbGxvdyBjb3B5IG9mIGEgZGljdGlvbmFyeS5cbiAqIEBwYXJhbSAge2RpY3Rpb25hcnl9IHhcbiAqIEByZXR1cm4ge2RpY3Rpb25hcnl9XG4gKi9cbnZhciBzaGFsbG93X2NvcHkgPSBmdW5jdGlvbih4KSB7XG4gICAgdmFyIHkgPSB7fTtcbiAgICBmb3IgKHZhciBrZXkgaW4geCkge1xuICAgICAgICBpZiAoeC5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICB5W2tleV0gPSB4W2tleV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHk7XG59O1xuXG4vKipcbiAqIEhvb2tzIGEgZnVuY3Rpb24uXG4gKiBAcGFyYW0gIHtvYmplY3R9IG9iaiAtIG9iamVjdCB0byBob29rXG4gKiBAcGFyYW0gIHtzdHJpbmd9IG1ldGhvZCAtIG5hbWUgb2YgdGhlIGZ1bmN0aW9uIHRvIGhvb2tcbiAqIEBwYXJhbSAge2Z1bmN0aW9ufSBob29rIC0gZnVuY3Rpb24gdG8gY2FsbCBiZWZvcmUgdGhlIG9yaWdpbmFsXG4gKiBAcmV0dXJuIHtvYmplY3R9IGhvb2sgcmVmZXJlbmNlLCBvYmplY3Qgd2l0aCBhbiBgdW5ob29rYCBtZXRob2RcbiAqL1xudmFyIGhvb2sgPSBmdW5jdGlvbihvYmosIG1ldGhvZCwgaG9vaykge1xuXG4gICAgLy8gSWYgdGhlIG9yaWdpbmFsIGhhcyBhbHJlYWR5IGJlZW4gaG9va2VkLCBhZGQgdGhpcyBob29rIHRvIHRoZSBsaXN0IFxuICAgIC8vIG9mIGhvb2tzLlxuICAgIGlmIChvYmpbbWV0aG9kXSAmJiBvYmpbbWV0aG9kXS5vcmlnaW5hbCAmJiBvYmpbbWV0aG9kXS5ob29rcykge1xuICAgICAgICBvYmpbbWV0aG9kXS5ob29rcy5wdXNoKGhvb2spO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIENyZWF0ZSB0aGUgaG9va2VkIGZ1bmN0aW9uXG4gICAgICAgIHZhciBob29rcyA9IFtob29rXTtcbiAgICAgICAgdmFyIG9yaWdpbmFsID0gb2JqW21ldGhvZF07XG4gICAgICAgIHZhciBob29rZWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgICAgICAgdmFyIHJldDtcbiAgICAgICAgICAgIHZhciByZXN1bHRzO1xuICAgICAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICAgICAgaG9va3MuZm9yRWFjaChmdW5jdGlvbihob29rKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0cyA9IGhvb2suYXBwbHkodGhhdCwgYXJncyk7XG4gICAgICAgICAgICAgICAgcmV0ID0gcmV0ICE9PSB1bmRlZmluZWQgPyByZXQgOiByZXN1bHRzO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAob3JpZ2luYWwpIHtcbiAgICAgICAgICAgICAgICByZXN1bHRzID0gb3JpZ2luYWwuYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmV0ICE9PSB1bmRlZmluZWQgPyByZXQgOiByZXN1bHRzO1xuICAgICAgICB9O1xuICAgICAgICBob29rZWQub3JpZ2luYWwgPSBvcmlnaW5hbDtcbiAgICAgICAgaG9va2VkLmhvb2tzID0gaG9va3M7XG4gICAgICAgIG9ialttZXRob2RdID0gaG9va2VkO1xuICAgIH1cblxuICAgIC8vIFJldHVybiB1bmhvb2sgbWV0aG9kLlxuICAgIHJldHVybiB7XG4gICAgICAgIHVuaG9vazogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgaW5kZXggPSBvYmpbbWV0aG9kXS5ob29rcy5pbmRleE9mKGhvb2spO1xuICAgICAgICAgICAgaWYgKGluZGV4ICE9IC0xKSB7XG4gICAgICAgICAgICAgICAgb2JqW21ldGhvZF0uaG9va3Muc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKG9ialttZXRob2RdLmhvb2tzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIG9ialttZXRob2RdID0gb2JqW21ldGhvZF0ub3JpZ2luYWw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgfTtcbiAgICBcbn07XG5cbi8qKlxuICogQ2FuY2VscyBldmVudCBidWJibGluZy5cbiAqIEBwYXJhbSAge2V2ZW50fSBlXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG52YXIgY2FuY2VsX2J1YmJsZSA9IGZ1bmN0aW9uKGUpIHtcbiAgICBpZiAoZS5zdG9wUHJvcGFnYXRpb24pIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgaWYgKGUuY2FuY2VsQnViYmxlICE9PSBudWxsKSBlLmNhbmNlbEJ1YmJsZSA9IHRydWU7XG4gICAgaWYgKGUucHJldmVudERlZmF1bHQpIGUucHJldmVudERlZmF1bHQoKTtcbn07XG5cbi8qKlxuICogR2VuZXJhdGVzIGEgcmFuZG9tIGNvbG9yIHN0cmluZ1xuICogQHJldHVybiB7c3RyaW5nfSBoZXhhZGVjaW1hbCBjb2xvciBzdHJpbmdcbiAqL1xudmFyIHJhbmRvbV9jb2xvciA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciByYW5kb21fYnl0ZSA9IGZ1bmN0aW9uKCkgeyBcbiAgICAgICAgdmFyIGIgPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAyNTUpLnRvU3RyaW5nKDE2KTtcbiAgICAgICAgcmV0dXJuIGIubGVuZ3RoID09IDEgPyAnMCcgKyBiIDogYjtcbiAgICB9O1xuICAgIHJldHVybiAnIycgKyByYW5kb21fYnl0ZSgpICsgcmFuZG9tX2J5dGUoKSArIHJhbmRvbV9ieXRlKCk7XG59O1xuXG4vKipcbiAqIENvbXBhcmUgdHdvIGFycmF5cyBieSBjb250ZW50cyBmb3IgZXF1YWxpdHkuXG4gKiBAcGFyYW0gIHthcnJheX0geFxuICogQHBhcmFtICB7YXJyYXl9IHlcbiAqIEByZXR1cm4ge2Jvb2xlYW59XG4gKi9cbnZhciBjb21wYXJlX2FycmF5cyA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICBpZiAoeC5sZW5ndGggIT0geS5sZW5ndGgpIHJldHVybiBmYWxzZTtcbiAgICBmb3IgKGk9MDsgaTx4Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmICh4W2ldIT09eVtpXSkgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogRmluZCBhbGwgdGhlIG9jY3VyYW5jZXMgb2YgYSByZWd1bGFyIGV4cHJlc3Npb24gaW5zaWRlIGEgc3RyaW5nLlxuICogQHBhcmFtICB7c3RyaW5nfSB0ZXh0IC0gc3RyaW5nIHRvIGxvb2sgaW5cbiAqIEBwYXJhbSAge3N0cmluZ30gcmUgLSByZWd1bGFyIGV4cHJlc3Npb24gdG8gZmluZFxuICogQHJldHVybiB7YXJyYXl9IGFycmF5IG9mIFtzdGFydF9pbmRleCwgZW5kX2luZGV4XSBwYWlyc1xuICovXG52YXIgZmluZGFsbCA9IGZ1bmN0aW9uKHRleHQsIHJlLCBmbGFncykge1xuICAgIHJlID0gbmV3IFJlZ0V4cChyZSwgZmxhZ3MgfHwgJ2dtJyk7XG4gICAgdmFyIHJlc3VsdHM7XG4gICAgdmFyIGZvdW5kID0gW107XG4gICAgd2hpbGUgKChyZXN1bHRzID0gcmUuZXhlYyh0ZXh0KSkgIT09IG51bGwpIHtcbiAgICAgICAgZm91bmQucHVzaChbcmVzdWx0cy5pbmRleCwgcmVzdWx0cy5pbmRleCArIHJlc3VsdHNbMF0ubGVuZ3RoXSk7XG4gICAgfVxuICAgIHJldHVybiBmb3VuZDtcbn07XG5cbi8vIEV4cG9ydCBuYW1lcy5cbmV4cG9ydHMuUG9zdGVyQ2xhc3MgPSBQb3N0ZXJDbGFzcztcbmV4cG9ydHMuaW5oZXJpdCA9IGluaGVyaXQ7XG5leHBvcnRzLmNhbGxhYmxlID0gY2FsbGFibGU7XG5leHBvcnRzLnJlc29sdmVfY2FsbGFibGUgPSByZXNvbHZlX2NhbGxhYmxlO1xuZXhwb3J0cy5wcm94eSA9IHByb3h5O1xuZXhwb3J0cy5jbGVhcl9hcnJheSA9IGNsZWFyX2FycmF5O1xuZXhwb3J0cy5pc19hcnJheSA9IGlzX2FycmF5O1xuZXhwb3J0cy5maW5kX2Nsb3Nlc3QgPSBmaW5kX2Nsb3Nlc3Q7XG5leHBvcnRzLnNoYWxsb3dfY29weSA9IHNoYWxsb3dfY29weTtcbmV4cG9ydHMuaG9vayA9IGhvb2s7XG5leHBvcnRzLmNhbmNlbF9idWJibGUgPSBjYW5jZWxfYnViYmxlO1xuZXhwb3J0cy5yYW5kb21fY29sb3IgPSByYW5kb21fY29sb3I7XG5leHBvcnRzLmNvbXBhcmVfYXJyYXlzID0gY29tcGFyZV9hcnJheXM7XG5leHBvcnRzLmZpbmRhbGwgPSBmaW5kYWxsO1xuIl19
