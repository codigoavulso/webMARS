# ==========================================================
#درس 03 - دروازه های منطقی در 32 بیت
#
#THE PROBLEM
#AND، OR و XOR گیت‌های یک بیتی هستند. یک ثبات دارای 32 بیت است.
#دروازه در آن عرض به چه معناست؟
#
#WHAT THE HARDWARE DOES
#32 نسخه از دروازه را در کنار هم قرار داده است. بیت 0 از
#نتیجه فقط به بیت 0 هر عملوند و بیت 1 فقط به بیت بستگی دارد
#بیت 1 و غیره بدون حمل و نقل بین آنها.
#
#THE SOLUTION
#این استقلال چیزی است که باعث می شود ماسک کار کند: کدام را انتخاب کنید
#بیت هایی که باید با AND نگه داشته شوند، با OR به یکی فشار دهید، با XOR ورق بزنید.
#
#WATCH FOR
#0xCC 11001100 است و ماسک 0x0F 00001111 است. AND نگه می‌دارد
#چهار بیت پایین، OR آنها را تنظیم می کند، XOR آنها را برمی گرداند. فقط
#نوک پایین همیشه تغییر می کند.
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
