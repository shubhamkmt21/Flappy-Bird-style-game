import os
import webbrowser
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

HOST = "127.0.0.1"
PORT = 8000


def main() -> None:
	cwd = os.getcwd()
	with ThreadingHTTPServer((HOST, PORT), SimpleHTTPRequestHandler) as httpd:
		url = f"http://{HOST}:{PORT}/"
		print(f"Serving '{cwd}' at {url}")
		try:
			webbrowser.open(url)
		except Exception:
			pass
		httpd.serve_forever()


if __name__ == "__main__":
	main()
