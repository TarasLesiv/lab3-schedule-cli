# Покрокове виконання лабораторної роботи №3

Ця інструкція враховує методичку, варіант 1 і дані групи ФЕІ-23. Готові файли вже лежать у проєкті; нижче описано, що саме зроблено та що треба виконати на власному комп’ютері перед здачею.

## Крок 1. Створити репозиторій GitHub

1. Увійти в профіль <https://github.com/TarasLesiv>.
2. Відкрити <https://github.com/new>.
3. У полі **Repository name** ввести `lab3-schedule-cli`.
4. Обрати видимість, яку вимагає викладач (зазвичай Public).
5. **Не** додавати README, `.gitignore` чи license на сайті, бо ці файли вже є локально.
6. Натиснути **Create repository**.

Очікуваний URL:

```text
https://github.com/TarasLesiv/lab3-schedule-cli
```

## Крок 2. Підготувати Git до першого коміту

Відкрити Git Bash у каталозі проєкту:

```bash
cd /шлях/до/lab3-schedule-cli
git init -b main
git config --local user.name "Тарас Лесів lab3"
git config --local user.email "ВАШ_GITHUB_EMAIL"
git config --local user.name
git config --local user.email
```

Email навмисно не підставлено замість студента. Його можна скопіювати з **GitHub → Settings → Emails**; дозволено використати GitHub noreply email.

Якщо ви використовуєте підготовлену історію Git з архіву, у ній стоїть технічний email `replace-me@example.invalid`. Після введення справжнього email перепризначте автора всіх шаблонних комітів:

```bash
git rebase --root --exec 'git commit --amend --no-edit --reset-author'
```

Цю команду треба виконати **до першого `git push`**. Вона збереже зміст і повідомлення комітів, але запише ваше локальне ім’я та email.

Важливо: параметр `--local` записує налаштування лише для цього репозиторію. Ім’я треба задати **до першого власного коміту**. Очікуваний вивід перевірки імені:

```text
Тарас Лесів lab3
```

## Крок 3. Перевірити середовище

```bash
node --version
npm --version
commander_version=$(node -p "require('./node_modules/commander/package.json').version" 2>/dev/null || true)
printf 'commander: %s\n' "$commander_version"
git --version
jq --version
```

Якщо залежності ще не встановлено, версію Commander перевіряють після кроку 5. Для готового проєкту потрібен Node.js 20 або новіший, бо Commander 14 вимагає Node.js `>=20`.

Контрольне середовище, у якому перевірено готовий проєкт:

```text
Node.js v20.20.2
npm 10.8.2
Commander 14.0.3
Linux, Bash
```

У звіті перед здачею треба вказати версії та ОС **власного комп’ютера**, якщо вони відрізняються.

## Крок 4. Зрозуміти створення npm-проєкту

Початкові команди за методичкою мають такий вигляд:

```bash
npm init -y
npm install commander
```

Після `npm init -y` створюється `package.json`. Після `npm install commander`:

- Commander додається до `dependencies`;
- створюється або оновлюється `package-lock.json`;
- з’являється `node_modules/commander`.

У готовому `package.json` додано:

```json
"type": "module",
"scripts": {
  "start": "node index.js",
  "test": "node --test",
  "check:data": "jq empty data.json"
}
```

`"type": "module"` дозволяє використовувати ESM-синтаксис `import`. Сценарій `start` виконує вимогу методички; `test` запускає автоматичні тести.

## Крок 5. Встановити залежності

У готовому проєкті виконати:

```bash
npm install
npm list commander --depth=0
```

Очікуваний фрагмент:

