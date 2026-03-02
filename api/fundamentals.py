from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from urllib.request import urlopen, Request
import json


# WealthView fundamentals endpoint (educational)
#
# Pulls light-weight metadata used by P1 features:
# - Dividend yield (for Income & Dividend Projection)
# - Expense ratio (for Fee Drag)
#
# Data source: Yahoo Finance quoteSummary (unofficial, no user data stored).
# We keep the response minimal and resilient.
#
# Response:
# {
#   "symbol": "SPY",
#   "dividendYield": 0.0134,          # decimal, not %
#   "trailingAnnualDividendRate": 6.14,
#   "expenseRatio": 0.0009,           # decimal, not %
#   "source": "yahoo_quoteSummary"
# }


def _safe_float(x):
    try:
        if x is None:
            return None
        return float(x)
    except Exception:
        return None


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
        symbol = params.get('symbol', [None])[0]
        if not symbol:
            self._send(400, {"error": "Missing symbol"})
            return

        try:
            sym = symbol.strip()
            # quoteSummary modules
            # summaryDetail: dividend yield/rate often here
            # fundProfile: ETF expense ratios often here
            modules = "summaryDetail,fundProfile,defaultKeyStatistics"
            url = f"https://query2.finance.yahoo.com/v10/finance/quoteSummary/{sym}?modules={modules}"

            req = Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            raw = urlopen(req, timeout=10).read().decode('utf-8')
            j = json.loads(raw)
            result = (((j or {}).get('quoteSummary') or {}).get('result') or [None])[0] or {}

            summary = result.get('summaryDetail') or {}
            fund = result.get('fundProfile') or {}
            fees = (fund.get('feesExpensesInvestment') or {})

            # Yahoo often uses {raw, fmt}
            def pick_raw(d, key):
                v = d.get(key)
                if isinstance(v, dict):
                    return v.get('raw')
                return v

            dividend_yield = _safe_float(pick_raw(summary, 'dividendYield'))
            trailing_rate = _safe_float(pick_raw(summary, 'trailingAnnualDividendRate'))

            # Expense ratio can appear under multiple keys depending on asset type
            expense_ratio = _safe_float(pick_raw(fees, 'annualReportExpenseRatio'))
            if expense_ratio is None:
                expense_ratio = _safe_float(pick_raw(summary, 'annualReportExpenseRatio'))

            self._send(200, {
                "symbol": sym,
                "dividendYield": dividend_yield,
                "trailingAnnualDividendRate": trailing_rate,
                "expenseRatio": expense_ratio,
                "source": "yahoo_quoteSummary"
            })
        except Exception as e:
            self._send(200, {"symbol": symbol, "error": str(e), "source": "yahoo_quoteSummary"})
