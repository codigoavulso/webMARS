# 02 - تكملة لشخصين
#
# في تكملة 32 بت، يؤدي عكس البتات 5 وإضافة 1 إلى تمثيل -5.
#
# يقوم البرنامج بحساب نفس القيمة بطريقتين: `sub` من الصفر، ثم `nor` و `addi`.
#
# طباعة كلا المسارين -5. افحص `0xFFFFFFFB` في السجلات لترى كيف تبدو نفس البتات بالنظام الست
# عشري.

        .data
m1:     .asciiz "zero minus 5 = "
m2:     .asciiz "invert bits of 5, add 1 = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall
        #الطرح من الصفر يشكل المعكوس الجمعي بدون بتة علامة الطرح.
        li   $t0, 5
        sub  $t1, $zero, $t0    #الأفعى يقوم بالعمل
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, m2
        li   $v0, 4
        syscall
        #ولا مع $zero يكون ثنائي الاتجاه NOT؛ إضافة واحد يكمل تكملة الاثنين.
        nor  $t2, $t0, $zero    #عكس كل البتات
        addi $t2, $t2, 1        #إضافة واحدة
        move $a0, $t2           #نفس القيمة المذكورة أعلاه
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
