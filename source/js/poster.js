// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var scrolling_canvas = require('./scrolling_canvas.js');
var cursors = require('./cursors.js');
var document_model = require('./document_model.js');
var document_view = require('./document_view.js');
var test_highlighter = require('./highlighters/test.js');
var input_dispatcher = require('./input_dispatcher.js');
var utils = require('./utils.js');

/**
 * Canvas based text editor
 */
var Poster = function() {
    utils.PosterClass.call(this);

    // Create canvas
    this.canvas = new scrolling_canvas.ScrollingCanvas();
    this.el = this.canvas.el; // Convenience

    // Create model and controllers
    this._model = new document_model.DocumentModel();
    this._input_dispatcher = new input_dispatcher.InputDispatcher(this.el);
    this.cursors = new cursors.Cursors(this._model, this._input_dispatcher);

    // Create view
    this._view = new document_view.DocumentView(this.canvas, this._model, this.cursors, {keyword: 'red'});

    // Create highlighter
    this._highlighter = new test_highlighter.TestHighlighter(this._model);

    // Create properties
    var that = this;
    this.property('value', function() {
        return that._model.text;
    }, function(value) {
        that._model.text = value;
    });
};
utils.inherit(Poster, utils.PosterClass);

// Exports
exports.Poster = Poster;
