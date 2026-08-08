#Khôi phục bản trình diễn xử lý ngoại lệ.
#Cửa hàng chưa được căn chỉnh sẽ gây ra Lỗi Địa chỉ (lưu trữ). Các bản ghi xử lý
#Nguyên nhân, EPC và BadVAddr, bỏ qua hướng dẫn lỗi và trả về với ERET.

.data
recovered:     .asciiz "Recovered from the exception.\n"
cause_label:   .asciiz "Cause: "
epc_label:     .asciiz "EPC: "
badvaddr_label:.asciiz "BadVAddr: "
newline:       .asciiz "\n"
saved_cause:   .word 0
saved_epc:     .word 0
saved_badvaddr:.word 0

.text
main:
  li $t0, 0x12345678
  #Địa chỉ 1 không được căn chỉnh theo từ nên lệnh này cố tình mắc lỗi.
  sw $t0, 1($zero)

  #Quá trình thực thi sẽ tiếp tục ở đây sau khi trình xử lý tiến lên EPC theo một lệnh.
  li $v0, 4
  la $a0, recovered
  syscall

  la $a0, cause_label
  syscall
  lw $a0, saved_cause
  li $v0, 34
  syscall
  li $v0, 4
  la $a0, newline
  syscall

  la $a0, epc_label
  syscall
  lw $a0, saved_epc
  li $v0, 34
  syscall
  li $v0, 4
  la $a0, newline
  syscall

  la $a0, badvaddr_label
  syscall
  lw $a0, saved_badvaddr
  li $v0, 34
  syscall
  li $v0, 4
  la $a0, newline
  syscall

  li $v0, 10
  syscall

.ktext 0x80000180
exception_handler:
  #CP0 đăng ký 13 = Nguyên nhân, 14 = EPC, 8 = BadVAddr.
  #Các thanh ghi hạt nhân $k0/$k1 tránh làm hỏng các thanh ghi người dùng bị gián đoạn.
  mfc0 $k0, $13
  sw   $k0, saved_cause
  mfc0 $k0, $14
  sw   $k0, saved_epc
  mfc0 $k1, $8
  sw   $k1, saved_badvaddr

  #Bỏ qua lệnh 4 byte bị lỗi đã biết; thử lại nó sẽ lỗi mãi mãi.
  addiu $k0, $k0, 4
  mtc0  $k0, $14
  eret
