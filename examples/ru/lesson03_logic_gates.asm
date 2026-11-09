# 03 — Логические элементы более 32 бит
#
# Каждый бит результата зависит только от соответствующих битов двух операндов. Перенос между
# битовыми позициями отсутствует.
#
# При маске `0x0F` И сохраняет четыре младших бита и очищает остальные. OR устанавливает младшие
# четыре бита, а XOR переворачивает их.
#
# Сравните три результата в шестнадцатеричном формате, затем попробуйте маску `0xF0` для работы
# со следующей группой из четырех битов.

        .data
ma:     .asciiz "AND keeps the low nibble: "
mo:     .asciiz "OR sets the low nibble:   "
mx:     .asciiz "XOR flips the low nibble: "
        .text
        .globl main
main:
        li   $t0, 204           #0xCC
        li   $t1, 15            #Маска 0x0F

        la   $a0, ma
        li   $v0, 4
        syscall
        #AND очищает каждую позицию, где маска содержит ноль.
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
        #XOR переключает только позиции, выбранные в маске.
        xor  $t4, $t0, $t1
        move $a0, $t4
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
