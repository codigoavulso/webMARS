#COP1 Arithmetik-Demo.
#Deckt doppelte Ladungen/Speicherungen, Arithmetik, Vergleich, Verzweigung usw. ab
#Konvertierung in eine 32-Bit-Ganzzahl unter Verwendung des aktiven Rundungsmodus FCSR.

.data
.align 3   #Doubles benötigen eine Acht-Byte-Ausrichtung
left:          .double 1.5
right:         .double 2.25
stored_sum:    .space 8
round_source:  .float 1.6
sum_label:     .asciiz "1.5 + 2.25 = "
compare_true:  .asciiz "1.5 is less than 2.25\n"
compare_false: .asciiz "Unexpected comparison result\n"
round_label:   .asciiz "1.6 rounded with the default FCSR mode = "
newline:       .asciiz "\n"

.text
main:
  ldc1  $f0, left   #ein Double belegt ein gerades Registerpaar
  ldc1  $f2, right
  add.d $f4, $f0, $f2   #Arithmetik läuft im Coprozessor, nicht im CPU
  sdc1  $f4, stored_sum

  li    $v0, 4
  la    $a0, sum_label
  syscall
  mov.d $f12, $f4
  li    $v0, 3
  syscall
  li    $v0, 4
  la    $a0, newline
  syscall

  c.lt.d $f0, $f2   #Der Vergleich schreibt ein Flag, es wird nicht verzweigt
  bc1t   comparison_ok   #Dies ist der Zweig, der dieses Flag liest
  nop
  la     $a0, compare_false
  b      print_comparison
  nop
comparison_ok:
  la     $a0, compare_true
print_comparison:
  li     $v0, 4
  syscall

  lwc1    $f6, round_source
  cvt.w.s $f8, $f6   #1.6 wird mithilfe des Rundungsmodus FCSR zu einer Ganzzahl
  mfc1    $a0, $f8   #Bringen Sie das Ergebnis zurück zum CPU, um es zu drucken
  li      $v0, 4
  la      $a0, round_label
  syscall
  mfc1    $a0, $f8
  li      $v0, 1
  syscall
  li      $v0, 4
  la      $a0, newline
  syscall

  li $v0, 10
  syscall
