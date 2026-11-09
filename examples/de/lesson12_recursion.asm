# 12 – Rekursion und Frames
#
# Ein rekursiver Aufruf überschreibt `$ra` und verwendet `$a0` für sein eigenes Argument.
# Speichern Sie beide Werte vor dem Anruf.
#
# Gehen Sie für jeden Wert von 5 bis 1 in `fact`. Jeder Aufruf reserviert acht Bytes,
# einschließlich des Aufrufs, der 1 zurückgibt.
#
# Setzen Sie einen Haltepunkt auf `mul`, um den Rückweg zu beobachten. Jeder Aufruf lädt sein
# eigenes Argument neu, multipliziert und gibt seinen Rahmen frei.

        .data
m1:     .asciiz "5! = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall

        li   $a0, 5
        jal  fact

        move $a0, $v0
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall

#---- int fact(int n) ----
fact:
        #Jeder Aufruf besitzt einen eigenen Acht-Byte-Frame.
        addi $sp, $sp, -8
        sw   $ra, 0($sp)        #die Absenderadresse dieses Anrufs
        sw   $a0, 4($sp)        #Dieser Anruf ist n

        li   $t0, 2
        slt  $t1, $a0, $t0
        beq  $t1, $zero, recurse
        li   $v0, 1             #Basisfall: 0! = 1! = 1
        j    factend

recurse:
        addi $a0, $a0, -1
        jal  fact               #$v0 = (n-1)!
        lw   $a0, 4($sp)        #unser n wieder
        mul  $v0, $v0, $a0

factend:
        # Stellen Sie die gespeicherte Absenderadresse wieder her, bevor Sie den Frame dieses Anrufs freigeben.
        lw   $ra, 0($sp)
        addi $sp, $sp, 8
        jr   $ra
