(() => {
  const globalScope = typeof window !== "undefined" ? window : globalThis;
  const referenceData = globalScope.WebMarsReferenceData || (globalScope.WebMarsReferenceData = {});
  referenceData.basicInstructions = [
  {
    "example": "nop",
    "description": "Null operation : machine code is all zeroes"
  },
  {
    "example": "add $t1,$t2,$t3",
    "description": "Addition with overflow : set $t1 to ($t2 plus $t3)"
  },
  {
    "example": "sub $t1,$t2,$t3",
    "description": "Subtraction with overflow : set $t1 to ($t2 minus $t3)"
  },
  {
    "example": "addi $t1,$t2,-100",
    "description": "Addition immediate with overflow : set $t1 to ($t2 plus signed 16-bit immediate)"
  },
  {
    "example": "addu $t1,$t2,$t3",
    "description": "Addition unsigned without overflow : set $t1 to ($t2 plus $t3), no overflow"
  },
  {
    "example": "subu $t1,$t2,$t3",
    "description": "Subtraction unsigned without overflow : set $t1 to ($t2 minus $t3), no overflow"
  },
  {
    "example": "addiu $t1,$t2,-100",
    "description": "Addition immediate unsigned without overflow : set $t1 to ($t2 plus signed 16-bit immediate), no overflow"
  },
  {
    "example": "mult $t1,$t2",
    "description": "Multiplication : Set hi to high-order 32 bits, lo to low-order 32 bits of the product of $t1 and $t2 (use mfhi to access hi, mflo to access lo)"
  },
  {
    "example": "multu $t1,$t2",
    "description": "Multiplication unsigned : Set HI to high-order 32 bits, LO to low-order 32 bits of the product of unsigned $t1 and $t2 (use mfhi to access HI, mflo to access LO)"
  },
  {
    "example": "mul $t1,$t2,$t3",
    "description": "Multiplication without overflow  : Set HI to high-order 32 bits, LO and $t1 to low-order 32 bits of the product of $t2 and $t3 (use mfhi to access HI, mflo to access LO)"
  },
  {
    "example": "madd $t1,$t2",
    "description": "Multiply add : Multiply $t1 by $t2 then increment HI by high-order 32 bits of product, increment LO by low-order 32 bits of product (use mfhi to access HI, mflo to access LO)"
  },
  {
    "example": "maddu $t1,$t2",
    "description": "Multiply add unsigned : Multiply $t1 by $t2 then increment HI by high-order 32 bits of product, increment LO by low-order 32 bits of product, unsigned (use mfhi to access HI, mflo to access LO)"
  },
  {
    "example": "msub $t1,$t2",
    "description": "Multiply subtract : Multiply $t1 by $t2 then decrement HI by high-order 32 bits of product, decrement LO by low-order 32 bits of product (use mfhi to access HI, mflo to access LO)"
  },
  {
    "example": "msubu $t1,$t2",
    "description": "Multiply subtract unsigned : Multiply $t1 by $t2 then decrement HI by high-order 32 bits of product, decement LO by low-order 32 bits of product, unsigned (use mfhi to access HI, mflo to access LO)"
  },
  {
    "example": "div $t1,$t2",
    "description": "Division with overflow : Divide $t1 by $t2 then set LO to quotient and HI to remainder (use mfhi to access HI, mflo to access LO)"
  },
  {
    "example": "divu $t1,$t2",
    "description": "Division unsigned without overflow : Divide unsigned $t1 by $t2 then set LO to quotient and HI to remainder (use mfhi to access HI, mflo to access LO)"
  },
  {
    "example": "mfhi $t1",
    "description": "Move from HI register : Set $t1 to contents of HI (see multiply and divide operations)"
  },
  {
    "example": "mflo $t1",
    "description": "Move from LO register : Set $t1 to contents of LO (see multiply and divide operations)"
  },
  {
    "example": "mthi $t1",
    "description": "Move to HI registerr : Set HI to contents of $t1 (see multiply and divide operations)"
  },
  {
    "example": "mtlo $t1",
    "description": "Move to LO register : Set LO to contents of $t1 (see multiply and divide operations)"
  },
  {
    "example": "and $t1,$t2,$t3",
    "description": "Bitwise AND : Set $t1 to bitwise AND of $t2 and $t3"
  },
  {
    "example": "or $t1,$t2,$t3",
    "description": "Bitwise OR : Set $t1 to bitwise OR of $t2 and $t3"
  },
  {
    "example": "andi $t1,$t2,100",
    "description": "Bitwise AND immediate : Set $t1 to bitwise AND of $t2 and zero-extended 16-bit immediate"
  },
  {
    "example": "ori $t1,$t2,100",
    "description": "Bitwise OR immediate : Set $t1 to bitwise OR of $t2 and zero-extended 16-bit immediate"
  },
  {
    "example": "nor $t1,$t2,$t3",
    "description": "Bitwise NOR : Set $t1 to bitwise NOR of $t2 and $t3"
  },
  {
    "example": "xor $t1,$t2,$t3",
    "description": "Bitwise XOR (exclusive OR) : Set $t1 to bitwise XOR of $t2 and $t3"
  },
  {
    "example": "xori $t1,$t2,100",
    "description": "Bitwise XOR immediate : Set $t1 to bitwise XOR of $t2 and zero-extended 16-bit immediate"
  },
  {
    "example": "sll $t1,$t2,10",
    "description": "Shift left logical : Set $t1 to result of shifting $t2 left by number of bits specified by immediate"
  },
  {
    "example": "sllv $t1,$t2,$t3",
    "description": "Shift left logical variable : Set $t1 to result of shifting $t2 left by number of bits specified by value in low-order 5 bits of $t3"
  },
  {
    "example": "srl $t1,$t2,10",
    "description": "Shift right logical : Set $t1 to result of shifting $t2 right by number of bits specified by immediate"
  },
  {
    "example": "sra $t1,$t2,10",
    "description": "Shift right arithmetic : Set $t1 to result of sign-extended shifting $t2 right by number of bits specified by immediate"
  },
  {
    "example": "srav $t1,$t2,$t3",
    "description": "Shift right arithmetic variable : Set $t1 to result of sign-extended shifting $t2 right by number of bits specified by value in low-order 5 bits of $t3"
  },
  {
    "example": "srlv $t1,$t2,$t3",
    "description": "Shift right logical variable : Set $t1 to result of shifting $t2 right by number of bits specified by value in low-order 5 bits of $t3"
  },
  {
    "example": "lw $t1,-100($t2)",
    "description": "Load word : Set $t1 to contents of effective memory word address"
  },
  {
    "example": "ll $t1,-100($t2)",
    "description": "Load linked : Paired with Store Conditional (sc) to perform atomic read-modify-write.  Treated as equivalent to Load Word (lw) because MARS does not simulate multiple processors."
  },
  {
    "example": "lwl $t1,-100($t2)",
    "description": "Load word left : Load from 1 to 4 bytes left-justified into $t1, starting with effective memory byte address and continuing through the low-order byte of its word"
  },
  {
    "example": "lwr $t1,-100($t2)",
    "description": "Load word right : Load from 1 to 4 bytes right-justified into $t1, starting with effective memory byte address and continuing through the high-order byte of its word"
  },
  {
    "example": "sw $t1,-100($t2)",
    "description": "Store word : Store contents of $t1 into effective memory word address"
  },
  {
    "example": "sc $t1,-100($t2)",
    "description": "Store conditional : Paired with Load Linked (ll) to perform atomic read-modify-write.  Stores $t1 value into effective address, then sets $t1 to 1 for success.  Always succeeds because MARS does not simulate multiple processors."
  },
  {
    "example": "swl $t1,-100($t2)",
    "description": "Store word left : Store high-order 1 to 4 bytes of $t1 into memory, starting with effective byte address and continuing through the low-order byte of its word"
  },
  {
    "example": "swr $t1,-100($t2)",
    "description": "Store word right : Store low-order 1 to 4 bytes of $t1 into memory, starting with high-order byte of word containing effective byte address and continuing through that byte address"
  },
  {
    "example": "lui $t1,100",
    "description": "Load upper immediate : Set high-order 16 bits of $t1 to 16-bit immediate and low-order 16 bits to 0"
  },
  {
    "example": "beq $t1,$t2,label",
    "description": "Branch if equal : Branch to statement at label's address if $t1 and $t2 are equal"
  },
  {
    "example": "bne $t1,$t2,label",
    "description": "Branch if not equal : Branch to statement at label's address if $t1 and $t2 are not equal"
  },
  {
    "example": "bgez $t1,label",
    "description": "Branch if greater than or equal to zero : Branch to statement at label's address if $t1 is greater than or equal to zero"
  },
  {
    "example": "bgezal $t1,label",
    "description": "Branch if greater then or equal to zero and link : If $t1 is greater than or equal to zero, then set $ra to the Program Counter and branch to statement at label's address"
  },
  {
    "example": "bgtz $t1,label",
    "description": "Branch if greater than zero : Branch to statement at label's address if $t1 is greater than zero"
  },
  {
    "example": "blez $t1,label",
    "description": "Branch if less than or equal to zero : Branch to statement at label's address if $t1 is less than or equal to zero"
  },
  {
    "example": "bltz $t1,label",
    "description": "Branch if less than zero : Branch to statement at label's address if $t1 is less than zero"
  },
  {
    "example": "bltzal $t1,label",
    "description": "Branch if less than zero and link : If $t1 is less than or equal to zero, then set $ra to the Program Counter and branch to statement at label's address"
  },
  {
    "example": "slt $t1,$t2,$t3",
    "description": "Set less than : If $t2 is less than $t3, then set $t1 to 1 else set $t1 to 0"
  },
  {
    "example": "sltu $t1,$t2,$t3",
    "description": "Set less than unsigned : If $t2 is less than $t3 using unsigned comparision, then set $t1 to 1 else set $t1 to 0"
  },
  {
    "example": "slti $t1,$t2,-100",
    "description": "Set less than immediate : If $t2 is less than sign-extended 16-bit immediate, then set $t1 to 1 else set $t1 to 0"
  },
  {
    "example": "sltiu $t1,$t2,-100",
    "description": "Set less than immediate unsigned : If $t2 is less than  sign-extended 16-bit immediate using unsigned comparison, then set $t1 to 1 else set $t1 to 0"
  },
  {
    "example": "movn $t1,$t2,$t3",
    "description": "Move conditional not zero : Set $t1 to $t2 if $t3 is not zero"
  },
  {
    "example": "movz $t1,$t2,$t3",
    "description": "Move conditional zero : Set $t1 to $t2 if $t3 is zero"
  },
  {
    "example": "movf $t1,$t2",
    "description": "Move if FP condition flag 0 false : Set $t1 to $t2 if FPU (Coprocessor 1) condition flag 0 is false (zero)"
  },
  {
    "example": "movf $t1,$t2,1",
    "description": "Move if specified FP condition flag false : Set $t1 to $t2 if FPU (Coprocessor 1) condition flag specified by the immediate is false (zero)"
  },
  {
    "example": "movt $t1,$t2",
    "description": "Move if FP condition flag 0 true : Set $t1 to $t2 if FPU (Coprocessor 1) condition flag 0 is true (one)"
  },
  {
    "example": "movt $t1,$t2,1",
    "description": "Move if specfied FP condition flag true : Set $t1 to $t2 if FPU (Coprocessor 1) condition flag specified by the immediate is true (one)"
  },
  {
    "example": "break 100",
    "description": "Break execution with code : Terminate program execution with specified exception code"
  },
  {
    "example": "break",
    "description": "Break execution : Terminate program execution with exception"
  },
  {
    "example": "syscall",
    "description": "Issue a system call : Execute the system call specified by value in $v0"
  },
  {
    "example": "j target",
    "description": "Jump unconditionally : Jump to statement at target address"
  },
  {
    "example": "jr $t1",
    "description": "Jump register unconditionally : Jump to statement whose address is in $t1"
  },
  {
    "example": "jal target",
    "description": "Jump and link : Set $ra to Program Counter (return address) then jump to statement at target address"
  },
  {
    "example": "jalr $t1,$t2",
    "description": "Jump and link register : Set $t1 to Program Counter (return address) then jump to statement whose address is in $t2"
  },
  {
    "example": "jalr $t1",
    "description": "Jump and link register : Set $ra to Program Counter (return address) then jump to statement whose address is in $t1"
  },
  {
    "example": "lb $t1,-100($t2)",
    "description": "Load byte : Set $t1 to sign-extended 8-bit value from effective memory byte address"
  },
  {
    "example": "lh $t1,-100($t2)",
    "description": "Load halfword : Set $t1 to sign-extended 16-bit value from effective memory halfword address"
  },
  {
    "example": "lhu $t1,-100($t2)",
    "description": "Load halfword unsigned : Set $t1 to zero-extended 16-bit value from effective memory halfword address"
  },
  {
    "example": "lbu $t1,-100($t2)",
    "description": "Load byte unsigned : Set $t1 to zero-extended 8-bit value from effective memory byte address"
  },
  {
    "example": "sb $t1,-100($t2)",
    "description": "Store byte : Store the low-order 8 bits of $t1 into the effective memory byte address"
  },
  {
    "example": "sh $t1,-100($t2)",
    "description": "Store halfword : Store the low-order 16 bits of $t1 into the effective memory halfword address"
  },
  {
    "example": "clo $t1,$t2",
    "description": "Count number of leading ones : Set $t1 to the count of leading one bits in $t2 starting at most significant bit position"
  },
  {
    "example": "clz $t1,$t2",
    "description": "Count number of leading zeroes : Set $t1 to the count of leading zero bits in $t2 starting at most significant bit positio"
  },
  {
    "example": "mfc0 $t1,$8",
    "description": "Move from Coprocessor 0 : Set $t1 to the value stored in Coprocessor 0 register $8"
  },
  {
    "example": "mtc0 $t1,$8",
    "description": "Move to Coprocessor 0 : Set Coprocessor 0 register $8 to value stored in $t1"
  },
  {
    "example": "add.s $f0,$f1,$f3",
    "description": "Floating point addition single precision : Set $f0 to single-precision floating point value of $f1 plus $f3"
  },
  {
    "example": "sub.s $f0,$f1,$f3",
    "description": "Floating point subtraction single precision : Set $f0 to single-precision floating point value of $f1  minus $f3"
  },
  {
    "example": "mul.s $f0,$f1,$f3",
    "description": "Floating point multiplication single precision : Set $f0 to single-precision floating point value of $f1 times $f3"
  },
  {
    "example": "div.s $f0,$f1,$f3",
    "description": "Floating point division single precision : Set $f0 to single-precision floating point value of $f1 divided by $f3"
  },
  {
    "example": "sqrt.s $f0,$f1",
    "description": "Square root single precision : Set $f0 to single-precision floating point square root of $f1"
  },
  {
    "example": "floor.w.s $f0,$f1",
    "description": "Floor single precision to word : Set $f0 to 32-bit integer floor of single-precision float in $f1"
  },
  {
    "example": "ceil.w.s $f0,$f1",
    "description": "Ceiling single precision to word : Set $f0 to 32-bit integer ceiling of single-precision float in $f1"
  },
  {
    "example": "round.w.s $f0,$f1",
    "description": "Round single precision to word : Set $f0 to 32-bit integer round of single-precision float in $f1"
  },
  {
    "example": "trunc.w.s $f0,$f1",
    "description": "Truncate single precision to word : Set $f0 to 32-bit integer truncation of single-precision float in $f1"
  },
  {
    "example": "add.d $f2,$f4,$f6",
    "description": "Floating point addition double precision : Set $f2 to double-precision floating point value of $f4 plus $f6"
  },
  {
    "example": "sub.d $f2,$f4,$f6",
    "description": "Floating point subtraction double precision : Set $f2 to double-precision floating point value of $f4 minus $f6"
  },
  {
    "example": "mul.d $f2,$f4,$f6",
    "description": "Floating point multiplication double precision : Set $f2 to double-precision floating point value of $f4 times $f6"
  },
  {
    "example": "div.d $f2,$f4,$f6",
    "description": "Floating point division double precision : Set $f2 to double-precision floating point value of $f4 divided by $f6"
  },
  {
    "example": "sqrt.d $f2,$f4",
    "description": "Square root double precision : Set $f2 to double-precision floating point square root of $f4"
  },
  {
    "example": "floor.w.d $f1,$f2",
    "description": "Floor double precision to word : Set $f1 to 32-bit integer floor of double-precision float in $f2"
  },
  {
    "example": "ceil.w.d $f1,$f2",
    "description": "Ceiling double precision to word : Set $f1 to 32-bit integer ceiling of double-precision float in $f2"
  },
  {
    "example": "round.w.d $f1,$f2",
    "description": "Round double precision to word : Set $f1 to 32-bit integer round of double-precision float in $f2"
  },
  {
    "example": "trunc.w.d $f1,$f2",
    "description": "Truncate double precision to word : Set $f1 to 32-bit integer truncation of double-precision float in $f2"
  },
  {
    "example": "bc1t label",
    "description": "Branch if FP condition flag 0 true (BC1T, not BCLT) : If Coprocessor 1 condition flag 0 is true (one) then branch to statement at label's address"
  },
  {
    "example": "bc1t 1,label",
    "description": "Branch if specified FP condition flag true (BC1T, not BCLT) : If Coprocessor 1 condition flag specified by immediate is true (one) then branch to statement at label's address"
  },
  {
    "example": "bc1f label",
    "description": "Branch if FP condition flag 0 false (BC1F, not BCLF) : If Coprocessor 1 condition flag 0 is false (zero) then branch to statement at label's address"
  },
  {
    "example": "bc1f 1,label",
    "description": "Branch if specified FP condition flag false (BC1F, not BCLF) : If Coprocessor 1 condition flag specified by immediate is false (zero) then branch to statement at label's address"
  },
  {
    "example": "c.eq.s $f0,$f1",
    "description": "Compare equal single precision : If $f0 is equal to $f1, set Coprocessor 1 condition flag 0 true else set it false"
  },
  {
    "example": "c.eq.s 1,$f0,$f1",
    "description": "Compare equal single precision : If $f0 is equal to $f1, set Coprocessor 1 condition flag specied by immediate to true else set it to false"
  },
  {
    "example": "c.le.s $f0,$f1",
    "description": "Compare less or equal single precision : If $f0 is less than or equal to $f1, set Coprocessor 1 condition flag 0 true else set it false"
  },
  {
    "example": "c.le.s 1,$f0,$f1",
    "description": "Compare less or equal single precision : If $f0 is less than or equal to $f1, set Coprocessor 1 condition flag specified by immediate to true else set it to false"
  },
  {
    "example": "c.lt.s $f0,$f1",
    "description": "Compare less than single precision : If $f0 is less than $f1, set Coprocessor 1 condition flag 0 true else set it false"
  },
  {
    "example": "c.lt.s 1,$f0,$f1",
    "description": "Compare less than single precision : If $f0 is less than $f1, set Coprocessor 1 condition flag specified by immediate to true else set it to false"
  },
  {
    "example": "c.eq.d $f2,$f4",
    "description": "Compare equal double precision : If $f2 is equal to $f4 (double-precision), set Coprocessor 1 condition flag 0 true else set it false"
  },
  {
    "example": "c.eq.d 1,$f2,$f4",
    "description": "Compare equal double precision : If $f2 is equal to $f4 (double-precision), set Coprocessor 1 condition flag specified by immediate to true else set it to false"
  },
  {
    "example": "c.le.d $f2,$f4",
    "description": "Compare less or equal double precision : If $f2 is less than or equal to $f4 (double-precision), set Coprocessor 1 condition flag 0 true else set it false"
  },
  {
    "example": "c.le.d 1,$f2,$f4",
    "description": "Compare less or equal double precision : If $f2 is less than or equal to $f4 (double-precision), set Coprocessor 1 condition flag specfied by immediate true else set it false"
  },
  {
    "example": "c.lt.d $f2,$f4",
    "description": "Compare less than double precision : If $f2 is less than $f4 (double-precision), set Coprocessor 1 condition flag 0 true else set it false"
  },
  {
    "example": "c.lt.d 1,$f2,$f4",
    "description": "Compare less than double precision : If $f2 is less than $f4 (double-precision), set Coprocessor 1 condition flag specified by immediate to true else set it to false"
  },
  {
    "example": "abs.s $f0,$f1",
    "description": "Floating point absolute value single precision : Set $f0 to absolute value of $f1, single precision"
  },
  {
    "example": "abs.d $f2,$f4",
    "description": "Floating point absolute value double precision : Set $f2 to absolute value of $f4, double precision"
  },
  {
    "example": "cvt.d.s $f2,$f1",
    "description": "Convert from single precision to double precision : Set $f2 to double precision equivalent of single precision value in $f1"
  },
  {
    "example": "cvt.d.w $f2,$f1",
    "description": "Convert from word to double precision : Set $f2 to double precision equivalent of 32-bit integer value in $f1"
  },
  {
    "example": "cvt.s.d $f1,$f2",
    "description": "Convert from double precision to single precision : Set $f1 to single precision equivalent of double precision value in $f2"
  },
  {
    "example": "cvt.s.w $f0,$f1",
    "description": "Convert from word to single precision : Set $f0 to single precision equivalent of 32-bit integer value in $f2"
  },
  {
    "example": "cvt.w.d $f1,$f2",
    "description": "Convert from double precision to word : Set $f1 to 32-bit integer equivalent of double precision value in $f2"
  },
  {
    "example": "cvt.w.s $f0,$f1",
    "description": "Convert from single precision to word : Set $f0 to 32-bit integer equivalent of single precision value in $f1"
  },
  {
    "example": "mov.d $f2,$f4",
    "description": "Move floating point double precision : Set double precision $f2 to double precision value in $f4"
  },
  {
    "example": "movf.d $f2,$f4",
    "description": "Move floating point double precision : If condition flag 0 false, set double precision $f2 to double precision value in $f4"
  },
  {
    "example": "movf.d $f2,$f4,1",
    "description": "Move floating point double precision : If condition flag specified by immediate is false, set double precision $f2 to double precision value in $f4"
  },
  {
    "example": "movt.d $f2,$f4",
    "description": "Move floating point double precision : If condition flag 0 true, set double precision $f2 to double precision value in $f4"
  },
  {
    "example": "movt.d $f2,$f4,1",
    "description": "Move floating point double precision : If condition flag specified by immediate is true, set double precision $f2 to double precision value in $f4e"
  },
  {
    "example": "movn.d $f2,$f4,$t3",
    "description": "Move floating point double precision : If $t3 is not zero, set double precision $f2 to double precision value in $f4"
  },
  {
    "example": "movz.d $f2,$f4,$t3",
    "description": "Move floating point double precision : If $t3 is zero, set double precision $f2 to double precision value in $f4"
  },
  {
    "example": "mov.s $f0,$f1",
    "description": "Move floating point single precision : Set single precision $f0 to single precision value in $f1"
  },
  {
    "example": "movf.s $f0,$f1",
    "description": "Move floating point single precision : If condition flag 0 is false, set single precision $f0 to single precision value in $f1"
  },
  {
    "example": "movf.s $f0,$f1,1",
    "description": "Move floating point single precision : If condition flag specified by immediate is false, set single precision $f0 to single precision value in $f1e"
  },
  {
    "example": "movt.s $f0,$f1",
    "description": "Move floating point single precision : If condition flag 0 is true, set single precision $f0 to single precision value in $f1e"
  },
  {
    "example": "movt.s $f0,$f1,1",
    "description": "Move floating point single precision : If condition flag specified by immediate is true, set single precision $f0 to single precision value in $f1e"
  },
  {
    "example": "movn.s $f0,$f1,$t3",
    "description": "Move floating point single precision : If $t3 is not zero, set single precision $f0 to single precision value in $f1"
  },
  {
    "example": "movz.s $f0,$f1,$t3",
    "description": "Move floating point single precision : If $t3 is zero, set single precision $f0 to single precision value in $f1"
  },
  {
    "example": "mfc1 $t1,$f1",
    "description": "Move from Coprocessor 1 (FPU) : Set $t1 to value in Coprocessor 1 register $f1"
  },
  {
    "example": "mtc1 $t1,$f1",
    "description": "Move to Coprocessor 1 (FPU) : Set Coprocessor 1 register $f1 to value in $t1"
  },
  {
    "example": "neg.d $f2,$f4",
    "description": "Floating point negate double precision : Set double precision $f2 to negation of double precision value in $f4"
  },
  {
    "example": "neg.s $f0,$f1",
    "description": "Floating point negate single precision : Set single precision $f0 to negation of single precision value in $f1"
  },
  {
    "example": "lwc1 $f1,-100($t2)",
    "description": "Load word into Coprocessor 1 (FPU) : Set $f1 to 32-bit value from effective memory word address"
  },
  {
    "example": "ldc1 $f2,-100($t2)",
    "description": "Load double word Coprocessor 1 (FPU)) : Set $f2 to 64-bit value from effective memory doubleword address"
  },
  {
    "example": "swc1 $f1,-100($t2)",
    "description": "Store word from Coprocesor 1 (FPU) : Store 32 bit value in $f1 to effective memory word address"
  },
  {
    "example": "sdc1 $f2,-100($t2)",
    "description": "Store double word from Coprocessor 1 (FPU)) : Store 64 bit value in $f2 to effective memory doubleword address"
  },
  {
    "example": "teq $t1,$t2",
    "description": "Trap if equal : Trap if $t1 is equal to $t2"
  },
  {
    "example": "teqi $t1,-100",
    "description": "Trap if equal to immediate : Trap if $t1 is equal to sign-extended 16 bit immediate"
  },
  {
    "example": "tne $t1,$t2",
    "description": "Trap if not equal : Trap if $t1 is not equal to $t2"
  },
  {
    "example": "tnei $t1,-100",
    "description": "Trap if not equal to immediate : Trap if $t1 is not equal to sign-extended 16 bit immediate"
  },
  {
    "example": "tge $t1,$t2",
    "description": "Trap if greater or equal : Trap if $t1 is greater than or equal to $t2"
  },
  {
    "example": "tgeu $t1,$t2",
    "description": "Trap if greater or equal unsigned : Trap if $t1 is greater than or equal to $t2 using unsigned comparision"
  },
  {
    "example": "tgei $t1,-100",
    "description": "Trap if greater than or equal to immediate : Trap if $t1 greater than or equal to sign-extended 16 bit immediate"
  },
  {
    "example": "tgeiu $t1,-100",
    "description": "Trap if greater or equal to immediate unsigned : Trap if $t1 greater than or equal to sign-extended 16 bit immediate, unsigned comparison"
  },
  {
    "example": "tlt $t1,$t2",
    "description": "Trap if less than: Trap if $t1 less than $t2"
  },
  {
    "example": "tltu $t1,$t2",
    "description": "Trap if less than unsigned : Trap if $t1 less than $t2, unsigned comparison"
  },
  {
    "example": "tlti $t1,-100",
    "description": "Trap if less than immediate : Trap if $t1 less than sign-extended 16-bit immediate"
  },
  {
    "example": "tltiu $t1,-100",
    "description": "Trap if less than immediate unsigned : Trap if $t1 less than sign-extended 16-bit immediate, unsigned comparison"
  },
  {
    "example": "eret",
    "description": "Exception return : Set Program Counter to Coprocessor 0 EPC register value, set Coprocessor Status register bit 1 (exception level) to zero"
  }
];
  referenceData.meta = {
      ...(referenceData.meta || {}),
      source: "../mars/mips/instructions/InstructionSet.java",
      generatedAt: "2026-03-14T21:33:43.281Z",
  };
})();
