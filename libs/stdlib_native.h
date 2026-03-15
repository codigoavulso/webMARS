#include <stddef.h>
#use <util>

int EXIT_SUCCESS = 0;
int EXIT_FAILURE = 1;

int _stdlib_block_header_bytes = 12;
int _stdlib_min_payload_bytes = 4;
int* _stdlib_heap_head = NULL;
int* _stdlib_heap_tail = NULL;

size_t _stdlib_align_size(size_t size) {
  if (size <= 0) return 4;
  int remainder = size & 3;
  if (remainder == 0) return size;
  return size + (4 - remainder);
}

int* _stdlib_block_next(int* header) {
  return (int*)header[2];
}

void _stdlib_set_block_next(int* header, int* next) {
  header[2] = (int)next;
}

bool _stdlib_block_is_free(int* header) {
  return header != NULL && header[1] != 0;
}

size_t _stdlib_block_payload_size(int* header) {
  return (size_t)header[0];
}

char* _stdlib_block_data(int* header) {
  return (char*)(header + 3);
}

bool _stdlib_blocks_adjacent(int* left, int* right) {
  if (left == NULL || right == NULL) return false;
  return (_stdlib_block_data(left) + left[0]) == (char*)right;
}

void _stdlib_try_split(int* header, size_t size) {
  size_t available = _stdlib_block_payload_size(header);
  int splitThreshold = size + _stdlib_block_header_bytes + _stdlib_min_payload_bytes;
  if (available < splitThreshold) return;

  int* next = _stdlib_block_next(header);
  int* split = (int*)(_stdlib_block_data(header) + size);
  split[0] = available - size - _stdlib_block_header_bytes;
  split[1] = 1;
  _stdlib_set_block_next(split, next);

  header[0] = size;
  _stdlib_set_block_next(header, split);
  if (_stdlib_heap_tail == header) _stdlib_heap_tail = split;
}

void _stdlib_try_coalesce(int* header) {
  int* next = _stdlib_block_next(header);
  while (_stdlib_block_is_free(header)
      && next != NULL
      && _stdlib_block_is_free(next)
      && _stdlib_blocks_adjacent(header, next)) {
    header[0] = header[0] + _stdlib_block_header_bytes + next[0];
    _stdlib_set_block_next(header, _stdlib_block_next(next));
    if (_stdlib_heap_tail == next) _stdlib_heap_tail = header;
    next = _stdlib_block_next(header);
  }
}

int* _stdlib_find_previous_block(int* target) {
  int* previous = NULL;
  int* cursor = _stdlib_heap_head;
  while (cursor != NULL && cursor != target) {
    previous = cursor;
    cursor = _stdlib_block_next(cursor);
  }
  return previous;
}

int* _stdlib_find_free_block(size_t size) {
  int* cursor = _stdlib_heap_head;
  while (cursor != NULL) {
    if (_stdlib_block_is_free(cursor)) {
      _stdlib_try_coalesce(cursor);
      if (_stdlib_block_payload_size(cursor) >= size) {
        return cursor;
      }
    }
    cursor = _stdlib_block_next(cursor);
  }
  return NULL;
}

int* _stdlib_request_block(size_t size) {
  int total = size + _stdlib_block_header_bytes;
  int raw = sbrk(total);
  if (raw == 0) return NULL;

  int* header = (int*)raw;
  header[0] = size;
  header[1] = 0;
  _stdlib_set_block_next(header, NULL);

  if (_stdlib_heap_head == NULL) {
    _stdlib_heap_head = header;
  } else {
    _stdlib_set_block_next(_stdlib_heap_tail, header);
  }
  _stdlib_heap_tail = header;
  return header;
}

void* malloc(size_t size) {
  size_t aligned = _stdlib_align_size(size);
  int* header = _stdlib_find_free_block(aligned);
  if (header == NULL) {
    header = _stdlib_request_block(aligned);
  }
  if (header == NULL) return NULL;

  header[1] = 0;
  _stdlib_try_split(header, aligned);
  return _stdlib_block_data(header);
}

void free(void* ptr) {
  if (ptr == NULL) return;

  int* header = ((int*)ptr) - 3;
  header[1] = 1;
  _stdlib_try_coalesce(header);

  int* previous = _stdlib_find_previous_block(header);
  if (previous != NULL && _stdlib_block_is_free(previous)) {
    _stdlib_try_coalesce(previous);
  }
}

void* calloc(size_t count, size_t size) {
  size_t total = count * size;
  void* memory = malloc(total);
  if (memory == NULL) return NULL;

  char* bytes = (char*)memory;
  size_t index = 0;
  while (index < total) {
    bytes[index] = '\0';
    index = index + 1;
  }
  return memory;
}

void* realloc(void* ptr, size_t size) {
  if (ptr == NULL) return malloc(size);
  if (size <= 0) {
    free(ptr);
    return NULL;
  }

  size_t aligned = _stdlib_align_size(size);
  int* header = ((int*)ptr) - 3;
  size_t currentSize = _stdlib_block_payload_size(header);
  if (currentSize >= aligned) {
    _stdlib_try_split(header, aligned);
    return ptr;
  }

  int* next = _stdlib_block_next(header);
  if (next != NULL && _stdlib_block_is_free(next) && _stdlib_blocks_adjacent(header, next)) {
    header[0] = header[0] + _stdlib_block_header_bytes + next[0];
    _stdlib_set_block_next(header, _stdlib_block_next(next));
    if (_stdlib_heap_tail == next) _stdlib_heap_tail = header;
    if (_stdlib_block_payload_size(header) >= aligned) {
      _stdlib_try_split(header, aligned);
      return _stdlib_block_data(header);
    }
  }

  void* replacement = malloc(aligned);
  if (replacement == NULL) return NULL;

  char* dst = (char*)replacement;
  char* src = (char*)ptr;
  size_t copyCount = currentSize;
  if (copyCount > aligned) copyCount = aligned;
  size_t index = 0;
  while (index < copyCount) {
    dst[index] = src[index];
    index = index + 1;
  }

  free(ptr);
  return replacement;
}

bool _stdlib_is_space(int ch) {
  return ch == 32 || ch == 9 || ch == 10 || ch == 11 || ch == 12 || ch == 13;
}

bool _stdlib_is_digit(int ch) {
  return ch >= 48 && ch <= 57;
}

int atoi(string text) {
  int len = __wm_string_length(text);
  int index = 0;

  while (index < len && _stdlib_is_space((int)__wm_string_charat(text, index))) {
    index = index + 1;
  }

  int sign = 1;
  if (index < len) {
    int marker = (int)__wm_string_charat(text, index);
    if (marker == 45) {
      sign = -1;
      index = index + 1;
    } else if (marker == 43) {
      index = index + 1;
    }
  }

  int value = 0;
  while (index < len) {
    int ch = (int)__wm_string_charat(text, index);
    if (!_stdlib_is_digit(ch)) break;
    value = value * 10 + (ch - 48);
    index = index + 1;
  }

  return value * sign;
}

int atol(string text) {
  return atoi(text);
}

int labs(int value) {
  return abs(value);
}

void abort(void) {
  exit(EXIT_FAILURE);
}
