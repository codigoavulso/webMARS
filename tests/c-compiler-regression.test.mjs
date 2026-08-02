// Behavioural regressions for the Mini-C compiler.
//
// Every case compiles, assembles and runs, then compares the printed value. A
// wrong value that still compiles is the failure mode these tests exist to catch.
import assert from "node:assert/strict";
import test from "node:test";
import { createJavaScriptEngine, loadMiniCCompiler } from "./helpers/engines.mjs";

let compiler = null;

async function compile(source, { subset = "C1-NATIVE" } = {}) {
  compiler ||= await loadMiniCCompiler();
  return compiler.compile(source, {
    sourceName: "regression.c",
    subset,
    targetAbi: "o32",
    emitComments: false,
    useLibrarySources: {}
  });
}

async function runC(source, { subset = "C1-NATIVE" } = {}) {
  const compiled = await compile(source, { subset });
  assert.equal(compiled.ok, true, `did not compile: ${JSON.stringify(compiled.errors)}`);
  const engine = await createJavaScriptEngine({
    settings: { startAtMain: true, maxMemoryBytes: 0x7fffffff }
  });
  const assembled = engine.assemble(compiled.asm, { sourceName: "regression.s" });
  assert.equal(assembled.ok, true, `invalid assembly: ${JSON.stringify(assembled.errors)}`);

  let output = "";
  for (let step = 0; step < 200000 && !engine.getSnapshot().halted; step += 1) {
    const result = engine.step({ includeSnapshot: false });
    assert.equal(result.ok, true, result.message || "execution failed");
    assert.notEqual(result.waitingForInput, true, "unexpected input request");
    if (result.runIo) output += result.message;
  }
  assert.equal(engine.getSnapshot().halted, true, "program did not halt");
  return output.trim();
}

test("a leading zero reads as octal, like C", async () => {
  assert.equal(await runC("int main(void){print_int(010);return 0;}"), "8");
  assert.equal(await runC("int main(void){print_int(0777);return 0;}"), "511");
  assert.equal(await runC("int main(void){print_int(0);return 0;}"), "0");
  assert.equal(await runC("int main(void){print_int(0x1f);return 0;}"), "31");
  assert.equal(await runC("int main(void){print_int(42);return 0;}"), "42");

  // An array length is a literal too, so it must use the same radix rules.
  assert.equal(await runC("int main(void){int a[010];a[7]=5;print_int(a[7]);return 0;}"), "5");
});

test("a malformed octal literal is reported instead of silently reinterpreted", async () => {
  const compiled = await compile("int main(void){print_int(09);return 0;}");
  assert.equal(compiled.ok, false);
  assert.match(String(compiled.errors?.[0]?.message ?? ""), /octal/i);
});

test("octal is a native-profile extension and the C0 profiles reject it", async () => {
  const c0 = await compile("int main(void){print_int(010);return 0;}", { subset: "C0-S1" });
  assert.equal(c0.ok, false, "C0 has decimal and hexadecimal literals only");
  assert.match(String(c0.errors?.[0]?.message ?? ""), /octal/i);

  const decimal = await compile("int main(void){print_int(8);return 0;}", { subset: "C0-S1" });
  assert.equal(decimal.ok, true);
  const hexadecimal = await compile("int main(void){print_int(0x8);return 0;}", { subset: "C0-S1" });
  assert.equal(hexadecimal.ok, true);
});

