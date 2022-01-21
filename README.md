# remark-table-comparify

Plugin for [Remark] to perform comparisons in a table by assigning values and calculating scores.

[![example]][example]

## Install

```
npm install remark-table-comparify
```

## Usage

```js
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';  /* Needs remark-gfm */
import remarkTC from 'remark-table-comparify';

const file = 'Todo.md';

const remarked = await remark()
    .use(remarkGfm) /* Be sure to use the remark-gfm plugin before */
    .use(remarkTC, opts)
    .process(input)

if (remarked.data.tableComparify.altered) {
  /* A table was found and altered */
}
```

## CLI

* Install [Remark CLI], [Remark GFM], and this plugin globally:

    ```
    npm i -g remark-cli remark-gfm remark-table-comparify
    ```

* Run:

    ```sh
    remark . --use remark-gfm --use remark-table-comparify --output
    ```

## VS Code

**Doesn't work yet** because this plugin uses ESM but [VSCode/Electron doesn't][remark#846] (*yet*). Shall be fixed by [electron#21457]👀👍. Once resolved,

* Install https://marketplace.visualstudio.com/items?itemName=unifiedjs.vscode-remark
* Install this plugin globally:
    ```
    npm i -g remark-table-comparify
    ```
* Configure `remark.format.plugins`
    ```js
    "remark.format.plugins": ["remark-table-comparify"]
    ```

## API

```js
remarkTC(opts)
```
* **`opts`** `[object]` Options
* **`opts.operations`** `[object]` Operations in the form of: `{ ['+']: (a, b) => a + b }`
* **`opts.resultSymbol`** `[string='=']` Symbol used to identify results column. E.g.: `…| =result |…`
* **`opts.modifierSeparator`** `[string=':']` Symbol used to identify modifiers. E.g.: `…| +col:*2 |…`
* **`opts.defaultSeparator`** `[string='?']` Symbol used to identify default value. E.g.: `…| +col?1 |…`

**`file.data.tableComparify`** is populated with:

* **`found`** `[boolean]` If a table was found
* **`altered`** `[boolean]` If a table was altered

## Example

Imagine you're a cute fuzzy bunny with an evil plan to take over the forest and establish your [BoingoSnax] empire.

A simple Todo list won't do. You use something like the [Eisenhower Method] to fine-tune your plan by assigning Urgency/Importance points to each task.

**This plugin can then help you calculate the score!**

```
| Task                     | +Urgency:*10 | +Importance | +Significance | Effort | =Score |
| :----------------------- | -----------: | ----------: | ------------: | -----: | -----: |
| Take down Muffin Man     |           10 |          10 |             1 |      4 |    111 |
| Ruin Red                 |            9 |           9 |             2 |      5 |    101 |
| Act cute & fuzzy         |            8 |           8 |             3 |      1 |     91 |
| Steal Recipe Book!!      |            7 |           7 |             4 |     10 |     81 |
| Send Wolf on goose chase |            6 |           6 |             5 |      3 |     71 |
| Pick up dry cleaning     |            5 |           5 |             6 |      2 |     61 |
| Pay evil ski team        |            4 |           4 |             7 |      1 |     51 |
| Pay gas bill             |            3 |           3 |             8 |      2 |     41 |
| Call mom                 |            2 |           2 |             9 |      1 |     31 |
| Finish lair              |            1 |           1 |            10 |     10 |     21 |
```

* **Mathematical operators**: It looks for mathematical **operation** symbols: **`+`**, **`-`**, **`*`**, **`/`** prefixed in the header row of columns and uses them to calculate the final result.

* **Result**: The final **result** is saved in the column with a **`=`** sign in its header.

* **Modifiers**: It looks for **modifiers** in the header suffixed with a **`:`** to further modify the score.

* **Defaults**: It looks for a **default** value (with **`?n`**) to use for empty cell

[![example]][example]

Header | What it does
--|--
<code><strong>+</strong>Importance</code> | **Adds** the value of cells of that column to the corresponding **result** column.
<code>+Urgency<strong>:*10</strong></code> | Adds 10 **times** the value of that column
<code>+Effort<strong>?0</strong></code> | Uses **`0`** as the **default** value (if absent/empty)
<code><strong>=</strong>Score</code> | Sets the **result** column.

[Remark]: https://remark.js.org
[Remark CLI]: https://github.com/remarkjs/remark/tree/main/packages/remark-cli
[BoingoSnax]: https://hoodwinked.fandom.com/wiki/BoingoSnax
[Eisenhower Method]: https://en.wikipedia.org/wiki/Time_management#The_Eisenhower_Method
[example]: example.gif
[remark#846]: https://github.com/remarkjs/remark/discussions/846#discussioncomment-1300344
[electron#21457]: https://github.com/electron/electron/issues/21457
