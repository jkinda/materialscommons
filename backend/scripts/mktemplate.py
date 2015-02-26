#!/usr/bin/env python

import json
import rethinkdb as r
import sys
import optparse

if __name__ == "__main__":
    parser = optparse.OptionParser()
    parser.add_option("-p", "--port", dest="port",
                      help="rethinkdb port", default=30815)
    parser.add_option("-f", "--file", dest="filename",
                      help="json file", type="string")
    (options, args) = parser.parse_args()
    if options.filename is None:
        print "You must specify json file"
        sys.exit(1)
    conn = r.connect('localhost', int(options.port), db='materialscommons')
    json_data = open(options.filename)
    print "Loading template file: %s" % (options.filename)
    data = json.load(json_data)
    existing = r.table('templates').get(data['id']).run(conn)
    if existing:
        r.table('templates').get(data['id']).delete().run(conn)
        r.table('templates').insert(data).run(conn)
        print '  Template deleted and re-inserted into the database...'
    else:
        r.table('templates').insert(data).run(conn)
        print '  Template inserted into the database...'
