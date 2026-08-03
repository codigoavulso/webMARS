# ==========================================================
#Pelajaran 08 - Byte di dalam kata, dan urutan byte
#
#THE PROBLEM
#Sebuah kata menempati empat alamat. Byte mana yang menghasilkan nilai terendah
#dari nama alamat itu?
#
#WHAT THE HARDWARE DOES
#Pilihan itu adalah urutan byte, dan itu adalah keputusan pengkabelan yang dibuat
#sekali untuk seluruh mesin. MIPS ini little-endian: the
#byte paling tidak signifikan berada di alamat terendah.
#
#THE SOLUTION
#Simpan satu kata, lalu baca kembali satu byte pada satu waktu dan biarkan
#pesanan menjawab pertanyaan untuk Anda.
#
#WATCH FOR
#0x04030201 muncul kembali sebagai 1 2 3 4. Byte yang ditulis terakhir dalam
#literalnya dibaca terlebih dahulu. lbu digunakan daripada lb jadi a
#byte di atas 127 tidak diperpanjang tandanya.
# ==========================================================
        .data
cell:   .word 0
m1:     .asciiz "bytes from low address: "
sp:     .asciiz " "
        .text
        .globl main
main:
        la   $t0, cell
        li   $t1, 0x04030201    #byte 01 paling tidak signifikan
        sw   $t1, 0($t0)

        la   $a0, m1
        li   $v0, 4
        syscall

        li   $t2, 0             #offset byte
bloop:
        #Kunjungan loop mengimbangi 0, 1, 2 dan 3 di dalam kata yang disimpan.
        slti $t3, $t2, 4
        beq  $t3, $zero, endb

        #Alamat efektif = alamat dasar + offset byte saat ini.
        add  $t4, $t0, $t2
        lbu  $a0, 0($t4)        #byte yang tidak ditandatangani
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        addi $t2, $t2, 1
        j    bloop

endb:
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
