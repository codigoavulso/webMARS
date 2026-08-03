#Многофайловый пример помощника 1/2
#Ввод: $a0 = номер
#Вывод: $v0 = адрес «четного» или «нечетного» сообщения.

.data
even_msg: .asciiz "even"
odd_msg:  .asciiz "odd"

.text
.globl get_parity_message
get_parity_message:
  #Младший бит равен 0 для четных чисел и 1 для нечетных чисел.
  andi $t0, $a0, 1
  bne $t0, $zero, parity_odd
  nop

  #Возвращайте адрес, а не печатайте здесь; вызывающий абонент выбирает, как его использовать.
  la $v0, even_msg
  jr $ra
  nop

parity_odd:
  la $v0, odd_msg
  jr $ra
  nop
