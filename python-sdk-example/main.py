import http.server
import json
import os  # <-- 1. Añade esta importación

import ngrok
from dotenv import load_dotenv  # <-- 2. Añade esta importación

# 3. Carga el archivo .env antes de que se ejecute cualquier otra cosa
load_dotenv()


# This HTTP server is just for demonstration. If you already have an app
# running, skip start_server() and point ngrok.forward() at its port instead.
def start_server():
    class HelloHandler(http.server.BaseHTTPRequestHandler):

        def do_GET(self):
            print(f"GET {self.path}")
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(b"Hello from ngrok-python!\n")

    server = http.server.HTTPServer(("localhost", 8085), HelloHandler)
    print("Server listening on port 8085")
    return server


def connect_ngrok():
    forwarder = ngrok.forward(
        "localhost:8085",
        # 4. Cambiamos la configuración para que lea del .env
        authtoken=os.environ.get("NGROK_AUTHTOKEN"),
        # Uncomment below to use a specific domain.
        # https://dashboard.ngrok.com/domains
        # domain="hello-world.your-domain.com",
        # Uncomment below to load balance across multiple instances of your app.
        # https://ngrok.com/docs/universal-gateway/endpoint-pooling/
        # pooling_enabled=True,
        # Uncomment below to require visitors to log in with Google before accessing your app.
        # https://ngrok.com/docs/traffic-policy/actions/oauth/
        # traffic_policy=json.dumps({
        #     "on_http_request": [
        #         {"actions": [{"type": "oauth", "config": {"provider": "google"}}]},
        #     ],
        # }),
    )
    print(f"Available at: {forwarder.url()}")


def main():
    server = start_server()
    connect_ngrok()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
        ngrok.disconnect()
        server.server_close()


main()
