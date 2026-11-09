# 03 - Gerbang logika lebih dari 32 bit
#
# Setiap bit hasil hanya bergantung pada bit yang sesuai dari dua operan. Tidak ada carry antar
# posisi bit.
#
# Dengan mask `0x0F`, DAN menyimpan empat bit rendah dan menghapus sisanya. OR menyetel empat
# bit rendah dan XOR membaliknya.
#
# Bandingkan ketiga hasil dalam heksadesimal, lalu coba mask `0xF0` untuk mengerjakan kelompok
# empat bit berikutnya.

        .data
ma:     .asciiz "AND keeps the low nibble: "
mo:     .asciiz "OR sets the low nibble:   "
mx:     .asciiz "XOR flips the low nibble: "
        .text
        .globl main
main:
        li   $t0, 204           #0xCC
        li   $t1, 15            #0x0F masker

        la   $a0, ma
        li   $v0, 4
        syscall
        #AND menghapus setiap posisi di mana topeng berisi nol.
        and  $t2, $t0, $t1
        move $a0, $t2
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, mo
        li   $v0, 4
        syscall
        or   $t3, $t0, $t1
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, mx
        li   $v0, 4
        syscall
        #XOR hanya mengaktifkan posisi yang dipilih oleh yang ada di topeng.
        xor  $t4, $t0, $t1
        move $a0, $t4
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
