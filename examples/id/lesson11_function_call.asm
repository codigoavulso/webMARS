# ==========================================================
#Pelajaran 11 - Memanggil suatu fungsi
#
#THE PROBLEM
#Memasuki rutinitas itu mudah. Kembali bukan karena
#rutinitas yang sama dapat dilakukan dari banyak tempat dan
#alamat pengirim berbeda setiap saat.
#
#WHAT THE HARDWARE DOES
#jal melakukan dua hal dalam satu instruksi: ia menyimpan
#alamat instruksi berikut di $ra, lalu lompat. jr
#melompat ke apa pun yang dimiliki register, jadi jr $ra kembali.
#
#THE SOLUTION
#Yang lainnya hanyalah kesepakatan, bukan sirkuit: argumen masuk
#$a0..$a3, menghasilkan $v0. Hancurkan konvensi dan kode
#masih dirakit - berhenti beroperasi.
#
#WATCH FOR
#Masuk ke jal dan baca $ra. Bandingkan dengan alamatnya
#baris setelah panggilan di Segmen Teks.
# ==========================================================
        .data
m1:     .asciiz "max(17, 42) = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall

        li   $a0, 17            #argumen pertama
        li   $a1, 42            #argumen kedua
        #jal mengubah aliran kontrol dan $ra dalam satu operasi arsitektur.
        jal  maxof              #$ra = alamat baris berikutnya

        move $a0, $v0           #hasilnya muncul kembali di $v0
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall

#---- int maxof(int a, int b) ----
maxof:
        #maxof adalah fungsi daun, sehingga dapat kembali tanpa menyimpan $ra di stack.
        slt  $t0, $a0, $a1
        beq  $t0, $zero, keepa
        move $v0, $a1
        jr   $ra
keepa:
        move $v0, $a0
        jr   $ra
