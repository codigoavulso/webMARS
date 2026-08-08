# ==========================================================
#Lekcja 03 – Bramki logiczne na 32 bitach
#
#THE PROBLEM
#AND, OR i XOR są bramkami jednobitowymi. Rejestr przechowuje 32 bity.
#Co oznacza brama przy tej szerokości?
#
#WHAT THE HARDWARE DOES
#Umieszcza obok siebie 32 kopie bramy. Bit 0
#wynik zależy tylko od bitu 0 każdego operandu, bit 1 tylko od
#bit 1 i tak dalej. Między nimi nie odbywa się żadne przenoszenie.
#
#THE SOLUTION
#To właśnie ta niezależność sprawia, że maska działa: wybierz którą
#bity do zachowania za pomocą AND, wymuś jedynkę za pomocą OR, odwróć za pomocą XOR.
#
#WATCH FOR
#0xCC to 11001100, a maska 0x0F to 00001111. AND zachowuje
#cztery najniższe bity, OR ustawia je, XOR odwraca je. Tylko
#niskie skubanie kiedykolwiek się zmienia.
# ==========================================================
        .data
ma:     .asciiz "AND keeps the low nibble: "
mo:     .asciiz "OR sets the low nibble:   "
mx:     .asciiz "XOR flips the low nibble: "
        .text
        .globl main
main:
        li   $t0, 204           #0xCC
        li   $t1, 15            #0x0F maska

        la   $a0, ma
        li   $v0, 4
        syscall
        #AND czyści każdą pozycję, w której maska zawiera zero.
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
        #XOR przełącza tylko pozycje wybrane przez jedynki w masce.
        xor  $t4, $t0, $t1
        move $a0, $t4
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
