Application.Directives.directive('mcTreeHeader', [mcTreeHeaderDirective]);

function mcTreeHeaderDirective() {
    return {
        restrict: "E",
        scope: {
            item: '=item',
            showSideboard: "=showSideboard"
        },
        controller: "mcTreeHeaderDirectiveController",
        replace: true,
        templateUrl: 'application/directives/mc-tree-header.html'
    };
}

Application.Controllers.controller("mcTreeHeaderDirectiveController",
                                   ["$scope", "mcfile", "sideboard", "current", "toggleDragButton", "pubsub", "mcapi",
                                    mcTreeHeaderDirectiveController]);
function mcTreeHeaderDirectiveController($scope, mcfile, sideboard, current, toggleDragButton, pubsub, mcapi) {
    if ($scope.item.type === "datadir") {
        $scope.tooltip = "Upload to directory";
        $scope.faClass = "fa-upload";
    } else {
        $scope.tooltip = "Download file";
        $scope.faClass = "fa-download";
    }

    $scope.downloadSrc = function(file) {
        return mcfile.downloadSrc(file.id);
    };

    $scope.addToSideboard = function(file, event) {
        sideboard.handleFromEvent(current.projectID(), file, event, 'sideboard');
    };

    $scope.newFolder = function(currentDir, name) {
        mcapi('/datadirs')
            .success(function(datadir){
                currentDir.addFolder = false;
                currentDir.children.push(datadir);
            })
            .post({
                project_id: current.projectID(),
                parent: currentDir.id,
                name: currentDir.name + "/" + name,
                level: currentDir.level+1
            });
    };

    $scope.isActive = function(type, button){
        return toggleDragButton.get(type, button);
    };

    $scope.addItem = function (type) {
        switch (type) {
        case "review":
            pubsub.send('addFileToReview', $scope.item);
            break;
        case "note":
            pubsub.send('addFileToNote', $scope.item);
            break;
        case "provenance":
            pubsub.send('addFileToProvenance', $scope.item);
            break;
        }
    };
}
