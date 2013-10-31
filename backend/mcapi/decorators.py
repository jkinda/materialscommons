from flask import request, make_response, current_app
from functools import wraps, update_wrapper, partial
from datetime import timedelta
import json
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
            return error.not_authorized("You are not authorized to access the system")
        apiuser = access.get_apiuser()
        user = request.args.get('user', default=apiuser)
        if shared:
            access.check(apiuser, user)
        elif apiuser != user:
            raise mcexceptions.AccessNotAllowedException()
        return method(*args, **kwargs)
    return wrapper

def crossdomain(origin=None, methods=None, headers=None, max_age=21600, attach_to_all=True, automatic_options=True):
    if methods is not None:
        methods = ', '.join(sorted(x.upper() for x in methods))
    if headers is not None and not isinstance(headers, basestring):
        headers = ', '.join(x.upper() for x in headers)
    if not isinstance(origin, basestring):
        origin = ', '.join(origin)
    if isinstance(max_age, timedelta):
        max_age = max_age.total_seconds()

    def get_methods():
        if methods is not None:
            return methods
        options_resp = current_app.make_default_options_response()
        return options_resp.headers['allow']

    def decorator(f):
        def wrapped_function(*args, **kwargs):
            if automatic_options and request.method == 'OPTIONS':
                resp = current_app.make_default_options_response()
            else:
                resp = make_response(f(*args, **kwargs))
            if not attach_to_all and request.method != 'OPTIONS':
                return resp
            h = resp.headers
            h['Access-Control-Allow-Origin'] = origin
            h['Access-Control-Allow-Methods'] = get_methods()
            h['Access-Control-Max-Age'] = str(max_age)
            request_headers = request.headers.get('Access-Control-Request-Headers')
            if request_headers is not None:
                h['Access-Control-Allow-Headers'] = request_headers
            return resp

        f.provide_automatic_options = False
        f.required_methods = ['OPTIONS']
        return update_wrapper(wrapped_function, f)
    return decorator

def jsonp(f):
    """Wraps JSONified output for JSONP """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        callback = request.args.get('callback', False)
        if callback:
            rv = f(*args, **kwargs)
            data_as_dict = json2dict(rv)
            if hasattr(rv, "status_code"):
                jsonpjson = {'status_code' : rv.status_code,\
                             'success' : is_successful(rv.status_code),\
                             'data': data_as_dict}
            else:
                jsonpjson = {'status_code': 200, 'success' : True, 'data': data_as_dict}
            content = str(callback) + '(' + json.dumps(jsonpjson) + ')'
            return current_app.response_class(content, mimetype='application/javascript')
        else:
            return f(*args, **kwargs)
    return decorated_function

def is_successful(status_code):
    return status_code < 299 and status_code >= 200

def json2dict(what):
    if hasattr(what, "status_code"):
        # Response object
        data = what.get_data()
        return json.loads(data)
    else:
        return json.loads(what)
