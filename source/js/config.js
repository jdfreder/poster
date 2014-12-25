// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('./utils.js');
var config = new utils.PosterClass([
    'highlight_draw', // boolean - Whether or not to highlight re-renders
    'newline_width', // integer - Width of newline characters
    'tab_width', // integer - Tab character width measured in space characters
    'use_spaces', // boolean - Use spaces for indents instead of tabs
]);

// Set defaults
config.tab_width = 4;
config.use_spaces = true;

exports.config = config;