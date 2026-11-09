# 07 - Kata-kata dalam ingatan
#
# Alamat memori menghitung byte. Setiap kata menempati empat byte, jadi `lw` dan `sw` gunakan
# offset 0, 4 dan 8 di sini.
#
# Alamat kata harus kelipatan empat. Menggunakan offset 1 dan bukannya 4 menyebabkan
# pengecualian penyelarasan dalam program ini.
#
# Setelah penyimpanan, lihat `cell` di Segmen Data. Tiga kata yang berdekatan harus berisi 111,
# 222 dan 333.

        .data
cell:   .word 0, 0, 0
m1:     .asciiz "read back: "
sp:     .asciiz " "
        .text
        .globl main
main:
        la   $t0, cell          #alamat dasar

        #Setiap offset di bawah ini relatif terhadap $t0 dan tetap selaras dengan kata.
        li   $t1, 111
        sw   $t1, 0($t0)        #kata pertama
        li   $t1, 222
        sw   $t1, 4($t0)        #+4 byte = kata berikutnya
        li   $t1, 333
        sw   $t1, 8($t0)        #+8 byte

        la   $a0, m1
        li   $v0, 4
        syscall

        #lw merekonstruksi nilai 32-bit yang sama yang sebelumnya ditulis oleh sw.
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
