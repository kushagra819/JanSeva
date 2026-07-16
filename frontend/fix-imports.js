import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function processFile(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 1. next/link -> react-router
  content = content.replace(/import Link from ["']next\/link["'];?/g, 'import { Link } from "react-router";');
  
  // 2. next/image -> img
  content = content.replace(/import Image from ["']next\/image["'];?/g, '');
  content = content.replace(/<Image/g, '<img');

  // 3. @/components/marketing/... to relative
  content = content.replace(/@\/components\/marketing/g, filePath.includes('marketing') ? '.' : '../marketing');
  
  // 4. @/components/ui/... to relative
  content = content.replace(/@\/components\/ui/g, '../ui');

  // 5. @/data/... to relative
  content = content.replace(/@\/data/g, '../../data');
  
  // 6. Link href to to
  content = content.replace(/<Link([\s\S]*?)href=(['"{][\s\S]*?['"}])/g, '<Link$1to=$2');

  fs.writeFileSync(filePath, content);
}

walkDir('./src/components/marketing', processFile);
if (fs.existsSync('./src/components/layout')) {
  walkDir('./src/components/layout', processFile);
}
