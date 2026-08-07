const expected = "22.23.1";
const actual = process.versions.node;

if (actual !== expected) {
  console.error(`Toril requires Node ${expected}; found ${actual}.`);
  process.exit(1);
}

console.log(`Node ${actual} matches .nvmrc.`);
