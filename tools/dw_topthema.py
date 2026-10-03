# DW Top-Thema (B1) metinlerini çeker: RSS'teki son dersler → tam metin + DW sözlüğü.
# Kaynak her metnin altında. Kullanım: python3 tools/dw_topthema.py
import json, re, html, os, urllib.request, urllib.parse
UA = {'User-Agent': 'Mozilla/5.0'}
get = lambda u: urllib.request.urlopen(urllib.request.Request(urllib.parse.quote(u, safe=':/?=&%'), headers=UA), timeout=30).read().decode('utf-8', 'ignore')
rss = get('https://rss.dw.com/xml/DKpodcast_topthemamitvokabeln_de')
ziel = os.path.join(os.path.dirname(__file__), '..', 'quellen', 'lesetexte_dw.json')
alt = {x['id']: x for x in json.load(open(ziel, encoding='utf-8'))} if os.path.exists(ziel) else {}
for item in rss.split('<item>')[1:]:
    lid = re.search(r'<guid[^>]*>(\d+)</guid>', item).group(1)
    if lid in alt: continue
    titel = html.unescape(re.search(r'<title>(.*?)</title>', item, re.S).group(1)).strip()
    link = re.search(r'<link>(.*?)</link>', item).group(1).split('?')[0]
    try:
        s = get(link)
        d = json.loads(re.search(r'window\.__\w+__\s*=\s*(\{.*?\});?\s*</script>', s, re.S).group(1))
    except Exception as e:
        print('atlandı', titel, e); continue
    les = d.get('Lesson:' + lid, {})
    man = les.get('manuscript') or ''
    paras = [html.unescape(re.sub(r'<[^>]+>', '', p)).strip() for p in re.split(r'</p>|<br\s*/?>', man)]
    paras = [p for p in paras if p and not p.startswith('Arbeitsauftrag') and not p.lower().startswith('autor')]
    gloss = [{'de': html.unescape(v['shortTitle']).strip(), 'erkl': html.unescape(re.sub(r'<[^>]+>', '', v['text'])).strip()}
             for v in d.values() if isinstance(v, dict) and v.get('__typename') == 'Knowledge' and v.get('knowledgeType') == 'GLOSSARY' and v.get('shortTitle')]
    alt[lid] = {'id': lid, 'quelle': 'DW Top-Thema', 'titel': titel, 'text': '\n'.join(paras), 'glossar': gloss, 'url': link}
    print('ok', titel, len(' '.join(paras).split()), 'kelime', len(gloss), 'sözlük')
json.dump(list(alt.values()), open(ziel, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(alt), 'metin')
