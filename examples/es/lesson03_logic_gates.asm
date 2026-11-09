# 03 - Puertas lógicas en 32 bits
#
# Cada bit del resultado depende solo de los bits en la misma posición de los dos operandos. No
# hay acarreo entre posiciones.
#
# Con la máscara `0x0F`, AND conserva los cuatro bits inferiores y borra el resto. OR pone los
# cuatro inferiores a 1 y XOR los invierte.
#
# Compara los tres resultados en hexadecimal y prueba la máscara `0xF0` para operar sobre el
# siguiente grupo de cuatro bits.

        .data
ma:     .asciiz "AND keeps the low nibble: "
mo:     .asciiz "OR sets the low nibble:   "
mx:     .asciiz "XOR flips the low nibble: "
        .text
        .globl main
main:
        li   $t0, 204           # 0xCC
        li   $t1, 15            # máscara 0x0F

        la   $a0, ma
        li   $v0, 4
        syscall
        # AND borra cada posición donde la máscara contiene cero.
        and  $t2, $t0, $t1
        move $a0, $t2
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, mo
        li   $v0, 4
        syscall
        or   $t3, $t0, $t1
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, mx
        li   $v0, 4
        syscall
        # XOR invierte únicamente las posiciones seleccionadas por unos en la máscara.
        xor  $t4, $t0, $t1
        move $a0, $t4
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
