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

- **Çalış:** karışık sorular. Yeni fiil ya da isim önce tanıtılır ("Zaten biliyorum" ile atlayabilirsin).
- **Zayıflar:** yanlış yaptıkların, yeni cümlelerde tekrar.
- **Kelimeler:** bütün liste, durumlarıyla. İstediğini "Ekle" ile hemen öğrenmeye alabilirsin.
- **Geçmiş:** günlük hedef, son 21 gün, Claude'un düzeltmeleri, son cevaplar.
- **Ayarlar:** günlük hedef, günde kaç yeni fiil/isim, log klasörü, yedek.

## Kısayollar

`Enter` kontrol / geç · `1` `2` `3` not (yanlış / küçük hata / doğru) · `Boşluk` anlamı göster · `B` zaten biliyorum ·
`a:` → ä, `o:` → ö, `u:` → ü, `s:` → ß

Artikel renkleri: <b>der</b> mavi · <b>die</b> kırmızı · <b>das</b> yeşil · çoğul mor.

Nasıl çalıştığı ve neden: [TASARIM.md](TASARIM.md)
