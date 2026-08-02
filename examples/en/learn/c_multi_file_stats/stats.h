// A header is a contract: it says what exists, not how it works.
// main.c includes it to learn the two signatures below, and stats.c
// includes it so the compiler checks the implementation against them.
// No code is generated from this file.

int array_sum(int values[], int length);   // declaration only: the compiler learns the signature
int array_max(int values[], int length);   // whoever includes this header can call it
