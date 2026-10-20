# Self-hosting, privacidade e suporte

## Antes de abrir a instância

- [ ] webMARS e BackMars têm URLs e versões registadas.
- [ ] HTTPS, CORS, limites e fallback `/e`/`/p` foram testados.
- [ ] `SECRET_KEY`, pepper e SMTP estão fora do código, em ficheiro `0600`.
- [ ] Diretório da base de dados é privado e existe backup verificado.
- [ ] Registo, verificação, reset, publicação e revisão fixa passaram smoke tests.
- [ ] Política de retenção, logs, suporte e incidente está publicada.
- [ ] A área de privacidade descreve a recolha automática de métricas, se configurada.
- [ ] O painel Ajuda → Estatísticas de utilização foi testado para 60 minutos, 24 horas e 30 dias.
- [ ] Existe contacto institucional para utilizadores.

## Separação de dados

- Local: fontes, preferências, execução e downloads no browser/dispositivo.
- Cloud: conta e projetos enviados explicitamente ao BackMars.
- Biblioteca: snapshot sanitizado publicado explicitamente; leitura anónima.
- SMTP: apenas códigos temporários e avisos; credenciais só no servidor.
- Métricas da instalação oficial: eventos e tempos aproximados enviados automaticamente,
  com sessão temporária e categorias limitadas; fontes, input/output e contas ficam fora.
- Estatísticas públicas: apenas agregados; sessões não são pessoas únicas ou contas registadas.
- Manual: pesquisa local e sem telemetria.

## Estatísticas e leitura dos dados

O coletor Python/SQLite é um serviço separado do BackMars e do site estático.
Os endpoints de eventos e agregados devem pertencer à origem da app; a base de
métricas conserva registos durante 35 dias. O operador informa a política na área
de privacidade de Ajuda/Sobre e nas páginas públicas correspondentes.

Na instalação oficial, as preferências de interface não controlam a recolha e
não existe um diálogo de aceitação nem uma caixa de estatísticas. Cada instalação
própria configura o seu coletor. O heartbeat partilha o fluxo de eventos e envia
presença visível a cada 60 segundos; interação e presença são relógios separados.

Compare períodos equivalentes sob a mesma política de recolha. Um crescimento de
sessões não demonstra mais pessoas únicas; uma execução bem-sucedida não prova
a correção de um exercício. Estas métricas não são um sistema de avaliação.

## Pedido de suporte seguro

Enviar: hostname, versões, browser/SO, passos, URL público e mensagem de erro.

Nunca enviar: App Password, `SECRET_KEY`, pepper, cookie, código temporário,
base de dados ou ficheiros de alunos numa conversa pública.
