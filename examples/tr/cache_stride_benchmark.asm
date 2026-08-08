#Önbellek davranışı karşılaştırması: sıralı ve adım-16 erişimi.
#Araçlar > Veri Önbelleği Simülasyon Aracı'nı açın, onu MIPS'e bağlayın ve Etkin seçeneğini işaretleyin.
#
#Her yürütme tam olarak bir soğuk önbellek modelini ölçer. ACCESS_PATTERN'ı ayarlayın
#1 veya 2'ye getirin, simülatör istatistiklerini sıfırlayın, ardından toplayın ve tekrar çalıştırın.
#Her iki model de 1024 yükleme gerçekleştirir; hiçbir başlatma yazısı veriyi kirletmez.

.eqv ACCESS_PATTERN 1    #1 = sıralı, 2 = 16 kelimelik adım
.eqv WORD_COUNT 1024
.eqv STRIDE_WORDS 16

.data
.align 2
arr: .space 4096

.text
main:
  li   $t9, ACCESS_PATTERN
  li   $t8, 2
  beq  $t9, $t8, stride_setup
  nop

  #Desen 1: sıralı adresler.
  la   $t0, arr
  li   $t1, WORD_COUNT
  move $s0, $zero
sequential_loop:
  lw   $t2, 0($t0)
  addu $s0, $s0, $t2
  addiu $t0, $t0, 4
  addiu $t1, $t1, -1
  bnez $t1, sequential_loop
  nop
  b    done
  nop

  #Desen 2: Her 16. kelimeyi ziyaret edin, ardından başlangıç ofsetini ilerletin.
stride_setup:
  la   $t3, arr
  move $t4, $zero
  move $s0, $zero
stride_outer:
  move $t5, $t4
stride_inner:
  sll  $t6, $t5, 2
  addu $t7, $t3, $t6
  lw   $t2, 0($t7)
  addu $s0, $s0, $t2
  addiu $t5, $t5, STRIDE_WORDS
  blt  $t5, WORD_COUNT, stride_inner
  nop
  addiu $t4, $t4, 1
  blt  $t4, STRIDE_WORDS, stride_outer
  nop

done:
  li   $v0, 10
  syscall
