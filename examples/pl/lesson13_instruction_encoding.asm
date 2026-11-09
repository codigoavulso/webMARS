# 13 - Instrukcja jest liczbą
#
# Złóż i sprawdź kolumnę Kod w segmencie tekstu. Każda instrukcja podstawowa to 32-bitowe słowo
# podzielone na pola.
#
# Porównaj dwie instrukcje `add`. Pola operacyjne są zgodne, natomiast pola rejestrów kodują
# różne operandy.
#
# W `addi` dolne 16 bitów przechowuje bezpośrednie 100, czyli `0x0064`. Zmień go na 101 i złóż
# ponownie, aby zobaczyć zmianę.

        .text
        .globl main
main:
        #Sprawdź kolumnę Kod po złożeniu: te mnemoniki nie są przechowywane jako tekst.
        add  $t0, $t1, $t2      #Typ R: opcode, rs, rt, rd, funct
        add  $t3, $t4, $t5      #ten sam kształt, różne rejestry
        addi $t0, $t1, 100      #Typ I: stała jest w słowie
        sll  $t0, $t1, 4        #kwota przesunięcia ma własne pole
        j    tail               #Typ J: adres, a nie rejestr
tail:
        #li jest rozwijane przed wykonaniem; procesor widzi tylko zakodowane słowa.
        li   $v0, 10
        syscall
