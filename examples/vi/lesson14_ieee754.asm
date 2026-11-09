# 14 - Số thực 32 bit
#
# Một float có độ chính xác đơn có một bit dấu, tám bit số mũ và 23 bit phân số.
#
# `lwc1` sao chép mẫu bit vào thanh ghi dấu phẩy động. Sau đó `add.s` cộng 3,5 và 1,25 để được
# 4,75.
#
# So sánh mã hóa 4,75 và 0,1 trong công cụ Biểu diễn dấu phẩy động. 4,75 là chính xác; 0,1 cần
# làm tròn.

        .data
a:      .float 3.5
b:      .float 1.25
m1:     .asciiz "3.5 + 1.25 = "
        .text
        .globl main
main:

        la   $a0, m1
        li   $v0, 4
        syscall

        la   $t0, a
        lwc1 $f0, 0($t0)        #vào tệp đăng ký FPU
        la   $t0, b
        lwc1 $f2, 0($t0)
        add.s $f4, $f0, $f2     #bộ cộng FPU

        #Syscall 2 mong đợi đối số float của nó cụ thể trong $f12.
        mov.s $f12, $f4
        li   $v0, 2             #in phao
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
