# 02 - Komplemen dua
#
# Dalam komplemen dua 32-bit, membalik bit 5 dan menambahkan 1 menghasilkan representasi -5.
#
# Program menghitung nilai yang sama dengan dua cara: `sub` dari nol, lalu `nor` dan `addi`.
#
# Kedua jalur mencetak -5. Periksa `0xFFFFFFFB` di register untuk melihat tampilan bit yang sama
# dalam heksadesimal.

        .data
m1:     .asciiz "zero minus 5 = "
m2:     .asciiz "invert bits of 5, add 1 = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall
        #Pengurangan dari nol membentuk invers aditif tanpa sedikit tanda minus.
        li   $t0, 5
        sub  $t1, $zero, $t0    #penambah melakukan pekerjaannya
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, m2
        li   $v0, 4
        syscall
        #juga dengan $zero bersifat bitwise NOT; menambahkan satu melengkapi komplemen dua.
        nor  $t2, $t0, $zero    #membalikkan semua bit
        addi $t2, $t2, 1        #tambahkan satu
        move $a0, $t2           #nilainya sama seperti di atas
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
