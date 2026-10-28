#!/usr/bin/env python3
"""Download and verify a static design kit using only Python's standard library."""

import argparse
import hashlib
from http.client import HTTPException
import json
import os
from pathlib import Path
import re
import sys
import tempfile
from urllib.error import HTTPError, URLError
from urllib.parse import quote, unquote, urljoin, urlsplit, urlunsplit
from urllib.request import HTTPRedirectHandler, ProxyHandler, build_opener


MANIFEST = "agent-manifest.json"


class KitError(Exception):
    """A download, manifest, or destination failed validation."""


def safe_path(value):
    """Accept unambiguous relative file paths, never URL or filesystem escapes."""
    if (not isinstance(value, str) or not value
            or any(character in value for character in "\\:%?#")
            or any(ord(character) < 32 or ord(character) == 127 for character in value)
            or any(part in ("", ".", "..") for part in value.split("/"))):
        raise KitError(f"unsafe relative path: {value!r}")
    return value


def checked_url(value):
    try:
        parsed = urlsplit(value)
        decoded_path = unquote(parsed.path)
        if (parsed.scheme not in ("http", "https") or not parsed.hostname
                or parsed.username is not None or parsed.password is not None
                or parsed.query or "\\" in value
                or "\\" in decoded_path or "%" in decoded_path
                or any(ord(character) < 32 for character in value)
                or any(ord(character) < 32 for character in decoded_path)
                or any(part in (".", "..") for part in decoded_path.split("/"))):
            raise ValueError()
        parsed.port  # Validate the port before attempting a request.
    except ValueError:
        raise KitError("use an http(s) URL without credentials, query, or traversal") from None
    return parsed


def site_urls(value):
    parsed = checked_url(value)
    path = parsed.path or "/"
    if path.endswith("/" + MANIFEST) or path == MANIFEST:
        path = path.rsplit("/", 1)[0] + "/"
    elif path.lower().endswith((".html", ".htm")):
        path = path.rsplit("/", 1)[0] + "/"
    elif not path.endswith("/"):
        path += "/"
    base = urlunsplit((parsed.scheme, parsed.netloc, path, "", ""))
    return base


def origin(parsed):
    return (parsed.scheme, parsed.hostname,
            parsed.port or (443 if parsed.scheme == "https" else 80))


class SiteRedirects(HTTPRedirectHandler):
    def __init__(self, base):
        self.base = checked_url(base)

    def check(self, url):
        parsed = checked_url(url)
        if (origin(parsed) != origin(self.base)
                or not unquote(parsed.path).startswith(unquote(self.base.path))
                or parsed.fragment):
            raise KitError("refusing a redirect outside the site directory")

    def redirect_request(self, request, response, code, message, headers, new_url):
        self.check(new_url)
        return super().redirect_request(request, response, code, message, headers, new_url)


class Site:
    def __init__(self, base):
        self.base = base
        self.redirects = SiteRedirects(base)
        # Public kits need no authentication or ambient proxy credentials.
        self.opener = build_opener(ProxyHandler({}), self.redirects)

    def read(self, path):
        url = urljoin(self.base, quote(path, safe="/"))
        self.redirects.check(url)
        try:
            with self.opener.open(url, timeout=30) as response:
                self.redirects.check(response.geturl())
                return response.read()
        except HTTPError as error:
            raise KitError(f"HTTP {error.code} while fetching {path}") from None
        except (URLError, OSError, HTTPException) as error:
            raise KitError(f"could not fetch {path}: {error.reason if isinstance(error, URLError) else error}") from None


def read_manifest(data):
    try:
        manifest = json.loads(data)
    except (ValueError, UnicodeError):
        raise KitError("agent-manifest.json is not valid JSON (possibly an HTML fallback)") from None
    if (not isinstance(manifest, dict)
            or type(manifest.get("schemaVersion")) is not int
            or manifest["schemaVersion"] != 1 or manifest.get("base") != "./"):
        raise KitError("manifest must use schemaVersion 1 and base './'")
    files = manifest.get("files")
    if not isinstance(files, list) or not files:
        raise KitError("manifest files must be a nonempty list")
    names = set()
    for item in files:
        if not isinstance(item, dict):
            raise KitError("manifest file entries must be objects")
        path = safe_path(item.get("path"))
        if path == MANIFEST or path in names:
            raise KitError(f"reserved or duplicate manifest path: {path}")
        if (type(item.get("bytes")) is not int or item["bytes"] < 0
                or not isinstance(item.get("sha256"), str)
                or not re.fullmatch(r"[0-9a-fA-F]{64}", item["sha256"])
                or not isinstance(item.get("mediaType"), str) or not item["mediaType"]):
            raise KitError(f"invalid bytes, sha256, or mediaType metadata for {path}")
        names.add(path)
    for path in names:
        parts = path.split("/")
        if any("/".join(parts[:index]) in names for index in range(1, len(parts))):
            raise KitError(f"manifest file/directory conflict: {path}")
    return files


