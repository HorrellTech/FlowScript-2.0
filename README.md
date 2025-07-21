# FlowScript 2.0 - Visual Website Builder

![FlowScript 2.0](https://img.shields.io/badge/FlowScript-2.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)

FlowScript 2.0 is a powerful, modular visual website prototyping tool that allows you to build HTML, CSS, and JavaScript through an intuitive drag-and-drop interface. No coding experience required - just drag blocks, configure them, and watch your website come to life!

## 🚀 Features

### Core Functionality
- **Visual Block-Based Editor**: Drag and drop HTML, CSS, and JavaScript blocks
- **Real-Time Code Generation**: See your generated code update instantly
- **Live Preview**: Preview your website in a new window
- **Mobile-Responsive Design**: Optimized interface for both desktop and mobile devices
- **Syntax Highlighting**: CodeMirror integration for enhanced code editing experience

### File Management
- **Save/Load Workspaces**: Save your projects as JSON files and reload them later
- **HTML Import**: Import existing HTML files and convert them to blocks
- **Export HTML**: Export your generated code as standalone HTML files
- **Template System**: Start with pre-built templates (Landing Page, Portfolio, Blog, etc.)

### Themes & Customization
- **9 Built-in Themes**: Dark, Light, Cyber, Neon, Retro, Forest, Ocean, Sunset, Arctic
- **Extensible Theme System**: Easy to add custom themes
- **Mobile Mode**: Dedicated mobile interface with panel toggles

### Block Categories
- **HTML Blocks**: Document structure, containers, headings, paragraphs, images, links, buttons
- **CSS Blocks**: Style rules, properties, raw CSS
- **JavaScript Blocks**: Variables, functions, event listeners, loops, conditionals
- **Custom Blocks**: Fallback system for unrecognized elements

## 📦 Installation

### Quick Start
1. Clone or download this repository
2. Open `index.html` in a modern web browser
3. Start building your website!

### Requirements
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection (for CDN resources: Font Awesome, CodeMirror)

### Local Development
```bash
# Clone the repository
git clone https://github.com/yourusername/flowscript-2.0.git

# Navigate to the directory
cd flowscript-2.0

# Open in your preferred web server or directly in browser
# For local server (optional):
python -m http.server 8000
# Then visit http://localhost:8000
```

## 🎯 How to Use

### Basic Workflow
1. **Choose a Template**: Select from pre-built templates or start blank
2. **Drag Blocks**: Drag blocks from the toolbox to the workspace
3. **Configure Blocks**: Fill in the input fields for each block
4. **Nest Blocks**: Drop blocks into nested zones (like body, head sections)
5. **Preview**: Click the preview button to see your website
6. **Export**: Save your workspace or export the HTML

### Interface Overview
- **Toolbox** (Left): Contains all available blocks organized by category
- **Workspace** (Center): Where you build your website structure
- **Output Panel** (Right): Shows the generated HTML/CSS/JavaScript code
- **Header**: File management, theme selection, and mobile toggle

### Mobile Mode
- Toggle mobile mode with the mobile icon in the header
- Use panel toggles to access toolbox and output panel
- Access file management through the mobile dropdown menu

## 🎨 Adding New Themes

Themes in FlowScript 2.0 are defined using CSS custom properties. Here's how to add a new theme:

### Step 1: Define Theme Variables
Add your theme to the [`styles.css`](styles.css) file:

```css
[data-theme="mytheme"] {
    --bg-color: #your-background-color;
    --surface-color: #your-surface-color;
    --text-color: #your-text-color;
    --text-muted-color: #your-muted-text-color;
    --primary-color: #your-primary-color;
    --accent-color: #your-accent-color;
    --border-color: #your-border-color;
    --shadow-color: rgba(0, 0, 0, 0.2);
    --drop-zone-bg: #your-drop-zone-background;
    --drop-zone-hover: #your-drop-zone-hover;
}
```

### Step 2: Add Theme to Selectors
Update both theme selectors in [`index.html`](index.html):

```html
<!-- Desktop theme selector -->
<select id="theme-select">
    <option value="dark">Dark</option>
    <option value="light">Light</option>
    <!-- Add your theme here -->
    <option value="mytheme">My Theme</option>
</select>

<!-- Mobile theme selector -->
<select id="mobile-theme-select" class="mobile-dropdown-select">
    <option value="dark">Dark</option>
    <option value="light">Light</option>
    <!-- Add your theme here -->
    <option value="mytheme">My Theme</option>
</select>
```

### Step 3: Add CodeMirror Theme Mapping
In [`app.js`](app.js), update the `getCodeMirrorTheme()` function:

```javascript
const getCodeMirrorTheme = () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    
    switch (currentTheme) {
        case 'dark':
            return 'monokai';
        case 'light':
            return 'eclipse';
        // Add your theme mapping
        case 'mytheme':
            return 'your-preferred-codemirror-theme';
        default:
            return 'monokai';
    }
};
```

### Example: Creating a "Sunset" Theme
```css
[data-theme="sunset"] {
    --bg-color: #2c1810;
    --surface-color: #4a2c1a;
    --text-color: #ffa500;
    --text-muted-color: #cd853f;
    --primary-color: #ff4500;
    --accent-color: #ffd700;
    --border-color: #ff6347;
    --shadow-color: rgba(255, 165, 0, 0.2);
    --drop-zone-bg: rgba(255, 165, 0, 0.05);
    --drop-zone-hover: rgba(255, 69, 0, 0.2);
}
```

## 🧩 Adding New Blocks

Blocks are the core building units of FlowScript 2.0. Here's how to create custom blocks:

### Block Structure
Each block is defined in the `BLOCK_DEFINITIONS` object in [`app.js`](app.js):

```javascript
{
    type: 'unique_block_type',
    label: 'Display Name',
    icon: 'fa-solid fa-icon-name',
    color: '#hex-color',
    html: () => `HTML template with inputs`,
    parser: (block, indent) => `Generated code`,
    importer: (node) => `Import logic (optional)`
}
```

### Step 1: Define Your Block
Add your block to the appropriate category in `BLOCK_DEFINITIONS`:

```javascript
// Example: Adding a custom "Alert Box" block to HTML category
const BLOCK_DEFINITIONS = {
    html: [
        // ... existing blocks
        {
            type: 'alert_box',
            label: 'Alert Box',
            icon: 'fa-solid fa-exclamation-triangle',
            color: '#f39c12',
            html: () => `
                <div class="block-content">
                    <label>Alert Type:</label>
                    <select data-token="type" title="Type of alert">
                        <option value="info">Info</option>
                        <option value="warning">Warning</option>
                        <option value="error">Error</option>
                        <option value="success">Success</option>
                    </select>
                    <input type="text" placeholder="Alert message" data-token="message" title="Alert message text">
                </div>
            `,
            parser: (block, indent) => {
                const type = block.querySelector('[data-token="type"]').value;
                const message = block.querySelector('[data-token="message"]').value || 'Alert message';
                return `<div class="alert alert-${type}">${message}</div>`;
            },
            importer: (node) => {
                if (node.nodeName.toLowerCase() === 'div' && node.classList.contains('alert')) {
                    const type = Array.from(node.classList).find(cls => cls.startsWith('alert-'))?.replace('alert-', '') || 'info';
                    return {
                        type: 'alert_box',
                        tokens: {
                            type: type,
                            message: node.textContent
                        }
                    };
                }
                return null;
            }
        }
    ]
};
```

### Step 2: Block Components Explained

#### HTML Template (`html` function)
- Use `data-token="name"` for inputs that will be parsed
- Include proper labels and placeholders
- Use `title` attributes for tooltips

#### Parser Function (`parser`)
- Receives the block element and current indentation
- Extract values using `block.querySelector('[data-token="name"]').value`
- Return the generated HTML/CSS/JavaScript code
- Use `parseZone()` for nested drop zones

#### Importer Function (`importer`) - Optional
- Allows importing existing HTML elements as blocks
- Receives a DOM node and returns block data or null
- Used when importing HTML files

### Step 3: Advanced Block Features

#### Nested Drop Zones
For blocks that can contain other blocks:

```javascript
html: () => `
    <div class="block-content">
        <label>Container</label>
    </div>
    <div class="nested-drop-zone" data-branch="content">
        <div class="drop-zone-label">Content</div>
        <p class="placeholder-text">Drop blocks here...</p>
    </div>
`,
parser: (block, indent) => {
    return `<div class="container">
${parseZone(block.querySelector('[data-branch="content"]'), indent + '    ')}
${indent}</div>`;
}
```

#### CodeMirror Integration
For blocks with code editing:

```javascript
html: () => `
    <div class="block-content">
        <label>Custom JavaScript:</label><br>
        <textarea data-token="code" class="themed-textarea" placeholder="Enter JavaScript..."></textarea>
    </div>
`,
parser: (block) => {
    return getTextareaValue(block.querySelector('[data-token="code"]')) || '';
}
```

### Step 4: Block Categories

Add blocks to the appropriate category:
- **`html`**: HTML elements and structure
- **`css`**: CSS rules and styling
- **`javascript`**: JavaScript functionality
- **`custom`**: Fallback and custom elements

### Example: Complete Custom Block

```javascript
// Add to app.js block area
{
    type: 'video_player',
    label: 'Video Player',
    icon: 'fa-solid fa-play',
    color: '#e74c3c',
    html: () => `
        <div class="block-content">
            <label>Video Source:</label>
            <input type="text" placeholder="video.mp4" data-token="src" title="Path to video file">
            <label>Controls:</label>
            <input type="checkbox" data-token="controls" title="Show video controls" checked>
            <label>Autoplay:</label>
            <input type="checkbox" data-token="autoplay" title="Auto-play video">
        </div>
    `,
    parser: (block, indent) => {
        const src = block.querySelector('[data-token="src"]').value || '';
        const controls = block.querySelector('[data-token="controls"]').checked;
        const autoplay = block.querySelector('[data-token="autoplay"]').checked;
        
        let attributes = `src="${src}"`;
        if (controls) attributes += ' controls';
        if (autoplay) attributes += ' autoplay';
        
        return `<video ${attributes}>
${indent}    Your browser does not support the video tag.
${indent}</video>`;
    },
    importer: (node) => {
        if (node.nodeName.toLowerCase() === 'video') {
            return {
                type: 'video_player',
                tokens: {
                    src: node.getAttribute('src') || '',
                    controls: node.hasAttribute('controls'),
                    autoplay: node.hasAttribute('autoplay')
                }
            };
        }
        return null;
    }
}
```

## 📱 Mobile Features

FlowScript 2.0 includes comprehensive mobile support:

### Auto-Detection
- Automatically detects mobile devices and small screens
- Switches to mobile mode when screen width ≤ 768px

### Mobile Interface
- **Panel Toggles**: Left/right buttons to show/hide toolbox and output
- **Mobile Dropdown**: Access file management, themes, and templates
- **Touch-Friendly**: Larger touch targets and improved interactions
- **Overlay System**: Proper modal behavior for mobile panels

### Manual Mobile Toggle
Users can manually enable/disable mobile mode using the mobile icon in the header.

## 🛠️ Technical Details

### Dependencies
- **Font Awesome 6.2.0**: Icons
- **CodeMirror 5.65.16**: Code editing with syntax highlighting
- **Modern Browser APIs**: File API, Drag & Drop API, Local Storage

### Browser Support
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

### File Structure
```
flowscript-2.0/
├── index.html          # Main application file
├── app.js             # Core application logic
├── styles.css         # Styling and themes
├── README.md          # This file
└── LICENSE           # License information
```

### Key Functions
- **`createBlock(type)`**: Creates a new block instance
- **`parseZone(zone, indent)`**: Parses blocks in a drop zone
- **`generateCode()`**: Generates final HTML/CSS/JS output
- **`saveWorkspaceState()`**: Saves current workspace as JSON
- **`loadWorkspaceState(data)`**: Loads workspace from JSON

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**: Add new blocks, themes, or improvements
4. **Test thoroughly**: Ensure your changes work across different browsers
5. **Commit your changes**: `git commit -m 'Add amazing feature'`
6. **Push to the branch**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

### Contribution Ideas
- New block types (forms, media, layouts)
- Additional themes
- Improved mobile experience
- Performance optimizations
- Bug fixes and improvements

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **CodeMirror** for the excellent code editing experience
- **Font Awesome** for the comprehensive icon library
- **The open-source community** for inspiration and feedback

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yourusername/flowscript-2.0/issues) page
2. Create a new issue with detailed information
3. Join our community discussions

---

**Happy Building with FlowScript 2.0!** 🚀

*Build websites visually, code-free, and with style.*
