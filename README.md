# Log Horizon TRPG — Português (Brasil)

Módulo do Foundry VTT que traduz o sistema **Log Horizon TRPG** (`lhtrpg`) para o português do Brasil.

| | |
|---|---|
| Foundry VTT | **V14** (mínimo 14; feito sobre o código da 14.367, para a série 14.365–14.369) |
| Sistema | Log Horizon TRPG **2.1.0** ou mais recente |
| Dependências | nenhuma (não precisa de Babele nem libWrapper) |
| Recomendado | [Tradução do Foundry VTT para pt-BR](https://foundryvtt.com/packages/pt-BR) (módulo `pt-BR`), para a interface do próprio Foundry |

## O que é traduzido

- **Interface do sistema** — fichas de personagem, de monstro, de itens e de pilhas (espólio, baú, mercador),
  navegador de habilidades, seleção de raça/classe/subclasse, editor de efeitos, cartões de chat, rastreador
  de combate, notificações, configurações e dicas (todas as 767 chaves do sistema).
- **Compêndios** — os 11 compêndios do sistema, com nomes, descrições, efeitos e pastas:
  raças, classes e subclasses; habilidades básicas, comuns/de subclasse, raciais, de arquétipo, de classe e de
  montaria; poderes EX do Mestre; itens; bestiário (monstros e as habilidades deles); e o diário de regras.
- **Termos de jogo** — tags (`[Duas Mãos]`, `[Harmonia]`…) e os campos Momento, Alcance, Alvo, Custo, Limite e
  Teste (`Maior`, `4Qd`, `Amplo 20 (E)`, `Ódio 2`, `1/Cena`, `Oposto (Precisão vs Esquiva)`…), nas fichas, nos
  menus e nos cartões de chat.

O vocabulário segue o [glossário](docs/GLOSSARIO.md) (NH = Nível de Habilidade, NP = Nível de Personagem,
PV, Destino, Ódio, Processo de Abertura/Encerramento etc.).

## Instalação

No Foundry: **Módulos de Expansão → Instalar Módulo**, cole no campo **URL do Manifesto** e clique em
**Instalar**:

```
https://github.com/rezendesjoao/lhttrpg-br/releases/latest/download/module.json
```

Esse endereço sempre aponta para a versão mais recente, então o Foundry também avisa quando houver
atualização. Para instalar à mão, extraia o zip da [última versão](https://github.com/rezendesjoao/lhttrpg-br/releases/latest)
em `Data/modules/lhtrpg-pt-br/`.

## Como usar

1. Ative o módulo no mundo de Log Horizon TRPG.
2. Em **Configurações → Configurações Principais → Idioma**, escolha **Português (Brasil)** e recarregue.
   Cada jogador escolhe o próprio idioma: quem jogar em inglês continua vendo o sistema em inglês.

Duas opções do módulo (por usuário) permitem desligar partes da tradução:
**Traduzir os compêndios** e **Traduzir tags e campos das habilidades**.

## Como funciona (e por que a automação não quebra)

O sistema automatiza muita coisa lendo valores em inglês: as tags (`Two-Handed` ocupa as duas mãos,
`Consumable` some ao usar, `Harmony` conta para o limite de canções…), o alcance (`Close`, `4Sq`), o alvo
(`Self`), o custo (`Hate 2`), o momento dos consumíveis, o tipo de teste e os subtipos. Por isso o módulo:

- traduz **nos dados** só o que é texto: nomes, descrições, nomes de efeitos, notas e as páginas de regras;
- mantém **gravados em inglês** os valores que a automação lê, e os **mostra em português** na tela;
- acrescenta ao catálogo de tags os nomes em português como sinônimos: digitar `Duas Mãos` (ou `duas maos`)
  numa ficha grava `Two-Handed`, e a automação continua funcionando.

A tradução dos compêndios é aplicada quando os documentos são lidos (índice, fichas, arrastar e soltar,
importação). Os compêndios em si não são alterados, e um compêndio **destravado** para edição fica em inglês,
para que nenhuma tradução seja gravada nele por engano.

## Observações

- **Documentos que já estão no mundo** não mudam de idioma sozinhos: o que for criado ou importado dos
  compêndios a partir de agora vem em português. Para o que já existe, o Mestre tem duas ferramentas em
  **Configurações → Configurar Definições**:
  - **Traduzir documentos do mundo** (deste módulo): dá o nome em português, os nomes dos efeitos e, se
    marcado, a descrição aos monstros, itens e habilidades que vieram dos compêndios do sistema (pelo vínculo com
    o compêndio ou pelo nome em inglês). Não mexe em documentos renomeados à mão, nos nomes dos personagens nem em
    tags e campos de regra. Faça backup antes.
  - **Atualizar as habilidades dos personagens** (do sistema): atualiza as habilidades vinculadas ao compêndio,
    agora traduzido (nome, descrição, efeitos, Teste/Dano).
- O navegador de habilidades associa as habilidades de classe e de raça pelo **nome** da classe/raça do
  personagem. Em personagens criados antes do módulo, rode **Traduzir documentos do mundo** (ou troque a
  classe/raça pela do compêndio) para que o filtro "Todas as minhas listas" volte a mostrá-las.
- No diário de regras, a folha de consulta (PDF) e as imagens de referência são as originais, em inglês.
- As pastas de arquétipo (Warrior, Weapon Master, Healer, Mage) e a pasta "Common" das habilidades comuns
  mantêm o nome em inglês: o navegador de habilidades do sistema as procura por esses nomes.
- Se uma atualização do Foundry ou do sistema quebrar uma parte da tradução, o resto continua funcionando e o
  console (F12) mostra um aviso que começa com `lhtrpg-pt-br |`. Mande esse aviso ao
  [relatar o problema](https://github.com/rezendesjoao/lhttrpg-br/issues).

## Desenvolvimento

As traduções ficam em `lang/` (`pt-BR.json` para a interface, `compendium/*.json` para os compêndios). Os
arquivos de compêndio são gerados a partir de `work/` pelas ferramentas em `tools/` (Node 20+), com o sistema
ao lado (`../LHTTRPG`, ou `--system <pasta>`):

```bash
node tools/extract.mjs        # textos em inglês dos compêndios, em lotes (work/en)
node tools/names-src.mjs      # listas de nomes para tradução (work/names-src)
node tools/fixed-names.mjs    # nomes fixados pelo glossário (raças, classes, pastas, regras)
node tools/refs.mjs           # nomes citados em cada lote, com a tradução
node tools/blocks.mjs export # lotes em formato de blocos (.txt) para traduzir
node tools/blocks.mjs import <pacote> <NN>  # converte e confere um lote traduzido
node tools/harmonize.mjs      # unifica termos traduzidos de formas diferentes
node tools/lint-texts.mjs --fix-names       # nomes citados «…» iguais aos do compêndio
node tools/terms-report.mjs   # termos entre colchetes com mais de uma tradução
node tools/build.mjs --strict # gera lang/compendium/*.json e valida tudo
node tools/check.mjs          # cobertura da interface e dos compêndios
node tools/test-runtime.mjs   # camada de compêndio contra os dados reais (Foundry simulado)
node tools/package.mjs        # dist/lhtrpg-pt-br.zip
```

A pasta `work/` e a pasta `tools/` não vão para o pacote final. No repositório ficam só as traduções de
`work/pt-BR/` e os arquivos de apoio; `work/en/` e `work/names-src/` são gerados de novo pelas ferramentas.

### Publicar uma nova versão

1. Aumente `version` no `module.json` e troque a versão no fim da URL de `download`
   (`.../releases/download/vX.Y.Z/lhtrpg-pt-br.zip`); registre a mudança no `CHANGELOG.md`.
2. `node tools/build.mjs --strict && node tools/check.mjs && node tools/package.mjs`
3. Faça commit e push, e crie a release com os dois arquivos de `dist/`:

```bash
gh release create vX.Y.Z dist/module.json dist/lhtrpg-pt-br.zip --title "vX.Y.Z" --notes "..."
```

## Créditos e aviso

Log Horizon e Log Horizon TRPG (ログ・ホライズンTRPG) pertencem a Mamare Touno e à Kadokawa. Este módulo é uma
tradução de fãs, não oficial e sem vínculo com os detentores dos direitos; recomenda-se adquirir os livros
oficiais. O sistema para Foundry é de Kyane (Tenyryas) e DeadlyPoisonK; o texto em inglês dos compêndios foi
traduzido do japonês por DeadlyPoisonK a partir do banco de dados oficial e gratuito ([lhrpg.com](https://lhrpg.com/lhz/top)).
O código deste módulo é distribuído sob a licença MIT ([LICENSE.txt](LICENSE.txt)); a licença não cobre o
conteúdo de regras de Log Horizon TRPG.
