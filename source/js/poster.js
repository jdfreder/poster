// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var scrolling_canvas = require('./scrolling_canvas.js');
var document_controller = require('./document_controller.js');
var document_model = require('./document_model.js');
var document_view = require('./document_view.js');
var pluginmanager = require('./plugins/manager.js');
var plugin = require('./plugins/plugin.js');
var renderer = require('./renderers/renderer.js');
var style = require('./style.js');
var utils = require('./utils.js');
var config = require('./config.js');
config = config.config;

/**
 * Canvas based text editor
 */
var Poster = function() {
    utils.PosterClass.call(this);

    // Create canvas
    this.canvas = new scrolling_canvas.ScrollingCanvas();
    this.el = this.canvas.el; // Convenience
    this._style = new style.Style();

    // Create model, controller, and view.
    var that = this;
    this.model = new document_model.DocumentModel();
    this.controller = new document_controller.DocumentController(this.canvas.el, this.model);
    this.view = new document_view.DocumentView(
        this.canvas, 
        this.model, 
        this.controller.cursors, 
        this._style,
        function() { return that.controller.clipboard.hidden_input === document.activeElement || that.canvas.focused; }
    );

    // Create properties
    this.property('style', function() {
        return that._style;
    });
    this.property('config', function() {
        return config;
    });
    this.property('value', function() {
        return that.model.text;
    }, function(value) {
        that.model.text = value;
    });
    this.property('width', function() {
        return that.view.width;
    }, function(value) {
        that.view.width = value;
        that.trigger('resized');
    });
    this.property('height', function() {
        return that.view.height;
    }, function(value) {
        that.view.height = value;
        that.trigger('resized');
    });
    this.property('language', function() {
        return that.view.language;
    }, function(value) {
        that.view.language = value;
    });

    // Load plugins.
    this.plugins = new pluginmanager.PluginManager(this);
    this.plugins.load('gutter');
    this.plugins.load('linenumbers');
};
utils.inherit(Poster, utils.PosterClass);

// Exports
exports.Poster = Poster;
exports.PluginBase = plugin.PluginBase;
exports.RendererBase = renderer.RendererBase;
exports.utils = utils;
