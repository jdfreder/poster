'use strict';

var browserify = require('browserify');
var gulp = require('gulp');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var less = require('gulp-less');

gulp.task('default', ['javascript', 'less']);

gulp.task('watch', function() {
  gulp.watch('source/js/*.js', ['javascript']);
  gulp.watch('source/js/renderers/*.js', ['javascript']);
  gulp.watch('source/js/highlighters/*.js', ['javascript']);
  gulp.watch('source/less/*.less', ['less']);
});

gulp.task('javascript', function() {
  return browserify({
      entries: ['./source/js/poster.js'],
      debug: true,
      standalone: 'poster',
    })
      .bundle()
      .pipe(source('poster.js'))
      .pipe(buffer())
      .pipe(gulp.dest('./build/'));
      // Add transformation tasks to the pipeline here.
      // This will minify and rename to foo.min.js
      // .pipe(sourcemaps.init({loadMaps: true}))
      // .pipe(uglify())
      // .pipe(sourcemaps.write('./'));
});

gulp.task('less', function() {
  gulp.src('source/less/poster.less')
    .pipe(less())
    .pipe(gulp.dest('./build/'));
});
