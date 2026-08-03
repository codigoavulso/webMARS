# ==========================================================
#Pelajaran 09 - Mengindeks array
#
#THE PROBLEM
#Instruksi beban menawarkan register dasar dan konstanta
#mengimbangi. Tidak ada yang lain. Jadi bagaimana a[i] dicapai ketika i saja
#diketahui pada saat run time, duduk di register?
#
#WHAT THE HARDWARE DOES
#Itu menambahkan basis ke apa pun yang dimiliki register. Indeks
#oleh karena itu harus sudah dalam byte, bukan dalam elemen.
#
#THE SOLUTION
#Skalakan indeks berdasarkan ukuran elemen, lalu tambahkan. Untuk empat byte
#kata-kata bahwa penskalaan adalah pergeseran ke kiri sebanyak dua, yang memerlukan biaya
#tidak ada apa-apa.
#
#WATCH FOR
#Tiga baris selanjutnya, tambahkan, lw adalah tujuan kompilasi a[i].
#Lakukan satu iterasi dan baca $t5 dan $t6.
# ==========================================================
        .data
arr:    .word 10, 20, 30, 40, 50
m1:     .asciiz "sum = "
        .text
        .globl main
main:
        la   $t0, arr           #dasar
        li   $t1, 0             #saya
        li   $t2, 5             #panjang
        li   $t3, 0             #akumulator

sum:
        #Invarian loop: $t3 adalah jumlah dari arr[0] hingga arr[i-1].
        slt  $t4, $t1, $t2
        beq  $t4, $zero, ends

        sll  $t5, $t1, 2        #saya * 4 byte
        add  $t6, $t0, $t5      #indeks dasar + skala
        #$t6 sekarang memberi nama tepat pada satu elemen; lw mengambil nilai 32-bitnya.
        lw   $t7, 0($t6)
        add  $t3, $t3, $t7

        addi $t1, $t1, 1
        j    sum

ends:
        la   $a0, m1
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
