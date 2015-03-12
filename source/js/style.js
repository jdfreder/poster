// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

import * as utils from './utils.js';
import * as styles from './styles/init.js';

/**
 * Style
 */
export class Style extends utils.PosterClass {
    constructor() {
        super.constructor([
            'comment',
            'string',
            'class-name',
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
     * Load a rendering style
     * @param  {string or dictionary} style - name of the built-in style 
     *         or style dictionary itself.
     * @return {boolean} success
     */
    load(style) {
        try {
            // Load the style if it's built-in.
            if (styles.styles[style]) {
                style = styles.styles[style].style;
            }

            // Read each attribute of the style.
            for (let key in style) {
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
