// webMARS C0 stdio compatibility layer (subset-friendly)
// Note: in this compiler, getchar() is intrinsic and cannot be redefined here.

int EOF = -1;
int SEEK_SET = 0;
int SEEK_CUR = 1;
int SEEK_END = 2;

int stdin_fd = 0;
int stdout_fd = 1;
int stderr_fd = 2;
typedef int FILE;
int stdin = 0;
int stdout = 1;
int stderr = 2;

int _STDIO_MAX_STREAMS = 64;
int _stdio_eof[64];
int _stdio_error[64];
int _stdio_unget_char[64];
int _stdio_unget_pending[64];
int _stdio_pos[64];

bool _stdio_is_space(int ch) {
  return ch == 32 || ch == 9 || ch == 10 || ch == 13;
}

bool _stdio_is_digit(int ch) {
  return ch >= 48 && ch <= 57;
}

bool _stdio_string_equal(string a, string b) {
  return __wm_string_compare(a, b) == 0;
}

int _stdio_mode_flags(string mode) {
  if (_stdio_string_equal(mode, "r") || _stdio_string_equal(mode, "rb") || _stdio_string_equal(mode, "rt")) {
    return 0;
  }
  if (_stdio_string_equal(mode, "w") || _stdio_string_equal(mode, "wb") || _stdio_string_equal(mode, "wt")) {
    return 1;
  }
  if (_stdio_string_equal(mode, "a") || _stdio_string_equal(mode, "ab") || _stdio_string_equal(mode, "at")) {
    return 9;
  }
  return -1;
}

int _stdio_copy_string_to_buffer(int out[], int capacity, string text) {
  int fullLength = __wm_string_length(text);
  if (capacity <= 0) return fullLength;

  int limit = capacity - 1;
  int index = 0;
  while (index < limit && index < fullLength) {
    out[index] = (int)__wm_string_charat(text, index);
    index = index + 1;
  }
  out[index] = 0;
  return fullLength;
}

bool _stdio_valid_stream(int stream) {
  return stream >= 0 && stream < _STDIO_MAX_STREAMS;
}

void _stdio_reset_stream_state(int stream) {
  if (!_stdio_valid_stream(stream)) return;
  _stdio_eof[stream] = 0;
  _stdio_error[stream] = 0;
  _stdio_unget_char[stream] = 0;
  _stdio_unget_pending[stream] = 0;
  _stdio_pos[stream] = 0;
}

int _stdio_read_byte_fd(int stream) {
  if (!_stdio_valid_stream(stream)) return EOF;

  if (_stdio_unget_pending[stream] != 0) {
    int restored = _stdio_unget_char[stream];
    _stdio_unget_pending[stream] = 0;
    _stdio_eof[stream] = 0;
    _stdio_pos[stream] = _stdio_pos[stream] + 1;
    return restored & 255;
  }

  int cell[1] = {0};
  int got = fd_read(stream, cell, 1);
  if (got <= 0) {
    if (got == 0) _stdio_eof[stream] = 1;
    else _stdio_error[stream] = 1;
    return EOF;
  }

  _stdio_pos[stream] = _stdio_pos[stream] + 1;
  _stdio_eof[stream] = 0;
  // webMARS stores words little-endian, so one-byte fd_read lands in the low byte.
  return cell[0] & 255;
}

int _stdio_write_byte_fd(int stream, int ch) {
  if (!_stdio_valid_stream(stream)) return EOF;

  int cell[1] = {0};
  // webMARS stores words little-endian, so fd_write reads the low byte first.
  cell[0] = ch & 255;
  int wrote = fd_write(stream, cell, 1);
  if (wrote != 1) {
    _stdio_error[stream] = 1;
    return EOF;
  }

  _stdio_pos[stream] = _stdio_pos[stream] + 1;
  return ch & 255;
}

int fopen_mode(string path, int flags) {
  int fd = fd_open(path, flags, 0);
  if (_stdio_valid_stream(fd)) {
    _stdio_reset_stream_state(fd);
  }
  return fd;
}

int fopen_read(string path) {
  return fopen_mode(path, 0);
}

