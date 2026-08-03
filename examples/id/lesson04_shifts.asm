# ==========================================================
#Pelajaran 04 - Pergeseran, atau perkalian dengan kabel
#
#THE PROBLEM
#Pengganda umum adalah salah satu blok termahal
#jalur data. Mengalikannya dengan 8 tidak memerlukan biaya sebanyak itu.
#
#WHAT THE HARDWARE DOES
#Pergeseran bukanlah aritmatika sama sekali: ini adalah bit yang sama yang dibaca
#dari kabel yang berbeda. Pergeseran ke kiri sebanyak n dikalikan 2^n
#dan hanya biaya perutean.
#
#THE SOLUTION
#Kekuatan dua menjadi pergeseran. Perhatikan dua shift kanan: srl
#memberi angka nol di atas, sra menyalin bit tanda, jadi saja
#sra membagi bilangan negatif dengan benar.
#
#WATCH FOR
#-16 >> 2 menghasilkan -4 dengan sra tetapi positif besar dengan srl. Itu
#bit dipindahkan secara identik; hanya yang dimasukkan di atas saja yang berbeda.
# ==========================================================
        .data
m1:     .asciiz "5 << 3 = "
m2:     .asciiz "-16 >> 2 arithmetic = "
m3:     .asciiz "-16 >> 2 logical    = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall
        li   $t0, 5
        #Tiga pergeseran ke kiri dikalikan dengan 2^3 dengan hanya mempertahankan 32 bit hasil.
        sll  $t1, $t0, 3        # 5 * 8
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $t2, -16

        la   $a0, m2
        li   $v0, 4
        syscall
        #Bandingkan $t3 dan $t4 dalam heksadesimal untuk melihat perbedaan bit masuk.
        sra  $t3, $t2, 2        #tanda dipertahankan: -4
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, m3
        li   $v0, 4
        syscall
        srl  $t4, $t2, 2        #angka nol bergeser: sangat positif
        move $a0, $t4
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
