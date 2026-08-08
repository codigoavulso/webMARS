# ==========================================================
#Lekcja 13 – Instrukcja jest liczbą
#
#THE PROBLEM
#Procesor pobiera słowa z pamięci. Kod żyje
#pamięć też. Czym zatem różni się instrukcja od a
#kawałek danych?
#
#WHAT THE HARDWARE DOES
#Nic, poza którym rejestrem jest ładowane słowo. The
#PC wybiera słowa, które trafiają do dekodera; lw wybiera słowa
#które idą do pliku rejestru. Bity są tego samego rodzaju.
#
#THE SOLUTION
#Przeczytaj kodowanie bezpośrednio. Złóż i otwórz
#Main > Execute: kolumna Code pokazuje każdą instrukcję jako
#rzeczywiście jest to słowo 32-bitowe.
#
#WATCH FOR
#Ta lekcja nie drukuje niczego celowo - wynikiem jest
#Sam segment tekstu. Porównaj dwa dodatki: ten sam opcode i
#pola funkcyjne, różne numery rejestrów. Następnie znajdź
#dosłownie 100 wewnątrz słowa addi.
# ==========================================================
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
