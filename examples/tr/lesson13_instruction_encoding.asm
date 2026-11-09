# 13 - Talimat bir sayıdır
#
# Metin Segmentindeki Kod sütununu birleştirin ve inceleyin. Her temel talimat, alanlara
# bölünmüş 32 bitlik bir kelimedir.
#
# İki `add` talimatını karşılaştırın. İşlem alanları eşleşirken, kayıt alanları farklı
# işlenenleri kodlar.
#
# `addi`'de düşük 16 bit, doğrudan 100'ü tutar, yani `0x0064`. 101 olarak değiştirin ve
# değişikliği görmek için yeniden birleştirin.

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
