# 02 - İkinin tamamlayıcısı
#
# 32 bitlik ikinin tamamlayıcısında, 5'in bitlerinin ters çevrilmesi ve 1'in eklenmesi -5
# temsilini üretir.
#
# Program aynı değeri iki şekilde hesaplar: sıfırdan `sub`, sonra `nor` ve `addi`.
#
# Her iki yol da -5 yazdırır. Aynı bitlerin onaltılık sistemde nasıl göründüğünü görmek için
# kayıtlardaki `0xFFFFFFFB`'yi inceleyin.

        .data
m1:     .asciiz "zero minus 5 = "
m2:     .asciiz "invert bits of 5, add 1 = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall
        #Sıfırdan çıkarma, eksi işareti biti olmadan toplamsal tersini oluşturur.
        li   $t0, 5
        sub  $t1, $zero, $t0    #toplayıcı işi yapar
        move $a0, $t1
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, m2
        li   $v0, 4
        syscall
        #ne de $zero ile bit düzeyinde NOT; birin eklenmesi ikinin tümleyenini tamamlar.
        nor  $t2, $t0, $zero    #tüm bitleri ters çevir
        addi $t2, $t2, 1        #bir tane ekle
        move $a0, $t2           #yukarıdakiyle aynı değer
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
