// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

import utils = require('../utils/utils');
import document_model = require('../document_model');
import row = require('../draw/renderers/row');

/**
 * Listens to a model and higlights the text accordingly.
 * @param {DocumentModel} model
 */
export class HighlighterBase extends utils.PosterClass {
    public delay: number;

    protected _model: document_model.DocumentModel;
    
    private _row_renderer: row.RowRenderer;
    private _queued: number;
    
    public constructor(model: document_model.DocumentModel, row_renderer: row.RowRenderer) {
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
     */
    public highlight(start_row: number, end_row: number) {
        throw new Error('Not implemented');
    }

    /**
     * Queues a highlight operation.
     *
     * If a highlight operation is already queued, don't queue
     * another one.  This ensures that the highlighting is
     * frame rate locked.  Highlighting is an expensive operation.
     */
    protected _queue_highlighter(): void {
        if (this._queued === null) {
            this._queued = setTimeout(() => {
                this._model.acquire_tag_event_lock();
                try {
                    var visible_rows: row.IRowRange = this._row_renderer.get_visible_rows();
                    var top_row: number = visible_rows.top_row;
                    var bottom_row: number = visible_rows.bottom_row;
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
     */
    private _handle_scroll(start_row: number, end_row: number): void {
        this._queue_highlighter();
    }

    /**
     * Handles when the text changes.
     */
    private _handle_text_change(): void {
        this._queue_highlighter();
    }
}
