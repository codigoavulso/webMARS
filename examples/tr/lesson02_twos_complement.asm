# ==========================================================
#Ders 02 - İkinin tamamlayıcısı
#
#THE PROBLEM
#Bir kayıt, her biri yüksek veya düşük olan 32 kablodan oluşur. Tel yok
#eksi işareti için, ancak negatif sayıların çalışması gerekir.
#
#WHAT THE HARDWARE DOES
#Üst biti bir işaret olarak okur, ancak ayrı bir bayrak olarak okur:
#-n, n'ye eklenen bit modeli olarak saklanır
#sıfır. Her biti ters çevirin ve bir tane ekleyin ve elde ettiniz.
#
#THE SOLUTION
#Çıkarma işleminin ikinci devreye ihtiyacı yoktur. a - b olur
#a + (-b), yani bir toplayıcı her iki işleme de hizmet eder.
#
#WATCH FOR
#Her iki yarım da -5 yazdırır. İkincisi ona uzun yoldan ulaşır,
#nor ve addi ile sub'un dahili olarak ne yaptığını gösterir.
#0xFFFFFFFB'i görmek için Değerleri onaltılık sayıya ayarlayın.
# ==========================================================
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
