'use strict';

var angularFiles = require('./angularFiles');
var sharedConfig = require('./karma-shared.conf');

module.exports = function(config) {
  sharedConfig(config, {testName: 'AngularJS: Core', logFile: 'karma-core.log'});

  config.set({
    files: angularFiles.mergeFilesFor('karma'),
    exclude: angularFiles.mergeFilesFor('karmaExclude'),

    junitReporter: {
      outputFile: 'test_out/core.xml',
      suite: 'core'
    }
  });
};
