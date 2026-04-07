# Area Capture & Record

A powerful, browser-based tool for selecting, capturing, and recording specific areas of your screen with real-time annotations.

![Demo Preview](https://via.placeholder.com/800x400/0a0a0a/ffffff?text=Area+Capture+Demo)

## 🚀 Features

- **Real-time Screen Selection**: Click and drag to select specific areas of your screen
- **High-Quality Recording**: Full 60fps recording with ultra-wide resolution support (up to 4K)
- **Live Annotations**: Draw, write, and annotate while recording
- **Multi-Modal Tools**: Pen, rectangle, arrow, text, and eraser tools
- **Screenshot Mode**: Quick capture of selected areas as PNG images
- **Audio Support**: Optional audio capture from microphone or system audio
- **Real-time Preview**: See your annotations live as you record
- **Modern UI**: Beautiful dark theme with smooth animations and user-friendly interface
- **Browser-Based**: No downloads required, works entirely in the browser

## 📸 How It Works

1. **Start Capture**: Click "Start Capture" to begin screen selection
2. **Select Area**: Click and drag to choose your recording area
3. **Record**: Click "Record Area" to start recording with annotations
4. **Annotate**: Use drawing tools to add rectangles, arrows, text, or freehand drawings
5. **Save**: Videos automatically download as high-quality WebM files

## 🛠️ Technical Stack

- **Frontend**: React 19 + TypeScript
- **Styling**: Tailwind CSS 4.1+ with custom components
- **Animation**: Framer Motion for smooth UI transitions
- **Build**: Vite for fast development and optimized builds
- **Video**: WebRTC Screen Capture + MediaRecorder API
- **Canvas**: HTML5 Canvas for real-time annotation rendering

## 🎨 Annotation Features

- **Pen Tool**: Freehand drawing with customizable colors and brush sizes
- **Rectangle Tool**: Draw rectangular shapes for highlighting areas
- **Arrow Tool**: Create directional arrows for pointing to specific elements
- **Text Tool**: Add customizable text annotations anywhere on the screen
- **Eraser Tool**: Remove existing annotations with various brush sizes
- **Color Palette**: Red, blue, green, yellow, and white options
- **Undo/Redo**: Quick undo for removing the last annotation
- **Clear All**: Remove all annotations with a single click

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and **npm/yarn/pnpm**
- **Modern Browser** (Chrome 72+, Firefox 66+, Safari 14+, Edge 79+)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd area-capture-&-record

# Install dependencies
npm install

# Start development server
npm run dev
```

### Build for Production

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 🌍 Browser Compatibility

| Browser | Version | Support |
|---------|---------|---------|
| Chrome  | 72+     | ✅ Full |
| Firefox | 66+     | ✅ Full |
| Safari  | 14+     | ✅ Full |
| Edge    | 79+     | ✅ Full |
| Opera   | 50+     | ✅ Full |

## 🔐 Permissions Required

The application requests these permissions during use:
- `display-capture`: Screen capture access
- `microphone`: Audio recording (optional)
- `camera`: Webcam access (future feature)
- `fullscreen`: Fullscreen mode support

## 📱 Mobile Support

- **Responsive Design**: Automatically adapts to different screen sizes
- **Touch Support**: Basic touch interaction for mobile devices
- **Portrait/Landscape**: Optimized for both orientations

## 🎮 Development

### Project Structure

```
├── src/
│   ├── App.tsx          # Main application component
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles
├── public/              # Static assets
├── index.html           # HTML template
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
├── vite.config.ts       # Vite build configuration
└── tailwind.config.js   # Tailwind CSS configuration
```

### Available Scripts

```bash
# Development
npm run dev        # Start development server with hot reload

# Building
npm run build      # Build for production
npm run preview    # Preview production build

# Quality Assurance
npm run lint       # TypeScript type checking
npm run clean      # Clean build artifacts
```

## ⚡ Performance Features

- **Efficient Rendering**: Optimized canvas rendering with off-screen buffers
- **Memory Management**: Automatic cleanup of video streams and canvas elements
- **Smooth Animations**: 60fps animations with hardware acceleration
- **Lazy Loading**: On-demand loading of audio/video processing

## 🎯 Use Cases

- **Software Tutorials**: Create detailed walkthroughs of applications
- **Bug Reports**: Capture specific areas showing bugs or issues
- **Presentations**: Record demonstrations of features or workflows
- **Training**: Create instructional content with annotations
- **Documentation**: Generate screenshots for technical documentation

## 🔧 Troubleshooting

### Common Issues

**Permission Denied**
```
Solution: Enable screen recording permissions in your browser settings
```

**Error: "Screen capture is blocked"**
```
Solution: Open in a new tab or use HTTPS connection
```

**No Audio**
```
Solution: Ensure microphone permissions are granted, or use basic video capture
```

**Recording Not Starting**
```
Solution: Check that the selected area is large enough (>10x10px)
```

### Browser Settings

- **Chrome**: Allow screen sharing in `chrome://settings/content/screenCapture`
- **Firefox**: Toggle `privacy.resistFingerprinting` to `false` if needed
- **Safari**: Enable screen recording in System Preferences > Security & Privacy

## 🌟 Future Enhancements

- **Multi-Area Recording**: Record multiple screen areas simultaneously
- **Audio Editor**: Built-in audio trimmer and volume control
- **Advanced Annotations**: Shape recognition and automatic beautification
- **Cloud Storage**: Direct upload to cloud services
- **Real-time Sharing**: Live sharing of recordings
- **Mobile App**: Native iOS/Android applications

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

- **Issues**: [GitHub Issues](https://github.com/your-username/area-capture-&-record/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/area-capture-&-record/discussions)
- **Email**: [your-email@domain.com](mailto:your-email@domain.com)

---

**Made with ❤️ using React, TypeScript, and modern web technologies**