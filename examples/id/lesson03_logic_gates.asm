# ==========================================================
#Pelajaran 03 - Gerbang logika melintasi 32 bit
#
#THE PROBLEM
#AND, OR dan XOR adalah gerbang satu-bit. Sebuah register menampung 32 bit.
#Apa arti gerbang dengan lebar sebesar itu?
#
#WHAT THE HARDWARE DOES
#Itu meletakkan 32 salinan gerbang berdampingan. Sedikit 0 dari
#hasilnya hanya bergantung pada bit 0 setiap operan, bit 1 hanya aktif
#bit 1, dan seterusnya. Tidak ada barang bawaan yang bergerak di antara mereka.
#
#THE SOLUTION
#Kemandirian itulah yang membuat topeng berfungsi: pilih yang mana
#bit untuk disimpan dengan AND, paksa menjadi satu dengan OR, balik dengan XOR.
#
#WATCH FOR
#0xCC adalah 11001100 dan topeng 0x0F adalah 00001111. AND tetap
#   empat bit rendah, ATAU menyetelnya, XOR membaliknya. Hanya itu
#gigitan rendah selalu berubah.
# ==========================================================
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
