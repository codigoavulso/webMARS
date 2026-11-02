"""Generate the illustrated project atlas. Editorial tool; not an app dependency.

Requires Python 3 and reportlab. Run from any directory:
    python scripts/generate-project-atlas.py
Optional: --output path.pdf
All diagrams are vector drawings. No network requests or application mutations.
"""

import argparse
import json
import subprocess
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph

ROOT = Path(__file__).resolve().parents[1]
W, H = A4
M = 36
CW = W - M * 2
INK = "#173344"
MUTED = "#586C77"
TEAL = "#087E81"
BLUE = "#365F9B"
ORANGE = "#B65E27"
PAPER = "#F5F7F6"
LINE = "#D7E0E1"
PALE = "#E8F3F0"
PALE_BLUE = "#EBF0F8"
PALE_ORANGE = "#FBF0E7"
WHITE = "#FFFFFF"
EDITION_DATE = "29 de outubro de 2026"


def register_fonts():
    candidates = [Path("C:/Windows/Fonts"), Path("/usr/share/fonts/truetype/dejavu")]
    families = {
        "Body": ["segoeui.ttf", "DejaVuSans.ttf"],
        "Bold": ["segoeuib.ttf", "DejaVuSans-Bold.ttf"],
        "Mono": ["consola.ttf", "DejaVuSansMono.ttf"],
    }
    for name, filenames in families.items():
        found = next((folder / filename for folder in candidates for filename in filenames
                      if (folder / filename).exists()), None)
        if found is None:
            raise RuntimeError(f"Missing font {name}: install Segoe UI/Consolas or DejaVu Sans.")
        pdfmetrics.registerFont(TTFont(name, str(found)))
    pdfmetrics.registerFontFamily("Body", normal="Body", bold="Bold", italic="Body", boldItalic="Bold")


