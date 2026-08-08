#استثنیٰ ہینڈلر ڈیمو بازیافت کرنا۔
#غیر منسلک اسٹور ایڈریس کی خرابی (اسٹور) کو بڑھاتا ہے۔ ہینڈلر ریکارڈ کرتا ہے۔
#وجہ، EPC اور BadVAddr، غلطی والی ہدایات کو چھوڑ دیتا ہے اور ERET کے ساتھ واپس آتا ہے۔

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
  #ایڈریس 1 لفظ کے مطابق نہیں ہے، اس لیے یہ ہدایت جان بوجھ کر غلطی کرتی ہے۔
  sw $t0, 1($zero)

  #ہینڈلر کے آگے بڑھنے کے بعد یہاں پر عمل درآمد دوبارہ شروع ہوتا ہے EPC ایک ہدایات کے ذریعے۔
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
  #CP0 رجسٹر 13 = وجہ، 14 = EPC، 8 = BadVAddr۔
  #کرنل رجسٹرز $k0/$k1 رکاوٹ والے صارف کے رجسٹروں کو خراب کرنے سے گریز کریں۔
  mfc0 $k0, $13
  sw   $k0, saved_cause
  mfc0 $k0, $14
  sw   $k0, saved_epc
  mfc0 $k1, $8
  sw   $k1, saved_badvaddr

  #معلوم فالٹنگ 4 بائٹ انسٹرکشن کو چھوڑیں۔ دوبارہ کوشش کرنا ہمیشہ کے لیے غلط ہو جائے گا۔
  addiu $k0, $k0, 4
  mtc0  $k0, $14
  eret
