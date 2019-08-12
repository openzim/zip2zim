import domino from 'domino';
import StreamZip from 'node-stream-zip';
import { ZimCreator, ZimArticle } from '@openzim/libzim';

import * as imagemin from 'imagemin';
import imageminJpegoptim from 'imagemin-jpegoptim';
import imageminAdvPng from 'imagemin-advpng';
import imageminPngquant from 'imagemin-pngquant';
import imageminGifsicle from 'imagemin-gifsicle';

const imageminOptions = {
    plugins: [
        // imageminOptiPng(),
        imageminPngquant({ speed: 3, strip: true, dithering: 0 }),
        imageminAdvPng({ optimizationLevel: 4, iterations: 5 }),
        imageminJpegoptim({ max: 60, stripAll: true }),
        // imageminJpegtran(),
        imageminGifsicle({ optimizationLevel: 3, colors: 64 }),
    ],
};

// zipToZim('out.zip', 'out.zim');

export async function zipToZim(zipIn: string, zimOut: string, setProgress: (progress: number) => void) {
    const zip = new StreamZip({
        file: zipIn,
    });
    await waitZipReady(zip);

    let config = {
        welcome: 'index.html',
        creator: 'Zip2Zim',
        description: 'Generated from a ZIP file by Zip2Zim',
        name: 'Zip2Zim archive',
        publisher: undefined,
        language: undefined,
        title: undefined,
        tags: undefined,
    };
    try {
        const configBuf = zip.entryDataSync('config.json');
        Object.assign(config, JSON.parse(configBuf.toString()));
    } catch { }

    const creator = new ZimCreator({
        fileName: zimOut,
        welcome: config.welcome,
    }, {
            Creator: config.creator,
            Description: config.description,
            Name: config.name,
            Publisher: config.publisher,
            Language: config.language,
            Title: config.title,
            Tags: config.tags,
        });

    const entries = Object.values(zip.entries());
    const numEntries = entries.length;

    let processedEntries = 0;
    let prevPercentage = 0;

    for (const entry of entries as any[]) {
        if (entry.isFile) {
            const url: string = entry.name;
            let data = zip.entryDataSync(url);
            let articleMeta = {
                title: url.split('/').slice(0, -1)[0],
            }

            if (url.endsWith('.html')) {
                data = data.toString();
                const doc = domino.createDocument(data) as DominoElement;
                const hrefs: DominoElement[] = Array.from(doc.querySelectorAll('a,link'));
                const srcs: DominoElement[] = Array.from(doc.querySelectorAll('script,img,video,audio,source'));

                for (const el of hrefs) {
                    const oldHref = el.getAttribute('href');
                    if (oldHref && oldHref.startsWith('/')) {
                        el.setAttribute('href', '/A' + oldHref);
                    }
                }
                for (const el of srcs) {
                    const oldSrc = el.getAttribute('src');
                    if (oldSrc && oldSrc.startsWith('/')) {
                        el.setAttribute('src', '/A' + oldSrc);
                    }
                }
                data = doc.outerHTML;
                const titleEl = doc.querySelector('title');
                if (titleEl) {
                    articleMeta.title = titleEl.textContent;
                }
            } else if (isImage(url)) {
                data = await imagemin.buffer(data, imageminOptions)
            }

            // TODO: compress images
            // TODO: compress audio
            // TODO: compress video
            // TODO: minify js, css, html
            const article = new ZimArticle({
                url,
                data,
                ns: 'A',
                title: articleMeta.title,
                shouldIndex: url.includes('.html'),
            });
            await creator.addArticle(article);
        }
        processedEntries += 1;
        const progressPercentage = Math.floor(processedEntries / numEntries * 1000) / 10;
        if (prevPercentage != progressPercentage) {
            prevPercentage = progressPercentage;
            setProgress(progressPercentage);
            // console.info(`Progress on [${zimOut}] [${progressPercentage}%]`);
        }
    }

    await creator.finalise();
}

async function waitZipReady(zip: any) {
    return new Promise((resolve) => {
        zip.on('ready', resolve);
    });
}

function isImage(url: string) {
    return url.includes('png') || url.includes('jpg') || url.includes('jpeg') || url.includes('gif');
}