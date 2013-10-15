from mcapp import app
from decorators import crossdomain, apikey, jsonp
import json
from flask import jsonify, g, request, make_response
import rethinkdb as r
import uuid
from utils import createTagCount, makePwHash, error_response, set_dates

@app.route('/v1.0/tag', methods=['POST'])
@crossdomain(origin='*')
def tag():
    inserted = r.table('tags').insert(request.json).run(g.conn)
    if (inserted[u'inserted'] == 1):
        return {'status': 'SUCCESS'}
    else:
        return error_response(423)

@app.route('/v1.0/tag/<tag>', methods=['DELETE'])
@crossdomain(origin='*')
@apikey
def delete_tag(tag):
    pass

@app.route('/v1.0/tags')
@jsonp
def all_tags():
    selection = list(r.table('tags').run(g.conn))
    return json.dumps(selection)

@app.route('/v1.0/tags/count')
@jsonp
def tags_by_count():
    selection = list(r.table('datafiles').concat_map(lambda item: item['tags']).run(g.conn))
    return createTagCount(selection)

@app.route('/v1.0/datafiles')
@jsonp
def list_public_datafiles():
    selection = list(r.table('datafiles').filter({'access':'public'}).run(g.conn, time_format='raw'))
    return json.dumps(selection)

@app.route('/v1.0/usergroups')
@jsonp
def list_usergroups():
    selection = list(r.table('usergroups').filter({'access':'public'}).run(g.conn, time_format='raw'))
    return json.dumps(selection)

@app.route('/v1.0/news', methods=['GET'])
@jsonp
def get_news():
    selection = list(r.table('news').order_by(r.desc('date')).run(g.conn))
    return json.dumps(selection)

@app.route('/v1.0/news/new', methods=['POST'])
@crossdomain(origin='*')
@apikey
def create_news():
    inserted = r.table('news').insert(request.get_json()).run(g.conn)
    return jsonify(inserted)

@app.route('/v1.0/news/<id>', methods=['DELETE'])
@crossdomain(origin='*')
@apikey
def delete_news(id):
    rv = r.table('news').get(id).delete().run(g.conn)
    return jsonify(rv)

@app.route('/v1.0/datadirs')
@jsonp
def list_public_datadirs():
    selection = list(r.table('datadirs').filter({'access':'public'}).run(g.conn, time_format='raw'))
    return json.dumps(selection)

@app.route('/v1.0/users', methods=['GET'])
@jsonp
def list_users():
    selection = list(r.table('users').pluck('emailAddress', 'id').run(g.conn))
    return json.dumps(selection)

@app.route('/v1.0/newuser', methods=['POST'])
@crossdomain(origin='*')
def newuser():
    account = request.get_json(silent = False)
    if 'email' not in account:
        return make_response(jsonify({'error': 'invalid account'}), 400)
    elif 'password' not in account:
        return make_response(jsonify({'error': 'invalid account'}), 400)
    exists = r.table('users').get(account['email']).run(g.conn)
    if exists is None:
        newacc = {}
        newacc['email'] = account['email']
        newacc['password'] = makePwHash(account['password'])
        newacc['apikey'] = uuid.uuid1().hex
        newacc['name'] = account['email']
        newacc['id'] = account['email']
        set_dates(newacc)
        r.table('users').insert(newacc).run(g.conn)
        return json.dumps({'apikey': newacc['apikey']})
    else:
        error_msg = error_response(402)
        return error_msg