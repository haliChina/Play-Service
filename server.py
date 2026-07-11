#!/usr/bin/env python3
"""
一会去哪儿 - 本地服务器
提供静态文件服务 + 图片搜索代理API（360图片 + 必应图片搜索）
优先使用360图片（高质量、无水印、CDN直连），必应作为后备
"""
import http.server
import socketserver
import urllib.request
import urllib.parse
import json
import re
import os
import time
import html as html_module
import sys

PORT = 8765
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

# 简单内存缓存
_image_cache = {}
_CACHE_TTL = 3600  # 1小时

# 有水印的图库网站域名（过滤掉这些来源的图片）
WATERMARK_DOMAINS = [
    '699pic', 'shutterstock', 'gettyimages', 'visualchina', 'icphoto',
    'veer', 'tuchong', 'huaban', 'duitang', 'nipic', '58pic', 'redocn',
    'tu123', '898pic', '16pic', '588pic', '199pic', '99pic', 'picphoto',
    'photophoto', 'tooopen', 'pic11', 'pic12', 'pic13', 'pic14', 'pic15',
    # 房产/新闻网站（常有水印）
    'lanfw', 'fang.com', 'leju', 'anjuke', '58.com', 'ganji',
    'house', 'fangdd', 'lianjia', 'beike',
    # 图库/素材站
    'pconline', 'zcool', 'uisdc', 'th7', 'pic1.', 'pic2.', 'pic3.',
    'ent.', 'ydstatic', 'sinaimg', 'sina.com',
    # 小图/头像站
    'avatar', 'logo', 'icon',
]

# 优质图片来源域名（优先选择）
GOOD_SOURCE_DOMAINS = [
    'ctrip', 'mafengwo', 'qyer', 'dianping', 'tripadvisor',
    'visitbeijing', 'gov.cn', 'baike.baidu', 'wikimedia', 'wikipedia',
    'amap', 'meituan', 'poco', 'zcool', 'lofter',
    'zhihu.com', 'zhimg.com', 'weixin',
    'sohu.com', 'sina.com.cn', 'ifeng.com', '163.com',
    'people.com.cn', 'xinhuanet', 'chinanews',
    'beijing.gov', 'china.com.cn',
]


