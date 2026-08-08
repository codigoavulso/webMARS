#Ręczny test parzystości dla obniżania pseudo-operacji.
#Po uruchomieniu sprawdź segment danych w wynikach:
#wyniki[0] = 1 sekwencja 5,5
#wyniki[1] = 1 stopień 5,5
#wyniki[2] = 5 abs -5
#wyniki[3] = 0xfffffffa nie 5

.data
results: .word 0, 0, 0, 0

.text
main:
  ori $t0, $zero, 5
  ori $t1, $zero, 5
  addiu $t2, $zero, -5

  seq $s0, $t0, $t1
  sge $s1, $t0, $t1
  abs $s2, $t2
  not $s3, $t0

  lui $t4, 0x1001
  ori $t4, $t4, 0x0000
  sw $s0, 0($t4)
  sw $s1, 4($t4)
  sw $s2, 8($t4)
  sw $s3, 12($t4)

  ori $v0, $zero, 10
  syscall
