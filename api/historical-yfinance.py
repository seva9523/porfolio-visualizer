from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import yfinance as yf
import json
from datetime import datetime, timedelta

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
            # Default date range if not provided (5 years)
            if not to_date:
                to_date = datetime.now().strftime('%Y-%m-%d')
            if not from_date:
                from_date = (datetime.now() - timedelta(days=5*365)).strftime('%Y-%m-%d')
            
            print(f"Fetching {symbol} from {from_date} to {to_date}")
            
            # Download data using yfinance
            ticker = yf.Ticker(symbol)
            hist = ticker.history(start=from_date, end=to_date)
            
            if hist.empty:
                error_response = json.dumps({
                    'error': 'No data available',
                    'details': f'No historical data found for {symbol} in the specified date range'
                })
                self.wfile.write(error_response.encode())
                return
            
            # Convert to our format
            formatted_data = {}
            for date, row in hist.iterrows():
                date_str = date.strftime('%Y-%m-%d')
                formatted_data[date_str] = {
                    'date': date_str,
                    'open': float(row['Open']),
                    'high': float(row['High']),
                    'low': float(row['Low']),
                    'close': float(row['Close']),
                    'volume': int(row['Volume'])
                }
            
            print(f"Returning {len(formatted_data)} dates for {symbol}")
            
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
            
        except Exception as e:
            print(f"Error: {str(e)}")
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
