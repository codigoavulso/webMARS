# 12 - Rekursi dan frame
#
# Panggilan rekursif menimpa `$ra` dan menggunakan `$a0` untuk argumennya sendiri. Simpan kedua
# nilai sebelum melakukan panggilan.
#
# Masuk ke `fact` untuk setiap nilai dari 5 hingga 1. Setiap panggilan mencadangkan delapan
# byte, termasuk panggilan yang mengembalikan 1.
#
# Tetapkan breakpoint pada `mul` untuk melihat jalur kembali. Setiap panggilan memuat ulang
# argumennya sendiri, mengalikan, dan melepaskan frame-nya.

        .data
m1:     .asciiz "5! = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall

        li   $a0, 5
        jal  fact

        move $a0, $v0
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall

#---- int fakta(int n) ----
fact:
        #Setiap pemanggilan memiliki frame delapan byte yang berbeda.
        addi $sp, $sp, -8
        sw   $ra, 0($sp)        #alamat pengirim panggilan ini
        sw   $a0, 4($sp)        #panggilan ini n

        li   $t0, 2
        slt  $t1, $a0, $t0
        beq  $t1, $zero, recurse
        li   $v0, 1             #kasus dasar: 0! = 1! = 1
        j    factend

recurse:
        addi $a0, $a0, -1
        jal  fact               #$v0 = (n-1)!
        lw   $a0, 4($sp)        #n kami lagi
        mul  $v0, $v0, $a0

factend:
        # Pulihkan alamat pengirim yang disimpan sebelum melepaskan bingkai panggilan ini.
        lw   $ra, 0($sp)
        addi $sp, $sp, 8
        jr   $ra
