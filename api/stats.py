"""
TikTok Stats API - Vercel Serverless Function
Extrae estadísticas de videos de TikTok y las devuelve en formato JSON
"""

import re
import json
import requests
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from typing import Dict, Optional, Any


class TikTokStatsExtractor:
    """Extractor de estadísticas de videos de TikTok"""
    
    def __init__(self, timeout: int = 15):
        self.timeout = timeout
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Connection": "keep-alive",
            "Referer": "https://www.tiktok.com/",
        }
    
    def normalize_url(self, url: str) -> str:
        if not re.match(r'^https?://', url, re.IGNORECASE):
            return f"https://{url}"
        return url
    
    def is_tiktok_url(self, url: str) -> bool:
        try:
            parsed = urlparse(self.normalize_url(url))
            hostname = parsed.hostname.lower() if parsed.hostname else ""
            return hostname == "tiktok.com" or hostname.endswith(".tiktok.com")
        except Exception:
            return False
    
    def extract_from_sigi_state(self, html: str) -> Optional[Dict[str, Any]]:
        try:
            match = re.search(r'<script id="SIGI_STATE"[^>]*>([\s\S]*?)</script>', html)
            if not match:
                return None
            
            state = json.loads(match.group(1))
            item_module = state.get("ItemModule")
            
            if not item_module or not isinstance(item_module, dict):
                return None
            
            keys = list(item_module.keys())
            if not keys:
                return None
            
            item = item_module[keys[0]]
            stats = item.get("stats", {})
            
            return {
                "title": item.get("desc"),
                "author_name": item.get("author"),
                "stats": {
                    "views": int(stats.get("playCount", 0)),
                    "likes": int(stats.get("diggCount", 0)),
                    "comments": int(stats.get("commentCount", 0)),
                    "shares": int(stats.get("shareCount", 0)),
                }
            }
        except Exception:
            return None
    
    def extract_from_next_data(self, html: str) -> Optional[Dict[str, Any]]:
        try:
            match = re.search(
                r'<script[^>]*type="application/json"[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)</script>',
                html
            )
            if not match:
                return None
            
            data = json.loads(match.group(1))
            item = data.get("props", {}).get("pageProps", {}).get("itemInfo", {}).get("itemStruct")
            
            if not item:
                return None
            
            stats = item.get("stats", {})
            author = item.get("author", {})
            
            return {
                "title": item.get("desc"),
                "author_name": author.get("uniqueId") or author.get("nickname"),
                "stats": {
                    "views": int(stats.get("playCount", 0)),
                    "likes": int(stats.get("diggCount", 0)),
                    "comments": int(stats.get("commentCount", 0)),
                    "shares": int(stats.get("shareCount", 0)),
                }
            }
        except Exception:
            return None
    
    def extract_by_pattern_fallback(self, html: str) -> Optional[Dict[str, Any]]:
        try:
            def get_number(key: str) -> Optional[int]:
                pattern = rf'"{key}"\s*:\s*(\d+)'
                match = re.search(pattern, html)
                return int(match.group(1)) if match else None
            
            views = get_number("playCount")
            likes = get_number("diggCount")
            comments = get_number("commentCount")
            shares = get_number("shareCount")
            
            if any(v is not None for v in [views, likes, comments, shares]):
                return {
                    "stats": {
                        "views": views,
                        "likes": likes,
                        "comments": comments,
                        "shares": shares,
                    }
                }
        except Exception:
            pass
        
        return None
    
    def get_stats(self, url: str) -> Dict[str, Any]:
        normalized_url = self.normalize_url(url)
        
        if not self.is_tiktok_url(normalized_url):
            return {
                "success": False,
                "url": url,
                "stats": {"views": None, "likes": None, "comments": None, "shares": None},
                "error": "URL no válida de TikTok"
            }
        
        try:
            response = requests.get(
                normalized_url,
                headers=self.headers,
                timeout=self.timeout,
                allow_redirects=True
            )
            
            if not response.ok:
                return {
                    "success": False,
                    "url": url,
                    "stats": {"views": None, "likes": None, "comments": None, "shares": None},
                    "error": f"HTTP {response.status_code}"
                }
            
            html = response.text
            
            parsed = (
                self.extract_from_sigi_state(html) or
                self.extract_from_next_data(html) or
                self.extract_by_pattern_fallback(html)
            )
            
            if not parsed:
                return {
                    "success": False,
                    "url": url,
                    "stats": {"views": None, "likes": None, "comments": None, "shares": None},
                    "error": "No se pudieron extraer las métricas"
                }
            
            return {
                "success": True,
                "url": url,
                **parsed
            }
            
        except requests.exceptions.Timeout:
            return {
                "success": False,
                "url": url,
                "stats": {"views": None, "likes": None, "comments": None, "shares": None},
                "error": "Tiempo de espera agotado"
            }
        except Exception as e:
            return {
                "success": False,
                "url": url,
                "stats": {"views": None, "likes": None, "comments": None, "shares": None},
                "error": str(e)
            }


class handler(BaseHTTPRequestHandler):
    """Handler para Vercel Serverless Functions"""
    
    def do_GET(self):
        # Parsear la URL y obtener parámetros
        parsed_path = urlparse(self.path)
        params = parse_qs(parsed_path.query)
        
        # Habilitar CORS
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        
        # Verificar si se proporcionó una URL
        if 'url' not in params:
            response = {
                "success": False,
                "error": "Parámetro 'url' requerido",
                "usage": "GET /api/stats?url=https://www.tiktok.com/@user/video/123456789"
            }
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
            return
        
        # Obtener la URL del video
        video_url = params['url'][0]
        
        # Extraer estadísticas
        extractor = TikTokStatsExtractor()
        result = extractor.get_stats(video_url)
        
        # Enviar respuesta
        self.wfile.write(json.dumps(result, ensure_ascii=False).encode('utf-8'))
    
    def do_POST(self):
        # Obtener el tamaño del contenido
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        # Habilitar CORS
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        
        try:
            # Parsear JSON
            data = json.loads(post_data.decode('utf-8'))
            
            # Verificar si se proporcionó una URL
            if 'url' not in data:
                response = {
                    "success": False,
                    "error": "Campo 'url' requerido en el body JSON",
                    "usage": "POST /api/stats con body: {\"url\": \"https://www.tiktok.com/@user/video/123456789\"}"
                }
                self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
                return
            
            video_url = data['url']
            
            # Extraer estadísticas
            extractor = TikTokStatsExtractor()
            result = extractor.get_stats(video_url)
            
            # Enviar respuesta
            self.wfile.write(json.dumps(result, ensure_ascii=False).encode('utf-8'))
            
        except json.JSONDecodeError:
            response = {
                "success": False,
                "error": "JSON inválido en el body"
            }
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
    
    def do_OPTIONS(self):
        # Manejar preflight requests de CORS
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

