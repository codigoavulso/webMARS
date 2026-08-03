# ==========================================================
#Pelajaran 02 - Komplemen Dua
#
#THE PROBLEM
#Sebuah register terdiri dari 32 kabel, masing-masing tinggi atau rendah. Tidak ada kawat
#untuk tanda minus, namun angka negatif harus berfungsi.
#
#WHAT THE HARDWARE DOES
#Bunyinya bagian atas sebagai tanda, tetapi bukan sebagai bendera terpisah:
#-n disimpan sebagai pola bit yang, ditambahkan ke n, dibungkus
#nol. Balikkan setiap bit dan tambahkan satu dan Anda memilikinya.
#
#THE SOLUTION
#Pengurangan tidak memerlukan sirkuit kedua. a - b menjadi
#a + (-b), jadi satu penjumlah melayani kedua operasi tersebut.
#
#WATCH FOR
#Kedua bagian mencetak -5. Yang kedua mencapainya jauh,
#dengan nor dan addi, menunjukkan apa yang dilakukan sub secara internal.
#Atur Nilai ke heksadesimal untuk melihat 0xFFFFFFFB.
# ==========================================================
        .data
m1:     .asciiz "zero minus 5 = "
m2:     .asciiz "invert bits of 5, add 1 = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall
        #Pengurangan dari nol membentuk invers aditif tanpa sedikit tanda minus.
        li   $t0, 5
        sub  $t1, $zero, $t0    #penambah melakukan pekerjaannya
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, m2
        li   $v0, 4
        syscall
        #juga dengan $zero bersifat bitwise NOT; menambahkan satu melengkapi komplemen dua.
        nor  $t2, $t0, $zero    #membalikkan semua bit
        addi $t2, $t2, 1        #tambahkan satu
        move $a0, $t2           #nilainya sama seperti di atas
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