test("member access on an array element keeps the element index", async () => {
  // Every one of these used to read the last element written, because the address
  // of a[i] was discarded and only the field offset survived.
  assert.equal(
    await runC(`struct P{int x;};
int main(void){struct P a[3];a[0].x=1;a[1].x=2;a[2].x=3;
print_int(a[0].x);print_char(32);print_int(a[1].x);print_char(32);print_int(a[2].x);return 0;}`),
    "1 2 3"
  );

  assert.equal(
    await runC(`struct P{int x;int y;};
int main(void){struct P a[2];a[0].x=1;a[0].y=2;a[1].x=3;a[1].y=4;
print_int(a[0].x+a[0].y*10+a[1].x*100+a[1].y*1000);return 0;}`),
    "4321"
  );

  // A computed index has to scale by the size of the struct, not by one word.
  assert.equal(
    await runC(`struct P{int x;int y;};
int main(void){struct P a[3];
for(int i=0;i<3;i++){a[i].x=i*10;a[i].y=i+1;}
int s=0;for(int i=0;i<3;i++){s+=a[i].x*a[i].y;}
print_int(s);return 0;}`),
    "80"
  );

  // The address of an element must agree with the address a pointer sees.
  assert.equal(
    await runC(`struct P{int x;};
int main(void){struct P a[2];a[0].x=7;a[1].x=9;struct P* p=&a[1];print_int(p->x);return 0;}`),
    "9"
  );

  assert.equal(
    await runC(`struct In{int v;};struct Out{struct In i;};
int main(void){struct Out o[2];o[0].i.v=4;o[1].i.v=6;print_int(o[0].i.v+o[1].i.v);return 0;}`),
    "10"
  );
});

test("the native profile treats any scalar as a condition, like C", async () => {
  assert.equal(
    await runC("int main(void){int a=3;int b=0;if(a&&!b)print_int(1);else print_int(0);return 0;}"),
    "1"
  );
  assert.equal(
    await runC("int main(void){int a=0;int b=7;if(a||b)print_int(1);else print_int(0);return 0;}"),
    "1"
  );

  // The classic pointer guard: the right side must not run when the left is null.
  assert.equal(
    await runC(`struct P{int x;};
int main(void){struct P* p=NULL;int s=9;if(p&&p->x)s=1;print_int(s);return 0;}`),
    "9"
  );
  assert.equal(
    await runC(`struct P{int x;};
int main(void){struct P* p=alloc(struct P);p->x=5;int s=0;if(p&&p->x)s=p->x;print_int(s);return 0;}`),
    "5"
  );

  // Short circuiting still holds: the call on the right must not happen.
  assert.equal(
    await runC(`int bump(int* p){*p=*p+1;return 1;}
int main(void){int c=0;int f=0;if(f&&bump(&c)){}int t=1;if(t||bump(&c)){}print_int(c);return 0;}`),
    "0"
  );
});

test("a condition produces a value that arithmetic accepts", async () => {
  assert.equal(await runC("int main(void){int a=1;int b=2;int r=(a&&b);print_int(r);return 0;}"), "1");
  assert.equal(await runC("int main(void){int r=(3>2);print_int(r);return 0;}"), "1");
  assert.equal(await runC("int main(void){int a=5;int s=(a>1)+(a>3)+(a>9);print_int(s);return 0;}"), "2");
  assert.equal(await runC("int main(void){int a=5;print_int((a>1)<<2);return 0;}"), "4");
  assert.equal(
    await runC("int main(void){int n=0;for(int i=0;i<10;i++)n+=(i%3==0);print_int(n);return 0;}"),
    "4"
  );
});

test("the C0 profiles keep their strict bool discipline", async () => {
  const cases = [
    "int main(void){int a=1;if(a&&a)print_int(1);return 0;}",
    "int main(void){int a=1;int r=(a>0);print_int(r);return 0;}",
    "int main(void){int n=0;n+=(1>0);print_int(n);return 0;}",
    "int main(void){int a=5;int s=(a>1)+(a>3);print_int(s);return 0;}"
  ];
  for (const source of cases) {
    const compiled = await compile(source, { subset: "C0-S4" });
    assert.equal(compiled.ok, false, `C0-S4 must reject: ${source}`);
  }

  // Ordinary C0 arithmetic and bool usage are untouched.
  assert.equal(await runC("int main(void){int a=1;a+=2;print_int(a);return 0;}", { subset: "C0-S1" }), "3");
});

