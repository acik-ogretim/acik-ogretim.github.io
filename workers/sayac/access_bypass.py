"""The account protects *.wildgenie.workers.dev with Cloudflare Access; the public counter needs a bypass app
for its own hostname only. Idempotent."""
import json, urllib.request
from pathlib import Path
A = Path("~/.secrets/cloudflare/account-id").expanduser().read_text().strip()
T = Path("~/.secrets/cloudflare/api-token").expanduser().read_text().strip()
HOST = "acik-ogretim-sayac.wildgenie.workers.dev"
def istek(yol, veri=None, yontem=None):
    r = urllib.request.Request(f"https://api.cloudflare.com/client/v4/accounts/{A}{yol}",
        json.dumps(veri).encode() if veri else None,
        {"Authorization": "Bearer " + T, "Content-Type": "application/json"}, method=yontem)
    try: return json.load(urllib.request.urlopen(r))
    except urllib.error.HTTPError as e: return json.load(e)
apps = istek("/access/apps").get("result") or []
if any(a.get("domain") == HOST for a in apps):
    print("zaten var")
else:
    y = istek("/access/apps", {"name": "Açık Öğretim sayaç (herkese açık)", "domain": HOST, "type": "self_hosted",
        "policies": [{"name": "Herkese açık", "decision": "bypass", "include": [{"everyone": {}}], "precedence": 1}]}, "POST")
    print(y.get("success"), y.get("errors"))
