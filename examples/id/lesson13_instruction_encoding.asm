# ==========================================================
#Pelajaran 13 - Instruksi adalah sebuah angka
#
#THE PROBLEM
#Prosesor mengambil kata-kata dari memori. Kode tinggal di
#memori juga. Lalu apa yang membedakan instruksi dengan a
#sepotong data?
#
#WHAT THE HARDWARE DOES
#Tidak ada, di luar register mana kata tersebut dimuat. Itu
#PC memilih kata-kata yang masuk ke decoder; aku memilih kata-kata
#yang masuk ke file register. Bitnya sama jenisnya.
#
#THE SOLUTION
#Baca pengkodeannya secara langsung. Rakit dan buka
#Utama > Jalankan: kolom Kode menampilkan setiap instruksi sebagai
#kata 32-bit sebenarnya.
#
#WATCH FOR
#Pelajaran ini tidak mencetak apa pun dengan sengaja - outputnya adalah
#Segmen Teks itu sendiri. Bandingkan dua penambahan: opcode yang sama dan
#bidang fungsi, nomor register yang berbeda. Kemudian temukan
#literal 100 di dalam kata addi.
# ==========================================================
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
