# ==========================================================
#Pelajaran 10 - Tumpukan adalah register dan offset
#
#THE PROBLEM
#Ada 32 register dan dibagikan oleh setiap bagian
#kode. Kemana perginya suatu nilai ketika ia harus bertahan dalam pekerjaan itu
#akankah menggunakan kembali register itu?
#
#WHAT THE HARDWARE DOES
#Tidak ada yang istimewa sama sekali. $sp adalah register biasa itu
#kebetulan menunjuk ke memori, dan tumpukan bertambah ke arahnya
#alamat yang lebih rendah murni berdasarkan konvensi.
#
#THE SOLUTION
#Memesan ruang adalah pengurangan dari $sp, melepaskannya dan
#tambahan. Push dan pop hanyalah sw dan lw.
#
#WATCH FOR
#Register sengaja dibersihkan antar toko
#dan bebannya, sehingga nilai yang dicetak hanya bisa datang
#kembali dari ingatan. Tonton $sp bergerak sebanyak 8 dan mundur.
# ==========================================================
        .data
m1:     .asciiz "restored: "
sp2:    .asciiz " "
        .text
        .globl main
main:
        li   $t0, 7
        li   $t1, 9

        #Tumpukannya bertambah ke bawah, sehingga alokasi mengurangi $sp.
        addi $sp, $sp, -8       #pesan dua kata
        sw   $t0, 0($sp)        #mendorong
        sw   $t1, 4($sp)

        li   $t0, 0             #mengalahkan register
        li   $t1, 0

        lw   $t0, 0($sp)        #muncul
        lw   $t1, 4($sp)
        #Setiap alokasi harus seimbang sehingga pemanggil dapat melihat $sp aslinya.
        addi $sp, $sp, 8        #rilis

        la   $a0, m1
        li   $v0, 4
        syscall
        move $a0, $t0
        li   $v0, 1
        syscall
        la   $a0, sp2
        li   $v0, 4
        syscall
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
