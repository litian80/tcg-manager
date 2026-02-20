const fs = require('fs');
const schema = JSON.parse(fs.readFileSync('schema.json', 'utf8'));
const definitions = schema.definitions;
let output = '';
for (const [tableName, definition] of Object.entries(definitions)) {
    // Only look at actual tables, not just responses or parameters if they exist
    output += `Table: ${tableName}\n`;
    const props = definition.properties;
    if (props) {
        for (const [colName, colDef] of Object.entries(props)) {
            output += `  - ${colName}: ${colDef.type} ${colDef.format ? '(' + colDef.format + ')' : ''} ${colDef.description ? colDef.description : ''}\n`;
        }
    }
    output += '\n';
}
fs.writeFileSync('prod_simplified_schema.txt', output);
console.log('Saved to prod_simplified_schema.txt');
