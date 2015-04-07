// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

import utils = require('./utils');
export class Config extends utils.PosterClass {
    /**
     * Whether or not to highlight re-renders
     */
    public highlight_draw: boolean;

    /**
     * Whether or not to highlight blit regions
     */
    public highlight_blit: boolean;

    /**
     * Width of newline characters
     */
    public newline_width: number;
    
    /**
     * Tab character width measured in space characters
     */
    public tab_width: number;

    /**
     * Use spaces for indents instead of tabs
     */
    public use_spaces: boolean;

    /**
     * Time (ms) to wait for another historical event 
     * before automatically grouping them (related to 
     * undo and redo actions)
     */
    public history_group_delay: number;

    public constructor() {
        super([
            'highlight_draw',
            'highlight_blit',
            'newline_width',
            'tab_width',
            'use_spaces',
            'history_group_delay',
        ]);
    }
}

export var config: Config = new Config();

// Set defaults
config.tab_width = 4;
config.use_spaces = true;
config.history_group_delay = 100;
