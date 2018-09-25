import logging
import os

from materials_commons.api import get_project_by_id

from ..database.DatabaseInterface import DatabaseInterface
from ..database.BackgroundProcess import BackgroundProcess
from ..common.MaterialsCommonsGlobusInterface import MaterialsCommonsGlobusInterface
# noinspection PyProtectedMember
from ..user.apikeydb import _load_apikeys as init_api_keys, user_apikey

from .GlobusNonETLUpload import GlobusNonETLUpload


def non_etl_startup_and_verify(user_id, project_id, user_globus_endpoint, user_globus_path):
    log = logging.getLogger(__name__ + ".non_etl_startup_and_verify")
    log.info("Starting non-etl startup_and_verify")

    status_record_id = None
    # noinspection PyBroadException
    try:
        handler = GlobusNonETLUpload(user_id)
        status_record_id = handler.setup(project_id, user_globus_endpoint, user_globus_path)
        verify_status = handler.verify(status_record_id)
    except BaseException:
        message = "Unexpected failure; status_record_id = None"
        if status_record_id:
            message = "Unexpected failure; status_record_id = {}".format(status_record_id)
        DatabaseInterface().update_status(status_record_id, BackgroundProcess.FAIL)
        logging.exception(message)
        return {"status": "FAIL"}

    if not verify_status['status'] == "SUCCESS":
        log.error("Failed to verify setup; status_record_id = {}".format(status_record_id))
        DatabaseInterface().update_status(status_record_id, BackgroundProcess.FAIL)
        return verify_status

    log.info("setup and verify_setup passed - setting up factory task")

    from ..faktory.TaskChain import FILE_UPLOAD_QUEUE
    DatabaseInterface().update_queue(status_record_id, FILE_UPLOAD_QUEUE)
    DatabaseInterface().update_status(status_record_id, BackgroundProcess.SUBMITTED_TO_QUEUE)
    log.info("updated status record queue to {} and status to {}"
             .format(FILE_UPLOAD_QUEUE, BackgroundProcess.SUBMITTED_TO_QUEUE))
    from ..faktory.TaskChain import TaskChain
    task_chain = TaskChain()
    task_chain.start_non_etl_chain(status_record_id)
    log.info("Called task_chain.start_non_etl_chain")

    verify_status['status_record_id'] = status_record_id
    return verify_status


def non_etl_globus_upload(status_record_id):
    # noinspection PyBroadException
    try:
        from ..faktory.TaskChain import FILE_PROCESS_QUEUE
        log = logging.getLogger(__name__ + ".non_elt_globus_upload")
        log.info("Starting non_elt_globus_upload with status_record_id{}".format(status_record_id))
        record = DatabaseInterface().update_status(status_record_id, BackgroundProcess.RUNNING)

        handler = GlobusNonETLUpload(record['owner'])
        results = handler.transfer_and_await(status_record_id)

        log.info(results)
        if not results['status'] == 'SUCCEEDED':
            DatabaseInterface().update_status(status_record_id, BackgroundProcess.FAIL)
            log.error(results)
            return None
        log.info(results)
        DatabaseInterface().update_queue(status_record_id, FILE_PROCESS_QUEUE)
        DatabaseInterface().update_status(status_record_id, BackgroundProcess.SUBMITTED_TO_QUEUE)
        from ..faktory.TaskChain import TaskChain
        task_chain = TaskChain()
        task_chain.queue_non_etl_file_transformation(status_record_id)
        return status_record_id
    except BaseException:
        DatabaseInterface().update_status(status_record_id, BackgroundProcess.FAIL)
        message = "Unexpected failure; status_record_id = {}".format(status_record_id)
        logging.exception(message)
        return status_record_id


def non_etl_file_processing(status_record_id):
    # noinspection PyBroadException
    try:
        log = logging.getLogger(__name__ + ".etl_excel_processing")
        log.info("Starting etl_excel_processing with status_record_id{}".format(status_record_id))
        status_record = DatabaseInterface().update_status(status_record_id, BackgroundProcess.RUNNING)
        user_id = status_record['owner']
        init_api_keys()
        apikey = user_apikey(user_id)
        project_id = status_record['project_id']

        transfer_base_path = status_record['extras']['transfer_base_path']

        project = get_project_by_id(project_id, apikey=apikey)
        log.info("working with project '{}' ({})".format(project.name, project.id))

        log.info("loading files and directories from = {}".format(transfer_base_path))
        current_directory = os.getcwd()
        os.chdir(transfer_base_path)
        directory = project.get_top_directory()

        file_count = 0
        dir_count = 0
        for f_or_d in os.listdir('.'):
            if os.path.isfile(f_or_d):
                file_count += 1
                directory.add_file(str(f_or_d), str(f_or_d))
            if os.path.isdir(f_or_d):
                dir_count += 1
                directory.add_directory_tree(str(f_or_d), '.')
        os.chdir(current_directory)

        log.info("Uploaded {} file(s) and {} dirs(s) to top level directory of project '{}'"
                 .format(file_count, dir_count, project.name))

        DatabaseInterface().update_queue(status_record_id, None)
        DatabaseInterface().update_status(status_record_id, BackgroundProcess.SUCCESS)
    except BaseException:
        DatabaseInterface().update_status(status_record_id, BackgroundProcess.FAIL)
        message = "Unexpected failure; status_record_id = {}".format(status_record_id)
        logging.exception(message)


def globus_transfer(status_record_id):
    log = logging.getLogger(__name__ + ".elt_globus_upload.globus_transfer")
    status_record = DatabaseInterface().get_status_record(status_record_id)
    transfer_id = status_record_id
    user_id = status_record['owner']
    project_id = status_record['project_id']
    globus_endpoint = status_record['extras']['globus_endpoint']
    endpoint_path = '/'
    web_service = MaterialsCommonsGlobusInterface(user_id)
    log.info("web_service.setup_transfer_client()")
    web_service.setup_transfer_clients(globus_endpoint)
    # web_service.set_transfer_client()
    # results = web_service.set_transfer_client()
    # if results['status'] == 'error':
    #     return results

    log.info("stage_upload_files")
    transfer_request = web_service.upload_files(project_id, transfer_id, globus_endpoint, endpoint_path)
    # results = web_service.stage_upload_files(project_id, transfer_id, globus_endpoint, endpoint_path)
    # log.info("results of staging: ", results)
    task_id = transfer_request['task_id']
    DatabaseInterface().update_extras_data_on_status_record(
        status_record_id,
        {
            'globus_task_id': task_id
        }
    )
    poll = True
    while poll:
        results = web_service.get_task_status(task_id)
        poll = (results['status'] == 'ACTIVE')
    log.info(results)
    return results


def non_etl_globus_upload_old(status_record_id):
    # noinspection PyBroadException
    try:
        log = logging.getLogger(__name__ + ".etl_excel_processing")
        log.info("Starting etl_excel_processing with status_record_id{}".format(status_record_id))
        status_record = DatabaseInterface().update_status(status_record_id, BackgroundProcess.RUNNING)
        # noinspection PyUnusedLocal
        user_id = status_record['owner']
        project_id = status_record['project_id']
        log.info("Project id = {}".format(project_id))
    except BaseException:
        DatabaseInterface().update_status(status_record_id, BackgroundProcess.FAIL)
        message = "Unexpected failure; status_record_id = {}".format(status_record_id)
        logging.exception(message)
