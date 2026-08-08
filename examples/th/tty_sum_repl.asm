#TTY REPL เครื่องคิดเลข (MMIO)
#เปิดเครื่องมือ > TTY อุปกรณ์ + ANSI เทอร์มินัล และเชื่อมต่อกับ MIPS
#รูปแบบอินพุต: a + b
#ตัวอย่าง: 3 + 4

.data
msg_banner: .asciiz "TTY calculator ready. Type: a + b"
msg_prompt: .asciiz "calc> "
msg_err:    .asciiz "Invalid format. Use: 3 + 4"
txt_plus:   .asciiz " + "
txt_eq:     .asciiz " = "

line_buf:   .space 96
digit_buf:  .space 16

.text
main:
  lui  $s0, 0xffff                #MMIO ฐาน = 0xFFFF0000

  la   $a0, msg_banner
  jal  send_zstr
  nop
  jal  send_crlf
  nop

repl_loop:
  la   $a0, msg_prompt
  jal  send_zstr
  nop

  la   $a0, line_buf
  li   $a1, 96
  jal  read_line
  nop

  #แยกวิเคราะห์ตัวถูกดำเนินการด้านซ้าย
  la   $a0, line_buf
  jal  parse_uint
  nop
  beq  $a2, $zero, parse_error
  nop
  move $s1, $v0                    #ซ้าย
  move $t0, $v1                    #ตัวชี้หลังจากซ้าย

  #ตัวดำเนินการแยกวิเคราะห์บวก
  move $a0, $t0
  jal  skip_spaces
  nop
  move $t0, $v0
  lbu  $t1, 0($t0)
  li   $t2, 43                      #บวก
  bne  $t1, $t2, parse_error
  nop
  addiu $t0, $t0, 1

  #แยกวิเคราะห์ตัวถูกดำเนินการที่ถูกต้อง
  move $a0, $t0
  jal  parse_uint
  nop
  beq  $a2, $zero, parse_error
  nop
  move $s2, $v0                    #ถูกต้อง
  move $t0, $v1                    #ตัวชี้ที่อยู่ด้านหลังขวา

  #อนุญาตเฉพาะช่องว่างต่อท้ายเท่านั้น
  move $a0, $t0
  jal  skip_spaces
  nop
  move $t0, $v0
  lbu  $t1, 0($t0)
  bne  $t1, $zero, parse_error
  nop

  #พิมพ์: a + b = ผลรวม
  addu $s3, $s1, $s2
  move $a0, $s1
  jal  send_uint
  nop
  la   $a0, txt_plus
  jal  send_zstr
  nop
  move $a0, $s2
  jal  send_uint
  nop
  la   $a0, txt_eq
  jal  send_zstr
  nop
  move $a0, $s3
  jal  send_uint
  nop
  jal  send_crlf
  nop
  b    repl_loop
  nop

parse_error:
  la   $a0, msg_err
  jal  send_zstr
  nop
  jal  send_crlf
  nop
  b    repl_loop
  nop

# ------------------------------------------------------------
#MMIO ตัวช่วย
# ------------------------------------------------------------

read_char:
wait_rx:
  lbu  $t0, 0($s0)                 #การควบคุมเครื่องรับ
  andi $t0, $t0, 1
  beq  $t0, $zero, wait_rx
  nop
  lbu  $v0, 4($s0)                 #ข้อมูลผู้รับ
  jr   $ra
  nop

send_byte:
wait_tx:
  lbu  $t0, 8($s0)                 #การควบคุมเครื่องส่งสัญญาณ
  andi $t0, $t0, 1
  beq  $t0, $zero, wait_tx
  nop
  sb   $a0, 12($s0)                #ข้อมูลเครื่องส่งสัญญาณ
  jr   $ra
  nop

send_crlf:
  addiu $sp, $sp, -4
  sw   $ra, 0($sp)
  li   $a0, 13
  jal  send_byte
  nop
  li   $a0, 10
  jal  send_byte
  nop
  lw   $ra, 0($sp)
  addiu $sp, $sp, 4
  jr   $ra
  nop

send_zstr:
  addiu $sp, $sp, -8
  sw   $ra, 4($sp)
  sw   $t9, 0($sp)
  move $t9, $a0
send_zstr_loop:
  lbu  $a0, 0($t9)
  beq  $a0, $zero, send_zstr_done
  nop
  jal  send_byte
  nop
  addiu $t9, $t9, 1
  b    send_zstr_loop
  nop
send_zstr_done:
  lw   $t9, 0($sp)
  lw   $ra, 4($sp)
  addiu $sp, $sp, 8
  jr   $ra
  nop

# ------------------------------------------------------------
#เครื่องมือแก้ไขบรรทัดอินพุต (ตัวอักษรที่พิมพ์ด้วย echoes)
#a0 = ตัวชี้บัฟเฟอร์, a1 = ความยาวสูงสุด
#v0 = ความยาวผลลัพธ์
# ------------------------------------------------------------

read_line:
  addiu $sp, $sp, -20
  sw   $ra, 16($sp)
  sw   $s1, 12($sp)
  sw   $s2, 8($sp)
  sw   $s3, 4($sp)
  sw   $s4, 0($sp)
  move $s1, $a0                    #บัฟเฟอร์
  move $s2, $a1                    #สูงสุด
  move $s3, $zero                  #ความยาว

