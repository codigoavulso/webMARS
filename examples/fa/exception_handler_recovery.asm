#بازیابی نسخه ی نمایشی کنترل کننده استثنا.
#فروشگاه بدون تراز خطای آدرس (فروشگاه) را افزایش می دهد. کنترل کننده ثبت می کند
#علت، EPC و BadVAddr، دستور خطا را نادیده می گیرد و با ERET برمی گردد.

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
  #آدرس 1 با کلمه تراز نیست، بنابراین این دستورالعمل عمداً اشتباه می کند.
  sw $t0, 1($zero)

  #پس از اینکه کنترل کننده EPC را با یک دستورالعمل پیش برد، اجرا در اینجا از سر گرفته می شود.
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
  #CP0 ثبت 13 = علت، 14 = EPC، 8 = BadVAddr.
  #ثبت‌های هسته $k0/$k1 از خراب کردن ثبت‌های کاربر قطع شده جلوگیری می‌کند.
  mfc0 $k0, $13
  sw   $k0, saved_cause
  mfc0 $k0, $14
  sw   $k0, saved_epc
  mfc0 $k1, $8
  sw   $k1, saved_badvaddr

  #از دستور 4 بایتی خطای شناخته شده صرف نظر کنید. تلاش مجدد برای همیشه اشتباه خواهد بود.
  addiu $k0, $k0, 4
  mtc0  $k0, $14
  eret
