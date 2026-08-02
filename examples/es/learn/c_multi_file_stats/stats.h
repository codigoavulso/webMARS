// Una cabecera es un contrato: dice qué existe, no cómo funciona.
// main.c la incluye para conocer las dos firmas de abajo, y stats.c
// la incluye para que el compilador contraste la implementación con ellas.
// De este archivo no sale ningún código.

int array_sum(int values[], int length);   // solo declaración: el compilador aprende la firma
int array_max(int values[], int length);   // quien incluya esta cabecera puede llamarla
