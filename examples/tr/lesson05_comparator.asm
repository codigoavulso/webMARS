# ==========================================================
#Ders 05 - Karşılaştırıcı ve dallanma
#
#THE PROBLEM
#Karar için bir bit gerekir, ancak iki adet 32 bitlik sayının karşılaştırılması
#bir çıkarma işlemidir. Çıkarma işlemi nasıl bir seçim haline gelir?
#
#WHAT THE HARDWARE DOES
#slt, işaret dışındaki her şeyi çıkarır ve atar,
#0 veya 1 yazma. Dal daha sonra bu biti PC'ye besler.
#ya bir ofset ekleyen ya da bilgisayarın ilerlemesine izin veren mantık.
#
#THE SOLUTION
#Bir kayıtla karşılaştırın, o kayıtta dallayın. Kontrol
#akış aritmetik artı PC'deki bir çoklayıcıdır.
#
#WATCH FOR
#Slt'den sonra, $t2 1'i tutar. Beq'i geçin ve bilgisayarı izleyin
#durum çubuğunda: dört basamak ilerlemek yerine atlar.
# ==========================================================
        .data
lo:     .asciiz "a is smaller"
hi:     .asciiz "a is not smaller"
        .text
        .globl main
main:
        li   $t0, 7             #bir
        li   $t1, 12            #b
        #slt, karşılaştırmayı asla gizli bayraklar olarak değil, sıradan bir tamsayı olarak gerçekleştirir.
        slt  $t2, $t0, $t1      #a < b ise t2 = 1
        #Yalnızca Boolean sonucu sıfır olduğunda notless'e dallanma.
        beq  $t2, $zero, notless

        la   $a0, lo
        li   $v0, 4
        syscall
        j    done

notless:
        la   $a0, hi
        li   $v0, 4
        syscall

done:
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