```text
`-- commander@14.0.3
```

Встановлено лише один сторонній пакет — `commander`. Для читання файлу використано вбудований `node:fs`, для шляхів — `node:path`.

## Крок 6. Перевірити вхідний JSON

Файл із ЛР №1 перейменовано на `data.json`; зміст не змінювався. Перевірка:

```bash
jq empty data.json
echo $?
```

Очікуваний код:

```text
0
```

Структура даних:

- кореневі поля `group`, `course`, `schedule`;
- `schedule` — масив днів;
- кожен день містить `day` і вкладений масив `lessons`;
- часовий слот містить `pair`, `time`, `numerator`, `denominator`;
- `numerator`/`denominator` — об’єкт заняття або `null`;
- заняття має `subject`, `type`, `teacher`, `room`, `isRemote`.

Саме через таку структуру основним елементом загальних команд обрано день, а шлях до вкладеного поля може мати вигляд `lessons.0.numerator.subject`.

## Крок 7. Перевірити довідку програми

```bash
node index.js --help
node index.js day --help
node index.js --version
```

Довідка, назви аргументів та опцій описані українською. Назви команд і змінних — англійською, як вимагає методичка.

Глобальна опція JSON-файлу:

```bash
node index.js --file data.json list
node index.js list --file data.json
```

Обидва виклики правильні. Якщо опції немає, використовується `data.json`.

## Крок 8. Перевірити три загальні можливості

### 8.1. Перелік

```bash
node index.js list --limit 3
```

Перевіряємо, що показано лише три дні та коротку статистику. `--limit` є опцією зі значенням. Дозволено лише додатне ціле число.

### 8.2. Один елемент

```bash
node index.js show Понеділок
```

`Понеділок` — обов’язковий аргумент. Команда друкує весь об’єкт дня у форматованому JSON.

### 8.3. Окреме вкладене поле

```bash
node index.js field Понеділок lessons.0.numerator.subject
node index.js field Понеділок lessons.2.numerator
node index.js field Понеділок lessons.99.subject
echo $?
```

Перший виклик виведе `Математичний аналіз`. Другий — `null`: поле існує, але його значення порожнє. Третій завершиться кодом `4`, оскільки поля немає. Так програма чітко відрізняє `null` від відсутнього поля.

## Крок 9. Перевірити три можливості варіанта 1

### 9.1. Заняття за день

```bash
node index.js day Понеділок
node index.js day Понеділок --week numerator
node index.js day Понеділок --week denominator
```

Значення `both` є стандартним. У четвер однакові об’єкти чисельника і знаменника для другої пари розпізнаються як щотижневе заняття та не дублюються:

```bash
node index.js day Четвер
```

### 9.2. Заняття викладача

```bash
node index.js teacher Чмихало
node index.js teacher Чмихало --remote
```

`Чмихало` — обов’язковий аргумент. Пошук виконується за частиною імені без урахування регістру. `--remote` — прапорець: він не отримує значення, а лише вмикає фільтр `isRemote === true`.

### 9.3. Розклад типу тижня

```bash
node index.js week numerator
node index.js week denominator
node index.js week denominator --day Четвер
```

`numerator` або `denominator` — обов’язковий аргумент. Опція `--day` обмежує результат одним днем. Щотижнева пара входить і до чисельника, і до знаменника та має позначку `щотижня`.

## Крок 10. Перевірити помилки з методички

У Git Bash зручно після кожного виклику виконувати `echo $?`.

### Неіснуючий файл

```bash
node index.js --file missing.json list
echo $?
```

Очікується повідомлення `Файл «missing.json» не знайдено.` і код `1`.

### Некоректний JSON

```bash
printf '{ bad json' > invalid.json
node index.js --file invalid.json list
echo $?
rm invalid.json
```

Очікується повідомлення про некоректний JSON і код `1`.

### Неіснуючий елемент або поле

```bash
node index.js show Неділя
echo $?
node index.js field Понеділок lessons.99.subject
echo $?
```

Очікується код `4`.

### Нечислове значення

```bash
node index.js list --limit abc
echo $?
```

Очікується код `2`.

### Пропущений обов’язковий аргумент

```bash
node index.js show
echo $?
```

Commander виявляє помилку, а програма перекладає її українською.

### Невідома опція

```bash
node index.js list --unknown
echo $?
```

Очікується повідомлення `Невідома опція «--unknown».` і ненульовий код.

У жодному очікуваному випадку стек викликів не виводиться.

## Крок 11. Запустити автоматичні тести

```bash
npm test
```

Усі тести повинні мати стан `pass`. Вони не замінюють ручні скриншоти, але доводять правильність команд і помилкових сценаріїв.

## Крок 12. Перевірити відновлення `node_modules`

```bash
rm -rf node_modules
npm install
npm test
```

У Windows ці команди виконуються в Git Bash. Після встановлення програма повинна працювати так само. Це демонструє роль `package.json` і `package-lock.json`.

## Крок 13. Зробити щонайменше п’ять окремих комітів

Якщо використовується готовий каталог без історії, файли можна додавати логічними групами. Перед цим ще раз перевірити локальне ім’я та email:

```bash
git config --local user.name
git config --local user.email
```

Послідовність із шести змістовних комітів:

```bash
# 1. Конфігурація npm-проєкту
git add package.json package-lock.json .gitignore
git commit -m "chore: initialize npm project and add commander"

# 2. Вхідні дані
git add data.json
git commit -m "data: add validated schedule JSON"

# 3. Реалізація CLI
git add index.js
git commit -m "feat: implement schedule CLI commands"

# 4. Тести
git add test/cli.test.js
git commit -m "test: add CLI integration tests"

# 5. Документація
git add README.md docs/STEP_BY_STEP.md docs/THEORY.md
git commit -m "docs: add usage guide and theory answers"

# 6. Звіт та скриншоти
git add docs/REPORT.md docs/screenshots report-lab3.docx
git commit -m "docs: add laboratory report and command outputs"
```

Перевірка:

```bash
git log --oneline
git log --format='%h | %an | %ae | %s'
```

У стовпці автора кожного коміту має бути `Тарас Лесів lab3`.

## Крок 14. Опублікувати репозиторій

```bash
git remote add origin https://github.com/TarasLesiv/lab3-schedule-cli.git
git push -u origin main
```

Якщо `origin` уже існує:

```bash
git remote set-url origin https://github.com/TarasLesiv/lab3-schedule-cli.git
git push -u origin main
```

Після push відкрити сторінку репозиторію та перевірити наявність усіх файлів і шести комітів.

## Крок 15. Скриншоти та фінальний звіт

Для звіту потрібно мати щонайменше по одному знімку для кожної з шести можливостей:

1. `node index.js list --limit 3`;
2. `node index.js show Понеділок`;
3. `node index.js field Понеділок lessons.0.numerator.subject`;
4. `node index.js day Четвер`;
5. `node index.js teacher Чмихало --remote`;
6. `node index.js week denominator --day Четвер`.

Також доцільно додати один спільний скриншот перевірки помилок і один — `npm test`. Готовий звіт містить згенеровані контрольні зображення фактичного виводу; за вимогою викладача їх слід замінити власними знімками Git Bash.

Перед здачею замінити у звіті:

- `[НАЗВА ЗВО]` і `[НАЗВА КАФЕДРИ]`;
- ініціали викладача, якщо `О. С. Чмихало` вказано неточно;
- версії програм та ОС на власні;
- URL репозиторію після його створення;
- контрольні зображення на власні скриншоти, якщо це обов’язково.
