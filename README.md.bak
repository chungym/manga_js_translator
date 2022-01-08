# manga_js_translator
A chrome extension that translates japanese comics inside the chrome browser. No image is uploaded to a server.
However, Bing/DeepL translator is used for translation.

### Installation
Install the extension by "Load unpacked"

### Usage
1. Open the file *manifest.json*, and add the website(s) you are using to *content_scripts:include_globs* 
2. Click on the extension icon to open the pop up
3. Load workers. A check mark will appear to indicate the workers are ready
4. Select the language to translate to. It is not required to reload workers after change of language.

### Example
![Example](/../gh-pages/doc/example.gif)
![Example](/../gh-pages/doc/example.jpg)
Credit: [えつき] 狂人たちが夢のあと (バットマン)

### Common Problems
1. It does not work with artistic CG: 
it currently selects texts by detecting the speech balloons

2. It works initially but stops working after idling for a while: 
The translation page timed out, reload the workers from the pop up.

3. It suddenly stops working or only translates half of the image:
You probably hit usage limits of translator, go to https://www.bing.com/translator to do CAPTCHA 
