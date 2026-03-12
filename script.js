    // --- ROUTING ---
        function navigateTo(pageId) {
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            const target = document.getElementById(pageId);
            if(target) target.classList.add('active');
            
            document.querySelectorAll('.nav-links a.nav-item').forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('onclick') && link.getAttribute('onclick').includes(pageId)) {
                    link.classList.add('active');
                }
            });

            window.scrollTo({ top: 0, behavior: 'smooth' });
            
            // Initialization triggers for advanced tools
            if(pageId === 'calc-graph') { setTimeout(() => graphApp.init(), 50); } // slight delay for div to render
            if(pageId === 'calc-matrix') matrixApp.init();
            if(pageId === 'calc-sci') sciApp.init();
        }

        function toggleMobileNav() {
            const navLinks = document.getElementById('navLinks');
            if (navLinks) navLinks.classList.toggle('show');
        }

        // --- THEME / DARK MODE ---
        function toggleTheme() {
            const body = document.body;
            const icon = document.querySelector('#themeToggle i');
            
            if (body.getAttribute('data-theme') === 'dark') {
                body.removeAttribute('data-theme');
                if (icon) { icon.className = 'fa-solid fa-moon'; }
                localStorage.setItem('theme', 'light');
            } else {
                body.setAttribute('data-theme', 'dark');
                if (icon) { icon.className = 'fa-solid fa-sun'; }
                localStorage.setItem('theme', 'dark');
            }

            // Instantly redraw plots so they adapt to new dark/light CSS colors
            setTimeout(() => {
                if (document.getElementById('calc-graph').classList.contains('active')) graphApp.plot();
                if (document.getElementById('calc-calculus').classList.contains('active')) {
                    if(document.getElementById('tab-diff').classList.contains('active')) calculateDerivative();
                }
            }, 50);
        }

        if (localStorage.getItem('theme') === 'dark') {
            document.body.setAttribute('data-theme', 'dark');
            const icon = document.querySelector('#themeToggle i');
            if (icon) { icon.className = 'fa-solid fa-sun'; }
        }

        // --- 1. FOUR FUNCTION CALCULATOR (RESTORED LOGIC) ---
        const fourCalc = {
            current: '0', previous: '', op: undefined, shouldResetNext: false,
            updateUI() {
                const fourCurrent = document.getElementById('fourCurrent');
                const fourPrev = document.getElementById('fourPrev');
                if (fourCurrent) fourCurrent.innerText = this.current;
                if (fourPrev) fourPrev.innerText = this.previous + (this.op ? ` ${this.op}` : '');
            },
            clear() { this.current = '0'; this.previous = ''; this.op = undefined; this.updateUI(); },
            appendNum(num) {
                if (this.shouldResetNext) { this.current = '0'; this.shouldResetNext = false; }
                if (num === '.' && this.current.includes('.')) return;
                if (this.current === '0' && num !== '.') this.current = num.toString();
                else this.current = this.current.toString() + num.toString();
                this.updateUI();
            },
            appendOp(op) {
                if (this.current === '') return;
                if (this.previous !== '' && !this.shouldResetNext) this.compute(false);
                this.op = op; this.previous = this.current; this.current = '0'; 
                this.shouldResetNext = false; this.updateUI();
            },
            toggleSign() { this.current = (parseFloat(this.current) * -1).toString(); this.updateUI(); },
            compute(final = true) {
                let curr = parseFloat(this.current); let prev = parseFloat(this.previous);
                if (isNaN(prev) || isNaN(curr)) return;
                let result;
                switch (this.op) {
                    case '+': result = prev + curr; break;
                    case '-': result = prev - curr; break;
                    case '*': result = prev * curr; break;
                    case '/': result = curr === 0 ? 'Error' : prev / curr; break;
                    case '%': result = prev % curr; break;
                    default: return;
                }
                this.current = result.toString();
                if(final) { this.op = undefined; this.previous = ''; this.shouldResetNext = true; }
                this.updateUI();
            }
        };

        // --- 2. SCIENTIFIC CALCULATOR ---
        const sciApp = {
            expr: '0', ans: 0, angleMode: 'rad',
            init() { this.updateUI(); },
            switchTab(tabId) {
                document.getElementById('vk-main').style.display = tabId === 'main' ? 'grid' : 'none';
                document.getElementById('vk-func').style.display = tabId === 'func' ? 'grid' : 'none';
                document.getElementById('vk-abc').style.display = tabId === 'abc' ? 'block' : 'none';
                document.querySelectorAll('.vk-tab').forEach(el => el.classList.remove('active'));
                document.querySelector(`.vk-tab[onclick*="${tabId}"]`).classList.add('active');
            },
            setAngle(mode) {
                this.angleMode = mode;
                document.getElementById('sci-rad').classList.toggle('active', mode === 'rad');
                document.getElementById('sci-deg').classList.toggle('active', mode === 'deg');
            },
            updateUI() {
                let display = this.expr.replace(/\*/g, '×').replace(/\//g, '÷').replace(/pi/g, 'π');
                document.getElementById('sci-input').innerHTML = display + '<span style="border-right: 2px solid var(--primary); animation: blink 1s step-end infinite;"></span>';
            },
            clearAll() { this.expr = '0'; document.getElementById('sci-history').innerText = ''; this.updateUI(); },
            backspace() { this.expr = this.expr.slice(0, -1); if(this.expr === '') this.expr = '0'; this.updateUI(); },
            type(val) {
                if(this.expr === '0' && val !== '.') this.expr = val; else this.expr += val;
                this.updateUI();
            },
            compute() {
                try {
                    let toEvaluate = this.expr.replace(/ans/g, this.ans.toString());
                    let result = math.evaluate(toEvaluate);
                    if (this.angleMode === 'deg' && this.expr.includes('sin(')) result = math.evaluate(toEvaluate.replace(/sin\(/g, 'sin((pi/180)*'));
                    result = math.format(result, {precision: 10});
                    document.getElementById('sci-history').innerText = this.expr + ' =';
                    this.expr = result.toString(); this.ans = result; this.updateUI();
                } catch (e) {
                    document.getElementById('sci-input').innerText = 'Error'; setTimeout(() => this.clearAll(), 1500);
                }
            }
        };

        // --- 3. INTERACTIVE GRAPHING CALCULATOR ---
        const graphApp = {
            equations: [
                { id: 1, expr: 'sin(x)', color: '#3b82f6' },
                { id: 2, expr: 'x^2 / 10', color: '#a855f7' }
            ],
            nextId: 3,
            colors: ['#3b82f6', '#a855f7', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'],
            
            init() { this.renderList(); setTimeout(()=> this.plot(), 100); },
            addEquation() {
                this.equations.push({ id: this.nextId++, expr: '', color: this.colors[this.equations.length % this.colors.length] });
                this.renderList();
            },
            removeEquation(id) { this.equations = this.equations.filter(eq => eq.id !== id); this.renderList(); this.plot(); },
            updateEquation(id, val) {
                const eq = this.equations.find(e => e.id === id);
                if (eq) { eq.expr = val; this.plot(); }
            },
            renderList() {
                const list = document.getElementById('equation-list'); if (!list) return;
                list.innerHTML = this.equations.map(eq => `
                    <div class="graph-eq-item glass">
                        <div class="graph-eq-color" style="background: ${eq.color}; box-shadow: 0 0 0 3px ${eq.color}40;"><i class="fa-solid fa-wave-square" style="font-size: 0.6rem;"></i></div>
                        <span style="font-family: 'Times New Roman', serif; font-size: 1.4rem; margin-right: 8px; color: var(--text-main); font-style: italic; font-weight:bold;">y = </span>
                        <input type="text" class="graph-eq-input" value="${eq.expr}" oninput="graphApp.updateEquation(${eq.id}, this.value)" placeholder="e.g. cos(x) + 2">
                        <button class="icon-btn" style="color: var(--text-muted); width: 30px; height: 30px;" onclick="graphApp.removeEquation(${eq.id})"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                `).join('');
            },
            plot() {
                const graphDiv = document.getElementById('plotly-graph'); if (!graphDiv) return;
                const xValues = math.range(-10, 10, 0.05).toArray(); const data = [];
                
                this.equations.forEach(eq => {
                    if (!eq.expr.trim()) return;
                    try {
                        const compiled = math.compile(eq.expr);
                        const yValues = xValues.map(x => { try { return compiled.evaluate({x: x}); } catch(e) { return null; } });
                        data.push({ x: xValues, y: yValues, type: 'scatter', mode: 'lines', name: `y = ${eq.expr}`, line: { color: eq.color, width: 3 } });
                    } catch(e) {}
                });
                
                const textColor = getComputedStyle(document.body).getPropertyValue('--text-main').trim() || '#0f172a';
                // Adjust grid color based on theme
                const isDark = document.body.getAttribute('data-theme') === 'dark';
                const gridColor = isDark ? '#334155' : '#e2e8f0'; 

                const layout = {
                    margin: { t: 30, b: 30, l: 30, r: 30 }, paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
                    font: { color: textColor },
                    xaxis: { zerolinecolor: textColor, gridcolor: gridColor, dtick: 1 },
                    yaxis: { zerolinecolor: textColor, gridcolor: gridColor, dtick: 1 },
                    showlegend: true, legend: { x: 0, y: 1.1, orientation: 'h' }
                };
                Plotly.newPlot('plotly-graph', data, layout, {responsive: true, displayModeBar: false});
            },
            async analyzeGraph() {
                const btn = document.querySelector('#calc-graph .ai-btn');
                const box = document.getElementById('ai-graph-analysis');
                if (this.equations.length === 0 || this.equations.every(e => !e.expr.trim())) {
                    box.style.display = 'block';
                    box.innerHTML = '<span style="color:#ef4444;">Please add some equations to graph first!</span>';
                    return;
                }
                const eqList = this.equations.map(e => `y = ${e.expr}`).join(', ');
                btn.innerHTML = 'Analyzing... <span class="ai-loader"></span>';
                btn.disabled = true;
                box.style.display = 'block';
                box.innerHTML = '<span style="color:var(--text-muted);">Consulting AI... <span class="ai-loader ai-loader-dark"></span></span>';

                const prompt = `Analyze the following mathematical functions being plotted on a graph: ${eqList}. Describe their general behavior, any obvious points of intersection, asymptotes, and overall relationship. Keep it concise, educational, and easy to read without complex markdown.`;
                const res = await fetchGeminiAI(prompt, "You are a helpful math professor analyzing plotted graphs.");
                box.innerHTML = res;
                btn.innerHTML = '✨ Analyze Graph with AI';
                btn.disabled = false;
            }
        };

        // --- 4. MATRIX CALCULATOR (FLAT DESMOS CLONE) ---
        const matrixApp = {
            mode: 'eval', currentEdit: null, matrices: { A: [[1, 0], [0, 1]] }, expr: '', history: [],
            init() { this.renderLeftPanel(); this.renderDisplay(); },
            newMatrix() {
                const names = 'ABCDEFGH'.split(''); let next = names.find(n => !this.matrices[n]) || 'A';
                if(!this.matrices[next]) this.matrices[next] = [[0, 0], [0, 0]];
                this.mode = 'edit'; this.currentEdit = next; this.renderLeftPanel(); this.renderDisplay();
            },
            changeDim(dim, delta) {
                let mat = this.matrices[this.currentEdit];
                if(dim === 'row') { if(delta > 0 && mat.length < 6) mat.push(new Array(mat[0].length).fill(0)); else if(delta < 0 && mat.length > 1) mat.pop(); } 
                else { if(delta > 0 && mat[0].length < 6) mat.forEach(r => r.push(0)); else if(delta < 0 && mat[0].length > 1) mat.forEach(r => r.pop()); }
                this.renderLeftPanel(); this.renderDisplay();
            },
            updateCell(r, c, val) { this.matrices[this.currentEdit][r][c] = parseFloat(val) || 0; },
            type(val) {
                if(this.mode === 'edit') {
                    const active = document.activeElement;
                    if(active && active.classList.contains('matrix-cell-input')) { active.value += val; const [r, c] = active.dataset.pos.split(',').map(Number); this.updateCell(r, c, active.value); }
                } else { this.expr += val; this.renderDisplay(); }
            },
            backspace() {
                if(this.mode === 'edit') {
                    const active = document.activeElement;
                    if(active && active.classList.contains('matrix-cell-input')) { active.value = active.value.slice(0, -1); const [r, c] = active.dataset.pos.split(',').map(Number); this.updateCell(r, c, active.value); }
                } else { this.expr = this.expr.slice(0, -1); this.renderDisplay(); }
            },
            moveCursor(dir) {
                if(this.mode !== 'edit') return;
                const active = document.activeElement;
                if(active && active.classList.contains('matrix-cell-input')) {
                    const inputs = Array.from(document.querySelectorAll('.matrix-cell-input'));
                    const idx = inputs.indexOf(active);
                    if(dir === 'right' && idx < inputs.length - 1) inputs[idx+1].focus();
                    if(dir === 'left' && idx > 0) inputs[idx-1].focus();
                }
            },
            enter() {
                if(this.mode === 'edit') {
                    this.mode = 'eval'; this.expr = '';
                    const matCopy = this.matrices[this.currentEdit].map(row => [...row]);
                    this.history.push({ expr: this.currentEdit, result: matCopy });
                    this.renderLeftPanel(); this.renderDisplay();
                } else {
                    if(!this.expr.trim()) return;
                    try {
                        let toEval = this.expr.replace(/A²/g, 'A*A').replace(/B²/g, 'B*B').replace(/A⁻¹/g, 'inv(A)').replace(/Aᵀ/g, 'transpose(A)');
                        const scope = { ...this.matrices };
                        const res = math.evaluate(toEval, scope);
                        this.history.push({ expr: this.expr, result: res });
                        this.expr = ''; this.renderDisplay();
                        setTimeout(() => { const disp = document.getElementById('matrix-display-area'); if(disp) disp.scrollTop = disp.scrollHeight; }, 50);
                    } catch(e) {
                        this.expr = 'Error'; this.renderDisplay(); setTimeout(() => { this.expr = ''; this.renderDisplay(); }, 1500);
                    }
                }
            },
            clearAll() { this.matrices = { A: [[1, 0], [0, 1]] }; this.history = []; this.expr = ''; this.mode = 'eval'; this.renderLeftPanel(); this.renderDisplay(); },
            renderLeftPanel() {
                const panel = document.getElementById('matrix-left-panel'); if(!panel) return;
                if(this.mode === 'edit') {
                    const mat = this.matrices[this.currentEdit];
                    panel.innerHTML = `
                    <div class="matrix-edit-controls" style="width:100%; display:flex; flex-direction:column; align-items:center; justify-content:center;">
                        <div style="text-align: center; margin-bottom: 15px; color: var(--text-muted); font-weight: 500;">Edit Matrix <span style="color:var(--text-main); font-weight:bold;">${this.currentEdit}</span></div>
                        <div class="matrix-dim-row" style="display:flex; gap:10px; margin-bottom:10px; align-items:center;">
                            <button class="mk-btn mk-white" style="width:40px;height:40px;padding:0;" onclick="matrixApp.changeDim('row', -1)">−</button>
                            <div class="dim-label" style="text-align:center; font-size:0.85rem; color:var(--text-muted); width:60px;">Rows<br><b style="font-size:1.1rem; color:var(--text-main);">${mat.length}</b></div>
                            <button class="mk-btn mk-white" style="width:40px;height:40px;padding:0;" onclick="matrixApp.changeDim('row', 1)">+</button>
                        </div>
                        <div class="matrix-dim-row" style="display:flex; gap:10px; align-items:center;">
                            <button class="mk-btn mk-white" style="width:40px;height:40px;padding:0;" onclick="matrixApp.changeDim('col', -1)">−</button>
                            <div class="dim-label" style="text-align:center; font-size:0.85rem; color:var(--text-muted); width:60px;">Columns<br><b style="font-size:1.1rem; color:var(--text-main);">${mat[0].length}</b></div>
                            <button class="mk-btn mk-white" style="width:40px;height:40px;padding:0;" onclick="matrixApp.changeDim('col', 1)">+</button>
                        </div>
                    </div>`;
                } else {
                    panel.innerHTML = `
                    <div class="matrix-keypad left-eval">
                        <button class="mk-btn mk-white" onclick="matrixApp.type('A')">A</button>
                        <button class="mk-btn mk-white" onclick="matrixApp.type('B')">B</button>
                        <button class="mk-btn mk-white" onclick="matrixApp.type('C')">C</button>
                        <button class="mk-btn mk-white" onclick="matrixApp.type('D')">D</button>
                        <button class="mk-btn mk-white" onclick="matrixApp.type('E')">E</button>
                        <button class="mk-btn mk-white" onclick="matrixApp.type('F')">F</button>
                        <button class="mk-btn mk-white" onclick="matrixApp.type('G')">G</button>
                        <button class="mk-btn mk-white" onclick="matrixApp.type('H')">H</button>
                        <button class="mk-btn mk-white" onclick="matrixApp.type('²')">A²</button>
                        <button class="mk-btn mk-white" onclick="matrixApp.type('⁻¹')">A⁻¹</button>
                        <button class="mk-btn mk-white" onclick="matrixApp.type('ᵀ')">Aᵀ</button>
                        <button class="mk-btn mk-white" onclick="matrixApp.type('^')">Aⁿ</button>
                        <button class="mk-btn mk-white" onclick="matrixApp.type('inv(')">inv</button>
                        <button class="mk-btn mk-white" onclick="matrixApp.type('det(')">det</button>
                        <button class="mk-btn mk-white" onclick="matrixApp.type('trace(')">trace</button>
                        <button class="mk-btn mk-white" style="visibility:hidden;"></button>
                    </div>`;
                }
            },
            formatMatrixHTML(mat, isEdit = false) {
                if (!mat || !mat[0]) return ''; let html = `<div class="matrix-bracket-wrap"><div class="matrix-grid-display" style="grid-template-columns: repeat(${mat[0].length}, 1fr);">`;
                for(let r=0; r<mat.length; r++) { for(let c=0; c<mat[r].length; c++) { if(isEdit) { html += `<input type="number" class="matrix-cell-input" data-pos="${r},${c}" value="${mat[r][c]}" onchange="matrixApp.updateCell(${r},${c},this.value)" onclick="this.select()">`; } else { let val = mat[r][c]; if(typeof val === 'number') val = parseFloat(val.toFixed(4)); html += `<div class="matrix-cell-static">${val}</div>`; } } }
                html += `</div></div>`; return html;
            },
            renderDisplay() {
                const disp = document.getElementById('matrix-display-area'); if(!disp) return; let html = '';
                if(this.mode === 'edit') {
                    html += `<div class="matrix-line"><span style="color:var(--primary); font-style:italic; font-weight:bold; margin-right:10px;">${this.currentEdit} = </span>` + this.formatMatrixHTML(this.matrices[this.currentEdit], true) + `</div>`;
                    disp.innerHTML = html; setTimeout(() => { const firstInput = disp.querySelector('.matrix-cell-input'); if(firstInput) firstInput.focus(); }, 50);
                } else {
                    if(this.history.length === 0 && !this.expr) { for(let key in this.matrices) { html += `<div class="matrix-line" style="color:var(--text-muted);"><span style="font-style:italic; margin-right:10px;">${key} = </span>` + this.formatMatrixHTML(this.matrices[key], false) + `</div>`; } }
                    this.history.forEach(item => {
                        html += `<div class="matrix-line" style="justify-content:space-between; margin-top:15px;"><span style="font-style:italic;">${item.expr}</span>`;
                        let resData = item.result; if (item.result && item.result._data) resData = item.result._data;
                        if(Array.isArray(resData)) { html += `<span style="color:var(--primary);"> = ${this.formatMatrixHTML(resData, false)}</span>`; } else { let val = item.result; if(typeof val === 'number') val = parseFloat(val.toFixed(6)); html += `<span style="color:var(--primary); font-size: 1.5rem; font-family:'Times New Roman',serif;"> = ${val}</span>`; } html += `</div>`;
                    });
                    html += `<div class="matrix-line" style="margin-top:20px; min-height:30px; border-bottom:1px solid var(--matrix-border);"><span style="font-family:'Courier New', monospace; font-size:1.3rem;">${this.expr}<span style="border-right: 2px solid var(--primary); animation: blink 1s step-end infinite;"></span></span></div>`;
                    disp.innerHTML = html;
                }
            },
            async analyzeMatrix() {
                const box = document.getElementById('ai-matrix-analysis');
                const btn = document.querySelector('#calc-matrix .ai-btn');
                
                let stateDesc = `Current Expression: ${this.expr || 'None'}\nDefined Matrices:\n`;
                for (let key in this.matrices) {
                    stateDesc += `${key} = ${JSON.stringify(this.matrices[key])}\n`;
                }
                if (this.history.length > 0) {
                    stateDesc += `\nRecent Calculations:\n`;
                    this.history.slice(-3).forEach(h => {
                        let resStr = Array.isArray(h.result) || (h.result && h.result._data) ? JSON.stringify(h.result._data || h.result) : h.result;
                        stateDesc += `${h.expr} = ${resStr}\n`;
                    });
                }

                btn.innerHTML = '✨ <span class="ai-loader"></span>';
                btn.disabled = true;
                box.style.display = 'block';
                box.innerHTML = '<span style="color:var(--text-muted);">Analyzing matrices... <span class="ai-loader ai-loader-dark"></span></span>';

                const prompt = `Here is the current state of a user's matrix calculator:\n${stateDesc}\nExplain the properties of the defined matrices (e.g., dimensions, if they are identity matrices) and briefly explain the recent calculations. Keep it concise and educational.`;
                const res = await fetchGeminiAI(prompt, "You are an expert linear algebra tutor.");
                box.innerHTML = res;
                btn.innerHTML = '✨ Explain';
                btn.disabled = false;
            }
        };

        // --- 5. CALCULUS LOGIC ---
        let lastDiffExpr = "", lastDiffResult = "", lastIntExpr = "", lastIntResult = "";
        function switchCalcTab(event, tabId) {
            document.querySelectorAll('.calc-tab-content').forEach(el => el.classList.remove('active')); document.querySelectorAll('.calc-tab-btn').forEach(el => el.classList.remove('active'));
            document.getElementById(`tab-${tabId}`).classList.add('active'); event.currentTarget.classList.add('active');
        }
        function toggleIntType() {
            const isDefinite = document.getElementById('int-type-def').checked;
            document.getElementById('int-bounds-container').style.display = isDefinite ? 'flex' : 'none';
        }
        function calculateDerivative() {
            const expr = document.getElementById('diff-input').value.trim(); const resBox = document.getElementById('diff-result');
            if(!expr) return;
            try {
                const derivative = math.derivative(expr, 'x'); const derivStr = derivative.toString();
                lastDiffExpr = expr; lastDiffResult = derivStr;
                katex.render(`\\frac{d}{dx} \\left(${math.parse(expr).toTex()}\\right) = ${math.parse(derivStr).toTex()}`, resBox, { displayMode: true, throwOnError: false });
                document.getElementById('btn-explain-diff').style.display = 'block';
                drawCalculusGraph('diff-plot', expr, derivStr, 'f(x)', "f'(x)");
            } catch (err) { resBox.innerHTML = `<span style="color:#ef4444">Error parsing function.</span>`; }
        }
        function calculateIntegral() {
            const expr = document.getElementById('int-input').value.trim(); const resBox = document.getElementById('int-result');
            if(!expr) return;
            const isDefinite = document.getElementById('int-type-def').checked;
            try {
                let texExpr = ""; try { texExpr = math.parse(expr).toTex(); } catch(e) { texExpr = expr; }
                if (isDefinite) {
                    const aStr = document.getElementById('int-a').value; const bStr = document.getElementById('int-b').value;
                    const a = math.evaluate(aStr); const b = math.evaluate(bStr);
                    const n = 1000; const h = (b - a) / n; const f = math.compile(expr);
                    let sum = f.evaluate({x: a}) + f.evaluate({x: b});
                    for (let i = 1; i < n; i++) { let x = a + i * h; sum += f.evaluate({x: x}) * (i % 2 === 0 ? 2 : 4); }
                    const result = math.format((h / 3) * sum, {precision: 7});
                    lastIntExpr = `Definite integral from ${aStr} to ${bStr} of ${expr}`; lastIntResult = result;
                    katex.render(`\\int_{${math.parse(aStr).toTex()}}^{${math.parse(bStr).toTex()}} \\left(${texExpr}\\right) dx \\approx ${result}`, resBox, { displayMode: true, throwOnError: false });
                } else {
                    const integral = nerdamer(`integrate(${expr}, x)`); const intTex = nerdamer.convertToLaTeX(integral.text());
                    lastIntExpr = `Indefinite integral of ${expr}`; lastIntResult = integral.text();
                    katex.render(`\\int \\left(${texExpr}\\right) dx = ${intTex} + C`, resBox, { displayMode: true, throwOnError: false });
                }
                document.getElementById('btn-explain-int').style.display = 'block';
            } catch (err) { resBox.innerHTML = `<span style="color:#ef4444">Error evaluating integral.</span>`; }
        }
        function drawCalculusGraph(divId, expr1, expr2, name1, name2) {
            try {
                const targetDiv = document.getElementById(divId); if (!targetDiv) return;
                const expr1Compiled = math.compile(expr1); const expr2Compiled = math.compile(expr2);
                const xValues = math.range(-10, 10, 0.1).toArray();
                const y1Values = xValues.map(x => { try { return expr1Compiled.evaluate({x: x}); } catch(e){ return null;} });
                const y2Values = xValues.map(x => { try { return expr2Compiled.evaluate({x: x}); } catch(e){ return null;} });
                const textColor = getComputedStyle(document.body).getPropertyValue('--text-main').trim();
                const isDark = document.body.getAttribute('data-theme') === 'dark';
                const gridColor = isDark ? '#334155' : '#e2e8f0'; 
                const layout = { margin: { t: 30, b: 40, l: 40, r: 20 }, paper_bgcolor: 'transparent', plot_bgcolor: 'transparent', font: { color: textColor }, xaxis: { zerolinecolor: textColor, gridcolor: gridColor }, yaxis: { zerolinecolor: textColor, gridcolor: gridColor }, legend: { orientation: "h", y: 1.1 } };
                Plotly.newPlot(divId, [{ x: xValues, y: y1Values, type: 'scatter', mode: 'lines', name: name1, line: {color: '#3b82f6', width: 2} }, { x: xValues, y: y2Values, type: 'scatter', mode: 'lines', name: name2, line: {color: '#a855f7', dash: 'dash', width: 2} }], layout, {responsive: true, displayModeBar: false});
            } catch(e) {}
        }

        // --- 6. GEMINI AI INTEGRATION ---
        const apiKey = ""; 
        async function fetchGeminiAI(prompt, systemInstruction) {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
            const payload = { contents: [{ parts: [{ text: prompt }] }], systemInstruction: { parts: [{ text: systemInstruction }] } };
            const retries = [1000, 2000, 4000, 8000, 16000];
            for (let i = 0; i <= retries.length; i++) {
                try {
                    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    const data = await response.json(); return data.candidates?.[0]?.content?.parts?.[0]?.text || "No explanation generated.";
                } catch (error) {
                    if (i === retries.length) return error.message.includes('401') ? "API Key Authentication failed (401). Please check that a valid API key is available in the environment." : "Failed to connect to AI.";
                    await new Promise(res => setTimeout(res, retries[i]));
                }
            }
        }
        async function solveWordProblem() {
            const input = document.getElementById('ai-word-input').value.trim(); const resultBox = document.getElementById('ai-word-result'); const btn = document.getElementById('btn-solve-word');
            if (!input) return resultBox.innerHTML = '<span style="color:#ef4444;">Please enter a math problem first!</span>';
            btn.innerHTML = 'Solving... <span class="ai-loader"></span>'; btn.disabled = true; resultBox.style.display = 'block'; resultBox.innerHTML = '<span style="color:var(--text-muted);">Analyzing problem... <span class="ai-loader ai-loader-dark"></span></span>';
            const res = await fetchGeminiAI(input, "You are an expert math tutor. Solve the problem step-by-step.");
            resultBox.innerHTML = res; btn.innerHTML = 'Solve with Gemini ✨'; btn.disabled = false;
        }
        async function explainCalculusSteps(type) {
            let expr = type === 'diff' ? lastDiffExpr : lastIntExpr;
            let result = type === 'diff' ? lastDiffResult : lastIntResult;
            let btn = document.getElementById(`btn-explain-${type}`); let box = document.getElementById(`ai-${type}-explanation`);
            btn.innerHTML = 'Generating Steps... <span class="ai-loader"></span>'; btn.disabled = true; box.style.display = 'block'; box.innerHTML = '<span style="color:var(--text-muted);">Consulting AI... <span class="ai-loader ai-loader-dark"></span></span>';
            const res = await fetchGeminiAI(`Explain how to calculate ${type === 'diff'?'derivative':'integral'} of: ${expr}.  ${result}. Show steps.`, "You are an expert calculus professor. Provide step-by-step explanation.");
            box.innerHTML = res; btn.innerHTML = '✨ Explain Steps with AI'; btn.disabled = false;
        }

        // Initialize App
        document.addEventListener('DOMContentLoaded', () => {
            if(document.getElementById('calc-sci').classList.contains('active')) sciApp.init();
        });