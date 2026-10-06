#!/usr/bin/env node

import { Command, CommanderError } from 'commander';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DEFAULT_FILE = 'data.json';
const WEEK_TYPES = ['numerator', 'denominator'];

/** Помилка предметної логіки без виведення стека викликів. */
class CliError extends Error {
  constructor(message, exitCode = 1) {
    super(message);
    this.name = 'CliError';
    this.exitCode = exitCode;
  }
}

/** Формує повністю україномовну довідку Commander. */
function formatHelp(command, helper) {
  const rows = (items, term, description) => {
    if (items.length === 0) return '';
    const terms = items.map(term);
    const width = Math.max(...terms.map((item) => item.length));
    return items
      .map((item, index) => `  ${terms[index].padEnd(width)}  ${description(item)}`)
      .join('\n');
  };

  const sections = [];
  sections.push(`Використання: ${helper.commandUsage(command)}`);

  const description = helper.commandDescription(command);
  if (description) sections.push(description);

  const args = helper.visibleArguments(command);
  if (args.length > 0) {
    sections.push(
      `Аргументи:\n${rows(
        args,
        (arg) => helper.argumentTerm(arg),
        (arg) => helper.argumentDescription(arg),
      )}`,
    );
  }

  const options = helper.visibleOptions(command);
  if (options.length > 0) {
    sections.push(
      `Опції:\n${rows(
        options,
        (option) => helper.optionTerm(option),
        (option) => helper.optionDescription(option),
      )}`,
    );
  }

  const commands = helper.visibleCommands(command);
  if (commands.length > 0) {
    sections.push(
      `Команди:\n${rows(
        commands,
        (subcommand) => helper.subcommandTerm(subcommand),
        (subcommand) => helper.subcommandDescription(subcommand),
      )}`,
    );
  }

  return `${sections.join('\n\n')}\n`;
}

/** Перетворює типові повідомлення Commander українською. */
function translateCommanderError(error) {
  const message = error.message ?? '';
  let match;

  if ((match = message.match(/missing required argument '([^']+)'/))) {
    return `Пропущено обов'язковий аргумент <${match[1]}>.`;
  }
  if ((match = message.match(/unknown option '([^']+)'/))) {
    return `Невідома опція «${match[1]}».`;
  }
  if ((match = message.match(/unknown command '([^']+)'/))) {
    return `Невідома команда «${match[1]}».`;
  }
  if ((match = message.match(/option '([^']+)' argument missing/))) {
    return `Для опції «${match[1]}» не вказано значення.`;
  }
  if (message.includes('too many arguments')) {
    return 'Передано забагато аргументів.';
  }

  return message.replace(/^error:\s*/i, '') || 'Некоректний виклик програми.';
}

/** Перевіряє, що значення є звичайним об'єктом. */
function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Перевіряє структуру JSON, потрібну всім командам. */
function validateData(data) {
  if (!isObject(data)) {
    throw new CliError('Корінь JSON-документа має бути об’єктом.');
  }
  if (typeof data.group !== 'string' || data.group.trim() === '') {
    throw new CliError('Поле «group» має бути непорожнім рядком.');
  }
  if (!Number.isInteger(data.course) || data.course < 1) {
    throw new CliError('Поле «course» має бути додатним цілим числом.');
  }
  if (!Array.isArray(data.schedule)) {
    throw new CliError('Поле «schedule» має бути масивом.');
  }

  data.schedule.forEach((day, dayIndex) => {
    if (!isObject(day) || typeof day.day !== 'string' || !Array.isArray(day.lessons)) {
      throw new CliError(`Некоректна структура дня schedule[${dayIndex}].`);
    }

    day.lessons.forEach((slot, lessonIndex) => {
      const location = `schedule[${dayIndex}].lessons[${lessonIndex}]`;
      if (!isObject(slot)) {
        throw new CliError(`${location} має бути об’єктом.`);
      }
      if (!Number.isInteger(slot.pair) || typeof slot.time !== 'string') {
        throw new CliError(`${location} повинен містити ціле «pair» і рядок «time».`);
      }

      for (const weekType of WEEK_TYPES) {
        const lesson = slot[weekType];
        if (lesson === null) continue;
        if (!isObject(lesson)) {
          throw new CliError(`${location}.${weekType} має бути об’єктом або null.`);
        }

        for (const field of ['subject', 'type', 'teacher', 'room']) {
          if (typeof lesson[field] !== 'string') {
            throw new CliError(`${location}.${weekType}.${field} має бути рядком.`);
          }
        }
        if (typeof lesson.isRemote !== 'boolean') {
          throw new CliError(`${location}.${weekType}.isRemote має бути логічним значенням.`);
        }
      }
    });
  });

  return data;
}

/** Читає JSON вбудованими засобами Node.js і повертає перевірені дані. */
function loadData(filePath) {
  const absolutePath = resolve(process.cwd(), filePath);
  let text;

  try {
    text = readFileSync(absolutePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new CliError(`Файл «${filePath}» не знайдено.`);
    }
    if (error.code === 'EISDIR') {
      throw new CliError(`Шлях «${filePath}» вказує на теку, а не на файл.`);
    }
    throw new CliError(`Не вдалося прочитати файл «${filePath}»: ${error.message}`);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new CliError(`Файл «${filePath}» містить некоректний JSON: ${error.message}`);
  }

  return validateData(data);
}

