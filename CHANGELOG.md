# Histórico de versões

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o versionamento segue o [SemVer](https://semver.org/lang/pt-BR/).

## [Não lançado]

### Adicionado
- Roteiro de **Primeiros passos** para fazendas novas, com busca do local no mapa (OpenStreetMap), GPS ou toque no mapa.
- Cadastro de operadores pela tela de Equipe.
- **Central de notificações** com contador, leitura e avisos no aparelho (notificação do sistema).
- Foto nos lançamentos de estoque.
- Diálogos de confirmação e avisos no visual do app (no lugar das caixas do navegador).

### Segurança
- Credenciais de demonstração removidas do código, da documentação e da tela de login; senha e chaves são geradas localmente na primeira execução.
- Bloqueio contra força bruta no login, limite de cadastros por IP e política de senha forte (bcrypt custo 12).
- Cabeçalhos de segurança (CSP, HSTS, anti-clickjacking) na API e no app; limite de tamanho das requisições.
- Produção exige segredos fortes (JWT, banco) e desliga Swagger e console H2; Docker com segredos no .env.
- Auditoria de eventos de segurança, CodeQL, Dependabot e npm audit no CI. Documentação em SECURITY.md e docs/SEGURANCA.md.

### Corrigido
- A janela nativa de usuário e senha do navegador podia aparecer quando um servidor antigo pedia autenticação Basic.

## [1.1.0] - 2026-10-02

### Adicionado
- **Várias fazendas na mesma conta**: seletor no menu (e no cabeçalho do celular), cadastro de fazenda nova com "usar minha localização" e tela de primeiro acesso para contas sem fazenda.
- Dados separados por fazenda: estoque, talhões, safras, frota, equipe, sensores e alertas. Os mesmos códigos podem existir em fazendas diferentes.
- Controle de acesso: cada usuário só vê e altera as fazendas de que é membro.
- Segunda fazenda de demonstração: Fazenda Boa Vista (Rio Verde/GO), com pivô de irrigação.
- Cache offline e fila de sincronização por fazenda: o lançamento feito sem sinal vai para a fazenda de origem.

### Corrigido
- Diálogos abertos pelo cabeçalho no celular ficavam cortados no topo da tela.
- O mesmo usuário podia cadastrar duas fazendas com o mesmo nome.
- A foto da tela de entrada aparecia borrada: agora usa só as fotos de maior resolução, exportadas com mais qualidade.

## [1.0.0] - 2026-10-02

Primeira versão da reestruturação completa do GreenAgri: o site em HTML e JavaScript virou uma API Java e um app React que funciona offline.

### Adicionado
- **Estoque** com saldo calculado por movimentações (entrada, saída e inventário), estoque mínimo, histórico e **foto do produto** pela câmera ou galeria.
- **Lavouras no mapa** (Leaflet + OpenStreetMap): talhões desenhados no mapa, filtro por safra, ciclo da lavoura (planejada → em desenvolvimento → em colheita → concluída) com histórico.
- **Colheita → estoque**: ao concluir a colheita, a produção entra no estoque do produto escolhido.
- **Frota** com horímetro, revisões e o operador de cada máquina.
- **Equipe de campo**: operadores disponíveis, em atividade ou ausentes, com habilitações por tipo de máquina, e alocação em atividades, máquinas e talhões.
- **Campo conectado (IoT)**: estação meteorológica, sensores de solo e de silo, alertas agronômicos e comparação do silo com o estoque.
- **Rastreador da colheitadeira** (ESP32 + GPS): ao começar a operar dentro de um talhão, a colheita passa para *em colheita* sozinha.
- **Funcionamento offline** (PWA): o app abre sem sinal, guarda os lançamentos e sincroniza quando a conexão volta, sem lançar em dobro.
- **Visão geral** com o carrossel de fotos do campo, a safra atual, o clima e os indicadores do dia.
- Login com JWT, documentação da API (Swagger), Docker Compose com PostgreSQL e CI no GitHub Actions.
- Firmware ESP32 (PlatformIO) e simulador de dispositivos para testar sem hardware.

### Alterado
- Visual refeito: layout mobile-first, menu por seções, fonte Inter e o **logo novo**.
- Projeto separado em `backend/` e `frontend/`.

### Corrigido
- Credenciais que ficavam escritas no JavaScript foram substituídas por autenticação real.
- A edição de produto chamava uma rota inexistente e a página de reclamação travava ao enviar.
- Encerrar uma atividade da equipe gravava, mas respondia com erro 500.
- Trocar a unidade de um produto com saldo corrompia o estoque; agora é bloqueado.

[1.1.0]: https://github.com/victorgeroto/GreenAgri/releases/tag/v1.1.0
[1.0.0]: https://github.com/victorgeroto/GreenAgri/releases/tag/v1.0.0
