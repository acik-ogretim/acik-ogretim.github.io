"""Creates the D1 database and deploys the counter worker with the Cloudflare API. Reads the token from ~/.secrets/cloudflare."""
import json, os, secrets, urllib.request, uuid
from pathlib import Path

A = Path("~/.secrets/cloudflare/account-id").expanduser().read_text().strip()
T = Path("~/.secrets/cloudflare/api-token").expanduser().read_text().strip()
API = f"https://api.cloudflare.com/client/v4/accounts/{A}"
ADI = "acik-ogretim-sayac"
burada = Path(__file__).parent

def istek(yol, veri=None, yontem=None, tur="application/json", ham=None):
    govde = ham if ham is not None else (json.dumps(veri).encode() if veri is not None else None)
    r = urllib.request.Request(API + yol, govde, {"Authorization": "Bearer " + T, "Content-Type": tur}, method=yontem)
    try:
        return json.load(urllib.request.urlopen(r))
    except urllib.error.HTTPError as e:
        return json.load(e)

dbs = istek(f"/d1/database?name={ADI}")["result"]
db = next((d for d in dbs if d["name"] == ADI), None) or istek("/d1/database", {"name": ADI})["result"]
print("d1", db["uuid"])
print("sema", istek(f"/d1/database/{db['uuid']}/query", {"sql": (burada / "sema.sql").read_text()})["success"])

tuz_dosya = Path("~/.secrets/acik-ogretim-sayac-tuz").expanduser()
if not tuz_dosya.exists():
    tuz_dosya.write_text(secrets.token_hex(32)); tuz_dosya.chmod(0o600)
meta = {"main_module": "worker.js", "compatibility_date": "2026-11-01",
        "bindings": [{"type": "d1", "name": "DB", "id": db["uuid"]},
                     {"type": "secret_text", "name": "TUZ", "text": tuz_dosya.read_text().strip()}]}
sinir = uuid.uuid4().hex
parcalar = []
for ad, tur, icerik in [("metadata", "application/json", json.dumps(meta)),
                        ("worker.js", "application/javascript+module", (burada / "worker.js").read_text())]:
    dosya = f'; filename="{ad}"' if ad != "metadata" else ""
    parcalar.append(f'--{sinir}\r\nContent-Disposition: form-data; name="{ad}"{dosya}\r\nContent-Type: {tur}\r\n\r\n{icerik}\r\n')
ham = ("".join(parcalar) + f"--{sinir}--\r\n").encode()
y = istek(f"/workers/scripts/{ADI}", yontem="PUT", tur=f"multipart/form-data; boundary={sinir}", ham=ham)
print("worker", y["success"], y.get("errors"))
print("workers.dev", istek(f"/workers/scripts/{ADI}/subdomain", {"enabled": True, "previews_enabled": False}, "POST").get("success"))
