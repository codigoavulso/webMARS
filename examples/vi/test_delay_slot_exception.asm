#Kiểm tra tính chẵn lẻ bằng tay:
#Khi bật phân nhánh bị trì hoãn, tình trạng tràn sẽ xảy ra trong khe trễ.
#Hành vi dự kiến:
#- thông báo ngoại lệ: tràn số học
#- Nguyên nhân.BD đặt
#- EPC trỏ tới lệnh beq

.text
main:
  lui $t1, 0x7fff
  ori $t1, $t1, 0xffff
  ori $t2, $zero, 1
  beq $zero, $zero, done
  add $t0, $t1, $t2

done:
  ori $v0, $zero, 10
  syscall