int fopen_write(string path) {
  return fopen_mode(path, 1);
}

int fopen_append(string path) {
  return fopen_mode(path, 9);
}

int puts(string text) {
  print_string(text);
  print_char(10);
  return 0;
}

int putchar(int ch) {
  print_char(ch & 255);
  return ch & 255;
}

int getchar_int(void) {
  char ch = getchar();
  return (int)ch;
}

int fputc(int ch, int stream) {
  return _stdio_write_byte_fd(stream, ch);
}

int putc(int ch, int stream) {
  return fputc(ch, stream);
}

int fgetc(int stream) {
  return _stdio_read_byte_fd(stream);
}

int getc(int stream) {
  return fgetc(stream);
}

int fputs(string text, int stream) {
  if (!_stdio_valid_stream(stream)) return EOF;
  if (stream == stdout_fd || stream == stderr_fd) {
    print_string(text);
    _stdio_pos[stream] = _stdio_pos[stream] + __wm_string_length(text);
    return 0;
  }

  int index = 0;
  int length = __wm_string_length(text);
  while (index < length) {
    if (_stdio_write_byte_fd(stream, (int)__wm_string_charat(text, index)) == EOF) {
      return EOF;
    }
    index = index + 1;
  }

  return 0;
}

int fprintf(int stream, string text) {
  return fputs(text, stream);
}

int fgets(int buffer[], int capacity, int stream) {
  if (!_stdio_valid_stream(stream)) return 0;
  if (capacity <= 0) return 0;

  int limit = capacity - 1;
  int index = 0;
  int ch = EOF;
  bool keepReading = true;

  while (keepReading && index < limit) {
    ch = fgetc(stream);
    if (ch == EOF) {
      keepReading = false;
    } else {
      buffer[index] = ch;
      index = index + 1;
      if (ch == 10) keepReading = false;
    }
  }

  buffer[index] = 0;
  if (index == 0 && ch == EOF) return 0;
  return index;
}

int _stdio_scan_int_stream(int stream, int out[]) {
  if (!_stdio_valid_stream(stream)) return 0;

  int ch = fgetc(stream);
  while (ch != EOF && _stdio_is_space(ch)) {
    ch = fgetc(stream);
  }
  if (ch == EOF) return 0;

  int sign = 1;
  if (ch == 45) {
    sign = -1;
    ch = fgetc(stream);
  } else if (ch == 43) {
    ch = fgetc(stream);
  }

  int value = 0;
  int digits = 0;
  while (ch != EOF && _stdio_is_digit(ch)) {
    value = value * 10 + (ch - 48);
    digits = digits + 1;
    ch = fgetc(stream);
  }

  if (ch != EOF && !_stdio_is_digit(ch)) {
    ungetc(ch, stream);
  }

  if (digits == 0) return 0;
  out[0] = value * sign;
  return 1;
}

int scanf_int(int out[]) {
  out[0] = read_int();
  return 1;
}

int scanf_char(int out[]) {
  char ch = read_char();
  out[0] = (int)ch;
  return 1;
}

int scanf_string(int out[], int capacity) {
  if (capacity <= 0) return 0;

  int index = 0;
  int ch = fgetc(stdin_fd);
  while (ch != EOF && _stdio_is_space(ch)) {
    ch = fgetc(stdin_fd);
  }

  if (ch == EOF) {
    out[0] = 0;
    return 0;
  }

  while (ch != EOF && !_stdio_is_space(ch) && index < capacity - 1) {
    out[index] = ch;
    index = index + 1;
    ch = fgetc(stdin_fd);
  }

  if (ch != EOF && _stdio_is_space(ch)) {
    ungetc(ch, stdin_fd);
  }

  out[index] = 0;
  if (index <= 0) return 0;
  return 1;
}

int scanf(string format, int out[]) {
  out[0] = read_int();
  return 1;
}

int fscanf(int stream, string format, int out[]) {
  if (stream == stdin_fd) {
    out[0] = read_int();
    return 1;
  }
  return _stdio_scan_int_stream(stream, out);
}

