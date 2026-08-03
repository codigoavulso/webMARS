# ==========================================================
#Pelajaran 14 - Bilangan real dalam 32 bit
#
#THE PROBLEM
#3.5 tidak mempunyai tempat dalam register bilangan bulat. Dimana
#bagian pecahan pergi, dan bagaimana bilangan yang sangat besar disimpan
#dalam 32 bit yang sama dengan yang sangat kecil?
#
#WHAT THE HARDWARE DOES
#IEEE-754 membagi kata menjadi tiga bidang: satu bit tanda,
#delapan bit eksponen dan dua puluh tiga bit pecahan. Itu
#eksponen menggeser titik biner, itulah sebabnya formatnya demikian
#disebut titik mengambang.
#
#THE SOLUTION
#File register terpisah ($f0..$f31) dan adder terpisah
#menangani nilai-nilai ini, itulah sebabnya mnemoniknya berbeda:
#lwc1 untuk memuat, add.s untuk menambahkan, syscall 2 untuk mencetak.
#
#WATCH FOR
#Buka Alat > Representasi Titik Mengambang dan masukkan 3.5.
#Perhatikan ketiga kolom tersebut, lalu periksa apakah 4,75 sudah tepat -
#tidak seperti 0,1, yang tidak memiliki pecahan biner berhingga.
# ==========================================================
        .data
a:      .float 3.5
b:      .float 1.25
m1:     .asciiz "3.5 + 1.25 = "
        .text
        .globl main
main:
        #Alamat bilangan bulat masih mencari data; lwc1 memindahkan bitnya ke COP1.
        la   $a0, m1
        li   $v0, 4
        syscall

        la   $t0, a
        lwc1 $f0, 0($t0)        #ke dalam file register FPU
        la   $t0, b
        lwc1 $f2, 0($t0)
        add.s $f4, $f0, $f2     #penambah FPU

        #Syscall 2 mengharapkan argumen floatnya secara khusus di $f12.
        mov.s $f12, $f4
        li   $v0, 2             #cetak mengapung
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
