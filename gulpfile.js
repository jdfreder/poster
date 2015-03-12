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
    var core = [
        './source/components/prism/components/prism-core.js',
        './source/components/prism/components/prism-markup.js',
        './source/components/prism/components/prism-css.js',
        './source/components/prism/components/prism-clike.js',
        './source/components/prism/components/prism-javascript.js'
    ];
    glob('./source/components/prism/components/*.js', undefined, function(error, dirs) {
        dirs.splice(dirs.indexOf(), 1)
        dirs = dirs.filter(function(x) {
            return x.slice(-7) !== '.min.js' &&
                core.indexOf(x) === -1;
        })
        gulp
            .src(core.concat(dirs))
            .pipe(concat('prism.js'))
            .pipe(gulp.dest('./source/components/'))
            .on('end', function() { callback(); });
    })
});

gulp.task('javascript', ['components'], function() {
    var browserified = transform(function(filename) {
        return browserify(filename)
            // .plugin('tsify', { noImplicitAny: false, target: 'ES5' })
            .transform(babelify)
            .bundle();
    });

    return gulp.src('./source/js/poster.js')
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(browserified)
        // Add transformation tasks to the pipeline here.
        // .pipe(uglify())
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('./build/'))
});

gulp.task('less', function() {
    gulp.src('source/less/poster.less')
        .pipe(less())
        .pipe(gulp.dest('./build/'));
});
