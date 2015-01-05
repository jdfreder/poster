// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('./utils.js');
var config = new utils.PosterClass([
    'highlight_draw', // boolean - Whether or not to highlight re-renders
    'newline_width', // integer - Width of newline characters
    'tab_width', // integer - Tab character width measured in space characters
    'use_spaces', // boolean - Use spaces for indents instead of tabs
    'history_group_delay', // integer - Time (ms) to wait for another historical event
                        // before automatically grouping them (related to undo and redo 
                        // actions)
]);

// Set defaults
config.tab_width = 4;
config.use_spaces = true;
config.history_group_delay = 100;

exports.config = config;
