(function (module) {
    module.directive('navbar', navbarDirective);

    function navbarDirective() {
        return {
            restrict: 'E',
            bindToController: true,
            replace: true,
            templateUrl: 'index/navbar.html',
            controller: 'NavbarDirectiveController',
            controllerAs: 'ctrl'
        };
    }

    module.controller('NavbarDirectiveController', NavbarDirectiveController);
    NavbarDirectiveController.$inject = ['User', '$state', 'model.projects'];

    function NavbarDirectiveController(User, $state, projects) {
        var ctrl = this;

        var inProjectsState = $state.includes('projects');

        ctrl.query = '';
        ctrl.placeholder = inProjectsState ? 'SEARCH PROJECTS...' : 'SEARCH PROJECT...';

        ctrl.toggleHelp = help;
        ctrl.search = search;
        ctrl.home = home;
        ctrl.logout = logout;
        ctrl.user = User.u();

        ////////////////////////

        function help() {

        }

        function search() {
            //if (ctrl.query != '') {
            //    $state.go('projects.project.search', {query: ctrl.query}, {reload: true});
            //}
        }

        function home() {
            $state.go('projects');
        }

        function logout() {
            User.setAuthenticated(false);
            projects.clear();
            $state.go('login');
        }
    }
}(angular.module('materialscommons')));
