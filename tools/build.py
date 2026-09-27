"""quellen/*.txt + daten/goethe_b1.json  ->  daten/verben.js, daten/nomen.js

Aynı zamanda doğrulama yapar: Goethe'de bulunmayan fiil/isim, artikel uyuşmazlığı,
çözümlenemeyen kalıp ismi vb. Hata varsa çıkış kodu 1.

Kullanım:  python3 tools/build.py
"""
import json, re, sys, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
PREPS = {"an", "auf", "in", "über", "unter", "vor", "hinter", "neben", "zwischen", "mit", "nach",
         "zu", "von", "bei", "aus", "seit", "für", "um", "gegen", "ohne", "durch"}
errors, warnings = [], []


def lines(path):
    for n, raw in enumerate(open(path, encoding="utf-8"), 1):
        s = raw.strip()
        if s and not s.startswith("#"):
            yield n, s


goethe = json.load(open(P("daten", "goethe_b1.json"), encoding="utf-8"))
g_verbs = {}
for e in goethe:
    if e["typ"] == "verb":
        g_verbs.setdefault(e["lemma"], e)
g_nouns = [e for e in goethe if e["typ"] == "nomen" and not e.get("regional")]

# ---------------- İsimler ----------------
UML = str.maketrans({"a": "ä", "o": "ö", "u": "ü", "A": "Ä", "O": "Ö", "U": "Ü"})


def umlaut(w):
    m = re.match(r"^(.*?)(au|a|o|u|A|O|U)([^aouAOU]*)$", w)
    if not m:
        return w
    v = "äu" if m.group(2) == "au" else m.group(2).translate(UML)
    return m.group(1) + v + m.group(3)


def plural_form(lemma, pl):
    if not pl or "/" in pl:
        return None
    base, suf = lemma, pl
    if suf.startswith("¨"):
        base, suf = umlaut(base), suf[1:]
    return base if suf == "-" else base + suf.lstrip("-")


WEAK_LIST = {"Mensch", "Herr", "Nachbar", "Bauer", "Bär", "Held", "Prinz", "Graf", "Kamerad",
             "Soldat", "Automat", "Kandidat", "Pilot", "Architekt", "Präsident", "Student", "Patient",
             "Assistent", "Dozent", "Journalist", "Polizist", "Tourist", "Spezialist", "Praktikant",
             "Elefant", "Migrant", "Fotograf", "Typ", "Kunde", "Kollege", "Junge", "Name", "Experte",
             "Zeuge", "Neffe", "Affe", "Hase", "Löwe", "Gedanke", "Buchstabe", "Friede"}
NOT_WEAK = {"See", "Käse", "Staat", "Schmerz", "Professor", "Doktor", "Motor", "Autor", "Direktor",
            "Angehörige", "Angestellte", "Bekannte", "Erwachsene", "Beamte", "Jugendliche", "Kranke",
            "Tote", "Verwandte", "Studierende", "Serviceangestellte"}
ADJ_NOUNS = {"Angehörige", "Angestellte", "Bekannte", "Erwachsene", "Beamte", "Jugendliche", "Kranke",
             "Tote", "Verwandte", "Studierende", "Serviceangestellte"}


def is_weak(art, lemma, pl):
    if art != "der" or lemma in NOT_WEAK:
        return False
    return lemma in WEAK_LIST


nomen = []
tr_lines = list(lines(P("quellen", "nomen.txt")))
if len(tr_lines) != len(g_nouns):
    errors.append(f"nomen.txt {len(tr_lines)} satır, Goethe isim sayısı {len(g_nouns)}")
for (n, s), g in zip(tr_lines, g_nouns):
    parts = [x.strip() for x in s.split("|")]
    key, tier, tr = parts[0], int(parts[1]), parts[2]
    if key != f"{g['art']} {g['lemma']}":
        errors.append(f"nomen.txt:{n}: '{key}' ≠ Goethe '{g['art']} {g['lemma']}'")
        continue
    lemma = re.sub(r"\d+\.$", "", g["lemma"]).strip()
    pl = g.get("pl")
    plural_only = pl is None and "çoğul" in tr
    nomen.append({
        "id": f"n{len(nomen) + 1:04d}", "art": g["art"], "lemma": lemma, "pl": pl,
        "plf": plural_form(lemma, pl), "tr": tr, "tier": tier,
        "weak": is_weak(g["art"], lemma, pl), "adjN": lemma in ADJ_NOUNS,
        "plOnly": plural_only, "bsp": g["bsp"][:4], "g": g["id"],
    })
known = {(x["art"], x["lemma"]) for x in nomen}
for n, s in lines(P("quellen", "nomen_extra.txt")):
    parts = [x.strip() for x in s.split("|")]
    m = re.match(r"^(der|die|das) ([^,]+)(?:, (.+))?$", parts[0])
    if not m:
        errors.append(f"nomen_extra.txt:{n}: biçim hatalı: {parts[0]}")
        continue
    art, lemma, pl = m.group(1), m.group(2).strip(), m.group(3)
    if (art, lemma) in known:
        continue
    nomen.append({
        "id": f"x{len(nomen) + 1:04d}", "art": art, "lemma": lemma, "pl": pl,
        "plf": plural_form(lemma, pl), "tr": parts[2], "tier": int(parts[1]),
        "weak": is_weak(art, lemma, pl), "adjN": False, "plOnly": pl is None and "çoğul" in parts[2],
        "bsp": [], "extra": True,
    })
    known.add((art, lemma))

