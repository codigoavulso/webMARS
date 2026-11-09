# 05 - المقارنة والفرع
#
# `slt` يقارن بين عددين صحيحين موقّعين ويكتب 1 عندما يكون الأول أصغر، أو 0 بخلاف ذلك.
#
# بالنسبة للرقمين 7 و12، `$t2` يساوي 1، لذلك لا يقفز `beq` إلى `notless` ويستمر التنفيذ إلى
# التعليمة التالية.
#
# مع تأخر التفرع، تجاوز `beq` ولاحظ جهاز الكمبيوتر. قم بتبديل قيمتي الإدخال ومقارنة الوجهة
# الجديدة.

        .data
lo:     .asciiz "a is smaller"
hi:     .asciiz "a is not smaller"
        .text
        .globl main
main:
        li   $t0, 7             #أ
        li   $t1, 12            #ب
        #slt يجسد المقارنة كعدد صحيح عادي، وليس كأعلام مخفية أبدًا.
        slt  $t2, $t0, $t1      #t2 = 1 إذا كان أ < ب
        #تفرع إلى notless فقط عندما تكون النتيجة المنطقية صفرًا.
        beq  $t2, $zero, notless

        la   $a0, lo
        li   $v0, 4
        syscall
        j    done

notless:
        la   $a0, hi
        li   $v0, 4
        syscall

done:
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
