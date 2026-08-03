//Un en-tête est un contrat : il dit ce qui existe, pas comment cela fonctionne.
//main.c l'inclut pour apprendre les deux signatures ci-dessous, et stats.c
//l'inclut afin que le compilateur vérifie l'implémentation par rapport à eux.
//Aucun code n'est généré à partir de ce fichier.

int array_sum(int values[], int length);   //déclaration uniquement : le compilateur apprend la signature
int array_max(int values[], int length);   //celui qui inclut cet en-tête peut l'appeler
