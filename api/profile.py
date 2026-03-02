from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from urllib.request import urlopen, Request
import json

YAHOO_SUMMARY_URL = "https://query1.finance.yahoo.com/v10/finance/quoteSummary/{symbol}?modules=assetProfile,summaryProfile,fundProfile,price,quoteType"

def _cors(handler):
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type")

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204)
        _cors(self)
        self.end_headers()

    def do_GET(self):
        try:
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            symbol = params.get("symbol", [None])[0]
            if not symbol:
                self.send_response(400)
                _cors(self)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Missing symbol"}).encode("utf-8"))
                return

            sym = str(symbol).strip().upper()
            url = YAHOO_SUMMARY_URL.format(symbol=sym)

            req = Request(url, headers={
                "User-Agent": "Mozilla/5.0",
                "Accept": "application/json,text/plain,*/*"
            })

            with urlopen(req, timeout=20) as resp:
                raw = resp.read().decode("utf-8")

            j = json.loads(raw)
            res = (((j.get("quoteSummary") or {}).get("result") or [None])[0]) or {}

            # Try multiple possible locations for similar fields
            asset = res.get("assetProfile") or {}
            summ = res.get("summaryProfile") or {}
            fund = res.get("fundProfile") or {}
            qt = res.get("quoteType") or {}
            price = res.get("price") or {}

            sector = asset.get("sector") or summ.get("sector")
            industry = asset.get("industry") or summ.get("industry")
            country = asset.get("country") or summ.get("country") or fund.get("legalType")
            region = asset.get("region") or summ.get("region")

            # Category is useful for ETFs/funds
            category = None
            try:
                category = (((fund.get("topHoldings") or {}).get("categoryName")) or
                            ((fund.get("generalOverview") or {}).get("categoryName")))
            except Exception:
                category = None

            out = {
                "symbol": sym,
                "quoteType": qt.get("quoteType") or qt.get("shortName"),
                "shortName": price.get("shortName"),
                "sector": sector,
                "industry": industry,
                "country": country,
                "region": region,
                "category": category
            }

            self.send_response(200)
            _cors(self)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(out).encode("utf-8"))

        except Exception as e:
            self.send_response(500)
            _cors(self)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "profile lookup failed", "detail": str(e)}).encode("utf-8"))
