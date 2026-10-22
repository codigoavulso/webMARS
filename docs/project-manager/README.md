# Nova gestão de projetos e ficheiros

Estado: especificação para implementação; não implementada. Data: 22-10-2026.

Este pacote redefine o modelo do produto, não apenas o aspeto do explorador. É a referência para a próxima IA implementar o sistema em webMARS e BackMars. Não autoriza Git, publicação de releases ou alterações no Raspberry Pi.

## Ler nesta ordem

1. [Modelo do produto e requisitos](REQS.md): decisões fundamentais e comportamentos obrigatórios.
2. [Desenho da interface](DESIGN.md): navegação, ações, estados e regras visuais.
3. [Plano técnico](IMPLEMENTATION.md): contratos, migração e sequência de implementação.
4. [Aceitação](ACCEPTANCE.md): cenários que provam que o sistema está resolvido.
5. [Instruções para a IA](HANDOFF.md): prompt de execução e regras de trabalho.

As decisões marcadas como requisitos são vinculativas. Os nomes dos módulos novos são propostas de organização; podem ser adaptados ao carregador atual sem mudar os contratos. Funcionalidades explicitamente excluídas não são necessárias para concluir esta entrega.

## A decisão central

**O projeto contém os ficheiros. O editor abre vistas desses ficheiros. A Cloud guarda uma cópia privada ligada por identidade. Publicar cria uma versão independente para partilhar.**

Fechar um separador nunca elimina um ficheiro. Renomear nunca cria outro projeto. Entrar numa conta nunca funde projetos pelo nome. Guardar nunca publica. Arquivar uma publicação não elimina a cópia privada.

## Resultado esperado

Um gestor de projetos com vistas coerentes para **Neste dispositivo**, **Cloud**, **Biblioteca pública**, **As minhas publicações** e **Reciclagem**. O painel Projeto do editor usa os mesmos componentes e comandos, limitados ao projeto ativo. Os menus existentes passam a abrir a vista certa deste gestor, em vez de criar fluxos concorrentes.

O trabalho está organizado em etapas verificáveis, não numa promessa de conclusão por tempo decorrido. A entrega só está concluída quando os requisitos e cenários obrigatórios passam nos dois repositórios e num navegador real.

## Base examinada

- Frontend: `assets/js/app-modules/10-ui.js`, `11-ui-file-manager.js`, `13-ui-menu-system.js`, `19-public-library.js`, `20-app-runtime.js`; `assets/css/styles.css`; configuração e testes atuais.
- Backend: repositório irmão `../backmars`, em particular `projects.py`, `publications.py`, `models.py`, `db.py`, `schema.sql`, `utils.py` e testes.
- A captura fornecida mostra uma execução local sem ligação ao serviço configurado em `localhost:5000`. Não prova que a biblioteca de produção esteja vazia.
- O workspace já contém alterações anteriores. Devem ser preservadas. Estes documentos não afirmam que todas as falhas possíveis foram reproduzidas.
