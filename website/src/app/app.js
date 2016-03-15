import { setupRoutes } from './routes.js';
import { MCAppController } from './mc-app.controller';
import './global.services/index.module';
import './global.filters/index.module';
import './global.components/index.module';
import './login/index.module';
import './model/index.module';

angular.module('materialscommons',
    [
        'ngSanitize',
        'ngMessages',
        'ngMaterial',
        'ui.router',
        'restangular',
        'ui.tree',
        'RecursionHelper',
        'md.data.table',
        'angular.filter',
        'ui.calendar',
        'jmdobry.angular-cache',
        'ui.bootstrap',
        'angularGrid',
        'toastr',
        'ct.ui.router.extras.core', 'ct.ui.router.extras.transition',
        'ct.ui.router.extras.previous',
        'mc.global.services',
        'mc.global.filters',
        'mc.global.components',
        'mc.login',
        'mc.model'
    ])
    .config( appConfig)
    .run(appRun)
    .constant('mcglobals', setupMCGlobals())
    .controller('MCAppController', MCAppController);

function appConfig($stateProvider, $urlRouterProvider, $mdThemingProvider) {
    'ngInject';
    setupMaterialsTheme($mdThemingProvider);
    setupRoutes($stateProvider, $urlRouterProvider);
}

function appRun($scope, $rootScope, User, Restangular, $state, mcglobals) {
    'ngInject';

    Restangular.setBaseUrl(mcglobals.apihost);

    // appRun will run when the application starts up and before any controllers have run.
    // This means it will run on a refresh. We check if the user is already authenticated
    // during the run. If they are then the browser has been refreshed and we need to
    // set the apikey param for Restangular. This param is set in the login-controller.
    // However on a refresh the login-controller isn't run so we need to explicitly set
    // the apikey param in Restangular.
    if (User.isAuthenticated()) {
        Restangular.setDefaultRequestParams({apikey: User.apikey()});
    }

    var unregister = $rootScope.$on('$stateChangeStart', function(event, toState) {
        $rootScope.navbarSearchText = toState.name.startsWith('projects') ? 'SEARCH PROJECTS...' : 'SEARCH PROJECT...';
        if (!User.isAuthenticated() && toState.url !== '/login') {
            event.preventDefault();
            $state.go('login');
        }
    });

    $scope.$on('$destroy', function() { unregister(); });
}

function setupMCGlobals($window) {
    'ngInject';

    var mcglobals = {};
    if ($window.location.hostname === 'localhost') {
        mcglobals.apihost = $window.location.protocol + '//localhost:5002';
    } else {
        mcglobals.apihost = $window.location.protocol + '//' + $window.location.hostname + ':' + $window.location.port + '/api';
    }

    return mcglobals;
}

function setupMaterialsTheme($mdThemingProvider) {
    $mdThemingProvider.theme('default').primaryPalette('blue').accentPalette('red');
}