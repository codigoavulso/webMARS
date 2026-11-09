# 03 - 32 bitin üzerindeki mantık kapıları
#
# Her sonuç biti yalnızca iki işlenenin karşılık gelen bitlerine bağlıdır. Bit konumları
# arasında taşıma yoktur.
#
# `0x0F` maskesiyle AND, düşük dört biti tutar ve geri kalanını temizler. OR düşük dört biti
# ayarlar ve XOR bunları çevirir.
#
# Üç sonucu onaltılı olarak karşılaştırın, ardından sonraki dört bitlik grup üzerinde çalışmak
# için `0xF0` maskesini deneyin.

        .data
ma:     .asciiz "AND keeps the low nibble: "
mo:     .asciiz "OR sets the low nibble:   "
mx:     .asciiz "XOR flips the low nibble: "
        .text
        .globl main
main:
        li   $t0, 204           #0xCC
        li   $t1, 15            #0x0F maske

        la   $a0, ma
        li   $v0, 4
        syscall
        #AND maskenin sıfır içerdiği her konumu temizler.
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
        #XOR yalnızca maskedekiler tarafından seçilen konumları değiştirir.
        xor  $t4, $t0, $t1
        move $a0, $t4
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
