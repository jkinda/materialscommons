Application.Controllers.controller("projectSampleView",
    ["$scope", "model.projects", "$stateParams", "mcapi","$filter", projectSampleView]);

function projectSampleView($scope, Projects,$stateParams, mcapi, $filter) {

    $scope.sampleDetails = function(branch){
//        mcapi('/objects/%', branch.id)
//            .success(function (data) {
//                $scope.details = data;
//            }).jsonp();

//        mcapi('/processes/sample/%',$scope.sample.id)
//            .success(function (data) {
//                $scope.sample.processes = data;
//                console.log($scope.sample.processes);
//            }).jsonp();
//
//        mcapi('/samples/project/%', $scope.sample.id)
//            .success(function (data) {
//                $scope.sample.projects = data;
//            }).jsonp();
    };

    $scope.processDetails = function(p_id){
        mcapi('/processes/%', p_id)
            .success(function (data) {
                $scope.process = [];
                $scope.process.push(data);
            })
            .error(function(e){
            }).jsonp();
    };

    function init(){
        Projects.get($stateParams.id).then(function(project) {
            $scope.project = project;
            $scope.my_tree =  {};
            mcapi('/samples/%/tree', $scope.project.id)
                .success(function (data) {
                    // Partial fix to sorting the samples. This only sorts the top level.
                    $scope.tree_data = $filter('orderBy')(data, 'name');
                    $scope.col_defs = [
                        { field: "path"},
                        { field: "owner"},
                        { field: "level"}
                    ];
                }).jsonp();
        });

    }
    init();


}
