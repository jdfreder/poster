// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
import utils = require('../utils/utils');
import generics = require('../utils/generics');
import styles = require('./init');

/**
 * Style
 */
export class Style extends utils.PosterClass {
    public comment: string;
    public string: string;
    public class_name: string;
    public keyword: string;
    public boolean: string;
    public function: string;
    public operator: string;
    public number: string;
    public ignore: string;
    public punctuation: string;
    public cursor: string;
    public cursor_width: string;
    public cursor_height: string;
    public selection: string;
    public selection_unfocused: string;
    public text: string;
    public background: string;
    public gutter: string;
    public gutter_text: string;
    public gutter_shadow: string;

    public constructor() {
        super([
            'comment',
            'string',
            'class_name',
            'keyword',
            'boolean',
            'function',
            'operator',
            'number',
            'ignore',
            'punctuation',

            'cursor',
            'cursor_width',
            'cursor_height',
            'selection',
            'selection_unfocused',

            'text',
            'background',
            'gutter',
            'gutter_text',
            'gutter_shadow'
        ]);

        // Load the default style.
        this.load('peacock');
    }

    /**
     * Get the value of a property of this instance.
     */
    get(name: string, default_value?: any): any {
        name = name.replace(/-/g, '_');
        return this[name] !== undefined ? this[name] : default_value;
    }


    /**
     * Load a rendering style
     * @param  style - name of the built-in style 
     *         or style dictionary itself.
     * @return success
     */
    public load(style: string): boolean;
    public load(style: generics.IDictionary<any>): boolean;
    public load(style: any): boolean {
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
    }
}
