#use <tty>

bool is_space(int ch) {
  return ch == 32 || ch == 9;
}

bool is_digit(int ch) {
  return ch >= 48 && ch <= 57;
}

void tty_backspace(void) {
  tty_put_byte(8);
  tty_put_byte(32);
  tty_put_byte(8);
}

int read_line(int buffer[], int capacity) {
  int len = 0;

  while (true) {
    int ch = tty_get_byte();

    // Ignora la segunda mitad del CRLF cuando el buffer aun esta vacio.
    if (ch == 13 || ch == 10) {
      if (len == 0) {
        continue;
      }
      tty_newline();
      buffer[len] = 0;
      return len;
    }

    if (ch == 8) {
      if (len > 0) {
        len--;
        buffer[len] = 0;
        tty_backspace();
      }
      continue;
    }

    if (ch < 32) {
      continue;
    }

    if (len >= capacity - 1) {
      continue;
    }

    buffer[len] = ch;
    len++;
    tty_put_byte(ch);
  }

  return len;
}

int skip_spaces(int buffer[], int pos) {
  while (buffer[pos] != 0 && is_space(buffer[pos])) {
    pos++;
  }
  return pos;
}

bool parse_int_at(int buffer[], int start, int value_box[], int next_box[]) {
  int pos = skip_spaces(buffer, start);
  int sign = 1;
  int value = 0;
  int digits = 0;

  if (buffer[pos] == 45) {
    sign = -1;
    pos++;
  } else if (buffer[pos] == 43) {
    pos++;
  }

  while (is_digit(buffer[pos])) {
    value = value * 10 + (buffer[pos] - 48);
    digits++;
    pos++;
  }

  if (digits == 0) {
    return false;
  }

  value_box[0] = value * sign;
  next_box[0] = pos;
  return true;
}

bool is_supported_op(int op) {
  return op == 43 || op == 45 || op == 42 || op == 47;
}

bool parse_expression(int buffer[], int left_box[], int op_box[], int right_box[]) {
  int next_box[1] = {0};
  int pos = 0;

  if (!parse_int_at(buffer, pos, left_box, next_box)) {
    return false;
  }
  pos = skip_spaces(buffer, next_box[0]);

  if (!is_supported_op(buffer[pos])) {
    return false;
  }
  op_box[0] = buffer[pos];
  pos++;

  if (!parse_int_at(buffer, pos, right_box, next_box)) {
    return false;
  }
  pos = skip_spaces(buffer, next_box[0]);

  return buffer[pos] == 0;
}

void print_expression_result(int left, int op, int right, int result) {
  tty_putint(left);
  tty_put_byte(32);
  tty_put_byte(op);
  tty_put_byte(32);
  tty_putint(right);
  tty_puts(" = ");
  tty_putint(result);
  tty_newline();
}

int main(void) {
  // Abre la tool "TTY Device + ANSI Terminal", conectala a MIPS y ejecuta este archivo.
  // Formatos aceptados: 3 + 4, 8-2, 6 * 7, 20 / 5.
  // Escribe q para salir del REPL.
  int line[64] = {0};
  int left_box[1] = {0};
  int op_box[1] = {0};
  int right_box[1] = {0};

  // Mantenemos el arranque corto para que el prompt aparezca rapido.
  tty_puts("Calculadora TTY lista.");
  tty_newline();
  tty_puts("Usa +, -, *, /   |   q sale");
  tty_newline();
  tty_newline();

  while (true) {
    tty_puts("calc> ");
    int len = read_line(line, 64);
    if (len == 1 && (line[0] == 113 || line[0] == 81)) {
      tty_puts("Saliendo.");
      tty_newline();
      return 0;
    }

    if (!parse_expression(line, left_box, op_box, right_box)) {
      tty_puts("Formato invalido. Usa: a + b");
      tty_newline();
      continue;
    }

    if (op_box[0] == 47 && right_box[0] == 0) {
      tty_puts("No se permite dividir por cero.");
      tty_newline();
      continue;
    }

    if (op_box[0] == 43) {
      print_expression_result(left_box[0], op_box[0], right_box[0], left_box[0] + right_box[0]);
    } else if (op_box[0] == 45) {
      print_expression_result(left_box[0], op_box[0], right_box[0], left_box[0] - right_box[0]);
    } else if (op_box[0] == 42) {
      print_expression_result(left_box[0], op_box[0], right_box[0], left_box[0] * right_box[0]);
    } else {
      print_expression_result(left_box[0], op_box[0], right_box[0], left_box[0] / right_box[0]);
    }
  }

  return 0;
}
