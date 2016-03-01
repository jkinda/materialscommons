(function (module) {
    module.factory('selectItems', selectItemsService);

    selectItemsService.$inject = ["$modal"];
    function selectItemsService($modal) {
        return {
            open: function () {
                var tabs = {
                    processes: false,
                    files: false,
                    samples: false,
                    reviews: false
                };

                if (arguments.length === 0) {
                    throw "Invalid arguments to service selectItems:open()";
                }

                for (var i = 0; i < arguments.length; i++) {
                    tabs[arguments[i]] = true;
                }

                var modal = $modal.open({
                    size: 'lg',
                    templateUrl: 'application/services/partials/select-items.html',
                    controller: 'SelectItemsServiceModalController',
                    controllerAs: 'ctrl',
                    resolve: {
                        showProcesses: function () {
                            return tabs.processes;
                        },

                        showFiles: function () {
                            return tabs.files;
                        },

                        showSamples: function () {
                            return tabs.samples;
                        },

                        showReviews: function () {
                            return tabs.reviews;
                        }
                    }
                });
                return modal.result;
            }
        };
    }

    module.controller('SelectItemsServiceModalController', SelectItemsServiceModalController);
    SelectItemsServiceModalController.$inject = ['$modalInstance', 'showProcesses',
        'showFiles', 'showSamples', 'showReviews', 'projectsService', '$stateParams', 'project', 'gridFiles'];

    function SelectItemsServiceModalController($modalInstance, showProcesses, showFiles, showSamples,
                                               showReviews, projectsService, $stateParams, project, gridFiles) {
        var ctrl = this;


        var proj = project.get();

        projectsService.getProjectDirectory(proj.id).then(function (files) {
            proj.files = gridFiles.toGrid(files);
            ctrl.files = proj.files;
            ctrl.files[0].expanded = true;
            ctrl.gridShowingFlag = true;

            ctrl.tabs = loadTabs();
            ctrl.activeTab = ctrl.tabs[0].name;
            ctrl.setActive = setActive;
            ctrl.isActive = isActive;
            ctrl.ok = ok;
            ctrl.cancel = cancel;
            ctrl.processes = [];
            ctrl.samples = [];
        });

        /////////////////////////

        function setActive(tab) {
            ctrl.activeTab = tab;
        }

        function isActive(tab) {
            return ctrl.activeTab === tab;
        }

        function ok() {
            var selectedProcesses = ctrl.processes.filter(function (p) {
                return p.input || p.output;
            });

            var selectedSamples = ctrl.samples.filter(function (s) {
                return s.selected;
            });

            var selectedFiles = getSelectedFiles();

            $modalInstance.close({
                processes: selectedProcesses,
                samples: selectedSamples,
                files: selectedFiles
            });
        }

        function getSelectedFiles() {
            var files = [],
                treeModel = new TreeModel(),
                root = treeModel.parse(project.get().files[0]);
            // Walk the tree looking for selected files and adding them to the
            // list of files. Also reset the selected flag so the next time
            // the popup for files is used it doesn't show previously selected
            // items.
            root.walk({strategy: 'pre'}, function (node) {
                if (node.model.data.selected) {
                    node.model.data.selected = false;
                    if (node.model.data._type === 'file') {
                        files.push(node.model.data);
                    }
                }
            });
            return files;
        }

        function cancel() {
            $modalInstance.dismiss('cancel');
        }

        function loadTabs() {
            var tabs = [];
            if (showProcesses) {
                tabs.push(newTab('processes', 'fa-code-fork'));
                projectsService.getProjectProcesses($stateParams.project_id).then(function (processes) {
                    ctrl.processes = processes;
                });
            }

            if (showSamples) {
                tabs.push(newTab('samples', 'fa-cubes'));
                projectsService.getProjectSamples($stateParams.project_id).then(function (samples) {
                    console.log('getProjectSamples', samples);
                    ctrl.samples = samples;
                });
            }

            if (showFiles) {
                tabs.push(newTab('files', 'fa-files-o'));
            }

            if (showReviews) {
                tabs.push(newTab('reviews', 'fa-comment'));
            }

            tabs.sort(function compareByName(t1, t2) {
                if (t1.name < t2.name) {
                    return -1;
                }
                if (t1.name > t2.name) {
                    return 1;
                }
                return 0;
            });

            return tabs;
        }

        function newTab(name, icon) {
            return {
                name: name,
                icon: icon
            };
        }
    }
}(angular.module('materialscommons')));
