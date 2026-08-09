# Console syscalls. The program output stream is the subject: integer,
# string, character and their ordering.
        .data
msg:    .asciiz "value="
nl:     .asciiz "\n"
        .text
main:   la   $a0, msg
        li   $v0, 4
        syscall
        li   $a0, 42
        li   $v0, 1
        syscall
        la   $a0, nl
        li   $v0, 4
        syscall
        li   $a0, 65
        li   $v0, 11
        syscall
        li   $a0, 66
        li   $v0, 11
        syscall
        la   $a0, nl
        li   $v0, 4
        syscall
        li   $a0, -7
        li   $v0, 1
        syscall
        li   $v0, 10
        syscall
