# 03 - البوابات المنطقية أكثر من 32 بت
#
# تعتمد كل بتة نتيجة فقط على البتات المقابلة للمعاملين. لا يوجد حمل بين مواضع البت.
#
# بالقناع `0x0F`، ويحتفظ بالبتات الأربع المنخفضة ويمسح الباقي. يقوم OR بتعيين البتات الأربع
# المنخفضة ويقوم XOR بقلبها.
#
# قارن النتائج الثلاثة بالنظام الست عشري، ثم جرب القناع `0xF0` للعمل على المجموعة التالية
# المكونة من أربع بتات.

        .data
ma:     .asciiz "AND keeps the low nibble: "
mo:     .asciiz "OR sets the low nibble:   "
mx:     .asciiz "XOR flips the low nibble: "
        .text
        .globl main
main:
        li   $t0, 204           #0xCC
        li   $t1, 15            #قناع 0x0F

        la   $a0, ma
        li   $v0, 4
        syscall
        #AND يقوم بمسح كل موضع يحتوي فيه القناع على صفر.
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
        #يقوم XOR بتبديل المواضع المحددة بواسطة تلك الموجودة في القناع فقط.
        xor  $t4, $t0, $t1
        move $a0, $t4
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
