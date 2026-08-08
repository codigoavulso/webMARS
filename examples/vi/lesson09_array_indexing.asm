# ==========================================================
#Bài 09 - Lập chỉ mục cho mảng
#
#THE PROBLEM
#Lệnh tải cung cấp một thanh ghi cơ sở và một hằng số
#bù đắp. Không có gì khác. Vậy làm sao đạt được a[i] khi tôi chỉ
#được biết đến vào thời điểm chạy, đang ngồi trong sổ đăng ký?
#
#WHAT THE HARDWARE DOES
#Nó thêm cơ sở vào bất cứ thứ gì mà sổ đăng ký nắm giữ. chỉ số
#do đó phải ở dạng byte chứ không phải ở dạng phần tử.
#
#THE SOLUTION
#Chia tỷ lệ chỉ mục theo kích thước phần tử, sau đó thêm. Đối với bốn byte
#nói rằng tỷ lệ là sự dịch chuyển còn lại hai, chi phí
#không có gì.
#
#WATCH FOR
#Ba dòng sll, add, lw là những gì a[i] biên dịch thành.
#Bước qua một lần lặp và đọc $t5 và $t6.
# ==========================================================
        .data
arr:    .word 10, 20, 30, 40, 50
m1:     .asciiz "sum = "
        .text
        .globl main
main:
        la   $t0, arr           #cơ sở
        li   $t1, 0             #tôi
        li   $t2, 5             #chiều dài
        li   $t3, 0             #ắc quy

sum:
        #Bất biến vòng lặp: $t3 là tổng của mảng[0] đến mảng[i-1].
        slt  $t4, $t1, $t2
        beq  $t4, $zero, ends

        sll  $t5, $t1, 2        #tôi * 4 byte
        add  $t6, $t0, $t5      #chỉ số cơ sở + tỷ lệ
        #$t6 hiện đặt tên chính xác cho một phần tử; lw lấy giá trị 32-bit của nó.
        lw   $t7, 0($t6)
        add  $t3, $t3, $t7

        addi $t1, $t1, 1
        j    sum

ends:
        la   $a0, m1
        li   $v0, 4
        syscall
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
