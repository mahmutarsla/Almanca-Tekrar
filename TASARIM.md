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
| Zamanlanan şey cümle değil **beceri** | Her fiil için 4 ayrı birim: anlam (DE→TR, yardımsız), hatırlama (TR→DE + edat + hâl), çekim (Perfekt / Präsens / Präteritum), cümle. Her birinin FSRS kartı ayrı. |
| Her tekrarda **yeni bağlam** | Cümle birimi her seferinde yeniden üretilir: özne, zaman (Präsens / Perfekt / modal), cümle tipi (düz / soru / wo(r)-sorusu / weil-dass-wenn-obwohl yan cümlesi), olumsuzluk, zaman ifadesiyle başlama, nesne, iyelik (mein / dein / sein …), sıfat. Son 12 bağlam hafızada, aynısı gelmez. Kalıbı olmayan fiillerde Goethe örnek cümlelerinden boşluk doldurma dönüşümlü gelir. |
| İpuçları **azalır** | İpucu seviyesi kartın hafıza kararlılığından (S) gelir: 0 (S < 3 gün): fiilin Almancası + hâller + isimlerin Almancası; 1 (< 10 gün): fiil, hâl yok; 2 (< 30 gün): sadece Türkçe + artikel; 3: tamamen Türkçe. Sıfat, yan cümle ve wo(r)-soruları seviye 1'den sonra açılır. |
| Önce anlam, sonra üretim | Yeni fiil: tanıtım kartı (tam paket: edat, hâl, çekimler, örnek) → hemen TR→DE hatırlama → tam ipuçlu cümle → yardımsız anlam. Çekim birimi ilk başarılı hatırlamadan sonra açılır. |
| Aralıklı tekrar | FSRS-6, hedef hatırlama %90 (Ayarlar'dan %85–95). Yanlış → 10 dk sonra, oturum içinde de 4 soru sonra (en fazla 2 kez). Önceki günlerin yanlışları önce gelir. |
| Karışık | Tür oranı cümle 5 : kelime 3 : anlam 2, aynı tür en fazla 2 kez üst üste, aynı öğe arka arkaya gelmez. |
| Artikel | Her isim her yerde artikel rengiyle: **der mavi, die kırmızı, das yeşil, çoğul mor**. Kelime sorusunda artikel yanlışsa cevap yanlış sayılır. |

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
- `quellen/verben.txt`: 671 fiil anlamı. Türkçe anlam, hâl ve edat elle girildi. Çekimler Goethe'den gelir.
- `quellen/nomen.txt`: Goethe'deki 1447 ismin Türkçesi (sırası Goethe ile birebir, build bunu kontrol eder).
- `quellen/nomen_extra.txt`: listede ayrı madde olmayan sık isimler (die Freundin, der Computer …).
- `quellen/rahmen.txt`: cümle üretici kalıpları. Hangi fiil hangi nesnelerle anlamlı cümle kurar.
- `tools/build.py`: hepsini `daten/verben.js` ve `daten/nomen.js` dosyalarına çevirir ve doğrular.
  Goethe'de olmayan fiil, yanlış artikel, bulunamayan isim olursa hata verir.
- `tools/stichprobe.js`: her kalıptan örnek cümle üretir, gözle kontrol için.
- `tests/test_grammatik.js`: çekim, isim öbeği, cümle kurma, kontrol ve FSRS testleri.

## Kaynaklar

- [The role of variable retrieval in effective learning (PNAS, 2024)](https://www.pnas.org/doi/10.1073/pnas.2413511121)
- [Contextual Richness and Word Learning: Context Enhances Comprehension but Retrieval Enhances Retention (Language Learning, 2018)](https://onlinelibrary.wiley.com/doi/10.1111/lang.12285)
- [Testing and Transfer: Retrieval Practice Effects across Test Formats in English Vocabulary Learning (ERIC)](https://eric.ed.gov/?id=EJ1294129)
- [Spacing and context variability in vocabulary learning (Applied Psycholinguistics)](https://www.cambridge.org/core/journals/applied-psycholinguistics/article/impact-of-practice-conditions-on-vocabulary-learning-and-processing-a-closer-look-at-difficulties-arising-from-spacing-and-context-variability/435E40BAF7EB0C2A65F778D19B3C0BC0)
- [FSRS algoritması (awesome-fsrs wiki)](https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm) · [FSRS teknik açıklama](https://expertium.github.io/Algorithm.html)
- [Goethe-Zertifikat B1 Wortliste (PDF)](https://www.goethe.de/pro/relaunch/prf/de/Goethe-Zertifikat_B1_Wortliste.pdf)
