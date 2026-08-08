#버블 정렬 데모
#고정 배열을 정렬하고 정렬된 값을 인쇄합니다.
#개념: 색인된 단어 액세스, 중첩 루프, 부호 있는 비교 및 내부 교환.
#등록 계획: $s0 = 배열 기반, $s1 = 길이, $t0/$t1 = 루프 인덱스.

.data
arr: .word 42, 7, 19, -3, 88, 0, 15, 15, 2, 100
n:   .word 10
sep: .asciiz " "
msg: .asciiz "Sorted: "

.text
main:
  la  $s0, arr
  lw  $s1, n

  li  $t0, 0              #나
outer:
  #i를 통과한 후 i개의 가장 큰 값은 이미 오른쪽 가장자리에 고정되어 있습니다.
  bge $t0, $s1, print
  li  $t1, 0              #j
  subu $t2, $s1, $t0
  addiu $t2, $t2, -1
inner:
  bge $t1, $t2, next_i

  #워드는 4바이트를 차지하므로 arr[j]는 base + j*4에 있습니다.
  sll $t3, $t1, 2
  addu $t4, $s0, $t3
  lw  $t5, 0($t4)
  lw  $t6, 4($t4)

  ble $t5, $t6, no_swap
  #인접한 값이 순서가 잘못되었습니다. 메모리에서 교환합니다.
  sw  $t6, 0($t4)
  sw  $t5, 4($t4)
no_swap:
  addiu $t1, $t1, 1
  j inner

next_i:
  addiu $t0, $t0, 1
  j outer

print:
  #Syscall 4는 요소별 순회 전에 레이블을 인쇄합니다.
  li $v0, 4
  la $a0, msg
  syscall

  li $t7, 0
print_loop:
  #동일한 주소 계산을 재사용하여 arr[index]를 가져옵니다.
  bge $t7, $s1, end
  sll $t3, $t7, 2
  addu $t4, $s0, $t3
  lw  $a0, 0($t4)
  li  $v0, 1
  syscall

  li $v0, 4
  la $a0, sep
  syscall

  addiu $t7, $t7, 1
  j print_loop

end:
  li $v0, 11
  li $a0, '\n'
  syscall
  li $v0, 10
  syscall
