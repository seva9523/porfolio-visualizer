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
            error_response = json.dumps({'error': 'Missing symbol', 'data': {}})
            self.wfile.write(error_response.encode())
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
            
            # Use EXACT Yahoo Finance chart API from stock-market-scraper repo
            query_url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?symbol={symbol}&period1={period1}&period2={period2}&interval=1d&includePrePost=true&events=div%2Csplit"
            
            print(f"[Yahoo Chart API] Fetching {symbol}", file=sys.stderr)
            print(f"[Yahoo Chart API] URL: {query_url}", file=sys.stderr)
            
            # Make request
            req = Request(query_url, headers={'User-Agent': 'Mozilla/5.0'})
            response = urlopen(req, timeout=10)
            response_text = response.read().decode()
            
            print(f"[Yahoo Chart API] Response length: {len(response_text)} bytes", file=sys.stderr)
            
            parsed = json.loads(response_text)
            
            # Check if we have valid data
            if 'chart' not in parsed or 'result' not in parsed['chart']:
                print(f"[Yahoo Chart API] Invalid response structure", file=sys.stderr)
                error_response = json.dumps({'error': 'Invalid response from Yahoo', 'data': {}})
                self.wfile.write(error_response.encode())
                return
            
            if not parsed['chart']['result'] or len(parsed['chart']['result']) == 0:
                print(f"[Yahoo Chart API] No results in response", file=sys.stderr)
                error_response = json.dumps({'error': 'No data available', 'data': {}})
                self.wfile.write(error_response.encode())
                return
            
            # Parse the response using the EXACT structure from the repo
            result = parsed['chart']['result'][0]
            
            if 'timestamp' not in result:
                print(f"[Yahoo Chart API] No timestamps in result", file=sys.stderr)
                error_response = json.dumps({'error': 'No timestamp data', 'data': {}})
                self.wfile.write(error_response.encode())
                return
            
            timestamps = result['timestamp']
            quote = result['indicators']['quote'][0]
            
            Low = quote.get('low', [])
            Open = quote.get('open', [])
            Volume = quote.get('volume', [])
            High = quote.get('high', [])
            Close = quote.get('close', [])
            
            print(f"[Yahoo Chart API] Found {len(timestamps)} timestamps", file=sys.stderr)
            
            # Convert to our format
            formatted_data = {}
            for i, timestamp in enumerate(timestamps):
                date = datetime.utcfromtimestamp(timestamp).strftime('%Y-%m-%d')
                
                # Skip null values
                if i >= len(Close) or Close[i] is None:
                    continue
                
                formatted_data[date] = {
                    'date': date,
                    'open': Open[i] if i < len(Open) and Open[i] is not None else 0,
                    'high': High[i] if i < len(High) and High[i] is not None else 0,
                    'low': Low[i] if i < len(Low) and Low[i] is not None else 0,
                    'close': Close[i],
                    'volume': int(Volume[i]) if i < len(Volume) and Volume[i] is not None else 0
                }
            
            print(f"✅ Scraped {len(formatted_data)} dates for {symbol}", file=sys.stderr)
            
            response_data = json.dumps({
                'symbol': symbol,
                'data': formatted_data,
                'totalDates': len(formatted_data),
                'source': 'yahoo_chart_api'
            })
            
            self.wfile.write(response_data.encode())
            
        except Exception as e:
            print(f"❌ Error for {symbol}: {str(e)}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            error_response = json.dumps({'error': str(e), 'data': {}, 'details': repr(e)})
            self.wfile.write(error_response.encode())
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.end_headers()
