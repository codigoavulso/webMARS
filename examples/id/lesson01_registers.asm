# 01 - Mendaftar dan segera
#
# Yang langsung dikodekan dalam instruksi. Kumpulkan dan periksa instruksi dasar mana yang
# menjadi `li`.
#
# Langkah melalui dua beban dan penambahan. Di Register, ikuti `$t0 = 12`, `$t1 = 30` dan
# `$t2 = 42`.
#
# Coba ganti 30 dengan `0x12345678` dan pasang kembali. Konstanta yang lebih besar memerlukan
# lebih dari satu instruksi dasar.

        .data
lbl:    .asciiz "12 + 30 = "
        .text
        .globl main
main:
        #Syscall menggunakan $v0 sebagai pemilih layanan dan $a0 sebagai argumen pertama.
        la   $a0, lbl
        li   $v0, 4
        syscall

        #li adalah instruksi semu; Assemble menunjukkan instruksi sebenarnya yang mana.
        li   $t0, 12
        li   $t1, 30
        add  $t2, $t0, $t1      # Jumlahnya ditulis ke register yang berbeda.

        move $a0, $t2
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
