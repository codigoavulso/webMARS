#Program argümanları örneği.
#MARS'da argc/argv desteğini test etmek için bu örneği kullanın.
#Denemek için Ayarlar > MIPS programına sağlanan program bağımsız değişkenleri seçeneğine gidin,
#bazı argümanlar girin, ardından programı birleştirin ve çalıştırın.
#Örnek argümanlar: ola 123 "abc def"

.data
argc_msg: .asciiz "argc = "
argv_msg: .asciiz "argv["
mid_msg:  .asciiz "] = "
nl:       .asciiz "\n"

.text
main:
  #Program argümanları için demo programı.
  #Girişte:
  #$a0 = argc
  #$a1 = argv
  move $s0, $a0          #argc'yi kaydedin.
  move $s1, $a1          #argv'yi kaydedin.

  #argc'yi yazdır.
  li   $v0, 4
  la   $a0, argc_msg
  syscall

  li   $v0, 1
  move $a0, $s0
  syscall

  li   $v0, 4
  la   $a0, nl
  syscall

  #argv[i] üzerinde döngü yapın.
  li   $t0, 0            #ben = 0

print_loop:
  beq  $t0, $s0, done

  li   $v0, 4
  la   $a0, argv_msg
  syscall

  li   $v0, 1
  move $a0, $t0
  syscall

  li   $v0, 4
  la   $a0, mid_msg
  syscall

  #argv bir işaretçi dizisidir, dolayısıyla argv[i] argv + i * 4'tedir.
  sll  $t1, $t0, 2       #ofset = i * 4
  addu $t2, $s1, $t1     #argv[i] adresi
  lw   $a0, 0($t2)       #argv'yi yükle[i]

  li   $v0, 4
  syscall

  li   $v0, 4
  la   $a0, nl
  syscall

  addiu $t0, $t0, 1
  j    print_loop

done:
  li   $v0, 10
  syscall
