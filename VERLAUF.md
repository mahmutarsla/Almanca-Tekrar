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