read_line_loop:
  jal  read_char
  nop
  andi $s4, $v0, 0xff

  #CR/LF ยุติบรรทัดหากเรามีเนื้อหาอยู่แล้ว
  li   $t0, 13
  beq  $s4, $t0, read_line_term
  nop
  li   $t0, 10
  beq  $s4, $t0, read_line_term
  nop

  #การจัดการ Backspace
  li   $t0, 8
  bne  $s4, $t0, read_line_regular
  nop
  beq  $s3, $zero, read_line_loop
  nop
  addiu $s3, $s3, -1
  addu $t1, $s1, $s3
  sb   $zero, 0($t1)
  li   $a0, 8
  jal  send_byte
  nop
  li   $a0, 32
  jal  send_byte
  nop
  li   $a0, 8
  jal  send_byte
  nop
  b    read_line_loop
  nop

read_line_regular:
  #ละเว้นตัวอักษรควบคุม < 32
  li   $t0, 32
  slt  $t1, $s4, $t0
  bne  $t1, $zero, read_line_loop
  nop

  #เก็บหนึ่งไบต์เพื่อยุติศูนย์
  addiu $t0, $s2, -1
  slt  $t1, $s3, $t0
  beq  $t1, $zero, read_line_loop
  nop

  addu $t2, $s1, $s3
  sb   $s4, 0($t2)
  addiu $s3, $s3, 1

  move $a0, $s4                    #พิมพ์ถ่าน echo
  jal  send_byte
  nop
  b    read_line_loop
  nop

read_line_term:
  #ละเว้นบรรทัดว่าง (รวมถึง LF ครึ่งหนึ่งของคู่ CRLF)
  beq  $s3, $zero, read_line_loop
  nop
  addu $t0, $s1, $s3
  sb   $zero, 0($t0)
  jal  send_crlf
  nop
  move $v0, $s3
  lw   $s4, 0($sp)
  lw   $s3, 4($sp)
  lw   $s2, 8($sp)
  lw   $s1, 12($sp)
  lw   $ra, 16($sp)
  addiu $sp, $sp, 20
  jr   $ra
  nop

# ------------------------------------------------------------
#ผู้ช่วยพาร์เซอร์
# ------------------------------------------------------------

skip_spaces:
  move $t0, $a0
skip_spaces_loop:
  lbu  $t1, 0($t0)
  li   $t2, 32
  bne  $t1, $t2, skip_spaces_done
  nop
  addiu $t0, $t0, 1
  b    skip_spaces_loop
  nop
skip_spaces_done:
  move $v0, $t0
  jr   $ra
  nop

#a0 = ตัวชี้
#v0 = ค่าแยกวิเคราะห์
#v1 = ตัวชี้หลังตัวเลข
#a2 = ความสำเร็จ (1/0)
parse_uint:
  addiu $sp, $sp, -4
  sw   $ra, 0($sp)
  move $t9, $a0                    #เก็บตัวชี้เดิมไว้
  jal  skip_spaces
  nop
  move $t0, $v0                    #ตัวชี้การสแกน
  move $t1, $zero                  #ค่า
  move $t2, $zero                  #การนับหลัก

parse_uint_loop:
  lbu  $t3, 0($t0)
  li   $t4, 48                      #หลักศูนย์
  slt  $t5, $t3, $t4
  bne  $t5, $zero, parse_uint_done_digits
  nop
  li   $t4, 58                      #ลำไส้ใหญ่
  slt  $t5, $t3, $t4
  beq  $t5, $zero, parse_uint_done_digits
  nop
  addiu $t2, $t2, 1
  li   $t6, 10
  mul  $t1, $t1, $t6
  addiu $t3, $t3, -48
  addu $t1, $t1, $t3
  addiu $t0, $t0, 1
  b    parse_uint_loop
  nop

parse_uint_done_digits:
  beq  $t2, $zero, parse_uint_fail
  nop
  move $v0, $t1
  move $v1, $t0
  li   $a2, 1
  lw   $ra, 0($sp)
  addiu $sp, $sp, 4
  jr   $ra
  nop

parse_uint_fail:
  move $v0, $zero
  move $v1, $t9
  move $a2, $zero
  lw   $ra, 0($sp)
  addiu $sp, $sp, 4
  jr   $ra
  nop

# ------------------------------------------------------------
#เอาต์พุตหมายเลข
#a0 = จำนวนเต็มที่ไม่ได้ลงนาม
# ------------------------------------------------------------

send_uint:
  addiu $sp, $sp, -20
  sw   $ra, 16($sp)
  sw   $s1, 12($sp)
  sw   $s2, 8($sp)
  sw   $s3, 4($sp)
  sw   $s4, 0($sp)
  move $s1, $a0

  bne  $s1, $zero, send_uint_build
  nop
  li   $a0, 48                      #หลักศูนย์
  jal  send_byte
  nop
  b    send_uint_done
  nop

send_uint_build:
  la   $s2, digit_buf
  move $s3, $zero                  #นับ
send_uint_div_loop:
  li   $t0, 10
  divu $s1, $t0
  mfhi $t1
  mflo $s1
  addiu $t1, $t1, 48
  sb   $t1, 0($s2)
  addiu $s2, $s2, 1
  addiu $s3, $s3, 1
  bne  $s1, $zero, send_uint_div_loop
  nop

  addiu $s2, $s2, -1
send_uint_out_loop:
  lbu  $a0, 0($s2)
  jal  send_byte
  nop
  addiu $s2, $s2, -1
  addiu $s3, $s3, -1
  bgtz $s3, send_uint_out_loop
  nop

send_uint_done:
  lw   $s4, 0($sp)
  lw   $s3, 4($sp)
  lw   $s2, 8($sp)
  lw   $s1, 12($sp)
  lw   $ra, 16($sp)
  addiu $sp, $sp, 20
  jr   $ra
  nop
