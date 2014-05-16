Application.Directives.directive('cgroup',
    function () {
        return {
            restrict: "E",
            transclude: true,
            scope: {
                label: '@label'
            },
            template: '<div class="form-group">' +
                '<label class="col-sm-2 control-label">{{ label }}</label>' +
                '<div class="input-group col-sm-4" ng-transclude>' +
                '</div>' +
                '</div>'
        };
    });

Application.Directives.directive('cgrouprequired',
    function () {
        return {
            restrict: "E",
            transclude: true,
            scope: {
                label: '@label'
            },
            template: '<div class="form-group">' +
                '<label class="col-sm-2 control-label">{{ label }} <i class="fa fa-asterisk" style="color: red"></i> </label>' +
                '<div class="input-group col-sm-4" ng-transclude>' +
                '</div>' +
                '</div>'
        };
    });