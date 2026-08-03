# ==========================================================
#الدرس 03 - البوابات المنطقية عبر 32 بت
#
#THE PROBLEM
#AND، OR و XOR هي بوابات ذات بت واحد. السجل يحمل 32 بت.
#ماذا تعني البوابة بهذا العرض؟
#
#WHAT THE HARDWARE DOES
#يتم وضع 32 نسخة من البوابة جنبًا إلى جنب. بت 0 من
#تعتمد النتيجة فقط على البتة 0 من كل معامل، والبتة 1 فقط
#بت 1، وهكذا. لا يوجد حمل يسافر بينهما.
#
#THE SOLUTION
#هذا الاستقلال هو ما يجعل القناع يعمل: اختر أيًا منهما
#البتات التي يجب الاحتفاظ بها مع AND، والضغط على وحدة واحدة باستخدام OR، والقلب باستخدام XOR.
#
#WATCH FOR
#0xCC هو 11001100 والقناع 0x0F هو 00001111. AND يحتفظ
#البتات الأربعة المنخفضة، أو تقوم بتعيينها، XOR تقلبها. فقط
#عاب منخفضة تتغير من أي وقت مضى.
# ==========================================================
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
