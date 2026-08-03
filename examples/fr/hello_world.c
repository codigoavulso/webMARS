//Exemple C0-S1 : sortie de chaîne et retour normal de main.
//Le compilateur abaisse ces assistants aux mêmes appels système d'impression MIPS utilisés par Assembly.
int main(void) {
  //Les littéraux de chaîne sont émis dans le segment de données avec un octet zéro final.
  print_string("Hello from C on webMARS!");
  //ASCII 10 est un saut de ligne ; print_char émet exactement un caractère.
  print_char(10);
  //Le retour de main devient une sortie de programme propre.
  return 0;
}
