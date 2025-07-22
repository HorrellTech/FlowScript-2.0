document.addEventListener('DOMContentLoaded', () => {

    let draggedElement = null;
    const dropIndicator = document.createElement('div');
    dropIndicator.className = 'drop-indicator';

    // CodeMirror instances tracking
    const codeMirrorInstances = new Map();

    // Mobile functionality state
    let isMobileMode = false;
    let isAutoMobile = false;


    // =========================================================================
    // == BLOCK DEFINITIONS: The heart of the modular system. ==
    // =========================================================================
    const BLOCK_DEFINITIONS = {
        // =========================================================================
        // == HTML GROUP ==
        // =========================================================================
        html: [
            {
                type: 'html_document', label: 'HTML Document', icon: 'fa-solid fa-file-code', color: '#f7768e',
                html: () => `
                    <div class="block-content"><label><!DOCTYPE html></label></div>
                    <div class="block-content"><label><html lang="</label><input type="text" placeholder="en" data-token="lang" style="width: 40px;" title="Set the language of the document (e.g., 'en', 'es')."><label>"></label></div>
                    <div class="nested-drop-zone" data-branch="head">
                        <div class="drop-zone-label">Head</div>
                        <p class="placeholder-text">Drop <head> elements here...</p>
                    </div>
                    <div class="nested-drop-zone" data-branch="body">
                        <div class="drop-zone-label">Body</div>
                        <p class="placeholder-text">Drop <body> elements here...</p>
                    </div>
                    <div class="block-content" style="margin-top: 0.5rem;"><label></html></label></div>
                `,
                parser: (b, i) => {
                    const langInput = b.querySelector('[data-token="lang"]');
                    const lang = langInput ? langInput.value : 'en';
                    return `<!DOCTYPE html>
<html lang="${lang}">
${i}<head>
${parseZone(b.querySelector('[data-branch="head"]'), i + '    ')}
${i}</head>
${i}<body>
${parseZone(b.querySelector('[data-branch="body"]'), i + '    ')}
${i}</body>
</html>`;
                },
                importer: (node) => {
                    if (node.nodeName.toLowerCase() !== 'html') return null;
                    return {
                        type: 'html_document',
                        tokens: { lang: node.getAttribute('lang') || 'en' },
                        branches: {
                            head: node.querySelector('head'),
                            body: node.querySelector('body')
                        }
                    };
                }
            },
            {
                type: 'div_container', label: 'Div Container', icon: 'fa-solid fa-square-full', color: '#e0af68',
                html: () => `
                    <div class="block-content">
                        <label><div</label>
                        <input type="text" placeholder="id" data-token="id" style="width: 80px;" title="The unique ID for this element.">
                        <input type="text" placeholder="class" data-token="class" style="width: 120px;" title="Space-separated list of CSS classes.">
                        <input type="text" placeholder="style" data-token="style" style="width: 140px;" title="Inline CSS (e.g. 'color: red;')">
                        <label>></label>
                    </div>
                    <div class="nested-drop-zone" data-branch="body">
                        <div class="drop-zone-label">Content</div>
                        <p class="placeholder-text">Content for div...</p>
                    </div>
                    <div class="block-content" style="margin-top: 0.5rem;"><label></div></label></div>
                `,
                parser: (b, i) => {
                    const idInput = b.querySelector('[data-token="id"]');
                    const classInput = b.querySelector('[data-token="class"]');
                    const styleInput = b.querySelector('[data-token="style"]');
                    const id = idInput ? idInput.value : '';
                    const cls = classInput ? classInput.value : '';
                    const style = styleInput ? styleInput.value : '';
                    let attrs = '';
                    if (id) attrs += ` id="${id}"`;
                    if (cls) attrs += ` class="${cls}"`;
                    if (style) attrs += ` style="${style}"`;
                    return `<div${attrs}>\n${parseZone(b.querySelector('[data-branch="body"]'), i + '    ')}${i}</div>`;
                },
                importer: (node) => {
                    if (node.nodeName.toLowerCase() !== 'div') return null;
                    return {
                        type: 'div_container',
                        tokens: { id: node.id, class: node.className, style: node.style.cssText },
                        branches: { body: node }
                    };
                }
            },
            {
                type: 'title', label: 'Page Title', icon: 'fa-solid fa-t', color: '#73daca',
                html: () => `<div class="block-content"><label>&lt;title&gt;</label><input type="text" placeholder="My Awesome Page" data-token="value" title="The text to display in the browser tab."><label>&lt;/title&gt;</label></div>`,
                parser: b => {
                    const input = b.querySelector('[data-token="value"]');
                    return `<title>${input ? input.value : 'Document'}</title>`;
                },
                importer: (node) => {
                    if (node.nodeName.toLowerCase() !== 'title') return null;
                    return { type: 'title', tokens: { value: node.textContent } };
                }
            },
            {
                type: 'meta_charset', label: 'Meta Charset', icon: 'fa-solid fa-globe', color: '#73daca',
                html: () => `<div class="block-content"><label>&lt;meta charset="UTF-8"&gt;</label></div>`,
                parser: () => `<meta charset="UTF-8">`,
                importer: (node) => (node.nodeName.toLowerCase() === 'meta' && node.getAttribute('charset')) ? { type: 'meta_charset', tokens: {} } : null
            },
            {
                type: 'meta_viewport', label: 'Meta Viewport', icon: 'fa-solid fa-mobile-screen', color: '#73daca',
                html: () => `<div class="block-content"><label>&lt;meta name="viewport" content="width=device-width, initial-scale=1.0"&gt;</label></div>`,
                parser: () => `<meta name="viewport" content="width=device-width, initial-scale=1.0">`,
                importer: (node) => (node.nodeName.toLowerCase() === 'meta' && node.getAttribute('name') === 'viewport') ? { type: 'meta_viewport', tokens: {} } : null
            },
            {
                type: 'heading', label: 'Heading', icon: 'fa-solid fa-heading', color: '#c0caf5',
                html: () => `
                    <div class="block-content">
                        <label><</label>
                        <select data-token="level" title="The heading level (h1 is most important).">
                            <option value="h1" selected>h1</option><option value="h2">h2</option><option value="h3">h3</option>
                            <option value="h4">h4</option><option value="h5">h5</option><option value="h6">h6</option>
                        </select>
                        <label>></label>
                        <input type="text" placeholder="Heading Text" data-token="text" style="flex-grow: 1;" title="The text content of the heading.">
                        <input type="text" placeholder="style" data-token="style" style="width: 120px;" title="Inline CSS">
                        <label></...</label>
                    </div>`,
                parser: b => {
                    const level = b.querySelector('[data-token="level"]').value;
                    const text = b.querySelector('[data-token="text"]').value;
                    const style = b.querySelector('[data-token="style"]').value;
                    const styleAttr = style ? ` style="${style}"` : '';
                    return `<${level}${styleAttr}>${text || 'Heading'}</${level}>`;
                },
                importer: (node) => {
                    const match = node.nodeName.match(/^H([1-6])$/i);
                    if (!match) return null;
                    return {
                        type: 'heading',
                        tokens: {
                            level: `h${match[1]}`,
                            text: node.textContent,
                            style: node.style.cssText
                        }
                    };
                }
            },
            {
                type: 'paragraph', label: 'Paragraph', icon: 'fa-solid fa-paragraph', color: '#c0caf5',
                html: () => `<div class="block-content"><label>&lt;p&gt;</label><input type="text" placeholder="Paragraph text..." data-token="text" title="The text content of the paragraph." style="flex-grow: 1;"><input type="text" placeholder="style" data-token="style" style="width: 120px;" title="Inline CSS"><label>&lt;/p&gt;</label></div>`,
                parser: b => {
                    const style = b.querySelector('[data-token="style"]').value;
                    const styleAttr = style ? ` style="${style}"` : '';
                    return `<p${styleAttr}>${b.querySelector('[data-token="text"]').value || ''}</p>`
                },
                importer: (node) => {
                    if (node.nodeName.toLowerCase() !== 'p') return null;
                    return { type: 'paragraph', tokens: { text: node.textContent, style: node.style.cssText } };
                }
            },
            {
                type: 'image', label: 'Image', icon: 'fa-solid fa-image', color: '#c0caf5',
                html: () => `<div class="block-content"><label>&lt;img src="</label><input type="text" placeholder="path/to/image.jpg" data-token="src" title="The path or URL to the image file."><label>" alt="</label><input type="text" placeholder="description" data-token="alt" title="Alternative text for screen readers and if the image fails to load."><input type="text" placeholder="style" data-token="style" style="width: 120px;" title="Inline CSS"><label>"&gt;</label></div>`,
                parser: b => {
                    const style = b.querySelector('[data-token="style"]').value;
                    const styleAttr = style ? ` style="${style}"` : '';
                    return `<img src="${b.querySelector('[data-token="src"]').value || ''}" alt="${b.querySelector('[data-token="alt"]').value || ''}"${styleAttr}>`
                },
                importer: (node) => {
                    if (node.nodeName.toLowerCase() !== 'img') return null;
                    return { type: 'image', tokens: { src: node.src, alt: node.alt, style: node.style.cssText } };
                }
            },
            {
                type: 'link', label: 'Link (Anchor)', icon: 'fa-solid fa-up-right-from-square', color: '#c0caf5',
                html: () => `<div class="block-content"><label>&lt;a href="</label><input type="text" placeholder="https://example.com" data-token="href" title="The URL the link points to."><label>"&gt;</label><input type="text" placeholder="Link Text" data-token="text" title="The visible text for the link;"><input type="text" placeholder="style" data-token="style" style="width: 120px;" title="Inline CSS"><label>&lt;/a&gt;</label></div>`,
                parser: b => {
                    const style = b.querySelector('[data-token="style"]').value;
                    const styleAttr = style ? ` style="${style}"` : '';
                    return `<a href="${b.querySelector('[data-token="href"]').value || '#'}"${styleAttr}>${b.querySelector('[data-token="text"]').value || 'link'}</a>`
                },
                importer: (node) => {
                    if (node.nodeName.toLowerCase() !== 'a') return null;
                    return { type: 'link', tokens: { href: node.href, text: node.textContent, style: node.style.cssText } };
                }
            },
            {
                type: 'button', label: 'Button', icon: 'fa-solid fa-computer-mouse', color: '#c0caf5',
                html: () => `<div class="block-content"><label>&lt;button id="</label><input type="text" placeholder="myButton" data-token="id" title="A unique ID for this button, useful for JavaScript."><label>"&gt;</label><input type="text" placeholder="Click Me" data-token="text" title="The text displayed on the button."><input type="text" placeholder="style" data-token="style" style="width: 120px;" title="Inline CSS"><label>&lt;/button&gt;</label></div>`,
                parser: b => {
                    const style = b.querySelector('[data-token="style"]').value;
                    const styleAttr = style ? ` style="${style}"` : '';
                    return `<button id="${b.querySelector('[data-token="id"]').value || ''}"${styleAttr}>${b.querySelector('[data-token="text"]').value || 'Button'}</button>`
                },
                importer: (node) => {
                    if (node.nodeName.toLowerCase() !== 'button') return null;
                    return { type: 'button', tokens: { id: node.id, text: node.textContent, style: node.style.cssText } };
                }
            },
            {
                type: 'link_css', label: 'Link External CSS', icon: 'fa-solid fa-link', color: '#73daca',
                html: () => `<div class="block-content"><label>&lt;link rel="stylesheet" href="</label><input type="text" placeholder="style.css" data-token="href" title="Path or URL to an external CSS stylesheet." style="min-width: 120px;"><label>"&gt;</label></div>`,
                parser: b => `<link rel="stylesheet" href="${b.querySelector('[data-token="href"]').value || ''}">`,
                importer: (node) => {
                    if (node.nodeName.toLowerCase() !== 'link' || node.getAttribute('rel') !== 'stylesheet') return null;
                    return { type: 'link_css', tokens: { href: node.getAttribute('href') } };
                }
            },
            {
                type: 'inline_style', label: 'Inline Style CSS', icon: 'fa-solid fa-palette', color: '#7aa2f7',
                html: () => `
                    <div class="block-content"><label>&lt;style&gt;</label></div>
                    <div class="nested-drop-zone" data-branch="body">
                        <div class="drop-zone-label">CSS Rules</div>
                        <p class="placeholder-text">Drop CSS Rule blocks here...</p>
                    </div>
                    <div class="block-content" style="margin-top: 0.5rem;"><label>&lt;/style&gt;</label></div>`,
                parser: (b, i) => `<style>\n${parseZone(b.querySelector('[data-branch="body"]'), i + '    ')}${i}</style>`,
                importer: (node) => {
                    if (node.nodeName.toLowerCase() !== 'style') return null;
                    return {
                        type: 'inline_style',
                        tokens: {},
                        branches: { body: node }
                    };
                }
            },
            {
                type: 'script_src', label: 'Script (Source)', icon: 'fa-solid fa-file-import', color: '#9ece6a',
                html: () => `<div class="block-content">
                <label>&lt;script defer src="</label>
                <input type="text" placeholder="app.js" data-token="src" title="Path or URL to an external JavaScript file." style="min-width: 120px;">
                <label>"&gt;&lt;/script&gt;</label></div>`,
                parser: b => `<script defer src="${b.querySelector('[data-token="src"]').value || ''}"></script>`,
                importer: (node) => {
                    if (node.nodeName.toLowerCase() !== 'script' || !node.hasAttribute('src')) return null;
                    return { type: 'script_src', tokens: { src: node.getAttribute('src') } };
                }
            },
            {
                type: 'script_inline', label: 'Inline Script', icon: 'fa-brands fa-js', color: '#9ece6a',
                html: () => `
                    <div class="block-content"><label>&lt;script&gt;</label></div>
                    <div class="nested-drop-zone" data-branch="body">
                        <div class="drop-zone-label">JavaScript</div>
                        <p class="placeholder-text">Drop JavaScript blocks here...</p>
                    </div>
                    <div class="block-content" style="margin-top: 0.5rem;"><label>&lt;/script&gt;</label></div>`,
                parser: (b, i) => `<script>\n${parseZone(b.querySelector('[data-branch="body"]'), i + '    ')}${i}</script>`,
                importer: (node) => {
                    if (node.nodeName.toLowerCase() !== 'script' || node.hasAttribute('src')) return null;
                    return {
                        type: 'script_inline',
                        tokens: {},
                        branches: { body: node }
                    };
                }
            },
        ],
        // CSS
        css: [
            {
                type: 'style_tag', label: 'Style Tag', icon: 'fa-solid fa-palette', color: '#7aa2f7',
                html: () => `
                    <div class="block-content"><label>&lt;style&gt;</label></div>
                    <div class="nested-drop-zone" data-branch="body">
                        <div class="drop-zone-label">CSS Rules</div>
                        <p class="placeholder-text">Drop CSS Rule blocks here...</p>
                    </div>
                    <div class="block-content" style="margin-top: 0.5rem;"><label>&lt;/style&gt;</label></div>`,
                parser: (b, i) => `<style>\n${parseZone(b.querySelector('[data-branch="body"]'), i + '    ')}${i}</style>`,
                importer: (node) => {
                    if (node.nodeName.toLowerCase() !== 'style') return null;
                    return {
                        type: 'style_tag',
                        tokens: {},
                        branches: { body: node }
                    };
                }
            },
            {
                type: 'css_rule', label: 'CSS Rule', icon: 'fa-solid fa-pen-ruler', color: '#7dcfff',
                html: () => `
                    <div class="block-content"><input type="text" placeholder=".my-class" data-token="selector" title="CSS selector (e.g., '.container', '#header', 'p')." style="min-width: 120px;"><label> {</label></div>
                    <div class="nested-drop-zone" data-branch="body">
                        <div class="drop-zone-label">Properties</div>
                        <p class="placeholder-text">Drop CSS properties here...</p>
                    </div>
                    <div class="block-content" style="margin-top: 0.5rem;"><label>}</label></div>`,
                parser: (b, i) => {
                    const selector = b.querySelector('[data-token="selector"]').value || 'selector';
                    return `${selector} {\n${parseZone(b.querySelector('[data-branch="body"]'), i + '    ')}${i}}`;
                }
            },
            {
                type: 'css_property', label: 'CSS Property', icon: 'fa-solid fa-paint-roller', color: '#c0caf5',
                html: () => `<div class="block-content"><input type="text" placeholder="property" data-token="property" style="min-width: 100px;" title="CSS property name (e.g., 'font-weight')."><label>:</label><input type="text" placeholder="value" data-token="value" style="min-width: 120px;" title="CSS property value (e.g., 'bold', '10px')."><label>;</label></div>`,
                parser: b => {
                    const prop = b.querySelector('[data-token="property"]').value || 'property';
                    const val = b.querySelector('[data-token="value"]').value || 'value';
                    return `${prop}: ${val};`;
                }
            },
            {
                type: 'css_raw', label: 'Raw CSS', icon: 'fa-solid fa-file-code', color: '#7aa2f7',
                html: () => `<div class="block-content"><label>CSS Code:</label><br><textarea placeholder="Enter your raw CSS here..." data-token="code" class="themed-textarea" title="For any custom CSS not covered by other blocks."></textarea></div>`,
                parser: b => getTextareaValue(b.querySelector('[data-token="code"]')) || '',
                importer: (node) => {
                    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() && node.parentNode.nodeName.toLowerCase() === 'style') {
                        return {
                            type: 'css_raw',
                            tokens: { code: node.textContent.trim() }
                        };
                    }
                    return null;
                }
            },
        ],
        // JAVASCRIPT
        javascript: [
            {
                type: 'javascript', label: 'Raw Code', icon: 'fa-solid fa-file-code', color: '#bb9af7',
                html: () => `<div class="block-content"><label>JavaScript Code:</label><br><textarea placeholder="Enter your code here..." data-token="code" class="themed-textarea" title="For any custom code not covered by other blocks."></textarea></div>`,
                parser: b => getTextareaValue(b.querySelector('[data-token="code"]')) || '',
                // ADDED: Importer to handle raw text content inside a <script> tag.
                importer: (node) => {
                    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() && node.parentNode.nodeName.toLowerCase() === 'script' && !node.parentNode.hasAttribute('src')) {
                        return {
                            type: 'javascript',
                            tokens: { code: node.textContent.trim() }
                        };
                    }
                    return null;
                }
            },
            {
                type: 'variable', label: 'Declare Variable', icon: 'fa-solid fa-code', color: '#bb9af7',
                html: () => `<div class="block-content"><label>const</label><input type="text" placeholder="variableName" data-token="name" title="The name of the variable."><label>=</label><input type="text" placeholder='"value"' data-token="value" title="The value to assign (strings must be in quotes)."></div>`,
                parser: b => `const ${b.querySelector('[data-token="name"]').value || 'myVar'} = ${b.querySelector('[data-token="value"]').value || '""'};`
            },
            {
                type: 'get_element', label: 'Get Element By Id', icon: 'fa-solid fa-hand-pointer', color: '#c0caf5',
                html: () => `<div class="block-content"><label>const</label><input type="text" placeholder="element" data-token="varName" title="The variable name to store the element in."><label>= document.getElementById(</label><input type="text" placeholder="'id'" data-token="id" title="The ID of the element to find (must be in quotes)."><label>)</label></div>`,
                parser: (b) => `const ${b.querySelector('[data-token="varName"]').value || 'element'} = document.getElementById(${b.querySelector('[data-token="id"]').value || "''"});`
            },
            {
                type: 'add_listener', label: 'Add Event Listener', icon: 'fa-solid fa-ear-listen', color: '#e0af68',
                html: () => `<div class="block-content"><input type="text" placeholder="element" data-token="element" title="The element variable to attach the listener to." style="min-width: 80px;"><label>.addEventListener(</label><input type="text" placeholder="'click'" data-token="event" title="The event to listen for (e.g., 'click', 'mouseover'). Must be in quotes." style="min-width: 80px;"><label>, () => {</label></div><div class="nested-drop-zone" data-branch="body"><div class="drop-zone-label">Callback Function</div><p class="placeholder-text">Drop JavaScript blocks here...</p></div><div class="block-content" style="margin-top: 0.5rem;"><label>});</label></div>`,
                parser: (b, i) => {
                    const el = b.querySelector('[data-token="element"]').value || 'element';
                    const event = b.querySelector('[data-token="event"]').value || "'click'";
                    return `${el}.addEventListener(${event}, () => {\n${parseZone(b.querySelector('[data-branch="body"]'), i + '    ')}${i}});`;
                }
            },
            {
                type: 'log', label: 'Console Log', icon: 'fa-solid fa-terminal', color: '#7dcfff',
                html: () => `<div class="block-content"><label>console.log(</label><input type="text" placeholder="message" data-token="value" title="The variable or string to print to the console."><label>)</label></div>`,
                parser: b => `console.log(${b.querySelector('[data-token="value"]').value || "''"});`
            },
            {
                type: 'if', label: 'If/Else', icon: 'fa-solid fa-code-branch', color: '#e0af68',
                html: () => `<div class="block-content"><label>if (</label><input type="text" placeholder="condition" data-token="condition" title="The condition to check (e.g., 'x > 5')." style="min-width: 120px;"><label>) {</label></div><div class="nested-drop-zone" data-branch="then"><div class="drop-zone-label">Then</div><p class="placeholder-text">Drop blocks here...</p></div><div class="block-content" style="margin-top: 0.5rem;"><label>} else {</label></div><div class="nested-drop-zone" data-branch="else"><div class="drop-zone-label">Else</div><p class="placeholder-text">Drop blocks here...</p></div><div class="block-content" style="margin-top: 0.5rem;"><label>}</label></div>`,
                parser: (b, i) => {
                    const cond = b.querySelector('[data-token="condition"]').value || 'true';
                    return `if (${cond}) {\n${parseZone(b.querySelector('[data-branch="then"]'), i + '    ')}${i}} else {\n${parseZone(b.querySelector('[data-branch="else"]'), i + '    ')}${i}}`;
                }
            },
            {
                type: 'for_loop', label: 'For Loop', icon: 'fa-solid fa-repeat', color: '#9ece6a',
                html: () => `<div class="block-content"><label>for (</label><input type="text" placeholder="let i = 0" data-token="init" style="min-width: 80px;" title="Initialization statement (e.g., 'let i = 0')"><label>;</label><input type="text" placeholder="i < 10" data-token="condition" style="min-width: 60px;" title="Condition to continue loop (e.g., 'i < 10')"><label>;</label><input type="text" placeholder="i++" data-token="increment" style="min-width: 40px;" title="Increment statement (e.g., 'i++')"><label>) {</label></div><div class="nested-drop-zone" data-branch="body"><div class="drop-zone-label">Loop Body</div><p class="placeholder-text">Drop blocks here...</p></div><div class="block-content" style="margin-top: 0.5rem;"><label>}</label></div>`,
                parser: (b, i) => {
                    const init = b.querySelector('[data-token="init"]').value || 'let i=0';
                    const cond = b.querySelector('[data-token="condition"]').value || 'i<10';
                    const inc = b.querySelector('[data-token="increment"]').value || 'i++';
                    return `for (${init}; ${cond}; ${inc}) {\n${parseZone(b.querySelector('[data-branch="body"]'), i + '    ')}${i}}`;
                }
            },
            {
                type: 'function', label: 'Function', icon: 'fa-solid fa-rocket', color: '#73daca',
                html: () => `<div class="block-content"><label>function </label><input type="text" placeholder="myFunction" data-token="name" title="The name of the function." style="min-width: 100px;"><label>(</label><input type="text" placeholder="p1, p2" data-token="params" title="Comma-separated list of parameters." style="min-width: 80px;"><label>) {</label></div><div class="nested-drop-zone" data-branch="body"><div class="drop-zone-label">Function Body</div><p class="placeholder-text">Drop blocks here...</p></div><div class="block-content" style="margin-top: 0.5rem;"><label>}</label></div>`,
                parser: (b, i) => {
                    const name = b.querySelector('[data-token="name"]').value || 'myFunc';
                    const params = b.querySelector('[data-token="params"]').value || '';
                    return `function ${name}(${params}) {\n${parseZone(b.querySelector('[data-branch="body"]'), i + '    ')}${i}}`;
                }
            },
            {
                type: 'function_call', label: 'Call Function', icon: 'fa-solid fa-play', color: '#73daca',
                html: () => `<div class="block-content"><input type="text" placeholder="myFunction" data-token="name" title="The name of the function to call."><label>(</label><input type="text" placeholder="arg1, 'arg2'" data-token="args" title="Comma-separated list of arguments."><label>);</label></div>`,
                parser: (b) => `${b.querySelector('[data-token="name"]').value || 'myFunction'}(${b.querySelector('[data-token="args"]').value || ''});`
            },
            {
                type: 'set_innerHTML', label: 'Set innerHTML', icon: 'fa-solid fa-marker', color: '#c0caf5',
                html: () => `<div class="block-content"><input type="text" placeholder="element" data-token="element" title="The element variable."><label>.innerHTML =</label><input type="text" placeholder="'<p>New content</p>'" data-token="value" title="The HTML string to set."></div>`,
                parser: (b) => `${b.querySelector('[data-token="element"]').value || 'element'}.innerHTML = ${b.querySelector('[data-token="value"]').value || "''"};`
            },
            {
                type: 'return_statement', label: 'Return', icon: 'fa-solid fa-arrow-left', color: '#bb9af7',
                html: () => `<div class="block-content"><label>return</label><input type="text" placeholder="value" data-token="value" title="The value to return from the function."></div>`,
                parser: (b) => `return ${b.querySelector('[data-token="value"]').value || ''};`
            },
            {
                type: 'comment', label: 'Comment', icon: 'fa-solid fa-comment-dots', color: '#565f89',
                html: () => `<div class="block-content"><label>//</label><input type="text" placeholder="Your comment" data-token="value" style="width: 80%;" title="A descriptive comment (does not affect code)."></div>`,
                parser: b => `// ${b.querySelector('[data-token="value"]').value || ''}`
            },
        ],
        // CUSTOM BLOCKS - for unrecognized HTML/CSS/JS elements
        custom: [
            {
                type: 'custom_html', label: 'Custom HTML Element', icon: 'fa-solid fa-code', color: '#ff9500',
                html: () => `
                    <div class="block-content">
                        <label>&lt;</label>
                        <input type="text" placeholder="tagname" data-token="tagname" style="width: 100px;" title="HTML tag name (e.g., 'section', 'article')">
                        <input type="text" placeholder="attributes" data-token="attributes" style="width: 200px;" title="HTML attributes (e.g., 'id=&quot;main&quot; class=&quot;container&quot;')">
                        <label>&gt;</label>
                    </div>
                    <div class="nested-drop-zone" data-branch="content">
                        <div class="drop-zone-label">Content</div>
                        <p class="placeholder-text">Drop content blocks here...</p>
                    </div>
                    <div class="block-content" style="margin-top: 0.5rem;">
                        <label>&lt;/</label>
                        <span class="closing-tag-name">tagname</span>
                        <label>&gt;</label>
                    </div>
                `,
                parser: (b, i) => {
                    const tagname = b.querySelector('[data-token="tagname"]').value || 'div';
                    const attributes = b.querySelector('[data-token="attributes"]').value || '';
                    const attrs = attributes ? ` ${attributes}` : '';
                    return `<${tagname}${attrs}>\n${parseZone(b.querySelector('[data-branch="content"]'), i + '    ')}${i}</${tagname}>`;
                },
                importer: (node) => {
                    // This will be used as a fallback for unrecognized HTML elements
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const tagName = node.nodeName.toLowerCase();
                        // Get all attributes as a string
                        let attributesStr = '';
                        if (node.attributes && node.attributes.length > 0) {
                            const attrs = [];
                            for (let i = 0; i < node.attributes.length; i++) {
                                const attr = node.attributes[i];
                                attrs.push(`${attr.name}="${attr.value}"`);
                            }
                            attributesStr = attrs.join(' ');
                        }
                        return {
                            type: 'custom_html',
                            tokens: {
                                tagname: tagName,
                                attributes: attributesStr
                            },
                            branches: { content: node }
                        };
                    }
                    return null;
                }
            },
            {
                type: 'custom_css', label: 'Custom CSS Code', icon: 'fa-solid fa-palette', color: '#7aa2f7',
                html: () => `
                    <div class="block-content">
                        <label>Custom CSS:</label>
                        <br>
                        <textarea placeholder="Enter your custom CSS here..." data-token="css" class="themed-textarea" title="Any CSS code that doesn't have a specific block." style="width: 100%; min-height: 100px;"></textarea>
                    </div>
                `,
                parser: b => getTextareaValue(b.querySelector('[data-token="css"]')) || '',
                importer: (node) => {
                    // Handle unrecognized CSS content
                    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() &&
                        node.parentNode && node.parentNode.nodeName.toLowerCase() === 'style') {
                        const cssText = node.textContent.trim();
                        // Check if it's not already handled by other CSS blocks
                        if (!cssText.match(/^\s*[.#\w\s,>+~\[\]:()-]+\s*\{/) && cssText.length > 0) {
                            return {
                                type: 'custom_css',
                                tokens: { css: cssText }
                            };
                        }
                    }
                    return null;
                }
            },
            {
                type: 'custom_javascript', label: 'Custom JavaScript Code', icon: 'fa-brands fa-js', color: '#f7df1e',
                html: () => `
                    <div class="block-content">
                        <label>Custom JavaScript:</label>
                        <br>
                        <textarea placeholder="Enter your custom JavaScript here..." data-token="js" class="themed-textarea" title="Any JavaScript code that doesn't have a specific block." style="width: 100%; min-height: 100px;"></textarea>
                    </div>
                `,
                parser: b => getTextareaValue(b.querySelector('[data-token="js"]')) || '',
                importer: (node) => {
                    // Handle unrecognized JavaScript content
                    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() &&
                        node.parentNode && node.parentNode.nodeName.toLowerCase() === 'script' &&
                        !node.parentNode.hasAttribute('src')) {
                        const jsText = node.textContent.trim();
                        // Check if it's not already handled by other JS blocks
                        if (jsText.length > 0) {
                            return {
                                type: 'custom_javascript',
                                tokens: { js: jsText }
                            };
                        }
                    }
                    return null;
                }
            },
            {
                type: 'raw_text', label: 'Raw Text Content', icon: 'fa-solid fa-font', color: '#c0caf5',
                html: () => `
                    <div class="block-content">
                        <label>Text Content:</label>
                        <br>
                        <textarea placeholder="Enter raw text content..." data-token="text" class="themed-textarea" title="Plain text content." style="width: 100%; min-height: 60px;"></textarea>
                    </div>
                `,
                parser: b => getTextareaValue(b.querySelector('[data-token="text"]')) || '',
                importer: (node) => {
                    // Handle text nodes that aren't empty
                    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                        // Only import if it's not inside a script or style tag (those are handled separately)
                        const parentTag = node.parentNode ? node.parentNode.nodeName.toLowerCase() : '';
                        if (parentTag !== 'script' && parentTag !== 'style') {
                            return {
                                type: 'raw_text',
                                tokens: { text: node.textContent }
                            };
                        }
                    }
                    return null;
                }
            }
        ]
    };

    // =========================================================================
    // == TEMPLATE DEFINITIONS ==
    // =========================================================================
    const TEMPLATE_DEFINITIONS = {
        blank: {
            name: 'Blank Page',
            description: 'A minimal HTML document with basic structure',
            html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Blank Page</title>
</head>
<body>
    
</body>
</html>`
        },
        landing: {
            name: 'Landing Page',
            description: 'A modern landing page template',
            html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Our Service</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
        .hero { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 4rem 2rem; text-align: center; }
        .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
        .cta-button { background: #ff6b6b; color: white; padding: 1rem 2rem; border: none; border-radius: 5px; font-size: 1.1rem; cursor: pointer; }
    </style>
</head>
<body>
    <div class="hero">
        <h1>Welcome to Our Amazing Service</h1>
        <p>Transform your business with our innovative solutions</p>
        <button class="cta-button">Get Started Today</button>
    </div>
    <div class="container">
        <h2>Why Choose Us?</h2>
        <p>We provide exceptional service with cutting-edge technology and dedicated support.</p>
    </div>
</body>
</html>`
        },
        portfolio: {
            name: 'Portfolio',
            description: 'A personal portfolio template',
            html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>John Doe - Portfolio</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; line-height: 1.6; }
        .header { background: #2c3e50; color: white; padding: 2rem; text-align: center; }
        .container { max-width: 1000px; margin: 0 auto; padding: 2rem; }
        .project { background: #f8f9fa; padding: 1.5rem; margin: 1rem 0; border-radius: 8px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>John Doe</h1>
        <p>Full Stack Developer & Designer</p>
    </div>
    <div class="container">
        <h2>About Me</h2>
        <p>I'm a passionate developer with 5+ years of experience creating web applications and digital experiences.</p>
        
        <h2>Projects</h2>
        <div class="project">
            <h3>E-commerce Platform</h3>
            <p>A modern e-commerce solution built with React and Node.js</p>
        </div>
        <div class="project">
            <h3>Task Management App</h3>
            <p>A collaborative task management tool with real-time updates</p>
        </div>
    </div>
</body>
</html>`
        },
        blog: {
            name: 'Blog Post',
            description: 'A clean blog post template',
            html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Blog Post</title>
    <style>
        body { font-family: Georgia, serif; margin: 0; padding: 0; background: #fafafa; }
        .article { max-width: 800px; margin: 2rem auto; background: white; padding: 3rem; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .meta { color: #666; font-size: 0.9rem; margin-bottom: 2rem; }
        h1 { color: #333; border-bottom: 3px solid #3498db; padding-bottom: 0.5rem; }
        p { margin-bottom: 1.5rem; }
    </style>
</head>
<body>
    <article class="article">
        <h1>The Future of Web Development</h1>
        <div class="meta">Published on March 15, 2024 by Jane Smith</div>
        <p>Web development continues to evolve at a rapid pace. In this post, we'll explore the latest trends and technologies shaping the future of web development.</p>
        <p>From progressive web apps to serverless architecture, developers have more tools than ever to create amazing user experiences.</p>
        <h2>Key Trends to Watch</h2>
        <p>Here are some of the most important trends every web developer should be aware of...</p>
    </article>
</body>
</html>`
        },
        contact: {
            name: 'Contact Form',
            description: 'A contact page with form',
            html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contact Us</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 2rem; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 2rem; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .form-group { margin-bottom: 1.5rem; }
        label { display: block; margin-bottom: 0.5rem; font-weight: bold; }
        input, textarea { width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 5px; font-size: 1rem; }
        button { background: #27ae60; color: white; padding: 1rem 2rem; border: none; border-radius: 5px; cursor: pointer; font-size: 1rem; }
        button:hover { background: #219a52; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Contact Us</h1>
        <p>We'd love to hear from you. Send us a message and we'll respond as soon as possible.</p>
        
        <form>
            <div class="form-group">
                <label for="name">Name</label>
                <input type="text" id="name" name="name" required>
            </div>
            <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" name="email" required>
            </div>
            <div class="form-group">
                <label for="message">Message</label>
                <textarea id="message" name="message" rows="5" required></textarea>
            </div>
            <button type="submit">Send Message</button>
        </form>
    </div>
</body>
</html>`
        },
        dashboard: {
            name: 'Dashboard',
            description: 'A simple dashboard layout',
            html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f8f9fa; }
        .header { background: #343a40; color: white; padding: 1rem 2rem; }
        .main { display: grid; grid-template-columns: 250px 1fr; min-height: calc(100vh - 60px); }
        .sidebar { background: white; padding: 1rem; border-right: 1px solid #dee2e6; }
        .content { padding: 2rem; }
        .card { background: white; padding: 1.5rem; margin-bottom: 1rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
        .stat-card { background: #007bff; color: white; padding: 1.5rem; border-radius: 8px; text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Dashboard</h1>
    </div>
    <div class="main">
        <div class="sidebar">
            <h3>Navigation</h3>
            <p>• Overview</p>
            <p>• Analytics</p>
            <p>• Reports</p>
            <p>• Settings</p>
        </div>
        <div class="content">
            <div class="stats">
                <div class="stat-card">
                    <h3>1,234</h3>
                    <p>Total Users</p>
                </div>
                <div class="stat-card">
                    <h3>567</h3>
                    <p>Active Sessions</p>
                </div>
                <div class="stat-card">
                    <h3>89%</h3>
                    <p>Uptime</p>
                </div>
            </div>
            <div class="card">
                <h2>Recent Activity</h2>
                <p>Here you can see the latest activity and updates from your application.</p>
            </div>
        </div>
    </div>
</body>
</html>`
        }
    };


    // --- DOM Element References ---
    const toolboxContainer = document.getElementById('toolbox-items');
    const mainDropZone = document.getElementById('drop-zone');
    const generatedCodeElement = document.getElementById('generated-code');
    const themeSelect = document.getElementById('theme-select');
    const templateSelect = document.getElementById('template-select');
    const copyButton = document.getElementById('copy-button');
    const previewButton = document.getElementById('preview-button');
    const workspace = document.getElementById('workspace');

    // NEW: Toolbar and file input references
    const newButton = document.getElementById('new-button');
    const openButton = document.getElementById('open-button');
    const saveButton = document.getElementById('save-button');
    const exportButton = document.getElementById('export-button');
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json, .html, .htm';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    // Mobile functionality references
    const mobileToggleBtn = document.getElementById('mobile-toggle');
    const appContainer = document.querySelector('.app-container');
    const toolbox = document.getElementById('toolbox');
    const outputPanel = document.getElementById('output-panel');
    
    // Mobile dropdown references
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileDropdown = document.getElementById('mobile-dropdown');
    const mobileDropdownContainer = document.querySelector('.mobile-dropdown-container');
    
    // Mobile dropdown item references
    const mobileNewBtn = document.getElementById('mobile-new-btn');
    const mobileOpenBtn = document.getElementById('mobile-open-btn');
    const mobileSaveBtn = document.getElementById('mobile-save-btn');
    const mobileExportBtn = document.getElementById('mobile-export-btn');
    const mobileThemeSelect = document.getElementById('mobile-theme-select');
    const mobileTemplateSelect = document.getElementById('mobile-template-select');

    // Documentation modal references
    const helpButton = document.getElementById('help-button');
    const mobileHelpButton = document.getElementById('mobile-help-button');
    const documentationModal = document.getElementById('documentation-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const docNavLinks = document.querySelectorAll('.doc-nav-link');
    const docSections = document.querySelectorAll('.doc-section');

    // =========================================================================
    // == MOBILE FUNCTIONALITY ==
    // =========================================================================

    /**
     * Detect if device is mobile based on screen size and user agent
     */
    const detectMobile = () => {
        const isMobileScreen = window.innerWidth <= 768;
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        return isMobileScreen || (isTouchDevice && isMobileUserAgent);
    };

    /**
     * Create mobile panel toggle buttons
     */
    const createMobilePanelToggles = () => {
        // Remove existing toggles
        document.querySelectorAll('.mobile-panel-toggle').forEach(toggle => toggle.remove());
        
        // Create left toggle for toolbox
        const leftToggle = document.createElement('button');
        leftToggle.className = 'mobile-panel-toggle left';
        leftToggle.innerHTML = '<i class="fa-solid fa-toolbox"></i>';
        leftToggle.title = 'Toggle Toolbox';
        leftToggle.addEventListener('click', () => toggleMobilePanel('left'));
        
        // Create right toggle for output panel
        const rightToggle = document.createElement('button');
        rightToggle.className = 'mobile-panel-toggle right';
        rightToggle.innerHTML = '<i class="fa-solid fa-code"></i>';
        rightToggle.title = 'Toggle Code Output';
        rightToggle.addEventListener('click', () => toggleMobilePanel('right'));
        
        document.body.appendChild(leftToggle);
        document.body.appendChild(rightToggle);
    };

    /**
     * Create mobile overlay
     */
    const createMobileOverlay = () => {
        let overlay = document.querySelector('.mobile-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'mobile-overlay';
            overlay.addEventListener('click', closeMobilePanels);
            document.body.appendChild(overlay);
        }
        return overlay;
    };

    /**
     * Toggle mobile panel
     */
    const toggleMobilePanel = (side) => {
        const panel = side === 'left' ? toolbox : outputPanel;
        const overlay = createMobileOverlay();
        
        // Close other panel first
        const otherPanel = side === 'left' ? outputPanel : toolbox;
        otherPanel.classList.remove('open');
        
        // Toggle current panel
        const isOpen = panel.classList.contains('open');
        
        if (isOpen) {
            panel.classList.remove('open');
            overlay.classList.remove('active');
        } else {
            panel.classList.add('open');
            overlay.classList.add('active');
        }
    };

    /**
     * Close all mobile panels
     */
    const closeMobilePanels = () => {
        toolbox.classList.remove('open');
        outputPanel.classList.remove('open');
        const overlay = document.querySelector('.mobile-overlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    };

    /**
     * Toggle mobile dropdown menu
     */
    const toggleMobileDropdown = () => {
        const isOpen = mobileDropdown.classList.contains('open');
        
        if (isOpen) {
            closeMobileDropdown();
        } else {
            openMobileDropdown();
        }
    };

    /**
     * Open mobile dropdown menu
     */
    const openMobileDropdown = () => {
        // Close mobile panels first
        closeMobilePanels();
        
        // Open dropdown
        mobileDropdown.classList.add('open');
        mobileMenuBtn.classList.add('active');
        
        // Sync theme and template selectors with main ones
        syncMobileSelectors();
    };

    /**
     * Close mobile dropdown menu
     */
    const closeMobileDropdown = () => {
        mobileDropdown.classList.remove('open');
        mobileMenuBtn.classList.remove('active');
    };

    /**
     * Sync mobile selectors with main selectors
     */
    const syncMobileSelectors = () => {
        if (mobileThemeSelect && themeSelect) {
            mobileThemeSelect.value = themeSelect.value;
        }
        if (mobileTemplateSelect && templateSelect) {
            mobileTemplateSelect.value = templateSelect.value;
        }
    };

    /**
     * Handle clicks outside mobile dropdown to close it
     */
    const handleMobileDropdownOutsideClick = (event) => {
        if (!mobileDropdownContainer.contains(event.target)) {
            closeMobileDropdown();
        }
    };

    /**
     * Enable mobile mode
     */
    const enableMobileMode = () => {
        isMobileMode = true;
        appContainer.classList.add('mobile-mode');
        mobileToggleBtn.classList.add('active');
        
        // Convert panels to mobile panels
        toolbox.classList.add('mobile-panel');
        outputPanel.classList.add('mobile-panel', 'right');
        
        // Ensure panels are visible (remove any display: none)
        toolbox.style.display = '';
        outputPanel.style.display = '';
        
        // Create toggle buttons
        createMobilePanelToggles();
        
        // Create overlay
        createMobileOverlay();
        
        // Close panels initially
        closeMobilePanels();
        
        // Sync mobile dropdown selectors
        syncMobileSelectors();
        
        // Show mobile dropdown container
        if (mobileDropdownContainer) {
            mobileDropdownContainer.style.display = 'block';
        }
    };

    /**
     * Disable mobile mode
     */
    const disableMobileMode = () => {
        isMobileMode = false;
        appContainer.classList.remove('mobile-mode');
        mobileToggleBtn.classList.remove('active');
        
        // Close mobile dropdown
        closeMobileDropdown();
        
        // Remove mobile panel classes
        toolbox.classList.remove('mobile-panel', 'open');
        outputPanel.classList.remove('mobile-panel', 'right', 'open');
        
        // Reset panel styles for desktop mode
        toolbox.style.display = '';
        outputPanel.style.display = '';
        
        // Remove toggle buttons
        document.querySelectorAll('.mobile-panel-toggle').forEach(toggle => toggle.remove());
        
        // Remove overlay
        const overlay = document.querySelector('.mobile-overlay');
        if (overlay) {
            overlay.remove();
        }
        
        // Hide mobile dropdown container in desktop mode
        if (mobileDropdownContainer) {
            mobileDropdownContainer.style.display = 'none';
        }
    };

    /**
     * Check and update mobile mode based on screen size
     */
    const checkMobileMode = () => {
        const shouldBeAutoMobile = detectMobile();
        
        if (shouldBeAutoMobile && !isAutoMobile && !isMobileMode) {
            // Auto-enable mobile mode
            isAutoMobile = true;
            enableMobileMode();
        } else if (!shouldBeAutoMobile && isAutoMobile && isMobileMode) {
            // Auto-disable mobile mode
            isAutoMobile = false;
            disableMobileMode();
        }
        
        // Ensure mobile dropdown is visible on small screens
        if (shouldBeAutoMobile) {
            mobileDropdownContainer.style.display = 'block';
        } else if (!isMobileMode) {
            mobileDropdownContainer.style.display = 'none';
        }
    };

    // =========================================================================
    // == CODEMIRROR HELPER FUNCTIONS ==
    // =========================================================================

    /**
     * Initialize CodeMirror for a textarea based on the block type
     */
    const initializeCodeMirror = (textarea, blockType) => {
        if (!window.CodeMirror) {
            console.warn('CodeMirror not loaded, falling back to regular textarea');
            return null;
        }

        // Check if CodeMirror is already initialized for this textarea
        const blockElement = textarea.closest('.script-block');
        if (blockElement) {
            const blockId = blockElement.dataset.blockId;
            if (blockId && codeMirrorInstances.has(blockId)) {
                // CodeMirror already exists for this block, return existing instance
                return codeMirrorInstances.get(blockId);
            }
        }

        let mode = 'text/plain';
        let theme = getCodeMirrorTheme();

        // Determine mode based on block type - Fixed mode detection
        switch (blockType) {
            case 'javascript':
            case 'custom_javascript':
                mode = 'javascript';
                break;
            case 'css_raw':
            case 'custom_css':
                mode = 'css';
                break;
            case 'custom_html':
                mode = 'htmlmixed';
                break;
            case 'raw_text':
                // Keep as regular textarea for raw text
                return null;
            default:
                // For other block types, check if they should have syntax highlighting
                if (textarea.classList.contains('themed-textarea')) {
                    // Try to detect from content or context
                    const content = textarea.value.toLowerCase();
                    if (content.includes('function') || content.includes('const') || content.includes('let')) {
                        mode = 'javascript';
                    } else if (content.includes('{') && (content.includes(':') || content.includes('color'))) {
                        mode = 'css';
                    } else if (content.includes('<') && content.includes('>')) {
                        mode = 'htmlmixed';
                    }
                } else {
                    return null;
                }
        }

        const editor = CodeMirror.fromTextArea(textarea, {
            mode: mode,
            theme: theme,
            lineNumbers: true,
            lineWrapping: true,
            indentUnit: 2,
            tabSize: 2,
            indentWithTabs: false,
            matchBrackets: true,
            autoCloseBrackets: true,
            styleActiveLine: true,
            viewportMargin: Infinity,
            foldGutter: true,
            gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
            highlightSelectionMatches: {showToken: /\w/, annotateScrollbar: true},
            extraKeys: {
                "Ctrl-Space": "autocomplete",
                "F11": function(cm) {
                    cm.setOption("fullScreen", !cm.getOption("fullScreen"));
                },
                "Esc": function(cm) {
                    if (cm.getOption("fullScreen")) cm.setOption("fullScreen", false);
                }
            }
        });

        // Store reference for cleanup
        if (blockElement) {
            const blockId = blockElement.dataset.blockId || Date.now().toString();
            blockElement.dataset.blockId = blockId;
            codeMirrorInstances.set(blockId, editor);
        }

        // Update theme when it changes
        editor.on('change', () => {
            // Trigger code generation when content changes
            generateCode();
        });

        // Force refresh to ensure syntax highlighting is applied
        setTimeout(() => {
            editor.refresh();
        }, 100);

        return editor;
    };

    /**
     * Get appropriate CodeMirror theme based on current app theme
     */
    const getCodeMirrorTheme = () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        
        // Map app themes to appropriate CodeMirror themes
        switch (currentTheme) {
            case 'light':
                return 'eclipse';
            case 'arctic':
                return 'base16-light';
            case 'dark':
                return 'monokai';
            case 'cyber':
                return 'material';
            case 'neon':
                return 'dracula';
            case 'retro':
                return 'base16-dark';
            case 'forest':
                return 'base16-dark';
            case 'ocean':
                return 'oceanic-next';
            case 'sunset':
                return 'night';
            default:
                return 'monokai';
        }
    };

    /**
     * Update all CodeMirror instances when theme changes
     */
    const updateCodeMirrorThemes = () => {
        const newTheme = getCodeMirrorTheme();
        codeMirrorInstances.forEach(editor => {
            editor.setOption('theme', newTheme);
            // Force refresh to apply theme changes
            setTimeout(() => {
                editor.refresh();
            }, 50);
        });
    };

    /**
     * Clean up CodeMirror instance when block is deleted
     */
    const cleanupCodeMirror = (blockElement) => {
        const blockId = blockElement.dataset.blockId;
        if (blockId && codeMirrorInstances.has(blockId)) {
            const editor = codeMirrorInstances.get(blockId);
            editor.toTextArea();
            codeMirrorInstances.delete(blockId);
        }
    };

    /**
     * Get value from textarea or CodeMirror editor
     */
    const getTextareaValue = (textarea) => {
        const blockElement = textarea.closest('.script-block');
        const blockId = blockElement?.dataset.blockId;
        
        if (blockId && codeMirrorInstances.has(blockId)) {
            return codeMirrorInstances.get(blockId).getValue();
        }
        
        return textarea.value;
    };

    /**
     * Set value to textarea or CodeMirror editor
     */
    const setTextareaValue = (textarea, value) => {
        const blockElement = textarea.closest('.script-block');
        const blockId = blockElement?.dataset.blockId;
        
        if (blockId && codeMirrorInstances.has(blockId)) {
            codeMirrorInstances.get(blockId).setValue(value);
        } else {
            textarea.value = value;
        }
    };

    // =========================================================================
    // == CORE LOGIC ==
    // =========================================================================

    const populateToolbox = () => {
        toolboxContainer.innerHTML = '';
        Object.entries(BLOCK_DEFINITIONS).forEach(([groupName, blocks]) => {
            // Create group container
            const groupContainer = document.createElement('div');
            groupContainer.className = 'toolbox-group-container';

            // Group header with chevron
            const groupHeader = document.createElement('h3');
            groupHeader.className = 'toolbox-group-header';
            groupHeader.innerHTML = `<span class="chevron">▶</span> ${groupName.charAt(0).toUpperCase() + groupName.slice(1)} Blocks`;
            groupHeader.style.cursor = 'pointer';

            // Blocks container
            const blocksContainer = document.createElement('div');
            blocksContainer.className = 'toolbox-blocks-container';

            blocks.forEach(def => {
                const item = document.createElement('div');
                item.className = 'tool-item';
                item.draggable = true;
                item.dataset.type = def.type;
                item.innerHTML = `
                <div class="drag-bar" style="background-color: ${def.color};"></div>
                <div class="drag-grip"><i class="fa-solid fa-grip-vertical"></i></div>
                <div class="tool-item-content">
                    <i class="${def.icon}" style="color: ${def.color};"></i> ${def.label}
                </div>
                <button class="tool-item-add-btn" title="Add ${def.label} to workspace" data-type="${def.type}">
                    <i class="fa-solid fa-plus"></i>
                </button>`;
                item.addEventListener('dragstart', e => {
                    e.dataTransfer.setData('application/x-script-block', def.type);
                    item.classList.add('dragging');
                    document.body.classList.add('no-select');
                });
                item.addEventListener('dragend', () => {
                    item.classList.remove('dragging');
                    document.body.classList.remove('no-select');
                });
                
                // Add click handler for the plus button
                const addBtn = item.querySelector('.tool-item-add-btn');
                addBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    
                    // Create and add the block to the main workspace
                    const newBlock = createBlock(def.type);
                    if (newBlock) {
                        mainDropZone.appendChild(newBlock);
                        updatePlaceholderVisibility(mainDropZone);
                        generateCode();
                        
                        // Show success feedback
                        const originalIcon = addBtn.innerHTML;
                        addBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
                        addBtn.style.backgroundColor = 'var(--accent-color)';
                        setTimeout(() => {
                            addBtn.innerHTML = originalIcon;
                            addBtn.style.backgroundColor = '';
                        }, 1000);
                        
                        // If in mobile mode, close the toolbox panel after adding
                        if (isMobileMode && toolbox.classList.contains('open')) {
                            setTimeout(() => {
                                closeMobilePanels();
                            }, 500);
                        }
                    }
                });
                
                blocksContainer.appendChild(item);
            });

            // Collapsing logic
            groupHeader.addEventListener('click', () => {
                const isCollapsed = blocksContainer.style.display === 'none';
                blocksContainer.style.display = isCollapsed ? '' : 'none';
                groupHeader.querySelector('.chevron').innerHTML = isCollapsed ? '▼' : '▶';
            });
            // Start expanded
            blocksContainer.style.display = '';
            groupHeader.querySelector('.chevron').innerHTML = '▼';

            groupContainer.appendChild(groupHeader);
            groupContainer.appendChild(blocksContainer);
            toolboxContainer.appendChild(groupContainer);
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
            if (draggedElement) {
                const originalParent = draggedElement.parentElement;
                // Only insert if dropIndicator is still present
                if (dropIndicator.parentNode === element) {
                    element.insertBefore(draggedElement, dropIndicator);
                } else {
                    element.appendChild(draggedElement);
                }
                updatePlaceholderVisibility(originalParent);
            } else {
                const blockType = e.dataTransfer.getData('application/x-script-block');
                const newBlock = createBlock(blockType);
                if (newBlock) {
                    if (dropIndicator.parentNode === element) {
                        element.insertBefore(newBlock, dropIndicator);
                    } else {
                        element.appendChild(newBlock);
                    }
                }
            }
            updatePlaceholderVisibility(element);
            dropIndicator.remove();
            generateCode();
        });
    };
    const findBlockDefinition = (type) => {
        for (const group in BLOCK_DEFINITIONS) {
            const definition = BLOCK_DEFINITIONS[group].find(d => d.type === type);
            if (definition) return definition;
        }
        return null;
    };
    const createBlock = (type) => {
        const definition = findBlockDefinition(type);
        if (!definition) return null;
        const block = document.createElement('div');
        block.className = 'script-block'; block.dataset.type = type; block.draggable = true;
        block.style.borderLeft = `4px solid ${definition.color}`;
        block.innerHTML = `<div class="block-header"><button class="collapse-toggle" title="Collapse/Expand Block"><i class="fa-solid fa-chevron-down"></i></button><i class="${definition.icon}"></i><span>${definition.label}</span></div>${definition.html()}<button class="delete-block-btn" title="Delete Block"><i class="fa-solid fa-xmark"></i></button>`;
        block.querySelectorAll('.nested-drop-zone').forEach(addDragAndDropListeners);
        
        // Initialize CodeMirror for appropriate textareas - Fixed timing
        setTimeout(() => {
            const textareas = block.querySelectorAll('textarea[data-token]');
            textareas.forEach(textarea => {
                // Only initialize if textarea is visible and has the themed-textarea class
                if (textarea.classList.contains('themed-textarea') && textarea.offsetParent !== null) {
                    initializeCodeMirror(textarea, type);
                }
            });
        }, 100);
        
        // Prevent dragging when interacting with text input elements
        block.addEventListener('mousedown', e => {
            const target = e.target;
            if (target.matches('input[type="text"], textarea, select') ||
                target.closest('input[type="text"], textarea, select') ||
                target.closest('.CodeMirror')) {
                // Temporarily disable dragging for this block
                block.draggable = false;
                // Re-enable dragging after a short delay to allow text selection
                setTimeout(() => {
                    block.draggable = true;
                }, 100);
            }
        });
        
        block.addEventListener('dragstart', e => {
            // Prevent dragging if the user is interacting with text input elements
            const target = e.target;
            if (target.matches('input[type="text"], textarea, select') ||
                target.closest('input[type="text"], textarea, select') ||
                target.closest('.CodeMirror')) {
                e.preventDefault();
                return false;
            }
            
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
            } else { return closest; }
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
            const definition = findBlockDefinition(block.dataset.type);
            if (definition) code += indent + definition.parser(block, indent) + '\n';
        });
        return code;
    };
    const generateCode = () => {
        const generated = parseZone(mainDropZone);
        generatedCodeElement.textContent = generated.trim() === '' ? '// Your generated code will appear here...' : generated;
    };

    // =========================================================================
    // == HTML IMPORT LOGIC ==
    // =========================================================================
    const parseHtmlAndBuildWorkspace = (htmlString) => {
        mainDropZone.innerHTML = '<p class="placeholder-text">Drop blocks here to start building...</p>';
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');
        const rootNode = doc.documentElement;
        if (!rootNode) {
            alert('Could not parse HTML. Is it a valid HTML file?');
            return;
        }
        buildBlocksFromNode(rootNode, mainDropZone);
        updatePlaceholderVisibility(mainDropZone);
        generateCode();
    };
    const buildBlocksFromNode = (parentNode, targetDropZone) => {
        if (!parentNode || !parentNode.childNodes) return;
        parentNode.childNodes.forEach(childNode => {
            // Ignore comments and empty/whitespace-only text nodes
            if (childNode.nodeType === Node.COMMENT_NODE ||
                (childNode.nodeType === Node.TEXT_NODE && !childNode.textContent.trim())) {
                return;
            }

            let matchedDefinition = null;
            let importResult = null;

            // Iterate through all defined blocks to find a matching importer
            for (const group in BLOCK_DEFINITIONS) {
                for (const definition of BLOCK_DEFINITIONS[group]) {
                    if (definition.importer) {
                        const result = definition.importer(childNode);
                        if (result) {
                            matchedDefinition = definition;
                            importResult = result;
                            break;
                        }
                    }
                }
                if (matchedDefinition) break;
            }

            if (matchedDefinition) {
                const newBlockElement = createBlock(importResult.type);
                if (!newBlockElement) return;

                // Populate tokens (inputs, selects, etc.)
                if (importResult.tokens) {
                    Object.entries(importResult.tokens).forEach(([tokenName, value]) => {
                        const input = newBlockElement.querySelector(`[data-token="${tokenName}"]`);
                        if (input) {
                            if (input.tagName.toLowerCase() === 'textarea') {
                                setTextareaValue(input, value || '');
                            } else {
                                input.value = value || '';
                            }
                        }
                    });
                }

                targetDropZone.appendChild(newBlockElement);
                updatePlaceholderVisibility(targetDropZone);

                // Initialize CodeMirror for imported blocks with textareas
                setTimeout(() => {
                    const textareas = newBlockElement.querySelectorAll('textarea[data-token].themed-textarea');
                    textareas.forEach(textarea => {
                        if (textarea.offsetParent !== null) {
                            initializeCodeMirror(textarea, importResult.type);
                        }
                    });
                }, 150);

                // If the imported block is a container, recursively build its children
                if (importResult.branches) {
                    Object.entries(importResult.branches).forEach(([branchName, sourceNode]) => {
                        const nestedDropZone = newBlockElement.querySelector(`[data-branch="${branchName}"]`);
                        if (nestedDropZone) {
                            buildBlocksFromNode(sourceNode, nestedDropZone);
                        }
                    });
                }
            } else {
                // Try to create a custom block as fallback
                let customBlock = null;
                
                // Try custom importers in order of preference
                const customImporters = [
                    BLOCK_DEFINITIONS.custom.find(def => def.type === 'raw_text'),
                    BLOCK_DEFINITIONS.custom.find(def => def.type === 'custom_html'),
                    BLOCK_DEFINITIONS.custom.find(def => def.type === 'custom_css'),
                    BLOCK_DEFINITIONS.custom.find(def => def.type === 'custom_javascript')
                ];
                
                for (const customDef of customImporters) {
                    if (customDef && customDef.importer) {
                        const result = customDef.importer(childNode);
                        if (result) {
                            customBlock = result;
                            matchedDefinition = customDef;
                            break;
                        }
                    }
                }
                
                if (customBlock) {
                    const newBlockElement = createBlock(customBlock.type);
                    if (newBlockElement) {
                        // Populate tokens
                        if (customBlock.tokens) {
                            Object.entries(customBlock.tokens).forEach(([tokenName, value]) => {
                                const input = newBlockElement.querySelector(`[data-token="${tokenName}"]`);
                                if (input) {
                                    if (input.tagName.toLowerCase() === 'textarea') {
                                        setTextareaValue(input, value || '');
                                    } else {
                                        input.value = value || '';
                                    }
                                    // Update closing tag name for custom HTML blocks
                                    if (tokenName === 'tagname') {
                                        const closingTagSpan = newBlockElement.querySelector('.closing-tag-name');
                                        if (closingTagSpan) {
                                            closingTagSpan.textContent = value || 'tagname';
                                        }
                                    }
                                }
                            });
                        }
                        
                        targetDropZone.appendChild(newBlockElement);
                        updatePlaceholderVisibility(targetDropZone);
                        
                        // Initialize CodeMirror for custom blocks with textareas
                        setTimeout(() => {
                            const textareas = newBlockElement.querySelectorAll('textarea[data-token].themed-textarea');
                            textareas.forEach(textarea => {
                                if (textarea.offsetParent !== null) {
                                    initializeCodeMirror(textarea, customBlock.type);
                                }
                            });
                        }, 150);
                        
                        // Handle nested content for custom HTML blocks
                        if (customBlock.branches) {
                            Object.entries(customBlock.branches).forEach(([branchName, sourceNode]) => {
                                const nestedDropZone = newBlockElement.querySelector(`[data-branch="${branchName}"]`);
                                if (nestedDropZone) {
                                    buildBlocksFromNode(sourceNode, nestedDropZone);
                                }
                            });
                        }
                    }
                } else {
                    console.warn('No importer found for node:', childNode);
                }
            }
        });
    };

    // =========================================================================
    // == NEW: WORKSPACE STATE MANAGEMENT ==
    // =========================================================================

    // NEW: Save and load workspace state as JSON
    const saveWorkspaceState = () => {
        const blocks = [];
        const scriptBlocks = mainDropZone.querySelectorAll(':scope > .script-block');
        
        scriptBlocks.forEach(block => {
            const blockData = extractBlockData(block);
            if (blockData) {
                blocks.push(blockData);
            }
        });
        
        return {
            version: '2.0',
            blocks: blocks,
            timestamp: new Date().toISOString()
        };
    };

    const extractBlockData = (blockElement) => {
        const type = blockElement.dataset.type;
        const definition = findBlockDefinition(type);
        if (!definition) return null;

        const blockData = {
            type: type,
            tokens: {},
            branches: {}
        };

        // Extract token values (inputs, selects, textareas)
        const tokenElements = blockElement.querySelectorAll('[data-token]');
        tokenElements.forEach(element => {
            const tokenName = element.getAttribute('data-token');
            if (element.tagName.toLowerCase() === 'textarea') {
                blockData.tokens[tokenName] = getTextareaValue(element) || '';
            } else {
                blockData.tokens[tokenName] = element.value || '';
            }
        });

        // Extract nested blocks from branches
        const branchElements = blockElement.querySelectorAll(':scope > .nested-drop-zone[data-branch]');
        branchElements.forEach(branchElement => {
            const branchName = branchElement.getAttribute('data-branch');
            const nestedBlocks = [];
            
            const nestedScriptBlocks = branchElement.querySelectorAll(':scope > .script-block');
            nestedScriptBlocks.forEach(nestedBlock => {
                const nestedData = extractBlockData(nestedBlock);
                if (nestedData) {
                    nestedBlocks.push(nestedData);
                }
            });
            
            blockData.branches[branchName] = nestedBlocks;
        });

        return blockData;
    };

    const loadWorkspaceState = (stateData) => {
        try {
            // Clear workspace
            mainDropZone.innerHTML = '<p class="placeholder-text">Drop blocks here to start building...</p>';
            
            if (!stateData.blocks || !Array.isArray(stateData.blocks)) {
                throw new Error('Invalid workspace data format');
            }

            // Rebuild blocks
            stateData.blocks.forEach(blockData => {
                const blockElement = createBlockFromData(blockData);
                if (blockElement) {
                    mainDropZone.appendChild(blockElement);
                }
            });

            updatePlaceholderVisibility(mainDropZone);
            generateCode();
            
        } catch (error) {
            console.error('Failed to load workspace state:', error);
            alert(`Failed to load workspace: ${error.message}`);
        }
    };

    const createBlockFromData = (blockData) => {
        const blockElement = createBlock(blockData.type);
        if (!blockElement) return null;

        // Set token values
        if (blockData.tokens) {
            Object.entries(blockData.tokens).forEach(([tokenName, value]) => {
                const tokenElement = blockElement.querySelector(`[data-token="${tokenName}"]`);
                if (tokenElement) {
                    if (tokenElement.tagName.toLowerCase() === 'textarea') {
                        setTextareaValue(tokenElement, value);
                    } else {
                        tokenElement.value = value;
                    }
                }
            });
        }

        // Initialize CodeMirror for loaded blocks with textareas
        setTimeout(() => {
            const textareas = blockElement.querySelectorAll('textarea[data-token].themed-textarea');
            textareas.forEach(textarea => {
                if (textarea.offsetParent !== null) {
                    initializeCodeMirror(textarea, blockData.type);
                }
            });
        }, 150);

        // Rebuild nested branches
        if (blockData.branches) {
            Object.entries(blockData.branches).forEach(([branchName, nestedBlocks]) => {
                const branchElement = blockElement.querySelector(`[data-branch="${branchName}"]`);
                if (branchElement && Array.isArray(nestedBlocks)) {
                    nestedBlocks.forEach(nestedBlockData => {
                        const nestedBlockElement = createBlockFromData(nestedBlockData);
                        if (nestedBlockElement) {
                            branchElement.appendChild(nestedBlockElement);
                        }
                    });
                    updatePlaceholderVisibility(branchElement);
                }
            });
        }

        return blockElement;
    };

    // =========================================================================
    // == NEW: DEFAULT WORKSPACE AND FILE MANAGEMENT ==
    // =========================================================================

    /**
     * Clears the main drop zone and populates it with a basic HTML structure.
     */
    const createDefaultWorkspace = () => {
        mainDropZone.innerHTML = ''; // Clear existing content

        // Create HTML Document block
        const docBlock = createBlock('html_document');
        mainDropZone.appendChild(docBlock);

        // Wait for DOM to update before querying nested zones
        setTimeout(() => {
            // Get head and body drop zones
            const headZone = docBlock.querySelector('[data-branch="head"]');
            const bodyZone = docBlock.querySelector('[data-branch="body"]');

            // FIX 1: REMOVED redundant listener attachments.
            // The `createBlock` function already adds these listeners to any `.nested-drop-zone`.
            // Attaching them a second time caused the drop handler to fire twice, creating two blocks.
            // addDragAndDropListeners(headZone); // This was causing the double-drop bug
            // addDragAndDropListeners(bodyZone); // This was also causing the double-drop bug

            // Populate Head
            const metaCharset = createBlock('meta_charset');
            const metaViewport = createBlock('meta_viewport');
            const title = createBlock('title');
            const titleInput = title.querySelector('[data-token="value"]');
            if (titleInput) {
                titleInput.value = 'My FlowScript Page';
            }
            headZone.append(metaCharset, metaViewport, title);

            // Populate Body
            const heading = createBlock('heading');
            heading.querySelector('[data-token="text"]').value = 'Welcome to FlowScript!';
            const paragraph = createBlock('paragraph');
            paragraph.querySelector('[data-token="text"]').value = 'This is a page built with the visual block editor. Drag blocks from the toolbox to get started.';
            bodyZone.append(heading, paragraph);

            // Update UI
            updatePlaceholderVisibility(mainDropZone);
            updatePlaceholderVisibility(headZone);
            updatePlaceholderVisibility(bodyZone);
            generateCode();
        }, 0);
    };


    // --- EVENT LISTENERS INITIALIZATION ---
    populateToolbox();
    addDragAndDropListeners(mainDropZone);

    themeSelect.addEventListener('change', e => {
        document.documentElement.setAttribute('data-theme', e.target.value);
        updateCodeMirrorThemes();
    });

    // Template selector event listener
    templateSelect.addEventListener('change', (e) => {
        const selectedTemplate = e.target.value;
        if (!selectedTemplate) return;

        // Check if workspace has content
        const hasContent = mainDropZone.querySelector('.script-block');
        
        if (hasContent) {
            const confirmed = confirm(
                `Loading the "${TEMPLATE_DEFINITIONS[selectedTemplate].name}" template will overwrite your current workspace.\n\n` +
                `Are you sure you want to continue? Your current work will be lost.`
            );
            
            if (!confirmed) {
                // Reset the dropdown to empty selection
                e.target.value = '';
                return;
            }
        }

        // Load the selected template
        loadTemplate(selectedTemplate);
        
        // Reset the dropdown to show "Select Template..." again
        e.target.value = '';
    });

    /**
     * Load a template by parsing its HTML and building the workspace
     */
    const loadTemplate = (templateKey) => {
        const template = TEMPLATE_DEFINITIONS[templateKey];
        if (!template) {
            alert('Template not found!');
            return;
        }

        try {
            // Clear workspace and load template
            mainDropZone.innerHTML = '<p class="placeholder-text">Drop blocks here to start building...</p>';
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(template.html, 'text/html');
            const rootNode = doc.documentElement;
            
            if (!rootNode) {
                throw new Error('Could not parse template HTML');
            }
            
            buildBlocksFromNode(rootNode, mainDropZone);
            updatePlaceholderVisibility(mainDropZone);
            generateCode();
            
            // Show success message
            const successMessage = document.createElement('span');
            successMessage.style.color = 'var(--accent-color)';
            successMessage.style.fontSize = '0.9rem';
            successMessage.style.marginLeft = '0.5rem';
            successMessage.textContent = `✓ ${template.name} loaded`;
            templateSelect.parentElement.appendChild(successMessage);
            
            // Remove success message after 3 seconds
            setTimeout(() => {
                if (successMessage.parentElement) {
                    successMessage.remove();
                }
            }, 3000);
            
        } catch (error) {
            console.error('Failed to load template:', error);
            alert(`Failed to load template: ${error.message}`);
        }
    };

    workspace.addEventListener('input', e => {
        if (e.target.matches('input[type="text"], textarea, select')) {
            // Handle custom HTML block tagname updates
            if (e.target.dataset.token === 'tagname') {
                const closingTagSpan = e.target.closest('.script-block').querySelector('.closing-tag-name');
                if (closingTagSpan) {
                    closingTagSpan.textContent = e.target.value || 'tagname';
                }
            }
            generateCode();
        }
    });

    workspace.addEventListener('click', e => {
        const deleteBtn = e.target.closest('.delete-block-btn');
        if (deleteBtn) {
            const block = deleteBtn.closest('.script-block');
            const parentZone = block.parentElement;
            cleanupCodeMirror(block);
            block.remove();
            updatePlaceholderVisibility(parentZone);
            generateCode();
            return;
        }

        const collapseBtn = e.target.closest('.collapse-toggle');
        if (collapseBtn) {
            const block = collapseBtn.closest('.script-block');
            const isCollapsed = block.classList.contains('collapsed');
            
            if (isCollapsed) {
                // Expand the block
                block.classList.remove('collapsed');
                collapseBtn.querySelector('i').style.transform = '';
                collapseBtn.title = 'Collapse Block';
            } else {
                // Collapse the block
                block.classList.add('collapsed');
                collapseBtn.querySelector('i').style.transform = 'rotate(-90deg)';
                collapseBtn.title = 'Expand Block';
            }
            return;
        }
    });

    copyButton.addEventListener('click', () => {
        navigator.clipboard.writeText(generatedCodeElement.textContent).then(() => {
            const originalHTML = copyButton.innerHTML;
            copyButton.innerHTML = `<i class="fa-solid fa-check"></i> Copied!`;
            setTimeout(() => { copyButton.innerHTML = originalHTML; }, 1500);
        });
    });

    previewButton.addEventListener('click', () => {
        const generatedCode = generatedCodeElement.textContent;
        if (generatedCode.trim() === '' || generatedCode === '// Your generated code will appear here...') {
            alert('No code to preview! Please add some blocks to the workspace first.');
            return;
        }

        // Create a new window for the preview
        const previewWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
        
        if (previewWindow) {
            // Write the generated HTML to the new window
            previewWindow.document.open();
            previewWindow.document.write(generatedCode);
            previewWindow.document.close();
            
            // Set the title of the preview window
            previewWindow.document.title = 'FlowScript Preview';
            
            // Add some basic styling to make it clear this is a preview
            const style = previewWindow.document.createElement('style');
            style.textContent = `
                body::before {
                    content: "🔍 FlowScript Preview";
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    background: rgba(0, 0, 0, 0.8);
                    color: white;
                    padding: 0.5rem;
                    text-align: center;
                    font-family: system-ui, sans-serif;
                    font-size: 0.9rem;
                    z-index: 10000;
                    border-bottom: 2px solid #007bff;
                }
                body {
                    margin-top: 2.5rem;
                }
            `;
            previewWindow.document.head.appendChild(style);
        } else {
            alert('Preview window was blocked by your browser. Please allow popups for this site and try again.');
        }
    });

    // NEW: Toolbar Event Listeners
    newButton.addEventListener('click', () => {
        if (mainDropZone.querySelector('.script-block')) {
            if (confirm('Are you sure you want to start a new file? Your current work will be lost.')) {
                createDefaultWorkspace();
            }
        } else {
            createDefaultWorkspace();
        }
    });

    openButton.addEventListener('click', () => {
        if (mainDropZone.querySelector('.script-block')) {
            if (!confirm('This will replace your current workspace. Are you sure?')) {
                return;
            }
        }
        fileInput.click();
    });

    saveButton.addEventListener('click', () => {
        // Check if there are blocks to save
        const hasBlocks = mainDropZone.querySelector('.script-block');
        if (!hasBlocks) {
            alert('No blocks to save! Please add some blocks to the workspace first.');
            return;
        }

        // Save workspace state as JSON
        const workspaceState = saveWorkspaceState();
        const jsonString = JSON.stringify(workspaceState, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'flowscript-workspace.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Show success message
        const originalText = saveButton.innerHTML;
        saveButton.innerHTML = '<i class="fa-solid fa-check"></i> Saved!';
        setTimeout(() => {
            saveButton.innerHTML = originalText;
        }, 2000);
    });

    exportButton.addEventListener('click', () => {
        const codeToExport = generatedCodeElement.textContent;
        if (codeToExport.trim() === '' || codeToExport === '// Your generated code will appear here...') {
            alert('No code to export! Please add some blocks to the workspace first.');
            return;
        }

        const blob = new Blob([codeToExport], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'flowscript-export.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Show success message
        const originalText = exportButton.innerHTML;
        exportButton.innerHTML = '<i class="fa-solid fa-check"></i> Exported!';
        setTimeout(() => {
            exportButton.innerHTML = originalText;
        }, 2000);
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const fileContent = event.target.result;
            try {
                // Check file extension to determine how to process it
                const fileName = file.name.toLowerCase();
                
                if (fileName.endsWith('.json')) {
                    // Load as workspace state
                    const workspaceData = JSON.parse(fileContent);
                    loadWorkspaceState(workspaceData);
                } else if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
                    // Load as HTML and try to parse into blocks
                    parseHtmlAndBuildWorkspace(fileContent);
                } else {
                    alert('Unsupported file type. Please select a .json, .html, or .htm file.');
                    return;
                }
            } catch (error) {
                console.error("Failed to load file:", error);
                if (file.name.toLowerCase().endsWith('.json')) {
                    alert("Failed to load workspace file. The file may be corrupted or in an invalid format.");
                } else {
                    alert("An error occurred while loading the HTML file. Check the console for details.");
                }
            }
        };
        reader.onerror = () => {
            alert('Error reading file.');
        };
        reader.readAsText(file);
        e.target.value = '';
    });

    // NEW: Initialize with the default workspace on page load
    createDefaultWorkspace();

    // =========================================================================
    // == MOBILE FUNCTIONALITY EVENT LISTENERS ==
    // =========================================================================

    // Mobile toggle button event listener
    mobileToggleBtn.addEventListener('click', () => {
        if (isMobileMode) {
            disableMobileMode();
            isAutoMobile = false; // Prevent auto-enable until manual toggle again
        } else {
            enableMobileMode();
            isAutoMobile = false; // This is now a manual toggle
        }
    });

    // Mobile dropdown menu event listeners
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMobileDropdown();
        });
    }

    // Mobile dropdown file management buttons
    if (mobileNewBtn) {
        mobileNewBtn.addEventListener('click', () => {
            closeMobileDropdown();
            newButton.click(); // Trigger the main new button functionality
        });
    }

    if (mobileOpenBtn) {
        mobileOpenBtn.addEventListener('click', () => {
            closeMobileDropdown();
            openButton.click(); // Trigger the main open button functionality
        });
    }

    if (mobileSaveBtn) {
        mobileSaveBtn.addEventListener('click', () => {
            closeMobileDropdown();
            saveButton.click(); // Trigger the main save button functionality
        });
    }

    if (mobileExportBtn) {
        mobileExportBtn.addEventListener('click', () => {
            closeMobileDropdown();
            exportButton.click(); // Trigger the main export button functionality
        });
    }

    // Mobile theme selector
    if (mobileThemeSelect) {
        mobileThemeSelect.addEventListener('change', (e) => {
            themeSelect.value = e.target.value;
            themeSelect.dispatchEvent(new Event('change'));
            closeMobileDropdown();
        });
    }

    // Mobile template selector
    if (mobileTemplateSelect) {
        mobileTemplateSelect.addEventListener('change', (e) => {
            templateSelect.value = e.target.value;
            templateSelect.dispatchEvent(new Event('change'));
            // Don't close dropdown immediately for template selection
            // as the user might want to see the confirmation dialog
        });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (isMobileMode && mobileDropdown && mobileDropdown.classList.contains('open')) {
            handleMobileDropdownOutsideClick(e);
        }
    });

    // Prevent dropdown from closing when clicking inside it
    if (mobileDropdown) {
        mobileDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    // Window resize listener for auto mobile detection
    window.addEventListener('resize', () => {
        // Debounce resize events
        clearTimeout(window.resizeTimeout);
        window.resizeTimeout = setTimeout(() => {
            checkMobileMode();
        }, 250);
    });

    // Touch event improvements for mobile
    if ('ontouchstart' in window) {
        // Add touch-friendly drag and drop for mobile devices
        document.addEventListener('touchstart', (e) => {
            // Prevent default touch behavior on draggable elements
            if (e.target.closest('.tool-item, .script-block')) {
                e.preventDefault();
            }
        }, { passive: false });

        // Improve touch scrolling in mobile panels
        document.addEventListener('touchmove', (e) => {
            const panel = e.target.closest('.mobile-panel');
            if (panel && panel.classList.contains('open')) {
                e.stopPropagation();
            }
        }, { passive: true });
    }

    // Keyboard shortcuts for mobile panels and dropdown
    document.addEventListener('keydown', (e) => {
        if (isMobileMode) {
            // ESC to close panels and dropdown
            if (e.key === 'Escape') {
                closeMobilePanels();
                closeMobileDropdown();
            }
            // M for mobile menu dropdown
            if (e.key === 'm' || e.key === 'M') {
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    toggleMobileDropdown();
                }
            }
            // T for toolbox
            if (e.key === 't' || e.key === 'T') {
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    toggleMobilePanel('left');
                }
            }
            // O for output
            if (e.key === 'o' || e.key === 'O') {
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    toggleMobilePanel('right');
                }
            }
        }
    });

    // Initial mobile check
    setTimeout(() => {
        checkMobileMode();
    }, 100);

    // =========================================================================
    // == DOCUMENTATION MODAL FUNCTIONALITY ==
    // =========================================================================

    /**
     * Open the documentation modal
     */
    const openDocumentationModal = () => {
        documentationModal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
        
        // Close mobile panels if open
        if (isMobileMode) {
            closeMobilePanels();
            closeMobileDropdown();
        }
        
        // Focus on the modal for accessibility
        setTimeout(() => {
            if (closeModalBtn) {
                closeModalBtn.focus();
            }
        }, 300);
    };

    /**
     * Close the documentation modal
     */
    const closeDocumentationModal = () => {
        documentationModal.classList.remove('active');
        document.body.style.overflow = ''; // Restore background scrolling
    };

    /**
     * Switch to a specific documentation section
     */
    const switchDocSection = (sectionId) => {
        // Hide all sections
        docSections.forEach(section => {
            section.classList.remove('active');
        });
        
        // Remove active class from all nav links
        docNavLinks.forEach(link => {
            link.classList.remove('active');
        });
        
        // Show the target section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
        }
        
        // Add active class to the corresponding nav link
        const targetNavLink = document.querySelector(`[data-section="${sectionId}"]`);
        if (targetNavLink) {
            targetNavLink.classList.add('active');
        }
        
        // Scroll to top of the main content area
        const docMain = document.querySelector('.doc-main');
        if (docMain) {
            docMain.scrollTop = 0;
        }
    };

    /**
     * Handle clicks outside the modal to close it
     */
    const handleModalOutsideClick = (event) => {
        if (event.target === documentationModal) {
            closeDocumentationModal();
        }
    };

    // Documentation modal event listeners
    if (helpButton) {
        helpButton.addEventListener('click', () => {
            openDocumentationModal();
        });
    }

    if (mobileHelpButton) {
        mobileHelpButton.addEventListener('click', () => {
            openDocumentationModal();
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            closeDocumentationModal();
        });
    }

    // Navigation between documentation sections
    docNavLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.getAttribute('data-section');
            if (sectionId) {
                switchDocSection(sectionId);
            }
        });
    });

    // Close modal when clicking outside
    if (documentationModal) {
        documentationModal.addEventListener('click', handleModalOutsideClick);
    }

    // Keyboard shortcuts for documentation modal
    document.addEventListener('keydown', (e) => {
        // Open documentation with F1 or Ctrl/Cmd + ?
        if (e.key === 'F1' || (e.key === '?' && (e.ctrlKey || e.metaKey))) {
            e.preventDefault();
            openDocumentationModal();
        }
        
        // Close documentation with Escape (if modal is open)
        if (e.key === 'Escape' && documentationModal.classList.contains('active')) {
            closeDocumentationModal();
        }
        
        // Navigate sections with arrow keys (if modal is open)
        if (documentationModal.classList.contains('active')) {
            const activeNavLink = document.querySelector('.doc-nav-link.active');
            if (activeNavLink) {
                let targetLink = null;
                
                if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                    targetLink = activeNavLink.parentElement.nextElementSibling?.querySelector('.doc-nav-link');
                } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                    targetLink = activeNavLink.parentElement.previousElementSibling?.querySelector('.doc-nav-link');
                }
                
                if (targetLink) {
                    e.preventDefault();
                    targetLink.click();
                }
            }
        }
    });

    // Initialize documentation modal (ensure first section is active)
    if (docSections.length > 0) {
        switchDocSection('getting-started');
    }

    // =========================================================================
    // == AI ASSISTANT FUNCTIONALITY ==
    // =========================================================================

    // AI modal references
    const aiButton = document.getElementById('ai-button');
    const mobileAiButton = document.getElementById('mobile-ai-button');
    const aiModal = document.getElementById('ai-modal');
    const aiCloseBtn = document.getElementById('ai-close-btn');
    const aiTabBtns = document.querySelectorAll('.ai-tab-btn');
    const aiTabContents = document.querySelectorAll('.ai-tab-content');

    // AI generation elements
    const aiProviderSelect = document.getElementById('ai-provider-select');
    const aiPromptTextarea = document.getElementById('ai-prompt');
    const aiGenerateBtn = document.getElementById('ai-generate-btn');
    const aiClearBtn = document.getElementById('ai-clear-btn');
    const aiStatus = document.getElementById('ai-status');
    const aiResult = document.getElementById('ai-result');
    const aiResultCode = document.getElementById('ai-result-code');
    const aiUseResultBtn = document.getElementById('ai-use-result-btn');

    // AI settings elements
    const aiSaveSettingsBtn = document.getElementById('ai-save-settings-btn');
    const aiClearAllKeysBtn = document.getElementById('ai-clear-all-keys-btn');

    // AI provider configurations
    const AI_PROVIDERS = {
        openai: {
            name: 'OpenAI',
            icon: 'fa-solid fa-brain',
            apiUrl: 'https://api.openai.com/v1/chat/completions',
            defaultModel: 'gpt-4',
            keyPlaceholder: 'sk-...',
            docsUrl: 'https://platform.openai.com/api-keys'
        },
        claude: {
            name: 'Anthropic Claude',
            icon: 'fa-solid fa-robot',
            apiUrl: 'https://api.anthropic.com/v1/messages',
            defaultModel: 'claude-3-5-sonnet-20241022',
            keyPlaceholder: 'sk-ant-...',
            docsUrl: 'https://console.anthropic.com/account/keys'
        },
        gemini: {
            name: 'Google Gemini',
            icon: 'fa-solid fa-gem',
            apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/',
            defaultModel: 'gemini-1.5-pro',
            keyPlaceholder: 'AIza...',
            docsUrl: 'https://makersuite.google.com/app/apikey'
        },
        cohere: {
            name: 'Cohere',
            icon: 'fa-solid fa-circle-nodes',
            apiUrl: 'https://api.cohere.ai/v1/generate',
            defaultModel: 'command-r-plus',
            keyPlaceholder: 'co-...',
            docsUrl: 'https://dashboard.cohere.ai/api-keys'
        }
    };

    // Local storage keys
    const STORAGE_KEYS = {
        AI_KEYS: 'flowscript_ai_keys',
        THEME: 'flowscript_theme',
        AI_SETTINGS: 'flowscript_ai_settings'
    };

    /**
     * Initialize AI functionality
     */
    const initializeAI = () => {
        setupAIProviderSettings();
        loadAISettings();
        loadThemeFromStorage();
    };

    /**
     * Setup AI provider settings in the modal
     */
    const setupAIProviderSettings = () => {
        const aiProviderSettings = document.getElementById('ai-provider-settings');
        if (!aiProviderSettings) return;

        aiProviderSettings.innerHTML = '';

        Object.entries(AI_PROVIDERS).forEach(([providerId, config]) => {
            const settingDiv = document.createElement('div');
            settingDiv.className = 'ai-provider-setting';
            settingDiv.innerHTML = `
                <h4><i class="${config.icon}"></i> ${config.name}</h4>
                <div class="ai-key-input-group">
                    <input type="password"
                           id="ai-key-${providerId}"
                           placeholder="${config.keyPlaceholder}"
                           data-provider="${providerId}">
                    <button type="button" class="ai-key-toggle" data-provider="${providerId}" title="Show/Hide Key">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                    <button type="button" class="ai-key-test" data-provider="${providerId}" title="Test API Key">
                        <i class="fa-solid fa-vial"></i>
                    </button>
                </div>
                <small>Get your API key from <a href="${config.docsUrl}" target="_blank">${config.name} Dashboard</a></small>
            `;
            aiProviderSettings.appendChild(settingDiv);
        });

        // Add event listeners for key toggles and tests
        document.querySelectorAll('.ai-key-toggle').forEach(btn => {
            btn.addEventListener('click', toggleApiKeyVisibility);
        });

        document.querySelectorAll('.ai-key-test').forEach(btn => {
            btn.addEventListener('click', testApiKey);
        });
    };

    /**
     * Toggle API key visibility
     */
    const toggleApiKeyVisibility = (e) => {
        const target = e.currentTarget.dataset.target;
        const input = document.getElementById(target);
        const icon = e.currentTarget.querySelector('i');

        if (input && input.type === 'password') {
            input.type = 'text';
            icon.className = 'fa-solid fa-eye-slash';
        } else if (input) {
            input.type = 'password';
            icon.className = 'fa-solid fa-eye';
        }
    };

    /**
     * Test API key
     */
    const testApiKey = async (e) => {
        const providerId = e.currentTarget.dataset.provider;
        const input = document.getElementById(`${providerId}-key`);
        const apiKey = input ? input.value.trim() : '';

        if (!apiKey) {
            showAIStatus('Please enter an API key first', 'error');
            return;
        }

        const btn = e.currentTarget;
        const originalIcon = btn.innerHTML;
        btn.innerHTML = '<div class="ai-loading-spinner"></div>';
        btn.disabled = true;

        try {
            const isValid = await validateApiKey(providerId, apiKey);
            if (isValid) {
                showAIStatus(`${AI_PROVIDERS[providerId].name} API key is valid!`, 'success');
                input.style.borderColor = 'var(--accent-color)';
            } else {
                showAIStatus(`${AI_PROVIDERS[providerId].name} API key is invalid`, 'error');
                input.style.borderColor = '#dc3545';
            }
        } catch (error) {
            showAIStatus(`Error testing ${AI_PROVIDERS[providerId].name} API key: ${error.message}`, 'error');
            input.style.borderColor = '#dc3545';
        } finally {
            btn.innerHTML = originalIcon;
            btn.disabled = false;
            setTimeout(() => {
                input.style.borderColor = '';
            }, 3000);
        }
    };

    /**
     * Validate API key by making a test request
     */
    const validateApiKey = async (providerId, apiKey) => {
        const config = AI_PROVIDERS[providerId];
        
        try {
            let response;
            
            switch (providerId) {
                case 'openai':
                    response = await fetch('https://api.openai.com/v1/models', {
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    break;
                    
                case 'claude':
                    response = await fetch('https://api.anthropic.com/v1/messages', {
                        method: 'POST',
                        headers: {
                            'x-api-key': apiKey,
                            'Content-Type': 'application/json',
                            'anthropic-version': '2023-06-01'
                        },
                        body: JSON.stringify({
                            model: 'claude-3-haiku-20240307',
                            max_tokens: 1,
                            messages: [{ role: 'user', content: 'test' }]
                        })
                    });
                    break;
                    
                case 'gemini':
                    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: 'test' }] }]
                        })
                    });
                    break;
                    
                case 'cohere':
                    response = await fetch('https://api.cohere.ai/v1/generate', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            model: 'command-light',
                            prompt: 'test',
                            max_tokens: 1
                        })
                    });
                    break;
                    
                default:
                    return false;
            }
            
            return response.ok || response.status === 400; // 400 might be expected for minimal test requests
        } catch (error) {
            console.error(`API key validation error for ${providerId}:`, error);
            return false;
        }
    };

    /**
     * Open AI modal
     */
    const openAIModal = () => {
        aiModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Close mobile panels if open
        if (isMobileMode) {
            closeMobilePanels();
            closeMobileDropdown();
        }
        
        // Load current settings
        loadAISettings();
        
        // Focus on the modal
        setTimeout(() => {
            if (aiCloseBtn) {
                aiCloseBtn.focus();
            }
        }, 300);
    };

    /**
     * Close AI modal
     */
    const closeAIModal = () => {
        aiModal.classList.remove('active');
        document.body.style.overflow = '';
        hideAIStatus();
        hideAIResult();
    };

    /**
     * Switch AI modal tabs
     */
    const switchAITab = (tabId) => {
        // Remove active class from all tabs and contents
        aiTabBtns.forEach(btn => btn.classList.remove('active'));
        aiTabContents.forEach(content => content.classList.remove('active'));
        
        // Add active class to selected tab and content
        const selectedTab = document.querySelector(`[data-tab="${tabId}"]`);
        const selectedContent = document.getElementById(`ai-${tabId}-tab`);
        
        if (selectedTab && selectedContent) {
            selectedTab.classList.add('active');
            selectedContent.classList.add('active');
        }
    };

    /**
     * Show AI status message
     */
    const showAIStatus = (message, type = 'loading') => {
        aiStatus.className = `ai-status ${type}`;
        aiStatus.innerHTML = type === 'loading'
            ? `<div class="ai-loading-spinner"></div> ${message}`
            : `<i class="fa-solid fa-${type === 'success' ? 'check' : 'exclamation-triangle'}"></i> ${message}`;
        aiStatus.classList.remove('hidden');
    };

    /**
     * Hide AI status message
     */
    const hideAIStatus = () => {
        aiStatus.classList.add('hidden');
    };

    /**
     * Show AI result
     */
    const showAIResult = (code) => {
        aiResultCode.textContent = code;
        aiResult.classList.remove('hidden');
    };

    /**
     * Hide AI result
     */
    const hideAIResult = () => {
        aiResult.classList.add('hidden');
    };

    /**
     * Generate FlowScript using AI
     */
    const generateWithAI = async () => {
        const provider = aiProviderSelect.value;
        const prompt = aiPromptTextarea.value.trim();
        
        if (!provider) {
            showAIStatus('Please select an AI provider', 'error');
            return;
        }
        
        if (!prompt) {
            showAIStatus('Please enter a prompt describing what you want to build', 'error');
            return;
        }
        
        const apiKey = getStoredApiKey(provider);
        if (!apiKey) {
            showAIStatus(`Please configure your ${AI_PROVIDERS[provider].name} API key in Settings`, 'error');
            switchAITab('settings');
            return;
        }
        
        aiGenerateBtn.disabled = true;
        showAIStatus('Generating FlowScript code...', 'loading');
        hideAIResult();
        
        try {
            const generatedCode = await callAIProvider(provider, apiKey, prompt);
            showAIResult(generatedCode);
            showAIStatus('FlowScript generated successfully!', 'success');
        } catch (error) {
            console.error('AI generation error:', error);
            showAIStatus(`Generation failed: ${error.message}`, 'error');
        } finally {
            aiGenerateBtn.disabled = false;
        }
    };

    /**
     * Call AI provider API
     */
    const callAIProvider = async (providerId, apiKey, prompt) => {
        const config = AI_PROVIDERS[providerId];
        
        // Get selected model for this provider
        const modelSelect = document.getElementById(`${providerId}-model`);
        const selectedModel = modelSelect ? modelSelect.value : config.defaultModel;
        
        const systemPrompt = `You are a FlowScript HTML generator. Generate clean, semantic HTML code based on the user's request.
        
Rules:
1. Generate complete, valid HTML documents with DOCTYPE, html, head, and body tags
2. Include proper meta tags (charset, viewport)
3. Add a descriptive title
4. Use semantic HTML elements
5. Include inline CSS for styling when appropriate
6. Make the design responsive and modern
7. Only return the HTML code, no explanations or markdown formatting
8. Ensure the code is production-ready and follows best practices

User request: ${prompt}`;

        let response;
        
        switch (providerId) {
            case 'openai':
                response = await fetch(config.apiUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: selectedModel,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: prompt }
                        ],
                        max_tokens: 2000,
                        temperature: 0.7
                    })
                });
                break;
                
            case 'claude':
                response = await fetch(config.apiUrl, {
                    method: 'POST',
                    headers: {
                        'x-api-key': apiKey,
                        'Content-Type': 'application/json',
                        'anthropic-version': '2023-06-01'
                    },
                    body: JSON.stringify({
                        model: selectedModel,
                        max_tokens: 2000,
                        messages: [
                            { role: 'user', content: `${systemPrompt}\n\n${prompt}` }
                        ]
                    })
                });
                break;
                
            case 'gemini':
                response = await fetch(`${config.apiUrl}${selectedModel}:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: `${systemPrompt}\n\n${prompt}` }]
                        }],
                        generationConfig: {
                            maxOutputTokens: 2000,
                            temperature: 0.7
                        }
                    })
                });
                break;
                
            case 'cohere':
                response = await fetch(config.apiUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: selectedModel,
                        prompt: `${systemPrompt}\n\n${prompt}`,
                        max_tokens: 2000,
                        temperature: 0.7
                    })
                });
                break;
                
            default:
                throw new Error('Unsupported AI provider');
        }
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        let generatedText = '';
        
        switch (providerId) {
            case 'openai':
                generatedText = data.choices?.[0]?.message?.content || '';
                break;
            case 'claude':
                generatedText = data.content?.[0]?.text || '';
                break;
            case 'gemini':
                generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                break;
            case 'cohere':
                generatedText = data.generations?.[0]?.text || '';
                break;
        }
        
        if (!generatedText) {
            throw new Error('No content generated by AI');
        }
        
        // Clean up the generated text (remove markdown code blocks if present)
        generatedText = generatedText.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();
        
        return generatedText;
    };

    /**
     * Use AI generated result
     */
    const useAIResult = () => {
        const generatedCode = aiResultCode.textContent;
        if (!generatedCode) return;
        
        // Confirm before replacing workspace
        const hasContent = mainDropZone.querySelector('.script-block');
        if (hasContent) {
            const confirmed = confirm(
                'This will replace your current workspace with the AI-generated code.\n\n' +
                'Are you sure you want to continue? Your current work will be lost.'
            );
            if (!confirmed) return;
        }
        
        try {
            // Parse and load the generated HTML
            parseHtmlAndBuildWorkspace(generatedCode);
            closeAIModal();
            
            // Show success message
            const successMessage = document.createElement('div');
            successMessage.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: var(--accent-color);
                color: var(--bg-color);
                padding: 1rem 1.5rem;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 10000;
                font-weight: 500;
            `;
            successMessage.innerHTML = '<i class="fa-solid fa-check"></i> AI-generated code loaded successfully!';
            document.body.appendChild(successMessage);
            
            setTimeout(() => {
                successMessage.remove();
            }, 4000);
            
        } catch (error) {
            console.error('Error loading AI result:', error);
            showAIStatus(`Error loading generated code: ${error.message}`, 'error');
        }
    };

    /**
     * Clear AI prompt and result
     */
    const clearAIGeneration = () => {
        aiPromptTextarea.value = '';
        hideAIResult();
        hideAIStatus();
    };

    /**
     * Save AI settings to localStorage
     */
    const saveAISettings = () => {
        const apiKeys = {};
        const models = {};
        
        Object.keys(AI_PROVIDERS).forEach(providerId => {
            const keyInput = document.getElementById(`${providerId}-key`);
            const modelSelect = document.getElementById(`${providerId}-model`);
            
            if (keyInput && keyInput.value.trim()) {
                apiKeys[providerId] = keyInput.value.trim();
            }
            
            if (modelSelect && modelSelect.value) {
                models[providerId] = modelSelect.value;
            }
        });
        
        // Save API keys
        localStorage.setItem(STORAGE_KEYS.AI_KEYS, JSON.stringify(apiKeys));
        
        // Save other AI settings including models
        const settings = {
            defaultProvider: aiProviderSelect.value,
            models: models,
            lastSaved: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEYS.AI_SETTINGS, JSON.stringify(settings));
        
        showAIStatus('Settings saved successfully!', 'success');
        setTimeout(hideAIStatus, 2000);
    };

    /**
     * Load AI settings from localStorage
     */
    const loadAISettings = () => {
        try {
            // Load API keys
            const storedKeys = localStorage.getItem(STORAGE_KEYS.AI_KEYS);
            if (storedKeys) {
                const apiKeys = JSON.parse(storedKeys);
                Object.entries(apiKeys).forEach(([providerId, key]) => {
                    const input = document.getElementById(`${providerId}-key`);
                    if (input) {
                        input.value = key;
                    }
                });
            }
            
            // Load other settings including models
            const storedSettings = localStorage.getItem(STORAGE_KEYS.AI_SETTINGS);
            if (storedSettings) {
                const settings = JSON.parse(storedSettings);
                
                if (settings.defaultProvider && aiProviderSelect) {
                    aiProviderSelect.value = settings.defaultProvider;
                }
                
                if (settings.models) {
                    Object.entries(settings.models).forEach(([providerId, model]) => {
                        const modelSelect = document.getElementById(`${providerId}-model`);
                        if (modelSelect) {
                            modelSelect.value = model;
                        }
                    });
                }
            }
            
            // Set default models if none are saved
            Object.keys(AI_PROVIDERS).forEach(providerId => {
                const modelSelect = document.getElementById(`${providerId}-model`);
                if (modelSelect && !modelSelect.value) {
                    modelSelect.value = AI_PROVIDERS[providerId].defaultModel;
                }
            });
        } catch (error) {
            console.error('Error loading AI settings:', error);
        }
    };

    /**
     * Get stored API key for provider
     */
    const getStoredApiKey = (providerId) => {
        try {
            const storedKeys = localStorage.getItem(STORAGE_KEYS.AI_KEYS);
            if (storedKeys) {
                const apiKeys = JSON.parse(storedKeys);
                return apiKeys[providerId] || '';
            }
        } catch (error) {
            console.error('Error getting stored API key:', error);
        }
        return '';
    };

    /**
     * Clear all API keys and model selections
     */
    const clearAllApiKeys = () => {
        const confirmed = confirm(
            'Are you sure you want to clear all saved API keys and model selections?\n\n' +
            'This action cannot be undone.'
        );
        
        if (!confirmed) return;
        
        // Clear from localStorage
        localStorage.removeItem(STORAGE_KEYS.AI_KEYS);
        localStorage.removeItem(STORAGE_KEYS.AI_SETTINGS);
        
        // Clear from UI
        Object.keys(AI_PROVIDERS).forEach(providerId => {
            const input = document.getElementById(`${providerId}-key`);
            if (input) {
                input.value = '';
                input.style.borderColor = '';
            }
            
            // Clear model selections
            const modelSelect = document.getElementById(`${providerId}-model`);
            if (modelSelect) {
                modelSelect.value = AI_PROVIDERS[providerId].defaultModel;
            }
        });
        
        if (aiProviderSelect) {
            aiProviderSelect.value = '';
        }
        
        showAIStatus('All API keys and model selections cleared', 'success');
        setTimeout(hideAIStatus, 2000);
    };

    /**
     * Save theme to localStorage
     */
    const saveThemeToStorage = (theme) => {
        localStorage.setItem(STORAGE_KEYS.THEME, theme);
    };

    /**
     * Load theme from localStorage
     */
    const loadThemeFromStorage = () => {
        try {
            const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
            if (savedTheme && themeSelect) {
                themeSelect.value = savedTheme;
                document.documentElement.setAttribute('data-theme', savedTheme);
                updateCodeMirrorThemes();
                
                // Sync mobile theme selector
                if (mobileThemeSelect) {
                    mobileThemeSelect.value = savedTheme;
                }
            }
        } catch (error) {
            console.error('Error loading theme from storage:', error);
        }
    };

    // =========================================================================
    // == MOBILE DRAG IMPROVEMENTS ==
    // =========================================================================

    /**
     * Hide palette when dragging in mobile mode
     */
    const handleMobileDragStart = (e) => {
        if (isMobileMode && toolbox.classList.contains('open')) {
            // Add a small delay to allow drag to start properly
            setTimeout(() => {
                closeMobilePanels();
            }, 100);
        }
    };

    // =========================================================================
    // == AI EVENT LISTENERS ==
    // =========================================================================

    // AI modal open/close
    if (aiButton) {
        aiButton.addEventListener('click', openAIModal);
    }

    if (mobileAiButton) {
        mobileAiButton.addEventListener('click', () => {
            closeMobileDropdown();
            openAIModal();
        });
    }

    if (aiCloseBtn) {
        aiCloseBtn.addEventListener('click', closeAIModal);
    }

    // AI modal outside click
    if (aiModal) {
        aiModal.addEventListener('click', (e) => {
            if (e.target === aiModal) {
                closeAIModal();
            }
        });
    }

    // AI tab switching
    aiTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            switchAITab(tabId);
        });
    });

    // AI generation
    if (aiGenerateBtn) {
        aiGenerateBtn.addEventListener('click', generateWithAI);
    }

    // Enable/disable generate button based on provider and prompt
    const updateGenerateButtonState = () => {
        if (aiGenerateBtn && aiProviderSelect && aiPromptTextarea) {
            const hasProvider = aiProviderSelect.value.trim() !== '';
            const hasPrompt = aiPromptTextarea.value.trim() !== '';
            aiGenerateBtn.disabled = !(hasProvider && hasPrompt);
        }
    };

    // Add event listeners to update button state
    if (aiProviderSelect) {
        aiProviderSelect.addEventListener('change', updateGenerateButtonState);
    }

    if (aiPromptTextarea) {
        aiPromptTextarea.addEventListener('input', updateGenerateButtonState);
    }

    // Initial button state check
    updateGenerateButtonState();

    if (aiClearBtn) {
        aiClearBtn.addEventListener('click', clearAIGeneration);
    }

    if (aiUseResultBtn) {
        aiUseResultBtn.addEventListener('click', useAIResult);
    }

    // AI settings
    if (aiSaveSettingsBtn) {
        aiSaveSettingsBtn.addEventListener('click', saveAISettings);
    }

    if (aiClearAllKeysBtn) {
        aiClearAllKeysBtn.addEventListener('click', clearAllApiKeys);
    }

    // Enhanced theme change listener to save to localStorage
    themeSelect.addEventListener('change', e => {
        const selectedTheme = e.target.value;
        document.documentElement.setAttribute('data-theme', selectedTheme);
        updateCodeMirrorThemes();
        saveThemeToStorage(selectedTheme);
        
        // Sync mobile theme selector
        if (mobileThemeSelect) {
            mobileThemeSelect.value = selectedTheme;
        }
    });

    // Enhanced mobile theme selector
    if (mobileThemeSelect) {
        mobileThemeSelect.addEventListener('change', (e) => {
            const selectedTheme = e.target.value;
            themeSelect.value = selectedTheme;
            document.documentElement.setAttribute('data-theme', selectedTheme);
            updateCodeMirrorThemes();
            saveThemeToStorage(selectedTheme);
            closeMobileDropdown();
        });
    }

    // Enhanced drag start listeners for mobile improvements
    document.addEventListener('dragstart', (e) => {
        if (e.target.closest('.tool-item')) {
            handleMobileDragStart(e);
        }
    });

    // Keyboard shortcuts for AI modal
    document.addEventListener('keydown', (e) => {
        // Open AI modal with Ctrl/Cmd + I
        if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
            e.preventDefault();
            openAIModal();
        }
        
        // Close AI modal with Escape (if modal is open)
        if (e.key === 'Escape' && aiModal && aiModal.classList.contains('active')) {
            closeAIModal();
        }
        
        // Generate with Ctrl/Cmd + Enter in AI modal
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && aiModal && aiModal.classList.contains('active')) {
            const activeTab = document.querySelector('.ai-tab-content.active');
            if (activeTab && activeTab.id === 'ai-generate-tab') {
                e.preventDefault();
                generateWithAI();
            }
        }
    });

    // Initialize AI functionality
    initializeAI();

});