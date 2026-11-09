# 13 - Una instrucción es un número
#
# Ensambla y observa la columna Código del Segmento de texto. Cada instrucción básica es una
# palabra de 32 bits dividida en campos.
#
# Compara las dos instrucciones `add`. Los campos de la operación coinciden, mientras que los
# campos de los registros codifican los operandos distintos.
#
# En `addi`, los 16 bits inferiores guardan el inmediato 100, o `0x0064`. Cámbialo a 101 y
# vuelve a ensamblar para ver la diferencia.

        .text
        .globl main
main:
        # Tras montar, observa Code: estos mnemónicos no se guardan como texto.
        add  $t0, $t1, $t2      # tipo R: opcode, rs, rt, rd, funct
        add  $t3, $t4, $t5      # mismo formato, otros registros
        addi $t0, $t1, 100      # tipo I: la constante está en la palabra
        sll  $t0, $t1, 4        # el desplazamiento tiene su propio campo
        j    tail               # tipo J: una dirección, no un registro
tail:
        # li también se expande antes de ejecutar; el procesador solo ve palabras codificadas.
        li   $v0, 10
        syscall
