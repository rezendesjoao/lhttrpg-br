# Tradução dos textos dos compêndios — instruções para cada lote

Projeto: módulo de tradução pt-BR do sistema **Log Horizon TRPG** para Foundry VTT
(`C:\Users\Administrador\Desktop\Daggerheart\Log Horizon TTRPG\lhtrpg-pt-br`). Você traduz, do inglês para o
**português do Brasil**, as descrições de habilidades, itens, monstros e as páginas de regras.

## Antes de começar

1. Leia **inteiro** `docs/GLOSSARIO.md`. Ele é obrigatório: use exatamente os termos dele (NH, NP, PV, Destino,
   Ódio, Processo de Abertura/Encerramento, Ação Maior/Menor, Corpo a corpo, Qd, estados, tags, raças, classes,
   subclasses…). Termos que não estão lá: traduza de forma natural e coerente.
2. Para o lote `<pack>/<NN>` que você recebeu:
   - entrada: `work/en/text/<pack>/<NN>.txt` (formato de blocos, abaixo; o mesmo conteúdo está em `.json`);
   - nomes citados: `work/en/text/<pack>/<NN>.refs.json` — `{ "Nome em inglês": "Nome em português (tipo)" }`
     com os nomes de outras habilidades, itens, classes, subclasses, raças e monstros que aparecem no lote.
     Quando o texto citar um deles, use **exatamente** o nome em português. Se houver mais de uma opção
     (separadas por ` | `), escolha pelo contexto (habilidade × subclasse × item). Uma palavra comum que só
     coincide com um nome (ex.: "Dash" no sentido de correr) não precisa virar o nome.

## Formato de blocos (entrada e saída)

```
=== <chave>
# <nome do documento: contexto, opcional na saída>
<HTML traduzido, quantas linhas forem necessárias>
```

Escreva a saída em `work/pt-BR/text/<pack>/<NN>.txt`, com **os mesmos blocos, as mesmas chaves e na mesma
ordem**. Não precisa escapar nada (aspas, barras, quebras de linha ficam como estão). Depois rode:

```bash
node tools/blocks.mjs import <pack> <NN>
```

Isso gera o `.json` e confere o lote. Corrija **todo** problema marcado `BLOCKING` e rode de novo até passar.
As linhas `note` são heurísticas (palavras em inglês que sobraram): revise e corrija o que for de fato texto
não traduzido; nomes próprios podem ficar.

## Regras de marcação (obrigatórias)

- Mantenha **todas** as tags HTML, na mesma quantidade e na mesma estrutura. Traduza só o texto entre elas.
  Não crie nem remova `<p>`, `<br>`, `<hr>`, `<li>`, `<td>`, `<strong>`…
- `⟦a1⟧`, `⟦a2⟧`… dentro de uma tag (`<td ⟦a7⟧>`) representam atributos; `⟦r1⟧`, `⟦r2⟧`… representam rolagens
  inline. Copie cada token exatamente, no lugar equivalente.
- O texto entre chaves logo depois de uma rolagem é o rótulo dela e deve ser traduzido:
  `⟦r3⟧{[[30+2D] Magic Damage]}` → `⟦r3⟧{[[30+2D] Dano Mágico]}`; `⟦r1⟧{[2D+1]}` fica igual.
- Entidades HTML (`&nbsp;`, `&laquo;`, `&raquo;`, `&lt;`, `&gt;`, `&times;`, `&ldquo;`…) ficam como estão.
- Não traduza números, notação de dados (`2D`, `3D+2`, `(SR+1)D` → `(NH+1)D`), fórmulas, nem URLs/caminhos de
  imagem.

## Regras de texto

- Registro de livro de regras, claro e preciso; trate o leitor por **você**. O texto de ambientação (em geral
  depois do `<hr>`) pode ter tradução mais literária, mas sem inventar conteúdo.
- Termos entre colchetes são termos de jogo: traduza pelo glossário mantendo os colchetes —
  `[Hate]` → `[Ódio]`, `[Two-Handed]` → `[Duas Mãos]`, `[Target: Single]` → `[Alvo: Individual]`,
  `[Barrier: 15]` → `[Barreira: 15]`, `[DEX mod]` → `[mod. de DES]`, `[Hit Check]` → `[Teste de Acerto]`,
  `[Inventory Slot]` → `[Espaço de Inventário]`, `[Normal Move]` → `[Movimento Normal]`.
- Fórmulas em texto: `[(SR+1)D + (Attack Power)]` → `[(NH+1)D + (Poder de Ataque)]`;
  `[[Recovery] + (SR x [POW mod])]` → `[[Recuperação] + (NH x [mod. de POD])]`.
- Marcadores de nível: `(SR2):` → `(NH2):`, `(Fate 1):` → `(Destino 1):`, `(Effect):` → `(Efeito):`,
  `(Bonus):` → `(Bônus):`, `(Result 17):` → `(Resultado 17):`, `(Hate Top):` → `(Topo de Ódio):`,
  `(Connection: Merchant)` → `(Conexão: Mercador)`, `Acquired with CR11 or higher.` → `Adquirida com NP 11 ou mais.`
- `«Weapon Mastery»` / `&laquo;Weapon Mastery&raquo;` citam habilidades: use o nome do arquivo de refs,
  mantendo as aspas angulares (ou as entidades) como no original.
- `&lt;Jingikan&gt;` e outros nomes próprios entre `&lt;&gt;` ficam como estão.
- Unidades: `4 Sq` → `4 Qd`; `G` (ouro) nos preços fica `G`.
- Linhas de fabricação dos itens: `Blue Ore[Core Material](140G)+Kite Shield(220G)+[Magic Catalyst 9](90G)×3+Crafting Cost(310G)`
  → `Minério Azul[Material-Base](140G)+Escudo Pipa(220G)+[Catalisador Mágico 9](90G)×3+Custo de Fabricação(310G)`
  (nomes de itens pelas refs quando existirem).
- Tabelas de espólio dos monstros: `Drop Items` → `Itens Deixados`; `[Valuable]` → `[Valioso]`; faixas como
  `1~5` ficam iguais.
- Gênero: "habilidade" é feminino ("esta habilidade", "a habilidade adquirida").
- Não deixe frases em inglês. Não acrescente notas do tradutor.

## Ao terminar

Responda com: lotes concluídos, a última saída do `import` de cada lote (deve terminar sem `BLOCKING`) e até
5 decisões de tradução que valham revisão. Não altere nenhum outro arquivo do projeto.
