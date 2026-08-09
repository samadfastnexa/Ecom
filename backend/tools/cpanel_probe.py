"""
Read-only diagnostic for the cPanel host, which has no SSH or Terminal.

Run it from cPanel -> Setup Python App -> "Execute python script":

    /home/USER/public_html/centuryy/tools/cpanel_probe.py

It changes nothing. It reports where the app actually lives, whether a git
deploy is possible, and which migrations the production database has actually
applied - the three things that are impossible to determine from File Manager
alone and that decide how a deploy has to be done.

Secrets are never printed. SECRET_KEY, DB_PASSWORD and anything else sensitive
is reported only as SET or MISSING, so the output is safe to paste into a chat.
"""

import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
APP_ROOT = os.path.dirname(HERE)


def rule(title):
    print(f"\n=== {title} " + "=" * max(0, 52 - len(title)))


def run(cmd, cwd=None):
    """Best-effort shell-out. Returns '' when the binary is missing."""
    try:
        out = subprocess.run(
            cmd, cwd=cwd, capture_output=True, text=True, timeout=30,
        )
        return (out.stdout or out.stderr).strip()
    except Exception as exc:  # noqa: BLE001 - a probe must never crash
        return f"<could not run: {exc}>"


rule("Where am I")
print("app root      :", APP_ROOT)
print("python        :", sys.version.split()[0])
print("interpreter   :", sys.executable)
print("manage.py here:", os.path.exists(os.path.join(APP_ROOT, "manage.py")))
print("core/ here    :", os.path.isdir(os.path.join(APP_ROOT, "core")))
print(".env here     :", os.path.exists(os.path.join(APP_ROOT, ".env")))

rule("Can we deploy by git")
git_bin = shutil.which("git")
print("git installed :", git_bin or "NO - git pull is not possible")
is_repo = os.path.isdir(os.path.join(APP_ROOT, ".git"))
print(".git present  :", is_repo)
if git_bin and is_repo:
    print("branch        :", run([git_bin, "rev-parse", "--abbrev-ref", "HEAD"], APP_ROOT))
    print("commit        :", run([git_bin, "log", "-1", "--format=%h %ad %s", "--date=short"], APP_ROOT))
    print("remote        :", run([git_bin, "remote", "-v"], APP_ROOT).splitlines()[:1])
    print("uncommitted   :", len(run([git_bin, "status", "--porcelain"], APP_ROOT).splitlines()), "file(s)")
else:
    print("=> deploy by uploading a zip and extracting over the top")

rule("Startup / wsgi files in the app root")
for name in ("passenger_wsgi.py", "wsgi.py", "app.py", "manage.py"):
    p = os.path.join(APP_ROOT, name)
    if os.path.exists(p):
        print(f"  {name} ({os.path.getsize(p)} bytes)")

rule("Django settings (no secrets)")
try:
    sys.path.insert(0, APP_ROOT)
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
    import django

    django.setup()
    from django.conf import settings

    print("django        :", django.get_version())
    print("DEBUG         :", settings.DEBUG, "  <-- must be False in production")
    print("ALLOWED_HOSTS :", settings.ALLOWED_HOSTS)
    print("db engine     :", settings.DATABASES["default"]["ENGINE"].rsplit(".", 1)[-1])
    print("db name       :", settings.DATABASES["default"]["NAME"])
    print("SECRET_KEY    :", "SET" if settings.SECRET_KEY else "MISSING")
    print("db password   :", "SET" if settings.DATABASES["default"].get("PASSWORD") else "MISSING")
    print("static root   :", getattr(settings, "STATIC_ROOT", None))
    print("media root    :", getattr(settings, "MEDIA_ROOT", None))
except Exception as exc:  # noqa: BLE001
    print("could not load Django settings:", exc)

rule("Migrations the LIVE database has applied")
try:
    from django.db.migrations.loader import MigrationLoader
    from django.db import connection

    loader = MigrationLoader(connection)
    applied = loader.applied_migrations
    ours = ("accounts", "orders", "ledger", "plant", "products", "localization",
            "activities", "support")
    for app in ours:
        on_disk = sorted(n for a, n in loader.disk_migrations if a == app)
        done = sorted(n for a, n in applied if a == app)
        pending = [n for n in on_disk if n not in done]
        flag = "PENDING" if pending else "up to date"
        print(f"  {app:<13} {len(done):>2}/{len(on_disk):<2} applied   {flag}")
        for n in pending:
            print(f"       - {n}")
except Exception as exc:  # noqa: BLE001
    print("could not read migration state:", exc)

print("\nDone. Nothing was modified.")
