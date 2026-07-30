# Multi-file example helper 1/2
# Input:  $a0 = number
# Output: $v0 = address of the "even" or "odd" message

.data
even_msg: .asciiz "even"
odd_msg:  .asciiz "odd"

.text
.globl get_parity_message
get_parity_message:
  # The least-significant bit is 0 for even numbers and 1 for odd numbers.
  andi $t0, $a0, 1
  bne $t0, $zero, parity_odd
  nop

  # Return an address rather than printing here; the caller chooses how to use it.
  la $v0, even_msg
  jr $ra
  nop

parity_odd:
  la $v0, odd_msg
  jr $ra
  nop
