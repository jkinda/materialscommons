import rethinkdb as r
import uuid


class User(object):
    def __init__(self, name, email, password):
        self.email = email
        self.fullname = ""
        self.password = password
        self.id = email
        self.apikey = uuid.uuid1().hex
        self.birthtime = r.now()
        self.mtime = self.birthtime
        self.avatar = ""
        self.description = ""
        self.affiliation = ""
        self.homepage = ""
        self._type = "user"
        self.last_login = self.birthtime
        self.preferences = {
            "tags": [],
            "templates": []
        }
