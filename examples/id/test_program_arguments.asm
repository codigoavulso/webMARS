#Contoh argumen program.
#Gunakan contoh ini untuk menguji dukungan argc/argv di MARS.
#Untuk mencobanya, buka Pengaturan > Argumen program yang disediakan untuk program MIPS,
#masukkan beberapa argumen, lalu Rakit dan jalankan program.
#Contoh argumen: ola 123 "abc def"

.data
argc_msg: .asciiz "argc = "
argv_msg: .asciiz "argv["
mid_msg:  .asciiz "] = "
nl:       .asciiz "\n"

.text
main:
  #Program demo untuk argumen program.
  #Saat masuk:
  #$a0 = argc
  #$a1 = argv
  move $s0, $a0          #Simpan argumen.
  move $s1, $a1          #Simpan argumen.

  #Cetak argumen.
  li   $v0, 4
  la   $a0, argc_msg
  syscall

  li   $v0, 1
  move $a0, $s0
  syscall

  li   $v0, 4
  la   $a0, nl
  syscall

  #Ulangi argv[i].
  li   $t0, 0            #saya = 0

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

  #argv adalah array pointer, jadi argv[i] ada di argv + i * 4.
  sll  $t1, $t0, 2       #offset = saya * 4
  addu $t2, $s1, $t1     #alamat argv[i]
  lw   $a0, 0($t2)       #memuat argumen[i]

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
