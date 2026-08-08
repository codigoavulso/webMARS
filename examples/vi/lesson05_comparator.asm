# ==========================================================
#Bài 05 - Bộ so sánh và nhánh
#
#THE PROBLEM
#Một quyết định cần một bit, nhưng so sánh hai số 32 bit
#là một phép trừ. Làm thế nào một phép trừ trở thành một sự lựa chọn?
#
#WHAT THE HARDWARE DOES
#slt trừ và vứt bỏ mọi thứ trừ dấu,
#ghi 0 hoặc 1. Sau đó nhánh sẽ nạp bit đó vào PC
#logic, thêm phần bù hoặc cho phép PC tiến lên.
#
#THE SOLUTION
#So sánh vào một thanh ghi, nhánh trên thanh ghi đó. Kiểm soát
#luồng là số học cộng với một bộ ghép kênh trên PC.
#
#WATCH FOR
#Sau slt, $t2 giữ 1. Bước qua beq và xem PC
#trên thanh trạng thái: nó nhảy thay vì tiến lên bốn.
# ==========================================================
        .data
lo:     .asciiz "a is smaller"
hi:     .asciiz "a is not smaller"
        .text
        .globl main
main:
        li   $t0, 7             #một
        li   $t1, 12            #b
        #slt cụ thể hóa sự so sánh dưới dạng số nguyên thông thường, không bao giờ dưới dạng cờ ẩn.
        slt  $t2, $t0, $t1      #t2 = 1 nếu a < b
        #Chỉ phân nhánh thành notless khi kết quả Boolean đó bằng 0.
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
