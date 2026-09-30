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
- Elle düzenlenen kaynaklar: `quellen/verben.txt`, `quellen/nomen.txt`, `quellen/nomen_extra.txt`, `quellen/rahmen.txt`
- Üretilen: `daten/verben.js`, `daten/nomen.js` → **elle düzenleme**, `python3 tools/build.py` çalıştır.
- `daten/feedback.js`: Claude'un düzeltmeleri, uygulamada Geçmiş sekmesinde görünür.
- `log/log.csv` (uygulama yazar, `;` ayırıcı, UTF-8 BOM): `zeit;modus;id;item;frage;antwort;ergebnis;loesung;notiz`
  - modus: `abr` (TR→DE fiil), `bed` (DE→TR anlam), `frm` (çekim), `satz` (cümle kur), `luecke` (Goethe boşluk), `wort` (isim), `ndek` (n-Deklination), `refl` (dönüşlü zamir), `yeni`
  - ergebnis: `richtig`, `fast`, `falsch`, `neu`, `bekannt`
  - notiz: hata etiketleri, `öneri:X` (sistem önerisi kendi notundan farklıysa), `sek:N`, `ipucu:N`
- `log/zustand.json`: ilerleme yedeği (FSRS kartları).
- Mimari ve gerekçeler: `TASARIM.md`.

## "Sonuçlarıma bak" dendiğinde

1. `git pull`. `VERLAUF.md`'deki son notta yazan satırdan sonraki `log/log.csv` satırlarını oku.
2. `satz`, `luecke`, `abr`, `frm`, `wort` denemelerinin her biri için (özellikle `falsch` / `fast`) düzeltmeyi
   tam liste olarak yaz: kendi cevabı, doğrusu (isimler artikelli), kısa açıklama.
   Aynılarını `daten/feedback.js`'e ekle: `{ zeit, id, antwort, richtig, urteil, text }`.
3. Tekrarlayan hata etiketlerini say (dönüşlü zamir, edat, artikel/çekim, yardımcı fiil, kelime sırası …).
   Gerekirse `quellen/rahmen.txt`'e o hatayı hedefleyen kalıp ya da isim ekle (Goethe B1 listesinden, artikelli).
4. Kendine verdiği notu kontrol et (`öneri:` olan satırlar): fazla cömert ya da sert olduğu yerleri söyle.
5. `VERLAUF.md`'ye tarihli not düş: ne yapıldı, hatalar, eklenenler, son incelenen log satırı (zaman damgası).
6. Doğrula ve pushla:
   ```
   python3 tools/build.py && node tests/test_grammatik.js && node tools/stichprobe.js 1 && node tools/stichprobe_module.js refl
   ```
   Build hata verirse (yanlış artikel, bulunamayan isim) düzelt. Yeni kalıpların örnek cümlelerini gözle kontrol et.

## İçerik eklerken

- n-Deklination listesi: `tools/build.py` içinde `WEAK_LIST` (bileşikler otomatik), tuzaklar `FALLE`. Cümle şablonları `js/grammatik.js` → `ND_PERSON / ND_TIER / ND_SACHE`.
- Dönüşlü alıştırmadan çıkarılan fiiller: `REFL_AUS` (tümleç zorunlu ya da öznesi şey). Emir kipi yalnız `IMP_OK` fiillerinde.

- Yeni isim Goethe listesinde yoksa `quellen/nomen_extra.txt`'e çoğuluyla ekle.
- Kalıp satırı biçimi `quellen/rahmen.txt` başında anlatılıyor (`P` kişi, `0` artikelsiz, `~` iyelik, `*` sıfat, `+` belirsiz, `(Pl)` çoğul, `T =` zamanlar, `X =` kapatılan özellikler).
- Anlamsız cümle üreten kombinasyonlardan kaçın. Emin olmadığın Almanca'yı ekleme.