by_key = {}
for x in nomen:
    by_key.setdefault((x["art"], x["lemma"]), x)
by_plural = {}
for x in nomen:
    if x["plf"]:
        by_plural.setdefault(x["plf"], x)


# ---------------- Fiiller ----------------
def split_forms(g, override=None):
    if override:
        praes, praet, perf = [x.strip() for x in override.split(",")]
    else:
        praes, praet, perf = g["praes"], g["praet"], g["perf"]
    strip = lambda s: [t for t in s.split() if t not in ("sich", "etwas", "es")]
    pr = strip(praes.split("/")[0])
    pt = strip(praet.split("/")[0])
    pf = strip(perf)
    aux = pf[0].split("/")[0]
    p2 = " ".join(pf[1:]).split("/")[0]
    return pr, pt, aux, p2


verben = []
anz_map = {}
for n, s in lines(P("quellen", "verben.txt")):
    parts = [x.strip() for x in s.split("|")]
    if len(parts) < 4:
        errors.append(f"verben.txt:{n}: eksik alan")
        continue
    anz, kas, tier, tr = parts[:4]
    override = parts[4] if len(parts) > 4 else None
    refl = ""
    rest = anz
    if rest.startswith("sich(D) "):
        refl, rest = "D", rest[8:]
    elif rest.startswith("sich "):
        refl, rest = "A", rest[5:]
    objs = []
    for tok in kas.split():
        if tok == "-":
            continue
        if "+" in tok:
            p, k = tok.split("+")
            objs.append({"p": p, "k": k})
        else:
            objs.append({"k": tok})
    words = rest.split()
    preps_in = [o["p"] for o in objs if "p" in o]
    while words and words[-1] in PREPS and words[-1] in preps_in:
        words.pop()
    lemma = " ".join(words)
    g = g_verbs.get(lemma)
    if not g and not override:
        errors.append(f"verben.txt:{n}: '{lemma}' Goethe listesinde yok")
        continue
    pr, pt, aux, p2 = split_forms(g, override)
    inf = lemma
    finite = pr[0]
    pre, sp = "", ""
    if len(pr) > 1:
        pre = " ".join(pr[1:])
        sp = " " if inf.startswith(pre + " ") else ""
    base = inf[len(pre):].strip() if pre else inf
    if pre and not inf.startswith(pre):
        errors.append(f"verben.txt:{n}: ön ek '{pre}' mastarda yok ({inf})")
    v = {
        "id": f"v{len(verben) + 1:03d}", "anz": anz, "tr": tr, "tier": int(tier),
        "inf": inf, "base": base, "pre": pre, "sp": sp, "p3": finite, "pt3": pt[0] if pt else "",
        "aux": aux, "p2": p2, "refl": refl, "obj": objs,
        "bsp": (g["bsp"][:4] if g else []), "goethe": (g["head"] if g else ""),
    }
    if not re.match(r"^(hat|ist)$", aux):
        errors.append(f"verben.txt:{n}: yardımcı fiil okunamadı: {aux}")
    verben.append(v)
    if anz in anz_map:
        errors.append(f"verben.txt:{n}: '{anz}' iki kez tanımlı")
    anz_map[anz] = v


# Goethe örnekleri fiil başına ortak: her anlam yalnızca kendi edatını içeren örnekleri alır
def has_prep(sent, p):
    w = re.findall(r"[A-Za-zÄÖÜäöüß]+", sent.lower())
    comp = {"da" + p, "dar" + p, "wo" + p, "wor" + p}
    contr = {"an": {"am", "ans"}, "in": {"im", "ins"}, "zu": {"zum", "zur"}, "von": {"vom"}, "bei": {"beim"}}.get(p, set())
    return any(x == p or x in comp or x in contr for x in w)


by_lemma = {}
for v in verben:
    by_lemma.setdefault((v["inf"]), []).append(v)
for group in by_lemma.values():
    all_preps = {o["p"] for v in group for o in v["obj"] if "p" in o}
    for v in group:
        mine = {o["p"] for o in v["obj"] if "p" in o}
        if mine:
            v["bsp"] = [b for b in v["bsp"] if all(has_prep(b, p) for p in mine)]
        elif all_preps:
            v["bsp"] = [b for b in v["bsp"] if not any(has_prep(b, p) for p in all_preps)]

