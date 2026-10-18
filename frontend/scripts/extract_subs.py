import sys
import os
import json
import shutil
import requests

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing video ID"}))
        return

    video_id = sys.argv[1].strip()
    
    # 1. Procura arquivo cookies.txt
    cookie_file = None
    cookie_candidates = [
        "/app/data/cookies.txt",
        "/app/host_data/cookies.txt",
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
    
    # Valida rapidamente se o proxy está acessível antes de travar requisições
    active_proxy = None
    if proxy:
        try:
            # Testa conectividade com o proxy em 1.5s
            test_proxies = {'http': proxy, 'https': proxy}
            requests.get("https://www.cloudflare.com/cdn-cgi/trace", proxies=test_proxies, timeout=1.8)
            active_proxy = proxy
        except Exception as pe:
            sys.stderr.write(f"[extract_subs] Proxy {proxy} inacessivel ({pe}), usando conexao direta.\n")
            active_proxy = None

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
            
        if active_proxy:
            ydl_opts['proxy'] = active_proxy
            
        ydl = yt_dlp.YoutubeDL(ydl_opts)
        try:
            info = ydl.extract_info(f'https://www.youtube.com/watch?v={video_id}', download=False)
        except Exception as ye:
            # Se falhou com proxy, tenta mais uma vez direto
            if active_proxy:
                sys.stderr.write(f"[extract_subs] yt_dlp falhou com proxy ({ye}), tentando direto...\n")
                ydl_opts_direct = {k: v for k, v in ydl_opts.items() if k != 'proxy'}
                ydl = yt_dlp.YoutubeDL(ydl_opts_direct)
                info = ydl.extract_info(f'https://www.youtube.com/watch?v={video_id}', download=False)
            else:
                raise ye

        subs = info.get('subtitles') or {}
        auto = info.get('automatic_captions') or {}
        
        track_url = None
        # 1. Prioriza faixas em inglês (qualquer variante: en, en-US, en-nP7-..., etc.)
        for src in [subs, auto]:
            for k, items in src.items():
                if k.lower().startswith(('en-', 'en_', 'en')):
                    for s in (items or []):
                        if s.get('ext') == 'json3':
                            track_url = s.get('url')
                            break
                    if track_url:
                        break
            if track_url:
                break

        # 2. Se não houver inglês, tenta português
        if not track_url:
            for src in [subs, auto]:
                for k, items in src.items():
                    if k.lower().startswith(('pt-', 'pt_', 'pt')):
                        for s in (items or []):
                            if s.get('ext') == 'json3':
                                track_url = s.get('url')
                                break
                        if track_url:
                            break
                if track_url:
                    break

        # 3. Fallback genérico para qualquer outra faixa json3
        if not track_url:
            for lang, items in {**subs, **auto}.items():
                for s in (items or []):
                    if s.get('ext') == 'json3':
                        track_url = s.get('url')
                        break
                if track_url:
                    break
                    
        if track_url:
            # Baixa o conteúdo usando requests com suporte nativo a socks5 e fallback
            headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
            content = None
            if active_proxy:
                try:
                    r = requests.get(track_url, proxies={'http': active_proxy, 'https': active_proxy}, headers=headers, timeout=12)
                    if r.status_code == 200:
                        content = r.text
                except Exception:
                    pass
                    
            if not content:
                r = requests.get(track_url, headers=headers, timeout=12)
                if r.status_code == 200:
                    content = r.text
                    
            if content:
                parsed = json.loads(content)
                if 'events' in parsed and len(parsed.get('events', [])) > 0:
                    print(content)
                    return
    except Exception as e:
        sys.stderr.write(f"[extract_subs] yt_dlp error: {str(e)}\n")

    # 2. Fallback via youtube_transcript_api
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        
        raw_items = None
        
        # Tenta com proxy se ativo
        if active_proxy:
            try:
                session = requests.Session()
                session.proxies = {'http': active_proxy, 'https': active_proxy}
                session.headers.update({'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
                api = YouTubeTranscriptApi(http_client=session)
                transcript_obj = api.fetch(video_id, languages=['en', 'en-US', 'en-GB', 'pt'])
                raw_items = transcript_obj.to_raw_data()
            except Exception as pe:
                sys.stderr.write(f"[extract_subs] transcript_api com proxy falhou: {pe}\n")

        # Se falhou ou sem proxy, tenta direto
        if not raw_items:
            try:
                api = YouTubeTranscriptApi()
                try:
                    transcript_obj = api.fetch(video_id, languages=['en', 'en-US', 'en-GB', 'pt'])
                    raw_items = transcript_obj.to_raw_data()
                except AttributeError:
                    raw_items = YouTubeTranscriptApi.get_transcript(video_id, languages=['en', 'en-US', 'en-GB', 'pt'])
            except Exception as de:
                sys.stderr.write(f"[extract_subs] transcript_api direto falhou: {de}\n")

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
