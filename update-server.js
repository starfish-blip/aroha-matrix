const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const explicitRoute = `
app.get('/hourly-charts-gallery.html', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'hourly-charts-gallery.html'));
});
`;

if (!code.includes('hourly-charts-gallery.html')) {
  code = code.replace('app.listen(PORT,', explicitRoute + '\napp.listen(PORT,');
  fs.writeFileSync('server.js', code);
  console.log('? Route successfully embedded into server.js');
} else {
  console.log('?? Route is already present in server.js');
}
