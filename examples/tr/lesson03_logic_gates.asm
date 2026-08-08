# ==========================================================
#Ders 03 - 32 bit boyunca mantık kapıları
#
#THE PROBLEM
#AND, OR ve XOR tek bitlik geçitlerdir. Bir kayıt 32 bit tutar.
#Bu genişlikte bir kapı ne anlama geliyor?
#
#WHAT THE HARDWARE DOES
#Kapının 32 kopyasını yan yana koyuyor. Bit 0
#sonuç yalnızca her işlenenin 0 bitine bağlıdır, bit 1 yalnızca
#bit 1 vb. Aralarında taşıma geçişi yoktur.
#
#THE SOLUTION
#Bir maskenin işe yaramasını sağlayan şey bu bağımsızlıktır: Hangisini seçin
#bitleri AND ile tutun, OR ile bire zorlayın, XOR ile çevirin.
#
#WATCH FOR
#0xCC 11001100'dür ve 0x0F maskesi 00001111'dir. AND tutar
#   düşük dört bit VEYA bunları ayarlar, XOR onları çevirir. Yalnızca
#düşük ısırma sayısı sürekli değişir.
# ==========================================================
        .data
ma:     .asciiz "AND keeps the low nibble: "
mo:     .asciiz "OR sets the low nibble:   "
mx:     .asciiz "XOR flips the low nibble: "
        .text
        .globl main
main:
        li   $t0, 204           #0xCC
        li   $t1, 15            #0x0F maske

        la   $a0, ma
        li   $v0, 4
        syscall
        #AND maskenin sıfır içerdiği her konumu temizler.
        and  $t2, $t0, $t1
        move $a0, $t2
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, mo
        li   $v0, 4
        syscall
        or   $t3, $t0, $t1
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, mx
        li   $v0, 4
        syscall
        #XOR yalnızca maskedekiler tarafından seçilen konumları değiştirir.
        xor  $t4, $t0, $t1
        move $a0, $t4
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
