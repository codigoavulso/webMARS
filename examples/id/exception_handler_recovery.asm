#Memulihkan demo penangan pengecualian.
#Toko yang tidak selaras memunculkan Address Error (toko). Penangan mencatat
#Penyebab, EPC dan BadVAddr, melewatkan instruksi kesalahan dan kembali dengan ERET.

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
  #Alamat 1 tidak selaras kata, jadi instruksi ini sengaja salah.
  sw $t0, 1($zero)

  #Eksekusi dilanjutkan di sini setelah handler memajukan EPC sebanyak satu instruksi.
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
  #CP0 register 13 = Penyebab, 14 = EPC, 8 = BadVAdr.
  #Register kernel $k0/$k1 menghindari kerusakan pada register pengguna yang terputus.
  mfc0 $k0, $13
  sw   $k0, saved_cause
  mfc0 $k0, $14
  sw   $k0, saved_epc
  mfc0 $k1, $8
  sw   $k1, saved_badvaddr

  #Lewati instruksi 4-byte kesalahan yang diketahui; mencobanya kembali akan menjadi kesalahan selamanya.
  addiu $k0, $k0, 4
  mtc0  $k0, $14
  eret
