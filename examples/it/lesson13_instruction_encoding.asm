# 13 - Un'istruzione è un numero
#
# Assemblare e ispezionare la colonna Codice nel segmento di testo. Ogni istruzione di base è
# una parola di 32 bit divisa in campi.
#
# Confronta le due istruzioni `add`. I campi operazione corrispondono, mentre i campi registro
# codificano i diversi operandi.
#
# In `addi`, i 16 bit bassi contengono il 100 immediato, che è `0x0064`. Cambialo in 101 e
# rimontalo per vedere il cambiamento.

        .text
        .globl main
main:
        #Ispeziona la colonna Codice dopo l'assemblaggio: questi mnemonici non vengono memorizzati come testo.
        add  $t0, $t1, $t2      #Tipo R: codice operativo, rs, rt, rd, funz
        add  $t3, $t4, $t5      #stessa forma, registri diversi
        addi $t0, $t1, 100      #Tipo I: la costante è nella parola
        sll  $t0, $t1, 4        #l'importo del turno ha un proprio campo
        j    tail               #Tipo J: un indirizzo, non un registro
tail:
        #li è esso stesso espanso prima dell'esecuzione; il processore vede solo parole codificate.
        li   $v0, 10
        syscall
