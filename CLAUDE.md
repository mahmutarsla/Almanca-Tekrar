# Almanca Tekrar — Claude için çalışma notu

## Öğrenci

- Tuna. Almanca A2 (Goethe A2 var), hedef B1. Bremen'de dil kursu + Uni Bremen Vorbereitungsstudium.
- İletişim: Türkçe, samimi, direkt. Uzatma, tekrar etme, lafı dolandırma.

## Kurallar (hep uy)

1. Her ismin artikeli yanında (der / die / das). Artikelleri bilmiyor.
2. Düzeltmeler soru soru, tam liste: kendi cevabı → doğrusu → kısa açıklama.
3. Her şey yerel HTML'de; cevaplar `log/log.csv`'ye yazılır, Claude oradan okuyup yeni içerik ekler.
4. Günlük hedef (bugün x / 20) ve geçmiş veriler görünür.
5. Ana menü "Çalış": karışık sorular (cümle, kelime, yardımsız anlam).
6. Anlam soruları yardımsız: sadece fiil + edat.
7. Cümlede fiil önce verilir, ipuçları çalıştıkça azalır.
8. Not verince (1 yanlış / 2 küçük hata / 3 doğru) direkt sonraki soru, ekstra tuş yok.
9. Bilmediği kelimeler ayrı başlıkta (Zayıflar), doğru cümlelerde boşluk doldurarak tekrar.
10. Kelimeler Goethe-Zertifikat B1 Wortliste'den.
11. Cümle bol olsun, sürekli yenisi eklensin.
12. Log tutulsun.

## Yapı

- `index.html` + `js/app.js` (arayüz, kuyruk, log) · `js/grammatik.js` (çekim, cümle üretimi, kontrol) · `js/fsrs.js`
- Elle düzenlenen kaynaklar: `quellen/verben.txt`, `quellen/nomen.txt`, `quellen/nomen_extra.txt`, `quellen/rahmen.txt`,
  `quellen/woerter.txt` (sıfat/zarf/bağlaç…, **yalnız sona ekle**: kimlik satır sırasından), `quellen/pakete.txt` (konulu paketler, yeni paket sona),
  `quellen/wort_saetze.txt` (isim / diğer kelime çeviri cümleleri: `öğe | kelime | Almanca | Türkçe`),
  `quellen/saetze_refl.txt` (dönüşlü fiil çeviri cümleleri), `quellen/aufgaben.txt` (serbest yazma görevleri, sona ekle),
  `quellen/themen.txt` (17 B1 konusu ve öğe → konu ataması; "Konu" bölümü bunu kullanır),
  `quellen/saetze.txt` (çeviri cümleleri: `fiil | Almanca | Türkçe`; cümle sorusu Türkçeyi gösterir, Almancasını yazdırır)
