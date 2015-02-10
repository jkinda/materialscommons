from mcapp import app
from decorators import apikey, jsonp,eventlog
from flask import request, g, jsonify
import rethinkdb as r
import dmutil
import args
import access
import json
from os.path import dirname
import error
from loader.model import note


def getProcessesandProjects(object_id):
    processes = list(r.table('processes2samples')
                     .get_all(object_id, index='sample_id')
                     .run(g.conn))
    projects = list(r.table('projects2samples')
                    .filter({'sample_id': object_id})
                    .run(g.conn))
    return processes, projects


@app.route('/objects/<object_id>', methods=['GET'])
@jsonp
def get_object(object_id):
    o = dict()
    rr = r.table('samples').get(object_id)
    selection = rr.run(g.conn, time_format='raw')
    o["sample"] = selection
    o["processes"], o['projects'] = getProcessesandProjects(object_id)
    return args.json_as_format_arg(o)


@app.route('/objects', methods=['GET'])
@jsonp
def get_all_objects():
    rr = r.table('samples').order_by(r.desc('birthtime'))
    selection = list(rr.run(g.conn, time_format='raw'))
    return args.json_as_format_arg(selection)


@app.route('/objects/project/<project_id>', methods=['GET'])
@jsonp
def get_all_objects_by_project(project_id):
    rr = r.table('samples')\
          .filter(lambda sample: sample['projects']
                  .map(lambda element: element['id'].eq(project_id))
                  .reduce(lambda left, right: left+right))\
          .order_by(r.desc('birthtime'))
    selection = list(rr.run(g.conn, time_format='raw'))
    return args.json_as_format_arg(selection)


@app.route('/objects/user/<user>', methods=['GET'])
@jsonp
def get_objects_user(user):
    rr = r.table('samples').filter({'owner': user})\
                           .order_by(r.desc('birthtime'))
    selection = list(rr.run(g.conn, time_format='raw'))
    return args.json_as_format_arg(selection)


@app.route('/objects/update/<object_id>', methods=['PUT'])
@apikey
def updateobject(object_id):
    rv = r.table('samples').get(object_id).update(request.json).run(g.conn)
    if (rv['replaced'] == 1 or rv['unchanged'] == 1):
        return ''
    else:
        error.update_conflict("Unable to update object: " + object_id)


@app.route('/objects/new', methods=['POST'])
@apikey
@eventlog
def create_object():
    j = request.get_json()
    sample = dict()
    user = access.get_user()
    sample['name'] = dmutil.get_required('name', j)
    if '/' in sample['name']:
        error.not_acceptable("forward slash in sample name")
    else:
        sample['description'] = dmutil.get_optional('description', j)
        sample['available'] = dmutil.get_optional('available', j)
        sample['properties'] = dmutil.get_optional('properties', j)
        sample['alloy'] = dmutil.get_optional('alloy', j)
        sample['birthtime'] = r.now()
        sample['mtime'] = sample['birthtime']
        sample['created_by'] = user
        sample['owner'] = user
        sample['parent_id'] = dmutil.get_optional('parent_id', j)
        sample['path'] = dmutil.get_required('path', j)
        sample['project_id'] = dmutil.get_required('project_id', j)
        sample['_type'] = 'sample'
        notes = dmutil.get_optional('notes', j)
        title = dmutil.get_optional('title', j)
        s = dmutil.insert_entry('samples', sample, return_created=True)
        sid = s['id']
        _join_sample_projects(dmutil.get_optional('projects', j, []), sid)
        #Add note into notes table
        if title or notes:
            n = note.Note(user, notes, title, sid,
                          'sample', sample['project_id'])
            rv = dmutil.insert_entry('notes', n.__dict__, return_created=True)
            s['notes'] = rv
        return jsonify(s)


def _join_sample_projects(projects, sample_id):
    for p in projects:
        r.table('projects2samples').insert({
            'sample_id': sample_id,
            'project_id': p['id'],
            'project_name': p['name']
        }).run(g.conn)


def _create_treatments_denorm(treatments, sample_id):
    for treatment in treatments:
        _add_treatment_entries(treatment, sample_id)


def _add_treatment_entries(treatment, sample_id):
    for key in treatment['properties']:
        prop = treatment['properties'][key]
        prop['sample_id'] = sample_id
        prop['attribute'] = key
        prop['property'] = treatment['attribute']
        dmutil.insert_entry('treatments', prop)


@app.route('/sample/project/join', methods=['POST'])
@apikey
def join_project_sample():
    j = request.get_json()
    sample_project = dict()
    sample_project['sample_id'] = dmutil.get_required('sample_id', j)
    sample_project['project_id'] = dmutil.get_required('project_id', j)
    sample_project['project_name'] = dmutil.get_required('project_name', j)
    id = dmutil.insert_entry_id('projects2samples', sample_project)
    return id


@app.route('/samples/project/<sample_id>', methods=['GET'])
@apikey
@jsonp
def join_table_entries(sample_id):
    rv = r.table('projects2samples').filter({'sample_id': sample_id})
    selection = list(rv.run(g.conn, time_format='raw'))
    return args.json_as_format_arg(selection)


@app.route('/samples/by_project/<project_id>', methods=['GET'])
@apikey
@jsonp
def get_samples_by_project(project_id):
    rv = r.table('projects2samples')\
          .get_all(project_id, index='project_id')\
          .eq_join('sample_id', r.table('samples')).zip()
    selection = list(rv.run(g.conn, time_format='raw'))
    return args.json_as_format_arg(selection)


class SItem:
    def __init__(self, id, name, path, owner):
        self.id = id
        self.level = 0
        self.name = name
        self.owner = owner
        self.path = path
        self.children = []


class DEncoder2(json.JSONEncoder):
    def default(self, o):
        return o.__dict__


@app.route('/samples/<project_id>/tree', methods=['GET'])
@apikey
@jsonp
def sample_tree(project_id):
    samples = r.table('projects2samples')\
               .get_all(project_id, index='project_id')\
               .eq_join('sample_id', r.table('samples'))\
               .zip().run(g.conn)
    all_samples = {}
    top_level_samples = []
    for samp in samples:
        sitem = SItem(samp['id'], samp['name'], samp['path'], samp['owner'])
        sitem.level = sitem.path.count('/')
        sitem.numofchildren = 0
        if sitem.path in all_samples:
            existing_sitem = all_samples[sitem.path]
            sitem.children = existing_sitem.children
            sitem.numofchildren = len(sitem.children)
        all_samples[sitem.path] = sitem
        if sitem.level == 0:
            top_level_samples.append(sitem)
        parent_name = dirname(sitem.path)
        if parent_name in all_samples:
            parent = all_samples[parent_name]
            parent.children.append(sitem)
            parent.numofchildren = len(parent.children)
        else:
            parent = SItem('', parent_name, '', '')
            parent.children.append(sitem)
            parent.numofchildren = len(parent.children)
            all_samples[parent_name] = parent
    return json.dumps(top_level_samples, cls=DEncoder2)


@app.route('/objects/elements', methods=['GET'])
@apikey
@jsonp
def get_all_elements():
    rr = r.table('elements').order_by('name')
    selection = list(rr.run(g.conn, time_format='raw'))
    return args.json_as_format_arg(selection)
