# 15 - Perché il passo cambia la velocità
#
# Entrambi i cicli utilizzano lo stesso array. Il primo legge tutte le 256 parole; il secondo
# legge ogni 16 parole, effettuando solo 16 caricamenti.
#
# Con blocchi cache di 16 parole, le letture sequenziali possono riutilizzare ciascun blocco
# recuperato. Il secondo ciclo avanza ad un nuovo blocco ad ogni carico.
#
# Collega il simulatore a MIPS, seleziona «Abilitato» e imposta la dimensione del blocco a 16 parole.
# Usa Simulatore di cache di dati con un punto di interruzione su `far` per ispezionare il primo
# loop. Reimposta le statistiche della cache lì prima di eseguire il secondo ciclo e confronta i
# tassi di successo.

        .data
buf:    .word 0:256
m1:     .asciiz "stride 1 sum = "
m2:     .asciiz "stride 16 sum = "
        .text
        .globl main
main:
# Passaggio sequenziale: tutte le 256 parole.
        la   $t0, buf
        li   $t1, 0
        li   $t2, 256
        li   $t3, 0
near:
        #Gli indici sequenziali riutilizzano le parole di ciascun blocco della cache prima di proseguire.
        slt  $t4, $t1, $t2
        beq  $t4, $zero, endnear
        sll  $t5, $t1, 2
        add  $t6, $t0, $t5
        lw   $t7, 0($t6)
        add  $t3, $t3, $t7
        addi $t1, $t1, 1
        j    near
endnear:
        la   $a0, m1
        li   $v0, 4
        syscall
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall

# Passaggio stridato: un caricamento ogni sedici parole.
        li   $t1, 0
        li   $t3, 0
far:
        # L'indirizzo successivo è a 64 byte di distanza: sedici parole da quattro byte ciascuna.
        slt  $t4, $t1, $t2
        beq  $t4, $zero, endfar
        sll  $t5, $t1, 2
        add  $t6, $t0, $t5
        lw   $t7, 0($t6)
        add  $t3, $t3, $t7
        addi $t1, $t1, 16
        j    far
endfar:
        la   $a0, m2
        li   $v0, 4
        syscall
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
