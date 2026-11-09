# 08 - Urutan byte dan byte
#
# Dalam memori little-endian simulator ini, byte terkecil dari sebuah kata berada di alamat
# terendah.
#
# Simpan `0x04030201` sebagai kata dan baca offset 0 hingga 3 sebagai byte. Outputnya adalah 1,
# 2, 3, 4.
#
# Coba byte rendah `0xFF`. Beban tak bertanda tangan dengan `lbu` menghasilkan 255, sedangkan
# beban bertanda tangan dengan `lb` menghasilkan -1.

        .data
cell:   .word 0
m1:     .asciiz "bytes from low address: "
sp:     .asciiz " "
        .text
        .globl main
main:
        la   $t0, cell
        li   $t1, 0x04030201    #byte 01 paling tidak signifikan
        sw   $t1, 0($t0)

        la   $a0, m1
        li   $v0, 4
        syscall

        li   $t2, 0             #offset byte
bloop:
        #Kunjungan loop mengimbangi 0, 1, 2 dan 3 di dalam kata yang disimpan.
        slti $t3, $t2, 4
        beq  $t3, $zero, endb

        #Alamat efektif = alamat dasar + offset byte saat ini.
        add  $t4, $t0, $t2
        lbu  $a0, 0($t4)        #byte yang tidak ditandatangani
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        addi $t2, $t2, 1
        j    bloop

endb:
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
