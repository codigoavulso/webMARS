# 03 - 32 بٹس پر منطقی دروازے
#
# ہر رزلٹ بٹ کا انحصار صرف دو آپرینڈز کے متعلقہ بٹس پر ہوتا ہے۔ بٹ پوزیشنوں کے درمیان کوئی کیری
# نہیں ہے۔
#
# ماسک `0x0F` کے ساتھ، اور کم چار بٹس رکھتا ہے اور باقی کو صاف کرتا ہے۔ یا کم چار بٹس سیٹ کرتا
# ہے اور XOR انہیں پلٹتا ہے۔
#
# تینوں نتائج کا ہیکساڈیسیمل میں موازنہ کریں، پھر چار بٹس کے اگلے گروپ پر کام کرنے کے لیے ماسک
# `0xF0` آزمائیں۔

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
