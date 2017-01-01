'use strict';

var serveFavicon = require('serve-favicon');
var serveStatic = require('serve-static');
var serveIndex = require('serve-index');
var files = require('./angularFiles').files;
var util = require('./lib/grunt/utils.js');
var versionInfo = require('./lib/versions/version-info');
var path = require('path');
var e2e = require('./test/e2e/tools');

var semver = require('semver');
var exec = require('shelljs').exec;
var pkg = require(__dirname + '/package.json');

// Node.js version checks
if (!semver.satisfies(process.version, pkg.engines.node)) {
  reportOrFail('Invalid node version (' + process.version + '). ' +
               'Please use a version that satisfies ' + pkg.engines.node);
}

// Yarn version checks
var expectedYarnVersion = pkg.engines.yarn;
var currentYarnVersion = exec('yarn --version', {silent: true}).stdout.trim();
if (!semver.satisfies(currentYarnVersion, expectedYarnVersion)) {
  reportOrFail('Invalid yarn version (' + currentYarnVersion + '). ' +
               'Please use a version that satisfies ' + expectedYarnVersion);
}

// Grunt CLI version checks
var expectedGruntVersion = pkg.engines.grunt;
var currentGruntVersions = exec('grunt --version', {silent: true}).stdout;
var match = /^grunt-cli v(.+)$/m.exec(currentGruntVersions);
if (!match) {
  reportOrFail('Unable to compute the current grunt-cli version. We found:\n' +
               currentGruntVersions);
} else {
  if (!semver.satisfies(match[1], expectedGruntVersion)) {
  reportOrFail('Invalid grunt-cli version (' + match[1] + '). ' +
               'Please use a version that satisfies ' + expectedGruntVersion);
  }
}

// Ensure Node.js dependencies have been installed
if (!process.env.TRAVIS && !process.env.JENKINS_HOME) {
  var yarnOutput = exec('yarn install');
  if (yarnOutput.code !== 0) {
    throw new Error('Yarn install failed: ' + yarnOutput.stderr);
  }
}

