class SelectItemsService {
    /*@ngInject*/
    constructor($mdDialog, projectsService, experimentsService, fileTreeProjectService, mcstate) {
        this.$mdDialog = $mdDialog;
        this.projectsService = projectsService;
        this.experimentsService = experimentsService;
        this.fileTreeProjectService = fileTreeProjectService;
        this.mcstate = mcstate;
    }

    dialog(locals, controller) {
        return this.$mdDialog.show({
            templateUrl: 'app/global.services/select-items/select-items.html',
            controller: controller,
            controllerAs: '$ctrl',
            bindToController: true,
            multiple: true,
            locals: locals
        });
    }

    fileTree(uploadFiles = false) {
        let project = this.mcstate.get(this.mcstate.CURRENT$PROJECT);
        return this.fileTreeProjectService.getProjectRoot(project.id).then(
            files => {
                project.files = files;
                return this.dialog({
                    showFileTree: true,
                    showFileTable: false,
                    uploadFiles,
                    project
                }, SelectItemsFilesServiceModalController);
            });
    }

    fileTable(files = [], uploadFiles = false) {
        return this.dialog({
            showFileTable: true,
            showFileTree: false,
            uploadFiles,
            files
        }, SelectItemsFilesServiceModalController);
    }

    samples(samples = [], singleSelection = false) {
        return this.dialog({samples, singleSelection}, SelectItemsSamplesServiceModalController);
    }

    samplesFromProject(projectId, singleSelection = false) {
        let options = {
            singleSelection
        };
        return this.projectsService.getProjectSamples(projectId).then(
            (samples) => this.dialog({samples, options}, SelectItemsSamplesServiceModalController)
        );
    }

    samplesFromExperiment(projectId, experimentId, singleSelection = false) {
        return this.experimentsService.getSamplesForExperiment(projectId, experimentId).then(
            (samples) => this.dialog({samples, singleSelection}, SelectItemsSamplesServiceModalController)
        );
    }

    processes(processes = []) {
        return this.dialog({processes}, SelectItemsProcessesServiceModalController);
    }

    processesFromProject(projectId) {
        return this.projectsService.getProjectProcesses(projectId).then(
            (processes) => this.dialog({processes}, SelectItemsProcessesServiceModalController)
        );
    }
}

class SelectItemsBase {
    constructor($mdDialog) {
        this.activeTab = 0;
        this.currentTab = '';
        this.tabs = [];
        this.$mdDialog = $mdDialog;
    }

    isActive(tab) {
        return this.activeTab === tab;
    }

    setActive(tabName) {
        this.activeTab = tabName;
    }

    addTab(name, icon) {
        this.tabs.push({name, icon});
        if (this.tabs.length === 1) {
            this.activeTab = this.tabs[0].name;
        }
    }

    cancel() {
        this.$mdDialog.cancel();
    }
}

class SelectItemsState {
    constructor() {
        this.uploadedFiles = [];
    }

    reset() {
        this.uploadedFiles = [];
    }
}

const selectItemsState = new SelectItemsState();

class SelectItemsSamplesServiceModalController extends SelectItemsBase {
    /*@ngInject*/
    constructor($mdDialog) {
        super($mdDialog);
        this.$onInit();
    }

    $onInit() {
        this.addTab('samples', 'fa-cubes');
    }

    ok() {
        let selectedSamples = this.samples.filter(s => {
            for (let i = 0; i < s.versions.length; i++) {
                if (s.versions[i].selected) {
                    return true;
                }
            }
            return false;
        });
        this.$mdDialog.hide({samples: selectedSamples});
    }
}

class SelectItemsProcessesServiceModalController extends SelectItemsBase {
    /*@ngInject*/
    constructor($mdDialog) {
        super($mdDialog);
        this.$onInit();
    }

    $onInit() {
        this.addTab('processes', 'fa-code-fork');
    }

    ok() {
        let selectedProcesses = this.processes.filter(p => p.input || p.output);
        this.$mdDialog.hide({processes: selectedProcesses});
    }
}

class SelectItemsFilesServiceModalController extends SelectItemsBase {
    /*@ngInject*/
    constructor($mdDialog) {
        super($mdDialog);
        this.$onInit();
    }

    $onInit() {
        selectItemsState.reset();
        if (this.showFileTable) {
            this.addTab('file table', 'fa-files-o');
        }

        if (this.showFileTree) {
            this.addTab('file tree', 'fa-files-o');
        }

        if (this.uploadFiles) {
            this.addTab('Upload Files', 'fa-upload');
        }
    }

    uploadComplete(fileIds) {
        selectItemsState.uploadedFiles = fileIds.map(fid => ({id: fid}));
    }

    ok() {
        let selectedFiles = [];
        if (this.showFileTree) {
            selectedFiles = selectedFiles.concat(this.getFilesFromTree());
        }

        if (this.showFileTable) {
            selectedFiles = selectedFiles.concat(this.files.filter(f => f.selected));
        }

        if (this.uploadFiles) {
            selectedFiles = selectedFiles.concat(selectItemsState.uploadedFiles);
        }

        this.$mdDialog.hide({files: selectedFiles});
    }

    getFilesFromTree() {
        let filesFromTree = [];
        let projectFiles = this.project.files;
        if (projectFiles && projectFiles.length) {
            let treeModel = new TreeModel(),
                root = treeModel.parse(this.project.files[0]);
            // Walk the tree looking for selected files and adding them to the
            // list of files. Also reset the selected flag so the next time
            // the popup for files is used it doesn't show previously selected
            // items.
            root.walk({strategy: 'pre'}, function (node) {
                if (node.model.data.selected) {
                    node.model.data.selected = false;
                    if (node.model.data.otype === 'file') {
                        filesFromTree.push(node.model.data);
                    }
                }
            });
        }
        return filesFromTree;
    }
}

angular.module('materialscommons').service('selectItems', SelectItemsService);
