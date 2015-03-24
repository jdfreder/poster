// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
import utils = require('../utils/utils');
import config_mod = require('../utils/config');
var config = config_mod.config;

/**
 * HTML canvas with drawing convinience functions.
 */
export class Canvas extends utils.PosterClass {
    
    public context;
    
    protected _canvas;

    private _rendered_region;
    private _last_set_options;
    private _text_size_cache;
    private _text_size_array;
    private _text_size_cache_size;
    private _font_height;
    private _cached_timestamp;
    private _modified;
    private _cached_region;
    private _cached_image;

    constructor() {
        this._rendered_region = [null, null, null, null]; // x1,y1,x2,y2

        super();
        this._layout();
        this._last_set_options = {};

        this._text_size_cache = {};
        this._text_size_array = [];
        this._text_size_cache_size = 1000;

        // Set default size.
        this.width = 400;
        this.height = 300;
    }

    /**
     * Height of the canvas
     * @return {float}
     */
    get height() { 
        return this._canvas.height / 2; 
    }
    set height(value) {
        this._canvas.setAttribute('height', value * 2);
        
        // Stretch the image for retina support.
        this.scale(2,2);
        this._touch();
    }

    /**
     * Width of the canvas
     * @return {float}
     */
    get width() { 
        return this._canvas.width / 2; 
    }
    set width(value) {
        this._canvas.setAttribute('width', value * 2);
        
        // Stretch the image for retina support.
        this.scale(2,2);
        this._touch();
    }

    /**
     * Region of the canvas that has been rendered to
     * @return {dictionary} dictionary describing a rectangle {x,y,width,height}
     *                      null if canvas has changed since last check
     */
    get rendered_region() {
        return this.get_rendered_region(true);
    }

    /**
     * Layout the elements for the canvas.
     * Creates `this.el`
     */
    _layout() {
        this._canvas = document.createElement('canvas');
        this._canvas.setAttribute('class', 'poster hidden-canvas');
        this.context = this._canvas.getContext('2d');
            
        // Stretch the image for retina support.
        this.scale(2,2);
    }

    /**
     * Gets the region of the canvas that has been rendered to.
     * @param  {boolean} (optional) reset - resets the region.
     */
    get_rendered_region(reset) {
        var rendered_region = this._rendered_region;
        if (rendered_region[0] === null) return null;

        if (reset) this._rendered_region = [null, null, null, null];
        return {
            x: this._tx(rendered_region[0], true),
            y: this._ty(rendered_region[1], true),
            width: (this._tx(rendered_region[2]) - this._tx(rendered_region[0])), 
            height: (this._ty(rendered_region[3]) - this._ty(rendered_region[1])),
        };
    }

    /**
     * Erases the cached rendering options.
     * 
     * This should be called if a font is not rendering properly.  A font may not
     * render properly if it was was used within Poster before it was loaded by the
     * browser. i.e. If font 'FontA' is used within Poster, but hasn't been loaded
     * yet by the browser, Poster will use a temporary font instead of 'FontA'.
     * Because Poster is unaware of when fonts are loaded (TODO attempt to fix this)
     * by the browser, once 'FontA' is actually loaded, the temporary font will
     * continue to be used.  Clearing the cache makes Poster attempt to reload that
     * font.
     */
    erase_options_cache() {
        this._last_set_options = {};
    }

    /**
     * Draws a rectangle
     * @param  {float} x
     * @param  {float} y
     * @param  {float} width
     * @param  {float} height
     * @param  {dictionary} options, see _apply_options() for details
     */
    draw_rectangle(x, y, width, height, options) {
        var tx = this._tx(x);
        var ty = this._ty(y);
        this.context.beginPath();
        this.context.rect(tx, ty, width, height);
        this._do_draw(options);
        this._touch(tx, ty, tx+width, ty+height);
    }

    /**
     * Draws a circle
     * @param  {float} x
     * @param  {float} y
     * @param  {float} r
     * @param  {dictionary} options, see _apply_options() for details
     */
    draw_circle(x, y, r, options) {
        var tx = this._tx(x);
        var ty = this._ty(y);
        this.context.beginPath();
        this.context.arc(tx, ty, r, 0, 2 * Math.PI);
        this._do_draw(options);
        this._touch(tx-r, ty-r, tx+r, ty+r);
    }

