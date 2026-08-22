import os, http.server, socketserver, functools
D = os.path.dirname(os.path.abspath(__file__))
os.chdir(D)
H = functools.partial(http.server.SimpleHTTPRequestHandler, directory=D)
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("127.0.0.1", 5177), H) as s:
    print("serving", D, "on http://localhost:5177")
    s.serve_forever()