module.exports = function(grunt) {

  // this loads all the node_modules that start with `grunt-` as plugins
  require('load-grunt-tasks')(grunt);

  // load additional grunt tasks
  grunt.loadTasks('lib/grunt');
  grunt.loadNpmTasks('angular-benchpress');

  // compute version related info for this build
  var NG_VERSION = versionInfo.currentVersion;
  NG_VERSION.cdn = versionInfo.cdnVersion;
  var dist = 'angular-core-' + NG_VERSION.full;

  if (versionInfo.cdnVersion == null) {
    throw new Error('Unable to read CDN version, are you offline or has the CDN not been properly pushed?\n' +
                    'Perhaps you want to set the NG1_BUILD_NO_REMOTE_VERSION_REQUESTS environment variable?');
  }

  //config
  grunt.initConfig({
    NG_VERSION: NG_VERSION,

    bp_build: {
      options: {
        buildPath: 'build/benchmarks',
        benchmarksPath: 'benchmarks'
      }
    },

    connect: {
      devserver: {
        options: {
          port: 8000,
          hostname: '0.0.0.0',
          base: '.',
          keepalive: true,
          middleware: function(connect, options) {
            var base = Array.isArray(options.base) ? options.base[options.base.length - 1] : options.base;
            return [
              util.conditionalCsp(),
              util.rewrite(),
              e2e.middleware(),
              serveFavicon('images/favicon.ico'),
              serveStatic(base),
              serveIndex(base)
            ];
          }
        }
      },
      testserver: {
        options: {
          // We use end2end task (which does not start the webserver)
          // and start the webserver as a separate process (in travis_build.sh)
          // to avoid https://github.com/joyent/libuv/issues/826
          port: 8000,
          hostname: '0.0.0.0',
          middleware: function(connect, options) {
            var base = Array.isArray(options.base) ? options.base[options.base.length - 1] : options.base;
            return [
              function(req, resp, next) {
                // cache get requests to speed up tests on travis
                if (req.method === 'GET') {
                  resp.setHeader('Cache-control', 'public, max-age=3600');
                }

                next();
              },
              util.conditionalCsp(),
              e2e.middleware(),
              serveFavicon('images/favicon.ico'),
              serveStatic(base)
            ];
          }
        }
      }
    },


    tests: {
      core: 'karma-core.conf.js'
    },


    autotest: {
      core: 'karma-core.conf.js'
    },


    protractor: {
      normal: 'protractor-conf.js',
      travis: 'protractor-travis-conf.js',
      jenkins: 'protractor-jenkins-conf.js'
    },


    clean: {
      build: ['build'],
      tmp: ['tmp']
    },

    eslint: {
      all: {
        src: [
          '*.js',
          'benchmarks/**/*.js',
          'docs/**/*.js',
          'lib/**/*.js',
          'scripts/**/*.js',
          'src/**/*.js',
          'test/**/*.js',
          'i18n/**/*.js',
          '!docs/app/assets/js/angular-bootstrap/**',
          '!docs/bower_components/**',
          '!docs/config/templates/**',
          '!src/angular.bind.js',
          '!i18n/closure/**',
          '!src/ngParseExt/ucd.js'
        ]
      }
    },

    build: {
      angular: {
        dest: 'build/angular-core.js',
        src: util.wrap([files['angularSrc']], 'angular-core')
      }
    },


    min: {
      angular: 'build/angular-core.js'
    },

    'ddescribe-iit': {
      files: [
        'src/**/*.js',
        'test/**/*.js',
        '!test/helpers/privateMocks*.js'
      ],
      options: {
        disallowed: [
          'fit',
          'iit',
          'xit',
          'fthey',
          'tthey',
          'xthey',
          'fdescribe',
          'ddescribe',
          'xdescribe',
          'it.only',
          'describe.only'
        ]
      }
    },

    'merge-conflict': {
      files: [
        'src/**/*',
        'test/**/*',
        'docs/**/*'
      ]
    },

    compress: {
      build: {
        options: {archive: 'build/' + dist + '.zip', mode: 'zip'},
        src: ['**'],
        cwd: 'build',
        expand: true,
        dot: true,
        dest: dist + '/'
      }
    },

    shell: {
      'install-node-dependencies': {
        command: 'yarn'
      },
      'promises-aplus-tests': {
        options: {
          stdout: false,
          stderr: true,
          failOnError: true
        },
        command: path.normalize('./node_modules/.bin/promises-aplus-tests tmp/promises-aplus-adapter++.js --timeout 2000')
      }
    },


    write: {
      versionTXT: {file: 'build/version.txt', val: NG_VERSION.full},
      versionJSON: {file: 'build/version.json', val: JSON.stringify(NG_VERSION)}
    },

    bump: {
      options: {
        files: ['package.json'],
        commit: false,
        createTag: false,
        push: false
      }
    }
  });

  //alias tasks
  grunt.registerTask('test', 'Run unit, docs and e2e tests with Karma', ['eslint', 'package', 'test:unit', 'test:protractor']);
  grunt.registerTask('test:unit', 'Run unit, jQuery and Karma module tests with Karma', ['tests:core']);
  grunt.registerTask('test:protractor', 'Run the end to end tests with Protractor and keep a test server running in the background', ['webdriver', 'connect:testserver', 'protractor:normal']);
  grunt.registerTask('test:travis-protractor', 'Run the end to end tests with Protractor for Travis CI builds', ['connect:testserver', 'protractor:travis']);
  grunt.registerTask('test:ci-protractor', 'Run the end to end tests with Protractor for Jenkins CI builds', ['webdriver', 'connect:testserver', 'protractor:jenkins']);
  grunt.registerTask('test:e2e', 'Alias for test:protractor', ['test:protractor']);
  grunt.registerTask('test:promises-aplus',['build:promises-aplus-adapter', 'shell:promises-aplus-tests']);

  grunt.registerTask('minify', ['bower', 'clean', 'build', 'minall']);
  grunt.registerTask('webserver', ['connect:devserver']);
  grunt.registerTask('package', ['bower', 'clean', 'buildall', 'minall', 'collect-errors', 'write', 'compress']);
  grunt.registerTask('ci-checks', ['ddescribe-iit', 'merge-conflict', 'eslint']);
  grunt.registerTask('default', ['package']);
};


function reportOrFail(message) {
  if (process.env.TRAVIS || process.env.JENKINS_HOME) {
    throw new Error(message);
  } else {
    console.log('===============================================================================');
    console.log(message);
    console.log('===============================================================================');
  }
}
