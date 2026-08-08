//Ein Header ist ein Vertrag: Er sagt, was existiert, nicht wie es funktioniert.
//main.c schließt es ein, um die beiden Signaturen unten zu lernen, und stats.c
//schließt es ein, damit der Compiler die Implementierung anhand dieser prüft.
//Aus dieser Datei wird kein Code generiert.

int array_sum(int values[], int length);   //Nur Deklaration: Der Compiler lernt die Signatur
int array_max(int values[], int length);   //Wer diesen Header einfügt, kann ihn aufrufen
