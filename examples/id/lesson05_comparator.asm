# ==========================================================
#Pelajaran 05 - Komparator dan Cabang
#
#THE PROBLEM
#Sebuah keputusan memerlukan satu bit, tetapi membandingkan dua angka 32-bit
#adalah pengurangan. Bagaimana pengurangan menjadi pilihan?
#
#WHAT THE HARDWARE DOES
#slt mengurangi dan membuang semuanya kecuali tanda,
#menulis 0 atau 1. Cabang kemudian mengumpankan bit itu ke PC
#logika, yang menambah offset atau memungkinkan PC maju.
#
#THE SOLUTION
#Bandingkan dengan register, cabangkan pada register itu. Kontrol
#alirannya adalah aritmatika ditambah satu multiplekser di PC.
#
#WATCH FOR
#Setelah slt, $t2 menahan 1. Melewati beq dan menonton PC
#di bilah status: ia melompat daripada maju empat.
# ==========================================================
        .data
lo:     .asciiz "a is smaller"
hi:     .asciiz "a is not smaller"
        .text
        .globl main
main:
        li   $t0, 7             #sebuah
        li   $t1, 12            #b
        #slt mewujudkan perbandingan sebagai bilangan bulat biasa, tidak pernah sebagai bendera tersembunyi.
        slt  $t2, $t0, $t1      #t2 = 1 jika a < b
        #Bercabang ke notless hanya jika hasil Boolean tersebut nol.
        beq  $t2, $zero, notless

        la   $a0, lo
        li   $v0, 4
        syscall
        j    done

notless:
        la   $a0, hi
        li   $v0, 4
        syscall

done:
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
