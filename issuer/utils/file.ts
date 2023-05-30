import * as fs from 'fs';
const removeData = () => {
  const dir = './data';
  if (!fs.existsSync(dir)) {
    return;
  }
  fs.rmdirSync(dir, { recursive: true });
};

export { removeData };
