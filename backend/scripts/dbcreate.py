#!/usr/bin/env python
import rethinkdb as r
from os import environ

MCDB_PORT = environ.get('MCDB_PORT') or 28015
r.connect("localhost", int(MCDB_PORT)).repl()


def create_database():
    run(r.db_create("materialscommons"))


def create_tables():
    create_table("users")
    create_table("usergroups")
    create_table("files")
    create_table("directories")
    create_table("tags")
    create_table("news")
    create_table("tags")
    create_table("tag2item")
    create_table("notes")
    create_table("runs")
    create_table("properties")
    create_table("property_sets")
    create_table("reviews")
    create_table("processes")
    create_table("machines")
    create_table("projects")
    create_table("templates")
    create_table("ui")
    create_table("drafts")
    create_table("project2directory")
    create_table("project2file")
    create_table("directories_denorm")
    create_table("samples")
    create_table('access')
    create_table("sample2item")
    create_table("elements")

    # old
    create_table("datafiles")
    create_table("datadirs")
    create_table("project2datadir")
    create_table("project2datafile")
    create_table("datadirs_denorm")
    create_table("projects2samples")
    create_table("processes2samples")
    create_table("items2tags")


def create_table(table):
    run(r.db('materialscommons').table_create(table))


def create_indices():
    create_index('access', 'user_id')
    create_index('access', 'project_id')
    create_index('access', 'dataset')
    create_index('directories', 'name')
    create_index('project2directory', 'directory_id')
    create_index('project2directory', 'project_id')
    create_index('files', 'name')
    create_index('files', 'owner')
    create_index('files', 'checksum')
    create_index('files', 'usesid')
    create_index('files', 'mediatype')
    create_index('users', 'apikey')
    create_index('projects', 'name')
    create_index('projects', 'owner')
    create_index('usergroups', 'owner')
    create_index('usergroups', 'name')
    create_index('templates', 'template_name')
    create_index('drafts', 'owner')
    create_index('drafts', 'project_id')
    create_index('reviews', 'assigned_to')
    create_index('reviews', 'author')
    create_index('reviews', 'project')
    create_index('project2file', 'project_id')
    create_index('project2file', 'file_id')
    create_index('tag2item', 'tag_id')
    create_index('tag2item', 'item_id')
    create_index('templates', 'template_pick')
    create_index('processes', 'project_id')
    create_index('sample2item', 'sample_id')
    create_index('sample2item', 'item_id')
    create_index('samples', 'project_id')
    create_index('directories_denorm', 'name')
    create_index('property_sets', 'item_id')
    create_index('properties', 'item_id')
    create_index('properties', 'value')

    # old
    create_index('access', 'user_id')
    create_index('access', 'project_id')
    create_index('access', 'dataset')
    create_index('datadirs', 'name')
    create_index('datadirs', 'project')
    create_index('project2datadir', 'datadir_id')
    create_index('project2datadir', 'project_id')
    create_index('datafiles', 'name')
    create_index('datafiles', 'owner')
    create_index('datafiles', 'checksum')
    create_index('datafiles', 'usesid')
    create_index('datafiles', 'mediatype')
    create_index('users', 'apikey')
    create_index('projects', 'name')
    create_index('projects', 'owner')
    create_index('usergroups', 'owner')
    create_index('usergroups', 'name')
    create_index('templates', 'template_name')
    create_index('drafts', 'owner')
    create_index('drafts', 'project_id')
    create_index('reviews', 'assigned_to')
    create_index('reviews', 'author')
    create_index('reviews', 'project')
    create_index('project2datafile', 'project_id')
    create_index('project2datafile', 'datafile_id')
    create_index('tag2item', 'tag_id')
    create_index('tag2item', 'item_id')
    create_index('treatments', 'value')
    create_index('treatments', 'sample_id')
    create_index('templates', 'template_pick')
    create_index('processes', 'project')
    create_index('projects2samples', 'project_id')
    create_index('projects2samples', 'sample_id')
    create_index('processes2samples', 'sample_id')
    create_index('processes2samples', 'project_id')
    create_index('datafiles_denorm', 'df_id')
    create_index('datafiles_denorm', 'process_id')
    create_index('datafiles_denorm', 'project_id')
    create_index('samples', 'project_id')
    create_index('items2tags', 'item_id')
    create_index('datadirs_denorm', 'name')
    create_index('datadirs_denorm', 'project_id')

def create_index(table, name):
    run(r.db('materialscommons').table(table).index_create(name))


def run(rql):
    try:
        rql.run()
    except r.RqlRuntimeError:
        pass

if __name__ == "__main__":
    create_database()
    create_tables()
    create_indices()
