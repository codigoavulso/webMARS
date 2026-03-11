(() => {
  const globalScope = typeof window !== "undefined" ? window : globalThis;
  const referenceData = globalScope.WebMarsReferenceData || (globalScope.WebMarsReferenceData = {});
  referenceData.pseudoOps = [
  {
    "lineNumber": 93,
    "op": "not",
    "source": "not $t1,$t2",
    "sourceTokens": [
      "not",
      "$t1",
      "$t2"
    ],
    "defaultTemplates": [
      "nor RG1, RG2, $0"
    ],
    "defaultTemplateTokens": [
      [
        "nor",
        "RG1",
        "RG2",
        "$0"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Bitwise NOT (bit inversion)"
  },
  {
    "lineNumber": 96,
    "op": "add",
    "source": "add $t1,$t2,-100",
    "sourceTokens": [
      "add",
      "$t1",
      "$t2",
      "-100"
    ],
    "defaultTemplates": [
      "addi RG1, RG2, VL3"
    ],
    "defaultTemplateTokens": [
      [
        "addi",
        "RG1",
        "RG2",
        "VL3"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "ADDition : set $t1 to ($t2 plus 16-bit immediate)"
  },
  {
    "lineNumber": 97,
    "op": "add",
    "source": "add $t1,$t2,100000",
    "sourceTokens": [
      "add",
      "$t1",
      "$t2",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VHL3",
      "ori $1, $1, VL3U",
      "add RG1, RG2, $1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VHL3"
      ],
      [
        "ori",
        "$1",
        "$1",
        "VL3U"
      ],
      [
        "add",
        "RG1",
        "RG2",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "ADDition : set $t1 to ($t2 plus 32-bit immediate)"
  },
  {
    "lineNumber": 98,
    "op": "addu",
    "source": "addu $t1,$t2,100000",
    "sourceTokens": [
      "addu",
      "$t1",
      "$t2",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VHL3",
      "ori $1, $1, VL3U",
      "addu RG1, RG2, $1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VHL3"
      ],
      [
        "ori",
        "$1",
        "$1",
        "VL3U"
      ],
      [
        "addu",
        "RG1",
        "RG2",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "ADDition Unsigned : set $t1 to ($t2 plus 32-bit immediate), no overflow"
  },
  {
    "lineNumber": 99,
    "op": "addi",
    "source": "addi $t1,$t2,100000",
    "sourceTokens": [
      "addi",
      "$t1",
      "$t2",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VHL3",
      "ori $1, $1, VL3U",
      "add RG1, RG2, $1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VHL3"
      ],
      [
        "ori",
        "$1",
        "$1",
        "VL3U"
      ],
      [
        "add",
        "RG1",
        "RG2",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "ADDition Immediate : set $t1 to ($t2 plus 32-bit immediate)"
  },
  {
    "lineNumber": 100,
    "op": "addiu",
    "source": "addiu $t1,$t2,100000",
    "sourceTokens": [
      "addiu",
      "$t1",
      "$t2",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VHL3",
      "ori $1, $1, VL3U",
      "addu RG1, RG2, $1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VHL3"
      ],
      [
        "ori",
        "$1",
        "$1",
        "VL3U"
      ],
      [
        "addu",
        "RG1",
        "RG2",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "ADDition Immediate Unsigned: set $t1 to ($t2 plus 32-bit immediate), no overflow"
  },
  {
    "lineNumber": 101,
    "op": "sub",
    "source": "sub $t1,$t2,-100",
    "sourceTokens": [
      "sub",
      "$t1",
      "$t2",
      "-100"
    ],
    "defaultTemplates": [
      "addi $1, $0, VL3",
      "sub RG1, RG2, $1"
    ],
    "defaultTemplateTokens": [
      [
        "addi",
        "$1",
        "$0",
        "VL3"
      ],
      [
        "sub",
        "RG1",
        "RG2",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "SUBtraction : set $t1 to ($t2 minus 16-bit immediate)"
  },
  {
    "lineNumber": 102,
    "op": "sub",
    "source": "sub $t1,$t2,100000",
    "sourceTokens": [
      "sub",
      "$t1",
      "$t2",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VHL3",
      "ori $1, $1, VL3U",
      "sub RG1, RG2, $1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VHL3"
      ],
      [
        "ori",
        "$1",
        "$1",
        "VL3U"
      ],
      [
        "sub",
        "RG1",
        "RG2",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "SUBtraction : set $t1 to ($t2 minus 32-bit immediate)"
  },
  {
    "lineNumber": 103,
    "op": "subu",
    "source": "subu $t1,$t2,100000",
    "sourceTokens": [
      "subu",
      "$t1",
      "$t2",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VHL3",
      "ori $1, $1, VL3U",
      "subu RG1, RG2, $1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VHL3"
      ],
      [
        "ori",
        "$1",
        "$1",
        "VL3U"
      ],
      [
        "subu",
        "RG1",
        "RG2",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "SUBtraction Unsigned : set $t1 to ($t2 minus 32-bit immediate), no overflow"
  },
  {
    "lineNumber": 104,
    "op": "subi",
    "source": "subi $t1,$t2,-100",
    "sourceTokens": [
      "subi",
      "$t1",
      "$t2",
      "-100"
    ],
    "defaultTemplates": [
      "addi $1, $0, VL3",
      "sub RG1, RG2, $1"
    ],
    "defaultTemplateTokens": [
      [
        "addi",
        "$1",
        "$0",
        "VL3"
      ],
      [
        "sub",
        "RG1",
        "RG2",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "SUBtraction Immediate : set $t1 to ($t2 minus 16-bit immediate)"
  },
  {
    "lineNumber": 105,
    "op": "subi",
    "source": "subi $t1,$t2,100000",
    "sourceTokens": [
      "subi",
      "$t1",
      "$t2",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VHL3",
      "ori $1, $1, VL3U",
      "sub RG1, RG2, $1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VHL3"
      ],
      [
        "ori",
        "$1",
        "$1",
        "VL3U"
      ],
      [
        "sub",
        "RG1",
        "RG2",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "SUBtraction Immediate : set $t1 to ($t2 minus 32-bit immediate)"
  },
  {
    "lineNumber": 106,
    "op": "subiu",
    "source": "subiu $t1,$t2,100000",
    "sourceTokens": [
      "subiu",
      "$t1",
      "$t2",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VHL3",
      "ori $1, $1, VL3U",
      "subu RG1, RG2, $1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VHL3"
      ],
      [
        "ori",
        "$1",
        "$1",
        "VL3U"
      ],
      [
        "subu",
        "RG1",
        "RG2",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "SUBtraction Immediate Unsigned : set $t1 to ($t2 minus 32-bit immediate), no overflow"
  },
  {
    "lineNumber": 110,
    "op": "andi",
    "source": "andi $t1,$t2,100000",
    "sourceTokens": [
      "andi",
      "$t1",
      "$t2",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VHL3",
      "ori $1, $1, VL3U",
      "and RG1, RG2, $1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VHL3"
      ],
      [
        "ori",
        "$1",
        "$1",
        "VL3U"
      ],
      [
        "and",
        "RG1",
        "RG2",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "AND Immediate : set $t1 to ($t2 bitwise-AND 32-bit immediate)"
  },
  {
    "lineNumber": 111,
    "op": "ori",
    "source": "ori $t1,$t2,100000",
    "sourceTokens": [
      "ori",
      "$t1",
      "$t2",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VHL3",
      "ori $1, $1, VL3U",
      "or RG1, RG2, $1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VHL3"
      ],
      [
        "ori",
        "$1",
        "$1",
        "VL3U"
      ],
      [
        "or",
        "RG1",
        "RG2",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "OR Immediate : set $t1 to ($t2 bitwise-OR 32-bit immediate)"
  },
  {
    "lineNumber": 112,
    "op": "xori",
    "source": "xori $t1,$t2,100000",
    "sourceTokens": [
      "xori",
      "$t1",
      "$t2",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VHL3",
      "ori $1, $1, VL3U",
      "xor RG1, RG2, $1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VHL3"
      ],
      [
        "ori",
        "$1",
        "$1",
        "VL3U"
      ],
      [
        "xor",
        "RG1",
        "RG2",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "XOR Immediate : set $t1 to ($t2 bitwise-exclusive-OR 32-bit immediate)"
  },
  {
    "lineNumber": 113,
    "op": "and",
    "source": "and $t1,$t2,100",
    "sourceTokens": [
      "and",
      "$t1",
      "$t2",
      "100"
    ],
    "defaultTemplates": [
      "andi RG1, RG2, VL3U"
    ],
    "defaultTemplateTokens": [
      [
        "andi",
        "RG1",
        "RG2",
        "VL3U"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "AND : set $t1 to ($t2 bitwise-AND 16-bit unsigned immediate)"
  },
  {
    "lineNumber": 114,
    "op": "or",
    "source": "or $t1,$t2,100",
    "sourceTokens": [
      "or",
      "$t1",
      "$t2",
      "100"
    ],
    "defaultTemplates": [
      "ori RG1, RG2, VL3U"
    ],
    "defaultTemplateTokens": [
      [
        "ori",
        "RG1",
        "RG2",
        "VL3U"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "OR : set $t1 to ($t2 bitwise-OR 16-bit unsigned immediate)"
  },
  {
    "lineNumber": 115,
    "op": "xor",
    "source": "xor $t1,$t2,100",
    "sourceTokens": [
      "xor",
      "$t1",
      "$t2",
      "100"
    ],
    "defaultTemplates": [
      "xori RG1, RG2, VL3U"
    ],
    "defaultTemplateTokens": [
      [
        "xori",
        "RG1",
        "RG2",
        "VL3U"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "XOR : set $t1 to ($t2 bitwise-exclusive-OR 16-bit unsigned immediate)"
  },
  {
    "lineNumber": 116,
    "op": "and",
    "source": "and $t1,100",
    "sourceTokens": [
      "and",
      "$t1",
      "100"
    ],
    "defaultTemplates": [
      "andi RG1, RG1, VL2U"
    ],
    "defaultTemplateTokens": [
      [
        "andi",
        "RG1",
        "RG1",
        "VL2U"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "AND : set $t1 to ($t1 bitwise-AND 16-bit unsigned immediate)"
  },
  {
    "lineNumber": 117,
    "op": "or",
    "source": "or $t1,100",
    "sourceTokens": [
      "or",
      "$t1",
      "100"
    ],
    "defaultTemplates": [
      "ori RG1, RG1, VL2U"
    ],
    "defaultTemplateTokens": [
      [
        "ori",
        "RG1",
        "RG1",
        "VL2U"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "OR : set $t1 to ($t1 bitwise-OR 16-bit unsigned immediate)"
  },
  {
    "lineNumber": 118,
    "op": "xor",
    "source": "xor $t1,100",
    "sourceTokens": [
      "xor",
      "$t1",
      "100"
    ],
    "defaultTemplates": [
      "xori RG1, RG1, VL2U"
    ],
    "defaultTemplateTokens": [
      [
        "xori",
        "RG1",
        "RG1",
        "VL2U"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "XOR : set $t1 to ($t1 bitwise-exclusive-OR 16-bit unsigned immediate)"
  },
  {
    "lineNumber": 119,
    "op": "andi",
    "source": "andi $t1,100",
    "sourceTokens": [
      "andi",
      "$t1",
      "100"
    ],
    "defaultTemplates": [
      "andi RG1, RG1, VL2U"
    ],
    "defaultTemplateTokens": [
      [
        "andi",
        "RG1",
        "RG1",
        "VL2U"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "AND Immediate : set $t1 to ($t1 bitwise-AND 16-bit unsigned immediate)"
  },
  {
    "lineNumber": 120,
    "op": "ori",
    "source": "ori $t1,100",
    "sourceTokens": [
      "ori",
      "$t1",
      "100"
    ],
    "defaultTemplates": [
      "ori RG1, RG1, VL2U"
    ],
    "defaultTemplateTokens": [
      [
        "ori",
        "RG1",
        "RG1",
        "VL2U"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "OR Immediate : set $t1 to ($t1 bitwise-OR 16-bit unsigned immediate)"
  },
  {
    "lineNumber": 121,
    "op": "xori",
    "source": "xori $t1,100",
    "sourceTokens": [
      "xori",
      "$t1",
      "100"
    ],
    "defaultTemplates": [
      "xori RG1, RG1, VL2U"
    ],
    "defaultTemplateTokens": [
      [
        "xori",
        "RG1",
        "RG1",
        "VL2U"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "XOR Immediate : set $t1 to ($t1 bitwise-exclusive-OR 16-bit unsigned immediate)"
  },
  {
    "lineNumber": 122,
    "op": "andi",
    "source": "andi $t1,100000",
    "sourceTokens": [
      "andi",
      "$t1",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VHL2",
      "ori $1, $1, VL2U",
      "and RG1, RG1, $1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VHL2"
      ],
      [
        "ori",
        "$1",
        "$1",
        "VL2U"
      ],
      [
        "and",
        "RG1",
        "RG1",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "AND Immediate : set $t1 to ($t1 bitwise-AND 32-bit immediate)"
  },
  {
    "lineNumber": 123,
    "op": "ori",
    "source": "ori $t1,100000",
    "sourceTokens": [
      "ori",
      "$t1",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VHL2",
      "ori $1, $1, VL2U",
      "or RG1, RG1, $1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VHL2"
      ],
      [
        "ori",
        "$1",
        "$1",
        "VL2U"
      ],
      [
        "or",
        "RG1",
        "RG1",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "OR Immediate : set $t1 to ($t1 bitwise-OR 32-bit immediate)"
  },
  {
    "lineNumber": 124,
    "op": "xori",
    "source": "xori $t1,100000",
    "sourceTokens": [
      "xori",
      "$t1",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VHL2",
      "ori $1, $1, VL2U",
      "xor RG1, RG1, $1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VHL2"
      ],
      [
        "ori",
        "$1",
        "$1",
        "VL2U"
      ],
      [
        "xor",
        "RG1",
        "RG1",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "XOR Immediate : set $t1 to ($t1 bitwise-exclusive-OR 32-bit immediate)"
  },
  {
    "lineNumber": 127,
    "op": "seq",
    "source": "seq $t1,$t2,$t3",
    "sourceTokens": [
      "seq",
      "$t1",
      "$t2",
      "$t3"
    ],
    "defaultTemplates": [
      "subu RG1, RG2, RG3",
      "ori $1, $0, 1",
      "sltu RG1, RG1, $1"
    ],
    "defaultTemplateTokens": [
      [
        "subu",
        "RG1",
        "RG2",
        "RG3"
      ],
      [
        "ori",
        "$1",
        "$0",
        "1"
      ],
      [
        "sltu",
        "RG1",
        "RG1",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Set EQual : if $t2 equal to $t3 then set $t1 to 1 else 0"
  },
  {
    "lineNumber": 128,
    "op": "seq",
    "source": "seq $t1,$t2,-100",
    "sourceTokens": [
      "seq",
      "$t1",
      "$t2",
      "-100"
    ],
    "defaultTemplates": [
      "addi $1, $0, VL3",
      "subu RG1, RG2, $1",
      "ori $1, $0, 1",
      "sltu RG1, RG1, $1"
    ],
    "defaultTemplateTokens": [
      [
        "addi",
        "$1",
        "$0",
        "VL3"
      ],
      [
        "subu",
        "RG1",
        "RG2",
        "$1"
      ],
      [
        "ori",
        "$1",
        "$0",
        "1"
      ],
      [
        "sltu",
        "RG1",
        "RG1",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Set EQual : if $t2 equal to 16-bit immediate then set $t1 to 1 else 0"
  },
  {
    "lineNumber": 129,
    "op": "seq",
    "source": "seq $t1,$t2,100000",
    "sourceTokens": [
      "seq",
      "$t1",
      "$t2",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VHL3",
      "ori $1, $1, VL3U",
      "subu RG1, RG2, $1",
      "ori $1, $0, 1",
      "sltu RG1, RG1, $1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VHL3"
      ],
      [
        "ori",
        "$1",
        "$1",
        "VL3U"
      ],
      [
        "subu",
        "RG1",
        "RG2",
        "$1"
      ],
      [
        "ori",
        "$1",
        "$0",
        "1"
      ],
      [
        "sltu",
        "RG1",
        "RG1",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Set EQual : if $t2 equal to 32-bit immediate then set $t1 to 1 else 0"
  },
  {
    "lineNumber": 131,
    "op": "sne",
    "source": "sne $t1,$t2,$t3",
    "sourceTokens": [
      "sne",
      "$t1",
      "$t2",
      "$t3"
    ],
    "defaultTemplates": [
      "subu RG1, RG2, RG3",
      "sltu RG1, $0, RG1"
    ],
    "defaultTemplateTokens": [
      [
        "subu",
        "RG1",
        "RG2",
        "RG3"
      ],
      [
        "sltu",
        "RG1",
        "$0",
        "RG1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Set Not Equal : if $t2 not equal to $t3 then set $t1 to 1 else 0"
  },
  {
    "lineNumber": 132,
    "op": "sne",
    "source": "sne $t1,$t2,-100",
    "sourceTokens": [
      "sne",
      "$t1",
      "$t2",
      "-100"
    ],
    "defaultTemplates": [
      "addi $1, $0, VL3",
      "subu RG1, RG2, $1",
      "sltu RG1, $0, RG1"
    ],
    "defaultTemplateTokens": [
      [
        "addi",
        "$1",
        "$0",
        "VL3"
      ],
      [
        "subu",
        "RG1",
        "RG2",
        "$1"
      ],
      [
        "sltu",
        "RG1",
        "$0",
        "RG1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Set Not Equal : if $t2 not equal to 16-bit immediate then set $t1 to 1 else 0"
  },
  {
    "lineNumber": 133,
    "op": "sne",
    "source": "sne $t1,$t2,100000",
    "sourceTokens": [
      "sne",
      "$t1",
      "$t2",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VHL3",
      "ori $1, $1, VL3U",
      "subu RG1, RG2, $1",
      "sltu RG1, $0, RG1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VHL3"
      ],
      [
        "ori",
        "$1",
        "$1",
        "VL3U"
      ],
      [
        "subu",
        "RG1",
        "RG2",
        "$1"
      ],
      [
        "sltu",
        "RG1",
        "$0",
        "RG1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Set Not Equal : if $t2 not equal to 32-bit immediate then set $t1 to 1 else 0"
  },
  {
    "lineNumber": 135,
    "op": "sge",
    "source": "sge $t1,$t2,$t3",
    "sourceTokens": [
      "sge",
      "$t1",
      "$t2",
      "$t3"
    ],
    "defaultTemplates": [
      "slt RG1, RG2, RG3",
      "ori $1, $0, 1",
      "subu RG1, $1, RG1"
    ],
    "defaultTemplateTokens": [
      [
        "slt",
        "RG1",
        "RG2",
        "RG3"
      ],
      [
        "ori",
        "$1",
        "$0",
        "1"
      ],
      [
        "subu",
        "RG1",
        "$1",
        "RG1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Set Greater or Equal : if $t2 greater or equal to $t3 then set $t1 to 1 else 0"
  },
  {
    "lineNumber": 136,
    "op": "sge",
    "source": "sge $t1,$t2,-100",
    "sourceTokens": [
      "sge",
      "$t1",
      "$t2",
      "-100"
    ],
    "defaultTemplates": [
      "addi $1, $0, VL3",
      "slt RG1, RG2, $1",
      "ori $1, $0, 1",
      "subu RG1, $1, RG1"
    ],
    "defaultTemplateTokens": [
      [
        "addi",
        "$1",
        "$0",
        "VL3"
      ],
      [
        "slt",
        "RG1",
        "RG2",
        "$1"
      ],
      [
        "ori",
        "$1",
        "$0",
        "1"
      ],
      [
        "subu",
        "RG1",
        "$1",
        "RG1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Set Greater or Equal : if $t2 greater or equal to 16-bit immediate then set $t1 to 1 else 0"
  },
  {
    "lineNumber": 137,
    "op": "sge",
    "source": "sge $t1,$t2,100000",
    "sourceTokens": [
      "sge",
      "$t1",
      "$t2",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VHL3",
      "ori $1, $1, VL3U",
      "slt RG1, RG2, $1",
      "ori $1, $0, 1",
      "subu RG1, $1, RG1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VHL3"
      ],
      [
        "ori",
        "$1",
        "$1",
        "VL3U"
      ],
      [
        "slt",
        "RG1",
        "RG2",
        "$1"
      ],
      [
        "ori",
        "$1",
        "$0",
        "1"
      ],
      [
        "subu",
        "RG1",
        "$1",
        "RG1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Set Greater or Equal : if $t2 greater or equal to 32-bit immediate then set $t1 to 1 else 0"
  },
  {
    "lineNumber": 139,
    "op": "sgeu",
    "source": "sgeu $t1,$t2,$t3",
    "sourceTokens": [
      "sgeu",
      "$t1",
      "$t2",
      "$t3"
    ],
    "defaultTemplates": [
      "sltu RG1, RG2, RG3",
      "ori $1, $0, 1",
      "subu RG1, $1, RG1"
    ],
    "defaultTemplateTokens": [
      [
        "sltu",
        "RG1",
        "RG2",
        "RG3"
      ],
      [
        "ori",
        "$1",
        "$0",
        "1"
      ],
      [
        "subu",
        "RG1",
        "$1",
        "RG1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Set Greater or Equal Unsigned : if $t2 greater or equal to $t3 (unsigned compare) then set $t1 to 1 else 0"
  },
  {
    "lineNumber": 140,
    "op": "sgeu",
    "source": "sgeu $t1,$t2,-100",
    "sourceTokens": [
      "sgeu",
      "$t1",
      "$t2",
      "-100"
    ],
    "defaultTemplates": [
      "addi $1, $0, VL3",
      "sltu RG1, RG2, $1",
      "ori $1, $0, 1",
      "subu RG1, $1, RG1"
    ],
    "defaultTemplateTokens": [
      [
        "addi",
        "$1",
        "$0",
        "VL3"
      ],
      [
        "sltu",
        "RG1",
        "RG2",
        "$1"
      ],
      [
        "ori",
        "$1",
        "$0",
        "1"
      ],
      [
        "subu",
        "RG1",
        "$1",
        "RG1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Set Greater or Equal Unsigned : if $t2 greater or equal to 16-bit immediate (unsigned compare) then set $t1 to 1 else 0"
  },
  {
    "lineNumber": 141,
    "op": "sgeu",
    "source": "sgeu $t1,$t2,100000",
    "sourceTokens": [
      "sgeu",
      "$t1",
      "$t2",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VHL3",
      "ori $1, $1, VL3U",
      "sltu RG1, RG2, $1",
      "ori $1, $0, 1",
      "subu RG1, $1, RG1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VHL3"
      ],
      [
        "ori",
        "$1",
        "$1",
        "VL3U"
      ],
      [
        "sltu",
        "RG1",
        "RG2",
        "$1"
      ],
      [
        "ori",
        "$1",
        "$0",
        "1"
      ],
      [
        "subu",
        "RG1",
        "$1",
        "RG1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Set Greater or Equal Unsigned : if $t2 greater or equal to 32-bit immediate (unsigned compare) then set $t1 to 1 else 0"
  },
  {
    "lineNumber": 143,
    "op": "sgt",
    "source": "sgt $t1,$t2,$t3",
    "sourceTokens": [
      "sgt",
      "$t1",
      "$t2",
      "$t3"
    ],
    "defaultTemplates": [
      "slt RG1, RG3, RG2"
    ],
    "defaultTemplateTokens": [
      [
        "slt",
        "RG1",
        "RG3",
        "RG2"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Set Greater Than : if $t2 greater than $t3 then set $t1 to 1 else 0"
  },
  {
    "lineNumber": 144,
    "op": "sgt",
    "source": "sgt $t1,$t2,-100",
    "sourceTokens": [
      "sgt",
      "$t1",
      "$t2",
      "-100"
    ],
    "defaultTemplates": [
      "addi $1, $0, VL3",
      "slt RG1, $1, RG2"
    ],
    "defaultTemplateTokens": [
      [
        "addi",
        "$1",
        "$0",
        "VL3"
      ],
      [
        "slt",
        "RG1",
        "$1",
        "RG2"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Set Greater Than : if $t2 greater than 16-bit immediate then set $t1 to 1 else 0"
  },
  {
    "lineNumber": 145,
    "op": "sgt",
    "source": "sgt $t1,$t2,100000",
    "sourceTokens": [
      "sgt",
      "$t1",
      "$t2",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VHL3",
      "ori $1, $1, VL3U",
      "slt RG1, $1, RG2"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VHL3"
      ],
      [
        "ori",
        "$1",
        "$1",
        "VL3U"
      ],
      [
        "slt",
        "RG1",
        "$1",
        "RG2"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Set Greater Than : if $t2 greater than 32-bit immediate then set $t1 to 1 else 0"
  },
  {
    "lineNumber": 147,
    "op": "sgtu",
    "source": "sgtu $t1,$t2,$t3",
    "sourceTokens": [
      "sgtu",
      "$t1",
      "$t2",
      "$t3"
    ],
    "defaultTemplates": [
      "sltu RG1, RG3, RG2"
    ],
    "defaultTemplateTokens": [
      [
        "sltu",
        "RG1",
        "RG3",
        "RG2"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Set Greater Than Unsigned : if $t2 greater than $t3 (unsigned compare) then set $t1 to 1 else 0"
  },
  {
    "lineNumber": 148,
    "op": "sgtu",
    "source": "sgtu $t1,$t2,-100",
    "sourceTokens": [
      "sgtu",
      "$t1",
      "$t2",
      "-100"
    ],
    "defaultTemplates": [
      "addi $1, $0, VL3",
      "sltu RG1, $1, RG2"
    ],
    "defaultTemplateTokens": [
      [
        "addi",
        "$1",
        "$0",
        "VL3"
      ],
      [
        "sltu",
        "RG1",
        "$1",
        "RG2"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Set Greater Than Unsigned : if $t2 greater than 16-bit immediate (unsigned compare) then set $t1 to 1 else 0"
  },
  {
    "lineNumber": 149,
    "op": "sgtu",
    "source": "sgtu $t1,$t2,100000",
    "sourceTokens": [
      "sgtu",
      "$t1",
      "$t2",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VHL3",
      "ori $1, $1, VL3U",
      "sltu RG1, $1, RG2"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VHL3"
      ],
      [
        "ori",
        "$1",
        "$1",
        "VL3U"
      ],
      [
        "sltu",
        "RG1",
        "$1",
        "RG2"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Set Greater Than Unsigned : if $t2 greater than 32-bit immediate (unsigned compare) then set $t1 to 1 else 0"
  },
  {
    "lineNumber": 151,
    "op": "sle",
    "source": "sle $t1,$t2,$t3",
    "sourceTokens": [
      "sle",
      "$t1",
      "$t2",
      "$t3"
    ],
    "defaultTemplates": [
      "slt RG1, RG3, RG2",
      "ori $1, $0, 1",
      "subu RG1, $1, RG1"
    ],
    "defaultTemplateTokens": [
      [
        "slt",
        "RG1",
        "RG3",
        "RG2"
      ],
      [
        "ori",
        "$1",
        "$0",
        "1"
      ],
      [
        "subu",
        "RG1",
        "$1",
        "RG1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Set Less or Equal : if $t2 less or equal to $t3 then set $t1 to 1 else 0"
  },
  {
    "lineNumber": 152,
    "op": "sle",
    "source": "sle $t1,$t2,-100",
    "sourceTokens": [
      "sle",
      "$t1",
      "$t2",
      "-100"
    ],
    "defaultTemplates": [
      "addi $1, $0, VL3",
      "slt RG1, $1, RG2",
      "ori $1, $0, 1",
      "subu RG1, $1, RG1"
    ],
    "defaultTemplateTokens": [
      [
        "addi",
        "$1",
        "$0",
        "VL3"
      ],
      [
        "slt",
        "RG1",
        "$1",
        "RG2"
      ],
      [
        "ori",
        "$1",
        "$0",
        "1"
      ],
      [
        "subu",
        "RG1",
        "$1",
        "RG1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Set Less or Equal : if $t2 less or equal to 16-bit immediate then set $t1 to 1 else 0"
  },
  {
    "lineNumber": 153,
    "op": "sle",
    "source": "sle $t1,$t2,100000",
    "sourceTokens": [
      "sle",
      "$t1",
      "$t2",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VHL3",
      "ori $1, $1, VL3U",
      "slt RG1, $1, RG2",
      "ori $1, $0, 1",
      "subu RG1, $1, RG1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VHL3"
      ],
      [
        "ori",
        "$1",
        "$1",
        "VL3U"
      ],
      [
        "slt",
        "RG1",
        "$1",
        "RG2"
      ],
      [
        "ori",
        "$1",
        "$0",
        "1"
      ],
      [
        "subu",
        "RG1",
        "$1",
        "RG1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Set Less or Equal : if $t2 less or equal to 32-bit immediate then set $t1 to 1 else 0"
  },
  {
    "lineNumber": 155,
    "op": "sleu",
    "source": "sleu $t1,$t2,$t3",
    "sourceTokens": [
      "sleu",
      "$t1",
      "$t2",
      "$t3"
    ],
    "defaultTemplates": [
      "sltu RG1, RG3, RG2",
      "ori $1, $0, 1",
      "subu RG1, $1, RG1"
    ],
    "defaultTemplateTokens": [
      [
        "sltu",
        "RG1",
        "RG3",
        "RG2"
      ],
      [
        "ori",
        "$1",
        "$0",
        "1"
      ],
      [
        "subu",
        "RG1",
        "$1",
        "RG1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Set Less or Equal Unsigned: if $t2 less or equal to $t3 (unsigned compare) then set $t1 to 1 else 0"
  },
  {
    "lineNumber": 156,
    "op": "sleu",
    "source": "sleu $t1,$t2,-100",
    "sourceTokens": [
      "sleu",
      "$t1",
      "$t2",
      "-100"
    ],
    "defaultTemplates": [
      "addi $1, $0, VL3",
      "sltu RG1, $1, RG2",
      "ori $1, $0, 1",
      "subu RG1, $1, RG1"
    ],
    "defaultTemplateTokens": [
      [
        "addi",
        "$1",
        "$0",
        "VL3"
      ],
      [
        "sltu",
        "RG1",
        "$1",
        "RG2"
      ],
      [
        "ori",
        "$1",
        "$0",
        "1"
      ],
      [
        "subu",
        "RG1",
        "$1",
        "RG1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Set Less or Equal Unsigned: if $t2 less or equal to 16-bit immediate (unsigned compare) then set $t1 to 1 else 0"
  },
  {
    "lineNumber": 157,
    "op": "sleu",
    "source": "sleu $t1,$t2,100000",
    "sourceTokens": [
      "sleu",
      "$t1",
      "$t2",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VHL3",
      "ori $1, $1, VL3U",
      "sltu RG1, $1, RG2",
      "ori $1, $0, 1",
      "subu RG1, $1, RG1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VHL3"
      ],
      [
        "ori",
        "$1",
        "$1",
        "VL3U"
      ],
      [
        "sltu",
        "RG1",
        "$1",
        "RG2"
      ],
      [
        "ori",
        "$1",
        "$0",
        "1"
      ],
      [
        "subu",
        "RG1",
        "$1",
        "RG1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Set Less or Equal Unsigned: if $t2 less or equal to 32-bit immediate (unsigned compare) then set $t1 to 1 else 0"
  },
  {
    "lineNumber": 160,
    "op": "move",
    "source": "move $t1,$t2",
    "sourceTokens": [
      "move",
      "$t1",
      "$t2"
    ],
    "defaultTemplates": [
      "addu RG1, $0, RG2"
    ],
    "defaultTemplateTokens": [
      [
        "addu",
        "RG1",
        "$0",
        "RG2"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "MOVE : Set $t1 to contents of $t2"
  },
  {
    "lineNumber": 161,
    "op": "abs",
    "source": "abs $t1,$t2",
    "sourceTokens": [
      "abs",
      "$t1",
      "$t2"
    ],
    "defaultTemplates": [
      "sra $1, RG2, 31",
      "xor RG1, $1, RG2",
      "subu RG1, RG1, $1"
    ],
    "defaultTemplateTokens": [
      [
        "sra",
        "$1",
        "RG2",
        "31"
      ],
      [
        "xor",
        "RG1",
        "$1",
        "RG2"
      ],
      [
        "subu",
        "RG1",
        "RG1",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "ABSolute value : Set $t1 to absolute value of $t2 (algorithm from Hacker's Delight)"
  },
  {
    "lineNumber": 162,
    "op": "neg",
    "source": "neg $t1,$t2",
    "sourceTokens": [
      "neg",
      "$t1",
      "$t2"
    ],
    "defaultTemplates": [
      "sub RG1, $0, RG2"
    ],
    "defaultTemplateTokens": [
      [
        "sub",
        "RG1",
        "$0",
        "RG2"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "NEGate : Set $t1 to negation of $t2"
  },
  {
    "lineNumber": 163,
    "op": "negu",
    "source": "negu $t1,$t2",
    "sourceTokens": [
      "negu",
      "$t1",
      "$t2"
    ],
    "defaultTemplates": [
      "subu RG1, $0, RG2"
    ],
    "defaultTemplateTokens": [
      [
        "subu",
        "RG1",
        "$0",
        "RG2"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "NEGate Unsigned : Set $t1 to negation of $t2, no overflow"
  },
  {
    "lineNumber": 165,
    "op": "b",
    "source": "b label",
    "sourceTokens": [
      "b",
      "label"
    ],
    "defaultTemplates": [
      "bgez $0, LAB"
    ],
    "defaultTemplateTokens": [
      [
        "bgez",
        "$0",
        "LAB"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Branch : Branch to statement at label unconditionally"
  },
  {
    "lineNumber": 166,
    "op": "beqz",
    "source": "beqz $t1,label",
    "sourceTokens": [
      "beqz",
      "$t1",
      "label"
    ],
    "defaultTemplates": [
      "beq RG1, $0, LAB"
    ],
    "defaultTemplateTokens": [
      [
        "beq",
        "RG1",
        "$0",
        "LAB"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Branch if EQual Zero : Branch to statement at label if $t1 is equal to zero"
  },
  {
    "lineNumber": 167,
    "op": "bnez",
    "source": "bnez $t1,label",
    "sourceTokens": [
      "bnez",
      "$t1",
      "label"
    ],
    "defaultTemplates": [
      "bne RG1, $0, LAB"
    ],
    "defaultTemplateTokens": [
      [
        "bne",
        "RG1",
        "$0",
        "LAB"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Branch if Not Equal Zero : Branch to statement at label if $t1 is not equal to zero"
  },
  {
    "lineNumber": 169,
    "op": "beq",
    "source": "beq $t1,-100,label",
    "sourceTokens": [
      "beq",
      "$t1",
      "-100",
      "label"
    ],
    "defaultTemplates": [
      "addi $1, $0, VL2",
      "beq $1, RG1, LAB"
    ],
    "defaultTemplateTokens": [
      [
        "addi",
        "$1",
        "$0",
        "VL2"
      ],
      [
        "beq",
        "$1",
        "RG1",
        "LAB"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Branch if EQual : Branch to statement at label if $t1 is equal to 16-bit immediate"
  },
  {
    "lineNumber": 170,
    "op": "beq",
    "source": "beq $t1,100000,label",
    "sourceTokens": [
      "beq",
      "$t1",
      "100000",
      "label"
    ],
    "defaultTemplates": [
      "lui $1, VHL2",
      "ori $1, $1, VL2U",
      "beq $1, RG1, LAB"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VHL2"
      ],
      [
        "ori",
        "$1",
        "$1",
        "VL2U"
      ],
      [
        "beq",
        "$1",
        "RG1",
        "LAB"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Branch if EQual : Branch to statement at label if $t1 is equal to 32-bit immediate"
  },
  {
    "lineNumber": 171,
    "op": "bne",
    "source": "bne $t1,-100,label",
    "sourceTokens": [
      "bne",
      "$t1",
      "-100",
      "label"
    ],
    "defaultTemplates": [
      "addi $1, $0, VL2",
      "bne $1, RG1, LAB"
    ],
    "defaultTemplateTokens": [
      [
        "addi",
        "$1",
        "$0",
        "VL2"
      ],
      [
        "bne",
        "$1",
        "RG1",
        "LAB"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Branch if Not Equal : Branch to statement at label if $t1 is not equal to 16-bit immediate"
  },
  {
    "lineNumber": 172,
    "op": "bne",
    "source": "bne $t1,100000,label",
    "sourceTokens": [
      "bne",
      "$t1",
      "100000",
      "label"
    ],
    "defaultTemplates": [
      "lui $1, VHL2",
      "ori $1, $1, VL2U",
      "bne $1, RG1, LAB"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VHL2"
      ],
      [
        "ori",
        "$1",
        "$1",
        "VL2U"
      ],
      [
        "bne",
        "$1",
        "RG1",
        "LAB"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Branch if Not Equal : Branch to statement at label if $t1 is not equal to 32-bit immediate"
  },
  {
    "lineNumber": 174,
    "op": "bge",
    "source": "bge $t1,$t2,label",
    "sourceTokens": [
      "bge",
      "$t1",
      "$t2",
      "label"
    ],
    "defaultTemplates": [
      "slt $1, RG1, RG2",
      "beq $1, $0, LAB"
    ],
    "defaultTemplateTokens": [
      [
        "slt",
        "$1",
        "RG1",
        "RG2"
      ],
      [
        "beq",
        "$1",
        "$0",
        "LAB"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Branch if Greater or Equal : Branch to statement at label if $t1 is greater or equal to $t2"
  },
  {
    "lineNumber": 175,
    "op": "bge",
    "source": "bge $t1,-100,label",
    "sourceTokens": [
      "bge",
      "$t1",
      "-100",
      "label"
    ],
    "defaultTemplates": [
      "slti $1, RG1, VL2",
      "beq $1, $0, LAB"
    ],
    "defaultTemplateTokens": [
      [
        "slti",
        "$1",
        "RG1",
        "VL2"
      ],
      [
        "beq",
        "$1",
        "$0",
        "LAB"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Branch if Greater or Equal : Branch to statement at label if $t1 is greater or equal to 16-bit immediate"
  },
  {
    "lineNumber": 176,
    "op": "bge",
    "source": "bge $t1,100000,label",
    "sourceTokens": [
      "bge",
      "$t1",
      "100000",
      "label"
    ],
    "defaultTemplates": [
      "lui $1, VHL2",
      "ori $1, $1, VL2U",
      "slt $1, RG1, $1",
      "beq $1, $0, LAB"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VHL2"
      ],
      [
        "ori",
        "$1",
        "$1",
        "VL2U"
      ],
      [
        "slt",
        "$1",
        "RG1",
        "$1"
      ],
      [
        "beq",
        "$1",
        "$0",
        "LAB"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Branch if Greater or Equal : Branch to statement at label if $t1 is greater or equal to 32-bit immediate"
  },
  {
    "lineNumber": 178,
    "op": "bgeu",
    "source": "bgeu $t1,$t2,label",
    "sourceTokens": [
      "bgeu",
      "$t1",
      "$t2",
      "label"
    ],
    "defaultTemplates": [
      "sltu $1, RG1, RG2",
      "beq $1, $0, LAB"
    ],
    "defaultTemplateTokens": [
      [
        "sltu",
        "$1",
        "RG1",
        "RG2"
      ],
      [
        "beq",
        "$1",
        "$0",
        "LAB"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Branch if Greater or Equal Unsigned : Branch to statement at label if $t1 is greater or equal to $t2 (unsigned compare)"
  },
  {
    "lineNumber": 179,
    "op": "bgeu",
    "source": "bgeu $t1,-100,label",
    "sourceTokens": [
      "bgeu",
      "$t1",
      "-100",
      "label"
    ],
    "defaultTemplates": [
      "sltiu $1, RG1, VL2",
      "beq $1, $0, LAB"
    ],
    "defaultTemplateTokens": [
      [
        "sltiu",
        "$1",
        "RG1",
        "VL2"
      ],
      [
        "beq",
        "$1",
        "$0",
        "LAB"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Branch if Greater or Equal Unsigned : Branch to statement at label if $t1 is greater or equal to 16-bit immediate (unsigned compare)"
  },
  {
    "lineNumber": 180,
    "op": "bgeu",
    "source": "bgeu $t1,100000,label",
    "sourceTokens": [
      "bgeu",
      "$t1",
      "100000",
      "label"
    ],
    "defaultTemplates": [
      "lui $1, VHL2",
      "ori $1, $1, VL2U",
      "sltu $1, RG1, $1",
      "beq $1, $0, LAB"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VHL2"
      ],
      [
        "ori",
        "$1",
        "$1",
        "VL2U"
      ],
      [
        "sltu",
        "$1",
        "RG1",
        "$1"
      ],
      [
        "beq",
        "$1",
        "$0",
        "LAB"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Branch if Greater or Equal Unsigned : Branch to statement at label if $t1 is greater or equal to 32-bit immediate (unsigned compare)"
  },
  {
    "lineNumber": 182,
    "op": "bgt",
    "source": "bgt $t1,$t2,label",
    "sourceTokens": [
      "bgt",
      "$t1",
      "$t2",
      "label"
    ],
    "defaultTemplates": [
      "slt $1, RG2, RG1",
      "bne $1, $0, LAB"
    ],
    "defaultTemplateTokens": [
      [
        "slt",
        "$1",
        "RG2",
        "RG1"
      ],
      [
        "bne",
        "$1",
        "$0",
        "LAB"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Branch if Greater Than : Branch to statement at label if $t1 is greater than $t2"
  },
  {
    "lineNumber": 183,
    "op": "bgt",
    "source": "bgt $t1,-100,label",
    "sourceTokens": [
      "bgt",
      "$t1",
      "-100",
      "label"
    ],
    "defaultTemplates": [
      "addi $1, $0, VL2",
      "slt $1, $1, RG1",
      "bne $1, $0, LAB"
    ],
    "defaultTemplateTokens": [
      [
        "addi",
        "$1",
        "$0",
        "VL2"
      ],
      [
        "slt",
        "$1",
        "$1",
        "RG1"
      ],
      [
        "bne",
        "$1",
        "$0",
        "LAB"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Branch if Greater Than : Branch to statement at label if $t1 is greater than 16-bit immediate"
  },
  {
    "lineNumber": 184,
    "op": "bgt",
    "source": "bgt $t1,100000,label",
    "sourceTokens": [
      "bgt",
      "$t1",
      "100000",
      "label"
    ],
    "defaultTemplates": [
      "lui $1, VHL2P1",
      "ori $1, $1, VL2P1U",
      "slt $1, RG1, $1",
      "beq $1, $0, LAB"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VHL2P1"
      ],
      [
        "ori",
        "$1",
        "$1",
        "VL2P1U"
      ],
      [
        "slt",
        "$1",
        "RG1",
        "$1"
      ],
      [
        "beq",
        "$1",
        "$0",
        "LAB"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Branch if Greater Than : Branch to statement at label if $t1 is greater than 32-bit immediate"
  },
  {
    "lineNumber": 186,
    "op": "bgtu",
    "source": "bgtu $t1,$t2,label",
    "sourceTokens": [
      "bgtu",
      "$t1",
      "$t2",
      "label"
    ],
    "defaultTemplates": [
      "sltu $1, RG2, RG1",
      "bne $1, $0, LAB"
    ],
    "defaultTemplateTokens": [
      [
        "sltu",
        "$1",
        "RG2",
        "RG1"
      ],
      [
        "bne",
        "$1",
        "$0",
        "LAB"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Branch if Greater Than Unsigned: Branch to statement at label if $t1 is greater than $t2 (unsigned compare)"
  },
  {
    "lineNumber": 187,
    "op": "bgtu",
    "source": "bgtu $t1,-100,label",
    "sourceTokens": [
      "bgtu",
      "$t1",
      "-100",
      "label"
    ],
    "defaultTemplates": [
      "addi $1, $0, VL2",
      "sltu $1, $1, RG1",
      "bne $1, $0, LAB"
    ],
    "defaultTemplateTokens": [
      [
        "addi",
        "$1",
        "$0",
        "VL2"
      ],
      [
        "sltu",
        "$1",
        "$1",
        "RG1"
      ],
      [
        "bne",
        "$1",
        "$0",
        "LAB"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Branch if Greater Than Unsigned: Branch to statement at label if $t1 is greater than 16-bit immediate (unsigned compare)"
  },
  {
    "lineNumber": 188,
    "op": "bgtu",
    "source": "bgtu $t1,100000,label",
    "sourceTokens": [
      "bgtu",
      "$t1",
      "100000",
      "label"
    ],
    "defaultTemplates": [
      "lui $1, VHL2",
      "ori $1, $1, VL2U",
      "sltu $1, $1, RG1",
      "bne $1, $0, LAB"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VHL2"
      ],
      [
        "ori",
        "$1",
        "$1",
        "VL2U"
      ],
      [
        "sltu",
        "$1",
        "$1",
        "RG1"
      ],
      [
        "bne",
        "$1",
        "$0",
        "LAB"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Branch if Greater Than Unsigned: Branch to statement at label if $t1 is greater than 16-bit immediate (unsigned compare)"
  },
  {
    "lineNumber": 190,
    "op": "ble",
    "source": "ble $t1,$t2,label",
    "sourceTokens": [
      "ble",
      "$t1",
      "$t2",
      "label"
    ],
    "defaultTemplates": [
      "slt $1, RG2, RG1",
      "beq $1, $0, LAB"
    ],
    "defaultTemplateTokens": [
      [
        "slt",
        "$1",
        "RG2",
        "RG1"
      ],
      [
        "beq",
        "$1",
        "$0",
        "LAB"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Branch if Less or Equal : Branch to statement at label if $t1 is less than or equal to $t2"
  },
  {
    "lineNumber": 191,
    "op": "ble",
    "source": "ble $t1,-100,label",
    "sourceTokens": [
      "ble",
      "$t1",
      "-100",
      "label"
    ],
    "defaultTemplates": [
      "addi $1, RG1, -1",
      "slti $1, $1, VL2",
      "bne $1, $0, LAB"
    ],
    "defaultTemplateTokens": [
      [
        "addi",
        "$1",
        "RG1",
        "-1"
      ],
      [
        "slti",
        "$1",
        "$1",
        "VL2"
      ],
      [
        "bne",
        "$1",
        "$0",
        "LAB"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Branch if Less or Equal : Branch to statement at label if $t1 is less than or equal to 16-bit immediate"
  },
  {
    "lineNumber": 192,
    "op": "ble",
    "source": "ble $t1,100000,label",
    "sourceTokens": [
      "ble",
      "$t1",
      "100000",
      "label"
    ],
    "defaultTemplates": [
      "lui $1, VHL2P1",
      "ori $1, $1, VL2P1U",
      "slt $1, RG1, $1",
      "bne $1, $0, LAB"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VHL2P1"
      ],
      [
        "ori",
        "$1",
        "$1",
        "VL2P1U"
      ],
      [
        "slt",
        "$1",
        "RG1",
        "$1"
      ],
      [
        "bne",
        "$1",
        "$0",
        "LAB"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Branch if Less or Equal : Branch to statement at label if $t1 is less than or equal to 32-bit immediate"
  },
  {
    "lineNumber": 194,
    "op": "bleu",
    "source": "bleu $t1,$t2,label",
    "sourceTokens": [
      "bleu",
      "$t1",
      "$t2",
      "label"
    ],
    "defaultTemplates": [
      "sltu $1, RG2, RG1",
      "beq $1, $0, LAB"
    ],
    "defaultTemplateTokens": [
      [
        "sltu",
        "$1",
        "RG2",
        "RG1"
      ],
      [
        "beq",
        "$1",
        "$0",
        "LAB"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Branch if Less or Equal Unsigned : Branch to statement at label if $t1 is less than or equal to $t2 (unsigned compare)"
  },
  {
    "lineNumber": 195,
    "op": "bleu",
    "source": "bleu $t1,-100,label",
    "sourceTokens": [
      "bleu",
      "$t1",
      "-100",
      "label"
    ],
    "defaultTemplates": [
      "addi $1, $0, VL2",
      "sltu $1, $1, RG1",
      "beq $1, $0, LAB"
    ],
    "defaultTemplateTokens": [
      [
        "addi",
        "$1",
        "$0",
        "VL2"
      ],
      [
        "sltu",
        "$1",
        "$1",
        "RG1"
      ],
      [
        "beq",
        "$1",
        "$0",
        "LAB"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Branch if Less or Equal Unsigned : Branch to statement at label if $t1 is less than or equal to 16-bit immediate (unsigned compare)"
  },
  {
    "lineNumber": 196,
    "op": "bleu",
    "source": "bleu $t1,100000,label",
    "sourceTokens": [
      "bleu",
      "$t1",
      "100000",
      "label"
    ],
    "defaultTemplates": [
      "lui $1, VHL2",
      "ori $1, $1, VL2U",
      "sltu $1, $1, RG1",
      "beq $1, $0, LAB"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VHL2"
      ],
      [
        "ori",
        "$1",
        "$1",
        "VL2U"
      ],
      [
        "sltu",
        "$1",
        "$1",
        "RG1"
      ],
      [
        "beq",
        "$1",
        "$0",
        "LAB"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Branch if Less or Equal Unsigned : Branch to statement at label if $t1 is less than or equal to 32-bit immediate (unsigned compare)"
  },
  {
    "lineNumber": 198,
    "op": "blt",
    "source": "blt $t1,$t2,label",
    "sourceTokens": [
      "blt",
      "$t1",
      "$t2",
      "label"
    ],
    "defaultTemplates": [
      "slt $1, RG1, RG2",
      "bne $1, $0, LAB"
    ],
    "defaultTemplateTokens": [
      [
        "slt",
        "$1",
        "RG1",
        "RG2"
      ],
      [
        "bne",
        "$1",
        "$0",
        "LAB"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Branch if Less Than : Branch to statement at label if $t1 is less than $t2"
  },
  {
    "lineNumber": 199,
    "op": "blt",
    "source": "blt $t1,-100,label",
    "sourceTokens": [
      "blt",
      "$t1",
      "-100",
      "label"
    ],
    "defaultTemplates": [
      "slti $1, RG1, VL2",
      "bne $1, $0, LAB"
    ],
    "defaultTemplateTokens": [
      [
        "slti",
        "$1",
        "RG1",
        "VL2"
      ],
      [
        "bne",
        "$1",
        "$0",
        "LAB"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Branch if Less Than : Branch to statement at label if $t1 is less than 16-bit immediate"
  },
  {
    "lineNumber": 200,
    "op": "blt",
    "source": "blt $t1,100000,label",
    "sourceTokens": [
      "blt",
      "$t1",
      "100000",
      "label"
    ],
    "defaultTemplates": [
      "lui $1, VHL2",
      "ori $1, $1, VL2U",
      "slt $1, RG1, $1",
      "bne $1, $0, LAB"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VHL2"
      ],
      [
        "ori",
        "$1",
        "$1",
        "VL2U"
      ],
      [
        "slt",
        "$1",
        "RG1",
        "$1"
      ],
      [
        "bne",
        "$1",
        "$0",
        "LAB"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Branch if Less Than : Branch to statement at label if $t1 is less than 32-bit immediate"
  },
  {
    "lineNumber": 202,
    "op": "bltu",
    "source": "bltu $t1,$t2,label",
    "sourceTokens": [
      "bltu",
      "$t1",
      "$t2",
      "label"
    ],
    "defaultTemplates": [
      "sltu $1, RG1, RG2",
      "bne $1, $0, LAB"
    ],
    "defaultTemplateTokens": [
      [
        "sltu",
        "$1",
        "RG1",
        "RG2"
      ],
      [
        "bne",
        "$1",
        "$0",
        "LAB"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Branch if Less Than Unsigned : Branch to statement at label if $t1 is less than $t2"
  },
  {
    "lineNumber": 203,
    "op": "bltu",
    "source": "bltu $t1,-100,label",
    "sourceTokens": [
      "bltu",
      "$t1",
      "-100",
      "label"
    ],
    "defaultTemplates": [
      "sltiu $1, RG1, VL2",
      "bne $1, $0, LAB"
    ],
    "defaultTemplateTokens": [
      [
        "sltiu",
        "$1",
        "RG1",
        "VL2"
      ],
      [
        "bne",
        "$1",
        "$0",
        "LAB"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Branch if Less Than Unsigned : Branch to statement at label if $t1 is less than 16-bit immediate"
  },
  {
    "lineNumber": 204,
    "op": "bltu",
    "source": "bltu $t1,100000,label",
    "sourceTokens": [
      "bltu",
      "$t1",
      "100000",
      "label"
    ],
    "defaultTemplates": [
      "lui $1, VHL2",
      "ori $1, $1, VL2U",
      "sltu $1, RG1, $1",
      "bne $1, $0, LAB"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VHL2"
      ],
      [
        "ori",
        "$1",
        "$1",
        "VL2U"
      ],
      [
        "sltu",
        "$1",
        "RG1",
        "$1"
      ],
      [
        "bne",
        "$1",
        "$0",
        "LAB"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Branch if Less Than Unsigned : Branch to statement at label if $t1 is less than 32-bit immediate"
  },
  {
    "lineNumber": 206,
    "op": "rol",
    "source": "rol $t1,$t2,$t3",
    "sourceTokens": [
      "rol",
      "$t1",
      "$t2",
      "$t3"
    ],
    "defaultTemplates": [
      "subu $1, $0, RG3",
      "srlv $1, RG2, $1",
      "sllv RG1, RG2, RG3",
      "or RG1, RG1, $1"
    ],
    "defaultTemplateTokens": [
      [
        "subu",
        "$1",
        "$0",
        "RG3"
      ],
      [
        "srlv",
        "$1",
        "RG2",
        "$1"
      ],
      [
        "sllv",
        "RG1",
        "RG2",
        "RG3"
      ],
      [
        "or",
        "RG1",
        "RG1",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "ROtate Left : Set $t1 to ($t2 rotated left by number of bit positions specified in $t3)"
  },
  {
    "lineNumber": 207,
    "op": "rol",
    "source": "rol $t1,$t2,10",
    "sourceTokens": [
      "rol",
      "$t1",
      "$t2",
      "10"
    ],
    "defaultTemplates": [
      "srl $1, RG2, S32",
      "sll RG1, RG2, OP3",
      "or RG1, RG1, $1"
    ],
    "defaultTemplateTokens": [
      [
        "srl",
        "$1",
        "RG2",
        "S32"
      ],
      [
        "sll",
        "RG1",
        "RG2",
        "OP3"
      ],
      [
        "or",
        "RG1",
        "RG1",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "ROtate Left : Set $t1 to ($t2 rotated left by number of bit positions specified in 5-bit immediate)"
  },
  {
    "lineNumber": 208,
    "op": "ror",
    "source": "ror $t1,$t2,$t3",
    "sourceTokens": [
      "ror",
      "$t1",
      "$t2",
      "$t3"
    ],
    "defaultTemplates": [
      "subu $1, $0, RG3",
      "sllv $1, RG2, $1",
      "srlv RG1, RG2, RG3",
      "or RG1, RG1, $1"
    ],
    "defaultTemplateTokens": [
      [
        "subu",
        "$1",
        "$0",
        "RG3"
      ],
      [
        "sllv",
        "$1",
        "RG2",
        "$1"
      ],
      [
        "srlv",
        "RG1",
        "RG2",
        "RG3"
      ],
      [
        "or",
        "RG1",
        "RG1",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "ROtate Right : Set $t1 to ($t2 rotated right by number of bit positions specified in $t3)"
  },
  {
    "lineNumber": 209,
    "op": "ror",
    "source": "ror $t1,$t2,10",
    "sourceTokens": [
      "ror",
      "$t1",
      "$t2",
      "10"
    ],
    "defaultTemplates": [
      "sll $1, RG2, S32",
      "srl RG1, RG2, OP3",
      "or RG1, RG1, $1"
    ],
    "defaultTemplateTokens": [
      [
        "sll",
        "$1",
        "RG2",
        "S32"
      ],
      [
        "srl",
        "RG1",
        "RG2",
        "OP3"
      ],
      [
        "or",
        "RG1",
        "RG1",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "ROtate Right : Set $t1 to ($t2 rotated right by number of bit positions specified in 5-bit immediate)"
  },
  {
    "lineNumber": 211,
    "op": "mfc1.d",
    "source": "mfc1.d $t1,$f2",
    "sourceTokens": [
      "mfc1.d",
      "$t1",
      "$f2"
    ],
    "defaultTemplates": [
      "mfc1 RG1, RG2",
      "mfc1 NR1, NR2"
    ],
    "defaultTemplateTokens": [
      [
        "mfc1",
        "RG1",
        "RG2"
      ],
      [
        "mfc1",
        "NR1",
        "NR2"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Move From Coprocessor 1 Double : Set $t1 to contents of $f2, set next higher register from $t1 to contents of next higher register from $f2"
  },
  {
    "lineNumber": 212,
    "op": "mtc1.d",
    "source": "mtc1.d $t1,$f2",
    "sourceTokens": [
      "mtc1.d",
      "$t1",
      "$f2"
    ],
    "defaultTemplates": [
      "mtc1 RG1, RG2",
      "mtc1 NR1, NR2"
    ],
    "defaultTemplateTokens": [
      [
        "mtc1",
        "RG1",
        "RG2"
      ],
      [
        "mtc1",
        "NR1",
        "NR2"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Move To Coprocessor 1 Double : Set $f2 to contents of $t1, set next higher register from $f2 to contents of next higher register from $t1"
  },
  {
    "lineNumber": 214,
    "op": "mul",
    "source": "mul $t1,$t2,-100",
    "sourceTokens": [
      "mul",
      "$t1",
      "$t2",
      "-100"
    ],
    "defaultTemplates": [
      "addi $1, $0, VL3",
      "mul RG1, RG2, $1"
    ],
    "defaultTemplateTokens": [
      [
        "addi",
        "$1",
        "$0",
        "VL3"
      ],
      [
        "mul",
        "RG1",
        "RG2",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "MULtiplication : Set HI to high-order 32 bits, LO and $t1 to low-order 32 bits of the product of $t2 and 16-bit signed immediate (use mfhi to access HI, mflo to access LO)"
  },
  {
    "lineNumber": 215,
    "op": "mul",
    "source": "mul $t1,$t2,100000",
    "sourceTokens": [
      "mul",
      "$t1",
      "$t2",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VHL3",
      "ori $1, $1, VL3U",
      "mul RG1, RG2, $1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VHL3"
      ],
      [
        "ori",
        "$1",
        "$1",
        "VL3U"
      ],
      [
        "mul",
        "RG1",
        "RG2",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "MULtiplication : Set HI to high-order 32 bits, LO and $t1 to low-order 32 bits of the product of $t2 and 32-bit immediate (use mfhi to access HI, mflo to access LO)"
  },
  {
    "lineNumber": 216,
    "op": "mulu",
    "source": "mulu $t1,$t2,$t3",
    "sourceTokens": [
      "mulu",
      "$t1",
      "$t2",
      "$t3"
    ],
    "defaultTemplates": [
      "multu RG2, RG3",
      "mflo RG1"
    ],
    "defaultTemplateTokens": [
      [
        "multu",
        "RG2",
        "RG3"
      ],
      [
        "mflo",
        "RG1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "MULtiplication Unsigned : Set HI to high-order 32 bits, LO and $t1 to low-order 32 bits of ($t2 multiplied by $t3, unsigned multiplication)"
  },
  {
    "lineNumber": 217,
    "op": "mulu",
    "source": "mulu $t1,$t2,-100",
    "sourceTokens": [
      "mulu",
      "$t1",
      "$t2",
      "-100"
    ],
    "defaultTemplates": [
      "addi $1, $0, VL3",
      "multu RG2, $1",
      "mflo RG1"
    ],
    "defaultTemplateTokens": [
      [
        "addi",
        "$1",
        "$0",
        "VL3"
      ],
      [
        "multu",
        "RG2",
        "$1"
      ],
      [
        "mflo",
        "RG1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "MULtiplication Unsigned :  Set HI to high-order 32 bits, LO and $t1 to low-order 32 bits of ($t2 multiplied by 16-bit immediate, unsigned multiplication)"
  },
  {
    "lineNumber": 218,
    "op": "mulu",
    "source": "mulu $t1,$t2,100000",
    "sourceTokens": [
      "mulu",
      "$t1",
      "$t2",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VHL3",
      "ori $1, $1, VL3U",
      "multu RG2, $1",
      "mflo RG1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VHL3"
      ],
      [
        "ori",
        "$1",
        "$1",
        "VL3U"
      ],
      [
        "multu",
        "RG2",
        "$1"
      ],
      [
        "mflo",
        "RG1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "MULtiplication Unsigned :  Set HI to high-order 32 bits, LO and $t1 to low-order 32 bits of ($t2 multiplied by 32-bit immediate, unsigned multiplication)"
  },
  {
    "lineNumber": 219,
    "op": "mulo",
    "source": "mulo $t1,$t2,$t3",
    "sourceTokens": [
      "mulo",
      "$t1",
      "$t2",
      "$t3"
    ],
    "defaultTemplates": [
      "mult RG2, RG3",
      "mfhi $1",
      "mflo RG1",
      "sra RG1, RG1, 31",
      "beq $1, RG1, BROFF12",
      "DBNOP",
      "break",
      "mflo RG1"
    ],
    "defaultTemplateTokens": [
      [
        "mult",
        "RG2",
        "RG3"
      ],
      [
        "mfhi",
        "$1"
      ],
      [
        "mflo",
        "RG1"
      ],
      [
        "sra",
        "RG1",
        "RG1",
        "31"
      ],
      [
        "beq",
        "$1",
        "RG1",
        "BROFF12"
      ],
      [
        "DBNOP"
      ],
      [
        "break"
      ],
      [
        "mflo",
        "RG1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "MULtiplication with Overflow : Set $t1 to low-order 32 bits of the product of $t2 and $t3"
  },
  {
    "lineNumber": 220,
    "op": "mulo",
    "source": "mulo $t1,$t2,-100",
    "sourceTokens": [
      "mulo",
      "$t1",
      "$t2",
      "-100"
    ],
    "defaultTemplates": [
      "addi $1, $0, VL3",
      "mult RG2, $1",
      "mfhi $1",
      "mflo RG1",
      "sra RG1, RG1, 31",
      "beq $1, RG1, BROFF12",
      "DBNOP",
      "break",
      "mflo RG1"
    ],
    "defaultTemplateTokens": [
      [
        "addi",
        "$1",
        "$0",
        "VL3"
      ],
      [
        "mult",
        "RG2",
        "$1"
      ],
      [
        "mfhi",
        "$1"
      ],
      [
        "mflo",
        "RG1"
      ],
      [
        "sra",
        "RG1",
        "RG1",
        "31"
      ],
      [
        "beq",
        "$1",
        "RG1",
        "BROFF12"
      ],
      [
        "DBNOP"
      ],
      [
        "break"
      ],
      [
        "mflo",
        "RG1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "MULtiplication with Overflow : Set $t1 to low-order 32 bits of the product of $t2 and signed 16-bit immediate"
  },
  {
    "lineNumber": 221,
    "op": "mulo",
    "source": "mulo $t1,$t2,100000",
    "sourceTokens": [
      "mulo",
      "$t1",
      "$t2",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VHL3",
      "ori $1, $1, VL3U",
      "mult RG2, $1",
      "mfhi $1",
      "mflo RG1",
      "sra RG1, RG1, 31",
      "beq $1, RG1, BROFF12",
      "DBNOP",
      "break",
      "mflo RG1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VHL3"
      ],
      [
        "ori",
        "$1",
        "$1",
        "VL3U"
      ],
      [
        "mult",
        "RG2",
        "$1"
      ],
      [
        "mfhi",
        "$1"
      ],
      [
        "mflo",
        "RG1"
      ],
      [
        "sra",
        "RG1",
        "RG1",
        "31"
      ],
      [
        "beq",
        "$1",
        "RG1",
        "BROFF12"
      ],
      [
        "DBNOP"
      ],
      [
        "break"
      ],
      [
        "mflo",
        "RG1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "MULtiplication with Overflow : Set $t1 to low-order 32 bits of the product of $t2 and 32-bit immediate"
  },
  {
    "lineNumber": 222,
    "op": "mulou",
    "source": "mulou $t1,$t2,$t3",
    "sourceTokens": [
      "mulou",
      "$t1",
      "$t2",
      "$t3"
    ],
    "defaultTemplates": [
      "multu RG2, RG3",
      "mfhi $1",
      "beq $1,$0, BROFF12",
      "DBNOP",
      "break",
      "mflo RG1"
    ],
    "defaultTemplateTokens": [
      [
        "multu",
        "RG2",
        "RG3"
      ],
      [
        "mfhi",
        "$1"
      ],
      [
        "beq",
        "$1",
        "$0",
        "BROFF12"
      ],
      [
        "DBNOP"
      ],
      [
        "break"
      ],
      [
        "mflo",
        "RG1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "MULtiplication with Overflow Unsigned : Set $t1 to low-order 32 bits of the product of $t2 and $t3"
  },
  {
    "lineNumber": 223,
    "op": "mulou",
    "source": "mulou $t1,$t2,-100",
    "sourceTokens": [
      "mulou",
      "$t1",
      "$t2",
      "-100"
    ],
    "defaultTemplates": [
      "addi $1, $0, VL3",
      "multu RG2, $1",
      "mfhi $1",
      "beq $1,$0, BROFF12",
      "DBNOP",
      "break",
      "mflo RG1"
    ],
    "defaultTemplateTokens": [
      [
        "addi",
        "$1",
        "$0",
        "VL3"
      ],
      [
        "multu",
        "RG2",
        "$1"
      ],
      [
        "mfhi",
        "$1"
      ],
      [
        "beq",
        "$1",
        "$0",
        "BROFF12"
      ],
      [
        "DBNOP"
      ],
      [
        "break"
      ],
      [
        "mflo",
        "RG1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "MULtiplication with Overflow Unsigned : Set $t1 to low-order 32 bits of the product of $t2 and signed 16-bit immediate"
  },
  {
    "lineNumber": 224,
    "op": "mulou",
    "source": "mulou $t1,$t2,100000",
    "sourceTokens": [
      "mulou",
      "$t1",
      "$t2",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VHL3",
      "ori $1, $1, VL3U",
      "multu RG2, $1",
      "mfhi $1",
      "beq $1,$0, BROFF12",
      "DBNOP",
      "break",
      "mflo RG1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VHL3"
      ],
      [
        "ori",
        "$1",
        "$1",
        "VL3U"
      ],
      [
        "multu",
        "RG2",
        "$1"
      ],
      [
        "mfhi",
        "$1"
      ],
      [
        "beq",
        "$1",
        "$0",
        "BROFF12"
      ],
      [
        "DBNOP"
      ],
      [
        "break"
      ],
      [
        "mflo",
        "RG1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "MULtiplication with Overflow Unsigned : Set $t1 to low-order 32 bits of the product of $t2 and 32-bit immediate"
  },
  {
    "lineNumber": 225,
    "op": "div",
    "source": "div $t1,$t2,$t3",
    "sourceTokens": [
      "div",
      "$t1",
      "$t2",
      "$t3"
    ],
    "defaultTemplates": [
      "bne RG3, $0, BROFF12",
      "DBNOP",
      "break",
      "div RG2, RG3",
      "mflo RG1"
    ],
    "defaultTemplateTokens": [
      [
        "bne",
        "RG3",
        "$0",
        "BROFF12"
      ],
      [
        "DBNOP"
      ],
      [
        "break"
      ],
      [
        "div",
        "RG2",
        "RG3"
      ],
      [
        "mflo",
        "RG1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "DIVision : Set $t1 to ($t2 divided by $t3, integer division)"
  },
  {
    "lineNumber": 226,
    "op": "div",
    "source": "div $t1,$t2,-100",
    "sourceTokens": [
      "div",
      "$t1",
      "$t2",
      "-100"
    ],
    "defaultTemplates": [
      "addi $1, $0, VL3",
      "div RG2, $1",
      "mflo RG1"
    ],
    "defaultTemplateTokens": [
      [
        "addi",
        "$1",
        "$0",
        "VL3"
      ],
      [
        "div",
        "RG2",
        "$1"
      ],
      [
        "mflo",
        "RG1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "DIVision : Set $t1 to ($t2 divided by 16-bit immediate, integer division)"
  },
  {
    "lineNumber": 227,
    "op": "div",
    "source": "div $t1,$t2,100000",
    "sourceTokens": [
      "div",
      "$t1",
      "$t2",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VHL3",
      "ori $1, $1, VL3U",
      "div RG2, $1",
      "mflo RG1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VHL3"
      ],
      [
        "ori",
        "$1",
        "$1",
        "VL3U"
      ],
      [
        "div",
        "RG2",
        "$1"
      ],
      [
        "mflo",
        "RG1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "DIVision : Set $t1 to ($t2 divided by 32-bit immediate, integer division)"
  },
  {
    "lineNumber": 228,
    "op": "divu",
    "source": "divu $t1,$t2,$t3",
    "sourceTokens": [
      "divu",
      "$t1",
      "$t2",
      "$t3"
    ],
    "defaultTemplates": [
      "bne RG3, $0, BROFF12",
      "DBNOP",
      "break",
      "divu RG2, RG3",
      "mflo RG1"
    ],
    "defaultTemplateTokens": [
      [
        "bne",
        "RG3",
        "$0",
        "BROFF12"
      ],
      [
        "DBNOP"
      ],
      [
        "break"
      ],
      [
        "divu",
        "RG2",
        "RG3"
      ],
      [
        "mflo",
        "RG1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "DIVision Unsigned :  Set $t1 to ($t2 divided by $t3, unsigned integer division)"
  },
  {
    "lineNumber": 229,
    "op": "divu",
    "source": "divu $t1,$t2,-100",
    "sourceTokens": [
      "divu",
      "$t1",
      "$t2",
      "-100"
    ],
    "defaultTemplates": [
      "addi $1, $0, VL3",
      "divu RG2, $1",
      "mflo RG1"
    ],
    "defaultTemplateTokens": [
      [
        "addi",
        "$1",
        "$0",
        "VL3"
      ],
      [
        "divu",
        "RG2",
        "$1"
      ],
      [
        "mflo",
        "RG1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "DIVision Unsigned :  Set $t1 to ($t2 divided by 16-bit immediate, unsigned integer division)"
  },
  {
    "lineNumber": 230,
    "op": "divu",
    "source": "divu $t1,$t2,100000",
    "sourceTokens": [
      "divu",
      "$t1",
      "$t2",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VHL3",
      "ori $1, $1, VL3U",
      "divu RG2, $1",
      "mflo RG1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VHL3"
      ],
      [
        "ori",
        "$1",
        "$1",
        "VL3U"
      ],
      [
        "divu",
        "RG2",
        "$1"
      ],
      [
        "mflo",
        "RG1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "DIVision Unsigned :  Set $t1 to ($t2 divided by 32-bit immediate, unsigned integer division)"
  },
  {
    "lineNumber": 231,
    "op": "rem",
    "source": "rem $t1,$t2,$t3",
    "sourceTokens": [
      "rem",
      "$t1",
      "$t2",
      "$t3"
    ],
    "defaultTemplates": [
      "bne RG3, $0, BROFF12",
      "DBNOP",
      "break",
      "div RG2, RG3",
      "mfhi RG1"
    ],
    "defaultTemplateTokens": [
      [
        "bne",
        "RG3",
        "$0",
        "BROFF12"
      ],
      [
        "DBNOP"
      ],
      [
        "break"
      ],
      [
        "div",
        "RG2",
        "RG3"
      ],
      [
        "mfhi",
        "RG1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "REMainder : Set $t1 to (remainder of $t2 divided by $t3)"
  },
  {
    "lineNumber": 232,
    "op": "rem",
    "source": "rem $t1,$t2,-100",
    "sourceTokens": [
      "rem",
      "$t1",
      "$t2",
      "-100"
    ],
    "defaultTemplates": [
      "addi $1, $0, VL3",
      "div RG2, $1",
      "mfhi RG1"
    ],
    "defaultTemplateTokens": [
      [
        "addi",
        "$1",
        "$0",
        "VL3"
      ],
      [
        "div",
        "RG2",
        "$1"
      ],
      [
        "mfhi",
        "RG1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "REMainder : Set $t1 to (remainder of $t2 divided by 16-bit immediate)"
  },
  {
    "lineNumber": 233,
    "op": "rem",
    "source": "rem $t1,$t2,100000",
    "sourceTokens": [
      "rem",
      "$t1",
      "$t2",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VHL3",
      "ori $1, $1, VL3U",
      "div RG2, $1",
      "mfhi RG1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VHL3"
      ],
      [
        "ori",
        "$1",
        "$1",
        "VL3U"
      ],
      [
        "div",
        "RG2",
        "$1"
      ],
      [
        "mfhi",
        "RG1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "REMainder : Set $t1 to (remainder of $t2 divided by 32-bit immediate)"
  },
  {
    "lineNumber": 234,
    "op": "remu",
    "source": "remu $t1,$t2,$t3",
    "sourceTokens": [
      "remu",
      "$t1",
      "$t2",
      "$t3"
    ],
    "defaultTemplates": [
      "bne RG3, $0, BROFF12",
      "DBNOP",
      "break",
      "divu RG2, RG3",
      "mfhi RG1"
    ],
    "defaultTemplateTokens": [
      [
        "bne",
        "RG3",
        "$0",
        "BROFF12"
      ],
      [
        "DBNOP"
      ],
      [
        "break"
      ],
      [
        "divu",
        "RG2",
        "RG3"
      ],
      [
        "mfhi",
        "RG1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "REMainder : Set $t1 to (remainder of $t2 divided by $t3, unsigned division)"
  },
  {
    "lineNumber": 235,
    "op": "remu",
    "source": "remu $t1,$t2,-100",
    "sourceTokens": [
      "remu",
      "$t1",
      "$t2",
      "-100"
    ],
    "defaultTemplates": [
      "addi $1, $0, VL3",
      "divu RG2, $1",
      "mfhi RG1"
    ],
    "defaultTemplateTokens": [
      [
        "addi",
        "$1",
        "$0",
        "VL3"
      ],
      [
        "divu",
        "RG2",
        "$1"
      ],
      [
        "mfhi",
        "RG1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "REMainder : Set $t1 to (remainder of $t2 divided by 16-bit immediate, unsigned division)"
  },
  {
    "lineNumber": 236,
    "op": "remu",
    "source": "remu $t1,$t2,100000",
    "sourceTokens": [
      "remu",
      "$t1",
      "$t2",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VHL3",
      "ori $1, $1, VL3U",
      "divu RG2, $1",
      "mfhi RG1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VHL3"
      ],
      [
        "ori",
        "$1",
        "$1",
        "VL3U"
      ],
      [
        "divu",
        "RG2",
        "$1"
      ],
      [
        "mfhi",
        "RG1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "REMainder : Set $t1 to (remainder of $t2 divided by 32-bit immediate, unsigned division)"
  },
  {
    "lineNumber": 245,
    "op": "li",
    "source": "li $t1,-100",
    "sourceTokens": [
      "li",
      "$t1",
      "-100"
    ],
    "defaultTemplates": [
      "addiu RG1, $0, VL2"
    ],
    "defaultTemplateTokens": [
      [
        "addiu",
        "RG1",
        "$0",
        "VL2"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Immediate : Set $t1 to 16-bit immediate (sign-extended)"
  },
  {
    "lineNumber": 246,
    "op": "li",
    "source": "li $t1,100",
    "sourceTokens": [
      "li",
      "$t1",
      "100"
    ],
    "defaultTemplates": [
      "ori RG1, $0, VL2U"
    ],
    "defaultTemplateTokens": [
      [
        "ori",
        "RG1",
        "$0",
        "VL2U"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Immediate : Set $t1 to unsigned 16-bit immediate (zero-extended)"
  },
  {
    "lineNumber": 247,
    "op": "li",
    "source": "li $t1,100000",
    "sourceTokens": [
      "li",
      "$t1",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VHL2",
      "ori RG1, $1, VL2U"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VHL2"
      ],
      [
        "ori",
        "RG1",
        "$1",
        "VL2U"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Immediate : Set $t1 to 32-bit immediate"
  },
  {
    "lineNumber": 249,
    "op": "la",
    "source": "la $t1,($t2)",
    "sourceTokens": [
      "la",
      "$t1",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "addi RG1, RG3, 0"
    ],
    "defaultTemplateTokens": [
      [
        "addi",
        "RG1",
        "RG3",
        "0"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Address : Set $t1 to contents of $t2"
  },
  {
    "lineNumber": 250,
    "op": "la",
    "source": "la $t1,-100",
    "sourceTokens": [
      "la",
      "$t1",
      "-100"
    ],
    "defaultTemplates": [
      "addiu RG1, $0, VL2"
    ],
    "defaultTemplateTokens": [
      [
        "addiu",
        "RG1",
        "$0",
        "VL2"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Address : Set $t1 to 16-bit immediate (sign-extended)"
  },
  {
    "lineNumber": 251,
    "op": "la",
    "source": "la $t1,100",
    "sourceTokens": [
      "la",
      "$t1",
      "100"
    ],
    "defaultTemplates": [
      "ori RG1, $0, VL2U"
    ],
    "defaultTemplateTokens": [
      [
        "ori",
        "RG1",
        "$0",
        "VL2U"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Address : Set $t1 to 16-bit immediate (zero-extended)"
  },
  {
    "lineNumber": 252,
    "op": "la",
    "source": "la $t1,100000",
    "sourceTokens": [
      "la",
      "$t1",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VHL2",
      "ori RG1, $1, VL2U"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VHL2"
      ],
      [
        "ori",
        "RG1",
        "$1",
        "VL2U"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Address : Set $t1 to 32-bit immediate"
  },
  {
    "lineNumber": 253,
    "op": "la",
    "source": "la $t1,100($t2)",
    "sourceTokens": [
      "la",
      "$t1",
      "100",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "ori $1, $0, VL2U",
      "add RG1, RG4, $1"
    ],
    "defaultTemplateTokens": [
      [
        "ori",
        "$1",
        "$0",
        "VL2U"
      ],
      [
        "add",
        "RG1",
        "RG4",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Address : Set $t1 to sum (of $t2 and 16-bit immediate)"
  },
  {
    "lineNumber": 254,
    "op": "la",
    "source": "la $t1,100000($t2)",
    "sourceTokens": [
      "la",
      "$t1",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, VHL2",
      "ori $1, $1, VL2U",
      "add RG1, RG4, $1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VHL2"
      ],
      [
        "ori",
        "$1",
        "$1",
        "VL2U"
      ],
      [
        "add",
        "RG1",
        "RG4",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Address : Set $t1 to sum (of $t2 and 32-bit immediate)"
  },
  {
    "lineNumber": 255,
    "op": "la",
    "source": "la $t1,label",
    "sourceTokens": [
      "la",
      "$t1",
      "label"
    ],
    "defaultTemplates": [
      "lui $1, LHL",
      "ori RG1, $1, LL2U"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHL"
      ],
      [
        "ori",
        "RG1",
        "$1",
        "LL2U"
      ]
    ],
    "compactTemplates": [
      "addi RG1, $0, LL2"
    ],
    "compactTemplateTokens": [
      [
        "addi",
        "RG1",
        "$0",
        "LL2"
      ]
    ],
    "description": "Load Address : Set $t1 to label's address"
  },
  {
    "lineNumber": 256,
    "op": "la",
    "source": "la $t1,label($t2)",
    "sourceTokens": [
      "la",
      "$t1",
      "label",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LHL",
      "ori $1, $1, LL2U",
      "add RG1, RG4, $1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHL"
      ],
      [
        "ori",
        "$1",
        "$1",
        "LL2U"
      ],
      [
        "add",
        "RG1",
        "RG4",
        "$1"
      ]
    ],
    "compactTemplates": [
      "addi RG1, RG4, LL2"
    ],
    "compactTemplateTokens": [
      [
        "addi",
        "RG1",
        "RG4",
        "LL2"
      ]
    ],
    "description": "Load Address : Set $t1 to sum (of $t2 and label's address)"
  },
  {
    "lineNumber": 257,
    "op": "la",
    "source": "la $t1,label+100000",
    "sourceTokens": [
      "la",
      "$t1",
      "label",
      "+",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, LHPN",
      "ori RG1, $1, LLPU"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPN"
      ],
      [
        "ori",
        "RG1",
        "$1",
        "LLPU"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Address : Set $t1 to sum (of label's address and 32-bit immediate)"
  },
  {
    "lineNumber": 258,
    "op": "la",
    "source": "la $t1,label+100000($t2)",
    "sourceTokens": [
      "la",
      "$t1",
      "label",
      "+",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LHPN",
      "ori $1, $1, LLPU",
      "add RG1, RG6, $1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPN"
      ],
      [
        "ori",
        "$1",
        "$1",
        "LLPU"
      ],
      [
        "add",
        "RG1",
        "RG6",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Address : Set $t1 to sum (of label's address, 32-bit immediate, and $t2)"
  },
  {
    "lineNumber": 260,
    "op": "lw",
    "source": "lw $t1,($t2)",
    "sourceTokens": [
      "lw",
      "$t1",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lw RG1,0(RG3)"
    ],
    "defaultTemplateTokens": [
      [
        "lw",
        "RG1",
        "0",
        "(",
        "RG3",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Word : Set $t1 to contents of effective memory word address"
  },
  {
    "lineNumber": 261,
    "op": "lw",
    "source": "lw $t1,-100",
    "sourceTokens": [
      "lw",
      "$t1",
      "-100"
    ],
    "defaultTemplates": [
      "lw RG1, VL2($0)"
    ],
    "defaultTemplateTokens": [
      [
        "lw",
        "RG1",
        "VL2",
        "(",
        "$0",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Word : Set $t1 to contents of effective memory word address"
  },
  {
    "lineNumber": 262,
    "op": "lw",
    "source": "lw $t1,100",
    "sourceTokens": [
      "lw",
      "$t1",
      "100"
    ],
    "defaultTemplates": [
      "ori $1, $0, VL2U",
      "lw RG1, 0($1)"
    ],
    "defaultTemplateTokens": [
      [
        "ori",
        "$1",
        "$0",
        "VL2U"
      ],
      [
        "lw",
        "RG1",
        "0",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Word : Set $t1 to contents of effective memory word address"
  },
  {
    "lineNumber": 263,
    "op": "lw",
    "source": "lw $t1,100000",
    "sourceTokens": [
      "lw",
      "$t1",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "lw RG1,VL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "lw",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Word : Set $t1 to contents of effective memory word address"
  },
  {
    "lineNumber": 264,
    "op": "lw",
    "source": "lw $t1,100($t2)",
    "sourceTokens": [
      "lw",
      "$t1",
      "100",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "ori $1, $0, VL2U",
      "addu $1, $1, RG4",
      "lw RG1, 0($1)"
    ],
    "defaultTemplateTokens": [
      [
        "ori",
        "$1",
        "$0",
        "VL2U"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "lw",
        "RG1",
        "0",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Word : Set $t1 to contents of effective memory word address"
  },
  {
    "lineNumber": 265,
    "op": "lw",
    "source": "lw $t1,100000($t2)",
    "sourceTokens": [
      "lw",
      "$t1",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "addu $1, $1, RG4",
      "lw RG1, VL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "lw",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Word : Set $t1 to contents of effective memory word address"
  },
  {
    "lineNumber": 266,
    "op": "lw",
    "source": "lw $t1,label",
    "sourceTokens": [
      "lw",
      "$t1",
      "label"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "lw RG1, LL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "lw",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [
      "lw RG1, LL2($0)"
    ],
    "compactTemplateTokens": [
      [
        "lw",
        "RG1",
        "LL2",
        "(",
        "$0",
        ")"
      ]
    ],
    "description": "Load Word : Set $t1 to contents of memory word at label's address"
  },
  {
    "lineNumber": 267,
    "op": "lw",
    "source": "lw $t1,label($t2)",
    "sourceTokens": [
      "lw",
      "$t1",
      "label",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "addu $1, $1, RG4",
      "lw RG1, LL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "lw",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [
      "lw RG1, LL2(RG4)"
    ],
    "compactTemplateTokens": [
      [
        "lw",
        "RG1",
        "LL2",
        "(",
        "RG4",
        ")"
      ]
    ],
    "description": "Load Word : Set $t1 to contents of effective memory word address"
  },
  {
    "lineNumber": 268,
    "op": "lw",
    "source": "lw $t1,label+100000",
    "sourceTokens": [
      "lw",
      "$t1",
      "label",
      "+",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "lw RG1, LLP($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "lw",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Word : Set $t1 to contents of effective memory word address"
  },
  {
    "lineNumber": 269,
    "op": "lw",
    "source": "lw $t1,label+100000($t2)",
    "sourceTokens": [
      "lw",
      "$t1",
      "label",
      "+",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "addu $1, $1, RG6",
      "lw RG1, LLP($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG6"
      ],
      [
        "lw",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Word : Set $t1 to contents of effective memory word address"
  },
  {
    "lineNumber": 271,
    "op": "sw",
    "source": "sw $t1,($t2)",
    "sourceTokens": [
      "sw",
      "$t1",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "sw RG1,0(RG3)"
    ],
    "defaultTemplateTokens": [
      [
        "sw",
        "RG1",
        "0",
        "(",
        "RG3",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Word : Store $t1 contents into effective memory word address"
  },
  {
    "lineNumber": 272,
    "op": "sw",
    "source": "sw $t1,-100",
    "sourceTokens": [
      "sw",
      "$t1",
      "-100"
    ],
    "defaultTemplates": [
      "sw RG1, VL2($0)"
    ],
    "defaultTemplateTokens": [
      [
        "sw",
        "RG1",
        "VL2",
        "(",
        "$0",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Word : Store $t1 contents into effective memory word address"
  },
  {
    "lineNumber": 273,
    "op": "sw",
    "source": "sw $t1,100",
    "sourceTokens": [
      "sw",
      "$t1",
      "100"
    ],
    "defaultTemplates": [
      "ori $1, $0, VL2U",
      "sw RG1, 0($1)"
    ],
    "defaultTemplateTokens": [
      [
        "ori",
        "$1",
        "$0",
        "VL2U"
      ],
      [
        "sw",
        "RG1",
        "0",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Word : Store $t1 contents into effective memory word address"
  },
  {
    "lineNumber": 274,
    "op": "sw",
    "source": "sw $t1,100000",
    "sourceTokens": [
      "sw",
      "$t1",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "sw RG1,VL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "sw",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Word : Store $t1 contents into effective memory word address"
  },
  {
    "lineNumber": 275,
    "op": "sw",
    "source": "sw $t1,100($t2)",
    "sourceTokens": [
      "sw",
      "$t1",
      "100",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "ori $1, $0, VL2U",
      "addu $1, $1, RG4",
      "sw RG1, 0($1)"
    ],
    "defaultTemplateTokens": [
      [
        "ori",
        "$1",
        "$0",
        "VL2U"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "sw",
        "RG1",
        "0",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Word : Store $t1 contents into effective memory word address"
  },
  {
    "lineNumber": 276,
    "op": "sw",
    "source": "sw $t1,100000($t2)",
    "sourceTokens": [
      "sw",
      "$t1",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "addu $1, $1, RG4",
      "sw RG1, VL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "sw",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Word : Store $t1 contents into effective memory word address"
  },
  {
    "lineNumber": 277,
    "op": "sw",
    "source": "sw $t1,label",
    "sourceTokens": [
      "sw",
      "$t1",
      "label"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "sw RG1, LL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "sw",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [
      "sw RG1, LL2($0)"
    ],
    "compactTemplateTokens": [
      [
        "sw",
        "RG1",
        "LL2",
        "(",
        "$0",
        ")"
      ]
    ],
    "description": "Store Word : Store $t1 contents into memory word at label's address"
  },
  {
    "lineNumber": 278,
    "op": "sw",
    "source": "sw $t1,label($t2)",
    "sourceTokens": [
      "sw",
      "$t1",
      "label",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "addu $1, $1, RG4",
      "sw RG1, LL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "sw",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [
      "sw RG1, LL2(RG4)"
    ],
    "compactTemplateTokens": [
      [
        "sw",
        "RG1",
        "LL2",
        "(",
        "RG4",
        ")"
      ]
    ],
    "description": "Store Word : Store $t1 contents into effective memory word address"
  },
  {
    "lineNumber": 279,
    "op": "sw",
    "source": "sw $t1,label+100000",
    "sourceTokens": [
      "sw",
      "$t1",
      "label",
      "+",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "sw RG1, LLP($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "sw",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Word : Store $t1 contents into effective memory word address"
  },
  {
    "lineNumber": 280,
    "op": "sw",
    "source": "sw $t1,label+100000($t2)",
    "sourceTokens": [
      "sw",
      "$t1",
      "label",
      "+",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "addu $1, $1, RG6",
      "sw RG1, LLP($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG6"
      ],
      [
        "sw",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Word : Store $t1 contents into effective memory word address"
  },
  {
    "lineNumber": 282,
    "op": "lh",
    "source": "lh $t1,($t2)",
    "sourceTokens": [
      "lh",
      "$t1",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lh RG1,0(RG3)"
    ],
    "defaultTemplateTokens": [
      [
        "lh",
        "RG1",
        "0",
        "(",
        "RG3",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Halfword : Set $t1 to sign-extended 16-bit value from effective memory halfword address"
  },
  {
    "lineNumber": 283,
    "op": "lh",
    "source": "lh $t1,-100",
    "sourceTokens": [
      "lh",
      "$t1",
      "-100"
    ],
    "defaultTemplates": [
      "lh RG1, VL2($0)"
    ],
    "defaultTemplateTokens": [
      [
        "lh",
        "RG1",
        "VL2",
        "(",
        "$0",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Halfword : Set $t1 to sign-extended 16-bit value from effective memory halfword address"
  },
  {
    "lineNumber": 284,
    "op": "lh",
    "source": "lh $t1,100",
    "sourceTokens": [
      "lh",
      "$t1",
      "100"
    ],
    "defaultTemplates": [
      "ori $1, $0, VL2U",
      "lh RG1, 0($1)"
    ],
    "defaultTemplateTokens": [
      [
        "ori",
        "$1",
        "$0",
        "VL2U"
      ],
      [
        "lh",
        "RG1",
        "0",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Halfword : Set $t1 to sign-extended 16-bit value from effective memory halfword address"
  },
  {
    "lineNumber": 285,
    "op": "lh",
    "source": "lh $t1,100000",
    "sourceTokens": [
      "lh",
      "$t1",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "lh RG1,VL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "lh",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Halfword : Set $t1 to sign-extended 16-bit value from effective memory halfword address"
  },
  {
    "lineNumber": 286,
    "op": "lh",
    "source": "lh $t1,100($t2)",
    "sourceTokens": [
      "lh",
      "$t1",
      "100",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "ori $1, $0, VL2U",
      "addu $1, $1, RG4",
      "lh RG1, 0($1)"
    ],
    "defaultTemplateTokens": [
      [
        "ori",
        "$1",
        "$0",
        "VL2U"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "lh",
        "RG1",
        "0",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Halfword : Set $t1 to sign-extended 16-bit value from effective memory halfword address"
  },
  {
    "lineNumber": 287,
    "op": "lh",
    "source": "lh $t1,100000($t2)",
    "sourceTokens": [
      "lh",
      "$t1",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "addu $1, $1, RG4",
      "lh RG1, VL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "lh",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Halfword : Set $t1 to sign-extended 16-bit value from effective memory halfword address"
  },
  {
    "lineNumber": 288,
    "op": "lh",
    "source": "lh $t1,label",
    "sourceTokens": [
      "lh",
      "$t1",
      "label"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "lh RG1, LL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "lh",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [
      "lh RG1, LL2($0)"
    ],
    "compactTemplateTokens": [
      [
        "lh",
        "RG1",
        "LL2",
        "(",
        "$0",
        ")"
      ]
    ],
    "description": "Load Halfword : Set $t1 to sign-extended 16-bit value from effective memory halfword address"
  },
  {
    "lineNumber": 289,
    "op": "lh",
    "source": "lh $t1,label($t2)",
    "sourceTokens": [
      "lh",
      "$t1",
      "label",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "addu $1, $1, RG4",
      "lh RG1, LL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "lh",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [
      "lh RG1, LL2(RG4)"
    ],
    "compactTemplateTokens": [
      [
        "lh",
        "RG1",
        "LL2",
        "(",
        "RG4",
        ")"
      ]
    ],
    "description": "Load Halfword : Set $t1 to sign-extended 16-bit value from effective memory halfword address"
  },
  {
    "lineNumber": 290,
    "op": "lh",
    "source": "lh $t1,label+100000",
    "sourceTokens": [
      "lh",
      "$t1",
      "label",
      "+",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "lh RG1, LLP($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "lh",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Halfword : Set $t1 to sign-extended 16-bit value from effective memory halfword address"
  },
  {
    "lineNumber": 291,
    "op": "lh",
    "source": "lh $t1,label+100000($t2)",
    "sourceTokens": [
      "lh",
      "$t1",
      "label",
      "+",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "addu $1, $1, RG6",
      "lh RG1, LLP($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG6"
      ],
      [
        "lh",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Halfword : Set $t1 to sign-extended 16-bit value from effective memory halfword address"
  },
  {
    "lineNumber": 293,
    "op": "sh",
    "source": "sh $t1,($t2)",
    "sourceTokens": [
      "sh",
      "$t1",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "sh RG1,0(RG3)"
    ],
    "defaultTemplateTokens": [
      [
        "sh",
        "RG1",
        "0",
        "(",
        "RG3",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Halfword : Store the low-order 16 bits of $t1 into the effective memory halfword address"
  },
  {
    "lineNumber": 294,
    "op": "sh",
    "source": "sh $t1,-100",
    "sourceTokens": [
      "sh",
      "$t1",
      "-100"
    ],
    "defaultTemplates": [
      "sh RG1, VL2($0)"
    ],
    "defaultTemplateTokens": [
      [
        "sh",
        "RG1",
        "VL2",
        "(",
        "$0",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Halfword : Store the low-order 16 bits of $t1 into the effective memory halfword address"
  },
  {
    "lineNumber": 295,
    "op": "sh",
    "source": "sh $t1,100",
    "sourceTokens": [
      "sh",
      "$t1",
      "100"
    ],
    "defaultTemplates": [
      "ori $1, $0, VL2U",
      "sh RG1, 0($1)"
    ],
    "defaultTemplateTokens": [
      [
        "ori",
        "$1",
        "$0",
        "VL2U"
      ],
      [
        "sh",
        "RG1",
        "0",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Halfword : Store the low-order 16 bits of $t1 into the effective memory halfword address"
  },
  {
    "lineNumber": 296,
    "op": "sh",
    "source": "sh $t1,100000",
    "sourceTokens": [
      "sh",
      "$t1",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "sh RG1,VL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "sh",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Halfword : Store the low-order 16 bits of $t1 into the effective memory halfword address"
  },
  {
    "lineNumber": 297,
    "op": "sh",
    "source": "sh $t1,100($t2)",
    "sourceTokens": [
      "sh",
      "$t1",
      "100",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "ori $1, $0, VL2U",
      "addu $1, $1, RG4",
      "sh RG1, 0($1)"
    ],
    "defaultTemplateTokens": [
      [
        "ori",
        "$1",
        "$0",
        "VL2U"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "sh",
        "RG1",
        "0",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Halfword : Store the low-order 16 bits of $t1 into the effective memory halfword address"
  },
  {
    "lineNumber": 298,
    "op": "sh",
    "source": "sh $t1,100000($t2)",
    "sourceTokens": [
      "sh",
      "$t1",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "addu $1, $1, RG4",
      "sh RG1, VL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "sh",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Halfword : Store the low-order 16 bits of $t1 into the effective memory halfword address"
  },
  {
    "lineNumber": 299,
    "op": "sh",
    "source": "sh $t1,label",
    "sourceTokens": [
      "sh",
      "$t1",
      "label"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "sh RG1, LL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "sh",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [
      "sh RG1, LL2($0)"
    ],
    "compactTemplateTokens": [
      [
        "sh",
        "RG1",
        "LL2",
        "(",
        "$0",
        ")"
      ]
    ],
    "description": "Store Halfword : Store the low-order 16 bits of $t1 into the effective memory halfword address"
  },
  {
    "lineNumber": 300,
    "op": "sh",
    "source": "sh $t1,label($t2)",
    "sourceTokens": [
      "sh",
      "$t1",
      "label",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "addu $1, $1, RG4",
      "sh RG1, LL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "sh",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [
      "sh RG1, LL2(RG4)"
    ],
    "compactTemplateTokens": [
      [
        "sh",
        "RG1",
        "LL2",
        "(",
        "RG4",
        ")"
      ]
    ],
    "description": "Store Halfword : Store the low-order 16 bits of $t1 into the effective memory halfword address"
  },
  {
    "lineNumber": 301,
    "op": "sh",
    "source": "sh $t1,label+100000",
    "sourceTokens": [
      "sh",
      "$t1",
      "label",
      "+",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "sh RG1, LLP($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "sh",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Halfword : Store the low-order 16 bits of $t1 into the effective memory halfword address"
  },
  {
    "lineNumber": 302,
    "op": "sh",
    "source": "sh $t1,label+100000($t2)",
    "sourceTokens": [
      "sh",
      "$t1",
      "label",
      "+",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "addu $1, $1, RG6",
      "sh RG1, LLP($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG6"
      ],
      [
        "sh",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Halfword : Store the low-order 16 bits of $t1 into the effective memory halfword address"
  },
  {
    "lineNumber": 304,
    "op": "lb",
    "source": "lb $t1,($t2)",
    "sourceTokens": [
      "lb",
      "$t1",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lb RG1,0(RG3)"
    ],
    "defaultTemplateTokens": [
      [
        "lb",
        "RG1",
        "0",
        "(",
        "RG3",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Byte : Set $t1 to sign-extended 8-bit value from effective memory byte address"
  },
  {
    "lineNumber": 305,
    "op": "lb",
    "source": "lb $t1,-100",
    "sourceTokens": [
      "lb",
      "$t1",
      "-100"
    ],
    "defaultTemplates": [
      "lb RG1, VL2($0)"
    ],
    "defaultTemplateTokens": [
      [
        "lb",
        "RG1",
        "VL2",
        "(",
        "$0",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Byte : Set $t1 to sign-extended 8-bit value from effective memory byte address"
  },
  {
    "lineNumber": 306,
    "op": "lb",
    "source": "lb $t1,100",
    "sourceTokens": [
      "lb",
      "$t1",
      "100"
    ],
    "defaultTemplates": [
      "ori $1, $0, VL2U",
      "lb RG1, 0($1)"
    ],
    "defaultTemplateTokens": [
      [
        "ori",
        "$1",
        "$0",
        "VL2U"
      ],
      [
        "lb",
        "RG1",
        "0",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Byte : Set $t1 to sign-extended 8-bit value from effective memory byte address"
  },
  {
    "lineNumber": 307,
    "op": "lb",
    "source": "lb $t1,100000",
    "sourceTokens": [
      "lb",
      "$t1",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "lb RG1,VL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "lb",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Byte : Set $t1 to sign-extended 8-bit value from effective memory byte address"
  },
  {
    "lineNumber": 308,
    "op": "lb",
    "source": "lb $t1,100($t2)",
    "sourceTokens": [
      "lb",
      "$t1",
      "100",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "ori $1, $0, VL2U",
      "addu $1, $1, RG4",
      "lb RG1, 0($1)"
    ],
    "defaultTemplateTokens": [
      [
        "ori",
        "$1",
        "$0",
        "VL2U"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "lb",
        "RG1",
        "0",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Byte : Set $t1 to sign-extended 8-bit value from effective memory byte address"
  },
  {
    "lineNumber": 309,
    "op": "lb",
    "source": "lb $t1,100000($t2)",
    "sourceTokens": [
      "lb",
      "$t1",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "addu $1, $1, RG4",
      "lb RG1, VL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "lb",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Byte : Set $t1 to sign-extended 8-bit value from effective memory byte address"
  },
  {
    "lineNumber": 310,
    "op": "lb",
    "source": "lb $t1,label",
    "sourceTokens": [
      "lb",
      "$t1",
      "label"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "lb RG1, LL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "lb",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [
      "lb RG1, LL2($0)"
    ],
    "compactTemplateTokens": [
      [
        "lb",
        "RG1",
        "LL2",
        "(",
        "$0",
        ")"
      ]
    ],
    "description": "Load Byte : Set $t1 to sign-extended 8-bit value from effective memory byte address"
  },
  {
    "lineNumber": 311,
    "op": "lb",
    "source": "lb $t1,label($t2)",
    "sourceTokens": [
      "lb",
      "$t1",
      "label",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "addu $1, $1, RG4",
      "lb RG1, LL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "lb",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [
      "lb RG1, LL2(RG4)"
    ],
    "compactTemplateTokens": [
      [
        "lb",
        "RG1",
        "LL2",
        "(",
        "RG4",
        ")"
      ]
    ],
    "description": "Load Byte : Set $t1 to sign-extended 8-bit value from effective memory byte address"
  },
  {
    "lineNumber": 312,
    "op": "lb",
    "source": "lb $t1,label+100000",
    "sourceTokens": [
      "lb",
      "$t1",
      "label",
      "+",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "lb RG1, LLP($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "lb",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Byte : Set $t1 to sign-extended 8-bit value from effective memory byte address"
  },
  {
    "lineNumber": 313,
    "op": "lb",
    "source": "lb $t1,label+100000($t2)",
    "sourceTokens": [
      "lb",
      "$t1",
      "label",
      "+",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "addu $1, $1, RG6",
      "lb RG1, LLP($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG6"
      ],
      [
        "lb",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Byte : Set $t1 to sign-extended 8-bit value from effective memory byte address"
  },
  {
    "lineNumber": 315,
    "op": "sb",
    "source": "sb $t1,($t2)",
    "sourceTokens": [
      "sb",
      "$t1",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "sb RG1,0(RG3)"
    ],
    "defaultTemplateTokens": [
      [
        "sb",
        "RG1",
        "0",
        "(",
        "RG3",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Byte : Store the low-order 8 bits of $t1 into the effective memory byte address"
  },
  {
    "lineNumber": 316,
    "op": "sb",
    "source": "sb $t1,-100",
    "sourceTokens": [
      "sb",
      "$t1",
      "-100"
    ],
    "defaultTemplates": [
      "sb RG1, VL2($0)"
    ],
    "defaultTemplateTokens": [
      [
        "sb",
        "RG1",
        "VL2",
        "(",
        "$0",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Byte : Store the low-order 8 bits of $t1 into the effective memory byte address"
  },
  {
    "lineNumber": 317,
    "op": "sb",
    "source": "sb $t1,100",
    "sourceTokens": [
      "sb",
      "$t1",
      "100"
    ],
    "defaultTemplates": [
      "ori $1, $0, VL2U",
      "sb RG1, 0($1)"
    ],
    "defaultTemplateTokens": [
      [
        "ori",
        "$1",
        "$0",
        "VL2U"
      ],
      [
        "sb",
        "RG1",
        "0",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Byte : Store the low-order 8 bits of $t1 into the effective memory byte address"
  },
  {
    "lineNumber": 318,
    "op": "sb",
    "source": "sb $t1,100000",
    "sourceTokens": [
      "sb",
      "$t1",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "sb RG1,VL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "sb",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Byte : Store the low-order 8 bits of $t1 into the effective memory byte address"
  },
  {
    "lineNumber": 319,
    "op": "sb",
    "source": "sb $t1,100($t2)",
    "sourceTokens": [
      "sb",
      "$t1",
      "100",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "ori $1, $0, VL2U",
      "addu $1, $1, RG4",
      "sb RG1, 0($1)"
    ],
    "defaultTemplateTokens": [
      [
        "ori",
        "$1",
        "$0",
        "VL2U"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "sb",
        "RG1",
        "0",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Byte : Store the low-order 8 bits of $t1 into the effective memory byte address"
  },
  {
    "lineNumber": 320,
    "op": "sb",
    "source": "sb $t1,100000($t2)",
    "sourceTokens": [
      "sb",
      "$t1",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "addu $1, $1, RG4",
      "sb RG1, VL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "sb",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Byte : Store the low-order 8 bits of $t1 into the effective memory byte address"
  },
  {
    "lineNumber": 321,
    "op": "sb",
    "source": "sb $t1,label",
    "sourceTokens": [
      "sb",
      "$t1",
      "label"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "sb RG1, LL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "sb",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [
      "sb RG1, LL2($0)"
    ],
    "compactTemplateTokens": [
      [
        "sb",
        "RG1",
        "LL2",
        "(",
        "$0",
        ")"
      ]
    ],
    "description": "Store Byte : Store the low-order 8 bits of $t1 into the effective memory byte address"
  },
  {
    "lineNumber": 322,
    "op": "sb",
    "source": "sb $t1,label($t2)",
    "sourceTokens": [
      "sb",
      "$t1",
      "label",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "addu $1, $1, RG4",
      "sb RG1, LL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "sb",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [
      "sb RG1, LL2(RG4)"
    ],
    "compactTemplateTokens": [
      [
        "sb",
        "RG1",
        "LL2",
        "(",
        "RG4",
        ")"
      ]
    ],
    "description": "Store Byte : Store the low-order 8 bits of $t1 into the effective memory byte address"
  },
  {
    "lineNumber": 323,
    "op": "sb",
    "source": "sb $t1,label+100000",
    "sourceTokens": [
      "sb",
      "$t1",
      "label",
      "+",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "sb RG1, LLP($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "sb",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Byte : Store the low-order 8 bits of $t1 into the effective memory byte address"
  },
  {
    "lineNumber": 324,
    "op": "sb",
    "source": "sb $t1,label+100000($t2)",
    "sourceTokens": [
      "sb",
      "$t1",
      "label",
      "+",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "addu $1, $1, RG6",
      "sb RG1, LLP($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG6"
      ],
      [
        "sb",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Byte : Store the low-order 8 bits of $t1 into the effective memory byte address"
  },
  {
    "lineNumber": 326,
    "op": "lhu",
    "source": "lhu $t1,($t2)",
    "sourceTokens": [
      "lhu",
      "$t1",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lhu RG1,0(RG3)"
    ],
    "defaultTemplateTokens": [
      [
        "lhu",
        "RG1",
        "0",
        "(",
        "RG3",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Halfword Unsigned : Set $t1 to zero-extended 16-bit value from effective memory halfword address"
  },
  {
    "lineNumber": 327,
    "op": "lhu",
    "source": "lhu $t1,-100",
    "sourceTokens": [
      "lhu",
      "$t1",
      "-100"
    ],
    "defaultTemplates": [
      "lhu RG1,VL2($0)"
    ],
    "defaultTemplateTokens": [
      [
        "lhu",
        "RG1",
        "VL2",
        "(",
        "$0",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Halfword Unsigned : Set $t1 to zero-extended 16-bit value from effective memory halfword address"
  },
  {
    "lineNumber": 328,
    "op": "lhu",
    "source": "lhu $t1,100",
    "sourceTokens": [
      "lhu",
      "$t1",
      "100"
    ],
    "defaultTemplates": [
      "ori $1, $0, VL2U",
      "lhu RG1, 0($1)"
    ],
    "defaultTemplateTokens": [
      [
        "ori",
        "$1",
        "$0",
        "VL2U"
      ],
      [
        "lhu",
        "RG1",
        "0",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Halfword Unsigned : Set $t1 to zero-extended 16-bit value from effective memory halfword address"
  },
  {
    "lineNumber": 329,
    "op": "lhu",
    "source": "lhu $t1,100000",
    "sourceTokens": [
      "lhu",
      "$t1",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "lhu RG1,VL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "lhu",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Halfword Unsigned : Set $t1 to zero-extended 16-bit value from effective memory halfword address"
  },
  {
    "lineNumber": 330,
    "op": "lhu",
    "source": "lhu $t1,100($t2)",
    "sourceTokens": [
      "lhu",
      "$t1",
      "100",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "ori $1, $0, VL2U",
      "addu $1, $1, RG4",
      "lhu RG1, 0($1)"
    ],
    "defaultTemplateTokens": [
      [
        "ori",
        "$1",
        "$0",
        "VL2U"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "lhu",
        "RG1",
        "0",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Halfword Unsigned : Set $t1 to zero-extended 16-bit value from effective memory halfword address"
  },
  {
    "lineNumber": 331,
    "op": "lhu",
    "source": "lhu $t1,100000($t2)",
    "sourceTokens": [
      "lhu",
      "$t1",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "addu $1, $1, RG4",
      "lhu RG1, VL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "lhu",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Halfword Unsigned : Set $t1 to zero-extended 16-bit value from effective memory halfword address"
  },
  {
    "lineNumber": 332,
    "op": "lhu",
    "source": "lhu $t1,label",
    "sourceTokens": [
      "lhu",
      "$t1",
      "label"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "lhu RG1, LL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "lhu",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [
      "lhu RG1, LL2($0)"
    ],
    "compactTemplateTokens": [
      [
        "lhu",
        "RG1",
        "LL2",
        "(",
        "$0",
        ")"
      ]
    ],
    "description": "Load Halfword Unsigned : Set $t1 to zero-extended 16-bit value from effective memory halfword address"
  },
  {
    "lineNumber": 333,
    "op": "lhu",
    "source": "lhu $t1,label($t2)",
    "sourceTokens": [
      "lhu",
      "$t1",
      "label",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "addu $1, $1, RG4",
      "lhu RG1, LL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "lhu",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [
      "lhu RG1, LL2(RG4)"
    ],
    "compactTemplateTokens": [
      [
        "lhu",
        "RG1",
        "LL2",
        "(",
        "RG4",
        ")"
      ]
    ],
    "description": "Load Halfword Unsigned : Set $t1 to zero-extended 16-bit value from effective memory halfword address"
  },
  {
    "lineNumber": 334,
    "op": "lhu",
    "source": "lhu $t1,label+100000",
    "sourceTokens": [
      "lhu",
      "$t1",
      "label",
      "+",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "lhu RG1, LLP($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "lhu",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Halfword Unsigned : Set $t1 to zero-extended 16-bit value from effective memory halfword address"
  },
  {
    "lineNumber": 335,
    "op": "lhu",
    "source": "lhu $t1,label+100000($t2)",
    "sourceTokens": [
      "lhu",
      "$t1",
      "label",
      "+",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "addu $1, $1, RG6",
      "lhu RG1, LLP($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG6"
      ],
      [
        "lhu",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Halfword Unsigned : Set $t1 to zero-extended 16-bit value from effective memory halfword address"
  },
  {
    "lineNumber": 337,
    "op": "lbu",
    "source": "lbu $t1,($t2)",
    "sourceTokens": [
      "lbu",
      "$t1",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lbu RG1,0(RG3)"
    ],
    "defaultTemplateTokens": [
      [
        "lbu",
        "RG1",
        "0",
        "(",
        "RG3",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Byte Unsigned : Set $t1 to zero-extended 8-bit value from effective memory byte address"
  },
  {
    "lineNumber": 338,
    "op": "lbu",
    "source": "lbu $t1,-100",
    "sourceTokens": [
      "lbu",
      "$t1",
      "-100"
    ],
    "defaultTemplates": [
      "lbu RG1,VL2($0)"
    ],
    "defaultTemplateTokens": [
      [
        "lbu",
        "RG1",
        "VL2",
        "(",
        "$0",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Byte Unsigned : Set $t1 to zero-extended 8-bit value from effective memory byte address"
  },
  {
    "lineNumber": 339,
    "op": "lbu",
    "source": "lbu $t1,100",
    "sourceTokens": [
      "lbu",
      "$t1",
      "100"
    ],
    "defaultTemplates": [
      "ori $1, $0, VL2U",
      "lbu RG1, 0($1)"
    ],
    "defaultTemplateTokens": [
      [
        "ori",
        "$1",
        "$0",
        "VL2U"
      ],
      [
        "lbu",
        "RG1",
        "0",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Byte Unsigned : Set $t1 to zero-extended 8-bit value from effective memory byte address"
  },
  {
    "lineNumber": 340,
    "op": "lbu",
    "source": "lbu $t1,100000",
    "sourceTokens": [
      "lbu",
      "$t1",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "lbu RG1,VL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "lbu",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Byte Unsigned : Set $t1 to zero-extended 8-bit value from effective memory byte address"
  },
  {
    "lineNumber": 341,
    "op": "lbu",
    "source": "lbu $t1,100($t2)",
    "sourceTokens": [
      "lbu",
      "$t1",
      "100",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "ori $1, $0, VL2U",
      "addu $1, $1, RG4",
      "lbu RG1, 0($1)"
    ],
    "defaultTemplateTokens": [
      [
        "ori",
        "$1",
        "$0",
        "VL2U"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "lbu",
        "RG1",
        "0",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Byte Unsigned : Set $t1 to zero-extended 8-bit value from effective memory byte address"
  },
  {
    "lineNumber": 342,
    "op": "lbu",
    "source": "lbu $t1,100000($t2)",
    "sourceTokens": [
      "lbu",
      "$t1",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "addu $1, $1, RG4",
      "lbu RG1, VL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "lbu",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Byte Unsigned : Set $t1 to zero-extended 8-bit value from effective memory byte address"
  },
  {
    "lineNumber": 343,
    "op": "lbu",
    "source": "lbu $t1,label",
    "sourceTokens": [
      "lbu",
      "$t1",
      "label"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "lbu RG1, LL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "lbu",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [
      "lbu RG1, LL2($0)"
    ],
    "compactTemplateTokens": [
      [
        "lbu",
        "RG1",
        "LL2",
        "(",
        "$0",
        ")"
      ]
    ],
    "description": "Load Byte Unsigned : Set $t1 to zero-extended 8-bit value from effective memory byte address"
  },
  {
    "lineNumber": 344,
    "op": "lbu",
    "source": "lbu $t1,label($t2)",
    "sourceTokens": [
      "lbu",
      "$t1",
      "label",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "addu $1, $1, RG4",
      "lbu RG1, LL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "lbu",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [
      "lbu RG1, LL2(RG4)"
    ],
    "compactTemplateTokens": [
      [
        "lbu",
        "RG1",
        "LL2",
        "(",
        "RG4",
        ")"
      ]
    ],
    "description": "Load Byte Unsigned : Set $t1 to zero-extended 8-bit value from effective memory byte address"
  },
  {
    "lineNumber": 345,
    "op": "lbu",
    "source": "lbu $t1,label+100000",
    "sourceTokens": [
      "lbu",
      "$t1",
      "label",
      "+",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "lbu RG1, LLP($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "lbu",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Byte Unsigned : Set $t1 to zero-extended 8-bit value from effective memory byte address"
  },
  {
    "lineNumber": 346,
    "op": "lbu",
    "source": "lbu $t1,label+100000($t2)",
    "sourceTokens": [
      "lbu",
      "$t1",
      "label",
      "+",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "addu $1, $1, RG6",
      "lbu RG1, LLP($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG6"
      ],
      [
        "lbu",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Byte Unsigned : Set $t1 to zero-extended 8-bit value from effective memory byte address"
  },
  {
    "lineNumber": 348,
    "op": "lwl",
    "source": "lwl $t1,($t2)",
    "sourceTokens": [
      "lwl",
      "$t1",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lwl RG1,0(RG3)"
    ],
    "defaultTemplateTokens": [
      [
        "lwl",
        "RG1",
        "0",
        "(",
        "RG3",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Word Left : Load from 1 to 4 bytes left-justified into $t1, starting with effective memory byte address and continuing through the low-order byte of its word"
  },
  {
    "lineNumber": 349,
    "op": "lwl",
    "source": "lwl $t1,-100",
    "sourceTokens": [
      "lwl",
      "$t1",
      "-100"
    ],
    "defaultTemplates": [
      "lwl RG1,VL2($0)"
    ],
    "defaultTemplateTokens": [
      [
        "lwl",
        "RG1",
        "VL2",
        "(",
        "$0",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Word Left : Load from 1 to 4 bytes left-justified into $t1, starting with effective memory byte address and continuing through the low-order byte of its word"
  },
  {
    "lineNumber": 350,
    "op": "lwl",
    "source": "lwl $t1,100",
    "sourceTokens": [
      "lwl",
      "$t1",
      "100"
    ],
    "defaultTemplates": [
      "ori $1, $0, VL2U",
      "lwl RG1, 0($1)"
    ],
    "defaultTemplateTokens": [
      [
        "ori",
        "$1",
        "$0",
        "VL2U"
      ],
      [
        "lwl",
        "RG1",
        "0",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Word Left : Load from 1 to 4 bytes left-justified into $t1, starting with effective memory byte address and continuing through the low-order byte of its word"
  },
  {
    "lineNumber": 351,
    "op": "lwl",
    "source": "lwl $t1,100000",
    "sourceTokens": [
      "lwl",
      "$t1",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "lwl RG1,VL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "lwl",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Word Left : Load from 1 to 4 bytes left-justified into $t1, starting with effective memory byte address and continuing through the low-order byte of its word"
  },
  {
    "lineNumber": 352,
    "op": "lwl",
    "source": "lwl $t1,100($t2)",
    "sourceTokens": [
      "lwl",
      "$t1",
      "100",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "ori $1, $0, VL2U",
      "addu $1, $1, RG4",
      "lwl RG1, 0($1)"
    ],
    "defaultTemplateTokens": [
      [
        "ori",
        "$1",
        "$0",
        "VL2U"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "lwl",
        "RG1",
        "0",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Word Left : Load from 1 to 4 bytes left-justified into $t1, starting with effective memory byte address and continuing through the low-order byte of its word"
  },
  {
    "lineNumber": 353,
    "op": "lwl",
    "source": "lwl $t1,100000($t2)",
    "sourceTokens": [
      "lwl",
      "$t1",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "addu $1, $1, RG4",
      "lwl RG1, VL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "lwl",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Word Left : Load from 1 to 4 bytes left-justified into $t1, starting with effective memory byte address and continuing through the low-order byte of its word"
  },
  {
    "lineNumber": 354,
    "op": "lwl",
    "source": "lwl $t1,label",
    "sourceTokens": [
      "lwl",
      "$t1",
      "label"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "lwl RG1, LL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "lwl",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [
      "lwl RG1, LL2($0)"
    ],
    "compactTemplateTokens": [
      [
        "lwl",
        "RG1",
        "LL2",
        "(",
        "$0",
        ")"
      ]
    ],
    "description": "Load Word Left : Load from 1 to 4 bytes left-justified into $t1, starting with effective memory byte address and continuing through the low-order byte of its word"
  },
  {
    "lineNumber": 355,
    "op": "lwl",
    "source": "lwl $t1,label($t2)",
    "sourceTokens": [
      "lwl",
      "$t1",
      "label",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "addu $1, $1, RG4",
      "lwl RG1, LL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "lwl",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [
      "lwl RG1, LL2(RG4)"
    ],
    "compactTemplateTokens": [
      [
        "lwl",
        "RG1",
        "LL2",
        "(",
        "RG4",
        ")"
      ]
    ],
    "description": "Load Word Left : Load from 1 to 4 bytes left-justified into $t1, starting with effective memory byte address and continuing through the low-order byte of its word"
  },
  {
    "lineNumber": 356,
    "op": "lwl",
    "source": "lwl $t1,label+100000",
    "sourceTokens": [
      "lwl",
      "$t1",
      "label",
      "+",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "lwl RG1, LLP($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "lwl",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Word Left : Load from 1 to 4 bytes left-justified into $t1, starting with effective memory byte address and continuing through the low-order byte of its word"
  },
  {
    "lineNumber": 357,
    "op": "lwl",
    "source": "lwl $t1,label+100000($t2)",
    "sourceTokens": [
      "lwl",
      "$t1",
      "label",
      "+",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "addu $1, $1, RG6",
      "lwl RG1, LLP($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG6"
      ],
      [
        "lwl",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Word Left : Load from 1 to 4 bytes left-justified into $t1, starting with effective memory byte address and continuing through the low-order byte of its word"
  },
  {
    "lineNumber": 359,
    "op": "swl",
    "source": "swl $t1,($t2)",
    "sourceTokens": [
      "swl",
      "$t1",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "swl RG1,0(RG3)"
    ],
    "defaultTemplateTokens": [
      [
        "swl",
        "RG1",
        "0",
        "(",
        "RG3",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Word Left : Store high-order 1 to 4 bytes of $t1 into memory, starting with effective memory byte address and continuing through the low-order byte of its word"
  },
  {
    "lineNumber": 360,
    "op": "swl",
    "source": "swl $t1,-100",
    "sourceTokens": [
      "swl",
      "$t1",
      "-100"
    ],
    "defaultTemplates": [
      "swl RG1,VL2($0)"
    ],
    "defaultTemplateTokens": [
      [
        "swl",
        "RG1",
        "VL2",
        "(",
        "$0",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Word Left : Store high-order 1 to 4 bytes of $t1 into memory, starting with effective memory byte address and continuing through the low-order byte of its word"
  },
  {
    "lineNumber": 361,
    "op": "swl",
    "source": "swl $t1,100",
    "sourceTokens": [
      "swl",
      "$t1",
      "100"
    ],
    "defaultTemplates": [
      "ori $1, $0, VL2U",
      "swl RG1, 0($1)"
    ],
    "defaultTemplateTokens": [
      [
        "ori",
        "$1",
        "$0",
        "VL2U"
      ],
      [
        "swl",
        "RG1",
        "0",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Word Left : Store high-order 1 to 4 bytes of $t1 into memory, starting with effective memory byte address and continuing through the low-order byte of its word"
  },
  {
    "lineNumber": 362,
    "op": "swl",
    "source": "swl $t1,100000",
    "sourceTokens": [
      "swl",
      "$t1",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "swl RG1,VL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "swl",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Word Left : Store high-order 1 to 4 bytes of $t1 into memory, starting with effective memory byte address and continuing through the low-order byte of its word"
  },
  {
    "lineNumber": 363,
    "op": "swl",
    "source": "swl $t1,100($t2)",
    "sourceTokens": [
      "swl",
      "$t1",
      "100",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "ori $1, $0, VL2U",
      "addu $1, $1, RG4",
      "swl RG1, 0($1)"
    ],
    "defaultTemplateTokens": [
      [
        "ori",
        "$1",
        "$0",
        "VL2U"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "swl",
        "RG1",
        "0",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Word Left : Store high-order 1 to 4 bytes of $t1 into memory, starting with effective memory byte address and continuing through the low-order byte of its word"
  },
  {
    "lineNumber": 364,
    "op": "swl",
    "source": "swl $t1,100000($t2)",
    "sourceTokens": [
      "swl",
      "$t1",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "addu $1, $1, RG4",
      "swl RG1, VL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "swl",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Word Left : Store high-order 1 to 4 bytes of $t1 into memory, starting with effective memory byte address and continuing through the low-order byte of its word"
  },
  {
    "lineNumber": 365,
    "op": "swl",
    "source": "swl $t1,label",
    "sourceTokens": [
      "swl",
      "$t1",
      "label"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "swl RG1, LL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "swl",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [
      "swl RG1, LL2($0)"
    ],
    "compactTemplateTokens": [
      [
        "swl",
        "RG1",
        "LL2",
        "(",
        "$0",
        ")"
      ]
    ],
    "description": "Store Word Left : Store high-order 1 to 4 bytes of $t1 into memory, starting with effective memory byte address and continuing through the low-order byte of its word"
  },
  {
    "lineNumber": 366,
    "op": "swl",
    "source": "swl $t1,label($t2)",
    "sourceTokens": [
      "swl",
      "$t1",
      "label",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "addu $1, $1, RG4",
      "swl RG1, LL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "swl",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [
      "swl RG1, LL2(RG4)"
    ],
    "compactTemplateTokens": [
      [
        "swl",
        "RG1",
        "LL2",
        "(",
        "RG4",
        ")"
      ]
    ],
    "description": "Store Word Left : Store high-order 1 to 4 bytes of $t1 into memory, starting with effective memory byte address and continuing through the low-order byte of its word"
  },
  {
    "lineNumber": 367,
    "op": "swl",
    "source": "swl $t1,label+100000",
    "sourceTokens": [
      "swl",
      "$t1",
      "label",
      "+",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "swl RG1, LLP($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "swl",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Word Left : Store high-order 1 to 4 bytes of $t1 into memory, starting with effective memory byte address and continuing through the low-order byte of its word"
  },
  {
    "lineNumber": 368,
    "op": "swl",
    "source": "swl $t1,label+100000($t2)",
    "sourceTokens": [
      "swl",
      "$t1",
      "label",
      "+",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "addu $1, $1, RG6",
      "swl RG1, LLP($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG6"
      ],
      [
        "swl",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Word Left : Store high-order 1 to 4 bytes of $t1 into memory, starting with effective memory byte address and continuing through the low-order byte of its word"
  },
  {
    "lineNumber": 370,
    "op": "lwr",
    "source": "lwr $t1,($t2)",
    "sourceTokens": [
      "lwr",
      "$t1",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lwr RG1,0(RG3)"
    ],
    "defaultTemplateTokens": [
      [
        "lwr",
        "RG1",
        "0",
        "(",
        "RG3",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Word Right : Load from 1 to 4 bytes right-justified into $t1, starting with effective memory byte address and continuing through the high-order byte of its word"
  },
  {
    "lineNumber": 371,
    "op": "lwr",
    "source": "lwr $t1,-100",
    "sourceTokens": [
      "lwr",
      "$t1",
      "-100"
    ],
    "defaultTemplates": [
      "lwr RG1,VL2($0)"
    ],
    "defaultTemplateTokens": [
      [
        "lwr",
        "RG1",
        "VL2",
        "(",
        "$0",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Word Right : Load from 1 to 4 bytes right-justified into $t1, starting with effective memory byte address and continuing through the high-order byte of its word"
  },
  {
    "lineNumber": 372,
    "op": "lwr",
    "source": "lwr $t1,100",
    "sourceTokens": [
      "lwr",
      "$t1",
      "100"
    ],
    "defaultTemplates": [
      "ori $1, $0, VL2U",
      "lwr RG1, 0($1)"
    ],
    "defaultTemplateTokens": [
      [
        "ori",
        "$1",
        "$0",
        "VL2U"
      ],
      [
        "lwr",
        "RG1",
        "0",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Word Right : Load from 1 to 4 bytes right-justified into $t1, starting with effective memory byte address and continuing through the high-order byte of its word"
  },
  {
    "lineNumber": 373,
    "op": "lwr",
    "source": "lwr $t1,100000",
    "sourceTokens": [
      "lwr",
      "$t1",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "lwr RG1,VL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "lwr",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Word Right : Load from 1 to 4 bytes right-justified into $t1, starting with effective memory byte address and continuing through the high-order byte of its word"
  },
  {
    "lineNumber": 374,
    "op": "lwr",
    "source": "lwr $t1,100($t2)",
    "sourceTokens": [
      "lwr",
      "$t1",
      "100",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "ori $1, $0, VL2U",
      "addu $1, $1, RG4",
      "lwr RG1, 0($1)"
    ],
    "defaultTemplateTokens": [
      [
        "ori",
        "$1",
        "$0",
        "VL2U"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "lwr",
        "RG1",
        "0",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Word Right : Load from 1 to 4 bytes right-justified into $t1, starting with effective memory byte address and continuing through the high-order byte of its word"
  },
  {
    "lineNumber": 375,
    "op": "lwr",
    "source": "lwr $t1,100000($t2)",
    "sourceTokens": [
      "lwr",
      "$t1",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "addu $1, $1, RG4",
      "lwr RG1, VL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "lwr",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Word Right : Load from 1 to 4 bytes right-justified into $t1, starting with effective memory byte address and continuing through the high-order byte of its word"
  },
  {
    "lineNumber": 376,
    "op": "lwr",
    "source": "lwr $t1,label",
    "sourceTokens": [
      "lwr",
      "$t1",
      "label"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "lwr RG1, LL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "lwr",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [
      "lwr RG1, LL2($0)"
    ],
    "compactTemplateTokens": [
      [
        "lwr",
        "RG1",
        "LL2",
        "(",
        "$0",
        ")"
      ]
    ],
    "description": "Load Word Right : Load from 1 to 4 bytes right-justified into $t1, starting with effective memory byte address and continuing through the high-order byte of its word"
  },
  {
    "lineNumber": 377,
    "op": "lwr",
    "source": "lwr $t1,label($t2)",
    "sourceTokens": [
      "lwr",
      "$t1",
      "label",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "addu $1, $1, RG4",
      "lwr RG1, LL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "lwr",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [
      "lwr RG1, LL2(RG4)"
    ],
    "compactTemplateTokens": [
      [
        "lwr",
        "RG1",
        "LL2",
        "(",
        "RG4",
        ")"
      ]
    ],
    "description": "Load Word Right : Load from 1 to 4 bytes right-justified into $t1, starting with effective memory byte address and continuing through the high-order byte of its word"
  },
  {
    "lineNumber": 378,
    "op": "lwr",
    "source": "lwr $t1,label+100000",
    "sourceTokens": [
      "lwr",
      "$t1",
      "label",
      "+",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "lwr RG1, LLP($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "lwr",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Word Right : Load from 1 to 4 bytes right-justified into $t1, starting with effective memory byte address and continuing through the high-order byte of its word"
  },
  {
    "lineNumber": 379,
    "op": "lwr",
    "source": "lwr $t1,label+100000($t2)",
    "sourceTokens": [
      "lwr",
      "$t1",
      "label",
      "+",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "addu $1, $1, RG6",
      "lwr RG1, LLP($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG6"
      ],
      [
        "lwr",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Word Right : Load from 1 to 4 bytes right-justified into $t1, starting with effective memory byte address and continuing through the high-order byte of its word"
  },
  {
    "lineNumber": 381,
    "op": "swr",
    "source": "swr $t1,($t2)",
    "sourceTokens": [
      "swr",
      "$t1",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "swr RG1,0(RG3)"
    ],
    "defaultTemplateTokens": [
      [
        "swr",
        "RG1",
        "0",
        "(",
        "RG3",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Word Right : Store low-order 1 to 4 bytes of $t1 into memory, starting with high-order byte of word containing effective memory byte address and continuing through that byte address"
  },
  {
    "lineNumber": 382,
    "op": "swr",
    "source": "swr $t1,-100",
    "sourceTokens": [
      "swr",
      "$t1",
      "-100"
    ],
    "defaultTemplates": [
      "swr RG1,VL2($0)"
    ],
    "defaultTemplateTokens": [
      [
        "swr",
        "RG1",
        "VL2",
        "(",
        "$0",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Word Right : Store low-order 1 to 4 bytes of $t1 into memory, starting with high-order byte of word containing effective memory byte address and continuing through that byte address"
  },
  {
    "lineNumber": 383,
    "op": "swr",
    "source": "swr $t1,100",
    "sourceTokens": [
      "swr",
      "$t1",
      "100"
    ],
    "defaultTemplates": [
      "ori $1, $0, VL2U",
      "swr RG1, 0"
    ],
    "defaultTemplateTokens": [
      [
        "ori",
        "$1",
        "$0",
        "VL2U"
      ],
      [
        "swr",
        "RG1",
        "0"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Word Right : Store low-order 1 to 4 bytes of $t1 into memory, starting with high-order byte of word containing effective memory byte address and continuing through that byte address"
  },
  {
    "lineNumber": 384,
    "op": "swr",
    "source": "swr $t1,100000",
    "sourceTokens": [
      "swr",
      "$t1",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "swr RG1,VL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "swr",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Word Right : Store low-order 1 to 4 bytes of $t1 into memory, starting with high-order byte of word containing effective memory byte address and continuing through that byte address"
  },
  {
    "lineNumber": 385,
    "op": "swr",
    "source": "swr $t1,100($t2)",
    "sourceTokens": [
      "swr",
      "$t1",
      "100",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "ori $1, $0, VL2U",
      "addu $1, $1, RG4",
      "swr RG1, 0($1)"
    ],
    "defaultTemplateTokens": [
      [
        "ori",
        "$1",
        "$0",
        "VL2U"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "swr",
        "RG1",
        "0",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Word Right : Store low-order 1 to 4 bytes of $t1 into memory, starting with high-order byte of word containing effective memory byte address and continuing through that byte address"
  },
  {
    "lineNumber": 386,
    "op": "swr",
    "source": "swr $t1,100000($t2)",
    "sourceTokens": [
      "swr",
      "$t1",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "addu $1, $1, RG4",
      "swr RG1, VL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "swr",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Word Right : Store low-order 1 to 4 bytes of $t1 into memory, starting with high-order byte of word containing effective memory byte address and continuing through that byte address"
  },
  {
    "lineNumber": 387,
    "op": "swr",
    "source": "swr $t1,label",
    "sourceTokens": [
      "swr",
      "$t1",
      "label"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "swr RG1, LL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "swr",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [
      "swr RG1, LL2($0)"
    ],
    "compactTemplateTokens": [
      [
        "swr",
        "RG1",
        "LL2",
        "(",
        "$0",
        ")"
      ]
    ],
    "description": "Store Word Right : Store low-order 1 to 4 bytes of $t1 into memory, starting with high-order byte of word containing effective memory byte address and continuing through that byte address"
  },
  {
    "lineNumber": 388,
    "op": "swr",
    "source": "swr $t1,label($t2)",
    "sourceTokens": [
      "swr",
      "$t1",
      "label",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "addu $1, $1, RG4",
      "swr RG1, LL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "swr",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [
      "swr RG1, LL2(RG4)"
    ],
    "compactTemplateTokens": [
      [
        "swr",
        "RG1",
        "LL2",
        "(",
        "RG4",
        ")"
      ]
    ],
    "description": "Store Word Right : Store low-order 1 to 4 bytes of $t1 into memory, starting with high-order byte of word containing effective memory byte address and continuing through that byte address"
  },
  {
    "lineNumber": 389,
    "op": "swr",
    "source": "swr $t1,label+100000",
    "sourceTokens": [
      "swr",
      "$t1",
      "label",
      "+",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "swr RG1, LLP($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "swr",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Word Right : Store low-order 1 to 4 bytes of $t1 into memory, starting with high-order byte of word containing effective memory byte address and continuing through that byte address"
  },
  {
    "lineNumber": 390,
    "op": "swr",
    "source": "swr $t1,label+100000($t2)",
    "sourceTokens": [
      "swr",
      "$t1",
      "label",
      "+",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "addu $1, $1, RG6",
      "swr RG1, LLP($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG6"
      ],
      [
        "swr",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Word Right : Store low-order 1 to 4 bytes of $t1 into memory, starting with high-order byte of word containing effective memory byte address and continuing through that byte address"
  },
  {
    "lineNumber": 392,
    "op": "ll",
    "source": "ll $t1,($t2)",
    "sourceTokens": [
      "ll",
      "$t1",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "ll RG1,0(RG3)"
    ],
    "defaultTemplateTokens": [
      [
        "ll",
        "RG1",
        "0",
        "(",
        "RG3",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Linked : Paired with Store Conditional (sc) to perform atomic read-modify-write.  Treated as equivalent to Load Word (lw) because MARS does not simulate multiple processors."
  },
  {
    "lineNumber": 393,
    "op": "ll",
    "source": "ll $t1,-100",
    "sourceTokens": [
      "ll",
      "$t1",
      "-100"
    ],
    "defaultTemplates": [
      "ll RG1,VL2($0)"
    ],
    "defaultTemplateTokens": [
      [
        "ll",
        "RG1",
        "VL2",
        "(",
        "$0",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Linked : Paired with Store Conditional (sc) to perform atomic read-modify-write.  Treated as equivalent to Load Word (lw) because MARS does not simulate multiple processors."
  },
  {
    "lineNumber": 394,
    "op": "ll",
    "source": "ll $t1,100",
    "sourceTokens": [
      "ll",
      "$t1",
      "100"
    ],
    "defaultTemplates": [
      "ori $1, $0, VL2U",
      "ll RG1, 0($1)"
    ],
    "defaultTemplateTokens": [
      [
        "ori",
        "$1",
        "$0",
        "VL2U"
      ],
      [
        "ll",
        "RG1",
        "0",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Linked : Paired with Store Conditional (sc) to perform atomic read-modify-write.  Treated as equivalent to Load Word (lw) because MARS does not simulate multiple processors."
  },
  {
    "lineNumber": 395,
    "op": "ll",
    "source": "ll $t1,100000",
    "sourceTokens": [
      "ll",
      "$t1",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "ll RG1,VL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "ll",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Linked : Paired with Store Conditional (sc) to perform atomic read-modify-write.  Treated as equivalent to Load Word (lw) because MARS does not simulate multiple processors."
  },
  {
    "lineNumber": 396,
    "op": "ll",
    "source": "ll $t1,100($t2)",
    "sourceTokens": [
      "ll",
      "$t1",
      "100",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "ori $1, $0, VL2U",
      "addu $1, $1, RG4",
      "ll RG1, 0($1)"
    ],
    "defaultTemplateTokens": [
      [
        "ori",
        "$1",
        "$0",
        "VL2U"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "ll",
        "RG1",
        "0",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Linked : Paired with Store Conditional (sc) to perform atomic read-modify-write.  Treated as equivalent to Load Word (lw) because MARS does not simulate multiple processors."
  },
  {
    "lineNumber": 397,
    "op": "ll",
    "source": "ll $t1,100000($t2)",
    "sourceTokens": [
      "ll",
      "$t1",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "addu $1, $1, RG4",
      "ll RG1, VL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "ll",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Linked : Paired with Store Conditional (sc) to perform atomic read-modify-write.  Treated as equivalent to Load Word (lw) because MARS does not simulate multiple processors."
  },
  {
    "lineNumber": 398,
    "op": "ll",
    "source": "ll $t1,label",
    "sourceTokens": [
      "ll",
      "$t1",
      "label"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "ll RG1, LL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "ll",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [
      "ll RG1, LL2($0)"
    ],
    "compactTemplateTokens": [
      [
        "ll",
        "RG1",
        "LL2",
        "(",
        "$0",
        ")"
      ]
    ],
    "description": "Load Linked : Paired with Store Conditional (sc) to perform atomic read-modify-write.  Treated as equivalent to Load Word (lw) because MARS does not simulate multiple processors."
  },
  {
    "lineNumber": 399,
    "op": "ll",
    "source": "ll $t1,label($t2)",
    "sourceTokens": [
      "ll",
      "$t1",
      "label",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "addu $1, $1, RG4",
      "ll RG1, LL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "ll",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [
      "ll RG1, LL2(RG4)"
    ],
    "compactTemplateTokens": [
      [
        "ll",
        "RG1",
        "LL2",
        "(",
        "RG4",
        ")"
      ]
    ],
    "description": "Load Linked : Paired with Store Conditional (sc) to perform atomic read-modify-write.  Treated as equivalent to Load Word (lw) because MARS does not simulate multiple processors."
  },
  {
    "lineNumber": 400,
    "op": "ll",
    "source": "ll $t1,label+100000",
    "sourceTokens": [
      "ll",
      "$t1",
      "label",
      "+",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "ll RG1, LLP($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "ll",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Linked : Paired with Store Conditional (sc) to perform atomic read-modify-write.  Treated as equivalent to Load Word (lw) because MARS does not simulate multiple processors."
  },
  {
    "lineNumber": 401,
    "op": "ll",
    "source": "ll $t1,label+100000($t2)",
    "sourceTokens": [
      "ll",
      "$t1",
      "label",
      "+",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "addu $1, $1, RG6",
      "ll RG1, LLP($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG6"
      ],
      [
        "ll",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Linked : Paired with Store Conditional (sc) to perform atomic read-modify-write.  Treated as equivalent to Load Word (lw) because MARS does not simulate multiple processors."
  },
  {
    "lineNumber": 403,
    "op": "sc",
    "source": "sc $t1,($t2)",
    "sourceTokens": [
      "sc",
      "$t1",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "sc RG1,0(RG3)"
    ],
    "defaultTemplateTokens": [
      [
        "sc",
        "RG1",
        "0",
        "(",
        "RG3",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Conditional : Paired with Load Linked (ll) to perform atomic read-modify-write.  Treated as equivalent to Store Word (sw) because MARS does not simulate multiple processors."
  },
  {
    "lineNumber": 404,
    "op": "sc",
    "source": "sc $t1,-100",
    "sourceTokens": [
      "sc",
      "$t1",
      "-100"
    ],
    "defaultTemplates": [
      "sc RG1,VL2($0)"
    ],
    "defaultTemplateTokens": [
      [
        "sc",
        "RG1",
        "VL2",
        "(",
        "$0",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Conditional : Paired with Load Linked (ll) to perform atomic read-modify-write.  Treated as equivalent to Store Word (sw) because MARS does not simulate multiple processors."
  },
  {
    "lineNumber": 405,
    "op": "sc",
    "source": "sc $t1,100",
    "sourceTokens": [
      "sc",
      "$t1",
      "100"
    ],
    "defaultTemplates": [
      "ori $1, $0, VL2U",
      "sc RG1, 0($1)"
    ],
    "defaultTemplateTokens": [
      [
        "ori",
        "$1",
        "$0",
        "VL2U"
      ],
      [
        "sc",
        "RG1",
        "0",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Conditional : Paired with Load Linked (ll) to perform atomic read-modify-write.  Treated as equivalent to Store Word (sw) because MARS does not simulate multiple processors."
  },
  {
    "lineNumber": 406,
    "op": "sc",
    "source": "sc $t1,100000",
    "sourceTokens": [
      "sc",
      "$t1",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "sc RG1,VL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "sc",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Conditional : Paired with Load Linked (ll) to perform atomic read-modify-write.  Treated as equivalent to Store Word (sw) because MARS does not simulate multiple processors."
  },
  {
    "lineNumber": 407,
    "op": "sc",
    "source": "sc $t1,100($t2)",
    "sourceTokens": [
      "sc",
      "$t1",
      "100",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "ori $1, $0, VL2U",
      "addu $1, $1, RG4",
      "sc RG1, 0($1)"
    ],
    "defaultTemplateTokens": [
      [
        "ori",
        "$1",
        "$0",
        "VL2U"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "sc",
        "RG1",
        "0",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Conditional : Paired with Load Linked (ll) to perform atomic read-modify-write.  Treated as equivalent to Store Word (sw) because MARS does not simulate multiple processors."
  },
  {
    "lineNumber": 408,
    "op": "sc",
    "source": "sc $t1,100000($t2)",
    "sourceTokens": [
      "sc",
      "$t1",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "addu $1, $1, RG4",
      "sc RG1, VL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "sc",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Conditional : Paired with Load Linked (ll) to perform atomic read-modify-write.  Treated as equivalent to Store Word (sw) because MARS does not simulate multiple processors."
  },
  {
    "lineNumber": 409,
    "op": "sc",
    "source": "sc $t1,label",
    "sourceTokens": [
      "sc",
      "$t1",
      "label"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "sc RG1, LL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "sc",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [
      "sc RG1, LL2($0)"
    ],
    "compactTemplateTokens": [
      [
        "sc",
        "RG1",
        "LL2",
        "(",
        "$0",
        ")"
      ]
    ],
    "description": "Store Conditional : Paired with Load Linked (ll) to perform atomic read-modify-write.  Treated as equivalent to Store Word (sw) because MARS does not simulate multiple processors."
  },
  {
    "lineNumber": 410,
    "op": "sc",
    "source": "sc $t1,label($t2)",
    "sourceTokens": [
      "sc",
      "$t1",
      "label",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "addu $1, $1, RG4",
      "sc RG1, LL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "sc",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [
      "sc RG1, LL2(RG4)"
    ],
    "compactTemplateTokens": [
      [
        "sc",
        "RG1",
        "LL2",
        "(",
        "RG4",
        ")"
      ]
    ],
    "description": "Store Conditional : Paired with Load Linked (ll) to perform atomic read-modify-write.  Treated as equivalent to Store Word (sw) because MARS does not simulate multiple processors."
  },
  {
    "lineNumber": 411,
    "op": "sc",
    "source": "sc $t1,label+100000",
    "sourceTokens": [
      "sc",
      "$t1",
      "label",
      "+",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "sc RG1, LLP($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "sc",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Conditional : Paired with Load Linked (ll) to perform atomic read-modify-write.  Treated as equivalent to Store Word (sw) because MARS does not simulate multiple processors."
  },
  {
    "lineNumber": 412,
    "op": "sc",
    "source": "sc $t1,label+100000($t2)",
    "sourceTokens": [
      "sc",
      "$t1",
      "label",
      "+",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "addu $1, $1, RG6",
      "sc RG1, LLP($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG6"
      ],
      [
        "sc",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Conditional : Paired with Load Linked (ll) to perform atomic read-modify-write.  Treated as equivalent to Store Word (sw) because MARS does not simulate multiple processors."
  },
  {
    "lineNumber": 434,
    "op": "ulw",
    "source": "ulw $t1,-100($t2)",
    "sourceTokens": [
      "ulw",
      "$t1",
      "-100",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, VH2P3",
      "addu $1, $1, RG4",
      "lwl RG1, VL2P3($1)",
      "lwr RG1, VL2(RG4)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2P3"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "lwl",
        "RG1",
        "VL2P3",
        "(",
        "$1",
        ")"
      ],
      [
        "lwr",
        "RG1",
        "VL2",
        "(",
        "RG4",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Unaligned Load Word : Set $t1 to the 32 bits starting at effective memory byte address"
  },
  {
    "lineNumber": 435,
    "op": "ulh",
    "source": "ulh $t1,-100($t2)",
    "sourceTokens": [
      "ulh",
      "$t1",
      "-100",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, VH2P1",
      "addu $1, $1, RG4",
      "lb RG1, VL2P1($1)",
      "lbu $1, VL2(RG4)",
      "sll RG1, RG1, 8",
      "or RG1, RG1, $1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2P1"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "lb",
        "RG1",
        "VL2P1",
        "(",
        "$1",
        ")"
      ],
      [
        "lbu",
        "$1",
        "VL2",
        "(",
        "RG4",
        ")"
      ],
      [
        "sll",
        "RG1",
        "RG1",
        "8"
      ],
      [
        "or",
        "RG1",
        "RG1",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Unaligned Load Halfword : Set $t1 to the 16 bits, sign-extended, starting at effective memory byte address"
  },
  {
    "lineNumber": 436,
    "op": "ulhu",
    "source": "ulhu $t1,-100($t2)",
    "sourceTokens": [
      "ulhu",
      "$t1",
      "-100",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, VH2P1",
      "addu $1, $1, RG4",
      "lbu RG1, VL2P1($1)",
      "lbu $1, VL2(RG4)",
      "sll RG1, RG1, 8",
      "or RG1, RG1, $1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2P1"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "lbu",
        "RG1",
        "VL2P1",
        "(",
        "$1",
        ")"
      ],
      [
        "lbu",
        "$1",
        "VL2",
        "(",
        "RG4",
        ")"
      ],
      [
        "sll",
        "RG1",
        "RG1",
        "8"
      ],
      [
        "or",
        "RG1",
        "RG1",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Unaligned Load Halfword : Set $t1 to the 16 bits, zero-extended, starting at effective memory byte address"
  },
  {
    "lineNumber": 437,
    "op": "ld",
    "source": "ld $t1,-100($t2)",
    "sourceTokens": [
      "ld",
      "$t1",
      "-100",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lw RG1, VL2(RG4)",
      "lui $1, VH2P4",
      "addu $1, $1, RG4",
      "lw NR1, VL2P4($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lw",
        "RG1",
        "VL2",
        "(",
        "RG4",
        ")"
      ],
      [
        "lui",
        "$1",
        "VH2P4"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "lw",
        "NR1",
        "VL2P4",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Doubleword : Set $t1 and the next register to the 64 bits starting at effective memory byte address"
  },
  {
    "lineNumber": 438,
    "op": "usw",
    "source": "usw $t1,-100($t2)",
    "sourceTokens": [
      "usw",
      "$t1",
      "-100",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, VH2P3",
      "addu $1, $1, RG4",
      "swl RG1, VL2P3($1)",
      "swr RG1, VL2(RG4)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2P3"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "swl",
        "RG1",
        "VL2P3",
        "(",
        "$1",
        ")"
      ],
      [
        "swr",
        "RG1",
        "VL2",
        "(",
        "RG4",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Unaligned Store Word : Store $t1 contents into the 32 bits starting at effective memory byte address"
  },
  {
    "lineNumber": 439,
    "op": "ush",
    "source": "ush $t1,-100($t2)",
    "sourceTokens": [
      "ush",
      "$t1",
      "-100",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "sb RG1, VL2(RG4)",
      "sll $1, RG1, 24",
      "srl RG1, RG1, 8",
      "or RG1, RG1, $1",
      "lui $1, VH2P1",
      "addu $1, $1, RG4",
      "sb RG1, VL2P1($1)",
      "srl $1, RG1, 24",
      "sll RG1, RG1, 8",
      "or RG1, RG1, $1"
    ],
    "defaultTemplateTokens": [
      [
        "sb",
        "RG1",
        "VL2",
        "(",
        "RG4",
        ")"
      ],
      [
        "sll",
        "$1",
        "RG1",
        "24"
      ],
      [
        "srl",
        "RG1",
        "RG1",
        "8"
      ],
      [
        "or",
        "RG1",
        "RG1",
        "$1"
      ],
      [
        "lui",
        "$1",
        "VH2P1"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "sb",
        "RG1",
        "VL2P1",
        "(",
        "$1",
        ")"
      ],
      [
        "srl",
        "$1",
        "RG1",
        "24"
      ],
      [
        "sll",
        "RG1",
        "RG1",
        "8"
      ],
      [
        "or",
        "RG1",
        "RG1",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Unaligned Store Halfword: Store low-order halfword $t1 contents into the 16 bits starting at effective memory byte address"
  },
  {
    "lineNumber": 440,
    "op": "sd",
    "source": "sd $t1,-100($t2)",
    "sourceTokens": [
      "sd",
      "$t1",
      "-100",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "sw RG1, VL2(RG4)",
      "lui $1, VH2P4",
      "addu $1, $1, RG4",
      "sw NR1, VL2P4($1)"
    ],
    "defaultTemplateTokens": [
      [
        "sw",
        "RG1",
        "VL2",
        "(",
        "RG4",
        ")"
      ],
      [
        "lui",
        "$1",
        "VH2P4"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "sw",
        "NR1",
        "VL2P4",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Doubleword : Store contents of $t1 and the next register to the 64 bits starting at effective memory byte address"
  },
  {
    "lineNumber": 444,
    "op": "ulw",
    "source": "ulw $t1,100000",
    "sourceTokens": [
      "ulw",
      "$t1",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VH2P3",
      "lwl RG1, VL2P3($1)",
      "lui $1, VH2",
      "lwr RG1, VL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2P3"
      ],
      [
        "lwl",
        "RG1",
        "VL2P3",
        "(",
        "$1",
        ")"
      ],
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "lwr",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Unaligned Load Word : Set $t1 to the 32 bits starting at effective memory byte address"
  },
  {
    "lineNumber": 445,
    "op": "ulw",
    "source": "ulw $t1,label",
    "sourceTokens": [
      "ulw",
      "$t1",
      "label"
    ],
    "defaultTemplates": [
      "lui $1, LH2P3",
      "lwl RG1, LL2P3($1)",
      "lui $1, LH2",
      "lwr RG1, LL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2P3"
      ],
      [
        "lwl",
        "RG1",
        "LL2P3",
        "(",
        "$1",
        ")"
      ],
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "lwr",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Unaligned Load Word : Set $t1 to the 32 bits starting at effective memory byte address"
  },
  {
    "lineNumber": 446,
    "op": "ulw",
    "source": "ulw $t1,label+100000",
    "sourceTokens": [
      "ulw",
      "$t1",
      "label",
      "+",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, LHPAP3",
      "lwl RG1, LLPP3($1)",
      "lui $1, LHPA",
      "lwr RG1, LLP($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPAP3"
      ],
      [
        "lwl",
        "RG1",
        "LLPP3",
        "(",
        "$1",
        ")"
      ],
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "lwr",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Unaligned Load Word : Set $t1 to the 32 bits starting at effective memory byte address"
  },
  {
    "lineNumber": 447,
    "op": "ulw",
    "source": "ulw $t1,($t2)",
    "sourceTokens": [
      "ulw",
      "$t1",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lwl RG1, 3(RG3)",
      "lwr RG1, 0(RG3)"
    ],
    "defaultTemplateTokens": [
      [
        "lwl",
        "RG1",
        "3",
        "(",
        "RG3",
        ")"
      ],
      [
        "lwr",
        "RG1",
        "0",
        "(",
        "RG3",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Unaligned Load Word : Set $t1 to the 32 bits starting at effective memory byte address"
  },
  {
    "lineNumber": 448,
    "op": "ulw",
    "source": "ulw $t1,100000($t2)",
    "sourceTokens": [
      "ulw",
      "$t1",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, VH2P3",
      "addu $1, $1, RG4",
      "lwl RG1, VL2P3($1)",
      "lui $1, VH2",
      "addu $1, $1, RG4",
      "lwr RG1, VL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2P3"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "lwl",
        "RG1",
        "VL2P3",
        "(",
        "$1",
        ")"
      ],
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "lwr",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Unaligned Load Word : Set $t1 to the 32 bits starting at effective memory byte address"
  },
  {
    "lineNumber": 449,
    "op": "ulw",
    "source": "ulw $t1,label($t2)",
    "sourceTokens": [
      "ulw",
      "$t1",
      "label",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LH2P3",
      "addu $1, $1, RG4",
      "lwl RG1, LL2P3($1)",
      "lui $1, LH2",
      "addu $1, $1, RG4",
      "lwr RG1, LL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2P3"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "lwl",
        "RG1",
        "LL2P3",
        "(",
        "$1",
        ")"
      ],
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "lwr",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Unaligned Load Word : Set $t1 to the 32 bits starting at effective memory byte address"
  },
  {
    "lineNumber": 450,
    "op": "ulw",
    "source": "ulw $t1,label+100000($t2)",
    "sourceTokens": [
      "ulw",
      "$t1",
      "label",
      "+",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LHPAP3",
      "addu $1, $1, RG6",
      "lwl RG1, LLPP3($1)",
      "lui $1, LHPA",
      "addu $1, $1, RG6",
      "lwr RG1, LLP($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPAP3"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG6"
      ],
      [
        "lwl",
        "RG1",
        "LLPP3",
        "(",
        "$1",
        ")"
      ],
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG6"
      ],
      [
        "lwr",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Unaligned Load Word : Set $t1 to the 32 bits starting at effective memory byte address"
  },
  {
    "lineNumber": 452,
    "op": "ulh",
    "source": "ulh $t1,100000",
    "sourceTokens": [
      "ulh",
      "$t1",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VH2P1",
      "lb RG1, VL2P1($1)",
      "lui $1, VH2",
      "lbu $1, VL2($1)",
      "sll RG1, RG1, 8",
      "or RG1, RG1, $1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2P1"
      ],
      [
        "lb",
        "RG1",
        "VL2P1",
        "(",
        "$1",
        ")"
      ],
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "lbu",
        "$1",
        "VL2",
        "(",
        "$1",
        ")"
      ],
      [
        "sll",
        "RG1",
        "RG1",
        "8"
      ],
      [
        "or",
        "RG1",
        "RG1",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Unaligned Load Halfword : Set $t1 to the 16 bits, sign-extended, starting at effective memory byte address"
  },
  {
    "lineNumber": 453,
    "op": "ulh",
    "source": "ulh $t1,label",
    "sourceTokens": [
      "ulh",
      "$t1",
      "label"
    ],
    "defaultTemplates": [
      "lui $1, LH2P1",
      "lb RG1, LL2P1($1)",
      "lui $1, LH2",
      "lbu $1, LL2($1)",
      "sll RG1, RG1, 8",
      "or RG1, RG1, $1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2P1"
      ],
      [
        "lb",
        "RG1",
        "LL2P1",
        "(",
        "$1",
        ")"
      ],
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "lbu",
        "$1",
        "LL2",
        "(",
        "$1",
        ")"
      ],
      [
        "sll",
        "RG1",
        "RG1",
        "8"
      ],
      [
        "or",
        "RG1",
        "RG1",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Unaligned Load Halfword : Set $t1 to the 16 bits, sign-extended, starting at effective memory byte address"
  },
  {
    "lineNumber": 454,
    "op": "ulh",
    "source": "ulh $t1,label+100000",
    "sourceTokens": [
      "ulh",
      "$t1",
      "label",
      "+",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, LHPAP1",
      "lb RG1, LLPP1($1)",
      "lui $1, LHPA",
      "lbu $1, LLP($1)",
      "sll RG1, RG1, 8",
      "or RG1, RG1, $1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPAP1"
      ],
      [
        "lb",
        "RG1",
        "LLPP1",
        "(",
        "$1",
        ")"
      ],
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "lbu",
        "$1",
        "LLP",
        "(",
        "$1",
        ")"
      ],
      [
        "sll",
        "RG1",
        "RG1",
        "8"
      ],
      [
        "or",
        "RG1",
        "RG1",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Unaligned Load Halfword : Set $t1 to the 16 bits, sign-extended, starting at effective memory byte address"
  },
  {
    "lineNumber": 455,
    "op": "ulh",
    "source": "ulh $t1,($t2)",
    "sourceTokens": [
      "ulh",
      "$t1",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lb RG1, 1(RG3)",
      "lbu $1, 0(RG3)",
      "sll RG1, RG1, 8",
      "or RG1, RG1, $1"
    ],
    "defaultTemplateTokens": [
      [
        "lb",
        "RG1",
        "1",
        "(",
        "RG3",
        ")"
      ],
      [
        "lbu",
        "$1",
        "0",
        "(",
        "RG3",
        ")"
      ],
      [
        "sll",
        "RG1",
        "RG1",
        "8"
      ],
      [
        "or",
        "RG1",
        "RG1",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Unaligned Load Halfword : Set $t1 to the 16 bits, sign-extended, starting at effective memory byte address"
  },
  {
    "lineNumber": 456,
    "op": "ulh",
    "source": "ulh $t1,100000($t2)",
    "sourceTokens": [
      "ulh",
      "$t1",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, VH2P1",
      "addu $1, $1, RG4",
      "lb RG1, VL2P1($1)",
      "lui $1, VH2",
      "addu $1, $1, RG4",
      "lbu $1, VL2($1)",
      "sll RG1, RG1, 8",
      "or RG1, RG1, $1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2P1"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "lb",
        "RG1",
        "VL2P1",
        "(",
        "$1",
        ")"
      ],
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "lbu",
        "$1",
        "VL2",
        "(",
        "$1",
        ")"
      ],
      [
        "sll",
        "RG1",
        "RG1",
        "8"
      ],
      [
        "or",
        "RG1",
        "RG1",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Unaligned Load Halfword : Set $t1 to the 16 bits, sign-extended, starting at effective memory byte address"
  },
  {
    "lineNumber": 457,
    "op": "ulh",
    "source": "ulh $t1,label($t2)",
    "sourceTokens": [
      "ulh",
      "$t1",
      "label",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LH2P1",
      "addu $1, $1, RG4",
      "lb RG1, LL2P1($1)",
      "lui $1, LH2",
      "addu $1, $1, RG4",
      "lbu $1, LL2($1)",
      "sll RG1, RG1, 8",
      "or RG1, RG1, $1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2P1"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "lb",
        "RG1",
        "LL2P1",
        "(",
        "$1",
        ")"
      ],
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "lbu",
        "$1",
        "LL2",
        "(",
        "$1",
        ")"
      ],
      [
        "sll",
        "RG1",
        "RG1",
        "8"
      ],
      [
        "or",
        "RG1",
        "RG1",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Unaligned Load Halfword : Set $t1 to the 16 bits, sign-extended, starting at effective memory byte address"
  },
  {
    "lineNumber": 458,
    "op": "ulh",
    "source": "ulh $t1,label+100000($t2)",
    "sourceTokens": [
      "ulh",
      "$t1",
      "label",
      "+",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LHPAP1",
      "addu $1, $1, RG6",
      "lb RG1, LLPP1($1)",
      "lui $1, LHPA",
      "addu $1, $1, RG6",
      "lbu $1, LLP($1)",
      "sll RG1, RG1, 8",
      "or RG1, RG1, $1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPAP1"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG6"
      ],
      [
        "lb",
        "RG1",
        "LLPP1",
        "(",
        "$1",
        ")"
      ],
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG6"
      ],
      [
        "lbu",
        "$1",
        "LLP",
        "(",
        "$1",
        ")"
      ],
      [
        "sll",
        "RG1",
        "RG1",
        "8"
      ],
      [
        "or",
        "RG1",
        "RG1",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Unaligned Load Halfword : Set $t1 to the 16 bits, sign-extended, starting at effective memory byte address"
  },
  {
    "lineNumber": 460,
    "op": "ulhu",
    "source": "ulhu $t1,100000",
    "sourceTokens": [
      "ulhu",
      "$t1",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VH2P1",
      "lbu RG1, VL2P1($1)",
      "lui $1, VH2",
      "lbu $1, VL2($1)",
      "sll RG1, RG1, 8",
      "or RG1, RG1, $1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2P1"
      ],
      [
        "lbu",
        "RG1",
        "VL2P1",
        "(",
        "$1",
        ")"
      ],
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "lbu",
        "$1",
        "VL2",
        "(",
        "$1",
        ")"
      ],
      [
        "sll",
        "RG1",
        "RG1",
        "8"
      ],
      [
        "or",
        "RG1",
        "RG1",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Unaligned Load Halfword : Set $t1 to the 16 bits, zero-extended, starting at effective memory byte address"
  },
  {
    "lineNumber": 461,
    "op": "ulhu",
    "source": "ulhu $t1,label",
    "sourceTokens": [
      "ulhu",
      "$t1",
      "label"
    ],
    "defaultTemplates": [
      "lui $1, LH2P1",
      "lbu RG1, LL2P1($1)",
      "lui $1, LH2",
      "lbu $1, LL2($1)",
      "sll RG1, RG1, 8",
      "or RG1, RG1, $1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2P1"
      ],
      [
        "lbu",
        "RG1",
        "LL2P1",
        "(",
        "$1",
        ")"
      ],
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "lbu",
        "$1",
        "LL2",
        "(",
        "$1",
        ")"
      ],
      [
        "sll",
        "RG1",
        "RG1",
        "8"
      ],
      [
        "or",
        "RG1",
        "RG1",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Unaligned Load Halfword : Set $t1 to the 16 bits, zero-extended, starting at effective memory byte address"
  },
  {
    "lineNumber": 462,
    "op": "ulhu",
    "source": "ulhu $t1,label+100000",
    "sourceTokens": [
      "ulhu",
      "$t1",
      "label",
      "+",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, LHPAP1",
      "lbu RG1, LLPP1($1)",
      "lui $1, LHPA",
      "lbu $1, LLP($1)",
      "sll RG1, RG1, 8",
      "or RG1, RG1, $1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPAP1"
      ],
      [
        "lbu",
        "RG1",
        "LLPP1",
        "(",
        "$1",
        ")"
      ],
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "lbu",
        "$1",
        "LLP",
        "(",
        "$1",
        ")"
      ],
      [
        "sll",
        "RG1",
        "RG1",
        "8"
      ],
      [
        "or",
        "RG1",
        "RG1",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Unaligned Load Halfword : Set $t1 to the 16 bits, zero-extended, starting at effective memory byte address"
  },
  {
    "lineNumber": 463,
    "op": "ulhu",
    "source": "ulhu $t1,($t2)",
    "sourceTokens": [
      "ulhu",
      "$t1",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lbu RG1, 1(RG3)",
      "lbu $1, 0(RG3)",
      "sll RG1, RG1, 8",
      "or RG1, RG1, $1"
    ],
    "defaultTemplateTokens": [
      [
        "lbu",
        "RG1",
        "1",
        "(",
        "RG3",
        ")"
      ],
      [
        "lbu",
        "$1",
        "0",
        "(",
        "RG3",
        ")"
      ],
      [
        "sll",
        "RG1",
        "RG1",
        "8"
      ],
      [
        "or",
        "RG1",
        "RG1",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Unaligned Load Halfword : Set $t1 to the 16 bits, zero-extended, starting at effective memory byte address"
  },
  {
    "lineNumber": 464,
    "op": "ulhu",
    "source": "ulhu $t1,100000($t2)",
    "sourceTokens": [
      "ulhu",
      "$t1",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, VH2P1",
      "addu $1, $1, RG4",
      "lbu RG1, VL2P1($1)",
      "lui $1, VH2",
      "addu $1, $1, RG4",
      "lbu $1, VL2($1)",
      "sll RG1, RG1, 8",
      "or RG1, RG1, $1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2P1"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "lbu",
        "RG1",
        "VL2P1",
        "(",
        "$1",
        ")"
      ],
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "lbu",
        "$1",
        "VL2",
        "(",
        "$1",
        ")"
      ],
      [
        "sll",
        "RG1",
        "RG1",
        "8"
      ],
      [
        "or",
        "RG1",
        "RG1",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Unaligned Load Halfword : Set $t1 to the 16 bits, zero-extended, starting at effective memory byte address"
  },
  {
    "lineNumber": 465,
    "op": "ulhu",
    "source": "ulhu $t1,label($t2)",
    "sourceTokens": [
      "ulhu",
      "$t1",
      "label",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LH2P1",
      "addu $1, $1, RG4",
      "lbu RG1, LL2P1($1)",
      "lui $1, LH2",
      "addu $1, $1, RG4",
      "lbu $1, LL2($1)",
      "sll RG1, RG1, 8",
      "or RG1, RG1, $1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2P1"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "lbu",
        "RG1",
        "LL2P1",
        "(",
        "$1",
        ")"
      ],
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "lbu",
        "$1",
        "LL2",
        "(",
        "$1",
        ")"
      ],
      [
        "sll",
        "RG1",
        "RG1",
        "8"
      ],
      [
        "or",
        "RG1",
        "RG1",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Unaligned Load Halfword : Set $t1 to the 16 bits, zero-extended, starting at effective memory byte address"
  },
  {
    "lineNumber": 466,
    "op": "ulhu",
    "source": "ulhu $t1,label+100000($t2)",
    "sourceTokens": [
      "ulhu",
      "$t1",
      "label",
      "+",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LHPAP1",
      "addu $1, $1, RG6",
      "lbu RG1, LLPP1($1)",
      "lui $1, LHPA",
      "addu $1, $1, RG6",
      "lbu $1, LLP($1)",
      "sll RG1, RG1, 8",
      "or RG1, RG1, $1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPAP1"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG6"
      ],
      [
        "lbu",
        "RG1",
        "LLPP1",
        "(",
        "$1",
        ")"
      ],
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG6"
      ],
      [
        "lbu",
        "$1",
        "LLP",
        "(",
        "$1",
        ")"
      ],
      [
        "sll",
        "RG1",
        "RG1",
        "8"
      ],
      [
        "or",
        "RG1",
        "RG1",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Unaligned Load Halfword : Set $t1 to the 16 bits, zero-extended, starting at effective memory byte address"
  },
  {
    "lineNumber": 468,
    "op": "ld",
    "source": "ld $t1,100000",
    "sourceTokens": [
      "ld",
      "$t1",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "lw RG1, VL2($1)",
      "lui $1, VH2P4",
      "lw NR1, VL2P4($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "lw",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ],
      [
        "lui",
        "$1",
        "VH2P4"
      ],
      [
        "lw",
        "NR1",
        "VL2P4",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Doubleword : Set $t1 and the next register to the 64 bits starting at effective memory word address"
  },
  {
    "lineNumber": 469,
    "op": "ld",
    "source": "ld $t1,label",
    "sourceTokens": [
      "ld",
      "$t1",
      "label"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "lw RG1, LL2($1)",
      "lui $1, LH2P4",
      "lw NR1, LL2P4($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "lw",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ],
      [
        "lui",
        "$1",
        "LH2P4"
      ],
      [
        "lw",
        "NR1",
        "LL2P4",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Doubleword : Set $t1 and the next register to the 64 bits starting at effective memory word address"
  },
  {
    "lineNumber": 470,
    "op": "ld",
    "source": "ld $t1,label+100000",
    "sourceTokens": [
      "ld",
      "$t1",
      "label",
      "+",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "lw RG1, LLP($1)",
      "lui $1, LHPAP4",
      "lw NR1, LLPP4($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "lw",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ],
      [
        "lui",
        "$1",
        "LHPAP4"
      ],
      [
        "lw",
        "NR1",
        "LLPP4",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Doubleword : Set $t1 and the next register to the 64 bits starting at effective memory word address"
  },
  {
    "lineNumber": 471,
    "op": "ld",
    "source": "ld $t1,($t2)",
    "sourceTokens": [
      "ld",
      "$t1",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lw RG1, 0(RG3)",
      "lw NR1, 4(RG3)"
    ],
    "defaultTemplateTokens": [
      [
        "lw",
        "RG1",
        "0",
        "(",
        "RG3",
        ")"
      ],
      [
        "lw",
        "NR1",
        "4",
        "(",
        "RG3",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Doubleword : Set $t1 and the next register to the 64 bits starting at effective memory word address"
  },
  {
    "lineNumber": 472,
    "op": "ld",
    "source": "ld $t1,100000($t2)",
    "sourceTokens": [
      "ld",
      "$t1",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "addu $1, $1, RG4",
      "lw RG1, VL2($1)",
      "lui $1, VH2P4",
      "addu $1, $1, RG4",
      "lw NR1, VL2P4($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "lw",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ],
      [
        "lui",
        "$1",
        "VH2P4"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "lw",
        "NR1",
        "VL2P4",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Doubleword : Set $t1 and the next register to the 64 bits starting at effective memory word address"
  },
  {
    "lineNumber": 473,
    "op": "ld",
    "source": "ld $t1,label($t2)",
    "sourceTokens": [
      "ld",
      "$t1",
      "label",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "addu $1, $1, RG4",
      "lw RG1, LL2($1)",
      "lui $1, LH2P4",
      "addu $1, $1, RG4",
      "lw NR1, LL2P4($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "lw",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ],
      [
        "lui",
        "$1",
        "LH2P4"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "lw",
        "NR1",
        "LL2P4",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Doubleword : Set $t1 and the next register to the 64 bits starting at effective memory word address"
  },
  {
    "lineNumber": 474,
    "op": "ld",
    "source": "ld $t1,label+100000($t2)",
    "sourceTokens": [
      "ld",
      "$t1",
      "label",
      "+",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "addu $1, $1, RG6",
      "lw RG1, LLP($1)",
      "lui $1, LHPAP4",
      "addu $1, $1, RG6",
      "lw NR1, LLPP4($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG6"
      ],
      [
        "lw",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ],
      [
        "lui",
        "$1",
        "LHPAP4"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG6"
      ],
      [
        "lw",
        "NR1",
        "LLPP4",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Doubleword : Set $t1 and the next register to the 64 bits starting at effective memory word address"
  },
  {
    "lineNumber": 476,
    "op": "usw",
    "source": "usw $t1,100000",
    "sourceTokens": [
      "usw",
      "$t1",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VH2P3",
      "swl RG1, VL2P3($1)",
      "lui $1, VH2",
      "swr RG1, VL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2P3"
      ],
      [
        "swl",
        "RG1",
        "VL2P3",
        "(",
        "$1",
        ")"
      ],
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "swr",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Unaligned Store Word : Store $t1 contents into the 32 bits starting at effective memory byte address"
  },
  {
    "lineNumber": 477,
    "op": "usw",
    "source": "usw $t1,label",
    "sourceTokens": [
      "usw",
      "$t1",
      "label"
    ],
    "defaultTemplates": [
      "lui $1, LH2P3",
      "swl RG1, LL2P3($1)",
      "lui $1, LH2",
      "swr RG1, LL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2P3"
      ],
      [
        "swl",
        "RG1",
        "LL2P3",
        "(",
        "$1",
        ")"
      ],
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "swr",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Unaligned Store Word : Store $t1 contents into the 32 bits starting at effective memory byte address"
  },
  {
    "lineNumber": 478,
    "op": "usw",
    "source": "usw $t1,label+100000",
    "sourceTokens": [
      "usw",
      "$t1",
      "label",
      "+",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, LHPAP3",
      "swl RG1, LLPP3($1)",
      "lui $1, LHPA",
      "swr RG1, LLP($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPAP3"
      ],
      [
        "swl",
        "RG1",
        "LLPP3",
        "(",
        "$1",
        ")"
      ],
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "swr",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Unaligned Store Word : Store $t1 contents into the 32 bits starting at effective memory byte address"
  },
  {
    "lineNumber": 479,
    "op": "usw",
    "source": "usw $t1,($t2)",
    "sourceTokens": [
      "usw",
      "$t1",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "swl RG1, 3(RG3)",
      "swr RG1, 0(RG3)"
    ],
    "defaultTemplateTokens": [
      [
        "swl",
        "RG1",
        "3",
        "(",
        "RG3",
        ")"
      ],
      [
        "swr",
        "RG1",
        "0",
        "(",
        "RG3",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Unaligned Store Word : Store $t1 contents into the 32 bits starting at effective memory byte address"
  },
  {
    "lineNumber": 480,
    "op": "usw",
    "source": "usw $t1,100000($t2)",
    "sourceTokens": [
      "usw",
      "$t1",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, VH2P3",
      "addu $1, $1, RG4",
      "swl RG1, VL2P3($1)",
      "lui $1, VH2",
      "addu $1, $1, RG4",
      "swr RG1, VL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2P3"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "swl",
        "RG1",
        "VL2P3",
        "(",
        "$1",
        ")"
      ],
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "swr",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Unaligned Store Word : Store $t1 contents into the 32 bits starting at effective memory byte address"
  },
  {
    "lineNumber": 481,
    "op": "usw",
    "source": "usw $t1,label($t2)",
    "sourceTokens": [
      "usw",
      "$t1",
      "label",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LH2P3",
      "addu $1, $1, RG4",
      "swl RG1, LL2P3($1)",
      "lui $1, LH2",
      "addu $1, $1, RG4",
      "swr RG1, LL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2P3"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "swl",
        "RG1",
        "LL2P3",
        "(",
        "$1",
        ")"
      ],
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "swr",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Unaligned Store Word : Store $t1 contents into the 32 bits starting at effective memory byte address"
  },
  {
    "lineNumber": 482,
    "op": "usw",
    "source": "usw $t1,label+100000($t2)",
    "sourceTokens": [
      "usw",
      "$t1",
      "label",
      "+",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LHPAP3",
      "addu $1, $1, RG6",
      "swl RG1, LLPP3($1)",
      "lui $1, LHPA",
      "addu $1, $1, RG6",
      "swr RG1, LLP($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPAP3"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG6"
      ],
      [
        "swl",
        "RG1",
        "LLPP3",
        "(",
        "$1",
        ")"
      ],
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG6"
      ],
      [
        "swr",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Unaligned Store Word : Store $t1 contents into the 32 bits starting at effective memory byte address"
  },
  {
    "lineNumber": 484,
    "op": "ush",
    "source": "ush $t1,100000",
    "sourceTokens": [
      "ush",
      "$t1",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "sb RG1, VL2($1)",
      "sll $1, RG1, 24",
      "srl RG1, RG1, 8",
      "or RG1, RG1, $1",
      "lui $1, VH2P1",
      "sb RG1, VL2P1($1)",
      "srl $1, RG1, 24",
      "sll RG1, RG1, 8",
      "or RG1, RG1, $1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "sb",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ],
      [
        "sll",
        "$1",
        "RG1",
        "24"
      ],
      [
        "srl",
        "RG1",
        "RG1",
        "8"
      ],
      [
        "or",
        "RG1",
        "RG1",
        "$1"
      ],
      [
        "lui",
        "$1",
        "VH2P1"
      ],
      [
        "sb",
        "RG1",
        "VL2P1",
        "(",
        "$1",
        ")"
      ],
      [
        "srl",
        "$1",
        "RG1",
        "24"
      ],
      [
        "sll",
        "RG1",
        "RG1",
        "8"
      ],
      [
        "or",
        "RG1",
        "RG1",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Unaligned Store Halfword: Store low-order halfword $t1 contents into the 16 bits starting at effective memory byte address"
  },
  {
    "lineNumber": 485,
    "op": "ush",
    "source": "ush $t1,label",
    "sourceTokens": [
      "ush",
      "$t1",
      "label"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "sb RG1, LL2($1)",
      "sll $1, RG1, 24",
      "srl RG1, RG1, 8",
      "or RG1, RG1, $1",
      "lui $1, LH2P1",
      "sb RG1, LL2P1($1)",
      "srl $1, RG1, 24",
      "sll RG1, RG1, 8",
      "or RG1, RG1, $1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "sb",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ],
      [
        "sll",
        "$1",
        "RG1",
        "24"
      ],
      [
        "srl",
        "RG1",
        "RG1",
        "8"
      ],
      [
        "or",
        "RG1",
        "RG1",
        "$1"
      ],
      [
        "lui",
        "$1",
        "LH2P1"
      ],
      [
        "sb",
        "RG1",
        "LL2P1",
        "(",
        "$1",
        ")"
      ],
      [
        "srl",
        "$1",
        "RG1",
        "24"
      ],
      [
        "sll",
        "RG1",
        "RG1",
        "8"
      ],
      [
        "or",
        "RG1",
        "RG1",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Unaligned Store Halfword: Store low-order halfword $t1 contents into the 16 bits starting at effective memory byte address"
  },
  {
    "lineNumber": 486,
    "op": "ush",
    "source": "ush $t1,label+100000",
    "sourceTokens": [
      "ush",
      "$t1",
      "label",
      "+",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "sb RG1, LLP($1)",
      "sll $1, RG1, 24",
      "srl RG1, RG1, 8",
      "or RG1, RG1, $1",
      "lui $1, LHPAP1",
      "sb RG1, LLPP1($1)",
      "srl $1, RG1, 24",
      "sll RG1, RG1, 8",
      "or RG1, RG1, $1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "sb",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ],
      [
        "sll",
        "$1",
        "RG1",
        "24"
      ],
      [
        "srl",
        "RG1",
        "RG1",
        "8"
      ],
      [
        "or",
        "RG1",
        "RG1",
        "$1"
      ],
      [
        "lui",
        "$1",
        "LHPAP1"
      ],
      [
        "sb",
        "RG1",
        "LLPP1",
        "(",
        "$1",
        ")"
      ],
      [
        "srl",
        "$1",
        "RG1",
        "24"
      ],
      [
        "sll",
        "RG1",
        "RG1",
        "8"
      ],
      [
        "or",
        "RG1",
        "RG1",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Unaligned Store Halfword: Store low-order halfword $t1 contents into the 16 bits starting at effective memory byte address"
  },
  {
    "lineNumber": 487,
    "op": "ush",
    "source": "ush $t1,($t2)",
    "sourceTokens": [
      "ush",
      "$t1",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "sb RG1, 0(RG3)",
      "sll $1, RG1, 24",
      "srl RG1, RG1, 8",
      "or RG1, RG1, $1",
      "sb RG1, 1(RG3)",
      "srl $1, RG1, 24",
      "sll RG1, RG1, 8",
      "or RG1, RG1, $1"
    ],
    "defaultTemplateTokens": [
      [
        "sb",
        "RG1",
        "0",
        "(",
        "RG3",
        ")"
      ],
      [
        "sll",
        "$1",
        "RG1",
        "24"
      ],
      [
        "srl",
        "RG1",
        "RG1",
        "8"
      ],
      [
        "or",
        "RG1",
        "RG1",
        "$1"
      ],
      [
        "sb",
        "RG1",
        "1",
        "(",
        "RG3",
        ")"
      ],
      [
        "srl",
        "$1",
        "RG1",
        "24"
      ],
      [
        "sll",
        "RG1",
        "RG1",
        "8"
      ],
      [
        "or",
        "RG1",
        "RG1",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Unaligned Store Halfword: Store low-order halfword $t1 contents into the 16 bits starting at effective memory byte address"
  },
  {
    "lineNumber": 488,
    "op": "ush",
    "source": "ush $t1,100000($t2)",
    "sourceTokens": [
      "ush",
      "$t1",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "addu $1, $1, RG4",
      "sb RG1, VL2($1)",
      "sll $1, RG1, 24",
      "srl RG1, RG1, 8",
      "or RG1, RG1, $1",
      "lui $1, VH2P1",
      "addu $1, $1, RG4",
      "sb RG1, VL2P1($1)",
      "srl $1, RG1, 24",
      "sll RG1, RG1, 8",
      "or RG1, RG1, $1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "sb",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ],
      [
        "sll",
        "$1",
        "RG1",
        "24"
      ],
      [
        "srl",
        "RG1",
        "RG1",
        "8"
      ],
      [
        "or",
        "RG1",
        "RG1",
        "$1"
      ],
      [
        "lui",
        "$1",
        "VH2P1"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "sb",
        "RG1",
        "VL2P1",
        "(",
        "$1",
        ")"
      ],
      [
        "srl",
        "$1",
        "RG1",
        "24"
      ],
      [
        "sll",
        "RG1",
        "RG1",
        "8"
      ],
      [
        "or",
        "RG1",
        "RG1",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Unaligned Store Halfword: Store low-order halfword $t1 contents into the 16 bits starting at effective memory byte address"
  },
  {
    "lineNumber": 489,
    "op": "ush",
    "source": "ush $t1,label($t2)",
    "sourceTokens": [
      "ush",
      "$t1",
      "label",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "addu $1, $1, RG4",
      "sb RG1, LL2($1)",
      "sll $1, RG1, 24",
      "srl RG1, RG1, 8",
      "or RG1, RG1, $1",
      "lui $1, LH2P1",
      "addu $1, $1, RG4",
      "sb RG1, LL2P1($1)",
      "srl $1, RG1, 24",
      "sll RG1, RG1, 8",
      "or RG1, RG1, $1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "sb",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ],
      [
        "sll",
        "$1",
        "RG1",
        "24"
      ],
      [
        "srl",
        "RG1",
        "RG1",
        "8"
      ],
      [
        "or",
        "RG1",
        "RG1",
        "$1"
      ],
      [
        "lui",
        "$1",
        "LH2P1"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "sb",
        "RG1",
        "LL2P1",
        "(",
        "$1",
        ")"
      ],
      [
        "srl",
        "$1",
        "RG1",
        "24"
      ],
      [
        "sll",
        "RG1",
        "RG1",
        "8"
      ],
      [
        "or",
        "RG1",
        "RG1",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Unaligned Store Halfword: Store low-order halfword $t1 contents into the 16 bits starting at effective memory byte address"
  },
  {
    "lineNumber": 490,
    "op": "ush",
    "source": "ush $t1,label+100000($t2)",
    "sourceTokens": [
      "ush",
      "$t1",
      "label",
      "+",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "addu $1, $1, RG6",
      "sb RG1, LLP($1)",
      "sll $1, RG1, 24",
      "srl RG1, RG1, 8",
      "or RG1, RG1, $1",
      "lui $1, LHPAP1",
      "addu $1, $1, RG6",
      "sb RG1, LLPP1($1)",
      "srl $1, RG1, 24",
      "sll RG1, RG1, 8",
      "or RG1, RG1, $1"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG6"
      ],
      [
        "sb",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ],
      [
        "sll",
        "$1",
        "RG1",
        "24"
      ],
      [
        "srl",
        "RG1",
        "RG1",
        "8"
      ],
      [
        "or",
        "RG1",
        "RG1",
        "$1"
      ],
      [
        "lui",
        "$1",
        "LHPAP1"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG6"
      ],
      [
        "sb",
        "RG1",
        "LLPP1",
        "(",
        "$1",
        ")"
      ],
      [
        "srl",
        "$1",
        "RG1",
        "24"
      ],
      [
        "sll",
        "RG1",
        "RG1",
        "8"
      ],
      [
        "or",
        "RG1",
        "RG1",
        "$1"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Unaligned Store Halfword: Store low-order halfword $t1 contents into the 16 bits starting at effective memory byte address"
  },
  {
    "lineNumber": 492,
    "op": "sd",
    "source": "sd $t1,100000",
    "sourceTokens": [
      "sd",
      "$t1",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "sw RG1, VL2($1)",
      "lui $1, VH2P4",
      "sw NR1, VL2P4($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "sw",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ],
      [
        "lui",
        "$1",
        "VH2P4"
      ],
      [
        "sw",
        "NR1",
        "VL2P4",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Doubleword : Store contents of $t1 and the next register to the 64 bits starting at effective memory word address"
  },
  {
    "lineNumber": 493,
    "op": "sd",
    "source": "sd $t1,label",
    "sourceTokens": [
      "sd",
      "$t1",
      "label"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "sw RG1, LL2($1)",
      "lui $1, LH2P4",
      "sw NR1, LL2P4($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "sw",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ],
      [
        "lui",
        "$1",
        "LH2P4"
      ],
      [
        "sw",
        "NR1",
        "LL2P4",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Doubleword : Store contents of $t1 and the next register to the 64 bits starting at effective memory word address"
  },
  {
    "lineNumber": 494,
    "op": "sd",
    "source": "sd $t1,label+100000",
    "sourceTokens": [
      "sd",
      "$t1",
      "label",
      "+",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "sw RG1, LLP($1)",
      "lui $1, LHPAP4",
      "sw NR1, LLPP4($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "sw",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ],
      [
        "lui",
        "$1",
        "LHPAP4"
      ],
      [
        "sw",
        "NR1",
        "LLPP4",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Doubleword : Store contents of $t1 and the next register to the 64 bits starting at effective memory word address"
  },
  {
    "lineNumber": 495,
    "op": "sd",
    "source": "sd $t1,($t2)",
    "sourceTokens": [
      "sd",
      "$t1",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "sw RG1, 0(RG3)",
      "sw NR1, 4(RG3)"
    ],
    "defaultTemplateTokens": [
      [
        "sw",
        "RG1",
        "0",
        "(",
        "RG3",
        ")"
      ],
      [
        "sw",
        "NR1",
        "4",
        "(",
        "RG3",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Doubleword : Store contents of $t1 and the next register to the 64 bits starting at effective memory word address"
  },
  {
    "lineNumber": 496,
    "op": "sd",
    "source": "sd $t1,100000($t2)",
    "sourceTokens": [
      "sd",
      "$t1",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "addu $1, $1, RG4",
      "sw RG1, VL2($1)",
      "lui $1, VH2P4",
      "addu $1, $1, RG4",
      "sw NR1, VL2P4($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "sw",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ],
      [
        "lui",
        "$1",
        "VH2P4"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "sw",
        "NR1",
        "VL2P4",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Doubleword : Store contents of $t1 and the next register to the 64 bits starting at effective memory word address"
  },
  {
    "lineNumber": 497,
    "op": "sd",
    "source": "sd $t1,label($t2)",
    "sourceTokens": [
      "sd",
      "$t1",
      "label",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "addu $1, $1, RG4",
      "sw RG1, LL2($1)",
      "lui $1, LH2P4",
      "addu $1, $1, RG4",
      "sw NR1, LL2P4($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "sw",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ],
      [
        "lui",
        "$1",
        "LH2P4"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "sw",
        "NR1",
        "LL2P4",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Doubleword : Store contents of $t1 and the next register to the 64 bits starting at effective memory word address"
  },
  {
    "lineNumber": 498,
    "op": "sd",
    "source": "sd $t1,label+100000($t2)",
    "sourceTokens": [
      "sd",
      "$t1",
      "label",
      "+",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "addu $1, $1, RG6",
      "sw RG1, LLP($1)",
      "lui $1, LHPAP4",
      "addu $1, $1, RG6",
      "sw NR1, LLPP4($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG6"
      ],
      [
        "sw",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ],
      [
        "lui",
        "$1",
        "LHPAP4"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG6"
      ],
      [
        "sw",
        "NR1",
        "LLPP4",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Doubleword : Store contents of $t1 and the next register to the 64 bits starting at effective memory word address"
  },
  {
    "lineNumber": 502,
    "op": "lwc1",
    "source": "lwc1 $f1,($t2)",
    "sourceTokens": [
      "lwc1",
      "$f1",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lwc1 RG1,0(RG3)"
    ],
    "defaultTemplateTokens": [
      [
        "lwc1",
        "RG1",
        "0",
        "(",
        "RG3",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Word Coprocessor 1 : Set $f1 to 32-bit value from effective memory word address"
  },
  {
    "lineNumber": 503,
    "op": "lwc1",
    "source": "lwc1 $f1,-100",
    "sourceTokens": [
      "lwc1",
      "$f1",
      "-100"
    ],
    "defaultTemplates": [
      "lwc1 RG1,VL2($0)"
    ],
    "defaultTemplateTokens": [
      [
        "lwc1",
        "RG1",
        "VL2",
        "(",
        "$0",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Word Coprocessor 1 : Set $f1 to 32-bit value from effective memory word address"
  },
  {
    "lineNumber": 504,
    "op": "lwc1",
    "source": "lwc1 $f1,100000",
    "sourceTokens": [
      "lwc1",
      "$f1",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "lwc1 RG1,VL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "lwc1",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Word Coprocessor 1 : Set $f1 to 32-bit value from effective memory word address"
  },
  {
    "lineNumber": 505,
    "op": "lwc1",
    "source": "lwc1 $f1,100000($t2)",
    "sourceTokens": [
      "lwc1",
      "$f1",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "addu $1, $1, RG4",
      "lwc1 RG1, VL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "lwc1",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Word Coprocessor 1 : Set $f1 to 32-bit value from effective memory word address"
  },
  {
    "lineNumber": 506,
    "op": "lwc1",
    "source": "lwc1 $f1,label",
    "sourceTokens": [
      "lwc1",
      "$f1",
      "label"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "lwc1 RG1, LL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "lwc1",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [
      "lwc1 RG1, LL2($0)"
    ],
    "compactTemplateTokens": [
      [
        "lwc1",
        "RG1",
        "LL2",
        "(",
        "$0",
        ")"
      ]
    ],
    "description": "Load Word Coprocessor 1 : Set $f1 to 32-bit value from effective memory word address"
  },
  {
    "lineNumber": 507,
    "op": "lwc1",
    "source": "lwc1 $f1,label($t2)",
    "sourceTokens": [
      "lwc1",
      "$f1",
      "label",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "addu $1, $1, RG4",
      "lwc1 RG1, LL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "lwc1",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [
      "lwc1 RG1, LL2(RG4)"
    ],
    "compactTemplateTokens": [
      [
        "lwc1",
        "RG1",
        "LL2",
        "(",
        "RG4",
        ")"
      ]
    ],
    "description": "Load Word Coprocessor 1 : Set $f1 to 32-bit value from effective memory word address"
  },
  {
    "lineNumber": 508,
    "op": "lwc1",
    "source": "lwc1 $f1,label+100000",
    "sourceTokens": [
      "lwc1",
      "$f1",
      "label",
      "+",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "lwc1 RG1, LLP($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "lwc1",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Word Coprocessor 1 : Set $f1 to 32-bit value from effective memory word address"
  },
  {
    "lineNumber": 509,
    "op": "lwc1",
    "source": "lwc1 $f1,label+100000($t2)",
    "sourceTokens": [
      "lwc1",
      "$f1",
      "label",
      "+",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "addu $1, $1, RG6",
      "lwc1 RG1, LLP($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG6"
      ],
      [
        "lwc1",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Word Coprocessor 1 : Set $f1 to 32-bit value from effective memory word address"
  },
  {
    "lineNumber": 511,
    "op": "ldc1",
    "source": "ldc1 $f2,($t2)",
    "sourceTokens": [
      "ldc1",
      "$f2",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "ldc1 RG1,0(RG3)"
    ],
    "defaultTemplateTokens": [
      [
        "ldc1",
        "RG1",
        "0",
        "(",
        "RG3",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Doubleword Coprocessor 1 : Set $f2 and $f3 register pair to 64-bit value at effective memory doubleword address"
  },
  {
    "lineNumber": 512,
    "op": "ldc1",
    "source": "ldc1 $f2,-100",
    "sourceTokens": [
      "ldc1",
      "$f2",
      "-100"
    ],
    "defaultTemplates": [
      "ldc1 RG1,VL2($0)"
    ],
    "defaultTemplateTokens": [
      [
        "ldc1",
        "RG1",
        "VL2",
        "(",
        "$0",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Doubleword Coprocessor 1 : Set $f2 and $f3 register pair to 64-bit value at effective memory doubleword address"
  },
  {
    "lineNumber": 513,
    "op": "ldc1",
    "source": "ldc1 $f2,100000",
    "sourceTokens": [
      "ldc1",
      "$f2",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "ldc1 RG1,VL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "ldc1",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Doubleword Coprocessor 1 : Set $f2 and $f3 register pair to 64-bit value at effective memory doubleword address"
  },
  {
    "lineNumber": 514,
    "op": "ldc1",
    "source": "ldc1 $f2,100000($t2)",
    "sourceTokens": [
      "ldc1",
      "$f2",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "addu $1, $1, RG4",
      "ldc1 RG1, VL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "ldc1",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Doubleword Coprocessor 1 : Set $f2 and $f3 register pair to 64-bit value at effective memory doubleword address"
  },
  {
    "lineNumber": 515,
    "op": "ldc1",
    "source": "ldc1 $f2,label",
    "sourceTokens": [
      "ldc1",
      "$f2",
      "label"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "ldc1 RG1, LL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "ldc1",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [
      "ldc1 RG1, LL2($0)"
    ],
    "compactTemplateTokens": [
      [
        "ldc1",
        "RG1",
        "LL2",
        "(",
        "$0",
        ")"
      ]
    ],
    "description": "Load Doubleword Coprocessor 1 : Set $f2 and $f3 register pair to 64-bit value at effective memory doubleword address"
  },
  {
    "lineNumber": 516,
    "op": "ldc1",
    "source": "ldc1 $f2,label($t2)",
    "sourceTokens": [
      "ldc1",
      "$f2",
      "label",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "addu $1, $1, RG4",
      "ldc1 RG1, LL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "ldc1",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [
      "ldc1 RG1, LL2(RG4)"
    ],
    "compactTemplateTokens": [
      [
        "ldc1",
        "RG1",
        "LL2",
        "(",
        "RG4",
        ")"
      ]
    ],
    "description": "Load Doubleword Coprocessor 1 : Set $f2 and $f3 register pair to 64-bit value at effective memory doubleword address"
  },
  {
    "lineNumber": 517,
    "op": "ldc1",
    "source": "ldc1 $f2,label+100000",
    "sourceTokens": [
      "ldc1",
      "$f2",
      "label",
      "+",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "ldc1 RG1, LLP($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "ldc1",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Doubleword Coprocessor 1 : Set $f2 and $f3 register pair to 64-bit value at effective memory doubleword address"
  },
  {
    "lineNumber": 518,
    "op": "ldc1",
    "source": "ldc1 $f2,label+100000($t2)",
    "sourceTokens": [
      "ldc1",
      "$f2",
      "label",
      "+",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "addu $1, $1, RG6",
      "ldc1 RG1, LLP($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG6"
      ],
      [
        "ldc1",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load Doubleword Coprocessor 1 : Set $f2 and $f3 register pair to 64-bit value at effective memory doubleword address"
  },
  {
    "lineNumber": 520,
    "op": "swc1",
    "source": "swc1 $f1,($t2)",
    "sourceTokens": [
      "swc1",
      "$f1",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "swc1 RG1,0(RG3)"
    ],
    "defaultTemplateTokens": [
      [
        "swc1",
        "RG1",
        "0",
        "(",
        "RG3",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Word Coprocessor 1 : Store 32-bit value from $f1 to effective memory word address"
  },
  {
    "lineNumber": 521,
    "op": "swc1",
    "source": "swc1 $f1,-100",
    "sourceTokens": [
      "swc1",
      "$f1",
      "-100"
    ],
    "defaultTemplates": [
      "swc1 RG1,VL2($0)"
    ],
    "defaultTemplateTokens": [
      [
        "swc1",
        "RG1",
        "VL2",
        "(",
        "$0",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Word Coprocessor 1 : Store 32-bit value from $f1 to effective memory word address"
  },
  {
    "lineNumber": 522,
    "op": "swc1",
    "source": "swc1 $f1,100000",
    "sourceTokens": [
      "swc1",
      "$f1",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "swc1 RG1,VL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "swc1",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Word Coprocessor 1 : Store 32-bit value from $f1 to effective memory word address"
  },
  {
    "lineNumber": 523,
    "op": "swc1",
    "source": "swc1 $f1,100000($t2)",
    "sourceTokens": [
      "swc1",
      "$f1",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "addu $1, $1, RG4",
      "swc1 RG1, VL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "swc1",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Word Coprocessor 1 : Store 32-bit value from $f1 to effective memory word address"
  },
  {
    "lineNumber": 524,
    "op": "swc1",
    "source": "swc1 $f1,label",
    "sourceTokens": [
      "swc1",
      "$f1",
      "label"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "swc1 RG1, LL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "swc1",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [
      "swc1 RG1, LL2($0)"
    ],
    "compactTemplateTokens": [
      [
        "swc1",
        "RG1",
        "LL2",
        "(",
        "$0",
        ")"
      ]
    ],
    "description": "Store Word Coprocessor 1 : Store 32-bit value from $f1 to effective memory word address"
  },
  {
    "lineNumber": 525,
    "op": "swc1",
    "source": "swc1 $f1,label($t2)",
    "sourceTokens": [
      "swc1",
      "$f1",
      "label",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "addu $1, $1, RG4",
      "swc1 RG1, LL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "swc1",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [
      "swc1 RG1, LL2(RG4)"
    ],
    "compactTemplateTokens": [
      [
        "swc1",
        "RG1",
        "LL2",
        "(",
        "RG4",
        ")"
      ]
    ],
    "description": "Store Word Coprocessor 1 : Store 32-bit value from $f1 to effective memory word address"
  },
  {
    "lineNumber": 526,
    "op": "swc1",
    "source": "swc1 $f1,label+100000",
    "sourceTokens": [
      "swc1",
      "$f1",
      "label",
      "+",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "swc1 RG1, LLP($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "swc1",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Word Coprocessor 1 : Store 32-bit value from $f1 to effective memory word address"
  },
  {
    "lineNumber": 527,
    "op": "swc1",
    "source": "swc1 $f1,label+100000($t2)",
    "sourceTokens": [
      "swc1",
      "$f1",
      "label",
      "+",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "addu $1, $1, RG6",
      "swc1 RG1, LLP($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG6"
      ],
      [
        "swc1",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Word Coprocessor 1 : Store 32-bit value from $f1 to effective memory word address"
  },
  {
    "lineNumber": 529,
    "op": "sdc1",
    "source": "sdc1 $f2,($t2)",
    "sourceTokens": [
      "sdc1",
      "$f2",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "sdc1 RG1,0(RG3)"
    ],
    "defaultTemplateTokens": [
      [
        "sdc1",
        "RG1",
        "0",
        "(",
        "RG3",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Doubleword Coprocessor 1 : Store 64 bits from $f2 and $f3 register pair to effective memory doubleword address"
  },
  {
    "lineNumber": 530,
    "op": "sdc1",
    "source": "sdc1 $f2,-100",
    "sourceTokens": [
      "sdc1",
      "$f2",
      "-100"
    ],
    "defaultTemplates": [
      "sdc1 RG1,VL2($0)"
    ],
    "defaultTemplateTokens": [
      [
        "sdc1",
        "RG1",
        "VL2",
        "(",
        "$0",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Doubleword Coprocessor 1 : Store 64 bits from $f2 and $f3 register pair to effective memory doubleword address"
  },
  {
    "lineNumber": 531,
    "op": "sdc1",
    "source": "sdc1 $f2,100000",
    "sourceTokens": [
      "sdc1",
      "$f2",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "sdc1 RG1,VL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "sdc1",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Doubleword Coprocessor 1 : Store 64 bits from $f2 and $f3 register pair to effective memory doubleword address"
  },
  {
    "lineNumber": 532,
    "op": "sdc1",
    "source": "sdc1 $f2,100000($t2)",
    "sourceTokens": [
      "sdc1",
      "$f2",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "addu $1, $1, RG4",
      "sdc1 RG1, VL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "sdc1",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Doubleword Coprocessor 1 : Store 64 bits from $f2 and $f3 register pair to effective memory doubleword address"
  },
  {
    "lineNumber": 533,
    "op": "sdc1",
    "source": "sdc1 $f2,label",
    "sourceTokens": [
      "sdc1",
      "$f2",
      "label"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "sdc1 RG1, LL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "sdc1",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [
      "sdc1 RG1, LL2($0)"
    ],
    "compactTemplateTokens": [
      [
        "sdc1",
        "RG1",
        "LL2",
        "(",
        "$0",
        ")"
      ]
    ],
    "description": "Store Doubleword Coprocessor 1 : Store 64 bits from $f2 and $f3 register pair to effective memory doubleword address"
  },
  {
    "lineNumber": 534,
    "op": "sdc1",
    "source": "sdc1 $f2,label($t2)",
    "sourceTokens": [
      "sdc1",
      "$f2",
      "label",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "addu $1, $1, RG4",
      "sdc1 RG1, LL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "sdc1",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [
      "sdc1 RG1, LL2(RG4)"
    ],
    "compactTemplateTokens": [
      [
        "sdc1",
        "RG1",
        "LL2",
        "(",
        "RG4",
        ")"
      ]
    ],
    "description": "Store Doubleword Coprocessor 1 : Store 64 bits from $f2 and $f3 register pair to effective memory doubleword address"
  },
  {
    "lineNumber": 535,
    "op": "sdc1",
    "source": "sdc1 $f2,label+100000",
    "sourceTokens": [
      "sdc1",
      "$f2",
      "label",
      "+",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "sdc1 RG1, LLP($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "sdc1",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Doubleword Coprocessor 1 : Store 64 bits from $f2 and $f3 register pair to effective memory doubleword address"
  },
  {
    "lineNumber": 536,
    "op": "sdc1",
    "source": "sdc1 $f2,label+100000($t2)",
    "sourceTokens": [
      "sdc1",
      "$f2",
      "label",
      "+",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "addu $1, $1, RG6",
      "sdc1 RG1, LLP($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG6"
      ],
      [
        "sdc1",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store Doubleword Coprocessor 1 : Store 64 bits from $f2 and $f3 register pair to effective memory doubleword address"
  },
  {
    "lineNumber": 538,
    "op": "l.s",
    "source": "l.s $f1,($t2)",
    "sourceTokens": [
      "l.s",
      "$f1",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lwc1 RG1,0(RG3)"
    ],
    "defaultTemplateTokens": [
      [
        "lwc1",
        "RG1",
        "0",
        "(",
        "RG3",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load floating point Single precision : Set $f1 to 32-bit value at effective memory word address"
  },
  {
    "lineNumber": 539,
    "op": "l.s",
    "source": "l.s $f1,-100",
    "sourceTokens": [
      "l.s",
      "$f1",
      "-100"
    ],
    "defaultTemplates": [
      "lwc1 RG1,VL2($0)"
    ],
    "defaultTemplateTokens": [
      [
        "lwc1",
        "RG1",
        "VL2",
        "(",
        "$0",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load floating point Single precision : Set $f1 to 32-bit value at effective memory word address"
  },
  {
    "lineNumber": 540,
    "op": "l.s",
    "source": "l.s $f1,100000",
    "sourceTokens": [
      "l.s",
      "$f1",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "lwc1 RG1,VL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "lwc1",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load floating point Single precision : Set $f1 to 32-bit value at effective memory word address"
  },
  {
    "lineNumber": 541,
    "op": "l.s",
    "source": "l.s $f1,100000($t2)",
    "sourceTokens": [
      "l.s",
      "$f1",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "addu $1, $1, RG4",
      "lwc1 RG1, VL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "lwc1",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load floating point Single precision : Set $f1 to 32-bit value at effective memory word address"
  },
  {
    "lineNumber": 542,
    "op": "l.s",
    "source": "l.s $f1,label",
    "sourceTokens": [
      "l.s",
      "$f1",
      "label"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "lwc1 RG1, LL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "lwc1",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [
      "lwc1 RG1, LL2($0)"
    ],
    "compactTemplateTokens": [
      [
        "lwc1",
        "RG1",
        "LL2",
        "(",
        "$0",
        ")"
      ]
    ],
    "description": "Load floating point Single precision : Set $f1 to 32-bit value at effective memory word address"
  },
  {
    "lineNumber": 543,
    "op": "l.s",
    "source": "l.s $f1,label($t2)",
    "sourceTokens": [
      "l.s",
      "$f1",
      "label",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "addu $1, $1, RG4",
      "lwc1 RG1, LL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "lwc1",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [
      "lwc1 RG1, LL2(RG4)"
    ],
    "compactTemplateTokens": [
      [
        "lwc1",
        "RG1",
        "LL2",
        "(",
        "RG4",
        ")"
      ]
    ],
    "description": "Load floating point Single precision : Set $f1 to 32-bit value at effective memory word address"
  },
  {
    "lineNumber": 544,
    "op": "l.s",
    "source": "l.s $f1,label+100000",
    "sourceTokens": [
      "l.s",
      "$f1",
      "label",
      "+",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "lwc1 RG1, LLP($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "lwc1",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load floating point Single precision : Set $f1 to 32-bit value at effective memory word address"
  },
  {
    "lineNumber": 545,
    "op": "l.s",
    "source": "l.s $f1,label+100000($t2)",
    "sourceTokens": [
      "l.s",
      "$f1",
      "label",
      "+",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "addu $1, $1, RG6",
      "lwc1 RG1, LLP($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG6"
      ],
      [
        "lwc1",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load floating point Single precision : Set $f1 to 32-bit value at effective memory word address"
  },
  {
    "lineNumber": 547,
    "op": "s.s",
    "source": "s.s $f1,($t2)",
    "sourceTokens": [
      "s.s",
      "$f1",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "swc1 RG1,0(RG3)"
    ],
    "defaultTemplateTokens": [
      [
        "swc1",
        "RG1",
        "0",
        "(",
        "RG3",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store floating point Single precision : Store 32-bit value from $f1 to effective memory word address"
  },
  {
    "lineNumber": 548,
    "op": "s.s",
    "source": "s.s $f1,-100",
    "sourceTokens": [
      "s.s",
      "$f1",
      "-100"
    ],
    "defaultTemplates": [
      "swc1 RG1,VL2($0)"
    ],
    "defaultTemplateTokens": [
      [
        "swc1",
        "RG1",
        "VL2",
        "(",
        "$0",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store floating point Single precision : Store 32-bit value from $f1 to effective memory word address"
  },
  {
    "lineNumber": 549,
    "op": "s.s",
    "source": "s.s $f1,100000",
    "sourceTokens": [
      "s.s",
      "$f1",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "swc1 RG1,VL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "swc1",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store floating point Single precision : Store 32-bit value from $f1 to effective memory word address"
  },
  {
    "lineNumber": 550,
    "op": "s.s",
    "source": "s.s $f1,100000($t2)",
    "sourceTokens": [
      "s.s",
      "$f1",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "addu $1, $1, RG4",
      "swc1 RG1, VL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "swc1",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store floating point Single precision : Store 32-bit value from $f1 to effective memory word address"
  },
  {
    "lineNumber": 551,
    "op": "s.s",
    "source": "s.s $f1,label",
    "sourceTokens": [
      "s.s",
      "$f1",
      "label"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "swc1 RG1, LL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "swc1",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [
      "swc1 RG1, LL2($0)"
    ],
    "compactTemplateTokens": [
      [
        "swc1",
        "RG1",
        "LL2",
        "(",
        "$0",
        ")"
      ]
    ],
    "description": "Store floating point Single precision : Store 32-bit value from $f1 to effective memory word address"
  },
  {
    "lineNumber": 552,
    "op": "s.s",
    "source": "s.s $f1,label($t2)",
    "sourceTokens": [
      "s.s",
      "$f1",
      "label",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "addu $1, $1, RG4",
      "swc1 RG1, LL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "swc1",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [
      "swc1 RG1, LL2(RG4)"
    ],
    "compactTemplateTokens": [
      [
        "swc1",
        "RG1",
        "LL2",
        "(",
        "RG4",
        ")"
      ]
    ],
    "description": "Store floating point Single precision : Store 32-bit value from $f1 to effective memory word address"
  },
  {
    "lineNumber": 553,
    "op": "s.s",
    "source": "s.s $f1,label+100000",
    "sourceTokens": [
      "s.s",
      "$f1",
      "label",
      "+",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "swc1 RG1, LLP($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "swc1",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store floating point Single precision : Store 32-bit value from $f1 to effective memory word address"
  },
  {
    "lineNumber": 554,
    "op": "s.s",
    "source": "s.s $f1,label+100000($t2)",
    "sourceTokens": [
      "s.s",
      "$f1",
      "label",
      "+",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "addu $1, $1, RG6",
      "swc1 RG1, LLP($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG6"
      ],
      [
        "swc1",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store floating point Single precision : Store 32-bit value from $f1 to effective memory word address"
  },
  {
    "lineNumber": 556,
    "op": "l.d",
    "source": "l.d $f2,($t2)",
    "sourceTokens": [
      "l.d",
      "$f2",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "ldc1 RG1,0(RG3)"
    ],
    "defaultTemplateTokens": [
      [
        "ldc1",
        "RG1",
        "0",
        "(",
        "RG3",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load floating point Double precision : Set $f2 and $f3 register pair to 64-bit value at effective memory doubleword address"
  },
  {
    "lineNumber": 557,
    "op": "l.d",
    "source": "l.d $f2,-100",
    "sourceTokens": [
      "l.d",
      "$f2",
      "-100"
    ],
    "defaultTemplates": [
      "ldc1 RG1,VL2($0)"
    ],
    "defaultTemplateTokens": [
      [
        "ldc1",
        "RG1",
        "VL2",
        "(",
        "$0",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load floating point Double precision : Set $f2 and $f3 register pair to 64-bit value at effective memory doubleword address"
  },
  {
    "lineNumber": 558,
    "op": "l.d",
    "source": "l.d $f2,100000",
    "sourceTokens": [
      "l.d",
      "$f2",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "ldc1 RG1,VL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "ldc1",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load floating point Double precision : Set $f2 and $f3 register pair to 64-bit value at effective memory doubleword address"
  },
  {
    "lineNumber": 559,
    "op": "l.d",
    "source": "l.d $f2,100000($t2)",
    "sourceTokens": [
      "l.d",
      "$f2",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "addu $1, $1, RG4",
      "ldc1 RG1, VL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "ldc1",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load floating point Double precision : Set $f2 and $f3 register pair to 64-bit value at effective memory doubleword address"
  },
  {
    "lineNumber": 560,
    "op": "l.d",
    "source": "l.d $f2,label",
    "sourceTokens": [
      "l.d",
      "$f2",
      "label"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "ldc1 RG1, LL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "ldc1",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [
      "ldc1 RG1, LL2($0)"
    ],
    "compactTemplateTokens": [
      [
        "ldc1",
        "RG1",
        "LL2",
        "(",
        "$0",
        ")"
      ]
    ],
    "description": "Load floating point Double precision : Set $f2 and $f3 register pair to 64-bit value at effective memory doubleword address"
  },
  {
    "lineNumber": 561,
    "op": "l.d",
    "source": "l.d $f2,label($t2)",
    "sourceTokens": [
      "l.d",
      "$f2",
      "label",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "addu $1, $1, RG4",
      "ldc1 RG1, LL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "ldc1",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [
      "ldc1 RG1, LL2(RG4)"
    ],
    "compactTemplateTokens": [
      [
        "ldc1",
        "RG1",
        "LL2",
        "(",
        "RG4",
        ")"
      ]
    ],
    "description": "Load floating point Double precision : Set $f2 and $f3 register pair to 64-bit value at effective memory doubleword address"
  },
  {
    "lineNumber": 562,
    "op": "l.d",
    "source": "l.d $f2,label+100000",
    "sourceTokens": [
      "l.d",
      "$f2",
      "label",
      "+",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "ldc1 RG1, LLP($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "ldc1",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load floating point Double precision : Set $f2 and $f3 register pair to 64-bit value at effective memory doubleword address"
  },
  {
    "lineNumber": 563,
    "op": "l.d",
    "source": "l.d $f2,label+100000($t2)",
    "sourceTokens": [
      "l.d",
      "$f2",
      "label",
      "+",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "addu $1, $1, RG6",
      "ldc1 RG1, LLP($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG6"
      ],
      [
        "ldc1",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Load floating point Double precision : Set $f2 and $f3 register pair to 64-bit value at effective memory doubleword address"
  },
  {
    "lineNumber": 565,
    "op": "s.d",
    "source": "s.d $f2,($t2)",
    "sourceTokens": [
      "s.d",
      "$f2",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "sdc1 RG1,0(RG3)"
    ],
    "defaultTemplateTokens": [
      [
        "sdc1",
        "RG1",
        "0",
        "(",
        "RG3",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store floating point Double precision : Store 64 bits from $f2 and $f3 register pair to effective memory doubleword address"
  },
  {
    "lineNumber": 566,
    "op": "s.d",
    "source": "s.d $f2,-100",
    "sourceTokens": [
      "s.d",
      "$f2",
      "-100"
    ],
    "defaultTemplates": [
      "sdc1 RG1,VL2($0)"
    ],
    "defaultTemplateTokens": [
      [
        "sdc1",
        "RG1",
        "VL2",
        "(",
        "$0",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store floating point Double precision : Store 64 bits from $f2 and $f3 register pair to effective memory doubleword address"
  },
  {
    "lineNumber": 567,
    "op": "s.d",
    "source": "s.d $f2,100000",
    "sourceTokens": [
      "s.d",
      "$f2",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "sdc1 RG1,VL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "sdc1",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store floating point Double precision : Store 64 bits from $f2 and $f3 register pair to effective memory doubleword address"
  },
  {
    "lineNumber": 568,
    "op": "s.d",
    "source": "s.d $f2,100000($t2)",
    "sourceTokens": [
      "s.d",
      "$f2",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, VH2",
      "addu $1, $1, RG4",
      "sdc1 RG1, VL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "VH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "sdc1",
        "RG1",
        "VL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store floating point Double precision : Store 64 bits from $f2 and $f3 register pair to effective memory doubleword address"
  },
  {
    "lineNumber": 569,
    "op": "s.d",
    "source": "s.d $f2,label",
    "sourceTokens": [
      "s.d",
      "$f2",
      "label"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "sdc1 RG1, LL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "sdc1",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [
      "sdc1 RG1, LL2($0)"
    ],
    "compactTemplateTokens": [
      [
        "sdc1",
        "RG1",
        "LL2",
        "(",
        "$0",
        ")"
      ]
    ],
    "description": "Store floating point Double precision : Store 64 bits from $f2 and $f3 register pair to effective memory doubleword address"
  },
  {
    "lineNumber": 570,
    "op": "s.d",
    "source": "s.d $f2,label($t2)",
    "sourceTokens": [
      "s.d",
      "$f2",
      "label",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LH2",
      "addu $1, $1, RG4",
      "sdc1 RG1, LL2($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LH2"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG4"
      ],
      [
        "sdc1",
        "RG1",
        "LL2",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [
      "sdc1 RG1, LL2(RG4)"
    ],
    "compactTemplateTokens": [
      [
        "sdc1",
        "RG1",
        "LL2",
        "(",
        "RG4",
        ")"
      ]
    ],
    "description": "Store floating point Double precision : Store 64 bits from $f2 and $f3 register pair to effective memory doubleword address"
  },
  {
    "lineNumber": 571,
    "op": "s.d",
    "source": "s.d $f2,label+100000",
    "sourceTokens": [
      "s.d",
      "$f2",
      "label",
      "+",
      "100000"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "sdc1 RG1, LLP($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "sdc1",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store floating point Double precision : Store 64 bits from $f2 and $f3 register pair to effective memory doubleword address"
  },
  {
    "lineNumber": 572,
    "op": "s.d",
    "source": "s.d $f2,label+100000($t2)",
    "sourceTokens": [
      "s.d",
      "$f2",
      "label",
      "+",
      "100000",
      "(",
      "$t2",
      ")"
    ],
    "defaultTemplates": [
      "lui $1, LHPA",
      "addu $1, $1, RG6",
      "sdc1 RG1, LLP($1)"
    ],
    "defaultTemplateTokens": [
      [
        "lui",
        "$1",
        "LHPA"
      ],
      [
        "addu",
        "$1",
        "$1",
        "RG6"
      ],
      [
        "sdc1",
        "RG1",
        "LLP",
        "(",
        "$1",
        ")"
      ]
    ],
    "compactTemplates": [],
    "compactTemplateTokens": [],
    "description": "Store floating point Double precision : Store 64 bits from $f2 and $f3 register pair to effective memory doubleword address"
  }
];
  referenceData.meta = {
      ...(referenceData.meta || {}),
      source: "../PseudoOps.txt",
      generatedAt: "2026-03-10T20:29:57.625Z",
  };
})();
