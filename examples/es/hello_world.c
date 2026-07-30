// Ejemplo C0-S1: escritura de una cadena y retorno normal de main.
// El compilador convierte estos helpers en las mismas syscalls MIPS usadas por Assembly.
int main(void) {
  // Los literales string se emiten en data con un byte cero final.
  print_string("Hola desde C en webMARS!");
  // ASCII 10 es line feed; print_char emite exactamente un carácter.
  print_char(10);
  // Retornar desde main produce una salida limpia del programa.
  return 0;
}
