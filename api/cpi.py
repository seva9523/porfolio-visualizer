from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from urllib.request import urlopen, Request
import json
from datetime import datetime


# WealthView CPI endpoint (educational)
#
# Enables a Nominal vs Real (inflation-adjusted) toggle. No user data is stored.
#
# Strategy:
# - Prefer FRED if FRED_API_KEY is configured.
# - Otherwise fall back to an embedded CPI-U (CPIAUCSL) monthly index sample.
#
# Response:
# {
#   "series": "CPIAUCSL",
#   "unit": "index",
#   "source": "fred" | "embedded",
#   "data": {"YYYY-MM": <float>, ...}
# }


# Embedded CPIAUCSL monthly index (sample; extend as needed)
# Values are CPI index levels (1982-84=100)
_EMBEDDED = {
    # 2018
    "2018-01": 247.867, "2018-02": 248.991, "2018-03": 249.554, "2018-04": 250.546,
    "2018-05": 251.588, "2018-06": 251.989, "2018-07": 252.006, "2018-08": 252.146,
    "2018-09": 252.439, "2018-10": 252.885, "2018-11": 252.038, "2018-12": 251.233,
    # 2019
    "2019-01": 251.712, "2019-02": 252.776, "2019-03": 254.202, "2019-04": 255.548,
    "2019-05": 256.092, "2019-06": 256.143, "2019-07": 256.571, "2019-08": 256.558,
    "2019-09": 256.759, "2019-10": 257.346, "2019-11": 257.208, "2019-12": 256.974,
    # 2020
    "2020-01": 257.971, "2020-02": 258.678, "2020-03": 258.115, "2020-04": 256.389,
    "2020-05": 256.394, "2020-06": 257.797, "2020-07": 259.101, "2020-08": 259.918,
    "2020-09": 260.280, "2020-10": 260.388, "2020-11": 260.229, "2020-12": 260.474,
    # 2021
    "2021-01": 261.582, "2021-02": 263.014, "2021-03": 264.877, "2021-04": 267.054,
    "2021-05": 269.195, "2021-06": 271.696, "2021-07": 273.003, "2021-08": 273.567,
    "2021-09": 274.310, "2021-10": 276.589, "2021-11": 277.948, "2021-12": 278.802,
    # 2022
    "2022-01": 281.148, "2022-02": 283.716, "2022-03": 287.504, "2022-04": 289.109,
    "2022-05": 292.296, "2022-06": 296.311, "2022-07": 296.276, "2022-08": 296.171,
    "2022-09": 296.808, "2022-10": 298.012, "2022-11": 298.349, "2022-12": 298.112,
    # 2023
    "2023-01": 299.170, "2023-02": 300.840, "2023-03": 301.836, "2023-04": 303.363,
    "2023-05": 304.127, "2023-06": 305.109, "2023-07": 305.691, "2023-08": 307.026,
    "2023-09": 307.789, "2023-10": 307.671, "2023-11": 307.051, "2023-12": 306.746,
    # 2024 (partial)
    "2024-01": 308.417, "2024-02": 310.326, "2024-03": 312.230, "2024-04": 313.207,
    "2024-05": 313.225, "2024-06": 313.049,
}


class handler(BaseHTTPRequestHandler):
    def _send(self, status: int, payload: dict):
        self.send_response(status)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode())

    def do_OPTIONS(self):
        self._send(200, {})

    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        series = params.get('series', ['CPIAUCSL'])[0]
        start = params.get('from', [None])[0]
        end = params.get('to', [None])[0]

        # Try FRED first
        try:
            import os
            api_key = os.environ.get('FRED_API_KEY')
        except Exception:
            api_key = None

        def _in_range(ym: str) -> bool:
            # ym is YYYY-MM
            if not start and not end:
                return True
            try:
                d = datetime.strptime(ym + '-01', '%Y-%m-%d')
            except Exception:
                return True
            if start:
                try:
                    s = datetime.strptime(start, '%Y-%m-%d')
                    if d < datetime(s.year, s.month, 1):
                        return False
                except Exception:
                    pass
            if end:
                try:
                    e = datetime.strptime(end, '%Y-%m-%d')
                    if d > datetime(e.year, e.month, 1):
                        return False
                except Exception:
                    pass
            return True

        if api_key:
            try:
                url = (
                    "https://api.stlouisfed.org/fred/series/observations"
                    f"?series_id={series}&api_key={api_key}&file_type=json&frequency=m"
                )
                req = Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                raw = urlopen(req, timeout=10).read().decode('utf-8')
                j = json.loads(raw)
                obs = j.get('observations', []) or []
                out = {}
                for o in obs:
                    date = o.get('date', '')
                    val = o.get('value', '')
                    if not date or not val or val == '.':
                        continue
                    ym = date[:7]
                    if not _in_range(ym):
                        continue
                    try:
                        out[ym] = float(val)
                    except Exception:
                        continue
                if out:
                    self._send(200, {"series": series, "unit": "index", "source": "fred", "data": out})
                    return
            except Exception:
                pass

        data = {k: v for (k, v) in _EMBEDDED.items() if _in_range(k)}
        if not data:
            data = dict(_EMBEDDED)

        self._send(200, {"series": series, "unit": "index", "source": "embedded", "data": data})
