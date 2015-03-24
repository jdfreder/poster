'use strict';

var gulp = require('gulp');
var less = require('gulp-less');
var ts = require('gulp-typescript');
var merge = require('merge2');
var browserify = require('gulp-browserify');
// var debug = require('gulp-debug');

// Default task set.
gulp.task('default', ['javascript', 'less']);

/*
 * Watch for changes.
 */
gulp.task('watch', function() {
    gulp.watch('source/js/**/*.ts', ['javascript']);
    gulp.watch('source/less/*.less', ['less']);
});

/*
 * Transpile typescript to javascript.
 */
gulp.task('typescript', [], function() {
    var tsResult = gulp.src('./source/js/**/*.ts')
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
