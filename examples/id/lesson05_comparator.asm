# 05 - Pembanding dan cabang
#
# `slt` membandingkan dua bilangan bulat bertanda dan menulis 1 jika bilangan pertama lebih
# kecil, atau 0 sebaliknya.
#
# Untuk 7 dan 12, `$t2` adalah 1, jadi `beq` tidak melompat ke `notless` dan eksekusi berlanjut
# ke instruksi berikutnya.
#
# Dengan percabangan yang tertunda, lewati `beq` dan amati PC. Tukar dua nilai masukan dan
# bandingkan tujuan baru.

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
