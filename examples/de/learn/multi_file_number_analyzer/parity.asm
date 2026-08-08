#Beispielhelfer für mehrere Dateien 1/2
#Eingabe: $a0 = Zahl
#Ausgabe: $v0 = Adresse der „geraden“ oder „ungeraden“ Nachricht

.data
even_msg: .asciiz "even"
odd_msg:  .asciiz "odd"

.text
.globl get_parity_message
get_parity_message:
  #Das niedrigstwertige Bit ist 0 für gerade Zahlen und 1 für ungerade Zahlen.
  andi $t0, $a0, 1
  bne $t0, $zero, parity_odd
  nop

  #Geben Sie eine Adresse zurück, anstatt sie hier auszudrucken. Der Anrufer entscheidet, wie er es nutzt.
  la $v0, even_msg
  jr $ra
  nop

parity_odd:
  la $v0, odd_msg
  jr $ra
  nop
