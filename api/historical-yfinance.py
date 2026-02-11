from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json
from datetime import datetime, timedelta
import sys

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Parse URL parameters
        parsed_path = urlparse(self.path)
        params = parse_qs(parsed_path.query)
        
        # Get parameters
        symbol = params.get('symbol', [None])[0]
        from_date = params.get('from', [None])[0]
        to_date = params.get('to', [None])[0]
        
        # Set CORS headers
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        
        if not symbol:
            error_response = json.dumps({'error': 'Missing symbol parameter'})
            self.wfile.write(error_response.encode())
            return
        
        try:
            # Import yfinance here to avoid import errors
            import yfinance as yf
            
            # Default date range if not provided (5 years)
            if not to_date:
                to_date = datetime.now().strftime('%Y-%m-%d')
            if not from_date:
                from_date = (datetime.now() - timedelta(days=5*365)).strftime('%Y-%m-%d')
            
            print(f"[yfinance] Fetching {symbol} from {from_date} to {to_date}", file=sys.stderr)
            
            # Download data using yfinance with period parameter
            ticker = yf.Ticker(symbol)
            
            # Try with specific date range first
            hist = ticker.history(start=from_date, end=to_date, interval='1d')
            
            # If empty, try with period instead
            if hist.empty:
                print(f"[yfinance] No data with dates, trying period=5y", file=sys.stderr)
                hist = ticker.history(period='5y', interval='1d')
            
            if hist.empty:
                print(f"[yfinance] Still empty, trying period=max", file=sys.stderr)
                hist = ticker.history(period='max', interval='1d')
            
            if hist.empty:
                error_msg = f'No historical data found for {symbol}'
                print(f"[yfinance ERROR] {error_msg}", file=sys.stderr)
                error_response = json.dumps({
                    'error': 'No data available',
                    'details': error_msg
                })
                self.wfile.write(error_response.encode())
                return
            
            # Convert to our format
            formatted_data = {}
            count = 0
            for date, row in hist.iterrows():
                date_str = date.strftime('%Y-%m-%d')
                # Filter by date range if we got more data than requested
                if from_date and date_str < from_date:
                    continue
                if to_date and date_str > to_date:
                    continue
                    
                formatted_data[date_str] = {
                    'date': date_str,
                    'open': float(row['Open']),
                    'high': float(row['High']),
                    'low': float(row['Low']),
                    'close': float(row['Close']),
                    'volume': int(row['Volume']) if row['Volume'] else 0
                }
                count += 1
            
            print(f"[yfinance SUCCESS] Returning {len(formatted_data)} dates for {symbol}", file=sys.stderr)
            
            # Return response
            response = json.dumps({
                'symbol': symbol,
                'data': formatted_data,
                'totalDates': len(formatted_data),
                'filteredDates': len(formatted_data),
                'cached': False,
                'source': 'yfinance'
            })
            
            self.wfile.write(response.encode())
            
        except ImportError as e:
            print(f"[yfinance ERROR] Import failed: {str(e)}", file=sys.stderr)
            error_response = json.dumps({
                'error': 'yfinance import failed',
                'details': str(e)
            })
            self.wfile.write(error_response.encode())
        except Exception as e:
            print(f"[yfinance ERROR] {str(e)}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            error_response = json.dumps({
                'error': 'Failed to fetch data',
                'details': str(e)
            })
            self.wfile.write(error_response.encode())
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
