# 10 - Tumpukan
#
# Berdasarkan konvensi, tumpukan tumbuh menuju alamat yang lebih rendah. Kurangi 8 dari `$sp`
# untuk menyisakan ruang untuk dua kata.
#
# Program ini menyimpan dua register dengan `sw`, menghapusnya, lalu mengembalikan nilainya
# dengan `lw`.
#
# Tonton `$sp` sebelum reservasi, selama dua toko, dan setelah rilis. Nilai akhirnya harus
# sesuai dengan nilai awalnya.

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
