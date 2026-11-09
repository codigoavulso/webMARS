# 07 - Hafızadaki kelimeler
#
# Bellek adresleri baytları sayar. Her kelime dört bayt kaplar, dolayısıyla `lw` ve `sw` burada
# 0, 4 ve 8 ofsetlerini kullanır.
#
# Bir kelime adresi dördün katı olmalıdır. 4 yerine ofset 1'in kullanılması bu programda
# hizalama istisnasına neden olur.
#
# Mağazalardan sonra Veri Segmentindeki `cell`'ye bakın. Bitişik üç kelime 111, 222 ve 333'ü
# içermelidir.

        .data
cell:   .word 0, 0, 0
m1:     .asciiz "read back: "
sp:     .asciiz " "
        .text
        .globl main
main:
        la   $t0, cell          #temel adres

        #Aşağıdaki her uzaklık $t0'a göredir ve sözcük hizalı kalır.
        li   $t1, 111
        sw   $t1, 0($t0)        #ilk kelime
        li   $t1, 222
        sw   $t1, 4($t0)        #+4 bayt = sonraki kelime
        li   $t1, 333
        sw   $t1, 8($t0)        #+8 bayt

        la   $a0, m1
        li   $v0, 4
        syscall

        #lw, daha önce sw tarafından yazılan aynı 32 bitlik değerleri yeniden oluşturur.
        lw   $a0, 0($t0)
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        lw   $a0, 4($t0)
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        lw   $a0, 8($t0)
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
