# ==========================================================
#Pelajaran 15 - Mengapa langkah mengubah kecepatan
#
#THE PROBLEM
#Dua loop di bawah membaca array yang sama dan melakukan hal yang sama
#jumlah beban. Pada mesin sungguhan, kecepatannya jauh lebih lambat. Itu
#jumlah instruksi tidak dapat menjelaskannya.
#
#WHAT THE HARDWARE DOES
#Memori tidak menghasilkan satu kata pun. Sebuah kesalahan mengambil keseluruhan
#blok, bertaruh bahwa kata-kata tetangga akan segera dibutuhkan.
#Langkah seseorang mengumpulkan taruhan itu; langkah enam belas pembayaran
#untuk satu blok dan membaca satu kata darinya.
#
#THE SOLUTION
#Tidak ada perubahan dalam kode. Lokalitas adalah milik
#pola akses, dan pola itulah yang harus diperbaiki.
#
#WATCH FOR
#Buka Tools > Data Cache Simulator, tekan Connect to MIPS,
#lalu lari. Bandingkan tingkat keberhasilan kedua loop. Kedua jumlah tersebut
#cetak 0 karena arraynya nol - angkanya bukan
#titik di sini, tingkat hitnya adalah.
# ==========================================================
        .data
buf:    .word 0:256
m1:     .asciiz "stride 1 sum = "
m2:     .asciiz "stride 16 sum = "
        .text
        .globl main
main:
#---- setiap kata di setiap blok ----
        la   $t0, buf
        li   $t1, 0
        li   $t2, 256
        li   $t3, 0
near:
        #Indeks berurutan menggunakan kembali kata-kata dari setiap blok cache sebelum melanjutkan.
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

#---- satu kata per blok, terpisah enam belas kata ----
        li   $t1, 0
        li   $t3, 0
far:
        #Menambahkan 16 lompatan 64 byte per iterasi: biasanya satu blok cache utuh.
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
