# 15 - Mengapa langkah mengubah kecepatan
#
# Kedua loop menggunakan array yang sama. Yang pertama membaca 256 kata; yang kedua membaca
# setiap kata ke-16, hanya membuat 16 muatan.
#
# Dengan blok cache sebanyak 16 kata, pembacaan berurutan dapat menggunakan kembali setiap blok
# yang diambil. Loop kedua berlanjut ke blok baru pada setiap beban.
#
# Sambungkan simulator ke MIPS, centang «Diaktifkan», lalu atur ukuran blok menjadi 16 word.
# Gunakan Simulator Tembolok Data dengan breakpoint di `far` untuk memeriksa loop pertama. Setel
# ulang statistik cache di sana sebelum menjalankan loop kedua, dan bandingkan tingkat hit.

        .data
buf:    .word 0:256
m1:     .asciiz "stride 1 sum = "
m2:     .asciiz "stride 16 sum = "
        .text
        .globl main
main:
# Lulus berurutan: semua 256 kata.
        la   $t0, buf
        li   $t1, 0
        li   $t2, 256
        li   $t3, 0
near:
        #Indeks berurutan menggunakan kembali kata-kata dari setiap blok cache sebelum melanjutkan.
        slt  $t4, $t1, $t2
        beq  $t4, $zero, endnear
        sll  $t5, $t1, 2
        add  $t6, $t0, $t5
        lw   $t7, 0($t6)
        add  $t3, $t3, $t7
        addi $t1, $t1, 1
        j    near
endnear:
        la   $a0, m1
        li   $v0, 4
        syscall
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall

# Strided pass: satu muatan setiap enam belas kata.
        li   $t1, 0
        li   $t3, 0
far:
        # Alamat berikutnya berjarak 64 byte: enam belas kata masing-masing empat byte.
        slt  $t4, $t1, $t2
        beq  $t4, $zero, endfar
        sll  $t5, $t1, 2
        add  $t6, $t0, $t5
        lw   $t7, 0($t6)
        add  $t3, $t3, $t7
        addi $t1, $t1, 16
        j    far
endfar:
        la   $a0, m2
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