test("numeric escape sequences follow C", async () => {
  const backslash = String.fromCharCode(92);
  assert.equal(await runC(`int main(void){print_int((int)'${backslash}x41');return 0;}`), "65");
  assert.equal(await runC(`int main(void){print_int((int)'${backslash}101');return 0;}`), "65");
  assert.equal(await runC(`int main(void){print_int((int)'${backslash}7');return 0;}`), "7");
  assert.equal(await runC(`int main(void){print_string("${backslash}x48${backslash}x69");return 0;}`), "Hi");
  assert.equal(await runC(`int main(void){print_string("${backslash}110${backslash}111");return 0;}`), "HI");
  assert.equal(await runC(`int main(void){print_int((int)(char)'${backslash}xff');return 0;}`), "255");
  // The named escapes are untouched.
  assert.equal(await runC(`int main(void){print_int((int)'${backslash}n'+(int)'${backslash}t');return 0;}`), "19");

  const noDigits = await compile(`int main(void){print_int((int)'${backslash}xZ');return 0;}`);
  assert.equal(noDigits.ok, false);
  assert.match(String(noDigits.errors?.[0]?.message ?? ""), /hexadecimal escape/i);

  // A NUL inside a string is still refused, whichever spelling reaches it.
  const embeddedNull = await compile(`int main(void){print_string("a${backslash}0b");return 0;}`);
  assert.equal(embeddedNull.ok, false);
});

test("one type specifier can introduce several declarators", async () => {
  assert.equal(await runC("int main(void){int a=1,b=2;print_int(a*10+b);return 0;}"), "12");
  assert.equal(await runC("int main(void){int a=1,b,c=3;b=5;print_int(a*100+b*10+c);return 0;}"), "153");
  assert.equal(await runC("int main(void){int a=2,b=a*3;print_int(b);return 0;}"), "6");
  assert.equal(await runC("int main(void){int a[3],n=3;a[0]=7;print_int(a[0]+n);return 0;}"), "10");
  assert.equal(await runC("int main(void){int a=9;print_int(a);return 0;}"), "9");

  // The star belongs to the declarator: in 'int* p, q' only p is a pointer.
  assert.equal(await runC("int main(void){int v=4;int *p=&v,*q=&v;*p=*q+1;print_int(v);return 0;}"), "5");
  assert.equal(await runC("int main(void){int v=7;int* p=&v,q=3;print_int(*p+q);return 0;}"), "10");
  const notAPointer = await compile("int main(void){int v=7;int* p=&v,q=3;*q=1;return 0;}");
  assert.equal(notAPointer.ok, false, "the second declarator must not inherit the pointer star");

  assert.equal(
    await runC(`struct P{int x;};
int main(void){struct P *a=alloc(struct P),*b=alloc(struct P);a->x=2;b->x=3;print_int(a->x*b->x);return 0;}`),
    "6"
  );

  const missingName = await compile("int main(void){int a=1,;return 0;}");
  assert.equal(missingName.ok, false);
});

test("control flow accepts any scalar as a condition in the native profile", async () => {
  assert.equal(await runC("int main(void){int a=3;if(a)print_int(1);else print_int(0);return 0;}"), "1");
  assert.equal(await runC("int main(void){int a=0;if(a)print_int(1);else print_int(0);return 0;}"), "0");
  assert.equal(await runC("int main(void){char c='A';if(c)print_int(1);else print_int(0);return 0;}"), "1");
  assert.equal(
    await runC("struct P{int x;};int main(void){struct P* p=NULL;if(p)print_int(1);else print_int(0);return 0;}"),
    "0"
  );

  // The idiomatic countdown loops, in both spellings.
  assert.equal(await runC("int main(void){int n=3;int s=0;while(n){s=s*10+n;n--;}print_int(s);return 0;}"), "321");
  assert.equal(await runC("int main(void){int s=0;for(int n=3;n;n--)s=s*10+n;print_int(s);return 0;}"), "321");

  // A bool condition keeps working everywhere.
  assert.equal(await runC("int main(void){int a=1;if(a>0)print_int(1);return 0;}"), "1");
});

test("the C0 profiles still demand a bool condition", async () => {
  const cases = [
    "int main(void){int a=1;if(a)print_int(1);return 0;}",
    "int main(void){int a=1;while(a){a=0;}print_int(1);return 0;}",
    "int main(void){for(int n=3;n;n--){}print_int(1);return 0;}"
  ];
  for (const source of cases) {
    const compiled = await compile(source, { subset: "C0-S2" });
    assert.equal(compiled.ok, false, `C0-S2 must reject: ${source}`);
    assert.match(String(compiled.errors?.[0]?.message ?? ""), /bool expression/i);
  }
  assert.equal(await runC("int main(void){int a=1;if(a>0)print_int(1);return 0;}", { subset: "C0-S2" }), "1");
});

