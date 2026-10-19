import sys
import os
import json
import requests

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "Query is required"}))
        return

    query = sys.argv[1].strip()
    exclude_id = sys.argv[2].strip() if len(sys.argv) > 2 else ""

    proxy = os.environ.get("YOUTUBE_PROXY") or os.environ.get("HTTPS_PROXY") or os.environ.get("HTTP_PROXY")
    active_proxy = None
    if proxy:
        try:
            test_proxies = {'http': proxy, 'https': proxy}
            requests.get("https://www.cloudflare.com/cdn-cgi/trace", proxies=test_proxies, timeout=1.8)
            active_proxy = proxy
        except Exception:
            active_proxy = None

    proxies = {'http': active_proxy, 'https': active_proxy} if active_proxy else None
    headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    payload = {
        'context': {
            'client': {
                'clientName': 'WEB',
                'clientVersion': '2.20240101.00.00',
                'hl': 'en',
                'gl': 'US'
            }
        },
        'query': query
    }

    try:
        res = requests.post(
            'https://www.youtube.com/youtubei/v1/search',
            headers=headers,
            json=payload,
            proxies=proxies,
            timeout=8
        )
        if res.status_code != 200:
            print(json.dumps({"success": False, "error": f"YouTube search returned status {res.status_code}"}))
            return

        data = res.json()
        contents = data.get('contents', {}).get('twoColumnSearchResultsRenderer', {}).get('primaryContents', {}).get('sectionListRenderer', {}).get('contents', [])
        
        candidates = []
        for sec in contents:
            for item in sec.get('itemSectionRenderer', {}).get('contents', []):
                v = item.get('videoRenderer')
                if not v:
                    continue
                vid = v.get('videoId')
                title = v.get('title', {}).get('runs', [{}])[0].get('text', '')
                owner = v.get('ownerText', {}).get('runs', [{}])[0].get('text', '')
                
                if vid and vid != exclude_id:
                    # Evita outros canais VEVO que também costumam bloquear embed
                    is_vevo = 'vevo' in owner.lower() or 'vevo' in title.lower()
                    candidates.append({
                        'id': vid,
                        'title': title,
                        'owner': owner,
                        'is_vevo': is_vevo
                    })

        if not candidates:
            print(json.dumps({"success": False, "error": "No candidates found"}))
            return

        # Prioriza canais que não são VEVO (ex: 7clouds, Músicas Legendadas, canais de letras)
        best = next((c for c in candidates if not c['is_vevo']), candidates[0])
        print(json.dumps({
            "success": True,
            "id": best['id'],
            "title": best['title'],
            "owner": best['owner']
        }, ensure_ascii=False))

    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == '__main__':
    main()
