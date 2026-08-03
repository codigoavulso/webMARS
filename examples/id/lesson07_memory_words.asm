# ==========================================================
#Pelajaran 07 - Kata-kata dalam ingatan, dan mengapa alamat melonjak empat
#
#THE PROBLEM
#Memori dialamatkan satu byte pada satu waktu, tetapi register tetap ada
#empat byte. Apa sebenarnya yang dipilih oleh satu alamat?
#
#WHAT THE HARDWARE DOES
#lw dan sw memindahkan empat byte dalam satu akses, jadi berurutan
#kata-kata berjarak empat alamat. Dua bit rendah dari
#alamat harus nol: penyelarasan itulah yang memungkinkan
#perangkat keras mengambil seluruh kata dalam satu siklus.
#
#THE SOLUTION
#Aritmatika alamat dilakukan dalam byte, jadi indeks menjadi kata-kata
#selalu berskala empat.
#
#WATCH FOR
#Rakit, lalu buka Segmen Data di 0x10010000. Itu
#tiga nilai muncul di kolom yang berdekatan dalam satu baris.
# ==========================================================
        .data
cell:   .word 0, 0, 0
m1:     .asciiz "read back: "
sp:     .asciiz " "
        .text
        .globl main
main:
        la   $t0, cell          #alamat dasar

        #Setiap offset di bawah ini relatif terhadap $t0 dan tetap selaras dengan kata.
        li   $t1, 111
        sw   $t1, 0($t0)        #kata pertama
        li   $t1, 222
        sw   $t1, 4($t0)        #+4 byte = kata berikutnya
        li   $t1, 333
        sw   $t1, 8($t0)        #+8 byte

        la   $a0, m1
        li   $v0, 4
        syscall

        #lw merekonstruksi nilai 32-bit yang sama yang sebelumnya ditulis oleh sw.
        lw   $a0, 0($t0)
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        lw   $a0, 4($t0)
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        lw   $a0, 8($t0)
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
