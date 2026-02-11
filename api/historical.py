from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from urllib.request import urlopen, Request
import json
from datetime import datetime
import sys

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urlparse(self.path)
        params = parse_qs(parsed_path.query)
        
        symbol = params.get('symbol', [None])[0]
        from_date = params.get('from', [None])[0]
        to_date = params.get('to', [None])[0]
        
        # CORS headers
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.end_headers()
        
        if not symbol:
            self.wfile.write(json.dumps({'error': 'Missing symbol', 'data': {}}).encode())
            return
        
        try:
            # Convert dates to Unix timestamps
            if from_date:
                from_dt = datetime.strptime(from_date, '%Y-%m-%d')
                period1 = int(from_dt.timestamp())
            else:
                period1 = 0  # Start from beginning
            
            if to_date:
                to_dt = datetime.strptime(to_date, '%Y-%m-%d')
                period2 = int(to_dt.timestamp())
            else:
                period2 = 9999999999  # Far future
            
            # Use EXACT Yahoo Finance chart API from the repo
            query_url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?symbol={symbol}&period1={period1}&period2={period2}&interval=1d&includePrePost=true&events=div%2Csplit"
            
            print(f"[Yahoo] Fetching {symbol} from chart API...", file=sys.stderr)
            
            # Make request
            req = Request(query_url, headers={'User-Agent': 'Mozilla/5.0'})
            response = urlopen(req, timeout=10)
            parsed = json.loads(response.read().decode())
            
            # Parse the response using the EXACT structure from the repo
            timestamps = parsed['chart']['result'][0]['timestamp']
            quote = parsed['chart']['result'][0]['indicators']['quote'][0]
            
            Low = quote['low']
            Open = quote['open']
            Volume = quote['volume']
            High = quote['high']
            Close = quote['close']
            
            # Convert to our format
            formatted_data = {}
            for i, timestamp in enumerate(timestamps):
                date = datetime.utcfromtimestamp(timestamp).strftime('%Y-%m-%d')
                
                # Skip null values
                if Close[i] is None:
                    continue
                
                formatted_data[date] = {
                    'date': date,
                    'open': Open[i] if Open[i] is not None else 0,
                    'high': High[i] if High[i] is not None else 0,
                    'low': Low[i] if Low[i] is not None else 0,
                    'close': Close[i],
                    'volume': Volume[i] if Volume[i] is not None else 0
                }
            
            print(f"✅ Scraped {len(formatted_data)} dates for {symbol}", file=sys.stderr)
            
            response_data = {
                'symbol': symbol,
                'data': formatted_data,
                'totalDates': len(formatted_data),
                'source': 'yahoo_chart_api'
            }
            
            self.wfile.write(json.dumps(response_data).encode())
            
        except Exception as e:
            print(f"❌ Error for {symbol}: {str(e)}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            self.wfile.write(json.dumps({'error': str(e), 'data': {}}).encode())
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.end_headers()
