/**
 * 图片代理 API — Vercel Serverless Function
 * 解决跨域和防盗链问题，根据来源设置正确的 Referer
 * 含 SSRF 防护：拦截内网地址、localhost、云元数据地址
 */

// 内网/保留 IP 段检测（防止 SSRF 攻击）
function isInternalIp(ip) {
  if (!ip || ip.includes(':')) return true; // IPv6 默认拦截
  const octets = ip.split('.').map(Number);
  if (octets.length !== 4 || octets.some(n => isNaN(n))) return true;
  return (
    octets[0] === 10 ||                                    // 10.0.0.0/8
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||  // 172.16.0.0/12
    (octets[0] === 192 && octets[1] === 168) ||            // 192.168.0.0/16
    octets[0] === 127 ||                                   // 127.0.0.0/8 (loopback)
    (octets[0] === 169 && octets[1] === 254) ||            // 169.254.0.0/16 (link-local, 含云元数据)
    ip === '0.0.0.0'
  );
}

export default async function handler(req, res) {
  const { url: imgUrl } = req.query;

  if (!imgUrl || !imgUrl.startsWith('http')) {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  // SSRF 防护：解析主机名并校验 IP
  let hostname = '';
  try {
    hostname = new URL(imgUrl).hostname;
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  // 拦截 localhost 类主机名
  if (hostname === 'localhost' || hostname === 'metadata' || hostname === 'metadata.google.internal') {
    return res.status(403).json({ error: 'Blocked: internal host' });
  }

  // 解析 IP 并校验是否为内网地址
  try {
    // Node 18+ 使用 dns.lookup 的 Promise 版本
    const dns = await import('node:dns/promises');
    const lookupResult = await dns.lookup(hostname, { all: true });
    const addresses = lookupResult || [];
    for (const addr of addresses) {
      if (isInternalIp(addr.address)) {
        console.warn(`[安全] 拦截 SSRF 请求: ${imgUrl} -> ${addr.address}`);
        return res.status(403).json({ error: 'Blocked: internal IP' });
      }
    }
  } catch (e) {
    // DNS 解析失败，拒绝请求
    return res.status(400).json({ error: 'DNS resolution failed' });
  }

  try {
    // 根据图片来源设置正确的 Referer
    let referer = 'https://cn.bing.com/';
    const urlLower = imgUrl.toLowerCase();
    if (urlLower.includes('qhimgs') || urlLower.includes('qihoo') || urlLower.includes('360')) {
      referer = 'https://image.so.com/';
    } else if (urlLower.includes('bing.com') || urlLower.includes('bing.net')) {
      referer = 'https://cn.bing.com/';
    }

    const response = await fetch(imgUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': referer,
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
      },
    });

    const contentType = response.headers.get('Content-Type') || 'image/jpeg';
    if (!contentType.includes('image') && !contentType.includes('octet-stream')) {
      return res.status(404).json({ error: 'Not an image' });
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).send(buffer);
  } catch (error) {
    console.error('[图片代理] 失败:', error.message);
    return res.status(404).json({ error: 'Image fetch failed' });
  }
}