- `python3 tools/build.py` index.html'deki js/css/daten bağlantılarına `?v=` sürüm özeti de yazar (önbellek): `js/app.js` ya da `css/stil.css` değişince de çalıştır.
- Üretilen: `daten/verben.js`, `daten/nomen.js`, `daten/woerter.js`, `daten/pakete.js`, `daten/saetze.js` → **elle düzenleme**, `python3 tools/build.py` çalıştır.
- Elle: `daten/feedback.js` (Claude'un düzeltmeleri, Geçmiş sekmesinde görünür), `daten/kancalar.js` (takılan kelimelere hafıza kancası).
- `log/log.csv` (uygulama yazar, `;` ayırıcı, UTF-8 BOM): `zeit;modus;id;item;frage;antwort;ergebnis;loesung;notiz`
  - Yazarak: `abr` (TR→DE fiil), `frm` (çekim), `satz` (cümle kur), `luecke` (Goethe boşluk), `wort` (isim TR→DE, artikelli), `prod` (diğer kelime TR→DE), `ndek` (n-Deklination), `refl` (dönüşlü zamir), `yeni` (derin tanıtım)
  - Seçmeli (Hızlı tur): `erk` (isim/diğer DE→TR), `bed` (fiil DE→TR; sadece fiil + edat gösterilir), `art` (der/die/das), `pretest` (yeni kelime ön testi: ergebnis `bekannt` = biliyordu, `neu` = tanıtıldı)
  - Fiil çekimi: `stamm` (bütün fiiller; cevap "er-Präsens, Präteritum, Perfekt": fährt, fuhr, ist gefahren; modal fiillerde Perfekt yok: kann, konnte)
  - Cümle aşamaları (`satz`, `nsatz`): ipucu seviyesi 0 → ipuçlu boşluk, 1 → boşluk, 2+ → tam cümle çevirisi
    Cümle havuzu (`satzPool` / `satzWahl`): kendi çeviri cümleleri + Goethe örnekleri + okuma metinlerinden gerçek cümleler; son görülenler (`S.kontext`) tekrar seçilmez, en eskisi döner. Az cümlesi olan öğeye `saetze.txt` / `wort_saetze.txt`'e cümle ekle.
  - Serbest yazma: `text` (id `a07` = `quellen/aufgaben.txt` görevi; antwort = metin, paragraflar ` ¶ `; notiz: kelime sayısı, zorunlu kelimeler)
  - Kalıplar: `quellen/kaliplar.txt` (fiil | Almanca | Türkçe; "Kalıplar" bölümü, "yazmaya ekle" ile yazma ekranına), `quellen/redemittel.txt` (yazma türü / konu kalıpları)
  - Okuma: `lesen` (Klexikon / DW metni okundu: ergebnis `gelesen`; Goethe Übungssatz görevi `quellen/goethe_lesen.json`: id `ge2:7` = ge2'nin 7. sorusu, antwort seçtiği, loesung doğrusu, görev sonu id `ge2` notiz `puan:2/3`. Metinler: `tools/klexikon.py`, `tools/dw_topthema.py` — okuma metnini ve sorularını Claude yazmaz), `lesen-wort` (metinde anlamına baktığı kelime: bilmediği kelimeler!)
  - Günün fiil metni: `fiilmetin` (her gün 04:00'te değişen gerçek metin, A2/B1 düzensiz fiillerin çekimli hâlleri işaretli; id = fiil, frage `form → hedef | cümle` (hedef: metindekinden başka zaman Präsens / Präteritum / Perfekt, ya da `mastar`), antwort seçtiği form, loesung doğru form; metin sonu id = metin, ergebnis `gelesen`, notiz `puan:x/y`). Çekim (`stamm`) sorusu yalnız düzensiz fiillerde ve formları görüldükten sonra (`S.formGesehen`).
  - Ünite: `unite` (kitaptaki konunun listesi; `quellen/uniteN.txt` + `uniteN_texte.txt` + `uniteN_aufgaben.txt` → `daten/unite.js`; id `u1-005` = kelime, frage = basamak `intro/mc/mcrev/art/lk/typ/formen` ya da `text/match/diktat/ordnen`; id `u1:t3` = 4. boşluklu metin, notiz `puan:x/y`; `u1:sort` ayırma sonucu `k:biliyor u:emin değil n:bilmiyor`; yazma görevleri modus `text`, id `u1-a1`).
  Yeni ünite: Tuna listeyi verince `quellen/unite2.txt` (biçim dosyanın başında), 6–8 boşluklu metin, 2 yazma görevi; `tools/build.py`'de `unite_lesen(2)` ekle. Goethe listesinde olmayan isimler `nomen_extra.txt`'e, sıfat/zarf/kalıp `woerter.txt` sonuna (her ünite kelimesinin ana listede karşılığı olsun).
  Aktif ünitenin kelimeleri Çalış'ta yeni öğe olarak önce gelir, metinleri boşluklu metin havuzuna girer. Ünite bitince `@geschlossen` ekle: açılışta ünitede çalışılmış (basamağa girmiş) kelimeler tekrar sistemine alınır, çalışılmayanlar alınmaz, bölüm gizlenir. Ünite 1 kapandı (15 kelime aktarıldı).
  - Paket: `paket` (id `p01:3` = 1. paketin 4. boşluğu; paket sonu `p01:pak`, notiz `puan:%`, `önce okudu`)
  - Durum: `dikkat` (ergebnis `bas-gec` = çok hızlı/boş, `cok-yanlis`), `leech` (ergebnis `takiliyor`: üç ayrı günde yanlış → kanca yaz)
  - ergebnis: `richtig`, `fast`, `falsch`, `neu`, `bekannt`
  - notiz: hata etiketleri, `öneri:X` (sistem önerisi kendi notundan farklıysa), `sek:N`, `ipucu:N`, `sayılmadı` (çok hızlı / boş: hedefe sayılmadı), `çok hızlı`, `yavaş`, `bilmiyorum`
- `log/zustand.json`: ilerleme yedeği (FSRS kartları). Ana bölüm **`akis` (Çalış)**: tek akış, günlük hedef 80; tanıma + yazma + cümle + yeni öğe (önce aktif ünite, sonra her 4 yeniden biri fiil `einf`, diğerleri ön test) karışık,
  tür dengesi hızlı (erk/bed/art) 4 : yazma 3 : cümle 3, aynı tür en fazla 2 kez üst üste; birikme eşiği 150 (diğer bölümlerde 80).
  Her 7 soruda bir ara etkinlik (log modus `akt`): `luecke` (gerçek metin pasajı, yalnız görülmüş kelimeler boşluk; id `luecke:<metin>`, notiz `puan:x/y`), `match` (eşleştirme, notiz `hata:n`),
  `diktat` (dinle–yaz; id `diktat:<öğe>`, antwort yazdığı, loesung cümle), `ordnen` (cümle dizme), günde en çok bir paket tekrarı; 25 cevaptan sonra fiil metni, 45'ten sonra yazma önerisi (`angebot`).
  Ön kontrol (`kontrol`, Çalış): vadesi gelen kelime tekrarları önce 10–15'lik listede (en eski vade önce; yazma / cümle sorusu varsa Türkçesi gösterilir → Almancası, yoksa Almancası → anlamı + artikeli),
  her satırda biliyorum / emin değilim / bilmiyorum, seçince cevap açılır. `biliyor`: o kelimenin vadesi gelen kartları kendi notuyla doğru sayılır (kartta `selbst`), hedefe sayılır;
  `emin-degil`: kartlar hemen normal sorulur (sayım asıl soruda); `bilmiyor`: tanıma kartı unutuldu (oturumda ~12 soru sonra cümle içinde yeniden), vadesi gelmiş öteki kartlar 3 saat sonra,
  bir hafta anlam sorusu cümle içinde (`satzBis`), cümle kartı açılır, 3 örnek cümle gösterilir. Bekleyen "emin değilim" kartları bitince sıradaki liste.
  Listeye girmeyen (normal sorulan): bugün tanıtılan kelime, son 3 saatte sorulan kart, çekim / dönüşlü / n-Deklination. Tekrar yokken 20–30 cevapta bir rastgele 8 öğrenilmiş kelime ("gerçekten biliyor musun?").
  Log: modus `kontrol`, id = öğe, frage `sıradaki tekrar` / `rastgele`, ergebnis `biliyor` / `emin-degil` / `bilmiyor`, loesung anlamı, notiz `kart:n`; özet satırı modus `akt`, id `kontrol`.
  Odak bölümleri (`MODI`): blitz (Hızlı tur), paket, normal (Karışık), verben, woerter, ndek, refl, thema, stark, lesen, fiilmetin, kalip, yazma, zayif, unite;
  her birinin hedefi/yeni sınırı ayrı, günlük sayaçlar `tage[gün].modi[bölüm]` (`bekannt`, `ungezaehlt` dahil). Hızlı tur'da fiil yok.
- Birimler (`öğe:tür`): isim `erk`, `art`, `wort`, `nsatz` (kelime cümlesi, log modus `nsatz`), `ndek` · fiil `bed`, `abr`, `frm`, `satz`, `refl` · diğer `erk`, `prod` · paket `pak`.
  Yeni kart öğrenme adımları (yalnız bugün tanıtılan öğede ya da ilk cevap tam doğru değilse): ilk gün 3 hatırlama (tanıtım → birkaç soru → ~10 dk), ertesi gün kesin tekrar;
  eski öğenin yeni açılan kartı ilk seferde doğruysa doğrudan takvime (kardeş kartı S ≥ 7 ise ~8 gün sonra); günlük yeni sınırları ayrı: `einst.neuWoerter` (25 kelime) ve `einst.neuVerben` (5 fiil); her ~6 soruda bugün öğrenilen bir öğe TR→DE yazdırılır.
  Seçmeli `erk` yarı yarıya ters yön (TR → DE, artikelli 6 şık, biri doğru ismin yanlış artikeli). `nsatz` yazma kartı oturunca açılır.
  Fiil tanıtımında (kalıp kutusu) ve fiil sorularının açıklamasında `quellen/kaliplar.txt` kalıpları gösterilir (`kalipZeile`, `kalipKutu`).
  Aynı öğe (bütün birimleri: artikel, anlam, yazma) en az 12 soru arayla ve günde en çok 4 (bugün öğrenilen) / 2 (eski) kez sorulur (`IZ_ABSTAND`, `izOk`, `S.iz`).
  Her 5 soruda bir "metinde" kartı: vadesi gelen `erk`/`bed` kartı okuma metinlerinden (DW / Klexikon / Goethe) gerçek bir cümlede, kelime vurgulu, anlamı seçmeli (log modus `erk`/`bed`, frage = cümle).
  1 günden fazla gecikmiş kartlar her iki soruda bir öne alınır; birikmede her 3. seçim en eski vade. Çekim (`stamm`) en az 8 soru arayla, günde en çok 4; yalnız düzensiz fiil ve formları görüldüyse.
  Genç kartlar (reps ≤ 5): küçük hata ya da unutulmuşsa ilk tekrarlar en çok 2 gün, sonra 4 gün ara.
  Kardeş kredisi (`kardesKredi`): yazarak doğru (wort → anlam + artikel, prod/nsatz → anlam, abr/satz → fiil anlamı; ters seçmeli → artikel) aynı öğenin kolay kartını sanal doğruyla ileri atar (son cevabı yanlış olan kart hariç).
  Öğe serisi: bütün kartlarında art arda 4+ doğru → kardeş kartlar 12–21 gün ileri (`seriSeyrek`). A1 (tier 1) kelimelerin anlam kartı (`erk`/`bed`) sorulmaz, artikeli sorulur.
  Yanlıştan sonra oturumda tek tekrar (başka cümle), ikinci yanlışta ertesi gün. Fiilin cümle / çekim / dönüşlü birimleri ilk başarılı anlamdan sonra 1 / 2 / 3 gün sonra açılır.
  Hızlı tur'da öğrenilen kelimenin yazma birimi tanıma/artikel kartı S ≥ 3 gün olunca açılır (fiilde hemen).
- Mimari ve gerekçeler: `TASARIM.md`.

## "Sonuçlarıma bak" dendiğinde

1. `git pull --rebase` (uygulama `log/` dosyalarını GitHub API ile doğrudan bu dala commit eder; pushlamadan önce de çek). `VERLAUF.md`'deki son notta yazan satırdan sonraki `log/log.csv` satırlarını oku.
2. `satz`, `luecke`, `abr`, `frm`, `wort`, `prod`, `paket` denemelerinin her biri için (özellikle `falsch` / `fast`) düzeltmeyi
   tam liste olarak yaz: kendi cevabı, doğrusu (isimler artikelli), kısa açıklama.
   Aynılarını `daten/feedback.js`'e ekle: `{ zeit, id, antwort, richtig, urteil, text }`.
   Seçmeli (`erk`, `bed`, `art`) yanlışlarını tek tek yazma: hangi kelimeler ve hangi artikeller karışıyor, toplu söyle.
3. Tekrarlayan hata etiketlerini say (dönüşlü zamir, edat, artikel/çekim, yardımcı fiil, kelime sırası …).
   Gerekirse o hatayı hedefleyen çeviri cümlesi ekle (`quellen/saetze.txt`, doğal Türkçe + doğru Almanca); kalıp üretici
   (`quellen/rahmen.txt`) yalnız çeviri cümlesi ve Goethe boşluğu olmayan fiillerde kullanılır. Yeni kelimeler B1 (seviye 3) önce gelir.
4. Kendine verdiği notu kontrol et (`öneri:` olan satırlar): fazla cömert ya da sert olduğu yerleri söyle.
   Baştan savma işaretleri: `sayılmadı`, `dikkat` satırları, çok kısa `sek:`; varsa kısaca ve suçlamadan söyle.
   `pretest` ile "biliyor" denip sonra yazmada (`wort`/`prod`/`abr`) hep yanlış olan kelimeleri belirt (yanlışlıkla bilinen sayılmış).
5. `leech` satırlarındaki her kelimeye `daten/kancalar.js`'e kısa Türkçe hafıza kancası yaz (anahtar: öğe kimliği, log'daki `id`):
   Almanca kelimenin sesine benzeyen Türkçe kelime + anlamla birleşen bir sahne; isimde artikel için kural ya da renk ipucu
   (der mavi, die kırmızı, das yeşil). Tek satır, emin olmadığın Almanca bilgi ekleme.
5b. `text` satırlarındaki her metni cümle cümle düzelt (kendi cümlesi → doğrusu → kısa açıklama), sonunda B1 Schreiben
   ölçütüne göre kısa değerlendirme (görev maddeleri, bağlaçlar, hitap/kapanış) ve düzeltilmiş tam metin. `daten/feedback.js`'e de ekle.
5c. Son günlerde öğrendiği kelime ve fiillerden (log'daki `pretest`/`yeni`/`erk` satırları) 10–20 yeni çeviri cümlesi yaz,
   `quellen/saetze.txt`'e (fiil) ya da `quellen/wort_saetze.txt`'e (isim / kelime) ekle: her cümlede bir fiil + en az bir yeni isim ya da kelime; fiil kimliği cümlenin ana fiili.
   Dönüşlü fiil cümleleri `quellen/saetze_refl.txt`'e.
   Her yeni cümle için `quellen/glossen.txt`'e de satır ekle: `Almanca cümle | die Regierung = hükümet; …` (hedef kelime ve A1 kelimeleri hariç;
   tam cümle sorusunda öğrencinin bilmediği kelimeler bu sözlükten gösterilir).
5d. `lesen-wort` satırlarındaki kelimeler öğrencinin okurken bilmediği kelimeler: yeni cümle ve paketlerde öncelik ver.
    `kontrol` satırlarında `bilmiyor` olan kelimeler de öyle: her birine 2–3 yeni çeviri cümlesi yaz (Tuna "bilmiyorum"da daha çok cümle istiyor).
    `biliyor` denip sonra yazmada / cümlede yanlış yapılan kelimeleri söyle (kendi notu cömert olabilir).
   Yeni okuma metni için `quellen/pakete.txt`'e paket + `quellen/lesen.txt`'e 4 richtig/falsch ifadesi ekle.
6. Paketler bittiyse ya da "yeni paket yaz" denirse `quellen/pakete.txt`'nin sonuna yeni paket ekle: bir sahne (konu değil:
   "postanede", "ev arkadaşıyla" gibi), 10 kelime (Goethe B1 listesinden; zayıf / takılan kelimelere öncelik), ~90–110 kelimelik
   B1 metni (Präsens / Perfekt, yan cümle), Türkçesi. Biçim dosyanın başında.
7. `VERLAUF.md`'ye tarihli not düş: ne yapıldı, hatalar, eklenenler, son incelenen log satırı (zaman damgası).
8. Doğrula ve pushla:
   ```
   python3 tools/build.py && node tests/test_grammatik.js && node tools/stichprobe.js 1 && node tools/stichprobe_module.js refl
   ```
   Build hata verirse (yanlış artikel, bulunamayan isim) düzelt. Yeni kalıpların örnek cümlelerini gözle kontrol et.
   `js/app.js` değiştiyse ve Playwright varsa: `node tests/e2e_smoke.js` (tarayıcıda bir günlük akış + ertesi gün).

## İçerik eklerken

- n-Deklination listesi: `tools/build.py` içinde `WEAK_LIST` (bileşikler otomatik), tuzaklar `FALLE`. Cümle şablonları `js/grammatik.js` → `ND_PERSON / ND_TIER / ND_SACHE`.
- Dönüşlü alıştırmadan çıkarılan fiiller: `REFL_AUS` (tümleç zorunlu ya da öznesi şey). Emir kipi yalnız `IMP_OK` fiillerinde.

- Yeni isim Goethe listesinde yoksa `quellen/nomen_extra.txt`'e çoğuluyla ekle.
- Kalıp satırı biçimi `quellen/rahmen.txt` başında anlatılıyor (`P` kişi, `0` artikelsiz, `~` iyelik, `*` sıfat, `+` belirsiz, `(Pl)` çoğul, `T =` zamanlar, `X =` kapatılan özellikler).
- Anlamsız cümle üreten kombinasyonlardan kaçın. Emin olmadığın Almanca'yı ekleme.
