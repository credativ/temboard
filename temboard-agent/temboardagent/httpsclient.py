import httplib
import urllib2
import ssl
import socket
import json
from tools import *

class VerifiedHTTPSConnection(httplib.HTTPSConnection):
    def connect(self):
        sock = socket.create_connection((self.host, self.port), self.timeout)
        if self._tunnel_host:
            self.sock = sock
            self._tunnel()
        self.sock = ssl.wrap_socket(sock,
                                    self.key_file,
                                    self.cert_file,
                                    cert_reqs=ssl.CERT_REQUIRED,
                                    ca_certs=CA_CERT_FILE)

class VerifiedHTTPSHandler(urllib2.HTTPSHandler):
    def __init__(self, connection_class = VerifiedHTTPSConnection):
        self.specialized_conn_class = connection_class
        urllib2.HTTPSHandler.__init__(self)

    def https_open(self, req):
        return self.do_open(self.specialized_conn_class, req)

class UnverifiedHTTPSConnection(httplib.HTTPSConnection):
    def connect(self):
        sock = socket.create_connection((self.host, self.port), self.timeout)
        if self._tunnel_host:
            self.sock = sock
            self._tunnel()
        self.sock = ssl.wrap_socket(sock)

class UnverifiedHTTPSHandler(urllib2.HTTPSHandler):
    def __init__(self, connection_class = UnverifiedHTTPSConnection):
        self.specialized_conn_class = connection_class
        urllib2.HTTPSHandler.__init__(self)

    def https_open(self, req):
        return self.do_open(self.specialized_conn_class, req)

class RequestWithMethod(urllib2.Request):
    def __init__(self, *args, **kwargs):
        self._method = kwargs.pop('method', None)
        urllib2.Request.__init__(self, *args, **kwargs)

    def get_method(self):
        return self._method if self._method else super(RequestWithMethod, self).get_method()

def https_request(in_ca_cert_file, method, url, headers = None, data = None):
    if in_ca_cert_file:
        global CA_CERT_FILE
        CA_CERT_FILE = in_ca_cert_file
        https_handler = VerifiedHTTPSHandler()
    else:
        https_handler = UnverifiedHTTPSHandler()
    url_opener = urllib2.build_opener(https_handler)
    headers_list = []
    for key, val in headers.iteritems():
        headers_list.append((key,val))
    url_opener.addheaders = headers_list
    if data:
        request = RequestWithMethod(url, data = json.dumps(data), method = method)
    else:
        request = RequestWithMethod(url, method = method)
    handle = url_opener.open(request)
    response = handle.read()
    if 'Set-Cookie' in handle.info():
        cookies = handle.info()['Set-Cookie']
    else:
        cookies = None
    handle.close()
    return (handle.code, response, cookies)
