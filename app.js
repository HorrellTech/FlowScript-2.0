document.addEventListener('DOMContentLoaded', () => {

    let draggedElement = null;
    const dropIndicator = document.createElement('div');
    dropIndicator.className = 'drop-indicator';


    // =========================================================================
    // == BLOCK DEFINITIONS: The heart of the modular system. ==
    // =========================================================================
    const BLOCK_DEFINITIONS = [
        // =========================================================================
        // == HTML STRUCTURE & PAGE ==
        // =========================================================================
        {
            type: 'html_document', label: 'HTML Document', icon: 'fa-solid fa-file-code', color: '#f7768e',
            html: () => `
                <div class="block-content"><label><!DOCTYPE html></label></div>
                <div class="block-content"><label><html lang="</label><input type="text" placeholder="en" data-token="lang" style="width: 40px;"><label>"></label></div>
                <div class="nested-drop-zone" data-branch="head"><p class="placeholder-text">Drop <head> elements here...</p></div>
                <div class="nested-drop-zone" data-branch="body"><p class="placeholder-text">Drop <body> elements here...</p></div>
                <div class="block-content" style="margin-top: 0.5rem;"><label></html></label></div>
            `,
            parser: (b, i) => {
                const langInput = b.querySelector('[data-token="lang"]');
                const lang = langInput ? langInput.value || 'en' : 'en';
                return `<!DOCTYPE html>
<html lang="${lang}">
${i}<head>
${parseZone(b.querySelector('[data-branch="head"]'), i + '    ')}
${i}</head>
${i}<body>
${parseZone(b.querySelector('[data-branch="body"]'), i + '    ')}
${i}</body>
</html>`;
            }
        },
        {
            type: 'div_container', label: 'Div Container', icon: 'fa-solid fa-square-full', color: '#e0af68',
            html: () => `
        <div class="block-content">
            <label><div</label>
            <input type="text" placeholder="id" data-token="id" style="width: 80px;">
            <input type="text" placeholder="class" data-token="class" style="width: 120px;">
            <label>></label>
        </div>
        <div class="nested-drop-zone" data-branch="body"><p class="placeholder-text">Content for div...</p></div>
        <div class="block-content" style="margin-top: 0.5rem;"><label></div></label></div>
    `,
            parser: (b, i) => {
                const idInput = b.querySelector('[data-token="id"]');
                const clsInput = b.querySelector('[data-token="class"]');
                const id = idInput ? idInput.value : '';
                const cls = clsInput ? clsInput.value : '';
                let attrs = '';
                if (id) attrs += ` id="${id}"`;
                if (cls) attrs += ` class="${cls}"`;
                return `<div${attrs}>\n${parseZone(b.querySelector('[data-branch="body"]'), i + '    ')}${i}</div>`;
            }
        },

        // =========================================================================
        // == HTML HEAD ELEMENTS ==
        // =========================================================================
        {
            type: 'title', label: 'Page Title', icon: 'fa-solid fa-t', color: '#73daca',
            html: () => `<div class="block-content"><label><title></label><input type="text" placeholder="My Awesome Page" data-token="value"><label></title></label></div>`,
            parser: b => {
                const input = b.querySelector('[data-token="value"]');
                return `<title>${input ? input.value : 'Document'}</title>`;
            }
        },
        {
            type: 'meta_charset', label: 'Meta Charset', icon: 'fa-solid fa-globe', color: '#73daca',
            html: () => `<div class="block-content"><label><meta charset="UTF-8"></label></div>`,
            parser: () => `<meta charset="UTF-8">`
        },
        {
            type: 'meta_viewport', label: 'Meta Viewport', icon: 'fa-solid fa-mobile-screen', color: '#73daca',
            html: () => `<div class="block-content"><label><meta name="viewport" ...></label></div>`,
            parser: () => `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
        },
        {
            type: 'link_css', label: 'Link CSS', icon: 'fa-solid fa-link', color: '#73daca',
            html: () => `<div class="block-content"><label><link rel="stylesheet" href="</label><input type="text" placeholder="style.css" data-token="href"><label>"></label></div>`,
            parser: b => {
                const input = b.querySelector('[data-token="href"]');
                return `<link rel="stylesheet" href="${input ? input.value : ''}">`;
            }
        },

        // =========================================================================
        // == HTML BODY CONTENT ==
        // =========================================================================
        {
            type: 'heading', label: 'Heading', icon: 'fa-solid fa-heading', color: '#c0caf5',
            html: () => `
        <div class="block-content">
            <label><</label>
            <select data-token="level">
                <option value="h1" selected>h1</option><option value="h2">h2</option><option value="h3">h3</option>
                <option value="h4">h4</option><option value="h5">h5</option><option value="h6">h6</option>
            </select>
            <label>></label>
            <input type="text" placeholder="Heading Text" data-token="text" style="width: 60%;">
            <label></...</label>
        </div>`,
            parser: b => {
                const levelInput = b.querySelector('[data-token="level"]');
                const textInput = b.querySelector('[data-token="text"]');
                const level = levelInput ? levelInput.value : 'h1';
                const text = textInput ? textInput.value : '';
                return `<${level}>${text || 'Heading'}</${level}>`;
            }
        },
        {
            type: 'paragraph', label: 'Paragraph', icon: 'fa-solid fa-paragraph', color: '#c0caf5',
            html: () => `<div class="block-content"><label><p></label><input type="text" placeholder="Paragraph text..." data-token="text"><label></p></label></div>`,
            parser: b => {
                const input = b.querySelector('[data-token="text"]');
                return `<p>${input ? input.value : ''}</p>`;
            }
        },
        {
            type: 'image', label: 'Image', icon: 'fa-solid fa-image', color: '#c0caf5',
            html: () => `<div class="block-content"><label><img src="</label><input type="text" placeholder="path/to/image.jpg" data-token="src"><label>" alt="</label><input type="text" placeholder="description" data-token="alt"><label>"></label></div>`,
            parser: b => {
                const srcInput = b.querySelector('[data-token="src"]');
                const altInput = b.querySelector('[data-token="alt"]');
                return `<img src="${srcInput ? srcInput.value : ''}" alt="${altInput ? altInput.value : ''}">`;
            }
        },
        {
            type: 'link', label: 'Link (Anchor)', icon: 'fa-solid fa-up-right-from-square', color: '#c0caf5',
            html: () => `<div class="block-content"><label><a href="</label><input type="text" placeholder="https://example.com" data-token="href"><label>"></label><input type="text" placeholder="Link Text" data-token="text"><label></a></label></div>`,
            parser: b => {
                const hrefInput = b.querySelector('[data-token="href"]');
                const textInput = b.querySelector('[data-token="text"]');
                return `<a href="${hrefInput ? hrefInput.value : '#'}">${textInput ? textInput.value : 'link'}</a>`;
            }
        },
        {
            type: 'button', label: 'Button', icon: 'fa-solid fa-computer-mouse', color: '#c0caf5',
            html: () => `<div class="block-content"><label><button id="</label><input type="text" placeholder="myButton" data-token="id"><label>"></label><input type="text" placeholder="Click Me" data-token="text"><label></button></label></div>`,
            parser: b => {
                const idInput = b.querySelector('[data-token="id"]');
                const textInput = b.querySelector('[data-token="text"]');
                return `<button id="${idInput ? idInput.value : ''}">${textInput ? textInput.value : 'Button'}</button>`;
            }
        },

        // =========================================================================
        // == SCRIPTING (THE BRIDGE BETWEEN HTML AND JS) ==
        // =========================================================================
        {
            type: 'script_src', label: 'Script (Source)', icon: 'fa-solid fa-file-import', color: '#9ece6a',
            html: () => `<div class="block-content"><label><script defer src="</label><input type="text" placeholder="app.js" data-token="src"><label>"></script></label></div>`,
            parser: b => {
                const input = b.querySelector('[data-token="src"]');
                return `<script defer src="${input ? input.value : ''}"></script>`;
            }
        },
        {
            type: 'script_inline', label: 'Inline Script', icon: 'fa-brands fa-js', color: '#9ece6a',
            html: () => `
                <div class="block-content"><label><script></label></div>
                <div class="nested-drop-zone" data-branch="body"><p class="placeholder-text">Drop JavaScript blocks here...</p></div>
                <div class="block-content" style="margin-top: 0.5rem;"><label></script></label></div>`,
            parser: (b, i) => `<script>\n${parseZone(b.querySelector('[data-branch="body"]'), i + '    ')}${i}</script>`
        },

        // =========================================================================
        // == JAVASCRIPT BLOCKS (for use inside an Inline Script block) ==
        // =========================================================================
        {
            type: 'variable', label: 'JS: Declare Variable', icon: 'fa-solid fa-code', color: '#bb9af7',
            html: () => `<div class="block-content"><label>const</label><input type="text" placeholder="variableName" data-token="name"><label>=</label><input type="text" placeholder='"value"' data-token="value"></div>`,
            parser: b => {
                const nameInput = b.querySelector('[data-token="name"]');
                const valueInput = b.querySelector('[data-token="value"]');
                return `const ${nameInput ? nameInput.value : 'myVar'} = ${valueInput ? valueInput.value : '""'};`;
            }
        },
        {
            type: 'log', label: 'JS: Console Log', icon: 'fa-solid fa-terminal', color: '#7dcfff',
            html: () => `<div class="block-content"><label>console.log(</label><input type="text" placeholder="message" data-token="value"><label>)</label></div>`,
            parser: b => {
                const input = b.querySelector('[data-token="value"]');
                return `console.log(${input ? input.value : "''"});`;
            }
        },
        {
            type: 'comment', label: 'JS: Comment', icon: 'fa-solid fa-comment-dots', color: '#565f89',
            html: () => `<div class="block-content"><label>//</label><input type="text" placeholder="Your comment" data-token="value" style="width: 80%;"></div>`,
            parser: b => {
                const input = b.querySelector('[data-token="value"]');
                return `// ${input ? input.value : ''}`;
            }
        },
        {
            type: 'javascript', label: 'JS: Raw Code', icon: 'fa-solid fa-file-code', color: '#c678dd',
            html: () => `<div class="block-content"><label>JavaScript Code:</label><textarea placeholder="Enter your code here..." data-token="code" class="themed-textarea"></textarea></div>`,
            parser: b => {
                const input = b.querySelector('[data-token="code"]');
                return input ? input.value : '';
            }
        },
        {
            type: 'if', label: 'JS: If/Else', icon: 'fa-solid fa-code-branch', color: '#e0af68',
            html: () => `<div class="block-content"><label>if (</label><input type="text" placeholder="condition" data-token="condition"><label>)</label></div><div class="nested-drop-zone" data-branch="then"><p class="placeholder-text">Then...</p></div><div class="block-content" style="margin-top: 0.5rem;"><label>else</label></div><div class="nested-drop-zone" data-branch="else"><p class="placeholder-text">Else...</p></div>`,
            parser: (b, i) => {
                const condInput = b.querySelector('[data-token="condition"]');
                return `if (${condInput ? condInput.value : 'true'}) {\n${parseZone(b.querySelector('[data-branch="then"]'), i + '    ')}${i}} else {\n${parseZone(b.querySelector('[data-branch="else"]'), i + '    ')}${i}}`;
            }
        },
        {
            type: 'for_loop', label: 'JS: For Loop', icon: 'fa-solid fa-repeat', color: '#9ece6a',
            html: () => `<div class="block-content"><label>for (</label><input type="text" placeholder="let i = 0" data-token="init" style="width: 80px;"><label>;</label><input type="text" placeholder="i < 10" data-token="condition" style="width: 60px;"><label>;</label><input type="text" placeholder="i++" data-token="increment" style="width: 40px;"><label>)</label></div><div class="nested-drop-zone" data-branch="body"><p class="placeholder-text">Loop body...</p></div>`,
            parser: (b, i) => {
                const initInput = b.querySelector('[data-token="init"]');
                const condInput = b.querySelector('[data-token="condition"]');
                const incInput = b.querySelector('[data-token="increment"]');
                return `for (${initInput ? initInput.value : 'let i=0'}; ${condInput ? condInput.value : 'i<10'}; ${incInput ? incInput.value : 'i++'}) {\n${parseZone(b.querySelector('[data-branch="body"]'), i + '    ')}${i}}`;
            }
        },
        {
            type: 'function', label: 'JS: Function', icon: 'fa-solid fa-rocket', color: '#73daca',
            html: () => `<div class="block-content"><label>function</label><input type="text" placeholder="myFunction" data-token="name"><label>(</label><input type="text" placeholder="p1, p2" data-token="params"><label>)</label></div><div class="nested-drop-zone" data-branch="body"><p class="placeholder-text">Function body...</p></div>`,
            parser: (b, i) => {
                const nameInput = b.querySelector('[data-token="name"]');
                const paramsInput = b.querySelector('[data-token="params"]');
                return `function ${nameInput ? nameInput.value : 'myFunc'}(${paramsInput ? paramsInput.value : ''}) {\n${parseZone(b.querySelector('[data-branch="body"]'), i + '    ')}${i}}`;
            }
        },
        {
            type: 'get_element', label: 'JS: Get Element By Id', icon: 'fa-solid fa-hand-pointer', color: '#c0caf5',
            html: () => `<div class="block-content"><label>const</label><input type="text" placeholder="element" data-token="varName"><label>= document.getElementById(</label><input type="text" placeholder="'id'" data-token="id"><label>)</label></div>`,
            parser: (b) => {
                const varInput = b.querySelector('[data-token="varName"]');
                const idInput = b.querySelector('[data-token="id"]');
                return `const ${varInput ? varInput.value : 'element'} = document.getElementById(${idInput ? idInput.value : "''"});`;
            }
        },
        {
            type: 'add_listener', label: 'JS: Add Event Listener', icon: 'fa-solid fa-ear-listen', color: '#c0caf5',
            html: () => `<div class="block-content"><input type="text" placeholder="element" data-token="element"><label>.addEventListener(</label><input type="text" placeholder="'click'" data-token="event"><label>, () => {</label></div><div class="nested-drop-zone" data-branch="body"><p class="placeholder-text">Callback function...</p></div><div class="block-content" style="margin-top: 0.5rem;"><label>})</label></div>`,
            parser: (b, i) => {
                const elInput = b.querySelector('[data-token="element"]');
                const eventInput = b.querySelector('[data-token="event"]');
                return `${elInput ? elInput.value : 'element'}.addEventListener(${eventInput ? eventInput.value : "'click'"}, () => {\n${parseZone(b.querySelector('[data-branch="body"]'), i + '    ')}${i}});`;
            }
        }
    ];

    // --- DOM Element References ---
    const toolboxContainer = document.getElementById('toolbox-items');
    const mainDropZone = document.getElementById('drop-zone');
    const generatedCodeElement = document.getElementById('generated-code');
    const themeSelect = document.getElementById('theme-select');
    const copyButton = document.getElementById('copy-button');
    const workspace = document.getElementById('workspace');

    // =========================================================================
    // == CORE LOGIC ==
    // =========================================================================

    const populateToolbox = () => {
        BLOCK_DEFINITIONS.forEach(def => {
            const item = document.createElement('div');
            item.className = 'tool-item';
            item.draggable = true;
            item.dataset.type = def.type;
            item.innerHTML = `
                <div class="drag-bar" style="background-color: ${def.color};"></div>
                <div class="drag-grip"><i class="fa-solid fa-grip-vertical"></i></div>
                <div class="tool-item-content">
                    <i class="${def.icon}" style="color: ${def.color};"></i> ${def.label}
                </div>`;
            item.addEventListener('dragstart', e => {
                e.dataTransfer.setData('application/x-script-block', def.type);
                item.classList.add('dragging');
                document.body.classList.add('no-select');
            });
            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                document.body.classList.remove('no-select');
            });
            toolboxContainer.appendChild(item);
        });
    };

    const addDragAndDropListeners = (element) => {
        element.addEventListener('dragover', e => {
            e.preventDefault(); e.stopPropagation();
            element.classList.add('drag-over');
            const afterElement = getDragAfterElement(element, e.clientY);
            if (afterElement == null) {
                element.appendChild(dropIndicator);
            } else {
                element.insertBefore(dropIndicator, afterElement);
            }
        });
        element.addEventListener('dragleave', e => {
            e.stopPropagation();
            element.classList.remove('drag-over');
            if (!element.contains(e.relatedTarget)) {
                dropIndicator.remove();
            }
        });
        element.addEventListener('drop', e => {
            e.preventDefault(); e.stopPropagation();
            element.classList.remove('drag-over');

            if (draggedElement) { // Moving an existing block
                const originalParent = draggedElement.parentElement;
                element.insertBefore(draggedElement, dropIndicator);
                updatePlaceholderVisibility(originalParent);
            } else { // Dropping a new block from the toolbox
                const blockType = e.dataTransfer.getData('application/x-script-block');
                const newBlock = createBlock(blockType);
                if (newBlock) {
                    element.insertBefore(newBlock, dropIndicator);
                }
            }

            updatePlaceholderVisibility(element);
            dropIndicator.remove();
            generateCode();
        });
    };

    const createBlock = (type) => {
        const definition = BLOCK_DEFINITIONS.find(d => d.type === type);
        if (!definition) return null;
        const block = document.createElement('div');
        block.className = 'script-block'; block.dataset.type = type; block.draggable = true;
        block.style.borderLeft = `4px solid ${definition.color}`;
        block.innerHTML = `<div class="block-header"><i class="${definition.icon}"></i><span>${definition.label}</span></div>${definition.html()}<button class="delete-block-btn" title="Delete Block"><i class="fa-solid fa-xmark"></i></button>`;

        block.querySelectorAll('.nested-drop-zone').forEach(addDragAndDropListeners);

        block.addEventListener('dragstart', e => {
            e.stopPropagation();
            draggedElement = block;
            e.dataTransfer.setData('application/x-script-block', type);
            setTimeout(() => block.classList.add('is-dragging'), 0);
            document.body.classList.add('no-select');
        });

        block.addEventListener('dragend', e => {
            e.stopPropagation();
            draggedElement?.classList.remove('is-dragging');
            draggedElement = null;
            dropIndicator.remove();
            document.body.classList.remove('no-select');
        });
        return block;
    };

    const getDragAfterElement = (container, y) => {
        const draggableElements = [...container.querySelectorAll(':scope > .script-block:not(.is-dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    };

    const updatePlaceholderVisibility = (zone) => {
        if (!zone || !zone.matches('.drop-zone, .nested-drop-zone')) return;
        const placeholder = zone.querySelector('.placeholder-text');
        if (placeholder) {
            const hasBlocks = zone.querySelector('.script-block');
            placeholder.style.display = hasBlocks ? 'none' : 'block';
        }
    };

    const parseZone = (zone, indent = '') => {
        let code = '';
        if (!zone) return code;
        const blocks = zone.querySelectorAll(':scope > .script-block');
        blocks.forEach(block => {
            const definition = BLOCK_DEFINITIONS.find(d => d.type === block.dataset.type);
            if (definition) code += indent + definition.parser(block, indent) + '\n';
        });
        return code;
    };

    const generateCode = () => {
        const generated = parseZone(mainDropZone);
        generatedCodeElement.textContent = generated.trim() === '' ? '// Your code will appear here...' : generated;
    };

    // --- EVENT LISTENERS INITIALIZATION ---
    populateToolbox();
    addDragAndDropListeners(mainDropZone);

    themeSelect.addEventListener('change', e => document.documentElement.setAttribute('data-theme', e.target.value));

    workspace.addEventListener('input', e => {
        if (e.target.matches('input[type="text"], textarea')) {
            generateCode();
        }
    });

    workspace.addEventListener('click', e => {
        const deleteBtn = e.target.closest('.delete-block-btn');
        if (deleteBtn) {
            const block = deleteBtn.closest('.script-block');
            const parentZone = block.parentElement;
            block.remove();
            updatePlaceholderVisibility(parentZone);
            generateCode();
        }
    });

    copyButton.addEventListener('click', () => {
        navigator.clipboard.writeText(generatedCodeElement.textContent).then(() => {
            const originalHTML = copyButton.innerHTML;
            copyButton.innerHTML = `<i class="fa-solid fa-check"></i> Copied!`;
            setTimeout(() => { copyButton.innerHTML = originalHTML; }, 1500);
        });
    });
});