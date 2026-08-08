# ==========================================================
#سبق 03 - 32 بٹس پر منطقی دروازے
#
#THE PROBLEM
#AND، یا XOR ایک بٹ گیٹس ہیں۔ ایک رجسٹر میں 32 بٹس ہوتے ہیں۔
#اس چوڑائی پر گیٹ کا کیا مطلب ہے؟
#
#WHAT THE HARDWARE DOES
#یہ گیٹ کی 32 کاپیاں ساتھ ساتھ رکھتا ہے۔ کا بٹ 0
#نتیجہ صرف ہر آپرینڈ کے بٹ 0 پر منحصر ہے، صرف بٹ 1 پر
#بٹ 1، اور اسی طرح. ان کے درمیان کوئی کیری سفر نہیں ہے۔
#
#THE SOLUTION
#وہ آزادی وہی ہے جو ماسک کو کام کرتی ہے: جس کا انتخاب کریں۔
#AND کے ساتھ رکھنے کے لیے بٹس، OR کے ساتھ ایک پر زبردستی، XOR کے ساتھ پلٹائیں۔
#
#WATCH FOR
#0xCC 11001100 ہے اور ماسک 0x0F 00001111 ہے۔ AND رکھتا ہے۔
#کم چار بٹس، یا انہیں سیٹ کرتا ہے، XOR انہیں پلٹتا ہے۔ صرف
#کم نبل کبھی بدل جاتا ہے.
# ==========================================================
        .data
ma:     .asciiz "AND keeps the low nibble: "
mo:     .asciiz "OR sets the low nibble:   "
mx:     .asciiz "XOR flips the low nibble: "
        .text
        .globl main
main:
        li   $t0, 204           #0xCC
        li   $t1, 15            #0x0F ماسک

        la   $a0, ma
        li   $v0, 4
        syscall
        #AND ہر اس پوزیشن کو صاف کرتا ہے جہاں ماسک میں صفر ہوتا ہے۔
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
        #XOR صرف ان پوزیشنوں کو ٹوگل کرتا ہے جو ماسک میں لوگوں کے ذریعہ منتخب کیے گئے ہیں۔
        xor  $t4, $t0, $t1
        move $a0, $t4
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
