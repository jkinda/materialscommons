Application.Directives.directive('wizardStepProperties', wizardStepPropertiesDirective);

function wizardStepPropertiesDirective() {
    return {
        scope: {},
        controller: "wizardStepPropertiesDirectiveController",
        restrict: "EA",
        templateUrl: "application/core/projects/directives/provenance/wizard-step-properties.html"
    };
}

Application.Controllers.controller('wizardStepPropertiesDirectiveController',
                                   ["$scope", "provStep", "$stateParams", "actionStatus",
                                    wizardStepPropertiesDirectiveController]);
function wizardStepPropertiesDirectiveController($scope, provStep, $stateParams, actionStatus) {
    $scope.wizardState = actionStatus.getCurrentActionState($stateParams.id);
    var step = provStep.getCurrentStep($stateParams.id);
    $scope.template = provStep.templateForStep($scope.wizardState.selectedTemplate, step);
    $scope.model = $scope.wizardState.currentDraft[step.stepType][$scope.template.id];

    $scope.next = function() {
        provStep.setProjectNextStep($stateParams.id, $scope.wizardState.selectedTemplate);
    };

    provStep.onLeave($stateParams.id, function() {
        setDoneState();
    });

    function setDoneState() {
        var properties = $scope.template.default_properties;
        var allRequiredSet = _.every(properties, propertySet);
        $scope.wizardState.currentDraft[step.stepType][step.step].done = allRequiredSet;
    }

    function propertySet(property) {
        if (!property.required) {
            // if it is not required, then it is properly set regardless.
            return true;
        }
        return $scope.model.properties[property.attribute].value;
    }
}
