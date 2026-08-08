//L'intestazione è un contratto: dice cosa esiste, non come funziona.
//main.c lo include per apprendere le due firme seguenti e stats.c
//lo include in modo che il compilatore ne controlli l'implementazione.
//Nessun codice viene generato da questo file.

int array_sum(int values[], int length);   //solo dichiarazione: il compilatore apprende la firma
int array_max(int values[], int length);   //chiunque includa questa intestazione può chiamarla
