Application.Controllers.controller('projectReviewsCreate',
                                   ["$scope", "mcapi", "User", "pubsub", "$stateParams",
                                    "model.projects", "projectFiles", "projectState", "ui",
                                    "recent", projectReviewsCreate]);

function projectReviewsCreate($scope, mcapi, User, pubsub, $stateParams, Projects,
                                      projectFiles, projectState, ui, recent) {
    var channel = 'review.files';
    projectFiles.setChannel(channel);
    projectFiles.setActive($stateParams.id, true);

    Projects.getList().then(function(projects) {
        $scope.projects = projects;
        ui.setShowFiles($stateParams.id, true);
    });

    var state = projectState.get($stateParams.id, $stateParams.sid);
    if (state) {
        $scope.model = state;
    } else {
        $scope.model = {
            comment: "",
            assigned_to: "",
            title: "",
            files: []
        };
        projectState.set($scope.project.id, $stateParams.sid, $scope.model);
    }

    recent.addIfNotExists($scope.project.id, $stateParams.sid, "New Review");

    projectFiles.resetSelectedFiles($scope.model.files, $scope.project.id);

    $scope.review = {'items': [], 'messages': []};

    pubsub.waitOn($scope, channel, function (fileentry) {
        if (fileentry.selected) {
            $scope.model.files.push(fileentry);
        } else {
            var i = _.indexOf($scope.model.files, function(entry) {
                return entry.id == fileentry.id;
            });
            if (i != -1) {
                $scope.model.files.splice(i, 1);
            }
        }
    });

    function saveData() {
        mcapi('/reviews')
            .success(function (data) {
                Projects.getList(true).then(function () {
                    pubsub.send('sidebar.project');
                    ui.setShowFiles($stateParams.id, false);
                    projectFiles.setActive($stateParams.id, false);
                    recent.gotoLast($stateParams.id);
                    recent.update($stateParams.id, $stateParams.sid, $scope.review.title);
                });
            }).error(function (reason) {
            }).post($scope.review);
    }

    $scope.cancel = function() {
        ui.setShowFiles($stateParams.id, false);
        projectFiles.setActive($stateParams.id, false);
        recent.gotoLast($stateParams.id);
        recent.delete($stateParams.id, $stateParams.sid);
        projectState.delete($stateParams.id, $stateParams.sid);
    };

    $scope.create = function () {
        $scope.model.files.forEach(function (f) {
            $scope.review.items.push({
                'id': f.id,
                'path': f.fullname,
                'name': f.name,
                'type': f.type});
        });

        $scope.review.author = User.u();
        $scope.review.assigned_to = $scope.model.assigned_to;
        $scope.review.status = 'open';
        $scope.review.title = $scope.model.title;
        $scope.review.messages.push({
            'message': $scope.model.comment,
            'who': User.u(),
            'date': new Date()
        });
        $scope.review.project = $scope.project.id;
        saveData();
    };

    $scope.removeFile = function (index) {
        $scope.model.files[index].selected = false;
        $scope.model.files.splice(index, 1);
    };
}
