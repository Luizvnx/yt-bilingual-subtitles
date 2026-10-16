import sys
import os
import json
import urllib.request
import shutil

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing video ID"}))
        return

    video_id = sys.argv[1].strip()
    
    # 1. Procura arquivo cookies.txt
    cookie_file = None
    cookie_candidates = [
        "/app/data/cookies.txt",
        "/app/cookies.txt",
        "/tmp/cookies.txt",
        os.path.join(os.getcwd(), "data", "cookies.txt"),
        os.path.join(os.getcwd(), "cookies.txt"),
        os.path.expanduser("~/cookies.txt")
    ]
    
    for cpath in cookie_candidates:
        if os.path.exists(cpath) and os.path.getsize(cpath) > 10:
            cookie_file = cpath
            break
            
    if not cookie_file and os.environ.get("YOUTUBE_COOKIES"):
        try:
            with open("/tmp/cookies.txt", "w", encoding="utf-8") as f:
                f.write(os.environ.get("YOUTUBE_COOKIES", ""))
            cookie_file = "/tmp/cookies.txt"
        except Exception:
            pass

    proxy = os.environ.get("YOUTUBE_PROXY") or os.environ.get("HTTPS_PROXY") or os.environ.get("HTTP_PROXY")

    # 1. Tenta extrair legendas via yt_dlp
    try:
        import yt_dlp
        ydl_opts = {
            'skip_download': True,
            'quiet': True,
            'no_warnings': True,
        }
        
        # Procura runtime JavaScript suportado pelo yt-dlp (quickjs / deno / node)
        qjs_path = shutil.which("qjs") or shutil.which("quickjs") or "/usr/bin/qjs"
        deno_path = shutil.which("deno") or "/usr/local/bin/deno"
        if os.path.exists(qjs_path):
            ydl_opts['js_runtimes'] = {'quickjs': {'path': qjs_path}}
        elif os.path.exists(deno_path):
            ydl_opts['js_runtimes'] = {'deno': {'path': deno_path}}

        if cookie_file:
            ydl_opts['cookiefile'] = cookie_file
            
        if proxy:
            ydl_opts['proxy'] = proxy
            
        ydl = yt_dlp.YoutubeDL(ydl_opts)
        info = ydl.extract_info(f'https://www.youtube.com/watch?v={video_id}', download=False)
        subs = info.get('subtitles') or {}
        auto = info.get('automatic_captions') or {}
        
        track_url = None
        for lang in ['en', 'en-US', 'en-GB', 'en-orig', 'pt', 'pt-BR']:
            for s in (subs.get(lang) or auto.get(lang) or []):
                if s.get('ext') == 'json3':
                    track_url = s.get('url')
                    break
            if track_url:
                break
                
        if not track_url:
            for lang, items in {**subs, **auto}.items():
                for s in (items or []):
                    if s.get('ext') == 'json3':
                        track_url = s.get('url')
                        break
                if track_url:
                    break
                    
        if track_url:
            req = urllib.request.Request(track_url, headers={'User-Agent': 'Mozilla/5.0'})
            opener = urllib.request.build_opener()
            if proxy:
                opener.add_handler(urllib.request.ProxyHandler({'http': proxy, 'https': proxy}))
            with opener.open(req, timeout=15) as r:
                content = r.read().decode('utf-8')
                parsed = json.loads(content)
                if 'events' in parsed and len(parsed.get('events', [])) > 0:
                    print(content)
                    return
    except Exception as e:
        sys.stderr.write(f"[extract_subs] yt_dlp error: {str(e)}\n")

    # 2. Fallback via youtube_transcript_api
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        import requests
        
        session = requests.Session()
        session.headers.update({'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        if proxy:
            session.proxies = {'http': proxy, 'https': proxy}
        if cookie_file:
            try:
                import http.cookiejar
                jar = http.cookiejar.MozillaCookieJar(cookie_file)
                jar.load(ignore_discard=True, ignore_expires=True)
                session.cookies = jar
            except Exception:
                pass
                
        raw_items = None
        try:
            api = YouTubeTranscriptApi(http_client=session)
            transcript_obj = api.fetch(video_id, languages=['en', 'en-US', 'en-GB', 'pt'])
            raw_items = transcript_obj.to_raw_data()
        except AttributeError:
            raw_items = YouTubeTranscriptApi.get_transcript(video_id, languages=['en', 'en-US', 'en-GB', 'pt'])

        if raw_items and len(raw_items) > 0:
            events = []
            for item in raw_items:
                events.append({
                    'tStartMs': int(float(item.get('start', 0)) * 1000),
                    'dDurationMs': int(float(item.get('duration', 3)) * 1000),
                    'segs': [{'utf8': item.get('text', '')}]
                })
            print(json.dumps({'events': events}))
            return
    except Exception as e:
        sys.stderr.write(f"[extract_subs] transcript_api error: {str(e)}\n")

    # 3. Se tudo falhou
    print(json.dumps({'events': []}))

if __name__ == '__main__':
    main()
