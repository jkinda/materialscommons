import {Experiment} from '../../../project/experiments/experiment/components/tasks/experiment.model';

class MCProjectHomeComponentController {
    /*@ngInject*/

    constructor($scope, experimentsAPI, toast, $state,
                $stateParams, editorOpts, $mdDialog,
                mcprojstore, projectsAPI, etlServerAPI) {
        this.experimentsAPI = experimentsAPI;
        this.toast = toast;
        this.$stateParams = $stateParams;
        this.$state = $state;
        this.$mdDialog = $mdDialog;
        this.experimentType = 'active';
        this.experiments = [];
        this.mergingExperiments = false;
        this.deletingExperiments = false;
        this.selectingExperiments = false;
        this.sortOrder = 'name';
        this.mcprojstore = mcprojstore;
        this.projectsAPI = projectsAPI;
        this.etlServerAPI = etlServerAPI;
        this.etlInProgress = false;
        this.etlStatusRecordId = null;
        $scope.editorOptions = editorOpts({height: 65, width: 50});

        // test data
        // this.etlInProgress = true;
        // this.etlStatusRecordId = "d816d8b3-ef18-4ef0-9a6b-1d99a2f3d81b";
    }

    $onInit() {
        this.unsubscribe = this.mcprojstore.subscribe(this.mcprojstore.OTPROJECT, this.mcprojstore.EVUPDATE, () => {
            this._reloadComponentState();
        });
        this._reloadComponentState();
        //this.getProjectActivities();
    }

    getProjectActivities() {
        this.projectsAPI.getActivities(this.project.id).then(
            (activities) => {
                activities.forEach(a => {
                    switch (a.item_type) {
                        case "project":
                            a.icon = "fa-briefcase";
                            break;
                        case "experiment":
                            a.icon = "fa-flask";
                            break;
                        case "file":
                            a.icon = "fa-files-o";
                            break;
                        case "sample":
                            a.icon = "fa-cubes";
                            break;
                        case "process":
                            a.icon = "fa-code-fork";
                            break;
                    }
                    a.message = `${a.event_type === 'create' ? 'Added' : 'Modified'} ${a.item_type} ${a.item_name}`;
                });
                this.activities = activities;
            }
        );
    }

    $onDestroy() {
        this.unsubscribe();
    }

    getProjectExperiments() {
        this.experiments = _.values(this.project.experiments).map(e => {
            e.selected = false;
            return e;
        });
    }

    _reloadComponentState() {
        this.project = this.mcprojstore.getProject(this.$stateParams.project_id);
        this.projectOverview = this.project.overview;
        let experimentsList = _.values(this.project.experiments);
        this.activeExperimentsCount = experimentsList.filter(e => e.status === 'active').length;
        this.onholdExperimentsCount = experimentsList.filter(e => e.status === 'on-hold').length;
        this.doneExperimentsCount = experimentsList.filter(e => e.status === 'done').length;
        this.getProjectExperiments();
    }

    startNewExperiment() {
        this.$mdDialog.show({
            templateUrl: 'app/modals/create-experiment-dialog.html',
            controller: CreateNewExperimentDialogController,
            controllerAs: 'ctrl',
            bindToController: true
        }).then(
            (e) => {
                this.$state.go('project.experiment.details', {experiment_id: e.id});
            }
        );
    }

    startExperimentsMerge() {
        this.mergingExperiments = true;
        this.selectingExperiments = true;
    }

    finishExperimentsMerge() {
        let selected = this.experiments.filter(e => e.selected);
        if (selected.length < 2) {
            return;
        }
        this.$mdDialog.show({
            templateUrl: 'app/modals/merge-experiments-dialog.html',
            controller: MergeExperimentsDialogController,
            controllerAs: '$ctrl',
            bindToController: true,
            locals: {
                experiments: selected,
                projectId: this.project.id
            }
        }).then(
            () => {
                this.cancelMerge();
                this._reloadComponentState();
            },
            () => this.cancelMerge()
        );
    }

    cancelMerge() {
        this.mergingExperiments = false;
        this.experiments.forEach(e => e.selected = false);
        this.selectingExperiments = false;
    }

    startExperimentsDelete() {
        this.deletingExperiments = true;
        this.selectingExperiments = true;
    }

    finishExperimentsDelete() {
        let selected = this.experiments.filter(e => e.selected);
        if (!selected.length) {
            return;
        }

        this.$mdDialog.show({
            templateUrl: 'app/modals/delete-experiments-dialog.html',
            controller: DeleteExperimentsDialogController,
            controllerAs: '$ctrl',
            bindToController: true,
            locals: {
                experiments: selected,
                project: this.project
            }
        }).then(
            () => {
                this.clearDelete();
                this._reloadComponentState();
            },
            () => {
                this.clearDelete();
            }
        );
    }

    clearDelete() {
        this.deletingExperiments = false;
        this.experiments.forEach(e => e.selected = false);
        this.selectingExperiments = false;
    }

    gotoWorkflow(e) {
        if (!this.selectingExperiments) {
            this.$state.go("project.experiment.workflow", {experiment_id: e.id});
        }
    }

