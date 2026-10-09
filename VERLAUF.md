# Verlauf

Claude'un tuttuğu çalışma günlüğü. Her "sonuçlarıma bak" sonrası tarihli bir not eklenir.
Son incelenen log satırı en alttaki notta yazar.

## 2026-09-27 — sistem kuruldu

- Yeni sistem (bu repo) kuruldu: FSRS-6 zamanlayıcı, üretilen cümleler, Goethe B1 listesi.
- Veri: 671 fiil anlamı (197'si cümle kalıplı), 1481 artikelli isim.
- Önceki sistemden bilinen tekrarlayan hatalar (27.09.2026 durumu), yeni sistem bunları hedefliyor:
  dönüşlü zamiri unutmak · kelime sırası (nicht, nur, überhaupt) · sıfat sonları · Türkçe geçmiş zamanı
  Perfekt yapmamak · "senin" için sein- (doğrusu dein-) · fragen / bitten + Akk · wo? → Dativ ·
  ä yazmamak · wo(r)- soruları · glauben an ↔ denken an, reagieren auf karışıyor.
- Son incelenen log satırı: yok (log henüz boş).

## 2026-09-30 — n-Deklination, dönüşlü fiiller, mantık denetimi

- Yeni odak modları: n-Deklination (50 isim + 20 tuzak), Dönüşlü fiiller (77 fiil; Präsens / Perfekt / emir kipi).
- Düzeltilen hatalar: dönüşlü fiillerde Perfekt sein (sich umziehen → hat), ausziehen (evden) → ist, liegen/sitzen/stehen ist de kabul,
  Genitiv (des Arztes, des Sees), sich einigen tekil özne, eksik n-Deklination işaretleri (Geldautomat, Vorname, Familienname).
- Yapı: anlamdaşlar yanlış sayılmıyor, tanıtımda yazdırma, tekrar eden / bölgesel kelimeler çıkarıldı, ek isimlerde tanıtım çökmesi.
- Son incelenen log satırı: yok (log henüz boş).

## 2026-10-01 — verimlilik turu: Hızlı tur, paketler, kancalar, baştan savmaya karşı

- Yeni bölümler: **Hızlı tur** (seçmeli anlam + der/die/das, yeni kelimede ön test: bilinen kelime yük olmadan geçer),
  **Paketler** (12 sahne × 10 kelime + B1 metni + boşluk). Günlük plan şeridi: Hızlı tur → Paket → Karışık.
- Yeni veri: `quellen/woerter.txt` (592 sıfat / zarf / bağlaç …), `quellen/pakete.txt` (p01–p12), `daten/kancalar.js` (boş),
  isimlerde artikel ek kuralı (533 isim; -ung → die %100, -e → die %87 …).
- Karışık / Fiiller artık yalnız yazarak; seçmeli ve artikel soruları Hızlı tur'da. Hızlı tur'da öğrenilen ismin yazma kartı,
  tanıma / artikel kartı oturunca (S ≥ 3 gün) açılır; fiillerde hemen.
- Baştan savmaya karşı: düşünme süresi (1,2 sn), çok hızlı / boş cevap hedefe sayılmaz, dikkat dedektörü, okuma süreleri,
  birikme sınırı (yazma tekrarları birikince Hızlı tur da yeni kelime vermez), ara sonrası mesaj, gün eşiği (10 cevap).
- Takılan kelime: üç ayrı günde yanlış → log'a `leech`, Claude kanca yazar.
- Düzeltilen eski hata: kartın üstündeki durum satırı TR→DE sorularında cevabı (öğenin Almancasını) gösteriyordu.
- Son incelenen log satırı: yok (log henüz boş).

## 2026-10-02 — cümle sorusu: tam Türkçe cümle → Almanca; B1 önce

- Cümle sorusu artık özne / nesne / fiil parçaları yerine tam Türkçe cümle gösteriyor (`quellen/saetze.txt`: 849 Goethe örneği,
  612 fiil, elle çevrildi). İpucu: seviye 0'da Almanca fiil + hâller, 1'de sadece hâl kalıbı, sonra yok. Kalıp üretici yalnız yedek.
- Yeni kelime sırası B1 → A2 → A1 (Hızlı tur, Karışık, Kelimeler).
- Düzeltmeler: `essen` yazınca "das Essen anlamdaşı" uyarısı (doğru cevap önce kontrol edilir); isim örneğinde boşluk artikel + isim.
- Son incelenen log satırı: yok.

## 2026-10-02 — ilk log incelemesi (2026-09-30 17:12 – 2026-10-02 11:13)

- Hatalar: artikelsiz isim (Geld, Stadt, Urlaub), schenken ↔ schicken, wohnen Perfekt (hat), fahren Partizip (gefahren),
  du fährst, soru cümlesinde fiil başa, verschreiben, Apotheke yazımı. Düzeltmeler `daten/feedback.js`'te.
- Kendine not: 10 kez öneri "yanlış" iken 2–3 verdi (çoğu artikelsiz isim ve yanlış fiil). Nachname gerçekten doğruydu.
- Sistem hataları düzeltildi: essen anlamdaş döngüsü (aynı soru 11 kez geldi; ayrıca az önce cevaplanan kart 2 dk geri gelmez),
  büyük/küçük harf farkı "umlaut" sayılıyordu, tek harf yazım hatası "çekim" sayılıyordu, pakette doğru kelime yanlış biçim → küçük hata,
  artikel 3,5 sn'ye kadar doğru, Familienname için Nachname kabul, Vorname Türkçesi "ön ad".
- Son incelenen log satırı: 2026-10-02 11:13:05.

## 2026-10-02 — log incelemesi (11:13 – 12:34) + ilk yazma metni

- İlk metin (a01, hava, 114 kelime) düzeltildi: wurde/wollte, wenn/als, sıfat çekimi (des schlechten Wetters, das traditionelle Essen),
  sich vorstellen, Hoffe-cümlesinde fiil yeri; 3. madde (öneri) somut değil.
- Hatalar: widersprechen (Dat: Ihnen, Partizip widersprochen), vorschlagen (ayrılan; Prät. schlug), verzichten auf, sich bemühen um,
  artikel: der Nebel (3 kez das), der Schnee/Regen/Himmel, die Wolke/Luft, das Eis/Frühjahr/Training, die Kritik.
- Eklendi: 13 çeviri + 4 dönüşlü cümle (yeni öğrenilen kelimelerle), der Nebel için kanca.
- Son incelenen log satırı: 2026-10-02 12:34:09.

## 2026-10-03 — log incelemesi (2026-10-02 12:34 – 2026-10-03 12:13) + yapı değişiklikleri

- Hatalar: zweifeln an (daran, dass), verzichten auf, sich bemühen um ↔ bewerben, die Kritiken, Partizip'ler (geworden, getroffen + hat,
  brachte/gebracht, blieb), p02 (Anzeige, unterschreiben). Artikel: die Praxis (6× der), der Rat (4× das), der Regen, die Regel, die Geduld.