    /**
     * Draws an image
     * @param  {img element} img
     * @param  {float} x
     * @param  {float} y
     * @param  {float} (optional) width
     * @param  {float} (optional) height
     * @param  {object} (optional) clip_bounds - Where to clip from the source.
     */
    draw_image(img, x, y, width, height, clip_bounds) {
        var tx = this._tx(x);
        var ty = this._ty(y);
        width = width || img.width;
        height = height || img.height;
        img = img._canvas ? img._canvas : img;
        if (clip_bounds) {
            // Horizontally offset the image operation by one pixel along each 
            // border to eliminate the strange white l&r border artifacts.
            var hoffset = 1;
            this.context.drawImage(img, 
                (this._tx(clip_bounds.x) - hoffset) * 2, // Retina support
                this._ty(clip_bounds.y) * 2, // Retina support
                (clip_bounds.width + 2*hoffset) * 2, // Retina support
                clip_bounds.height * 2, // Retina support
                tx-hoffset, ty, width + 2*hoffset, height);
        } else {
            this.context.drawImage(img, tx, ty, width, height);
        }
        this._touch(tx, ty, tx + width, ty + height);
    }

    /**
     * Draws a line
     * @param  {float} x1
     * @param  {float} y1
     * @param  {float} x2
     * @param  {float} y2
     * @param  {dictionary} options, see _apply_options() for details
     */
    draw_line(x1, y1, x2, y2, options) {
        var tx1 = this._tx(x1);
        var ty1 = this._ty(y1);
        var tx2 = this._tx(x2);
        var ty2 = this._ty(y2);
        this.context.beginPath();
        this.context.moveTo(tx1, ty1);
        this.context.lineTo(tx2, ty2);
        this._do_draw(options);
        this._touch(tx1, ty1, tx2, ty2);
    }

