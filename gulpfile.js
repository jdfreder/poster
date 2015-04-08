'use strict';

var gulp = require('gulp');
var less = require('gulp-less');
var ts = require('gulp-typescript');
var merge = require('merge2');
var browserify = require('gulp-browserify');
var child_process = require("child_process");
// var debug = require('gulp-debug');

// Default task set.
gulp.task('default', ['docs', 'javascript', 'less']);

/*
 * Watch for changes.
 */
gulp.task('watch', function() {
    gulp.watch('source/ts/**/*.ts', ['docs', 'javascript']);
    gulp.watch('source/less/*.less', ['less']);
});

/*
 * Compile API docs from typescript.
 */
gulp.task('docs', [], function(cb) {
    child_process.exec("typedoc --out ./docs --module commonjs --target es5 --name Poster ./source/ts/", cb);
});

/*
 * Transpile typescript to javascript.
 */
gulp.task('typescript', [], function() {
    var tsResult = gulp.src('./source/ts/**/*.ts')
       .pipe(ts({
            declarationFiles: true,
            noExternalResolve: false,
            target: 'ES5',
            module: 'commonjs',
       }));

    return merge([
        tsResult.dts,
        tsResult
            .js
            .pipe(gulp.dest('./tmp'))]);
});

/*
 * Browserify
 */
gulp.task('javascript', ['typescript'], function() {
    gulp.src('tmp/poster.js')
        .pipe(browserify({
            insertGlobals : true,
        }))
        .pipe(gulp.dest('./build'));
});

/*
 * Compile less to css
 */
gulp.task('less', function() {
    gulp.src('source/less/poster.less')
        .pipe(less())
        .pipe(gulp.dest('./build/'));
});
