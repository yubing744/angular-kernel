/* global jQuery: true, uid: true, jqCache: true */
'use strict';

var supportTests = {
  classes: '(class {})',
  fatArrow: 'a => a',
  ES6Function: '({ fn(x) { return; } })'
};

var support = {};

for (var prop in supportTests) {
  if (supportTests.hasOwnProperty(prop)) {
    try {
      // eslint-disable-next-line no-eval
      eval(supportTests[prop]);
      support[prop] = true;
    } catch (e) {
      support[prop] = false;
    }
  }
}
