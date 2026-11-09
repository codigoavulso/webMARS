# 11 - Memanggil suatu fungsi
#
# Jalankan dengan percabangan tertunda. `jal` melompat ke fungsi dan memasukkan alamat instruksi
# berikutnya di `$ra`.
#
# Konvensi pemanggilan melewati 17 dan 42 di `$a0` dan `$a1`. Fungsi ini mengembalikan nilai
# yang lebih besar di `$v0`.
#
# Masuk ke dalam panggilan, bandingkan `$ra` dengan alamat setelah `jal`, lalu ikuti `jr $ra`
# kembali ke penelepon.

        .data
m1:     .asciiz "max(17, 42) = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall

        li   $a0, 17            #argumen pertama
        li   $a1, 42            #argumen kedua
        jal  maxof

        move $a0, $v0           #hasilnya muncul kembali di $v0
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall

#---- int maxof(int a, int b) ----
maxof:
        #maxof adalah fungsi daun, sehingga dapat kembali tanpa menyimpan $ra di stack.
        slt  $t0, $a0, $a1
        beq  $t0, $zero, keepa
        move $v0, $a1
        jr   $ra
keepa:
        move $v0, $a0
        jr   $ra
