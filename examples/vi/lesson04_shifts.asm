# 04 - Sự dịch chuyển và lũy thừa của hai
#
# Sự dịch chuyển trái bằng 3 nhân với 8 khi kết quả phù hợp. Các bit dịch chuyển qua mép sẽ bị
# loại bỏ.
#
# Ở bên phải, `srl` điền số 0 và `sra` sao chép bit dấu. Đối với -16 được dịch chuyển 2, kỳ vọng
# lần lượt là 1073741820 và -4.
#
# Hãy thử -15 với `sra`. Kết quả là -4 vì số ca làm tròn xuống; các vòng chia đã ký về phía
# không.

        .data
m1:     .asciiz "5 << 3 = "
m2:     .asciiz "-16 >> 2 arithmetic = "
m3:     .asciiz "-16 >> 2 logical    = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall
        li   $t0, 5
        #Ba ca trái nhân với 2^3 trong khi chỉ giữ lại 32 bit kết quả.
        sll  $t1, $t0, 3        # 5 * 8
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $t2, -16

        la   $a0, m2
        li   $v0, 4
        syscall
        #So sánh $t3 và $t4 theo hệ thập lục phân để xem các bit đến khác nhau.
        sra  $t3, $t2, 2        #dấu hiệu được bảo toàn: -4
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, m3
        li   $v0, 4
        syscall
        srl  $t4, $t2, 2        #số không chuyển vào: dương rất lớn
        move $a0, $t4
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
