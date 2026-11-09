# Ein Wortladevorgang erfordert eine durch vier teilbare Adresse. In diesem Beispiel wird 0x10010001 verwendet, um die Ausnahme auszulösen.
#Erwartetes Verhalten:
#- Ladeausnahme ausgelöst am 0x10010001
#- Schlechte Adresse / vaddr zeigt 0x10010001

.data
value: .word 0x12345678

.text
main:
  lui $t0, 0x1001
  ori $t0, $t0, 0x0001
  lw $t1, 0($t0)
  ori $v0, $zero, 10
  syscall
