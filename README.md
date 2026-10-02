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
5. Claude'a **"sonuçlarıma bak"** de. Düzeltmeleri yazar, takıldığın kelimelere hafıza kancası yazar,
   tekrar eden hatalarına göre yeni cümle kalıbı ekler, pushlar. Sen `git pull` yapınca yeni içerik gelir.

## Günlük plan

Çalış sekmesinin üstündeki şerit bugünün planı: **1 Hızlı tur → 2 Paket → 3 Karışık** (toplam ~25 dk).
Uygulama yeni günde planın ilk bitmemiş adımıyla açılır. En az 10 sayılan cevap verdiğin gün seriye sayılır.

| Bölüm | Grup | Hedef | Günde yeni | Ne yapar |
|---|---|---|---|---|
| Hızlı tur | Ezber | 40 | 10 bilinmeyen kelime | Seçmeli anlam + der/die/das. Yeni kelime önce sınanır: biliyorsan tekrar yükü olmadan geçer. |
| Paketler | Ezber | 10 | 1 paket | Bir sahnenin 10 kelimesi + kısa B1 metni, sonra metinde boşluk doldurma. |
| Karışık | Yazarak | 20 | 4 öğe | Türkçe cümleyi Almancaya çevirme (849 cümle), TR→DE kelime / fiil, çekim, Goethe boşlukları. |
| Fiiller | Yazarak | 20 | 3 fiil | Yalnız fiiller (her fiil ~4 soru açar). |
| Kelimeler (yazarak) | Yazarak | 20 | 0 | Tanıdığın isim ve kelimeleri artikeliyle yazma. Hızlı tur'da öğrendiklerin buraya kendiliğinden gelir. |
| n-Deklination | Dilbilgisi | 15 | 5 isim | den Kollegen, dem Studenten … |
| Dönüşlü fiiller | Dilbilgisi | 15 | 3 fiil | mich / dich / sich … |
| Zayıflar | | 10 | — | Yanlış yaptıkların; takılanlar (🪝) en üstte. |

Hedefler ve sınırlar Ayarlar'dan değişir. Bir bölümde çalışınca diğerinin sayacı değişmez.

Yeni kelimeler önce B1 seviyesinden gelir (sonra A2, A1). Yeni kelime yolu: **tanı → seçmeli tekrar → (oturunca) yazarak üret**. Tanıma kartı birkaç gün dayanınca aynı kelimenin
yazma sorusu Karışık / Kelimeler'de açılır. Fiillerde yazma hemen açılır, çünkü cümle alıştırmaları fiilden gelir.

## Baştan savma günleri için

Uygulama yorgun ya da isteksiz çalıştığın anları fark edip kendini ayarlar:

- **Önce aklından söyle:** seçenekler 1,2 sn sonra açılır. Açılır açılmaz basılan cevap okunmamış sayılır, hedefe sayılmaz.
- **Boş / rastgele cevap** (`asdf`, `xxxx`, tek harf) "bilmiyorum" sayılır ve hedefe sayılmaz. "Bilmiyorum" deyince kendine not veremezsin.
- **Dikkat uyarısı:** son 8 cevabın 5'i yanlışsa ya da 3'ü çok hızlı / boşsa 10 soru boyunca yeni kelime gelmez, kolay sorular gelir.
- **Okumadan geçme yok:** tanıtım kartı en az 2 sn, paket metni kelime sayısına göre 6–15 sn ekranda kalır.
- **Birikme sınırı:** 80'den fazla tekrar birikmişse yeni kelime gelmez; önce hâlâ hatırladıkların sorulur.
  Karışık'taki yazma tekrarları birikmişse Hızlı tur da yeni kelime vermez (kolay kısmı yapıp zoru atlamaya karşı).
- **Ara verdiysen:** 3+ gün sonra açınca "Hızlı tur'u bitirmen yeter" der, suçlamaz.
- **Takılan kelime:** üç ayrı günde yanlış yaptığın kelime 🪝 ile işaretlenir; Claude "sonuçlarıma bak"ta ona hafıza kancası yazar,
  kanca o kelime her yanlışta gösterilir.

## Sekmeler

- **Çalış:** plan şeridi, bölüm seçimi, sorular.
- **Zayıflar:** yanlış yaptıkların, yeni cümlelerde tekrar. Takılanlar ve kancaları en üstte.
- **Kelimeler:** bütün liste (fiil, isim, diğer), durumlarıyla. İstediğini "Ekle" ile hemen öğrenmeye alabilirsin.
- **Geçmiş:** bölüm başına bugünkü durum, son 21 gün, sayılmayan cevaplar, Claude'un düzeltmeleri, son cevaplar.
- **Ayarlar:** bölüm başına günlük hedef ve yeni sınırı, hedef hatırlama, log klasörü, yedek.

## Kısayollar

Seçmeli: `1`–`4` seç · `0` bilmiyorum · Artikel: `1` der · `2` die · `3` das ·
Yazarak: `Enter` kontrol / geç · `1` `2` `3` not (yanlış / küçük hata / doğru) ·
`a:` → ä, `o:` → ö, `u:` → ü, `s:` → ß

Artikel renkleri: <b>der</b> mavi · <b>die</b> kırmızı · <b>das</b> yeşil · çoğul mor.

Nasıl çalıştığı ve neden: [TASARIM.md](TASARIM.md)
