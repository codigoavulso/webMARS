# Pseudo-instructions whose expansion is not one-to-one. The encoded words are
# the real subject here: a different expansion changes the text segment even
# when the final registers agree.
        .text
main:   li   $t0, 100
        li   $t1, 0x12345678
        li   $t2, -1
        la   $t3, target
        move $t4, $t0
        not  $t5, $t0
        neg  $t6, $t0
        abs  $t7, $t6
        bge  $t0, $t1, target
        bgt  $t0, $t1, target
        ble  $t0, $t1, target
        blt  $t0, $t1, target
        beqz $t0, target
        bnez $t0, target
        b    target
target: li   $v0, 10
        syscall
