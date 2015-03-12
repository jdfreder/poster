// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

import * as utils from './utils.js';
import * as normalizer from './events/normalizer.js';
import * as keymap from './events/map.js';
import * as default_keymap from './events/default.js';
import * as cursors from './cursors.js';
import * as clipboard from './clipboard.js';
import * as history from './history.js';

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
