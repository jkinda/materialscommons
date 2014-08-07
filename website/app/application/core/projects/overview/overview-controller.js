Application.Controllers.controller('projectsOverview',
    ["$scope", "$stateParams", "pubsub", "$state", "ProvDrafts", "mcapi",
        function ($scope, $stateParams, pubsub, $state, ProvDrafts, mcapi) {
            pubsub.waitOn($scope, ProvDrafts.channel, function () {
                $scope.drafts = ProvDrafts.drafts;
            });

            pubsub.waitOn($scope, 'access.change', function () {
                $scope.getProject();
            });

            $scope.countDrafts = function () {
                if ($scope.project_id === "") {
                    return;
                }
                mcapi('/drafts/project/%', $scope.project_id)
                    .success(function (drafts) {
                        $scope.drafts_count = drafts.length;
                    }).jsonp();
            };

            $scope.showTab = function (tab) {
                switch (tab) {
                    case "files":
                        $state.go('projects.overview.files');
                        break;
                    case "provenance":
                        $state.go('projects.overview.provenance');
                        break;
                    case "drafts":
                        $state.go('projects.overview.drafts');
                        break;
                    case "samples":
                        $state.go('projects.overview.samples');
                        break;
                    case "notes":
                        $state.go('projects.overview.notes');
                        break;
                    case "settings":
                        $state.go('projects.overview.settings');
                        break;

                }
            };
            $scope.getProject = function(){
                mcapi('/projects/%', $scope.project_id)
                    .success(function (project) {
                        $scope.project = project;
                    }).jsonp();
            }
            function init() {
                $scope.project_id = $stateParams.id;
                $scope.from = $stateParams.from;
                $scope.processes = [];
                $scope.drafts = ProvDrafts.loadRemoteDrafts($scope.project_id);
                $scope.getProject();
            }

            init();
        }]);
