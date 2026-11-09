# 06 - Ulangi sebagai penghitung
#
# `$t0` adalah angka berikutnya yang akan dicetak. `$t1` adalah batas atas eksklusif, jadi batas
# 11 cetakan 1 sampai 10.
#
# Perbandingan dijalankan sebelum setiap iterasi. Peningkatan tersebut membuat kemajuan menuju
# batas, dan lompatan mengulangi pemeriksaan tersebut.
#
# Ubah batas menjadi 1 dan jalankan. Cabang keluar diambil sebelum cetakan pertama.

        .data
sp:     .asciiz " "
        .text
        .globl main
main:
        li   $t0, 1             #daftar hitungan
        li   $t1, 11            #batasnya

loop:
        # Pada tes loop, $t0 adalah kandidat berikutnya. Cetak hanya jika di bawah $t1.
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
