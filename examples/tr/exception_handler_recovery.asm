#İstisna işleyici demosu kurtarılıyor.
#Hizalanmamış depo Adres Hatasını (depo) yükseltir. İşleyici kayıtları
#Çünkü, EPC ve BadVAddr, hata veren talimatı atlar ve ERET ile geri döner.

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
  #Adres 1 kelime hizalı değildir, dolayısıyla bu talimat kasıtlı olarak hata verir.
  sw $t0, 1($zero)

  #İşleyici EPC'i bir talimat ilerlettikten sonra yürütme burada devam eder.
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
  #CP0 kaydı 13 = Neden, 14 = EPC, 8 = BadVAddr.
  #Çekirdek kayıtları $k0/$k1 kesintiye uğrayan kullanıcı kayıtlarının bozulmasını önler.
  mfc0 $k0, $13
  sw   $k0, saved_cause
  mfc0 $k0, $14
  sw   $k0, saved_epc
  mfc0 $k1, $8
  sw   $k1, saved_badvaddr

  #Bilinen hatalı 4 baytlık talimatı atlayın; tekrar denemek sonsuza kadar hata olur.
  addiu $k0, $k0, 4
  mtc0  $k0, $14
  eret
