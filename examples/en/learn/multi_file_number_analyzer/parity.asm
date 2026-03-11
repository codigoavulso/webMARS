# Multi-file example helper 1/2
# Input:  $a0 = number
# Output: $v0 = address of the "even" or "odd" message

.data
even_msg: .asciiz "even"
odd_msg:  .asciiz "odd"

.text
.globl get_parity_message
get_parity_message:
  andi $t0, $a0, 1
  bne $t0, $zero, parity_odd
  nop

  la $v0, even_msg
  jr $ra
  nop

parity_odd:
  la $v0, odd_msg
  jr $ra
  nop
