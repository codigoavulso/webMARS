# ==========================================================
#Pelajaran 06 - Penghitung, dalam perangkat lunak dan perangkat keras
#
#THE PROBLEM
#Penghitung perangkat keras adalah register, inkrementer, dan a
#pembanding. Seperti apa bentuk mesin yang sama yang tertulis
#sebagai instruksi?
#
#WHAT THE HARDWARE DOES
#Tepatnya ketiga bagian itu, satu per instruksi: register
#memegang hitungan, addi adalah penambah, slt dengan cabang
#adalah pembanding yang memutuskan putaran berikutnya.
#
#THE SOLUTION
#Lingkaran bukanlah konsep baru. Ini adalah logika sekuensial yang dieja
#keluar, dengan PC sebagai jamnya.
#
#WATCH FOR
#$t0 adalah register hitungan dan $t1 adalah batasnya. Melangkahlah
#satu putaran penuh dan sebutkan garis mana bagiannya.
# ==========================================================
        .data
sp:     .asciiz " "
        .text
        .globl main
main:
        li   $t0, 1             #daftar hitungan
        li   $t1, 11            #batasnya

loop:
        #Invarian loop: $t0 adalah nilai berikutnya yang akan dicetak dan tetap di bawah $t1.
        slt  $t2, $t0, $t1      #pembanding
        beq  $t2, $zero, endl   #keluar ketika hitungan mencapai batas

        move $a0, $t0
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        #Memperbarui penghitung sebelum melompat menjamin kemajuan menuju penghentian.
        addi $t0, $t0, 1        #penambah
        j    loop

endl:
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
