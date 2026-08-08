#การกู้คืนการสาธิตตัวจัดการข้อยกเว้น
#ร้านค้าที่ไม่ได้จัดแนวทำให้เกิดข้อผิดพลาดเกี่ยวกับที่อยู่ (ร้านค้า) ผู้ดำเนินการบันทึก
#สาเหตุ EPC และ BadVAddr ข้ามคำสั่งที่มีข้อบกพร่องและส่งคืนด้วย ERET

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
  #ที่อยู่ 1 ไม่สอดคล้องกับคำ ดังนั้นคำสั่งนี้จึงจงใจผิดพลาด
  sw $t0, 1($zero)

  #การดำเนินการดำเนินการต่อที่นี่หลังจากที่ตัวจัดการเลื่อน EPC ไปหนึ่งคำสั่ง
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
  #CP0 ลงทะเบียน 13 = สาเหตุ 14 = EPC, 8 = BadVAddr
  #เคอร์เนลรีจิสเตอร์ $k0/$k1 หลีกเลี่ยงการทำให้รีจิสเตอร์ของผู้ใช้ที่ถูกขัดจังหวะเสียหาย
  mfc0 $k0, $13
  sw   $k0, saved_cause
  mfc0 $k0, $14
  sw   $k0, saved_epc
  mfc0 $k1, $8
  sw   $k1, saved_badvaddr

  #ข้ามคำสั่ง 4 ไบต์ที่ทราบข้อบกพร่อง การลองอีกครั้งมันจะผิดพลาดตลอดไป
  addiu $k0, $k0, 4
  mtc0  $k0, $14
  eret
