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
