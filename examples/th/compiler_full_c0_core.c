#use <conio>

struct stats {   //โครงสร้างคือกลุ่มคำที่ต่อเนื่องกันในหน่วยความจำ
  int count;
  int total;
};

typedef struct stats* stats_t;   //โปรแกรมจะส่งผ่านที่อยู่ ไม่ใช่ทั้งบล็อก

//@requires box != NULL;
//@requires 0 <= n && n <= \length(values);
//@ensures \result == box->total;
int accumulate(stats_t box, int values[], int n) {   //สัญญาข้างต้นได้รับการตรวจสอบโดยคอมไพลเลอร์ ไม่ใช่การพิมพ์
  box->count = n;
  box->total = 0;

  int i = 0;
  //@loop_invariant 0 <= i && i <= n;
  //@loop_invariant box->count == n;
  while (i < n) {
    box->total += values[i];   //box-> อ่านฟิลด์ที่มีออฟเซ็ตคงที่จากที่อยู่
    i++;
  }

  return box->total;
}

int main(void) {
  //ตัวอย่างแกนหลัก C0 แบบเต็ม: สัญญา, ค่าคงที่ของลูป, typedef, struct, alloc, alloc_array และการอัปเดตฟิลด์ตัวชี้
  int values[4] = {2, 4, 6, 8};
  int* heap_values = alloc_array(int, 2);
  heap_values[0] = 10;
  heap_values[1] = 20;
  assert(heap_values[1] == 20);

  stats_t box = alloc(struct stats);
  int total = accumulate(box, values, 4);
  assert(box->count == 4);

  print("Total: ");
  printint(total);
  printchar('\n');
  print("Count: ");
  printint(box->count);
  printchar('\n');
  return 0;
}


