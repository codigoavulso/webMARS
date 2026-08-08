//Nagłówek to kontrakt: mówi, co istnieje, a nie jak to działa.
//main.c zawiera go do nauki dwóch poniższych podpisów, a stats.c
//zawiera go, więc kompilator sprawdza implementację pod kątem nich.
//Z tego pliku nie jest generowany żaden kod.

int array_sum(int values[], int length);   //tylko deklaracja: kompilator uczy się podpisu
int array_max(int values[], int length);   //ktokolwiek umieści ten nagłówek, może go wywołać
