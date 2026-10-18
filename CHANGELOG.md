# Changelog

## [1.0.1] - 2026-10-17

### Corrigido
- Foundry 14.367: as tags e os campos das habilidades (Momento, Alvo, Alcance, Custo, Limite, Teste) ficavam em
  inglês nas fichas e nos cartões de chat, e o console mostrava `Cannot assign to read only property 'format'`
  no `i18nInit`. Nessa versão o `game.i18n.format` virou um apelido somente leitura de `localize`; o módulo
  agora instala a sua versão como propriedade própria do `game.i18n`, e as mensagens com momento, alcance e
  tags voltam a sair em português.
- Cada etapa da inicialização (compêndios, sinônimos de tags, nomes de tíquetes, helpers, `format`, ganchos
  de renderização e menus de sugestão) roda separada: se uma falhar, o console mostra um aviso
  `lhtrpg-pt-br | …` e as outras continuam funcionando.

## [1.0.0] - 2026-10-17

Primeira versão, para o Log Horizon TRPG 2.1.x no Foundry VTT V14 (14.365 em diante).

### Adicionado
- Interface do sistema em português do Brasil: todas as 767 chaves de `lang/en.json`, além das mensagens em
  que o sistema insere valores em inglês (momento, alcance, tags de habilidades sustentadas).
- Tradução dos 11 compêndios do sistema: 1.835 documentos (raças, classes, 87 subclasses, 799 habilidades,
  842 itens, 84 monstros com 254 habilidades, 3 diários com 27 páginas de regras), com descrições, 368 efeitos e
  as pastas. Os rótulos dos compêndios e as pastas da barra lateral também.
- Tags e campos das habilidades (Momento, Alcance, Alvo, Custo, Limite, Teste) mostrados em português nas fichas,
  nos menus de seleção, nas sugestões de tags e nos cartões de chat, mantendo gravados os valores em inglês que a
  automação lê.
- Sinônimos em português no catálogo de tags (digitar "Duas Mãos" ou "duas maos" grava "Two-Handed").
- Ferramenta do Mestre "Traduzir documentos do mundo" para monstros, itens e habilidades que já estavam no mundo.
- Opções por usuário para desligar a tradução dos compêndios ou dos termos.
- Glossário (`docs/GLOSSARIO.md`) e ferramentas de manutenção em `tools/`.