class CustomHandler(http.server.SimpleHTTPRequestHandler):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)

        if parsed.path == '/api/place-image':
            self.handle_place_image(parsed)
        elif parsed.path == '/api/proxy-image':
            self.handle_proxy_image(parsed)
        elif parsed.path.endswith('.js') or parsed.path.endswith('.css'):
            # 强制不缓存 JS/CSS 文件，总是返回最新内容
            self.send_response(200)
            filepath = os.path.join(DIRECTORY, parsed.path.lstrip('/').replace('/', os.sep))
            try:
                with open(filepath, 'rb') as f:
                    content = f.read()
                if parsed.path.endswith('.js'):
                    self.send_header('Content-Type', 'application/javascript; charset=utf-8')
                else:
                    self.send_header('Content-Type', 'text/css; charset=utf-8')
                self.send_header('Content-Length', str(len(content)))
                self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
                self.send_header('Pragma', 'no-cache')
                self.send_header('Expires', '0')
                self.end_headers()
                self.wfile.write(content)
            except FileNotFoundError:
                self.send_error(404, 'File not found')
        else:
            super().do_GET()

    # ========== 图片搜索 API ==========
    def handle_place_image(self, parsed):
        """搜索地点图片，返回JSON {url, source, thumb, width, height}"""
        params = urllib.parse.parse_qs(parsed.query)
        name = params.get('name', [''])[0]
        lat = params.get('lat', [''])[0]
        lng = params.get('lng', [''])[0]

        if not name:
            self._send_json({'url': '', 'source': '', 'thumb': '', 'width': 0, 'height': 0})
            return

        # 检查缓存
        cache_key = name.strip()
        if cache_key in _image_cache:
            entry = _image_cache[cache_key]
            if time.time() - entry['ts'] < _CACHE_TTL:
                self._send_json(entry['data'])
                return

        # 策略1：360图片搜索（高质量、无水印、CDN直连）
        result = self._search_360_images(f'{name} 风景')
        if result:
            data = {'url': result.get('img', ''), 'source': '360', 'thumb': result['thumb'],
                    'width': result.get('width', 0), 'height': result.get('height', 0)}
            _image_cache[cache_key] = {'data': data, 'ts': time.time()}
            print(f'  [图片] "{name}" -> 360图片 ({result.get("width",0)}x{result.get("height",0)})', flush=True)
            self._send_json(data)
            return

        # 策略2：360图片搜索（换关键词）
        result = self._search_360_images(name)
        if result:
            data = {'url': result.get('img', ''), 'source': '360', 'thumb': result['thumb'],
                    'width': result.get('width', 0), 'height': result.get('height', 0)}
            _image_cache[cache_key] = {'data': data, 'ts': time.time()}
            print(f'  [图片] "{name}" -> 360图片 ({result.get("width",0)}x{result.get("height",0)})', flush=True)
            self._send_json(data)
            return

        # 策略3：必应图片搜索（高分辨率缩略图 800x600）
        result = self._search_bing_async(f'{name} 风景 高清')
        if result:
            data = {'url': result['murl'], 'source': 'bing', 'thumb': result['thumb'],
                    'width': 800, 'height': 600}
            _image_cache[cache_key] = {'data': data, 'ts': time.time()}
            print(f'  [图片] "{name}" -> Bing (高清缩略图)', flush=True)
            self._send_json(data)
            return

        # 策略4：必应图片搜索（原始搜索词，降低要求）
        result = self._search_bing_async(f'{name} 照片')
        if result:
            data = {'url': result['murl'], 'source': 'bing', 'thumb': result['thumb'],
                    'width': 800, 'height': 600}
            _image_cache[cache_key] = {'data': data, 'ts': time.time()}
            print(f'  [图片] "{name}" -> Bing (后备)', flush=True)
            self._send_json(data)
            return

        # 全部失败
        data = {'url': '', 'source': '', 'thumb': '', 'width': 0, 'height': 0}
        _image_cache[cache_key] = {'data': data, 'ts': time.time()}
        self._send_json(data)

    def _search_360_images(self, keyword):
        """
        360图片搜索API - 高质量中文图片，CDN直连无水印
        返回 {thumb, img, width, height} 或 None
        策略：收集所有合格候选，优先选择优质来源
        """
        try:
            url = f'https://image.so.com/j?q={urllib.parse.quote(keyword)}&src=srp&pn=0&sn=30'
            req = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://image.so.com/',
                'Accept': 'application/json',
            })
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode('utf-8'))

            items = data.get('list', [])
            if not items:
                return None

            # 收集所有合格候选图片
            candidates = []
            for item in items:
                thumb = item.get('thumb', '')
                img = item.get('img', '')
                try:
                    w = int(item.get('width', 0) or 0)
                except (ValueError, TypeError):
                    w = 0
                try:
                    h = int(item.get('height', 0) or 0)
                except (ValueError, TypeError):
                    h = 0

                if not thumb:
                    continue

                # 过滤小图片（宽<400 或 高<300）
                if w > 0 and h > 0 and (w < 400 or h < 300):
                    continue

                # 过滤有水印的图库网站
                img_lower = (img or '').lower()
                thumb_lower = thumb.lower()
                if any(bd in img_lower or bd in thumb_lower for bd in WATERMARK_DOMAINS):
                    continue

                # 计算来源质量分
                score = 0
                if any(gd in img_lower for gd in GOOD_SOURCE_DOMAINS):
                    score += 100  # 优质来源加分
                # 360 CDN 缩略图加分（稳定、无防盗链）
                if 'qhimgs' in thumb_lower or 'qihoo' in thumb_lower:
                    score += 50
                # 更大图片加分
                if w > 0 and h > 0:
                    score += min(w * h // 10000, 30)  # 最多加30分
                # 横向图片更适合卡片展示
                if w > 0 and h > 0 and w > h:
                    score += 10

                candidates.append({
                    'thumb': thumb,
                    'img': img,
                    'width': w,
                    'height': h,
                    'score': score,
                })

            if not candidates:
                return None

            # 按分数排序，选择最佳候选
            candidates.sort(key=lambda x: x['score'], reverse=True)
            best = candidates[0]
            print(f'  [360图片] "{keyword}" -> {len(candidates)}个候选，选择来源: {(best["img"] or "")[:60]} (分数:{best["score"]})', flush=True)
            return {
                'thumb': best['thumb'],
                'img': best['img'],
                'width': best['width'],
                'height': best['height'],
            }

        except Exception as e:
            print(f'  [360图片] 搜索失败 "{keyword}": {e}', flush=True)
        return None

    def _search_bing_async(self, keyword):
        """
        必应图片 async API - 返回 {murl, thumb}
        改进：使用更高分辨率的缩略图（800x600），过滤水印来源
        """
        try:
            url = f'https://cn.bing.com/images/async?q={urllib.parse.quote(keyword)}&first=1&count=10'
            req = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Language': 'zh-CN,zh;q=0.9',
            })
            with urllib.request.urlopen(req, timeout=10) as resp:
                raw_html = resp.read().decode('utf-8', errors='ignore')

            # 解码HTML实体
            decoded = html_module.unescape(raw_html)

            # 提取 murl（原始图片URL）
            murl_matches = re.findall(r'"murl":"(https?://[^"]+)"', decoded)

            # 过滤掉有水印的图库网站
            filtered_murls = []
            for u in murl_matches:
                u_lower = u.lower()
                if not any(bd in u_lower for bd in WATERMARK_DOMAINS):
                    filtered_murls.append(u)

            # 提取 OIP-C 缩略图URL
            thumb_matches = re.findall(
                r'(https://tse\d+-mm\.cn\.bing\.net/th/id/OIP-C\.[^"?]+\?[^"]*w=(\d+)[^"]*h=(\d+)[^"]*)',
                raw_html
            )

            # 过滤出较大的缩略图（宽>200），修改尺寸为 800x600
            good_thumbs = []
            for full_url, w, h in thumb_matches:
                w_int = int(w)
                if w_int >= 200:
                    enlarged = re.sub(r'w=\d+', 'w=800', full_url)
                    enlarged = re.sub(r'h=\d+', 'h=600', enlarged)
                    enlarged = enlarged.replace('&amp;', '&')
                    good_thumbs.append(enlarged)

            # 选择最佳结果
            murl = filtered_murls[0] if filtered_murls else (murl_matches[0] if murl_matches else '')
            thumb = good_thumbs[0] if good_thumbs else ''

            if murl or thumb:
                print(f'  [必应图片] "{keyword}" -> murl:{len(murl_matches)}张(过滤后{len(filtered_murls)}), thumb:{len(good_thumbs)}张', flush=True)
                return {'murl': murl, 'thumb': thumb}

        except Exception as e:
            print(f'  [必应图片] 搜索失败 "{keyword}": {e}', flush=True)
        return None

    # ========== 图片代理 API（解决防盗链） ==========
    def handle_proxy_image(self, parsed):
        """代理图片请求，解决跨域和防盗链问题"""
        params = urllib.parse.parse_qs(parsed.query)
        img_url = params.get('url', [''])[0]

        if not img_url or not img_url.startswith('http'):
            self.send_response(400)
            self.end_headers()
            return

        # 安全：拦截 SSRF，禁止访问内网地址和 localhost
        try:
            proxy_host = urllib.parse.urlparse(img_url).hostname or ''
            # 解析主机名获取 IP，检测是否为内网地址
            import socket
            try:
                resolved_ip = socket.gethostbyname(proxy_host)
            except socket.gaierror:
                self.send_response(400)
                self.end_headers()
                return
            ip_octets = [int(o) for o in resolved_ip.split('.')]
            is_internal = (
                ip_octets[0] == 10 or                          # 10.0.0.0/8
                (ip_octets[0] == 172 and 16 <= ip_octets[1] <= 31) or  # 172.16.0.0/12
                (ip_octets[0] == 192 and ip_octets[1] == 168) or       # 192.168.0.0/16
                ip_octets[0] == 127 or                         # 127.0.0.0/8 (loopback)
                ip_octets[0] == 169 and ip_octets[1] == 254 or  # 169.254.0.0/16 (link-local, 含云元数据)
                resolved_ip == '0.0.0.0'
            )
            if is_internal:
                print(f'  [安全] 拦截 SSRF 请求: {img_url} -> {resolved_ip}', flush=True)
                self.send_response(403)
                self.end_headers()
                return
        except Exception:
            self.send_response(400)
            self.end_headers()
            return

        try:
            # 根据图片来源设置正确的 Referer
            if 'qhimgs' in img_url or 'qihoo' in img_url or '360' in img_url:
                referer = 'https://image.so.com/'
            elif 'bing.com' in img_url or 'bing.net' in img_url:
                referer = 'https://cn.bing.com/'
            else:
                referer = 'https://cn.bing.com/'

            req = urllib.request.Request(img_url, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': referer,
                'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
            })
            with urllib.request.urlopen(req, timeout=10) as resp:
                content_type = resp.headers.get('Content-Type', 'image/jpeg')
                if 'image' not in content_type and 'octet-stream' not in content_type:
                    self.send_response(404)
                    self.end_headers()
                    return
                data = resp.read()

                self.send_response(200)
                self.send_header('Content-Type', content_type)
                self.send_header('Cache-Control', 'public, max-age=86400')
                self.send_header('Content-Length', len(data))
                self.end_headers()
                self.wfile.write(data)
        except Exception as e:
            print(f'  [图片代理] 失败: {e}', flush=True)
            self.send_response(404)
            self.end_headers()

    # ========== 工具方法 ==========
    def _send_json(self, obj):
        data = json.dumps(obj).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Length', len(data))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, format, *args):
        msg = format % args if args else str(format)
        if '/api/' in msg:
            print(f'  [{time.strftime("%H:%M:%S")}] {msg}', flush=True)


class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    """多线程HTTP服务器"""
    daemon_threads = True


if __name__ == '__main__':
    os.chdir(DIRECTORY)
    with ThreadedHTTPServer(("", PORT), CustomHandler) as httpd:
        print(f'', flush=True)
        print(f'  ========================================', flush=True)
        print(f'  一会去哪儿 - 本地服务器', flush=True)
        print(f'  ========================================', flush=True)
        print(f'  地址: http://localhost:{PORT}/', flush=True)
        print(f'  目录: {DIRECTORY}', flush=True)
        print(f'  图片搜索: /api/place-image?name=地点名', flush=True)
        print(f'  图片代理: /api/proxy-image?url=图片URL', flush=True)
        print(f'  图片源: 360图片 > 必应高清', flush=True)
        print(f'  ========================================', flush=True)
        print(f'', flush=True)
        httpd.serve_forever()
