// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

import utils = require('./utils');
import normalizer = require('./events/normalizer');
import keymap = require('./events/map');
import default_keymap = require('./events/default');
import cursors = require('./cursors');
import clipboard = require('./clipboard');
import history = require('./history');

/**
 * Controller for a DocumentModel.
 */
export class DocumentController extends utils.PosterClass {
    public clipboard;
    public normalizer;
    public map;
    public history;
    public cursors;

    constructor(el, model) {
        super();
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
