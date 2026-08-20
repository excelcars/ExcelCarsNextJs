const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
let text = fs.readFileSync(schemaPath, 'utf8');
const lines = text.split('\n');

// crude pluralizer, good enough for our model names (no irregular plurals in this schema)
function pluralize(word) {
  if (/[sxz]$|[^aeiou]h$/.test(word)) return word + 'es';
  if (/[^aeiou]y$/.test(word)) return word.slice(0, -1) + 'ies';
  return word + 's';
}

let renameCount = 0;

const out = lines.map((line) => {
  // any created_by/updated_by -> user_table relation field, forward or back, self or not
  let m = line.match(/^(\s*)(\w+)(\s+)(\w+)(\[\]|\?)?(\s+)@relation\("(\w+)_(created_by|updated_by)Touser_table"/);
  if (m) {
    const [, , , sp1, type, suffix, , srcTable, kind] = m;
    const isArray = suffix === '[]';
    let newName;
    if (type === 'UserTable') {
      if (isArray) {
        // self-relation back-array on UserTable itself
        newName = kind === 'created_by' ? 'createdUsers' : 'updatedUsers';
      } else {
        // forward relation: this row's own created_by/updated_by -> UserTable
        newName = kind === 'created_by' ? 'createdByUser' : 'updatedByUser';
      }
    } else if (isArray) {
      // back-relation on UserTable model, pointing at some other model's array
      const modelPascal = srcTable.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join('');
      newName = (kind === 'created_by' ? 'created' : 'updated') + pluralize(modelPascal);
    } else {
      // forward relation on some other model pointing (singular) at UserTable - shouldn't hit this branch given type!=='UserTable', skip
      return line;
    }
    renameCount++;
    return line.replace(/^(\s*)(\w+)(\s+)/, `$1${newName}$3`);
  }

  // add_employee <-> user_table via emp_id
  m = line.match(/^(\s*)(\w+)(\s+)(AddEmployee\??|UserTable\[\])(\s+)@relation\("user_table_emp_idToadd_employee"/);
  if (m) {
    const [, , , , type] = m;
    const newName = type.includes('[]') ? 'userAccounts' : 'employee';
    renameCount++;
    return line.replace(/^(\s*)(\w+)(\s+)/, `$1${newName}$3`);
  }

  // role_master <-> user_table via role_id
  m = line.match(/^(\s*)(\w+)(\s+)(RoleMaster\??|UserTable\[\])(\s+)@relation\("user_table_role_idTorole_master"/);
  if (m) {
    const [, , , , type] = m;
    const newName = type.includes('[]') ? 'users' : 'role';
    renameCount++;
    return line.replace(/^(\s*)(\w+)(\s+)/, `$1${newName}$3`);
  }

  return line;
});

fs.writeFileSync(schemaPath, out.join('\n'));
console.log(`Renamed ${renameCount} relation fields`);
