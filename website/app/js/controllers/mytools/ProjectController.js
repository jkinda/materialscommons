function ListProjectsController($scope, mcapi, Stater, wizard, treeToggle) {
    mcapi('/projects')
        .success(function (data) {
            $scope.projects = data;
        })
        .error(function (data) {

        }).jsonp();

    $scope.clicked = function () {
        $scope.clicked = true;
    }
    $scope.selected_project = function (proj_id) {

        mcapi('/projects/%/tree', proj_id)
            .success(function (data) {
                $scope.tree_data = $scope.flattenTree(data);

            })
            .error(function (data) {

            }).jsonp();
    }

    $scope.flattenTree = function (tree) {
        var flatTree = [],
            treeModel = new TreeModel(),
            root = treeModel.parse(tree[0]);
        root.walk({strategy: 'pre'}, function (node) {
            flatTree.push(node.model);
        });
        return flatTree;
    };

    var steps = {
        step: 'nav_choose_process',
        children: [
            {step: 'nav_choose_inputs'},
            {step: 'nav_choose_outputs',
                children: [
                    {step: 'nav_output_conditions'},
                    {step: 'nav_output_files'}
                ]
            },
            {step: 'nav_upload'}
        ]
    };

    wizard.setSteps(steps);


    Stater.newId("setting_provenance1", "Creating provenance1", "upload1", function (status, state) {
        if (status) {
            $scope.state = state;
            $scope.state.attributes.process = {};
            wizard.fireStep('nav_choose_process');

        }
    });

    $scope.setCurrentStep = function (step) {
        if (step == 'nav_choose_process') {
            wizard.fireStep(step);
        } else if (step == 'nav_choose_inputs' || step == 'nav_choose_outputs') {
            wizard.fireStepAfter(step);
        } else if (!wizard.isAfterCurrentStep(step)) {
            wizard.fireStep(step);
        }
    }

    $scope.isCurrentStep = function (step) {
        return wizard.currentStep() == step;
    }

    $scope.isSubStepOf = function (step) {
        return wizard.isSubStepOf(step, wizard.currentStep());
    }

    $scope.check = function (id){
        if (treeToggle.get_all_checked_items().indexOf(id)>= 0){ //open
            treeToggle.pop_checked_item(id);
        }
        else{
            treeToggle.add_checked_item(id);
        }
    }
}

function ProcessStepController($scope, mcapi, watcher, Stater, wizard) {

    wizard.waitOn($scope, 'nav_choose_process', function () {
        $scope.state = Stater.retrieve();

        if ('process' in $scope.state.attributes) {
            $scope.process = $scope.state.attributes.process;
        }

        mcapi('/templates')
            .argWithValue('filter_by', '"template_type":"process"')
            .success(function (processes) {
                $scope.process_templates = processes;
            })
            .error(function () {
                alertService.sendMessage("Unable to retrieve processes from database.");
            }).jsonp();
    });


    $scope.selected_template_type = function (id) {
        mcapi('/processes/template/%', id)
            .success(function (data) {
                $scope.processes = data;

            })
            .error(function (data) {

            }).jsonp();
    }

    watcher.watch($scope, 'process_type', function (template) {
        template = JSON.parse(template)
        template.model.forEach(function (item) {
            if (item.name == "required_conditions") {
                $scope.required_input_conditions = item.value;
            }

        })

    });

    watcher.watch($scope, 'selected_process', function (name) {
        if (name == "new") {
            $scope.process = name;
        }
        else {
            $scope.process = JSON.parse(name);
        }

    });


    $scope.add_notes = function () {
        $scope.process.notes.push($scope.new_note);
        $scope.new_note = "";
    }
    $scope.add_error_msg = function () {
        $scope.process.runs.push({'started': $scope.start_run, 'stopped': $scope.stop_run, 'error_messages': $scope.new_err_msg});
        $scope.new_err_msg = "";
        $scope.start_run = "";
        $scope.stop_run = "";
    }

    $scope.add_citations = function () {

    }

    $scope.save_process = function () {
        console.log($scope.process)
        $scope.process.required_conditions = $scope.required_input_conditions;
        $scope.is_saved = true;
    }

    $scope.next_step = function () {
        /*
         * Add in new wizard steps for the conditions
         */
        $scope.process.required_conditions.forEach(function (condition) {
            var s = {step: condition};
            wizard.addStep('nav_choose_inputs', s);
        });
        wizard.addStep('nav_choose_inputs', {step: 'nav_input_files'});
        $scope.state.attributes.process = $scope.process;
        Stater.persist($scope.state);
        wizard.fireStepAfter('nav_choose_inputs');
    }

}

function InputStepController($scope, mcapi, wizard, Stater) {


    $scope.init = function (condition_name) {
        $scope.condition_name = condition_name;
        var name = '"' + $scope.condition_name + '"';
        mcapi('/templates')
            .argWithValue('filter_by', '"template_name":' + name)
            .success(function (condition) {
                $scope.condition = condition[0];
                mcapi('/conditions/template/%', $scope.condition.id)
                    .success(function (data) {
                        $scope.existing_conditions = data;

                    })
                    .error(function(e){
                    }).jsonp();
            })
            .error(function () {
                alertService.sendMessage("Failed looking up: " + $scope.condition_name);
            }).jsonp();
    }

    $scope.selected_condition = function(cond){
        $scope.selected_cond = cond;
        var model =   $scope.condition.model


       model.forEach(function(property){
            var name =  property.name;
            var all_keys = Object.keys($scope.selected_cond)
            if(all_keys.indexOf(name) > -1){
                property.value =   $scope.selected_cond[name]
            }

        });

    }

    wizard.waitOn($scope, $scope.condition_name, function () {
        $scope.state = Stater.retrieve();
        if ('input_conditions' in $scope.state.attributes) {
            if ($scope.condition_name in $scope.state.attributes.input_conditions) {
                $scope.condition = $scope.state.attributes.input_conditions[$scope.condition_name];
            }
        } else {
            $scope.state.attributes.input_conditions = {};
        }
    });

    $scope.next = function(){
        $scope.state = Stater.retrieve();
        if (! ('input_conditions' in $scope.state.attributes)) {
            $scope.state.attributes.input_conditions = {};
            Stater.save($scope.state);
        }
        $scope.state.attributes.input_conditions[$scope.condition_name] = $scope.condition;
        Stater.save($scope.state);
        Stater.persist($scope.state);
        wizard.fireNextStep();

    }

}


