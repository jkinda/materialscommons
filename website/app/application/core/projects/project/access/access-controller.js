Application.Controllers.controller('projectAccess',
    ["$scope", "$stateParams", "mcapi", "User", "pubsub", "model.projects", "toastr",
        projectAccess]);

function projectAccess($scope, $stateParams, mcapi, User, pubsub, Projects, toastr) {

    $scope.addUser = function () {
        mcapi('/access/new')
            .success(function (data) {
                $scope.project.users.push({
                    'id': data.id,
                    'user_id': $scope.bk.user.email,
                    'project_id': $scope.project.id,
                    'project_name': $scope.project.name
                });
                pubsub.send('access.change');
                $scope.bk.user = '';
            })
            .error(function (e) {
                toastr.error(e.error, 'Error', {
                    closeButton: true
                });
            }).post({
                'user_id': $scope.bk.user.email,
                'project_id': $scope.project.id,
                'project_name': $scope.project.name
            });
    };

    $scope.deleteUser = function (id) {
        mcapi('/access/%/remove', id)
            .success(function () {
                var i = _.indexOf($scope.project.users, function (item) {
                    return (item.id === id);
                });
                if (i !== -1) {
                    $scope.project.users.splice(i, 1);
                }
                pubsub.send('access.change');
            }).delete();
    };

    $scope.isOwner = function(username) {
        if (username == $scope.project.owner) {
            return true;
        } else if (User.attr().admin) {
            return true;
        }

        return false;
    };

    $scope.isOwnerOrUser = function(username) {
        if (username == $scope.project.owner && username == $scope.signed_in_user) {
            return true;
        } else if (User.attr().admin) {
            return true;
        } else if (username == $scope.signed_in_user) {
            return true;
        }
        return false;
    };

    function init() {
        $scope.bk = {
            user: ''
        };
        Projects.get($stateParams.id).then(function (project) {
            $scope.project = project;
        });
        mcapi('/users')
            .success(function (data) {
                $scope.all_users = data;
            }).jsonp();
        $scope.signed_in_user = User.u();
    }

    init();
}
