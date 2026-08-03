# ==========================================================
#Pelajaran 12 - Rekursi membutuhkan frame per panggilan
#
#THE PROBLEM
#Panggilan rekursif menimpa $ra dan register argumen.
#Panggilan luar tidak mempunyai jalan kembali dan tidak tahu apa itu
#sendiri dan dulu.
#
#WHAT THE HARDWARE DOES
#Ini menyediakan satu $ra, bukan setumpuknya. Tidak ada yang disimpan
#secara otomatis; jika kode tidak menyimpannya, kode itu hilang.
#
#THE SOLUTION
#Setiap aktivasi membuka bingkai pada tumpukan, menyimpannya
#masih perlu setelah panggilan, dan mengembalikannya dalam perjalanan
#keluar. Kedalaman tumpukan adalah kedalaman rekursi.
#
#WATCH FOR
#Tetapkan breakpoint pada mul dan lihat $sp turun sebesar 8 per
#tingkat. Lima salinan n yang disimpan itulah yang membuatnya
#perkalian dalam perjalanan kembali mungkin.
# ==========================================================
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
        #Pulihkan status callee dan buang frame yang dialokasikan saat masuk.
        lw   $ra, 0($sp)
        addi $sp, $sp, 8
        jr   $ra
