#Özyinelemeli faktöriyel (fakülte klasiği)
#N'yi okur ve n'yi yazdırır! (küçük n için).

.data
ask: .asciiz "n (0..12)? "
out: .asciiz "factorial = "

.text
main:
  li $v0, 4
  la $a0, ask
  syscall

  li $v0, 5
  syscall
  move $a0, $v0

  jal fact   #n, $a0 içindedir; sonuç $v0 ile geri gelir
  move $s0, $v0

  li $v0, 4
  la $a0, out
  syscall

  li $v0, 1
  move $a0, $s0
  syscall

  li $v0, 11
  li $a0, '\n'
  syscall

  li $v0, 10
  syscall

#int aslında(int n)
fact:
  addiu $sp, $sp, -8   #çağrı başına bir kare: iki kelime
  sw    $ra, 4($sp)   #tekrar aramadan önce gönderen adresi kaydedin
  sw    $a0, 0($sp)   #n'yi tut: özyinelemeli çağrı $a0 üzerine yazar

  blez  $a0, fact_base   #durma koşulu: bu olmadan yığın asla çözülmez
  li    $t0, 1
  beq   $a0, $t0, fact_base

  addiu $a0, $a0, -1
  jal   fact

  lw    $t1, 0($sp)   #yine bizim n'miz, aşağıdaki çağrıdan etkilenmemiş
  mul   $v0, $v0, $t1
  j     fact_end

fact_base:
  li    $v0, 1

fact_end:
  lw    $ra, 4($sp)   #geri dönmeden önce çerçeveyi geri yükleyin ve bırakın
  addiu $sp, $sp, 8
  jr    $ra
