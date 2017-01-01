'use strict';

var angularFiles = {
  'angularSrc': [
    'src/minErr.js',
    'src/Angular.js',
    'src/loader.js',
    'src/shallowCopy.js',
    'src/stringify.js',
    'src/AngularPublic.js',
    'src/apis.js',

    'src/injector.js',

    'src/publishExternalApis.js'
  ],

  'angularTest': [
    'test/helpers/*.js',
    'test/*.js'
  ],

  'karma': [
    '@angularSrc',
    '@angularTest'
  ],

  'karmaExclude': [
    'src/angular-bootstrap.js'
  ]
};

if (exports) {
  exports.files = angularFiles;
  exports.mergeFilesFor = function() {
    var files = [];

    Array.prototype.slice.call(arguments, 0).forEach(function(filegroup) {
      angularFiles[filegroup].forEach(function(file) {
        // replace @ref
        var match = file.match(/^@(.*)/);
        if (match) {
          files = files.concat(angularFiles[match[1]]);
        } else {
          files.push(file);
        }
      });
    });

    return files;
  };
}
