# Almanca Tekrar

A2 → B1 için yerel çalışma uygulaması. Kelimeler Goethe-Zertifikat B1 listesinden, tekrar zamanlaması FSRS
(Anki'nin algoritması). Cümleler her seferinde yeniden üretilir, böylece cümleyi ezberleyemezsin, fiili bilmen gerekir.

## Kullanım (site)

Uygulama GitHub Pages'ta: **https://mahmutarsla.github.io/Almanca-Tekrar/** — Claude pushlayınca kendiliğinden güncellenir,
sayfayı yenilemen yeter. Ayarlar → **GitHub'a otomatik kayıt**'a bir kez anahtar girersen cevaplar ve ilerleme repoya yazılır;
sonra Claude'a "sonuçlarıma bak" demen yeter (push yok, telefonda da çalışır).

## Kullanım (yerel, eski yol)

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

Tek düğme: **Çalış** (günde 80 cevap, ~30–40 dk). Her şey tek akışta karışık gelir:
seçmeli anlam ve der/die/das, Türkçeden Almancaya kelime / fiil yazma, cümle çevirisi, yeni kelime ön testi ve fiil tanıtımı,
her 5 soruda bir **metinde** kartı (öğrendiğin kelime gerçek bir metin cümlesinde) ve her 7 soruda bir **ara etkinlik**:

- **Metinde boşluk:** DW / Klexikon / Goethe / kitap ünitesi metninden 2–5 cümle. Yalnız daha önce gördüğün kelimeler boşluk olur,
  görmediğin kelimeler yazılı durur (basınca anlamı); kelime kutusunda 2 çeldirici.
- **Eşleştirme**, **dinle–yaz** (tarayıcı Almanca okur), **cümle dizme** (fiilin yeri), günde en çok bir **paket tekrarı**.
- 25 cevaptan sonra **günün fiil metni**, sırası geldiyse 45 cevaptan sonra **yazma görevi** önerilir ("Sonra" denebilir).
- 20–30 cevapta bir **gerçekten biliyor musun?**: rastgele 8 öğrendiğin kelime / fiil, her birinde biliyorum / bilmiyorum (sonra anlamı görünür).
  Bilmiyorum: 3 örnek cümle, kelime aynı oturumda ve bir hafta boyunca cümle içinde, daha sık gelir.

Uygulama açılınca Çalış'la başlar. En az 10 sayılan cevap verdiğin gün seriye sayılır.
Belirli bir şeye odaklanmak istersen **Bölüm** listesinden tek tür seçebilirsin:

| Odak bölümü | Hedef | Günde yeni | Ne yapar |
|---|---|---|---|
| Hızlı tur | 40 | 10 bilinmeyen kelime | Yalnız seçmeli anlam + der/die/das. |
| Paketler | 10 | 1 paket | Bir sahnenin 10 kelimesi + kısa B1 metni, sonra metinde boşluk doldurma. |
| Karışık / Fiiller / Kelimeler | 20 / 15 / 20 | 4 / 3 / 0 | Yalnız yazarak sorular. |
| Konu | 30 | 15 kelime | Seçtiğin B1 konusunun (17 konu) kelime ve fiilleri. |
| n-Deklination / Dönüşlü / Düzensiz fiiller | 15 / 15 / 20 | 5 / 3 / 5 | Dilbilgisi odakları. |
| Okuma, Fiil metni, Kalıplar, Yazma, Zayıflar | | | Metin okuma, günün fiil metni, fiil kalıpları, serbest yazma, yanlışların. |

Fiil tanıtımında ve fiil sorularının cevabında o fiilin **kalıpları** da gösterilir (Stell dir vor! · Ich kann mir das gut vorstellen.).
Kitaptan yeni bir kelime listesi verirsen (ünite), o kelimeler Çalış'ta yeni kelime olarak önce gelir, ünitenin metinleri boşluklu metin olur.

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
