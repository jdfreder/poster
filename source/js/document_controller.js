// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('./utils.js');
var normalizer = require('./events/normalizer.js');
var keymap = require('./events/map.js');
var default_keymap = require('./events/default.js');
var cursors = require('./cursors.js');
var clipboard = require('./clipboard.js');
var history = require('./history.js');

/**
 * Controller for a DocumentModel.
 */
export class DocumentController extends utils.PosterClass {
    constructor(el, model) {
        super.constructor();
        this.clipboard = new clipboard.Clipboard(el);
        this.normalizer = new normalizer.Normalizer();
        this.normalizer.listen_to(el);
        this.normalizer.listen_to(this.clipboard.hidden_input);
        this.map = new keymap.Map(this.normalizer);
        this.map.map(default_keymap.map);
        this.history = new history.History(this.map)
        this.cursors = new cursors.Cursors(model, this.clipboard, this.history);
    }
}
