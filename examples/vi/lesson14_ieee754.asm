# ==========================================================
#Bài 14 - Số thực 32 bit
#
#THE PROBLEM
#3.5 không có chỗ trong thanh ghi số nguyên. ở đâu
#phần phân số đi, và một số rất lớn được lưu trữ như thế nào
#trong cùng 32 bit như một bit rất nhỏ?
#
#WHAT THE HARDWARE DOES
#IEEE-754 chia từ thành ba trường: một bit dấu,
#tám bit số mũ và hai mươi ba bit phân số. các
#số mũ trượt điểm nhị phân, đó là lý do tại sao định dạng là
#gọi là dấu phẩy động.
#
#THE SOLUTION
#Một tệp đăng ký riêng ($f0..$f31) và một bộ cộng riêng
#xử lý các giá trị này, đó là lý do tại sao cách ghi nhớ lại khác nhau:
#lwc1 để tải, thêm.s để thêm, syscall 2 để in.
#
#WATCH FOR
#Mở Công cụ > Biểu diễn dấu phẩy động và nhập 3.5.
#Xem ba trường, sau đó kiểm tra xem 4,75 có chính xác không -
#không giống như 0,1, không có phân số nhị phân hữu hạn.
# ==========================================================
        .data
a:      .float 3.5
b:      .float 1.25
m1:     .asciiz "3.5 + 1.25 = "
        .text
        .globl main
main:
        #Địa chỉ số nguyên vẫn định vị dữ liệu; lwc1 di chuyển các bit của nó vào COP1.
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