    /**
     * Draws a poly line
     * @param  {array} points - array of points.  Each point is
     *                          an array itself, of the form [x, y] 
     *                          where x and y are floating point
     *                          values.
     * @param  {dictionary} options, see _apply_options() for details
     */
    draw_polyline(points, options) {
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
                var tx = this._tx(point[0]);
                var ty = this._ty(point[1]);
                this.context.lineTo(tx, ty);

                minx = Math.min(tx, minx);
                miny = Math.min(ty, miny);
                maxx = Math.max(tx, maxx);
                maxy = Math.max(ty, maxy);
            }
            this._do_draw(options); 
            this._touch(minx, miny, maxx, maxy);   
        }
    }

    /**
     * Draws a text string
     * @param  {float} x
     * @param  {float} y
     * @param  {string} text string or callback that resolves to a string.
     * @param  {dictionary} options, see _apply_options() for details
     */
    draw_text(x, y, text, options) {
        var tx = this._tx(x);
        var ty = this._ty(y);
        text = this._process_tabs(text);
        options = this._apply_options(options);
        // 'fill' the text by default when neither a stroke or fill 
        // is defined.  Otherwise only fill if a fill is defined.
        if (options.fill || !options.stroke) {
            this.context.fillText(text, tx, ty);
        }
        // Only stroke if a stroke is defined.
        if (options.stroke) {
            this.context.strokeText(text, tx, ty);       
        }

        // Mark the region as dirty.
        var width = this.measure_text(text, options);
        var height = this._font_height;
        this._touch(tx, ty, tx + width, ty + height); 
    }

    /**
     * Get's a chunk of the canvas as a raw image.
     * @param  {float} (optional) x
     * @param  {float} (optional) y
     * @param  {float} (optional) width
     * @param  {float} (optional) height
     * @return {image} canvas image data
     */
    get_raw_image(x, y, width, height) {
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
    }

    /**
     * Put's a raw image on the canvas somewhere.
     * @param  {float} x
     * @param  {float} y
     * @return {image} canvas image data
     */
    put_raw_image(img, x, y) {
        console.warn('put_raw_image image is slow, use draw_image instead');
        var tx = this._tx(x);
        var ty = this._ty(y);
        // Multiply by two for pixel doubling.
        var ret = this.context.putImageData(img, tx*2, ty*2);
        this._touch(tx, ty, this.width, this.height); // Don't know size of image
        return ret;
    }

    /**
     * Measures the width of a text string.
     * @param  {string} text
     * @param  {dictionary} options, see _apply_options() for details
     * @return {float} width
     */
    measure_text(text, options) {
        options = this._apply_options(options);
        text = this._process_tabs(text);

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
    }

    /**
     * Create a linear gradient
     * @param  {float} x1
     * @param  {float} y1
     * @param  {float} x2
     * @param  {float} y2
     * @param  {array} color_stops - array of [float, color] pairs
     */
    gradient(x1, y1, x2, y2, color_stops) {
        var gradient = this.context.createLinearGradient(x1, y1, x2, y2);
        for (var i = 0; i < color_stops.length; i++) {
            gradient.addColorStop(color_stops[i][0], color_stops[i][1]);
        }
        return gradient;
    }

    /**
     * Clear's the canvas.
     * @param  {object} (optional) region, {x,y,width,height}
     */
    clear(region?) {
        if (region) {
            var tx = this._tx(region.x);
            var ty = this._ty(region.y);
            this.context.clearRect(tx, ty, region.width, region.height);
            this._touch(tx, ty, tx + region.width, ty + region.height);
        } else {
            this.context.clearRect(0, 0, this.width, this.height);
            this._touch();
        }
    }

    /**
     * Scale the current drawing.
     * @param  {float} x
     * @param  {float} y  
     */
    scale(x, y) {
        this.context.scale(x, y);
        this._touch();
    }

    /**
     * Finishes the drawing operation using the set of provided options.
     * @param  {dictionary} (optional) dictionary that 
     *  resolves to a dictionary.
     */
    _do_draw(options) {
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
    }

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
     *      text_align {string} Horizontal alignment of text.  
     *          Possible values are `start`, `end`, `center`,
     *          `left`, or `right`.
     *      text_baseline {string} Vertical alignment of text.
     *          Possible values are `alphabetic`, `top`, 
     *          `hanging`, `middle`, `ideographic`, or 
     *          `bottom`.
     * @return {dictionary} options, resolved.
     */
    _apply_options(options?: any) {
        options = options || {};
        options = utils.resolve_callable(options);

        // Special options.
        var set_options: any = {};
        set_options.globalAlpha = (options.alpha===undefined ? 1.0 : options.alpha);
        set_options.globalCompositeOperation = options.composite_operation || 'source-over';
        
        // Line style.
        set_options.lineCap = options.line_cap || 'butt';
        set_options.lineJoin = options.line_join || 'bevel';
        set_options.lineWidth = options.line_width===undefined ? 1.0 : options.line_width;
        set_options.miterLimit = options.line_miter_limit===undefined ? 10 : options.line_miter_limit;
        this.context.strokeStyle = options.line_color || options.color || 'black'; // TODO: Support gradient
        options.stroke = (options.line_color !== undefined || options.line_width !== undefined);

        // Fill style.
        this.context.fillStyle = options.fill_color || options.color || 'red'; // TODO: Support gradient
        options.fill = options.fill_color !== undefined;

        // Font style.
        var pixels = x => {
            if (x !== undefined && x !== null) {
                if (!isNaN(x)) {
                    return String(x) + 'px';
                } else {
                    return x;
                }
            } else {
                return null;
            }
        };
        var font_style = options.font_style || '';
        var font_variant = options.font_variant || '';
        var font_weight = options.font_weight || '';
        this._font_height = options.font_size || 12;
        var font_size = pixels(this._font_height);
        var font_family = options.font_family || 'Arial';
        var font = font_style + ' ' + font_variant + ' ' + font_weight + ' ' + font_size + ' ' + font_family;
        set_options.font = font;

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
    }

    /**
     * Update the timestamp that the canvas was modified and
     * the region that has contents rendered to it.
     */
    _touch(x1?, y1?, x2?, y2?) {
        this._modified = Date.now();

        var all_undefined = (x1===undefined && y1===undefined && x2===undefined && y2===undefined);
        var one_nan = (isNaN(x1*x2*y1*y2));
        if (one_nan || all_undefined) {
            this._rendered_region = [0, 0, this.width, this.height];
            return;
        }

        // Set the render region.
        var comparitor = (old_value, new_value, comparison) => {
            if (old_value === null || old_value === undefined || new_value === null || new_value === undefined) {
                return new_value;
            } else {
                return comparison.call(undefined, old_value, new_value);
            }
        };

        this._rendered_region[0] = comparitor(this._rendered_region[0], comparitor(x1, x2, Math.min), Math.min);
        this._rendered_region[1] = comparitor(this._rendered_region[1], comparitor(y1, y2, Math.min), Math.min);
        this._rendered_region[2] = comparitor(this._rendered_region[2], comparitor(x1, x2, Math.max), Math.max);
        this._rendered_region[3] = comparitor(this._rendered_region[3], comparitor(y1, y2, Math.max), Math.max);
    }

    /**
     * Transform an x value before rendering.
     * @param  {float} x
     * @param  {boolean} inverse - perform inverse transformation
     * @return {float}
     */
    _tx(x, inverse?) { return x; }

    /**
     * Transform a y value before rendering.
     * @param  {float} y
     * @param  {boolean} inverse - perform inverse transformation
     * @return {float}
     */
    _ty(y, inverse?) { return y; }

    /**
     * Convert tab characters to the config defined number of space 
     * characters for rendering.
     * @param  {string} s - input string
     * @return {string} output string
     */
    _process_tabs(s) {
        var space_tab = '';
        for (var i = 0; i < (config.tab_width || 1); i++) {
            space_tab += ' ';
        }
        return s.replace(/\t/g, space_tab);
    }
}
