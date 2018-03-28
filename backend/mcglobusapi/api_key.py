from flask import request
from functools import wraps, partial
import apikeydb
import error
import access
import mcexceptions


def apikey(method=None, shared=False):
    if method is None:
        return partial(apikey, shared=shared)

    @wraps(method)
    def wrapper(*args, **kwargs):
        apikey = request.args.get('apikey', default="no_such_key")
        if not apikeydb.valid_apikey(apikey):
            return error.not_authorized(
                "You are not authorized to access the system")
        apiuser = access.get_apiuser()
        user = request.args.get('user', default=apiuser)
        if shared:
            access.check(apiuser, user)
        elif apiuser != user:
            raise mcexceptions.AccessNotAllowedException()
        return method(*args, **kwargs)

    return wrapper