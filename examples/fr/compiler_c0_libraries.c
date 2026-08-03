#use <conio>
#use <parse>
#use <string>
#use <util>
#use <rand>

int main(void) {
  //Exemple de bibliothèques C0 + complètes : parse, string, util et rand travaillant ensemble.
  int* parsed = parse_int("1f", 16);   //parse_int renvoie un pointeur : null signifie qu'il a échoué
  rand_t a = init_rand(17);   //la même graine donne la même séquence, ce qui permet d'effectuer des exécutions répétables
  rand_t b = init_rand(17);
  string rendered = string_join("hex=", int2hex(*parsed));   //int2hex formate le numéro comme le débogueur l'affiche

  print("Parsed and formatted: ");
  print(rendered);
  printchar('\n');

  print("Token count: ");
  printint(num_tokens("alpha beta gamma"));   //la bibliothèque d'analyse divise le texte sans travail de pointeur manuel
  printchar('\n');

  print("Deterministic rand: ");
  printbool(rand(a) == rand(b));
  printchar('\n');
  return 0;
}



