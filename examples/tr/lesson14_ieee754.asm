# ==========================================================
#Ders 14 - 32 bitlik gerçek sayılar
#
#THE PROBLEM
#3.5'in tam sayı kaydında yeri yoktur. Nerede
#kesirli kısım gider ve çok büyük bir sayı nasıl saklanır
#çok küçük olanla aynı 32 bitte mi?
#
#WHAT THE HARDWARE DOES
#IEEE-754, sözcüğü üç alana böler: bir işaret biti,
#sekiz üslü bit ve yirmi üç kesirli bit.
#üs ikili noktayı kaydırır, bu nedenle format
#kayan nokta denir.
#
#THE SOLUTION
#Ayrı bir kayıt dosyası ($f0..$f31) ve ayrı bir toplayıcı
#bu değerleri kullanın, bu nedenle anımsatıcılar farklıdır:
#Yüklemek için lwc1, eklemek için add.s, yazdırmak için sistem çağrısı 2.
#
#WATCH FOR
#Araçlar > Kayan Nokta Gösterimi'ni açın ve 3.5'i girin.
#Üç alanı izleyin, ardından 4,75'in kesin olup olmadığını kontrol edin -
#sonlu ikili kesiri olmayan 0,1'den farklı olarak.
# ==========================================================
        .data
a:      .float 3.5
b:      .float 1.25
m1:     .asciiz "3.5 + 1.25 = "
        .text
        .globl main
main:
        #Tamsayı adresler yine de verilerin yerini belirler; lwc1, bitlerini COP1 içine taşır.
        la   $a0, m1
        li   $v0, 4
        syscall

        la   $t0, a
        lwc1 $f0, 0($t0)        #FPU kayıt dosyasına
        la   $t0, b
        lwc1 $f2, 0($t0)
        add.s $f4, $f0, $f2     #FPU toplayıcı

        #Sistem çağrısı 2, kayan değişken bağımsız değişkenini özellikle $f12 içinde bekler.
        mov.s $f12, $f4
        li   $v0, 2             #kayan noktayı yazdır
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
