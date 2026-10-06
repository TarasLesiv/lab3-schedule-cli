import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const indexFile = join(projectDir, 'index.js');

function run(args) {
  return spawnSync(process.execPath, [indexFile, ...args], {
    cwd: projectDir,
    encoding: 'utf8',
  });
}

test('довідка повністю доступна українською', () => {
  const result = run(['--help']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Використання:/);
  assert.match(result.stdout, /Показати довідку/);
  assert.match(result.stdout, /Команди:/);
});

test('list виводить стислий перелік і дотримується limit', () => {
  const result = run(['list', '--limit', '2']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Показано днів: 2 із 5/);
  assert.match(result.stdout, /1\. Понеділок/);
  assert.doesNotMatch(result.stdout, /3\. Середа/);
});

test('show знаходить день без урахування регістру', () => {
  const result = run(['show', 'понеділок']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /"day": "Понеділок"/);
  assert.match(result.stdout, /"lessons": \[/);
});

test('field читає вкладене поле', () => {
  const result = run(['field', 'Понеділок', 'lessons.0.numerator.subject']);
  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), 'Математичний аналіз');
});

test('field відрізняє наявне null від відсутнього поля', () => {
  const nullResult = run(['field', 'Понеділок', 'lessons.2.numerator']);
  assert.equal(nullResult.status, 0);
  assert.equal(nullResult.stdout.trim(), 'null');

  const missingResult = run(['field', 'Понеділок', 'lessons.2.unknown']);
  assert.equal(missingResult.status, 4);
  assert.match(missingResult.stderr, /не існує/);
});

test('day відбирає заняття дня і типу тижня', () => {
  const result = run(['day', 'Понеділок', '--week', 'numerator']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Режим: numerator/);
  assert.match(result.stdout, /Знайдено занять: 2/);
  assert.doesNotMatch(result.stdout, /знаменник/);
});

test('day не дублює щотижневе заняття в режимі both', () => {
  const result = run(['day', 'Четвер']);
  assert.equal(result.status, 0);
  assert.equal((result.stdout.match(/Цаповська Ж\.Я\./g) ?? []).length, 1);
  assert.match(result.stdout, /щотижня/);
});

test('teacher підтримує пошук за частиною і прапорець remote', () => {
  const result = run(['teacher', 'Чмихало', '--remote']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /дистанційно/);
  assert.match(result.stdout, /Знайдено занять: 1/);
  assert.doesNotMatch(result.stdout, /П'ятниця/);
});

test('week включає щотижневі заняття', () => {
  const result = run(['week', 'denominator', '--day', 'Четвер']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Розклад: знаменник/);
  assert.match(result.stdout, /щотижня/);
  assert.match(result.stdout, /Знайдено занять: 2/);
});

test('глобальна опція file працює після назви команди', () => {
  const result = run(['list', '--file', 'data.json', '--limit', '1']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Показано днів: 1 із 5/);
});

test('неіснуючий файл дає зрозумілу помилку без стека', () => {
  const result = run(['--file', 'missing.json', 'list']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Файл «missing\.json» не знайдено/);
  assert.doesNotMatch(result.stderr, /\n\s+at\s/);
});

test('некоректний JSON дає ненульовий код', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'schedule-cli-'));
  const badFile = join(tempDir, 'bad.json');
  writeFileSync(badFile, '{ bad json', 'utf8');

  try {
    const result = run(['--file', badFile, 'list']);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /містить некоректний JSON/);
    assert.doesNotMatch(result.stderr, /\n\s+at\s/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('нечисловий limit дає код 2', () => {
  const result = run(['list', '--limit', 'abc']);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /очікує додатне ціле число/);
});

test('пропущений обов’язковий аргумент обробляється українською', () => {
  const result = run(['show']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Пропущено обов'язковий аргумент/);
});

test('невідома опція обробляється українською', () => {
  const result = run(['list', '--unknown']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Невідома опція/);
});

test('неіснуючий день дає код 4 і перелік доступних днів', () => {
  const result = run(['show', 'Неділя']);
  assert.equal(result.status, 4);
  assert.match(result.stderr, /День «Неділя» не знайдено/);
  assert.match(result.stderr, /Понеділок/);
});
