# ==========================================================
#Pelajaran 01 - Register dan nilai langsung
#
#THE PROBLEM
#ALU memiliki dua port input dan keduanya dihubungkan ke
#mendaftarkan berkas. Angka yang ditulis pada sumbernya bukan pada a
#mendaftar, sehingga tidak dapat menjangkau port tersebut secara langsung.
#
#WHAT THE HARDWARE DOES
#Sebuah perjalanan langsung di dalam kata instruksi itu sendiri.
#addi membawa bidang 16-bit; li adalah kenyamanan itu
#assembler berkembang menjadi satu atau dua instruksi nyata.
#
#THE SOLUTION
#Masukkan konstanta ke dalam register terlebih dahulu, lalu biarkan ALU
#membaca dua register dan menulis yang ketiga.
#
#WATCH FOR
#Langkah sekali per baris dan ikuti $t0, $t1 dan $t2 di
#Panel register. Hanya baris ketiga yang menyentuh ALU.
# ==========================================================
        .data
lbl:    .asciiz "12 + 30 = "
        .text
        .globl main
main:
        #Syscall menggunakan $v0 sebagai pemilih layanan dan $a0 sebagai argumen pertama.
        la   $a0, lbl
        li   $v0, 4
        syscall

        #li adalah instruksi semu; Assemble menunjukkan instruksi sebenarnya yang mana.
        li   $t0, 12            #segera -> daftar
        li   $t1, 30            #segera -> daftar
        add  $t2, $t0, $t1      #ALU membaca dua register

        move $a0, $t2
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
