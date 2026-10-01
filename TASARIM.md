# Ezber sistemi nasıl çalışıyor ve neden

## Sorun: "kalıp okuma"

Eski yöntemde aynı cümleler tekrar geliyordu. Bir süre sonra cümleyi tanıyıp cevabı hatırlıyorsun,
fiili gerçekten bilip bilmediğin ölçülmüyor. Buna "kalıp okuma" diyorsun. Araştırmalar da aynı şeyi söylüyor.

## Araştırmadan çıkanlar

1. **Değişen bağlam, sabit bağlamdan iyi.** Yabancı kelimeleri cümle içinde hatırlama çalışmasında, her
   turda cümle değiştiğinde kelimenin anlamı sabit cümleden daha iyi öğreniliyor (PNAS 2024, "The role of
   variable retrieval in effective learning", altı deney; tam metne erişemedim, özetinden).
2. **Bağlam anlamayı, hatırlama kalıcılığı artırır.** Zengin bağlam kelimeyi o an anlamana yardım ediyor.
   Ama kalıcı öğrenme, bağlam yardımı olmadan hafızadan çağırınca oluyor (van den Broek vd., 2018).
   Yani ipuçları başta olmalı, zamanla kalkmalı.
3. **Transfer ayrıca çalışılmalı.** Hatırlama çalışması yeni bağlamlara daha az aktarılıyor (ERIC EJ1294129).
   Bu yüzden her tekrar yeni bir cümlede olmalı.
4. **Aralıklı tekrar.** Unutmaya yaklaştığın anda tekrar etmek en verimli yol. FSRS algoritması bunu
   hafıza modeline göre hesaplıyor (Anki'nin yeni algoritması, milyonlarca tekrarla eğitilmiş).
5. **Karışık çalışma (interleaving).** Aynı tür soru arka arkaya gelmemeli, türler karışık olmalı.

## Sistemdeki karşılıkları

| İlke | Sistemde |
|---|---|
| Zamanlanan şey cümle değil **beceri** | Her fiil için 4 ayrı birim: anlam (DE→TR, sadece fiil + edat gösterilir), hatırlama (TR→DE + edat + hâl), çekim (Perfekt / Präsens / Präteritum), cümle. İsimde: anlam, artikel, TR→DE yazma (+ n-Deklination). Her birinin FSRS kartı ayrı. |
| Her tekrarda **yeni bağlam** | Cümle birimi her seferinde yeniden üretilir: özne, zaman (Präsens / Perfekt / modal), cümle tipi (düz / soru / wo(r)-sorusu / weil-dass-wenn-obwohl yan cümlesi), olumsuzluk, zaman ifadesiyle başlama, nesne, iyelik (mein / dein / sein …), sıfat. Son 12 bağlam hafızada, aynısı gelmez. Kalıbı olmayan fiillerde Goethe örnek cümlelerinden boşluk doldurma dönüşümlü gelir. |
| İpuçları **azalır** | İpucu seviyesi kartın hafıza kararlılığından (S) gelir: 0 (S < 3 gün): fiilin Almancası + hâller + isimlerin Almancası; 1 (< 10 gün): fiil, hâl yok; 2 (< 30 gün): sadece Türkçe + artikel; 3: tamamen Türkçe. Sıfat, yan cümle ve wo(r)-soruları seviye 1'den sonra açılır. |
| Önce anlam, sonra üretim | Hızlı tur'da yeni kelime önce tanınır (seçmeli), tanıma birkaç gün dayanınca (S ≥ 3 gün) yazma birimi açılır. Karışık'ta derin tanıtım: tanıtım kartı (edat, hâl, çekimler, örnek) → hemen TR→DE hatırlama → tam ipuçlu cümle. Çekim ve cümle birimleri ilk başarılı hatırlamadan sonra açılır. |
| Aralıklı tekrar | FSRS-6, hedef hatırlama %90 (Ayarlar'dan %85–95). Yanlış → 10 dk sonra, oturum içinde de 4 soru sonra (en fazla 2 kez). Önceki günlerin yanlışları önce gelir. |
| Karışık | Tür oranı cümle 5 : kelime 3 : anlam 2, aynı tür en fazla 2 kez üst üste, aynı öğe arka arkaya gelmez. |
| Artikel | Her isim her yerde artikel rengiyle: **der mavi, die kırmızı, das yeşil, çoğul mor**. Kelime sorusunda artikel yanlışsa cevap yanlış sayılır. |

## Odak modülleri

- **n-Deklination:** 50 zayıf eril isim (Goethe listesi + Präsident, Dozent, Kommilitone, milliyetler, hayvanlar) ve 20 tuzak isim
  (der Lehrer, der Professor, der Käse, der See … n almaz). Tanıtımda çekim tablosu. Alıştırma: cümlede boşluğa isim öbeği
  (Ich helfe ___ → dem Kollegen); hâli cümleden çıkarırsın (ipucu seviyesi 0'da hâl yazılır). der / ein / mein- dönüşümlü;
  Genitiv dahil (des Namens, des Herrn). Her 3 n-Deklination isminden sonra bir tuzak gelir.
- **Dönüşlü fiiller:** 77 dönüşlü fiil. Tanıtımda zamir tablosu. Alıştırma: kişi + zaman (Präsens, Perfekt, emir kipi) ile
  kısa cümle; edatlı olanlarda nesne de (Wir freuen uns auf die Reise). Dativ dönüşlülerde `es` (Ich sehe es mir an).
  Dönüşlü fiiller Perfekt'te hep haben (Wir haben uns umgezogen).
- Odak modunda her iki sorudan biri doğrudan odak alıştırması, kota yok (yeni öğe her 3 soruda bir).

## Mantık kuralları (denetimde düzeltilenler)

- Aynı Türkçe karşılığı olan kelimeler (111 fiil, 162 isim): TR→DE sorusunda anlamdaşı yazarsan yanlış sayılmaz,
  "bu da doğru ama aranan başka" deyip tekrar sorar; soruda ayırt edici baş gösterilir (be… → benötigen).
- Derin tanıtım kartı sadece okutmaz: kelimeyi bir kez yazdırır.
- Kartın üstündeki durum satırı öğenin adını göstermez (TR→DE sorularında cevabı ele veriyordu).
- Goethe boşluğunda cevap mastar ise mastar ipucu gösterilmez.
- Tekrar eden (tramvay, metro, bilet …) ve bölgesel (Knödel, Trottoir …) maddeler öğretilmez.

## Cevap kontrolü

- Cümleler kelime kelime karşılaştırılır. Eksik kelime yeşil, fazla ya da yanlış kelime kırmızı ve üstü çizili gösterilir.
- Hata türü otomatik etiketlenir: dönüşlü zamir, edat, artikel/çekim, yardımcı fiil, kelime sırası, nicht, umlaut/ß, yazım.
  Bu etiketler log'a yazılır, Claude tekrarlayan hataları buradan bulur.
- Öneri: tamamen doğru → 3, sadece büyük/küçük harf, umlaut ya da tek harf yazım hatası → 2, diğer hepsi → 1.
  Notu sen verirsin (1/2/3), önerinden farklıysa log'a `öneri:` yazılır.
- Kabul edilen alternatifler: isim öznede dönüşlü zamirin yeri (freut sich Anna / freut Anna sich), kaynaşmış edatlar (zum / zu dem).

## Veri

- `daten/goethe_b1.json`: Goethe-Zertifikat B1 Wortliste PDF'inden `tools/goethe_parse.py` ile çıkarıldı.
  2978 madde, isimler artikel ve çoğuluyla, fiiller dört çekim biçimiyle, örnek cümleler.
- `quellen/verben.txt`: 674 fiil anlamı. Türkçe anlam, hâl ve edat elle girildi. Çekimler Goethe'den gelir.
- `quellen/nomen.txt`: Goethe'deki 1447 ismin Türkçesi (sırası Goethe ile birebir, build bunu kontrol eder).
- `quellen/nomen_extra.txt`: listede ayrı madde olmayan sık isimler (die Freundin, der Computer …).
- `quellen/rahmen.txt`: cümle üretici kalıpları. Hangi fiil hangi nesnelerle anlamlı cümle kurar.
- `quellen/woerter.txt`: Goethe listesindeki 592 sıfat, zarf, bağlaç, edat ve diğer kelime (kimlik satır sırasından: yalnız sona ekle).
- `quellen/pakete.txt`: konulu paketler (10 kelime + B1 metni + Türkçesi); biçimi dosyanın başında.
- `daten/kancalar.js`: takılan kelimeler için Claude'un yazdığı hafıza kancaları (elle düzenlenir, build'e girmez).
- `tools/build.py`: hepsini `daten/verben.js`, `daten/nomen.js`, `daten/woerter.js`, `daten/pakete.js` dosyalarına çevirir ve doğrular.
  Goethe'de olmayan fiil / kelime, yanlış artikel, bulunamayan isim, metinde boşluğu olmayan paket kelimesi olursa hata verir.
  Artikel ek kurallarını da isim listesinden hesaplar (en az 5 isim, en az %75 isabet).
- `tools/stichprobe.js`: her kalıptan örnek cümle üretir, gözle kontrol için.
- `tests/test_grammatik.js`: çekim, isim öbeği, cümle kurma, kontrol ve FSRS testleri.

## Verimlilik turu (Ekim 2026): Hızlı tur, paketler, kancalar

Sorun: her kelimeye tam tanıtım + yazma, bilinen kelimelere de aynı zamanı harcatıyordu; yeni kelime yavaş giriyordu.

| Ne | Neden | Sistemde |
|---|---|---|
| **Ön test (triage)** | Bildiğin kelimeye tekrar harcamak boşa. Bilmediğinde de tahmin etmeye çalışmak, cevabı sonra görünce öğrenmeyi artırıyor (Kornell, Hays & Bjork 2009). | Hızlı tur'da yeni kelime önce sorulur. Doğru ve akıcıysa (≤ 3,5 sn) "biliniyor": tanıma kartı uzun aralıkla başlar. Yanlış, yavaş ya da "bilmiyorum" → kısa tanıtım kartı, 3 soru sonra tekrar. Günde en çok 10 bilinmeyen, 30 bilinen. |
| **Seçmeli, ama önce hatırla** | Seçmeli soru, çeldiriciler güçlüyse tanımaya değil hatırlamaya zorlar (Little vd. 2012). | Seçenekler 1,2 sn sonra açılır. Çeldiriciler aynı türden, yarısı zaten tanıdığın kelimelerden, anlamdaşlar elenir. Doğru ≤ 3,5 sn → 3, daha yavaş → 2. |
| **Artikel ayrı beceri** | Artikeli bilmiyorsun; anlamı bilmek artikeli bilmek değil. | Her isimde ayrı der/die/das kartı. Listeden çıkarılan ek kuralları (‑ung → die %100, ‑ment → das %100, ‑or → der %100, ‑e → die %87 …) cevaptan sonra gösterilir; kurala uymayan isimde "İstisna!" yazar. 533 isimde kural var. |
| **Konulu paketler** | Anlamca benzer kelimeleri (meyveler, giysiler) birlikte öğrenmek karıştırmaya yol açıyor; bir sahnenin kelimeleri (doktorda: ateş, randevu, reçete, eczane) birlikte daha iyi öğreniliyor (Tinkham 1997). Metin bağlamı anlamayı, boşluk doldurma hatırlamayı çalıştırır. | 12 sahne (doktor, ev, Bürgeramt, üniversite, banka …), her biri 10 kelime + ~100 kelimelik B1 metni + Türkçesi. Liste → okuma → metinde boşluk. Paketin FSRS kartı metin tekrarını zamanlar; tekrarda önce okursan not en fazla 2. |
| **Takılan kelimeye kanca** | Anki üç-dört kez unutulan karta "leech" der; aynı yöntemle tekrar etmek işe yaramaz, kartı değiştirmek gerekir. Anahtar kelime yöntemi (ses benzerliği + görüntü) zor kelimelerde etkili (Atkinson & Raugh 1975). | Üç ayrı günde yanlış yapılan kelime 🪝 işaretlenir ve log'a `leech` yazılır (aynı gün içindeki hatalar bir sayılır; Anki de öğrenme aşamasındaki hataları saymaz). Claude `daten/kancalar.js`'e kısa Türkçe kanca yazar; kanca yanlış cevaplarda ve listede görünür. |

### Baştan savmaya karşı

Hedef "yapılmış gibi" görünen ama öğrenme olmayan cevapları ayırmak ve yorgunken yükü azaltmak:

- **Sayılmayan cevap:** seçenek açıldıktan sonra 0,4 sn içinde (artikelde soru açıldıktan 0,45 sn içinde) basılan cevap ve boş / rastgele yazı
  (tek harf, sesli harfsiz, aynı harf tekrarı) hedefe sayılmaz, log'a `sayılmadı` yazılır. Bilmiyorum / boş cevapta kendine not verilemez.
- **Dikkat dedektörü:** son 8 cevapta 5 yanlış ya da 3 hızlı/boş → 10 soru boyunca yeni öğe yok, önce tanıma soruları. Log'a `dikkat`.
- **Okumadan geçmeme:** tanıtım kartı 2 sn, paket listesi 3 sn, paket metni kelime başına 0,15 sn (6–15 sn) beklemeden geçmez.
- **Birikme:** bölümde 80'den fazla vadesi geçmiş kart varsa yeni öğe gelmez ve hâlâ hatırlanma ihtimali yüksek olanlar önce sorulur
  (kurtarılabilenleri kurtar). Karışık'taki yazma kartları 80'i geçerse Hızlı tur ve Paketler de yeni kelime vermez: yük, yapılmayan
  kısma göre ayarlanır.
- **Ara sonrası:** 3+ gün ara → suçlamayan kısa mesaj, sadece Hızlı tur'u bitirmek yeterli.
- **Plan şeridi ve gün eşiği:** Hızlı tur → Paket → Karışık sırası ve hedefleri hep görünür; 10 sayılan cevap = gün seriye sayılır.
  Küçük bir eşik, "bugün hiç yapmayayım" yerine "10 soru yapayım"ı kolaylaştırır.

## Kaynaklar

- [The role of variable retrieval in effective learning (PNAS, 2024)](https://www.pnas.org/doi/10.1073/pnas.2413511121)
- [Contextual Richness and Word Learning: Context Enhances Comprehension but Retrieval Enhances Retention (Language Learning, 2018)](https://onlinelibrary.wiley.com/doi/10.1111/lang.12285)
- [Testing and Transfer: Retrieval Practice Effects across Test Formats in English Vocabulary Learning (ERIC)](https://eric.ed.gov/?id=EJ1294129)
- [Spacing and context variability in vocabulary learning (Applied Psycholinguistics)](https://www.cambridge.org/core/journals/applied-psycholinguistics/article/impact-of-practice-conditions-on-vocabulary-learning-and-processing-a-closer-look-at-difficulties-arising-from-spacing-and-context-variability/435E40BAF7EB0C2A65F778D19B3C0BC0)
- [Unsuccessful retrieval attempts enhance subsequent learning (Kornell, Hays & Bjork, JEP:LMC 2009)](https://www.semanticscholar.org/paper/Unsuccessful-retrieval-attempts-enhance-subsequent-Kornell-Hays/648fe2e58f284519ea171a2f29220775c3ade49c)
- [Multiple-choice tests exonerated, at least of some charges (Little, Bjork, Bjork & Angello, Psychological Science 2012)](https://bjorklab.psych.ucla.edu/elizabeth-ligon-bjork-publications/)
- [The effects of semantic and thematic clustering on the learning of second language vocabulary (Tinkham, Second Language Research 1997)](https://eric.ed.gov/?id=EJ547488)
- [An application of the mnemonic keyword method to the acquisition of a Russian vocabulary (Atkinson & Raugh 1975)](https://www.researchgate.net/publication/232506159_An_application_of_the_mnemonic_keyword_method_to_the_acquisition_of_a_Russian_vocabulary)
- [Anki Manual: Leeches](https://docs.ankiweb.net/leeches.html)
- [FSRS algoritması (awesome-fsrs wiki)](https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm) · [FSRS teknik açıklama](https://expertium.github.io/Algorithm.html)
- [Goethe-Zertifikat B1 Wortliste (PDF)](https://www.goethe.de/pro/relaunch/prf/de/Goethe-Zertifikat_B1_Wortliste.pdf)
