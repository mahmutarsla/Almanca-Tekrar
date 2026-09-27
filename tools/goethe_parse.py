"""Goethe-Zertifikat B1 Wortliste PDF -> daten/goethe_b1.json

Kullanım:  python tools/goethe_parse.py Goethe-Zertifikat_B1_Wortliste.pdf
(pdfplumber gerekir: pip install pdfplumber)
"""
import json, re, sys
import pdfplumber

COLS = [(30, 130, 310), (310, 408, 600)]  # (başlık x0, örnek x0, sütun sonu)


def lines_of(page):
    words = [w for w in page.extract_words(extra_attrs=["size"], keep_blank_chars=False)
             if abs(w["size"] - 8) < 0.3 and 40 < w["top"] < 790]
    out = []
    for h0, e0, end in COLS:
        rows = {}
        for w in words:
            if not (h0 <= w["x0"] < end):
                continue
            key = round(w["top"] / 2)
            r = rows.setdefault(key, {"top": w["top"], "h": [], "e": []})
            (r["h"] if w["x0"] < e0 else r["e"]).append(w)
        col = []
        for r in sorted(rows.values(), key=lambda r: r["top"]):
            col.append({"top": r["top"],
                        "h": " ".join(w["text"] for w in sorted(r["h"], key=lambda w: w["x0"])),
                        "e": " ".join(w["text"] for w in sorted(r["e"], key=lambda w: w["x0"]))})
        out.append(col)
    return out


VERB_START = re.compile(r"^(\(?sich( etwas)?\)? )?([a-zäöüß]+ )?[a-zäöüß·|]+(en|ern|eln|rn|ln|n), ")


def head_open(h):
    """Başlık devam ediyor mu? (virgül, tireleme, ok ile bitiyor ya da
    fiil çekimi henüz 'hat/ist …' kısmına gelmediyse)"""
    h = h.rstrip()
    if h.endswith((",", "→", "/", "(")) or (h.endswith("-") and not h.endswith(" -")):
        return True
    if re.search(r"(/|\s)(der|die|das)$", h):
        return True
    return bool(VERB_START.match(h)) and not re.search(r"\b(hat|ist)\s+(sich\s+)?\S", h)


def feminine(prev_head, h):
    m1 = re.match(r"^der (\w+)", prev_head)
    m2 = re.match(r"^die (\w+)in, -nen", h)
    return bool(m1 and m2 and m2.group(1).startswith(m1.group(1)[:4]))


def blocks(col):
    """Satırları giriş bloklarına böl: boşluk > 14pt ya da tamamlanmış başlıktan
    sonra gelen yeni başlık satırı = yeni giriş."""
    cur, prev, last_h = [], None, ""
    for ln in col:
        new = prev is not None and ln["top"] - prev > 14
        if not new and cur and ln["h"] and last_h and not head_open(last_h) \
                and not feminine(last_h, ln["h"]):
            new = True
        if new and cur:
            yield cur
            cur, last_h = [], ""
        cur.append(ln)
        if ln["h"]:
            last_h = (last_h + " " + ln["h"]).strip()
        prev = ln["top"]
    if cur:
        yield cur


def join(parts):
    s = ""
    for p in parts:
        if not p:
            continue
        if s.endswith("-") and not s.endswith(" -") and p[:1].islower():
            s = s[:-1] + p          # satır sonu tirelemesi
        else:
            s = (s + " " + p) if s else p
    return s.strip()


def split_examples(e):
    parts = re.split(r"(?:^|\s)(\d{1,2})\.\s", " " + e)
    if len(parts) == 1:
        return [e.strip()] if e.strip() else []
    ex = [parts[0].strip()] if parts[0].strip() else []
    ex += [parts[i + 1].strip() for i in range(1, len(parts) - 1, 2)]
    return [x for x in ex if x]


ART = re.compile(r"^(der|die|das|der/die|die/der)\s+(.+)$")


def analyse(head):
    d = {"head": head}
    if re.search(r"\((A|CH|A, CH)\)", head) and not re.search(r"\(D", head):
        d["regional"] = True
    h = re.sub(r"\s*\([^)]*\)", "", head).strip()
    h = re.sub(r"^[A-ZÄÖÜ][a-zäöüß]*(?=(der|die|das) )", "", h)  # 'Hauptdie Hauptstadt'
    if re.match(r"^[a-zäöüß]+, [a-zäöüß]+t, [a-zäöüß]+, ge[a-zäöüß]+$", h):  # 'gießen, gießt, goss, gegossen'
        h = re.sub(r", (ge[a-zäöüß]+)$", r", hat \1", h)
    arrow = h.split("→")
    h = arrow[0].strip()
    if len(arrow) > 1:
        d["siehe"] = arrow[1].strip()
    parts = [p.strip() for p in h.split(",")]
    parts = [p for p in parts if p and "→" not in p and ":" not in p]
    # fiil: 'hat …' / 'ist …' parçası
    pis = [i for i, p in enumerate(parts)
           if re.match(r"^(es\s+)?(hat|ist|ist/hat|hat/ist)\s", p)]
    pi = pis[-1] if pis else None
    if pi is not None and pi >= 2:
        inf = parts[0]
        d.update(typ="verb", lemma=re.sub(r"^\(?sich( etwas)?\)?\s+", "", inf).replace("·", "").strip(),
                 inf=inf, praes=parts[1], praet=parts[pi - 1],
                 perf=parts[pi], refl=inf.startswith("sich ") or inf.startswith("(sich"))
        return d
    if not parts:
        d.update(typ="andere", lemma=h)
        return d
    m = ART.match(parts[0])
    if m and "/" not in m.group(2).split()[0][:1]:
        d.update(typ="nomen", art=m.group(1), lemma=m.group(2).strip())
        if len(parts) > 1:
            m2 = re.match(r"^(¨?-[a-zäöüß]*|-/-“-|-)(?=\s|$)", parts[1])
            if m2:
                d["pl"] = m2.group(1)
        fem = re.search(r"\bdie (\w+in), -nen", h)
        if fem and d["art"] == "der":
            d["fem"] = fem.group(1)
        return d
    d.update(typ="andere", lemma=parts[0])
    return d


def main(pdf):
    entries = []
    with pdfplumber.open(pdf) as p:
        for i in range(15, 102):
            for col in lines_of(p.pages[i]):
                for b in blocks(col):
                    head = join([l["h"] for l in b])
                    ex = join([l["e"] for l in b])
                    if not head:
                        # örnek devamı (önceki sayfa/sütundan)
                        if entries and ex:
                            entries[-1]["bsp"] += split_examples(ex)
                        continue
                    if head in ("WORTLISTE", "ZERTIFIKAT B1") or re.fullmatch(r"\d+", head):
                        continue
                    if head.startswith("→") or re.match(r"^[A-Z]{1,2}(, [A-Z]{1,2})*:", head):
                        continue  # bölgesel çapraz referans notu
                    e = analyse(head)
                    e["bsp"] = split_examples(ex)
                    e["s"] = i + 1
                    entries.append(e)
    for n, e in enumerate(entries):
        e["id"] = n
    json.dump(entries, open("daten/goethe_b1.json", "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    from collections import Counter
    print(len(entries), Counter(e["typ"] for e in entries))


if __name__ == "__main__":
    main(sys.argv[1])
