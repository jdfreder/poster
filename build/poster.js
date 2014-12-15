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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzb3VyY2UvanMvcG9zdGVyLmpzIiwic291cmNlL2pzL2FuaW1hdG9yLmpzIiwic291cmNlL2pzL2NhbnZhcy5qcyIsInNvdXJjZS9qcy9jbGlwYm9hcmQuanMiLCJzb3VyY2UvanMvY3Vyc29yLmpzIiwic291cmNlL2pzL2N1cnNvcnMuanMiLCJzb3VyY2UvanMvZG9jdW1lbnRfY29udHJvbGxlci5qcyIsInNvdXJjZS9qcy9kb2N1bWVudF9tb2RlbC5qcyIsInNvdXJjZS9qcy9kb2N1bWVudF92aWV3LmpzIiwic291cmNlL2pzL2V2ZW50cy9kZWZhdWx0LmpzIiwic291cmNlL2pzL2V2ZW50cy9tYXAuanMiLCJzb3VyY2UvanMvZXZlbnRzL25vcm1hbGl6ZXIuanMiLCJzb3VyY2UvanMvaGlnaGxpZ2h0ZXJzL2hpZ2hsaWdodGVyLmpzIiwic291cmNlL2pzL2hpZ2hsaWdodGVycy9zeW50YXguanMiLCJzb3VyY2UvanMvaGlnaGxpZ2h0ZXJzL3N5bnRheC9pbml0LmpzIiwic291cmNlL2pzL2hpZ2hsaWdodGVycy9zeW50YXgvamF2YXNjcmlwdC5qcyIsInNvdXJjZS9qcy9oaWdobGlnaHRlcnMvc3ludGF4L3ZiLmpzIiwic291cmNlL2pzL3JlbmRlcmVycy9iYXRjaC5qcyIsInNvdXJjZS9qcy9yZW5kZXJlcnMvY29sb3IuanMiLCJzb3VyY2UvanMvcmVuZGVyZXJzL2N1cnNvcnMuanMiLCJzb3VyY2UvanMvcmVuZGVyZXJzL2hpZ2hsaWdodGVkX3Jvdy5qcyIsInNvdXJjZS9qcy9yZW5kZXJlcnMvcmVuZGVyZXIuanMiLCJzb3VyY2UvanMvcmVuZGVyZXJzL3Jvdy5qcyIsInNvdXJjZS9qcy9yZW5kZXJlcnMvc2VsZWN0aW9ucy5qcyIsInNvdXJjZS9qcy9zY3JvbGxpbmdfY2FudmFzLmpzIiwic291cmNlL2pzL3N0eWxlLmpzIiwic291cmNlL2pzL3N0eWxlcy9pbml0LmpzIiwic291cmNlL2pzL3N0eWxlcy9tb25va2FpLmpzIiwic291cmNlL2pzL3V0aWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xhQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6WUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDclRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaE9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzcvR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9GQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgc2Nyb2xsaW5nX2NhbnZhcyA9IHJlcXVpcmUoJy4vc2Nyb2xsaW5nX2NhbnZhcy5qcycpO1xudmFyIGRvY3VtZW50X2NvbnRyb2xsZXIgPSByZXF1aXJlKCcuL2RvY3VtZW50X2NvbnRyb2xsZXIuanMnKTtcbnZhciBkb2N1bWVudF9tb2RlbCA9IHJlcXVpcmUoJy4vZG9jdW1lbnRfbW9kZWwuanMnKTtcbnZhciBkb2N1bWVudF92aWV3ID0gcmVxdWlyZSgnLi9kb2N1bWVudF92aWV3LmpzJyk7XG52YXIgc3R5bGUgPSByZXF1aXJlKCcuL3N0eWxlLmpzJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG5cbi8qKlxuICogQ2FudmFzIGJhc2VkIHRleHQgZWRpdG9yXG4gKi9cbnZhciBQb3N0ZXIgPSBmdW5jdGlvbigpIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuXG4gICAgLy8gQ3JlYXRlIGNhbnZhc1xuICAgIHRoaXMuY2FudmFzID0gbmV3IHNjcm9sbGluZ19jYW52YXMuU2Nyb2xsaW5nQ2FudmFzKCk7XG4gICAgdGhpcy5lbCA9IHRoaXMuY2FudmFzLmVsOyAvLyBDb252ZW5pZW5jZVxuICAgIHRoaXMuX3N0eWxlID0gbmV3IHN0eWxlLlN0eWxlKCk7XG4gICAgdGhpcy5fY29uZmlnID0gbmV3IHV0aWxzLlBvc3RlckNsYXNzKFsnaGlnaGxpZ2h0X2RyYXcnXSk7XG5cbiAgICAvLyBDcmVhdGUgbW9kZWwsIGNvbnRyb2xsZXIsIGFuZCB2aWV3LlxuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLm1vZGVsID0gbmV3IGRvY3VtZW50X21vZGVsLkRvY3VtZW50TW9kZWwoKTtcbiAgICB0aGlzLmNvbnRyb2xsZXIgPSBuZXcgZG9jdW1lbnRfY29udHJvbGxlci5Eb2N1bWVudENvbnRyb2xsZXIodGhpcy5jYW52YXMuZWwsIHRoaXMubW9kZWwpO1xuICAgIHRoaXMudmlldyA9IG5ldyBkb2N1bWVudF92aWV3LkRvY3VtZW50VmlldyhcbiAgICAgICAgdGhpcy5jYW52YXMsIFxuICAgICAgICB0aGlzLm1vZGVsLCBcbiAgICAgICAgdGhpcy5jb250cm9sbGVyLmN1cnNvcnMsIFxuICAgICAgICB0aGlzLl9zdHlsZSxcbiAgICAgICAgdGhpcy5fY29uZmlnLFxuICAgICAgICBmdW5jdGlvbigpIHsgcmV0dXJuIHRoYXQuY29udHJvbGxlci5jbGlwYm9hcmQuaGlkZGVuX2lucHV0ID09PSBkb2N1bWVudC5hY3RpdmVFbGVtZW50IHx8IHRoYXQuY2FudmFzLmZvY3VzZWQ7IH1cbiAgICApO1xuXG4gICAgLy8gQ3JlYXRlIHByb3BlcnRpZXNcbiAgICB0aGlzLnByb3BlcnR5KCdzdHlsZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC5fc3R5bGU7XG4gICAgfSk7XG4gICAgdGhpcy5wcm9wZXJ0eSgnY29uZmlnJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Ll9jb25maWc7XG4gICAgfSk7XG4gICAgdGhpcy5wcm9wZXJ0eSgndmFsdWUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoYXQubW9kZWwudGV4dDtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0Lm1vZGVsLnRleHQgPSB2YWx1ZTtcbiAgICB9KTtcbiAgICB0aGlzLnByb3BlcnR5KCd3aWR0aCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC52aWV3LndpZHRoO1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQudmlldy53aWR0aCA9IHZhbHVlO1xuICAgIH0pO1xuICAgIHRoaXMucHJvcGVydHkoJ2hlaWdodCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC52aWV3LmhlaWdodDtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0LnZpZXcuaGVpZ2h0ID0gdmFsdWU7XG4gICAgfSk7XG4gICAgdGhpcy5wcm9wZXJ0eSgnbGFuZ3VhZ2UnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoYXQudmlldy5sYW5ndWFnZTtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0LnZpZXcubGFuZ3VhZ2UgPSB2YWx1ZTtcbiAgICB9KTtcbn07XG51dGlscy5pbmhlcml0KFBvc3RlciwgdXRpbHMuUG9zdGVyQ2xhc3MpO1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLlBvc3RlciA9IFBvc3RlcjtcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKTtcblxuLyoqXG4gKiBBbmltYXRpb24gaGVscGVyLlxuICovXG52YXIgQW5pbWF0b3IgPSBmdW5jdGlvbihkdXJhdGlvbikge1xuICAgIHV0aWxzLlBvc3RlckNsYXNzLmNhbGwodGhpcyk7XG4gICAgdGhpcy5kdXJhdGlvbiA9IGR1cmF0aW9uO1xuICAgIHRoaXMuX3N0YXJ0ID0gRGF0ZS5ub3coKTtcbn07XG51dGlscy5pbmhlcml0KEFuaW1hdG9yLCB1dGlscy5Qb3N0ZXJDbGFzcyk7XG5cbi8qKlxuICogR2V0IHRoZSB0aW1lIGluIHRoZSBhbmltYXRpb25cbiAqIEByZXR1cm4ge2Zsb2F0fSBiZXR3ZWVuIDAgYW5kIDFcbiAqL1xuQW5pbWF0b3IucHJvdG90eXBlLnRpbWUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZWxhcHNlZCA9IERhdGUubm93KCkgLSB0aGlzLl9zdGFydDtcbiAgICByZXR1cm4gKGVsYXBzZWQgJSB0aGlzLmR1cmF0aW9uKSAvIHRoaXMuZHVyYXRpb247XG59O1xuXG5leHBvcnRzLkFuaW1hdG9yID0gQW5pbWF0b3I7IiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKTtcblxuLyoqXG4gKiBIVE1MIGNhbnZhcyB3aXRoIGRyYXdpbmcgY29udmluaWVuY2UgZnVuY3Rpb25zLlxuICovXG52YXIgQ2FudmFzID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fcmVuZGVyZWRfcmVnaW9uID0gW251bGwsIG51bGwsIG51bGwsIG51bGxdOyAvLyB4MSx5MSx4Mix5MlxuXG4gICAgdXRpbHMuUG9zdGVyQ2xhc3MuY2FsbCh0aGlzKTtcbiAgICB0aGlzLl9sYXlvdXQoKTtcbiAgICB0aGlzLl9pbml0X3Byb3BlcnRpZXMoKTtcbiAgICB0aGlzLl9sYXN0X3NldF9vcHRpb25zID0ge307XG5cbiAgICB0aGlzLl90ZXh0X3NpemVfY2FjaGUgPSB7fTtcbiAgICB0aGlzLl90ZXh0X3NpemVfYXJyYXkgPSBbXTtcbiAgICB0aGlzLl90ZXh0X3NpemVfY2FjaGVfc2l6ZSA9IDEwMDA7XG5cbiAgICAvLyBTZXQgZGVmYXVsdCBzaXplLlxuICAgIHRoaXMud2lkdGggPSA0MDA7XG4gICAgdGhpcy5oZWlnaHQgPSAzMDA7XG59O1xudXRpbHMuaW5oZXJpdChDYW52YXMsIHV0aWxzLlBvc3RlckNsYXNzKTtcblxuLyoqXG4gKiBMYXlvdXQgdGhlIGVsZW1lbnRzIGZvciB0aGUgY2FudmFzLlxuICogQ3JlYXRlcyBgdGhpcy5lbGBcbiAqIFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5fbGF5b3V0ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgdGhpcy5fY2FudmFzLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAncG9zdGVyIGhpZGRlbi1jYW52YXMnKTtcbiAgICB0aGlzLmNvbnRleHQgPSB0aGlzLl9jYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICAgICAgXG4gICAgLy8gU3RyZXRjaCB0aGUgaW1hZ2UgZm9yIHJldGluYSBzdXBwb3J0LlxuICAgIHRoaXMuc2NhbGUoMiwyKTtcbn07XG5cbi8qKlxuICogTWFrZSB0aGUgcHJvcGVydGllcyBvZiB0aGUgY2xhc3MuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DYW52YXMucHJvdG90eXBlLl9pbml0X3Byb3BlcnRpZXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBIZWlnaHQgb2YgdGhlIGNhbnZhc1xuICAgICAqIEByZXR1cm4ge2Zsb2F0fVxuICAgICAqL1xuICAgIHRoaXMucHJvcGVydHkoJ2hlaWdodCcsIGZ1bmN0aW9uKCkgeyBcbiAgICAgICAgcmV0dXJuIHRoYXQuX2NhbnZhcy5oZWlnaHQgLyAyOyBcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0Ll9jYW52YXMuc2V0QXR0cmlidXRlKCdoZWlnaHQnLCB2YWx1ZSAqIDIpO1xuICAgICAgICBcbiAgICAgICAgLy8gU3RyZXRjaCB0aGUgaW1hZ2UgZm9yIHJldGluYSBzdXBwb3J0LlxuICAgICAgICB0aGlzLnNjYWxlKDIsMik7XG4gICAgICAgIHRoaXMuX3RvdWNoKCk7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBXaWR0aCBvZiB0aGUgY2FudmFzXG4gICAgICogQHJldHVybiB7ZmxvYXR9XG4gICAgICovXG4gICAgdGhpcy5wcm9wZXJ0eSgnd2lkdGgnLCBmdW5jdGlvbigpIHsgXG4gICAgICAgIHJldHVybiB0aGF0Ll9jYW52YXMud2lkdGggLyAyOyBcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0Ll9jYW52YXMuc2V0QXR0cmlidXRlKCd3aWR0aCcsIHZhbHVlICogMik7XG4gICAgICAgIFxuICAgICAgICAvLyBTdHJldGNoIHRoZSBpbWFnZSBmb3IgcmV0aW5hIHN1cHBvcnQuXG4gICAgICAgIHRoaXMuc2NhbGUoMiwyKTtcbiAgICAgICAgdGhpcy5fdG91Y2goKTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIFJlZ2lvbiBvZiB0aGUgY2FudmFzIHRoYXQgaGFzIGJlZW4gcmVuZGVyZWQgdG9cbiAgICAgKiBAcmV0dXJuIHtkaWN0aW9uYXJ5fSBkaWN0aW9uYXJ5IGRlc2NyaWJpbmcgYSByZWN0YW5nbGUge3gseSx3aWR0aCxoZWlnaHR9XG4gICAgICovXG4gICAgdGhpcy5wcm9wZXJ0eSgncmVuZGVyZWRfcmVnaW9uJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB4OiB0aGlzLl90eCh0aGlzLl9yZW5kZXJlZF9yZWdpb25bMF0sIHRydWUpLFxuICAgICAgICAgICAgeTogdGhpcy5fdHkodGhpcy5fcmVuZGVyZWRfcmVnaW9uWzFdLCB0cnVlKSxcbiAgICAgICAgICAgIHdpZHRoOiB0aGlzLl9yZW5kZXJlZF9yZWdpb25bMl0gLSB0aGlzLl9yZW5kZXJlZF9yZWdpb25bMF0sXG4gICAgICAgICAgICBoZWlnaHQ6IHRoaXMuX3JlbmRlcmVkX3JlZ2lvblszXSAtIHRoaXMuX3JlbmRlcmVkX3JlZ2lvblsxXSxcbiAgICAgICAgfTtcbiAgICB9KTtcbn07XG5cbi8qKlxuICogRHJhd3MgYSByZWN0YW5nbGVcbiAqIEBwYXJhbSAge2Zsb2F0fSB4XG4gKiBAcGFyYW0gIHtmbG9hdH0geVxuICogQHBhcmFtICB7ZmxvYXR9IHdpZHRoXG4gKiBAcGFyYW0gIHtmbG9hdH0gaGVpZ2h0XG4gKiBAcGFyYW0gIHtkaWN0aW9uYXJ5fSBvcHRpb25zLCBzZWUgX2FwcGx5X29wdGlvbnMoKSBmb3IgZGV0YWlsc1xuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5kcmF3X3JlY3RhbmdsZSA9IGZ1bmN0aW9uKHgsIHksIHdpZHRoLCBoZWlnaHQsIG9wdGlvbnMpIHtcbiAgICB4ID0gdGhpcy5fdHgoeCk7XG4gICAgeSA9IHRoaXMuX3R5KHkpO1xuICAgIHRoaXMuY29udGV4dC5iZWdpblBhdGgoKTtcbiAgICB0aGlzLmNvbnRleHQucmVjdCh4LCB5LCB3aWR0aCwgaGVpZ2h0KTtcbiAgICB0aGlzLl9kb19kcmF3KG9wdGlvbnMpO1xuICAgIHRoaXMuX3RvdWNoKHgsIHksIHgrd2lkdGgsIHkraGVpZ2h0KTtcbn07XG5cbi8qKlxuICogRHJhd3MgYSBjaXJjbGVcbiAqIEBwYXJhbSAge2Zsb2F0fSB4XG4gKiBAcGFyYW0gIHtmbG9hdH0geVxuICogQHBhcmFtICB7ZmxvYXR9IHJcbiAqIEBwYXJhbSAge2RpY3Rpb25hcnl9IG9wdGlvbnMsIHNlZSBfYXBwbHlfb3B0aW9ucygpIGZvciBkZXRhaWxzXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DYW52YXMucHJvdG90eXBlLmRyYXdfY2lyY2xlID0gZnVuY3Rpb24oeCwgeSwgciwgb3B0aW9ucykge1xuICAgIHggPSB0aGlzLl90eCh4KTtcbiAgICB5ID0gdGhpcy5fdHkoeSk7XG4gICAgdGhpcy5jb250ZXh0LmJlZ2luUGF0aCgpO1xuICAgIHRoaXMuY29udGV4dC5hcmMoeCwgeSwgciwgMCwgMiAqIE1hdGguUEkpO1xuICAgIHRoaXMuX2RvX2RyYXcob3B0aW9ucyk7XG4gICAgdGhpcy5fdG91Y2goeC1yLCB5LXIsIHgrciwgeStyKTtcbn07XG5cbi8qKlxuICogRHJhd3MgYW4gaW1hZ2VcbiAqIEBwYXJhbSAge2ltZyBlbGVtZW50fSBpbWdcbiAqIEBwYXJhbSAge2Zsb2F0fSB4XG4gKiBAcGFyYW0gIHtmbG9hdH0geVxuICogQHBhcmFtICB7ZmxvYXR9IChvcHRpb25hbCkgd2lkdGhcbiAqIEBwYXJhbSAge2Zsb2F0fSAob3B0aW9uYWwpIGhlaWdodFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5kcmF3X2ltYWdlID0gZnVuY3Rpb24oaW1nLCB4LCB5LCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgeCA9IHRoaXMuX3R4KHgpO1xuICAgIHkgPSB0aGlzLl90eSh5KTtcbiAgICB3aWR0aCA9IHdpZHRoIHx8IGltZy53aWR0aDtcbiAgICBoZWlnaHQgPSBoZWlnaHQgfHwgaW1nLmhlaWdodDtcbiAgICBpbWcgPSBpbWcuX2NhbnZhcyA/IGltZy5fY2FudmFzIDogaW1nO1xuICAgIHRoaXMuY29udGV4dC5kcmF3SW1hZ2UoaW1nLCB4LCB5LCB3aWR0aCwgaGVpZ2h0KTtcbiAgICB0aGlzLl90b3VjaCh4LCB5LCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCk7XG59O1xuXG4vKipcbiAqIERyYXdzIGEgbGluZVxuICogQHBhcmFtICB7ZmxvYXR9IHgxXG4gKiBAcGFyYW0gIHtmbG9hdH0geTFcbiAqIEBwYXJhbSAge2Zsb2F0fSB4MlxuICogQHBhcmFtICB7ZmxvYXR9IHkyXG4gKiBAcGFyYW0gIHtkaWN0aW9uYXJ5fSBvcHRpb25zLCBzZWUgX2FwcGx5X29wdGlvbnMoKSBmb3IgZGV0YWlsc1xuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5kcmF3X2xpbmUgPSBmdW5jdGlvbih4MSwgeTEsIHgyLCB5Miwgb3B0aW9ucykge1xuICAgIHgxID0gdGhpcy5fdHgoeDEpO1xuICAgIHkxID0gdGhpcy5fdHkoeTEpO1xuICAgIHgyID0gdGhpcy5fdHgoeDIpO1xuICAgIHkyID0gdGhpcy5fdHkoeTIpO1xuICAgIHRoaXMuY29udGV4dC5iZWdpblBhdGgoKTtcbiAgICB0aGlzLmNvbnRleHQubW92ZVRvKHgxLCB5MSk7XG4gICAgdGhpcy5jb250ZXh0LmxpbmVUbyh4MiwgeTIpO1xuICAgIHRoaXMuX2RvX2RyYXcob3B0aW9ucyk7XG4gICAgdGhpcy5fdG91Y2goeDEsIHkxLCB4MiwgeTIpO1xufTtcblxuLyoqXG4gKiBEcmF3cyBhIHBvbHkgbGluZVxuICogQHBhcmFtICB7YXJyYXl9IHBvaW50cyAtIGFycmF5IG9mIHBvaW50cy4gIEVhY2ggcG9pbnQgaXNcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICBhbiBhcnJheSBpdHNlbGYsIG9mIHRoZSBmb3JtIFt4LCB5XSBcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICB3aGVyZSB4IGFuZCB5IGFyZSBmbG9hdGluZyBwb2ludFxuICogICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlcy5cbiAqIEBwYXJhbSAge2RpY3Rpb25hcnl9IG9wdGlvbnMsIHNlZSBfYXBwbHlfb3B0aW9ucygpIGZvciBkZXRhaWxzXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DYW52YXMucHJvdG90eXBlLmRyYXdfcG9seWxpbmUgPSBmdW5jdGlvbihwb2ludHMsIG9wdGlvbnMpIHtcbiAgICBpZiAocG9pbnRzLmxlbmd0aCA8IDIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdQb2x5IGxpbmUgbXVzdCBoYXZlIGF0bGVhc3QgdHdvIHBvaW50cy4nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmNvbnRleHQuYmVnaW5QYXRoKCk7XG4gICAgICAgIHZhciBwb2ludCA9IHBvaW50c1swXTtcbiAgICAgICAgdGhpcy5jb250ZXh0Lm1vdmVUbyh0aGlzLl90eChwb2ludFswXSksIHRoaXMuX3R5KHBvaW50WzFdKSk7XG5cbiAgICAgICAgdmFyIG1pbnggPSB0aGlzLndpZHRoO1xuICAgICAgICB2YXIgbWlueSA9IHRoaXMuaGVpZ2h0O1xuICAgICAgICB2YXIgbWF4eCA9IDA7XG4gICAgICAgIHZhciBtYXh5ID0gMDtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBwb2ludHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHBvaW50ID0gcG9pbnRzW2ldO1xuICAgICAgICAgICAgdGhpcy5jb250ZXh0LmxpbmVUbyh0aGlzLl90eChwb2ludFswXSksIHRoaXMuX3R5KHBvaW50WzFdKSk7XG5cbiAgICAgICAgICAgIG1pbnggPSBNYXRoLm1pbih0aGlzLl90eChwb2ludFswXSksIG1pbngpO1xuICAgICAgICAgICAgbWlueSA9IE1hdGgubWluKHRoaXMuX3R5KHBvaW50WzFdKSwgbWlueSk7XG4gICAgICAgICAgICBtYXh4ID0gTWF0aC5tYXgodGhpcy5fdHgocG9pbnRbMF0pLCBtYXh4KTtcbiAgICAgICAgICAgIG1heHkgPSBNYXRoLm1heCh0aGlzLl90eShwb2ludFsxXSksIG1heHkpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2RvX2RyYXcob3B0aW9ucyk7IFxuICAgICAgICB0aGlzLl90b3VjaChtaW54LCBtaW55LCBtYXh4LCBtYXh5KTsgICBcbiAgICB9XG59O1xuXG4vKipcbiAqIERyYXdzIGEgdGV4dCBzdHJpbmdcbiAqIEBwYXJhbSAge2Zsb2F0fSB4XG4gKiBAcGFyYW0gIHtmbG9hdH0geVxuICogQHBhcmFtICB7c3RyaW5nfSB0ZXh0IHN0cmluZyBvciBjYWxsYmFjayB0aGF0IHJlc29sdmVzIHRvIGEgc3RyaW5nLlxuICogQHBhcmFtICB7ZGljdGlvbmFyeX0gb3B0aW9ucywgc2VlIF9hcHBseV9vcHRpb25zKCkgZm9yIGRldGFpbHNcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuZHJhd190ZXh0ID0gZnVuY3Rpb24oeCwgeSwgdGV4dCwgb3B0aW9ucykge1xuICAgIHggPSB0aGlzLl90eCh4KTtcbiAgICB5ID0gdGhpcy5fdHkoeSk7XG4gICAgb3B0aW9ucyA9IHRoaXMuX2FwcGx5X29wdGlvbnMob3B0aW9ucyk7XG4gICAgLy8gJ2ZpbGwnIHRoZSB0ZXh0IGJ5IGRlZmF1bHQgd2hlbiBuZWl0aGVyIGEgc3Ryb2tlIG9yIGZpbGwgXG4gICAgLy8gaXMgZGVmaW5lZC4gIE90aGVyd2lzZSBvbmx5IGZpbGwgaWYgYSBmaWxsIGlzIGRlZmluZWQuXG4gICAgaWYgKG9wdGlvbnMuZmlsbCB8fCAhb3B0aW9ucy5zdHJva2UpIHtcbiAgICAgICAgdGhpcy5jb250ZXh0LmZpbGxUZXh0KHRleHQsIHgsIHkpO1xuICAgIH1cbiAgICAvLyBPbmx5IHN0cm9rZSBpZiBhIHN0cm9rZSBpcyBkZWZpbmVkLlxuICAgIGlmIChvcHRpb25zLnN0cm9rZSkge1xuICAgICAgICB0aGlzLmNvbnRleHQuc3Ryb2tlVGV4dCh0ZXh0LCB4LCB5KTsgICAgICAgXG4gICAgfVxuICAgIHRoaXMuX3RvdWNoKHgsIHksIHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KTtcbn07XG5cbi8qKlxuICogR2V0J3MgYSBjaHVuayBvZiB0aGUgY2FudmFzIGFzIGEgcmF3IGltYWdlLlxuICogQHBhcmFtICB7ZmxvYXR9IChvcHRpb25hbCkgeFxuICogQHBhcmFtICB7ZmxvYXR9IChvcHRpb25hbCkgeVxuICogQHBhcmFtICB7ZmxvYXR9IChvcHRpb25hbCkgd2lkdGhcbiAqIEBwYXJhbSAge2Zsb2F0fSAob3B0aW9uYWwpIGhlaWdodFxuICogQHJldHVybiB7aW1hZ2V9IGNhbnZhcyBpbWFnZSBkYXRhXG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuZ2V0X3Jhd19pbWFnZSA9IGZ1bmN0aW9uKHgsIHksIHdpZHRoLCBoZWlnaHQpIHtcbiAgICBjb25zb2xlLndhcm4oJ2dldF9yYXdfaW1hZ2UgaW1hZ2UgaXMgc2xvdywgdXNlIGNhbnZhcyByZWZlcmVuY2VzIGluc3RlYWQgd2l0aCBkcmF3X2ltYWdlJyk7XG4gICAgaWYgKHg9PT11bmRlZmluZWQpIHtcbiAgICAgICAgeCA9IDA7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgeCA9IHRoaXMuX3R4KHgpO1xuICAgIH1cbiAgICBpZiAoeT09PXVuZGVmaW5lZCkge1xuICAgICAgICB5ID0gMDtcbiAgICB9IGVsc2Uge1xuICAgICAgICB5ID0gdGhpcy5fdHkoeSk7XG4gICAgfVxuICAgIGlmICh3aWR0aCA9PT0gdW5kZWZpbmVkKSB3aWR0aCA9IHRoaXMud2lkdGg7XG4gICAgaWYgKGhlaWdodCA9PT0gdW5kZWZpbmVkKSBoZWlnaHQgPSB0aGlzLmhlaWdodDtcblxuICAgIC8vIE11bHRpcGx5IGJ5IHR3byBmb3IgcGl4ZWwgZG91YmxpbmcuXG4gICAgeCA9IDIgKiB4O1xuICAgIHkgPSAyICogeTtcbiAgICB3aWR0aCA9IDIgKiB3aWR0aDtcbiAgICBoZWlnaHQgPSAyICogaGVpZ2h0O1xuICAgIFxuICAgIC8vIFVwZGF0ZSB0aGUgY2FjaGVkIGltYWdlIGlmIGl0J3Mgbm90IHRoZSByZXF1ZXN0ZWQgb25lLlxuICAgIHZhciByZWdpb24gPSBbeCwgeSwgd2lkdGgsIGhlaWdodF07XG4gICAgaWYgKCEodGhpcy5fY2FjaGVkX3RpbWVzdGFtcCA9PT0gdGhpcy5fbW9kaWZpZWQgJiYgdXRpbHMuY29tcGFyZV9hcnJheXMocmVnaW9uLCB0aGlzLl9jYWNoZWRfcmVnaW9uKSkpIHtcbiAgICAgICAgdGhpcy5fY2FjaGVkX2ltYWdlID0gdGhpcy5jb250ZXh0LmdldEltYWdlRGF0YSh4LCB5LCB3aWR0aCwgaGVpZ2h0KTtcbiAgICAgICAgdGhpcy5fY2FjaGVkX3RpbWVzdGFtcCA9IHRoaXMuX21vZGlmaWVkO1xuICAgICAgICB0aGlzLl9jYWNoZWRfcmVnaW9uID0gcmVnaW9uO1xuICAgIH1cblxuICAgIC8vIFJldHVybiB0aGUgY2FjaGVkIGltYWdlLlxuICAgIHJldHVybiB0aGlzLl9jYWNoZWRfaW1hZ2U7XG59O1xuXG4vKipcbiAqIFB1dCdzIGEgcmF3IGltYWdlIG9uIHRoZSBjYW52YXMgc29tZXdoZXJlLlxuICogQHBhcmFtICB7ZmxvYXR9IHhcbiAqIEBwYXJhbSAge2Zsb2F0fSB5XG4gKiBAcmV0dXJuIHtpbWFnZX0gY2FudmFzIGltYWdlIGRhdGFcbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5wdXRfcmF3X2ltYWdlID0gZnVuY3Rpb24oaW1nLCB4LCB5KSB7XG4gICAgY29uc29sZS53YXJuKCdwdXRfcmF3X2ltYWdlIGltYWdlIGlzIHNsb3csIHVzZSBkcmF3X2ltYWdlIGluc3RlYWQnKTtcbiAgICB4ID0gdGhpcy5fdHgoeCk7XG4gICAgeSA9IHRoaXMuX3R5KHkpO1xuICAgIC8vIE11bHRpcGx5IGJ5IHR3byBmb3IgcGl4ZWwgZG91YmxpbmcuXG4gICAgcmV0ID0gdGhpcy5jb250ZXh0LnB1dEltYWdlRGF0YShpbWcsIHgqMiwgeSoyKTtcbiAgICB0aGlzLl90b3VjaCh4LCB5LCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCk7XG4gICAgcmV0dXJuIHJldDtcbn07XG5cbi8qKlxuICogTWVhc3VyZXMgdGhlIHdpZHRoIG9mIGEgdGV4dCBzdHJpbmcuXG4gKiBAcGFyYW0gIHtzdHJpbmd9IHRleHRcbiAqIEBwYXJhbSAge2RpY3Rpb25hcnl9IG9wdGlvbnMsIHNlZSBfYXBwbHlfb3B0aW9ucygpIGZvciBkZXRhaWxzXG4gKiBAcmV0dXJuIHtmbG9hdH0gd2lkdGhcbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5tZWFzdXJlX3RleHQgPSBmdW5jdGlvbih0ZXh0LCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IHRoaXMuX2FwcGx5X29wdGlvbnMob3B0aW9ucyk7XG5cbiAgICAvLyBDYWNoZSB0aGUgc2l6ZSBpZiBpdCdzIG5vdCBhbHJlYWR5IGNhY2hlZC5cbiAgICBpZiAodGhpcy5fdGV4dF9zaXplX2NhY2hlW3RleHRdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5fdGV4dF9zaXplX2NhY2hlW3RleHRdID0gdGhpcy5jb250ZXh0Lm1lYXN1cmVUZXh0KHRleHQpLndpZHRoO1xuICAgICAgICB0aGlzLl90ZXh0X3NpemVfYXJyYXkucHVzaCh0ZXh0KTtcblxuICAgICAgICAvLyBSZW1vdmUgdGhlIG9sZGVzdCBpdGVtIGluIHRoZSBhcnJheSBpZiB0aGUgY2FjaGUgaXMgdG9vIGxhcmdlLlxuICAgICAgICB3aGlsZSAodGhpcy5fdGV4dF9zaXplX2FycmF5Lmxlbmd0aCA+IHRoaXMuX3RleHRfc2l6ZV9jYWNoZV9zaXplKSB7XG4gICAgICAgICAgICB2YXIgb2xkZXN0ID0gdGhpcy5fdGV4dF9zaXplX2FycmF5LnNoaWZ0KCk7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fdGV4dF9zaXplX2NhY2hlW29sZGVzdF07XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLy8gVXNlIHRoZSBjYWNoZWQgc2l6ZS5cbiAgICByZXR1cm4gdGhpcy5fdGV4dF9zaXplX2NhY2hlW3RleHRdO1xufTtcblxuLyoqXG4gKiBDbGVhcidzIHRoZSBjYW52YXMuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DYW52YXMucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5jb250ZXh0LmNsZWFyUmVjdCgwLCAwLCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCk7XG4gICAgdGhpcy5fdG91Y2goKTtcbn07XG5cbi8qKlxuICogU2NhbGUgdGhlIGN1cnJlbnQgZHJhd2luZy5cbiAqIEBwYXJhbSAge2Zsb2F0fSB4XG4gKiBAcGFyYW0gIHtmbG9hdH0geVxuICogQHJldHVybiB7bnVsbH0gIFxuICovXG5DYW52YXMucHJvdG90eXBlLnNjYWxlID0gZnVuY3Rpb24oeCwgeSkge1xuICAgIHRoaXMuY29udGV4dC5zY2FsZSh4LCB5KTtcbiAgICB0aGlzLl90b3VjaCgpO1xufTtcblxuLyoqXG4gKiBGaW5pc2hlcyB0aGUgZHJhd2luZyBvcGVyYXRpb24gdXNpbmcgdGhlIHNldCBvZiBwcm92aWRlZCBvcHRpb25zLlxuICogQHBhcmFtICB7ZGljdGlvbmFyeX0gKG9wdGlvbmFsKSBkaWN0aW9uYXJ5IHRoYXQgXG4gKiAgcmVzb2x2ZXMgdG8gYSBkaWN0aW9uYXJ5LlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5fZG9fZHJhdyA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gdGhpcy5fYXBwbHlfb3B0aW9ucyhvcHRpb25zKTtcblxuICAgIC8vIE9ubHkgZmlsbCBpZiBhIGZpbGwgaXMgZGVmaW5lZC5cbiAgICBpZiAob3B0aW9ucy5maWxsKSB7XG4gICAgICAgIHRoaXMuY29udGV4dC5maWxsKCk7XG4gICAgfVxuICAgIC8vIFN0cm9rZSBieSBkZWZhdWx0LCBpZiBubyBzdHJva2Ugb3IgZmlsbCBpcyBkZWZpbmVkLiAgT3RoZXJ3aXNlXG4gICAgLy8gb25seSBzdHJva2UgaWYgYSBzdHJva2UgaXMgZGVmaW5lZC5cbiAgICBpZiAob3B0aW9ucy5zdHJva2UgfHwgIW9wdGlvbnMuZmlsbCkge1xuICAgICAgICB0aGlzLmNvbnRleHQuc3Ryb2tlKCk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBBcHBsaWVzIGEgZGljdGlvbmFyeSBvZiBkcmF3aW5nIG9wdGlvbnMgdG8gdGhlIHBlbi5cbiAqIEBwYXJhbSAge2RpY3Rpb25hcnl9IG9wdGlvbnNcbiAqICAgICAgYWxwaGEge2Zsb2F0fSBPcGFjaXR5ICgwLTEpXG4gKiAgICAgIGNvbXBvc2l0ZV9vcGVyYXRpb24ge3N0cmluZ30gSG93IG5ldyBpbWFnZXMgYXJlIFxuICogICAgICAgICAgZHJhd24gb250byBhbiBleGlzdGluZyBpbWFnZS4gIFBvc3NpYmxlIHZhbHVlc1xuICogICAgICAgICAgYXJlIGBzb3VyY2Utb3ZlcmAsIGBzb3VyY2UtYXRvcGAsIGBzb3VyY2UtaW5gLCBcbiAqICAgICAgICAgIGBzb3VyY2Utb3V0YCwgYGRlc3RpbmF0aW9uLW92ZXJgLCBcbiAqICAgICAgICAgIGBkZXN0aW5hdGlvbi1hdG9wYCwgYGRlc3RpbmF0aW9uLWluYCwgXG4gKiAgICAgICAgICBgZGVzdGluYXRpb24tb3V0YCwgYGxpZ2h0ZXJgLCBgY29weWAsIG9yIGB4b3JgLlxuICogICAgICBsaW5lX2NhcCB7c3RyaW5nfSBFbmQgY2FwIHN0eWxlIGZvciBsaW5lcy5cbiAqICAgICAgICAgIFBvc3NpYmxlIHZhbHVlcyBhcmUgJ2J1dHQnLCAncm91bmQnLCBvciAnc3F1YXJlJy5cbiAqICAgICAgbGluZV9qb2luIHtzdHJpbmd9IEhvdyB0byByZW5kZXIgd2hlcmUgdHdvIGxpbmVzXG4gKiAgICAgICAgICBtZWV0LiAgUG9zc2libGUgdmFsdWVzIGFyZSAnYmV2ZWwnLCAncm91bmQnLCBvclxuICogICAgICAgICAgJ21pdGVyJy5cbiAqICAgICAgbGluZV93aWR0aCB7ZmxvYXR9IEhvdyB0aGljayBsaW5lcyBhcmUuXG4gKiAgICAgIGxpbmVfbWl0ZXJfbGltaXQge2Zsb2F0fSBNYXggbGVuZ3RoIG9mIG1pdGVycy5cbiAqICAgICAgbGluZV9jb2xvciB7c3RyaW5nfSBDb2xvciBvZiB0aGUgbGluZS5cbiAqICAgICAgZmlsbF9jb2xvciB7c3RyaW5nfSBDb2xvciB0byBmaWxsIHRoZSBzaGFwZS5cbiAqICAgICAgY29sb3Ige3N0cmluZ30gQ29sb3IgdG8gc3Ryb2tlIGFuZCBmaWxsIHRoZSBzaGFwZS5cbiAqICAgICAgICAgIExvd2VyIHByaW9yaXR5IHRvIGxpbmVfY29sb3IgYW5kIGZpbGxfY29sb3IuXG4gKiAgICAgIGZvbnRfc3R5bGUge3N0cmluZ31cbiAqICAgICAgZm9udF92YXJpYW50IHtzdHJpbmd9XG4gKiAgICAgIGZvbnRfd2VpZ2h0IHtzdHJpbmd9XG4gKiAgICAgIGZvbnRfc2l6ZSB7c3RyaW5nfVxuICogICAgICBmb250X2ZhbWlseSB7c3RyaW5nfVxuICogICAgICBmb250IHtzdHJpbmd9IE92ZXJyaWRkZXMgYWxsIG90aGVyIGZvbnQgcHJvcGVydGllcy5cbiAqICAgICAgdGV4dF9hbGlnbiB7c3RyaW5nfSBIb3Jpem9udGFsIGFsaWdubWVudCBvZiB0ZXh0LiAgXG4gKiAgICAgICAgICBQb3NzaWJsZSB2YWx1ZXMgYXJlIGBzdGFydGAsIGBlbmRgLCBgY2VudGVyYCxcbiAqICAgICAgICAgIGBsZWZ0YCwgb3IgYHJpZ2h0YC5cbiAqICAgICAgdGV4dF9iYXNlbGluZSB7c3RyaW5nfSBWZXJ0aWNhbCBhbGlnbm1lbnQgb2YgdGV4dC5cbiAqICAgICAgICAgIFBvc3NpYmxlIHZhbHVlcyBhcmUgYGFscGhhYmV0aWNgLCBgdG9wYCwgXG4gKiAgICAgICAgICBgaGFuZ2luZ2AsIGBtaWRkbGVgLCBgaWRlb2dyYXBoaWNgLCBvciBcbiAqICAgICAgICAgIGBib3R0b21gLlxuICogQHJldHVybiB7ZGljdGlvbmFyeX0gb3B0aW9ucywgcmVzb2x2ZWQuXG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuX2FwcGx5X29wdGlvbnMgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgb3B0aW9ucyA9IHV0aWxzLnJlc29sdmVfY2FsbGFibGUob3B0aW9ucyk7XG5cbiAgICAvLyBTcGVjaWFsIG9wdGlvbnMuXG4gICAgdmFyIHNldF9vcHRpb25zID0ge307XG4gICAgc2V0X29wdGlvbnMuZ2xvYmFsQWxwaGEgPSBvcHRpb25zLmFscGhhPT09dW5kZWZpbmVkID8gMS4wIDogb3B0aW9ucy5hbHBoYTtcbiAgICBzZXRfb3B0aW9ucy5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb24gPSBvcHRpb25zLmNvbXBvc2l0ZV9vcGVyYXRpb24gfHwgJ3NvdXJjZS1vdmVyJztcbiAgICBcbiAgICAvLyBMaW5lIHN0eWxlLlxuICAgIHNldF9vcHRpb25zLmxpbmVDYXAgPSBvcHRpb25zLmxpbmVfY2FwIHx8ICdidXR0JztcbiAgICBzZXRfb3B0aW9ucy5saW5lSm9pbiA9IG9wdGlvbnMubGluZV9qb2luIHx8ICdiZXZlbCc7XG4gICAgc2V0X29wdGlvbnMubGluZVdpZHRoID0gb3B0aW9ucy5saW5lX3dpZHRoPT09dW5kZWZpbmVkID8gMS4wIDogb3B0aW9ucy5saW5lX3dpZHRoO1xuICAgIHNldF9vcHRpb25zLm1pdGVyTGltaXQgPSBvcHRpb25zLmxpbmVfbWl0ZXJfbGltaXQ9PT11bmRlZmluZWQgPyAxMCA6IG9wdGlvbnMubGluZV9taXRlcl9saW1pdDtcbiAgICBzZXRfb3B0aW9ucy5zdHJva2VTdHlsZSA9IG9wdGlvbnMubGluZV9jb2xvciB8fCBvcHRpb25zLmNvbG9yIHx8ICdibGFjayc7IC8vIFRPRE86IFN1cHBvcnQgZ3JhZGllbnRcbiAgICBvcHRpb25zLnN0cm9rZSA9IChvcHRpb25zLmxpbmVfY29sb3IgIT09IHVuZGVmaW5lZCB8fCBvcHRpb25zLmxpbmVfd2lkdGggIT09IHVuZGVmaW5lZCk7XG5cbiAgICAvLyBGaWxsIHN0eWxlLlxuICAgIHNldF9vcHRpb25zLmZpbGxTdHlsZSA9IG9wdGlvbnMuZmlsbF9jb2xvciB8fCBvcHRpb25zLmNvbG9yIHx8ICdibGFjayc7IC8vIFRPRE86IFN1cHBvcnQgZ3JhZGllbnRcbiAgICBvcHRpb25zLmZpbGwgPSBvcHRpb25zLmZpbGxfY29sb3IgIT09IHVuZGVmaW5lZDtcblxuICAgIC8vIEZvbnQgc3R5bGUuXG4gICAgdmFyIGZvbnRfc3R5bGUgPSBvcHRpb25zLmZvbnRfc3R5bGUgfHwgJyc7XG4gICAgdmFyIGZvbnRfdmFyaWFudCA9IG9wdGlvbnMuZm9udF92YXJpYW50IHx8ICcnO1xuICAgIHZhciBmb250X3dlaWdodCA9IG9wdGlvbnMuZm9udF93ZWlnaHQgfHwgJyc7XG4gICAgdmFyIGZvbnRfc2l6ZSA9IG9wdGlvbnMuZm9udF9zaXplIHx8ICcxMnB0JztcbiAgICB2YXIgZm9udF9mYW1pbHkgPSBvcHRpb25zLmZvbnRfZmFtaWx5IHx8ICdBcmlhbCc7XG4gICAgdmFyIGZvbnQgPSBmb250X3N0eWxlICsgJyAnICsgZm9udF92YXJpYW50ICsgJyAnICsgZm9udF93ZWlnaHQgKyAnICcgKyBmb250X3NpemUgKyAnICcgKyBmb250X2ZhbWlseTtcbiAgICBzZXRfb3B0aW9ucy5mb250ID0gb3B0aW9ucy5mb250IHx8IGZvbnQ7XG5cbiAgICAvLyBUZXh0IHN0eWxlLlxuICAgIHNldF9vcHRpb25zLnRleHRBbGlnbiA9IG9wdGlvbnMudGV4dF9hbGlnbiB8fCAnbGVmdCc7XG4gICAgc2V0X29wdGlvbnMudGV4dEJhc2VsaW5lID0gb3B0aW9ucy50ZXh0X2Jhc2VsaW5lIHx8ICd0b3AnO1xuXG4gICAgLy8gVE9ETzogU3VwcG9ydCBzaGFkb3dzLlxuICAgIFxuICAgIC8vIEVtcHR5IHRoZSBtZWFzdXJlIHRleHQgY2FjaGUgaWYgdGhlIGZvbnQgaXMgY2hhbmdlZC5cbiAgICBpZiAoc2V0X29wdGlvbnMuZm9udCAhPT0gdGhpcy5fbGFzdF9zZXRfb3B0aW9ucy5mb250KSB7XG4gICAgICAgIHRoaXMuX3RleHRfc2l6ZV9jYWNoZSA9IHt9O1xuICAgICAgICB0aGlzLl90ZXh0X3NpemVfYXJyYXkgPSBbXTtcbiAgICB9XG4gICAgXG4gICAgLy8gU2V0IHRoZSBvcHRpb25zIG9uIHRoZSBjb250ZXh0IG9iamVjdC4gIE9ubHkgc2V0IG9wdGlvbnMgdGhhdFxuICAgIC8vIGhhdmUgY2hhbmdlZCBzaW5jZSB0aGUgbGFzdCBjYWxsLlxuICAgIGZvciAodmFyIGtleSBpbiBzZXRfb3B0aW9ucykge1xuICAgICAgICBpZiAoc2V0X29wdGlvbnMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuX2xhc3Rfc2V0X29wdGlvbnNba2V5XSAhPT0gc2V0X29wdGlvbnNba2V5XSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2xhc3Rfc2V0X29wdGlvbnNba2V5XSA9IHNldF9vcHRpb25zW2tleV07XG4gICAgICAgICAgICAgICAgdGhpcy5jb250ZXh0W2tleV0gPSBzZXRfb3B0aW9uc1trZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG9wdGlvbnM7XG59O1xuXG4vKipcbiAqIFVwZGF0ZSB0aGUgdGltZXN0YW1wIHRoYXQgdGhlIGNhbnZhcyB3YXMgbW9kaWZpZWQgYW5kXG4gKiB0aGUgcmVnaW9uIHRoYXQgaGFzIGNvbnRlbnRzIHJlbmRlcmVkIHRvIGl0LlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5fdG91Y2ggPSBmdW5jdGlvbih4MSwgeTEsIHgyLCB5Mikge1xuICAgIHRoaXMuX21vZGlmaWVkID0gRGF0ZS5ub3coKTtcblxuICAgIC8vIFNldCB0aGUgcmVuZGVyIHJlZ2lvbi5cbiAgICB2YXIgY29tcGFyaXRvciA9IGZ1bmN0aW9uKG9sZF92YWx1ZSwgbmV3X3ZhbHVlLCBjb21wYXJpc29uKSB7XG4gICAgICAgIGlmIChvbGRfdmFsdWUgPT09IG51bGwgfHwgb2xkX3ZhbHVlID09PSB1bmRlZmluZWQgfHwgbmV3X3ZhbHVlID09PSBudWxsIHx8IG5ld192YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3X3ZhbHVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGNvbXBhcmlzb24uY2FsbCh1bmRlZmluZWQsIG9sZF92YWx1ZSwgbmV3X3ZhbHVlKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdGhpcy5fcmVuZGVyZWRfcmVnaW9uWzBdID0gY29tcGFyaXRvcih0aGlzLl9yZW5kZXJlZF9yZWdpb25bMF0sIHgxLCBNYXRoLm1pbik7XG4gICAgdGhpcy5fcmVuZGVyZWRfcmVnaW9uWzFdID0gY29tcGFyaXRvcih0aGlzLl9yZW5kZXJlZF9yZWdpb25bMV0sIHkxLCBNYXRoLm1pbik7XG4gICAgdGhpcy5fcmVuZGVyZWRfcmVnaW9uWzJdID0gY29tcGFyaXRvcih0aGlzLl9yZW5kZXJlZF9yZWdpb25bMl0sIHgyLCBNYXRoLm1heCk7XG4gICAgdGhpcy5fcmVuZGVyZWRfcmVnaW9uWzNdID0gY29tcGFyaXRvcih0aGlzLl9yZW5kZXJlZF9yZWdpb25bM10sIHkyLCBNYXRoLm1heCk7XG59O1xuXG4vKipcbiAqIFRyYW5zZm9ybSBhbiB4IHZhbHVlIGJlZm9yZSByZW5kZXJpbmcuXG4gKiBAcGFyYW0gIHtmbG9hdH0geFxuICogQHBhcmFtICB7Ym9vbGVhbn0gaW52ZXJzZSAtIHBlcmZvcm0gaW52ZXJzZSB0cmFuc2Zvcm1hdGlvblxuICogQHJldHVybiB7ZmxvYXR9XG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuX3R4ID0gZnVuY3Rpb24oeCwgaW52ZXJzZSkgeyByZXR1cm4geDsgfTtcblxuLyoqXG4gKiBUcmFuc2Zvcm0gYSB5IHZhbHVlIGJlZm9yZSByZW5kZXJpbmcuXG4gKiBAcGFyYW0gIHtmbG9hdH0geVxuICogQHBhcmFtICB7Ym9vbGVhbn0gaW52ZXJzZSAtIHBlcmZvcm0gaW52ZXJzZSB0cmFuc2Zvcm1hdGlvblxuICogQHJldHVybiB7ZmxvYXR9XG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuX3R5ID0gZnVuY3Rpb24oeSwgaW52ZXJzZSkgeyByZXR1cm4geTsgfTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5DYW52YXMgPSBDYW52YXM7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG5cbi8qKlxuICogRXZlbnRmdWwgY2xpcGJvYXJkIHN1cHBvcnRcbiAqXG4gKiBXQVJOSU5HOiAgVGhpcyBjbGFzcyBpcyBhIGh1ZGdlIGtsdWRnZSB0aGF0IHdvcmtzIGFyb3VuZCB0aGUgcHJlaGlzdG9yaWNcbiAqIGNsaXBib2FyZCBzdXBwb3J0IChsYWNrIHRoZXJlb2YpIGluIG1vZGVybiB3ZWJyb3dzZXJzLiAgSXQgY3JlYXRlcyBhIGhpZGRlblxuICogdGV4dGJveCB3aGljaCBpcyBmb2N1c2VkLiAgVGhlIHByb2dyYW1tZXIgbXVzdCBjYWxsIGBzZXRfY2xpcHBhYmxlYCB0byBjaGFuZ2VcbiAqIHdoYXQgd2lsbCBiZSBjb3BpZWQgd2hlbiB0aGUgdXNlciBoaXRzIGtleXMgY29ycmVzcG9uZGluZyB0byBhIGNvcHkgXG4gKiBvcGVyYXRpb24uICBFdmVudHMgYGNvcHlgLCBgY3V0YCwgYW5kIGBwYXN0ZWAgYXJlIHJhaXNlZCBieSB0aGlzIGNsYXNzLlxuICovXG52YXIgQ2xpcGJvYXJkID0gZnVuY3Rpb24oZWwpIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMuX2VsID0gZWw7XG5cbiAgICAvLyBDcmVhdGUgYSB0ZXh0Ym94IHRoYXQncyBoaWRkZW4uXG4gICAgdGhpcy5oaWRkZW5faW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZXh0YXJlYScpO1xuICAgIHRoaXMuaGlkZGVuX2lucHV0LnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAncG9zdGVyIGhpZGRlbi1jbGlwYm9hcmQnKTtcbiAgICBlbC5hcHBlbmRDaGlsZCh0aGlzLmhpZGRlbl9pbnB1dCk7XG5cbiAgICB0aGlzLl9iaW5kX2V2ZW50cygpO1xufTtcbnV0aWxzLmluaGVyaXQoQ2xpcGJvYXJkLCB1dGlscy5Qb3N0ZXJDbGFzcyk7XG5cbi8qKlxuICogU2V0IHdoYXQgd2lsbCBiZSBjb3BpZWQgd2hlbiB0aGUgdXNlciBjb3BpZXMuXG4gKiBAcGFyYW0ge3N0cmluZ30gdGV4dFxuICovXG5DbGlwYm9hcmQucHJvdG90eXBlLnNldF9jbGlwcGFibGUgPSBmdW5jdGlvbih0ZXh0KSB7XG4gICAgdGhpcy5fY2xpcHBhYmxlID0gdGV4dDtcbiAgICB0aGlzLmhpZGRlbl9pbnB1dC52YWx1ZSA9IHRoaXMuX2NsaXBwYWJsZTtcbiAgICB0aGlzLl9mb2N1cygpO1xufTsgXG5cbi8qKlxuICogRm9jdXMgdGhlIGhpZGRlbiB0ZXh0IGFyZWEuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DbGlwYm9hcmQucHJvdG90eXBlLl9mb2N1cyA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuaGlkZGVuX2lucHV0LmZvY3VzKCk7XG4gICAgdGhpcy5oaWRkZW5faW5wdXQuc2VsZWN0KCk7XG59O1xuXG4vKipcbiAqIEhhbmRsZSB3aGVuIHRoZSB1c2VyIHBhc3RlcyBpbnRvIHRoZSB0ZXh0Ym94LlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ2xpcGJvYXJkLnByb3RvdHlwZS5faGFuZGxlX3Bhc3RlID0gZnVuY3Rpb24oZSkge1xuICAgIHZhciBwYXN0ZWQgPSBlLmNsaXBib2FyZERhdGEuZ2V0RGF0YShlLmNsaXBib2FyZERhdGEudHlwZXNbMF0pO1xuICAgIHV0aWxzLmNhbmNlbF9idWJibGUoZSk7XG4gICAgdGhpcy50cmlnZ2VyKCdwYXN0ZScsIHBhc3RlZCk7XG59O1xuXG4vKipcbiAqIEJpbmQgZXZlbnRzIG9mIHRoZSBoaWRkZW4gdGV4dGJveC5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkNsaXBib2FyZC5wcm90b3R5cGUuX2JpbmRfZXZlbnRzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuXG4gICAgLy8gTGlzdGVuIHRvIGVsJ3MgZm9jdXMgZXZlbnQuICBJZiBlbCBpcyBmb2N1c2VkLCBmb2N1cyB0aGUgaGlkZGVuIGlucHV0XG4gICAgLy8gaW5zdGVhZC5cbiAgICB1dGlscy5ob29rKHRoaXMuX2VsLCAnb25mb2N1cycsIHV0aWxzLnByb3h5KHRoaXMuX2ZvY3VzLCB0aGlzKSk7XG5cbiAgICB1dGlscy5ob29rKHRoaXMuaGlkZGVuX2lucHV0LCAnb25wYXN0ZScsIHV0aWxzLnByb3h5KHRoaXMuX2hhbmRsZV9wYXN0ZSwgdGhpcykpO1xuICAgIHV0aWxzLmhvb2sodGhpcy5oaWRkZW5faW5wdXQsICdvbmN1dCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgLy8gVHJpZ2dlciB0aGUgZXZlbnQgaW4gYSB0aW1lb3V0IHNvIGl0IGZpcmVzIGFmdGVyIHRoZSBzeXN0ZW0gZXZlbnQuXG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHRoYXQudHJpZ2dlcignY3V0JywgdGhhdC5fY2xpcHBhYmxlKTtcbiAgICAgICAgfSwgMCk7XG4gICAgfSk7XG4gICAgdXRpbHMuaG9vayh0aGlzLmhpZGRlbl9pbnB1dCwgJ29uY29weScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgdGhhdC50cmlnZ2VyKCdjb3B5JywgdGhhdC5fY2xpcHBhYmxlKTtcbiAgICB9KTtcbiAgICB1dGlscy5ob29rKHRoaXMuaGlkZGVuX2lucHV0LCAnb25rZXlwcmVzcycsIGZ1bmN0aW9uKCkge1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhhdC5oaWRkZW5faW5wdXQudmFsdWUgPSB0aGF0Ll9jbGlwcGFibGU7XG4gICAgICAgICAgICB0aGF0Ll9mb2N1cygpO1xuICAgICAgICB9LCAwKTtcbiAgICB9KTtcbiAgICB1dGlscy5ob29rKHRoaXMuaGlkZGVuX2lucHV0LCAnb25rZXl1cCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhhdC5oaWRkZW5faW5wdXQudmFsdWUgPSB0aGF0Ll9jbGlwcGFibGU7XG4gICAgICAgICAgICB0aGF0Ll9mb2N1cygpO1xuICAgICAgICB9LCAwKTtcbiAgICB9KTtcbn07XG5cbmV4cG9ydHMuQ2xpcGJvYXJkID0gQ2xpcGJvYXJkO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cbnZhciBrZXltYXAgPSByZXF1aXJlKCcuL2V2ZW50cy9tYXAuanMnKTtcbnZhciByZWdpc3RlciA9IGtleW1hcC5NYXAucmVnaXN0ZXI7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKTtcblxuLyoqXG4gKiBJbnB1dCBjdXJzb3IuXG4gKi9cbnZhciBDdXJzb3IgPSBmdW5jdGlvbihtb2RlbCkge1xuICAgIHV0aWxzLlBvc3RlckNsYXNzLmNhbGwodGhpcyk7XG4gICAgdGhpcy5fbW9kZWwgPSBtb2RlbDtcblxuICAgIHRoaXMucHJpbWFyeV9yb3cgPSBudWxsO1xuICAgIHRoaXMucHJpbWFyeV9jaGFyID0gbnVsbDtcbiAgICB0aGlzLnNlY29uZGFyeV9yb3cgPSBudWxsO1xuICAgIHRoaXMuc2Vjb25kYXJ5X2NoYXIgPSBudWxsO1xuXG4gICAgdGhpcy5faW5pdF9wcm9wZXJ0aWVzKCk7XG4gICAgdGhpcy5fcmVnaXN0ZXJfYXBpKCk7XG59O1xudXRpbHMuaW5oZXJpdChDdXJzb3IsIHV0aWxzLlBvc3RlckNsYXNzKTtcblxuLyoqXG4gKiBNb3ZlcyB0aGUgcHJpbWFyeSBjdXJzb3IgYSBnaXZlbiBvZmZzZXQuXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSB4XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSB5XG4gKiBAcGFyYW0gIHtib29sZWFufSAob3B0aW9uYWwpIGhvcD1mYWxzZSAtIGhvcCB0byB0aGUgb3RoZXIgc2lkZSBvZiB0aGVcbiAqICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkIHJlZ2lvbiBpZiB0aGUgcHJpbWFyeSBpcyBvbiB0aGUgb3Bwb3NpdGUgb2YgdGhlXG4gKiAgICAgICAgICAgICAgICAgICBkaXJlY3Rpb24gb2YgbW90aW9uLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5tb3ZlX3ByaW1hcnkgPSBmdW5jdGlvbih4LCB5LCBob3ApIHtcbiAgICBpZiAoaG9wKSB7XG4gICAgICAgIGlmICh0aGlzLnByaW1hcnlfcm93ICE9IHRoaXMuc2Vjb25kYXJ5X3JvdyB8fCB0aGlzLnByaW1hcnlfY2hhciAhPSB0aGlzLnNlY29uZGFyeV9jaGFyKSB7XG4gICAgICAgICAgICB2YXIgc3RhcnRfcm93ID0gdGhpcy5zdGFydF9yb3c7XG4gICAgICAgICAgICB2YXIgc3RhcnRfY2hhciA9IHRoaXMuc3RhcnRfY2hhcjtcbiAgICAgICAgICAgIHZhciBlbmRfcm93ID0gdGhpcy5lbmRfcm93O1xuICAgICAgICAgICAgdmFyIGVuZF9jaGFyID0gdGhpcy5lbmRfY2hhcjtcbiAgICAgICAgICAgIGlmICh4PDAgfHwgeTwwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wcmltYXJ5X3JvdyA9IHN0YXJ0X3JvdztcbiAgICAgICAgICAgICAgICB0aGlzLnByaW1hcnlfY2hhciA9IHN0YXJ0X2NoYXI7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWNvbmRhcnlfcm93ID0gZW5kX3JvdztcbiAgICAgICAgICAgICAgICB0aGlzLnNlY29uZGFyeV9jaGFyID0gZW5kX2NoYXI7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMucHJpbWFyeV9yb3cgPSBlbmRfcm93O1xuICAgICAgICAgICAgICAgIHRoaXMucHJpbWFyeV9jaGFyID0gZW5kX2NoYXI7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWNvbmRhcnlfcm93ID0gc3RhcnRfcm93O1xuICAgICAgICAgICAgICAgIHRoaXMuc2Vjb25kYXJ5X2NoYXIgPSBzdGFydF9jaGFyO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHggPCAwKSB7XG4gICAgICAgIGlmICh0aGlzLnByaW1hcnlfY2hhciArIHggPCAwKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5wcmltYXJ5X3JvdyA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMucHJpbWFyeV9jaGFyID0gMDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wcmltYXJ5X3JvdyAtPSAxO1xuICAgICAgICAgICAgICAgIHRoaXMucHJpbWFyeV9jaGFyID0gdGhpcy5fbW9kZWwuX3Jvd3NbdGhpcy5wcmltYXJ5X3Jvd10ubGVuZ3RoO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5wcmltYXJ5X2NoYXIgKz0geDtcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoeCA+IDApIHtcbiAgICAgICAgaWYgKHRoaXMucHJpbWFyeV9jaGFyICsgeCA+IHRoaXMuX21vZGVsLl9yb3dzW3RoaXMucHJpbWFyeV9yb3ddLmxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKHRoaXMucHJpbWFyeV9yb3cgPT09IHRoaXMuX21vZGVsLl9yb3dzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnByaW1hcnlfY2hhciA9IHRoaXMuX21vZGVsLl9yb3dzW3RoaXMucHJpbWFyeV9yb3ddLmxlbmd0aDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wcmltYXJ5X3JvdyArPSAxO1xuICAgICAgICAgICAgICAgIHRoaXMucHJpbWFyeV9jaGFyID0gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMucHJpbWFyeV9jaGFyICs9IHg7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBSZW1lbWJlciB0aGUgY2hhcmFjdGVyIHBvc2l0aW9uLCB2ZXJ0aWNhbCBuYXZpZ2F0aW9uIGFjcm9zcyBlbXB0eSBsaW5lc1xuICAgIC8vIHNob3VsZG4ndCBjYXVzZSB0aGUgaG9yaXpvbnRhbCBwb3NpdGlvbiB0byBiZSBsb3N0LlxuICAgIGlmICh4ICE9PSAwKSB7XG4gICAgICAgIHRoaXMuX21lbW9yeV9jaGFyID0gdGhpcy5wcmltYXJ5X2NoYXI7XG4gICAgfVxuXG4gICAgaWYgKHkgIT09IDApIHtcbiAgICAgICAgdGhpcy5wcmltYXJ5X3JvdyArPSB5O1xuICAgICAgICB0aGlzLnByaW1hcnlfcm93ID0gTWF0aC5taW4oTWF0aC5tYXgodGhpcy5wcmltYXJ5X3JvdywgMCksIHRoaXMuX21vZGVsLl9yb3dzLmxlbmd0aC0xKTtcbiAgICAgICAgaWYgKHRoaXMuX21lbW9yeV9jaGFyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRoaXMucHJpbWFyeV9jaGFyID0gdGhpcy5fbWVtb3J5X2NoYXI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMucHJpbWFyeV9jaGFyID4gdGhpcy5fbW9kZWwuX3Jvd3NbdGhpcy5wcmltYXJ5X3Jvd10ubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLnByaW1hcnlfY2hhciA9IHRoaXMuX21vZGVsLl9yb3dzW3RoaXMucHJpbWFyeV9yb3ddLmxlbmd0aDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7IFxufTtcblxuLyoqXG4gKiBXYWxrIHRoZSBwcmltYXJ5IGN1cnNvciBpbiBhIGRpcmVjdGlvbiB1bnRpbCBhIG5vdC10ZXh0IGNoYXJhY3RlciBpcyBmb3VuZC5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IGRpcmVjdGlvblxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS53b3JkX3ByaW1hcnkgPSBmdW5jdGlvbihkaXJlY3Rpb24pIHtcbiAgICAvLyBNYWtlIHN1cmUgZGlyZWN0aW9uIGlzIDEgb3IgLTEuXG4gICAgZGlyZWN0aW9uID0gZGlyZWN0aW9uIDwgMCA/IC0xIDogMTtcblxuICAgIC8vIElmIG1vdmluZyBsZWZ0IGFuZCBhdCBlbmQgb2Ygcm93LCBtb3ZlIHVwIGEgcm93IGlmIHBvc3NpYmxlLlxuICAgIGlmICh0aGlzLnByaW1hcnlfY2hhciA9PT0gMCAmJiBkaXJlY3Rpb24gPT0gLTEpIHtcbiAgICAgICAgaWYgKHRoaXMucHJpbWFyeV9yb3cgIT09IDApIHtcbiAgICAgICAgICAgIHRoaXMucHJpbWFyeV9yb3ctLTtcbiAgICAgICAgICAgIHRoaXMucHJpbWFyeV9jaGFyID0gdGhpcy5fbW9kZWwuX3Jvd3NbdGhpcy5wcmltYXJ5X3Jvd10ubGVuZ3RoO1xuICAgICAgICAgICAgdGhpcy5fbWVtb3J5X2NoYXIgPSB0aGlzLnByaW1hcnlfY2hhcjtcbiAgICAgICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7IFxuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBJZiBtb3ZpbmcgcmlnaHQgYW5kIGF0IGVuZCBvZiByb3csIG1vdmUgZG93biBhIHJvdyBpZiBwb3NzaWJsZS5cbiAgICBpZiAodGhpcy5wcmltYXJ5X2NoYXIgPj0gdGhpcy5fbW9kZWwuX3Jvd3NbdGhpcy5wcmltYXJ5X3Jvd10ubGVuZ3RoICYmIGRpcmVjdGlvbiA9PSAxKSB7XG4gICAgICAgIGlmICh0aGlzLnByaW1hcnlfcm93IDwgdGhpcy5fbW9kZWwuX3Jvd3MubGVuZ3RoLTEpIHtcbiAgICAgICAgICAgIHRoaXMucHJpbWFyeV9yb3crKztcbiAgICAgICAgICAgIHRoaXMucHJpbWFyeV9jaGFyID0gMDtcbiAgICAgICAgICAgIHRoaXMuX21lbW9yeV9jaGFyID0gdGhpcy5wcmltYXJ5X2NoYXI7XG4gICAgICAgICAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZScpOyBcbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGkgPSB0aGlzLnByaW1hcnlfY2hhcjtcbiAgICB2YXIgaGl0X3RleHQgPSBmYWxzZTtcbiAgICB2YXIgcm93X3RleHQgPSB0aGlzLl9tb2RlbC5fcm93c1t0aGlzLnByaW1hcnlfcm93XTtcbiAgICBpZiAoZGlyZWN0aW9uID09IC0xKSB7XG4gICAgICAgIHdoaWxlICgwIDwgaSAmJiAhKGhpdF90ZXh0ICYmIHRoaXMuX25vdF90ZXh0KHJvd190ZXh0W2ktMV0pKSkge1xuICAgICAgICAgICAgaGl0X3RleHQgPSBoaXRfdGV4dCB8fCAhdGhpcy5fbm90X3RleHQocm93X3RleHRbaS0xXSk7XG4gICAgICAgICAgICBpICs9IGRpcmVjdGlvbjtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHdoaWxlIChpIDwgcm93X3RleHQubGVuZ3RoICYmICEoaGl0X3RleHQgJiYgdGhpcy5fbm90X3RleHQocm93X3RleHRbaV0pKSkge1xuICAgICAgICAgICAgaGl0X3RleHQgPSBoaXRfdGV4dCB8fCAhdGhpcy5fbm90X3RleHQocm93X3RleHRbaV0pO1xuICAgICAgICAgICAgaSArPSBkaXJlY3Rpb247XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLnByaW1hcnlfY2hhciA9IGk7XG4gICAgdGhpcy5fbWVtb3J5X2NoYXIgPSB0aGlzLnByaW1hcnlfY2hhcjtcbiAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZScpOyBcbn07XG5cbi8qKlxuICogU2VsZWN0IGFsbCBvZiB0aGUgdGV4dC5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuc2VsZWN0X2FsbCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMucHJpbWFyeV9yb3cgPSB0aGlzLl9tb2RlbC5fcm93cy5sZW5ndGgtMTtcbiAgICB0aGlzLnByaW1hcnlfY2hhciA9IHRoaXMuX21vZGVsLl9yb3dzW3RoaXMucHJpbWFyeV9yb3ddLmxlbmd0aDtcbiAgICB0aGlzLnNlY29uZGFyeV9yb3cgPSAwO1xuICAgIHRoaXMuc2Vjb25kYXJ5X2NoYXIgPSAwO1xuICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7IFxufTtcblxuLyoqXG4gKiBNb3ZlIHRoZSBwcmltYXJ5IGN1cnNvciB0byB0aGUgbGluZSBlbmQuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3IucHJvdG90eXBlLnByaW1hcnlfZ290b19lbmQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnByaW1hcnlfY2hhciA9IHRoaXMuX21vZGVsLl9yb3dzW3RoaXMucHJpbWFyeV9yb3ddLmxlbmd0aDtcbiAgICB0aGlzLl9tZW1vcnlfY2hhciA9IHRoaXMucHJpbWFyeV9jaGFyO1xuICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7IFxufTtcblxuLyoqXG4gKiBNb3ZlIHRoZSBwcmltYXJ5IGN1cnNvciB0byB0aGUgbGluZSBzdGFydC5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvci5wcm90b3R5cGUucHJpbWFyeV9nb3RvX3N0YXJ0ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5wcmltYXJ5X2NoYXIgPSAwO1xuICAgIHRoaXMuX21lbW9yeV9jaGFyID0gdGhpcy5wcmltYXJ5X2NoYXI7XG4gICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2UnKTsgXG59O1xuXG4vKipcbiAqIFNldCB0aGUgcHJpbWFyeSBjdXJzb3IgcG9zaXRpb25cbiAqIEBwYXJhbSB7aW50ZWdlcn0gcm93X2luZGV4XG4gKiBAcGFyYW0ge2ludGVnZXJ9IGNoYXJfaW5kZXhcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5zZXRfcHJpbWFyeSA9IGZ1bmN0aW9uKHJvd19pbmRleCwgY2hhcl9pbmRleCkge1xuICAgIHRoaXMucHJpbWFyeV9yb3cgPSByb3dfaW5kZXg7XG4gICAgdGhpcy5wcmltYXJ5X2NoYXIgPSBjaGFyX2luZGV4O1xuXG4gICAgLy8gUmVtZW1iZXIgdGhlIGNoYXJhY3RlciBwb3NpdGlvbiwgdmVydGljYWwgbmF2aWdhdGlvbiBhY3Jvc3MgZW1wdHkgbGluZXNcbiAgICAvLyBzaG91bGRuJ3QgY2F1c2UgdGhlIGhvcml6b250YWwgcG9zaXRpb24gdG8gYmUgbG9zdC5cbiAgICB0aGlzLl9tZW1vcnlfY2hhciA9IHRoaXMucHJpbWFyeV9jaGFyO1xuXG4gICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2UnKTsgXG59O1xuXG4vKipcbiAqIFNldCB0aGUgc2Vjb25kYXJ5IGN1cnNvciBwb3NpdGlvblxuICogQHBhcmFtIHtpbnRlZ2VyfSByb3dfaW5kZXhcbiAqIEBwYXJhbSB7aW50ZWdlcn0gY2hhcl9pbmRleFxuICovXG5DdXJzb3IucHJvdG90eXBlLnNldF9zZWNvbmRhcnkgPSBmdW5jdGlvbihyb3dfaW5kZXgsIGNoYXJfaW5kZXgpIHtcbiAgICB0aGlzLnNlY29uZGFyeV9yb3cgPSByb3dfaW5kZXg7XG4gICAgdGhpcy5zZWNvbmRhcnlfY2hhciA9IGNoYXJfaW5kZXg7XG4gICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2UnKTsgXG59O1xuXG4vKipcbiAqIFNldHMgYm90aCB0aGUgcHJpbWFyeSBhbmQgc2Vjb25kYXJ5IGN1cnNvciBwb3NpdGlvbnNcbiAqIEBwYXJhbSB7aW50ZWdlcn0gcm93X2luZGV4XG4gKiBAcGFyYW0ge2ludGVnZXJ9IGNoYXJfaW5kZXhcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5zZXRfYm90aCA9IGZ1bmN0aW9uKHJvd19pbmRleCwgY2hhcl9pbmRleCkge1xuICAgIHRoaXMucHJpbWFyeV9yb3cgPSByb3dfaW5kZXg7XG4gICAgdGhpcy5wcmltYXJ5X2NoYXIgPSBjaGFyX2luZGV4O1xuICAgIHRoaXMuc2Vjb25kYXJ5X3JvdyA9IHJvd19pbmRleDtcbiAgICB0aGlzLnNlY29uZGFyeV9jaGFyID0gY2hhcl9pbmRleDtcblxuICAgIC8vIFJlbWVtYmVyIHRoZSBjaGFyYWN0ZXIgcG9zaXRpb24sIHZlcnRpY2FsIG5hdmlnYXRpb24gYWNyb3NzIGVtcHR5IGxpbmVzXG4gICAgLy8gc2hvdWxkbid0IGNhdXNlIHRoZSBob3Jpem9udGFsIHBvc2l0aW9uIHRvIGJlIGxvc3QuXG4gICAgdGhpcy5fbWVtb3J5X2NoYXIgPSB0aGlzLnByaW1hcnlfY2hhcjtcblxuICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7IFxufTtcblxuLyoqXG4gKiBIYW5kbGVzIHdoZW4gYSBrZXkgaXMgcHJlc3NlZC5cbiAqIEBwYXJhbSAge0V2ZW50fSBlIC0gb3JpZ2luYWwga2V5IHByZXNzIGV2ZW50LlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5rZXlwcmVzcyA9IGZ1bmN0aW9uKGUpIHtcbiAgICB2YXIgY2hhcl9jb2RlID0gZS53aGljaCB8fCBlLmtleUNvZGU7XG4gICAgdmFyIGNoYXJfdHlwZWQgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGNoYXJfY29kZSk7XG4gICAgdGhpcy5yZW1vdmVfc2VsZWN0ZWQoKTtcbiAgICB0aGlzLl9tb2RlbC5hZGRfdGV4dCh0aGlzLnByaW1hcnlfcm93LCB0aGlzLnByaW1hcnlfY2hhciwgY2hhcl90eXBlZCk7XG4gICAgdGhpcy5tb3ZlX3ByaW1hcnkoMSwgMCk7XG4gICAgdGhpcy5fcmVzZXRfc2Vjb25kYXJ5KCk7XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIEluc2VydCBhIG5ld2xpbmVcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvci5wcm90b3R5cGUubmV3bGluZSA9IGZ1bmN0aW9uKGUpIHtcbiAgICB0aGlzLnJlbW92ZV9zZWxlY3RlZCgpO1xuICAgIHRoaXMuX21vZGVsLmFkZF90ZXh0KHRoaXMucHJpbWFyeV9yb3csIHRoaXMucHJpbWFyeV9jaGFyLCAnXFxuJyk7XG4gICAgdGhpcy5tb3ZlX3ByaW1hcnkoMCwgMSk7XG4gICAgdGhpcy5fcmVzZXRfc2Vjb25kYXJ5KCk7XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIEluc2VydCB0ZXh0XG4gKiBAcGFyYW0gIHtzdHJpbmd9IHRleHRcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuaW5zZXJ0X3RleHQgPSBmdW5jdGlvbih0ZXh0KSB7XG4gICAgdGhpcy5yZW1vdmVfc2VsZWN0ZWQoKTtcbiAgICB0aGlzLl9tb2RlbC5hZGRfdGV4dCh0aGlzLnByaW1hcnlfcm93LCB0aGlzLnByaW1hcnlfY2hhciwgdGV4dCk7XG4gICAgXG4gICAgLy8gTW92ZSBjdXJzb3IgdG8gdGhlIGVuZC5cbiAgICBpZiAodGV4dC5pbmRleE9mKCdcXG4nKT09LTEpIHtcbiAgICAgICAgdGhpcy5wcmltYXJ5X2NoYXIgPSB0aGlzLnN0YXJ0X2NoYXIgKyB0ZXh0Lmxlbmd0aDtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgbGluZXMgPSB0ZXh0LnNwbGl0KCdcXG4nKTtcbiAgICAgICAgdGhpcy5wcmltYXJ5X3JvdyArPSBsaW5lcy5sZW5ndGggLSAxO1xuICAgICAgICB0aGlzLnByaW1hcnlfY2hhciA9IGxpbmVzW2xpbmVzLmxlbmd0aC0xXS5sZW5ndGg7XG4gICAgfVxuICAgIHRoaXMuX3Jlc2V0X3NlY29uZGFyeSgpO1xuXG4gICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2UnKTsgXG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIFJlbW92ZSB0aGUgc2VsZWN0ZWQgdGV4dFxuICogQHJldHVybiB7Ym9vbGVhbn0gdHJ1ZSBpZiB0ZXh0IHdhcyByZW1vdmVkLlxuICovXG5DdXJzb3IucHJvdG90eXBlLnJlbW92ZV9zZWxlY3RlZCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLnByaW1hcnlfcm93ICE9PSB0aGlzLnNlY29uZGFyeV9yb3cgfHwgdGhpcy5wcmltYXJ5X2NoYXIgIT09IHRoaXMuc2Vjb25kYXJ5X2NoYXIpIHtcbiAgICAgICAgdmFyIHJvd19pbmRleCA9IHRoaXMuc3RhcnRfcm93O1xuICAgICAgICB2YXIgY2hhcl9pbmRleCA9IHRoaXMuc3RhcnRfY2hhcjtcbiAgICAgICAgdGhpcy5fbW9kZWwucmVtb3ZlX3RleHQodGhpcy5zdGFydF9yb3csIHRoaXMuc3RhcnRfY2hhciwgdGhpcy5lbmRfcm93LCB0aGlzLmVuZF9jaGFyKTtcbiAgICAgICAgdGhpcy5wcmltYXJ5X3JvdyA9IHJvd19pbmRleDtcbiAgICAgICAgdGhpcy5wcmltYXJ5X2NoYXIgPSBjaGFyX2luZGV4O1xuICAgICAgICB0aGlzLl9yZXNldF9zZWNvbmRhcnkoKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2UnKTsgXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG4vKipcbiAqIENvcGllcyB0aGUgc2VsZWN0ZWQgdGV4dC5cbiAqIEByZXR1cm4ge3N0cmluZ30gc2VsZWN0ZWQgdGV4dFxuICovXG5DdXJzb3IucHJvdG90eXBlLmNvcHkgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5wcmltYXJ5X3JvdyA9PSB0aGlzLnNlY29uZGFyeV9yb3cgJiYgdGhpcy5wcmltYXJ5X2NoYXIgPT0gdGhpcy5zZWNvbmRhcnlfY2hhcikge1xuICAgICAgICByZXR1cm4gdGhpcy5fbW9kZWwuX3Jvd3NbdGhpcy5wcmltYXJ5X3Jvd107XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX21vZGVsLmdldF90ZXh0KHRoaXMuc3RhcnRfcm93LCB0aGlzLnN0YXJ0X2NoYXIsIHRoaXMuZW5kX3JvdywgdGhpcy5lbmRfY2hhcik7XG4gICAgfVxufTtcblxuLyoqXG4gKiBDdXRzIHRoZSBzZWxlY3RlZCB0ZXh0LlxuICogQHJldHVybiB7c3RyaW5nfSBzZWxlY3RlZCB0ZXh0XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuY3V0ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRleHQgPSB0aGlzLmNvcHkoKTtcbiAgICBpZiAodGhpcy5wcmltYXJ5X3JvdyA9PSB0aGlzLnNlY29uZGFyeV9yb3cgJiYgdGhpcy5wcmltYXJ5X2NoYXIgPT0gdGhpcy5zZWNvbmRhcnlfY2hhcikge1xuICAgICAgICB0aGlzLl9tb2RlbC5yZW1vdmVfcm93KHRoaXMucHJpbWFyeV9yb3cpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMucmVtb3ZlX3NlbGVjdGVkKCk7XG4gICAgfVxuICAgIHJldHVybiB0ZXh0O1xufTtcblxuLyoqXG4gKiBEZWxldGUgZm9yd2FyZCwgdHlwaWNhbGx5IGNhbGxlZCBieSBgZGVsZXRlYCBrZXlwcmVzcy5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuZGVsZXRlX2ZvcndhcmQgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoIXRoaXMucmVtb3ZlX3NlbGVjdGVkKCkpIHtcbiAgICAgICAgdGhpcy5tb3ZlX3ByaW1hcnkoMSwgMCk7XG4gICAgICAgIHRoaXMucmVtb3ZlX3NlbGVjdGVkKCk7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBEZWxldGUgYmFja3dhcmQsIHR5cGljYWxseSBjYWxsZWQgYnkgYGJhY2tzcGFjZWAga2V5cHJlc3MuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3IucHJvdG90eXBlLmRlbGV0ZV9iYWNrd2FyZCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICghdGhpcy5yZW1vdmVfc2VsZWN0ZWQoKSkge1xuICAgICAgICB0aGlzLm1vdmVfcHJpbWFyeSgtMSwgMCk7XG4gICAgICAgIHRoaXMucmVtb3ZlX3NlbGVjdGVkKCk7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBSZXNldCB0aGUgc2Vjb25kYXJ5IGN1cnNvciB0byB0aGUgdmFsdWUgb2YgdGhlIHByaW1hcnkuXG4gKiBAcmV0dXJuIHtbdHlwZV19IFtkZXNjcmlwdGlvbl1cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5fcmVzZXRfc2Vjb25kYXJ5ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zZWNvbmRhcnlfcm93ID0gdGhpcy5wcmltYXJ5X3JvdztcbiAgICB0aGlzLnNlY29uZGFyeV9jaGFyID0gdGhpcy5wcmltYXJ5X2NoYXI7XG5cbiAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZScpOyBcbn07XG5cbi8qKlxuICogQ3JlYXRlIHRoZSBwcm9wZXJ0aWVzIG9mIHRoZSBjdXJzb3IuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3IucHJvdG90eXBlLl9pbml0X3Byb3BlcnRpZXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdGhpcy5wcm9wZXJ0eSgnc3RhcnRfcm93JywgZnVuY3Rpb24oKSB7IHJldHVybiBNYXRoLm1pbih0aGF0LnByaW1hcnlfcm93LCB0aGF0LnNlY29uZGFyeV9yb3cpOyB9KTtcbiAgICB0aGlzLnByb3BlcnR5KCdlbmRfcm93JywgZnVuY3Rpb24oKSB7IHJldHVybiBNYXRoLm1heCh0aGF0LnByaW1hcnlfcm93LCB0aGF0LnNlY29uZGFyeV9yb3cpOyB9KTtcbiAgICB0aGlzLnByb3BlcnR5KCdzdGFydF9jaGFyJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0aGF0LnByaW1hcnlfcm93IDwgdGhhdC5zZWNvbmRhcnlfcm93IHx8ICh0aGF0LnByaW1hcnlfcm93ID09IHRoYXQuc2Vjb25kYXJ5X3JvdyAmJiB0aGF0LnByaW1hcnlfY2hhciA8PSB0aGF0LnNlY29uZGFyeV9jaGFyKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoYXQucHJpbWFyeV9jaGFyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoYXQuc2Vjb25kYXJ5X2NoYXI7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICB0aGlzLnByb3BlcnR5KCdlbmRfY2hhcicsIGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodGhhdC5wcmltYXJ5X3JvdyA8IHRoYXQuc2Vjb25kYXJ5X3JvdyB8fCAodGhhdC5wcmltYXJ5X3JvdyA9PSB0aGF0LnNlY29uZGFyeV9yb3cgJiYgdGhhdC5wcmltYXJ5X2NoYXIgPD0gdGhhdC5zZWNvbmRhcnlfY2hhcikpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGF0LnNlY29uZGFyeV9jaGFyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoYXQucHJpbWFyeV9jaGFyO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiB0aGUgY2hhcmFjdGVyIGlzbid0IHRleHQuXG4gKiBAcGFyYW0gIHtjaGFyfSBjIC0gY2hhcmFjdGVyXG4gKiBAcmV0dXJuIHtib29sZWFufSB0cnVlIGlmIHRoZSBjaGFyYWN0ZXIgaXMgbm90IHRleHQuXG4gKi9cbkN1cnNvci5wcm90b3R5cGUuX25vdF90ZXh0ID0gZnVuY3Rpb24oYykge1xuICAgIHJldHVybiAnYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY3ODkwJy5pbmRleE9mKGMudG9Mb3dlckNhc2UoKSkgPT0gLTE7XG59O1xuXG4vKipcbiAqIFJlZ2lzdGVycyBhbiBhY3Rpb24gQVBJIHdpdGggdGhlIG1hcFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5fcmVnaXN0ZXJfYXBpID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3IucmVtb3ZlX3NlbGVjdGVkJywgdXRpbHMucHJveHkodGhpcy5yZW1vdmVfc2VsZWN0ZWQsIHRoaXMpLCB0aGlzKTtcbiAgICByZWdpc3RlcignY3Vyc29yLmtleXByZXNzJywgdXRpbHMucHJveHkodGhpcy5rZXlwcmVzcywgdGhpcyksIHRoaXMpO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3IubmV3bGluZScsIHV0aWxzLnByb3h5KHRoaXMubmV3bGluZSwgdGhpcyksIHRoaXMpO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3IuaW5zZXJ0X3RleHQnLCB1dGlscy5wcm94eSh0aGlzLmluc2VydF90ZXh0LCB0aGlzKSwgdGhpcyk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5kZWxldGVfYmFja3dhcmQnLCB1dGlscy5wcm94eSh0aGlzLmRlbGV0ZV9iYWNrd2FyZCwgdGhpcyksIHRoaXMpO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3IuZGVsZXRlX2ZvcndhcmQnLCB1dGlscy5wcm94eSh0aGlzLmRlbGV0ZV9mb3J3YXJkLCB0aGlzKSwgdGhpcyk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5zZWxlY3RfYWxsJywgdXRpbHMucHJveHkodGhpcy5zZWxlY3RfYWxsLCB0aGlzKSwgdGhpcyk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5sZWZ0JywgZnVuY3Rpb24oKSB7IHRoYXQubW92ZV9wcmltYXJ5KC0xLCAwLCB0cnVlKTsgdGhhdC5fcmVzZXRfc2Vjb25kYXJ5KCk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLnJpZ2h0JywgZnVuY3Rpb24oKSB7IHRoYXQubW92ZV9wcmltYXJ5KDEsIDAsIHRydWUpOyB0aGF0Ll9yZXNldF9zZWNvbmRhcnkoKTsgcmV0dXJuIHRydWU7IH0pO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3IudXAnLCBmdW5jdGlvbigpIHsgdGhhdC5tb3ZlX3ByaW1hcnkoMCwgLTEsIHRydWUpOyB0aGF0Ll9yZXNldF9zZWNvbmRhcnkoKTsgcmV0dXJuIHRydWU7IH0pO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3IuZG93bicsIGZ1bmN0aW9uKCkgeyB0aGF0Lm1vdmVfcHJpbWFyeSgwLCAxLCB0cnVlKTsgdGhhdC5fcmVzZXRfc2Vjb25kYXJ5KCk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLnNlbGVjdF9sZWZ0JywgZnVuY3Rpb24oKSB7IHRoYXQubW92ZV9wcmltYXJ5KC0xLCAwKTsgcmV0dXJuIHRydWU7IH0pO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3Iuc2VsZWN0X3JpZ2h0JywgZnVuY3Rpb24oKSB7IHRoYXQubW92ZV9wcmltYXJ5KDEsIDApOyByZXR1cm4gdHJ1ZTsgfSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5zZWxlY3RfdXAnLCBmdW5jdGlvbigpIHsgdGhhdC5tb3ZlX3ByaW1hcnkoMCwgLTEpOyByZXR1cm4gdHJ1ZTsgfSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5zZWxlY3RfZG93bicsIGZ1bmN0aW9uKCkgeyB0aGF0Lm1vdmVfcHJpbWFyeSgwLCAxKTsgcmV0dXJuIHRydWU7IH0pO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3Iud29yZF9sZWZ0JywgZnVuY3Rpb24oKSB7IHRoYXQud29yZF9wcmltYXJ5KC0xKTsgdGhhdC5fcmVzZXRfc2Vjb25kYXJ5KCk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLndvcmRfcmlnaHQnLCBmdW5jdGlvbigpIHsgdGhhdC53b3JkX3ByaW1hcnkoMSk7IHRoYXQuX3Jlc2V0X3NlY29uZGFyeSgpOyByZXR1cm4gdHJ1ZTsgfSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5zZWxlY3Rfd29yZF9sZWZ0JywgZnVuY3Rpb24oKSB7IHRoYXQud29yZF9wcmltYXJ5KC0xKTsgcmV0dXJuIHRydWU7IH0pO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3Iuc2VsZWN0X3dvcmRfcmlnaHQnLCBmdW5jdGlvbigpIHsgdGhhdC53b3JkX3ByaW1hcnkoMSk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLmxpbmVfc3RhcnQnLCBmdW5jdGlvbigpIHsgdGhhdC5wcmltYXJ5X2dvdG9fc3RhcnQoKTsgdGhhdC5fcmVzZXRfc2Vjb25kYXJ5KCk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLmxpbmVfZW5kJywgZnVuY3Rpb24oKSB7IHRoYXQucHJpbWFyeV9nb3RvX2VuZCgpOyB0aGF0Ll9yZXNldF9zZWNvbmRhcnkoKTsgcmV0dXJuIHRydWU7IH0pO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3Iuc2VsZWN0X2xpbmVfc3RhcnQnLCBmdW5jdGlvbigpIHsgdGhhdC5wcmltYXJ5X2dvdG9fc3RhcnQoKTsgcmV0dXJuIHRydWU7IH0pO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3Iuc2VsZWN0X2xpbmVfZW5kJywgZnVuY3Rpb24oKSB7IHRoYXQucHJpbWFyeV9nb3RvX2VuZCgpOyByZXR1cm4gdHJ1ZTsgfSk7XG59O1xuXG5leHBvcnRzLkN1cnNvciA9IEN1cnNvcjsiLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxudmFyIGtleW1hcCA9IHJlcXVpcmUoJy4vZXZlbnRzL21hcC5qcycpO1xudmFyIHJlZ2lzdGVyID0ga2V5bWFwLk1hcC5yZWdpc3RlcjtcblxudmFyIGN1cnNvciA9IHJlcXVpcmUoJy4vY3Vyc29yLmpzJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG4vKipcbiAqIE1hbmFnZXMgb25lIG9yIG1vcmUgY3Vyc29yc1xuICovXG52YXIgQ3Vyc29ycyA9IGZ1bmN0aW9uKG1vZGVsLCBjbGlwYm9hcmQpIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMuX21vZGVsID0gbW9kZWw7XG4gICAgdGhpcy5nZXRfcm93X2NoYXIgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5jdXJzb3JzID0gW107XG4gICAgdGhpcy5fc2VsZWN0aW5nX3RleHQgPSBmYWxzZTtcbiAgICB0aGlzLl9jbGlwYm9hcmQgPSBjbGlwYm9hcmQ7XG5cbiAgICAvLyBDcmVhdGUgaW5pdGlhbCBjdXJzb3IuXG4gICAgdGhpcy5jcmVhdGUoKTtcblxuICAgIC8vIFJlZ2lzdGVyIGFjdGlvbnMuXG4gICAgcmVnaXN0ZXIoJ2N1cnNvcnMuc3RhcnRfc2VsZWN0aW9uJywgdXRpbHMucHJveHkodGhpcy5zdGFydF9zZWxlY3Rpb24sIHRoaXMpKTtcbiAgICByZWdpc3RlcignY3Vyc29ycy5zZXRfc2VsZWN0aW9uJywgdXRpbHMucHJveHkodGhpcy5zZXRfc2VsZWN0aW9uLCB0aGlzKSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvcnMuZW5kX3NlbGVjdGlvbicsIHV0aWxzLnByb3h5KHRoaXMuZW5kX3NlbGVjdGlvbiwgdGhpcykpO1xuXG4gICAgLy8gQmluZCBjbGlwYm9hcmQgZXZlbnRzLlxuICAgIHRoaXMuX2NsaXBib2FyZC5vbignY3V0JywgdXRpbHMucHJveHkodGhpcy5faGFuZGxlX2N1dCwgdGhpcykpO1xuICAgIHRoaXMuX2NsaXBib2FyZC5vbigncGFzdGUnLCB1dGlscy5wcm94eSh0aGlzLl9oYW5kbGVfcGFzdGUsIHRoaXMpKTtcbn07XG51dGlscy5pbmhlcml0KEN1cnNvcnMsIHV0aWxzLlBvc3RlckNsYXNzKTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgY3Vyc29yIGFuZCBtYW5hZ2VzIGl0LlxuICogQHJldHVybiB7Q3Vyc29yfSBjdXJzb3JcbiAqL1xuQ3Vyc29ycy5wcm90b3R5cGUuY3JlYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIG5ld19jdXJzb3IgPSBuZXcgY3Vyc29yLkN1cnNvcih0aGlzLl9tb2RlbCwgdGhpcy5faW5wdXRfZGlzcGF0Y2hlcik7XG4gICAgdGhpcy5jdXJzb3JzLnB1c2gobmV3X2N1cnNvcik7XG5cbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgbmV3X2N1cnNvci5vbignY2hhbmdlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoYXQudHJpZ2dlcignY2hhbmdlJywgbmV3X2N1cnNvcik7XG4gICAgICAgIHRoYXQuX3VwZGF0ZV9zZWxlY3Rpb24oKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBuZXdfY3Vyc29yO1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIHdoZW4gdGhlIHNlbGVjdGVkIHRleHQgaXMgY3V0IHRvIHRoZSBjbGlwYm9hcmQuXG4gKiBAcGFyYW0gIHtzdHJpbmd9IHRleHQgLSBieSB2YWwgdGV4dCB0aGF0IHdhcyBjdXRcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvcnMucHJvdG90eXBlLl9oYW5kbGVfY3V0ID0gZnVuY3Rpb24odGV4dCkge1xuICAgIHRoaXMuY3Vyc29ycy5mb3JFYWNoKGZ1bmN0aW9uKGN1cnNvcikge1xuICAgICAgICBjdXJzb3IuY3V0KCk7XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgd2hlbiB0ZXh0IGlzIHBhc3RlZCBpbnRvIHRoZSBkb2N1bWVudC5cbiAqIEBwYXJhbSAge3N0cmluZ30gdGV4dFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29ycy5wcm90b3R5cGUuX2hhbmRsZV9wYXN0ZSA9IGZ1bmN0aW9uKHRleHQpIHtcblxuICAgIC8vIElmIHRoZSBtb2R1bHVzIG9mIHRoZSBudW1iZXIgb2YgY3Vyc29ycyBhbmQgdGhlIG51bWJlciBvZiBwYXN0ZWQgbGluZXNcbiAgICAvLyBvZiB0ZXh0IGlzIHplcm8sIHNwbGl0IHRoZSBjdXQgbGluZXMgYW1vbmcgdGhlIGN1cnNvcnMuXG4gICAgdmFyIGxpbmVzID0gdGV4dC5zcGxpdCgnXFxuJyk7XG4gICAgaWYgKHRoaXMuY3Vyc29ycy5sZW5ndGggPiAxICYmIGxpbmVzLmxlbmd0aCA+IDEgJiYgbGluZXMubGVuZ3RoICUgdGhpcy5jdXJzb3JzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB2YXIgbGluZXNfcGVyX2N1cnNvciA9IGxpbmVzLmxlbmd0aCAvIHRoaXMuY3Vyc29ycy5sZW5ndGg7XG4gICAgICAgIHRoaXMuY3Vyc29ycy5mb3JFYWNoKGZ1bmN0aW9uKGN1cnNvciwgaW5kZXgpIHtcbiAgICAgICAgICAgIGN1cnNvci5pbnNlcnRfdGV4dChsaW5lcy5zbGljZShcbiAgICAgICAgICAgICAgICBpbmRleCAqIGxpbmVzX3Blcl9jdXJzb3IsIFxuICAgICAgICAgICAgICAgIGluZGV4ICogbGluZXNfcGVyX2N1cnNvciArIGxpbmVzX3Blcl9jdXJzb3IpLmpvaW4oJ1xcbicpKTtcbiAgICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5jdXJzb3JzLmZvckVhY2goZnVuY3Rpb24oY3Vyc29yKSB7XG4gICAgICAgICAgICBjdXJzb3IuaW5zZXJ0X3RleHQodGV4dCk7XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG5cbi8qKlxuICogVXBkYXRlIHRoZSBjbGlwcGFibGUgdGV4dCBiYXNlZCBvbiBuZXcgc2VsZWN0aW9uLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29ycy5wcm90b3R5cGUuX3VwZGF0ZV9zZWxlY3Rpb24gPSBmdW5jdGlvbigpIHtcbiAgICBcbiAgICAvLyBDb3B5IGFsbCBvZiB0aGUgc2VsZWN0ZWQgdGV4dC5cbiAgICB2YXIgc2VsZWN0aW9ucyA9IFtdO1xuICAgIHRoaXMuY3Vyc29ycy5mb3JFYWNoKGZ1bmN0aW9uKGN1cnNvcikge1xuICAgICAgICBzZWxlY3Rpb25zLnB1c2goY3Vyc29yLmNvcHkoKSk7XG4gICAgfSk7XG5cbiAgICAvLyBNYWtlIHRoZSBjb3BpZWQgdGV4dCBjbGlwcGFibGUuXG4gICAgdGhpcy5fY2xpcGJvYXJkLnNldF9jbGlwcGFibGUoc2VsZWN0aW9ucy5qb2luKCdcXG4nKSk7XG59O1xuXG4vKipcbiAqIFN0YXJ0cyBzZWxlY3RpbmcgdGV4dCBmcm9tIG1vdXNlIGNvb3JkaW5hdGVzLlxuICogQHBhcmFtICB7TW91c2VFdmVudH0gZSAtIG1vdXNlIGV2ZW50IGNvbnRhaW5pbmcgdGhlIGNvb3JkaW5hdGVzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29ycy5wcm90b3R5cGUuc3RhcnRfc2VsZWN0aW9uID0gZnVuY3Rpb24oZSkge1xuICAgIHZhciB4ID0gZS5vZmZzZXRYO1xuICAgIHZhciB5ID0gZS5vZmZzZXRZO1xuXG4gICAgdGhpcy5fc2VsZWN0aW5nX3RleHQgPSB0cnVlO1xuICAgIGlmICh0aGlzLmdldF9yb3dfY2hhcikge1xuICAgICAgICB2YXIgbG9jYXRpb24gPSB0aGlzLmdldF9yb3dfY2hhcih4LCB5KTtcbiAgICAgICAgdGhpcy5jdXJzb3JzWzBdLnNldF9ib3RoKGxvY2F0aW9uLnJvd19pbmRleCwgbG9jYXRpb24uY2hhcl9pbmRleCk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBGaW5hbGl6ZXMgdGhlIHNlbGVjdGlvbiBvZiB0ZXh0LlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29ycy5wcm90b3R5cGUuZW5kX3NlbGVjdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3NlbGVjdGluZ190ZXh0ID0gZmFsc2U7XG59O1xuXG4vKipcbiAqIFNldHMgdGhlIGVuZHBvaW50IG9mIHRleHQgc2VsZWN0aW9uIGZyb20gbW91c2UgY29vcmRpbmF0ZXMuXG4gKiBAcGFyYW0gIHtNb3VzZUV2ZW50fSBlIC0gbW91c2UgZXZlbnQgY29udGFpbmluZyB0aGUgY29vcmRpbmF0ZXMuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3JzLnByb3RvdHlwZS5zZXRfc2VsZWN0aW9uID0gZnVuY3Rpb24oZSkge1xuICAgIHZhciB4ID0gZS5vZmZzZXRYO1xuICAgIHZhciB5ID0gZS5vZmZzZXRZO1xuXG4gICAgaWYgKHRoaXMuX3NlbGVjdGluZ190ZXh0ICYmIHRoaXMuZ2V0X3Jvd19jaGFyKSB7XG4gICAgICAgIHZhciBsb2NhdGlvbiA9IHRoaXMuZ2V0X3Jvd19jaGFyKHgsIHkpO1xuICAgICAgICB0aGlzLmN1cnNvcnNbdGhpcy5jdXJzb3JzLmxlbmd0aC0xXS5zZXRfcHJpbWFyeShsb2NhdGlvbi5yb3dfaW5kZXgsIGxvY2F0aW9uLmNoYXJfaW5kZXgpO1xuICAgIH1cbn07XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuQ3Vyc29ycyA9IEN1cnNvcnM7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG52YXIgbm9ybWFsaXplciA9IHJlcXVpcmUoJy4vZXZlbnRzL25vcm1hbGl6ZXIuanMnKTtcbnZhciBrZXltYXAgPSByZXF1aXJlKCcuL2V2ZW50cy9tYXAuanMnKTtcbnZhciBkZWZhdWx0X2tleW1hcCA9IHJlcXVpcmUoJy4vZXZlbnRzL2RlZmF1bHQuanMnKTtcbnZhciBjdXJzb3JzID0gcmVxdWlyZSgnLi9jdXJzb3JzLmpzJyk7XG52YXIgY2xpcGJvYXJkID0gcmVxdWlyZSgnLi9jbGlwYm9hcmQuanMnKTtcblxuLyoqXG4gKiBDb250cm9sbGVyIGZvciBhIERvY3VtZW50TW9kZWwuXG4gKi9cbnZhciBEb2N1bWVudENvbnRyb2xsZXIgPSBmdW5jdGlvbihlbCwgbW9kZWwpIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMuY2xpcGJvYXJkID0gbmV3IGNsaXBib2FyZC5DbGlwYm9hcmQoZWwpO1xuICAgIHRoaXMubm9ybWFsaXplciA9IG5ldyBub3JtYWxpemVyLk5vcm1hbGl6ZXIoKTtcbiAgICB0aGlzLm5vcm1hbGl6ZXIubGlzdGVuX3RvKGVsKTtcbiAgICB0aGlzLm5vcm1hbGl6ZXIubGlzdGVuX3RvKHRoaXMuY2xpcGJvYXJkLmhpZGRlbl9pbnB1dCk7XG4gICAgdGhpcy5tYXAgPSBuZXcga2V5bWFwLk1hcCh0aGlzLm5vcm1hbGl6ZXIpO1xuICAgIHRoaXMubWFwLm1hcChkZWZhdWx0X2tleW1hcC5tYXApO1xuXG4gICAgdGhpcy5jdXJzb3JzID0gbmV3IGN1cnNvcnMuQ3Vyc29ycyhtb2RlbCwgdGhpcy5jbGlwYm9hcmQpO1xufTtcbnV0aWxzLmluaGVyaXQoRG9jdW1lbnRDb250cm9sbGVyLCB1dGlscy5Qb3N0ZXJDbGFzcyk7XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuRG9jdW1lbnRDb250cm9sbGVyID0gRG9jdW1lbnRDb250cm9sbGVyO1xuIiwidmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xuXG4vKipcbiAqIE1vZGVsIGNvbnRhaW5pbmcgYWxsIG9mIHRoZSBkb2N1bWVudCdzIGRhdGEgKHRleHQpLlxuICovXG52YXIgRG9jdW1lbnRNb2RlbCA9IGZ1bmN0aW9uKCkge1xuICAgIHV0aWxzLlBvc3RlckNsYXNzLmNhbGwodGhpcyk7XG4gICAgdGhpcy5fcm93cyA9IFtdO1xuICAgIHRoaXMuX3Jvd190YWdzID0gW107XG4gICAgdGhpcy5fdGFnX2xvY2sgPSAwO1xuICAgIHRoaXMuX3BlbmRpbmdfdGFnX2V2ZW50cyA9IGZhbHNlO1xuICAgIHRoaXMuX2luaXRfcHJvcGVydGllcygpO1xufTtcbnV0aWxzLmluaGVyaXQoRG9jdW1lbnRNb2RlbCwgdXRpbHMuUG9zdGVyQ2xhc3MpO1xuXG4vKipcbiAvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG4qIEFjcXVpcmUgYSBsb2NrIG9uIHRhZyBldmVudHNcbiAqXG4gKiBQcmV2ZW50cyB0YWcgZXZlbnRzIGZyb20gZmlyaW5nLlxuICogQHJldHVybiB7aW50ZWdlcn0gbG9jayBjb3VudFxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS5hY3F1aXJlX3RhZ19ldmVudF9sb2NrID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3RhZ19sb2NrKys7XG59O1xuXG4vKipcbiAqIFJlbGVhc2UgYSBsb2NrIG9uIHRhZyBldmVudHNcbiAqIEByZXR1cm4ge2ludGVnZXJ9IGxvY2sgY291bnRcbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUucmVsZWFzZV90YWdfZXZlbnRfbG9jayA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3RhZ19sb2NrLS07XG4gICAgaWYgKHRoaXMuX3RhZ19sb2NrIDwgMCkge1xuICAgICAgICB0aGlzLl90YWdfbG9jayA9IDA7XG4gICAgfVxuICAgIGlmICh0aGlzLl90YWdfbG9jayA9PT0gMCAmJiB0aGlzLl9wZW5kaW5nX3RhZ19ldmVudHMpIHtcbiAgICAgICAgdGhpcy5fcGVuZGluZ190YWdfZXZlbnRzID0gZmFsc2U7XG4gICAgICAgIHRoaXMudHJpZ2dlcl90YWdfZXZlbnRzKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl90YWdfbG9jaztcbn07XG5cbi8qKlxuICogVHJpZ2dlcnMgdGhlIHRhZyBjaGFuZ2UgZXZlbnRzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUudHJpZ2dlcl90YWdfZXZlbnRzID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuX3RhZ19sb2NrID09PSAwKSB7XG4gICAgICAgIHRoaXMudHJpZ2dlcigndGFnc19jaGFuZ2VkJyk7XG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpOyAgICBcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9wZW5kaW5nX3RhZ19ldmVudHMgPSB0cnVlO1xuICAgIH1cbn07XG5cbi8qKlxuICogU2V0cyBhICd0YWcnIG9uIHRoZSB0ZXh0IHNwZWNpZmllZC5cbiAqIEBwYXJhbSB7aW50ZWdlcn0gc3RhcnRfcm93IC0gcm93IHRoZSB0YWcgc3RhcnRzIG9uXG4gKiBAcGFyYW0ge2ludGVnZXJ9IHN0YXJ0X2NoYXIgLSBpbmRleCwgaW4gdGhlIHJvdywgb2YgdGhlIGZpcnN0IHRhZ2dlZCBjaGFyYWN0ZXJcbiAqIEBwYXJhbSB7aW50ZWdlcn0gZW5kX3JvdyAtIHJvdyB0aGUgdGFnIGVuZHMgb25cbiAqIEBwYXJhbSB7aW50ZWdlcn0gZW5kX2NoYXIgLSBpbmRleCwgaW4gdGhlIHJvdywgb2YgdGhlIGxhc3QgdGFnZ2VkIGNoYXJhY3RlclxuICogQHBhcmFtIHtzdHJpbmd9IHRhZ19uYW1lXG4gKiBAcGFyYW0ge2FueX0gdGFnX3ZhbHVlIC0gb3ZlcnJpZGVzIGFueSBwcmV2aW91cyB0YWdzXG4gKi9cbkRvY3VtZW50TW9kZWwucHJvdG90eXBlLnNldF90YWcgPSBmdW5jdGlvbihzdGFydF9yb3csIHN0YXJ0X2NoYXIsIGVuZF9yb3csIGVuZF9jaGFyLCB0YWdfbmFtZSwgdGFnX3ZhbHVlKSB7XG4gICAgdmFyIGNvb3JkcyA9IHRoaXMudmFsaWRhdGVfY29vcmRzLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgZm9yICh2YXIgcm93ID0gY29vcmRzLnN0YXJ0X3Jvdzsgcm93IDw9IGNvb3Jkcy5lbmRfcm93OyByb3crKykge1xuICAgICAgICB2YXIgc3RhcnQgPSBjb29yZHMuc3RhcnRfY2hhcjtcbiAgICAgICAgdmFyIGVuZCA9IGNvb3Jkcy5lbmRfY2hhcjtcbiAgICAgICAgaWYgKHJvdyA+IGNvb3Jkcy5zdGFydF9yb3cpIHsgc3RhcnQgPSAtMTsgfVxuICAgICAgICBpZiAocm93IDwgY29vcmRzLmVuZF9yb3cpIHsgZW5kID0gLTE7IH1cblxuICAgICAgICAvLyBSZW1vdmUgb3IgbW9kaWZ5IGNvbmZsaWN0aW5nIHRhZ3MuXG4gICAgICAgIHZhciBhZGRfdGFncyA9IFtdO1xuICAgICAgICB0aGlzLl9yb3dfdGFnc1tyb3ddLmZpbHRlcihmdW5jdGlvbih0YWcpIHtcbiAgICAgICAgICAgIGlmICh0YWcubmFtZSA9PSB0YWdfbmFtZSkge1xuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRhZyBpcyB3aXRoaW5cbiAgICAgICAgICAgICAgICBpZiAoc3RhcnQgPT0gLTEgJiYgZW5kID09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHRhZy5zdGFydCA+PSBzdGFydCAmJiAodGFnLmVuZCA8IGVuZCB8fCBlbmQgPT0gLTEpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGFnIGlzIG91dHNpZGVcbiAgICAgICAgICAgICAgICAvLyBUbyB0aGUgcmlnaHQ/XG4gICAgICAgICAgICAgICAgaWYgKHRhZy5zdGFydCA+IGVuZCAmJiBlbmQgIT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFRvIHRoZSBsZWZ0P1xuICAgICAgICAgICAgICAgIGlmICh0YWcuZW5kIDwgc3RhcnQgJiYgdGFnLmVuZCAhPSAtMSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0YWcgZW5jYXBzdWxhdGVzXG4gICAgICAgICAgICAgICAgdmFyIGxlZnRfaW50ZXJzZWN0aW5nID0gdGFnLnN0YXJ0IDwgc3RhcnQ7XG4gICAgICAgICAgICAgICAgdmFyIHJpZ2h0X2ludGVyc2VjdGluZyA9IGVuZCAhPSAtMSAmJiAodGFnLmVuZCA9PSAtMSB8fCB0YWcuZW5kID4gZW5kKTtcblxuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRhZyBpcyBsZWZ0IGludGVyc2VjdGluZ1xuICAgICAgICAgICAgICAgIGlmIChsZWZ0X2ludGVyc2VjdGluZykge1xuICAgICAgICAgICAgICAgICAgICBhZGRfdGFncy5wdXNoKHtuYW1lOiB0YWdfbmFtZSwgdmFsdWU6IHRhZy52YWx1ZSwgc3RhcnQ6IHRhZy5zdGFydCwgZW5kOiBzdGFydC0xfSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGFnIGlzIHJpZ2h0IGludGVyc2VjdGluZ1xuICAgICAgICAgICAgICAgIGlmIChyaWdodF9pbnRlcnNlY3RpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgYWRkX3RhZ3MucHVzaCh7bmFtZTogdGFnX25hbWUsIHZhbHVlOiB0YWcudmFsdWUsIHN0YXJ0OiBlbmQrMSwgZW5kOiB0YWcuZW5kfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgdGFncyBhbmQgY29ycmVjdGVkIHRhZ3MuXG4gICAgICAgIHRoaXMuX3Jvd190YWdzW3Jvd10gPSB0aGlzLl9yb3dfdGFnc1tyb3ddLmNvbmNhdChhZGRfdGFncyk7XG4gICAgICAgIHRoaXMuX3Jvd190YWdzW3Jvd10ucHVzaCh7bmFtZTogdGFnX25hbWUsIHZhbHVlOiB0YWdfdmFsdWUsIHN0YXJ0OiBzdGFydCwgZW5kOiBlbmR9KTtcbiAgICB9XG4gICAgdGhpcy50cmlnZ2VyX3RhZ19ldmVudHMoKTtcbn07XG5cbi8qKlxuICogUmVtb3ZlZCBhbGwgb2YgdGhlIHRhZ3Mgb24gdGhlIGRvY3VtZW50LlxuICogQHBhcmFtICB7aW50ZWdlcn0gc3RhcnRfcm93XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBlbmRfcm93XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS5jbGVhcl90YWdzID0gZnVuY3Rpb24oc3RhcnRfcm93LCBlbmRfcm93KSB7XG4gICAgc3RhcnRfcm93ID0gc3RhcnRfcm93ICE9PSB1bmRlZmluZWQgPyBzdGFydF9yb3cgOiAwO1xuICAgIGVuZF9yb3cgPSBlbmRfcm93ICE9PSB1bmRlZmluZWQgPyBlbmRfcm93IDogdGhpcy5fcm93X3RhZ3MubGVuZ3RoIC0gMTtcbiAgICBmb3IgKHZhciBpID0gc3RhcnRfcm93OyBpIDw9IGVuZF9yb3c7IGkrKykge1xuICAgICAgICB0aGlzLl9yb3dfdGFnc1tpXSA9IFtdO1xuICAgIH1cbiAgICB0aGlzLnRyaWdnZXJfdGFnX2V2ZW50cygpO1xufTtcblxuLyoqXG4gKiBHZXQgdGhlIHRhZ3MgYXBwbGllZCB0byBhIGNoYXJhY3Rlci5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IHJvd19pbmRleFxuICogQHBhcmFtICB7aW50ZWdlcn0gY2hhcl9pbmRleFxuICogQHJldHVybiB7ZGljdGlvbmFyeX1cbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUuZ2V0X3RhZ3MgPSBmdW5jdGlvbihyb3dfaW5kZXgsIGNoYXJfaW5kZXgpIHtcbiAgICB2YXIgY29vcmRzID0gdGhpcy52YWxpZGF0ZV9jb29yZHMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB2YXIgdGFncyA9IHt9O1xuICAgIHRoaXMuX3Jvd190YWdzW2Nvb3Jkcy5zdGFydF9yb3ddLmZvckVhY2goZnVuY3Rpb24odGFnKSB7XG4gICAgICAgIC8vIFRhZyBzdGFydCBvZiAtMSBtZWFucyB0aGUgdGFnIGNvbnRpbnVlcyB0byB0aGUgcHJldmlvdXMgbGluZS5cbiAgICAgICAgdmFyIGFmdGVyX3N0YXJ0ID0gKGNvb3Jkcy5zdGFydF9jaGFyID49IHRhZy5zdGFydCB8fCB0YWcuc3RhcnQgPT0gLTEpO1xuICAgICAgICAvLyBUYWcgZW5kIG9mIC0xIG1lYW5zIHRoZSB0YWcgY29udGludWVzIHRvIHRoZSBuZXh0IGxpbmUuXG4gICAgICAgIHZhciBiZWZvcmVfZW5kID0gKGNvb3Jkcy5zdGFydF9jaGFyIDw9IHRhZy5lbmQgfHwgdGFnLmVuZCA9PSAtMSk7XG4gICAgICAgIGlmIChhZnRlcl9zdGFydCAmJiBiZWZvcmVfZW5kKSB7XG4gICAgICAgICAgICB0YWdzW3RhZy5uYW1lXSA9IHRhZy52YWx1ZTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiB0YWdzO1xufTtcblxuLyoqXG4gKiBBZGRzIHRleHQgZWZmaWNpZW50bHkgc29tZXdoZXJlIGluIHRoZSBkb2N1bWVudC5cbiAqIEBwYXJhbSB7aW50ZWdlcn0gcm93X2luZGV4ICBcbiAqIEBwYXJhbSB7aW50ZWdlcn0gY2hhcl9pbmRleCBcbiAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0XG4gKi9cbkRvY3VtZW50TW9kZWwucHJvdG90eXBlLmFkZF90ZXh0ID0gZnVuY3Rpb24ocm93X2luZGV4LCBjaGFyX2luZGV4LCB0ZXh0KSB7XG4gICAgdmFyIGNvb3JkcyA9IHRoaXMudmFsaWRhdGVfY29vcmRzLmFwcGx5KHRoaXMsIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCwyKSk7XG4gICAgLy8gSWYgdGhlIHRleHQgaGFzIGEgbmV3IGxpbmUgaW4gaXQsIGp1c3QgcmUtc2V0XG4gICAgLy8gdGhlIHJvd3MgbGlzdC5cbiAgICBpZiAodGV4dC5pbmRleE9mKCdcXG4nKSAhPSAtMSkge1xuICAgICAgICB2YXIgbmV3X3Jvd3MgPSBbXTtcbiAgICAgICAgaWYgKGNvb3Jkcy5zdGFydF9yb3cgPiAwKSB7XG4gICAgICAgICAgICBuZXdfcm93cyA9IHRoaXMuX3Jvd3Muc2xpY2UoMCwgY29vcmRzLnN0YXJ0X3Jvdyk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgb2xkX3JvdyA9IHRoaXMuX3Jvd3NbY29vcmRzLnN0YXJ0X3Jvd107XG4gICAgICAgIHZhciBvbGRfcm93X3N0YXJ0ID0gb2xkX3Jvdy5zdWJzdHJpbmcoMCwgY29vcmRzLnN0YXJ0X2NoYXIpO1xuICAgICAgICB2YXIgb2xkX3Jvd19lbmQgPSBvbGRfcm93LnN1YnN0cmluZyhjb29yZHMuc3RhcnRfY2hhcik7XG4gICAgICAgIHZhciBzcGxpdF90ZXh0ID0gdGV4dC5zcGxpdCgnXFxuJyk7XG4gICAgICAgIG5ld19yb3dzLnB1c2gob2xkX3Jvd19zdGFydCArIHNwbGl0X3RleHRbMF0pO1xuXG4gICAgICAgIGlmIChzcGxpdF90ZXh0Lmxlbmd0aCA+IDIpIHtcbiAgICAgICAgICAgIG5ld19yb3dzID0gbmV3X3Jvd3MuY29uY2F0KHNwbGl0X3RleHQuc2xpY2UoMSxzcGxpdF90ZXh0Lmxlbmd0aC0xKSk7XG4gICAgICAgIH1cblxuICAgICAgICBuZXdfcm93cy5wdXNoKHNwbGl0X3RleHRbc3BsaXRfdGV4dC5sZW5ndGgtMV0gKyBvbGRfcm93X2VuZCk7XG5cbiAgICAgICAgaWYgKGNvb3Jkcy5zdGFydF9yb3crMSA8IHRoaXMuX3Jvd3MubGVuZ3RoKSB7XG4gICAgICAgICAgICBuZXdfcm93cyA9IG5ld19yb3dzLmNvbmNhdCh0aGlzLl9yb3dzLnNsaWNlKGNvb3Jkcy5zdGFydF9yb3crMSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fcm93cyA9IG5ld19yb3dzO1xuICAgICAgICB0aGlzLl9yZXNpemVkX3Jvd3MoKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdyb3dfY2hhbmdlZCcsIGNvb3Jkcy5zdGFydF9yb3cpO1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ3Jvd3NfYWRkZWQnLCBjb29yZHMuc3RhcnRfcm93ICsgMSwgY29vcmRzLnN0YXJ0X3JvdyArIHNwbGl0X3RleHQubGVuZ3RoIC0gMSk7XG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpO1xuXG4gICAgLy8gVGV4dCBkb2Vzbid0IGhhdmUgYW55IG5ldyBsaW5lcywganVzdCBtb2RpZnkgdGhlXG4gICAgLy8gbGluZSBhbmQgdGhlbiB0cmlnZ2VyIHRoZSByb3cgY2hhbmdlZCBldmVudC5cbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgb2xkX3RleHQgPSB0aGlzLl9yb3dzW2Nvb3Jkcy5zdGFydF9yb3ddO1xuICAgICAgICB0aGlzLl9yb3dzW2Nvb3Jkcy5zdGFydF9yb3ddID0gb2xkX3RleHQuc3Vic3RyaW5nKDAsIGNvb3Jkcy5zdGFydF9jaGFyKSArIHRleHQgKyBvbGRfdGV4dC5zdWJzdHJpbmcoY29vcmRzLnN0YXJ0X2NoYXIpO1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ3Jvd19jaGFuZ2VkJywgY29vcmRzLnN0YXJ0X3Jvdyk7XG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpO1xuICAgIH1cbn07XG5cbi8qKlxuICogUmVtb3ZlcyBhIGJsb2NrIG9mIHRleHQgZnJvbSB0aGUgZG9jdW1lbnRcbiAqIEBwYXJhbSAge2ludGVnZXJ9IHN0YXJ0X3Jvd1xuICogQHBhcmFtICB7aW50ZWdlcn0gc3RhcnRfY2hhclxuICogQHBhcmFtICB7aW50ZWdlcn0gZW5kX3Jvd1xuICogQHBhcmFtICB7aW50ZWdlcn0gZW5kX2NoYXJcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkRvY3VtZW50TW9kZWwucHJvdG90eXBlLnJlbW92ZV90ZXh0ID0gZnVuY3Rpb24oc3RhcnRfcm93LCBzdGFydF9jaGFyLCBlbmRfcm93LCBlbmRfY2hhcikge1xuICAgIHZhciBjb29yZHMgPSB0aGlzLnZhbGlkYXRlX2Nvb3Jkcy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIGlmIChjb29yZHMuc3RhcnRfcm93ID09IGNvb3Jkcy5lbmRfcm93KSB7XG4gICAgICAgIHRoaXMuX3Jvd3NbY29vcmRzLnN0YXJ0X3Jvd10gPSB0aGlzLl9yb3dzW2Nvb3Jkcy5zdGFydF9yb3ddLnN1YnN0cmluZygwLCBjb29yZHMuc3RhcnRfY2hhcikgKyB0aGlzLl9yb3dzW2Nvb3Jkcy5zdGFydF9yb3ddLnN1YnN0cmluZyhjb29yZHMuZW5kX2NoYXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX3Jvd3NbY29vcmRzLnN0YXJ0X3Jvd10gPSB0aGlzLl9yb3dzW2Nvb3Jkcy5zdGFydF9yb3ddLnN1YnN0cmluZygwLCBjb29yZHMuc3RhcnRfY2hhcikgKyB0aGlzLl9yb3dzW2Nvb3Jkcy5lbmRfcm93XS5zdWJzdHJpbmcoY29vcmRzLmVuZF9jaGFyKTtcbiAgICB9XG5cbiAgICBpZiAoY29vcmRzLmVuZF9yb3cgLSBjb29yZHMuc3RhcnRfcm93ID4gMCkge1xuICAgICAgICB0aGlzLl9yb3dzLnNwbGljZShjb29yZHMuc3RhcnRfcm93ICsgMSwgY29vcmRzLmVuZF9yb3cgLSBjb29yZHMuc3RhcnRfcm93KTtcbiAgICAgICAgdGhpcy5fcmVzaXplZF9yb3dzKCk7XG4gICAgICAgIHRoaXMudHJpZ2dlcigndGV4dF9jaGFuZ2VkJyk7XG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpO1xuICAgIH0gZWxzZSBpZiAoY29vcmRzLmVuZF9yb3cgPT0gY29vcmRzLnN0YXJ0X3Jvdykge1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ3Jvd19jaGFuZ2VkJywgY29vcmRzLnN0YXJ0X3Jvdyk7XG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpO1xuICAgIH1cbn07XG5cbi8qKlxuICogUmVtb3ZlIGEgcm93IGZyb20gdGhlIGRvY3VtZW50LlxuICogQHBhcmFtICB7aW50ZWdlcn0gcm93X2luZGV4XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS5yZW1vdmVfcm93ID0gZnVuY3Rpb24ocm93X2luZGV4KSB7XG4gICAgaWYgKDAgPCByb3dfaW5kZXggJiYgcm93X2luZGV4IDwgdGhpcy5fcm93cy5sZW5ndGgpIHtcbiAgICAgICAgdGhpcy5fcm93cy5zcGxpY2Uocm93X2luZGV4LCAxKTtcbiAgICAgICAgdGhpcy5fcmVzaXplZF9yb3dzKCk7XG4gICAgICAgIHRoaXMudHJpZ2dlcigndGV4dF9jaGFuZ2VkJyk7XG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpO1xuICAgIH1cbn07XG5cbi8qKlxuICogR2V0cyBhIGNodW5rIG9mIHRleHQuXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBzdGFydF9yb3dcbiAqIEBwYXJhbSAge2ludGVnZXJ9IHN0YXJ0X2NoYXJcbiAqIEBwYXJhbSAge2ludGVnZXJ9IGVuZF9yb3dcbiAqIEBwYXJhbSAge2ludGVnZXJ9IGVuZF9jaGFyXG4gKiBAcmV0dXJuIHtzdHJpbmd9XG4gKi9cbkRvY3VtZW50TW9kZWwucHJvdG90eXBlLmdldF90ZXh0ID0gZnVuY3Rpb24oc3RhcnRfcm93LCBzdGFydF9jaGFyLCBlbmRfcm93LCBlbmRfY2hhcikge1xuICAgIHZhciBjb29yZHMgPSB0aGlzLnZhbGlkYXRlX2Nvb3Jkcy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIGlmIChjb29yZHMuc3RhcnRfcm93PT1jb29yZHMuZW5kX3Jvdykge1xuICAgICAgICByZXR1cm4gdGhpcy5fcm93c1tjb29yZHMuc3RhcnRfcm93XS5zdWJzdHJpbmcoY29vcmRzLnN0YXJ0X2NoYXIsIGNvb3Jkcy5lbmRfY2hhcik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHRleHQgPSBbXTtcbiAgICAgICAgdGV4dC5wdXNoKHRoaXMuX3Jvd3NbY29vcmRzLnN0YXJ0X3Jvd10uc3Vic3RyaW5nKGNvb3Jkcy5zdGFydF9jaGFyKSk7XG4gICAgICAgIGlmIChjb29yZHMuZW5kX3JvdyAtIGNvb3Jkcy5zdGFydF9yb3cgPiAxKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gY29vcmRzLnN0YXJ0X3JvdyArIDE7IGkgPCBjb29yZHMuZW5kX3JvdzsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdGV4dC5wdXNoKHRoaXMuX3Jvd3NbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRleHQucHVzaCh0aGlzLl9yb3dzW2Nvb3Jkcy5lbmRfcm93XS5zdWJzdHJpbmcoMCwgY29vcmRzLmVuZF9jaGFyKSk7XG4gICAgICAgIHJldHVybiB0ZXh0LmpvaW4oJ1xcbicpO1xuICAgIH1cbn07XG5cbi8qKlxuICogQWRkIGEgcm93IHRvIHRoZSBkb2N1bWVudFxuICogQHBhcmFtIHtpbnRlZ2VyfSByb3dfaW5kZXhcbiAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gbmV3IHJvdydzIHRleHRcbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUuYWRkX3JvdyA9IGZ1bmN0aW9uKHJvd19pbmRleCwgdGV4dCkge1xuICAgIHZhciBuZXdfcm93cyA9IFtdO1xuICAgIGlmIChyb3dfaW5kZXggPiAwKSB7XG4gICAgICAgIG5ld19yb3dzID0gdGhpcy5fcm93cy5zbGljZSgwLCByb3dfaW5kZXgpO1xuICAgIH1cbiAgICBuZXdfcm93cy5wdXNoKHRleHQpO1xuICAgIGlmIChyb3dfaW5kZXggPCB0aGlzLl9yb3dzLmxlbmd0aCkge1xuICAgICAgICBuZXdfcm93cyA9IG5ld19yb3dzLmNvbmNhdCh0aGlzLl9yb3dzLnNsaWNlKHJvd19pbmRleCkpO1xuICAgIH1cblxuICAgIHRoaXMuX3Jvd3MgPSBuZXdfcm93cztcbiAgICB0aGlzLl9yZXNpemVkX3Jvd3MoKTtcbiAgICB0aGlzLnRyaWdnZXIoJ3Jvd3NfYWRkZWQnLCByb3dfaW5kZXgsIHJvd19pbmRleCk7XG4gICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2VkJyk7XG59O1xuXG4vKipcbiAqIFZhbGlkYXRlcyByb3csIGNoYXJhY3RlciBjb29yZGluYXRlcyBpbiB0aGUgZG9jdW1lbnQuXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBzdGFydF9yb3dcbiAqIEBwYXJhbSAge2ludGVnZXJ9IHN0YXJ0X2NoYXJcbiAqIEBwYXJhbSAge2ludGVnZXJ9IChvcHRpb25hbCkgZW5kX3Jvd1xuICogQHBhcmFtICB7aW50ZWdlcn0gKG9wdGlvbmFsKSBlbmRfY2hhclxuICogQHJldHVybiB7ZGljdGlvbmFyeX0gZGljdGlvbmFyeSBjb250YWluaW5nIHZhbGlkYXRlZCBjb29yZGluYXRlcyB7c3RhcnRfcm93LCBcbiAqICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0X2NoYXIsIGVuZF9yb3csIGVuZF9jaGFyfVxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS52YWxpZGF0ZV9jb29yZHMgPSBmdW5jdGlvbihzdGFydF9yb3csIHN0YXJ0X2NoYXIsIGVuZF9yb3csIGVuZF9jaGFyKSB7XG5cbiAgICAvLyBNYWtlIHN1cmUgdGhlIHZhbHVlcyBhcmVuJ3QgdW5kZWZpbmVkLlxuICAgIGlmIChzdGFydF9yb3cgPT09IHVuZGVmaW5lZCkgc3RhcnRfcm93ID0gMDtcbiAgICBpZiAoc3RhcnRfY2hhciA9PT0gdW5kZWZpbmVkKSBzdGFydF9jaGFyID0gMDtcbiAgICBpZiAoZW5kX3JvdyA9PT0gdW5kZWZpbmVkKSBlbmRfcm93ID0gc3RhcnRfcm93O1xuICAgIGlmIChlbmRfY2hhciA9PT0gdW5kZWZpbmVkKSBlbmRfY2hhciA9IHN0YXJ0X2NoYXI7XG5cbiAgICAvLyBNYWtlIHN1cmUgdGhlIHZhbHVlcyBhcmUgd2l0aGluIHRoZSBib3VuZHMgb2YgdGhlIGNvbnRlbnRzLlxuICAgIGlmICh0aGlzLl9yb3dzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBzdGFydF9yb3cgPSAwO1xuICAgICAgICBzdGFydF9jaGFyID0gMDtcbiAgICAgICAgZW5kX3JvdyA9IDA7XG4gICAgICAgIGVuZF9jaGFyID0gMDtcbiAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoc3RhcnRfcm93ID49IHRoaXMuX3Jvd3MubGVuZ3RoKSBzdGFydF9yb3cgPSB0aGlzLl9yb3dzLmxlbmd0aCAtIDE7XG4gICAgICAgIGlmIChzdGFydF9yb3cgPCAwKSBzdGFydF9yb3cgPSAwO1xuICAgICAgICBpZiAoZW5kX3JvdyA+PSB0aGlzLl9yb3dzLmxlbmd0aCkgZW5kX3JvdyA9IHRoaXMuX3Jvd3MubGVuZ3RoIC0gMTtcbiAgICAgICAgaWYgKGVuZF9yb3cgPCAwKSBlbmRfcm93ID0gMDtcblxuICAgICAgICBpZiAoc3RhcnRfY2hhciA+IHRoaXMuX3Jvd3Nbc3RhcnRfcm93XS5sZW5ndGgpIHN0YXJ0X2NoYXIgPSB0aGlzLl9yb3dzW3N0YXJ0X3Jvd10ubGVuZ3RoO1xuICAgICAgICBpZiAoc3RhcnRfY2hhciA8IDApIHN0YXJ0X2NoYXIgPSAwO1xuICAgICAgICBpZiAoZW5kX2NoYXIgPiB0aGlzLl9yb3dzW2VuZF9yb3ddLmxlbmd0aCkgZW5kX2NoYXIgPSB0aGlzLl9yb3dzW2VuZF9yb3ddLmxlbmd0aDtcbiAgICAgICAgaWYgKGVuZF9jaGFyIDwgMCkgZW5kX2NoYXIgPSAwO1xuICAgIH1cblxuICAgIC8vIE1ha2Ugc3VyZSB0aGUgc3RhcnQgaXMgYmVmb3JlIHRoZSBlbmQuXG4gICAgaWYgKHN0YXJ0X3JvdyA+IGVuZF9yb3cgfHwgKHN0YXJ0X3JvdyA9PSBlbmRfcm93ICYmIHN0YXJ0X2NoYXIgPiBlbmRfY2hhcikpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN0YXJ0X3JvdzogZW5kX3JvdyxcbiAgICAgICAgICAgIHN0YXJ0X2NoYXI6IGVuZF9jaGFyLFxuICAgICAgICAgICAgZW5kX3Jvdzogc3RhcnRfcm93LFxuICAgICAgICAgICAgZW5kX2NoYXI6IHN0YXJ0X2NoYXIsXG4gICAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN0YXJ0X3Jvdzogc3RhcnRfcm93LFxuICAgICAgICAgICAgc3RhcnRfY2hhcjogc3RhcnRfY2hhcixcbiAgICAgICAgICAgIGVuZF9yb3c6IGVuZF9yb3csXG4gICAgICAgICAgICBlbmRfY2hhcjogZW5kX2NoYXIsXG4gICAgICAgIH07XG4gICAgfVxufTtcblxuLyoqXG4gKiBHZXRzIHRoZSB0ZXh0IG9mIHRoZSBkb2N1bWVudC5cbiAqIEByZXR1cm4ge3N0cmluZ31cbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUuX2dldF90ZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3Jvd3Muam9pbignXFxuJyk7XG59O1xuXG4vKipcbiAqIFNldHMgdGhlIHRleHQgb2YgdGhlIGRvY3VtZW50LlxuICogQ29tcGxleGl0eSBPKE4pIGZvciBOIHJvd3NcbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZVxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS5fc2V0X3RleHQgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHRoaXMuX3Jvd3MgPSB2YWx1ZS5zcGxpdCgnXFxuJyk7XG4gICAgdGhpcy5fcmVzaXplZF9yb3dzKCk7XG4gICAgdGhpcy50cmlnZ2VyKCd0ZXh0X2NoYW5nZWQnKTtcbiAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZWQnKTtcbn07XG5cbi8qKlxuICogVXBkYXRlcyBfcm93J3MgcGFydG5lciBhcnJheXMuXG4gKiBAcmV0dXJuIHtudWxsfSBcbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUuX3Jlc2l6ZWRfcm93cyA9IGZ1bmN0aW9uKCkge1xuXG4gICAgLy8gTWFrZSBzdXJlIHRoZXJlIGFyZSBhcyBtYW55IHRhZyByb3dzIGFzIHRoZXJlIGFyZSB0ZXh0IHJvd3MuXG4gICAgd2hpbGUgKHRoaXMuX3Jvd190YWdzLmxlbmd0aCA8IHRoaXMuX3Jvd3MubGVuZ3RoKSB7XG4gICAgICAgIHRoaXMuX3Jvd190YWdzLnB1c2goW10pO1xuICAgIH1cbiAgICBpZiAodGhpcy5fcm93X3RhZ3MubGVuZ3RoID4gdGhpcy5fcm93cy5sZW5ndGgpIHtcbiAgICAgICAgdGhpcy5fcm93X3RhZ3Muc3BsaWNlKHRoaXMuX3Jvd3MubGVuZ3RoLCB0aGlzLl9yb3dfdGFncy5sZW5ndGggLSB0aGlzLl9yb3dzLmxlbmd0aCk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBDcmVhdGUgdGhlIGRvY3VtZW50J3MgcHJvcGVydGllcy5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkRvY3VtZW50TW9kZWwucHJvdG90eXBlLl9pbml0X3Byb3BlcnRpZXMgPSBmdW5jdGlvbigpIHsgICAgXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMucHJvcGVydHkoJ3Jvd3MnLCBmdW5jdGlvbigpIHsgXG4gICAgICAgIC8vIFJldHVybiBhIHNoYWxsb3cgY29weSBvZiB0aGUgYXJyYXkgc28gaXQgY2Fubm90IGJlIG1vZGlmaWVkLlxuICAgICAgICByZXR1cm4gW10uY29uY2F0KHRoYXQuX3Jvd3MpOyBcbiAgICB9KTtcbiAgICB0aGlzLnByb3BlcnR5KCd0ZXh0JywgXG4gICAgICAgIHV0aWxzLnByb3h5KHRoaXMuX2dldF90ZXh0LCB0aGlzKSwgXG4gICAgICAgIHV0aWxzLnByb3h5KHRoaXMuX3NldF90ZXh0LCB0aGlzKSk7XG59O1xuXG5leHBvcnRzLkRvY3VtZW50TW9kZWwgPSBEb2N1bWVudE1vZGVsOyIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKTtcblxuLy8gUmVuZGVyZXJzXG52YXIgYmF0Y2ggPSByZXF1aXJlKCcuL3JlbmRlcmVycy9iYXRjaC5qcycpO1xudmFyIGhpZ2hsaWdodGVkX3JvdyA9IHJlcXVpcmUoJy4vcmVuZGVyZXJzL2hpZ2hsaWdodGVkX3Jvdy5qcycpO1xudmFyIGN1cnNvcnMgPSByZXF1aXJlKCcuL3JlbmRlcmVycy9jdXJzb3JzLmpzJyk7XG52YXIgc2VsZWN0aW9ucyA9IHJlcXVpcmUoJy4vcmVuZGVyZXJzL3NlbGVjdGlvbnMuanMnKTtcbnZhciBjb2xvciA9IHJlcXVpcmUoJy4vcmVuZGVyZXJzL2NvbG9yLmpzJyk7XG52YXIgc3ludGF4X2hpZ2hsaWdodGVyID0gcmVxdWlyZSgnLi9oaWdobGlnaHRlcnMvc3ludGF4LmpzJyk7XG5cbi8qKlxuICogVmlzdWFsIHJlcHJlc2VudGF0aW9uIG9mIGEgRG9jdW1lbnRNb2RlbCBpbnN0YW5jZVxuICogQHBhcmFtIHtDYW52YXN9IGNhbnZhcyBpbnN0YW5jZVxuICogQHBhcmFtIHtEb2N1bWVudE1vZGVsfSBtb2RlbCBpbnN0YW5jZVxuICogQHBhcmFtIHtDdXJzb3JzfSBjdXJzb3JzX21vZGVsIGluc3RhbmNlXG4gKiBAcGFyYW0ge1N0eWxlfSBzdHlsZSAtIGRlc2NyaWJlcyByZW5kZXJpbmcgc3R5bGVcbiAqIEBwYXJhbSB7UG9zdGVyQ2xhc3N9IGNvbmZpZyAtIHVzZXIgY29uZmlnXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBoYXNfZm9jdXMgLSBmdW5jdGlvbiB0aGF0IGNoZWNrcyBpZiB0aGUgdGV4dCBhcmVhIGhhcyBmb2N1c1xuICovXG52YXIgRG9jdW1lbnRWaWV3ID0gZnVuY3Rpb24oY2FudmFzLCBtb2RlbCwgY3Vyc29yc19tb2RlbCwgc3R5bGUsIGNvbmZpZywgaGFzX2ZvY3VzKSB7XG4gICAgdGhpcy5fbW9kZWwgPSBtb2RlbDtcblxuICAgIC8vIENyZWF0ZSBjaGlsZCByZW5kZXJlcnMuXG4gICAgdmFyIHJvd19yZW5kZXJlciA9IG5ldyBoaWdobGlnaHRlZF9yb3cuSGlnaGxpZ2h0ZWRSb3dSZW5kZXJlcihtb2RlbCwgY2FudmFzLCBzdHlsZSwgY29uZmlnKTtcbiAgICB2YXIgY3Vyc29yc19yZW5kZXJlciA9IG5ldyBjdXJzb3JzLkN1cnNvcnNSZW5kZXJlcihcbiAgICAgICAgY3Vyc29yc19tb2RlbCwgXG4gICAgICAgIHN0eWxlLCBcbiAgICAgICAgcm93X3JlbmRlcmVyLFxuICAgICAgICBoYXNfZm9jdXMpO1xuICAgIHZhciBzZWxlY3Rpb25zX3JlbmRlcmVyID0gbmV3IHNlbGVjdGlvbnMuU2VsZWN0aW9uc1JlbmRlcmVyKFxuICAgICAgICBjdXJzb3JzX21vZGVsLCBcbiAgICAgICAgc3R5bGUsIFxuICAgICAgICByb3dfcmVuZGVyZXIsXG4gICAgICAgIGhhc19mb2N1cyxcbiAgICAgICAgY3Vyc29yc19yZW5kZXJlcik7XG5cbiAgICAvLyBDcmVhdGUgdGhlIGJhY2tncm91bmQgcmVuZGVyZXJcbiAgICB2YXIgY29sb3JfcmVuZGVyZXIgPSBuZXcgY29sb3IuQ29sb3JSZW5kZXJlcigpO1xuICAgIGNvbG9yX3JlbmRlcmVyLmNvbG9yID0gc3R5bGUuYmFja2dyb3VuZCB8fCAnd2hpdGUnO1xuICAgIHN0eWxlLm9uKCdjaGFuZ2VkOnN0eWxlJywgZnVuY3Rpb24oKSB7IGNvbG9yX3JlbmRlcmVyLmNvbG9yID0gc3R5bGUuYmFja2dyb3VuZDsgfSk7XG5cbiAgICAvLyBDcmVhdGUgdGhlIGRvY3VtZW50IGhpZ2hsaWdodGVyLCB3aGljaCBuZWVkcyB0byBrbm93IGFib3V0IHRoZSBjdXJyZW50bHlcbiAgICAvLyByZW5kZXJlZCByb3dzIGluIG9yZGVyIHRvIGtub3cgd2hlcmUgdG8gaGlnaGxpZ2h0LlxuICAgIHRoaXMuaGlnaGxpZ2h0ZXIgPSBuZXcgc3ludGF4X2hpZ2hsaWdodGVyLlN5bnRheEhpZ2hsaWdodGVyKG1vZGVsLCByb3dfcmVuZGVyZXIpO1xuXG4gICAgLy8gUGFzcyBnZXRfcm93X2NoYXIgaW50byBjdXJzb3JzLlxuICAgIGN1cnNvcnNfbW9kZWwuZ2V0X3Jvd19jaGFyID0gdXRpbHMucHJveHkocm93X3JlbmRlcmVyLmdldF9yb3dfY2hhciwgcm93X3JlbmRlcmVyKTtcblxuICAgIC8vIENhbGwgYmFzZSBjb25zdHJ1Y3Rvci5cbiAgICBiYXRjaC5CYXRjaFJlbmRlcmVyLmNhbGwodGhpcywgW1xuICAgICAgICBjb2xvcl9yZW5kZXJlcixcbiAgICAgICAgc2VsZWN0aW9uc19yZW5kZXJlcixcbiAgICAgICAgcm93X3JlbmRlcmVyLFxuICAgICAgICBjdXJzb3JzX3JlbmRlcmVyLFxuICAgIF0sIGNhbnZhcyk7XG5cbiAgICAvLyBIb29rdXAgcmVuZGVyIGV2ZW50cy5cbiAgICB0aGlzLl9jYW52YXMub24oJ3JlZHJhdycsIHV0aWxzLnByb3h5KHRoaXMucmVuZGVyLCB0aGlzKSk7XG4gICAgdGhpcy5fbW9kZWwub24oJ2NoYW5nZWQnLCB1dGlscy5wcm94eShjYW52YXMucmVkcmF3LCBjYW52YXMpKTtcblxuICAgIC8vIENyZWF0ZSBwcm9wZXJ0aWVzXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMucHJvcGVydHkoJ2xhbmd1YWdlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Ll9sYW5ndWFnZTtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0LmhpZ2hsaWdodGVyLmxvYWQodmFsdWUpO1xuICAgICAgICB0aGF0Ll9sYW5ndWFnZSA9IHZhbHVlO1xuICAgIH0pO1xufTtcbnV0aWxzLmluaGVyaXQoRG9jdW1lbnRWaWV3LCBiYXRjaC5CYXRjaFJlbmRlcmVyKTtcblxuZXhwb3J0cy5Eb2N1bWVudFZpZXcgPSBEb2N1bWVudFZpZXc7IiwiLy8gT1NYIGJpbmRpbmdzXG5pZiAobmF2aWdhdG9yLmFwcFZlcnNpb24uaW5kZXhPZihcIk1hY1wiKSAhPSAtMSkge1xuICAgIGV4cG9ydHMubWFwID0ge1xuICAgICAgICAnYWx0LWxlZnRhcnJvdycgOiAnY3Vyc29yLndvcmRfbGVmdCcsXG4gICAgICAgICdhbHQtcmlnaHRhcnJvdycgOiAnY3Vyc29yLndvcmRfcmlnaHQnLFxuICAgICAgICAnc2hpZnQtYWx0LWxlZnRhcnJvdycgOiAnY3Vyc29yLnNlbGVjdF93b3JkX2xlZnQnLFxuICAgICAgICAnc2hpZnQtYWx0LXJpZ2h0YXJyb3cnIDogJ2N1cnNvci5zZWxlY3Rfd29yZF9yaWdodCcsXG4gICAgICAgICdtZXRhLWxlZnRhcnJvdycgOiAnY3Vyc29yLmxpbmVfc3RhcnQnLFxuICAgICAgICAnbWV0YS1yaWdodGFycm93JyA6ICdjdXJzb3IubGluZV9lbmQnLFxuICAgICAgICAnc2hpZnQtbWV0YS1sZWZ0YXJyb3cnIDogJ2N1cnNvci5zZWxlY3RfbGluZV9zdGFydCcsXG4gICAgICAgICdzaGlmdC1tZXRhLXJpZ2h0YXJyb3cnIDogJ2N1cnNvci5zZWxlY3RfbGluZV9lbmQnLFxuICAgICAgICAnbWV0YS1hJyA6ICdjdXJzb3Iuc2VsZWN0X2FsbCcsXG4gICAgfTtcblxuLy8gTm9uIE9TWCBiaW5kaW5nc1xufSBlbHNlIHtcbiAgICBleHBvcnRzLm1hcCA9IHtcbiAgICAgICAgJ2N0cmwtbGVmdGFycm93JyA6ICdjdXJzb3Iud29yZF9sZWZ0JyxcbiAgICAgICAgJ2N0cmwtcmlnaHRhcnJvdycgOiAnY3Vyc29yLndvcmRfcmlnaHQnLFxuICAgICAgICAnc2hpZnQtY3RybC1sZWZ0YXJyb3cnIDogJ2N1cnNvci5zZWxlY3Rfd29yZF9sZWZ0JyxcbiAgICAgICAgJ3NoaWZ0LWN0cmwtcmlnaHRhcnJvdycgOiAnY3Vyc29yLnNlbGVjdF93b3JkX3JpZ2h0JyxcbiAgICAgICAgJ2hvbWUnIDogJ2N1cnNvci5saW5lX3N0YXJ0JyxcbiAgICAgICAgJ2VuZCcgOiAnY3Vyc29yLmxpbmVfZW5kJyxcbiAgICAgICAgJ3NoaWZ0LWhvbWUnIDogJ2N1cnNvci5zZWxlY3RfbGluZV9zdGFydCcsXG4gICAgICAgICdzaGlmdC1lbmQnIDogJ2N1cnNvci5zZWxlY3RfbGluZV9lbmQnLFxuICAgICAgICAnY3RybC1hJyA6ICdjdXJzb3Iuc2VsZWN0X2FsbCcsXG4gICAgfTtcblxufVxuXG4vLyBDb21tb24gYmluZGluZ3NcbmV4cG9ydHMubWFwWydrZXlwcmVzcyddID0gJ2N1cnNvci5rZXlwcmVzcyc7XG5leHBvcnRzLm1hcFsnZW50ZXInXSA9ICdjdXJzb3IubmV3bGluZSc7XG5leHBvcnRzLm1hcFsnZGVsZXRlJ10gPSAnY3Vyc29yLmRlbGV0ZV9mb3J3YXJkJztcbmV4cG9ydHMubWFwWydiYWNrc3BhY2UnXSA9ICdjdXJzb3IuZGVsZXRlX2JhY2t3YXJkJztcbmV4cG9ydHMubWFwWydsZWZ0YXJyb3cnXSA9ICdjdXJzb3IubGVmdCc7XG5leHBvcnRzLm1hcFsncmlnaHRhcnJvdyddID0gJ2N1cnNvci5yaWdodCc7XG5leHBvcnRzLm1hcFsndXBhcnJvdyddID0gJ2N1cnNvci51cCc7XG5leHBvcnRzLm1hcFsnZG93bmFycm93J10gPSAnY3Vyc29yLmRvd24nO1xuZXhwb3J0cy5tYXBbJ3NoaWZ0LWxlZnRhcnJvdyddID0gJ2N1cnNvci5zZWxlY3RfbGVmdCc7XG5leHBvcnRzLm1hcFsnc2hpZnQtcmlnaHRhcnJvdyddID0gJ2N1cnNvci5zZWxlY3RfcmlnaHQnO1xuZXhwb3J0cy5tYXBbJ3NoaWZ0LXVwYXJyb3cnXSA9ICdjdXJzb3Iuc2VsZWN0X3VwJztcbmV4cG9ydHMubWFwWydzaGlmdC1kb3duYXJyb3cnXSA9ICdjdXJzb3Iuc2VsZWN0X2Rvd24nO1xuZXhwb3J0cy5tYXBbJ21vdXNlMC1kb3duJ10gPSAnY3Vyc29ycy5zdGFydF9zZWxlY3Rpb24nO1xuZXhwb3J0cy5tYXBbJ21vdXNlLW1vdmUnXSA9ICdjdXJzb3JzLnNldF9zZWxlY3Rpb24nO1xuZXhwb3J0cy5tYXBbJ21vdXNlMC11cCddID0gJ2N1cnNvcnMuZW5kX3NlbGVjdGlvbic7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMuanMnKTtcblxuLyoqXG4gKiBFdmVudCBub3JtYWxpemVyXG4gKlxuICogTGlzdGVucyB0byBET00gZXZlbnRzIGFuZCBlbWl0cyAnY2xlYW5lZCcgdmVyc2lvbnMgb2YgdGhvc2UgZXZlbnRzLlxuICovXG52YXIgTWFwID0gZnVuY3Rpb24obm9ybWFsaXplcikge1xuICAgIHV0aWxzLlBvc3RlckNsYXNzLmNhbGwodGhpcyk7XG4gICAgdGhpcy5fbWFwID0ge307XG5cbiAgICAvLyBDcmVhdGUgbm9ybWFsaXplciBwcm9wZXJ0eVxuICAgIHRoaXMuX25vcm1hbGl6ZXIgPSBudWxsO1xuICAgIHRoaXMuX3Byb3h5X2hhbmRsZV9ldmVudCA9IHV0aWxzLnByb3h5KHRoaXMuX2hhbmRsZV9ldmVudCwgdGhpcyk7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMucHJvcGVydHkoJ25vcm1hbGl6ZXInLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoYXQuX25vcm1hbGl6ZXI7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgLy8gUmVtb3ZlIGV2ZW50IGhhbmRsZXIuXG4gICAgICAgIGlmICh0aGF0Ll9ub3JtYWxpemVyKSB0aGF0Ll9ub3JtYWxpemVyLm9mZl9hbGwodGhhdC5fcHJveHlfaGFuZGxlX2V2ZW50KTtcbiAgICAgICAgLy8gU2V0LCBhbmQgYWRkIGV2ZW50IGhhbmRsZXIuXG4gICAgICAgIHRoYXQuX25vcm1hbGl6ZXIgPSB2YWx1ZTtcbiAgICAgICAgaWYgKHZhbHVlKSB2YWx1ZS5vbl9hbGwodGhhdC5fcHJveHlfaGFuZGxlX2V2ZW50KTtcbiAgICB9KTtcblxuICAgIC8vIElmIGRlZmluZWQsIHNldCB0aGUgbm9ybWFsaXplci5cbiAgICBpZiAobm9ybWFsaXplcikgdGhpcy5ub3JtYWxpemVyID0gbm9ybWFsaXplcjtcbn07XG51dGlscy5pbmhlcml0KE1hcCwgdXRpbHMuUG9zdGVyQ2xhc3MpO1xuXG4vKipcbiAqIE1hcCBvZiBBUEkgbWV0aG9kcyBieSBuYW1lLlxuICogQHR5cGUge2RpY3Rpb25hcnl9XG4gKi9cbk1hcC5yZWdpc3RyeSA9IHt9O1xuTWFwLl9yZWdpc3RyeV90YWdzID0ge307XG5cbi8qKlxuICogUmVnaXN0ZXJzIGFuIGFjdGlvbi5cbiAqIEBwYXJhbSAge3N0cmluZ30gbmFtZSAtIG5hbWUgb2YgdGhlIGFjdGlvblxuICogQHBhcmFtICB7ZnVuY3Rpb259IGZcbiAqIEBwYXJhbSAge09iamVjdH0gKG9wdGlvbmFsKSB0YWcgLSBhbGxvd3MgeW91IHRvIHNwZWNpZnkgYSB0YWdcbiAqICAgICAgICAgICAgICAgICAgd2hpY2ggY2FuIGJlIHVzZWQgd2l0aCB0aGUgYHVucmVnaXN0ZXJfYnlfdGFnYFxuICogICAgICAgICAgICAgICAgICBtZXRob2QgdG8gcXVpY2tseSB1bnJlZ2lzdGVyIGFjdGlvbnMgd2l0aFxuICogICAgICAgICAgICAgICAgICB0aGUgdGFnIHNwZWNpZmllZC5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbk1hcC5yZWdpc3RlciA9IGZ1bmN0aW9uKG5hbWUsIGYsIHRhZykge1xuICAgIGlmICh1dGlscy5pc19hcnJheShNYXAucmVnaXN0cnlbbmFtZV0pKSB7XG4gICAgICAgIE1hcC5yZWdpc3RyeVtuYW1lXS5wdXNoKGYpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChNYXAucmVnaXN0cnlbbmFtZV09PT11bmRlZmluZWQpIHtcbiAgICAgICAgICAgIE1hcC5yZWdpc3RyeVtuYW1lXSA9IGY7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBNYXAucmVnaXN0cnlbbmFtZV0gPSBbTWFwLnJlZ2lzdHJ5W25hbWVdLCBmXTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0YWcpIHtcbiAgICAgICAgaWYgKE1hcC5fcmVnaXN0cnlfdGFnc1t0YWddID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIE1hcC5fcmVnaXN0cnlfdGFnc1t0YWddID0gW107XG4gICAgICAgIH1cbiAgICAgICAgTWFwLl9yZWdpc3RyeV90YWdzW3RhZ10ucHVzaCh7bmFtZTogbmFtZSwgZjogZn0pO1xuICAgIH1cbn07XG5cbi8qKlxuICogVW5yZWdpc3RlciBhbiBhY3Rpb24uXG4gKiBAcGFyYW0gIHtzdHJpbmd9IG5hbWUgLSBuYW1lIG9mIHRoZSBhY3Rpb25cbiAqIEBwYXJhbSAge2Z1bmN0aW9ufSBmXG4gKiBAcmV0dXJuIHtib29sZWFufSB0cnVlIGlmIGFjdGlvbiB3YXMgZm91bmQgYW5kIHVucmVnaXN0ZXJlZFxuICovXG5NYXAudW5yZWdpc3RlciA9IGZ1bmN0aW9uKG5hbWUsIGYpIHtcbiAgICBpZiAodXRpbHMuaXNfYXJyYXkoTWFwLnJlZ2lzdHJ5W25hbWVdKSkge1xuICAgICAgICB2YXIgaW5kZXggPSBNYXAucmVnaXN0cnlbbmFtZV0uaW5kZXhPZihmKTtcbiAgICAgICAgaWYgKGluZGV4ICE9IC0xKSB7XG4gICAgICAgICAgICBNYXAucmVnaXN0cnlbbmFtZV0uc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChNYXAucmVnaXN0cnlbbmFtZV0gPT0gZikge1xuICAgICAgICBkZWxldGUgTWFwLnJlZ2lzdHJ5W25hbWVdO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufTtcblxuLyoqXG4gKiBVbnJlZ2lzdGVycyBhbGwgb2YgdGhlIGFjdGlvbnMgcmVnaXN0ZXJlZCB3aXRoIGEgZ2l2ZW4gdGFnLlxuICogQHBhcmFtICB7T2JqZWN0fSB0YWcgLSBzcGVjaWZpZWQgaW4gTWFwLnJlZ2lzdGVyLlxuICogQHJldHVybiB7Ym9vbGVhbn0gdHJ1ZSBpZiB0aGUgdGFnIHdhcyBmb3VuZCBhbmQgZGVsZXRlZC5cbiAqL1xuTWFwLnVucmVnaXN0ZXJfYnlfdGFnID0gZnVuY3Rpb24odGFnKSB7XG4gICAgaWYgKE1hcC5fcmVnaXN0cnlfdGFnc1t0YWddKSB7XG4gICAgICAgIE1hcC5fcmVnaXN0cnlfdGFnc1t0YWddLmZvckVhY2goZnVuY3Rpb24ocmVnaXN0cmF0aW9uKSB7XG4gICAgICAgICAgICBNYXAudW5yZWdpc3RlcihyZWdpc3RyYXRpb24ubmFtZSwgcmVnaXN0cmF0aW9uLmYpO1xuICAgICAgICB9KTtcbiAgICAgICAgZGVsZXRlIE1hcC5fcmVnaXN0cnlfdGFnc1t0YWddO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEFwcGVuZCBldmVudCBhY3Rpb25zIHRvIHRoZSBtYXAuXG4gKlxuICogVGhpcyBtZXRob2QgaGFzIHR3byBzaWduYXR1cmVzLiAgSWYgYSBzaW5nbGUgYXJndW1lbnRcbiAqIGlzIHBhc3NlZCB0byBpdCwgdGhhdCBhcmd1bWVudCBpcyB0cmVhdGVkIGxpa2UgYVxuICogZGljdGlvbmFyeS4gIElmIG1vcmUgdGhhbiBvbmUgYXJndW1lbnQgaXMgcGFzc2VkIHRvIGl0LFxuICogZWFjaCBhcmd1bWVudCBpcyB0cmVhdGVkIGFzIGFsdGVybmF0aW5nIGtleSwgdmFsdWVcbiAqIHBhaXJzIG9mIGEgZGljdGlvbmFyeS5cbiAqXG4gKiBUaGUgbWFwIGFsbG93cyB5b3UgdG8gcmVnaXN0ZXIgYWN0aW9ucyBmb3Iga2V5cy5cbiAqIEV4YW1wbGU6XG4gKiAgICAgbWFwLmFwcGVuZF9tYXAoe1xuICogICAgICAgICAnY3RybC1hJzogJ2N1cnNvcnMuc2VsZWN0X2FsbCcsXG4gKiAgICAgfSlcbiAqXG4gKiBNdWx0aXBsZSBhY3Rpb25zIGNhbiBiZSByZWdpc3RlcmVkIGZvciBhIHNpbmdsZSBldmVudC5cbiAqIFRoZSBhY3Rpb25zIGFyZSBleGVjdXRlZCBzZXF1ZW50aWFsbHksIHVudGlsIG9uZSBhY3Rpb25cbiAqIHJldHVybnMgYHRydWVgIGluIHdoaWNoIGNhc2UgdGhlIGV4ZWN1dGlvbiBoYXVsdHMuICBUaGlzXG4gKiBhbGxvd3MgYWN0aW9ucyB0byBydW4gY29uZGl0aW9uYWxseS5cbiAqIEV4YW1wbGU6XG4gKiAgICAgLy8gSW1wbGVtZW50aW5nIGEgZHVhbCBtb2RlIGVkaXRvciwgeW91IG1heSBoYXZlIHR3b1xuICogICAgIC8vIGZ1bmN0aW9ucyB0byByZWdpc3RlciBmb3Igb25lIGtleS4gaS5lLjpcbiAqICAgICB2YXIgZG9fYSA9IGZ1bmN0aW9uKGUpIHtcbiAqICAgICAgICAgaWYgKG1vZGU9PSdlZGl0Jykge1xuICogICAgICAgICAgICAgY29uc29sZS5sb2coJ0EnKTtcbiAqICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICogICAgICAgICB9XG4gKiAgICAgfVxuICogICAgIHZhciBkb19iID0gZnVuY3Rpb24oZSkge1xuICogICAgICAgICBpZiAobW9kZT09J2NvbW1hbmQnKSB7XG4gKiAgICAgICAgICAgICBjb25zb2xlLmxvZygnQicpO1xuICogICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gKiAgICAgICAgIH1cbiAqICAgICB9XG4gKlxuICogICAgIC8vIFRvIHJlZ2lzdGVyIGJvdGggZm9yIG9uZSBrZXlcbiAqICAgICBNYXAucmVnaXN0ZXIoJ2FjdGlvbl9hJywgZG9fYSk7XG4gKiAgICAgTWFwLnJlZ2lzdGVyKCdhY3Rpb25fYicsIGRvX2IpO1xuICogICAgIG1hcC5hcHBlbmRfbWFwKHtcbiAqICAgICAgICAgJ2FsdC12JzogWydhY3Rpb25fYScsICdhY3Rpb25fYiddLFxuICogICAgIH0pO1xuICogXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5NYXAucHJvdG90eXBlLmFwcGVuZF9tYXAgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdmFyIHBhcnNlZCA9IHRoaXMuX3BhcnNlX21hcF9hcmd1bWVudHMoYXJndW1lbnRzKTtcbiAgICBPYmplY3Qua2V5cyhwYXJzZWQpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIGlmICh0aGF0Ll9tYXBba2V5XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aGF0Ll9tYXBba2V5XSA9IHBhcnNlZFtrZXldO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhhdC5fbWFwW2tleV0gPSB0aGF0Ll9tYXBba2V5XS5jb25jYXQocGFyc2VkW2tleV0pO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIEFsaWFzIGZvciBgYXBwZW5kX21hcGAuXG4gKiBAdHlwZSB7ZnVuY3Rpb259XG4gKi9cbk1hcC5wcm90b3R5cGUubWFwID0gTWFwLnByb3RvdHlwZS5hcHBlbmRfbWFwO1xuXG4vKipcbiAqIFByZXBlbmQgZXZlbnQgYWN0aW9ucyB0byB0aGUgbWFwLlxuICpcbiAqIFNlZSB0aGUgZG9jIGZvciBgYXBwZW5kX21hcGAgZm9yIGEgZGV0YWlsZWQgZGVzY3JpcHRpb24gb2ZcbiAqIHBvc3NpYmxlIGlucHV0IHZhbHVlcy5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbk1hcC5wcm90b3R5cGUucHJlcGVuZF9tYXAgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdmFyIHBhcnNlZCA9IHRoaXMuX3BhcnNlX21hcF9hcmd1bWVudHMoYXJndW1lbnRzKTtcbiAgICBPYmplY3Qua2V5cyhwYXJzZWQpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIGlmICh0aGF0Ll9tYXBba2V5XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aGF0Ll9tYXBba2V5XSA9IHBhcnNlZFtrZXldO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhhdC5fbWFwW2tleV0gPSBwYXJzZWRba2V5XS5jb25jYXQodGhhdC5fbWFwW2tleV0pO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIFVubWFwIGV2ZW50IGFjdGlvbnMgaW4gdGhlIG1hcC5cbiAqXG4gKiBTZWUgdGhlIGRvYyBmb3IgYGFwcGVuZF9tYXBgIGZvciBhIGRldGFpbGVkIGRlc2NyaXB0aW9uIG9mXG4gKiBwb3NzaWJsZSBpbnB1dCB2YWx1ZXMuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5NYXAucHJvdG90eXBlLnVubWFwID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHZhciBwYXJzZWQgPSB0aGlzLl9wYXJzZV9tYXBfYXJndW1lbnRzKGFyZ3VtZW50cyk7XG4gICAgT2JqZWN0LmtleXMocGFyc2VkKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICBpZiAodGhhdC5fbWFwW2tleV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcGFyc2VkW2tleV0uZm9yRWFjaChmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHZhciBpbmRleCA9IHRoYXQuX21hcFtrZXldLmluZGV4T2YodmFsdWUpO1xuICAgICAgICAgICAgICAgIGlmIChpbmRleCAhPSAtMSkge1xuICAgICAgICAgICAgICAgICAgICB0aGF0Ll9tYXBba2V5XS5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIEdldCBhIG1vZGlmaWFibGUgYXJyYXkgb2YgdGhlIGFjdGlvbnMgZm9yIGEgcGFydGljdWxhciBldmVudC5cbiAqIEBwYXJhbSAge3N0cmluZ30gZXZlbnRcbiAqIEByZXR1cm4ge2FycmF5fSBieSByZWYgY29weSBvZiB0aGUgYWN0aW9ucyByZWdpc3RlcmVkIHRvIGFuIGV2ZW50LlxuICovXG5NYXAucHJvdG90eXBlLmdldF9tYXBwaW5nID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICByZXR1cm4gdGhpcy5fbWFwW3RoaXMuX25vcm1hbGl6ZV9ldmVudF9uYW1lKGV2ZW50KV07XG59O1xuXG4vKipcbiAqIFBhcnNlIHRoZSBhcmd1bWVudHMgdG8gYSBtYXAgZnVuY3Rpb24uXG4gKiBAcGFyYW0gIHthcmd1bWVudHMgYXJyYXl9IGFyZ3NcbiAqIEByZXR1cm4ge2RpY3Rpb25hcnl9IHBhcnNlZCByZXN1bHRzXG4gKi9cbk1hcC5wcm90b3R5cGUuX3BhcnNlX21hcF9hcmd1bWVudHMgPSBmdW5jdGlvbihhcmdzKSB7XG4gICAgdmFyIHBhcnNlZCA9IHt9O1xuICAgIHZhciB0aGF0ID0gdGhpcztcblxuICAgIC8vIE9uZSBhcnVtZW50LCB0cmVhdCBpdCBhcyBhIGRpY3Rpb25hcnkgb2YgZXZlbnQgbmFtZXMgYW5kXG4gICAgLy8gYWN0aW9ucy5cbiAgICBpZiAoYXJncy5sZW5ndGggPT0gMSkge1xuICAgICAgICBPYmplY3Qua2V5cyhhcmdzWzBdKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gYXJnc1swXVtrZXldO1xuICAgICAgICAgICAgdmFyIG5vcm1hbGl6ZWRfa2V5ID0gdGhhdC5fbm9ybWFsaXplX2V2ZW50X25hbWUoa2V5KTtcblxuICAgICAgICAgICAgLy8gSWYgdGhlIHZhbHVlIGlzIG5vdCBhbiBhcnJheSwgd3JhcCBpdCBpbiBvbmUuXG4gICAgICAgICAgICBpZiAoIXV0aWxzLmlzX2FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gW3ZhbHVlXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gSWYgdGhlIGtleSBpcyBhbHJlYWR5IGRlZmluZWQsIGNvbmNhdCB0aGUgdmFsdWVzIHRvXG4gICAgICAgICAgICAvLyBpdC4gIE90aGVyd2lzZSwgc2V0IGl0LlxuICAgICAgICAgICAgaWYgKHBhcnNlZFtub3JtYWxpemVkX2tleV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHBhcnNlZFtub3JtYWxpemVkX2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcGFyc2VkW25vcm1hbGl6ZWRfa2V5XSA9IHBhcnNlZFtub3JtYWxpemVkX2tleV0uY29uY2F0KHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAvLyBNb3JlIHRoYW4gb25lIGFyZ3VtZW50LiAgVHJlYXQgYXMgdGhlIGZvcm1hdDpcbiAgICAvLyBldmVudF9uYW1lMSwgYWN0aW9uMSwgZXZlbnRfbmFtZTIsIGFjdGlvbjIsIC4uLiwgZXZlbnRfbmFtZU4sIGFjdGlvbk5cbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKHZhciBpPTA7IGk8TWF0aC5mbG9vcihhcmdzLmxlbmd0aC8yKTsgaSsrKSB7XG4gICAgICAgICAgICB2YXIga2V5ID0gdGhhdC5fbm9ybWFsaXplX2V2ZW50X25hbWUoYXJnc1syKmldKTtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IGFyZ3NbMippICsgMV07XG4gICAgICAgICAgICBpZiAocGFyc2VkW2tleV09PT11bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBwYXJzZWRba2V5XSA9IFt2YWx1ZV07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHBhcnNlZFtrZXldLnB1c2godmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBwYXJzZWQ7XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgYSBub3JtYWxpemVkIGV2ZW50LlxuICogQHBhcmFtICB7c3RyaW5nfSBuYW1lIC0gbmFtZSBvZiB0aGUgZXZlbnRcbiAqIEBwYXJhbSAge0V2ZW50fSBlIC0gYnJvd3NlciBFdmVudCBvYmplY3RcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbk1hcC5wcm90b3R5cGUuX2hhbmRsZV9ldmVudCA9IGZ1bmN0aW9uKG5hbWUsIGUpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdmFyIG5vcm1hbGl6ZWRfZXZlbnQgPSB0aGlzLl9ub3JtYWxpemVfZXZlbnRfbmFtZShuYW1lKTtcbiAgICB2YXIgYWN0aW9ucyA9IHRoaXMuX21hcFtub3JtYWxpemVkX2V2ZW50XTtcblxuICAgIGlmIChhY3Rpb25zKSB7XG4gICAgICAgIGFjdGlvbnMuZm9yRWFjaChmdW5jdGlvbihhY3Rpb24pIHtcbiAgICAgICAgICAgIHZhciBhY3Rpb25fY2FsbGJhY2tzID0gTWFwLnJlZ2lzdHJ5W2FjdGlvbl07XG4gICAgICAgICAgICBpZiAoYWN0aW9uX2NhbGxiYWNrcykge1xuICAgICAgICAgICAgICAgIGlmICh1dGlscy5pc19hcnJheShhY3Rpb25fY2FsbGJhY2tzKSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmV0dXJucyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBhY3Rpb25fY2FsbGJhY2tzLmZvckVhY2goZnVuY3Rpb24oYWN0aW9uX2NhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm5zLmFwcGVuZChhY3Rpb25fY2FsbGJhY2suY2FsbCh1bmRlZmluZWQsIGUpPT09dHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIElmIG9uZSBvZiB0aGUgYWN0aW9uIGNhbGxiYWNrcyByZXR1cm5lZCB0cnVlLCBjYW5jZWwgYnViYmxpbmcuXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXR1cm5zLnNvbWUoZnVuY3Rpb24oeCkge3JldHVybiB4O30pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1dGlscy5jYW5jZWxfYnViYmxlKGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYWN0aW9uX2NhbGxiYWNrcy5jYWxsKHVuZGVmaW5lZCwgZSk9PT10cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1dGlscy5jYW5jZWxfYnViYmxlKGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG4vKipcbiAqIEFscGhhYmV0aWNhbGx5IHNvcnRzIGtleXMgaW4gZXZlbnQgbmFtZSwgc29cbiAqIEBwYXJhbSAge3N0cmluZ30gbmFtZSAtIGV2ZW50IG5hbWVcbiAqIEByZXR1cm4ge3N0cmluZ30gbm9ybWFsaXplZCBldmVudCBuYW1lXG4gKi9cbk1hcC5wcm90b3R5cGUuX25vcm1hbGl6ZV9ldmVudF9uYW1lID0gZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiBuYW1lLnRvTG93ZXJDYXNlKCkudHJpbSgpLnNwbGl0KCctJykuc29ydCgpLmpvaW4oJy0nKTtcbn07XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuTWFwID0gTWFwO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzLmpzJyk7XG5cbi8qKlxuICogRXZlbnQgbm9ybWFsaXplclxuICpcbiAqIExpc3RlbnMgdG8gRE9NIGV2ZW50cyBhbmQgZW1pdHMgJ2NsZWFuZWQnIHZlcnNpb25zIG9mIHRob3NlIGV2ZW50cy5cbiAqL1xudmFyIE5vcm1hbGl6ZXIgPSBmdW5jdGlvbigpIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMuX2VsX2hvb2tzID0ge307XG59O1xudXRpbHMuaW5oZXJpdChOb3JtYWxpemVyLCB1dGlscy5Qb3N0ZXJDbGFzcyk7XG5cbi8qKlxuICogTGlzdGVuIHRvIHRoZSBldmVudHMgb2YgYW4gZWxlbWVudC5cbiAqIEBwYXJhbSAge0hUTUxFbGVtZW50fSBlbFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuTm9ybWFsaXplci5wcm90b3R5cGUubGlzdGVuX3RvID0gZnVuY3Rpb24oZWwpIHtcbiAgICB2YXIgaG9va3MgPSBbXTtcbiAgICBob29rcy5wdXNoKHV0aWxzLmhvb2soZWwsICdvbmtleXByZXNzJywgdGhpcy5fcHJveHkoJ3ByZXNzJywgdGhpcy5faGFuZGxlX2tleXByZXNzX2V2ZW50LCBlbCkpKTtcbiAgICBob29rcy5wdXNoKHV0aWxzLmhvb2soZWwsICdvbmtleWRvd24nLCAgdGhpcy5fcHJveHkoJ2Rvd24nLCB0aGlzLl9oYW5kbGVfa2V5Ym9hcmRfZXZlbnQsIGVsKSkpO1xuICAgIGhvb2tzLnB1c2godXRpbHMuaG9vayhlbCwgJ29ua2V5dXAnLCAgdGhpcy5fcHJveHkoJ3VwJywgdGhpcy5faGFuZGxlX2tleWJvYXJkX2V2ZW50LCBlbCkpKTtcbiAgICBob29rcy5wdXNoKHV0aWxzLmhvb2soZWwsICdvbmRibGNsaWNrJywgIHRoaXMuX3Byb3h5KCdkYmxjbGljaycsIHRoaXMuX2hhbmRsZV9tb3VzZV9ldmVudCwgZWwpKSk7XG4gICAgaG9va3MucHVzaCh1dGlscy5ob29rKGVsLCAnb25jbGljaycsICB0aGlzLl9wcm94eSgnY2xpY2snLCB0aGlzLl9oYW5kbGVfbW91c2VfZXZlbnQsIGVsKSkpO1xuICAgIGhvb2tzLnB1c2godXRpbHMuaG9vayhlbCwgJ29ubW91c2Vkb3duJywgIHRoaXMuX3Byb3h5KCdkb3duJywgdGhpcy5faGFuZGxlX21vdXNlX2V2ZW50LCBlbCkpKTtcbiAgICBob29rcy5wdXNoKHV0aWxzLmhvb2soZWwsICdvbm1vdXNldXAnLCAgdGhpcy5fcHJveHkoJ3VwJywgdGhpcy5faGFuZGxlX21vdXNlX2V2ZW50LCBlbCkpKTtcbiAgICBob29rcy5wdXNoKHV0aWxzLmhvb2soZWwsICdvbm1vdXNlbW92ZScsICB0aGlzLl9wcm94eSgnbW92ZScsIHRoaXMuX2hhbmRsZV9tb3VzZW1vdmVfZXZlbnQsIGVsKSkpO1xuICAgIHRoaXMuX2VsX2hvb2tzW2VsXSA9IGhvb2tzO1xufTtcblxuLyoqXG4gKiBTdG9wcyBsaXN0ZW5pbmcgdG8gYW4gZWxlbWVudC5cbiAqIEBwYXJhbSAge0hUTUxFbGVtZW50fSBlbFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuTm9ybWFsaXplci5wcm90b3R5cGUuc3RvcF9saXN0ZW5pbmdfdG8gPSBmdW5jdGlvbihlbCkge1xuICAgIGlmICh0aGlzLl9lbF9ob29rc1tlbF0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLl9lbF9ob29rc1tlbF0uZm9yRWFjaChmdW5jdGlvbihob29rKSB7XG4gICAgICAgICAgICBob29rLnVuaG9vaygpO1xuICAgICAgICB9KTtcbiAgICAgICAgZGVsZXRlIHRoaXMuX2VsX2hvb2tzW2VsXTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgd2hlbiBhIG1vdXNlIGV2ZW50IG9jY3Vyc1xuICogQHBhcmFtICB7SFRNTEVsZW1lbnR9IGVsXG4gKiBAcGFyYW0gIHtFdmVudH0gZVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuTm9ybWFsaXplci5wcm90b3R5cGUuX2hhbmRsZV9tb3VzZV9ldmVudCA9IGZ1bmN0aW9uKGVsLCBldmVudF9uYW1lLCBlKSB7XG4gICAgZSA9IGUgfHwgd2luZG93LmV2ZW50O1xuICAgIHRoaXMudHJpZ2dlcih0aGlzLl9tb2RpZmllcl9zdHJpbmcoZSkgKyAnbW91c2UnICsgZS5idXR0b24gKyAnLScgKyBldmVudF9uYW1lLCBlKTtcbn07XG5cbi8qKlxuICogSGFuZGxlcyB3aGVuIGEgbW91c2UgZXZlbnQgb2NjdXJzXG4gKiBAcGFyYW0gIHtIVE1MRWxlbWVudH0gZWxcbiAqIEBwYXJhbSAge0V2ZW50fSBlXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Ob3JtYWxpemVyLnByb3RvdHlwZS5faGFuZGxlX21vdXNlbW92ZV9ldmVudCA9IGZ1bmN0aW9uKGVsLCBldmVudF9uYW1lLCBlKSB7XG4gICAgZSA9IGUgfHwgd2luZG93LmV2ZW50O1xuICAgIHRoaXMudHJpZ2dlcih0aGlzLl9tb2RpZmllcl9zdHJpbmcoZSkgKyAnbW91c2UnICsgJy0nICsgZXZlbnRfbmFtZSwgZSk7XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgd2hlbiBhIGtleWJvYXJkIGV2ZW50IG9jY3Vyc1xuICogQHBhcmFtICB7SFRNTEVsZW1lbnR9IGVsXG4gKiBAcGFyYW0gIHtFdmVudH0gZVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuTm9ybWFsaXplci5wcm90b3R5cGUuX2hhbmRsZV9rZXlib2FyZF9ldmVudCA9IGZ1bmN0aW9uKGVsLCBldmVudF9uYW1lLCBlKSB7XG4gICAgZSA9IGUgfHwgd2luZG93LmV2ZW50O1xuICAgIHZhciBrZXluYW1lID0gdGhpcy5fbG9va3VwX2tleWNvZGUoZS5rZXlDb2RlKTtcbiAgICBpZiAoa2V5bmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMudHJpZ2dlcih0aGlzLl9tb2RpZmllcl9zdHJpbmcoZSkgKyBrZXluYW1lICsgJy0nICsgZXZlbnRfbmFtZSwgZSk7XG5cbiAgICAgICAgaWYgKGV2ZW50X25hbWU9PSdkb3duJykgeyAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy50cmlnZ2VyKHRoaXMuX21vZGlmaWVyX3N0cmluZyhlKSArIGtleW5hbWUsIGUpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHRoaXMudHJpZ2dlcih0aGlzLl9tb2RpZmllcl9zdHJpbmcoZSkgKyBTdHJpbmcoZS5rZXlDb2RlKSArICctJyArIGV2ZW50X25hbWUsIGUpO1xuICAgIHRoaXMudHJpZ2dlcigna2V5JyArIGV2ZW50X25hbWUsIGUpO1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIHdoZW4gYSBrZXlwcmVzcyBldmVudCBvY2N1cnNcbiAqIEBwYXJhbSAge0hUTUxFbGVtZW50fSBlbFxuICogQHBhcmFtICB7RXZlbnR9IGVcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbk5vcm1hbGl6ZXIucHJvdG90eXBlLl9oYW5kbGVfa2V5cHJlc3NfZXZlbnQgPSBmdW5jdGlvbihlbCwgZXZlbnRfbmFtZSwgZSkge1xuICAgIHRoaXMudHJpZ2dlcigna2V5cHJlc3MnLCBlKTtcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBlbGVtZW50IGV2ZW50IHByb3h5LlxuICogQHBhcmFtICB7ZnVuY3Rpb259IGZcbiAqIEBwYXJhbSAge3N0cmluZ30gZXZlbnRfbmFtZVxuICogQHBhcmFtICB7SFRNTEVsZW1lbnR9IGVsXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Ob3JtYWxpemVyLnByb3RvdHlwZS5fcHJveHkgPSBmdW5jdGlvbihldmVudF9uYW1lLCBmLCBlbCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBhcmdzID0gW2VsLCBldmVudF9uYW1lXS5jb25jYXQoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKSk7XG4gICAgICAgIHJldHVybiBmLmFwcGx5KHRoYXQsIGFyZ3MpO1xuICAgIH07XG59O1xuXG4vKipcbiAqIENyZWF0ZSBhIG1vZGlmaWVycyBzdHJpbmcgZnJvbSBhbiBldmVudC5cbiAqIEBwYXJhbSAge0V2ZW50fSBlXG4gKiBAcmV0dXJuIHtzdHJpbmd9IGRhc2ggc2VwYXJhdGVkIG1vZGlmaWVyIHN0cmluZ1xuICovXG5Ob3JtYWxpemVyLnByb3RvdHlwZS5fbW9kaWZpZXJfc3RyaW5nID0gZnVuY3Rpb24oZSkge1xuICAgIHZhciBtb2RpZmllcnMgPSBbXTtcbiAgICBpZiAoZS5jdHJsS2V5KSBtb2RpZmllcnMucHVzaCgnY3RybCcpO1xuICAgIGlmIChlLmFsdEtleSkgbW9kaWZpZXJzLnB1c2goJ2FsdCcpO1xuICAgIGlmIChlLm1ldGFLZXkpIG1vZGlmaWVycy5wdXNoKCdtZXRhJyk7XG4gICAgaWYgKGUuc2hpZnRLZXkpIG1vZGlmaWVycy5wdXNoKCdzaGlmdCcpO1xuICAgIHZhciBzdHJpbmcgPSBtb2RpZmllcnMuc29ydCgpLmpvaW4oJy0nKTtcbiAgICBpZiAoc3RyaW5nLmxlbmd0aCA+IDApIHN0cmluZyA9IHN0cmluZyArICctJztcbiAgICByZXR1cm4gc3RyaW5nO1xufTtcblxuLyoqXG4gKiBMb29rdXAgdGhlIGh1bWFuIGZyaWVuZGx5IG5hbWUgZm9yIGEga2V5Y29kZS5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IGtleWNvZGVcbiAqIEByZXR1cm4ge3N0cmluZ30ga2V5IG5hbWVcbiAqL1xuTm9ybWFsaXplci5wcm90b3R5cGUuX2xvb2t1cF9rZXljb2RlID0gZnVuY3Rpb24oa2V5Y29kZSkge1xuICAgIGlmICgxMTIgPD0ga2V5Y29kZSAmJiBrZXljb2RlIDw9IDEyMykgeyAvLyBGMS1GMTJcbiAgICAgICAgcmV0dXJuICdmJyArIChrZXljb2RlLTExMSk7XG4gICAgfSBlbHNlIGlmICg0OCA8PSBrZXljb2RlICYmIGtleWNvZGUgPD0gNTcpIHsgLy8gMC05XG4gICAgICAgIHJldHVybiBTdHJpbmcoa2V5Y29kZS00OCk7XG4gICAgfSBlbHNlIGlmICg2NSA8PSBrZXljb2RlICYmIGtleWNvZGUgPD0gOTApIHsgLy8gQS1aXG4gICAgICAgIHJldHVybiAnYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXonLnN1YnN0cmluZyhTdHJpbmcoa2V5Y29kZS02NSksIFN0cmluZyhrZXljb2RlLTY0KSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGNvZGVzID0ge1xuICAgICAgICAgICAgODogJ2JhY2tzcGFjZScsXG4gICAgICAgICAgICA5OiAndGFiJyxcbiAgICAgICAgICAgIDEzOiAnZW50ZXInLFxuICAgICAgICAgICAgMTY6ICdzaGlmdCcsXG4gICAgICAgICAgICAxNzogJ2N0cmwnLFxuICAgICAgICAgICAgMTg6ICdhbHQnLFxuICAgICAgICAgICAgMTk6ICdwYXVzZScsXG4gICAgICAgICAgICAyMDogJ2NhcHNsb2NrJyxcbiAgICAgICAgICAgIDI3OiAnZXNjJyxcbiAgICAgICAgICAgIDMyOiAnc3BhY2UnLFxuICAgICAgICAgICAgMzM6ICdwYWdldXAnLFxuICAgICAgICAgICAgMzQ6ICdwYWdlZG93bicsXG4gICAgICAgICAgICAzNTogJ2VuZCcsXG4gICAgICAgICAgICAzNjogJ2hvbWUnLFxuICAgICAgICAgICAgMzc6ICdsZWZ0YXJyb3cnLFxuICAgICAgICAgICAgMzg6ICd1cGFycm93JyxcbiAgICAgICAgICAgIDM5OiAncmlnaHRhcnJvdycsXG4gICAgICAgICAgICA0MDogJ2Rvd25hcnJvdycsXG4gICAgICAgICAgICA0NDogJ3ByaW50c2NyZWVuJyxcbiAgICAgICAgICAgIDQ1OiAnaW5zZXJ0JyxcbiAgICAgICAgICAgIDQ2OiAnZGVsZXRlJyxcbiAgICAgICAgICAgIDkxOiAnd2luZG93cycsXG4gICAgICAgICAgICA5MzogJ21lbnUnLFxuICAgICAgICAgICAgMTQ0OiAnbnVtbG9jaycsXG4gICAgICAgICAgICAxNDU6ICdzY3JvbGxsb2NrJyxcbiAgICAgICAgICAgIDE4ODogJ2NvbW1hJyxcbiAgICAgICAgICAgIDE5MDogJ3BlcmlvZCcsXG4gICAgICAgICAgICAxOTE6ICdmb3dhcmRzbGFzaCcsXG4gICAgICAgICAgICAxOTI6ICd0aWxkZScsXG4gICAgICAgICAgICAyMTk6ICdsZWZ0YnJhY2tldCcsXG4gICAgICAgICAgICAyMjA6ICdiYWNrc2xhc2gnLFxuICAgICAgICAgICAgMjIxOiAncmlnaHRicmFja2V0JyxcbiAgICAgICAgICAgIDIyMjogJ3F1b3RlJyxcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIGNvZGVzW2tleWNvZGVdO1xuICAgIH0gXG4gICAgLy8gVE9ETzogdGhpcyBmdW5jdGlvbiBpcyBtaXNzaW5nIHNvbWUgYnJvd3NlciBzcGVjaWZpY1xuICAgIC8vIGtleWNvZGUgbWFwcGluZ3MuXG59O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLk5vcm1hbGl6ZXIgPSBOb3JtYWxpemVyO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMuanMnKTtcblxuLyoqXG4gKiBMaXN0ZW5zIHRvIGEgbW9kZWwgYW5kIGhpZ2xpZ2h0cyB0aGUgdGV4dCBhY2NvcmRpbmdseS5cbiAqIEBwYXJhbSB7RG9jdW1lbnRNb2RlbH0gbW9kZWxcbiAqL1xudmFyIEhpZ2hsaWdodGVyQmFzZSA9IGZ1bmN0aW9uKG1vZGVsLCByb3dfcmVuZGVyZXIpIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMuX21vZGVsID0gbW9kZWw7XG4gICAgdGhpcy5fcm93X3JlbmRlcmVyID0gcm93X3JlbmRlcmVyO1xuICAgIHRoaXMuX3F1ZXVlZCA9IG51bGw7XG4gICAgdGhpcy5kZWxheSA9IDEwMDsgLy9tc1xuXG4gICAgLy8gQmluZCBldmVudHMuXG4gICAgdGhpcy5fcm93X3JlbmRlcmVyLm9uKCdyb3dzX2NoYW5nZWQnLCB1dGlscy5wcm94eSh0aGlzLl9oYW5kbGVfc2Nyb2xsLCB0aGlzKSk7XG4gICAgdGhpcy5fbW9kZWwub24oJ3RleHRfY2hhbmdlZCcsIHV0aWxzLnByb3h5KHRoaXMuX2hhbmRsZV90ZXh0X2NoYW5nZSwgdGhpcykpO1xuICAgIHRoaXMuX21vZGVsLm9uKCdyb3dfY2hhbmdlZCcsIHV0aWxzLnByb3h5KHRoaXMuX2hhbmRsZV90ZXh0X2NoYW5nZSwgdGhpcykpO1xufTtcbnV0aWxzLmluaGVyaXQoSGlnaGxpZ2h0ZXJCYXNlLCB1dGlscy5Qb3N0ZXJDbGFzcyk7XG5cbi8qKlxuICogSGlnaGxpZ2h0IHRoZSBkb2N1bWVudFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuSGlnaGxpZ2h0ZXJCYXNlLnByb3RvdHlwZS5oaWdobGlnaHQgPSBmdW5jdGlvbihzdGFydF9yb3csIGVuZF9yb3cpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ05vdCBpbXBsZW1lbnRlZCcpO1xufTtcblxuLyoqXG4gKiBRdWV1ZXMgYSBoaWdobGlnaHQgb3BlcmF0aW9uLlxuICpcbiAqIElmIGEgaGlnaGxpZ2h0IG9wZXJhdGlvbiBpcyBhbHJlYWR5IHF1ZXVlZCwgZG9uJ3QgcXVldWVcbiAqIGFub3RoZXIgb25lLiAgVGhpcyBlbnN1cmVzIHRoYXQgdGhlIGhpZ2hsaWdodGluZyBpc1xuICogZnJhbWUgcmF0ZSBsb2NrZWQuICBIaWdobGlnaHRpbmcgaXMgYW4gZXhwZW5zaXZlIG9wZXJhdGlvbi5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkhpZ2hsaWdodGVyQmFzZS5wcm90b3R5cGUuX3F1ZXVlX2hpZ2hsaWdodGVyID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuX3F1ZXVlZCA9PT0gbnVsbCkge1xuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgIHRoaXMuX3F1ZXVlZCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0aGF0Ll9tb2RlbC5hY3F1aXJlX3RhZ19ldmVudF9sb2NrKCk7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHZhciB2aXNpYmxlX3Jvd3MgPSB0aGF0Ll9yb3dfcmVuZGVyZXIuZ2V0X3Zpc2libGVfcm93cygpO1xuICAgICAgICAgICAgICAgIHZhciB0b3Bfcm93ID0gdmlzaWJsZV9yb3dzLnRvcF9yb3c7XG4gICAgICAgICAgICAgICAgdmFyIGJvdHRvbV9yb3cgPSB2aXNpYmxlX3Jvd3MuYm90dG9tX3JvdztcbiAgICAgICAgICAgICAgICB0aGF0LmhpZ2hsaWdodCh0b3Bfcm93LCBib3R0b21fcm93KTtcbiAgICAgICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICAgICAgdGhhdC5fbW9kZWwucmVsZWFzZV90YWdfZXZlbnRfbG9jaygpO1xuICAgICAgICAgICAgICAgIHRoYXQuX3F1ZXVlZCA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRoaXMuZGVsYXkpO1xuICAgIH1cbn07XG5cbi8qKlxuICogSGFuZGxlcyB3aGVuIHRoZSB2aXNpYmxlIHJvdyBpbmRpY2llcyBhcmUgY2hhbmdlZC5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkhpZ2hsaWdodGVyQmFzZS5wcm90b3R5cGUuX2hhbmRsZV9zY3JvbGwgPSBmdW5jdGlvbihzdGFydF9yb3csIGVuZF9yb3cpIHtcbiAgICB0aGlzLl9xdWV1ZV9oaWdobGlnaHRlcigpO1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIHdoZW4gdGhlIHRleHQgY2hhbmdlcy5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkhpZ2hsaWdodGVyQmFzZS5wcm90b3R5cGUuX2hhbmRsZV90ZXh0X2NoYW5nZSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3F1ZXVlX2hpZ2hsaWdodGVyKCk7XG59O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLkhpZ2hsaWdodGVyQmFzZSA9IEhpZ2hsaWdodGVyQmFzZTtcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzLmpzJyk7XG52YXIgaGlnaGxpZ2h0ZXIgPSByZXF1aXJlKCcuL2hpZ2hsaWdodGVyLmpzJyk7XG52YXIgbGFuZ3VhZ2VzID0gcmVxdWlyZSgnLi9zeW50YXgvaW5pdC5qcycpO1xuXG4vKipcbiAqIExpc3RlbnMgdG8gYSBtb2RlbCBhbmQgaGlnaGxpZ2h0cyB0aGUgdGV4dCBhY2NvcmRpbmdseS5cbiAqIEBwYXJhbSB7RG9jdW1lbnRNb2RlbH0gbW9kZWxcbiAqL1xudmFyIFN5bnRheEhpZ2hsaWdodGVyID0gZnVuY3Rpb24obW9kZWwsIHJvd19yZW5kZXJlcikge1xuICAgIGhpZ2hsaWdodGVyLkhpZ2hsaWdodGVyQmFzZS5jYWxsKHRoaXMsIG1vZGVsLCByb3dfcmVuZGVyZXIpO1xuXG4gICAgLy8gTG9vayBiYWNrIGFuZCBmb3J3YXJkIHRoaXMgbWFueSByb3dzIGZvciBjb250ZXh0dWFsbHkgXG4gICAgLy8gc2Vuc2l0aXZlIGhpZ2hsaWdodGluZy5cbiAgICB0aGlzLl9yb3dfcGFkZGluZyA9IDU7XG5cbiAgICB0aGlzLl9ncm91cHMgPSB7fTtcbiAgICB0aGlzLl90b3BsZXZlbF9ncm91cHMgPSB7fTsgLy8gQWxsIGdyb3VwcyB3aXRoIGNvbnRhaW5lZCA9PSBmYWxzZVxuICAgIHRoaXMuX3RhZ3MgPSB7fTtcbn07XG51dGlscy5pbmhlcml0KFN5bnRheEhpZ2hsaWdodGVyLCBoaWdobGlnaHRlci5IaWdobGlnaHRlckJhc2UpO1xuXG4vKipcbiAqIEhpZ2hsaWdodCB0aGUgZG9jdW1lbnRcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblN5bnRheEhpZ2hsaWdodGVyLnByb3RvdHlwZS5oaWdobGlnaHQgPSBmdW5jdGlvbihzdGFydF9yb3csIGVuZF9yb3cpIHtcbiAgICAvLyBHZXQgdGhlIGZpcnN0IGFuZCBsYXN0IHJvd3MgdGhhdCBzaG91bGQgYmUgaGlnaGxpZ2h0ZWQuXG4gICAgc3RhcnRfcm93ID0gTWF0aC5tYXgoMCwgc3RhcnRfcm93IC0gdGhpcy5fcm93X3BhZGRpbmcpO1xuICAgIGVuZF9yb3cgPSBNYXRoLm1pbih0aGlzLl9tb2RlbC5fcm93cy5sZW5ndGggLSAxLCBlbmRfcm93ICsgdGhpcy5fcm93X3BhZGRpbmcpO1xuXG4gICAgLy8gQ2xlYXIgdGhlIG9sZCBoaWdobGlnaHRpbmcuXG4gICAgdGhpcy5fbW9kZWwuY2xlYXJfdGFncyhzdGFydF9yb3csIGVuZF9yb3cpO1xuICAgIFxuICAgIC8vIEdldCB0aGUgdGV4dCBvZiB0aGUgcm93cy5cbiAgICB2YXIgdGV4dCA9IHRoaXMuX21vZGVsLmdldF90ZXh0KHN0YXJ0X3JvdywgMCwgZW5kX3JvdywgdGhpcy5fbW9kZWwuX3Jvd3NbZW5kX3Jvd10ubGVuZ3RoKTtcblxuICAgIC8vIEZpZ3VyZSBvdXQgd2hlcmUgZWFjaCBncm91cCBiZWxvbmdzLlxuICAgIHZhciBoaWdobGlnaHRzID0gW107IC8vIFtzdGFydF9pbmRleCwgZW5kX2luZGV4LCBncm91cF1cbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgZm9yICh2YXIgZ3JvdXBfbmFtZSBpbiB0aGlzLl90b3BsZXZlbF9ncm91cHMpIHtcbiAgICAgICAgaWYgKHRoaXMuX3RvcGxldmVsX2dyb3Vwcy5oYXNPd25Qcm9wZXJ0eShncm91cF9uYW1lKSkge1xuICAgICAgICAgICAgdmFyIGdyb3VwID0gdGhpcy5fdG9wbGV2ZWxfZ3JvdXBzW2dyb3VwX25hbWVdO1xuICAgICAgICAgICAgZm9yICh2YXIgaT0wOyBpPGdyb3VwLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaGlnaGxpZ2h0cyA9IGhpZ2hsaWdodHMuY29uY2F0KHRoYXQuX2ZpbmRfaGlnaGxpZ2h0cyh0ZXh0LCBncm91cF9uYW1lLCBncm91cFtpXSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gQXBwbHkgdGFnc1xuICAgIGhpZ2hsaWdodHMuZm9yRWFjaChmdW5jdGlvbihoaWdobGlnaHQpIHtcblxuICAgICAgICAvLyBUcmFuc2xhdGUgZ3JvdXAgY2hhcmFjdGVyIGluZGljaWVzIHRvIHJvdywgY2hhciBjb29yZGluYXRlcy5cbiAgICAgICAgdmFyIGJlZm9yZV9yb3dzID0gdGV4dC5zdWJzdHJpbmcoMCwgaGlnaGxpZ2h0WzBdKS5zcGxpdCgnXFxuJyk7XG4gICAgICAgIHZhciBncm91cF9zdGFydF9yb3cgPSBzdGFydF9yb3cgKyBiZWZvcmVfcm93cy5sZW5ndGggLSAxO1xuICAgICAgICB2YXIgZ3JvdXBfc3RhcnRfY2hhciA9IGJlZm9yZV9yb3dzW2JlZm9yZV9yb3dzLmxlbmd0aCAtIDFdLmxlbmd0aDtcbiAgICAgICAgdmFyIGFmdGVyX3Jvd3MgPSB0ZXh0LnN1YnN0cmluZygwLCBoaWdobGlnaHRbMV0gLSAxKS5zcGxpdCgnXFxuJyk7XG4gICAgICAgIHZhciBncm91cF9lbmRfcm93ID0gc3RhcnRfcm93ICsgYWZ0ZXJfcm93cy5sZW5ndGggLSAxO1xuICAgICAgICB2YXIgZ3JvdXBfZW5kX2NoYXIgPSBhZnRlcl9yb3dzW2FmdGVyX3Jvd3MubGVuZ3RoIC0gMV0ubGVuZ3RoO1xuXG4gICAgICAgIC8vIEdldCBhcHBsaWNhYmxlIHRhZyBuYW1lLlxuICAgICAgICB2YXIgdGFnID0gaGlnaGxpZ2h0WzJdO1xuICAgICAgICB3aGlsZSAodGhhdC5fdGFnc1t0YWddIT09dW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0YWcgPSB0aGF0Ll90YWdzW3RhZ107XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBcHBseSB0YWcuXG4gICAgICAgIHRoYXQuX21vZGVsLnNldF90YWcoZ3JvdXBfc3RhcnRfcm93LCBncm91cF9zdGFydF9jaGFyLCBncm91cF9lbmRfcm93LCBncm91cF9lbmRfY2hhciwgJ3N5bnRheCcsIHRhZy50b0xvd2VyQ2FzZSgpKTtcbiAgICB9KTtcbn07XG5cbi8qKlxuICogRmluZCBlYWNoIHBhcnQgb2YgdGV4dCB0aGF0IG5lZWRzIHRvIGJlIGhpZ2hsaWdodGVkLlxuICogQHBhcmFtICB7c3RyaW5nfSB0ZXh0XG4gKiBAcGFyYW0gIHtncm91cCBkaWN0aW9uYXJ5fSBncm91cCAtIGdyb3VwIHRvIGxvb2sgZm9yIGluIHRoZSB0ZXh0LlxuICogQHBhcmFtICB7Ym9vbGVhbn0gYXRfc3RhcnQgLSB3aGV0aGVyIG9yIG5vdCB0byBvbmx5IGNoZWNrIHRoZSBzdGFydC5cbiAqIEByZXR1cm4ge2FycmF5fSBsaXN0IGNvbnRhaW5pbmcgaXRlbXMgb2YgdGhlIGZvcm0gW3N0YXJ0X2luZGV4LCBlbmRfaW5kZXgsIGdyb3VwXVxuICovXG5TeW50YXhIaWdobGlnaHRlci5wcm90b3R5cGUuX2ZpbmRfaGlnaGxpZ2h0cyA9IGZ1bmN0aW9uKHRleHQsIGdyb3VwX25hbWUsIGdyb3VwLCBhdF9zdGFydCkge1xuXG4gICAgLy8gRmluZCBpbnN0YW5jZXMuIFtzdGFydF9pbmRleCwgZW5kX2luZGV4LCBncm91cCwgKCYgb3B0aW9uYWxseSkgaW5uZXJfbGVmdCwgaW5uZXJfcmlnaHRdXG4gICAgZm91bmRfZ3JvdXBzID0gW107XG4gICAgc3dpdGNoIChncm91cC50eXBlKSB7XG4gICAgICAgIGNhc2UgJ2tleXdvcmQnOlxuICAgICAgICAgICAgZ3JvdXAua2V5d29yZHMuZm9yRWFjaChmdW5jdGlvbihrZXl3b3JkKSB7XG4gICAgICAgICAgICAgICAgdmFyIGluZGV4O1xuICAgICAgICAgICAgICAgIHdoaWxlICh0ZXh0LmluZGV4T2Yoa2V5d29yZCwgaW5kZXgpICE9IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIGluZGV4ID0gdGV4dC5pbmRleE9mKGtleXdvcmQsIGluZGV4KTtcbiAgICAgICAgICAgICAgICAgICAgZm91bmRfZ3JvdXBzLnB1c2goW2luZGV4LCBpbmRleCArIGtleXdvcmQubGVuZ3RoLCBncm91cF9uYW1lXSk7XG4gICAgICAgICAgICAgICAgICAgIGluZGV4Kys7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnbWF0Y2gnOlxuICAgICAgICAgICAgdXRpbHMuZmluZGFsbCh0ZXh0LCBncm91cC5yZWdleC5yZWdleCkuZm9yRWFjaChmdW5jdGlvbihmb3VuZCkge1xuICAgICAgICAgICAgICAgIGZvdW5kX2dyb3Vwcy5wdXNoKFtmb3VuZFswXSwgZm91bmRbMV0gKyBncm91cC5yZWdleC5kZWx0YSwgZ3JvdXBfbmFtZV0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAncmVnaW9uJzpcbiAgICAgICAgICAgIHZhciBzdGFydHMgPSB1dGlscy5maW5kYWxsKHRleHQsIGdyb3VwLnN0YXJ0LnJlZ2V4KTtcbiAgICAgICAgICAgIHZhciBza2lwcyA9IFtdO1xuICAgICAgICAgICAgaWYgKGdyb3VwLnNraXApIHtcbiAgICAgICAgICAgICAgICBza2lwcyA9IHV0aWxzLmZpbmRhbGwodGV4dCwgZ3JvdXAuc2tpcC5yZWdleCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgZW5kcyA9IHV0aWxzLmZpbmRhbGwodGV4dCwgZ3JvdXAuZW5kLnJlZ2V4KTtcblxuICAgICAgICAgICAgLy8gUmVtb3ZlIGVuZHMgdGhhdCBjb250YWN0IHNraXBzLlxuICAgICAgICAgICAgZW5kcyA9IGVuZHMuZmlsdGVyKGZ1bmN0aW9uKGVuZCkge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2tpcHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNraXAgPSBza2lwc1tpXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEoZW5kWzBdID49IHNraXBbMV0gKyBncm91cC5za2lwLmRlbHRhIHx8IGVuZFsxXSA8IHNraXBbMF0pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRmluZCBtYXRjaGluZyBlbmRzIGZvciB0aGUgc3RhcnRzLCBiYWNrd2FyZHMuICBUaGlzIGFsbG93cyBuZXN0aW5nIFxuICAgICAgICAgICAgLy8gdG8gd29yayBwcm9wZXJseS5cbiAgICAgICAgICAgIHN0YXJ0cy5yZXZlcnNlKCk7XG4gICAgICAgICAgICBzdGFydHMuZm9yRWFjaChmdW5jdGlvbihzdGFydCkge1xuICAgICAgICAgICAgICAgIHZhciBmb3VuZCA9IG51bGw7XG4gICAgICAgICAgICAgICAgdmFyIGVuZDtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGVuZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgZW5kID0gZW5kc1tpXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVuZFswXSA+IHN0YXJ0WzFdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3VuZCA9IGk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChmb3VuZCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBlbmQgPSBlbmRzLnNwbGljZShmb3VuZCwgMSlbMF07XG4gICAgICAgICAgICAgICAgICAgIGZvdW5kX2dyb3Vwcy5wdXNoKFtzdGFydFswXSArIGdyb3VwLnN0YXJ0LmRlbHRhLCBlbmRbMV0sIGdyb3VwX25hbWUsIHN0YXJ0WzFdLCBlbmRbMF0gKyBncm91cC5lbmQuZGVsdGFdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gVW4tcmV2ZXJzZSByZXN1bHRzLlxuICAgICAgICAgICAgZm91bmRfZ3JvdXBzLnJldmVyc2UoKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIC8vIElmIGF0IHN0YXJ0IGlzIHNwZWNpZmllZCwgb25seSBtYXRjaCBpZiB0aGUgaW5kZXggaXMgMC5cbiAgICBpZiAoYXRfc3RhcnQpIHtcbiAgICAgICAgZm91bmRfZ3JvdXBzID0gZm91bmRfZ3JvdXBzLmZpbHRlcihmdW5jdGlvbihmb3VuZF9ncm91cCkge1xuICAgICAgICAgICAgcmV0dXJuIGZvdW5kX2dyb3VwWzBdID09PSAwO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBGaW5kIG5leHRzIGlmIHJlcXVlc3RlZC4gIE1ha2Ugc3VyZSB0byByZW1vdmUgc3BhY2UgaWYgc2tpcHNwYWNlIGlzIHByb3ZpZGVkLlxuICAgIC8vIFRPRE8uXG4gICAgXG4gICAgLy8gRmluZCBjb250YWluZWQgaWYgcmVxdWVzdGVkLlxuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB2YXIgc3ViX2ZvdW5kID0gW107XG4gICAgaWYgKGdyb3VwLmNvbnRhaW5zICYmIGdyb3VwLmNvbnRhaW5zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgZm91bmRfZ3JvdXBzLmZvckVhY2goZnVuY3Rpb24oZm91bmRfZ3JvdXApIHtcbiAgICAgICAgICAgIHZhciBsZWZ0ID0gZm91bmRfZ3JvdXBbMF07XG4gICAgICAgICAgICB2YXIgcmlnaHQgPSBmb3VuZF9ncm91cFsxXTtcbiAgICAgICAgICAgIGlmIChncm91cC50eXBlPT0ncmVnaW9uJykge1xuICAgICAgICAgICAgICAgIGxlZnQgPSBmb3VuZF9ncm91cFszXTtcbiAgICAgICAgICAgICAgICByaWdodCA9IGZvdW5kX2dyb3VwWzRdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3VidGV4dCA9IHRleHQuc3Vic3RyaW5nKGxlZnQsIHJpZ2h0KTtcbiAgICAgICAgICAgIGdyb3VwLmNvbnRhaW5zLmZvckVhY2goZnVuY3Rpb24oY29udGFpbikge1xuICAgICAgICAgICAgICAgIHZhciBzdWJfZ3JvdXAgPSB0aGF0Ll9ncm91cHNbY29udGFpbl07XG4gICAgICAgICAgICAgICAgaWYgKHN1Yl9ncm91cCkge1xuICAgICAgICAgICAgICAgICAgICBzdWJfZ3JvdXAuZm9yRWFjaChmdW5jdGlvbihzdWJfZ3JvdXBfY2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuX2ZpbmRfaGlnaGxpZ2h0cyhzdWJ0ZXh0LCBjb250YWluLCBzdWJfZ3JvdXBfY2hpbGQpLmZvckVhY2goZnVuY3Rpb24oZm91bmQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWJfZm91bmQucHVzaChbZm91bmRbMF0gKyBsZWZ0LCBmb3VuZFsxXSArIGxlZnQsIGZvdW5kWzJdXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gZm91bmRfZ3JvdXBzLmNvbmNhdChzdWJfZm91bmQpO1xufTtcblxuLyoqXG4gKiBMb2FkcyBhIHN5bnRheCBieSBsYW5ndWFnZSBuYW1lLlxuICogQHBhcmFtICB7c3RyaW5nIG9yIGRpY3Rpb25hcnl9IGxhbmd1YWdlXG4gKiBAcmV0dXJuIHtib29sZWFufSBzdWNjZXNzXG4gKi9cblN5bnRheEhpZ2hsaWdodGVyLnByb3RvdHlwZS5sb2FkID0gZnVuY3Rpb24obGFuZ3VhZ2UpIHtcbiAgICB0cnkge1xuXG4gICAgICAgIC8vIFVubG9hZCBjdXJyZW50IGxhbmd1YWdlXG4gICAgICAgIHRoaXMuX2dyb3VwcyA9IHt9O1xuICAgICAgICB0aGlzLl90b3BsZXZlbF9ncm91cHMgPSB7fTsgXG4gICAgICAgIHRoaXMuX3RhZ3MgPSB7fTtcblxuICAgICAgICAvLyBTZWUgaWYgdGhlIGxhbmd1YWdlIGlzIGJ1aWx0LWluXG4gICAgICAgIGlmIChsYW5ndWFnZXMubGFuZ3VhZ2VzW2xhbmd1YWdlXSkge1xuICAgICAgICAgICAgbGFuZ3VhZ2UgPSBsYW5ndWFnZXMubGFuZ3VhZ2VzW2xhbmd1YWdlXS5sYW5ndWFnZTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9ncm91cHMgPSBsYW5ndWFnZS5ncm91cHM7XG4gICAgICAgIHRoaXMuX3RhZ3MgPSBsYW5ndWFnZS50YWdzO1xuXG4gICAgICAgIC8vIEZpbmQgYWxsIGdyb3VwcyB3aGVyZSBjb250YWluZWQgPT0gZmFsc2VcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICBmb3IgKHZhciBncm91cF9uYW1lIGluIHRoaXMuX2dyb3Vwcykge1xuICAgICAgICAgICAgaWYgKHRoaXMuX2dyb3Vwcy5oYXNPd25Qcm9wZXJ0eShncm91cF9uYW1lKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2dyb3Vwc1tncm91cF9uYW1lXS5mb3JFYWNoKGZ1bmN0aW9uKGdyb3VwKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghZ3JvdXAuY29udGFpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhhdC5fdG9wbGV2ZWxfZ3JvdXBzW2dyb3VwX25hbWVdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0Ll90b3BsZXZlbF9ncm91cHNbZ3JvdXBfbmFtZV0gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuX3RvcGxldmVsX2dyb3Vwc1tncm91cF9uYW1lXS5wdXNoKGdyb3VwKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBsb2FkaW5nIGxhbmd1YWdlJywgZSk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLlN5bnRheEhpZ2hsaWdodGVyID0gU3ludGF4SGlnaGxpZ2h0ZXI7XG4iLCJleHBvcnRzLmxhbmd1YWdlcyA9IHtcbiAgICBcInZiXCI6IHJlcXVpcmUoXCIuL3ZiLmpzXCIpLFxuICAgIFwiamF2YXNjcmlwdFwiOiByZXF1aXJlKFwiLi9qYXZhc2NyaXB0LmpzXCIpLFxufTtcbiIsIi8qXG5TeW50YXggZmlsZSBhdXRvZ2VuZXJhdGVkIGZyb20gVklNJ3MgXCJqYXZhc2NyaXB0LnZpbVwiIGZpbGUuXG5Vc2UgcG9zdGVyL3Rvb2xzL2ltcG9ydF92aW0ucHkgdG8gaW1wb3J0IG1vcmUgc3ludGF4IGZpbGVzIGZyb20gVklNLlxuKi9cbmV4cG9ydHMubGFuZ3VhZ2UgPSB7XG4gICAgXCJncm91cHNcIjoge1xuICAgICAgICBcImphdmFTY3JpcHRTdHJpbmdTXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcInN0YXJ0XCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJyZWdleFwiOiBcIidcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVsdGFcIjogMFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbnNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcImphdmFTY3JpcHRTcGVjaWFsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkBodG1sUHJlcHJvY1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJlbmRcIjoge1xuICAgICAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IFwiJ1xcXFx8JFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkZWx0YVwiOiAwXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwicmVnaW9uXCIsIFxuICAgICAgICAgICAgICAgIFwic2tpcFwiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwicmVnZXhcIjogXCJcXFxcXFxcXFxcXFxcXFxcXFxcXHxcXFxcXFxcXCdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVsdGFcIjogMFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgXSwgXG4gICAgICAgIFwiamF2YVNjcmlwdFNwZWNpYWxDaGFyYWN0ZXJcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwicmVnZXhcIjoge1xuICAgICAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IFwiJ1xcXFxcXFxcLidcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVsdGFcIjogMFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGwsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5zXCI6IFtdLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJtYXRjaFwiXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sIFxuICAgICAgICBcImphdmFTY3JpcHRUeXBlXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJBcnJheVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJCb29sZWFuXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRhdGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRnVuY3Rpb25cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTnVtYmVyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk9iamVjdFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTdHJpbmdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUmVnRXhwXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0Qm9vbGVhblwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidHJ1ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJmYWxzZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSwgXG4gICAgICAgIFwiamF2YVNjcmlwdFJlZ2V4cFN0cmluZ1wiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJzdGFydFwiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwicmVnZXhcIjogXCIvW14vKl1cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVsdGFcIjogLTFcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5zXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJAaHRtbFByZXByb2NcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwiZW5kXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJyZWdleFwiOiBcIi9bZ2ltXVxcXFx7MCwyXFxcXH1cXFxccypbOy4sKVxcXFxdfV1cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVsdGFcIjogLTFcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJyZWdpb25cIiwgXG4gICAgICAgICAgICAgICAgXCJza2lwXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJyZWdleFwiOiBcIlxcXFxcXFxcXFxcXFxcXFxcXFxcfFxcXFxcXFxcL1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkZWx0YVwiOiAwXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0Q29tbWVudFNraXBcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwicmVnZXhcIjoge1xuICAgICAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IFwiXlsgXFxcXHRdKlxcXFwqXFxcXCgkXFxcXHxbIFxcXFx0XVxcXFwrXFxcXClcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVsdGFcIjogMFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGwsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5zXCI6IFtdLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJtYXRjaFwiXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sIFxuICAgICAgICBcImphdmFTY3JpcHRTcGVjaWFsXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJyZWdleFwiOiBcIlxcXFxcXFxcXFxcXGRcXFxcZFxcXFxkXFxcXHxcXFxcXFxcXC5cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVsdGFcIjogMFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGwsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5zXCI6IFtdLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJtYXRjaFwiXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sIFxuICAgICAgICBcImphdmFTY3JpcHRTdHJpbmdEXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcInN0YXJ0XCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJyZWdleFwiOiBcIlxcXCJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVsdGFcIjogMFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbnNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcImphdmFTY3JpcHRTcGVjaWFsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkBodG1sUHJlcHJvY1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJlbmRcIjoge1xuICAgICAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IFwiXFxcIlxcXFx8JFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkZWx0YVwiOiAwXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwicmVnaW9uXCIsIFxuICAgICAgICAgICAgICAgIFwic2tpcFwiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwicmVnZXhcIjogXCJcXFxcXFxcXFxcXFxcXFxcXFxcXHxcXFxcXFxcXFxcXCJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVsdGFcIjogMFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgXSwgXG4gICAgICAgIFwiamF2YVNjcmlwdENvbmRpdGlvbmFsXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJpZlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJlbHNlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInN3aXRjaFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSwgXG4gICAgICAgIFwiamF2YVNjcmlwdElkZW50aWZpZXJcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcImFyZ3VtZW50c1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ0aGlzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZhclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJsZXRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sIFxuICAgICAgICBcImphdmFTY3JpcHRMYWJlbFwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiY2FzZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkZWZhdWx0XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0TGluZUNvbW1lbnRcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwicmVnZXhcIjoge1xuICAgICAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IFwiLy8uKlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkZWx0YVwiOiAwXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbCwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbnNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkBTcGVsbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJqYXZhU2NyaXB0Q29tbWVudFRvZG9cIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcIm1hdGNoXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSwgXG4gICAgICAgIFwiamF2YVNjcmlwdFJlcGVhdFwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwid2hpbGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZm9yXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRvXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImluXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0QnJhY2VzXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJyZWdleFwiOiBcIlt7fVxcXFxbXFxcXF1dXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRlbHRhXCI6IDBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluc1wiOiBbXSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwibWF0Y2hcIlxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0T3BlcmF0b3JcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIm5ld1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkZWxldGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiaW5zdGFuY2VvZlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ0eXBlb2ZcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sIFxuICAgICAgICBcImphdmFTY3JpcHRHbG9iYWxcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInNlbGZcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwid2luZG93XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInRvcFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJwYXJlbnRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sIFxuICAgICAgICBcImphdmFTY3JpcHRCcmFuY2hcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcImJyZWFrXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImNvbnRpbnVlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0Q29tbWVudFwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJzdGFydFwiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwicmVnZXhcIjogXCIvXFxcXCpcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVsdGFcIjogMFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbnNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkBTcGVsbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJqYXZhU2NyaXB0Q29tbWVudFRvZG9cIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwiZW5kXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJyZWdleFwiOiBcIlxcXFwqL1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkZWx0YVwiOiAwXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwicmVnaW9uXCIsIFxuICAgICAgICAgICAgICAgIFwic2tpcFwiOiBudWxsXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sIFxuICAgICAgICBcImphdmFTY3JpcHRFeGNlcHRpb25cIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInRyeVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJjYXRjaFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJmaW5hbGx5XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInRocm93XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0TnVsbFwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwibnVsbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ1bmRlZmluZWRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sIFxuICAgICAgICBcImphdmFTY3JpcHRNZW1iZXJcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcImRvY3VtZW50XCIsIFxuICAgICAgICAgICAgICAgICAgICBcImV2ZW50XCIsIFxuICAgICAgICAgICAgICAgICAgICBcImxvY2F0aW9uXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0Q29tbWVudFRvZG9cIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlRPRE9cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRklYTUVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiWFhYXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlRCRFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IHRydWUsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0RnVuY3Rpb25cIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwicmVnZXhcIjoge1xuICAgICAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IFwiXFxcXDxmdW5jdGlvblxcXFw+XCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRlbHRhXCI6IDBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluc1wiOiBbXSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwibWF0Y2hcIlxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiZnVuY3Rpb25cIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sIFxuICAgICAgICBcImphdmFTY3JpcHRGdW5jdGlvbkZvbGRcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwic3RhcnRcIjoge1xuICAgICAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IFwiXFxcXDxmdW5jdGlvblxcXFw+LipbXn07XSRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVsdGFcIjogMFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbnNcIjogW10sIFxuICAgICAgICAgICAgICAgIFwiZW5kXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJyZWdleFwiOiBcIl5cXFxcejF9LiokXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRlbHRhXCI6IDBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJyZWdpb25cIiwgXG4gICAgICAgICAgICAgICAgXCJza2lwXCI6IG51bGxcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSwgXG4gICAgICAgIFwiamF2YVNjcmlwdFN0YXRlbWVudFwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwicmV0dXJuXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIndpdGhcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sIFxuICAgICAgICBcImphdmFTY3JpcHRQYXJlbnNcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwicmVnZXhcIjoge1xuICAgICAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IFwiWygpXVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkZWx0YVwiOiAwXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbCwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbnNcIjogW10sIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcIm1hdGNoXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSwgXG4gICAgICAgIFwiamF2YVNjcmlwdE1lc3NhZ2VcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcImFsZXJ0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcImNvbmZpcm1cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwicHJvbXB0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInN0YXR1c1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSwgXG4gICAgICAgIFwiamF2YVNjcmlwdFJlc2VydmVkXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJhYnN0cmFjdFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJib29sZWFuXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImJ5dGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiY2hhclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJjbGFzc1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJjb25zdFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkZWJ1Z2dlclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkb3VibGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZW51bVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJleHBvcnRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZXh0ZW5kc1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJmaW5hbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJmbG9hdFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJnb3RvXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImltcGxlbWVudHNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiaW1wb3J0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcImludFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJpbnRlcmZhY2VcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwibG9uZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJuYXRpdmVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwicGFja2FnZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJwcml2YXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInByb3RlY3RlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJwdWJsaWNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwic2hvcnRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwic3RhdGljXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInN1cGVyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInN5bmNocm9uaXplZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ0aHJvd3NcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidHJhbnNpZW50XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZvbGF0aWxlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0TnVtYmVyXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJyZWdleFwiOiBcIi1cXFxcPVxcXFw8XFxcXGRcXFxcK0xcXFxcPVxcXFw+XFxcXHwwW3hYXVswLTlhLWZBLUZdXFxcXCtcXFxcPlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkZWx0YVwiOiAwXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbCwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbnNcIjogW10sIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcIm1hdGNoXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSwgXG4gICAgICAgIFwiamF2YVNjcmlwdERlcHJlY2F0ZWRcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcImVzY2FwZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ1bmVzY2FwZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgIH0sIFxuICAgIFwidGFnc1wiOiB7XG4gICAgICAgIFwiamF2YVNjclBhcmVuRXJyb3JcIjogXCJqYXZhU2NyaXB0RXJyb3JcIiwgXG4gICAgICAgIFwiamF2YVNjcmlwdFN0cmluZ1NcIjogXCJTdHJpbmdcIiwgXG4gICAgICAgIFwiamF2YVNjcmlwdENvbmRpdGlvbmFsXCI6IFwiQ29uZGl0aW9uYWxcIiwgXG4gICAgICAgIFwiamF2YVNjcmlwdFR5cGVcIjogXCJUeXBlXCIsIFxuICAgICAgICBcImphdmFTY3JpcHRCb29sZWFuXCI6IFwiQm9vbGVhblwiLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0UmVnZXhwU3RyaW5nXCI6IFwiU3RyaW5nXCIsIFxuICAgICAgICBcImphdmFTY3JpcHROdWxsXCI6IFwiS2V5d29yZFwiLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0U3BlY2lhbFwiOiBcIlNwZWNpYWxcIiwgXG4gICAgICAgIFwiamF2YVNjcmlwdFN0cmluZ0RcIjogXCJTdHJpbmdcIiwgXG4gICAgICAgIFwiamF2YVNjcmlwdEVycm9yXCI6IFwiRXJyb3JcIiwgXG4gICAgICAgIFwiamF2YVNjcmlwdElkZW50aWZpZXJcIjogXCJJZGVudGlmaWVyXCIsIFxuICAgICAgICBcImphdmFTY3JpcHRTcGVjaWFsQ2hhcmFjdGVyXCI6IFwiamF2YVNjcmlwdFNwZWNpYWxcIiwgXG4gICAgICAgIFwiamF2YVNjcmlwdExhYmVsXCI6IFwiTGFiZWxcIiwgXG4gICAgICAgIFwiamF2YVNjcmlwdExpbmVDb21tZW50XCI6IFwiQ29tbWVudFwiLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0UmVwZWF0XCI6IFwiUmVwZWF0XCIsIFxuICAgICAgICBcImphdmFTY3JpcHRCcmFjZXNcIjogXCJGdW5jdGlvblwiLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0T3BlcmF0b3JcIjogXCJPcGVyYXRvclwiLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0R2xvYmFsXCI6IFwiS2V5d29yZFwiLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0QnJhbmNoXCI6IFwiQ29uZGl0aW9uYWxcIiwgXG4gICAgICAgIFwiamF2YVNjcmlwdENvbW1lbnRcIjogXCJDb21tZW50XCIsIFxuICAgICAgICBcImphdmFTY3JpcHRDaGFyYWN0ZXJcIjogXCJDaGFyYWN0ZXJcIiwgXG4gICAgICAgIFwiamF2YVNjcmlwdEV4Y2VwdGlvblwiOiBcIkV4Y2VwdGlvblwiLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0TWVtYmVyXCI6IFwiS2V5d29yZFwiLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0Q29tbWVudFRvZG9cIjogXCJUb2RvXCIsIFxuICAgICAgICBcImphdmFTY3JpcHRDb25zdGFudFwiOiBcIkxhYmVsXCIsIFxuICAgICAgICBcImphdmFTY3JpcHREZWJ1Z1wiOiBcIkRlYnVnXCIsIFxuICAgICAgICBcImphdmFTY3JpcHRGdW5jdGlvblwiOiBcIkZ1bmN0aW9uXCIsIFxuICAgICAgICBcImphdmFTY3JpcHRTdGF0ZW1lbnRcIjogXCJTdGF0ZW1lbnRcIiwgXG4gICAgICAgIFwiamF2YVNjcmlwdE1lc3NhZ2VcIjogXCJLZXl3b3JkXCIsIFxuICAgICAgICBcImphdmFTY3JpcHRSZXNlcnZlZFwiOiBcIktleXdvcmRcIiwgXG4gICAgICAgIFwiamF2YVNjcmlwdE51bWJlclwiOiBcImphdmFTY3JpcHRWYWx1ZVwiLCBcbiAgICAgICAgXCJqYXZhU2NyaXB0RGVwcmVjYXRlZFwiOiBcIkV4Y2VwdGlvblwiXG4gICAgfVxufTsiLCIvKlxuU3ludGF4IGZpbGUgYXV0b2dlbmVyYXRlZCBmcm9tIFZJTSdzIFwidmIudmltXCIgZmlsZS5cblVzZSBwb3N0ZXIvdG9vbHMvaW1wb3J0X3ZpbS5weSB0byBpbXBvcnQgbW9yZSBzeW50YXggZmlsZXMgZnJvbSBWSU0uXG4qL1xuZXhwb3J0cyA9IHtcbiAgICBcImdyb3Vwc1wiOiB7XG4gICAgICAgIFwidmJGdW5jdGlvblwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQWJzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkFycmF5XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkFzY1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJBc2NCXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkFzY1dcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQXRuXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkF2Z1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJCT0ZcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ0Jvb2xcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ0J5dGVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJDQ3VyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNEYXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNEYmxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ0ludFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDTG5nXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNTbmdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ1N0clwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDVkRhdGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ1ZFcnJcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJDVmFyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNhbGxCeU5hbWVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ2RlY1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDaG9vc2VcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ2hyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNockJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ2hyV1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDb21tYW5kXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQ29zXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNvdW50XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNyZWF0ZU9iamVjdFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDdXJEaXJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRERCXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRhdGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRGF0ZUFkZFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkRhdGVEaWZmXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRhdGVQYXJ0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRhdGVTZXJpYWxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRGF0ZVZhbHVlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRheVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEaXJcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJEb0V2ZW50c1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJFT0ZcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRW52aXJvblwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJFcnJvclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJFeHBcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRlZcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRmlsZUF0dHJcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJGaWxlRGF0ZVRpbWVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRmlsZUxlblwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJGaWx0ZXJGaXhcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRml4XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkZvcm1hdFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkZvcm1hdEN1cnJlbmN5XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkZvcm1hdERhdGVUaW1lXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkZvcm1hdE51bWJlclwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkZvcm1hdFBlcmNlbnRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRnJlZUZpbGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiR2V0QWxsU3RyaW5nc1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJHZXRBdHRyXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiR2V0QXV0b1NlcnZlclNldHRpbmdzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkdldE9iamVjdFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJHZXRTZXR0aW5nXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkhleFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkhvdXJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiSUlmXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIklNRVN0YXR1c1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJJUG10XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkluU3RyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIklucHV0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIklucHV0QlwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIklucHV0Qm94XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkluc3RyQlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJJbnRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiSXNBcnJheVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJJc0RhdGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiSXNFbXB0eVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJJc0Vycm9yXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiSXNNaXNzaW5nXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIklzTnVsbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJJc051bWVyaWNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiSXNPYmplY3RcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiSm9pblwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJMQm91bmRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJMQ2FzZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJMT0ZcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTFRyaW1cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTGVmdFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJMZWZ0QlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJMZW5cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTGVuQlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJMb2FkUGljdHVyZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkxvYWRSZXNEYXRhXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkxvYWRSZXNQaWN0dXJlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkxvYWRSZXNTdHJpbmdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTG9jXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkxvZ1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIk1JUlJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTWF4XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk1pZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJNaWRCXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk1pblwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJNaW51dGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTW9udGhcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTW9udGhOYW1lXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiTXNnQm94XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk5QVlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJOUGVyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk5vd1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJPY3RcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUFBtdFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJQVlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJQYXJ0aXRpb25cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUG10XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiUUJDb2xvclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSR0JcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUlRyaW1cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUmF0ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSZXBsYWNlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJpZ2h0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJpZ2h0QlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSbmRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJSb3VuZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTTE5cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU1lEXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNlY29uZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTZWVrXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNnblwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTaGVsbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTaW5cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU3BhY2VcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU3BjXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiU3BsaXRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU3FyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlN0RGV2XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlN0RGV2UFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTdHJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU3RyQ29tcFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTdHJDb252XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiU3RyUmV2ZXJzZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTdHJpbmdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU3VtXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlN3aXRjaFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJUYWJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiVGFuXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlRpbWVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJUaW1lU2VyaWFsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlRpbWVWYWx1ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJUaW1lclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJUcmltXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlR5cGVOYW1lXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlVCb3VuZFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlVDYXNlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlZhbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJWYXJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiVmFyUFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJWYXJUeXBlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIldlZWtkYXlcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiV2Vla2RheU5hbWVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJZZWFyXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJ2Yk51bWJlclwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJyZWdleFwiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwicmVnZXhcIjogXCJcXFxcPFxcXFxkXFxcXCtcXFxcPlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkZWx0YVwiOiAwXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbCwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbnNcIjogW10sIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcIm1hdGNoXCJcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwicmVnZXhcIjoge1xuICAgICAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IFwiXFxcXDxcXFxcZFxcXFwrXFxcXC5cXFxcZCpcXFxcPlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkZWx0YVwiOiAwXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbCwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbnNcIjogW10sIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcIm1hdGNoXCJcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwicmVnZXhcIjoge1xuICAgICAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IFwiXFxcXC5cXFxcZFxcXFwrXFxcXD5cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVsdGFcIjogMFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGwsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5zXCI6IFtdLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJtYXRjaFwiXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sIFxuICAgICAgICBcInZiU3RyaW5nXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcInN0YXJ0XCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJyZWdleFwiOiBcIlxcXCJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVsdGFcIjogMFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbnNcIjogW10sIFxuICAgICAgICAgICAgICAgIFwiZW5kXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJyZWdleFwiOiBcIlxcXCJcXFxcfCRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVsdGFcIjogMFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcInJlZ2lvblwiLCBcbiAgICAgICAgICAgICAgICBcInNraXBcIjogbnVsbFxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJ2YkNvbnN0XCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJOdWxsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk5vdGhpbmdcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sIFxuICAgICAgICBcInZiTGluZU51bWJlclwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJyZWdleFwiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwicmVnZXhcIjogXCJeXFxcXGRcXFxcK1xcXFwoXFxcXHNcXFxcfCRcXFxcKVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkZWx0YVwiOiAwXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbCwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbnNcIjogW10sIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcIm1hdGNoXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSwgXG4gICAgICAgIFwidmJLZXl3b3JkXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJBc1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJCaW5hcnlcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQnlSZWZcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQnlWYWxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRGF0ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJFbXB0eVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJFcnJvclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJGcmllbmRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiR2V0XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiSW5wdXRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiSXNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTGVuXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkxvY2tcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTWVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTWlkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk5ld1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJOb3RoaW5nXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk51bGxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiT25cIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJPcHRpb25cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiT3B0aW9uYWxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUGFyYW1BcnJheVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJQcmludFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJQcml2YXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlByb3BlcnR5XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiUHVibGljXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlB1YmxpY05vdENyZWF0ZWFibGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiT25OZXdQcm9jZXNzU2luZ2xlVXNlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiSW5TYW1lUHJvY2Vzc011bHRpVXNlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkdsb2JhbE11bHRpVXNlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJlc3VtZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTZWVrXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiU2V0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlN0YXRpY1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTdGVwXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlN0cmluZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJUaW1lXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIldpdGhFdmVudHNcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sIFxuICAgICAgICBcInZiRmxvYXRcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwicmVnZXhcIjoge1xuICAgICAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IFwiWy0rXVxcXFw9XFxcXDxcXFxcZFxcXFwrW2VFXVtcXFxcLStdXFxcXD1cXFxcZFxcXFwrXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRlbHRhXCI6IDBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluc1wiOiBbXSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwibWF0Y2hcIlxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJyZWdleFwiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwicmVnZXhcIjogXCJbLStdXFxcXD1cXFxcPFxcXFxkXFxcXCtcXFxcLlxcXFxkKlxcXFwoW2VFXVtcXFxcLStdXFxcXD1cXFxcZFxcXFwrXFxcXClcXFxcPVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkZWx0YVwiOiAwXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbCwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbnNcIjogW10sIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcIm1hdGNoXCJcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwicmVnZXhcIjoge1xuICAgICAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IFwiWy0rXVxcXFw9XFxcXDxcXFxcLlxcXFxkXFxcXCtcXFxcKFtlRV1bXFxcXC0rXVxcXFw9XFxcXGRcXFxcK1xcXFwpXFxcXD1cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVsdGFcIjogMFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGwsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5zXCI6IFtdLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJtYXRjaFwiXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sIFxuICAgICAgICBcInZiTWV0aG9kc1wiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQWJvdXRCb3hcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQWNjZXB0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkFjdGl2YXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkFkZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJBZGRDdXN0b21cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQWRkRmlsZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkFkZEZyb21GaWxlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkFkZEZyb21HdWlkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkFkZEZyb21TdHJpbmdcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJBZGRGcm9tVGVtcGxhdGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQWRkSXRlbVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJBZGROZXdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQWRkVG9BZGRJblRvb2xiYXJcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJBZGRUb29sYm94UHJvZ0lEXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkFwcGVuZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJBcHBlbmRBcHBlbmRDaHVua1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkFwcGVuZENodW5rXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkFycmFuZ2VcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQXNzZXJ0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkFzeW5jUmVhZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJCYXRjaFVwZGF0ZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkJlZ2luUXVlcnlFZGl0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkJlZ2luVHJhbnNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQmluZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJCdWlsZFBhdGhcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJDYW5Qcm9wZXJ0eUNoYW5nZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDYW5jZWxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ2FuY2VsQXN5bmNSZWFkXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQ2FuY2VsQmF0Y2hcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ2FuY2VsVXBkYXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNhcHR1cmVJbWFnZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDZWxsVGV4dFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkNlbGxWYWx1ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDaXJjbGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ2xlYXJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ2xlYXJGaWVsZHNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ2xlYXJTZWxcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJDbGVhclNlbENvbHNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ2xlYXJTdHJ1Y3R1cmVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ2xvbmVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ2xvc2VcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ2xzXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQ29sQ29udGFpbmluZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDb2xsYXBzZUFsbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDb2x1bW5TaXplXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNvbW1pdFRyYW5zXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQ29tcGFjdERhdGFiYXNlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNvbXBvc2VcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ29ubmVjdFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDb3B5XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNvcHlGaWxlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQ29weUZvbGRlclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDb3B5UXVlcnlEZWZcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ291bnRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ3JlYXRlRGF0YWJhc2VcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJDcmVhdGVEcmFnSW1hZ2VcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ3JlYXRlRW1iZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ3JlYXRlRmllbGRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJDcmVhdGVGb2xkZXJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ3JlYXRlR3JvdXBcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ3JlYXRlSW5kZXhcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ3JlYXRlTGlua1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkNyZWF0ZVByZXBhcmVkU3RhdGVtZW50XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNyZWF0ZVByb3BlcnlcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ3JlYXRlUXVlcnlcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJDcmVhdGVRdWVyeURlZlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDcmVhdGVSZWxhdGlvblwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDcmVhdGVUYWJsZURlZlwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkNyZWF0ZVRleHRGaWxlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNyZWF0ZVRvb2xXaW5kb3dcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ3JlYXRlVXNlclwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkNyZWF0ZVdvcmtzcGFjZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDdXN0b21pemVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ3V0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRlbGV0ZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkRlbGV0ZUNvbHVtbkxhYmVsc1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEZWxldGVDb2x1bW5zXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRlbGV0ZUZpbGVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJEZWxldGVGb2xkZXJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRGVsZXRlTGluZXNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRGVsZXRlUm93TGFiZWxzXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiRGVsZXRlUm93c1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEZXNlbGVjdEFsbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEZXNpZ25lcldpbmRvd1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEb1ZlcmJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRHJhZ1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkRyYXdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRHJpdmVFeGlzdHNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRWRpdFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJFZGl0Q29weVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJFZGl0UGFzdGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRW5kRG9jXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiRW5zdXJlVmlzaWJsZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJFc3RhYmxpc2hDb25uZWN0aW9uXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkV4ZWN1dGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRXhpc3RzXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiRXhwYW5kXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkV4cG9ydFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJFeHBvcnRSZXBvcnRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRXh0cmFjdEljb25cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRmV0Y2hcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJGZXRjaFZlcmJzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkZpbGVFeGlzdHNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRmlsZXNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRmlsbENhY2hlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkZpbmRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJGaW5kRmlyc3RcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRmluZEl0ZW1cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRmluZExhc3RcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRmluZE5leHRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRmluZFByZXZpb3VzXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiRm9sZGVyRXhpc3RzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkZvcndhcmRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiR2V0QWJzb2x1dGVQYXRoTmFtZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkdldEJhc2VOYW1lXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkdldEJvb2ttYXJrXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkdldENodW5rXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkdldENsaXBTdHJpbmdcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJHZXREYXRhXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkdldERyaXZlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkdldERyaXZlTmFtZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJHZXRGaWxlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkdldEZpbGVOYW1lXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiR2V0Rmlyc3RWaXNpYmxlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkdldEZvbGRlclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJHZXRGb3JtYXRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiR2V0SGVhZGVyXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiR2V0TGluZUZyb21DaGFyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkdldE51bVRpY2tzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkdldFBhcmVudEZvbGRlck5hbWVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJHZXRSb3dzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkdldFNlbGVjdGVkUGFydFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJHZXRTZWxlY3Rpb25cIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJHZXRTcGVjaWFsRm9sZGVyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkdldFRlbXBOYW1lXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkdldFRleHRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJHZXRWaXNpYmxlQ291bnRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiR29CYWNrXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkdvRm9yd2FyZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJIaWRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkhpdFRlc3RcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJIb2xkRmllbGRzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIklkbGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiSW1wb3J0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkluaXRpYWxpemVMYWJlbHNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiSW5zZXJ0XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiSW5zZXJ0Q29sdW1uTGFiZWxzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkluc2VydENvbHVtbnNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiSW5zZXJ0RmlsZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkluc2VydExpbmVzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkluc2VydE9iakRsZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJJbnNlcnRSb3dMYWJlbHNcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJJbnNlcnRSb3dzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkl0ZW1cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiS2V5c1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJLaWxsRG9jXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkxheW91dFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJMaW5lXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkxpbmVzXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiTGlua0V4ZWN1dGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTGlua1Bva2VcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTGlua1JlcXVlc3RcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTGlua1NlbmRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTGlzdGVuXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiTG9hZEZpbGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTG9hZFJlc0RhdGFcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTG9hZFJlc1BpY3R1cmVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTG9hZFJlc1N0cmluZ1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkxvZ0V2ZW50XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk1ha2VDb21waWxlRmlsZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJNYWtlQ29tcGlsZWRGaWxlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiTWFrZVJlcGxpY2FcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTW9yZVJlc3VsdHNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTW92ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJNb3ZlRGF0YVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJNb3ZlRmlsZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIk1vdmVGaXJzdFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJNb3ZlRm9sZGVyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk1vdmVMYXN0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk1vdmVOZXh0XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiTW92ZVByZXZpb3VzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk5hdmlnYXRlVG9cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTmV3UGFnZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJOZXdQYXNzd29yZFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIk5leHRSZWNvcmRzZXRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiT0xFRHJhZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJPbkFkZGluc1VwZGF0ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJPbkNvbm5lY3Rpb25cIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJPbkRpc2Nvbm5lY3Rpb25cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiT25TdGFydHVwQ29tcGxldGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiT3BlblwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIk9wZW5Bc1RleHRTdHJlYW1cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiT3BlbkNvbm5lY3Rpb25cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiT3BlbkRhdGFiYXNlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiT3BlblF1ZXJ5RGVmXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk9wZW5SZWNvcmRzZXRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiT3BlblJlc3VsdHNldFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJPcGVuVVJMXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiT3ZlcmxheVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJQU2V0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlBhaW50UGljdHVyZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJQYXN0U3BlY2lhbERsZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJQYXN0ZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlBlZWtEYXRhXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlBsYXlcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUG9pbnRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUG9wdWxhdGVQYXJ0aWFsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlBvcHVwTWVudVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlByaW50XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlByaW50Rm9ybVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJQcmludFJlcG9ydFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJQcm9wZXJ0eUNoYW5nZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUXVpdFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlJhaXNlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJhbmRvbURhdGFGaWxsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJhbmRvbUZpbGxDb2x1bW5zXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiUmFuZG9tRmlsbFJvd3NcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUmVGaWxsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJlYWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUmVhZEFsbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSZWFkRnJvbUZpbGVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJSZWFkTGluZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSZWFkUHJvcGVydHlcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUmViaW5kXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJlZnJlc2hcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUmVmcmVzaExpbmtcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJSZWdpc3RlckRhdGFiYXNlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJlbGVhc2VJbnN0YW5jZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSZWxvYWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUmVtb3ZlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiUmVtb3ZlQWRkSW5Gcm9tVG9vbGJhclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSZW1vdmVBbGxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUmVtb3ZlSXRlbVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSZW5kZXJcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJSZXBhaXJEYXRhYmFzZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSZXBsYWNlTGluZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSZXBseVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSZXBseUFsbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSZXF1ZXJ5XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiUmVzZXRDdXN0b21cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUmVzZXRDdXN0b21MYWJlbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSZXNvbHZlTmFtZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlJlc3RvcmVUb29sYmFyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJlc3luY1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSb2xsYmFja1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSb2xsYmFja1RyYW5zXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiUm93Qm9va21hcmtcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUm93Q29udGFpbmluZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSb3dUb3BcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2F2ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTYXZlQXNcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJTYXZlRmlsZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTYXZlVG9GaWxlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNhdmVUb09sZTFGaWxlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNhdmVUb29sYmFyXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiU2NhbGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2NhbGVYXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNjYWxlWVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTY3JvbGxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2VsUHJpbnRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2VsZWN0QWxsXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiU2VsZWN0UGFydFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTZW5kXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNlbmREYXRhXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNldFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTZXRBdXRvU2VydmVyU2V0dGluZ3NcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJTZXREYXRhXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNldEZvY3VzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNldE9wdGlvblwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTZXRTZWxlY3Rpb25cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2V0U2l6ZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlNldFRleHRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2V0Vmlld3BvcnRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2hvd1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTaG93Q29sb3JcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2hvd0ZvbnRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJTaG93SGVscFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTaG93T3BlblwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTaG93UHJpbnRlclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTaG93U2F2ZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlNob3dXaGF0c1RoaXNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2lnbk9mZlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTaWduT25cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2l6ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTa2lwXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNraXBMaW5lXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiU3BhblwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTcGxpdFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTcGxpdENvbnRhaW5pbmdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU3RhcnRMYWJlbEVkaXRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJTdGFydExvZ2dpbmdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU3RvcFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTeW5jaHJvbml6ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJUYWdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiVGV4dEhlaWdodFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlRleHRXaWR0aFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJUb0RlZmF1bHRzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlRyYWNlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlR3aXBzVG9DaGFydFBhcnRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJUeXBlQnlDaGFydFR5cGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiVVJMRm9yXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlVwZGF0ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJVcGRhdGVDb250cm9sc1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlVwZGF0ZVJlY29yZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJVcGRhdGVSb3dcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiVXB0b1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJWYWxpZGF0ZUNvbnRyb2xzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlZhbHVlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiV2hhdHNUaGlzTW9kZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJXcml0ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJXcml0ZUJsYW5rTGluZXNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiV3JpdGVMaW5lXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiV3JpdGVQcm9wZXJ0eVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJXcml0ZVRlbXBsYXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlpPcmRlclwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInJkb0NyZWF0ZUVudmlyb25tZW50XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInJkb1JlZ2lzdGVyRGF0YVNvdXJjZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSwgXG4gICAgICAgIFwidmJSZXBlYXRcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkRvXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkZvclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJGb3JFYWNoXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkxvb3BcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTmV4dFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlN0ZXBcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiVG9cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiVW50aWxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiV2VuZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJXaGlsZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSwgXG4gICAgICAgIFwidmJDb21tZW50XCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcInN0YXJ0XCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJyZWdleFwiOiBcIlxcXFwoXlxcXFx8XFxcXHNcXFxcKVJFTVxcXFxzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRlbHRhXCI6IDBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5zXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YlRvZG9cIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwiZW5kXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJyZWdleFwiOiBcIiRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVsdGFcIjogMFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcInJlZ2lvblwiLCBcbiAgICAgICAgICAgICAgICBcInNraXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJzdGFydFwiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwicmVnZXhcIjogXCJcXFxcKF5cXFxcfFxcXFxzXFxcXClcXFxcJ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkZWx0YVwiOiAwXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJUb2RvXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcImVuZFwiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwicmVnZXhcIjogXCIkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRlbHRhXCI6IDBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJyZWdpb25cIiwgXG4gICAgICAgICAgICAgICAgXCJza2lwXCI6IG51bGxcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSwgXG4gICAgICAgIFwidmJDb25kaXRpb25hbFwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiSWZcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiVGhlblwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJFbHNlSWZcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRWxzZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTZWxlY3RcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ2FzZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSwgXG4gICAgICAgIFwidmJEZWZpbmVcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcImRiQmlnSW50XCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRiQmluYXJ5XCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRiQm9vbGVhblwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkYkJ5dGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGJDaGFyXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiZGJDdXJyZW5jeVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkYkRhdGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGJEZWNpbWFsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRiRG91YmxlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRiRmxvYXRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJkYkdVSURcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGJJbnRlZ2VyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRiTG9uZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkYkxvbmdCaW5hcnlcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGJNZW1vXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiZGJOdW1lcmljXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRiU2luZ2xlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRiVGV4dFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkYlRpbWVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGJUaW1lU3RhbXBcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJkYlZhckJpbmFyeVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiM0RES1NoYWRvd1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YjNERmFjZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YjNESGlnaGxpZ2h0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiM0RMaWdodFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiM0RTaGFkb3dcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJBYm9ydFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkFib3J0UmV0cnlJZ25vcmVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkFjdGl2ZUJvcmRlclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkFjdGl2ZVRpdGxlQmFyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiQWxpYXNcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkFwcGxpY2F0aW9uTW9kYWxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJBcHBsaWNhdGlvbldvcmtzcGFjZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiQXBwVGFza01hbmFnZXJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJBcHBXaW5kb3dzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiQXJjaGl2ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkFycmF5XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJCYWNrXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiQmluYXJ5Q29tcGFyZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkJsYWNrXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiQmx1ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkJvb2xlYW5cIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkJ1dHRvbkZhY2VcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJCdXR0b25TaGFkb3dcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJCdXR0b25UZXh0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiQnl0ZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiQ2FsR3JlZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkNhbEhpanJpXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiQ2FuY2VsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiQ3JcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJDcml0aWNhbFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiQ3JMZlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkN1cnJlbmN5XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiQ3lhblwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkRhdGFiYXNlQ29tcGFyZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiRGF0YU9iamVjdFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkRhdGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJEZWNpbWFsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiRGVmYXVsdEJ1dHRvbjFcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkRlZmF1bHRCdXR0b24yXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiRGVmYXVsdEJ1dHRvbjNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJEZWZhdWx0QnV0dG9uNFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiRGVza3RvcFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkRpcmVjdG9yeVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkRvdWJsZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkVtcHR5XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiRXJyb3JcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkV4Y2xhbWF0aW9uXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiRmlyc3RGb3VyRGF5c1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkZpcnN0RnVsbFdlZWtcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkZpcnN0SmFuMVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkZvcm1Db2RlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiRm9ybUNvbnRyb2xNZW51XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJGb3JtRmVlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkZvcm1NRElGb3JtXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiRnJpZGF5XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiRnJvbVVuaWNvZGVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkdyYXlUZXh0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiR3JlZW5cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJIaWRkZW5cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJIaWRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiSGlnaGxpZ2h0XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJIaWdobGlnaHRUZXh0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiSGlyYWdhbmFcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJJZ25vcmVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJJTUVBbHBoYURibFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiSU1FQWxwaGFTbmdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJJTUVEaXNhYmxlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiSU1FSGlyYWdhbmFcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YklNRUthdGFrYW5hRGJsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiSU1FS2F0YWthbmFTbmdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJJTUVNb2RlQWxwaGFcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YklNRU1vZGVBbHBoYUZ1bGxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJJTUVNb2RlRGlzYWJsZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiSU1FTW9kZUhhbmd1bFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YklNRU1vZGVIYW5ndWxGdWxsXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJJTUVNb2RlSGlyYWdhbmFcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJJTUVNb2RlS2F0YWthbmFcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YklNRU1vZGVLYXRha2FuYUhhbGZcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJJTUVNb2RlTm9Db250cm9sXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJJTUVNb2RlT2ZmXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiSU1FTW9kZU9uXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiSU1FTm9PcFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YklNRU9mZlwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiSU1FT25cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJJbmFjdGl2ZUJvcmRlclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkluYWN0aXZlQ2FwdGlvblRleHRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkluYWN0aXZlVGl0bGVCYXJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJJbmZvQmFja2dyb3VuZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkluZm9ybWF0aW9uXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJJbmZvVGV4dFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkludGVnZXJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLYXRha2FuYVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleTBcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXkxXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXkyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5M1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleTRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXk1XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5NlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleTdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXk4XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXk5XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5QVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleUFkZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleUJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlCYWNrXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5Q1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiS2V5Q2FuY2VsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5Q2FwaXRhbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleUNsZWFyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5Q29udHJvbFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiS2V5RFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleURlY2ltYWxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlEZWxldGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlEaXZpZGVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleURvd25cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlFXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5RW5kXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5RXNjYXBlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5RXhlY3V0ZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiS2V5RlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleUYxXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5RjEwXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5RjExXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5RjEyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5RjEzXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlGMTRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlGMTVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlGMTZcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlGMlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleUYzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5RjRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleUY1XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5RjZcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlGN1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleUY4XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5RjlcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlHXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlIXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5SGVscFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleUhvbWVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlJXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5SW5zZXJ0XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlKXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5S1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleUxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlMQnV0dG9uXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5TGVmdFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleU1cIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleU1CdXR0b25cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlNZW51XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5TXVsdGlwbHlcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlOXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlOdW1sb2NrXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5TnVtcGFkMFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleU51bXBhZDFcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleU51bXBhZDJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlOdW1wYWQzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5TnVtcGFkNFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiS2V5TnVtcGFkNVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleU51bXBhZDZcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlOdW1wYWQ3XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlOdW1wYWQ4XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5TnVtcGFkOVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleU9cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlQXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlQYWdlRG93blwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleVBhZ2VVcFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleVBhdXNlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5UHJpbnRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleVFcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlSXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5UkJ1dHRvblwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleVJldHVyblwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleVJpZ2h0XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlTXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5U2VsZWN0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5U2VwYXJhdG9yXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5U2hpZnRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleVNuYXBzaG90XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5U3BhY2VcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlTdWJ0cmFjdFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleVRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleVRhYlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleVVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlVcFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleVZcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJLZXlXXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiS2V5WFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiS2V5WVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YktleVpcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJMZlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YkxvbmdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJMb3dlckNhc2VcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJNYWdlbnRhXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJNYXhpbWl6ZWRGb2N1c1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2Yk1lbnVCYXJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJNZW51VGV4dFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiTWluaW1pemVkRm9jdXNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJNaW5pbWl6ZWROb0ZvY3VzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiTW9uZGF5XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJNc2dCb3hcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJNc2dCb3hIZWxwQnV0dG9uXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiTXNnQm94UmlnaHRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2Yk1zZ0JveFJ0bFJlYWRpbmdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJNc2dCb3hTZXRGb3JlZ3JvdW5kXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJNc2dCb3hUZXh0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiTmFycm93XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiTmV3TGluZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2Yk5vXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiTm9ybWFsXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJOb3JtYWxGb2N1c1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2Yk5vcm1hbE5vRm9jdXNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJOdWxsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiTnVsbENoYXJcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2Yk51bGxTdHJpbmdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJPYmplY3RcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJPYmplY3RFcnJvclwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2Yk9LXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJPS0NhbmNlbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2Yk9LT25seVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YlByb3BlckNhc2VcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJRdWVzdGlvblwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiUmVhZE9ubHlcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJSZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJSZXRyeVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YlJldHJ5Q2FuY2VsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiU2F0dXJkYXlcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YlNjcm9sbEJhcnNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJTaW5nbGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJTdHJpbmdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJTdW5kYXlcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJTeXN0ZW1cIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YlN5c3RlbU1vZGFsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiVGFiXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiVGV4dENvbXBhcmVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJUaHVyc2RheVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcInZiVGl0bGVCYXJUZXh0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiVHVlc2RheVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YlVuaWNvZGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJVcHBlckNhc2VcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YlVzZVN5c3RlbVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YlVzZVN5c3RlbURheU9mV2Vla1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2YlZhcmlhbnRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJ2YlZlcnRpY2FsVGFiXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiVm9sdW1lXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiV2VkbmVzZGF5XCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiV2hpdGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJXaWRlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJXaW5kb3dCYWNrZ3JvdW5kXCIsIFxuICAgICAgICAgICAgICAgICAgICBcInZiV2luZG93RnJhbWVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJXaW5kb3dUZXh0XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwidmJZZWxsb3dcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJZZXNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwidmJZZXNOb1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJ2Ylllc05vQ2FuY2VsXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJ2YkV2ZW50c1wiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQWNjZXNzS2V5UHJlc3NcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQWN0aXZhdGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQWN0aXZlUm93Q2hhbmdlZFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkFmdGVyQWRkRmlsZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJBZnRlckNoYW5nZUZpbGVOYW1lXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkFmdGVyQ2xvc2VGaWxlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQWZ0ZXJDb2xFZGl0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkFmdGVyQ29sVXBkYXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkFmdGVyRGVsZXRlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQWZ0ZXJJbnNlcnRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQWZ0ZXJMYWJlbEVkaXRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQWZ0ZXJSZW1vdmVGaWxlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQWZ0ZXJVcGRhdGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQWZ0ZXJXcml0ZUZpbGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQW1iaWVudENoYW5nZWRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJBcHBseUNoYW5nZXNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQXNzb2NpYXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkFzeW5jUHJvZ3Jlc3NcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJBc3luY1JlYWRDb21wbGV0ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJBc3luY1JlYWRQcm9ncmVzc1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJBeGlzQWN0aXZhdGVkXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQXhpc0xhYmVsQWN0aXZhdGVkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkF4aXNMYWJlbFNlbGVjdGVkXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQXhpc0xhYmVsVXBkYXRlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJBeGlzU2VsZWN0ZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQXhpc1RpdGxlQWN0aXZhdGVkXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQXhpc1RpdGxlU2VsZWN0ZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQXhpc1RpdGxlVXBkYXRlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJBeGlzVXBkYXRlZFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkJlZm9yZUNsaWNrXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkJlZm9yZUNvbEVkaXRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQmVmb3JlQ29sVXBkYXRlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQmVmb3JlQ29ubmVjdFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJCZWZvcmVEZWxldGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQmVmb3JlSW5zZXJ0XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQmVmb3JlTGFiZWxFZGl0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkJlZm9yZUxvYWRGaWxlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkJlZm9yZVVwZGF0ZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkJlZ2luUmVxdWVzdFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJCZWdpblRyYW5zXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkJ1dHRvbkNsaWNrXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQnV0dG9uQ29tcGxldGVkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkJ1dHRvbkRyb3BEb3duXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkJ1dHRvbkdvdEZvY3VzXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQnV0dG9uTG9zdEZvY3VzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNhbGxiYWNrS2V5RG93blwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDaGFuZ2VcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ2hhbmdlZFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkNoYXJ0QWN0aXZhdGVkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNoYXJ0U2VsZWN0ZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ2hhcnRVcGRhdGVkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNsaWNrXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQ2xvc2VcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ2xvc2VRdWVyeVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJDbG9zZVVwXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNvbEVkaXRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ29sUmVzaXplXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQ29sbGFwc2VcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ29sdW1uQ2xpY2tcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ29tbWl0VHJhbnNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ29tcGFyZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkNvbmZpZ0NoYWdlQ2FuY2VsbGVkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNvbmZpZ0NoYW5nZWRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJDb25maWdDaGFuZ2VkQ2FuY2VsbGVkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNvbm5lY3RcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ29ubmVjdGlvblJlcXVlc3RcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJDdXJyZW50UmVjb3JkQ2hhbmdlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJERUNvbW1hbmRBZGRlZFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkRFQ29tbWFuZFByb3BlcnR5Q2hhbmdlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJERUNvbW1hbmRSZW1vdmVkXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiREVDb25uZWN0aW9uQWRkZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiREVDb25uZWN0aW9uUHJvcGVydHlDaGFuZ2VkXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiREVDb25uZWN0aW9uUmVtb3ZlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEYXRhQXJyaXZhbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEYXRhQ2hhbmdlZFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkRhdGFVcGRhdGVkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRhdGVDbGlja2VkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRibENsaWNrXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRlYWN0aXZhdGVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJEZXZNb2RlQ2hhbmdlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRldmljZUFycml2YWxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRGV2aWNlT3RoZXJFdmVudFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkRldmljZVF1ZXJ5UmVtb3ZlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRldmljZVF1ZXJ5UmVtb3ZlRmFpbGVkXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiRGV2aWNlUmVtb3ZlQ29tcGxldGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRGV2aWNlUmVtb3ZlUGVuZGluZ1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkRpc2Nvbm5lY3RcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRGlzcGxheUNoYW5nZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRGlzc29jaWF0ZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkRvR2V0TmV3RmlsZU5hbWVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRG9uZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEb25lUGFpbnRpbmdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRG93bkNsaWNrXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiRHJhZ0Ryb3BcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRHJhZ092ZXJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRHJvcERvd25cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRWRpdFByb3BlcnR5XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkVkaXRRdWVyeVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkVuZFJlcXVlc3RcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRW50ZXJDZWxsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkVudGVyRm9jdXNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRXhpdEZvY3VzXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkV4cGFuZFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkZvbnRDaGFuZ2VkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkZvb3Rub3RlQWN0aXZhdGVkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkZvb3Rub3RlU2VsZWN0ZWRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJGb290bm90ZVVwZGF0ZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRm9ybWF0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkZvcm1hdFNpemVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiR290Rm9jdXNcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJIZWFkQ2xpY2tcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiSGVpZ2h0Q2hhbmdlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJIaWRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkluZm9NZXNzYWdlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiSW5pUHJvcGVydGllc1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJJbml0UHJvcGVydGllc1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJJbml0aWFsaXplXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiSXRlbUFjdGl2YXRlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJJdGVtQWRkZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiSXRlbUNoZWNrXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkl0ZW1DbGlja1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkl0ZW1SZWxvYWRlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJJdGVtUmVtb3ZlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJJdGVtUmVuYW1lZFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkl0ZW1TZWxldGVjdGVkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIktleURvd25cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiS2V5UHJlc3NcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiS2V5VXBcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTGVhdmVDZWxsXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiTGVnZW5kQWN0aXZhdGVkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkxlZ2VuZFNlbGVjdGVkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkxlZ2VuZFVwZGF0ZWRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJMaW5rQ2xvc2VcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTGlua0Vycm9yXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkxpbmtFeGVjdXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkxpbmtOb3RpZnlcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJMaW5rT3BlblwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJMb2FkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkxvc3RGb2N1c1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJNb3VzZURvd25cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTW91c2VNb3ZlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiTW91c2VVcFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJOb2RlQ2hlY2tcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTm9kZUNsaWNrXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk9MRUNvbXBsZXRlRHJhZ1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIk9MRURyYWdEcm9wXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk9MRURyYWdPdmVyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk9MRUdpdmVGZWVkYmFja1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJPTEVTZXREYXRhXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiT0xFU3RhcnREcmFnXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk9iamVjdEV2ZW50XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk9iamVjdE1vdmVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiT25BZGROZXdcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJPbkNvbW1cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUGFpbnRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUGFuZWxDbGlja1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJQYW5lbERibENsaWNrXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlBhdGhDaGFuZ2VcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJQYXR0ZXJuQ2hhbmdlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlBsb3RBY3RpdmF0ZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUGxvdFNlbGVjdGVkXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiUGxvdFVwZGF0ZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUG9pbnRBY3RpdmF0ZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUG9pbnRMYWJlbEFjdGl2YXRlZFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlBvaW50TGFiZWxTZWxlY3RlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJQb2ludExhYmVsVXBkYXRlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJQb2ludFNlbGVjdGVkXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiUG9pbnRVcGRhdGVkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlBvd2VyUXVlcnlTdXNwZW5kXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlBvd2VyUmVzdW1lXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiUG93ZXJTdGF0dXNDaGFuZ2VkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlBvd2VyU3VzcGVuZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJQcm9jZXNzVGFnXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiUHJvY2Vzc2luZ1RpbWVvdXRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUXVlcnlDaGFuZ2VDb25maWdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUXVlcnlDbG9zZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlF1ZXJ5Q29tcGxldGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUXVlcnlDb21wbGV0ZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUXVlcnlUaW1lb3V0XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiUXVlcnlVbmxvYWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUmVhZFByb3BlcnRpZXNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUmVwZWF0ZWRDb250cm9sTG9hZGVkXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiUmVwZWF0ZWRDb250cm9sVW5sb2FkZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUmVwb3NpdGlvblwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlJlcXVlc3RDaGFuZ2VGaWxlTmFtZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSZXF1ZXN0V3JpdGVGaWxlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJlc2l6ZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlJlc3VsdHNDaGFuZ2VkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJldGFpbmVkUHJvamVjdFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSb2xsYmFja1RyYW5zXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiUm93Q29sQ2hhbmdlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJvd0N1cnJlbmN5Q2hhbmdlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJvd1Jlc2l6ZVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlJvd1N0YXR1c0NoYW5nZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2Nyb2xsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNlbENoYW5nZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTZWxlY3Rpb25DaGFuZ2VkXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiU2VuZENvbXBsZXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNlbmRQcm9ncmVzc1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTZXJpZXNBY3RpdmF0ZWRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJTZXJpZXNTZWxlY3RlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTZXJpZXNVcGRhdGVkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNldHRpbmdDaGFuZ2VkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNob3dcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJTcGxpdENoYW5nZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTdGFydFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTdGF0ZUNoYW5nZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU3RhdHVzVXBkYXRlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiU3lzQ29sb3JzQ2hhbmdlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJUZXJtaW5hdGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiVGltZUNoYW5nZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiVGltZXJcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJUaXRsZUFjdGl2YXRlZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJUaXRsZVNlbGVjdGVkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlRpdGxlVXBkYXRlZFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlVuYm91bmRBZGREYXRhXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlVuYm91bmREZWxldGVSb3dcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJVbmJvdW5kR2V0UmVsYXRpdmVCb29rbWFya1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJVbmJvdW5kUmVhZERhdGFcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJVbmJvdW5kV3JpdGVEYXRhXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlVuZm9ybWF0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlVubG9hZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJVcENsaWNrXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlVwZGF0ZWRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJVc2VyRXZlbnRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiVmFsaWRhdGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiVmFsaWRhdGlvbkVycm9yXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiVmlzaWJsZVJlY29yZENoYW5nZWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiV2lsbEFzc29jaWF0ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJXaWxsQ2hhbmdlRGF0YVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIldpbGxEaXNzb2NpYXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIldpbGxFeGVjdXRlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIldpbGxVcGRhdGVSb3dzXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiV3JpdGVQcm9wZXJ0aWVzXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJ2YlN0YXRlbWVudFwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiQWxpYXNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQXBwQWN0aXZhdGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQXNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQmFzZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJCZWVwXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkJlZ2luXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNhbGxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ2hEaXJcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJDaERyaXZlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNsb3NlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkNvbnN0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRhdGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRGVjbGFyZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEZWZCb29sXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRlZkJ5dGVcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJEZWZDdXJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRGVmRGF0ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEZWZEYmxcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRGVmRGVjXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRlZkludFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEZWZMbmdcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRGVmT2JqXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiRGVmU25nXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRlZlN0clwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEZWZWYXJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRGVmdHlwZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEZWxldGVTZXR0aW5nXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRpbVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEb1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkVhY2hcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRWxzZUlmXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkVuZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJFbnVtXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkVyYXNlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkVycm9yXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkV2ZW50XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkV4aXRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJFeHBsaWNpdFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJGaWxlQ29weVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJGb3JcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRm9yRWFjaFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJGdW5jdGlvblwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJHZXRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiR29TdWJcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJHb1RvXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkdvc3ViXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkltcGxlbWVudHNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiS2lsbFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJMU2V0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkxldFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJMaWJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTGluZUlucHV0XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiTG9hZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJMb2NrXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkxvb3BcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTWlkXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk1rRGlyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk5hbWVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTmV4dFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJPblwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJPbkVycm9yXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk9wZW5cIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJPcHRpb25cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUHJlc2VydmVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUHJpdmF0ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJQcm9wZXJ0eVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJQdWJsaWNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUHV0XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJTZXRcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJSYWlzZUV2ZW50XCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJhbmRvbWl6ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSZURpbVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSZWRpbVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJSZW1cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUmVzZXRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiUmVzdW1lXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiUmV0dXJuXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlJtRGlyXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNhdmVQaWN0dXJlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNhdmVTZXR0aW5nXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlNlZWtcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2VuZEtleXNcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJTZW5ka2V5c1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTZXRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2V0QXR0clwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTdGF0aWNcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU3RlcFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJTdG9wXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlN1YlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJUaW1lXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiVHlwZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJVbmxvYWRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiVW5sb2NrXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlVudGlsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIldlbmRcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiV2hpbGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiV2lkdGhcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiV2l0aFwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIldyaXRlXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJ2Yk9wZXJhdG9yXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJBZGRyZXNzT2ZcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQW5kXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkJ5UmVmXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkJ5VmFsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkVxdlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJJbXBcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiSW5cIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJJc1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJMaWtlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIk1vZFwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJOb3RcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiT3JcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiVG9cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiWG9yXCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJyZWdleFwiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwicmVnZXhcIjogXCJbKCkrLixcXFxcLS8qPSZdXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRlbHRhXCI6IDBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluc1wiOiBbXSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwibWF0Y2hcIlxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJyZWdleFwiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwicmVnZXhcIjogXCJbPD5dPVxcXFw9XCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRlbHRhXCI6IDBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluc1wiOiBbXSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwibWF0Y2hcIlxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJyZWdleFwiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwicmVnZXhcIjogXCI8PlwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJkZWx0YVwiOiAwXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbCwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbnNcIjogW10sIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcIm1hdGNoXCJcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwicmVnZXhcIjoge1xuICAgICAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IFwiXFxcXHNcXFxcK18kXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRlbHRhXCI6IDBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluc1wiOiBbXSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwibWF0Y2hcIlxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJ2YlR5cGVzXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleXdvcmRzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgXCJCb29sZWFuXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkJ5dGVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiQ3VycmVuY3lcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRGF0ZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJEZWNpbWFsXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIkRvdWJsZVwiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJFbXB0eVwiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCIsIFxuICAgICAgICAgICAgICAgIFwibmV4dGdyb3VwXCI6IG51bGxcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIkludGVnZXJcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiTG9uZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJPYmplY3RcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiU2luZ2xlXCIsIFxuICAgICAgICAgICAgICAgICAgICBcIlN0cmluZ1wiLCBcbiAgICAgICAgICAgICAgICAgICAgXCJWYXJpYW50XCJcbiAgICAgICAgICAgICAgICBdLCBcbiAgICAgICAgICAgICAgICBcInNraXB3aGl0ZVwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluZWRcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJ2YkJvb2xlYW5cIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5d29yZHNcIjogW1xuICAgICAgICAgICAgICAgICAgICBcIlRydWVcIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiRmFsc2VcIlxuICAgICAgICAgICAgICAgIF0sIFxuICAgICAgICAgICAgICAgIFwic2tpcHdoaXRlXCI6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiLCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sIFxuICAgICAgICBcInZiVG9kb1wiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgIFwiVE9ET1wiXG4gICAgICAgICAgICAgICAgXSwgXG4gICAgICAgICAgICAgICAgXCJza2lwd2hpdGVcIjogZmFsc2UsIFxuICAgICAgICAgICAgICAgIFwiY29udGFpbmVkXCI6IHRydWUsIFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIiwgXG4gICAgICAgICAgICAgICAgXCJuZXh0Z3JvdXBcIjogbnVsbFxuICAgICAgICAgICAgfVxuICAgICAgICBdLCBcbiAgICAgICAgXCJ2YlR5cGVTcGVjaWZpZXJcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwicmVnZXhcIjoge1xuICAgICAgICAgICAgICAgICAgICBcInJlZ2V4XCI6IFwiW2EtekEtWjAtOV1bXFxcXCQlJiEjXW1zPXMxXCIsIFxuICAgICAgICAgICAgICAgICAgICBcImRlbHRhXCI6IDBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluc1wiOiBbXSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwibWF0Y2hcIlxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJyZWdleFwiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwicmVnZXhcIjogXCIjW2EtekEtWjAtOV1cIiwgXG4gICAgICAgICAgICAgICAgICAgIFwiZGVsdGFcIjogLTFcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICBcIm5leHRncm91cFwiOiBudWxsLCBcbiAgICAgICAgICAgICAgICBcImNvbnRhaW5lZFwiOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgXCJjb250YWluc1wiOiBbXSwgXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwibWF0Y2hcIlxuICAgICAgICAgICAgfVxuICAgICAgICBdXG4gICAgfSwgXG4gICAgXCJ0YWdzXCI6IHtcbiAgICAgICAgXCJ2YkZ1bmN0aW9uXCI6IFwiSWRlbnRpZmllclwiLCBcbiAgICAgICAgXCJ2Yk51bWJlclwiOiBcIk51bWJlclwiLCBcbiAgICAgICAgXCJ2YlN0cmluZ1wiOiBcIlN0cmluZ1wiLCBcbiAgICAgICAgXCJ2YkNvbnN0XCI6IFwiQ29uc3RhbnRcIiwgXG4gICAgICAgIFwidmJEZWZpbmVcIjogXCJDb25zdGFudFwiLCBcbiAgICAgICAgXCJ2YktleXdvcmRcIjogXCJTdGF0ZW1lbnRcIiwgXG4gICAgICAgIFwidmJGbG9hdFwiOiBcIkZsb2F0XCIsIFxuICAgICAgICBcInZiTWV0aG9kc1wiOiBcIlByZVByb2NcIiwgXG4gICAgICAgIFwidmJDb25kaXRpb25hbFwiOiBcIkNvbmRpdGlvbmFsXCIsIFxuICAgICAgICBcInZiQ29tbWVudFwiOiBcIkNvbW1lbnRcIiwgXG4gICAgICAgIFwidmJJZGVudGlmaWVyXCI6IFwiSWRlbnRpZmllclwiLCBcbiAgICAgICAgXCJ2YlJlcGVhdFwiOiBcIlJlcGVhdFwiLCBcbiAgICAgICAgXCJ2YkxpbmVOdW1iZXJcIjogXCJDb21tZW50XCIsIFxuICAgICAgICBcInZiRXZlbnRzXCI6IFwiU3BlY2lhbFwiLCBcbiAgICAgICAgXCJ2YlN0YXRlbWVudFwiOiBcIlN0YXRlbWVudFwiLCBcbiAgICAgICAgXCJ2YkVycm9yXCI6IFwiRXJyb3JcIiwgXG4gICAgICAgIFwidmJPcGVyYXRvclwiOiBcIk9wZXJhdG9yXCIsIFxuICAgICAgICBcInZiVHlwZXNcIjogXCJUeXBlXCIsIFxuICAgICAgICBcInZiQm9vbGVhblwiOiBcIkJvb2xlYW5cIiwgXG4gICAgICAgIFwidmJUb2RvXCI6IFwiVG9kb1wiLCBcbiAgICAgICAgXCJ2YlR5cGVTcGVjaWZpZXJcIjogXCJUeXBlXCJcbiAgICB9XG59OyIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzLmpzJyk7XG52YXIgcmVuZGVyZXIgPSByZXF1aXJlKCcuL3JlbmRlcmVyLmpzJyk7XG5cbi8qKlxuICogR3JvdXBzIG11bHRpcGxlIHJlbmRlcmVyc1xuICogQHBhcmFtIHthcnJheX0gcmVuZGVyZXJzIC0gYXJyYXkgb2YgcmVuZGVyZXJzXG4gKiBAcGFyYW0ge0NhbnZhc30gY2FudmFzXG4gKi9cbnZhciBCYXRjaFJlbmRlcmVyID0gZnVuY3Rpb24ocmVuZGVyZXJzLCBjYW52YXMpIHtcbiAgICByZW5kZXJlci5SZW5kZXJlckJhc2UuY2FsbCh0aGlzLCBjYW52YXMpO1xuICAgIHRoaXMuX3JlbmRlcmVycyA9IHJlbmRlcmVycztcblxuICAgIC8vIExpc3RlbiB0byB0aGUgbGF5ZXJzLCBpZiBvbmUgbGF5ZXIgY2hhbmdlcywgcmVjb21wb3NlXG4gICAgLy8gdGhlIGZ1bGwgaW1hZ2UgYnkgY29weWluZyB0aGVtIGFsbCBhZ2Fpbi5cbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdGhpcy5fcmVuZGVyZXJzLmZvckVhY2goZnVuY3Rpb24ocmVuZGVyZXIpIHtcbiAgICAgICAgcmVuZGVyZXIub24oJ2NoYW5nZWQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHRoYXQuX2NvcHlfcmVuZGVyZXJzKCk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIFxuICAgIC8vIENyZWF0ZSBwcm9wZXJ0aWVzLlxuICAgIHRoaXMucHJvcGVydHkoJ3dpZHRoJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Ll9jYW52YXMud2lkdGg7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC5fY2FudmFzLndpZHRoID0gdmFsdWU7XG4gICAgICAgIHRoYXQuX3JlbmRlcmVycy5mb3JFYWNoKGZ1bmN0aW9uKHJlbmRlcmVyKSB7XG4gICAgICAgICAgICByZW5kZXJlci53aWR0aCA9IHZhbHVlO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICB0aGlzLnByb3BlcnR5KCdoZWlnaHQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoYXQuX2NhbnZhcy5oZWlnaHQ7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC5fY2FudmFzLmhlaWdodCA9IHZhbHVlO1xuICAgICAgICB0aGF0Ll9yZW5kZXJlcnMuZm9yRWFjaChmdW5jdGlvbihyZW5kZXJlcikge1xuICAgICAgICAgICAgcmVuZGVyZXIuaGVpZ2h0ID0gdmFsdWU7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufTtcbnV0aWxzLmluaGVyaXQoQmF0Y2hSZW5kZXJlciwgcmVuZGVyZXIuUmVuZGVyZXJCYXNlKTtcblxuLyoqXG4gKiBSZW5kZXIgdG8gdGhlIGNhbnZhc1xuICogQHBhcmFtIHtkaWN0aW9uYXJ5fSAob3B0aW9uYWwpIHNjcm9sbCAtIEhvdyBtdWNoIHRoZSBjYW52YXMgd2FzIHNjcm9sbGVkLiAgVGhpc1xuICogICAgICAgICAgICAgICAgICAgICBpcyBhIGRpY3Rpb25hcnkgb2YgdGhlIGZvcm0ge3g6IGZsb2F0LCB5OiBmbG9hdH1cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkJhdGNoUmVuZGVyZXIucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKHNjcm9sbCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLl9yZW5kZXJlcnMuZm9yRWFjaChmdW5jdGlvbihyZW5kZXJlcikge1xuXG4gICAgICAgIC8vIEFwcGx5IHRoZSByZW5kZXJpbmcgY29vcmRpbmF0ZSB0cmFuc2Zvcm1zIG9mIHRoZSBwYXJlbnQuXG4gICAgICAgIGlmICghcmVuZGVyZXIub3B0aW9ucy5wYXJlbnRfaW5kZXBlbmRlbnQpIHtcbiAgICAgICAgICAgIHJlbmRlcmVyLl9jYW52YXMuX3R4ID0gdXRpbHMucHJveHkodGhhdC5fY2FudmFzLl90eCwgdGhhdC5fY2FudmFzKTtcbiAgICAgICAgICAgIHJlbmRlcmVyLl9jYW52YXMuX3R5ID0gdXRpbHMucHJveHkodGhhdC5fY2FudmFzLl90eSwgdGhhdC5fY2FudmFzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRlbGwgdGhlIHJlbmRlcmVyIHRvIHJlbmRlciBpdHNlbGYuXG4gICAgICAgIHJlbmRlcmVyLnJlbmRlcihzY3JvbGwpO1xuICAgIH0pO1xuXG4gICAgLy8gQ29weSB0aGUgcmVzdWx0cyB0byBzZWxmLlxuICAgIHRoaXMuX2NvcHlfcmVuZGVyZXJzKCk7XG59O1xuXG4vKipcbiAqIENvcGllcyBhbGwgdGhlIHJlbmRlcmVyIGxheWVycyB0byB0aGUgY2FudmFzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQmF0Y2hSZW5kZXJlci5wcm90b3R5cGUuX2NvcHlfcmVuZGVyZXJzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMuX2NhbnZhcy5jbGVhcigpO1xuICAgIHRoaXMuX3JlbmRlcmVycy5mb3JFYWNoKGZ1bmN0aW9uKHJlbmRlcmVyKSB7XG4gICAgICAgIHRoYXQuX2NvcHlfcmVuZGVyZXIocmVuZGVyZXIpO1xuICAgIH0pO1xufTtcblxuLyoqXG4gKiBDb3B5IGEgcmVuZGVyZXIgdG8gdGhlIGNhbnZhcy5cbiAqIEBwYXJhbSAge1JlbmRlcmVyQmFzZX0gcmVuZGVyZXJcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkJhdGNoUmVuZGVyZXIucHJvdG90eXBlLl9jb3B5X3JlbmRlcmVyID0gZnVuY3Rpb24ocmVuZGVyZXIpIHtcbiAgICB0aGlzLl9jYW52YXMuZHJhd19pbWFnZShcbiAgICAgICAgcmVuZGVyZXIuX2NhbnZhcywgXG4gICAgICAgIC10aGlzLl9jYW52YXMuX3R4KDApLCBcbiAgICAgICAgLXRoaXMuX2NhbnZhcy5fdHkoMCksIFxuICAgICAgICB0aGlzLl9jYW52YXMud2lkdGgsIFxuICAgICAgICB0aGlzLl9jYW52YXMuaGVpZ2h0KTtcbn07XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuQmF0Y2hSZW5kZXJlciA9IEJhdGNoUmVuZGVyZXI7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy5qcycpO1xudmFyIHJlbmRlcmVyID0gcmVxdWlyZSgnLi9yZW5kZXJlci5qcycpO1xuXG4vKipcbiAqIFJlbmRlcnMgdG8gYSBjYW52YXNcbiAqIEBwYXJhbSB7Q2FudmFzfSBkZWZhdWx0X2NhbnZhc1xuICovXG52YXIgQ29sb3JSZW5kZXJlciA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIENyZWF0ZSB3aXRoIHRoZSBvcHRpb24gJ3BhcmVudF9pbmRlcGVuZGVudCcgdG8gZGlzYWJsZVxuICAgIC8vIHBhcmVudCBjb29yZGluYXRlIHRyYW5zbGF0aW9ucyBmcm9tIGJlaW5nIGFwcGxpZWQgYnkgXG4gICAgLy8gYSBiYXRjaCByZW5kZXJlci5cbiAgICByZW5kZXJlci5SZW5kZXJlckJhc2UuY2FsbCh0aGlzLCB1bmRlZmluZWQsIHtwYXJlbnRfaW5kZXBlbmRlbnQ6IHRydWV9KTtcbiAgICB0aGlzLl9yZW5kZXJlZCA9IGZhbHNlO1xuICAgIFxuICAgIC8vIENyZWF0ZSBwcm9wZXJ0aWVzLlxuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLnByb3BlcnR5KCd3aWR0aCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC5fY2FudmFzLndpZHRoO1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQuX2NhbnZhcy53aWR0aCA9IHZhbHVlO1xuICAgICAgICB0aGF0Ll9yZW5kZXIoKTtcblxuICAgICAgICAvLyBUZWxsIHBhcmVudCBsYXllciB0aGlzIG9uZSBoYXMgY2hhbmdlZC5cbiAgICAgICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2VkJyk7XG4gICAgfSk7XG4gICAgdGhpcy5wcm9wZXJ0eSgnaGVpZ2h0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Ll9jYW52YXMuaGVpZ2h0O1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQuX2NhbnZhcy5oZWlnaHQgPSB2YWx1ZTtcbiAgICAgICAgdGhhdC5fcmVuZGVyKCk7XG5cbiAgICAgICAgLy8gVGVsbCBwYXJlbnQgbGF5ZXIgdGhpcyBvbmUgaGFzIGNoYW5nZWQuXG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpO1xuICAgIH0pO1xuICAgIHRoaXMucHJvcGVydHkoJ2NvbG9yJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Ll9jb2xvcjtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0Ll9jb2xvciA9IHZhbHVlO1xuICAgICAgICB0aGF0Ll9yZW5kZXIoKTtcblxuICAgICAgICAvLyBUZWxsIHBhcmVudCBsYXllciB0aGlzIG9uZSBoYXMgY2hhbmdlZC5cbiAgICAgICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2VkJyk7XG4gICAgfSk7XG59O1xudXRpbHMuaW5oZXJpdChDb2xvclJlbmRlcmVyLCByZW5kZXJlci5SZW5kZXJlckJhc2UpO1xuXG4vKipcbiAqIFJlbmRlciB0byB0aGUgY2FudmFzXG4gKiBAcGFyYW0ge2RpY3Rpb25hcnl9IChvcHRpb25hbCkgc2Nyb2xsIC0gSG93IG11Y2ggdGhlIGNhbnZhcyB3YXMgc2Nyb2xsZWQuICBUaGlzXG4gKiAgICAgICAgICAgICAgICAgICAgIGlzIGEgZGljdGlvbmFyeSBvZiB0aGUgZm9ybSB7eDogZmxvYXQsIHk6IGZsb2F0fVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ29sb3JSZW5kZXJlci5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24oc2Nyb2xsKSB7XG4gICAgaWYgKCF0aGlzLl9yZW5kZXJlZCkge1xuICAgICAgICB0aGlzLl9yZW5kZXIoKTtcbiAgICAgICAgdGhpcy5fcmVuZGVyZWQgPSB0cnVlO1xuICAgIH1cbn07XG5cbi8qKlxuICogUmVuZGVyIGEgZnJhbWUuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Db2xvclJlbmRlcmVyLnByb3RvdHlwZS5fcmVuZGVyID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fY2FudmFzLmNsZWFyKCk7XG4gICAgdGhpcy5fY2FudmFzLmRyYXdfcmVjdGFuZ2xlKDAsIDAsIHRoaXMuX2NhbnZhcy53aWR0aCwgdGhpcy5fY2FudmFzLmhlaWdodCwge2ZpbGxfY29sb3I6IHRoaXMuX2NvbG9yfSk7XG59O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLkNvbG9yUmVuZGVyZXIgPSBDb2xvclJlbmRlcmVyO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIGFuaW1hdG9yID0gcmVxdWlyZSgnLi4vYW5pbWF0b3IuanMnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzLmpzJyk7XG52YXIgcmVuZGVyZXIgPSByZXF1aXJlKCcuL3JlbmRlcmVyLmpzJyk7XG5cbi8qKlxuICogUmVuZGVyIGRvY3VtZW50IGN1cnNvcnNcbiAqXG4gKiBUT0RPOiBPbmx5IHJlbmRlciB2aXNpYmxlLlxuICovXG52YXIgQ3Vyc29yc1JlbmRlcmVyID0gZnVuY3Rpb24oY3Vyc29ycywgc3R5bGUsIHJvd19yZW5kZXJlciwgaGFzX2ZvY3VzKSB7XG4gICAgcmVuZGVyZXIuUmVuZGVyZXJCYXNlLmNhbGwodGhpcyk7XG4gICAgdGhpcy5zdHlsZSA9IHN0eWxlO1xuICAgIHRoaXMuX2hhc19mb2N1cyA9IGhhc19mb2N1cztcbiAgICB0aGlzLl9jdXJzb3JzID0gY3Vyc29ycztcbiAgICB0aGlzLl9nZXRfdmlzaWJsZV9yb3dzID0gdXRpbHMucHJveHkocm93X3JlbmRlcmVyLmdldF92aXNpYmxlX3Jvd3MsIHJvd19yZW5kZXJlcik7XG4gICAgdGhpcy5fZ2V0X3Jvd19oZWlnaHQgPSB1dGlscy5wcm94eShyb3dfcmVuZGVyZXIuZ2V0X3Jvd19oZWlnaHQsIHJvd19yZW5kZXJlcik7XG4gICAgdGhpcy5fZ2V0X3Jvd190b3AgPSB1dGlscy5wcm94eShyb3dfcmVuZGVyZXIuZ2V0X3Jvd190b3AsIHJvd19yZW5kZXJlcik7XG4gICAgdGhpcy5fbWVhc3VyZV9wYXJ0aWFsX3JvdyA9IHV0aWxzLnByb3h5KHJvd19yZW5kZXJlci5tZWFzdXJlX3BhcnRpYWxfcm93X3dpZHRoLCByb3dfcmVuZGVyZXIpO1xuICAgIHRoaXMuX2JsaW5rX2FuaW1hdG9yID0gbmV3IGFuaW1hdG9yLkFuaW1hdG9yKDEwMDApO1xuICAgIHRoaXMuX2ZwcyA9IDMwO1xuXG4gICAgLy8gU3RhcnQgdGhlIGN1cnNvciByZW5kZXJpbmcgY2xvY2suXG4gICAgdGhpcy5fcmVuZGVyX2Nsb2NrKCk7XG4gICAgdGhpcy5fbGFzdF9yZW5kZXJlZCA9IG51bGw7XG59O1xudXRpbHMuaW5oZXJpdChDdXJzb3JzUmVuZGVyZXIsIHJlbmRlcmVyLlJlbmRlcmVyQmFzZSk7XG5cbi8qKlxuICogUmVuZGVyIHRvIHRoZSBjYW52YXNcbiAqIE5vdGU6IFRoaXMgbWV0aG9kIGlzIGNhbGxlZCBvZnRlbiwgc28gaXQncyBpbXBvcnRhbnQgdGhhdCBpdCdzXG4gKiBvcHRpbWl6ZWQgZm9yIHNwZWVkLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29yc1JlbmRlcmVyLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBGcmFtZSBsaW1pdCB0aGUgcmVuZGVyaW5nLlxuICAgIGlmIChEYXRlLm5vdygpIC0gdGhpcy5fbGFzdF9yZW5kZXJlZCA8IDEwMDAvdGhpcy5fZnBzKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5fY2FudmFzLmNsZWFyKCk7XG5cbiAgICAvLyBPbmx5IHJlbmRlciBpZiB0aGUgY2FudmFzIGhhcyBmb2N1cy5cbiAgICBpZiAodGhpcy5faGFzX2ZvY3VzKCkpIHtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICB0aGlzLl9jdXJzb3JzLmN1cnNvcnMuZm9yRWFjaChmdW5jdGlvbihjdXJzb3IpIHtcbiAgICAgICAgICAgIC8vIEdldCB0aGUgdmlzaWJsZSByb3dzLlxuICAgICAgICAgICAgdmFyIHZpc2libGVfcm93cyA9IHRoYXQuX2dldF92aXNpYmxlX3Jvd3MoKTtcblxuICAgICAgICAgICAgLy8gSWYgYSBjdXJzb3IgZG9lc24ndCBoYXZlIGEgcG9zaXRpb24sIHJlbmRlciBpdCBhdCB0aGVcbiAgICAgICAgICAgIC8vIGJlZ2lubmluZyBvZiB0aGUgZG9jdW1lbnQuXG4gICAgICAgICAgICB2YXIgcm93X2luZGV4ID0gY3Vyc29yLnByaW1hcnlfcm93IHx8IDA7XG4gICAgICAgICAgICB2YXIgY2hhcl9pbmRleCA9IGN1cnNvci5wcmltYXJ5X2NoYXIgfHwgMDtcblxuICAgICAgICAgICAgLy8gQ2FsY3VsYXRlIG9wYWNpdHkgb2YgdGhlIGN1cnNvci4gIEJsaW5raW5nIGN1cnNvci5cbiAgICAgICAgICAgIHZhciBzaW4gPSBNYXRoLnNpbigyKk1hdGguUEkqdGhhdC5fYmxpbmtfYW5pbWF0b3IudGltZSgpKTtcbiAgICAgICAgICAgIHZhciBhbHBoYSA9IE1hdGgubWluKE1hdGgubWF4KHNpbiswLjUsIDApLCAxKTsgLy8gT2Zmc2V0LCB0cnVuY2F0ZWQgc2luZSB3YXZlLlxuXG4gICAgICAgICAgICAvLyBEcmF3IHRoZSBjdXJzb3IuXG4gICAgICAgICAgICBpZiAoYWxwaGEgPiAwKSB7XG4gICAgICAgICAgICAgICAgdmFyIGhlaWdodCA9IHRoYXQuX2dldF9yb3dfaGVpZ2h0KHJvd19pbmRleCk7XG4gICAgICAgICAgICAgICAgdmFyIG11bHRpcGxpZXIgPSB0aGF0LnN0eWxlLmN1cnNvcl9oZWlnaHQgfHwgMS4wO1xuICAgICAgICAgICAgICAgIHZhciBvZmZzZXQgPSAoaGVpZ2h0IC0gKG11bHRpcGxpZXIqaGVpZ2h0KSkgLyAyO1xuICAgICAgICAgICAgICAgIGhlaWdodCAqPSBtdWx0aXBsaWVyO1xuICAgICAgICAgICAgICAgIGlmICh2aXNpYmxlX3Jvd3MudG9wX3JvdyA8PSByb3dfaW5kZXggJiYgcm93X2luZGV4IDw9IHZpc2libGVfcm93cy5ib3R0b21fcm93KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQuX2NhbnZhcy5kcmF3X3JlY3RhbmdsZShcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoYXJfaW5kZXggPT09IDAgPyAwIDogdGhhdC5fbWVhc3VyZV9wYXJ0aWFsX3Jvdyhyb3dfaW5kZXgsIGNoYXJfaW5kZXgpLCBcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuX2dldF9yb3dfdG9wKHJvd19pbmRleCkgKyBvZmZzZXQsIFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5zdHlsZS5jdXJzb3Jfd2lkdGg9PT11bmRlZmluZWQgPyAxLjAgOiB0aGF0LnN0eWxlLmN1cnNvcl93aWR0aCwgXG4gICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQsIFxuICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGxfY29sb3I6IHRoYXQuc3R5bGUuY3Vyc29yIHx8ICdiYWNrJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbHBoYTogYWxwaGEsXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfSAgICBcbiAgICAgICAgICAgIH0gICBcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHRoaXMuX2xhc3RfcmVuZGVyZWQgPSBEYXRlLm5vdygpO1xufTtcblxuLyoqXG4gKiBDbG9jayBmb3IgcmVuZGVyaW5nIHRoZSBjdXJzb3IuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3JzUmVuZGVyZXIucHJvdG90eXBlLl9yZW5kZXJfY2xvY2sgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBJZiB0aGUgY2FudmFzIGlzIGZvY3VzZWQsIHJlZHJhdy5cbiAgICBpZiAodGhpcy5faGFzX2ZvY3VzKCkpIHtcbiAgICAgICAgdmFyIGZpcnN0X3JlbmRlciA9ICF0aGlzLl93YXNfZm9jdXNlZDtcbiAgICAgICAgdGhpcy5fd2FzX2ZvY3VzZWQgPSB0cnVlO1xuICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgICAgICAvLyBUZWxsIHBhcmVudCBsYXllciB0aGlzIG9uZSBoYXMgY2hhbmdlZC5cbiAgICAgICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2VkJyk7XG4gICAgICAgIGlmIChmaXJzdF9yZW5kZXIpIHRoaXMudHJpZ2dlcigndG9nZ2xlJyk7XG5cbiAgICAvLyBUaGUgY2FudmFzIGlzbid0IGZvY3VzZWQuICBJZiB0aGlzIGlzIHRoZSBmaXJzdCB0aW1lXG4gICAgLy8gaXQgaGFzbid0IGJlZW4gZm9jdXNlZCwgcmVuZGVyIGFnYWluIHdpdGhvdXQgdGhlIFxuICAgIC8vIGN1cnNvcnMuXG4gICAgfSBlbHNlIGlmICh0aGlzLl93YXNfZm9jdXNlZCkge1xuICAgICAgICB0aGlzLl93YXNfZm9jdXNlZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgICAgICAvLyBUZWxsIHBhcmVudCBsYXllciB0aGlzIG9uZSBoYXMgY2hhbmdlZC5cbiAgICAgICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2VkJyk7XG4gICAgICAgIHRoaXMudHJpZ2dlcigndG9nZ2xlJyk7XG4gICAgfVxuXG4gICAgLy8gVGltZXIuXG4gICAgc2V0VGltZW91dCh1dGlscy5wcm94eSh0aGlzLl9yZW5kZXJfY2xvY2ssIHRoaXMpLCAxMDAwIC8gdGhpcy5fZnBzKTtcbn07XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuQ3Vyc29yc1JlbmRlcmVyID0gQ3Vyc29yc1JlbmRlcmVyO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMuanMnKTtcbnZhciByb3cgPSByZXF1aXJlKCcuL3Jvdy5qcycpO1xuXG4vKipcbiAqIFJlbmRlciB0aGUgdGV4dCByb3dzIG9mIGEgRG9jdW1lbnRNb2RlbC5cbiAqIEBwYXJhbSB7RG9jdW1lbnRNb2RlbH0gbW9kZWwgaW5zdGFuY2VcbiAqL1xudmFyIEhpZ2hsaWdodGVkUm93UmVuZGVyZXIgPSBmdW5jdGlvbihtb2RlbCwgc2Nyb2xsaW5nX2NhbnZhcywgc3R5bGUsIGNvbmZpZykge1xuICAgIHJvdy5Sb3dSZW5kZXJlci5jYWxsKHRoaXMsIG1vZGVsLCBzY3JvbGxpbmdfY2FudmFzKTtcbiAgICB0aGlzLnN0eWxlID0gc3R5bGU7XG4gICAgdGhpcy5jb25maWcgPSBjb25maWc7XG59O1xudXRpbHMuaW5oZXJpdChIaWdobGlnaHRlZFJvd1JlbmRlcmVyLCByb3cuUm93UmVuZGVyZXIpO1xuXG4vKipcbiAqIFJlbmRlciBhIHNpbmdsZSByb3dcbiAqIEBwYXJhbSAge2ludGVnZXJ9IGluZGV4XG4gKiBAcGFyYW0gIHtmbG9hdH0geFxuICogQHBhcmFtICB7ZmxvYXR9IHlcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkhpZ2hsaWdodGVkUm93UmVuZGVyZXIucHJvdG90eXBlLl9yZW5kZXJfcm93ID0gZnVuY3Rpb24oaW5kZXgsIHggLHkpIHtcbiAgICBpZiAoaW5kZXggPCAwIHx8IHRoaXMuX21vZGVsLl9yb3dzLmxlbmd0aCA8PSBpbmRleCkgcmV0dXJuO1xuICAgIFxuICAgIHZhciBncm91cHMgPSB0aGlzLl9nZXRfZ3JvdXBzKGluZGV4KTtcbiAgICB2YXIgbGVmdCA9IHg7XG4gICAgZm9yICh2YXIgaT0wOyBpPGdyb3Vwcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgd2lkdGggPSB0aGlzLl90ZXh0X2NhbnZhcy5tZWFzdXJlX3RleHQoZ3JvdXBzW2ldLnRleHQsIGdyb3Vwc1tpXS5vcHRpb25zKTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy5oaWdobGlnaHRfZHJhdykge1xuICAgICAgICAgICAgdGhpcy5fdGV4dF9jYW52YXMuZHJhd19yZWN0YW5nbGUobGVmdCwgeSwgd2lkdGgsIHRoaXMuZ2V0X3Jvd19oZWlnaHQoaSksIHtcbiAgICAgICAgICAgICAgICBmaWxsX2NvbG9yOiB1dGlscy5yYW5kb21fY29sb3IoKSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fdGV4dF9jYW52YXMuZHJhd190ZXh0KGxlZnQsIHksIGdyb3Vwc1tpXS50ZXh0LCBncm91cHNbaV0ub3B0aW9ucyk7XG4gICAgICAgIGxlZnQgKz0gd2lkdGg7XG4gICAgfVxufTtcblxuLyoqXG4gKiBHZXQgcmVuZGVyIGdyb3VwcyBmb3IgYSByb3cuXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBpbmRleCBvZiB0aGUgcm93XG4gKiBAcmV0dXJuIHthcnJheX0gYXJyYXkgb2YgcmVuZGVyaW5ncywgZWFjaCByZW5kZXJpbmcgaXMgYW4gYXJyYXkgb2ZcbiAqICAgICAgICAgICAgICAgICB0aGUgZm9ybSB7b3B0aW9ucywgdGV4dH0uXG4gKi9cbkhpZ2hsaWdodGVkUm93UmVuZGVyZXIucHJvdG90eXBlLl9nZXRfZ3JvdXBzID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICBpZiAoaW5kZXggPCAwIHx8IHRoaXMuX21vZGVsLl9yb3dzLmxlbmd0aCA8PSBpbmRleCkgcmV0dXJuO1xuXG4gICAgdmFyIHJvd190ZXh0ID0gdGhpcy5fbW9kZWwuX3Jvd3NbaW5kZXhdO1xuICAgIHZhciBncm91cHMgPSBbXTtcbiAgICB2YXIgbGFzdF9zeW50YXggPSBudWxsO1xuICAgIHZhciBjaGFyX2luZGV4ID0gMDtcbiAgICB2YXIgc3RhcnQgPSAwO1xuICAgIGZvciAoY2hhcl9pbmRleDsgY2hhcl9pbmRleDxyb3dfdGV4dC5sZW5ndGg7IGNoYXJfaW5kZXgrKykge1xuICAgICAgICB2YXIgc3ludGF4ID0gdGhpcy5fbW9kZWwuZ2V0X3RhZ3MoaW5kZXgsIGNoYXJfaW5kZXgpLnN5bnRheDtcbiAgICAgICAgaWYgKCF0aGlzLl9jb21wYXJlX3N5bnRheChsYXN0X3N5bnRheCxzeW50YXgpKSB7XG4gICAgICAgICAgICBpZiAoY2hhcl9pbmRleCAhPT0gMCkge1xuICAgICAgICAgICAgICAgIGdyb3Vwcy5wdXNoKHtvcHRpb25zOiB0aGlzLl9nZXRfb3B0aW9ucyhsYXN0X3N5bnRheCksIHRleHQ6IHJvd190ZXh0LnN1YnN0cmluZyhzdGFydCwgY2hhcl9pbmRleCl9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxhc3Rfc3ludGF4ID0gc3ludGF4O1xuICAgICAgICAgICAgc3RhcnQgPSBjaGFyX2luZGV4O1xuICAgICAgICB9XG4gICAgfVxuICAgIGdyb3Vwcy5wdXNoKHtvcHRpb25zOiB0aGlzLl9nZXRfb3B0aW9ucyhsYXN0X3N5bnRheCksIHRleHQ6IHJvd190ZXh0LnN1YnN0cmluZyhzdGFydCl9KTtcblxuICAgIHJldHVybiBncm91cHM7XG59O1xuXG4vKipcbiAqIENyZWF0ZXMgYSBzdHlsZSBvcHRpb25zIGRpY3Rpb25hcnkgZnJvbSBhIHN5bnRheCB0YWcuXG4gKiBAcGFyYW0gIHtzdHJpbmd9IHN5bnRheFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuSGlnaGxpZ2h0ZWRSb3dSZW5kZXJlci5wcm90b3R5cGUuX2dldF9vcHRpb25zID0gZnVuY3Rpb24oc3ludGF4KSB7XG4gICAgdmFyIHJlbmRlcl9vcHRpb25zID0gdXRpbHMuc2hhbGxvd19jb3B5KHRoaXMuX2Jhc2Vfb3B0aW9ucyk7XG5cbiAgICBpZiAoc3ludGF4ICYmIHRoaXMuc3R5bGUgJiYgdGhpcy5zdHlsZVtzeW50YXhdKSB7XG4gICAgICAgIHJlbmRlcl9vcHRpb25zLmNvbG9yID0gdGhpcy5zdHlsZVtzeW50YXhdO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJlbmRlcl9vcHRpb25zLmNvbG9yID0gdGhpcy5zdHlsZS50ZXh0IHx8ICdibGFjayc7XG4gICAgfVxuICAgIFxuICAgIHJldHVybiByZW5kZXJfb3B0aW9ucztcbn07XG5cbi8qKlxuICogQ29tcGFyZSB0d28gc3ludGF4cy5cbiAqIEBwYXJhbSAge3N0cmluZ30gYSAtIHN5bnRheFxuICogQHBhcmFtICB7c3RyaW5nfSBiIC0gc3ludGF4XG4gKiBAcmV0dXJuIHtib29sfSB0cnVlIGlmIGEgYW5kIGIgYXJlIGVxdWFsXG4gKi9cbkhpZ2hsaWdodGVkUm93UmVuZGVyZXIucHJvdG90eXBlLl9jb21wYXJlX3N5bnRheCA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgICByZXR1cm4gYSA9PT0gYjtcbn07XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuSGlnaGxpZ2h0ZWRSb3dSZW5kZXJlciA9IEhpZ2hsaWdodGVkUm93UmVuZGVyZXI7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgY2FudmFzID0gcmVxdWlyZSgnLi4vY2FudmFzLmpzJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy5qcycpO1xuXG4vKipcbiAqIFJlbmRlcnMgdG8gYSBjYW52YXNcbiAqIEBwYXJhbSB7Q2FudmFzfSBkZWZhdWx0X2NhbnZhc1xuICovXG52YXIgUmVuZGVyZXJCYXNlID0gZnVuY3Rpb24oZGVmYXVsdF9jYW52YXMsIG9wdGlvbnMpIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgdGhpcy5fY2FudmFzID0gZGVmYXVsdF9jYW52YXMgPyBkZWZhdWx0X2NhbnZhcyA6IG5ldyBjYW52YXMuQ2FudmFzKCk7XG4gICAgXG4gICAgLy8gQ3JlYXRlIHByb3BlcnRpZXMuXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMucHJvcGVydHkoJ3dpZHRoJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Ll9jYW52YXMud2lkdGg7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC5fY2FudmFzLndpZHRoID0gdmFsdWU7XG4gICAgfSk7XG4gICAgdGhpcy5wcm9wZXJ0eSgnaGVpZ2h0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Ll9jYW52YXMuaGVpZ2h0O1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQuX2NhbnZhcy5oZWlnaHQgPSB2YWx1ZTtcbiAgICB9KTtcbn07XG51dGlscy5pbmhlcml0KFJlbmRlcmVyQmFzZSwgdXRpbHMuUG9zdGVyQ2xhc3MpO1xuXG4vKipcbiAqIFJlbmRlciB0byB0aGUgY2FudmFzXG4gKiBAcGFyYW0ge2RpY3Rpb25hcnl9IChvcHRpb25hbCkgc2Nyb2xsIC0gSG93IG11Y2ggdGhlIGNhbnZhcyB3YXMgc2Nyb2xsZWQuICBUaGlzXG4gKiAgICAgICAgICAgICAgICAgICAgIGlzIGEgZGljdGlvbmFyeSBvZiB0aGUgZm9ybSB7eDogZmxvYXQsIHk6IGZsb2F0fVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuUmVuZGVyZXJCYXNlLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbihzY3JvbGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ05vdCBpbXBsZW1lbnRlZCcpO1xufTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5SZW5kZXJlckJhc2UgPSBSZW5kZXJlckJhc2U7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgY2FudmFzID0gcmVxdWlyZSgnLi4vY2FudmFzLmpzJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy5qcycpO1xudmFyIHJlbmRlcmVyID0gcmVxdWlyZSgnLi9yZW5kZXJlci5qcycpO1xuXG4vKipcbiAqIFJlbmRlciB0aGUgdGV4dCByb3dzIG9mIGEgRG9jdW1lbnRNb2RlbC5cbiAqIEBwYXJhbSB7RG9jdW1lbnRNb2RlbH0gbW9kZWwgaW5zdGFuY2VcbiAqL1xudmFyIFJvd1JlbmRlcmVyID0gZnVuY3Rpb24obW9kZWwsIHNjcm9sbGluZ19jYW52YXMpIHtcbiAgICB0aGlzLl9tb2RlbCA9IG1vZGVsO1xuICAgIHRoaXMuX3Zpc2libGVfcm93X2NvdW50ID0gMDtcblxuICAgIC8vIFNldHVwIGNhbnZhc2VzXG4gICAgdGhpcy5fdGV4dF9jYW52YXMgPSBuZXcgY2FudmFzLkNhbnZhcygpO1xuICAgIHRoaXMuX3RtcF9jYW52YXMgPSBuZXcgY2FudmFzLkNhbnZhcygpO1xuICAgIHRoaXMuX3Njcm9sbGluZ19jYW52YXMgPSBzY3JvbGxpbmdfY2FudmFzO1xuXG4gICAgLy8gQmFzZVxuICAgIHJlbmRlcmVyLlJlbmRlcmVyQmFzZS5jYWxsKHRoaXMpO1xuXG4gICAgLy8gU2V0IHNvbWUgYmFzaWMgcmVuZGVyaW5nIHByb3BlcnRpZXMuXG4gICAgdGhpcy5fYmFzZV9vcHRpb25zID0ge1xuICAgICAgICBmb250X2ZhbWlseTogJ21vbm9zcGFjZScsXG4gICAgICAgIGZvbnRfc2l6ZTogMTIsXG4gICAgfTtcbiAgICB0aGlzLl9saW5lX3NwYWNpbmcgPSAyO1xuXG4gICAgLy8gQ3JlYXRlIHByb3BlcnRpZXMuXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMucHJvcGVydHkoJ3dpZHRoJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Ll9jYW52YXMud2lkdGg7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC5fY2FudmFzLndpZHRoID0gdmFsdWU7XG4gICAgICAgIHRoYXQuX3RleHRfY2FudmFzLndpZHRoID0gdmFsdWU7XG4gICAgICAgIHRoYXQuX3RtcF9jYW52YXMud2lkdGggPSB2YWx1ZTtcbiAgICB9KTtcbiAgICB0aGlzLnByb3BlcnR5KCdoZWlnaHQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoYXQuX2NhbnZhcy5oZWlnaHQ7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC5fY2FudmFzLmhlaWdodCA9IHZhbHVlO1xuXG4gICAgICAgIC8vIFRoZSB0ZXh0IGNhbnZhcyBzaG91bGQgYmUgdGhlIHJpZ2h0IGhlaWdodCB0byBmaXQgYWxsIG9mIHRoZSBsaW5lc1xuICAgICAgICAvLyB0aGF0IHdpbGwgYmUgcmVuZGVyZWQgaW4gdGhlIGJhc2UgY2FudmFzLiAgVGhpcyBpbmNsdWRlcyB0aGUgbGluZXNcbiAgICAgICAgLy8gdGhhdCBhcmUgcGFydGlhbGx5IHJlbmRlcmVkIGF0IHRoZSB0b3AgYW5kIGJvdHRvbSBvZiB0aGUgYmFzZSBjYW52YXMuXG4gICAgICAgIHZhciByb3dfaGVpZ2h0ID0gdGhhdC5nZXRfcm93X2hlaWdodCgpO1xuICAgICAgICB0aGF0Ll92aXNpYmxlX3Jvd19jb3VudCA9IE1hdGguY2VpbCh2YWx1ZS9yb3dfaGVpZ2h0KSArIDE7XG4gICAgICAgIHRoYXQuX3RleHRfY2FudmFzLmhlaWdodCA9IHRoYXQuX3Zpc2libGVfcm93X2NvdW50ICogcm93X2hlaWdodDtcbiAgICAgICAgdGhhdC5fdG1wX2NhbnZhcy5oZWlnaHQgPSB0aGF0Ll90ZXh0X2NhbnZhcy5oZWlnaHQ7XG4gICAgfSk7XG5cbiAgICAvLyBTZXQgaW5pdGlhbCBjYW52YXMgc2l6ZXMuICBUaGVzZSBsaW5lcyBtYXkgbG9vayByZWR1bmRhbnQsIGJ1dCBiZXdhcmVcbiAgICAvLyBiZWNhdXNlIHRoZXkgYWN0dWFsbHkgY2F1c2UgYW4gYXBwcm9wcmlhdGUgd2lkdGggYW5kIGhlaWdodCB0byBiZSBzZXQgZm9yXG4gICAgLy8gdGhlIHRleHQgY2FudmFzIGJlY2F1c2Ugb2YgdGhlIHByb3BlcnRpZXMgZGVjbGFyZWQgYWJvdmUuXG4gICAgdGhpcy53aWR0aCA9IHRoaXMuX2NhbnZhcy53aWR0aDtcbiAgICB0aGlzLmhlaWdodCA9IHRoaXMuX2NhbnZhcy5oZWlnaHQ7XG5cbiAgICB0aGlzLl9tb2RlbC5vbigndGV4dF9jaGFuZ2VkJywgdXRpbHMucHJveHkodGhpcy5faGFuZGxlX3ZhbHVlX2NoYW5nZWQsIHRoaXMpKTtcbiAgICB0aGlzLl9tb2RlbC5vbigncm93c19hZGRlZCcsIHV0aWxzLnByb3h5KHRoaXMuX2hhbmRsZV9yb3dzX2FkZGVkLCB0aGlzKSk7XG4gICAgdGhpcy5fbW9kZWwub24oJ3Jvd19jaGFuZ2VkJywgdXRpbHMucHJveHkodGhpcy5faGFuZGxlX3Jvd19jaGFuZ2VkLCB0aGlzKSk7IC8vIFRPRE86IEltcGxlbWVudCBteSBldmVudC5cbn07XG51dGlscy5pbmhlcml0KFJvd1JlbmRlcmVyLCByZW5kZXJlci5SZW5kZXJlckJhc2UpO1xuXG4vKipcbiAqIFJlbmRlciB0byB0aGUgY2FudmFzXG4gKiBOb3RlOiBUaGlzIG1ldGhvZCBpcyBjYWxsZWQgb2Z0ZW4sIHNvIGl0J3MgaW1wb3J0YW50IHRoYXQgaXQnc1xuICogb3B0aW1pemVkIGZvciBzcGVlZC5cbiAqIEBwYXJhbSB7ZGljdGlvbmFyeX0gKG9wdGlvbmFsKSBzY3JvbGwgLSBIb3cgbXVjaCB0aGUgY2FudmFzIHdhcyBzY3JvbGxlZC4gIFRoaXNcbiAqICAgICAgICAgICAgICAgICAgICAgaXMgYSBkaWN0aW9uYXJ5IG9mIHRoZSBmb3JtIHt4OiBmbG9hdCwgeTogZmxvYXR9XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24oc2Nyb2xsKSB7XG5cbiAgICAvLyBJZiBvbmx5IHRoZSB5IGF4aXMgd2FzIHNjcm9sbGVkLCBibGl0IHRoZSBnb29kIGNvbnRlbnRzIGFuZCBqdXN0IHJlbmRlclxuICAgIC8vIHdoYXQncyBtaXNzaW5nLlxuICAgIHZhciBwYXJ0aWFsX3JlZHJhdyA9IChzY3JvbGwgJiYgc2Nyb2xsLnggPT09IDAgJiYgTWF0aC5hYnMoc2Nyb2xsLnkpIDwgdGhpcy5fY2FudmFzLmhlaWdodCk7XG5cbiAgICAvLyBVcGRhdGUgdGhlIHRleHQgcmVuZGVyaW5nXG4gICAgdmFyIHZpc2libGVfcm93cyA9IHRoaXMuZ2V0X3Zpc2libGVfcm93cygpO1xuICAgIHRoaXMuX3JlbmRlcl90ZXh0X2NhbnZhcygtdGhpcy5fc2Nyb2xsaW5nX2NhbnZhcy5zY3JvbGxfbGVmdCwgdmlzaWJsZV9yb3dzLnRvcF9yb3csICFwYXJ0aWFsX3JlZHJhdyk7XG5cbiAgICAvLyBDb3B5IHRoZSB0ZXh0IGltYWdlIHRvIHRoaXMgY2FudmFzXG4gICAgdGhpcy5fY2FudmFzLmNsZWFyKCk7XG4gICAgdGhpcy5fY2FudmFzLmRyYXdfaW1hZ2UoXG4gICAgICAgIHRoaXMuX3RleHRfY2FudmFzLCBcbiAgICAgICAgdGhpcy5fc2Nyb2xsaW5nX2NhbnZhcy5zY3JvbGxfbGVmdCwgXG4gICAgICAgIHRoaXMuZ2V0X3Jvd190b3AodmlzaWJsZV9yb3dzLnRvcF9yb3cpKTtcbn07XG5cbi8qKlxuICogUmVuZGVyIHRleHQgdG8gdGhlIHRleHQgY2FudmFzLlxuICpcbiAqIExhdGVyLCB0aGUgbWFpbiByZW5kZXJpbmcgZnVuY3Rpb24gY2FuIHVzZSB0aGlzIHJlbmRlcmVkIHRleHQgdG8gZHJhdyB0aGVcbiAqIGJhc2UgY2FudmFzLlxuICogQHBhcmFtICB7ZmxvYXR9IHhfb2Zmc2V0IC0gaG9yaXpvbnRhbCBvZmZzZXQgb2YgdGhlIHRleHRcbiAqIEBwYXJhbSAge2ludGVnZXJ9IHRvcF9yb3dcbiAqIEBwYXJhbSAge2Jvb2xlYW59IGZvcmNlX3JlZHJhdyAtIHJlZHJhdyB0aGUgY29udGVudHMgZXZlbiBpZiB0aGV5IGFyZVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoZSBzYW1lIGFzIHRoZSBjYWNoZWQgY29udGVudHMuXG4gKiBAcmV0dXJuIHtudWxsfSAgICAgICAgICBcbiAqL1xuUm93UmVuZGVyZXIucHJvdG90eXBlLl9yZW5kZXJfdGV4dF9jYW52YXMgPSBmdW5jdGlvbih4X29mZnNldCwgdG9wX3JvdywgZm9yY2VfcmVkcmF3KSB7XG5cbiAgICAvLyBUcnkgdG8gcmV1c2Ugc29tZSBvZiB0aGUgYWxyZWFkeSByZW5kZXJlZCB0ZXh0IGlmIHBvc3NpYmxlLlxuICAgIHZhciByZW5kZXJlZCA9IGZhbHNlO1xuICAgIHZhciByb3dfaGVpZ2h0ID0gdGhpcy5nZXRfcm93X2hlaWdodCgpO1xuICAgIGlmICghZm9yY2VfcmVkcmF3ICYmIHRoaXMuX2xhc3RfcmVuZGVyZWRfb2Zmc2V0ID09PSB4X29mZnNldCkge1xuICAgICAgICB2YXIgbGFzdF90b3AgPSB0aGlzLl9sYXN0X3JlbmRlcmVkX3JvdztcbiAgICAgICAgdmFyIHNjcm9sbCA9IHRvcF9yb3cgLSBsYXN0X3RvcDsgLy8gUG9zaXRpdmUgPSB1c2VyIHNjcm9sbGluZyBkb3dud2FyZC5cbiAgICAgICAgaWYgKHNjcm9sbCA8IHRoaXMuX2xhc3RfcmVuZGVyZWRfcm93X2NvdW50KSB7XG5cbiAgICAgICAgICAgIC8vIEdldCBhIHNuYXBzaG90IG9mIHRoZSB0ZXh0IGJlZm9yZSB0aGUgc2Nyb2xsLlxuICAgICAgICAgICAgdGhpcy5fdG1wX2NhbnZhcy5jbGVhcigpO1xuICAgICAgICAgICAgdGhpcy5fdG1wX2NhbnZhcy5kcmF3X2ltYWdlKHRoaXMuX3RleHRfY2FudmFzLCAwLCAwKTtcblxuICAgICAgICAgICAgLy8gUmVuZGVyIHRoZSBuZXcgdGV4dC5cbiAgICAgICAgICAgIHZhciBzYXZlZF9yb3dzID0gdGhpcy5fbGFzdF9yZW5kZXJlZF9yb3dfY291bnQgLSBNYXRoLmFicyhzY3JvbGwpO1xuICAgICAgICAgICAgdmFyIG5ld19yb3dzID0gdGhpcy5fdmlzaWJsZV9yb3dfY291bnQgLSBzYXZlZF9yb3dzO1xuICAgICAgICAgICAgaWYgKHNjcm9sbCA+IDApIHtcbiAgICAgICAgICAgICAgICAvLyBSZW5kZXIgdGhlIGJvdHRvbS5cbiAgICAgICAgICAgICAgICB0aGlzLl90ZXh0X2NhbnZhcy5jbGVhcigpO1xuICAgICAgICAgICAgICAgIGZvciAoaSA9IHRvcF9yb3crc2F2ZWRfcm93czsgaSA8IHRvcF9yb3crdGhpcy5fdmlzaWJsZV9yb3dfY291bnQ7IGkrKykgeyAgICAgXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3JlbmRlcl9yb3coaSwgeF9vZmZzZXQsIChpIC0gdG9wX3JvdykgKiByb3dfaGVpZ2h0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHNjcm9sbCA8IDApIHtcbiAgICAgICAgICAgICAgICAvLyBSZW5kZXIgdGhlIHRvcC5cbiAgICAgICAgICAgICAgICB0aGlzLl90ZXh0X2NhbnZhcy5jbGVhcigpO1xuICAgICAgICAgICAgICAgIGZvciAoaSA9IHRvcF9yb3c7IGkgPCB0b3Bfcm93K25ld19yb3dzOyBpKyspIHsgICBcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fcmVuZGVyX3JvdyhpLCB4X29mZnNldCwgKGkgLSB0b3Bfcm93KSAqIHJvd19oZWlnaHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gTm90aGluZyBoYXMgY2hhbmdlZC5cbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVzZSB0aGUgb2xkIGNvbnRlbnQgdG8gZmlsbCBpbiB0aGUgcmVzdC5cbiAgICAgICAgICAgIHRoaXMuX3RleHRfY2FudmFzLmRyYXdfaW1hZ2UodGhpcy5fdG1wX2NhbnZhcywgMCwgLXNjcm9sbCAqIHRoaXMuZ2V0X3Jvd19oZWlnaHQoKSk7XG4gICAgICAgICAgICB0aGlzLnRyaWdnZXIoJ3Jvd3NfY2hhbmdlZCcsIHRvcF9yb3csIHRvcF9yb3cgKyB0aGlzLl92aXNpYmxlX3Jvd19jb3VudCAtIDEpO1xuICAgICAgICAgICAgcmVuZGVyZWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gRnVsbCByZW5kZXJpbmcuXG4gICAgaWYgKCFyZW5kZXJlZCkge1xuICAgICAgICB0aGlzLl90ZXh0X2NhbnZhcy5jbGVhcigpO1xuXG4gICAgICAgIC8vIFJlbmRlciB0aWxsIHRoZXJlIGFyZSBubyByb3dzIGxlZnQsIG9yIHRoZSB0b3Agb2YgdGhlIHJvdyBpc1xuICAgICAgICAvLyBiZWxvdyB0aGUgYm90dG9tIG9mIHRoZSB2aXNpYmxlIGFyZWEuXG4gICAgICAgIGZvciAoaSA9IHRvcF9yb3c7IGkgPCB0b3Bfcm93ICsgdGhpcy5fdmlzaWJsZV9yb3dfY291bnQ7IGkrKykgeyAgICAgICAgXG4gICAgICAgICAgICB0aGlzLl9yZW5kZXJfcm93KGksIHhfb2Zmc2V0LCAoaSAtIHRvcF9yb3cpICogcm93X2hlaWdodCk7XG4gICAgICAgIH0gICBcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdyb3dzX2NoYW5nZWQnLCB0b3Bfcm93LCB0b3Bfcm93ICsgdGhpcy5fdmlzaWJsZV9yb3dfY291bnQgLSAxKTtcbiAgICB9XG5cbiAgICAvLyBSZW1lbWJlciBmb3IgZGVsdGEgcmVuZGVyaW5nLlxuICAgIHRoaXMuX2xhc3RfcmVuZGVyZWRfcm93ID0gdG9wX3JvdztcbiAgICB0aGlzLl9sYXN0X3JlbmRlcmVkX3Jvd19jb3VudCA9IHRoaXMuX3Zpc2libGVfcm93X2NvdW50O1xuICAgIHRoaXMuX2xhc3RfcmVuZGVyZWRfb2Zmc2V0ID0geF9vZmZzZXQ7XG59O1xuXG4vKipcbiAqIEdldHMgdGhlIHJvdyBhbmQgY2hhcmFjdGVyIGluZGljaWVzIGNsb3Nlc3QgdG8gZ2l2ZW4gY29udHJvbCBzcGFjZSBjb29yZGluYXRlcy5cbiAqIEBwYXJhbSAge2Zsb2F0fSBjdXJzb3JfeCAtIHggdmFsdWUsIDAgaXMgdGhlIGxlZnQgb2YgdGhlIGNhbnZhcy5cbiAqIEBwYXJhbSAge2Zsb2F0fSBjdXJzb3JfeSAtIHkgdmFsdWUsIDAgaXMgdGhlIHRvcCBvZiB0aGUgY2FudmFzLlxuICogQHJldHVybiB7ZGljdGlvbmFyeX0gZGljdGlvbmFyeSBvZiB0aGUgZm9ybSB7cm93X2luZGV4LCBjaGFyX2luZGV4fVxuICovXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuZ2V0X3Jvd19jaGFyID0gZnVuY3Rpb24oY3Vyc29yX3gsIGN1cnNvcl95KSB7XG4gICAgdmFyIHJvd19pbmRleCA9IE1hdGguZmxvb3IoY3Vyc29yX3kgLyB0aGlzLmdldF9yb3dfaGVpZ2h0KCkpO1xuXG4gICAgLy8gRmluZCB0aGUgY2hhcmFjdGVyIGluZGV4LlxuICAgIHZhciB3aWR0aHMgPSBbMF07XG4gICAgdHJ5IHtcbiAgICAgICAgZm9yICh2YXIgbGVuZ3RoPTE7IGxlbmd0aDw9dGhpcy5fbW9kZWwuX3Jvd3Nbcm93X2luZGV4XS5sZW5ndGg7IGxlbmd0aCsrKSB7XG4gICAgICAgICAgICB3aWR0aHMucHVzaCh0aGlzLm1lYXN1cmVfcGFydGlhbF9yb3dfd2lkdGgocm93X2luZGV4LCBsZW5ndGgpKTtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gTm9tIG5vbSBub20uLi5cbiAgICB9XG4gICAgdmFyIGNvb3JkcyA9IHRoaXMuX21vZGVsLnZhbGlkYXRlX2Nvb3Jkcyhyb3dfaW5kZXgsIHV0aWxzLmZpbmRfY2xvc2VzdCh3aWR0aHMsIGN1cnNvcl94ICsgdGhpcy5fc2Nyb2xsaW5nX2NhbnZhcy5zY3JvbGxfbGVmdCkpO1xuICAgIHJldHVybiB7XG4gICAgICAgIHJvd19pbmRleDogY29vcmRzLnN0YXJ0X3JvdyxcbiAgICAgICAgY2hhcl9pbmRleDogY29vcmRzLnN0YXJ0X2NoYXIsXG4gICAgfTtcbn07XG5cbi8qKlxuICogTWVhc3VyZXMgdGhlIHBhcnRpYWwgd2lkdGggb2YgYSB0ZXh0IHJvdy5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IGluZGV4XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSAob3B0aW9uYWwpIGxlbmd0aCAtIG51bWJlciBvZiBjaGFyYWN0ZXJzXG4gKiBAcmV0dXJuIHtmbG9hdH0gd2lkdGhcbiAqL1xuUm93UmVuZGVyZXIucHJvdG90eXBlLm1lYXN1cmVfcGFydGlhbF9yb3dfd2lkdGggPSBmdW5jdGlvbihpbmRleCwgbGVuZ3RoKSB7XG4gICAgaWYgKDAgPiBpbmRleCB8fCBpbmRleCA+PSB0aGlzLl9tb2RlbC5fcm93cy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIDA7IFxuICAgIH1cblxuICAgIHZhciB0ZXh0ID0gdGhpcy5fbW9kZWwuX3Jvd3NbaW5kZXhdO1xuICAgIHRleHQgPSAobGVuZ3RoID09PSB1bmRlZmluZWQpID8gdGV4dCA6IHRleHQuc3Vic3RyaW5nKDAsIGxlbmd0aCk7XG5cbiAgICByZXR1cm4gdGhpcy5fY2FudmFzLm1lYXN1cmVfdGV4dCh0ZXh0LCB0aGlzLl9iYXNlX29wdGlvbnMpO1xufTtcblxuLyoqXG4gKiBNZWFzdXJlcyB0aGUgaGVpZ2h0IG9mIGEgdGV4dCByb3cgYXMgaWYgaXQgd2VyZSByZW5kZXJlZC5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IChvcHRpb25hbCkgaW5kZXhcbiAqIEByZXR1cm4ge2Zsb2F0fSBoZWlnaHRcbiAqL1xuUm93UmVuZGVyZXIucHJvdG90eXBlLmdldF9yb3dfaGVpZ2h0ID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICByZXR1cm4gdGhpcy5fYmFzZV9vcHRpb25zLmZvbnRfc2l6ZSArIHRoaXMuX2xpbmVfc3BhY2luZztcbn07XG5cbi8qKlxuICogR2V0cyB0aGUgdG9wIG9mIHRoZSByb3cgd2hlbiByZW5kZXJlZFxuICogQHBhcmFtICB7aW50ZWdlcn0gaW5kZXhcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5nZXRfcm93X3RvcCA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgcmV0dXJuIGluZGV4ICogdGhpcy5nZXRfcm93X2hlaWdodCgpO1xufTtcblxuLyoqXG4gKiBHZXRzIHRoZSB2aXNpYmxlIHJvd3MuXG4gKiBAcmV0dXJuIHtkaWN0aW9uYXJ5fSBkaWN0aW9uYXJ5IGNvbnRhaW5pbmcgaW5mb3JtYXRpb24gYWJvdXQgXG4gKiAgICAgICAgICAgICAgICAgICAgICB0aGUgdmlzaWJsZSByb3dzLiAgRm9ybWF0IHt0b3Bfcm93LCBcbiAqICAgICAgICAgICAgICAgICAgICAgIGJvdHRvbV9yb3csIHJvd19jb3VudH0uXG4gKi9cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5nZXRfdmlzaWJsZV9yb3dzID0gZnVuY3Rpb24oKSB7XG5cbiAgICAvLyBGaW5kIHRoZSByb3cgY2xvc2VzdCB0byB0aGUgc2Nyb2xsIHRvcC4gIElmIHRoYXQgcm93IGlzIGJlbG93XG4gICAgLy8gdGhlIHNjcm9sbCB0b3AsIHVzZSB0aGUgcGFydGlhbGx5IGRpc3BsYXllZCByb3cgYWJvdmUgaXQuXG4gICAgdmFyIHRvcF9yb3cgPSBNYXRoLm1heCgwLCBNYXRoLmZsb29yKHRoaXMuX3Njcm9sbGluZ19jYW52YXMuc2Nyb2xsX3RvcCAgLyB0aGlzLmdldF9yb3dfaGVpZ2h0KCkpKTtcblxuICAgIC8vIEZpbmQgdGhlIHJvdyBjbG9zZXN0IHRvIHRoZSBzY3JvbGwgYm90dG9tLiAgSWYgdGhhdCByb3cgaXMgYWJvdmVcbiAgICAvLyB0aGUgc2Nyb2xsIGJvdHRvbSwgdXNlIHRoZSBwYXJ0aWFsbHkgZGlzcGxheWVkIHJvdyBiZWxvdyBpdC5cbiAgICB2YXIgcm93X2NvdW50ID0gTWF0aC5jZWlsKHRoaXMuX2NhbnZhcy5oZWlnaHQgLyB0aGlzLmdldF9yb3dfaGVpZ2h0KCkpO1xuICAgIHZhciBib3R0b21fcm93ID0gdG9wX3JvdyArIHJvd19jb3VudDtcblxuICAgIC8vIFJvdyBjb3VudCArIDEgdG8gaW5jbHVkZSBmaXJzdCByb3cuXG4gICAgcmV0dXJuIHt0b3Bfcm93OiB0b3Bfcm93LCBib3R0b21fcm93OiBib3R0b21fcm93LCByb3dfY291bnQ6IHJvd19jb3VudCsxfTtcbn07XG5cbi8qKlxuICogSGFuZGxlcyB3aGVuIHRoZSBtb2RlbCdzIHZhbHVlIGNoYW5nZXNcbiAqIENvbXBsZXhpdHk6IE8oTikgZm9yIE4gcm93cyBvZiB0ZXh0LlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuUm93UmVuZGVyZXIucHJvdG90eXBlLl9oYW5kbGVfdmFsdWVfY2hhbmdlZCA9IGZ1bmN0aW9uKCkge1xuXG4gICAgLy8gQ2FsY3VsYXRlIHRoZSBkb2N1bWVudCB3aWR0aC5cbiAgICB2YXIgZG9jdW1lbnRfd2lkdGggPSAwO1xuICAgIGZvciAodmFyIGk9MDsgaTx0aGlzLl9tb2RlbC5fcm93cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBkb2N1bWVudF93aWR0aCA9IE1hdGgubWF4KHRoaXMuX21lYXN1cmVfcm93X3dpZHRoKGkpLCBkb2N1bWVudF93aWR0aCk7XG4gICAgfVxuICAgIHRoaXMuX3Njcm9sbGluZ19jYW52YXMuc2Nyb2xsX3dpZHRoID0gZG9jdW1lbnRfd2lkdGg7XG4gICAgdGhpcy5fc2Nyb2xsaW5nX2NhbnZhcy5zY3JvbGxfaGVpZ2h0ID0gdGhpcy5fbW9kZWwuX3Jvd3MubGVuZ3RoICogdGhpcy5nZXRfcm93X2hlaWdodCgpO1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIHdoZW4gb25lIG9mIHRoZSBtb2RlbCdzIHJvd3MgY2hhbmdlXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuX2hhbmRsZV9yb3dfY2hhbmdlZCA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgdGhpcy5fc2Nyb2xsaW5nX2NhbnZhcy5zY3JvbGxfd2lkdGggPSBNYXRoLm1heCh0aGlzLl9tZWFzdXJlX3Jvd193aWR0aChpbmRleCksIHRoaXMuX3Njcm9sbGluZ19jYW52YXMuc2Nyb2xsX3dpZHRoKTtcbn07XG5cbi8qKlxuICogSGFuZGxlcyB3aGVuIG9uZSBvciBtb3JlIHJvd3MgYXJlIGFkZGVkIHRvIHRoZSBtb2RlbFxuICpcbiAqIEFzc3VtZXMgY29uc3RhbnQgcm93IGhlaWdodC5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IHN0YXJ0XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBlbmRcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5faGFuZGxlX3Jvd3NfYWRkZWQgPSBmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gICAgdGhpcy5fc2Nyb2xsaW5nX2NhbnZhcy5zY3JvbGxfaGVpZ2h0ICs9IChlbmQgLSBzdGFydCArIDEpICogdGhpcy5nZXRfcm93X2hlaWdodCgpO1xuICAgIHZhciB3aWR0aCA9IHRoaXMuX3Njcm9sbGluZ19jYW52YXMuc2Nyb2xsX3dpZHRoO1xuICAgIGZvciAodmFyIGkgPSBzdGFydDsgaSA8PSBlbmQ7IGkrKykgeyBcbiAgICAgICAgd2lkdGggPSBNYXRoLm1heCh0aGlzLl9tZWFzdXJlX3Jvd193aWR0aChpbmRleCksIHdpZHRoKTtcbiAgICB9XG4gICAgdGhpcy5fc2Nyb2xsaW5nX2NhbnZhcy5zY3JvbGxfd2lkdGggPSB3aWR0aDtcbn07XG5cbi8qKlxuICogUmVuZGVyIGEgc2luZ2xlIHJvd1xuICogQHBhcmFtICB7aW50ZWdlcn0gaW5kZXhcbiAqIEBwYXJhbSAge2Zsb2F0fSB4XG4gKiBAcGFyYW0gIHtmbG9hdH0geVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuUm93UmVuZGVyZXIucHJvdG90eXBlLl9yZW5kZXJfcm93ID0gZnVuY3Rpb24oaW5kZXgsIHggLHkpIHtcbiAgICB0aGlzLl90ZXh0X2NhbnZhcy5kcmF3X3RleHQoeCwgeSwgdGhpcy5fbW9kZWwuX3Jvd3NbaW5kZXhdLCB0aGlzLl9iYXNlX29wdGlvbnMpO1xufTtcblxuLyoqXG4gKiBNZWFzdXJlcyB0aGUgd2lkdGggb2YgYSB0ZXh0IHJvdyBhcyBpZiBpdCB3ZXJlIHJlbmRlcmVkLlxuICogQHBhcmFtICB7aW50ZWdlcn0gaW5kZXhcbiAqIEByZXR1cm4ge2Zsb2F0fSB3aWR0aFxuICovXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuX21lYXN1cmVfcm93X3dpZHRoID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICByZXR1cm4gdGhpcy5tZWFzdXJlX3BhcnRpYWxfcm93X3dpZHRoKGluZGV4LCB0aGlzLl9tb2RlbC5fcm93c1tpbmRleF0ubGVuZ3RoKTtcbn07XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuUm93UmVuZGVyZXIgPSBSb3dSZW5kZXJlcjtcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbnZhciBhbmltYXRvciA9IHJlcXVpcmUoJy4uL2FuaW1hdG9yLmpzJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy5qcycpO1xudmFyIHJlbmRlcmVyID0gcmVxdWlyZSgnLi9yZW5kZXJlci5qcycpO1xuXG4vKipcbiAqIFJlbmRlciBkb2N1bWVudCBzZWxlY3Rpb24gYm94ZXNcbiAqXG4gKiBUT0RPOiBPbmx5IHJlbmRlciB2aXNpYmxlLlxuICovXG52YXIgU2VsZWN0aW9uc1JlbmRlcmVyID0gZnVuY3Rpb24oY3Vyc29ycywgc3R5bGUsIHJvd19yZW5kZXJlciwgaGFzX2ZvY3VzLCBjdXJzb3JzX3JlbmRlcmVyKSB7XG4gICAgcmVuZGVyZXIuUmVuZGVyZXJCYXNlLmNhbGwodGhpcyk7XG4gICAgdGhpcy5zdHlsZSA9IHN0eWxlO1xuICAgIHRoaXMuX2hhc19mb2N1cyA9IGhhc19mb2N1cztcblxuICAgIC8vIFdoZW4gdGhlIGN1cnNvcnMgY2hhbmdlLCByZWRyYXcgdGhlIHNlbGVjdGlvbiBib3goZXMpLlxuICAgIHRoaXMuX2N1cnNvcnMgPSBjdXJzb3JzO1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLl9jdXJzb3JzLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhhdC5yZW5kZXIoKTtcbiAgICAgICAgLy8gVGVsbCBwYXJlbnQgbGF5ZXIgdGhpcyBvbmUgaGFzIGNoYW5nZWQuXG4gICAgICAgIHRoYXQudHJpZ2dlcignY2hhbmdlZCcpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5fZ2V0X3Zpc2libGVfcm93cyA9IHV0aWxzLnByb3h5KHJvd19yZW5kZXJlci5nZXRfdmlzaWJsZV9yb3dzLCByb3dfcmVuZGVyZXIpO1xuICAgIHRoaXMuX2dldF9yb3dfaGVpZ2h0ID0gdXRpbHMucHJveHkocm93X3JlbmRlcmVyLmdldF9yb3dfaGVpZ2h0LCByb3dfcmVuZGVyZXIpO1xuICAgIHRoaXMuX2dldF9yb3dfdG9wID0gdXRpbHMucHJveHkocm93X3JlbmRlcmVyLmdldF9yb3dfdG9wLCByb3dfcmVuZGVyZXIpO1xuICAgIHRoaXMuX21lYXN1cmVfcGFydGlhbF9yb3cgPSB1dGlscy5wcm94eShyb3dfcmVuZGVyZXIubWVhc3VyZV9wYXJ0aWFsX3Jvd193aWR0aCwgcm93X3JlbmRlcmVyKTtcblxuICAgIC8vIFdoZW4gdGhlIGN1cnNvciBpcyBoaWRkZW4vc2hvd24sIHJlZHJhdyB0aGUgc2VsZWN0aW9uLlxuICAgIGN1cnNvcnNfcmVuZGVyZXIub24oJ3RvZ2dsZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGF0LnJlbmRlcigpO1xuICAgICAgICAvLyBUZWxsIHBhcmVudCBsYXllciB0aGlzIG9uZSBoYXMgY2hhbmdlZC5cbiAgICAgICAgdGhhdC50cmlnZ2VyKCdjaGFuZ2VkJyk7XG4gICAgfSk7XG59O1xudXRpbHMuaW5oZXJpdChTZWxlY3Rpb25zUmVuZGVyZXIsIHJlbmRlcmVyLlJlbmRlcmVyQmFzZSk7XG5cbi8qKlxuICogUmVuZGVyIHRvIHRoZSBjYW52YXNcbiAqIE5vdGU6IFRoaXMgbWV0aG9kIGlzIGNhbGxlZCBvZnRlbiwgc28gaXQncyBpbXBvcnRhbnQgdGhhdCBpdCdzXG4gKiBvcHRpbWl6ZWQgZm9yIHNwZWVkLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuU2VsZWN0aW9uc1JlbmRlcmVyLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9jYW52YXMuY2xlYXIoKTtcblxuICAgIC8vIE9ubHkgcmVuZGVyIGlmIHRoZSBjYW52YXMgaGFzIGZvY3VzLlxuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLl9jdXJzb3JzLmN1cnNvcnMuZm9yRWFjaChmdW5jdGlvbihjdXJzb3IpIHtcbiAgICAgICAgLy8gR2V0IHRoZSB2aXNpYmxlIHJvd3MuXG4gICAgICAgIHZhciB2aXNpYmxlX3Jvd3MgPSB0aGF0Ll9nZXRfdmlzaWJsZV9yb3dzKCk7XG5cbiAgICAgICAgLy8gRHJhdyB0aGUgc2VsZWN0aW9uIGJveC5cbiAgICAgICAgaWYgKGN1cnNvci5zdGFydF9yb3cgIT09IG51bGwgJiYgY3Vyc29yLnN0YXJ0X2NoYXIgIT09IG51bGwgJiZcbiAgICAgICAgICAgIGN1cnNvci5lbmRfcm93ICE9PSBudWxsICYmIGN1cnNvci5lbmRfY2hhciAhPT0gbnVsbCkge1xuICAgICAgICAgICAgXG5cbiAgICAgICAgICAgIGZvciAodmFyIGkgPSBNYXRoLm1heChjdXJzb3Iuc3RhcnRfcm93LCB2aXNpYmxlX3Jvd3MudG9wX3Jvdyk7IFxuICAgICAgICAgICAgICAgIGkgPD0gTWF0aC5taW4oY3Vyc29yLmVuZF9yb3csIHZpc2libGVfcm93cy5ib3R0b21fcm93KTsgXG4gICAgICAgICAgICAgICAgaSsrKSB7XG5cbiAgICAgICAgICAgICAgICB2YXIgbGVmdCA9IDA7XG4gICAgICAgICAgICAgICAgaWYgKGkgPT0gY3Vyc29yLnN0YXJ0X3JvdyAmJiBjdXJzb3Iuc3RhcnRfY2hhciA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgbGVmdCA9IHRoYXQuX21lYXN1cmVfcGFydGlhbF9yb3coaSwgY3Vyc29yLnN0YXJ0X2NoYXIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciBzZWxlY3Rpb25fY29sb3I7XG4gICAgICAgICAgICAgICAgaWYgKHRoYXQuX2hhc19mb2N1cygpKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdGlvbl9jb2xvciA9IHRoYXQuc3R5bGUuc2VsZWN0aW9uIHx8ICdza3libHVlJztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzZWxlY3Rpb25fY29sb3IgPSB0aGF0LnN0eWxlLnNlbGVjdGlvbl91bmZvY3VzZWQgfHwgJ2dyYXknO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHRoYXQuX2NhbnZhcy5kcmF3X3JlY3RhbmdsZShcbiAgICAgICAgICAgICAgICAgICAgbGVmdCwgXG4gICAgICAgICAgICAgICAgICAgIHRoYXQuX2dldF9yb3dfdG9wKGkpLCBcbiAgICAgICAgICAgICAgICAgICAgaSAhPT0gY3Vyc29yLmVuZF9yb3cgPyB0aGF0Ll9tZWFzdXJlX3BhcnRpYWxfcm93KGkpIC0gbGVmdCA6IHRoYXQuX21lYXN1cmVfcGFydGlhbF9yb3coaSwgY3Vyc29yLmVuZF9jaGFyKSAtIGxlZnQsIFxuICAgICAgICAgICAgICAgICAgICB0aGF0Ll9nZXRfcm93X2hlaWdodChpKSwgXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbGxfY29sb3I6IHNlbGVjdGlvbl9jb2xvcixcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuU2VsZWN0aW9uc1JlbmRlcmVyID0gU2VsZWN0aW9uc1JlbmRlcmVyO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cbnZhciBjYW52YXMgPSByZXF1aXJlKCcuL2NhbnZhcy5qcycpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xuXG4vKipcbiAqIEhUTUwgY2FudmFzIHdpdGggZHJhd2luZyBjb252aW5pZW5jZSBmdW5jdGlvbnMuXG4gKi9cbnZhciBTY3JvbGxpbmdDYW52YXMgPSBmdW5jdGlvbigpIHtcbiAgICBjYW52YXMuQ2FudmFzLmNhbGwodGhpcyk7XG4gICAgdGhpcy5fYmluZF9ldmVudHMoKTtcbiAgICB0aGlzLl9vbGRfc2Nyb2xsX2xlZnQgPSAwO1xuICAgIHRoaXMuX29sZF9zY3JvbGxfdG9wID0gMDtcblxuICAgIC8vIFNldCBkZWZhdWx0IHNpemUuXG4gICAgdGhpcy53aWR0aCA9IDQwMDtcbiAgICB0aGlzLmhlaWdodCA9IDMwMDtcbn07XG51dGlscy5pbmhlcml0KFNjcm9sbGluZ0NhbnZhcywgY2FudmFzLkNhbnZhcyk7XG5cbi8qKlxuICogQ2F1c2VzIHRoZSBjYW52YXMgY29udGVudHMgdG8gYmUgcmVkcmF3bi5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblNjcm9sbGluZ0NhbnZhcy5wcm90b3R5cGUucmVkcmF3ID0gZnVuY3Rpb24oc2Nyb2xsKSB7XG4gICAgdGhpcy5jbGVhcigpO1xuICAgIHRoaXMudHJpZ2dlcigncmVkcmF3Jywgc2Nyb2xsKTtcbn07XG5cbi8qKlxuICogTGF5b3V0IHRoZSBlbGVtZW50cyBmb3IgdGhlIGNhbnZhcy5cbiAqIENyZWF0ZXMgYHRoaXMuZWxgXG4gKiBcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblNjcm9sbGluZ0NhbnZhcy5wcm90b3R5cGUuX2xheW91dCA9IGZ1bmN0aW9uKCkge1xuICAgIGNhbnZhcy5DYW52YXMucHJvdG90eXBlLl9sYXlvdXQuY2FsbCh0aGlzKTtcbiAgICAvLyBDaGFuZ2UgdGhlIGNhbnZhcyBjbGFzcyBzbyBpdCdzIG5vdCBoaWRkZW4uXG4gICAgdGhpcy5fY2FudmFzLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAnY2FudmFzJyk7XG5cbiAgICB0aGlzLmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgdGhpcy5lbC5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ3Bvc3RlciBzY3JvbGwtd2luZG93Jyk7XG4gICAgdGhpcy5lbC5zZXRBdHRyaWJ1dGUoJ3RhYmluZGV4JywgMCk7XG4gICAgdGhpcy5fc2Nyb2xsX2JhcnMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICB0aGlzLl9zY3JvbGxfYmFycy5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ3Njcm9sbC1iYXJzJyk7XG4gICAgdGhpcy5fdG91Y2hfcGFuZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIHRoaXMuX3RvdWNoX3BhbmUuc2V0QXR0cmlidXRlKCdjbGFzcycsICd0b3VjaC1wYW5lJyk7XG4gICAgdGhpcy5fZHVtbXkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICB0aGlzLl9kdW1teS5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ3Njcm9sbC1kdW1teScpO1xuXG4gICAgdGhpcy5lbC5hcHBlbmRDaGlsZCh0aGlzLl9jYW52YXMpO1xuICAgIHRoaXMuZWwuYXBwZW5kQ2hpbGQodGhpcy5fc2Nyb2xsX2JhcnMpO1xuICAgIHRoaXMuX3Njcm9sbF9iYXJzLmFwcGVuZENoaWxkKHRoaXMuX2R1bW15KTtcbiAgICB0aGlzLl9zY3JvbGxfYmFycy5hcHBlbmRDaGlsZCh0aGlzLl90b3VjaF9wYW5lKTtcbn07XG5cbi8qKlxuICogTWFrZSB0aGUgcHJvcGVydGllcyBvZiB0aGUgY2xhc3MuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5TY3JvbGxpbmdDYW52YXMucHJvdG90eXBlLl9pbml0X3Byb3BlcnRpZXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBXaWR0aCBvZiB0aGUgc2Nyb2xsYWJsZSBjYW52YXMgYXJlYVxuICAgICAqL1xuICAgIHRoaXMucHJvcGVydHkoJ3Njcm9sbF93aWR0aCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBHZXRcbiAgICAgICAgcmV0dXJuIHRoYXQuX3Njcm9sbF93aWR0aCB8fCAwO1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIC8vIFNldFxuICAgICAgICB0aGF0Ll9zY3JvbGxfd2lkdGggPSB2YWx1ZTtcbiAgICAgICAgdGhhdC5fbW92ZV9kdW1teSh0aGF0Ll9zY3JvbGxfd2lkdGgsIHRoYXQuX3Njcm9sbF9oZWlnaHQgfHwgMCk7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBIZWlnaHQgb2YgdGhlIHNjcm9sbGFibGUgY2FudmFzIGFyZWEuXG4gICAgICovXG4gICAgdGhpcy5wcm9wZXJ0eSgnc2Nyb2xsX2hlaWdodCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBHZXRcbiAgICAgICAgcmV0dXJuIHRoYXQuX3Njcm9sbF9oZWlnaHQgfHwgMDtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAvLyBTZXRcbiAgICAgICAgdGhhdC5fc2Nyb2xsX2hlaWdodCA9IHZhbHVlO1xuICAgICAgICB0aGF0Ll9tb3ZlX2R1bW15KHRoYXQuX3Njcm9sbF93aWR0aCB8fCAwLCB0aGF0Ll9zY3JvbGxfaGVpZ2h0KTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIFRvcCBtb3N0IHBpeGVsIGluIHRoZSBzY3JvbGxlZCB3aW5kb3cuXG4gICAgICovXG4gICAgdGhpcy5wcm9wZXJ0eSgnc2Nyb2xsX3RvcCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBHZXRcbiAgICAgICAgcmV0dXJuIHRoYXQuX3Njcm9sbF9iYXJzLnNjcm9sbFRvcDtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAvLyBTZXRcbiAgICAgICAgdGhhdC5fc2Nyb2xsX2JhcnMuc2Nyb2xsVG9wID0gdmFsdWU7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBMZWZ0IG1vc3QgcGl4ZWwgaW4gdGhlIHNjcm9sbGVkIHdpbmRvdy5cbiAgICAgKi9cbiAgICB0aGlzLnByb3BlcnR5KCdzY3JvbGxfbGVmdCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBHZXRcbiAgICAgICAgcmV0dXJuIHRoYXQuX3Njcm9sbF9iYXJzLnNjcm9sbExlZnQ7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgLy8gU2V0XG4gICAgICAgIHRoYXQuX3Njcm9sbF9iYXJzLnNjcm9sbExlZnQgPSB2YWx1ZTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIEhlaWdodCBvZiB0aGUgY2FudmFzXG4gICAgICogQHJldHVybiB7ZmxvYXR9XG4gICAgICovXG4gICAgdGhpcy5wcm9wZXJ0eSgnaGVpZ2h0JywgZnVuY3Rpb24oKSB7IFxuICAgICAgICByZXR1cm4gdGhhdC5fY2FudmFzLmhlaWdodCAvIDI7IFxuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQuX2NhbnZhcy5zZXRBdHRyaWJ1dGUoJ2hlaWdodCcsIHZhbHVlICogMik7XG4gICAgICAgIHRoYXQuZWwuc2V0QXR0cmlidXRlKCdzdHlsZScsICd3aWR0aDogJyArIHRoYXQud2lkdGggKyAnOyBoZWlnaHQ6ICcgKyB2YWx1ZSArICc7Jyk7XG5cbiAgICAgICAgdGhhdC50cmlnZ2VyKCdyZXNpemUnLCB7aGVpZ2h0OiB2YWx1ZX0pO1xuICAgICAgICB0aGF0Ll90cnlfcmVkcmF3KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTdHJldGNoIHRoZSBpbWFnZSBmb3IgcmV0aW5hIHN1cHBvcnQuXG4gICAgICAgIHRoaXMuc2NhbGUoMiwyKTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIFdpZHRoIG9mIHRoZSBjYW52YXNcbiAgICAgKiBAcmV0dXJuIHtmbG9hdH1cbiAgICAgKi9cbiAgICB0aGlzLnByb3BlcnR5KCd3aWR0aCcsIGZ1bmN0aW9uKCkgeyBcbiAgICAgICAgcmV0dXJuIHRoYXQuX2NhbnZhcy53aWR0aCAvIDI7IFxuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQuX2NhbnZhcy5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgdmFsdWUgKiAyKTtcbiAgICAgICAgdGhhdC5lbC5zZXRBdHRyaWJ1dGUoJ3N0eWxlJywgJ3dpZHRoOiAnICsgdmFsdWUgKyAnOyBoZWlnaHQ6ICcgKyB0aGF0LmhlaWdodCArICc7Jyk7XG5cbiAgICAgICAgdGhhdC50cmlnZ2VyKCdyZXNpemUnLCB7d2lkdGg6IHZhbHVlfSk7XG4gICAgICAgIHRoYXQuX3RyeV9yZWRyYXcoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFN0cmV0Y2ggdGhlIGltYWdlIGZvciByZXRpbmEgc3VwcG9ydC5cbiAgICAgICAgdGhpcy5zY2FsZSgyLDIpO1xuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogSXMgdGhlIGNhbnZhcyBvciByZWxhdGVkIGVsZW1lbnRzIGZvY3VzZWQ/XG4gICAgICogQHJldHVybiB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICB0aGlzLnByb3BlcnR5KCdmb2N1c2VkJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBkb2N1bWVudC5hY3RpdmVFbGVtZW50ID09PSB0aGF0LmVsIHx8XG4gICAgICAgICAgICBkb2N1bWVudC5hY3RpdmVFbGVtZW50ID09PSB0aGF0Ll9zY3JvbGxfYmFycyB8fFxuICAgICAgICAgICAgZG9jdW1lbnQuYWN0aXZlRWxlbWVudCA9PT0gdGhhdC5fZHVtbXkgfHxcbiAgICAgICAgICAgIGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQgPT09IHRoYXQuX2NhbnZhcztcbiAgICB9KTtcbn07XG5cbi8qKlxuICogQmluZCB0byB0aGUgZXZlbnRzIG9mIHRoZSBjYW52YXMuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5TY3JvbGxpbmdDYW52YXMucHJvdG90eXBlLl9iaW5kX2V2ZW50cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcblxuICAgIC8vIFRyaWdnZXIgc2Nyb2xsIGFuZCByZWRyYXcgZXZlbnRzIG9uIHNjcm9sbC5cbiAgICB0aGlzLl9zY3JvbGxfYmFycy5vbnNjcm9sbCA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgdGhhdC50cmlnZ2VyKCdzY3JvbGwnLCBlKTtcbiAgICAgICAgaWYgKHRoYXQuX29sZF9zY3JvbGxfdG9wICE9PSB1bmRlZmluZWQgJiYgdGhhdC5fb2xkX3Njcm9sbF9sZWZ0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHZhciBzY3JvbGwgPSB7XG4gICAgICAgICAgICAgICAgeDogdGhhdC5zY3JvbGxfbGVmdCAtIHRoYXQuX29sZF9zY3JvbGxfbGVmdCxcbiAgICAgICAgICAgICAgICB5OiB0aGF0LnNjcm9sbF90b3AgLSB0aGF0Ll9vbGRfc2Nyb2xsX3RvcCxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB0aGF0Ll90cnlfcmVkcmF3KHNjcm9sbCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGF0Ll90cnlfcmVkcmF3KCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhhdC5fb2xkX3Njcm9sbF9sZWZ0ID0gdGhhdC5zY3JvbGxfbGVmdDtcbiAgICAgICAgdGhhdC5fb2xkX3Njcm9sbF90b3AgPSB0aGF0LnNjcm9sbF90b3A7XG4gICAgfTtcblxuICAgIC8vIFByZXZlbnQgc2Nyb2xsIGJhciBoYW5kbGVkIG1vdXNlIGV2ZW50cyBmcm9tIGJ1YmJsaW5nLlxuICAgIHZhciBzY3JvbGxiYXJfZXZlbnQgPSBmdW5jdGlvbihlKSB7XG4gICAgICAgIGlmIChlLnRhcmdldCAhPT0gdGhhdC5fdG91Y2hfcGFuZSkge1xuICAgICAgICAgICAgdXRpbHMuY2FuY2VsX2J1YmJsZShlKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdGhpcy5fc2Nyb2xsX2JhcnMub25tb3VzZWRvd24gPSBzY3JvbGxiYXJfZXZlbnQ7XG4gICAgdGhpcy5fc2Nyb2xsX2JhcnMub25tb3VzZXVwID0gc2Nyb2xsYmFyX2V2ZW50O1xuICAgIHRoaXMuX3Njcm9sbF9iYXJzLm9uY2xpY2sgPSBzY3JvbGxiYXJfZXZlbnQ7XG4gICAgdGhpcy5fc2Nyb2xsX2JhcnMub25kYmxjbGljayA9IHNjcm9sbGJhcl9ldmVudDtcbn07XG5cbi8qKlxuICogUXVlcmllcyB0byBzZWUgaWYgcmVkcmF3IGlzIG9rYXksIGFuZCB0aGVuIHJlZHJhd3MgaWYgaXQgaXMuXG4gKiBAcmV0dXJuIHtib29sZWFufSB0cnVlIGlmIHJlZHJhdyBoYXBwZW5lZC5cbiAqL1xuU2Nyb2xsaW5nQ2FudmFzLnByb3RvdHlwZS5fdHJ5X3JlZHJhdyA9IGZ1bmN0aW9uKHNjcm9sbCkge1xuICAgIGlmICh0aGlzLl9xdWVyeV9yZWRyYXcoKSkge1xuICAgICAgICB0aGlzLnJlZHJhdyhzY3JvbGwpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufTtcblxuLyoqXG4gKiBUcmlnZ2VyIHRoZSAncXVlcnlfcmVkcmF3JyBldmVudC5cbiAqIEByZXR1cm4ge2Jvb2xlYW59IHRydWUgaWYgY29udHJvbCBzaG91bGQgcmVkcmF3IGl0c2VsZi5cbiAqL1xuU2Nyb2xsaW5nQ2FudmFzLnByb3RvdHlwZS5fcXVlcnlfcmVkcmF3ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMudHJpZ2dlcigncXVlcnlfcmVkcmF3JykuZXZlcnkoZnVuY3Rpb24oeCkgeyByZXR1cm4geDsgfSk7IFxufTtcblxuLyoqXG4gKiBNb3ZlcyB0aGUgZHVtbXkgZWxlbWVudCB0aGF0IGNhdXNlcyB0aGUgc2Nyb2xsYmFyIHRvIGFwcGVhci5cbiAqIEBwYXJhbSAge2Zsb2F0fSB4XG4gKiBAcGFyYW0gIHtmbG9hdH0geVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuU2Nyb2xsaW5nQ2FudmFzLnByb3RvdHlwZS5fbW92ZV9kdW1teSA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICB0aGlzLl9kdW1teS5zZXRBdHRyaWJ1dGUoJ3N0eWxlJywgJ2xlZnQ6ICcgKyBTdHJpbmcoeCkgKyAnOyB0b3A6ICcgKyBTdHJpbmcoeSkgKyAnOycpO1xuICAgIHRoaXMuX3RvdWNoX3BhbmUuc2V0QXR0cmlidXRlKCdzdHlsZScsIFxuICAgICAgICAnd2lkdGg6ICcgKyBTdHJpbmcoTWF0aC5tYXgoeCwgdGhpcy5fc2Nyb2xsX2JhcnMuY2xpZW50V2lkdGgpKSArICc7ICcgK1xuICAgICAgICAnaGVpZ2h0OiAnICsgU3RyaW5nKE1hdGgubWF4KHksIHRoaXMuX3Njcm9sbF9iYXJzLmNsaWVudEhlaWdodCkpICsgJzsnKTtcbn07XG5cbi8qKlxuICogVHJhbnNmb3JtIGFuIHggdmFsdWUgYmFzZWQgb24gc2Nyb2xsIHBvc2l0aW9uLlxuICogQHBhcmFtICB7ZmxvYXR9IHhcbiAqIEBwYXJhbSAge2Jvb2xlYW59IGludmVyc2UgLSBwZXJmb3JtIGludmVyc2UgdHJhbnNmb3JtYXRpb25cbiAqIEByZXR1cm4ge2Zsb2F0fVxuICovXG5TY3JvbGxpbmdDYW52YXMucHJvdG90eXBlLl90eCA9IGZ1bmN0aW9uKHgsIGludmVyc2UpIHsgcmV0dXJuIHggLSAoaW52ZXJzZT8tMToxKSAqIHRoaXMuc2Nyb2xsX2xlZnQ7IH07XG5cbi8qKlxuICogVHJhbnNmb3JtIGEgeSB2YWx1ZSBiYXNlZCBvbiBzY3JvbGwgcG9zaXRpb24uXG4gKiBAcGFyYW0gIHtmbG9hdH0geVxuICogQHBhcmFtICB7Ym9vbGVhbn0gaW52ZXJzZSAtIHBlcmZvcm0gaW52ZXJzZSB0cmFuc2Zvcm1hdGlvblxuICogQHJldHVybiB7ZmxvYXR9XG4gKi9cblNjcm9sbGluZ0NhbnZhcy5wcm90b3R5cGUuX3R5ID0gZnVuY3Rpb24oeSwgaW52ZXJzZSkgeyByZXR1cm4geSAtIChpbnZlcnNlPy0xOjEpICogdGhpcy5zY3JvbGxfdG9wOyB9O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLlNjcm9sbGluZ0NhbnZhcyA9IFNjcm9sbGluZ0NhbnZhcztcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKTtcbnZhciBzdHlsZXMgPSByZXF1aXJlKCcuL3N0eWxlcy9pbml0LmpzJyk7XG5cbi8qKlxuICogU3R5bGVcbiAqL1xudmFyIFN0eWxlID0gZnVuY3Rpb24oKSB7XG4gICAgdXRpbHMuUG9zdGVyQ2xhc3MuY2FsbCh0aGlzLCBbXG4gICAgICAgICdjb21tZW50JyxcbiAgICAgICAgJ3RvZG8nLFxuICAgICAgICAnc3BlY2lhbCcsXG4gICAgICAgICdzdHJpbmcnLFxuICAgICAgICAnY2hhcmFjdGVyJyxcbiAgICAgICAgJ2NvbmRpdGlvbmFsJyxcbiAgICAgICAgJ3JlcGVhdCcsXG4gICAgICAgICdvcGVyYXRvcicsXG4gICAgICAgICd0eXBlJyxcbiAgICAgICAgJ3N0YXRlbWVudCcsXG4gICAgICAgICdmdW5jdGlvbicsXG4gICAgICAgICdlcnJvcicsXG4gICAgICAgICdib29sZWFuJyxcbiAgICAgICAgJ2lkZW50aWZpZXInLFxuICAgICAgICAnbGFiZWwnLFxuICAgICAgICAnZXhjZXB0aW9uJyxcbiAgICAgICAgJ2tleXdvcmQnLFxuICAgICAgICAnZGVidWcnLFxuXG4gICAgICAgICdjdXJzb3InLFxuICAgICAgICAnc2VsZWN0aW9uJyxcbiAgICAgICAgJ3NlbGVjdGlvbl91bmZvY3VzZWQnLFxuXG4gICAgICAgICd0ZXh0JyxcbiAgICAgICAgJ2JhY2tncm91bmQnLFxuICAgIF0pO1xuXG4gICAgLy8gTG9hZCB0aGUgZGVmYXVsdCBzdHlsZS5cbiAgICB0aGlzLmxvYWQoJ21vbm9rYWknKTtcbn07XG51dGlscy5pbmhlcml0KFN0eWxlLCB1dGlscy5Qb3N0ZXJDbGFzcyk7XG5cbi8qKlxuICogTG9hZCBhIHJlbmRlcmluZyBzdHlsZVxuICogQHBhcmFtICB7c3RyaW5nIG9yIGRpY3Rpb25hcnl9IHN0eWxlIC0gbmFtZSBvZiB0aGUgYnVpbHQtaW4gc3R5bGUgXG4gKiAgICAgICAgIG9yIHN0eWxlIGRpY3Rpb25hcnkgaXRzZWxmLlxuICogQHJldHVybiB7Ym9vbGVhbn0gc3VjY2Vzc1xuICovXG5TdHlsZS5wcm90b3R5cGUubG9hZCA9IGZ1bmN0aW9uKHN0eWxlKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gTG9hZCB0aGUgc3R5bGUgaWYgaXQncyBidWlsdC1pbi5cbiAgICAgICAgaWYgKHN0eWxlcy5zdHlsZXNbc3R5bGVdKSB7XG4gICAgICAgICAgICBzdHlsZSA9IHN0eWxlcy5zdHlsZXNbc3R5bGVdLnN0eWxlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVhZCBlYWNoIGF0dHJpYnV0ZSBvZiB0aGUgc3R5bGUuXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBzdHlsZSkge1xuICAgICAgICAgICAgaWYgKHN0eWxlLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgICAgICB0aGlzW2tleV0gPSBzdHlsZVtrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGxvYWRpbmcgc3R5bGUnLCBlKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn07XG5cbmV4cG9ydHMuU3R5bGUgPSBTdHlsZTsiLCJleHBvcnRzLnN0eWxlcyA9IHtcbiAgICBcIm1vbm9rYWlcIjogcmVxdWlyZShcIi4vbW9ub2thaS5qc1wiKSxcbn07XG4iLCJleHBvcnRzLnN0eWxlID0ge1xuICAgIGNvbW1lbnQ6ICcjNzU3MTVFJyxcbiAgICB0b2RvOiAnI0ZGRkZGRicsIC8vIEJPTERcbiAgICBzcGVjaWFsOiAnIzY2RDlFRicsXG4gICAgc3RyaW5nOiAnI0U2REI3NCcsXG4gICAgY2hhcmFjdGVyOiAnI0U2REI3NCcsXG4gICAgY29uZGl0aW9uYWw6ICcjRjkyNjcyJywgLy8gQk9MRFxuICAgIHJlcGVhdDogJyNGOTI2NzInLFxuICAgIG9wZXJhdG9yOiAnI0Y5MjY3MicsXG4gICAgdHlwZTogJyM2NkQ5RUYnLFxuICAgIHN0YXRlbWVudDogJyNGOTI2NzInLFxuICAgIGZ1bmN0aW9uOiAnI0E2RTIyRScsXG4gICAgZXJyb3I6ICcjRTZEQjc0JywgLy8gQkc6ICMxRTAwMTBcbiAgICBib29sZWFuOiAnI0FFODFGRicsXG4gICAgaWRlbnRpZmllcjogJyNGRDk3MUYnLFxuICAgIGxhYmVsOiAnI0U2REI3NCcsXG4gICAgZXhjZXB0aW9uOiAnI0E2RTIyRScsXG4gICAga2V5d29yZDogJyNGOTI2NzInLFxuICAgIGRlYnVnOiAnI0JDQTNBMycsIC8vIEJPTERcblxuICAgIGN1cnNvcjogJyNGOEY4RjInLFxuICAgIGN1cnNvcl93aWR0aDogMS4wLFxuICAgIGN1cnNvcl9oZWlnaHQ6IDEuMSxcbiAgICBzZWxlY3Rpb246ICcjNDY1NDU3JyxcbiAgICBzZWxlY3Rpb25fdW5mb2N1c2VkOiAnIzM2NDQ0NycsXG5cbiAgICB0ZXh0OiAnI0Y4RjhGMicsXG4gICAgYmFja2dyb3VuZDogJyMzMzMzMzMnLFxufTsiLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG4vKipcbiAqIEJhc2UgY2xhc3Mgd2l0aCBoZWxwZnVsIHV0aWxpdGllc1xuICogQHBhcmFtIHthcnJheX0gW2V2ZW50ZnVsX3Byb3BlcnRpZXNdIGxpc3Qgb2YgcHJvcGVydHkgbmFtZXMgKHN0cmluZ3MpXG4gKiAgICAgICAgICAgICAgICB0byBjcmVhdGUgYW5kIHdpcmUgY2hhbmdlIGV2ZW50cyB0by5cbiAqL1xudmFyIFBvc3RlckNsYXNzID0gZnVuY3Rpb24oZXZlbnRmdWxfcHJvcGVydGllcykge1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHRoaXMuX29uX2FsbCA9IFtdO1xuXG4gICAgLy8gQ29uc3RydWN0IGV2ZW50ZnVsIHByb3BlcnRpZXMuXG4gICAgaWYgKGV2ZW50ZnVsX3Byb3BlcnRpZXMgJiYgZXZlbnRmdWxfcHJvcGVydGllcy5sZW5ndGg+MCkge1xuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgIGZvciAodmFyIGk9MDsgaTxldmVudGZ1bF9wcm9wZXJ0aWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAoZnVuY3Rpb24obmFtZSkge1xuICAgICAgICAgICAgICAgIHRoYXQucHJvcGVydHkobmFtZSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGF0WydfJyArIG5hbWVdO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQudHJpZ2dlcignY2hhbmdlOicgKyBuYW1lLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQudHJpZ2dlcignY2hhbmdlJywgbmFtZSwgdmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB0aGF0WydfJyArIG5hbWVdID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQudHJpZ2dlcignY2hhbmdlZDonICsgbmFtZSk7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQudHJpZ2dlcignY2hhbmdlZCcsIG5hbWUpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkoZXZlbnRmdWxfcHJvcGVydGllc1tpXSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vKipcbiAqIERlZmluZSBhIHByb3BlcnR5IGZvciB0aGUgY2xhc3NcbiAqIEBwYXJhbSAge3N0cmluZ30gbmFtZVxuICogQHBhcmFtICB7ZnVuY3Rpb259IGdldHRlclxuICogQHBhcmFtICB7ZnVuY3Rpb259IHNldHRlclxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuUG9zdGVyQ2xhc3MucHJvdG90eXBlLnByb3BlcnR5ID0gZnVuY3Rpb24obmFtZSwgZ2V0dGVyLCBzZXR0ZXIpIHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgbmFtZSwge1xuICAgICAgICBnZXQ6IGdldHRlcixcbiAgICAgICAgc2V0OiBzZXR0ZXIsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH0pO1xufTtcblxuLyoqXG4gKiBSZWdpc3RlciBhbiBldmVudCBsaXN0ZW5lclxuICogQHBhcmFtICB7c3RyaW5nfSBldmVudFxuICogQHBhcmFtICB7ZnVuY3Rpb259IGhhbmRsZXJcbiAqIEBwYXJhbSAge29iamVjdH0gY29udGV4dFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuUG9zdGVyQ2xhc3MucHJvdG90eXBlLm9uID0gZnVuY3Rpb24oZXZlbnQsIGhhbmRsZXIsIGNvbnRleHQpIHtcbiAgICBldmVudCA9IGV2ZW50LnRyaW0oKS50b0xvd2VyQ2FzZSgpO1xuXG4gICAgLy8gTWFrZSBzdXJlIGEgbGlzdCBmb3IgdGhlIGV2ZW50IGV4aXN0cy5cbiAgICBpZiAoIXRoaXMuX2V2ZW50c1tldmVudF0pIHsgdGhpcy5fZXZlbnRzW2V2ZW50XSA9IFtdOyB9XG5cbiAgICAvLyBQdXNoIHRoZSBoYW5kbGVyIGFuZCB0aGUgY29udGV4dCB0byB0aGUgZXZlbnQncyBjYWxsYmFjayBsaXN0LlxuICAgIHRoaXMuX2V2ZW50c1tldmVudF0ucHVzaChbaGFuZGxlciwgY29udGV4dF0pO1xufTtcblxuLyoqXG4gKiBVbnJlZ2lzdGVyIG9uZSBvciBhbGwgZXZlbnQgbGlzdGVuZXJzIGZvciBhIHNwZWNpZmljIGV2ZW50XG4gKiBAcGFyYW0gIHtzdHJpbmd9IGV2ZW50XG4gKiBAcGFyYW0gIHtjYWxsYmFja30gKG9wdGlvbmFsKSBoYW5kbGVyXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Qb3N0ZXJDbGFzcy5wcm90b3R5cGUub2ZmID0gZnVuY3Rpb24oZXZlbnQsIGhhbmRsZXIpIHtcbiAgICBldmVudCA9IGV2ZW50LnRyaW0oKS50b0xvd2VyQ2FzZSgpO1xuICAgIFxuICAgIC8vIElmIGEgaGFuZGxlciBpcyBzcGVjaWZpZWQsIHJlbW92ZSBhbGwgdGhlIGNhbGxiYWNrc1xuICAgIC8vIHdpdGggdGhhdCBoYW5kbGVyLiAgT3RoZXJ3aXNlLCBqdXN0IHJlbW92ZSBhbGwgb2ZcbiAgICAvLyB0aGUgcmVnaXN0ZXJlZCBjYWxsYmFja3MuXG4gICAgaWYgKGhhbmRsZXIpIHtcbiAgICAgICAgdGhpcy5fZXZlbnRzW2V2ZW50XSA9IHRoaXMuX2V2ZW50c1tldmVudF0uZmlsdGVyKGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2tbMF0gIT09IGhhbmRsZXI7XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX2V2ZW50c1tldmVudF0gPSBbXTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFJlZ2lzdGVyIGEgZ2xvYmFsIGV2ZW50IGhhbmRsZXIuIFxuICogXG4gKiBBIGdsb2JhbCBldmVudCBoYW5kbGVyIGZpcmVzIGZvciBhbnkgZXZlbnQgdGhhdCdzXG4gKiB0cmlnZ2VyZWQuXG4gKiBAcGFyYW0gIHtzdHJpbmd9IGhhbmRsZXIgLSBmdW5jdGlvbiB0aGF0IGFjY2VwdHMgb25lXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcmd1bWVudCwgdGhlIG5hbWUgb2YgdGhlXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudCxcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblBvc3RlckNsYXNzLnByb3RvdHlwZS5vbl9hbGwgPSBmdW5jdGlvbihoYW5kbGVyKSB7XG4gICAgdmFyIGluZGV4ID0gdGhpcy5fb25fYWxsLmluZGV4T2YoaGFuZGxlcik7XG4gICAgaWYgKGluZGV4ID09PSAtMSkge1xuICAgICAgICB0aGlzLl9vbl9hbGwucHVzaChoYW5kbGVyKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFVucmVnaXN0ZXIgYSBnbG9iYWwgZXZlbnQgaGFuZGxlci5cbiAqIEBwYXJhbSAge1t0eXBlXX0gaGFuZGxlclxuICogQHJldHVybiB7Ym9vbGVhbn0gdHJ1ZSBpZiBhIGhhbmRsZXIgd2FzIHJlbW92ZWRcbiAqL1xuUG9zdGVyQ2xhc3MucHJvdG90eXBlLm9mZl9hbGwgPSBmdW5jdGlvbihoYW5kbGVyKSB7XG4gICAgdmFyIGluZGV4ID0gdGhpcy5fb25fYWxsLmluZGV4T2YoaGFuZGxlcik7XG4gICAgaWYgKGluZGV4ICE9IC0xKSB7XG4gICAgICAgIHRoaXMuX29uX2FsbC5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufTtcblxuLyoqXG4gKiBUcmlnZ2VycyB0aGUgY2FsbGJhY2tzIG9mIGFuIGV2ZW50IHRvIGZpcmUuXG4gKiBAcGFyYW0gIHtzdHJpbmd9IGV2ZW50XG4gKiBAcmV0dXJuIHthcnJheX0gYXJyYXkgb2YgcmV0dXJuIHZhbHVlc1xuICovXG5Qb3N0ZXJDbGFzcy5wcm90b3R5cGUudHJpZ2dlciA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgZXZlbnQgPSBldmVudC50cmltKCkudG9Mb3dlckNhc2UoKTtcblxuICAgIC8vIENvbnZlcnQgYXJndW1lbnRzIHRvIGFuIGFycmF5IGFuZCBjYWxsIGNhbGxiYWNrcy5cbiAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgYXJncy5zcGxpY2UoMCwxKTtcblxuICAgIC8vIFRyaWdnZXIgZ2xvYmFsIGhhbmRsZXJzIGZpcnN0LlxuICAgIHRoaXMuX29uX2FsbC5mb3JFYWNoKGZ1bmN0aW9uKGhhbmRsZXIpIHtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBbZXZlbnRdLmNvbmNhdChhcmdzKSk7XG4gICAgfSk7XG5cbiAgICAvLyBUcmlnZ2VyIGluZGl2aWR1YWwgaGFuZGxlcnMgc2Vjb25kLlxuICAgIHZhciBldmVudHMgPSB0aGlzLl9ldmVudHNbZXZlbnRdO1xuICAgIGlmIChldmVudHMpIHtcbiAgICAgICAgdmFyIHJldHVybnMgPSBbXTtcbiAgICAgICAgZXZlbnRzLmZvckVhY2goZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHJldHVybnMucHVzaChjYWxsYmFja1swXS5hcHBseShjYWxsYmFja1sxXSwgYXJncykpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHJldHVybnM7XG4gICAgfVxuICAgIHJldHVybiBbXTtcbn07XG5cbi8qKlxuICogQ2F1c2Ugb25lIGNsYXNzIHRvIGluaGVyaXQgZnJvbSBhbm90aGVyXG4gKiBAcGFyYW0gIHt0eXBlfSBjaGlsZFxuICogQHBhcmFtICB7dHlwZX0gcGFyZW50XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG52YXIgaW5oZXJpdCA9IGZ1bmN0aW9uKGNoaWxkLCBwYXJlbnQpIHtcbiAgICBjaGlsZC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHBhcmVudC5wcm90b3R5cGUsIHt9KTtcbn07XG5cbi8qKlxuICogQ2hlY2tzIGlmIGEgdmFsdWUgaXMgY2FsbGFibGVcbiAqIEBwYXJhbSAge2FueX0gdmFsdWVcbiAqIEByZXR1cm4ge2Jvb2xlYW59XG4gKi9cbnZhciBjYWxsYWJsZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PSAnZnVuY3Rpb24nO1xufTtcblxuLyoqXG4gKiBDYWxscyB0aGUgdmFsdWUgaWYgaXQncyBjYWxsYWJsZSBhbmQgcmV0dXJucyBpdCdzIHJldHVybi5cbiAqIE90aGVyd2lzZSByZXR1cm5zIHRoZSB2YWx1ZSBhcy1pcy5cbiAqIEBwYXJhbSAge2FueX0gdmFsdWVcbiAqIEByZXR1cm4ge2FueX1cbiAqL1xudmFyIHJlc29sdmVfY2FsbGFibGUgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIGlmIChjYWxsYWJsZSh2YWx1ZSkpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlLmNhbGwodGhpcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhIHByb3h5IHRvIGEgZnVuY3Rpb24gc28gaXQgaXMgY2FsbGVkIGluIHRoZSBjb3JyZWN0IGNvbnRleHQuXG4gKiBAcmV0dXJuIHtmdW5jdGlvbn0gcHJveGllZCBmdW5jdGlvbi5cbiAqL1xudmFyIHByb3h5ID0gZnVuY3Rpb24oZiwgY29udGV4dCkge1xuICAgIGlmIChmPT09dW5kZWZpbmVkKSB7IHRocm93IG5ldyBFcnJvcignZiBjYW5ub3QgYmUgdW5kZWZpbmVkJyk7IH1cbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7IHJldHVybiBmLmFwcGx5KGNvbnRleHQsIGFyZ3VtZW50cyk7IH07XG59O1xuXG4vKipcbiAqIENsZWFycyBhbiBhcnJheSBpbiBwbGFjZS5cbiAqXG4gKiBEZXNwaXRlIGFuIE8oTikgY29tcGxleGl0eSwgdGhpcyBzZWVtcyB0byBiZSB0aGUgZmFzdGVzdCB3YXkgdG8gY2xlYXJcbiAqIGEgbGlzdCBpbiBwbGFjZSBpbiBKYXZhc2NyaXB0LiBcbiAqIEJlbmNobWFyazogaHR0cDovL2pzcGVyZi5jb20vZW1wdHktamF2YXNjcmlwdC1hcnJheVxuICogQ29tcGxleGl0eTogTyhOKVxuICogQHBhcmFtICB7YXJyYXl9IGFycmF5XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG52YXIgY2xlYXJfYXJyYXkgPSBmdW5jdGlvbihhcnJheSkge1xuICAgIHdoaWxlIChhcnJheS5sZW5ndGggPiAwKSB7XG4gICAgICAgIGFycmF5LnBvcCgpO1xuICAgIH1cbn07XG5cbi8qKlxuICogQ2hlY2tzIGlmIGEgdmFsdWUgaXMgYW4gYXJyYXlcbiAqIEBwYXJhbSAge2FueX0geFxuICogQHJldHVybiB7Ym9vbGVhbn0gdHJ1ZSBpZiB2YWx1ZSBpcyBhbiBhcnJheVxuICovXG52YXIgaXNfYXJyYXkgPSBmdW5jdGlvbih4KSB7XG4gICAgcmV0dXJuIHggaW5zdGFuY2VvZiBBcnJheTtcbn07XG5cbi8qKlxuICogRmluZCB0aGUgY2xvc2VzdCB2YWx1ZSBpbiBhIGxpc3RcbiAqIFxuICogSW50ZXJwb2xhdGlvbiBzZWFyY2ggYWxnb3JpdGhtLiAgXG4gKiBDb21wbGV4aXR5OiBPKGxnKGxnKE4pKSlcbiAqIEBwYXJhbSAge2FycmF5fSBzb3J0ZWQgLSBzb3J0ZWQgYXJyYXkgb2YgbnVtYmVyc1xuICogQHBhcmFtICB7ZmxvYXR9IHggLSBudW1iZXIgdG8gdHJ5IHRvIGZpbmRcbiAqIEByZXR1cm4ge2ludGVnZXJ9IGluZGV4IG9mIHRoZSB2YWx1ZSB0aGF0J3MgY2xvc2VzdCB0byB4XG4gKi9cbnZhciBmaW5kX2Nsb3Nlc3QgPSBmdW5jdGlvbihzb3J0ZWQsIHgpIHtcbiAgICB2YXIgbWluID0gc29ydGVkWzBdO1xuICAgIHZhciBtYXggPSBzb3J0ZWRbc29ydGVkLmxlbmd0aC0xXTtcbiAgICBpZiAoeCA8IG1pbikgcmV0dXJuIDA7XG4gICAgaWYgKHggPiBtYXgpIHJldHVybiBzb3J0ZWQubGVuZ3RoLTE7XG4gICAgaWYgKHNvcnRlZC5sZW5ndGggPT0gMikge1xuICAgICAgICBpZiAobWF4IC0geCA+IHggLSBtaW4pIHtcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdmFyIHJhdGUgPSAobWF4IC0gbWluKSAvIHNvcnRlZC5sZW5ndGg7XG4gICAgaWYgKHJhdGUgPT09IDApIHJldHVybiAwO1xuICAgIHZhciBndWVzcyA9IE1hdGguZmxvb3IoeCAvIHJhdGUpO1xuICAgIGlmIChzb3J0ZWRbZ3Vlc3NdID09IHgpIHtcbiAgICAgICAgcmV0dXJuIGd1ZXNzO1xuICAgIH0gZWxzZSBpZiAoZ3Vlc3MgPiAwICYmIHNvcnRlZFtndWVzcy0xXSA8IHggJiYgeCA8IHNvcnRlZFtndWVzc10pIHtcbiAgICAgICAgcmV0dXJuIGZpbmRfY2xvc2VzdChzb3J0ZWQuc2xpY2UoZ3Vlc3MtMSwgZ3Vlc3MrMSksIHgpICsgZ3Vlc3MtMTtcbiAgICB9IGVsc2UgaWYgKGd1ZXNzIDwgc29ydGVkLmxlbmd0aC0xICYmIHNvcnRlZFtndWVzc10gPCB4ICYmIHggPCBzb3J0ZWRbZ3Vlc3MrMV0pIHtcbiAgICAgICAgcmV0dXJuIGZpbmRfY2xvc2VzdChzb3J0ZWQuc2xpY2UoZ3Vlc3MsIGd1ZXNzKzIpLCB4KSArIGd1ZXNzO1xuICAgIH0gZWxzZSBpZiAoc29ydGVkW2d1ZXNzXSA+IHgpIHtcbiAgICAgICAgcmV0dXJuIGZpbmRfY2xvc2VzdChzb3J0ZWQuc2xpY2UoMCwgZ3Vlc3MpLCB4KTtcbiAgICB9IGVsc2UgaWYgKHNvcnRlZFtndWVzc10gPCB4KSB7XG4gICAgICAgIHJldHVybiBmaW5kX2Nsb3Nlc3Qoc29ydGVkLnNsaWNlKGd1ZXNzKzEpLCB4KSArIGd1ZXNzKzE7XG4gICAgfVxufTtcblxuLyoqXG4gKiBNYWtlIGEgc2hhbGxvdyBjb3B5IG9mIGEgZGljdGlvbmFyeS5cbiAqIEBwYXJhbSAge2RpY3Rpb25hcnl9IHhcbiAqIEByZXR1cm4ge2RpY3Rpb25hcnl9XG4gKi9cbnZhciBzaGFsbG93X2NvcHkgPSBmdW5jdGlvbih4KSB7XG4gICAgdmFyIHkgPSB7fTtcbiAgICBmb3IgKHZhciBrZXkgaW4geCkge1xuICAgICAgICBpZiAoeC5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICB5W2tleV0gPSB4W2tleV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHk7XG59O1xuXG4vKipcbiAqIEhvb2tzIGEgZnVuY3Rpb24uXG4gKiBAcGFyYW0gIHtvYmplY3R9IG9iaiAtIG9iamVjdCB0byBob29rXG4gKiBAcGFyYW0gIHtzdHJpbmd9IG1ldGhvZCAtIG5hbWUgb2YgdGhlIGZ1bmN0aW9uIHRvIGhvb2tcbiAqIEBwYXJhbSAge2Z1bmN0aW9ufSBob29rIC0gZnVuY3Rpb24gdG8gY2FsbCBiZWZvcmUgdGhlIG9yaWdpbmFsXG4gKiBAcmV0dXJuIHtvYmplY3R9IGhvb2sgcmVmZXJlbmNlLCBvYmplY3Qgd2l0aCBhbiBgdW5ob29rYCBtZXRob2RcbiAqL1xudmFyIGhvb2sgPSBmdW5jdGlvbihvYmosIG1ldGhvZCwgaG9vaykge1xuXG4gICAgLy8gSWYgdGhlIG9yaWdpbmFsIGhhcyBhbHJlYWR5IGJlZW4gaG9va2VkLCBhZGQgdGhpcyBob29rIHRvIHRoZSBsaXN0IFxuICAgIC8vIG9mIGhvb2tzLlxuICAgIGlmIChvYmpbbWV0aG9kXSAmJiBvYmpbbWV0aG9kXS5vcmlnaW5hbCAmJiBvYmpbbWV0aG9kXS5ob29rcykge1xuICAgICAgICBvYmpbbWV0aG9kXS5ob29rcy5wdXNoKGhvb2spO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIENyZWF0ZSB0aGUgaG9va2VkIGZ1bmN0aW9uXG4gICAgICAgIHZhciBob29rcyA9IFtob29rXTtcbiAgICAgICAgdmFyIG9yaWdpbmFsID0gb2JqW21ldGhvZF07XG4gICAgICAgIHZhciBob29rZWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgICAgICAgdmFyIHJldDtcbiAgICAgICAgICAgIHZhciByZXN1bHRzO1xuICAgICAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICAgICAgaG9va3MuZm9yRWFjaChmdW5jdGlvbihob29rKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0cyA9IGhvb2suYXBwbHkodGhhdCwgYXJncyk7XG4gICAgICAgICAgICAgICAgcmV0ID0gcmV0ICE9PSB1bmRlZmluZWQgPyByZXQgOiByZXN1bHRzO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAob3JpZ2luYWwpIHtcbiAgICAgICAgICAgICAgICByZXN1bHRzID0gb3JpZ2luYWwuYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmV0ICE9PSB1bmRlZmluZWQgPyByZXQgOiByZXN1bHRzO1xuICAgICAgICB9O1xuICAgICAgICBob29rZWQub3JpZ2luYWwgPSBvcmlnaW5hbDtcbiAgICAgICAgaG9va2VkLmhvb2tzID0gaG9va3M7XG4gICAgICAgIG9ialttZXRob2RdID0gaG9va2VkO1xuICAgIH1cblxuICAgIC8vIFJldHVybiB1bmhvb2sgbWV0aG9kLlxuICAgIHJldHVybiB7XG4gICAgICAgIHVuaG9vazogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgaW5kZXggPSBvYmpbbWV0aG9kXS5ob29rcy5pbmRleE9mKGhvb2spO1xuICAgICAgICAgICAgaWYgKGluZGV4ICE9IC0xKSB7XG4gICAgICAgICAgICAgICAgb2JqW21ldGhvZF0uaG9va3Muc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKG9ialttZXRob2RdLmhvb2tzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIG9ialttZXRob2RdID0gb2JqW21ldGhvZF0ub3JpZ2luYWw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgfTtcbiAgICBcbn07XG5cbi8qKlxuICogQ2FuY2VscyBldmVudCBidWJibGluZy5cbiAqIEBwYXJhbSAge2V2ZW50fSBlXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG52YXIgY2FuY2VsX2J1YmJsZSA9IGZ1bmN0aW9uKGUpIHtcbiAgICBpZiAoZS5zdG9wUHJvcGFnYXRpb24pIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgaWYgKGUuY2FuY2VsQnViYmxlICE9PSBudWxsKSBlLmNhbmNlbEJ1YmJsZSA9IHRydWU7XG4gICAgaWYgKGUucHJldmVudERlZmF1bHQpIGUucHJldmVudERlZmF1bHQoKTtcbn07XG5cbi8qKlxuICogR2VuZXJhdGVzIGEgcmFuZG9tIGNvbG9yIHN0cmluZ1xuICogQHJldHVybiB7c3RyaW5nfSBoZXhhZGVjaW1hbCBjb2xvciBzdHJpbmdcbiAqL1xudmFyIHJhbmRvbV9jb2xvciA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciByYW5kb21fYnl0ZSA9IGZ1bmN0aW9uKCkgeyBcbiAgICAgICAgdmFyIGIgPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAyNTUpLnRvU3RyaW5nKDE2KTtcbiAgICAgICAgcmV0dXJuIGIubGVuZ3RoID09IDEgPyAnMCcgKyBiIDogYjtcbiAgICB9O1xuICAgIHJldHVybiAnIycgKyByYW5kb21fYnl0ZSgpICsgcmFuZG9tX2J5dGUoKSArIHJhbmRvbV9ieXRlKCk7XG59O1xuXG4vKipcbiAqIENvbXBhcmUgdHdvIGFycmF5cyBieSBjb250ZW50cyBmb3IgZXF1YWxpdHkuXG4gKiBAcGFyYW0gIHthcnJheX0geFxuICogQHBhcmFtICB7YXJyYXl9IHlcbiAqIEByZXR1cm4ge2Jvb2xlYW59XG4gKi9cbnZhciBjb21wYXJlX2FycmF5cyA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICBpZiAoeC5sZW5ndGggIT0geS5sZW5ndGgpIHJldHVybiBmYWxzZTtcbiAgICBmb3IgKGk9MDsgaTx4Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmICh4W2ldIT09eVtpXSkgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogRmluZCBhbGwgdGhlIG9jY3VyYW5jZXMgb2YgYSByZWd1bGFyIGV4cHJlc3Npb24gaW5zaWRlIGEgc3RyaW5nLlxuICogQHBhcmFtICB7c3RyaW5nfSB0ZXh0IC0gc3RyaW5nIHRvIGxvb2sgaW5cbiAqIEBwYXJhbSAge3N0cmluZ30gcmUgLSByZWd1bGFyIGV4cHJlc3Npb24gdG8gZmluZFxuICogQHJldHVybiB7YXJyYXl9IGFycmF5IG9mIFtzdGFydF9pbmRleCwgZW5kX2luZGV4XSBwYWlyc1xuICovXG52YXIgZmluZGFsbCA9IGZ1bmN0aW9uKHRleHQsIHJlKSB7XG4gICAgcmUgPSBuZXcgUmVnRXhwKHJlLCAnZ20nKTtcbiAgICB2YXIgcmVzdWx0cztcbiAgICB2YXIgZm91bmQgPSBbXTtcbiAgICB3aGlsZSAoKHJlc3VsdHMgPSByZS5leGVjKHRleHQpKSAhPT0gbnVsbCkge1xuICAgICAgICBmb3VuZC5wdXNoKFtyZXN1bHRzLmluZGV4LCByZXN1bHRzLmluZGV4ICsgcmVzdWx0c1swXS5sZW5ndGhdKTtcbiAgICB9XG4gICAgcmV0dXJuIGZvdW5kO1xufTtcblxuLy8gRXhwb3J0IG5hbWVzLlxuZXhwb3J0cy5Qb3N0ZXJDbGFzcyA9IFBvc3RlckNsYXNzO1xuZXhwb3J0cy5pbmhlcml0ID0gaW5oZXJpdDtcbmV4cG9ydHMuY2FsbGFibGUgPSBjYWxsYWJsZTtcbmV4cG9ydHMucmVzb2x2ZV9jYWxsYWJsZSA9IHJlc29sdmVfY2FsbGFibGU7XG5leHBvcnRzLnByb3h5ID0gcHJveHk7XG5leHBvcnRzLmNsZWFyX2FycmF5ID0gY2xlYXJfYXJyYXk7XG5leHBvcnRzLmlzX2FycmF5ID0gaXNfYXJyYXk7XG5leHBvcnRzLmZpbmRfY2xvc2VzdCA9IGZpbmRfY2xvc2VzdDtcbmV4cG9ydHMuc2hhbGxvd19jb3B5ID0gc2hhbGxvd19jb3B5O1xuZXhwb3J0cy5ob29rID0gaG9vaztcbmV4cG9ydHMuY2FuY2VsX2J1YmJsZSA9IGNhbmNlbF9idWJibGU7XG5leHBvcnRzLnJhbmRvbV9jb2xvciA9IHJhbmRvbV9jb2xvcjtcbmV4cG9ydHMuY29tcGFyZV9hcnJheXMgPSBjb21wYXJlX2FycmF5cztcbmV4cG9ydHMuZmluZGFsbCA9IGZpbmRhbGw7XG4iXX0=
