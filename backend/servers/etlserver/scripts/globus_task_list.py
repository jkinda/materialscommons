#!/usr/bin/env python

import os
from ..utils.LoggingHelper import LoggingHelper
from ..common.GlobusAccess import GlobusAccess, CONFIDENTIAL_CLIENT_APP_AUTH
from globus_sdk import TransferAPIError
import logging
import time

if __name__ == '__main__':
    LoggingHelper().set_root()
    logger = logging.getLogger("main")
    globus_access = GlobusAccess(use_implementation=CONFIDENTIAL_CLIENT_APP_AUTH)
    cc_user = os.environ.get('MC_CONFIDENTIAL_CLIENT_USER')
    cc_token = os.environ.get('MC_CONFIDENTIAL_CLIENT_PW')
    cc_transfer_client = globus_access.get_cc_transfer_client()
    target_endpoint = os.environ.get('MC_CONFIDENTIAL_CLIENT_ENDPOINT')
    cc_transfer_client.endpoint_autoactivate(target_endpoint)
    auth_client = globus_access.get_auth_client()
    users = auth_client.get_identities(usernames="glenn.tarcea@gmail.com")
    print(users)
    principal_id = users['identities'][0]['id']
    destination_path = "/glenn.tarcea_upload/"
    # globus id for glenn.tarcea@gmail.com = 32154544-c422-4593-9f94-db9a108eebe0
    acl_rule = dict(principal=principal_id, principal_type="identity",
                    path=destination_path, permissions='rw')
    try:
        cc_transfer_client.add_endpoint_acl_rule(target_endpoint, acl_rule)
    except TransferAPIError as error:
        logger.info(error)
        if error.code == 'PermissionDenied':
            pass
        elif error.code != 'Exists':
            pass

    loop = True
    while loop:
        tasks = cc_transfer_client.endpoint_manager_task_list(num_results=None, filter_endpoint=target_endpoint)
        for task in tasks:
            print("-------------------")
            print(task)
            print("-------------------")
        time.sleep(10)