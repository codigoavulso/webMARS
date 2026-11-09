# 05 - Karşılaştırıcı ve branşman
#
# `slt` iki işaretli tamsayıyı karşılaştırır ve ilki küçükse 1, değilse 0 yazar.
#
# 7 ve 12 için `$t2` 1'dir, dolayısıyla `beq` `notless`'ye atlamaz ve yürütme bir sonraki
# talimata devam eder.
#
# Gecikmeli dallanma kapalıyken `beq`'yi geçin ve bilgisayarı gözlemleyin. İki giriş değerini
# değiştirin ve yeni hedefi karşılaştırın.

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
