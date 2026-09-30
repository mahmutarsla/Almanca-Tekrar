# Almanca Tekrar

A2 → B1 için yerel çalışma uygulaması. Kelimeler Goethe-Zertifikat B1 listesinden, tekrar zamanlaması FSRS
(Anki'nin algoritması). Cümleler her seferinde yeniden üretilir, böylece cümleyi ezberleyemezsin, fiili bilmen gerekir.

## Kullanım

1. Repoyu indir (`git clone` ya da GitHub'dan ZIP).
2. `index.html`'i **Chrome ya da Edge** ile aç.
3. **Ayarlar → Klasörü bağla** ile repo klasörünü seç. Cevaplar `log/log.csv`'ye yazılır.
4. Çalıştıktan sonra log'u pushla:
   ```
   git add log && git commit -m "log" && git push
   ```
5. Claude'a **"sonuçlarıma bak"** de. Düzeltmeleri yazar, tekrar eden hatalarına göre yeni cümle kalıbı ekler, pushlar.
   Sen `git pull` yapınca yeni içerik gelir.

## Sekmeler

- **Çalış:** karışık sorular. Yeni fiil ya da isim önce tanıtılır, bir kez yazarsın ("Zaten biliyorum" ile atlayabilirsin).
  Üstteki **Bölüm** menüsü, her birinin kendi günlük hedefi ve yeni sınırı var (Ayarlar'dan değişir):

  | Bölüm | Hedef (soru) | Günde yeni |
  |---|---|---|
  | Karışık | 20 | 6 (fiil + isim) |
  | Fiiller | 20 | 3 fiil (her fiil ~5 soru açar) |
  | Kelimeler (isimler) | 20 | 10 isim |
  | n-Deklination | 15 | 5 isim |
  | Dönüşlü fiiller | 15 | 3 fiil |
  | Zayıflar | 10 | — |
- **Zayıflar:** yanlış yaptıkların, yeni cümlelerde tekrar.
- **Kelimeler:** bütün liste, durumlarıyla. İstediğini "Ekle" ile hemen öğrenmeye alabilirsin.
- **Geçmiş:** günlük hedef, son 21 gün, Claude'un düzeltmeleri, son cevaplar.
- **Ayarlar:** bölüm başına günlük hedef ve yeni sınırı, log klasörü, yedek.

## Kısayollar

`Enter` kontrol / geç · `1` `2` `3` not (yanlış / küçük hata / doğru) ·
`a:` → ä, `o:` → ö, `u:` → ü, `s:` → ß

Artikel renkleri: <b>der</b> mavi · <b>die</b> kırmızı · <b>das</b> yeşil · çoğul mor.

Nasıl çalıştığı ve neden: [TASARIM.md](TASARIM.md)
