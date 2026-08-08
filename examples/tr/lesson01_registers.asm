# ==========================================================
#Ders 01 - Kayıtlar ve anlık değerler
#
#THE PROBLEM
#ALU iki giriş bağlantı noktasına sahiptir ve her ikisi de
#kayıt dosyası. Kaynakta yazılan bir sayı bir
#kayıt olduğundan bu bağlantı noktalarına doğrudan ulaşamaz.
#
#WHAT THE HARDWARE DOES
#Anında talimat kelimesinin içinde hareket eder.
#addi 16 bitlik bir alan taşır; li bir kolaylıktır
#assembler bir veya iki gerçek talimata genişler.
#
#THE SOLUTION
#Önce sabiti bir kayda yerleştirin, ardından ALU
#iki kaydı okuyun ve üçüncüsünü yazın.
#
#WATCH FOR
#Her satırda bir kez adım atın ve $t0, $t1 ve $t2'yi takip edin.
#Kayıt paneli. Yalnızca üçüncü satır ALU'a dokunuyor.
# ==========================================================
        .data
lbl:    .asciiz "12 + 30 = "
        .text
        .globl main
main:
        #Sistem çağrıları, hizmet seçici olarak $v0 ve ilk argüman olarak $a0 kullanır.
        la   $a0, lbl
        li   $v0, 4
        syscall

        #li bir sözde talimattır; Assemble, onun hangi gerçek talimata dönüştüğünü gösterir.
        li   $t0, 12            #hemen -> kayıt olun
        li   $t1, 30            #hemen -> kayıt olun
        add  $t2, $t0, $t1      #ALU iki kaydı okur

        move $a0, $t2
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
