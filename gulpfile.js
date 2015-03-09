'use strict';

var browserify = require('browserify');
var gulp = require('gulp');
var transform = require('vinyl-transform');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var less = require('gulp-less');
var concat = require('gulp-concat');
var glob = require("glob");
// var ts = require('gulp-typescript');
var babelify = require("babelify");
var debug = require('gulp-debug');

gulp.task('default', ['javascript', 'less']);

gulp.task('watch', function() {
    glob('./source/js/**/', undefined, function(error, dirs) {
        dirs.forEach(function(dir) {
            gulp.watch(dir + '*.js', ['javascript']);
        });
    })
    gulp.watch('source/less/*.less', ['less']);
});

gulp.task('components', function(callback) {
    glob('./source/components/prism/components/*.js', undefined, function(error, dirs) {
        dirs.splice(dirs.indexOf('./source/components/prism/components/prism-css-extras.js'), 1)
        gulp
            .src(dirs)
            .pipe(concat('prism.js'))
            .pipe(gulp.dest('./source/components/'));
        callback();
    })
});

gulp.task('javascript', ['components'], function() {
    var browserified = transform(function(filename) {
        return browserify(filename)
            // .plugin('tsify', { noImplicitAny: false })
            .transform(babelify)
            .bundle();
    });

    return gulp.src('./source/js/poster.js')
        .pipe(debug({title: 'input:'}))
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(debug({title: 'input(2):'}))
        .pipe(browserified)
        .pipe(debug({title: 'sourcemapped:'}))
        // Add transformation tasks to the pipeline here.
        // .pipe(uglify())
        .pipe(debug({title: 'uglified:'}))
        .pipe(sourcemaps.write('./'))
        .pipe(debug({title: 'sourcemaps gone:'}))
        .pipe(gulp.dest('./build/'))
        .pipe(debug({title: 'built:'}));
});

gulp.task('less', function() {
    gulp.src('source/less/poster.less')
        .pipe(less())
        .pipe(gulp.dest('./build/'));
});
