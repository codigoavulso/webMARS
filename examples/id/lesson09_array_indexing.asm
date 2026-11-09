# 09 - Mengindeks array
#
# Setiap elemen array menempati empat byte. Geser indeks ke kiri sebanyak dua untuk menghitung
# offset byte-nya.
#
# Ikuti urutan `sll`, `add`, `lw`: skalakan indeks, tambahkan alamat dasar dan muat elemen.
#
# Pada indeks 2, `$t5` adalah 8 dan `$t6` menunjuk ke nilai 30. Kelima elemen tersebut berjumlah
# 150.

        .data
arr:    .word 10, 20, 30, 40, 50
m1:     .asciiz "sum = "
        .text
        .globl main
main:
        la   $t0, arr           #dasar
        li   $t1, 0             #saya
        li   $t2, 5             #panjang
        li   $t3, 0             #akumulator

sum:
        #Invarian loop: $t3 adalah jumlah dari arr[0] hingga arr[i-1].
        slt  $t4, $t1, $t2
        beq  $t4, $zero, ends

        sll  $t5, $t1, 2        #saya * 4 byte
        add  $t6, $t0, $t5      #indeks dasar + skala
        #$t6 sekarang memberi nama tepat pada satu elemen; lw mengambil nilai 32-bitnya.
        lw   $t7, 0($t6)
        add  $t3, $t3, $t7

        addi $t1, $t1, 1
        j    sum

ends:
        la   $a0, m1
        li   $v0, 4
        syscall
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
