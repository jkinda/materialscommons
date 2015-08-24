Application.Controllers.controller("CreateProjectController",
                                   ["$scope", "mcapi", "model.projects",
                                    "current", "$state", CreateProjectController]);
function CreateProjectController($scope, mcapi, Projects, current, $state) {
    $scope.setProject = function(project) {
        $scope.project = project;
        current.setProject(project);
        $scope.showProjects = false;
        $state.go("projects.project.home", {id: project.id});
    };

    $scope.createProject = function() {
        if ($scope.model.name === "") {
            return;
        }
        mcapi('/projects')
            .success(function (project) {
                Projects.getList(true).then(function(projects) {
                    $scope.projects = projects;
                    $scope.model.name = "";
                    var i = _.indexOf($scope.projects, function(p) {
                        return p.id == project.project_id;
                    });
                    $scope.setProject(projects[i]);
                });
            }).post({'name': $scope.model.name});
    };
}
