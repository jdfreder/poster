// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('./utils.js');
exports.config = new utils.PosterClass([
    'highlight_draw', // bool - Whether or not to highlight re-renders
    'newline_width', // integer - Width of newline characters
]);
