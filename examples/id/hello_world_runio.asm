#Halo Dunia untuk Jalankan I/O
#Mencetak pesan sederhana dan keluar.
# Pesan tersebut termasuk dalam .data; instruksi yang mencetaknya ada di .text.

.data
#.asciiz menyimpan karakter yang diikuti dengan terminator nol yang diperlukan oleh syscall 4.
msg: .asciiz "Hello, webMARS! Run I/O is working.\n"

.text
main:
  #Pilih print-string (4) di $v0 dan berikan alamat string di $a0.
  li $v0, 4
  la $a0, msg
  syscall

  #Keluar (10) menghentikan program simulasi dengan bersih.
  li $v0, 10
  syscall