test("do-while runs its body before testing", async () => {
  assert.equal(await runC("int main(void){int i=0;int s=0;do{s+=1;i++;}while(i<0);print_int(s);return 0;}"), "1");
  assert.equal(await runC("int main(void){int i=0;int s=0;do{s+=i;i++;}while(i<4);print_int(s);return 0;}"), "6");
  assert.equal(await runC("int main(void){int i=0;do i++; while(i<5);print_int(i);return 0;}"), "5");
  assert.equal(await runC("int main(void){int n=3;int s=0;do{s=s*10+n;n--;}while(n);print_int(s);return 0;}"), "321");

  // break leaves the loop and continue jumps to the test, not to the body.
  assert.equal(await runC("int main(void){int i=0;do{i++;if(i==3)break;}while(i<10);print_int(i);return 0;}"), "3");
  assert.equal(
    await runC("int main(void){int i=0;int s=0;do{i++;if(i%2==0)continue;s+=i;}while(i<5);print_int(s);return 0;}"),
    "9"
  );
  assert.equal(
    await runC("int main(void){int s=0;int i=0;do{int j=0;do{s++;j++;}while(j<2);i++;}while(i<3);print_int(s);return 0;}"),
    "6"
  );

  const c0 = await compile("int main(void){int n=3;do{n--;}while(n);return 0;}", { subset: "C0-S2" });
  assert.equal(c0.ok, false, "C0 still demands a bool condition");
});

test("sizeof reports the storage the compiler actually uses", async () => {
  assert.equal(await runC("int main(void){print_int(sizeof(int));return 0;}"), "4");
  assert.equal(await runC("int main(void){print_int(sizeof(char));return 0;}"), "1");
  assert.equal(await runC("int main(void){print_int(sizeof(int*));return 0;}"), "4");
  assert.equal(
    await runC("struct P{int x;int y;};int main(void){print_int(sizeof(struct P));return 0;}"),
    "8"
  );
  assert.equal(await runC("int main(void){int v=1;print_int(sizeof v);return 0;}"), "4");
  assert.equal(await runC("int main(void){int a[5];a[0]=1;print_int(sizeof(a));return 0;}"), "20");
  assert.equal(await runC("int main(void){print_int(sizeof(int)*2+1);return 0;}"), "9");

  const c0 = await compile("int main(void){print_int(sizeof(int));return 0;}", { subset: "C0-S4" });
  assert.equal(c0.ok, false, "sizeof is a native-profile extension");
});

test("the comma operator evaluates left to right and yields the right value", async () => {
  assert.equal(await runC("int main(void){int a=0;int b=0;a=1,b=2;print_int(a*10+b);return 0;}"), "12");
  assert.equal(await runC("int main(void){int a=0;int r;r=(a=2,a+3);print_int(r);return 0;}"), "5");
  assert.equal(await runC("int main(void){int a=0;int b=0;b=(a=4,a*2);print_int(a*10+b);return 0;}"), "48");
  assert.equal(await runC("int main(void){int a=0;int b=0;int r=(a=1,b=2,a+b);print_int(r);return 0;}"), "3");

  // Commas that separate arguments and declarators are untouched.
  assert.equal(await runC("int add(int a,int b){return a+b;}int main(void){print_int(add(1,2));return 0;}"), "3");
  assert.equal(await runC("int main(void){int a=1,b=2;print_int(a+b);return 0;}"), "3");
  assert.equal(await runC("int main(void){print_int((2+3)*4);return 0;}"), "20");
});