- Kendine not: 4 satırın hepsinde cömert (fast yerine falsch olmalıydı).
- Yapı: Hızlı tur'da fiil yok; Fiiller günlük plana girdi; çekim sorusu bütün fiillere (er-Präsens, Präteritum, Perfekt; modalda Perfekt yok);
  cümle aşamaları (ipuçlu boşluk → boşluk → tam cümle); Türkçe → Almanca seçmeli %75; yazma her gün; yazma birimi tanımadan bir gün sonra açılır.
- Eklendi: 6 fiil + 6 kelime cümlesi, die Praxis ve der Rat için kanca.
- Son incelenen log satırı: 2026-10-03 12:13:28.

## 2026-10-06 — log incelemesi (2026-10-03 12:13 – 2026-10-06 08:23) + tekrar döngüsü düzeltmesi

- Sorun (Tuna): yanlış yapılan öğe aynı cümleyle art arda geliyordu (sich verlaufen 3 dk'da 3×, reagieren auf, das Gedicht), diğer tekrarlar alta kalıyordu.
  Düzeltme: yanlıştan sonra oturumda yalnız 1 tekrar (6 soru sonra, başka cümleyle; Goethe boşluğu az önce sorulduysa çeviri cümlesi);
  orada da yanlışsa ertesi güne. Bugün yanlış yapılanlar kuyrukta öne geçmez (yalnız önceki günlerin yanlışları öne).
- Cümlesi olmayan 62 fiile 184 çeviri cümlesi (kalıp üreticili "fiil | özne | nesne" sorusu artık çıkmıyor).
- Hatalar: Partizip (verlaufen, gerechnet, geblitzt, vorgeschlagen, ist gekommen, getroffen), sich beschweren bei (3 gün yanlış → kanca),
  das Gedicht ↔ gedacht (kanca), widersprechen, zustimmen, sich wenden an, könnte/konnte, -eln: ich zweifle.
  Artikel: das Amt (2× der), die Operation, die Unterschrift, das Rezept (der/die), das Seminar, die Situation, der Roman, der Regen.
- Kendine not: 30 öneri satırının 27'sinde cömert (24'ünde sistem "yanlış" derken küçük hata / doğru verdi; özellikle çekim: fahrt, trefft, bliebt).
- Eklendi: 46 düzeltme (feedback.js), 2 kanca, 8 Partizip cümlesi.
- Son incelenen log satırı: 2026-10-06 08:23:05.

