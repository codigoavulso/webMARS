# 14 - Bilangan real dalam 32 bit
#
# Pelampung presisi tunggal memiliki satu bit tanda, delapan bit eksponen, dan 23 bit pecahan.
#
# `lwc1` menyalin pola bit ke dalam register floating-point. Kemudian `add.s` menambahkan 3,5
# dan 1,25 untuk menghasilkan 4,75.
#
# Bandingkan pengkodean 4,75 dan 0,1 di alat Representasi Titik Mengambang. 4,75 tepat; 0,1
# perlu pembulatan.

        .data
a:      .float 3.5
b:      .float 1.25
m1:     .asciiz "3.5 + 1.25 = "
        .text
        .globl main
main:

        la   $a0, m1
        li   $v0, 4
        syscall

        la   $t0, a
        lwc1 $f0, 0($t0)        #ke dalam file register FPU
        la   $t0, b
        lwc1 $f2, 0($t0)
        add.s $f4, $f0, $f2     #penambah FPU

        #Syscall 2 mengharapkan argumen floatnya secara khusus di $f12.
        mov.s $f12, $f4
        li   $v0, 2             #cetak mengapung
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
