Application.Controllers.controller('projectsProject',
                                   ["$scope", "provStep", "ui",
                                    "project", "current", "pubsub", "recent", "User",
                                    "projectFiles", "mcapi", "help", projectsProject]);

function projectsProject ($scope, provStep, ui, project, current,
                          pubsub, recent, User, projectFiles, mcapi, help) {
    $scope.showHelp = function() {
        return help.isActive();
    };

    $scope.isExpanded = function(what) {
        return help.isActive() && ui.isExpanded(project.id, what);
    },

    recent.resetLast(project.id);

    current.setProject(project);
    pubsub.send("sidebar.project");

    provStep.addProject(project.id);
    $scope.project = project;

    $scope.showTabs = function() {
        return ui.showToolbarTabs(project.id);
    };

    $scope.showFiles = function() {
        return ui.showFiles(project.id);
    };

    $scope.isActive = function (tab) {
        return tab === $scope.activeTab;
    };
    $scope.mcuser = User.attr();

    $scope.loaded = true;

    if (!(project.id in projectFiles.model.projects)) {
        $scope.loaded = false;
        mcapi("/projects/%/tree2", project.id)
            .success(function(files){
                var obj = {};
                obj.dir = files[0];
                projectFiles.model.projects[project.id] = obj;
                projectFiles.loadByMediaType(project);
                $scope.loaded = true;
            }).jsonp();
    }
}
