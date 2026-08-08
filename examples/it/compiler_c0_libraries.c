#use <conio>
#use <parse>
#use <string>
#use <util>
#use <rand>

int main(void) {
  //Esempio completo di librerie C0 +: parse, string, util e rand che lavorano insieme.
  int* parsed = parse_int("1f", 16);   //parse_int restituisce un puntatore: null significa che ha fallito
  rand_t a = init_rand(17);   //lo stesso seme dà la stessa sequenza, il che mantiene le sequenze ripetibili
  rand_t b = init_rand(17);
  string rendered = string_join("hex=", int2hex(*parsed));   //int2hex formatta il numero nel modo in cui lo mostra il debugger

  print("Parsed and formatted: ");
  print(rendered);
  printchar('\n');

  print("Token count: ");
  printint(num_tokens("alpha beta gamma"));   //la libreria di analisi divide il testo senza il lavoro manuale del puntatore
  printchar('\n');

  print("Deterministic rand: ");
  printbool(rand(a) == rand(b));
  printchar('\n');
  return 0;
}



