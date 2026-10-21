const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const routeCode = `
app.get('/hourly-charts-gallery.html', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'hourly-charts-gallery.html'));
});
`;

if (!code.includes('hourly-charts-gallery.html')) {
  code = code.replace('app.listen(PORT,', routeCode + '\napp.listen(PORT,');
  fs.writeFileSync('server.js', code);
  console.log('? Route added successfully!');
} else {
  console.log('?? Route already exists in server.js.');
}
