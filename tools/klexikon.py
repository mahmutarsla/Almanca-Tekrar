# Okuma metinlerini Klexikon'dan (CC BY-SA 4.0) çeker: python3 tools/klexikon.py  (kx.py'deki konu → başlık listesi aşağıda)
import json, urllib.request, urllib.parse
T = {
 'wetter': ['Wetter','Regen','Gewitter','Schnee','Klima','Wind'],
 'umwelt': ['Umweltschutz','Wald','Müll','Recycling','Nordsee','Fluss'],
 'wohnen': ['Wohnung','Haus','Miete','Küche','Nachbar','Stadt'],
 'person': ['Familie','Geschwister','Großeltern','Name','Geburtstag'],
 'beziehungen': ['Freundschaft','Liebe','Hochzeit','Streit','Einladung'],
 'gefuehle': ['Gefühl','Angst','Freude','Wut','Trauer'],
 'gesundheit': ['Arzt','Krankenhaus','Erkältung','Fieber','Apotheke','Gesundheit'],
 'essen': ['Brot','Kartoffel','Restaurant','Frühstück','Gemüse','Kaffee'],
 'einkaufen': ['Supermarkt','Geld','Markt','Kleidung','Werbung'],
 'reisen': ['Eisenbahn','Fahrrad','Flughafen','Bremen','Hamburg','Urlaub'],
 'dienst': ['Post','Bank','Polizei','Rathaus','Versicherung'],
 'arbeit': ['Beruf','Arbeit','Lohn','Fabrik','Arbeitslosigkeit'],
 'ausbildung': ['Schule','Universität','Studium','Ausbildung','Prüfung'],
 'sprache': ['Deutsche Sprache','Sprache','Dialekt','Brief','Telefon'],
 'medien': ['Internet','Smartphone','Fernsehen','Zeitung','Computer'],
 'freizeit': ['Fußball','Musik','Kino','Theater','Hobby','Museum'],
 'gesellschaft': ['Demokratie','Wahl','Bundestag','Migration','Europäische Union'],
}

out = []
for th, titles in T.items():
    for ti in titles:
        q = urllib.parse.urlencode({'action':'query','prop':'extracts','explaintext':1,'titles':ti,'format':'json','redirects':1})
        d = json.load(urllib.request.urlopen('https://klexikon.zum.de/api.php?' + q))
        for p in d['query']['pages'].values():
            if not p.get('extract', '').strip(): print('YOK', th, ti); continue
            paras = [x.strip() for x in p['extract'].split('\n') if x.strip() and not x.startswith('=')]
            text, n = [], 0
            for para in paras:
                text.append(para); n += len(para.split())
                if n >= 140: break
            out.append({'thema': th, 'titel': p['title'], 'text': '\n'.join(text), 'url': 'https://klexikon.zum.de/wiki/' + urllib.parse.quote(p['title'].replace(' ', '_'))})
json.dump(out, open(__import__('os').path.join(__import__('os').path.dirname(__file__), '..', 'quellen', 'lesetexte.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(out), 'metin')
