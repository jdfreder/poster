// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

import utils = require('./utils/utils');
import normalizer = require('./control/normalizer');
import keymap = require('./control/map');
import default_keymap = require('./control/default');
import cursors = require('./control/cursors');
import clipboard = require('./control/clipboard');
import history = require('./control/history');
import document_model = require('./document_model');

/**
 * Controller for a DocumentModel.
 */
export class DocumentController extends utils.PosterClass {
    public clipboard: clipboard.Clipboard;
    public normalizer: normalizer.Normalizer;
    public map: keymap.Map;
    public history: history.History;
    public cursors: cursors.Cursors;

    public constructor(el: HTMLElement, model: document_model.DocumentModel) {
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
