'use strict';

describe('module loader', function() {

  beforeEach(function() {
    setupModuleLoader(angular);
  });


  it('should set up namespace', function() {
    expect(angular).toBeDefined();
    expect(angular.module).toBeDefined();
  });


  it('should not override existing namespace', function() {
    var module = angular.module;

    setupModuleLoader(angular);
    expect(angular).toBe(angular);
    expect(angular.module).toBe(module);
  });


  it('should record calls', function() {
    var otherModule = angular.module('other', []);
    otherModule.config('otherInit');

    var myModule = angular.module('my', ['other'], 'config');

    expect(myModule.
      decorator('dk', 'dv').
      provider('sk', 'sv').
      factory('fk', 'fv').
      service('a', 'aa').
      value('k', 'v').
      config('init2').
      constant('abc', 123).
      run('runBlock')).toBe(myModule);

    expect(myModule.requires).toEqual(['other']);
    expect(myModule._invokeQueue).toEqual([
      ['$provide', 'constant', jasmine.objectContaining(['abc', 123])],
      ['$provide', 'provider', jasmine.objectContaining(['sk', 'sv'])],
      ['$provide', 'factory', jasmine.objectContaining(['fk', 'fv'])],
      ['$provide', 'service', jasmine.objectContaining(['a', 'aa'])],
      ['$provide', 'value', jasmine.objectContaining(['k', 'v'])]
    ]);
    expect(myModule._configBlocks).toEqual([
      ['$injector', 'invoke', jasmine.objectContaining(['config'])],
      ['$provide', 'decorator', jasmine.objectContaining(['dk', 'dv'])],
      ['$injector', 'invoke', jasmine.objectContaining(['init2'])]
    ]);
    expect(myModule._runBlocks).toEqual(['runBlock']);
  });


  it('should not throw error when `module.decorator` is declared before provider that it decorates', function() {
    angular.module('theModule', []).
      decorator('theProvider', function($delegate) { return $delegate; }).
      factory('theProvider', function() { return {}; });

    expect(function() {
      createInjector(['theModule']);
    }).not.toThrow();
  });


  it('should run decorators in order of declaration, even when mixed with provider.decorator', function() {
    var log = '';

    angular.module('theModule', [])
      .factory('theProvider', function() {
        return {api: 'provider'};
      })
      .decorator('theProvider', function($delegate) {
        $delegate.api = $delegate.api + '-first';
        return $delegate;
      })
      .config(function($provide) {
        $provide.decorator('theProvider', function($delegate) {
          $delegate.api = $delegate.api + '-second';
          return $delegate;
        });
      })
      .decorator('theProvider', function($delegate) {
        $delegate.api = $delegate.api + '-third';
        return $delegate;
      })
      .run(function(theProvider) {
        log = theProvider.api;
      });

      createInjector(['theModule']);
      expect(log).toBe('provider-first-second-third');
  });


  it('should decorate the last declared provider if multiple have been declared', function() {
    var log = '';

    angular.module('theModule', []).
      factory('theProvider', function() {
        return {
          api: 'firstProvider'
        };
      }).
      decorator('theProvider', function($delegate) {
        $delegate.api = $delegate.api + '-decorator';
        return $delegate;
      }).
      factory('theProvider', function() {
        return {
          api: 'secondProvider'
        };
      }).
      run(function(theProvider) {
        log = theProvider.api;
      });

    createInjector(['theModule']);
    expect(log).toBe('secondProvider-decorator');
  });


  it('should allow module redefinition', function() {
    expect(angular.module('a', [])).not.toBe(angular.module('a', []));
  });


  it('should complain of no module', function() {
    expect(function() {
      angular.module('dontExist');
    }).toThrowMinErr('$injector', 'nomod', 'Module \'dontExist\' is not available! You either misspelled the module name ' +
            'or forgot to load it. If registering a module ensure that you specify the dependencies as the second ' +
            'argument.');
  });

  it('should complain if a module is called "hasOwnProperty', function() {
    expect(function() {
      angular.module('hasOwnProperty', []);
    }).toThrowMinErr('ng','badname', 'hasOwnProperty is not a valid module name');
  });

  it('should expose `$$minErr` on the `angular` object', function() {
    expect(angular.$$minErr).toEqual(jasmine.any(Function));
  });
});
