// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
import utils = require('../utils/utils');
import generics = require('../utils/generics');
import config_mod = require('../utils/config');
var config = config_mod.config;

export interface IPoint {
    x: number;
    y: number;
}

export interface IRectangle extends IPoint {
    width: number;
    height: number;
}

export interface IPointPair {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

export class CompositeOperationEnum {
    public constructor(public value: string) { }
    public toString(): string { return this.value; }
    // Possible values.
    static source_over = new CompositeOperationEnum('source-over');
    static source_atop = new CompositeOperationEnum('source-atop');
    static source_in = new CompositeOperationEnum('source-in');
    static source_out = new CompositeOperationEnum('source-out');
    static destination_over = new CompositeOperationEnum('destination-over');
    static destination_atop = new CompositeOperationEnum('destination-atop');
    static destination_in = new CompositeOperationEnum('destination-in');
    static destination_out = new CompositeOperationEnum('destination-out');
    static lighter = new CompositeOperationEnum('lighter');
    static copy = new CompositeOperationEnum('copy');
    static xor = new CompositeOperationEnum('xor');
}

export class TextAlignmentEnum {
    public constructor(public value: string) { }
    public toString(): string { return this.value; }
    // Possible values.
    static start = new TextAlignmentEnum('start');
    static end = new TextAlignmentEnum('end');
    static center = new TextAlignmentEnum('center');
    static left = new TextAlignmentEnum('left');
    static right = new TextAlignmentEnum('right');
}

export class TextBaselineEnum {
    public constructor(public value: string) { }
    public toString(): string { return this.value; }
    // Possible values.
    static alphabetic = new TextBaselineEnum('alphabetic');
    static top = new TextBaselineEnum('top');
    static hanging = new TextBaselineEnum('hanging');
    static middle = new TextBaselineEnum('middle');
    static ideographic = new TextBaselineEnum('ideographic');
    static bottom = new TextBaselineEnum('bottom');
}

export class LineCapEnum {
    public constructor(public value: string) { }
    public toString(): string { return this.value; }
    // Possible values.
    static butt = new LineCapEnum('butt');
    static round = new LineCapEnum('round');
    static square = new LineCapEnum('square');
}

export class LineJoinEnum {
    public constructor(public value: string) { }
    public toString(): string { return this.value; }
    // Possible values.
    static bevel = new LineJoinEnum('bevel');
    static round = new LineJoinEnum('round');
    static miter = new LineJoinEnum('miter');
}

export interface IDrawOptions {
    /**
     * Opacity (0-1)
     */
    alpha?: number;

    /**
     * Color to stroke and fill the shape.  Lower priority to 
     * line_color and fill_color.
     */
    color?: string; // TODO: Support gradient

    /**
     * How new images are drawn onto an existing image.
     */
    composite_operation?: CompositeOperationEnum;
    
    /**
     * NOTE: The API will automatically set this depending on
     * the other DrawOptions.  Whether or not the shape should 
     * be filled.
     */
    fill?: boolean;

    /**
     * Color to fill the shape.
     * To generate a gradient for use here, see `Canvas.gradient`.
     */
    fill_color?: string | CanvasGradient;

    font_style?: string;
    font_variant?: string;
    font_weight?: string;
    font_size?: number; // px
    font_family?: string;

    /**
     * End cap style for lines.
     */
    line_cap?: LineCapEnum;

    /**
     * How to render where two lines meet.
     */
    line_join?: LineJoinEnum;

    /**
     * How thick lines are.
     */
    line_width?: number;

    /**
     * Max length of miters.
     */
    line_miter_limit?: number;

    /**
     * Color of the line.
     */
    line_color?: string; // TODO: Support gradient

    /**
     * NOTE: The API will automatically set this depending on
     * the other DrawOptions.  Whether or not the shape should 
     * be stroked.
     */
    stroke?: boolean;

    /**
     * Horizontal alignment of text.
     */
    text_align?: TextAlignmentEnum;

