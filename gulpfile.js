var gulp = require('gulp'),
    uglify = require('gulp-uglify'),
    sass = require('gulp-ruby-sass'),
    plumber = require('gulp-plumber'),
    prefix = require('gulp-autoprefixer'),
    tinypng = require('gulp-tinypng-compress'),
    data = require('gulp-data'),
    rename = require("gulp-rename"),
    jade = require('gulp-jade'),
    del = require('del');

//Paths
var siteDev = "_dev/",
    sitePath;

//Switch between Final Site and Tests
switch ('prod') {
  case 'prod': sitePath = "_site/";
    break;
  case 'test': sitePath = "_test/";
      break;
  default:
    sitePath = "_test/";
}

//Json Files
var resources = {
    //Modules
    "hiw": require('./_dev/data/_partials/how-it-works.json'),
    "header": require('./_dev/data/_partials/header.json'),
    "partners": require('./_dev/data/_partials/media-partners.json'),
    "footer": require('./_dev/data/_partials/footer.json'),

    //Pages
    "home": require('./_dev/data/index.json'),
    "guideCommon": require('./_dev/data/guide.json'),
    "faq": require('./_dev/data/faq.json'),
    "podcasts": require('./_dev/data/podcasts.json'),
    "business": require('./_dev/data/business.json'),
    "investors": require('./_dev/data/investors.json'),
    "error404": require('./_dev/data/error404.json'),
    "presskit": require('./_dev/data/presskit.json'),

    //Guides
    "guide": {}
};

var fullRender = true;
//Guides to render - switch full render or speedtest render
switch (fullRender) {
  case true:
    var langsToRender = ['en', 'fr', 'es', 'pt', 'br', 'cn', 'hk'];
    var guidesToRender = ['amsterdam', 'barcelona', 'beijing-forbiddencity', 'beijing', 'berlin', 'boston', 'istanbul', 'lisbon', 'london-jacktheripper', 'london-sherlockholmes', 'london', 'los-angeles', 'milan', 'moscow', 'munich','new-york', 'paris', 'philadelphia', 'rio-de-janeiro', 'rome', 'san-francisco', 'sao-paulo', 'st-petersburg', 'tokyo', 'vienna', 'washington'];
    break;
  case false:
    case false: var langsToRender = ['en', 'pt', 'cn'];
    var guidesToRender = ['amsterdam', 'lisbon', 'london-jacktheripper', 'london-sherlockholmes', 'london', 'washington'];
    break;
  default:
    console.log("Render not declared");
}

//errorLog
function errorLog(error) {
  console.error.bind(error);
  this.emit('end');
}

function jadeByLanguageAndOrGuide(language, guide) {
    var src;
    if(guide) {
        src = siteDev + 'jade/guide.jade';
    } else {
        src = [siteDev + 'jade/**/index.jade', '!' + siteDev + 'jade/guide.jade'];
    }

    return gulp.src(src)
        .pipe(plumber())
        .pipe(jade({
            locals: {
                "_data": resources,
                "lang": language,
                "_guide": guide
            }
        }))
        .pipe(rename(function(path) {
            if(guide) {
                path.dirname += '/' + guide;
                path.basename = 'index';
            }
        }))
        .pipe(gulp.dest(sitePath + language + "/"));
}

//gulp-jade
gulp.task('jade', function(lang) {
    var tasks = [];
    for(var langIndex = 0; langIndex < langsToRender.length; langIndex++) {
        tasks.push(jadeByLanguageAndOrGuide(langsToRender[langIndex]));

        for(var guideIndex = 0; guideIndex < guidesToRender.length; guideIndex++) {
            resources.guide[guidesToRender[guideIndex]] = require('./_dev/data/guides/' + guidesToRender[guideIndex] + '.json');
            tasks.push(jadeByLanguageAndOrGuide(langsToRender[langIndex], guidesToRender[guideIndex]));
        }
    }
    return merge(tasks);
});

// Uglifies JS (minify JavaScript)
gulp.task('uglify', function(){
    gulp.src(siteDev + 'assets/js/**/*.js')
    .pipe(plumber())
    .pipe(uglify())
    .pipe(gulp.dest(sitePath + 'assets/js'));
});

gulp.task('jsbeauty', function(){
    gulp.src(siteDev + 'assets/js/**/*.js')
    .pipe(plumber())
    .pipe(gulp.dest(sitePath + 'assets/js'));
});

// Styles SASS - CSS
gulp.task('sass', function(){
    return sass(siteDev + 'assets/scss/**/*.scss', {
      style: 'compressed'})
      .on('error', errorLog)
      .pipe(prefix(['last 15 versions', '> 1%']))
      .pipe(gulp.dest(sitePath + '/assets/css/'));
});

//Copy Images from Dev to Prod
gulp.task('images', function() {
   gulp.src(siteDev + 'assets/img/**/*')
   .pipe(gulp.dest(sitePath + 'assets/img'));
});

//Copy HTMLs, PDFs and other statics files besides images
gulp.task('statics', function() {
   gulp.src(siteDev + 'statics/**/*')
   //.pipe(htmlmin({collapseWhitespace: true}))
   .pipe(gulp.dest(sitePath));
});

// images + statics task
gulp.task('others', function(){
    gulp.start(['images', 'statics']);
});

//tinypng
gulp.task('tinypng', function () {
	gulp.src(siteDev + 'assets/img/**/*.{png,jpg,jpeg}')
		.pipe(tinypng({
			key: 'OXJSSh5FX5UKWFbTw9UmYbAFuDixLT-E',
			sigFile: 'images/.tinypng-sigs',
			log: true
		}))
		.pipe(gulp.dest(siteDev + 'assets/img/'));
});

var getJsonData = function(file) {
  return require(file.path);
};

//Localhost (por desenvolver)
gulp.task('webserver', function() {
  gulp.src('./' + sitePath)
    .pipe(webserver({
      directoryListing: {
        enable: true,
        path: './' + sitePath,
      },
      open: true
    }));
});

gulp.task('clean', function() {
  return del([
      sitePath
  ], {force: true});
});

// Watch task
gulp.task('watch', function(){
    gulp.watch(siteDev + 'jade/**/*.jade', ['jade']);
    gulp.watch(siteDev + 'assets/js/*.js', ['uglify']);
    gulp.watch(siteDev + 'assets/scss/**/*.*', ['sass']);
});

gulp.task('default', function() {
    gulp.start(['uglify', 'jade', 'sass', 'watch']);
});

function upload(bucket) {
  return gulp.src("./" + sitePath + "**/*")
      .pipe(s3({
          Bucket: bucket, //  Required
          ACL:    'public-read'       //  Needs to be user-defined
      }, {
          // S3 Construcor Options, ie:
          maxRetries: 5
      }));
}

gulp.task("upload", function() {
  return upload('dev.jitt.travel');
});

gulp.task("upload-prod", function() {
  return upload('jitt.travel');
});
