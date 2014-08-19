from ..mcapp import app
from ..decorators import crossdomain, apikey, jsonp
from flask import g, request, jsonify
import rethinkdb as r
from .. import args
from .. import dmutil
from .. import access
from .. import error
from loader.model import review


@app.route('/reviews/requested', methods=['GET'])
@apikey(shared=True)
@jsonp
def get_reviews_requested():
    user = access.get_user()
    selection = list(r.table('reviews')
                     .get_all(user, index='requested_by')
                     .filter(r.row['requested_to'] != user)
                     .run(g.conn, time_format='raw'))
    return args.json_as_format_arg(selection)


@app.route('/reviews/to_conduct', methods=['GET'])
@apikey(shared=True)
@jsonp
def get_reviews_to_be_conducted():
    user = access.get_user()
    selection = list(r.table('reviews')
                     .get_all(user, index='requested_to')
                     .run(g.conn, time_format='raw'))
    return args.json_as_format_arg(selection)


@app.route('/reviews/<id>', methods=['GET'])
@apikey(shared=True)
@jsonp
def get_review(id):
    selection = r.table('reviews').get(id).run(g.conn, time_format='raw')
    return args.json_as_format_arg(selection)

@app.route('/reviews/<id>', methods=['DELETE'])
@apikey
@crossdomain(origin='*')
def delete_review(id):
    user = access.get_user()
    item = r.table('reviews').get(id).run(g.conn)
    if item is None:
        return error.not_found("No such review: %s" % id)
    if item['requested_to'] == user or item['requested_by'] == user:
        rv = r.table('reviews').get(id).delete().run(g.conn)
        return jsonify(rv)
    else:
        return error.not_authorized("User %s does not have access" % user)


@app.route('/reviews', methods=['POST'])
@apikey(shared=True)
@crossdomain(origin='*')
def add_review():
    print 'here'
    j = request.get_json()
    assigned_to = dmutil.get_required('assigned_to', j)
    author = dmutil.get_required('author', j)
    r = review.Review(author, assigned_to)
    r.messages = dmutil.get_required('messages', j)
    r.item_type = dmutil.get_required('item_type', j)
    r.item_name = dmutil.get_required('item_name', j)
    r.item_id = dmutil.get_required('item_id', j)
    r.title = dmutil.get_required('title', j)
    r.status = "open"
    review_id = dmutil.insert_entry('reviews', r.__dict__)
    return jsonify({'id': review_id})