    etlStart(){
        console.log("MCProjectHomeComponentController - etlStart()");
        this.$mdDialog.show({
            templateUrl: 'app/modals/mc-etl-upload-dialog.html',
            controller: EtlUploadDialogController,
            controllerAs: '$ctrl',
            bindToController: true,
            locals: {
                project: this.project,
            }
        }).then(
            (results) => {
                this.etlInProgress = true;
                console.log("MCProjectHomeComponentController - etlStart() - results", results);
                if (results.status == "SUCCESS") {
                    console.log("MCProjectHomeComponentController - etlStart() - dialog ok");
                    this.etlStatusRecordId = results.status_record_id;
                }
                this._reloadComponentState();

            },
            (error) => {
                console.log("MCProjectHomeComponentController - etlStart() - error", error);
                console.log("MCProjectHomeComponentController - etlStart() - dialog canceled");
            }
        );
    }

    etlMonitor(){
        console.log("MCProjectHomeComponentController - etlMonitor() - query");
        this.etlServerAPI.getEtlStatus(this.etlStatusRecordId).then(
            status => {
                console.log("MCProjectHomeComponentController - etlMonitor() - results");
                console.log("this.etlInProgress", this.etlInProgress);
                console.log("this.etlStatusRecordId", this.etlStatusRecordId);
                console.log("status", status);
                console.log("MCProjectHomeComponentController - etlMonitor() - dialog");
                this.$mdDialog.show({
                    templateUrl: 'app/modals/mc-etl-status-dialog.html',
                    controller: EtlStatusDialogController,
                    controllerAs: '$ctrl',
                    bindToController: true,
                    locals: {
                        status: status
                    }
                }).then(
                    (status) => {
                        console.log("MCProjectHomeComponentController - etlMonitor() - process done", status);
                        this.etlInProgress = false;
                        this.etlStatusRecordId = null;
                        let experiment_id = status.extras.experiment_id;
                        console.log("this.etlInProgress", this.etlInProgress);
                        console.log("this.etlStatusRecordId", this.etlStatusRecordId);
                        console.log("experiment_id = ",experiment_id);
                        // TODO: verify usage
                        // this.$state.go("project.experiment.workflow", {experiment_id: experiment_id});
                        // this.$state.go('project.experiments.experiment', {experiment_id: experiment_id});
                        this._reloadComponentState();
                    },
                    (status) => {
                        console.log("MCProjectHomeComponentController - etlMonitor() - dismiss", status);
                        this.etlInProgress = true;
                        this.etlStatusRecordId = status.id;
                        console.log("this.etlInProgress", this.etlInProgress);
                        console.log("this.etlStatusRecordId", this.etlStatusRecordId);
                        this._reloadComponentState();
                    }
                );

            }
        );
    }
}

class CreateNewExperimentDialogController {
    /*@ngInject*/
    constructor($mdDialog, experimentsAPI, $stateParams, toast, mcprojstore) {
        this.$mdDialog = $mdDialog;
        this.name = '';
        this.description = '';
        this.projectID = $stateParams.project_id;
        this.experimentsAPI = experimentsAPI;
        this.toast = toast;
        this.mcprojstore = mcprojstore;
    }

    submit() {
        if (this.name === '') {
            this.toast.error('You must supply an experiment name');
            return;
        }
        let e = new Experiment(this.name);
        e.description = this.description;
        this.experimentsAPI.createForProject(this.projectID, e)
            .then(
                (createdExperiment) => {
                    this.mcprojstore.addExperiment(createdExperiment).then(
                        () => {
                            this.mcprojstore.currentExperiment = createdExperiment;
                            this.$mdDialog.hide(createdExperiment);
                        }
                    );
                },
                () => this.toast.error('create experiment failed')
            );
    }

    cancel() {
        this.$mdDialog.cancel();
    }
}

class MergeExperimentsDialogController {
    /*@ngInject*/
    constructor($mdDialog, experimentsAPI, mcprojstore) {
        this.$mdDialog = $mdDialog;
        this.experimentsAPI = experimentsAPI;
        this.mcprojstore = mcprojstore;
        this.experimentName = '';
        this.experimentDescription = '';
    }

    done() {
        let experimentIds = this.experiments.map(e => e.id);
        this.experimentsAPI.mergeExperiments(this.projectId, experimentIds, {
            name: this.experimentName,
            description: this.experimentDescription
        }).then(
            (e) => {
                this.mcprojstore.addExperiment(e).then(
                    () => this.$mdDialog.hide(e)
                );
            },
            () => this.$mdDialog.cancel()
        );
    }

    cancel() {
        this.$mdDialog.cancel();
    }
}

class DeleteExperimentsDialogController {
    /*@ngInject*/
    constructor($mdDialog, experimentsAPI, mcprojstore, toast, User) {
        this.$mdDialog = $mdDialog;
        this.experimentsAPI = experimentsAPI;
        this.experimentName = '';
        this.experimentDescription = '';
        this.mcprojstore = mcprojstore;
        this.toast = toast;
        this.user = User.u();
    }

