# 03 - گیت های منطقی بیش از 32 بیت
#
# هر بیت نتیجه فقط به بیت های متناظر دو عملوند بستگی دارد. هیچ حملی بین موقعیت های بیتی وجود
# ندارد.
#
# با ماسک `0x0F`، AND چهار بیت پایین را نگه می دارد و بقیه را پاک می کند. OR چهار بیت پایین را
# تنظیم می کند و XOR آنها را برمی گرداند.
#
# سه نتیجه را در هگزادسیمال مقایسه کنید، سپس ماسک `0xF0` را امتحان کنید تا روی گروه چهار بیتی
# بعدی کار کنید.

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
        #AND هر موقعیتی را که ماسک حاوی صفر است پاک می‌کند.
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
        #XOR فقط موقعیت‌هایی را که توسط آنهایی که در ماسک انتخاب شده‌اند تغییر می‌دهد.
        xor  $t4, $t0, $t1
        move $a0, $t4
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
