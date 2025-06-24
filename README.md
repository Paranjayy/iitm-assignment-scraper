# 🎓 IITM Assignment Scraper Chrome Extension

A Chrome extension that converts IIT Madras online degree assignments into clean, readable Markdown files with a single click. No more copy-pasting from the DevTools console!

![Extension Icon](images/icon48.png)

## ✨ Features

- **One-click export**: Simple toolbar button to scrape assignments
- **Clean Markdown format**: Well-structured output with proper formatting
- **Course name in filename**: Automatically includes assignment and course title
- **Math formula support**: Converts LaTeX/KaTeX equations to Markdown
- **Checkbox preservation**: Maintains your selected answers with checkboxes
- **Score & feedback**: Includes grading information and faculty answers
- **Completely local**: No data sent anywhere - everything happens in your browser

## 🚀 Installation

### Method 1: Download & Install (Recommended)

1. **Download this repository**
   ```bash
   git clone https://github.com/[your-username]/iitm-assignment-scraper.git
   cd iitm-assignment-scraper
   ```

2. **Open Chrome Extensions page**
   - Type `chrome://extensions` in your address bar
   - OR go to Chrome Menu → More Tools → Extensions

3. **Enable Developer Mode**
   - Toggle "Developer mode" in the top-right corner

4. **Load the extension**
   - Click "Load unpacked"
   - Select the downloaded folder (containing `manifest.json`)

5. **Pin the extension** (optional)
   - Click the puzzle piece icon in Chrome toolbar
   - Pin the "IITM Assignment Scraper" for easy access

### Method 2: Build from Source

If you want to create custom icons or modify the extension:

1. **Install Python dependencies**
   ```bash
   pip install Pillow
   ```

2. **Add your logo** (optional)
   - Save your IIT Madras logo as `logo.png` in the project folder
   - Run: `python convert_icon.py`
   - This will create `icon16.png`, `icon48.png`, and `icon128.png` in the `images/` folder

3. **Follow installation steps above**

## 📖 Usage

1. **Navigate to your assignment**
   - Go to `https://seek.onlinedegree.iitm.ac.in`
   - Open any graded assignment page

2. **Click the extension icon**
   - Look for the IIT Madras logo in your Chrome toolbar
   - Single click to start the export

3. **Download your Markdown file**
   - The file will automatically download
   - Filename format: `Assignment_Name_-_Course_Name.md`

## 📂 File Structure

```
iitm-assignment-scraper/
├── manifest.json          # Extension configuration
├── background.js          # Service worker (handles icon clicks)
├── scraper.js            # Main scraping logic
├── convert_icon.py       # Icon generation script
├── images/               # Extension icons
│   ├── icon16.png       # 16x16 toolbar icon
│   ├── icon48.png       # 48x48 medium icon
│   └── icon128.png      # 128x128 large icon
└── README.md            # This file
```

## 🛠️ How It Works

1. **Turndown.js Integration**: Automatically loads the HTML-to-Markdown converter
2. **Smart Content Detection**: Finds questions, choices, and feedback elements
3. **LaTeX/KaTeX Processing**: Converts mathematical formulas to Markdown format
4. **Answer Preservation**: Maintains your selected answers and input responses
5. **Local File Download**: Creates and downloads the Markdown file directly

## 🎯 Supported Content

- ✅ Multiple choice questions with checkboxes
- ✅ Text and numeric input answers
- ✅ Mathematical formulas (LaTeX/KaTeX)
- ✅ Faculty feedback and correct answers
- ✅ Assignment metadata (submission dates, scores)
- ✅ Course and assignment titles

## 🔒 Privacy & Security

- **100% Local Processing**: No data is sent to external servers
- **Read-Only Access**: Only reads assignment content, never modifies anything
- **Personal Use**: Designed for your own assignments and study materials
- **No Tracking**: Zero analytics, cookies, or user tracking

## ⚠️ Important Notes

- **For Personal Use Only**: This tool is intended for your own study and review purposes
- **Respect Academic Integrity**: Only use on assignments you have legitimate access to
- **Institution Policy**: Ensure compliance with your institution's technology use policies
- **Not Official**: This is an unofficial tool, not endorsed by IIT Madras

## 🤝 Contributing

Found a bug or want to add a feature? Contributions are welcome!

1. Fork this repository
2. Create a feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## ❓ Troubleshooting

### Extension doesn't appear
- Make sure you enabled "Developer mode" in Chrome
- Check that you selected the correct folder (should contain `manifest.json`)

### Icon doesn't work
- Make sure you're on a `seek.onlinedegree.iitm.ac.in` page
- Check that you're viewing an assignment (not course listing)
- Open DevTools and check for console errors

### Math formulas look weird
- The extension converts LaTeX to Markdown format (`$formula$`)
- Use a Markdown viewer that supports math rendering for best results

### Download doesn't start
- Check if your browser blocked the download
- Ensure popup blockers aren't interfering
- Try refreshing the page and clicking again

## 🙏 Acknowledgments

- Thanks to the open source [Turndown.js](https://github.com/mixmark-io/turndown) library
- Inspired by the need for better study materials organization
- Built with love for the IIT Madras online degree community

---

**Happy studying! 🚀📚** 