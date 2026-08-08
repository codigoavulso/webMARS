# ==========================================================
#Ders 07 - Bellekteki kelimeler ve adreslerin neden dörde atladığı
#
#THE PROBLEM
#Bellek her seferinde bir bayt olarak adreslenir, ancak bir kayıt tutulur
#dört bayt. Tek bir adres aslında neyi seçer?
#
#WHAT THE HARDWARE DOES
#lw ve sw tek erişimde dört baytı hareket ettirir, böylece ardışık
#kelimeler dört adrese ayrı ayrı oturur. Düşük iki bit
#adres sıfır olmalıdır: bu hizalama,
#donanım tek bir döngüde tüm sözcüğü getirir.
#
#THE SOLUTION
#Adres aritmetiği bayt cinsinden yapılır, dolayısıyla kelimelere dayalı bir dizin
#her zaman dörde ölçeklenir.
#
#WATCH FOR
#Birleştirin, ardından 0x10010000 adresindeki Veri Segmentini açın.
#bir satırın bitişik sütunlarında üç değer görünür.
# ==========================================================
        .data
cell:   .word 0, 0, 0
m1:     .asciiz "read back: "
sp:     .asciiz " "
        .text
        .globl main
main:
        la   $t0, cell          #temel adres

        #Aşağıdaki her uzaklık $t0'a göredir ve sözcük hizalı kalır.
        li   $t1, 111
        sw   $t1, 0($t0)        #ilk kelime
        li   $t1, 222
        sw   $t1, 4($t0)        #+4 bayt = sonraki kelime
        li   $t1, 333
        sw   $t1, 8($t0)        #+8 bayt

        la   $a0, m1
        li   $v0, 4
        syscall

        #lw, daha önce sw tarafından yazılan aynı 32 bitlik değerleri yeniden oluşturur.
        lw   $a0, 0($t0)
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        lw   $a0, 4($t0)
        li   $v0, 1
        syscall
        la   $a0, sp
        li   $v0, 4
        syscall

        lw   $a0, 8($t0)
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
