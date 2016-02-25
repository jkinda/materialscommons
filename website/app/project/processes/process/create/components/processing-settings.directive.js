(function (module) {
    module.directive('processSettings', processSettingsDirective);
    function processSettingsDirective() {
        return {
            restrict: 'E',
            scope: {
                settings: '='
            },
            controller: 'ProcessSettingsDirectiveController',
            controllerAs: 'ctrl',
            bindToController: true,
            templateUrl: 'project/processes/process/create/components/process-settings.html'
        }
    }

    module.controller('ProcessSettingsDirectiveController', ProcessSettingsDirectiveController);
    ProcessSettingsDirectiveController.$inject = [];

    function ProcessSettingsDirectiveController() {
        var ctrl = this;
        ctrl.datePickerOptions = {
            formatYear: 'yy',
            startingDay: 1
        };
        ctrl.openDatePicker = openDatePicker;

        // Set default value on selections to first choice.
        ctrl.settings.forEach(function(setting) {
            // selection type
            if (setting.property._type === 'selection') {
                setting.property.value = setting.property.choices[0];
            } else if (setting.property._type === 'date') {
                setting.property.opened = false;
            }

            // unit selections
            if (setting.property.units.length !== 0) {
                setting.property.unit = setting.property.units[0];
            }
        });

        ///////////////////////////////////////

        function openDatePicker($event, prop) {
            $event.preventDefault();
            $event.stopPropagation();
            prop.opened = true;
        }
    }
}(angular.module('materialscommons')));