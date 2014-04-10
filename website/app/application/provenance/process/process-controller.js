Application.Provenance.Controllers.controller('provenanceProcess',
    ["$scope", "mcapi", "watcher", "alertService", "ProvSteps", "ProvDrafts", "dateGenerate", "User", "$injector",
        function ($scope, mcapi, watcher, alertService, ProvSteps, ProvDrafts, dateGenerate, User,  $injector) {
            var $validationProvider = $injector.get('$validation'), check;

            watcher.watch($scope, 'bk.process_type', function (template) {
                if ($scope.process.template.template_name === template.template_name) {
                    // All attributes already loaded from a draft
                    return;
                }
                $scope.process.default_properties = template.default_properties;
                $scope.process.required_input_conditions = template.required_input_conditions;
                $scope.process.required_output_conditions = template.required_output_conditions;
                $scope.process.required_input_files = template.required_input_files;
                $scope.process.required_output_files = template.required_output_files;
                var now = new Date();
                var dd = ("0" + now.getDate()).slice(-2);
                var mm = ("0" + (now.getMonth() + 1)).slice(-2);
                var today = now.getFullYear() + "-" + mm + "-" + dd;
                $scope.process.name = template.template_name + ':' + today;
                $scope.process.template = template;
            });
            $scope.addAdditionalProperty = function () {
                $scope.process.added_properties.push(JSON.parse($scope.additionalProperty));
            };

            $scope.addCustomProperty = function () {
                $scope.process.added_properties.push({'name': $scope.customPropertyName, 'value': $scope.customPropertyValue, "type": "text", 'unit': '', 'value_choice': [], 'unit_choice': [], 'required': false});
            };


            $scope.remove_run = function (index) {
                $scope.process.runs.splice(index, 1);
            };

            $scope.saveDraft = function (form) {
                check = $validationProvider.checkValid(form);
                if (check === true) {
                    ProvDrafts.current.name = $scope.process.name;
                    ProvDrafts.saveDraft();
                    $scope.message = "Your draft has been saved!";
                } else {
                    $validationProvider.validate(form);
                }

            };

            $scope.next = function (form) {
                check = $validationProvider.checkValid(form);
                if (check === true) {
                    ProvSteps.setStepFinished('process');
                }
            };

            function init() {
                $scope.bk = {
                    new_note: '',
                    new_err_msg: '',
                    start_run: '',
                    stop_run: '',
                    process_type: ''
                };
                $scope.process = ProvDrafts.current.process;

                mcapi('/templates')
                    .argWithValue('filter_by', '"template_type":"process"')
                    .success(function (processes) {
                        var t;
                        $scope.process_templates = processes;
                        if ($scope.process.template !== "") {
                            t = _.findWhere($scope.process_templates, {template_name: $scope.process.template.template_name});
                            if (t) {
                                $scope.bk.process_type = t;
                            }
                        }
                    })
                    .error(function () {
                        alertService.sendMessage("Unable to retrieve processes from database.");
                    }).jsonp();

                mcapi('/machines')
                    .success(function (data) {
                        $scope.machines_list = data;

                        if ($scope.process.machine) {
                            var i = _.indexOf($scope.machines_list, function (item) {
                                return (item.name === $scope.process.machine.name);
                            });

                            if (i !== -1) {
                                $scope.process.machine = $scope.machines_list[i];
                            }
                        }
                    }).jsonp();

            }

            init();
        }]);