class Atlas:
    def __init__(self, output):
        output.parent.mkdir(parents=True, exist_ok=True)
        self.c = canvas.Canvas(str(output), pagesize=A4, pageCompression=1)
        self.c.setTitle("webMARS | Atlas do projeto: propósito, filosofia e arquitetura")
        self.c.setAuthor("Projeto webMARS")
        self.c.setSubject("Mapas de camadas, fluxos, algoritmos e limites do webMARS 0.6.6")
        self.version = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))["version"]
        self.commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
        self.tool_count = len(json.loads((ROOT / "tools/tools.json").read_text(encoding="utf-8"))["tools"])
        self.language_count = len(json.loads((ROOT / "assets/js/i18n/languages.json").read_text(encoding="utf-8"))["languages"])
        self.n = 0

    def rect(self, x, y, w, h, fill=WHITE, stroke=None, radius=0):
        self.c.setFillColor(colors.HexColor(fill))
        self.c.setStrokeColor(colors.HexColor(stroke or fill))
        if radius:
            self.c.roundRect(x, H-y-h, w, h, radius, stroke=bool(stroke), fill=1)
        else:
            self.c.rect(x, H-y-h, w, h, stroke=bool(stroke), fill=1)

    def text(self, text, x, y, w, size=10.5, color=INK, bold=False, leading=None, maxh=None):
        style = ParagraphStyle("atlas", fontName="Bold" if bold else "Body", fontSize=size,
                               leading=leading or size * 1.43, textColor=colors.HexColor(color),
                               spaceAfter=0, allowWidows=0, allowOrphans=0)
        p = Paragraph(text, style)
        _, height = p.wrap(w, H)
        if maxh is not None and height > maxh + .1:
            raise ValueError(f"Page {self.n}: text exceeds box ({height:.1f}>{maxh}): {text[:85]}")
        if y + height > H - (18 if y >= 795 else 39):
            raise ValueError(f"Page {self.n}: text crosses footer: {text[:65]}")
        p.drawOn(self.c, x, H-y-height)
        return height

    def label(self, text, x, y, color=MUTED, size=8):
        self.c.saveState()
        obj = self.c.beginText(x, H-y-size)
        obj.setFont("Bold", size)
        obj.setFillColor(colors.HexColor(color))
        obj.setCharSpace(1.05)
        obj.textLine(text.upper())
        self.c.drawText(obj)
        self.c.restoreState()

    def rule(self, x1, y1, x2, y2, color=LINE, width=1, dash=False):
        self.c.setStrokeColor(colors.HexColor(color))
        self.c.setLineWidth(width)
        self.c.setDash(3, 3) if dash else self.c.setDash()
        self.c.line(x1, H-y1, x2, H-y2)
        self.c.setDash()

    def arrow(self, x1, y1, x2, y2, color=TEAL, dash=False):
        import math
        self.rule(x1, y1, x2, y2, color, 1.35, dash)
        angle = math.atan2(y2-y1, x2-x1)
        s = 5
        p = self.c.beginPath()
        p.moveTo(x2, H-y2)
        p.lineTo(x2-s*math.cos(angle-.48), H-(y2-s*math.sin(angle-.48)))
        p.lineTo(x2-s*math.cos(angle+.48), H-(y2-s*math.sin(angle+.48)))
        p.close()
        self.c.setFillColor(colors.HexColor(color))
        self.c.drawPath(p, fill=1, stroke=0)

    def box(self, x, y, w, h, title, body="", fill=PAPER, accent=TEAL, size=10):
        self.rect(x, y, w, h, fill, LINE, 5)
        self.rect(x, y+10, 3, h-20, accent)
        th = self.text(title, x+13, y+11, w-26, size+1, bold=True, maxh=h-20)
        if body:
            self.text(body, x+13, y+16+th, w-26, size, maxh=h-23-th)

    def note(self, y, title, body, color=TEAL, fill=PALE):
        self.box(M, y, CW, 78, title, body, fill, color, 9.8)

    def page(self, section, title, intro, source):
        if self.n:
            self.c.showPage()
        self.n += 1
        self.rect(0, 0, W, H, WHITE)
        self.c.bookmarkPage(f"p{self.n}")
        self.c.addOutlineEntry(f"{self.n:02d}  {title}", f"p{self.n}", level=0)
        self.label("webMARS / Atlas do projeto", M, 20)
        self.label(section, W-214, 20, TEAL)
        self.rule(M, 43, W-M, 43)
        title_h = self.text(title, M, 58, CW, 28, bold=True, leading=32, maxh=66)
        self.text(intro, M, 69+title_h, CW, 10.5, color=MUTED, maxh=57)
        self.rule(M, 790, W-M, 790)
        self.text(source, M, 797, CW-40, 7.1, color=MUTED, maxh=25)
        self.text(f"{self.n:02d}", W-M-25, 795, 25, 12, bold=True)

    def row(self, y, n, title, body, color=TEAL):
        self.rect(M, y, 32, 32, color, radius=16)
        self.text(f"{n:02d}", M+7, y+7, 24, 11, WHITE, True)
        self.text(title, M+47, y-1, CW-47, 13, bold=True)
        self.text(body, M+47, y+24, CW-47, 10.2, color=MUTED, maxh=51)

    def cover(self):
        self.n = 1
        self.c.bookmarkPage("p1")
        self.c.addOutlineEntry("01  Atlas do projeto", "p1", level=0)
        self.rect(0, 0, W, H, INK)
        for x in range(36, 580, 26):
            self.rule(x, 270, x, 720, "#223E4F", .4)
        for y in range(270, 721, 26):
            self.rule(36, y, W-36, y, "#223E4F", .4)
        self.label("Arquitetura explicada / 01", M, 34, "#8FC6C3")
        self.text("webMARS", M, 82, CW, 56, WHITE, True)
        self.text("Atlas do projeto", M, 158, CW, 31, WHITE, True)
        self.text("Propósito, filosofia e arquitetura", M, 207, CW, 17, "#BDD3DB")
        self.label("Da ideia à máquina observável", M, 284, "#8FC6C3")
        stages = [
            ("PROGRAMA", "Mini-C ou Assembly", TEAL),
            ("MÁQUINA", "Instruções, memória e registos", BLUE),
            ("OBSERVAÇÃO", "Depuração, ferramentas e pipeline", ORANGE),
        ]
        for i, (title, body, accent) in enumerate(stages):
            y = 324+i*99
            self.box(M+34, y, CW-68, 75, title, body, WHITE, accent, 11)
            if i < 2:
                self.arrow(W/2, y+76, W/2, y+96, "#8FC6C3")
        self.text("Um ambiente educativo que aproxima o código do comportamento da máquina e torna as diferenças visíveis.",
                  M, 654, CW, 16, WHITE, leading=23)
        self.rule(M, 746, W-M, 746, "#49606D")
        self.text(f"LEITURA DO PRODUTO  {self.version}    /    EDIÇÃO  1.0", M, 761, CW, 8.8, "#BDD3DB", True)
        self.text(f"{EDITION_DATE}  |  PT-PT  |  Fonte: {self.commit[:12]}", M, 783, CW, 8, "#BDD3DB")

    def scope(self):
        self.page("02 / Escopo", "Uma plataforma, quatro escalas",
                  "O webMARS liga programação, execução, exploração de arquitetura e partilha de trabalho. Cada escala acrescenta contexto ao mesmo programa.",
                  "Fontes: README.md; tools/tools.json; manual/content/shared.mjs; webmars-config.js.")
        layers = [
            ("04", "Partilhar e ensinar", "Projetos Cloud, publicações, exemplos e manual.", PAPER, MUTED),
            ("03", "Explorar arquitetura", f"{self.tool_count} ferramentas: pipeline, cache, dispositivos e representações.", PALE_ORANGE, ORANGE),
            ("02", "Executar e compreender", "Montar, executar, depurar e recuar sobre o estado MIPS.", PALE_BLUE, BLUE),
            ("01", "Construir o programa", "Assembly MIPS e Mini-C, com projetos e vários ficheiros.", PALE, TEAL),
        ]
        for i, (n, title, body, fill, accent) in enumerate(layers):
            y = 166+i*83
            self.box(M+i*11, y, CW-i*22, 70, f"{n}  {title}", body, fill, accent, 10)
        self.label("Quem ganha com esta ligação", M, 525)
        third = (CW-20)/3
        for i, (title, body) in enumerate([
            ("Aprendente", "Vê como o código altera memória e registos."),
            ("Docente", "Partilha exemplos e compara hipóteses em aula."),
            ("Instituição", "Aloja a sua instalação e escolhe os serviços Online."),
        ]):
            self.box(M+i*(third+10), 549, third, 110, title, body, size=9.6)
        self.note(688, "Fronteira do produto", "Mini-C é um subconjunto de C. O runtime é um simulador educativo; o sistema de ficheiros é virtual e os serviços Online são opcionais.")

    def philosophy(self):
        self.page("03 / Filosofia", "Princípios que orientam decisões",
                  "Esta leitura da filosofia resulta das fronteiras e dos comportamentos já presentes no projeto. Cada princípio tem uma consequência concreta.",
                  "Fontes: docs/code-architecture.md; docs/runtime-invariants.md; docs/pipeline-lab.md; TODO_0.7.0.txt.")
        entries = [
            ("Aprender pela observação", "Código, instruções, memória, registos e E/S descrevem a mesma máquina. Uma explicação deve poder ser confrontada com o estado visível."),
            ("Autonomia local", "Editar, compilar, montar e executar não exigem conta. A persistência no browser mantém-se sujeita a quotas, falhas e políticas de limpeza."),
            ("Separar factos de modelos", "Uma instrução executada é um facto do runtime. Um ciclo de pipeline pertence a uma configuração e a um fluxo declarados."),
            ("Preservar o trabalho", "Uma falha de gravação é um erro. Eliminar localmente não apaga a cópia Cloud; um conflito exige uma decisão explícita."),
            ("Compatibilidade demonstrável", "A referência MARS, os testes e as diferenças declaradas sustentam as afirmações de compatibilidade. Uma percentagem isolada não prova correção."),
            ("Coerência na experiência", f"Projetos e localizações partilham a mesma estrutura visual. Temas, teclado e {self.language_count} idiomas atravessam os vários fluxos."),
        ]
        for i, (title, body) in enumerate(entries):
            self.row(163+i*98, i+1, title, body, [TEAL, BLUE, ORANGE][i % 3])

    def layers(self):
        self.page("04 / Camadas", "Como o sistema se organiza",
                  "Mapa conceptual dos módulos atuais. As setas mostram ligações de coordenação ou circulação de resultados; a posição não representa a ordem de carregamento.",
                  "Fontes: assets/js/app.bundle.js; docs/code-architecture.md. O código usa scripts ordenados e globais partilhados.")
        self.box(M, 159, CW, 65, "Experiência", "Editor, gestor de projetos, menus, janelas, ajuda e traduções.", PALE_BLUE, BLUE, 10)
        self.arrow(W/2, 225, W/2, 241)
        self.box(M+49, 244, CW-98, 66, "Coordenação da aplicação", "20-app-runtime.js liga comandos, estado, persistência e serviços.", PALE, TEAL, 10)
        for x in [M+80, W/2, W-M-80]:
            self.arrow(W/2, 311, x, 336)
        w = (CW-20)/3
        nodes = [
            ("Compilação", "Interface leve; motor Mini-C carregado a pedido."),
            ("Projetos", "Catálogo, recuperação, localizações e sincronização."),
            ("Ferramentas", "Janelas, snapshots e entrega de eventos."),
        ]
        for i, (title, body) in enumerate(nodes):
            self.box(M+i*(w+10), 339, w, 104, title, body, size=9.4)
        self.arrow(M+80, 445, M+80, 471)
        self.text("Assembly", M+87, 449, 110, 8.3, TEAL)
        self.rule(M+48, 278, M-12, 278, TEAL, 1.2, True)
        self.rule(M-12, 278, M-12, 512, TEAL, 1.2, True)
        self.arrow(M-12, 512, M-1, 512, TEAL, True)
        self.arrow(W-M-80, 471, W-M-80, 445, BLUE)
        self.box(M, 474, CW, 84, "Núcleo MIPS - 00-core.js", "Assembler, memória, registos, instruções, syscalls, exceções e backstep. O núcleo não acede ao DOM nem ao armazenamento do browser.", PALE_BLUE, BLUE, 10)
        self.label("Fronteira do browser", M, 593)
        self.rule(M, 616, W-M, 616, MUTED, 1, True)
        self.box(M, 635, 252, 106, "Serviços Online opcionais", "BackMars: contas, projetos privados, publicações e versões remotas.", PAPER, MUTED, 9.7)
        self.box(M+265, 635, CW-265, 106, "Recolha separada", "Métricas de utilização e agregados. Não executa o programa MIPS.", PAPER, MUTED, 9.7)

    def program(self):
        self.page("05 / Transformação", "Da intenção ao estado da máquina",
                  "Compilar, montar e executar são operações distintas. O mesmo caminho de montagem recebe tanto Assembly escrito à mão como Assembly gerado por Mini-C.",
                  "Fontes: 17-mini-c-interface.js; 17-mini-c-compiler.js; 00-core.js; tests/c-compiler-regression.test.mjs.")
        self.box(M, 161, 241, 65, "Mini-C", "Análise, validação e geração de Assembly.", PALE, TEAL, 10)
        self.box(M+282, 161, 241, 65, "Assembly escrito à mão", "Instruções, dados, macros e diretivas.", PALE_BLUE, BLUE, 10)
        self.arrow(M+120, 228, W/2, 261)
        self.arrow(M+402, 228, W/2, 261)
        self.box(M+77, 264, CW-154, 56, "Fonte Assembly comum", "Ponto de encontro dos dois percursos.", PAPER, TEAL, 9.5)
        self.label("Algoritmo de montagem / visão simplificada", M, 345)
        self.box(M, 368, CW, 69, "1. Preparar e atribuir endereços", "Interpretar fontes, símbolos, diretivas e expansões; determinar posições de código e dados.", PALE_BLUE, BLUE, 10)
        self.arrow(W/2, 438, W/2, 454)
        self.box(M, 457, CW, 69, "2. Resolver e codificar", "Resolver referências e gerar instruções e dados. Os diagnósticos mantêm a ligação à fonte.", PALE_BLUE, BLUE, 10)
        self.arrow(W/2, 527, W/2, 549)
        self.box(M, 552, CW, 69, "Imagem montada", "Segmento de texto + dados + símbolos: a entrada da execução e da observação.", PALE, TEAL, 10)
        self.arrow(W/2, 623, W/2, 644)
        self.box(M, 647, CW, 68, "Executar e inspecionar", "O motor altera o estado MIPS; editor, registos, memória e ferramentas mostram o resultado.", PAPER, ORANGE, 10)
        self.text("Um erro de compilação ou de montagem deve ser resolvido na respetiva fase. Montar um programa não equivale a executá-lo.", M, 739, CW, 10, MUTED)

    def step(self):
        self.page("06 / Execução", "Um passo que pode ser explicado",
                  "O caminho normal de uma instrução produz alterações observáveis e a informação necessária para recuar. Este esquema omite os desvios de exceção e de espera por input.",
                  "Fontes: docs/runtime-invariants.md; 00-core.js; tests/runtime-memory-invariants.test.mjs; docs/tool-api.md.")
        y = 166
        labels = [
            ("Ler e descodificar", "Usar PC e imagem montada."),
            ("Validar e executar", "Aplicar semântica, alinhamento e mapa de memória."),
            ("Registar alterações", "Capturar deltas inversos dos elementos modificados."),
            ("Concluir e notificar", "Atualizar estado, histórico, snapshots e eventos."),
        ]
        for i, (title, body) in enumerate(labels):
            self.box(M, y+i*91, 317, 72, title, body, PALE_BLUE if i%2==0 else PAPER, BLUE, 10)
            if i < 3:
                self.arrow(M+158, y+i*91+73, M+158, y+(i+1)*91-4, BLUE)
        self.box(M+339, 166, CW-339, 345, "Histórico inverso", "PC anterior<br/><br/>Registos escritos<br/><br/>Bytes de memória<br/><br/>Estado adicional capturado<br/><br/><b>Limites de passos e de bytes</b>", PALE, TEAL, 10)
        self.arrow(M+318, 384, M+337, 384)
        self.arrow(M+423, 514, M+423, 548, TEAL)
        self.box(M, 552, CW, 79, "Passo atrás", "Aplicar os deltas inversos pela ordem inversa. As ferramentas que mantêm estado próprio acompanham a reversão através do respetivo contrato.", PALE, TEAL, 10.2)
        self.label("Invariantes que protegem a explicação", M, 658)
        for i, (title, body) in enumerate([
            ("$zero", "Permanece zero."),
            ("Memória", "Acessos passam pela API."),
            ("Snapshot", "Consumidores não o alteram."),
        ]):
            w=(CW-20)/3
            self.box(M+i*(w+10), 682, w, 82, title, body, PAPER, MUTED, 9.3)

    def clocks(self):
        self.page("07 / Microarquitetura", "Duas perguntas, dois relógios",
                  "O runtime responde «o que fez o programa?». O Pipeline Lab responde «como o modelo distribui essas instruções por ciclos?». Os dois contadores não são equivalentes.",
                  "Fontes: docs/pipeline-lab.md; tools/pipeline-lab.js; tests/pipeline-execution-trace.test.mjs.")
        self.box(M, 164, 252, 104, "Runtime funcional", "Executa a semântica MIPS.<br/>Um passo corresponde a uma instrução.<br/>Produz estado e registo de execução.", PALE_BLUE, BLUE, 10)
        self.box(M+271, 164, CW-271, 104, "Modelo de pipeline", "Simula ciclos de uma microarquitetura.<br/>Observa instruções e configurações.<br/>Não altera o estado funcional.", PALE_ORANGE, ORANGE, 10)
        self.label("Dois fluxos possíveis para o modelo", M, 298)
        self.box(M, 322, 252, 91, "Estático", "Instruções montadas e hipótese declarada para os saltos. Sem valores de execução.", PAPER, MUTED, 10)
        self.box(M+271, 322, CW-271, 91, "Execução registada", "Sequência realmente executada, com leituras, escritas e resultados dos saltos observados.", PALE, TEAL, 10)
        self.arrow(M+126, 415, W/2, 447, ORANGE)
        self.arrow(M+397, 415, W/2, 447, ORANGE)
        self.label("Cinco estágios / modelo in-order", M, 464)
        stage_w=(CW-32)/5
        for i, (label, desc) in enumerate([("IF", "Busca"), ("ID", "Descodifica"), ("EX", "Opera"), ("MEM", "Memória"), ("WB", "Conclui")]):
            x=M+i*(stage_w+8)
            self.box(x, 488, stage_w, 72, label, desc, PALE_ORANGE, ORANGE, 8.8)
            if i<4:
                self.arrow(x+stage_w, 523, x+stage_w+7, 523, ORANGE)
        self.text("Forwarding, stalls, predição e latência alteram a ocupação dos estágios. O CPI é uma medida do modelo, sob a configuração escolhida.", M, 587, CW, 11, maxh=53)
        self.note(676, "O que a interpretação deve preservar", "Não converter ciclos modelados em velocidade real do browser. Não atribuir resultados reais de saltos ao fluxo estático. O replay utiliza apenas o que foi observado.", ORANGE, PALE_ORANGE)

    def projects(self):
        self.page("08 / Projetos", "Um projeto, várias localizações",
                  "Uma localização descreve onde se consulta ou conserva uma cópia. Uma publicação é um snapshot partilhado; não é a pasta editável do autor.",
                  "Fontes: 11-ui-file-manager.js; 20-project-repository.js; 20-project-bootstrap.js; 21-project-manager.js.")
        self.box(M, 164, CW, 72, "Projeto = identidade + ficheiros + metadados", "Ficheiros e pastas organizam o conteúdo. O projeto é a unidade de trabalho, sincronização e publicação.", PALE, TEAL, 10.2)
        w=(CW-20)/3
        for i, (title, body, fill, accent) in enumerate([
            ("Neste dispositivo", "Cópia editável e catálogo confirmado no browser.", PALE, TEAL),
            ("Nuvem", "Documento privado numa conta BackMars, com versão remota.", PALE_BLUE, BLUE),
            ("Biblioteca pública", "Publicações e revisões imutáveis; abrir cria uma cópia local.", PALE_ORANGE, ORANGE),
        ]):
            self.box(M+i*(w+10), 265, w, 119, title, body, fill, accent, 9.6)
        self.arrow(M+160, 402, M+352, 402, BLUE)
        self.arrow(M+352, 402, M+160, 402, BLUE)
        self.text("Sincronização explícita entre cópias", M+93, 417, 340, 9.3, MUTED)
        self.label("Ações pertencem ao contexto", M, 462)
        rows = [
            ("Local", "Editar, organizar, sincronizar, exportar, reciclar."),
            ("Nuvem", "Consultar, abrir/sincronizar e gerir a cópia remota."),
            ("Publicações", "Consultar; o autor gere revisões e arquivo."),
            ("Reciclagem", "Restaurar ou eliminar definitivamente, conforme a seleção."),
        ]
        for i,(left,right) in enumerate(rows):
            y=486+i*42
            self.rect(M,y,CW,39,PAPER if i%2==0 else WHITE)
            self.text(left,M+10,y+9,102,9.7,bold=True)
            self.text(right,M+118,y+9,CW-128,9.7,maxh=30)
        self.note(683, "Fonte de verdade atual", "O catálogo confirmado em localStorage prevalece, mesmo vazio. IndexedDB funciona como espelho de recuperação; a migração para armazenamento principal ainda não está concluída.")

    def sync(self):
        self.page("09 / Algoritmo", "Sincronizar sem perder decisões",
                  "Fluxo conservador da gravação de um projeto na Cloud. O ponto decisivo é comparar a cópia remota atual antes de qualquer substituição.",
                  "Fonte: 20-app-runtime.js: saveProjectToCloud e resolveCloudProjectConflict; tests/cloud-sync-contract-regression.test.mjs.")
        self.box(M+53, 161, CW-106, 64, "Preparar cópia local válida", "Incorporar edições e obter o projeto remoto atual.", PALE_BLUE, BLUE, 10)
        self.arrow(W/2, 226, W/2, 244)
        self.box(M, 247, CW, 74, "Comparar existência e conteúdo", "Não existe: criar. É igual: confirmar sem substituir. É diferente: apresentar o conflito ao utilizador.", PAPER, TEAL, 10)
        self.arrow(W/2, 322, W/2, 345)
        self.box(M+34, 348, CW-68, 69, "Comparar lado a lado", "Conteúdo local e conteúdo Cloud; cancelar mantém ambas as cópias.", PALE_ORANGE, ORANGE, 10.2)
        w=(CW-20)/3
        choices=[("Manter ambas", "Pedir nome livre e criar uma cópia separada."),
                 ("Manter local", "Substituir a cópia remota com a versão revista."),
                 ("Manter Cloud", "Importar a cópia remota escolhida para o dispositivo.")]
        for i,(title,body) in enumerate(choices):
            x=M+i*(w+10)
            self.arrow(W/2, 419, x+w/2, 443, ORANGE)
            self.box(x, 446, w, 115, title, body, PAPER, ORANGE, 9.7)
        self.arrow(W/2, 564, W/2, 587)
        self.box(M, 590, CW, 83, "Proteção contra alterações simultâneas", "A substituição remota usa If-Match com o ETag da cópia revista. Se outra sessão a alterou entretanto, o servidor recusa a gravação obsoleta; é preciso rever a diferença atual.", PALE, TEAL, 10)
        self.text("A sincronização da coleção também trata correspondências e diferenças entre projetos. Este mapa não representa uma fusão automática de linhas: a decisão de conflito escolhe cópias completas.", M, 704, CW, 10.3, MUTED)

    def data(self):
        self.page("10 / Dados e rede", "Fronteiras de confiança e de dados",
                  "Execução, contas e estatísticas cumprem funções diferentes. A arquitetura deve tornar claro que informação atravessa cada fronteira.",
                  "Fontes: webmars-config.js; docs/usage-metrics.md; docs/code-architecture.md; manual/content/chapters-operations.mjs.")
        self.box(M, 163, CW, 96, "Browser do utilizador", "Fontes, estado MIPS, ficheiros, preferências e projetos locais. Compilação e simulação decorrem aqui; o servidor não executa o programa MIPS.", PALE, TEAL, 10.5)
        w=(CW-20)/3
        for i,x in enumerate([M+w/2,M+w+10+w/2,M+2*(w+10)+w/2]):
            self.arrow(x,262,x,320,[MUTED,BLUE,ORANGE][i])
        nodes=[
            ("Alojamento estático", "Entrega app, exemplos, ferramentas, ajuda e manual.", PAPER, MUTED),
            ("BackMars", "Sessão, contas, projetos privados e publicações autorizadas.", PALE_BLUE, BLUE),
            ("Métricas", "Eventos de utilização e heartbeat para agregação estatística.", PALE_ORANGE, ORANGE),
        ]
        for i,(title,body,fill,accent) in enumerate(nodes):
            self.box(M+i*(w+10),324,w,140,title,body,fill,accent,9.7)
        self.label("O que pode sair do browser",M,494)
        self.text("<b>Projetos:</b> o documento do projeto atravessa a rede quando é sincronizado ou publicado. A publicação torna pública a revisão escolhida.",M,521,CW,10.4)
        self.text("<b>Utilização:</b> a instalação oficial tem recolha automática configurada. Os eventos não incluem o texto do programa; relatórios públicos mostram agregados.",M,581,CW,10.4)
        self.note(680,"Local por omissão não significa ausência de rede","O alojamento, a consulta de sessão e os coletores configurados podem originar pedidos. Sessões medidas não são pessoas únicas; a classificação de tráfego é heurística, não prova de humanidade.",ORANGE,PALE_ORANGE)

    def trust(self):
        self.page("11 / Evidência", "Uma afirmação precisa de um rasto",
                  "A confiança resulta de ligar comportamento, verificação e artefacto publicado. Os números abaixo pertencem aos relatórios desta versão, não a uma promessa sobre todo o MIPS.",
                  "Fontes: docs/mars-conformance.md; docs/mutation-report.md; docs/coverage-report.md; .github/workflows/validate.yml.")
        metrics=[("8", "casos idênticos ao MARS"),("3", "diferenças declaradas"),("0", "diferenças sem explicação")]
        w=(CW-20)/3
        for i,(num,label) in enumerate(metrics):
            x=M+i*(w+10)
            self.rect(x,165,w,104,PALE,radius=5)
            self.text(num,x+13,176,w-26,34,TEAL,True)
            self.text(label,x+13,229,w-26,9.4,INK,maxh=30)
        self.text("Comparação diferencial de 11 programas com uma referência MARS 4.5 fixada por SHA-256. O conjunto é limitado e as diferenças têm reproduções documentadas.",M,290,CW,10.6,MUTED)
        self.label("Da alteração à publicação",M,354)
        stages=[("1. Verificação funcional","Regressões do motor, compilador, ferramentas, persistência e fluxos."),
                ("2. Qualidade da verificação","Cobertura com limites por módulo e mutações selecionadas; 12 defeitos introduzidos foram detetados."),
                ("3. Coerência do produto","Idiomas, manual, referências, ligações, carregamento e pacote estático."),
                ("4. Artefacto identificável","Versão + build AAAAMMDDhhmm + pacote com checksums; uma base concreta para reproduzir problemas.")]
        for i,(title,body) in enumerate(stages):
            self.box(M,380+i*91,CW,73,title,body,PAPER,[BLUE,TEAL,ORANGE,MUTED][i],10)
            if i<3:self.arrow(W/2,454+i*91,W/2,468+i*91,MUTED)
        self.text("Cobertura mede execução de código; não demonstra correção. Testes de mutação avaliam apenas os defeitos introduzidos. Interface visual e condições reais exigem observação própria.",M,755,CW,8.7,MUTED,maxh=29)

    def future(self):
        self.page("12 / Continuidade", "O que preservar. O que evoluir.",
                  "A evolução deve simplificar a manutenção sem diluir os contratos que tornam a aplicação compreensível e o trabalho recuperável.",
                  f"Edição 1.0 | {EDITION_DATE} | Produto {self.version} | Código {self.commit[:12]} | Fontes navegáveis no guia do atlas.")
        self.box(M,164,252,186,"Preservar","Núcleo sem dependência do DOM.<br/><br/>Execução funcional separada do timing.<br/><br/>Trabalho local sem conta obrigatória.<br/><br/>Decisões explícitas nos conflitos.<br/><br/>Exemplos e referências verificáveis.",PALE,TEAL,10)
        self.box(M+271,164,CW-271,186,"Evoluir - trabalho em aberto","Extrair responsabilidades dos módulos extensos.<br/><br/>Completar, se adotada, a migração para IndexedDB principal.<br/><br/>Manter coerência de UI e contratos durante cada extração.",PALE_ORANGE,ORANGE,10)
        self.label("Critérios para avaliar uma mudança",M,383)
        questions=["Ajuda a compreender o programa ou reduz fricção real?", "Mantém clara a origem dos dados e das medições?", "Preserva trabalho perante falha, quota e concorrência?", "Tem uma fronteira e uma verificação observáveis?"]
        for i,q in enumerate(questions):
            self.rule(M,410+i*44,W-M,410+i*44)
            self.text(f"0{i+1}",M,421+i*44,29,10.5,TEAL,True)
            self.text(q,M+38,421+i*44,CW-38,10.3)
        self.label("Mapa de leitura das fontes",M,613)
        refs=[("Arquitetura e contratos","docs/code-architecture.md; docs/tool-api.md"),
              ("Semântica e modelos","docs/runtime-invariants.md; docs/pipeline-lab.md"),
              ("Dados e prova","docs/usage-metrics.md; docs/evidence.md"),
              ("Limites e continuidade","TODO_0.7.0.txt; docs/comparison-matrix.md")]
        for i,(title,files) in enumerate(refs):
            y=640+i*31
            self.text(title,M,y,184,9,bold=True)
            self.text(files,M+188,y,CW-188,8.2,MUTED)
        self.text("As camadas deste atlas são mapas conceptuais dos ficheiros atuais. As propostas de evolução não representam funcionalidades já entregues nem datas de compromisso.",M,756,CW,8.5,MUTED,maxh=27)

    def generate(self):
        for section in [self.cover,self.scope,self.philosophy,self.layers,self.program,self.step,
                        self.clocks,self.projects,self.sync,self.data,self.trust,self.future]:
            section()
        self.c.save()


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output",type=Path,default=ROOT/"output/pdf/webmars-atlas-do-projeto.pdf")
    args=parser.parse_args()
    register_fonts()
    atlas=Atlas(args.output)
    atlas.generate()
    print(f"Atlas: {args.output.resolve()} ({atlas.n} pages; webMARS {atlas.version}; {atlas.commit[:12]})")


if __name__ == "__main__":
    main()
