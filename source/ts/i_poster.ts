// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
import scrolling_canvas = require('./draw/scrolling_canvas');
import document_controller = require('./document_controller');
import document_model = require('./document_model');
import document_view = require('./document_view');
import style = require('./styles/style');
import utils = require('./utils/utils');
import plugin_manager = require('./plugins/manager');

/**
 * Canvas based text editor
 */
export interface IPoster {
    canvas: scrolling_canvas.ScrollingCanvas;
    el: HTMLDivElement;
    model: document_model.DocumentModel;
    controller: document_controller.DocumentController;
    view: document_view.DocumentView;
    plugins: plugin_manager.PluginManager;
    style: style.Style;
    config: any;
    value: string;
    width: number;
    height: number;
    language: string;
}
