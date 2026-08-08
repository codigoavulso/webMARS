#Kiểm tra tính chẵn lẻ thủ công cho lỗi địa chỉ khi tải.
#Hành vi dự kiến:
#- ngoại lệ tải được nêu lên trên 0x10010001
#- địa chỉ xấu / vaddr hiển thị 0x10010001

.data
value: .word 0x12345678

.text
main:
  lui $t0, 0x1001
  ori $t0, $t0, 0x0001
  lw $t1, 0($t0)
  ori $v0, $zero, 10
  syscall
