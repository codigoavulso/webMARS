# ==========================================================
#Ders 13 - Talimat bir sayıdır
#
#THE PROBLEM
#İşlemci sözcükleri bellekten alır. Kod yaşıyor
#hafıza da. Peki bir talimatı bir talimattan ayıran şey nedir?
#veri parçası?
#
#WHAT THE HARDWARE DOES
#Kelimenin yüklendiği kaydın ötesinde hiçbir şey yok.
#PC, kod çözücüye giden kelimeleri seçer; lw kelimeleri seçiyor
#bu kayıt dosyasına gider. Bitler aynı türden.
#
#THE SOLUTION
#Kodlamayı doğrudan okuyun. Birleştirin ve açın
#Ana > Yürüt: Kod sütunu her talimatı şu şekilde gösterir:
#32-bit kelime gerçekten öyle.
#
#WATCH FOR
#Bu ders bilerek hiçbir şey yazdırmaz; çıktı,
#Metin Segmentinin kendisi. İki eklemeyi karşılaştırın: aynı işlem kodu ve
#fonksiyon alanları, farklı kayıt numaraları. Daha sonra şunu bulun:
#addi kelimesinin içinde gerçek 100.
# ==========================================================
        .text
        .globl main
main:
        #Montajdan sonra Kod sütununu inceleyin: bu anımsatıcılar metin olarak saklanmaz.
        add  $t0, $t1, $t2      #R tipi: işlem kodu, rs, rt, rd, işlev
        add  $t3, $t4, $t5      #aynı şekil, farklı kayıtlar
        addi $t0, $t1, 100      #I-type: sabit kelimenin içindedir
        sll  $t0, $t1, 4        #vardiya miktarının kendi alanı vardır
        j    tail               #J tipi: bir adres, kayıt değil
tail:
        #li'nin kendisi yürütmeden önce genişletilir; işlemci yalnızca kodlanmış kelimeleri görür.
        li   $v0, 10
        syscall
