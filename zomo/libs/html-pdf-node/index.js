const puppeteer = require("puppeteer");
var Promise = require("bluebird");
const hb = require("handlebars");
const inlineCss = require("inline-css");
module.exports;



async function generatePdf(file, options = {}, callback, font) {
    try {
        let args = ["--no-sandbox", "--disable-setuid-sandbox"];
        if (options.args) {
            args = options.args;
            delete options.args;
        }
        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-cache'] });
        const page = await browser.newPage();
        // await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112 Safari/537.36');

        let fontStyle = "";
        if (font) {
            fontStyle = `
                <style>
                    @font-face {
                        font-family: ${font.name};
                        src: url(data:font/woff;base64,${font.data});
                        font-display: swap;
                    }
                </style>`;
        }

        let htmlContent = file.content || "";
        htmlContent = await inlineCss(htmlContent, { url: "/" });
        htmlContent = fontStyle + htmlContent;

        const headerTemplate = options.headerTemplate;
        const footerTemplate = options.footerTemplate;

        const template = hb.compile(htmlContent, { strict: true });
        page.on('pageerror', error => {
            console.error('Page error occurred:', error);
        });
        await page.setContent(template(file.data || {}));
        console.log('Generating PDF...');
        const pdfBuffer = await page.pdf(options);
        console.log('PDF generated.');
        await browser.close();
        
        if (callback) callback(null, pdfBuffer);
        return pdfBuffer;

    } catch (err) {
        if (callback) callback(err);
        throw err;
    }
}

async function generatePdfs(files, options, callback) {
    // we are using headless mode
    let args = ["--no-sandbox", "--disable-setuid-sandbox"];
    if (options.args) {
        args = options.args;
        delete options.args;
    }
    const browser = await puppeteer.launch({
        args: args,
    });
    let pdfs = [];
    const page = await browser.newPage();
    for (let file of files) {
        if (file.content) {
            data = await inlineCss(file.content, {url: "/"});
            console.log("Compiling the template with handlebars");
            // we have compile our code with handlebars
            const template = hb.compile(data, {strict: true});
            const result = template(data);
            const html = result;
            // We set the page content as the generated html by handlebars
            await page.setContent(html, {
                waitUntil: "networkidle0", // wait for page to load completely
            });
        } else {
            await page.goto(file.url, {
                waitUntil: "networkidle0", // wait for page to load completely
            });
        }
        let pdfObj = JSON.parse(JSON.stringify(file));
        delete pdfObj["content"];
        pdfObj["buffer"] = Buffer.from(Object.values(await page.pdf(options)));
        pdfs.push(pdfObj);
    }

    return Promise.resolve(pdfs)
        .then(async function (data) {
            await browser.close();
            return data;
        })
        .asCallback(callback);
}

module.exports.generatePdf = generatePdf;
module.exports.generatePdfs = generatePdfs;