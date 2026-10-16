import sys
import os
import json
import urllib.request

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing video ID"}))
        return

    video_id = sys.argv[1].strip()
    
    # Procura arquivo cookies.txt para contornar bloqueio de bot em Datacenters (Oracle, AWS, etc.)
    cookie_file = None
    cookie_candidates = [
        "/app/cookies.txt",
        "/app/data/cookies.txt",
        os.path.join(os.getcwd(), "cookies.txt"),
        os.path.join(os.getcwd(), "data", "cookies.txt"),
        os.path.expanduser("~/cookies.txt"),
        "/tmp/cookies.txt"
    ]
    
    for cpath in cookie_candidates:
        if os.path.exists(cpath) and os.path.getsize(cpath) > 10:
            cookie_file = cpath
            break
            
    # Se cookies foram injetados via variável de ambiente YOUTUBE_COOKIES
    if not cookie_file and os.environ.get("YOUTUBE_COOKIES"):
        try:
            with open("/tmp/cookies.txt", "w", encoding="utf-8") as f:
                f.write(os.environ.get("YOUTUBE_COOKIES", ""))
            cookie_file = "/tmp/cookies.txt"
        except Exception:
            pass

    # 1. Tenta extrair legendas via yt_dlp
    try:
        import yt_dlp
        ydl_opts = {
            'skip_download': True,
            'quiet': True,
            'no_warnings': True,
        }
        
        if cookie_file:
            ydl_opts['cookiefile'] = cookie_file
            
        proxy = os.environ.get("YOUTUBE_PROXY") or os.environ.get("HTTPS_PROXY") or os.environ.get("HTTP_PROXY")
        if proxy:
            ydl_opts['proxy'] = proxy
            
        ydl = yt_dlp.YoutubeDL(ydl_opts)
        info = ydl.extract_info(f'https://www.youtube.com/watch?v={video_id}', download=False)
        subs = info.get('subtitles') or {}
        auto = info.get('automatic_captions') or {}
        
        track_url = None
        # Prioriza legendas em inglês, depois português
        for lang in ['en', 'en-US', 'en-GB', 'en-orig', 'pt', 'pt-BR']:
            for s in (subs.get(lang) or auto.get(lang) or []):
                if s.get('ext') == 'json3':
                    track_url = s.get('url')
                    break
            if track_url:
                break
                
        # Se não achou nos idiomas prioritários, pega qualquer primeira trilha json3
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
            with urllib.request.urlopen(req, timeout=15) as r:
                content = r.read().decode('utf-8')
                parsed = json.loads(content)
                if 'events' in parsed:
                    print(content)
                    return
    except Exception as e:
        sys.stderr.write(f"[extract_subs] yt_dlp error: {str(e)}\n")

    # 2. Fallback via youtube_transcript_api
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=['en', 'en-US', 'en-GB', 'pt'])
        events = []
        for item in transcript:
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
