#Demo sortowania bąbelkowego
#Sortuje ustaloną tablicę i wypisuje posortowane wartości.
#Pojęcia: indeksowany dostęp do słów, zagnieżdżone pętle, porównanie ze znakami i zamiana w miejscu.
#Plan rejestru: $s0 = baza tablicy, $s1 = długość, $t0/$t1 = indeksy pętli.

.data
arr: .word 42, 7, 19, -3, 88, 0, 15, 15, 2, 100
n:   .word 10
sep: .asciiz " "
msg: .asciiz "Sorted: "

.text
main:
  la  $s0, arr
  lw  $s1, n

  li  $t0, 0              #ja
outer:
  #Po przejściu i największe wartości i są już ustalone na prawej krawędzi.
  bge $t0, $s1, print
  li  $t1, 0              #j
  subu $t2, $s1, $t0
  addiu $t2, $t2, -1
inner:
  bge $t1, $t2, next_i

  #Słowo zajmuje cztery bajty, więc arr[j] ma bazę + j*4.
  sll $t3, $t1, 2
  addu $t4, $s0, $t3
  lw  $t5, 0($t4)
  lw  $t6, 4($t4)

  ble $t5, $t6, no_swap
  #Sąsiednie wartości są nieprawidłowe: wymień je w pamięci.
  sw  $t6, 0($t4)
  sw  $t5, 4($t4)
no_swap:
  addiu $t1, $t1, 1
  j inner

next_i:
  addiu $t0, $t0, 1
  j outer

print:
  #Syscall 4 drukuje etykietę przed przejściem element po elemencie.
  li $v0, 4
  la $a0, msg
  syscall

  li $t7, 0
print_loop:
  #Użyj ponownie tego samego obliczenia adresu, aby pobrać arr[indeks].
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
