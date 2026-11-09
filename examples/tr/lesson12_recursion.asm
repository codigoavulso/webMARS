# 12 - Özyineleme ve çerçeveler
#
# Özyinelemeli bir çağrı `$ra`'nin üzerine yazar ve kendi argümanı için `$a0`'yi kullanır.
# Aramayı yapmadan önce her iki değeri de kaydedin.
#
# 5'ten 1'e kadar her değer için `fact` adımını atın. 1 döndüren çağrı da dahil olmak üzere her
# çağrı sekiz bayt ayırır.
#
# Dönüş yolunu izlemek için `mul`'ye bir kesme noktası ayarlayın. Her çağrı kendi argümanını
# yeniden yükler, çoğaltır ve çerçevesini serbest bırakır.

        .data
m1:     .asciiz "5! = "
        .text
        .globl main
main:
        la   $a0, m1
        li   $v0, 4
        syscall

        li   $a0, 5
        jal  fact

        move $a0, $v0
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall

#---- int fact(int n) ----
fact:
        #Her çağrının ayrı bir sekiz baytlık çerçevesi vardır.
        addi $sp, $sp, -8
        sw   $ra, 0($sp)        #bu aramanın dönüş adresi
        sw   $a0, 4($sp)        #bu aramanın numarası

        li   $t0, 2
        slt  $t1, $a0, $t0
        beq  $t1, $zero, recurse
        li   $v0, 1             #temel durum: 0! = 1! = 1
        j    factend

recurse:
        addi $a0, $a0, -1
        jal  fact               #$v0 = (n-1)!
        lw   $a0, 4($sp)        #yine bizim n'miz
        mul  $v0, $v0, $a0

factend:
        # Bu aramanın çerçevesini bırakmadan önce kayıtlı gönderici adresini geri yükleyin.
        lw   $ra, 0($sp)
        addi $sp, $sp, 8
        jr   $ra
