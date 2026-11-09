# 01 - Kayıtlar ve anında bildirimler
#
# Anlık talimatta kodlanmıştır. Birleştirin ve her `li`'nin hangi temel talimata dönüştüğünü
# kontrol edin.
#
# İki yüklemeyi ve eklemeyi adım adım yapın. Kayıtlar'da `$t0 = 12`, `$t1 = 30` ve `$t2 = 42`'yi
# takip edin.
#
# 30'u `0x12345678` ile değiştirmeyi deneyin ve yeniden birleştirin. Daha büyük sabit birden
# fazla temel talimata ihtiyaç duyar.

        .data
lbl:    .asciiz "12 + 30 = "
        .text
        .globl main
main:
        #Sistem çağrıları, hizmet seçici olarak $v0 ve ilk argüman olarak $a0 kullanır.
        la   $a0, lbl
        li   $v0, 4
        syscall

        #li bir sözde talimattır; Assemble, onun hangi gerçek talimata dönüştüğünü gösterir.
        li   $t0, 12
        li   $t1, 30
        add  $t2, $t0, $t1      # Toplam farklı bir kayda yazılır.

        move $a0, $t2
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
