class ExperimentsService {
    /*@ngInject*/
    constructor(projectsAPI) {
        this.projectsAPI = projectsAPI;
    }

    getAllForProject(projectID) {
        return this.projectsAPI(projectID).one('experiments').getList();
    }

    createForProject(projectID, experiment) {
        return this.projectsAPI(projectID).one('experiments').customPOST(experiment);
    }

    updateForProject(projectID, experimentID, what) {
        return this.projectsAPI(projectID).one('experiments', experimentID).customPUT(what);
    }

    getForProject(projectID, experimentID) {
        return this.projectsAPI(projectID).one('experiments', experimentID).customGET();
    }

    createTask(projectID, experimentID, experimentTask) {
        return this.projectsAPI(projectID).one('experiments', experimentID).one('tasks').customPOST(experimentTask);
    }

    updateTask(projectID, experimentID, taskID, task) {
        return this.projectsAPI(projectID).one('experiments', experimentID).one('tasks', taskID).customPUT(task);
    }

    addTemplateToTask(projectID, experimentID, taskID, templateID) {
        return this.projectsAPI(projectID).one('experiments', experimentID).one('tasks', taskID)
            .one('template', templateID).customPOST({});
    }

    updateTaskTemplateProperties(projectID, experimentID, taskID, updateArgs) {
        return this.projectsAPI(projectID).one('experiments', experimentID).one('tasks', taskID)
            .one('template').customPUT(updateArgs);
    }

    updateTaskTemplateFiles(projectId, experimentId, taskId, updateFilesArgs) {
        return this.projectsAPI(projectId).one('experiments', experimentId).one('tasks', taskId)
            .one('template').customPUT(updateFilesArgs);
    }

    updateTaskTemplateSamples(projectId, experimentId, taskId, updateSamplesArgs) {
        return this.projectsAPI(projectId).one('experiments', experimentId).one('tasks', taskId)
            .one('template').customPUT(updateSamplesArgs);
    }

    updateProcess(projectId, experimentId, processId, updateArgs) {
        return this.projectsAPI(projectId)
            .one('experiments', experimentId)
            .one('processes', processId).customPUT(updateArgs)
            .then((process) => this.convertDatePropertyAttributes(process));
    }

    deleteTask(projectID, experimentID, taskID) {
        return this.projectsAPI(projectID).one('experiments', experimentID).one('tasks', taskID).customDELETE();
    }

    getSamplesForExperiment(projectId, experimentId) {
        return this.projectsAPI(projectId).one('experiments', experimentId).one('samples').customGET();
    }

    getProcessesForExperiment(projectId, experimentId) {
        return this.projectsAPI(projectId).one('experiments', experimentId).customGET("processes");//, {simple: true});
    }

    getProcessForExperiment(projectId, experimentId, processId) {
        return this.projectsAPI(projectId)
            .one('experiments', experimentId)
            .one('processes', processId).customGET()
            .then((process) => this.convertDatePropertyAttributes(process));
    }

    getFilesForExperiment(projectId, experimentId) {
        return this.projectsAPI(projectId).one('experiments', experimentId).one('files').customGET();
    }

    createProcessFromTemplate(projectId, experimentId, templateId) {
        return this.projectsAPI(projectId).one('experiments', experimentId).one('processes').one('templates', templateId)
            .customPOST();
    }

    cloneProcess(projectId, experimentId, processId, cloneArgs) {
        return this.projectsAPI(projectId).one('experiments', experimentId).one('processes', processId).one('clone')
            .customPOST(cloneArgs);
    }

    convertDatePropertyAttributes(process) {
        if (process.setup) {
            let setup = process.setup;
            for (var i = 0; i < setup.length; i++) {
                let s = setup[i];
                if (s.properties) {
                    let properties = s.properties;
                    for (var j = 0; j < properties.length; j++) {
                        let property = properties[j];
                        if (property.otype && (property.otype == 'date')){
                            if (property.value) {
                                property.value = this.convertDateValueFromTransport(property.value);
                            }
                        }
                    }
                }
            }
        }
        return process;
    }

    convertDatePropertyAttributes2(process) {
        angular.forEach(process.setup, (s) => s.properties.filter(p => p.otype === 'date')
            .forEach(p => {
                if (p.value) {
                    p.value = this.convertDateValueFromTransport(p.value)
                }
            }));
    }

    convertDateValueForTransport(dateObj) {
        return dateObj.getTime();
    }

    convertDateValueFromTransport(dateNumber) {
        return new Date(dateNumber);
    }

}

angular.module('materialscommons').service('experimentsService', ExperimentsService);
