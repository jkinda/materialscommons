#!/usr/bin/env python
import os
import logging
import time
from random import randint

from globus_sdk import (RefreshTokenAuthorizer, TransferClient, TransferAPIError,
                        TransferData)
from ..utils.LoggingHelper import LoggingHelper
from ..common.TestProject import TestProject
from ..common.McdirHelper import McdirHelper
from ..common.MaterialsCommonsGlobusInterfaceNew import MaterialsCommonsGlobusInterfaceNew
from ..database.DatabaseInterface import DatabaseInterface

# 1960* is the endpoint on titan laptop
SOURCE_ENDPOINT = '1960ad4c-aaf2-11e8-970a-0a6d4e044368'  # '2567c5aa-aaca-11e8-9704-0a6d4e044368'  # 'e1a3e368-aa26-11e8-9704-0a6d4e044368'  # '85908598-a7cb-11e8-9700-0a6d4e044368'


class EpEpTransferHelper:
    def __init__(self, source_endpoint, project_id, user_id):
        self.source_endpoint = source_endpoint
        self.project_id = project_id
        self.user_id = user_id
        self.dest_path = ""
        self.log = logging.getLogger(self.__class__.__name__)
        self.worker_base_path = McdirHelper().get_upload_dir()
        self.mc_interface = MaterialsCommonsGlobusInterfaceNew(user_id)
        self.client_user = os.environ.get('MC_CONFIDENTIAL_CLIENT_USER')
        self.client_token = os.environ.get('MC_CONFIDENTIAL_CLIENT_PW')
        self.mc_target_ep_id = os.environ.get('MC_CONFIDENTIAL_CLIENT_ENDPOINT')
        self.transfer_client = None
        self.source_user_globus_id = None

    def do_transfer(self):
        self.log.info('Transfer for user_id = {}'.format(self.user_id))
        if (not self.client_user) or (not self.client_token) or (not self.mc_target_ep_id):
            missing = []
            if not self.client_user:
                missing.append('MC_CONFIDENTIAL_CLIENT_USER')
            if not self.client_token:
                missing.append('MC_CONFIDENTIAL_CLIENT_PW')
            if not self.mc_target_ep_id:
                missing.append("MC_CONFIDENTIAL_CLIENT_ENDPOINT")
            message = "Missing environment values: {}".format(", ".join(missing))
            raise EnvironmentError(message)

        self.log.info('Confidential Client, user_id = {}'.format(self.client_user))
        self.log.info('Source endpoint = {}'.format(self.source_endpoint))
        self.log.info('Target endpoint = {}'.format(self.mc_target_ep_id))

        base_path = self.worker_base_path
        random_key = "{0:04d}".format(randint(0, 10000))
        transfer_dir = self.make_transfer_dir(random_key)
        transfer_base_path = os.path.join(base_path, transfer_dir)
        self.dest_path = "/{}".format(transfer_dir)
        self.log.info("dest_path is {}".format(self.dest_path))
        os.mkdir(transfer_base_path)
        self.log.info("transfer_base_path = {}".format(transfer_base_path))

        records = DatabaseInterface().get_globus_auth_info_records_by_user_id(self.user_id)
        # Only the latest
        record = (records[0] if len(records) > 0 else None)
        if not record:
            self.log.info("Globus auth info record does not exist; logged out?")
            return

        # else
        self.source_user_globus_id = record['globus_id']
        transfer_tokens = record['tokens']['transfer.api.globus.org']
        self.log.info("transfer.api.globus.org tokens = {}".format(transfer_tokens))
        self.transfer_client = \
            self.get_transfer_client(transfer_tokens, self.source_endpoint)
        if not self.transfer_client:
            self.log.error("Transfer Client is not available; abort")
            return

        # else
        transfer_data = TransferData(transfer_client=self.transfer_client,
                                     source_endpoint=self.source_endpoint,
                                     destination_endpoint=self.mc_target_ep_id,
                                     label='Test-transfer-for-{}'.format(transfer_dir))
        self.log.info("Object transfer_data = {}".format(transfer_data))
        transfer_data.add_item(source_path='/',
                               destination_path=self.dest_path,
                               recursive=True)
        self.log.info("Object transfer_data = {}".format(transfer_data))
        self.transfer_client.endpoint_autoactivate(self.source_endpoint)
        self.transfer_client.endpoint_autoactivate(self.mc_target_ep_id)

        try:
            self.transfer_client.add_endpoint_acl_rule(
                self.mc_target_ep_id,
                dict(principal=self.source_user_globus_id,
                     principal_type='identity', path=self.dest_path, permissions='rw'),
            )
        except TransferAPIError as error:
            # PermissionDenied can happen if a new Portal client is swapped
            # in and it doesn't have endpoint manager on the dest_ep.
            # The /portal/processed directory has been set to to read/write
            # for all users so the subsequent operations will succeed.
            if error.code == 'PermissionDenied':
                pass
            elif error.code != 'Exists':
                raise

        self.log.info("Before submit transfer")
        results = self.transfer_client.submit_transfer(transfer_data)
        self.log.info("After submit transfer: {}".format(results))
        task_id = results['task_id']
        status = "STARTED"
        while not status == "SUCCEEDED" and not status == "FAILED":
            task = self.transfer_client.get_task(task_id)
            status = task['status']
            self.log.info("Current task status = {}".format(status))
            time.sleep(5)

        try:
            acl = next(acl for acl in self.transfer_client.endpoint_acl_list(self.mc_target_ep_id)
                       if self.dest_path == acl['path'])
        except StopIteration:
            pass
        except TransferAPIError as ex:
            # PermissionDenied can happen if a new Portal client is swapped
            # in and it doesn't have endpoint manager on the dest_ep.
            # The /portal/processed directory has been set to to writeable
            # for all users so the delete task will succeed even if an ACL
            # can't be set.
            if ex.code == 'PermissionDenied':
                pass
        else:
            self.transfer_client.delete_endpoint_acl_rule(self.mc_target_ep_id, acl['id'])

    def get_transfer_client(self, transfer_tokens, endpoint_id, endpoint_path='/'):
        materials_commons_client = self.mc_interface.get_auth_client()
        authorizer = RefreshTokenAuthorizer(
            transfer_tokens['refresh_token'],
            materials_commons_client,
            access_token=transfer_tokens['access_token'],
            expires_at=transfer_tokens['expires_at_seconds'])

        transfer = TransferClient(authorizer=authorizer)

        try:
            transfer.endpoint_autoactivate(endpoint_id)
            listing = transfer.operation_ls(endpoint_id, path=endpoint_path)
        except TransferAPIError as err:
            self.log.error('Error [{}]: {}'.format(err.code, err.message))
            return None

        file_list = [e for e in listing if e['type'] == 'file']
        self.log.info("File list = {}".format(file_list))

        ep = transfer.get_endpoint(endpoint_id)
        self.log.info("Endpoint - display_name = {}".format(ep['display_name']))
        self.log.info("Endpoint - owner_string = {}".format(ep['owner_string']))

        https_server = ep['https_server']
        endpoint_uri = https_server + endpoint_path if https_server else None
        self.log.info("endpoint_uri = {}".format(endpoint_uri))
        return transfer

    @staticmethod
    def make_transfer_dir(status_record_id):
        return "ep2ep-{}".format(status_record_id)


def main(project):
    log = logging.getLogger("main")
    log.info("Starting: main()")
    transfer_helper = EpEpTransferHelper(SOURCE_ENDPOINT, project.id, project.owner)
    transfer_helper.do_transfer()


if __name__ == '__main__':
    LoggingHelper().set_root()
    startup_log = logging.getLogger("main-setup")
    startup_log.info("Starting main-setup")

    apikey = os.environ.get('APIKEY')
    startup_log.info("APIKEY = {}".format(apikey))
    test_project = TestProject(apikey).get_project()
    startup_log.info("generated test project - name = {}; id = {}".
                     format(test_project.name, test_project.id))

    main(test_project)
