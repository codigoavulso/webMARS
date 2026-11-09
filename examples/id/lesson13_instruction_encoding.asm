# 13 - Instruksi adalah angka
#
# Rakit dan periksa kolom Kode di Segmen Teks. Setiap instruksi dasar adalah kata 32-bit yang
# dibagi menjadi beberapa bidang.
#
# Bandingkan dua instruksi `add`. Bidang operasi cocok, sedangkan bidang register mengkodekan
# operan yang berbeda.
#
# Dalam `addi`, 16 bit rendah menampung 100, yaitu `0x0064`. Ubah menjadi 101 dan pasang kembali
# untuk melihat perubahannya.

        .text
        .globl main
main:
        #Periksa kolom Kode setelah perakitan: mnemonik ini tidak disimpan sebagai teks.
        add  $t0, $t1, $t2      #Tipe-R: opcode, rs, rt, rd, fungsi
        add  $t3, $t4, $t5      #bentuk yang sama, register yang berbeda
        addi $t0, $t1, 100      #Tipe I: konstanta ada pada kata
        sll  $t0, $t1, 4        #jumlah shift memiliki bidangnya sendiri
        j    tail               #Tipe J: alamat, bukan register
tail:
        #li sendiri diperluas sebelum dieksekusi; prosesor hanya melihat kata-kata yang dikodekan.
        li   $v0, 10
        syscall
