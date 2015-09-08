(function (module) {
    module.directive('sidebarFiles', sidebarFilesDirective);
    function sidebarFilesDirective() {
        return {
            restrict: "EA",
            scope: true,
            templateUrl: 'application/core/projects/project/processes/sidebar/sidebar-files.html'
        };
    }
}(angular.module('materialscommons')));
