#!/usr/bin/env python3
"""Integration tests for the dependency-free hosted-kit downloader."""

import hashlib
import http.server
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
import unittest
from urllib.parse import urlsplit


SCRIPT = Path(__file__).with_name("download-kit.py")


class KitHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        self.server.requests.append(self.path)
        response = self.server.responses.get(urlsplit(self.path).path)
        if response:
            status, headers, body = response
            self.send_response(status)
            for name, value in headers.items():
                self.send_header(name, value)
            self.end_headers()
            self.wfile.write(body)
        else:
            super().do_GET()

    def log_message(self, *args):
        pass


class DownloadKitTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temporary = tempfile.TemporaryDirectory()
        cls.root = Path(cls.temporary.name)
        handler = lambda *args, **kwargs: KitHandler(
            *args, directory=str(cls.root), **kwargs
        )
        cls.server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
        cls.server.requests = []
        cls.server.responses = {}
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.origin = f"http://127.0.0.1:{cls.server.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()
        cls.temporary.cleanup()

    def setUp(self):
        self.case = tempfile.TemporaryDirectory(dir=self.root)
        self.addCleanup(self.case.cleanup)
        self.work = Path(self.case.name)
        self.site = self.work / "published" / "sarafan"
        self.site.mkdir(parents=True)
        self.destination = self.work / "local-kit"
        self.prefix = "/" + self.site.relative_to(self.root).as_posix()
        self.url = self.origin + self.prefix + "/"
        self.server.requests.clear()
        self.server.responses.clear()
        self.contents = {
            "AGENTS.md": b"Read the local design kit.\n",
            "downloads/palette.json": b'{"orange":"#ff5500"}\n',
            "downloads/fonts/Geist Regular.ttf": bytes(range(256)),
            "assets/heart.svg": b'<svg xmlns="http://www.w3.org/2000/svg"/>\n',
        }
        self.manifest = {
            "schemaVersion": 1,
            "base": "./",
            "files": [
                {
                    "path": name,
                    "mediaType": "application/octet-stream",
                    "bytes": len(body),
                    "sha256": hashlib.sha256(body).hexdigest(),
                }
                for name, body in self.contents.items()
            ],
            "archives": [{"path": "archives/kit.zip"}],
        }
        for name, body in self.contents.items():
            target = self.site / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(body)
        (self.site / "index.html").write_text("<!doctype html><h1>Kit</h1>")
        self.save_manifest()

    def save_manifest(self):
        self.manifest_bytes = (json.dumps(self.manifest) + "\n").encode()
        (self.site / "agent-manifest.json").write_bytes(self.manifest_bytes)

    def run_cli(self, *arguments, url=None, success=True):
        result = subprocess.run(
            [sys.executable, str(SCRIPT), url or self.url, "--dest",
             str(self.destination), *arguments],
            capture_output=True, text=True, timeout=15,
        )
        if success:
            self.assertEqual(result.returncode, 0, result.stderr)
        else:
            self.assertNotEqual(result.returncode, 0, result.stdout)
            self.assertIn("error:", result.stderr.lower())
            self.assertNotIn("traceback", result.stderr.lower())
        return result

    def test_downloads_all_files_and_manifest_preserving_paths(self):
        self.run_cli()
        for name, body in self.contents.items():
            self.assertEqual((self.destination / name).read_bytes(), body)
        self.assertEqual(
            (self.destination / "agent-manifest.json").read_bytes(),
            self.manifest_bytes,
        )
        self.assertFalse((self.destination / "archives").exists())
        self.assertFalse(any("kit.zip" in path for path in self.server.requests))

    def test_accepts_page_hash_manifest_and_directory_without_trailing_slash(self):
        for suffix in ("index.html#downloads", "agent-manifest.json", ""):
            with self.subTest(suffix=suffix):
                url = self.url + suffix if suffix else self.url.rstrip("/")
                self.run_cli("--include", "AGENTS.md", url=url)
                self.assertEqual((self.destination / "AGENTS.md").read_bytes(),
                                 self.contents["AGENTS.md"])

    def test_repeatable_include_selects_exact_file_or_directory_prefix(self):
        self.run_cli("--include", "downloads/fonts/", "--include", "AGENTS.md")
        self.assertTrue((self.destination / "downloads/fonts/Geist Regular.ttf").exists())
        self.assertTrue((self.destination / "AGENTS.md").exists())
        self.assertFalse((self.destination / "downloads/palette.json").exists())
        self.assertFalse((self.destination / "assets").exists())
        self.assertTrue((self.destination / "agent-manifest.json").exists())

    def test_include_does_not_match_partial_directory_name(self):
        self.run_cli("--include", "download", success=False)
        self.assertFalse((self.destination / "downloads").exists())

    def test_skips_identical_files_without_replacing_or_downloading_them(self):
        self.run_cli()
        target = self.destination / "AGENTS.md"
        original = target.stat()
        self.server.requests.clear()
        result = self.run_cli()
        self.assertEqual(target.stat().st_mtime_ns, original.st_mtime_ns)
        self.assertEqual(target.stat().st_ino, original.st_ino)
        self.assertEqual(self.server.requests, [self.prefix + "/agent-manifest.json"])
        self.assertIn("skip", result.stdout.lower())

    def test_refuses_differing_existing_file_then_explicitly_overwrites(self):
        self.destination.mkdir()
        target = self.destination / "AGENTS.md"
        target.write_text("My local instructions")
        self.run_cli(success=False)
        self.assertEqual(target.read_text(), "My local instructions")
        self.run_cli("--overwrite")
        self.assertEqual(target.read_bytes(), self.contents["AGENTS.md"])

    def test_hash_mismatch_leaves_existing_file_and_no_temporary_files(self):
        self.destination.mkdir()
        target = self.destination / "AGENTS.md"
        target.write_text("Preserve me")
        body = b"x" * len(self.contents["AGENTS.md"])
        (self.site / "AGENTS.md").write_bytes(body)
        result = self.run_cli("--include", "AGENTS.md", "--overwrite", success=False)
        self.assertIn("sha256", result.stderr.lower())
        self.assertEqual(target.read_text(), "Preserve me")
        self.assertEqual(list(self.destination.iterdir()), [target])

    def test_byte_count_mismatch_does_not_write_payload(self):
        (self.site / "AGENTS.md").write_text("short")
        result = self.run_cli("--include", "AGENTS.md", success=False)
        self.assertIn("byte", result.stderr.lower())
        self.assertFalse((self.destination / "AGENTS.md").exists())

    def test_html_fallback_cannot_pass_as_a_manifest_or_payload(self):
        self.server.responses[self.prefix + "/agent-manifest.json"] = (
            200, {"Content-Type": "text/html"}, b"<!doctype html><h1>SPA</h1>"
        )
        self.run_cli(success=False)
        self.assertFalse((self.destination / "agent-manifest.json").exists())
        self.server.responses.clear()
        self.server.responses[self.prefix + "/AGENTS.md"] = (
            200, {"Content-Type": "text/html"}, b"<!doctype html><h1>SPA</h1>"
        )
        self.run_cli("--include", "AGENTS.md", success=False)
        self.assertFalse((self.destination / "AGENTS.md").exists())

    def test_http_error_is_clear_and_nonzero(self):
        (self.site / "AGENTS.md").unlink()
        result = self.run_cli("--include", "AGENTS.md", success=False)
        self.assertIn("404", result.stderr)
        self.assertIn("AGENTS.md", result.stderr)
        self.assertFalse((self.destination / "AGENTS.md").exists())

    def test_truncated_http_response_is_clear_and_does_not_write_payload(self):
        self.server.responses[self.prefix + "/AGENTS.md"] = (
            200, {"Content-Length": "1000"}, b"partial response"
        )
        self.run_cli("--include", "AGENTS.md", success=False)
        self.assertFalse((self.destination / "AGENTS.md").exists())

    def test_rejects_unsafe_manifest_paths_before_fetching_any_payload(self):
        for name in ("../escape", "/escape", "a/../escape", "a/./b", "a//b",
                     "a\\b", "https://example.invalid/a", "//example.invalid/a",
                     "a?query", "a#fragment", "%2e%2e/escape", "C:/escape", ""):
            with self.subTest(path=name):
                self.manifest["files"][0]["path"] = name
                self.save_manifest()
                self.server.requests.clear()
                self.run_cli(success=False)
                self.assertEqual(self.server.requests,
                                 [self.prefix + "/agent-manifest.json"])
                self.assertFalse((self.destination / "AGENTS.md").exists())

    def test_rejects_unsafe_include_paths(self):
        for name in ("../escape", "/escape", "a\\b", "a?b", "a#b", ""):
            with self.subTest(include=name):
                self.run_cli("--include", name, success=False)
        self.assertFalse((self.destination / "AGENTS.md").exists())

    def test_rejects_external_or_traversing_manifest_base(self):
        for base in ("https://example.invalid/", "//example.invalid/", "../",
                     "/", "assets/", "./?x", ".\\"):
            with self.subTest(base=base):
                self.manifest["base"] = base
                self.save_manifest()
                self.server.requests.clear()
                self.run_cli(success=False)
                self.assertEqual(self.server.requests,
                                 [self.prefix + "/agent-manifest.json"])

    def test_rejects_redirects_outside_site_prefix(self):
        self.server.responses[self.prefix + "/AGENTS.md"] = (
            302, {"Location": self.origin + "/elsewhere/AGENTS.md"}, b""
        )
        self.run_cli("--include", "AGENTS.md", success=False)
        self.assertNotIn("/elsewhere/AGENTS.md", self.server.requests)
        self.assertFalse((self.destination / "AGENTS.md").exists())

    def test_rejects_encoded_ambiguous_redirect_paths_before_following(self):
        for suffix in ("%5c..%5cescape", "%252e%252e/escape"):
            with self.subTest(suffix=suffix):
                self.server.requests.clear()
                self.server.responses[self.prefix + "/AGENTS.md"] = (
                    302, {"Location": self.url + suffix}, b""
                )
                self.run_cli("--include", "AGENTS.md", success=False)
                self.assertEqual(self.server.requests, [
                    self.prefix + "/agent-manifest.json", self.prefix + "/AGENTS.md"
                ])

    def test_rejects_symlink_directory_and_file_destinations(self):
        outside = self.work / "outside"
        outside.mkdir()
        self.destination.mkdir()
        (self.destination / "downloads").symlink_to(outside, target_is_directory=True)
        self.run_cli("--include", "downloads/palette.json", "--overwrite", success=False)
        self.assertEqual(list(outside.iterdir()), [])
        (self.destination / "downloads").unlink()
        sentinel = outside / "sentinel"
        sentinel.write_text("Do not change")
        (self.destination / "AGENTS.md").symlink_to(sentinel)
        self.run_cli("--include", "AGENTS.md", "--overwrite", success=False)
        self.assertEqual(sentinel.read_text(), "Do not change")

    def test_rejects_symlink_destination_root_and_manifest(self):
        outside = self.work / "outside"
        outside.mkdir()
        self.destination.symlink_to(outside, target_is_directory=True)
        self.run_cli("--include", "AGENTS.md", success=False)
        self.assertEqual(list(outside.iterdir()), [])
        self.destination.unlink()
        self.destination.mkdir()
        sentinel = outside / "manifest"
        sentinel.write_text("Do not change")
        (self.destination / "agent-manifest.json").symlink_to(sentinel)
        self.run_cli("--overwrite", success=False)
        self.assertEqual(sentinel.read_text(), "Do not change")

    def test_rejects_invalid_schema_metadata_and_duplicate_paths(self):
        for change in ({"schemaVersion": 2}, {"files": []}, {"files": [{}]}):
            with self.subTest(change=change):
                original = self.manifest.copy()
                self.manifest.update(change)
                self.save_manifest()
                self.run_cli(success=False)
                self.manifest = original
        for key, value in (("bytes", -1), ("bytes", True), ("sha256", "bad"),
                           ("mediaType", None)):
            with self.subTest(key=key):
                original = self.manifest["files"][0][key]
                self.manifest["files"][0][key] = value
                self.save_manifest()
                self.run_cli(success=False)
                self.manifest["files"][0][key] = original
        self.manifest["files"].append(self.manifest["files"][0].copy())
        self.save_manifest()
        self.run_cli(success=False)

    def test_only_http_urls_without_embedded_credentials_are_accepted(self):
        for url in ("file:///tmp/site", "ftp://127.0.0.1/site/", "/tmp/site",
                    self.url.replace("http://", "http://user:secret@")):
            with self.subTest(url=url):
                self.run_cli(url=url, success=False)
        self.assertEqual(self.server.requests, [])


if __name__ == "__main__":
    unittest.main()