int sscanf(int input[], string format, int out[]) {
  int index = 0;
  while (input[index] != 0 && _stdio_is_space(input[index])) {
    index = index + 1;
  }
  if (input[index] == 0) return 0;

  int sign = 1;
  if (input[index] == 45) {
    sign = -1;
    index = index + 1;
  } else if (input[index] == 43) {
    index = index + 1;
  }

  int value = 0;
  int digits = 0;
  while (input[index] != 0 && _stdio_is_digit(input[index])) {
    value = value * 10 + (input[index] - 48);
    digits = digits + 1;
    index = index + 1;
  }

  if (digits == 0) return 0;
  out[0] = value * sign;
  return 1;
}

int snprintf(int out[], int capacity, string text) {
  return _stdio_copy_string_to_buffer(out, capacity, text);
}

int fopen(string path, string mode) {
  int flags = _stdio_mode_flags(mode);
  if (flags < 0) return -1;
  return fopen_mode(path, flags);
}

int fclose(int stream) {
  if (!_stdio_valid_stream(stream)) return EOF;
  fd_close(stream);
  _stdio_reset_stream_state(stream);
  return 0;
}

int fread(int buffer[], int size, int count, int stream) {
  if (!_stdio_valid_stream(stream)) return 0;
  if (size <= 0 || count <= 0) return 0;

  int total = size * count;
  int readBytes = 0;
  while (readBytes < total) {
    int ch = fgetc(stream);
    if (ch == EOF) break;
    buffer[readBytes] = ch;
    readBytes = readBytes + 1;
  }

  return readBytes / size;
}

int fwrite(int buffer[], int size, int count, int stream) {
  if (!_stdio_valid_stream(stream)) return 0;
  if (size <= 0 || count <= 0) return 0;

  int total = size * count;
  int writtenBytes = 0;
  while (writtenBytes < total) {
    int result = fputc(buffer[writtenBytes], stream);
    if (result == EOF) break;
    writtenBytes = writtenBytes + 1;
  }

  return writtenBytes / size;
}

int fflush(int stream) {
  if (!_stdio_valid_stream(stream)) return EOF;
  if (stream == stdout_fd || stream == stderr_fd) {
    __wm_flush();
  }
  return 0;
}

int feof(int stream) {
  if (!_stdio_valid_stream(stream)) return 1;
  return _stdio_eof[stream];
}

int ferror(int stream) {
  if (!_stdio_valid_stream(stream)) return 1;
  return _stdio_error[stream];
}

void clearerr(int stream) {
  if (!_stdio_valid_stream(stream)) return;
  _stdio_eof[stream] = 0;
  _stdio_error[stream] = 0;
}

int ungetc(int ch, int stream) {
  if (!_stdio_valid_stream(stream)) return EOF;
  if (_stdio_unget_pending[stream] != 0) return EOF;

  _stdio_unget_char[stream] = ch & 255;
  _stdio_unget_pending[stream] = 1;
  _stdio_eof[stream] = 0;
  if (_stdio_pos[stream] > 0) {
    _stdio_pos[stream] = _stdio_pos[stream] - 1;
  }
  return ch & 255;
}

int ftell(int stream) {
  if (!_stdio_valid_stream(stream)) return -1;
  return _stdio_pos[stream];
}

int fseek(int stream, int offset, int whence) {
  if (!_stdio_valid_stream(stream)) return EOF;

  int current = _stdio_pos[stream];
  int target = -1;
  if (whence == SEEK_SET) {
    target = offset;
  } else if (whence == SEEK_CUR) {
    target = current + offset;
  } else {
    _stdio_error[stream] = 1;
    return EOF;
  }

  if (target < 0) {
    _stdio_error[stream] = 1;
    return EOF;
  }

  if (target < current) {
    _stdio_error[stream] = 1;
    return EOF;
  }

  while (_stdio_pos[stream] < target) {
    int skipped = _stdio_read_byte_fd(stream);
    if (skipped == EOF) {
      _stdio_error[stream] = 1;
      return EOF;
    }
  }

  return 0;
}

void rewind(int stream) {
  if (!_stdio_valid_stream(stream)) return;
  clearerr(stream);
  if (_stdio_pos[stream] != 0) {
    _stdio_error[stream] = 1;
  }
}