    /**
     * Vertical alignment of text.
     */
    text_baseline?: TextBaselineEnum;
}

interface ICanvasOptions {
    font?: string;
    globalAlpha?: number;
    globalCompositeOperation?: string;
    lineCap?: string;
    lineJoin?: string;
    lineWidth?: number;
    miterLimit?: number;
    textAlign?: string;
    textBaseline?: string;
}

/**
 * HTML canvas with drawing convinience functions.
 */
export class Canvas extends utils.PosterClass {
    protected _canvas: HTMLCanvasElement;
    protected _context: CanvasRenderingContext2D;

    private _rendered_region: IPointPair;
    private _last_set_options: ICanvasOptions;
    private _text_size_cache: generics.IDictionary<number>;
    private _text_size_array: string[];
    private _text_size_cache_size: number = 1000;
    private _font_height: number;
    private _cached_timestamp: number;
    private _modified: number;
    private _cached_region: IPointPair;
    private _cached_image: ImageData;

    public constructor() {
        super();

        this._rendered_region = {
            x1: null, 
            y1: null, 
            x2: null, 
            y2: null
        };

        this._layout();
        this._last_set_options = {};

        this._text_size_cache = {};
        this._text_size_array = [];

        // Set default size.
        this.width = 400;
        this.height = 300;
    }

    public get context(): CanvasRenderingContext2D {
        return this._context;
    }

    /**
     * Height of the canvas
     */
    public get height(): number { 
        return this._canvas.height / 2; 
    }
    public set height(value: number) {
        this._canvas.setAttribute('height', String(value * 2));
        
        // Stretch the image for retina support.
        this.scale(2,2);
        this._touch();
    }

    /**
     * Width of the canvas
     */
    public get width(): number { 
        return this._canvas.width / 2; 
    }
    public set width(value: number) {
        this._canvas.setAttribute('width', String(value * 2));
        
        // Stretch the image for retina support.
        this.scale(2,2);
        this._touch();
    }

    /**
     * Region of the canvas that has been rendered to
     * @return null if canvas has changed since last check
     */
    public get rendered_region(): IRectangle {
        return this.get_rendered_region(true);
    }

    /**
     * HTML 5 Canvas element
     */
    public get canvas(): HTMLCanvasElement {
        return this._canvas;
    }

