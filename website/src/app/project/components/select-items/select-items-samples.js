(function (module) {
    module.directive('selectItemsSamples', selectItemsSamplesDirective);
    function selectItemsSamplesDirective() {
        return {
            restrict: 'E',
            scope: {
                samples: '='
            },
            controller: 'SelectItemsSamplesDirectiveController',
            controllerAs: 'ctrl',
            bindToController: true,
            templateUrl: 'app/project/components/select-items/select-items-samples.html'
        }
    }

    module.controller('SelectItemsSamplesDirectiveController', SelectItemsSamplesDirectiveController);
    SelectItemsSamplesDirectiveController.$inject = [];

    function SelectItemsSamplesDirectiveController() {
        var ctrl = this;

        ctrl.selected = [];
        ctrl.showSamplesInGroups = false;
        ctrl.showGroupsChanged = showGroupsChanged;
        ctrl.showGroupsFilter = {
            is_grouped: false
        };
        ctrl.toggleSampleSelected = toggleSampleSelected;

        /////////////////////////

        function showGroupsChanged() {
            if (!ctrl.showSamplesInGroups) {
                ctrl.showGroupsFilter = {
                    is_grouped: false
                }
            } else {
                ctrl.showGroupsFilter = {};
            }
        }

        function toggleSampleSelected(sample) {
            sample.selected = !sample.selected;
        }
    }
}(angular.module('materialscommons')));
