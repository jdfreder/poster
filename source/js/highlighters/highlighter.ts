// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

import utils = require('../utils');

/**
 * Listens to a model and higlights the text accordingly.
 * @param {DocumentModel} model
 */
export class HighlighterBase extends utils.PosterClass {
    public delay;

    protected _model;
    
    private _row_renderer;
    private _queued;
    
    constructor(model, row_renderer) {
        super();
        this._model = model;
        this._row_renderer = row_renderer;
        this._queued = null;
        this.delay = 15; //ms

        // Bind events.
        this._row_renderer.on('rows_changed', utils.proxy(this._handle_scroll, this));
        this._model.on('text_changed', utils.proxy(this._handle_text_change, this));
        this._model.on('row_changed', utils.proxy(this._handle_text_change, this));
    }

    /**
     * Highlight the document
     * @return {null}
     */
    highlight(start_row, end_row) {
        throw new Error('Not implemented');
    }

    /**
     * Queues a highlight operation.
     *
     * If a highlight operation is already queued, don't queue
     * another one.  This ensures that the highlighting is
     * frame rate locked.  Highlighting is an expensive operation.
     * @return {null}
     */
    _queue_highlighter() {
        if (this._queued === null) {
            this._queued = setTimeout(() => {
                this._model.acquire_tag_event_lock();
                try {
                    var visible_rows = this._row_renderer.get_visible_rows();
                    var top_row = visible_rows.top_row;
                    var bottom_row = visible_rows.bottom_row;
                    this.highlight(top_row, bottom_row);
                } finally {
                    this._model.release_tag_event_lock();
                    this._queued = null;
                }
            }, this.delay);
        }
    }

    /**
     * Handles when the visible row indicies are changed.
     * @return {null}
     */
    _handle_scroll(start_row, end_row) {
        this._queue_highlighter();
    }

    /**
     * Handles when the text changes.
     * @return {null}
     */
    _handle_text_change() {
        this._queue_highlighter();
    }
}
