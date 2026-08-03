#Contoh pembantu multi-file 1/2
#Masukan: $a0 = angka
#Output: $v0 = alamat pesan "genap" atau "ganjil"

.data
even_msg: .asciiz "even"
odd_msg:  .asciiz "odd"

.text
.globl get_parity_message
get_parity_message:
  #Bit paling tidak signifikan adalah 0 untuk bilangan genap dan 1 untuk bilangan ganjil.
  andi $t0, $a0, 1
  bne $t0, $zero, parity_odd
  nop

  #Kembalikan alamat daripada mencetak di sini; penelepon memilih cara menggunakannya.
  la $v0, even_msg
  jr $ra
  nop

parity_odd:
  la $v0, odd_msg
  jr $ra
  nop
