# 05 - Bộ so sánh và nhánh
#
# `slt` so sánh hai số nguyên có dấu và ghi 1 khi số đầu tiên nhỏ hơn hoặc 0 nếu ngược lại.
#
# Đối với 7 và 12, `$t2` là 1, vì vậy `beq` không chuyển tới `notless` và việc thực thi tiếp tục
# đến lệnh tiếp theo.
#
# Khi phân nhánh bị trì hoãn, hãy bước qua `beq` và quan sát PC. Hoán đổi hai giá trị đầu vào và
# so sánh đích mới.

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
