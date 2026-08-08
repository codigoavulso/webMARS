# ==========================================================
#Bài 01 - Thanh ghi và giá trị tức thời
#
#THE PROBLEM
#ALU có hai cổng đầu vào và cả hai đều được nối dây với
#tập tin đăng ký. Một số được viết trong nguồn không phải là một
#đăng ký, vì vậy nó không thể truy cập trực tiếp vào các cổng đó.
#
#WHAT THE HARDWARE DOES
#Một lệnh ngay lập tức di chuyển bên trong từ hướng dẫn.
#addi mang trường 16 bit; li là một sự tiện lợi
#trình biên dịch mã mở rộng thành một hoặc hai lệnh thực.
#
#THE SOLUTION
#Đưa hằng số vào sổ đăng ký trước, sau đó đặt ALU
#đọc hai thanh ghi và viết một thanh ghi thứ ba.
#
#WATCH FOR
#Bước một lần trên mỗi dòng và làm theo $t0, $t1 và $t2 trong
#Bảng đăng ký. Chỉ dòng thứ ba chạm vào ALU.
# ==========================================================
        .data
lbl:    .asciiz "12 + 30 = "
        .text
        .globl main
main:
        #Syscalls sử dụng $v0 làm bộ chọn dịch vụ và $a0 làm đối số đầu tiên.
        la   $a0, lbl
        li   $v0, 4
        syscall

        #li là một lệnh giả; Assemble cho biết nó sẽ trở thành hướng dẫn thực sự nào.
        li   $t0, 12            #ngay lập tức -> đăng ký
        li   $t1, 30            #ngay lập tức -> đăng ký
        add  $t2, $t0, $t1      #ALU đọc hai thanh ghi

        move $a0, $t2
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