# ---------------- Kalıplar ----------------
def resolve_noun(tok, where):
    t = tok.strip()
    flags = {"bare": False, "poss": False, "adj": False, "indef": False, "plural": False}
    if t.startswith("0 "):
        flags["bare"], t = True, t[2:]
    while t and t[-1] in "~*+":
        flags[{"~": "poss", "*": "adj", "+": "indef"}[t[-1]]] = True
        t = t[:-1]
    if t.endswith("(Pl)"):
        flags["plural"], t = True, t[:-4]
    for suf in "~*+":
        if t.endswith(suf):
            flags[{"~": "poss", "*": "adj", "+": "indef"}[suf]] = True
            t = t[:-1]
    m = re.match(r"^(der|die|das) (.+)$", t)
    if not m:
        errors.append(f"{where}: isim biçimi hatalı: '{tok}'")
        return None
    art, lemma = m.group(1), m.group(2)
    x = None
    if flags["plural"]:
        x = by_plural.get(lemma) or by_key.get((art, lemma))
        if x and x["lemma"] == lemma and not x["plOnly"] and x["plf"] != lemma:
            x = None
    else:
        x = by_key.get((art, lemma))
        if not x:
            other = [k for k in by_key if k[1] == lemma]
            if other:
                errors.append(f"{where}: artikel yanlış: '{art} {lemma}' → Goethe: '{other[0][0]} {lemma}'")
                return None
    if not x:
        errors.append(f"{where}: isim bulunamadı: '{t}'")
        return None
    r = {"id": x["id"]}
    for k, v in flags.items():
        if v:
            r[k] = True
    if x["plOnly"]:
        r["plural"] = True
    if x["adjN"]:
        warnings.append(f"{where}: sıfat-isim ({lemma}) üreticide yanlış çekilebilir")
    return r


personen, adj_sache, adj_person = [], [], []
for n, s in lines(P("quellen", "rahmen.txt")):
    where = f"rahmen.txt:{n}"
    if s.startswith("@personen:"):
        for tok in s.split(":", 1)[1].split(","):
            r = resolve_noun(tok, where)
            if r:
                personen.append(r)
        continue
    if s.startswith("@adjektive_"):
        ziel = adj_sache if s.startswith("@adjektive_sache") else adj_person
        for tok in s.split(":", 1)[1].split(","):
            de, tr = tok.split("=", 1)
            ziel.append({"de": de.strip(), "tr": tr.strip()})
        continue
    anz, _, body = s.partition(":")
    anz = anz.strip()
    v = anz_map.get(anz)
    if not v:
        errors.append(f"{where}: fiil '{anz}' verben.txt içinde yok")
        continue
    body = body.strip()
    if body == "-":
        v.setdefault("rahmen", []).append({"o": []})
        continue
    fr = {"o": []}
    for slot in body.split(";"):
        key, _, vals = slot.partition("=")
        key = key.strip()
        if key == "T":  # izin verilen zamanlar: praes, perf, modal
            fr["t"] = [x.strip() for x in vals.split(",") if x.strip()]
            continue
        if key == "X":  # kapatılan özellikler: keinW (soru kelimesi yok), keineZeit (zaman ifadesi yok)
            fr["x"] = [x.strip() for x in vals.split(",") if x.strip()]
            continue
        noms = []
        for tok in vals.split(","):
            tok = tok.strip()
            if tok == "P":
                noms.append("P")
            elif tok:
                r = resolve_noun(tok, where)
                if r:
                    noms.append(r)
        if not noms:
            errors.append(f"{where}: boş yuva '{key}'")
            continue
        if key == "T":
            continue
        if key == "S":
            fr["s"] = noms
        elif "+" in key:
            p, k = key.split("+")
            fr["o"].append({"p": p, "k": k, "n": noms})
        elif key in ("A", "D"):
            fr["o"].append({"k": key, "n": noms})
        else:
            errors.append(f"{where}: yuva anlaşılamadı '{key}'")
    # kalıp, fiilin hâl bilgisiyle uyumlu mu?
    for o in v["obj"]:
        if not any(x.get("p") == o.get("p") and x["k"] == o["k"] for x in fr["o"]) and "s" not in fr:
            if o.get("p") or len(v["obj"]) == 1:
                warnings.append(f"{where}: {anz} için {o} yuvası kalıpta yok")
    v.setdefault("rahmen", []).append(fr)

# ---------------- Çıktı ----------------
for x in nomen:
    x.pop("g", None)


def dump(name, var, data):
    with open(P("daten", name), "w", encoding="utf-8") as f:
        f.write(f"// OTOMATİK ÜRETİLDİ: tools/build.py — elle düzenleme; quellen/ dosyalarını düzenle.\n")
        f.write(f"window.{var} = ")
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")


dump("verben.js", "VERBEN", verben)
person_ids = {p["id"] for p in personen}
for v in verben:
    for fr in v.get("rahmen", []):
        for sl in fr["o"]:
            for x in sl["n"]:
                if x != "P" and x["id"] in person_ids:
                    x["person"] = True
dump("nomen.js", "NOMEN", {"liste": nomen, "personen": personen, "adjSache": adj_sache, "adjPerson": adj_person})

print(f"{len(verben)} fiil anlamı ({sum(1 for v in verben if v.get('rahmen'))} kalıplı), "
      f"{len(nomen)} isim, {len(personen)} kişi, {len(adj_sache) + len(adj_person)} sıfat")
for w in warnings:
    print("uyarı:", w)
for e in errors:
    print("HATA:", e)
sys.exit(1 if errors else 0)