    done() {
        if (this.canDeleteExperiments()) {
            let experimentIds = this.experiments.map(e => e.id);
            this.experimentsAPI.deleteExperiments(this.project.id, experimentIds).then(
                () => {
                    this.mcprojstore.removeExperiments(...this.experiments).then(
                        () => this.$mdDialog.hide()
                    );
                },
                () => this.$mdDialog.cancel()
            );
        } else {
            this.toast.error('You are attempting to delete experiments when you are not the experiment or project owner');
        }
    }

    canDeleteExperiments() {
        let canDelete = true;
        this.experiments.forEach(e => {
            if (!this.canDelete(e.owner, this.project.owner, this.user)) {
                canDelete = false;
            }
        });

        return canDelete;
    }

    canDelete(experimentOwner, projectOwner, user) {
        if (experimentOwner === user) {
            return true;
        } else if (projectOwner === user) {
            return true;
        }

        return false;
    }

    cancel() {
        this.$mdDialog.cancel();
    }
}

class EtlUploadDialogController {
    /*@ngInject*/
    constructor($mdDialog, Upload, etlServerAPI, toast, User) {
        this.$mdDialog = $mdDialog;
        this.Upload = Upload;
        this.etlServerAPI = etlServerAPI;
        this.toast = toast;
        this.User = User;
        this.user_id = User.u();
        this.name = "";
        this.description = "";
        this.files = [];
        this.use_globus = true;
        // test data
        // this.name = "Test Experiment";
        // this.description = "Description";
        // this.ep_uuid = '067ce67a-3bf1-11e8-b9b5-0ac6873fc732';
        // this.ep_spreadsheet = '/dataForTest/input.xlsx';
        // this.ep_data = '/dataForTest/data';
    }

    onSwitchDisplay() {
        this.use_globus = ! this.use_globus;
        console.log("EtlUploadDialogController - switch display: ", this.use_globus);
    }

    done() {
        console.log("EtlUploadDialogController - Done");
        let data = {};
        data.project_id = this.project.id;
        data.name = this.name;
        data.description = this.description;
        if (this.use_globus) {
            data.globus_uuid = this.ep_uuid;
            data.globus_excel_file = this.ep_spreadsheet;
            data.globus_data_dir = this.ep_data;
            console.log("data to send = ", data);
            return this.etlServerAPI.startBackgroundEtlUpload(data).then (
                (reply) => {
                    console.log("EtlUploadDialogController setup completed", reply);
                    this.$mdDialog.hide(reply);
                },
                (e) => {
                    console.log("upload failed", e);
                    if (e.status === 502) {
                        console.log("Service unavailable: 502");
                        this.toast.error("Excel file uplaod; Service not available. Contact Admin.");
                    } else if (e.status > 200) {
                        console.log("Service unavailable: " + e.status);
                        this.toast.error("Excel file uplaod; Service not available. Code - " + e.status + ". Contact Admin.");
                    }
                    this.$mdDialog.cancel(e);
                }
            );
        }
        else {
            let f = this.files[0];
            data.file = f;
            console.log("data to send = ", data);
            this.isUploading = true;
            return this.Upload.upload({
                url: `api/etl/upload?apikey=${this.User.apikey()}`,
                data: data
            }).then(
                (uploaded) => {
                    console.log("upload completed", uploaded.data);
                    this.$mdDialog.hide(uploaded.data);
                    this.isUploading = false;
                },
                (e) => {
                    console.log("upload failed", e);
                    if (e.status === 502) {
                        console.log("Service unavailable: 502");
                        this.toast.error("Excel file uplaod; Service not available. Contact Admin.");
                    } else if (e.status > 200) {
                        console.log("Service unavailable: " + e.status);
                        this.toast.error("Excel file uplaod; Service not available. Code - " + e.status + ". Contact Admin.");
                    }
                    this.$mdDialog.cancel(e);
                    this.isUploading = false;
                },
                (evt) => {
                    f.progress = 100.0 * evt.loaded / evt.total;
                    console.log("upload progress", f.progress);
                }
            );
        }
    }

    cancel() {
        let data = {};
        data.file = this.files[0];
        data.project_id = this.project.id;
        data.name = this.experiment_name;
        data.description = this.description;
        console.log("data: ", data);
        this.$mdDialog.cancel();
    }
}

class EtlStatusDialogController {
    /*@ngInject*/
    constructor($mdDialog, etlServerAPI, toast, User) {
        this.$mdDialog = $mdDialog;
        this.etlServerAPI = etlServerAPI;
        this.toast = toast;
        this.User = User;
        this.user_id = User.u();
    }

    done() {
        this.$mdDialog.hide(this.status);
    }

    dismiss() {
        this.$mdDialog.cancel(this.status);
    }

    isDone() {
        return (this.didFail() || this.didSucceed());
    }

    didFail() {
        return (this.status.status == "Fail");
    }

    didSucceed() {
        return (this.status.status == "Success");
    }

}

angular.module('materialscommons').component('mcProjectHome', {
    template: require('./mc-project-home.html'),
    controller: MCProjectHomeComponentController
});