test("switch selects a section, falls through and honours break", async () => {
  const program = (value) => `int main(void){int x=${value};int r=0;
switch(x){case 1:r=10;break;case 2:r=20;break;default:r=30;}print_int(r);return 0;}`;
  assert.equal(await runC(program(1)), "10");
  assert.equal(await runC(program(2)), "20");
  assert.equal(await runC(program(9)), "30");

  // Without break a section falls into the next one.
  assert.equal(
    await runC("int main(void){int x=1;int r=0;switch(x){case 1:r+=1;case 2:r+=2;break;default:r=99;}print_int(r);return 0;}"),
    "3"
  );
  // No default and no match means nothing runs.
  assert.equal(await runC("int main(void){int x=9;int r=7;switch(x){case 1:r=10;break;}print_int(r);return 0;}"), "7");
  // default is reachable wherever it is written.
  assert.equal(
    await runC("int main(void){int x=5;int r=0;switch(x){case 1:r=1;break;default:r=2;break;case 3:r=3;break;}print_int(r);return 0;}"),
    "2"
  );
  assert.equal(
    await runC("int main(void){char c='b';int r=0;switch(c){case 'a':r=1;break;case 'b':r=2;break;}print_int(r);return 0;}"),
    "2"
  );
  assert.equal(
    await runC(`int main(void){int r=0;int a=1;int b=2;
switch(a){case 1:switch(b){case 2:r=7;break;default:r=1;}break;default:r=0;}print_int(r);return 0;}`),
    "7"
  );

  // Inside a loop, break ends the switch and continue reaches the loop.
  assert.equal(
    await runC("int main(void){int s=0;for(int i=0;i<4;i++){switch(i){case 1:s+=10;break;case 2:s+=100;break;default:s+=1;}}print_int(s);return 0;}"),
    "112"
  );
  assert.equal(
    await runC("int main(void){int s=0;for(int i=0;i<4;i++){switch(i){case 1:continue;default:break;}s+=1;}print_int(s);return 0;}"),
    "3"
  );
});

test("switch rejects the labels C would reject", async () => {
  const rejected = [
    "int main(void){int x=1;switch(x){case 1:break;case 1:break;}return 0;}",
    "int main(void){int x=1;int y=2;switch(x){case y:break;}return 0;}",
    "int main(void){int x=1;switch(x){default:break;default:break;}return 0;}",
    "int main(void){int x=1;switch(x){case 1:continue;}return 0;}",
    "int main(void){break;return 0;}"
  ];
  for (const source of rejected) {
    const compiled = await compile(source);
    assert.equal(compiled.ok, false, `must be rejected: ${source}`);
  }

  const c0 = await compile("int main(void){int x=1;switch(x){case 1:break;}return 0;}", { subset: "C0-S4" });
  assert.equal(c0.ok, false, "switch is a native-profile extension");
});

test("the for clauses take declarator lists and the comma operator", async () => {
  // The idiomatic two-variable loop, walking from both ends.
  assert.equal(await runC("int main(void){int s=0;for(int i=0,j=3;i<j;i++,j--)s+=1;print_int(s);return 0;}"), "2");
  assert.equal(
    await runC("int main(void){int s=0;for(int i=0,j=5;i<j;i++,j--)s=s*10+i+j;print_int(s);return 0;}"),
    "555"
  );
  assert.equal(
    await runC("int main(void){int s=0;for(int i=0,n=2;i<n;i++){for(int j=0,m=3;j<m;j++)s++;}print_int(s);return 0;}"),
    "6"
  );
  // Commas between plain expressions work in both clauses.
  assert.equal(
    await runC("int main(void){int i;int j;int s=0;for(i=0,j=2;i<j;i++,j--)s+=1;print_int(s);return 0;}"),
    "1"
  );
  assert.equal(
    await runC("int main(void){int a=0;int b=0;for(int i=0;i<3;i++,a++)b++;print_int(a*10+b);return 0;}"),
    "33"
  );
  // A single declarator keeps behaving exactly as before.
  assert.equal(await runC("int main(void){int s=0;for(int i=0;i<4;i++)s+=i;print_int(s);return 0;}"), "6");
});

test("unary plus is accepted and changes nothing", async () => {
  assert.equal(await runC("int main(void){int a=5;print_int(+a);return 0;}"), "5");
  assert.equal(await runC("int main(void){int a=5;print_int(-a + +a + 3);return 0;}"), "3");
  // The increment operator and binary addition are untouched.
  assert.equal(await runC("int main(void){int i=1;i++;++i;print_int(i);return 0;}"), "3");
  assert.equal(await runC("int main(void){print_int(2+3);return 0;}"), "5");
});