def select_files(files, includes):
    if not includes:
        return files
    selectors = [safe_path(value[:-1] if value.endswith("/") else value)
                 for value in includes]
    for selector in selectors:
        if not any(item["path"] == selector or item["path"].startswith(selector + "/")
                   for item in files):
            raise KitError(f"--include matched no files: {selector}")
    return [item for item in files if any(
        item["path"] == selector or item["path"].startswith(selector + "/")
        for selector in selectors
    )]


class Destination:
    def __init__(self, directory, overwrite):
        directory = Path(directory).expanduser().absolute()
        if directory.is_symlink():
            raise KitError("unsafe destination: the destination directory is a symlink")
        directory.mkdir(parents=True, exist_ok=True)
        self.root = directory.resolve()
        self.overwrite = overwrite

    def target(self, path):
        target = self.root
        parts = path.split("/")
        for index, part in enumerate(parts):
            target = target / part
            if target.is_symlink():
                raise KitError(f"unsafe destination symlink: {path}")
            if index < len(parts) - 1 and target.exists() and not target.is_dir():
                raise KitError(f"destination parent is not a directory: {path}")
        if target.exists() and not target.is_file():
            raise KitError(f"destination is not a regular file: {path}")
        return target

    def needed(self, path, size, digest):
        target = self.target(path)
        if not target.exists():
            return True
        if (target.stat().st_size == size
                and hashlib.sha256(target.read_bytes()).hexdigest() == digest.lower()):
            return False
        if not self.overwrite:
            raise KitError(f"existing file differs: {path}; use --overwrite to replace it")
        return True

    def write(self, path, data):
        target = self.target(path)
        target.parent.mkdir(parents=True, exist_ok=True)
        self.target(path)
        descriptor, temporary = tempfile.mkstemp(prefix=".download-kit-", dir=target.parent)
        try:
            with os.fdopen(descriptor, "wb") as output:
                output.write(data)
                output.flush()
                os.fsync(output.fileno())
            self.target(path)
            if self.overwrite:
                os.replace(temporary, target)
            else:
                # Atomic exclusive creation also protects a file created after preflight.
                os.link(temporary, target)
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)


def download(args):
    base = site_urls(args.site_url)
    site = Site(base)
    manifest_data = site.read(MANIFEST)
    files = select_files(read_manifest(manifest_data), args.include)
    destination = Destination(args.dest, args.overwrite)
    manifest_needed = destination.needed(
        MANIFEST, len(manifest_data), hashlib.sha256(manifest_data).hexdigest()
    )
    # Validate every selected destination before downloading or replacing any file.
    needed = [(item, destination.needed(item["path"], item["bytes"], item["sha256"]))
              for item in files]
    written = skipped = 0
    for item, should_write in needed:
        path = item["path"]
        if not should_write:
            print(f"skip {path} (identical)")
            skipped += 1
            continue
        data = site.read(path)
        if len(data) != item["bytes"]:
            raise KitError(f"byte count mismatch for {path}: expected {item['bytes']}, got {len(data)}")
        if hashlib.sha256(data).hexdigest() != item["sha256"].lower():
            raise KitError(f"sha256 mismatch for {path}")
        destination.write(path, data)
        print(f"saved {path}")
        written += 1
    if manifest_needed:
        destination.write(MANIFEST, manifest_data)
    print(f"Downloaded {written} files; skipped {skipped} identical files. Manifest saved in {destination.root}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("site_url", metavar="SITE_URL", help="site directory, HTML page, or agent-manifest.json URL")
    parser.add_argument("--dest", required=True, metavar="DIRECTORY")
    parser.add_argument("--include", action="append", default=[], metavar="PATH_OR_PREFIX",
                        help="download an exact file or directory prefix; repeatable")
    parser.add_argument("--overwrite", action="store_true", help="replace existing differing files")
    args = parser.parse_args()
    try:
        download(args)
    except (KitError, OSError, ValueError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
