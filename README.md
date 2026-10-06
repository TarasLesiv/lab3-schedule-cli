# Лабораторна робота №3 — CLI-програма на Node.js

**Варіант:** 1 — «Розклад занять»  
**Студент:** Тарас Лесів, ФЕІ-23  
**Технології:** Node.js, npm, Commander, JSON

Програма читає розклад із JSON-файлу та надає шість можливостей: три загальні команди (`list`, `show`, `field`) і три команди варіанта 1 (`day`, `teacher`, `week`). Усі повідомлення та довідка — українською; назви команд, опцій і змінних — англійською.

## Вимоги

- Node.js 20 або новіший;
- npm;
- `jq` — лише для окремої перевірки JSON за методичкою;
- Git Bash у Windows або Bash у Linux/macOS.

## Швидкий запуск

```bash
npm install
jq empty data.json
echo $?
npm test
npm start -- --help
```

Код `0` після `jq empty data.json` означає, що JSON синтаксично правильний.

## Глобальна опція файлу

За замовчуванням програма читає `data.json`. Інший файл можна передати до або після команди:

```bash
node index.js --file other.json list
node index.js list --file other.json
```

## Шість реалізованих можливостей

### 1. Стислий перелік основних елементів

Основним елементом обрано день розкладу. Опція `--limit` обмежує кількість днів.

```bash
node index.js list
node index.js list --limit 3
```

### 2. Один елемент повністю

Обов’язковий аргумент `<day>` визначає день. Пошук не залежить від регістру.

```bash
node index.js show Понеділок
```

### 3. Окреме, зокрема вкладене, поле

Шлях задається крапковою нотацією; індекс масиву також є частиною шляху.

```bash
node index.js field Понеділок lessons.0.numerator.subject
node index.js field Понеділок lessons.2.numerator
```

У другому прикладі програма виведе `null`, бо поле існує і має значення `null`. Відсутнє поле спричиняє помилку та код завершення `4`.

### 4. Заняття за обраний день

```bash
node index.js day Понеділок
node index.js day Понеділок --week numerator
node index.js day Понеділок --week denominator
```

`--week` приймає `numerator`, `denominator` або `both`; значення за замовчуванням — `both`.

### 5. Заняття викладача

Аргумент може бути повним прізвищем та ініціалами або частиною імені. Прапорець `--remote` залишає лише дистанційні заняття.

```bash
node index.js teacher Чмихало
node index.js teacher Чмихало --remote
```

### 6. Розклад чисельника або знаменника

```bash
node index.js week numerator
node index.js week denominator
node index.js week denominator --day Четвер
```

Якщо об’єкти `numerator` і `denominator` одного часового слота однакові, заняття розпізнається як щотижневе. Воно входить до обох розкладів і позначається словом `щотижня`.

## Довідка

```bash
node index.js --help
node index.js teacher --help
node index.js --version
```

## Коди завершення

| Код | Значення |
|---:|---|
| 0 | Успішне виконання |
| 1 | Файл не прочитано, JSON некоректний або помилка структури даних |
| 2 | Некоректне значення числової опції чи типу тижня |
| 4 | Не знайдено день, поле або результат пошуку |

Програма не виводить стек викликів для очікуваних помилок.

## Автоматична перевірка

Тести використовують лише вбудований модуль `node:test`:

```bash
npm test
```

Вони перевіряють усі шість команд, глобальну опцію `--file`, `null`, неіснуючий файл, некоректний JSON, нечисловий `--limit`, пропущений аргумент і невідому опцію.

## Структура

```text
lab3-schedule-cli/
├── .gitignore
├── README.md
├── data.json
├── index.js
├── package.json
├── package-lock.json
├── report-lab3.docx
├── docs/
│   ├── REPORT.md
│   ├── STEP_BY_STEP.md
│   ├── THEORY.md
│   └── screenshots/
└── test/
    └── cli.test.js
```

`node_modules/` навмисно не зберігається в Git; його відновлює `npm install` за `package.json` і `package-lock.json`.

## GitHub

Профіль студента: <https://github.com/TarasLesiv>. Потрібно створити окремий порожній репозиторій `lab3-schedule-cli`, після чого його URL буде:

```text
https://github.com/TarasLesiv/lab3-schedule-cli
```

Команди публікації та план щонайменше з п’яти комітів наведено у `docs/STEP_BY_STEP.md`.
