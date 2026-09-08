const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ts = require('typescript');

// Load the app's TypeScript data layer without starting Next or touching real data.
require.extensions['.ts'] = (module, filename) => {
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  module._compile(source, filename);
};
const { validateSchedule, dateKey } = require('../src/lib/tasks/schedule.ts');
// local-source captures cwd when loaded; use an isolated directory.
const originalCwd = process.cwd();
const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-scheduling-'));
process.chdir(sandbox);
const isolated = require('../src/lib/data/local-source.ts').localSource;

(async () => {
  assert.equal(validateSchedule('2028-02-29', '23:59'), null);
  for (const date of ['2026-02-29', '2026-04-31', '2026-13-01', '09/08/2026']) assert.ok(validateSchedule(date));
  assert.ok(validateSchedule('2026-09-08', '24:00'));
  assert.ok(validateSchedule(undefined, '09:00'));
  assert.equal(validateSchedule(undefined, undefined), null);
  assert.equal(dateKey(new Date(2026, 11, 31, 23, 59)), '2026-12-31');
  const input = { projectId: 'home-cooked', title: 'Scheduling test', status: 'todo', scheduledDate: '2026-12-31', scheduledTime: '09:30' };
  const created = await isolated.createTask(input);
  let stored = (await isolated.tasks()).find(task => task.id === created.id);
  assert.equal(stored.scheduledDate, input.scheduledDate);
  assert.equal(stored.scheduledTime, input.scheduledTime);
  await isolated.setTaskStatus(created.id, 'completed');
  stored = (await isolated.tasks()).find(task => task.id === created.id);
  assert.equal(stored.scheduledDate, input.scheduledDate);
  await isolated.updateTask(created.id, { ...input, scheduledDate: '2027-01-01', scheduledTime: undefined });
  stored = (await isolated.tasks()).find(task => task.id === created.id);
  assert.equal(stored.scheduledDate, '2027-01-01');
  assert.equal(stored.scheduledTime, undefined);
  await isolated.updateTask(created.id, { ...input, scheduledDate: undefined, scheduledTime: undefined });
  stored = (await isolated.tasks()).find(task => task.id === created.id);
  assert.equal(stored.scheduledDate, undefined);
  assert.equal(stored.scheduledTime, undefined);
  const disk = JSON.parse(fs.readFileSync(path.join(sandbox, '.product-studio/data.json'), 'utf8'));
  assert.equal(disk.tasks.find(task => task.id === created.id).scheduledDate, undefined);
  console.log('Passed: date/time validation, local calendar dates, persistence, completion, rescheduling, and clearing schedules.');
})().finally(() => { process.chdir(originalCwd); fs.rmSync(sandbox, { recursive: true, force: true }); }).catch(error => { console.error(error); process.exitCode = 1; });
