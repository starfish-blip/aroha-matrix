const { spawn } = require('child_process');
const child = spawn('%USERPROFILE%/AppData/Local/Programs/Python/Python312/python.exe', ['-m', 'uvicorn', 'app:app', '--host', '127.0.0.1', '--port', '8000'], {
  cwd: __dirname,
  stdio: 'inherit'
});
child.on('exit', (code) => process.exit(code ?? 1));
