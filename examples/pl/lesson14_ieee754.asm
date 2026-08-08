# ==========================================================
#Lekcja 14 - Liczby rzeczywiste w 32 bitach
#
#THE PROBLEM
#3.5 nie ma miejsca w rejestrze całkowitym. Gdzie jest
#część ułamkowa i jak przechowywana jest bardzo duża liczba
#w tych samych 32 bitach, co bardzo mały?
#
#WHAT THE HARDWARE DOES
#IEEE-754 dzieli słowo na trzy pola: jeden bit znaku,
#osiem bitów wykładniczych i dwadzieścia trzy bity ułamkowe. The
#wykładnik przesuwa punkt binarny i dlatego jest taki format
#zwany zmiennoprzecinkowym.
#
#THE SOLUTION
#Oddzielny plik rejestru ($f0..$f31) i osobny dodatek
#obsługuj te wartości, dlatego mnemoniki różnią się:
#lwc1 do załadowania, dodatki do dodania, wywołanie syscall 2 do wydrukowania.
#
#WATCH FOR
#Otwórz Narzędzia > Reprezentacja zmiennoprzecinkowa i wprowadź 3.5.
#Obserwuj trzy pola, a następnie sprawdź, czy 4,75 jest dokładne -
#w przeciwieństwie do 0,1, który nie ma skończonego ułamka binarnego.
# ==========================================================
        .data
a:      .float 3.5
b:      .float 1.25
m1:     .asciiz "3.5 + 1.25 = "
        .text
        .globl main
main:
        #Adresy całkowite nadal lokalizują dane; lwc1 przenosi swoje bity do COP1.
        la   $a0, m1
        li   $v0, 4
        syscall

        la   $t0, a
        lwc1 $f0, 0($t0)        #do pliku rejestru FPU.
        la   $t0, b
        lwc1 $f2, 0($t0)
        add.s $f4, $f0, $f2     #dodatek FPU.

        #Syscall 2 oczekuje swojego argumentu float konkretnie w $f12.
        mov.s $f12, $f4
        li   $v0, 2             #wydrukuj pływak
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