## 2026-10-06 (akşam) — tekrar düzeni

- Döngü: aynı öğe 12 soru arayla, günde en çok 4 (yeni) / 2 (eski); ekstra / Zayıflar da bu sınıra uyar; şıklar son 10 soruda tekrar etmez.
- Fiil anlamı (`bed`) kartları 3+ gündür alta kalıyordu (yalnız Fiiller bölümünde, tür dengesinde en küçük pay): gecikmiş kartlar artık öne.
- Çekim sınırı (6 soru ara, günde 5). "Metinde" kartı (her 5 soruda bir, gerçek metin cümlesi). Genç kartlara kısa aralık.
- Gerçek ilerleme dosyasıyla test: 175 soruda 1+ gün gecikmiş 199 → 100, öğe günde en çok 2×, en kısa ara 13 soru.

## 2026-10-08 — tek akış (Çalış), ünite 1 kapandı, kalıplar

- Tuna: çok fazla bölüm vardı → tek **Çalış** akışı (hedef 80): tanıma, yazma, cümle, yeni kelime / fiil ve her 7 soruda bir ara etkinlik
  (metinde boşluk — gerçek metinden, yalnız görülmüş kelimeler boşluk; eşleştirme; dinle–yaz; cümle dizme; günde bir paket tekrarı),
  25 cevaptan sonra fiil metni, 45'ten sonra yazma önerisi. Eski bölümler "Bölüm" listesinde odak olarak duruyor.
- Ünite 1 (Freundschaft und Beziehungen) kapandı: ünitede çalışılan 15 kelime tekrar listesine alındı (die Clique, die Mahnung, die Forderung,
  die Erwartung, die Behauptung, eingespannt sein, vor Gericht gehen, feststellen, sich einigen, erleichtern, beweisen, sich aufregen, schweigen,
  übertreiben, verhindern); çalışılmayanlar alınmadı. Ünite metinleri boşluklu metin havuzunda. Ünite metninde görülmemiş kelime artık boşluk olmaz.
- Fiil tanıtımında kalıp kutusu, fiil sorularının açıklamasında kalıp satırı.
- Test: 4 günlük simülasyon (tekrar aralığı ≥ 12 soru, öğe günde ≤ 4), gerçek ilerleme dosyasıyla 93 adım (dengeli tür dağılımı), e2e duman testi.

## 2026-10-08 (akşam) — veri incelemesi: bildiğin kelime neden hâlâ geliyor, cümle neden değişmiyor

