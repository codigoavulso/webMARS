# 04 - Pergeseran dan pangkat dua
#
# Pergeseran ke kiri sebanyak 3 dikalikan 8 jika hasilnya cocok. Bit yang digeser melewati tepi
# akan dibuang.
#
# Di sebelah kanan, `srl` diisi dengan nol dan `sra` menyalin bit tanda. Untuk -16 digeser 2,
# masing-masing diharapkan 1073741820 dan -4.
#
# Coba -15 dengan `sra`. Hasilnya -4 karena shiftnya dibulatkan ke bawah; putaran pembagian yang
# ditandatangani menuju nol.

        .data
m1:     .asciiz "5 << 3 = "
m2:     .asciiz "-16 >> 2 arithmetic = "
m3:     .asciiz "-16 >> 2 logical    = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall
        li   $t0, 5
        #Tiga pergeseran ke kiri dikalikan dengan 2^3 dengan hanya mempertahankan 32 bit hasil.
        sll  $t1, $t0, 3        # 5 * 8
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $t2, -16

        la   $a0, m2
        li   $v0, 4
        syscall
        #Bandingkan $t3 dan $t4 dalam heksadesimal untuk melihat perbedaan bit masuk.
        sra  $t3, $t2, 2        #tanda dipertahankan: -4
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, m3
        li   $v0, 4
        syscall
        srl  $t4, $t2, 2        #angka nol bergeser: sangat positif
        move $a0, $t4
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
