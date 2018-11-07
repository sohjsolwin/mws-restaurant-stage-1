/*eslint-env node */

var gulp = require('gulp');
var sass = require('gulp-sass');
var autoprefixer = require('gulp-autoprefixer');
var browserSync = require('browser-sync').create();
var eslint = require('gulp-eslint');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var babel = require('gulp-babel');
var sourcemaps = require('gulp-sourcemaps');
var imagemin = require('gulp-imagemin');
var pngquant = require('imagemin-pngquant');

gulp.task('default', ['copy-html', 'copy-idb', 'copy-images-dist', 'styles', 'lint', 'scripts-home', 'scripts-rest'], function() {
  gulp.watch('./sass/**/*.scss', ['styles']);
  gulp.watch('./js/**/*.js', ['lint']);
  gulp.watch('./*.html', ['copy-html']);
  gulp.watch('./sw.js', ['copy-html']);
  gulp.watch('./dist/index.html').on('change', browserSync.reload);
  gulp.watch('./dist/restautant.html').on('change', browserSync.reload);

  browserSync.init({
    server: './dist'
  });
});

gulp.task('dist', [
  'copy-html',
  'copy-idb',
  'copy-images-dist',
  'styles',
  'lint',
  'scripts-home-dist',
  'scripts-rest-dist'
]);

gulp.task('scripts-home', function() {
  gulp.src(['js/main.js', 'js/dbhelper.js'])
    .pipe(babel())
    .pipe(concat('main.js'))
    .pipe(gulp.dest('./dist/js'));
});
gulp.task('scripts-rest', function() {
  gulp.src(['js/restaurant_info.js', 'js/dbhelper.js'])
    .pipe(babel())
    .pipe(concat('restaurant_info.js'))
    .pipe(gulp.dest('./dist/js'));
});

gulp.task('scripts-home-dist', function() {
  gulp.src(['js/main.js', 'js/dbhelper.js'])
    .pipe(sourcemaps.init())
    .pipe(babel())
    .pipe(concat('main.js'))
    .pipe(sourcemaps.write('.'))
    .pipe(uglify())
    .pipe(gulp.dest('./dist/js'));
});

gulp.task('scripts-rest-dist', function() {
  gulp.src(['js/restaurant_info.js', 'js/dbhelper.js'])
    .pipe(sourcemaps.init())
    .pipe(babel())
    .pipe(concat('restaurant_info.js'))
    .pipe(sourcemaps.write('.'))
    .pipe(uglify())
    .pipe(gulp.dest('./dist/js'));
});

gulp.task('copy-idb', function() {
  gulp.src('./js/idb.js')
    .pipe(gulp.dest('./dist/js'));
});

gulp.task('copy-html', function() {
  gulp.src(['./index.html', './restaurant.html', './sw.js', './manifest.json'])
    .pipe(gulp.dest('./dist'));
});

gulp.task('copy-images', function() {
  gulp.src('img/**/*')
    .pipe(gulp.dest('dist/img'));
});

gulp.task('copy-images-dist', function() {
  gulp.src('img/**/*')
    .pipe(imagemin({
      progressive: true,
      use:[pngquant()]
    }))
    .pipe(gulp.dest('dist/img'));
});

gulp.task('styles', function() {
  gulp.src('sass/**/*.scss')
    .pipe(sass({
      outputStyle: 'compressed'
    }).on('error', sass.logError))
    .pipe(autoprefixer({
      browsers: ['last 2 versions']
    }))
    .pipe(gulp.dest('dist/css'))
    .pipe(browserSync.stream());
});

gulp.task('lint', function () {
  return gulp.src(['js/**/*.js'])
    // eslint() attaches the lint output to the eslint property
    // of the file object so it can be used by other modules.
    .pipe(eslint())
    // eslint.format() outputs the lint results to the console.
    // Alternatively use eslint.formatEach() (see Docs).
    .pipe(eslint.format())
    // To have the process exit with an error code (1) on
    // lint error, return the stream and pipe to failOnError last.
    .pipe(eslint.failOnError());
});