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
            import requests
            import time
            
            # Default date range if not provided
            if not to_date:
                to_date = datetime.now()
            else:
                to_date = datetime.strptime(to_date, '%Y-%m-%d')
            
            if not from_date:
                from_date = to_date - timedelta(days=5*365)
            else:
                from_date = datetime.strptime(from_date, '%Y-%m-%d')
            
            # Convert to Unix timestamps
            period1 = int(from_date.timestamp())
            period2 = int(to_date.timestamp())
            
            print(f"[Yahoo Scraper] Fetching {symbol} from {from_date.date()} to {to_date.date()}", file=sys.stderr)
            
            # Yahoo Finance download URL
            url = f"https://query1.finance.yahoo.com/v7/finance/download/{symbol}"
            params = {
                'period1': period1,
                'period2': period2,
                'interval': '1d',
                'events': 'history',
                'includeAdjustedClose': 'true'
            }
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            
            response = requests.get(url, params=params, headers=headers, timeout=10)
            
            if response.status_code != 200:
                print(f"[Yahoo Scraper ERROR] HTTP {response.status_code}", file=sys.stderr)
                error_response = json.dumps({
                    'error': 'Failed to fetch data',
                    'details': f'Yahoo Finance returned status {response.status_code}'
                })
                self.wfile.write(error_response.encode())
                return
            
            # Parse CSV response
            csv_data = response.text
            lines = csv_data.strip().split('\n')
            
            if len(lines) < 2:
                error_response = json.dumps({
                    'error': 'No data available',
                    'details': f'No historical data found for {symbol}'
                })
                self.wfile.write(error_response.encode())
                return
            
            # Parse header
            headers_line = lines[0].split(',')
            
            # Find column indices
            date_idx = headers_line.index('Date')
            open_idx = headers_line.index('Open')
            high_idx = headers_line.index('High')
            low_idx = headers_line.index('Low')
            close_idx = headers_line.index('Close')
            volume_idx = headers_line.index('Volume')
            
            # Parse data
            formatted_data = {}
            for line in lines[1:]:
                if not line.strip():
                    continue
                    
                values = line.split(',')
                if len(values) < len(headers_line):
                    continue
                
                date = values[date_idx]
                
                # Skip null values
                if values[close_idx] == 'null' or not values[close_idx]:
                    continue
                
                try:
                    formatted_data[date] = {
                        'date': date,
                        'open': float(values[open_idx]) if values[open_idx] != 'null' else 0,
                        'high': float(values[high_idx]) if values[high_idx] != 'null' else 0,
                        'low': float(values[low_idx]) if values[low_idx] != 'null' else 0,
                        'close': float(values[close_idx]),
                        'volume': int(float(values[volume_idx])) if values[volume_idx] != 'null' else 0
                    }
                except (ValueError, IndexError) as e:
                    print(f"[Yahoo Scraper] Skipping invalid row: {line[:50]}", file=sys.stderr)
                    continue
            
            print(f"[Yahoo Scraper SUCCESS] Returning {len(formatted_data)} dates for {symbol}", file=sys.stderr)
            
            # Return response
            response_data = json.dumps({
                'symbol': symbol,
                'data': formatted_data,
                'totalDates': len(formatted_data),
                'filteredDates': len(formatted_data),
                'cached': False,
                'source': 'yahoo_scraper'
            })
            
            self.wfile.write(response_data.encode())
            
        except ImportError as e:
            print(f"[Yahoo Scraper ERROR] Import failed: {str(e)}", file=sys.stderr)
            error_response = json.dumps({
                'error': 'Missing dependencies',
                'details': str(e)
            })
            self.wfile.write(error_response.encode())
        except Exception as e:
            print(f"[Yahoo Scraper ERROR] {str(e)}", file=sys.stderr)
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