    /**
     * Gets the region of the canvas that has been rendered to.
     * @param  [reset] - resets the region.
     */
    public get_rendered_region(reset: boolean): IRectangle {
        var rendered_region = this._rendered_region;
        if (rendered_region.x1 === null) return null;

        if (reset) {
            this._rendered_region = {
                x1: null, 
                y1: null, 
                x2: null, 
                y2: null
            };
        }

        return {
            x: this.tx(rendered_region.x1, true),
            y: this.ty(rendered_region.y1, true),
            width: (this.tx(rendered_region.x2) - this.tx(rendered_region.x1)), 
            height: (this.ty(rendered_region.y2) - this.ty(rendered_region.y1)),
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
    public erase_options_cache(): void {
        this._last_set_options = {};
    }

    /**
     * Draws a rectangle
     */
    public draw_rectangle(x: number, y: number, width: number, height: number, options: IDrawOptions): void {
        var tx: number = this.tx(x);
        var ty: number = this.ty(y);
        this.context.beginPath();
        this.context.rect(tx, ty, width, height);
        this._do_draw(options);
        this._touch(tx, ty, tx+width, ty+height);
    }

    /**
     * Draws a circle
     */
    public draw_circle(x: number, y: number, r: number, options: IDrawOptions): void {
        var tx: number = this.tx(x);
        var ty: number = this.ty(y);
        this.context.beginPath();
        this.context.arc(tx, ty, r, 0, 2 * Math.PI);
        this._do_draw(options);
        this._touch(tx-r, ty-r, tx+r, ty+r);
    }

    /**
     * Draws an image
     */
    public draw_image(img: HTMLCanvasElement|Canvas, x: number, y: number, width?: number, height?: number, clip_bounds?: IRectangle): void {
        var tx: number = this.tx(x);
        var ty: number = this.ty(y);
        width = width || img.width;
        height = height || img.height;
        var html_img: HTMLCanvasElement = (<any>img).canvas ? (<Canvas><any>img).canvas : <HTMLCanvasElement><any>img;
        if (clip_bounds) {
            // Horizontally offset the image operation by one pixel along each 
            // border to eliminate the strange white l&r border artifacts.
            var hoffset: number = 1;
            this.context.drawImage(html_img, 
                (this.tx(clip_bounds.x) - hoffset) * 2, // Retina support
                this.ty(clip_bounds.y) * 2, // Retina support
                (clip_bounds.width + 2*hoffset) * 2, // Retina support
                clip_bounds.height * 2, // Retina support
                tx-hoffset, ty, width + 2*hoffset, height);
        } else {
            this.context.drawImage(html_img, tx, ty, width, height);
        }
        this._touch(tx, ty, tx + width, ty + height);
    }

    /**
     * Draws a line
     */
    public draw_line(x1: number, y1: number, x2: number, y2: number, options: IDrawOptions): void {
        var tx1: number = this.tx(x1);
        var ty1: number = this.ty(y1);
        var tx2: number = this.tx(x2);
        var ty2: number = this.ty(y2);
        this.context.beginPath();
        this.context.moveTo(tx1, ty1);
        this.context.lineTo(tx2, ty2);
        this._do_draw(options);
        this._touch(tx1, ty1, tx2, ty2);
    }

    /**
     * Draws a poly line
     * @param  points - array of points.  Each point is an array itself, of the 
     *                  form [x, y] where x and y are floating point values.
     */
    public draw_polyline(points: number[][], options: IDrawOptions): void {
        if (points.length < 2) {
            throw new Error('Poly line must have atleast two points.');
        } else {
            this.context.beginPath();
            var point: number[] = points[0];
            this.context.moveTo(this.tx(point[0]), this.ty(point[1]));

            var minx: number = this.width;
            var miny: number = this.height;
            var maxx: number = 0;
            var maxy: number = 0;
            for (var i: number = 1; i < points.length; i++) {
                point = points[i];
                var tx: number = this.tx(point[0]);
                var ty: number = this.ty(point[1]);
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
     */
    public draw_text(x: number, y: number, text: string, options: IDrawOptions): void {
        var tx: number = this.tx(x);
        var ty: number = this.ty(y);
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
     */
    public get_raw_image(x: number, y: number, width: number, height: number): ImageData {
        console.warn('get_raw_image image is slow, use canvas references instead with draw_image');
        if (x===undefined) {
            x = 0;
        } else {
            x = this.tx(x);
        }
        if (y===undefined) {
            y = 0;
        } else {
            y = this.ty(y);
        }
        if (width === undefined) width = this.width;
        if (height === undefined) height = this.height;

        // Multiply by two for pixel doubling.
        x = 2 * x;
        y = 2 * y;
        width = 2 * width;
        height = 2 * height;
        
        // Update the cached image if it's not the requested one.
        var region = {
            x1: x, 
            y1: y, 
            x2: width, 
            y2: height
        };
        if (!(this._cached_timestamp === this._modified && utils.compare_objects(region, this._cached_region))) {
            this._cached_image = this.context.getImageData(x, y, width, height);
            this._cached_timestamp = this._modified;
            this._cached_region = region;
        }

        // Return the cached image.
        return this._cached_image;
    }

    /**
     * Put's a raw image on the canvas somewhere.
     */
    public put_raw_image(img: ImageData, x: number, y: number): void {
        console.warn('put_raw_image image is slow, use draw_image instead');
        var tx: number = this.tx(x);
        var ty: number = this.ty(y);
        // Multiply by two for pixel doubling.
        var ret = this.context.putImageData(img, tx*2, ty*2);
        this._touch(tx, ty, this.width, this.height); // Don't know size of image
    }

    /**
     * Measures the width of a text string.
     */
    public measure_text(text: string, options: IDrawOptions): number {
        options = this._apply_options(options);
        text = this._process_tabs(text);

        // Cache the size if it's not already cached.
        if (this._text_size_cache[text] === undefined) {
            this._text_size_cache[text] = this.context.measureText(text).width;
            this._text_size_array.push(text);

            // Remove the oldest item in the array if the cache is too large.
            while (this._text_size_array.length > this._text_size_cache_size) {
                var oldest: string = this._text_size_array.shift();
                delete this._text_size_cache[oldest];
            }
        }
        
        // Use the cached size.
        return this._text_size_cache[text];
    }

    /**
     * Create a linear gradient
     * @param x1
     * @param y1
     * @param x2
     * @param y2
     * @param color_stops - array of [float, color] pairs
     */
    public gradient(x1:  number, y1:  number, x2:  number, y2:  number, color_stops: [number, string][]): CanvasGradient {
        var gradient: CanvasGradient = this.context.createLinearGradient(x1, y1, x2, y2);
        for (var i: number = 0; i < color_stops.length; i++) {
            gradient.addColorStop(color_stops[i][0], color_stops[i][1]);
        }
        return gradient;
    }

    /**
     * Clear's the canvas.
     */
    public clear(region?: IRectangle): void {
        if (region) {
            var tx = this.tx(region.x);
            var ty = this.ty(region.y);
            this.context.clearRect(tx, ty, region.width, region.height);
            this._touch(tx, ty, tx + region.width, ty + region.height);
        } else {
            this.context.clearRect(0, 0, this.width, this.height);
            this._touch();
        }
    }

    /**
     * Scale the current drawing.
     */
    public scale(x: number, y: number): void {
        this.context.scale(x, y);
        this._touch();
    }

    /**
     * Transform an x value before rendering.
     * @param x
     * @param [inverse] - perform inverse transformation
     */
    public tx(x: number, inverse?: boolean): number { return x; }

    /**
     * Transform a y value before rendering.
     * @param y
     * @param [inverse] - perform inverse transformation
     */
    public ty(y: number, inverse?: boolean): number { return y; }

    /**
     * Layout the elements for the canvas.
     * Creates `this.el`
     */
    protected _layout(): void {
        this._canvas = document.createElement('canvas');
        this._canvas.setAttribute('class', 'poster hidden-canvas');
        this._context = this._canvas.getContext('2d');
            
        // Stretch the image for retina support.
        this.scale(2,2);
    }

    /**
     * Finishes the drawing operation using the set of provided options.
     */
    private _do_draw(options?: IDrawOptions): void {
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
     */
    private _apply_options(options?: IDrawOptions): IDrawOptions {
        options = options || {};

        // Special options.
        var set_options: ICanvasOptions = {};
        set_options.globalAlpha = (options.alpha===undefined ? 1.0 : options.alpha);
        set_options.globalCompositeOperation = (options.composite_operation || CompositeOperationEnum.source_over).toString();
        
        // Line style.
        set_options.lineCap = (options.line_cap || LineCapEnum.butt).toString();
        set_options.lineJoin = (options.line_join || LineJoinEnum.bevel).toString();
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
        set_options.textAlign = (options.text_align || TextAlignmentEnum.left).toString();
        set_options.textBaseline = (options.text_baseline || TextBaselineEnum.top).toString();

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
    private _touch(x1?: number, y1?: number, x2?: number, y2?: number): void {
        this._modified = Date.now();

        var all_undefined: boolean = (x1===undefined && y1===undefined && x2===undefined && y2===undefined);
        var one_nan: boolean = (isNaN(x1*x2*y1*y2));
        if (one_nan || all_undefined) {
            this._rendered_region = {
                x1: 0, 
                y1: 0, 
                x2: this.width, 
                y2: this.height
            };
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

        this._rendered_region.x1 = comparitor(this._rendered_region.x1, comparitor(x1, x2, Math.min), Math.min);
        this._rendered_region.y1 = comparitor(this._rendered_region.y1, comparitor(y1, y2, Math.min), Math.min);
        this._rendered_region.x2 = comparitor(this._rendered_region.x2, comparitor(x1, x2, Math.max), Math.max);
        this._rendered_region.y2 = comparitor(this._rendered_region.y2, comparitor(y1, y2, Math.max), Math.max);
    }

    /**
     * Convert tab characters to the config defined number of space 
     * characters for rendering.
     */
    private _process_tabs(s: string): string {
        var space_tab = '';
        for (var i = 0; i < (config.tab_width || 1); i++) {
            space_tab += ' ';
        }
        return s.replace(/\t/g, space_tab);
    }
}
