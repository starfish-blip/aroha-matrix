# /// script
# dependencies = ['marimo']
# ///

import marimo

__generated_with = "0.25.1"
app = marimo.App()


@app.cell
def _():
    import marimo as mo

    return (mo,)


@app.cell
def _():
    return


@app.cell
def _(mo):
    prism_dashboard = mo.Html("""
    <iframe style="width: 100%; height: 850px; border: none; border-radius: 12px;" srcdoc="
    <!DOCTYPE html>
    <html lang='en' class='dark'>
    <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>Alphabet RGB Light Prism Simulator</title>
        <script src='https://cdn.tailwindcss.com'></script>
        <script>
            tailwind.config = {
                darkMode: 'class',
                theme: {
                    extend: {
                        colors: {
                            darkbg: '#050508',
                            cardbg: '#0d0d12',
                            bordercolor: '#1e1e2d'
                        }
                    }
                }
            }
        </script>
        <link rel='stylesheet' href='https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'>
        <link href='https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap' rel='stylesheet'>
        <style>
            body { font-family: 'Inter', sans-serif; }
            .mono { font-family: 'JetBrains Mono', monospace; }
            ::-webkit-scrollbar { width: 6px; height: 6px; }
            ::-webkit-scrollbar-track { background: #050508; }
            ::-webkit-scrollbar-thumb { background: #1e1e2d; border-radius: 3px; }
        </style>
    </head>
    <body class='bg-darkbg text-zinc-100 min-h-screen p-4 flex flex-col items-center'>
        <div class='w-full max-w-5xl space-y-6'>
        
            <!-- Header -->
            <div class='bg-cardbg border border-bordercolor rounded-2xl p-6 shadow-2xl flex items-center justify-between'>
                <div class='flex items-center space-x-3'>
                    <div class='w-10 h-10 rounded-xl bg-gradient-to-tr from-red-500 via-emerald-500 to-blue-500 flex items-center justify-center shadow-lg'>
                        <i class='fa-solid fa-prism text-white text-lg'></i>
                    </div>
                    <div>
                        <h1 class='font-bold text-base text-white'>Alphabet RGB Light Prism Simulator</h1>
                        <p class='text-xs text-zinc-400'>9-8-9 Ternary Optical Synthesis & Resonant Field</p>
                    </div>
                </div>
                <button id='reset-all' class='px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-xs font-medium rounded-xl transition border border-zinc-800 text-zinc-300 flex items-center space-x-2'>
                    <i class='fa-solid fa-rotate-right'></i>
                    <span>Reset Grid</span>
                </button>
            </div>

            <!-- Canvas Visualizer Section -->
            <div class='bg-cardbg border border-bordercolor rounded-2xl p-6 shadow-2xl space-y-4'>
                <div class='flex justify-between items-center'>
                    <h2 class='text-sm font-bold text-white flex items-center space-x-2'>
                        <i class='fa-solid fa-wave-square text-emerald-400'></i>
                        <span>Optical Convergence Engine</span>
                    </h2>
                    <div class='text-xs font-mono text-zinc-400'>Intensity: <span id='convergence-score' class='text-emerald-400 font-bold'>100%</span></div>
                </div>
            
                <div class='w-full h-48 rounded-xl border border-zinc-800 bg-zinc-950/80 relative overflow-hidden flex items-center justify-center shadow-inner'>
                    <canvas id='prismCanvas' class='w-full h-full block'></canvas>
                    <div class='absolute inset-0 flex items-center justify-center pointer-events-none px-4 text-center'>
                        <div class='bg-black/60 backdrop-blur-md px-6 py-2.5 rounded-2xl border border-white/10'>
                            <span id='spectral-state-label' class='text-xs font-bold tracking-widest text-white uppercase'>PURE WHITE LIGHT CONVERGENCE</span>
                        </div>
                    </div>
                </div>

                <!-- Gain Sliders -->
                <div class='grid grid-cols-1 md:grid-cols-3 gap-4 pt-2'>
                    <div class='bg-zinc-900/60 border border-red-500/20 rounded-xl p-3 flex flex-col space-y-2'>
                        <div class='flex justify-between text-xs'>
                            <span class='text-red-400 font-semibold'>Red Gain (Pillar 1)</span>
                            <span id='gain-red-val' class='mono text-red-200'>100%</span>
                        </div>
                        <input type='range' id='gain-red' min='0' max='100' value='100' class='accent-red-500 cursor-pointer'>
                    </div>
                    <div class='bg-zinc-900/60 border border-emerald-500/20 rounded-xl p-3 flex flex-col space-y-2'>
                        <div class='flex justify-between text-xs'>
                            <span class='text-emerald-400 font-semibold'>Green Gain (Pillar 2)</span>
                            <span id='gain-green-val' class='mono text-emerald-200'>100%</span>
                        </div>
                        <input type='range' id='gain-green' min='0' max='100' value='100' class='accent-emerald-500 cursor-pointer'>
                    </div>
                    <div class='bg-zinc-900/60 border border-blue-500/20 rounded-xl p-3 flex flex-col space-y-2'>
                        <div class='flex justify-between text-xs'>
                            <span class='text-blue-400 font-semibold'>Blue Gain (Pillar 3)</span>
                            <span id='gain-blue-val' class='mono text-blue-200'>100%</span>
                        </div>
                        <input type='range' id='gain-blue' min='0' max='100' value='100' class='accent-blue-500 cursor-pointer'>
                    </div>
                </div>
            </div>

            <!-- 9-8-9 Grids -->
            <div class='grid grid-cols-1 lg:grid-cols-3 gap-6'>
                <!-- Pillar 1: Red -->
                <div class='bg-cardbg border border-red-500/30 rounded-2xl p-5 flex flex-col justify-between shadow-xl'>
                    <div>
                        <div class='flex items-center justify-between mb-3'>
                            <h3 class='font-semibold text-white text-sm'>Pillar 1: Red (A-I)</h3>
                            <span id='count-red' class='px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-xs font-mono'>9 active</span>
                        </div>
                        <div class='grid grid-cols-3 gap-2 mb-4' id='grid-red'></div>
                    </div>
                    <div class='bg-red-950/20 border border-red-900/30 rounded-xl p-3 text-xs flex justify-between items-center'>
                        <span class='text-red-400'>Numerical Sum:</span>
                        <span id='sum-red' class='mono font-bold text-red-200'>45</span>
                    </div>
                </div>

                <!-- Pillar 2: Green -->
                <div class='bg-cardbg border border-emerald-500/30 rounded-2xl p-5 flex flex-col justify-between shadow-xl'>
                    <div>
                        <div class='flex items-center justify-between mb-3'>
                            <h3 class='font-semibold text-white text-sm'>Pillar 2: Green (J-Q)</h3>
                            <span id='count-green' class='px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-mono'>8 active</span>
                        </div>
                        <div class='grid grid-cols-4 gap-2 mb-4' id='grid-green'></div>
                    </div>
                    <div class='bg-emerald-950/20 border border-emerald-900/30 rounded-xl p-3 text-xs flex justify-between items-center'>
                        <span class='text-emerald-400'>Numerical Sum:</span>
                        <span id='sum-green' class='mono font-bold text-emerald-200'>108</span>
                    </div>
                </div>

                <!-- Pillar 3: Blue -->
                <div class='bg-cardbg border border-blue-500/30 rounded-2xl p-5 flex flex-col justify-between shadow-xl'>
                    <div>
                        <div class='flex items-center justify-between mb-3'>
                            <h3 class='font-semibold text-white text-sm'>Pillar 3: Blue (R-Z)</h3>
                            <span id='count-blue' class='px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-xs font-mono'>9 active</span>
                        </div>
                        <div class='grid grid-cols-3 gap-2 mb-4' id='grid-blue'></div>
                    </div>
                    <div class='bg-blue-950/20 border border-blue-900/30 rounded-xl p-3 text-xs flex justify-between items-center'>
                        <span class='text-blue-400'>Numerical Sum:</span>
                        <span id='sum-blue' class='mono font-bold text-blue-200'>198</span>
                    </div>
                </div>
            </div>

        </div>

        <script>
            const alphabetData = [
                { char: 'A', group: 'red', val: 1 }, { char: 'B', group: 'red', val: 2 }, { char: 'C', group: 'red', val: 3 },
                { char: 'D', group: 'red', val: 4 }, { char: 'E', group: 'red', val: 5 }, { char: 'F', group: 'red', val: 6 },
                { char: 'G', group: 'red', val: 7 }, { char: 'H', group: 'red', val: 8 }, { char: 'I', group: 'red', val: 9 },

                { char: 'J', group: 'green', val: 10 }, { char: 'K', group: 'green', val: 11 }, { char: 'L', group: 'green', val: 12 },
                { char: 'M', group: 'green', val: 13 }, { char: 'N', group: 'green', val: 14 }, { char: 'O', group: 'green', val: 15 },
                { char: 'P', group: 'green', val: 16 }, { char: 'Q', group: 'green', val: 17 },

                { char: 'R', group: 'blue', val: 18 }, { char: 'S', group: 'blue', val: 19 }, { char: 'T', group: 'blue', val: 20 },
                { char: 'U', group: 'blue', val: 21 }, { char: 'V', group: 'blue', val: 22 }, { char: 'W', group: 'blue', val: 23 },
                { char: 'X', group: 'blue', val: 24 }, { char: 'Y', group: 'blue', val: 25 }, { char: 'Z', group: 'blue', val: 26 },
            ];

            const activeState = {};
            alphabetData.forEach(i => activeState[i.char] = true);
            const gainState = { red: 1.0, green: 1.0, blue: 1.0 };

            const gridRed = document.getElementById('grid-red');
            const gridGreen = document.getElementById('grid-green');
            const gridBlue = document.getElementById('grid-blue');

            function renderGrids() {
                gridRed.innerHTML = '';
                gridGreen.innerHTML = '';
                gridBlue.innerHTML = '';

                let rC = 0, rS = 0, gC = 0, gS = 0, bC = 0, bS = 0;

                alphabetData.forEach(item => {
                    const active = activeState[item.char];
                    const btn = document.createElement('button');
                    btn.className = `p-2 rounded-xl text-xs font-bold mono transition-all flex flex-col items-center justify-center border ${
                        active ? getStyle(item.group) : 'bg-zinc-900/40 border-zinc-800 text-zinc-600 opacity-40 hover:opacity-80'
                    }`;
                    btn.innerHTML = `<span class='text-sm'>${item.char}</span><span class='text-[9px] opacity-60'>${item.val}</span>`;
                    btn.onclick = () => {
                        activeState[item.char] = !activeState[item.char];
                        renderGrids();
                    };

                    if (item.group === 'red') {
                        gridRed.appendChild(btn);
                        if (active) { rC++; rS += item.val; }
                    } else if (item.group === 'green') {
                        gridGreen.appendChild(btn);
                        if (active) { gC++; gS += item.val; }
                    } else if (item.group === 'blue') {
                        gridBlue.appendChild(btn);
                        if (active) { bC++; bS += item.val; }
                    }
                });

                document.getElementById('count-red').textContent = `${rC} active`;
                document.getElementById('count-green').textContent = `${gC} active`;
                document.getElementById('count-blue').textContent = `${bC} active`;
                document.getElementById('sum-red').textContent = rS;
                document.getElementById('sum-green').textContent = gS;
                document.getElementById('sum-blue').textContent = bS;
            
                const totalPct = Math.round(((rC + gC + bC) / 26) * 100);
                document.getElementById('convergence-score').textContent = `${totalPct}%`;
            }

            function getStyle(group) {
                if (group === 'red') return 'bg-red-500/20 border-red-500/40 text-red-300';
                if (group === 'green') return 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300';
                return 'bg-blue-500/20 border-blue-500/40 text-blue-300';
            }

            document.getElementById('gain-red').oninput = (e) => { gainState.red = e.target.value / 100; document.getElementById('gain-red-val').textContent = `${e.target.value}%`; };
            document.getElementById('gain-green').oninput = (e) => { gainState.green = e.target.value / 100; document.getElementById('gain-green-val').textContent = `${e.target.value}%`; };
            document.getElementById('gain-blue').oninput = (e) => { gainState.blue = e.target.value / 100; document.getElementById('gain-blue-val').textContent = `${e.target.value}%`; };

            document.getElementById('reset-all').onclick = () => {
                alphabetData.forEach(i => activeState[i.char] = true);
                gainState.red = 1; gainState.green = 1; gainState.blue = 1;
                document.getElementById('gain-red').value = 100; document.getElementById('gain-red-val').textContent = '100%';
                document.getElementById('gain-green').value = 100; document.getElementById('gain-green-val').textContent = '100%';
                document.getElementById('gain-blue').value = 100; document.getElementById('gain-blue-val').textContent = '100%';
                renderGrids();
            };

            const canvas = document.getElementById('prismCanvas');
            const ctx = canvas.getContext('2d');
            function resize() { canvas.width = canvas.parentElement.clientWidth; canvas.height = canvas.parentElement.clientHeight; }
            window.onresize = resize;
            resize();

            let step = 0;
            function draw() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                step += 0.04;

                const rAct = (alphabetData.filter(i => i.group === 'red' && activeState[i.char]).length / 9) * gainState.red;
                const gAct = (alphabetData.filter(i => i.group === 'green' && activeState[i.char]).length / 8) * gainState.green;
                const bAct = (alphabetData.filter(i => i.group === 'blue' && activeState[i.char]).length / 9) * gainState.blue;

                ctx.beginPath();
                ctx.lineWidth = 3;
                for (let x = 0; x < canvas.width; x += 3) {
                    const y = canvas.height / 2 + 
                              Math.sin(x * 0.02 + step) * (15 * rAct) + 
                              Math.cos(x * 0.015 - step * 1.2) * (15 * gAct) + 
                              Math.sin(x * 0.025 + step * 0.8) * (15 * bAct);
                    if (x === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }

                const rC = Math.floor(239 * rAct);
                const gC = Math.floor(185 * gAct);
                const bC = Math.floor(246 * bAct);
            
                ctx.strokeStyle = `rgba(${rC + 20}, ${gC + 40}, ${bC + 50}, 0.9)`;
                ctx.shadowColor = `rgba(${rC}, ${gC}, ${bC}, 0.8)`;
                ctx.shadowBlur = 15;
                ctx.stroke();

                requestAnimationFrame(draw);
            }

            renderGrids();
            draw();
        </script>
    </body>
    </html>
    """)
    return


if __name__ == "__main__":
    app.run()