- Gerçek ilerleme (2026-10-08 21:25): 249 vadeli kartın 141'i hiç sorulmamış ek birim (ausfüllen'in anlam kartı, der Pass'ın anlam / artikel kartı …),
  ~75'i hiç ya da son 3+ denemede yanlış yapılmamış öğelerden. Sebep: her kelimenin 3–5 ayrı kartı (anlam, artikel, yazma, cümle) ayrı takvimle,
  yeni açılan her kart bilinen kelimede de 2 günde 3 kez soruluyordu; A1 kelimelerin (werden, der Supermarkt) anlamı soruluyordu.
- Düzeltme: kardeş kredisi (yazarak doğru → aynı kelimenin anlam / artikel kartı ileri), öğrenme adımları yalnız bugün tanıtılan kelimede,
  iyi bilinen kelimenin yeni kartı ilk seferde doğruysa ~8 gün sonra, A1 anlam kartları yok, art arda 4+ doğru → 12–21 gün (seri).
  6 günlük simülasyon (günde 80 cevap): eski sistemde birikme 252 → 347, 6. gün 80 sorunun 48'i bilinen kelime; yenisinde 201 → 176, 21.
- Cümle hep aynıydı: 125 öğrenilen öğenin 102'sinde 3'ten az cümle. Cümle havuzu (kendi + Goethe örneği + okuma metinleri, son görülen tekrar seçilmez)
  ve 152 yeni çeviri cümlesi (67 öğe + cümlesi hiç olmayan 11 öğe). Şimdi 125 öğrenilen öğenin 124'ünde 3+ cümle (yalnız vor Gericht gehen'de yok).
- Fiil metni testi: 6 cevabın 6'sı Präteritum'du. Artık metindekinden başka zamana geçiş (Präsens / Präteritum / Perfekt dengeli) ve mastar sorusu,
  şıklar tipik hatalar (fliehte, ist geflieht, hat geflohen, fahrt).
- Küçük hatalar: ayrılabilen fiil dizini (fährt → abfahren sanılıyordu), "metinde" kartında cümle ortasındaki isim fiil sanılıyordu (Schienen → scheinen),
  eingespannt ipucu cevabı gösteriyordu, pakette artikelli cevap yanlış sayılıyordu, Goethe örnekleri yanlış kelimeye bağlanıyordu
  ("ein-" → einfach / eingespannt, "un-" → und) ve yarım örnekler ("Herr Huber ist bis zum") gösteriliyordu.
- Kanca: die Burg, sich beruhigen, sich wenden an, verzichten auf, die Geduld, sich verlaufen.
- Düzeltme listesi (feedback.js) bu notta yazılmadı; son incelenen log satırı hâlâ 2026-10-06 08:23:05.

## 2026-10-09 — "gerçekten biliyor musun?" listesi

- Tuna: 20–30 tekrarda bir rastgele kelime / fiillerle toplu kontrol istedi. Çalış'ta 20–30 cevapta bir 8 kelimelik liste: biliyorum / bilmiyorum, sonra anlamı görünür ("yanılmışım" ile geri alınır).
- Bilmiyorum: 3 örnek cümle (kendi + Goethe + gerçek metin), tanıma kartı unutuldu sayılır, oturumda ~8–12 soru sonra cümle içinde yeniden, bir hafta anlam sorusu cümle içinde, cümle kartı açılır, öteki kartlar en geç yarın.
- "Sonuçlarıma bak"ta `kontrol` / `bilmiyor` kelimelerine yeni cümle yazılacak.
- Aynı gün (Tuna): liste 10–15 kelime olsun, "emin değilim" de olsun, her tekrar böyle değerlendirilsin → **ön kontrol**: vadesi gelen kelime tekrarları önce listede
  (yazma sorusu varsa Türkçesi → Almancası, yoksa Almancası → anlamı), biliyorum = bugünkü tekrar yapılmış, emin değilim = hemen sorulur, bilmiyorum = sıklaşır + cümle.
  Gerçek veriyle: 136 vadeli → 3 liste + 60 soruda 73'e indi. Telefon genişliğinde yatay taşma (Bölüm listesi) da düzeltildi.
