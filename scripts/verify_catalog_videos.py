import urllib.request
import urllib.parse
import json
import re

def search_yt(query):
    url = 'https://www.youtube.com/results?search_query=' + urllib.parse.quote(query)
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    try:
        html = urllib.request.urlopen(req, timeout=10).read().decode()
        vids = re.findall(r'"videoId":"([a-zA-Z0-9_-]{11})"', html)
        seen = []
        for v in vids:
            if v not in seen:
                seen.append(v)
        return seen[:6]
    except Exception as e:
        print(f"Error searching {query}: {e}")
        return []

def get_title(vid):
    try:
        url = f'https://noembed.com/embed?url=https://www.youtube.com/watch?v={vid}'
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        res = urllib.request.urlopen(req, timeout=5)
        data = json.loads(res.read().decode())
        return data.get('title'), data.get('author_name')
    except Exception as e:
        return None, None

queries = [
    "peppa pig official channel english full episodes",
    "ted ed english riddle can you solve"
]

for q in queries:
    print(f"\n--- Query: {q} ---")
    vids = search_yt(q)
    for v in vids:
        title, author = get_title(v)
        safe_title = (title or "").encode('ascii', 'ignore').decode('ascii')
        safe_author = (author or "").encode('ascii', 'ignore').decode('ascii')
        print(f"{v} => {safe_title} ({safe_author})")