test("enum declares named integer constants", async () => {
  assert.equal(
    await runC("enum C{RED,GREEN,BLUE};int main(void){print_int(RED*100+GREEN*10+BLUE);return 0;}"),
    "12"
  );
  // An explicit value restarts the automatic numbering from there.
  assert.equal(
    await runC("enum C{RED,GREEN=5,BLUE};int main(void){print_int(RED+GREEN+BLUE);return 0;}"),
    "11"
  );
  assert.equal(await runC("enum{ONE=1,TWO};int main(void){print_int(ONE+TWO);return 0;}"), "3");
  assert.equal(await runC("enum C{MASK=0xff};int main(void){print_int(MASK);return 0;}"), "255");

  // 'enum Name' is an int-sized type for variables and parameters.
  assert.equal(await runC("enum C{RED,GREEN};int main(void){enum C c=GREEN;print_int(c);return 0;}"), "1");
  assert.equal(
    await runC("enum C{A=2,B=3};int f(enum C c){return c*10;}int main(void){print_int(f(B));return 0;}"),
    "30"
  );

  // Enumerators are constants, so they work as case labels and array lengths.
  assert.equal(
    await runC(`enum C{RED,GREEN,BLUE};
int main(void){enum C c=BLUE;int r=0;switch(c){case RED:r=1;break;case BLUE:r=3;break;}print_int(r);return 0;}`),
    "3"
  );
  assert.equal(await runC("enum{N=4};int main(void){int a[N];a[3]=7;print_int(a[3]+N);return 0;}"), "11");
  assert.equal(
    await runC("enum{R=2,C=3};int main(void){int m[R][C];m[1][2]=9;print_int(m[1][2]);return 0;}"),
    "9"
  );

  const duplicate = await compile("enum A{X};enum B{X};int main(void){return 0;}");
  assert.equal(duplicate.ok, false, "a repeated enumerator name must be reported");

  // Ordinary arrays and structs are unaffected.
  assert.equal(await runC("int main(void){int a[3];a[2]=5;print_int(a[2]);return 0;}"), "5");
});

test("goto jumps to a label in the same function", async () => {
  assert.equal(await runC("int main(void){int i=0;loop: i++; if(i<3) goto loop; print_int(i);return 0;}"), "3");
  assert.equal(await runC("int main(void){int s=1;goto done;s=2;done: print_int(s);return 0;}"), "1");

  // The reason goto survives in C: leaving nested loops in one step.
  assert.equal(
    await runC(`int main(void){int s=0;
for(int i=0;i<3;i++){for(int j=0;j<3;j++){if(i*j==2)goto out;s++;}}
out: print_int(s);return 0;}`),
    "5"
  );

  // Labels are per function, so the same name may appear in two of them.
  assert.equal(
    await runC(`int f(void){int i=0;again: i++; if(i<2) goto again; return i;}
int main(void){int i=0;again: i++; if(i<3) goto again; print_int(i*10+f());return 0;}`),
    "32"
  );

  const unknown = await compile("int main(void){goto nowhere;return 0;}");
  assert.equal(unknown.ok, false, "a jump to a label that does not exist must be reported");
  const duplicate = await compile("int main(void){a: a: return 0;}");
  assert.equal(duplicate.ok, false, "a repeated label must be reported");

  const c0 = await compile("int main(void){int i=0;loop: i++; if(i<3) goto loop; return 0;}", { subset: "C0-S4" });
  assert.equal(c0.ok, false, "goto is a native-profile extension");

  // A colon in a conditional expression and the switch labels are unaffected.
  assert.equal(await runC("int main(void){int a=1;int b=(a>0)?7:9;print_int(b);return 0;}"), "7");
  assert.equal(
    await runC("int main(void){int x=2;int r=0;switch(x){case 2:r=5;break;default:r=1;}print_int(r);return 0;}"),
    "5"
  );
});

test("plain integer arrays and single structs still behave", async () => {
  assert.equal(
    await runC("int main(void){int a[3];a[0]=1;a[1]=2;a[2]=3;print_int(a[0]+a[1]*10+a[2]*100);return 0;}"),
    "321"
  );
  assert.equal(
    await runC(`struct P{int x;int y;};
int main(void){struct P* p = alloc(struct P);p->x=2;p->y=5;print_int(p->x*p->y);return 0;}`),
    "10"
  );
});