/** Нормалізація потрібна для пошуку без урахування регістру й виду апострофа. */
function normalize(value) {
  return String(value)
    .trim()
    .toLocaleLowerCase('uk-UA')
    .replace(/[’`]/g, "'");
}

function findDay(data, requestedDay) {
  const day = data.schedule.find((item) => normalize(item.day) === normalize(requestedDay));
  if (!day) {
    const available = data.schedule.map((item) => item.day).join(', ');
    throw new CliError(`День «${requestedDay}» не знайдено. Доступні дні: ${available}.`, 4);
  }
  return day;
}

function parsePositiveInteger(value, optionName) {
  if (!/^\d+$/.test(String(value)) || Number(value) < 1 || !Number.isSafeInteger(Number(value))) {
    throw new CliError(`Опція ${optionName} очікує додатне ціле число, отримано «${value}».`, 2);
  }
  return Number(value);
}

function parseWeekType(value, allowBoth = false) {
  const normalized = normalize(value);
  const allowed = allowBoth ? [...WEEK_TYPES, 'both'] : WEEK_TYPES;
  if (!allowed.includes(normalized)) {
    const names = allowBoth ? 'numerator, denominator або both' : 'numerator або denominator';
    throw new CliError(`Невідомий тип тижня «${value}». Використайте ${names}.`, 2);
  }
  return normalized;
}

function isSameLesson(first, second) {
  return first !== null && second !== null && JSON.stringify(first) === JSON.stringify(second);
}

function weekLabel(weekType) {
  return {
    numerator: 'чисельник',
    denominator: 'знаменник',
    weekly: 'щотижня',
  }[weekType];
}

function printHeader(data) {
  console.log(`Група: ${data.group} | Курс: ${data.course}`);
}

function printLesson(dayName, slot, lesson, type) {
  const format = lesson.isRemote ? 'дистанційно' : 'очно';
  console.log(`${dayName} | ${slot.pair} пара | ${slot.time} | ${weekLabel(type)}`);
  console.log(`  ${lesson.subject} (${lesson.type}); ${lesson.teacher}; ауд. ${lesson.room}; ${format}`);
}

/** Повертає заняття без дублювання однакової щотижневої пари. */
function lessonOccurrences(day) {
  const result = [];

  for (const slot of day.lessons) {
    if (isSameLesson(slot.numerator, slot.denominator)) {
      result.push({ day, slot, lesson: slot.numerator, weekType: 'weekly' });
      continue;
    }
    for (const weekType of WEEK_TYPES) {
      if (slot[weekType] !== null) {
        result.push({ day, slot, lesson: slot[weekType], weekType });
      }
    }
  }

  return result;
}

/** Читає вкладене поле за шляхом на зразок lessons.0.numerator.subject. */
function getByPath(object, path) {
  const parts = String(path).split('.');
  if (parts.length === 0 || parts.some((part) => part === '')) {
    throw new CliError('Шлях до поля не може бути порожнім і не повинен містити порожніх частин.', 2);
  }

  let current = object;
  for (const part of parts) {
    if ((isObject(current) || Array.isArray(current)) && Object.hasOwn(current, part)) {
      current = current[part];
    } else {
      throw new CliError(`Поле за шляхом «${path}» не існує.`, 4);
    }
  }
  return current;
}

function printValue(value) {
  if (typeof value === 'string') {
    console.log(value);
  } else {
    console.log(JSON.stringify(value, null, 2));
  }
}

const program = new Command();

program
  .name('schedule-cli')
  .description('CLI-програма для роботи з розкладом занять групи (варіант 1).')
  .version('1.0.0', '-V, --version', 'Показати версію програми')
  .helpOption('-h, --help', 'Показати довідку')
  .addHelpCommand('help [command]', 'Показати довідку для команди')
  .option('-f, --file <path>', 'Шлях до JSON-файлу з розкладом', DEFAULT_FILE)
  .configureHelp({ formatHelp })
  .configureOutput({
    writeOut: (text) => process.stdout.write(text),
    // Стандартні англомовні помилки приховано; нижче вони перекладаються.
    writeErr: () => {},
  })
  .exitOverride();

// 1. Загальна можливість: стислий перелік основних елементів.
program
  .command('list')
  .description('Показати стислий перелік днів розкладу')
  .option('-l, --limit <number>', 'Обмежити кількість показаних днів')
  .action((options) => {
    const data = loadData(program.opts().file);
    const limit = options.limit === undefined
      ? data.schedule.length
      : parsePositiveInteger(options.limit, '--limit');
    const days = data.schedule.slice(0, limit);

    printHeader(data);
    console.log(`Показано днів: ${days.length} із ${data.schedule.length}`);
    days.forEach((day, index) => {
      const numeratorCount = day.lessons.filter((slot) => slot.numerator !== null).length;
      const denominatorCount = day.lessons.filter((slot) => slot.denominator !== null).length;
      console.log(
        `${index + 1}. ${day.day}: часових слотів — ${day.lessons.length}, `
        + `чисельник — ${numeratorCount}, знаменник — ${denominatorCount}`,
      );
    });
  });

// 2. Загальна можливість: один елемент повністю.
program
  .command('show')
  .description('Показати повний JSON одного дня')
  .argument('<day>', 'Назва дня тижня, наприклад Понеділок')
  .action((dayName) => {
    const data = loadData(program.opts().file);
    printValue(findDay(data, dayName));
  });

// 3. Загальна можливість: окреме, у тому числі вкладене, поле.
program
  .command('field')
  .description('Показати поле дня за крапковим шляхом')
  .argument('<day>', 'Назва дня тижня')
  .argument('<path>', 'Шлях, наприклад lessons.0.numerator.subject')
  .action((dayName, path) => {
    const data = loadData(program.opts().file);
    const day = findDay(data, dayName);
    printValue(getByPath(day, path));
  });

// 4. Варіант 1: заняття за обраний день.
program
  .command('day')
  .description('Показати заняття за обраний день тижня')
  .argument('<day>', 'Назва дня тижня')
  .option('-w, --week <type>', 'Тип тижня: numerator, denominator або both', 'both')
  .action((dayName, options) => {
    const data = loadData(program.opts().file);
    const day = findDay(data, dayName);
    const selectedWeek = parseWeekType(options.week, true);
    const types = selectedWeek === 'both' ? WEEK_TYPES : [selectedWeek];

    printHeader(data);
    console.log(`День: ${day.day} | Режим: ${selectedWeek}`);
    let count = 0;
    for (const slot of day.lessons) {
      for (const weekType of types) {
        const lesson = slot[weekType];
        if (lesson !== null) {
          const label = isSameLesson(slot.numerator, slot.denominator) ? 'weekly' : weekType;
          // У режимі both щотижневе заняття друкується лише один раз.
          if (label === 'weekly' && weekType === 'denominator' && types.length === 2) continue;
          printLesson(day.day, slot, lesson, label);
          count += 1;
        }
      }
    }
    console.log(`Знайдено занять: ${count}`);
  });

// 5. Варіант 1: заняття викладача та прапорець дистанційного формату.
program
  .command('teacher')
  .description('Знайти заняття певного викладача')
  .argument('<name>', 'Повне ім’я або його частина, наприклад Чмихало')
  .option('-r, --remote', 'Показати лише дистанційні заняття')
  .action((name, options) => {
    const data = loadData(program.opts().file);
    const query = normalize(name);
    const matches = data.schedule
      .flatMap(lessonOccurrences)
      .filter(({ lesson }) => normalize(lesson.teacher).includes(query))
      .filter(({ lesson }) => !options.remote || lesson.isRemote);

    if (matches.length === 0) {
      const suffix = options.remote ? ' серед дистанційних занять' : '';
      throw new CliError(`Занять викладача «${name}»${suffix} не знайдено.`, 4);
    }

    printHeader(data);
    console.log(`Викладач: ${name}${options.remote ? ' | лише дистанційні' : ''}`);
    matches.forEach(({ day, slot, lesson, weekType }) => {
      printLesson(day.day, slot, lesson, weekType);
    });
    console.log(`Знайдено занять: ${matches.length}`);
  });

// 6. Варіант 1: розклад чисельника/знаменника зі щотижневими парами.
program
  .command('week')
  .description('Показати розклад для чисельника або знаменника')
  .argument('<type>', 'Тип тижня: numerator або denominator')
  .option('-d, --day <day>', 'Обмежити розклад одним днем')
  .action((type, options) => {
    const data = loadData(program.opts().file);
    const selectedWeek = parseWeekType(type);
    const days = options.day ? [findDay(data, options.day)] : data.schedule;

    printHeader(data);
    console.log(`Розклад: ${weekLabel(selectedWeek)}`);
    let count = 0;
    for (const day of days) {
      for (const slot of day.lessons) {
        const lesson = slot[selectedWeek];
        if (lesson !== null) {
          const label = isSameLesson(slot.numerator, slot.denominator) ? 'weekly' : selectedWeek;
          printLesson(day.day, slot, lesson, label);
          count += 1;
        }
      }
    }
    console.log(`Знайдено занять: ${count}`);
  });

async function main() {
  try {
    if (process.argv.length === 2) {
      program.outputHelp();
      return;
    }
    await program.parseAsync(process.argv);
  } catch (error) {
    if (error instanceof CommanderError) {
      if (error.exitCode === 0) return;
      console.error(`Помилка: ${translateCommanderError(error)}`);
      console.error('Виконайте «node index.js --help», щоб переглянути довідку.');
      process.exitCode = error.exitCode || 2;
      return;
    }
    if (error instanceof CliError) {
      console.error(`Помилка: ${error.message}`);
      process.exitCode = error.exitCode;
      return;
    }

    console.error('Помилка: сталася непередбачена помилка.');
    process.exitCode = 1;
  }
}

await main();
